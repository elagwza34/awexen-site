"""Validate Supabase SQL migrations against the configured PostgreSQL schema.

Every migration runs inside one transaction that is always rolled back. This
checks PostgreSQL syntax, table/column names and trigger/function compilation
without deploying changes or preserving any test writes.
"""

from __future__ import annotations

import os
import sys
import json
from datetime import timezone
from uuid import uuid4
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "awexen_api.settings")

import django  # noqa: E402

django.setup()

from django.db import connection, transaction  # noqa: E402


ROOT = BACKEND_ROOT.parent
MIGRATIONS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))


def main() -> None:
    if not MIGRATIONS:
        raise SystemExit("No Supabase SQL migrations were found.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            for migration in MIGRATIONS:
                print(f"Validating {migration.name} ...", flush=True)
                cursor.execute(migration.read_text(encoding="utf-8"))
            cursor.execute("select id from auth.users order by created_at limit 1")
            auth_user = cursor.fetchone()
            if auth_user:
                cursor.execute("select public.lms_edge_context(%s)", [auth_user[0]])
                context = cursor.fetchone()[0]
                if isinstance(context, str):
                    context = json.loads(context)
                if not context or not context.get("id") or not isinstance(context.get("memberships"), list):
                    raise RuntimeError("lms_edge_context returned an invalid response")

                cursor.execute(
                    """
                    select c.slug
                    from public.courses_course c
                    join public.courses_courseversion v on v.id = c.current_version_id
                    where c.status = 'published' and v.status = 'published' and c.price > 0
                    order by c.created_at
                    limit 1
                    """
                )
                published_course = cursor.fetchone()
                if published_course:
                    cursor.execute(
                        "select public.lms_edge_create_booking(%s, %s::jsonb, %s)",
                        [
                            auth_user[0],
                            '{"course_slug":"%s","phone":"01000000000",'
                            '"experience_level":"validation","goal":"rollback smoke test",'
                            '"payment_method":"instapay"}' % published_course[0],
                            "migration-validation",
                        ],
                    )
                    if not cursor.fetchone()[0]:
                        raise RuntimeError("lms_edge_create_booking did not return a booking id")

                    cursor.execute(
                        """
                        select distinct i.auth_user_id, u.email, c.organization_id, c.current_version_id
                        from private.lms_auth_identity i
                        join public.accounts_user u on u.id = i.lms_user_id
                        join public.courses_course c on c.slug = %s
                        left join public.organizations_membership m
                          on m.user_id = u.id and m.organization_id = c.organization_id and m.is_active
                        where u.platform_role = 'super_admin'
                           or m.role in ('organization_admin','lms_manager','support_agent')
                        limit 1
                        """,
                        [published_course[0]],
                    )
                    manager = cursor.fetchone()
                    if manager:
                        cursor.execute(
                            "select public.lms_edge_enroll_student(%s,%s,%s,%s,null,%s)",
                            [manager[0], manager[2], manager[1], manager[3], "migration-validation"],
                        )
                        enrollment_id = cursor.fetchone()[0]
                        cursor.execute(
                            "select public.lms_edge_transition_enrollment(%s,%s,'paused','validation',%s)",
                            [manager[0], enrollment_id, "migration-validation"],
                        )
                        cursor.execute(
                            "select public.lms_edge_transition_enrollment(%s,%s,'active','',%s)",
                            [manager[0], enrollment_id, "migration-validation"],
                        )

            cursor.execute(
                """
                select i.auth_user_id, e.client_event_id, e.enrollment_id, e.lesson_id,
                       e.event_type, e.position_seconds, e.occurred_at
                from public.learning_learningevent e
                join private.lms_auth_identity i on i.lms_user_id = e.user_id
                order by e.received_at
                limit 1
                """
            )
            event = cursor.fetchone()
            if event:
                event_payload = {
                    "event_id": str(event[1]),
                    "enrollment_id": str(event[2]),
                    "lesson_id": str(event[3]),
                    "event_type": event[4],
                    "position_seconds": event[5],
                    "occurred_at": event[6].astimezone(timezone.utc).isoformat(),
                }
                cursor.execute(
                    "select public.lms_edge_record_progress(%s, %s::jsonb, %s)",
                    [event[0], json.dumps(event_payload), "migration-validation"],
                )
                progress_result = cursor.fetchone()[0]
                if isinstance(progress_result, str):
                    progress_result = json.loads(progress_result)
                if not progress_result or not progress_result.get("duplicate"):
                    raise RuntimeError("lms_edge_record_progress idempotency smoke test failed")
                cursor.execute(
                    "select private.lms_enrollment_has_access(%s, private.lms_actor(%s))",
                    [event[2], event[0]],
                )
                if cursor.fetchone()[0]:
                    new_event_payload = {
                        **event_payload,
                        "event_id": str(uuid4()),
                        "event_type": "lesson_started",
                        "position_seconds": 0,
                    }
                    cursor.execute(
                        "select public.lms_edge_record_progress(%s, %s::jsonb, %s)",
                        [event[0], json.dumps(new_event_payload), "migration-validation"],
                    )
                    new_progress = cursor.fetchone()[0]
                    if isinstance(new_progress, str):
                        new_progress = json.loads(new_progress)
                    if not new_progress or new_progress.get("duplicate"):
                        raise RuntimeError("lms_edge_record_progress insert smoke test failed")
        transaction.set_rollback(True)

    print(f"Validated {len(MIGRATIONS)} migration(s); all changes rolled back.")


if __name__ == "__main__":
    main()
