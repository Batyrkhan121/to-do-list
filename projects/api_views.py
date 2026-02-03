from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Task, Team
from .serializers import (
    TaskSerializer, 
    TaskListSerializer,
    TaskCreateSerializer,
    TeamSerializer
)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления задачами
    
    Endpoints:
    - GET /api/tasks/ - список задач
    - POST /api/tasks/ - создать задачу
    - GET /api/tasks/{id}/ - получить задачу
    - PUT /api/tasks/{id}/ - обновить задачу
    - PATCH /api/tasks/{id}/ - частичное обновление
    - DELETE /api/tasks/{id}/ - удалить задачу
    - POST /api/tasks/{id}/complete/ - отметить выполненной
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Получаем только задачи текущего пользователя"""
        return Task.objects.filter(responsible=self.request.user)
    
    def get_serializer_class(self):
        """Выбираем сериализатор в зависимости от действия"""
        if self.action == 'list':
            return TaskListSerializer
        elif self.action == 'create':
            return TaskCreateSerializer
        return TaskSerializer
    
    def perform_create(self, serializer):
        """Автоматически устанавливаем текущего пользователя"""
        # Получаем или создаём команду
        team, _ = Team.objects.get_or_create(
            team_lead=self.request.user,
            defaults={
                'name': f'Команда {self.request.user.username}',
                'members': self.request.user.username
            }
        )
        
        serializer.save(
            responsible=self.request.user,
            team=team
        )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Отметить задачу как выполненную"""
        task = self.get_object()
        task.is_completed = not task.is_completed
        task.status = 'done' if task.is_completed else 'todo'
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Получить задачи на сегодня"""
        from django.utils import timezone
        today = timezone.now().date()
        
        tasks = self.get_queryset().filter(due_date=today)
        serializer = self.get_serializer(tasks, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Получить просроченные задачи"""
        from django.utils import timezone
        today = timezone.now().date()
        
        tasks = self.get_queryset().filter(
            due_date__lt=today,
            is_completed=False
        )
        serializer = self.get_serializer(tasks, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Получить выполненные задачи"""
        tasks = self.get_queryset().filter(is_completed=True)
        serializer = self.get_serializer(tasks, many=True)
        
        return Response(serializer.data)


class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet для управления командами"""
    
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Получаем только команды текущего пользователя"""
        return Team.objects.filter(team_lead=self.request.user)
    
    def perform_create(self, serializer):
        """Автоматически устанавливаем лидера команды"""
        serializer.save(team_lead=self.request.user)