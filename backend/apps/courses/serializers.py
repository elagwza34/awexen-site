from django.db import transaction
from django.db.models import Max
from rest_framework import serializers

from apps.audit.services import record_audit
from apps.organizations.models import Organization
from apps.organizations.permissions import CONTENT_MANAGER_ROLES
from apps.organizations.services import has_org_role

from .models import Cohort, Course, CourseVersion, Lesson, Module


class CourseSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(read_only=True)
    current_version_id = serializers.UUIDField(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.filter(is_active=True),
    )

    class Meta:
        model = Course
        fields = (
            "id",
            "organization_id",
            "slug",
            "title",
            "short_description",
            "delivery_mode",
            "price",
            "currency",
            "capacity",
            "starts_at",
            "ends_at",
            "status",
            "owner_id",
            "current_version_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("status", "owner_id", "current_version_id", "created_at", "updated_at")

    def validate_organization_id(self, organization):
        request = self.context["request"]
        if self.instance and self.instance.organization_id != organization.id:
            raise serializers.ValidationError("A course cannot be moved between organizations.")
        if not has_org_role(request.user, organization.id, CONTENT_MANAGER_ROLES):
            raise serializers.ValidationError("You cannot create courses for this organization.")
        return organization

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("All courses are paid. Enter a price greater than zero.")
        return value

    def validate(self, attrs):
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
        record_audit(
            action="course.created",
            target=course,
            actor=request.user,
            organization=course.organization,
            request_id=getattr(request, "request_id", ""),
            metadata={"initial_version_id": str(version.id)},
        )
        return course


class CourseVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseVersion
        fields = (
            "id",
            "course",
            "version_number",
            "status",
            "title",
            "short_description",
            "description",
            "language",
            "difficulty",
            "estimated_minutes",
            "thumbnail_url",
            "learning_outcomes",
            "requirements",
            "target_audience",
            "change_notes",
            "published_at",
            "submitted_at",
            "reviewed_at",
            "reviewed_by_id",
            "review_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "version_number", "status", "published_at", "submitted_at", "reviewed_at",
            "reviewed_by_id", "review_notes", "created_at", "updated_at",
        )

    def validate_course(self, course):
        request = self.context["request"]
        if not has_org_role(request.user, course.organization_id, CONTENT_MANAGER_ROLES):
            raise serializers.ValidationError("You cannot manage this course.")
        return course

    def validate(self, attrs):
        if self.instance and self.instance.status == CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Published course versions are immutable. Create a new version instead.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        course = validated_data["course"]
        next_version = (course.versions.aggregate(value=Max("version_number"))["value"] or 0) + 1
        return CourseVersion.objects.create(
            version_number=next_version,
            created_by=request.user,
            **validated_data,
        )


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "course_version", "title", "description", "sort_order", "status", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")

    def validate_course_version(self, version):
        request = self.context["request"]
        if version.status == CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Published course versions are immutable.")
        if not has_org_role(request.user, version.course.organization_id, CONTENT_MANAGER_ROLES):
            raise serializers.ValidationError("You cannot manage this course version.")
        return version

    def validate(self, attrs):
        version = attrs.get("course_version", getattr(self.instance, "course_version", None))
        if version and version.status == CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Published course versions are immutable.")
        return attrs

    def create(self, validated_data):
        return Module.objects.create(created_by=self.context["request"].user, **validated_data)


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = (
            "id",
            "module",
            "title",
            "summary",
            "content",
            "content_type",
            "video_url",
            "resource_url",
            "duration_seconds",
            "sort_order",
            "status",
            "is_required",
            "weight",
            "completion_rule",
            "completion_threshold",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def validate_module(self, module):
        request = self.context["request"]
        if module.course_version.status == CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Published course versions are immutable.")
        if not has_org_role(request.user, module.organization_id, CONTENT_MANAGER_ROLES):
            raise serializers.ValidationError("You cannot manage this module.")
        return module

    def validate(self, attrs):
        module = attrs.get("module", getattr(self.instance, "module", None))
        if module and module.course_version.status == CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Published course versions are immutable.")
        content_type = attrs.get("content_type", getattr(self.instance, "content_type", Lesson.ContentType.TEXT))
        completion_rule = attrs.get("completion_rule", getattr(self.instance, "completion_rule", Lesson.CompletionRule.MANUAL))
        duration_seconds = attrs.get("duration_seconds", getattr(self.instance, "duration_seconds", 0))
        if completion_rule == Lesson.CompletionRule.VIDEO_THRESHOLD and content_type != Lesson.ContentType.VIDEO:
            raise serializers.ValidationError({"completion_rule": "Video threshold is only valid for video lessons."})
        if completion_rule == Lesson.CompletionRule.VIDEO_THRESHOLD and duration_seconds <= 0:
            raise serializers.ValidationError({"duration_seconds": "A video duration is required for threshold completion."})
        return attrs

    def create(self, validated_data):
        return Lesson.objects.create(created_by=self.context["request"].user, **validated_data)


class CohortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")

    def validate(self, attrs):
        organization = attrs.get("organization", getattr(self.instance, "organization", None))
        version = attrs.get("course_version", getattr(self.instance, "course_version", None))
        request = self.context["request"]
        if not organization or not has_org_role(request.user, organization.id, CONTENT_MANAGER_ROLES):
            raise serializers.ValidationError("You cannot manage cohorts for this organization.")
        if version and version.course.organization_id != organization.id:
            raise serializers.ValidationError({"course_version": "Course version belongs to another organization."})
        return attrs
