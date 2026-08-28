from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.organizations.models import Membership
from apps.organizations.permissions import CONTENT_MANAGER_ROLES, IsLmsContentManager

from .models import Cohort, Course, CourseVersion, Lesson, Module
from .catalog import sync_course_to_public_catalog
from .instructor_serializers import (
    CourseReviewSerializer,
    InstructorCourseSerializer,
    InstructorLessonSerializer,
    InstructorModuleSerializer,
    InstructorVersionSerializer,
    validate_draft_owned_version,
)
from .serializers import CohortSerializer, CourseSerializer, CourseVersionSerializer, LessonSerializer, ModuleSerializer
from .services import publish_course_version, reject_course_version, submit_course_version_for_review
from apps.organizations.permissions import IsInstructor


def managed_organization_ids(user):
    if user.platform_role == "super_admin":
        return None
    return Membership.objects.filter(user=user, is_active=True, role__in=CONTENT_MANAGER_ROLES).values_list(
        "organization_id", flat=True
    )


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.none()
    serializer_class = CourseSerializer
    permission_classes = (IsLmsContentManager,)
    filterset_fields = ("organization", "status")
    search_fields = ("title", "slug")
    ordering_fields = ("created_at", "title")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Course.objects.none()
        queryset = Course.objects.select_related("organization", "owner", "current_version")
        organization_ids = managed_organization_ids(self.request.user)
        return queryset if organization_ids is None else queryset.filter(organization_id__in=organization_ids)

    def perform_destroy(self, instance):
        if instance.versions.exists():
            raise serializers.ValidationError("Courses with version history cannot be deleted. Archive the course instead.")
        instance.delete()

    def perform_update(self, serializer):
        course = serializer.save()
        if course.status == Course.Status.PUBLISHED and course.current_version_id:
            sync_course_to_public_catalog(course)


class CourseVersionViewSet(viewsets.ModelViewSet):
    queryset = CourseVersion.objects.none()
    serializer_class = CourseVersionSerializer
    permission_classes = (IsLmsContentManager,)
    filterset_fields = ("course", "status")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CourseVersion.objects.none()
        queryset = CourseVersion.objects.select_related("course__organization", "created_by")
        organization_ids = managed_organization_ids(self.request.user)
        return queryset if organization_ids is None else queryset.filter(course__organization_id__in=organization_ids)

    @action(detail=True, methods=("post",))
    def publish(self, request, pk=None):
        version = self.get_object()
        try:
            published = publish_course_version(
                version=version,
                actor=request.user,
                request_id=getattr(request, "request_id", ""),
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response(self.get_serializer(published).data)

    @action(detail=True, methods=("post",))
    def reject(self, request, pk=None):
        serializer = CourseReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            rejected = reject_course_version(
                version=self.get_object(),
                actor=request.user,
                reason=serializer.validated_data.get("reason", ""),
                request_id=getattr(request, "request_id", ""),
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response(self.get_serializer(rejected).data)

    def perform_destroy(self, instance):
        if instance.status == CourseVersion.Status.PUBLISHED or instance.enrollments.exists():
            raise serializers.ValidationError("Published or assigned course versions cannot be deleted.")
        instance.delete()


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.none()
    serializer_class = ModuleSerializer
    permission_classes = (IsLmsContentManager,)
    filterset_fields = ("course_version", "status")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Module.objects.none()
        queryset = Module.objects.select_related("course_version__course__organization", "created_by")
        organization_ids = managed_organization_ids(self.request.user)
        return queryset if organization_ids is None else queryset.filter(course_version__course__organization_id__in=organization_ids)

    def perform_destroy(self, instance):
        if instance.course_version.status == CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Published course versions are immutable.")
        instance.delete()


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.none()
    serializer_class = LessonSerializer
    permission_classes = (IsLmsContentManager,)
    filterset_fields = ("module", "status", "content_type")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Lesson.objects.none()
        queryset = Lesson.objects.select_related("module__course_version__course__organization", "created_by")
        organization_ids = managed_organization_ids(self.request.user)
        if organization_ids is not None:
            queryset = queryset.filter(module__course_version__course__organization_id__in=organization_ids)
        course_version_id = self.request.query_params.get("course_version")
        if course_version_id:
            queryset = queryset.filter(module__course_version_id=course_version_id)
        return queryset

    def perform_destroy(self, instance):
        if instance.module.course_version.status == CourseVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Published course versions are immutable.")
        instance.delete()


class CohortViewSet(viewsets.ModelViewSet):
    queryset = Cohort.objects.none()
    serializer_class = CohortSerializer
    permission_classes = (IsLmsContentManager,)
    filterset_fields = ("organization", "course_version", "status")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Cohort.objects.none()
        queryset = Cohort.objects.select_related("organization", "course_version__course")
        organization_ids = managed_organization_ids(self.request.user)
        return queryset if organization_ids is None else queryset.filter(organization_id__in=organization_ids)

    def perform_destroy(self, instance):
        if instance.enrollments.exists():
            raise serializers.ValidationError("Cohorts with enrollments cannot be deleted.")
        instance.delete()


class InstructorCourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.none()
    serializer_class = InstructorCourseSerializer
    permission_classes = (IsInstructor,)
    filterset_fields = ("organization", "status")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Course.objects.none()
        return Course.objects.filter(owner=self.request.user).select_related("organization", "current_version")

    def perform_destroy(self, instance):
        if instance.versions.exclude(status=CourseVersion.Status.DRAFT).exists():
            raise serializers.ValidationError("A reviewed or published course cannot be deleted.")
        instance.delete()


class InstructorVersionViewSet(viewsets.ModelViewSet):
    queryset = CourseVersion.objects.none()
    serializer_class = InstructorVersionSerializer
    permission_classes = (IsInstructor,)
    filterset_fields = ("course", "status")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CourseVersion.objects.none()
        return CourseVersion.objects.filter(course__owner=self.request.user).select_related("course__organization")

    @action(detail=True, methods=("post",))
    def submit(self, request, pk=None):
        try:
            submitted = submit_course_version_for_review(
                version=self.get_object(), actor=request.user, request_id=getattr(request, "request_id", "")
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response(self.get_serializer(submitted).data)

    def perform_destroy(self, instance):
        validate_draft_owned_version(instance, self.request.user)
        instance.delete()


class InstructorModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.none()
    serializer_class = InstructorModuleSerializer
    permission_classes = (IsInstructor,)
    filterset_fields = ("course_version", "status")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Module.objects.none()
        return Module.objects.filter(course_version__course__owner=self.request.user).select_related("course_version__course")

    def perform_destroy(self, instance):
        validate_draft_owned_version(instance.course_version, self.request.user)
        instance.delete()


class InstructorLessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.none()
    serializer_class = InstructorLessonSerializer
    permission_classes = (IsInstructor,)
    filterset_fields = ("module", "status", "content_type")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Lesson.objects.none()
        queryset = Lesson.objects.filter(module__course_version__course__owner=self.request.user).select_related(
            "module__course_version__course"
        )
        version_id = self.request.query_params.get("course_version")
        return queryset.filter(module__course_version_id=version_id) if version_id else queryset

    def perform_destroy(self, instance):
        validate_draft_owned_version(instance.module.course_version, self.request.user)
        instance.delete()
