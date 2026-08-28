import factory

from apps.accounts.models import User
from apps.courses.models import Course, CourseVersion, Lesson, Module
from apps.learning.models import CourseProgress, Enrollment, Entitlement
from apps.organizations.models import Membership, Organization


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda index: f"user{index}@example.com")
    full_name = factory.Sequence(lambda index: f"User {index}")
    is_active = True
    email_verified = True


class OrganizationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Organization

    slug = factory.Sequence(lambda index: f"org-{index}")
    name = factory.Sequence(lambda index: f"Organization {index}")


def create_published_course(*, organization, owner, lesson_count=1):
    Course.objects.filter(organization=organization, slug="course").delete()
    course = Course.objects.create(
        organization=organization,
        slug="course",
        title="Test Course",
        short_description="A course used by the test suite.",
        price=1500,
        owner=owner,
        status=Course.Status.PUBLISHED,
    )
    version = CourseVersion.objects.create(
        course=course,
        version_number=1,
        status=CourseVersion.Status.PUBLISHED,
        title=course.title,
        short_description=course.short_description,
        created_by=owner,
    )
    course.current_version = version
    course.save(update_fields=["current_version", "updated_at"])
    module = Module.objects.create(
        course_version=version,
        title="Module 1",
        sort_order=0,
        status=Module.Status.PUBLISHED,
        created_by=owner,
    )
    lessons = [
        Lesson.objects.create(
            module=module,
            title=f"Lesson {index + 1}",
            sort_order=index,
            status=Lesson.Status.PUBLISHED,
            completion_rule=Lesson.CompletionRule.MANUAL,
            created_by=owner,
        )
        for index in range(lesson_count)
    ]
    return course, version, module, lessons


def create_active_enrollment(*, organization, user, version, actor):
    Membership.objects.get_or_create(
        organization=organization,
        user=user,
        defaults={"role": Membership.Role.STUDENT},
    )
    enrollment = Enrollment.objects.create(
        organization=organization,
        user=user,
        course_version=version,
        status=Enrollment.Status.ACTIVE,
        created_by=actor,
    )
    Entitlement.objects.create(
        enrollment=enrollment,
        status=Entitlement.Status.VALID,
        source=Entitlement.Source.MANUAL,
        granted_by=actor,
    )
    CourseProgress.objects.create(enrollment=enrollment)
    return enrollment
