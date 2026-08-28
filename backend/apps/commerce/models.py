from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class CourseBooking(TimeStampedModel):
    class Status(models.TextChoices):
        AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"
        PAYMENT_SUBMITTED = "payment_submitted", "Payment submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentMethod(models.TextChoices):
        INSTAPAY = "instapay", "InstaPay"
        VODAFONE_CASH = "vodafone_cash", "Vodafone Cash"

    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, related_name="course_bookings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="course_bookings")
    course_version = models.ForeignKey("courses.CourseVersion", on_delete=models.PROTECT, related_name="bookings")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.AWAITING_PAYMENT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="EGP")
    payment_method = models.CharField(max_length=24, choices=PaymentMethod.choices, blank=True)
    payment_phone = models.CharField(max_length=32)
    phone = models.CharField(max_length=32)
    experience_level = models.CharField(max_length=120, blank=True)
    goal = models.TextField(blank=True)
    proof_path = models.CharField(max_length=500, blank=True)
    proof_content_type = models.CharField(max_length=120, blank=True)
    proof_size = models.PositiveIntegerField(null=True, blank=True)
    payment_submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_course_bookings",
    )
    review_notes = models.TextField(blank=True)
    enrollment = models.OneToOneField(
        "learning.Enrollment",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="booking",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("user", "course_version"), name="unique_booking_per_user_version"),
            models.CheckConstraint(condition=models.Q(amount__gte=0), name="booking_amount_not_negative"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "created_at")),
            models.Index(fields=("user", "status", "created_at")),
        ]
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.user} · {self.course_version} · {self.status}"
