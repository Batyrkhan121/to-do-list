from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError
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
    queryset = Team.objects.select_related('team_lead').prefetch_related('members').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'team_lead']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter(
            Q(team_lead=user) | Q(members=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return TeamListSerializer
        return TeamDetailSerializer

    def perform_create(self, serializer):
        team = serializer.save(team_lead=self.request.user)
        team.members.add(self.request.user)

    def perform_update(self, serializer):
        team = self.get_object()
        if not (self.request.user.is_superuser or team.team_lead_id == self.request.user.id):
            raise PermissionDenied("Only the team lead can update this team.")
        serializer.save(team_lead=team.team_lead)

    def perform_destroy(self, instance):
        if not (self.request.user.is_superuser or instance.team_lead_id == self.request.user.id):
            raise PermissionDenied("Only the team lead can delete this team.")
        instance.delete()

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

    @action(detail=True, methods=['get'])
    def invite(self, request, pk=None):
        try:
            team = Team.objects.select_related('team_lead').get(pk=pk, is_active=True)
        except Team.DoesNotExist:
            return Response({"detail": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

        is_member = team.team_lead_id == request.user.id or team.members.filter(id=request.user.id).exists()
        return Response({
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "team_lead": team.team_lead.username,
            "member_count": team.member_count,
            "is_member": is_member,
        })

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        try:
            team = Team.objects.select_related('team_lead').get(pk=pk, is_active=True)
        except Team.DoesNotExist:
            return Response({"detail": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

        if team.team_lead_id == request.user.id or team.members.filter(id=request.user.id).exists():
            return Response({
                "detail": "You are already a team member",
                "team_id": team.id,
                "team_name": team.name,
            })

        team.members.add(request.user)
        return Response({
            "detail": "Joined team successfully",
            "team_id": team.id,
            "team_name": team.name,
        }, status=status.HTTP_200_OK)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related('team', 'responsible', 'category').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'is_completed', 'team', 'responsible', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'created_at', 'status']

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter(
            Q(team__team_lead=user) | Q(team__members=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskListSerializer
        if self.action == 'create':
            return TaskCreateSerializer
        return TaskDetailSerializer

    def _validate_team_access(self, team, responsible):
        if team is None:
            raise ValidationError({"team": "Team is required."})

        user = self.request.user
        is_team_member = team.team_lead_id == user.id or team.members.filter(id=user.id).exists()
        if not is_team_member and not user.is_superuser:
            raise PermissionDenied("You are not a member of this team.")

        if responsible:
            is_responsible_in_team = (
                responsible.id == team.team_lead_id or
                team.members.filter(id=responsible.id).exists()
            )
            if not is_responsible_in_team:
                raise ValidationError({
                    "responsible": "Responsible user must belong to the selected team."
                })

    def perform_create(self, serializer):
        team = serializer.validated_data.get('team')
        responsible = serializer.validated_data.get('responsible')
        self._validate_team_access(team, responsible)
        serializer.save()

    def perform_update(self, serializer):
        current_task = self.get_object()
        team = serializer.validated_data.get('team', current_task.team)
        responsible = serializer.validated_data.get('responsible', current_task.responsible)
        self._validate_team_access(team, responsible)
        serializer.save()

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
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'team']
    search_fields = ['project_title', 'description']
    ordering_fields = ['deadline', 'created_at', 'status']

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter(
            Q(team__team_lead=user) | Q(team__members=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectDetailSerializer

    def _validate_team_access(self, team):
        if team is None:
            raise ValidationError({"team": "Team is required."})

        user = self.request.user
        is_team_member = team.team_lead_id == user.id or team.members.filter(id=user.id).exists()
        if not is_team_member and not user.is_superuser:
            raise PermissionDenied("You are not a member of this team.")

    def perform_create(self, serializer):
        team = serializer.validated_data.get('team')
        self._validate_team_access(team)
        serializer.save()

    def perform_update(self, serializer):
        current_project = self.get_object()
        team = serializer.validated_data.get('team', current_project.team)
        self._validate_team_access(team)
        serializer.save()

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
            task = Task.objects.get(id=task_id, team=project.team)
            project.tasks.add(task)
            serializer = ProjectDetailSerializer(project)
            return Response(serializer.data)
        except Task.DoesNotExist:
            return Response(
                {"detail": "Task not found in this project team"},
                status=status.HTTP_404_NOT_FOUND
            )


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
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    today = timezone.now().date()

    user_teams = Team.objects.filter(
        Q(team_lead=request.user) | Q(members=request.user)
    ).distinct()

    visible_tasks = Task.objects.filter(team__in=user_teams).distinct()
    visible_projects = Project.objects.filter(team__in=user_teams).distinct()

    total_tasks = visible_tasks.count()
    completed_tasks = visible_tasks.filter(is_completed=True).count()
    overdue_tasks = visible_tasks.filter(due_date__lt=today, is_completed=False).count()
    in_progress_tasks = visible_tasks.filter(status='progress').count()

    total_projects = visible_projects.count()
    active_projects = visible_projects.filter(status='active').count()
    total_teams = user_teams.filter(is_active=True).count()

    tasks_by_priority = dict(
        visible_tasks.values('priority')
        .annotate(count=Count('id'))
        .values_list('priority', 'count')
    )

    tasks_by_status = dict(
        visible_tasks.values('status')
        .annotate(count=Count('id'))
        .values_list('status', 'count')
    )

    recent_tasks = visible_tasks.order_by('-created_at')[:5]

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
