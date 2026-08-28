import pytest
from rest_framework.test import APIClient

from apps.courses.models import Course, CourseVersion
from apps.organizations.models import Membership

from .factories import OrganizationFactory, UserFactory


@pytest.mark.django_db
def test_instructor_builds_own_draft_and_submits_it_for_admin_review():
    instructor = UserFactory()
    other_instructor = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=instructor, role=Membership.Role.INSTRUCTOR)
    Membership.objects.create(organization=organization, user=other_instructor, role=Membership.Role.INSTRUCTOR)
    client = APIClient()
    client.force_authenticate(instructor)

    free_course_response = client.post("/api/v1/instructor/courses/", {
        "organization_id": str(organization.id),
        "slug": "free-course",
        "title": "Free Course",
        "short_description": "This must be rejected",
        "delivery_mode": "recorded",
        "price": "0.00",
        "currency": "EGP",
    }, format="json")
    assert free_course_response.status_code == 400
    assert "price" in free_course_response.data["error"]["details"]

    course_response = client.post("/api/v1/instructor/courses/", {
        "organization_id": str(organization.id),
        "slug": "instructor-course",
        "title": "Instructor Course",
        "short_description": "A reviewable course",
        "delivery_mode": "recorded",
        "price": "500.00",
        "currency": "EGP",
    }, format="json")
    assert course_response.status_code == 201
    course = Course.objects.get(pk=course_response.data["id"])
    version = course.versions.get()

    module_response = client.post("/api/v1/instructor/modules/", {
        "course_version": str(version.id),
        "title": "Module 1",
        "description": "",
        "sort_order": 0,
        "status": "published",
    }, format="json")
    assert module_response.status_code == 201
    lesson_response = client.post("/api/v1/instructor/lessons/", {
        "module": module_response.data["id"],
        "title": "Lesson 1",
        "summary": "",
        "content": "Course content",
        "content_type": "text",
        "duration_seconds": 60,
        "sort_order": 0,
        "status": "published",
        "is_required": True,
        "weight": 1,
        "completion_rule": "manual",
        "completion_threshold": 90,
    }, format="json")
    assert lesson_response.status_code == 201

    submit_response = client.post(f"/api/v1/instructor/course-versions/{version.id}/submit/", {})
    version.refresh_from_db()
    course.refresh_from_db()
    assert submit_response.status_code == 200
    assert version.status == CourseVersion.Status.IN_REVIEW
    assert course.status == Course.Status.DRAFT

    other_client = APIClient()
    other_client.force_authenticate(other_instructor)
    other_list = other_client.get("/api/v1/instructor/courses/")
    assert other_list.status_code == 200
    assert other_list.data["results"] == []
