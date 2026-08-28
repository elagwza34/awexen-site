from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course
from apps.organizations.models import Membership
from apps.organizations.permissions import ENROLLMENT_MANAGER_ROLES, IsEnrollmentManager

from .models import CourseBooking
from .serializers import (
    BookingReviewSerializer,
    CheckoutCourseSerializer,
    CourseBookingCreateSerializer,
    CourseBookingSerializer,
    PaymentProofSerializer,
)
from .services import approve_course_booking, reject_course_booking


def booking_queryset():
    return CourseBooking.objects.select_related(
        "organization", "user", "course_version__course", "reviewed_by", "enrollment"
    )


class CheckoutCourseView(APIView):
    @extend_schema(responses={200: CheckoutCourseSerializer})
    def get(self, request, slug):
        course = get_object_or_404(
            Course.objects.select_related("current_version"),
            slug=slug,
            status=Course.Status.PUBLISHED,
            current_version__status="published",
        )
        return Response(CheckoutCourseSerializer(course).data)


class MyBookingViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = CourseBooking.objects.none()
    pagination_class = None

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CourseBooking.objects.none()
        return booking_queryset().filter(user=self.request.user)

    def get_serializer_class(self):
        return CourseBookingCreateSerializer if self.action == "create" else CourseBookingSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(CourseBookingSerializer(booking, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=("post",), url_path="submit-proof")
    def submit_proof(self, request, pk=None):
        booking = self.get_object()
        serializer = PaymentProofSerializer(booking, data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            updated = serializer.save()
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response(CourseBookingSerializer(updated, context={"request": request}).data)


class AdminPaymentBookingViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = CourseBooking.objects.none()
    serializer_class = CourseBookingSerializer
    permission_classes = (IsEnrollmentManager,)
    filterset_fields = ("organization", "status", "payment_method")
    search_fields = ("user__email", "user__full_name", "phone", "course_version__title")
    ordering_fields = ("created_at", "payment_submitted_at", "reviewed_at")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CourseBooking.objects.none()
        queryset = booking_queryset()
        if self.request.user.platform_role == "super_admin":
            return queryset
        organization_ids = Membership.objects.filter(
            user=self.request.user,
            is_active=True,
            role__in=ENROLLMENT_MANAGER_ROLES,
        ).values_list("organization_id", flat=True)
        return queryset.filter(organization_id__in=organization_ids)

    def _review_data(self, request):
        serializer = BookingReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    @action(detail=True, methods=("post",))
    def approve(self, request, pk=None):
        self._review_data(request)
        try:
            booking = approve_course_booking(
                booking=self.get_object(), actor=request.user, request_id=getattr(request, "request_id", "")
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=("post",))
    def reject(self, request, pk=None):
        data = self._review_data(request)
        try:
            booking = reject_course_booking(
                booking=self.get_object(), actor=request.user, reason=data.get("reason", ""),
                request_id=getattr(request, "request_id", ""),
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        return Response(self.get_serializer(booking).data)
