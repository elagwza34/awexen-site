import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel


class Enrollment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        WITHDRAWN = "withdrawn", "Withdrawn"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, related_name="enrollments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lms_enrollments")
    course_version = models.ForeignKey("courses.CourseVersion", on_delete=models.PROTECT, related_name="enrollments")
    cohort = models.ForeignKey("courses.Cohort", on_delete=models.PROTECT, null=True, blank=True, related_name="enrollments")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_enrollments")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "course_version"),
                condition=models.Q(cohort__isnull=True),
                name="unique_direct_enrollment_per_version",
            ),
            models.UniqueConstraint(
                fields=("user", "course_version", "cohort"),
                condition=models.Q(cohort__isnull=False),
                name="unique_cohort_enrollment_per_version",
            ),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "created_at")),
            models.Index(fields=("user", "status", "created_at")),
        ]

    def __str__(self) -> str:
        return f"{self.user} · {self.course_version}"


class Entitlement(TimeStampedModel):
    class Source(models.TextChoices):
        FREE = "free", "Free enrollment"
        MANUAL = "manual", "Manual assignment"
        ORGANIZATION = "organization", "Organisation assignment"
        PURCHASE = "purchase", "One-time purchase"
        SUBSCRIPTION = "subscription", "Subscription"
        SCHOLARSHIP = "scholarship", "Scholarship"

    class Status(models.TextChoices):
        VALID = "valid", "Valid"
        REVOKED = "revoked", "Revoked"
        EXPIRED = "expired", "Expired"

    enrollment = models.OneToOneField(Enrollment, on_delete=models.PROTECT, related_name="entitlement")
    source = models.CharField(max_length=24, choices=Source.choices, default=Source.MANUAL)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.VALID)
    access_starts_at = models.DateTimeField(null=True, blank=True)
    access_ends_at = models.DateTimeField(null=True, blank=True)
    granted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="granted_entitlements")
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=("status", "access_starts_at", "access_ends_at"))]


class LearningEvent(models.Model):
    class EventType(models.TextChoices):
        LESSON_STARTED = "lesson_started", "Lesson started"
        LESSON_VIEWED = "lesson_viewed", "Lesson viewed"
        LESSON_COMPLETED = "lesson_completed", "Lesson completed"
        VIDEO_PROGRESS = "video_progress", "Video progress"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_event_id = models.UUIDField(unique=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, related_name="learning_events")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="learning_events")
    enrollment = models.ForeignKey(Enrollment, on_delete=models.PROTECT, related_name="events")
    lesson = models.ForeignKey("courses.Lesson", on_delete=models.PROTECT, related_name="learning_events")
    event_type = models.CharField(max_length=24, choices=EventType.choices)
    position_seconds = models.PositiveIntegerField(default=0)
    occurred_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("received_at",)
        indexes = [
            models.Index(fields=("enrollment", "lesson", "received_at")),
            models.Index(fields=("organization", "event_type", "received_at")),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Learning events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Learning events cannot be deleted.")


class LessonProgress(TimeStampedModel):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        EXPIRED = "expired", "Expired"
        EXEMPT = "exempt", "Exempt"

    enrollment = models.ForeignKey(Enrollment, on_delete=models.PROTECT, related_name="lesson_progress")
    lesson = models.ForeignKey("courses.Lesson", on_delete=models.PROTECT, related_name="learner_progress")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    first_started_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    last_position_seconds = models.PositiveIntegerField(default=0)
    progress_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    completion_source = models.CharField(max_length=32, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("enrollment", "lesson"), name="unique_progress_per_lesson")]
        indexes = [models.Index(fields=("enrollment", "status"))]


class CourseProgress(TimeStampedModel):
    enrollment = models.OneToOneField(Enrollment, on_delete=models.PROTECT, related_name="course_progress")
    progress_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    completed_required_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_required_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    calculated_at = models.DateTimeField(auto_now=True)
