from decimal import Decimal

import django.core.validators
from django.db import migrations, models


DEFAULT_PAID_COURSE_PRICE = Decimal("1500.00")


def require_paid_prices(apps, schema_editor):
    Course = apps.get_model("courses", "Course")
    Course.objects.filter(price__lte=0).update(price=DEFAULT_PAID_COURSE_PRICE)

    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.courses')")
        if cursor.fetchone()[0] is None:
            return
        cursor.execute(
            """
            UPDATE public.courses
            SET price = %s, updated_at = now()
            WHERE price <= 0
            """,
            [DEFAULT_PAID_COURSE_PRICE],
        )
        cursor.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = 'public.courses'::regclass
                      AND conname = 'public_course_price_must_be_positive'
                ) THEN
                    ALTER TABLE public.courses
                    ADD CONSTRAINT public_course_price_must_be_positive CHECK (price > 0);
                END IF;
            END
            $$;
            """
        )


def remove_public_catalog_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.courses')")
        if cursor.fetchone()[0] is not None:
            cursor.execute(
                "ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS public_course_price_must_be_positive"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0003_alter_course_price"),
    ]

    operations = [
        migrations.RunPython(require_paid_prices, remove_public_catalog_constraint),
        migrations.AlterField(
            model_name="course",
            name="price",
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                validators=[django.core.validators.MinValueValidator(1)],
            ),
        ),
        migrations.AddConstraint(
            model_name="course",
            constraint=models.CheckConstraint(
                condition=models.Q(price__gt=0),
                name="course_price_must_be_positive",
            ),
        ),
    ]
