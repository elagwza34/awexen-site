from django.urls import path

from .views import ask_awexen, extract_pdf, health


urlpatterns = [
    path("health", health, name="health"),
    path("ask-awexen", ask_awexen, name="ask-awexen"),
    path("knowledge/extract-pdf", extract_pdf, name="extract-pdf"),
]
