from django.db import transaction
from django.db.models import Max
from rest_framework import serializers

from apps.audit.services import record_audit
from apps.organizations.models import Membership, Organization

from .models import Course, CourseInstructor, CourseVersion, Lesson, Module


def instructor_can_manage(user, organization_id) -> bool:
    return Membership.objects.filter(
        user=user,
        organization_id=organization_id,
        role=Membership.Role.INSTRUCTOR,
        is_active=True,
    ).exists()


def validate_draft_owned_version(version, user):
    if version.course.owner_id != user.id:
        raise serializers.ValidationError("You can only edit your own courses.")
    if version.status != CourseVersion.Status.DRAFT:
        raise serializers.ValidationError("Only draft course versions can be edited.")


class InstructorCourseSerializer(serializers.ModelSerializer):
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.filter(is_active=True),
    )
    current_version_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Course
        fields = (
            "id", "organization_id", "slug", "title", "short_description", "delivery_mode", "price",
            "currency", "capacity", "starts_at", "ends_at", "status", "current_version_id", "created_at", "updated_at",
        )
        read_only_fields = ("status", "current_version_id", "created_at", "updated_at")

    def validate_organization_id(self, organization):
        if self.instance and self.instance.organization_id != organization.id:
            raise serializers.ValidationError("A course cannot be moved between organizations.")
        if not instructor_can_manage(self.context["request"].user, organization.id):
            raise serializers.ValidationError("You are not an instructor in this organization.")
        return organization

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("All courses are paid. Enter a price greater than zero.")
        return value

    def validate(self, attrs):
        if self.instance and self.instance.status != Course.Status.DRAFT:
            raise serializers.ValidationError("Published courses cannot be edited from the instructor dashboard.")
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({"ends_at": "Course end time must be after its start time."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        course = Course.objects.create(owner=request.user, **validated_data)
        version = CourseVersion.objects.create(
            course=course,
            version_number=1,
            title=course.title,
            short_description=course.short_description,
            created_by=request.user,
        )
        CourseInstructor.objects.create(course_version=version, instructor=request.user, is_lead=True)
        record_audit(
            action="instructor.course_created",
            target=course,
            actor=request.user,
            organization=course.organization,
            request_id=getattr(request, "request_id", ""),
            metadata={"initial_version_id": str(version.id)},
        )
        return course


class InstructorVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseVersion
        fields = (
            "id", "course", "version_number", "status", "title", "short_description", "description",
            "language", "difficulty", "estimated_minutes", "thumbnail_url", "learning_outcomes", "requirements",
            "target_audience", "change_notes", "submitted_at", "reviewed_at", "review_notes", "created_at", "updated_at",
        )
        read_only_fields = (
            "version_number", "status", "submitted_at", "reviewed_at", "review_notes", "created_at", "updated_at",
        )

    def validate_course(self, course):
        if course.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("You can only manage your own course.")
        return course

    def validate(self, attrs):
        if self.instance:
            validate_draft_owned_version(self.instance, self.context["request"].user)
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        course = validated_data["course"]
        next_version = (course.versions.aggregate(value=Max("version_number"))["value"] or 0) + 1
        version = CourseVersion.objects.create(version_number=next_version, created_by=request.user, **validated_data)
        CourseInstructor.objects.create(course_version=version, instructor=request.user, is_lead=True)
        return version


class InstructorModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "course_version", "title", "description", "sort_order", "status", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")

    def validate(self, attrs):
        version = attrs.get("course_version", getattr(self.instance, "course_version", None))
        validate_draft_owned_version(version, self.context["request"].user)
        return attrs

    def create(self, validated_data):
        return Module.objects.create(created_by=self.context["request"].user, **validated_data)


class InstructorLessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = (
            "id", "module", "title", "summary", "content", "content_type", "video_url", "resource_url",
            "duration_seconds", "sort_order", "status", "is_required", "weight", "completion_rule",
            "completion_threshold", "created_at", "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def validate(self, attrs):
        module = attrs.get("module", getattr(self.instance, "module", None))
        validate_draft_owned_version(module.course_version, self.context["request"].user)
        content_type = attrs.get("content_type", getattr(self.instance, "content_type", Lesson.ContentType.TEXT))
        completion_rule = attrs.get("completion_rule", getattr(self.instance, "completion_rule", Lesson.CompletionRule.MANUAL))
        duration = attrs.get("duration_seconds", getattr(self.instance, "duration_seconds", 0))
        if completion_rule == Lesson.CompletionRule.VIDEO_THRESHOLD and content_type != Lesson.ContentType.VIDEO:
            raise serializers.ValidationError({"completion_rule": "Video threshold requires a video lesson."})
        if completion_rule == Lesson.CompletionRule.VIDEO_THRESHOLD and duration <= 0:
            raise serializers.ValidationError({"duration_seconds": "Video duration is required."})
        return attrs

    def create(self, validated_data):
        return Lesson.objects.create(created_by=self.context["request"].user, **validated_data)


class CourseReviewSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=2000, required=False, allow_blank=True)
