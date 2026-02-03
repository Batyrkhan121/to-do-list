from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import TaskViewSet, TeamViewSet

# Создаём роутер для автоматической генерации URL
router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'teams', TeamViewSet, basename='team')

urlpatterns = [
    path('', include(router.urls)),
]