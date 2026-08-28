import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-development-key-change-me")
DEBUG = False
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "apps.common",
    "apps.accounts",
    "apps.organizations",
    "apps.audit",
    "apps.courses",
    "apps.learning",
    "apps.commerce",
    "chat_api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "apps.common.middleware.RequestIdMiddleware",
]

ROOT_URLCONF = "awexen_api.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
WSGI_APPLICATION = "awexen_api.wsgi.application"

database_url = os.environ.get("DATABASE_URL", "").strip()
default_database = dj_database_url.parse(
    database_url or f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    conn_max_age=60,
    conn_health_checks=True,
)
if default_database.get("ENGINE") == "django.db.backends.postgresql" and str(
    default_database.get("HOST", "")
).endswith("supabase.com"):
    default_database.setdefault("OPTIONS", {}).setdefault("sslmode", "require")
DATABASES = {"default": default_database}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS: list[dict[str, str]] = []

LANGUAGE_CODE = "ar"
TIME_ZONE = os.environ.get("TIME_ZONE", "Africa/Cairo")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = False

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.SupabaseJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.common.exceptions.api_exception_handler",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Awexen LMS API",
    "DESCRIPTION": "Authoritative API for the Awexen learning platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SECURITY": [{"bearerAuth": []}],
    "COMPONENTS": {
        "securitySchemes": {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }
    },
    "ENUM_NAME_OVERRIDES": {
        "CourseStatusEnum": "apps.common.enums.COURSE_STATUS_CHOICES",
        "CourseVersionStatusEnum": "apps.common.enums.COURSE_VERSION_STATUS_CHOICES",
        "ContentStatusEnum": "apps.common.enums.CONTENT_STATUS_CHOICES",
        "CohortStatusEnum": "apps.common.enums.COHORT_STATUS_CHOICES",
        "EnrollmentStatusEnum": "apps.common.enums.ENROLLMENT_STATUS_CHOICES",
    },
}

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_JWT_AUDIENCE = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
LMS_DEFAULT_ORGANIZATION_SLUG = os.environ.get("LMS_DEFAULT_ORGANIZATION_SLUG", "awexen")
LMS_DEFAULT_ORGANIZATION_NAME = os.environ.get("LMS_DEFAULT_ORGANIZATION_NAME", "Awexen")
LMS_BOOTSTRAP_ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.environ.get("LMS_BOOTSTRAP_ADMIN_EMAILS", "").split(",")
    if email.strip()
}
LMS_PAYMENT_PHONE = os.environ.get("LMS_PAYMENT_PHONE", "01092400443").strip()
LMS_PAYMENT_PROOFS_BUCKET = os.environ.get("LMS_PAYMENT_PROOFS_BUCKET", "payment-proofs").strip()
LMS_PAYMENT_PROOF_MAX_BYTES = int(os.environ.get("LMS_PAYMENT_PROOF_MAX_BYTES", str(5 * 1024 * 1024)))

REDIS_URL = os.environ.get("REDIS_URL", "").strip()
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

CELERY_BROKER_URL = REDIS_URL or "memory://"
CELERY_RESULT_BACKEND = REDIS_URL or "cache+memory://"
CELERY_TASK_ALWAYS_EAGER = not bool(REDIS_URL)

EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "Awexen Learning <learning@awexen.com>")

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "apps.common.logging.JsonFormatter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}
