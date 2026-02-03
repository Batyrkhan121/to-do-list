from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone

from .models import Category, Team, Task, Project, CalendarEvent
from .serializers import (
    CategorySerializer,
    TeamListSerializer, TeamDetailSerializer,
    TaskListSerializer, TaskDetailSerializer, TaskCreateSerializer,
    ProjectListSerializer, ProjectDetailSerializer,
    CalendarEventSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'team_lead']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return TeamListSerializer
        return TeamDetailSerializer

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        team = self.get_object()
        tasks = team.tasks.all()
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        team = self.get_object()
        projects = team.projects.all()
        serializer = ProjectListSerializer(projects, many=True)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related('team', 'responsible', 'category').all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'is_completed', 'team', 'responsible', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'created_at', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskListSerializer
        if self.action == 'create':
            return TaskCreateSerializer
        return TaskDetailSerializer

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.complete()
        serializer = TaskDetailSerializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        task = self.get_object()
        task.is_completed = False
        task.status = 'todo'
        task.completed_at = None
        task.save()
        serializer = TaskDetailSerializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        today = timezone.now().date()
        tasks = self.queryset.filter(due_date__lt=today, is_completed=False)
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.now().date()
        tasks = self.queryset.filter(due_date=today)
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related('team').prefetch_related('tasks').all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'team']
    search_fields = ['project_title', 'description']
    ordering_fields = ['deadline', 'created_at', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectDetailSerializer

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        project = self.get_object()
        project.start()
        serializer = ProjectDetailSerializer(project)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_task(self, request, pk=None):
        project = self.get_object()
        task_id = request.data.get('task_id')
        try:
            task = Task.objects.get(id=task_id)
            project.tasks.add(task)
            serializer = ProjectDetailSerializer(project)
            return Response(serializer.data)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found"}, status=status.HTTP_404_NOT_FOUND)


class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all()
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['calendar_id']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_time', 'end_time', 'created_at']

    def get_queryset(self):
        return CalendarEvent.objects.filter(owner=self.request.user).order_by('start_time')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    today = timezone.now().date()
    
    total_tasks = Task.objects.count()
    completed_tasks = Task.objects.filter(is_completed=True).count()
    overdue_tasks = Task.objects.filter(due_date__lt=today, is_completed=False).count()
    in_progress_tasks = Task.objects.filter(status='progress').count()
    
    total_projects = Project.objects.count()
    active_projects = Project.objects.filter(status='active').count()
    total_teams = Team.objects.filter(is_active=True).count()
    
    tasks_by_priority = dict(
        Task.objects.values('priority')
        .annotate(count=Count('id'))
        .values_list('priority', 'count')
    )
    
    tasks_by_status = dict(
        Task.objects.values('status')
        .annotate(count=Count('id'))
        .values_list('status', 'count')
    )
    
    recent_tasks = Task.objects.order_by('-created_at')[:5]
    
    data = {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'overdue_tasks': overdue_tasks,
        'in_progress_tasks': in_progress_tasks,
        'total_projects': total_projects,
        'active_projects': active_projects,
        'total_teams': total_teams,
        'tasks_by_priority': tasks_by_priority,
        'tasks_by_status': tasks_by_status,
        'recent_tasks': TaskListSerializer(recent_tasks, many=True).data
    }
    
    return Response(data)
