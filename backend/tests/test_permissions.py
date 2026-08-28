import pytest
from rest_framework.test import APIClient

from apps.courses.models import Course
from apps.organizations.models import Membership

from .factories import OrganizationFactory, UserFactory, create_active_enrollment, create_published_course


@pytest.mark.django_db
def test_course_manager_cannot_list_another_organization_courses():
    manager = UserFactory()
    other_owner = UserFactory()
    own_org = OrganizationFactory()
    other_org = OrganizationFactory()
    Membership.objects.create(organization=own_org, user=manager, role=Membership.Role.LMS_MANAGER)
    own_course, _, _, _ = create_published_course(organization=own_org, owner=manager)
    other_course, _, _, _ = create_published_course(organization=other_org, owner=other_owner)

    client = APIClient()
    client.force_authenticate(manager)
    response = client.get("/api/v1/admin/courses/")

    assert response.status_code == 200
    ids = {item["id"] for item in response.data["results"]}
    assert str(own_course.id) in ids
    assert str(other_course.id) not in ids


@pytest.mark.django_db
def test_student_cannot_open_another_students_enrollment():
    manager = UserFactory()
    first_student = UserFactory()
    second_student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=manager, role=Membership.Role.ORGANIZATION_ADMIN)
    _, version, _, _ = create_published_course(organization=organization, owner=manager)
    first_enrollment = create_active_enrollment(
        organization=organization,
        user=first_student,
        version=version,
        actor=manager,
    )
    Membership.objects.create(organization=organization, user=second_student, role=Membership.Role.STUDENT)

    client = APIClient()
    client.force_authenticate(second_student)
    response = client.get(f"/api/v1/learning/enrollments/{first_enrollment.id}/")

    assert response.status_code == 404
