from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from apps.common.database_security import DJANGO_INTERNAL_TABLES


class Command(BaseCommand):
    help = "Audit RLS and Data API grants on Django-owned LMS tables."

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            self.stdout.write(self.style.WARNING("Security audit requires PostgreSQL."))
            return

        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        c.relname,
                        c.relrowsecurity,
                        has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE'),
                        has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public'
                      AND c.relkind = 'r'
                      AND c.relname = ANY(%s)
                    ORDER BY c.relname
                    """,
                    [list(DJANGO_INTERNAL_TABLES)],
                )
                rows = cursor.fetchall()
        except Exception as error:
            raise CommandError(f"Security audit failed ({type(error).__name__}).") from error

        found = {row[0] for row in rows}
        missing = set(DJANGO_INTERNAL_TABLES) - found
        unrestricted = [row[0] for row in rows if not row[1]]
        client_grants = [row[0] for row in rows if row[2] or row[3]]
        self.stdout.write(f"TABLES_EXPECTED={len(DJANGO_INTERNAL_TABLES)}")
        self.stdout.write(f"TABLES_FOUND={len(found)}")
        self.stdout.write(f"TABLES_MISSING={len(missing)}")
        self.stdout.write(f"RLS_DISABLED={len(unrestricted)}")
        self.stdout.write(f"CLIENT_ROLE_GRANTS={len(client_grants)}")
        self.stdout.write(f"SECURE={not missing and not unrestricted and not client_grants}")

        if missing:
            self.stdout.write(self.style.WARNING("Missing: " + ", ".join(sorted(missing))))
        if unrestricted:
            self.stdout.write(self.style.WARNING("RLS disabled: " + ", ".join(unrestricted)))
        if client_grants:
            self.stdout.write(self.style.WARNING("Client grants: " + ", ".join(client_grants)))
