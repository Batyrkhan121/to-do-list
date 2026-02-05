from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from to_do_manager.views import spa

schema_view = get_schema_view(
    openapi.Info(
        title="TaskFlow API",
        default_version="v1",
        description="Task Management API with Authentication",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # API
    path("api/v1/", include("projects.urls")),
    path("api/auth/", include("accounts.urls")),

    # Swagger
    path("swagger/", schema_view.with_ui("swagger", cache_timeout=0)),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0)),

    # SPA (React Router)
    # Any non-API path without a file extension should return the React app.
    # Static files (e.g. /assets/...) are served by WhiteNoise via WHITENOISE_ROOT.
    re_path(r"^(?!api/|admin/|swagger/|redoc/|static/)(?!.*\..*$).*", spa),
]
