import pytest
from django.core.exceptions import ValidationError

from apps.audit.models import AuditEvent
from apps.learning.models import Enrollment
from apps.learning.services import transition_enrollment
from apps.organizations.models import Membership

from .factories import OrganizationFactory, UserFactory, create_active_enrollment, create_published_course


@pytest.mark.django_db
def test_pausing_an_enrollment_requires_a_reason_and_writes_audit():
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

    with pytest.raises(ValidationError, match="reason is required"):
        transition_enrollment(
            enrollment=enrollment,
            new_status=Enrollment.Status.PAUSED,
            actor=manager,
            reason="",
        )

    transitioned = transition_enrollment(
        enrollment=enrollment,
        new_status=Enrollment.Status.PAUSED,
        actor=manager,
        reason="Learner requested a temporary pause",
    )

    assert transitioned.status == Enrollment.Status.PAUSED
    audit = AuditEvent.objects.get(action="enrollment.status_changed", target_id=str(enrollment.id))
    assert audit.reason == "Learner requested a temporary pause"
    assert audit.metadata == {"from": "active", "to": "paused"}


@pytest.mark.django_db
def test_terminal_enrollment_cannot_transition_back_to_active():
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
    enrollment.status = Enrollment.Status.COMPLETED
    enrollment.save(update_fields=["status", "updated_at"])

    with pytest.raises(ValidationError, match="Invalid enrollment transition"):
        transition_enrollment(
            enrollment=enrollment,
            new_status=Enrollment.Status.ACTIVE,
            actor=manager,
            reason="",
        )
