from rest_framework.permissions import BasePermission

from .models import Membership
from .services import has_org_role


CONTENT_MANAGER_ROLES = {
    Membership.Role.ORGANIZATION_ADMIN,
    Membership.Role.LMS_MANAGER,
}

ENROLLMENT_MANAGER_ROLES = {
    Membership.Role.ORGANIZATION_ADMIN,
    Membership.Role.LMS_MANAGER,
    Membership.Role.SUPPORT_AGENT,
}


def object_organization_id(obj):
    if hasattr(obj, "organization_id"):
        return obj.organization_id
    if hasattr(obj, "course"):
        return obj.course.organization_id
    return None


class IsLmsContentManager(BasePermission):
    message = "You do not have permission to manage learning content."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.platform_role == "super_admin":
            return True
        return Membership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=CONTENT_MANAGER_ROLES,
        ).exists()

    def has_object_permission(self, request, view, obj):
        organization_id = object_organization_id(obj)
        return organization_id is not None and has_org_role(request.user, organization_id, CONTENT_MANAGER_ROLES)


class IsEnrollmentManager(BasePermission):
    message = "You do not have permission to manage enrollments."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.platform_role == "super_admin":
            return True
        return Membership.objects.filter(
            user=request.user,
            is_active=True,
            role__in=ENROLLMENT_MANAGER_ROLES,
        ).exists()

    def has_object_permission(self, request, view, obj):
        return has_org_role(request.user, obj.organization_id, ENROLLMENT_MANAGER_ROLES)


class IsInstructor(BasePermission):
    message = "You need an active instructor membership."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and Membership.objects.filter(
                user=request.user,
                is_active=True,
                role=Membership.Role.INSTRUCTOR,
            ).exists()
        )
