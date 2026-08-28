from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Check the configured LMS database without printing connection credentials."

    def handle(self, *args, **options):
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT current_schema(), current_setting('server_version_num')")
                schema, server_version = cursor.fetchone()
                if connection.vendor == "postgresql":
                    cursor.execute(
                        "SELECT to_regclass('public.courses'), "
                        "to_regclass('public.django_migrations'), "
                        "to_regclass('public.courses_course')"
                    )
                    catalog_table, migrations_table, lms_course_table = cursor.fetchone()
                    cursor.execute("SELECT count(*) FROM public.courses")
                    catalog_count = cursor.fetchone()[0]
                else:
                    names = set(connection.introspection.table_names(cursor))
                    catalog_table = "courses" if "courses" in names else None
                    migrations_table = "django_migrations" if "django_migrations" in names else None
                    lms_course_table = "courses_course" if "courses_course" in names else None
                    catalog_count = 0
        except Exception as error:
            raise CommandError(f"Database connection failed ({type(error).__name__}).") from error

        self.stdout.write("DB_CONNECTION=ok")
        self.stdout.write(f"DB_ENGINE={connection.vendor}")
        self.stdout.write(f"DB_SCHEMA={schema}")
        self.stdout.write(f"DB_SERVER_VERSION_NUM={server_version}")
        self.stdout.write(f"CATALOG_TABLE={bool(catalog_table)}")
        self.stdout.write(f"DJANGO_MIGRATIONS_TABLE={bool(migrations_table)}")
        self.stdout.write(f"LMS_COURSE_TABLE={bool(lms_course_table)}")
        self.stdout.write(f"CATALOG_COUNT={catalog_count}")
