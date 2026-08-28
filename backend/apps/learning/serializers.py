from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.courses.models import Cohort, CourseVersion, Lesson
from apps.organizations.models import Organization
from apps.organizations.permissions import ENROLLMENT_MANAGER_ROLES
from apps.organizations.services import has_org_role

from .models import Enrollment, LearningEvent, LessonProgress
from .services import create_manual_enrollment, enrollment_has_access


User = get_user_model()


class AdminEnrollmentSerializer(serializers.ModelSerializer):
    student_email = serializers.EmailField(source="user.email", read_only=True)
    student_name = serializers.CharField(source="user.full_name", read_only=True)
    course_title = serializers.CharField(source="course_version.course.title", read_only=True)
    version_number = serializers.IntegerField(source="course_version.version_number", read_only=True)
    progress_percent = serializers.DecimalField(
        source="course_progress.progress_percent",
        max_digits=5,
        decimal_places=2,
        read_only=True,
        default=0,
    )

    class Meta:
        model = Enrollment
        fields = (
            "id",
            "organization_id",
            "user_id",
            "student_email",
            "student_name",
            "course_version_id",
            "course_title",
            "version_number",
            "cohort_id",
            "status",
            "status_reason",
            "progress_percent",
            "enrolled_at",
            "activated_at",
            "completed_at",
        )
        read_only_fields = fields


class EnrollmentCreateSerializer(serializers.Serializer):
    organization_id = serializers.PrimaryKeyRelatedField(source="organization", queryset=Organization.objects.filter(is_active=True))
    student_email = serializers.EmailField()
    course_version_id = serializers.PrimaryKeyRelatedField(
        source="course_version",
        queryset=CourseVersion.objects.select_related("course"),
    )
    cohort_id = serializers.PrimaryKeyRelatedField(
        source="cohort",
        queryset=Cohort.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        request = self.context["request"]
        organization = attrs["organization"]
        version = attrs["course_version"]
        cohort = attrs.get("cohort")
        if not has_org_role(request.user, organization.id, ENROLLMENT_MANAGER_ROLES):
            raise serializers.ValidationError("You cannot manage enrollments for this organization.")
        if version.course.organization_id != organization.id:
            raise serializers.ValidationError({"course_version_id": "Course version belongs to another organization."})
        if version.status != CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError({"course_version_id": "Only published course versions can be assigned."})
        if cohort and (cohort.organization_id != organization.id or cohort.course_version_id != version.id):
            raise serializers.ValidationError({"cohort_id": "Cohort does not match the organization and course version."})
        try:
            attrs["student"] = User.objects.get(email__iexact=attrs.pop("student_email"), is_active=True)
        except User.DoesNotExist as error:
            raise serializers.ValidationError({"student_email": "Student must sign in once before enrollment."}) from error
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return create_manual_enrollment(
            organization=validated_data["organization"],
            user=validated_data["student"],
            course_version=validated_data["course_version"],
            cohort=validated_data.get("cohort"),
            actor=request.user,
            request_id=getattr(request, "request_id", ""),
        )


class EnrollmentTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Enrollment.Status.choices)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class ProgressEventSerializer(serializers.Serializer):
    event_id = serializers.UUIDField()
    enrollment_id = serializers.UUIDField()
    lesson_id = serializers.UUIDField()
    event_type = serializers.ChoiceField(choices=LearningEvent.EventType.choices)
    occurred_at = serializers.DateTimeField(default=timezone.now)
    position_seconds = serializers.IntegerField(min_value=0, default=0)

    def validate_occurred_at(self, value):
        now = timezone.now()
        if value > now + timedelta(minutes=5):
            raise serializers.ValidationError("Event timestamp is too far in the future.")
        if value < now - timedelta(days=30):
            raise serializers.ValidationError("Event timestamp is too old.")
        return value


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = (
            "lesson_id",
            "status",
            "first_started_at",
            "last_accessed_at",
            "completed_at",
            "time_spent_seconds",
            "last_position_seconds",
            "progress_percent",
        )


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    course = serializers.SerializerMethodField()
    progress_percent = serializers.DecimalField(
        source="course_progress.progress_percent",
        max_digits=5,
        decimal_places=2,
        read_only=True,
        default=0,
    )
    completed_lessons = serializers.SerializerMethodField()
    total_lessons = serializers.SerializerMethodField()
    access_valid = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = (
            "id",
            "status",
            "enrolled_at",
            "completed_at",
            "course",
            "progress_percent",
            "completed_lessons",
            "total_lessons",
            "access_valid",
        )

    @extend_schema_field(serializers.DictField())
    def get_course(self, enrollment) -> dict[str, object]:
        version = enrollment.course_version
        course = version.course
        return {
            "id": course.id,
            "slug": course.slug,
            "title": version.title,
            "short_description": version.short_description,
            "instructor": next((item.instructor.full_name or item.instructor.email for item in version.instructors.all()), "فريق Awexen"),
            "duration": version.estimated_minutes,
            "featured_image": version.thumbnail_url or None,
            "version_id": version.id,
            "version_number": version.version_number,
            "delivery_mode": course.delivery_mode,
            "starts_at": enrollment.cohort.starts_at if enrollment.cohort_id else course.starts_at,
            "ends_at": enrollment.cohort.ends_at if enrollment.cohort_id else course.ends_at,
        }

    def get_completed_lessons(self, enrollment) -> int:
        return sum(1 for item in enrollment.lesson_progress.all() if item.status == LessonProgress.Status.COMPLETED)

    def get_total_lessons(self, enrollment) -> int:
        return sum(
            len(module.lessons.all())
            for module in enrollment.course_version.modules.all()
            if module.status == "published"
        )

    def get_access_valid(self, enrollment) -> bool:
        return enrollment_has_access(enrollment)


class LearningLessonSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()
    last_position_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = (
            "id",
            "title",
            "summary",
            "content",
            "content_type",
            "video_url",
            "resource_url",
            "duration_seconds",
            "sort_order",
            "completion_rule",
            "completion_threshold",
            "completed",
            "last_position_seconds",
        )

    def _progress(self, lesson):
        return self.context.get("progress_by_lesson", {}).get(lesson.id)

    def get_completed(self, lesson) -> bool:
        progress = self._progress(lesson)
        return bool(progress and progress.status == LessonProgress.Status.COMPLETED)

    def get_last_position_seconds(self, lesson) -> int:
        progress = self._progress(lesson)
        return progress.last_position_seconds if progress else 0
