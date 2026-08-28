from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_audit
from apps.courses.models import Course, CourseVersion
from apps.learning.models import Entitlement
from apps.learning.services import create_manual_enrollment

from .models import CourseBooking


ALLOWED_PROOF_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}


@transaction.atomic
def create_course_booking(*, user, course: Course, phone: str, experience_level: str, goal: str, payment_method: str, request_id=""):
    version = CourseVersion.objects.select_for_update().select_related("course__organization").get(
        pk=course.current_version_id,
        status=CourseVersion.Status.PUBLISHED,
        course__status=Course.Status.PUBLISHED,
    )
    if course.price <= 0:
        raise ValidationError("This course does not have a valid paid price.")
    existing = CourseBooking.objects.filter(user=user, course_version=version).first()
    if existing and existing.status not in {CourseBooking.Status.REJECTED, CourseBooking.Status.CANCELLED}:
        return existing
    if course.capacity is not None:
        active_count = version.enrollments.filter(status__in=("active", "completed")).count()
        if active_count >= course.capacity:
            raise ValidationError("This course has reached its booking capacity.")
    booking, created = CourseBooking.objects.get_or_create(
        user=user,
        course_version=version,
        defaults={
            "organization": course.organization,
            "amount": course.price,
            "currency": course.currency,
            "payment_phone": settings.LMS_PAYMENT_PHONE,
            "phone": phone.strip(),
            "experience_level": experience_level.strip(),
            "goal": goal.strip(),
            "payment_method": payment_method,
        },
    )
    if not created and booking.status not in {CourseBooking.Status.REJECTED, CourseBooking.Status.CANCELLED}:
        return booking
    if not created:
        booking.status = CourseBooking.Status.AWAITING_PAYMENT
        booking.amount = course.price
        booking.currency = course.currency
        booking.payment_phone = settings.LMS_PAYMENT_PHONE
        booking.phone = phone.strip()
        booking.experience_level = experience_level.strip()
        booking.goal = goal.strip()
        booking.payment_method = payment_method
        booking.proof_path = ""
        booking.proof_content_type = ""
        booking.proof_size = None
        booking.payment_submitted_at = None
        booking.reviewed_at = None
        booking.reviewed_by = None
        booking.review_notes = ""
        booking.save()

    record_audit(
        action="booking.created" if created else "booking.reopened",
        target=booking,
        actor=user,
        organization=booking.organization,
        request_id=request_id,
        metadata={"course_version_id": str(version.id), "amount": str(booking.amount)},
    )
    return booking


@transaction.atomic
def submit_payment_proof(
    *,
    booking: CourseBooking,
    actor,
    proof_path: str,
    content_type: str,
    size: int,
    storage_owner_id: str = "",
    request_id="",
):
    locked = CourseBooking.objects.select_for_update().select_related("organization").get(pk=booking.pk, user=actor)
    if locked.status not in {
        CourseBooking.Status.AWAITING_PAYMENT,
        CourseBooking.Status.PAYMENT_SUBMITTED,
        CourseBooking.Status.REJECTED,
    }:
        raise ValidationError("Payment proof cannot be changed in the current booking state.")
    # Supabase Storage RLS owns files by the verified JWT ``sub``. The LMS
    # user UUID can differ when an Auth identity is recreated with the same
    # email and is re-linked to its existing Django account.
    owner_id = storage_owner_id.strip() or str(actor.id)
    expected_prefix = f"{owner_id}/{locked.id}/"
    if not proof_path.startswith(expected_prefix) or ".." in proof_path:
        raise ValidationError("Payment proof path is invalid.")
    if content_type not in ALLOWED_PROOF_CONTENT_TYPES:
        raise ValidationError("Only JPG, PNG, or PDF payment proofs are accepted.")
    if size <= 0 or size > settings.LMS_PAYMENT_PROOF_MAX_BYTES:
        raise ValidationError("Payment proof is empty or larger than the allowed size.")

    locked.proof_path = proof_path
    locked.proof_content_type = content_type
    locked.proof_size = size
    locked.payment_submitted_at = timezone.now()
    locked.status = CourseBooking.Status.PAYMENT_SUBMITTED
    locked.review_notes = ""
    locked.save()
    record_audit(
        action="booking.payment_submitted",
        target=locked,
        actor=actor,
        organization=locked.organization,
        request_id=request_id,
        metadata={"proof_path": proof_path, "payment_method": locked.payment_method},
    )
    return locked


@transaction.atomic
def approve_course_booking(*, booking: CourseBooking, actor, request_id=""):
    locked = CourseBooking.objects.select_for_update().select_related(
        "organization", "user", "course_version__course"
    ).get(pk=booking.pk)
    if locked.status == CourseBooking.Status.APPROVED:
        return locked
    if locked.status != CourseBooking.Status.PAYMENT_SUBMITTED:
        raise ValidationError("A submitted payment proof is required before approval.")

    enrollment = create_manual_enrollment(
        organization=locked.organization,
        user=locked.user,
        course_version=locked.course_version,
        actor=actor,
        request_id=request_id,
        source=Entitlement.Source.PURCHASE,
    )
    locked.status = CourseBooking.Status.APPROVED
    locked.enrollment = enrollment
    locked.reviewed_at = timezone.now()
    locked.reviewed_by = actor
    locked.review_notes = ""
    locked.save()
    record_audit(
        action="booking.approved",
        target=locked,
        actor=actor,
        organization=locked.organization,
        request_id=request_id,
        metadata={"enrollment_id": str(enrollment.id)},
    )
    return locked


@transaction.atomic
def reject_course_booking(*, booking: CourseBooking, actor, reason: str, request_id=""):
    reason = reason.strip()
    if not reason:
        raise ValidationError("A rejection reason is required.")
    locked = CourseBooking.objects.select_for_update().select_related("organization").get(pk=booking.pk)
    if locked.status not in {CourseBooking.Status.AWAITING_PAYMENT, CourseBooking.Status.PAYMENT_SUBMITTED}:
        raise ValidationError("This booking cannot be rejected in its current state.")
    locked.status = CourseBooking.Status.REJECTED
    locked.review_notes = reason
    locked.reviewed_at = timezone.now()
    locked.reviewed_by = actor
    locked.save()
    record_audit(
        action="booking.rejected",
        target=locked,
        actor=actor,
        organization=locked.organization,
        reason=reason,
        request_id=request_id,
    )
    return locked
