import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.cache import cache
from django.db import connection
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import generics, mixins, serializers, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Lesson, Module
from apps.organizations.models import Membership
from apps.organizations.permissions import ENROLLMENT_MANAGER_ROLES, IsEnrollmentManager

from .models import Enrollment, LessonProgress
from .serializers import (
    AdminEnrollmentSerializer,
    EnrollmentCreateSerializer,
    EnrollmentTransitionSerializer,
    LearningLessonSerializer,
    ProgressEventSerializer,
    StudentEnrollmentSerializer,
)
from .services import enrollment_has_access, record_progress_event, transition_enrollment


logger = logging.getLogger(__name__)


def student_enrollment_queryset(user):
    published_lessons = Lesson.objects.filter(status=Lesson.Status.PUBLISHED).order_by("sort_order")
    published_modules = Module.objects.filter(status=Module.Status.PUBLISHED).prefetch_related(
        Prefetch("lessons", queryset=published_lessons)
    ).order_by("sort_order")
    return Enrollment.objects.filter(user=user).select_related(
        "organization",
        "course_version__course",
        "cohort",
        "entitlement",
        "course_progress",
    ).prefetch_related(
        "lesson_progress",
        "course_version__instructors__instructor",
        Prefetch("course_version__modules", queryset=published_modules),
    )


class HealthView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        return Response({"ok": True, "service": "awexen-lms", "version": "v1"})


class ReadinessView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    @extend_schema(responses={200: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT})
    def get(self, request):
        checks = {"database": False, "cache": False}
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                checks["database"] = cursor.fetchone() == (1,)
            cache.set("awexen-readiness", "ok", timeout=10)
            checks["cache"] = cache.get("awexen-readiness") == "ok"
        except Exception:
            logger.exception("LMS readiness check failed")
            return Response({"ok": False, "checks": checks}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"ok": all(checks.values()), "checks": checks})


class AdminEnrollmentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Enrollment.objects.none()
    permission_classes = (IsEnrollmentManager,)
    filterset_fields = ("organization", "course_version", "cohort", "status")
    search_fields = ("user__email", "user__full_name", "course_version__title")
    ordering_fields = ("created_at", "activated_at", "completed_at")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Enrollment.objects.none()
        queryset = Enrollment.objects.select_related(
            "organization", "user", "course_version__course", "cohort", "course_progress"
        )
        if self.request.user.platform_role == "super_admin":
            return queryset
        organization_ids = Membership.objects.filter(
            user=self.request.user,
            is_active=True,
            role__in=ENROLLMENT_MANAGER_ROLES,
        ).values_list("organization_id", flat=True)
        return queryset.filter(organization_id__in=organization_ids)

    def get_serializer_class(self):
        return EnrollmentCreateSerializer if self.action == "create" else AdminEnrollmentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enrollment = serializer.save()
        output = AdminEnrollmentSerializer(enrollment, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        enrollment = self.get_object()
        serializer = EnrollmentTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            updated = transition_enrollment(
                enrollment=enrollment,
                new_status=serializer.validated_data["status"],
                reason=serializer.validated_data.get("reason", ""),
                actor=request.user,
                request_id=getattr(request, "request_id", ""),
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response(AdminEnrollmentSerializer(updated, context={"request": request}).data)


class MyEnrollmentsView(generics.ListAPIView):
    serializer_class = StudentEnrollmentSerializer
    pagination_class = None

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Enrollment.objects.none()
        return student_enrollment_queryset(self.request.user).order_by("-enrolled_at")


class LearningCourseView(APIView):
    @extend_schema(operation_id="learning_enrollment_detail", responses={200: OpenApiTypes.OBJECT})
    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(student_enrollment_queryset(request.user), pk=enrollment_id)
        if not enrollment_has_access(enrollment):
            raise DjangoPermissionDenied("Course access is not currently valid.")

        progress_by_lesson = {item.lesson_id: item for item in enrollment.lesson_progress.all()}
        modules = []
        for module in enrollment.course_version.modules.all():
            modules.append({
                "id": module.id,
                "title": module.title,
                "description": module.description,
                "sort_order": module.sort_order,
                "lessons": LearningLessonSerializer(
                    module.lessons.all(),
                    many=True,
                    context={"request": request, "progress_by_lesson": progress_by_lesson},
                ).data,
            })
        return Response({
            "enrollment": AdminEnrollmentSerializer(enrollment, context={"request": request}).data,
            "course": StudentEnrollmentSerializer(enrollment, context={"request": request}).data["course"],
            "modules": modules,
            "progress": {
                "percent": enrollment.course_progress.progress_percent,
                "completed_at": enrollment.course_progress.completed_at,
            },
        })


class ProgressEventView(APIView):
    @extend_schema(request=ProgressEventSerializer, responses={201: OpenApiTypes.OBJECT})
    def post(self, request):
        serializer = ProgressEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            result = record_progress_event(
                actor=request.user,
                enrollment_id=data["enrollment_id"],
                lesson_id=data["lesson_id"],
                client_event_id=data["event_id"],
                event_type=data["event_type"],
                occurred_at=data["occurred_at"],
                position_seconds=data["position_seconds"],
                request_id=getattr(request, "request_id", ""),
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response({
            "event_id": result.event.client_event_id,
            "duplicate": result.duplicate,
            "lesson": {
                "id": result.lesson_progress.lesson_id,
                "status": result.lesson_progress.status,
                "completed": result.lesson_progress.status == LessonProgress.Status.COMPLETED,
                "last_position_seconds": result.lesson_progress.last_position_seconds,
            },
            "course_progress_percent": result.course_progress.progress_percent,
        }, status=status.HTTP_200_OK if result.duplicate else status.HTTP_201_CREATED)
