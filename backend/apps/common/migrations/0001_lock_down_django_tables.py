from django.db import migrations


DJANGO_INTERNAL_TABLES = (
    "django_migrations",
    "django_content_type",
    "auth_permission",
    "auth_group",
    "auth_group_permissions",
    "accounts_user",
    "accounts_user_groups",
    "accounts_user_user_permissions",
    "django_session",
    "organizations_organization",
    "organizations_department",
    "organizations_membership",
    "audit_auditevent",
    "courses_course",
    "courses_courseversion",
    "courses_courseinstructor",
    "courses_cohort",
    "courses_module",
    "courses_lesson",
    "learning_enrollment",
    "learning_courseprogress",
    "learning_entitlement",
    "learning_learningevent",
    "learning_lessonprogress",
)


def lock_down_django_tables(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    quote = schema_editor.connection.ops.quote_name
    with schema_editor.connection.cursor() as cursor:
        for table in DJANGO_INTERNAL_TABLES:
            qualified_table = f"public.{quote(table)}"
            cursor.execute(f"ALTER TABLE {qualified_table} ENABLE ROW LEVEL SECURITY")
            cursor.execute(f"REVOKE ALL PRIVILEGES ON TABLE {qualified_table} FROM anon, authenticated")

        cursor.execute(
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
            "REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated"
        )


class Migration(migrations.Migration):
    atomic = True

    dependencies = [
        ("accounts", "0001_initial"),
        ("audit", "0001_initial"),
        ("courses", "0001_initial"),
        ("learning", "0001_initial"),
        ("organizations", "0001_initial"),
        ("contenttypes", "0002_remove_content_type_name"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("sessions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(lock_down_django_tables, reverse_code=migrations.RunPython.noop),
    ]
