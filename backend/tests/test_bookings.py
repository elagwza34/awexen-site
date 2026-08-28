import uuid

import pytest
from django.core.exceptions import ValidationError
from django.test import override_settings
from rest_framework.test import APIClient

from apps.commerce.models import CourseBooking
from apps.commerce.services import approve_course_booking, create_course_booking, submit_payment_proof
from apps.learning.models import Entitlement
from apps.organizations.models import Membership

from .factories import OrganizationFactory, UserFactory, create_published_course


@pytest.mark.django_db
@override_settings(LMS_PAYMENT_PHONE="01092400443", LMS_PAYMENT_PROOF_MAX_BYTES=5 * 1024 * 1024)
def test_payment_approval_is_idempotent_and_grants_purchase_access():
    admin = UserFactory()
    student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=admin, role=Membership.Role.ORGANIZATION_ADMIN)
    Membership.objects.create(organization=organization, user=student, role=Membership.Role.STUDENT)
    course, _, _, _ = create_published_course(organization=organization, owner=admin)
    course.price = 1500
    course.save(update_fields=["price", "updated_at"])

    booking = create_course_booking(
        user=student,
        course=course,
        phone="01000000000",
        experience_level="beginner",
        goal="Build a website",
        payment_method=CourseBooking.PaymentMethod.INSTAPAY,
    )
    supabase_user_id = uuid.uuid4()
    with pytest.raises(ValidationError, match="path is invalid"):
        submit_payment_proof(
            booking=booking,
            actor=student,
            proof_path=f"another-user/{booking.id}/proof.png",
            content_type="image/png",
            size=100,
            storage_owner_id=str(supabase_user_id),
        )
    student_client = APIClient()
    student_client.force_authenticate(student, token={"sub": str(supabase_user_id)})
    proof_response = student_client.post(
        f"/api/v1/bookings/{booking.id}/submit-proof/",
        {
            "proof_path": f"{supabase_user_id}/{booking.id}/proof.png",
            "content_type": "image/png",
            "size": 100,
        },
        format="json",
    )
    assert proof_response.status_code == 200
    booking.refresh_from_db()
    approved = approve_course_booking(booking=booking, actor=admin)
    approved_again = approve_course_booking(booking=approved, actor=admin)

    assert approved.status == CourseBooking.Status.APPROVED
    assert approved_again.enrollment_id == approved.enrollment_id
    assert approved.enrollment.entitlement.source == Entitlement.Source.PURCHASE
    assert approved.enrollment.entitlement.status == Entitlement.Status.VALID


@pytest.mark.django_db
def test_student_cannot_use_admin_payment_approval_endpoint():
    student = UserFactory()
    client = APIClient()
    client.force_authenticate(student)

    response = client.post("/api/v1/admin/payment-bookings/00000000-0000-0000-0000-000000000001/approve/", {})

    assert response.status_code == 403
