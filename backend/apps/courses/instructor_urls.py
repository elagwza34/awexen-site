from rest_framework.routers import DefaultRouter

from .views import InstructorCourseViewSet, InstructorLessonViewSet, InstructorModuleViewSet, InstructorVersionViewSet


router = DefaultRouter()
router.register("courses", InstructorCourseViewSet, basename="instructor-course")
router.register("course-versions", InstructorVersionViewSet, basename="instructor-course-version")
router.register("modules", InstructorModuleViewSet, basename="instructor-module")
router.register("lessons", InstructorLessonViewSet, basename="instructor-lesson")

urlpatterns = router.urls
