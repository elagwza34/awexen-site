from django.db import connection

from .models import Course


def public_catalog_available() -> bool:
    """Return whether the legacy public catalog exists in the PostgreSQL database."""
    if connection.vendor != "postgresql":
        return False
    with connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.courses')")
        return cursor.fetchone()[0] is not None


def sync_course_to_public_catalog(course: Course) -> bool:
    """Upsert the public, published-only course projection."""
    if not public_catalog_available() or course.current_version_id is None:
        return False

    version = course.current_version
    lead = version.instructors.select_related("instructor").order_by("-is_lead", "created_at").first()
    instructor = "Awexen Learning Team"
    if lead:
        instructor = lead.instructor.full_name or lead.instructor.email

    level_map = {
        "all_levels": "all-levels",
        "beginner": "beginner",
        "intermediate": "intermediate",
        "advanced": "advanced",
    }
    total_minutes = version.estimated_minutes
    if total_minutes and total_minutes % 60 == 0:
        duration = f"{total_minutes // 60} hours"
    elif total_minutes:
        duration = f"{total_minutes} minutes"
    else:
        duration = ""
    catalog_status = "published" if course.status == Course.Status.PUBLISHED else "closed"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO public.courses (
                id, slug, title, short_description, description, instructor,
                delivery_mode, level, duration, price, currency, capacity,
                starts_at, featured_image, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE SET
                title = EXCLUDED.title,
                short_description = EXCLUDED.short_description,
                description = EXCLUDED.description,
                instructor = EXCLUDED.instructor,
                delivery_mode = EXCLUDED.delivery_mode,
                level = EXCLUDED.level,
                duration = EXCLUDED.duration,
                price = EXCLUDED.price,
                currency = EXCLUDED.currency,
                capacity = EXCLUDED.capacity,
                starts_at = EXCLUDED.starts_at,
                featured_image = EXCLUDED.featured_image,
                status = EXCLUDED.status,
                updated_at = now()
            """,
            [
                course.id,
                course.slug,
                version.title,
                version.short_description,
                version.description,
                instructor,
                course.delivery_mode,
                level_map.get(version.difficulty, "all-levels"),
                duration,
                course.price,
                course.currency,
                course.capacity,
                course.starts_at,
                version.thumbnail_url or None,
                catalog_status,
            ],
        )
    return True
