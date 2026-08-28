from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.audit.models import AuditEvent
from apps.courses.models import Lesson
from apps.learning.models import Enrollment, Entitlement, LearningEvent, LessonProgress
from apps.learning.services import enrollment_has_access, record_progress_event
from apps.organizations.models import Membership

from .factories import OrganizationFactory, UserFactory, create_active_enrollment, create_published_course


@pytest.mark.django_db
def test_enrollment_without_entitlement_does_not_grant_access():
    manager = UserFactory()
    student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=manager, role=Membership.Role.ORGANIZATION_ADMIN)
    Membership.objects.create(organization=organization, user=student, role=Membership.Role.STUDENT)
    _, version, _, _ = create_published_course(organization=organization, owner=manager)
    enrollment = Enrollment.objects.create(
        organization=organization,
        user=student,
        course_version=version,
        status=Enrollment.Status.ACTIVE,
        created_by=manager,
    )

    assert enrollment_has_access(enrollment) is False


@pytest.mark.django_db
def test_progress_events_are_idempotent_and_completion_is_derived_once():
    manager = UserFactory()
    student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=manager, role=Membership.Role.ORGANIZATION_ADMIN)
    _, version, _, lessons = create_published_course(organization=organization, owner=manager)
    enrollment = create_active_enrollment(
        organization=organization,
        user=student,
        version=version,
        actor=manager,
    )
    event_id = uuid4()

    first = record_progress_event(
        actor=student,
        enrollment_id=enrollment.id,
        lesson_id=lessons[0].id,
        client_event_id=event_id,
        event_type=LearningEvent.EventType.LESSON_COMPLETED,
        occurred_at=timezone.now(),
    )
    second = record_progress_event(
        actor=student,
        enrollment_id=enrollment.id,
        lesson_id=lessons[0].id,
        client_event_id=event_id,
        event_type=LearningEvent.EventType.LESSON_COMPLETED,
        occurred_at=timezone.now(),
    )

    enrollment.refresh_from_db()
    assert first.duplicate is False
    assert second.duplicate is True
    assert LearningEvent.objects.filter(client_event_id=event_id).count() == 1
    assert LessonProgress.objects.get(enrollment=enrollment).status == LessonProgress.Status.COMPLETED
    assert enrollment.status == Enrollment.Status.COMPLETED
    assert AuditEvent.objects.filter(action="course.completed", target_id=str(enrollment.id)).count() == 1


@pytest.mark.django_db
def test_revoked_entitlement_blocks_access():
    manager = UserFactory()
    student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=manager, role=Membership.Role.ORGANIZATION_ADMIN)
    _, version, _, _ = create_published_course(organization=organization, owner=manager)
    enrollment = create_active_enrollment(
        organization=organization,
        user=student,
        version=version,
        actor=manager,
    )
    entitlement = enrollment.entitlement
    entitlement.status = Entitlement.Status.REVOKED
    entitlement.save(update_fields=["status", "updated_at"])

    assert enrollment_has_access(enrollment) is False


@pytest.mark.django_db
def test_suspended_organization_blocks_access():
    manager = UserFactory()
    student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=manager, role=Membership.Role.ORGANIZATION_ADMIN)
    _, version, _, _ = create_published_course(organization=organization, owner=manager)
    enrollment = create_active_enrollment(
        organization=organization,
        user=student,
        version=version,
        actor=manager,
    )
    organization.is_active = False
    organization.save(update_fields=["is_active", "updated_at"])

    assert enrollment_has_access(enrollment) is False


@pytest.mark.django_db
def test_video_threshold_completion_is_derived_by_the_server():
    manager = UserFactory()
    student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=manager, role=Membership.Role.ORGANIZATION_ADMIN)
    _, version, _, lessons = create_published_course(organization=organization, owner=manager)
    lesson = lessons[0]
    lesson.content_type = Lesson.ContentType.VIDEO
    lesson.completion_rule = Lesson.CompletionRule.VIDEO_THRESHOLD
    lesson.completion_threshold = 90
    lesson.duration_seconds = 100
    lesson.save()
    enrollment = create_active_enrollment(
        organization=organization,
        user=student,
        version=version,
        actor=manager,
    )

    result = record_progress_event(
        actor=student,
        enrollment_id=enrollment.id,
        lesson_id=lesson.id,
        client_event_id=uuid4(),
        event_type=LearningEvent.EventType.VIDEO_PROGRESS,
        occurred_at=timezone.now(),
        position_seconds=90,
    )

    enrollment.refresh_from_db()
    assert result.lesson_progress.status == LessonProgress.Status.COMPLETED
    assert result.lesson_progress.progress_percent == 90
    assert result.lesson_progress.completion_source == "video_threshold"
    assert enrollment.status == Enrollment.Status.COMPLETED


@pytest.mark.django_db
def test_event_id_cannot_be_reused_with_a_different_payload():
    manager = UserFactory()
    student = UserFactory()
    organization = OrganizationFactory()
    Membership.objects.create(organization=organization, user=manager, role=Membership.Role.ORGANIZATION_ADMIN)
    _, version, _, lessons = create_published_course(organization=organization, owner=manager, lesson_count=2)
    enrollment = create_active_enrollment(
        organization=organization,
        user=student,
        version=version,
        actor=manager,
    )
    event_id = uuid4()
    record_progress_event(
        actor=student,
        enrollment_id=enrollment.id,
        lesson_id=lessons[0].id,
        client_event_id=event_id,
        event_type=LearningEvent.EventType.LESSON_STARTED,
        occurred_at=timezone.now(),
    )

    with pytest.raises(ValidationError, match="already used with a different payload"):
        record_progress_event(
            actor=student,
            enrollment_id=enrollment.id,
            lesson_id=lessons[1].id,
            client_event_id=event_id,
            event_type=LearningEvent.EventType.LESSON_STARTED,
            occurred_at=timezone.now(),
        )
