from django.conf import settings

from .models import Membership, Organization


ROLE_MAP = {
    "owner": Membership.Role.ORGANIZATION_ADMIN,
    "admin": Membership.Role.ORGANIZATION_ADMIN,
    "editor": Membership.Role.LMS_MANAGER,
    "hr": Membership.Role.EMPLOYER_MANAGER,
    "support": Membership.Role.SUPPORT_AGENT,
}


def ensure_default_membership(user, external_role: str = "", requested_account_type: str = "") -> Membership:
    organization, _ = Organization.objects.get_or_create(
        slug=settings.LMS_DEFAULT_ORGANIZATION_SLUG,
        defaults={"name": settings.LMS_DEFAULT_ORGANIZATION_NAME},
    )
    role = ROLE_MAP.get(external_role)
    if role is None:
        role = Membership.Role.INSTRUCTOR if requested_account_type == "instructor" else Membership.Role.STUDENT
    membership, created = Membership.objects.get_or_create(
        organization=organization,
        user=user,
        defaults={"role": role},
    )
    if not created and membership.role == Membership.Role.STUDENT and role != Membership.Role.STUDENT:
        membership.role = role
        membership.save(update_fields=["role", "updated_at"])
    return membership


def has_org_role(user, organization_id, allowed_roles: set[str]) -> bool:
    if user.platform_role == "super_admin":
        return True
    return Membership.objects.filter(
        user=user,
        organization_id=organization_id,
        is_active=True,
        role__in=allowed_roles,
    ).exists()
