import pytest
from django.core.management import call_command

from apps.courses.management.commands.seed_wordpress_course import COURSE_PRICE, COURSE_SLUG
from apps.courses.models import Course, CourseVersion, Lesson, Module


@pytest.mark.django_db
def test_wordpress_seed_is_published_and_idempotent():
    call_command("seed_wordpress_course")
    call_command("seed_wordpress_course")

    course = Course.objects.get(slug=COURSE_SLUG)
    assert Course.objects.filter(slug=COURSE_SLUG).count() == 1
    assert course.price == COURSE_PRICE
    assert course.status == Course.Status.PUBLISHED
    assert course.current_version.status == CourseVersion.Status.PUBLISHED
    assert Module.objects.filter(course_version=course.current_version).count() == 4
    assert Lesson.objects.filter(module__course_version=course.current_version).count() == 12
