import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403


DEBUG = False
if SECRET_KEY == "unsafe-development-key-change-me":
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be configured in production.")
if not os.environ.get("DATABASE_URL"):
    raise ImproperlyConfigured("DATABASE_URL must be configured in production.")
if not SUPABASE_URL:
    raise ImproperlyConfigured("SUPABASE_URL must be configured in production.")

SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "true").lower() == "true"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
