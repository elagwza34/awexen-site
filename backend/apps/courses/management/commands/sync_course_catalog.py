from django.core.management.base import BaseCommand

from apps.courses.catalog import public_catalog_available, sync_course_to_public_catalog
from apps.courses.models import Course


class Command(BaseCommand):
    help = "Upsert published LMS courses into the existing public.courses catalog."

    def handle(self, *args, **options):
        if not public_catalog_available():
            self.stdout.write(self.style.WARNING("public.courses is unavailable on this database; nothing was synced."))
            return

        courses = Course.objects.filter(
            status=Course.Status.PUBLISHED,
            current_version__isnull=False,
        ).select_related("organization", "current_version")
        synced = 0
        for course in courses.iterator():
            synced += int(sync_course_to_public_catalog(course))
        self.stdout.write(self.style.SUCCESS(f"Synced {synced} published course(s) to public.courses."))
