from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.organizations.models import Membership


@pytest.mark.django_db
@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_JWT_SECRET="test-signing-secret-with-enough-length",
    SUPABASE_JWT_AUDIENCE="authenticated",
    LMS_DEFAULT_ORGANIZATION_SLUG="awexen",
    LMS_DEFAULT_ORGANIZATION_NAME="Awexen",
)
def test_signed_supabase_identity_is_synced_into_django():
    now = datetime.now(UTC)
    subject = uuid4()
    token = jwt.encode(
        {
            "sub": str(subject),
            "email": "manager@example.com",
            "aud": "authenticated",
            "iss": "https://example.supabase.co/auth/v1",
            "iat": now,
            "exp": now + timedelta(minutes=10),
            "app_metadata": {"role": "admin"},
            "user_metadata": {"full_name": "Course Manager"},
        },
        "test-signing-secret-with-enough-length",
        algorithm="HS256",
    )

    client = APIClient()
    response = client.get("/api/v1/me/", HTTP_AUTHORIZATION=f"Bearer {token}")

    assert response.status_code == 200
    user = User.objects.get(pk=subject)
    assert user.full_name == "Course Manager"
    assert Membership.objects.get(user=user).role == Membership.Role.ORGANIZATION_ADMIN


@pytest.mark.django_db
def test_lms_api_requires_authentication():
    response = APIClient().get("/api/v1/learning/enrollments/")
    assert response.status_code == 401


@pytest.mark.django_db
@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_JWT_SECRET="test-signing-secret-with-enough-length",
    SUPABASE_JWT_AUDIENCE="authenticated",
    LMS_DEFAULT_ORGANIZATION_SLUG="awexen",
    LMS_DEFAULT_ORGANIZATION_NAME="Awexen",
)
def test_signup_account_type_creates_instructor_membership():
    now = datetime.now(UTC)
    subject = uuid4()
    token = jwt.encode(
        {
            "sub": str(subject),
            "email": "instructor@example.com",
            "aud": "authenticated",
            "iss": "https://example.supabase.co/auth/v1",
            "iat": now,
            "exp": now + timedelta(minutes=10),
            "app_metadata": {},
            "user_metadata": {"full_name": "New Instructor", "account_type": "instructor"},
        },
        "test-signing-secret-with-enough-length",
        algorithm="HS256",
    )

    response = APIClient().get("/api/v1/me/", HTTP_AUTHORIZATION=f"Bearer {token}")

    assert response.status_code == 200
    assert Membership.objects.get(user_id=subject).role == Membership.Role.INSTRUCTOR


@pytest.mark.django_db
@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_JWT_SECRET="test-signing-secret-with-enough-length",
    SUPABASE_JWT_AUDIENCE="authenticated",
    LMS_DEFAULT_ORGANIZATION_SLUG="awexen",
    LMS_DEFAULT_ORGANIZATION_NAME="Awexen",
)
def test_recreated_supabase_identity_reuses_existing_lms_user_by_email():
    existing = User.objects.create(email="learner@example.com", full_name="Existing Learner")
    new_subject = uuid4()
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(new_subject),
            "email": "LEARNER@example.com",
            "aud": "authenticated",
            "iss": "https://example.supabase.co/auth/v1",
            "iat": now,
            "exp": now + timedelta(minutes=10),
            "app_metadata": {},
            "user_metadata": {"full_name": "Recreated Learner", "account_type": "instructor"},
        },
        "test-signing-secret-with-enough-length",
        algorithm="HS256",
    )

    response = APIClient().get("/api/v1/me/", HTTP_AUTHORIZATION=f"Bearer {token}")

    assert response.status_code == 200
    assert User.objects.count() == 1
    existing.refresh_from_db()
    assert existing.full_name == "Recreated Learner"
    assert Membership.objects.get(user=existing).role == Membership.Role.INSTRUCTOR
