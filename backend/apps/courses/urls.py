from rest_framework.routers import DefaultRouter

from .views import (
    CohortViewSet,
    CourseVersionViewSet,
    CourseViewSet,
    LessonViewSet,
    ModuleViewSet,
)


router = DefaultRouter()
router.register("courses", CourseViewSet, basename="admin-course")
router.register("course-versions", CourseVersionViewSet, basename="admin-course-version")
router.register("modules", ModuleViewSet, basename="admin-module")
router.register("lessons", LessonViewSet, basename="admin-lesson")
router.register("cohorts", CohortViewSet, basename="admin-cohort")

urlpatterns = router.urls
