from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.audit.services import record_audit
from apps.courses.models import CourseVersion, Lesson
from apps.organizations.models import Membership

from .models import CourseProgress, Enrollment, Entitlement, LearningEvent, LessonProgress


MANAGER_ROLES = {
    Membership.Role.ORGANIZATION_ADMIN,
    Membership.Role.LMS_MANAGER,
}


def enrollment_has_access(enrollment: Enrollment, at=None) -> bool:
    at = at or timezone.now()
    if not enrollment.user.is_active:
        return False
    if not enrollment.organization.is_active:
        return False
    if enrollment.status not in {Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED}:
        return False
    if enrollment.course_version.status != CourseVersion.Status.PUBLISHED:
        return False
    if not Membership.objects.filter(
        organization_id=enrollment.organization_id,
        user_id=enrollment.user_id,
        is_active=True,
    ).exists():
        return False
    try:
        entitlement = enrollment.entitlement
    except Entitlement.DoesNotExist:
        return False
    if entitlement.status != Entitlement.Status.VALID:
        return False
    if entitlement.access_starts_at and entitlement.access_starts_at > at:
        return False
    if entitlement.access_ends_at and entitlement.access_ends_at <= at:
        return False
    return True


@transaction.atomic
def create_manual_enrollment(
    *, organization, user, course_version, actor, cohort=None, request_id="", source=Entitlement.Source.MANUAL
):
    if course_version.course.organization_id != organization.id:
        raise ValidationError("Course version does not belong to this organization.")
    enrollment, created = Enrollment.objects.get_or_create(
        organization=organization,
        user=user,
        course_version=course_version,
        cohort=cohort,
        defaults={
            "status": Enrollment.Status.ACTIVE,
            "activated_at": timezone.now(),
            "created_by": actor,
        },
    )
    if not created and enrollment.status != Enrollment.Status.ACTIVE:
        enrollment.status = Enrollment.Status.ACTIVE
        enrollment.activated_at = timezone.now()
        enrollment.status_reason = "Reactivated by administrator"
        enrollment.save(update_fields=["status", "activated_at", "status_reason", "updated_at"])

    Entitlement.objects.update_or_create(
        enrollment=enrollment,
        defaults={
            "source": source,
            "status": Entitlement.Status.VALID,
            "granted_by": actor,
            "revoked_at": None,
            "revoke_reason": "",
        },
    )
    CourseProgress.objects.get_or_create(enrollment=enrollment)
    record_audit(
        action="enrollment.activated" if created else "enrollment.reactivated",
        target=enrollment,
        actor=actor,
        organization=organization,
        request_id=request_id,
        metadata={"course_version_id": str(course_version.id), "student_id": str(user.id)},
    )
    return enrollment


ALLOWED_ENROLLMENT_TRANSITIONS = {
    Enrollment.Status.PENDING: {Enrollment.Status.ACTIVE, Enrollment.Status.REJECTED, Enrollment.Status.CANCELLED},
    Enrollment.Status.ACTIVE: {
        Enrollment.Status.PAUSED,
        Enrollment.Status.COMPLETED,
        Enrollment.Status.WITHDRAWN,
        Enrollment.Status.CANCELLED,
        Enrollment.Status.EXPIRED,
    },
    Enrollment.Status.PAUSED: {
        Enrollment.Status.ACTIVE,
        Enrollment.Status.WITHDRAWN,
        Enrollment.Status.CANCELLED,
        Enrollment.Status.EXPIRED,
    },
    Enrollment.Status.EXPIRED: {Enrollment.Status.ACTIVE},
}


@transaction.atomic
def transition_enrollment(*, enrollment: Enrollment, new_status: str, actor, reason: str, request_id=""):
    locked = Enrollment.objects.select_for_update().select_related("organization").get(pk=enrollment.pk)
    if locked.status == new_status:
        return locked
    if new_status not in ALLOWED_ENROLLMENT_TRANSITIONS.get(locked.status, set()):
        raise ValidationError(f"Invalid enrollment transition: {locked.status} -> {new_status}")
    if new_status in {
        Enrollment.Status.PAUSED,
        Enrollment.Status.WITHDRAWN,
        Enrollment.Status.REJECTED,
        Enrollment.Status.CANCELLED,
        Enrollment.Status.EXPIRED,
    } and not reason.strip():
        raise ValidationError("A reason is required for this enrollment transition.")

    previous_status = locked.status
    locked.status = new_status
    locked.status_reason = reason.strip()
    if new_status == Enrollment.Status.ACTIVE:
        locked.activated_at = timezone.now()
    if new_status == Enrollment.Status.COMPLETED:
        locked.completed_at = timezone.now()
    locked.save()

    if new_status in {
        Enrollment.Status.WITHDRAWN,
        Enrollment.Status.REJECTED,
        Enrollment.Status.CANCELLED,
        Enrollment.Status.EXPIRED,
    }:
        Entitlement.objects.filter(enrollment=locked).update(
            status=Entitlement.Status.REVOKED,
            revoked_at=timezone.now(),
            revoke_reason=reason.strip(),
        )
    elif new_status == Enrollment.Status.ACTIVE:
        Entitlement.objects.filter(enrollment=locked).update(
            status=Entitlement.Status.VALID,
            revoked_at=None,
            revoke_reason="",
        )

    record_audit(
        action="enrollment.status_changed",
        target=locked,
        actor=actor,
        organization=locked.organization,
        reason=reason.strip(),
        request_id=request_id,
        metadata={"from": previous_status, "to": new_status},
    )
    return locked


def rebuild_course_progress(enrollment: Enrollment) -> CourseProgress:
    required_lessons = Lesson.objects.filter(
        module__course_version=enrollment.course_version,
        module__status="published",
        status=Lesson.Status.PUBLISHED,
        is_required=True,
    )
    total_weight = required_lessons.aggregate(value=Sum("weight"))["value"] or Decimal("0")
    completed_weight = required_lessons.filter(
        learner_progress__enrollment=enrollment,
        learner_progress__status=LessonProgress.Status.COMPLETED,
    ).aggregate(value=Sum("weight"))["value"] or Decimal("0")
    percent = Decimal("0")
    if total_weight > 0:
        percent = ((completed_weight / total_weight) * Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    progress, _ = CourseProgress.objects.update_or_create(
        enrollment=enrollment,
        defaults={
            "progress_percent": percent,
            "completed_required_weight": completed_weight,
            "total_required_weight": total_weight,
        },
    )
    return progress


@dataclass(frozen=True)
class ProgressResult:
    event: LearningEvent
    lesson_progress: LessonProgress
    course_progress: CourseProgress
    duplicate: bool


@transaction.atomic
def record_progress_event(
    *,
    actor,
    enrollment_id,
    lesson_id,
    client_event_id,
    event_type,
    occurred_at,
    position_seconds=0,
    request_id="",
) -> ProgressResult:
    existing = LearningEvent.objects.filter(client_event_id=client_event_id).first()
    if existing:
        if existing.user_id != actor.id:
            raise PermissionDenied("Event identifier belongs to another learner.")
        if (
            existing.enrollment_id != enrollment_id
            or existing.lesson_id != lesson_id
            or existing.event_type != event_type
            or existing.position_seconds != position_seconds
        ):
            raise ValidationError("Event identifier was already used with a different payload.")
        progress = LessonProgress.objects.get(enrollment=existing.enrollment, lesson=existing.lesson)
        course_progress = rebuild_course_progress(existing.enrollment)
        return ProgressResult(existing, progress, course_progress, True)

    # Lock only the enrollment row. ``entitlement`` is an optional one-to-one
    # relation, so asking PostgreSQL to lock every joined table would try to
    # apply FOR UPDATE to the nullable side of a LEFT OUTER JOIN.
    enrollment = Enrollment.objects.select_for_update(of=("self",)).select_related(
        "user", "course_version", "entitlement"
    ).get(pk=enrollment_id, user=actor)
    if not enrollment_has_access(enrollment):
        raise PermissionDenied("Course access is not currently valid.")

    lesson = Lesson.objects.select_related("module__course_version").get(
        pk=lesson_id,
        module__course_version=enrollment.course_version,
        status=Lesson.Status.PUBLISHED,
        module__status="published",
    )
    if position_seconds < 0 or (lesson.duration_seconds and position_seconds > lesson.duration_seconds + 5):
        raise ValidationError("Video position is outside the valid lesson duration.")
    if event_type == LearningEvent.EventType.VIDEO_PROGRESS and lesson.content_type != Lesson.ContentType.VIDEO:
        raise ValidationError("Video progress events are only valid for video lessons.")

    event = LearningEvent.objects.create(
        client_event_id=client_event_id,
        organization=enrollment.organization,
        user=actor,
        enrollment=enrollment,
        lesson=lesson,
        event_type=event_type,
        position_seconds=position_seconds,
        occurred_at=occurred_at,
    )
    progress, _ = LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
    now = timezone.now()
    progress.last_accessed_at = now
    if progress.first_started_at is None:
        progress.first_started_at = now
    if progress.status == LessonProgress.Status.NOT_STARTED:
        progress.status = LessonProgress.Status.IN_PROGRESS

    if event_type == LearningEvent.EventType.VIDEO_PROGRESS:
        progress.last_position_seconds = max(progress.last_position_seconds, position_seconds)
        if lesson.duration_seconds:
            watched_percent = min(
                Decimal("100"),
                (Decimal(progress.last_position_seconds) / Decimal(lesson.duration_seconds) * Decimal("100")).quantize(
                    Decimal("0.01"),
                    rounding=ROUND_HALF_UP,
                ),
            )
            progress.progress_percent = max(progress.progress_percent, watched_percent)
            if (
                lesson.completion_rule == Lesson.CompletionRule.VIDEO_THRESHOLD
                and watched_percent >= lesson.completion_threshold
            ):
                progress.status = LessonProgress.Status.COMPLETED
                progress.completed_at = progress.completed_at or now
                progress.completion_source = "video_threshold"
    elif event_type == LearningEvent.EventType.LESSON_VIEWED and lesson.completion_rule == Lesson.CompletionRule.VIEW:
        progress.status = LessonProgress.Status.COMPLETED
        progress.progress_percent = 100
        progress.completed_at = progress.completed_at or now
        progress.completion_source = "view_rule"
    elif event_type == LearningEvent.EventType.LESSON_COMPLETED:
        if lesson.completion_rule != Lesson.CompletionRule.MANUAL:
            raise ValidationError("This lesson cannot be completed manually.")
        progress.status = LessonProgress.Status.COMPLETED
        progress.progress_percent = 100
        progress.completed_at = progress.completed_at or now
        progress.completion_source = "learner_manual"
    progress.save()

    course_progress = rebuild_course_progress(enrollment)
    if course_progress.total_required_weight > 0 and course_progress.progress_percent == 100:
        if enrollment.status != Enrollment.Status.COMPLETED:
            enrollment.status = Enrollment.Status.COMPLETED
            enrollment.completed_at = now
            enrollment.save(update_fields=["status", "completed_at", "updated_at"])
            course_progress.completed_at = now
            course_progress.save(update_fields=["completed_at", "updated_at"])
            record_audit(
                action="course.completed",
                target=enrollment,
                actor=actor,
                organization=enrollment.organization,
                request_id=request_id,
                metadata={"course_version_id": str(enrollment.course_version_id)},
            )
    return ProgressResult(event, progress, course_progress, False)
