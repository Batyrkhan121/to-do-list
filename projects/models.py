from django.conf import settings 
from django.db import models 
from django.utils import timezone
import uuid


class Category(models.Model):
    """Категории для задач"""
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#6366f1')
    icon = models.CharField(max_length=50, default='folder')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Team(models.Model):
    team_lead = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='led_teams'
    )
    name = models.CharField(max_length=200)
    invite_code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    description = models.TextField(blank=True)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='teams',
        blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def member_count(self):
        return self.members.count()


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('progress', 'In Progress'),
        ('review', 'In Review'),
        ('done', 'Done'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    team = models.ForeignKey(
        Team, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='assigned_tasks'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='todo'
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-priority', 'due_date', '-created_at']

    def __str__(self):
        return self.title

    def is_overdue(self):
        if self.due_date and not self.is_completed:
            return self.due_date < timezone.now().date()
        return False

    def complete(self):
        self.is_completed = True
        self.status = 'done'
        self.completed_at = timezone.now()
        self.save()

    @property
    def priority_level(self):
        levels = {'low': 1, 'medium': 2, 'high': 3, 'urgent': 4}
        return levels.get(self.priority, 0)


class TeamMessage(models.Model):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='team_messages',
    )
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author} in {self.team}: {self.content[:40]}"


class Project(models.Model):
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    project_title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    team = models.ForeignKey(
        Team, 
        on_delete=models.CASCADE,
        related_name='projects'
    )
    tasks = models.ManyToManyField(Task, blank=True, related_name='projects')
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planning'
    )
    
    start_date = models.DateTimeField(blank=True, null=True)
    deadline = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.project_title

    def start(self):
        self.start_date = timezone.now()
        self.status = 'active'
        self.save()

    @property
    def progress(self):
        total = self.tasks.count()
        if total == 0:
            return 0
        completed = self.tasks.filter(is_completed=True).count()
        return int((completed / total) * 100)


class CalendarEvent(models.Model):
    RECURRENCE_CHOICES = [
        ('none', 'Does not repeat'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_events'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    calendar_id = models.CharField(max_length=50, default='my')
    color = models.CharField(max_length=7, default='#2563eb')
    location = models.CharField(max_length=200, blank=True)
    participants = models.JSONField(default=list, blank=True)
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='none')
    series_id = models.CharField(max_length=50, blank=True, null=True)
    is_all_day = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return self.title
