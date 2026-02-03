from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Role(models.Model):
    """Роли пользователей"""
    ADMIN = 'admin'
    MANAGER = 'manager'
    MEMBER = 'member'
    VIEWER = 'viewer'
    
    ROLE_CHOICES = [
        (ADMIN, 'Administrator'),
        (MANAGER, 'Manager'),
        (MEMBER, 'Member'),
        (VIEWER, 'Viewer'),
    ]
    
    name = models.CharField(max_length=20, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True)
    
    can_create_tasks = models.BooleanField(default=False)
    can_edit_tasks = models.BooleanField(default=False)
    can_delete_tasks = models.BooleanField(default=False)
    can_assign_tasks = models.BooleanField(default=False)
    
    can_create_projects = models.BooleanField(default=False)
    can_edit_projects = models.BooleanField(default=False)
    can_delete_projects = models.BooleanField(default=False)
    
    can_manage_team = models.BooleanField(default=False)
    can_invite_members = models.BooleanField(default=False)
    can_remove_members = models.BooleanField(default=False)
    
    can_view_reports = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.get_name_display()
    
    class Meta:
        ordering = ['name']


class UserProfile(models.Model):
    """Расширенный профиль пользователя"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    avatar = models.URLField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"
    
    @property
    def role_name(self):
        return self.role.name if self.role else 'member'
    
    def has_permission(self, permission):
        if not self.role:
            return False
        return getattr(self.role, permission, False)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        default_role = Role.objects.filter(name='member').first()
        UserProfile.objects.get_or_create(user=instance, defaults={'role': default_role})