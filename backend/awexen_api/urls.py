from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


urlpatterns = [
    path("api/", include("chat_api.urls")),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.learning.urls")),
    path("api/v1/", include("apps.commerce.urls")),
    path("api/v1/admin/", include("apps.courses.urls")),
    path("api/v1/instructor/", include("apps.courses.instructor_urls")),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="api-schema"), name="api-docs"),
]
