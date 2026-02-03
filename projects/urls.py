from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet)
router.register(r'teams', views.TeamViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'projects', views.ProjectViewSet)
router.register(r'calendar-events', views.CalendarEventViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
]
