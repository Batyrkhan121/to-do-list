from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Team, Task, Project, CalendarEvent

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class CategorySerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'color', 'icon', 'task_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_task_count(self, obj):
        return obj.tasks.count()


class TeamListSerializer(serializers.ModelSerializer):
    team_lead = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)
    member_count = serializers.ReadOnlyField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'invite_code', 'team_lead', 'members', 'member_count', 'is_active', 'created_at']


class TeamDetailSerializer(serializers.ModelSerializer):
    team_lead = UserSerializer(read_only=True)
    team_lead_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='team_lead',
        write_only=True,
        required=False
    )
    members = UserSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='members',
        write_only=True,
        many=True,
        required=False
    )
    member_count = serializers.ReadOnlyField()

    class Meta:
        model = Team
        fields = [
            'id', 'name', 'invite_code', 'description', 'team_lead', 'team_lead_id',
            'members', 'member_ids', 'member_count', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'invite_code', 'created_at']


class TaskListSerializer(serializers.ModelSerializer):
    responsible = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    priority_level = serializers.ReadOnlyField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'status', 'priority', 'priority_level',
            'due_date', 'is_completed', 'is_overdue', 'responsible',
            'category', 'team_name', 'created_at'
        ]


class TaskDetailSerializer(serializers.ModelSerializer):
    responsible = UserSerializer(read_only=True)
    responsible_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='responsible',
        write_only=True
    )
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )
    team = TeamListSerializer(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        source='team',
        write_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    priority_level = serializers.ReadOnlyField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'team', 'team_id',
            'responsible', 'responsible_id', 'category', 'category_id',
            'status', 'priority', 'priority_level', 'due_date',
            'is_completed', 'is_overdue', 'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'team', 'responsible',
            'category', 'status', 'priority', 'due_date'
        ]
        read_only_fields = ['id']


class ProjectListSerializer(serializers.ModelSerializer):
    team = TeamListSerializer(read_only=True)
    progress = serializers.ReadOnlyField()
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'project_title', 'status', 'team', 'progress',
            'task_count', 'deadline', 'created_at'
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()


class ProjectDetailSerializer(serializers.ModelSerializer):
    team = TeamListSerializer(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        source='team',
        write_only=True
    )
    tasks = TaskListSerializer(many=True, read_only=True)
    task_ids = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(),
        source='tasks',
        write_only=True,
        many=True,
        required=False
    )
    progress = serializers.ReadOnlyField()

    class Meta:
        model = Project
        fields = [
            'id', 'project_title', 'description', 'team', 'team_id',
            'tasks', 'task_ids', 'status', 'progress', 'start_date',
            'deadline', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'start_date']


class CalendarEventSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id',
            'title',
            'description',
            'start_time',
            'end_time',
            'calendar_id',
            'color',
            'location',
            'participants',
            'recurrence',
            'series_id',
            'is_all_day',
            'owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
