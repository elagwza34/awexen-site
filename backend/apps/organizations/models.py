from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Organization(TimeStampedModel):
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=180)
    is_active = models.BooleanField(default=True)
    timezone = models.CharField(max_length=64, default="Africa/Cairo")
    locale = models.CharField(max_length=12, default="ar-EG")
    currency = models.CharField(max_length=8, default="EGP")

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Department(TimeStampedModel):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("organization", "name"), name="unique_department_name_per_org")
        ]
        ordering = ("name",)


class Membership(TimeStampedModel):
    class Role(models.TextChoices):
        ORGANIZATION_ADMIN = "organization_admin", "Organisation Admin"
        LMS_MANAGER = "lms_manager", "LMS Manager"
        INSTRUCTOR = "instructor", "Instructor"
        ASSESSOR = "assessor", "Assessor"
        INTERNAL_VERIFIER = "internal_verifier", "Internal Verifier"
        EMPLOYER_MANAGER = "employer_manager", "Employer Manager"
        STUDENT = "student", "Student"
        SUPPORT_AGENT = "support_agent", "Support Agent"

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="memberships")
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.STUDENT)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("organization", "user"), name="unique_membership_per_org")
        ]
        indexes = [models.Index(fields=("organization", "role", "is_active"))]

    def __str__(self) -> str:
        return f"{self.user} · {self.organization} · {self.role}"
