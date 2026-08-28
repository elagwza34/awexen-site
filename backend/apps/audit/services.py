from .models import AuditEvent


def record_audit(
    *,
    action: str,
    target,
    actor=None,
    organization=None,
    reason: str = "",
    metadata: dict | None = None,
    request_id: str = "",
) -> AuditEvent:
    return AuditEvent.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        target_type=target._meta.label_lower,
        target_id=str(target.pk),
        reason=reason,
        metadata=metadata or {},
        request_id=request_id,
    )
