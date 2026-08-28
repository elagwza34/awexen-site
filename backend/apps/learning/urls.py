from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AdminEnrollmentViewSet, HealthView, LearningCourseView, MyEnrollmentsView, ProgressEventView, ReadinessView


router = DefaultRouter()
router.register("admin/enrollments", AdminEnrollmentViewSet, basename="admin-enrollment")

urlpatterns = [
    path("health/", HealthView.as_view(), name="lms-health"),
    path("health/ready/", ReadinessView.as_view(), name="lms-readiness"),
    path("learning/enrollments/", MyEnrollmentsView.as_view(), name="my-enrollments"),
    path("learning/enrollments/<uuid:enrollment_id>/", LearningCourseView.as_view(), name="learning-course"),
    path("progress/events/", ProgressEventView.as_view(), name="progress-event"),
] + router.urls
