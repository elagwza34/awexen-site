from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Verify the private Supabase payment proof bucket and policies without printing credentials."

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            self.stdout.write(self.style.WARNING("Payment storage audit requires Supabase PostgreSQL."))
            return
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = %s",
                ["payment-proofs"],
            )
            bucket = cursor.fetchone()
            cursor.execute(
                "SELECT count(policyname) FROM pg_policies "
                "WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE %s",
                ["%payment proofs%"],
            )
            policy_count = cursor.fetchone()[0]
        secure = bool(
            bucket
            and bucket[0] is False
            and bucket[1] == 5 * 1024 * 1024
            and set(bucket[2] or ()) == {"image/jpeg", "image/png", "application/pdf"}
            and policy_count >= 3
        )
        self.stdout.write(f"BUCKET_EXISTS={bool(bucket)}")
        self.stdout.write(f"BUCKET_PRIVATE={bool(bucket and bucket[0] is False)}")
        self.stdout.write(f"FILE_LIMIT_OK={bool(bucket and bucket[1] == 5 * 1024 * 1024)}")
        self.stdout.write(f"PAYMENT_POLICIES={policy_count}")
        self.stdout.write(f"SECURE={secure}")
