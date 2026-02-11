from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.utils.http import url_has_allowed_host_and_scheme
from django.core.exceptions import ObjectDoesNotExist
from urllib.parse import urlencode
from datetime import datetime

from .forms import TeamMessageForm
from .invitations import store_invite_code
from .models import Category, Team, Task, Project, CalendarEvent, TeamMessage
from .serializers import (
    CategorySerializer,
    TeamListSerializer, TeamDetailSerializer,
    TaskListSerializer, TaskDetailSerializer, TaskCreateSerializer,
    ProjectListSerializer, ProjectDetailSerializer,
    CalendarEventSerializer,
)

def _team_invite_payload(team, user):
    is_member = False
    if user.is_authenticated:
        is_member = (
            team.team_lead_id == user.id or
            team.members.filter(id=user.id).exists()
        )
    return {
        "id": team.id,
        "name": team.name,
        "invite_code": str(team.invite_code),
        "description": team.description,
        "team_lead": team.team_lead.username,
        "member_count": team.member_count,
        "is_member": is_member,
    }


def _is_team_member(team, user):
    return team.team_lead_id == user.id or team.members.filter(id=user.id).exists()


def _user_teams(user):
    return Team.objects.filter(
        is_active=True,
    ).filter(
        Q(team_lead=user) | Q(members=user)
    ).distinct()


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
        return _user_teams(self.request.user)

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

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def invite(self, request, pk=None):
        try:
            team = Team.objects.select_related('team_lead').get(pk=pk, is_active=True)
        except Team.DoesNotExist:
            return Response({"detail": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(_team_invite_payload(team, request.user))

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[AllowAny],
        url_path=r'invite-by-code/(?P<invite_code>[0-9a-fA-F-]{36})'
    )
    def invite_by_code(self, request, invite_code=None):
        try:
            team = Team.objects.select_related('team_lead').get(invite_code=invite_code, is_active=True)
        except Team.DoesNotExist:
            return Response({"detail": "Team not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_team_invite_payload(team, request.user))

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

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[IsAuthenticated],
        url_path=r'join-by-code/(?P<invite_code>[0-9a-fA-F-]{36})'
    )
    def join_by_code(self, request, invite_code=None):
        try:
            team = Team.objects.select_related('team_lead').get(invite_code=invite_code, is_active=True)
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
        user_teams = _user_teams(user)
        return self.queryset.filter(
            Q(team__in=user_teams) |
            Q(team__isnull=True, responsible=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return TaskCreateSerializer
        return TaskDetailSerializer

    def _validate_team_access(self, team, responsible):
        if team is None:
            if responsible and responsible.id != self.request.user.id and not self.request.user.is_superuser:
                raise ValidationError({
                    "responsible": "Personal task can only be assigned to yourself."
                })
            return

        user = self.request.user
        is_team_member = _is_team_member(team, user)
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
        if team is None and responsible is None:
            serializer.save(responsible=self.request.user)
            return
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
        return self.queryset.filter(team__in=_user_teams(self.request.user)).distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectDetailSerializer

    def _validate_team_access(self, team):
        if team is None:
            raise ValidationError({"team": "Team is required."})

        user = self.request.user
        is_team_member = _is_team_member(team, user)
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

    user_teams = _user_teams(request.user)

    visible_tasks = Task.objects.filter(
        Q(responsible=request.user) | Q(team__in=user_teams)
    ).distinct()
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_team_stats(request):
    """Get team statistics for the authenticated user"""
    user_teams = _user_teams(request.user).filter(is_active=True)
    
    teams_data = []
    overall_team_total = 0
    overall_team_completed = 0
    
    for team in user_teams:
        total_tasks = team.tasks.count()
        completed_tasks = team.tasks.filter(is_completed=True).count()
        progress_percent = _safe_percent(completed_tasks, total_tasks)
        
        overall_team_total += total_tasks
        overall_team_completed += completed_tasks
        
        # Build member list
        members = []
        team_lead = team.team_lead
        
        # Add team lead first
        try:
            avatar_url = team_lead.profile.avatar or ''
        except ObjectDoesNotExist:
            avatar_url = ''
        
        members.append({
            'id': team_lead.id,
            'username': team_lead.username,
            'avatar_url': avatar_url,
            'is_lead': True,
        })
        
        # Add other members
        for member in team.members.all():
            if member.id != team_lead.id:
                try:
                    avatar_url = member.profile.avatar or ''
                except ObjectDoesNotExist:
                    avatar_url = ''
                
                members.append({
                    'id': member.id,
                    'username': member.username,
                    'avatar_url': avatar_url,
                    'is_lead': False,
                })
        
        teams_data.append({
            'id': team.id,
            'name': team.name,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'progress_percent': progress_percent,
            'members': members,
        })
    
    overall_team_progress = _safe_percent(overall_team_completed, overall_team_total)
    
    return Response({
        'teams': teams_data,
        'overall_team_total': overall_team_total,
        'overall_team_completed': overall_team_completed,
        'overall_team_progress': overall_team_progress,
    })


def _safe_percent(completed, total):
    if total == 0:
        return 0
    return int((completed / total) * 100)


def _dashboard_context(user):
    user_teams = _user_teams(user).order_by('name')
    visible_tasks = Task.objects.filter(
        Q(responsible=user) | Q(team__in=user_teams)
    ).distinct()

    personal_tasks = visible_tasks.filter(
        team__isnull=True,
        responsible=user,
    ).order_by('is_completed', 'due_date', '-created_at')

    team_tasks = visible_tasks.filter(
        team__in=user_teams,
    ).select_related('team').order_by('is_completed', 'due_date', '-created_at').distinct()

    stats = visible_tasks.aggregate(
        personal_total=Count(
            'id',
            filter=Q(team__isnull=True, responsible=user),
            distinct=True,
        ),
        personal_completed=Count(
            'id',
            filter=Q(team__isnull=True, responsible=user, is_completed=True),
            distinct=True,
        ),
        team_total=Count(
            'id',
            filter=Q(team__in=user_teams),
            distinct=True,
        ),
        team_completed=Count(
            'id',
            filter=Q(team__in=user_teams, is_completed=True),
            distinct=True,
        ),
    )

    personal_total = stats['personal_total'] or 0
    personal_completed = stats['personal_completed'] or 0
    team_total = stats['team_total'] or 0
    team_completed = stats['team_completed'] or 0

    return {
        'personal_tasks': personal_tasks,
        'team_tasks': team_tasks,
        'personal_total': personal_total,
        'personal_completed': personal_completed,
        'team_total': team_total,
        'team_completed': team_completed,
        'personal_progress_percent': _safe_percent(personal_completed, personal_total),
        'team_progress_percent': _safe_percent(team_completed, team_total),
        # Backward-compatible aliases for templates/components still using old names.
        'personal_progress': _safe_percent(personal_completed, personal_total),
        'team_progress': _safe_percent(team_completed, team_total),
        'team_invites': user_teams,
    }


@login_required
def dashboard_ui(request):
    context = _dashboard_context(request.user)
    return render(request, 'dashboard.html', context)


@login_required
@require_POST
def dashboard_create_task(request):
    title = (request.POST.get('title') or '').strip()
    description = (request.POST.get('description') or '').strip()
    due_date_raw = (request.POST.get('due_date') or '').strip()
    team_id = (request.POST.get('team_id') or '').strip()

    if not title:
        messages.error(request, 'Task title is required.')
        return redirect('dashboard-ui')

    selected_team = None
    if team_id:
        selected_team = _user_teams(request.user).filter(id=team_id).first()
        if selected_team is None:
            messages.error(request, 'You can only create team tasks inside your teams.')
            return redirect('dashboard-ui')

    task_data = {
        'title': title,
        'description': description,
        'responsible': request.user,
        'team': selected_team,
    }

    if due_date_raw:
        try:
            task_data['due_date'] = datetime.strptime(due_date_raw, '%Y-%m-%d').date()
        except ValueError:
            messages.error(request, 'Invalid date format.')
            return redirect('dashboard-ui')

    Task.objects.create(**task_data)
    messages.success(request, 'Task created successfully.')
    return redirect('dashboard-ui')


@login_required
@require_POST
def dashboard_toggle_task(request, task_id):
    user_teams = _user_teams(request.user)
    task = get_object_or_404(
        Task.objects.filter(Q(responsible=request.user) | Q(team__in=user_teams)).distinct(),
        pk=task_id,
    )

    if task.is_completed:
        task.is_completed = False
        task.status = 'todo'
        task.completed_at = None
    else:
        task.is_completed = True
        task.status = 'done'
        task.completed_at = timezone.now()

    task.save(update_fields=['is_completed', 'status', 'completed_at', 'updated_at'])
    next_url = (request.POST.get('next') or '').strip()
    if next_url and url_has_allowed_host_and_scheme(
        url=next_url,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return redirect(next_url)
    return redirect('dashboard-ui')


def join_team(request, invite_code):
    """Join a team by invite code and preserve invite flow through auth."""
    team = get_object_or_404(
        Team.objects.select_related('team_lead'),
        invite_code=invite_code,
        is_active=True,
    )

    if request.user.is_authenticated:
        team.members.add(request.user)
        messages.success(request, f'You joined "{team.name}" successfully.')
        join_query = urlencode({'invite_code': team.invite_code, 'name': team.name})
        return redirect(f"/join/team/{team.id}?{join_query}")

    store_invite_code(request, str(invite_code))
    next_path = f"/join/team/{team.id}?invite_code={team.invite_code}"
    login_query = urlencode({'next': next_path})
    messages.info(request, f'Login or register to join "{team.name}".')
    return redirect(f"/login?{login_query}")


@login_required
def team_detail(request, team_id):
    team = get_object_or_404(
        Team.objects.select_related('team_lead'),
        pk=team_id,
        is_active=True,
    )
    if not _is_team_member(team, request.user):
        messages.error(request, "You do not have access to this team.")
        return redirect('dashboard-ui')

    team_tasks = Task.objects.filter(team=team).select_related('responsible').order_by(
        'is_completed',
        'due_date',
        '-created_at',
    )
    chat_messages = TeamMessage.objects.filter(team=team).select_related(
        'author',
        'author__profile',
    )

    members = list(
        team.members.select_related('profile').order_by(
            'username',
        )
    )
    if all(member.id != team.team_lead_id for member in members):
        members.insert(0, team.team_lead)

    member_cards = []
    for member in members:
        try:
            profile = member.profile
            avatar_url = profile.avatar or ''
        except ObjectDoesNotExist:
            avatar_url = ''
        full_name = member.get_full_name().strip()
        member_cards.append({
            'id': member.id,
            'username': member.username,
            'display_name': full_name or member.username,
            'avatar_url': avatar_url,
            'is_lead': member.id == team.team_lead_id,
        })

    context = {
        'team': team,
        'members': member_cards,
        'team_tasks': team_tasks,
        'team_total': team_tasks.count(),
        'team_completed': team_tasks.filter(is_completed=True).count(),
        'chat_messages': chat_messages,
        'message_form': TeamMessageForm(),
    }
    return render(request, 'team_detail.html', context)


@login_required
@require_POST
def team_send_message(request, team_id):
    team = get_object_or_404(
        Team.objects.select_related('team_lead'),
        pk=team_id,
        is_active=True,
    )
    if not _is_team_member(team, request.user):
        messages.error(request, "You do not have access to this team.")
        return redirect('dashboard-ui')

    form = TeamMessageForm(request.POST)
    if form.is_valid():
        message = form.save(commit=False)
        message.team = team
        message.author = request.user
        message.save()
        messages.success(request, "Message sent.")
    else:
        messages.error(request, "Message cannot be empty.")

    return redirect('team-detail', team_id=team.id)
