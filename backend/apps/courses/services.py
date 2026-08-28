from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_audit

from .catalog import sync_course_to_public_catalog
from .models import Course, CourseVersion, Lesson, Module


@transaction.atomic
def publish_course_version(*, version: CourseVersion, actor, request_id: str = "") -> CourseVersion:
    locked = CourseVersion.objects.select_for_update().select_related("course").get(pk=version.pk)
    if locked.status == CourseVersion.Status.PUBLISHED:
        return locked
    if locked.course.price <= 0:
        raise ValidationError("A paid course price greater than zero is required before publishing.")
    if not locked.modules.filter(status=Module.Status.PUBLISHED).exists():
        raise ValidationError("The course version needs at least one published module.")
    if not Lesson.objects.filter(module__course_version=locked, status=Lesson.Status.PUBLISHED).exists():
        raise ValidationError("The course version needs at least one published lesson.")

    locked.status = CourseVersion.Status.PUBLISHED
    locked.published_at = timezone.now()
    locked.reviewed_at = timezone.now()
    locked.reviewed_by = actor
    locked.review_notes = ""
    locked.save(update_fields=["status", "published_at", "reviewed_at", "reviewed_by", "review_notes", "updated_at"])

    course = Course.objects.select_for_update().get(pk=locked.course_id)
    course.current_version = locked
    course.status = Course.Status.PUBLISHED
    course.save(update_fields=["current_version", "status", "updated_at"])

    record_audit(
        action="course_version.published",
        target=locked,
        actor=actor,
        organization=course.organization,
        request_id=request_id,
        metadata={"version_number": locked.version_number},
    )
    sync_course_to_public_catalog(course)
    return locked


@transaction.atomic
def submit_course_version_for_review(*, version: CourseVersion, actor, request_id: str = "") -> CourseVersion:
    locked = CourseVersion.objects.select_for_update().select_related("course__organization").get(
        pk=version.pk,
        course__owner=actor,
    )
    if locked.status != CourseVersion.Status.DRAFT:
        raise ValidationError("Only a draft course version can be submitted for review.")
    if not locked.modules.exists():
        raise ValidationError("Add at least one module before submitting the course.")
    if not Lesson.objects.filter(module__course_version=locked).exists():
        raise ValidationError("Add at least one lesson before submitting the course.")
    locked.status = CourseVersion.Status.IN_REVIEW
    locked.submitted_at = timezone.now()
    locked.reviewed_at = None
    locked.reviewed_by = None
    locked.review_notes = ""
    locked.save()
    record_audit(
        action="course_version.submitted_for_review",
        target=locked,
        actor=actor,
        organization=locked.course.organization,
        request_id=request_id,
    )
    return locked


@transaction.atomic
def reject_course_version(*, version: CourseVersion, actor, reason: str, request_id: str = "") -> CourseVersion:
    reason = reason.strip()
    if not reason:
        raise ValidationError("A rejection reason is required.")
    locked = CourseVersion.objects.select_for_update().select_related("course__organization").get(pk=version.pk)
    if locked.status != CourseVersion.Status.IN_REVIEW:
        raise ValidationError("Only a course awaiting review can be rejected.")
    locked.status = CourseVersion.Status.DRAFT
    locked.reviewed_at = timezone.now()
    locked.reviewed_by = actor
    locked.review_notes = reason
    locked.save()
    record_audit(
        action="course_version.rejected",
        target=locked,
        actor=actor,
        organization=locked.course.organization,
        reason=reason,
        request_id=request_id,
    )
    return locked
