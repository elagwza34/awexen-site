from django.conf import settings
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.courses.models import Course

from .models import CourseBooking
from .services import create_course_booking, submit_payment_proof


class CheckoutCourseSerializer(serializers.ModelSerializer):
    version_id = serializers.UUIDField(source="current_version_id", read_only=True)

    class Meta:
        model = Course
        fields = (
            "id", "slug", "title", "short_description", "delivery_mode", "price", "currency",
            "capacity", "starts_at", "ends_at", "version_id",
        )


class CourseBookingSerializer(serializers.ModelSerializer):
    course = serializers.SerializerMethodField()
    student_name = serializers.CharField(source="user.full_name", read_only=True)
    student_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = CourseBooking
        fields = (
            "id", "status", "amount", "currency", "payment_method", "payment_phone", "phone",
            "experience_level", "goal", "proof_path", "proof_content_type", "proof_size",
            "payment_submitted_at", "reviewed_at", "review_notes", "enrollment_id", "created_at",
            "updated_at", "course", "student_name", "student_email",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.DictField())
    def get_course(self, booking) -> dict[str, object]:
        course = booking.course_version.course
        return {
            "id": str(course.id),
            "slug": course.slug,
            "title": booking.course_version.title,
            "delivery_mode": course.delivery_mode,
            "starts_at": course.starts_at,
            "ends_at": course.ends_at,
            "version_id": str(booking.course_version_id),
        }


class CourseBookingCreateSerializer(serializers.Serializer):
    course_slug = serializers.SlugField(max_length=160)
    phone = serializers.CharField(max_length=32)
    experience_level = serializers.CharField(max_length=120, required=False, allow_blank=True)
    goal = serializers.CharField(max_length=3000, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=CourseBooking.PaymentMethod.choices)

    def validate(self, attrs):
        try:
            course = Course.objects.select_related("organization", "current_version").get(
                slug=attrs.pop("course_slug"),
                status=Course.Status.PUBLISHED,
                current_version__status="published",
            )
        except Course.DoesNotExist as error:
            raise serializers.ValidationError({"course_slug": "This course is not open for booking."}) from error
        if course.price <= 0:
            raise serializers.ValidationError({"course_slug": "This course does not have a valid paid price."})
        attrs["course"] = course
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return create_course_booking(
            user=request.user,
            request_id=getattr(request, "request_id", ""),
            **validated_data,
        )


class PaymentProofSerializer(serializers.Serializer):
    proof_path = serializers.CharField(max_length=500)
    content_type = serializers.ChoiceField(choices=("image/jpeg", "image/png", "application/pdf"))
    size = serializers.IntegerField(min_value=1, max_value=settings.LMS_PAYMENT_PROOF_MAX_BYTES)

    def update(self, instance, validated_data):
        request = self.context["request"]
        claims = request.auth if isinstance(request.auth, dict) else {}
        return submit_payment_proof(
            booking=instance,
            actor=request.user,
            storage_owner_id=str(claims.get("sub", "")),
            request_id=getattr(request, "request_id", ""),
            **validated_data,
        )


class BookingReviewSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=2000, required=False, allow_blank=True)
