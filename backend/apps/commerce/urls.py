from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AdminPaymentBookingViewSet, CheckoutCourseView, MyBookingViewSet


router = DefaultRouter()
router.register("bookings", MyBookingViewSet, basename="my-booking")
router.register("admin/payment-bookings", AdminPaymentBookingViewSet, basename="admin-payment-booking")

urlpatterns = [
    path("checkout/courses/<slug:slug>/", CheckoutCourseView.as_view(), name="checkout-course"),
] + router.urls
