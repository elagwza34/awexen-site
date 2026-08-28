from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel


class Course(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class DeliveryMode(models.TextChoices):
        RECORDED = "recorded", "Recorded"
        ONLINE = "online", "Live online"
        ONSITE = "onsite", "On site"
        HYBRID = "hybrid", "Hybrid"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, related_name="courses")
    slug = models.SlugField(max_length=160)
    title = models.CharField(max_length=240)
    short_description = models.TextField(blank=True)
    delivery_mode = models.CharField(max_length=16, choices=DeliveryMode.choices, default=DeliveryMode.RECORDED)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(1)])
    currency = models.CharField(max_length=8, default="EGP")
    capacity = models.PositiveIntegerField(null=True, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_courses")
    current_version = models.ForeignKey(
        "CourseVersion",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="current_for_courses",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("organization", "slug"), name="unique_course_slug_per_org"),
            models.CheckConstraint(condition=models.Q(price__gt=0), name="course_price_must_be_positive"),
        ]
        indexes = [models.Index(fields=("organization", "status", "created_at"))]
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.title


class CourseVersion(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_REVIEW = "in_review", "In review"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="versions")
    version_number = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    title = models.CharField(max_length=240)
    short_description = models.TextField(blank=True)
    description = models.TextField(blank=True)
    language = models.CharField(max_length=12, default="ar")
    difficulty = models.CharField(max_length=32, default="all_levels")
    estimated_minutes = models.PositiveIntegerField(default=0)
    thumbnail_url = models.URLField(blank=True)
    learning_outcomes = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    target_audience = models.TextField(blank=True)
    change_notes = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_course_versions",
    )
    review_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_course_versions")

    class Meta:
        constraints = [models.UniqueConstraint(fields=("course", "version_number"), name="unique_course_version_number")]
        ordering = ("-version_number",)

    @property
    def organization_id(self):
        return self.course.organization_id

    def __str__(self) -> str:
        return f"{self.course.title} v{self.version_number}"


class CourseInstructor(TimeStampedModel):
    course_version = models.ForeignKey(CourseVersion, on_delete=models.CASCADE, related_name="instructors")
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="course_assignments")
    is_lead = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("course_version", "instructor"), name="unique_instructor_per_course_version")
        ]


class Module(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    course_version = models.ForeignKey(CourseVersion, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=240)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_modules")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("course_version", "sort_order"), name="unique_module_order_per_version")
        ]
        ordering = ("sort_order", "created_at")

    @property
    def organization_id(self):
        return self.course_version.course.organization_id

    def __str__(self) -> str:
        return self.title


class Lesson(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    class ContentType(models.TextChoices):
        TEXT = "text", "Text"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"
        DOCUMENT = "document", "Document"
        PRESENTATION = "presentation", "Presentation"
        EXTERNAL_URL = "external_url", "External URL"
        LIVE = "live", "Live session"

    class CompletionRule(models.TextChoices):
        MANUAL = "manual", "Manual completion"
        VIEW = "view", "Complete on view"
        VIDEO_THRESHOLD = "video_threshold", "Video threshold"

    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=240)
    summary = models.TextField(blank=True)
    content = models.TextField(blank=True)
    content_type = models.CharField(max_length=24, choices=ContentType.choices, default=ContentType.TEXT)
    video_url = models.URLField(blank=True)
    resource_url = models.URLField(blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    is_required = models.BooleanField(default=True)
    weight = models.DecimalField(max_digits=7, decimal_places=2, default=1)
    completion_rule = models.CharField(max_length=24, choices=CompletionRule.choices, default=CompletionRule.MANUAL)
    completion_threshold = models.PositiveSmallIntegerField(
        default=90,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_lessons")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("module", "sort_order"), name="unique_lesson_order_per_module"),
            models.CheckConstraint(condition=models.Q(weight__gt=0), name="lesson_weight_must_be_positive"),
        ]
        ordering = ("sort_order", "created_at")

    @property
    def organization_id(self):
        return self.module.course_version.course.organization_id

    def __str__(self) -> str:
        return self.title


class Cohort(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, related_name="cohorts")
    course_version = models.ForeignKey(CourseVersion, on_delete=models.PROTECT, related_name="cohorts")
    name = models.CharField(max_length=180)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default="Africa/Cairo")

    class Meta:
        indexes = [models.Index(fields=("organization", "status", "starts_at"))]
        ordering = ("-starts_at", "name")
