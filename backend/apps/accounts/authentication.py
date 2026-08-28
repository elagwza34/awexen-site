import uuid

import jwt
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from jwt import PyJWKClient
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .models import User


class SupabaseJWTAuthentication(BaseAuthentication):
    keyword = b"bearer"
    _jwks_client: PyJWKClient | None = None

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts:
            return None
        if len(parts) != 2 or parts[0].lower() != self.keyword:
            raise AuthenticationFailed("Invalid authorization header.")

        try:
            token = parts[1].decode("utf-8")
            claims = self._decode(token)
            user = self._sync_user(claims)
        except AuthenticationFailed:
            raise
        except (jwt.PyJWTError, UnicodeDecodeError, ValueError, TypeError) as error:
            raise AuthenticationFailed("Invalid or expired access token.") from error

        if not user.is_active:
            raise AuthenticationFailed("This account is suspended.")
        return user, claims

    def authenticate_header(self, request):
        return "Bearer"

    @classmethod
    def _decode(cls, token: str) -> dict:
        options = {"require": ["exp", "sub", "aud"]}
        kwargs = {
            "audience": settings.SUPABASE_JWT_AUDIENCE,
            "options": options,
        }
        if settings.SUPABASE_URL:
            kwargs["issuer"] = f"{settings.SUPABASE_URL}/auth/v1"

        if settings.SUPABASE_JWT_SECRET:
            return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], **kwargs)

        if not settings.SUPABASE_URL:
            raise AuthenticationFailed("Supabase authentication is not configured.")
        if cls._jwks_client is None:
            cls._jwks_client = PyJWKClient(
                f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json",
                cache_keys=True,
            )
        signing_key = cls._jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(token, signing_key.key, algorithms=["ES256", "RS256"], **kwargs)

    @staticmethod
    @transaction.atomic
    def _sync_user(claims: dict) -> User:
        try:
            user_id = uuid.UUID(str(claims["sub"]))
        except (KeyError, ValueError, TypeError) as error:
            raise AuthenticationFailed("Token subject is invalid.") from error

        email = str(claims.get("email", "")).strip().lower()
        metadata = claims.get("user_metadata") if isinstance(claims.get("user_metadata"), dict) else {}
        app_metadata = claims.get("app_metadata") if isinstance(claims.get("app_metadata"), dict) else {}
        full_name = str(metadata.get("full_name", "")).strip()[:180]
        verified = bool(claims.get("email_confirmed_at") or claims.get("confirmed_at"))

        # A Supabase identity can be deleted and recreated with the same email,
        # which gives it a new ``sub``. Preserve the existing LMS account and
        # its related data by falling back to the verified provider email.
        user = User.objects.select_for_update().filter(id=user_id).first()
        if user is None and email:
            user = User.objects.select_for_update().filter(email__iexact=email).first()

        created = False
        if user is None:
            try:
                # Keep the save in a nested transaction so a concurrent first
                # request can be recovered from without breaking the outer one.
                with transaction.atomic():
                    user = User.objects.create(
                        id=user_id,
                        email=email or f"{user_id}@unknown.local",
                        full_name=full_name,
                        email_verified=verified,
                    )
                created = True
            except IntegrityError:
                user = User.objects.select_for_update().filter(id=user_id).first()
                if user is None and email:
                    user = User.objects.select_for_update().filter(email__iexact=email).first()
                if user is None:
                    raise

        changed: list[str] = []
        if email and user.email != email:
            if User.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                raise AuthenticationFailed("This email is already linked to another LMS account.")
            user.email = email
            changed.append("email")
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            changed.append("full_name")
        if verified and not user.email_verified:
            user.email_verified = True
            changed.append("email_verified")
        user.last_seen_at = timezone.now()
        changed.append("last_seen_at")

        if email in settings.LMS_BOOTSTRAP_ADMIN_EMAILS and user.platform_role != User.PlatformRole.SUPER_ADMIN:
            user.platform_role = User.PlatformRole.SUPER_ADMIN
            user.is_staff = True
            changed.extend(["platform_role", "is_staff"])
        if created or changed:
            user.save(update_fields=None if created else [*set(changed), "updated_at"])

        from apps.organizations.services import ensure_default_membership

        ensure_default_membership(
            user,
            str(app_metadata.get("role", "")),
            str(metadata.get("account_type", "")).strip().lower(),
        )
        return user
