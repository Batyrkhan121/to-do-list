from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Только админы"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role_name == 'admin'


class IsManagerOrAdmin(permissions.BasePermission):
    """Менеджеры и админы"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role_name in ['admin', 'manager']


class IsMemberOrAbove(permissions.BasePermission):
    """Member, Manager, Admin"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role_name in ['admin', 'manager', 'member']


class CanCreateTasks(permissions.BasePermission):
    """Может создавать задачи"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.has_permission('can_create_tasks')


class CanEditTasks(permissions.BasePermission):
    """Может редактировать задачи"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.has_permission('can_edit_tasks')


class CanDeleteTasks(permissions.BasePermission):
    """Может удалять задачи"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.has_permission('can_delete_tasks')


class CanManageTeam(permissions.BasePermission):
    """Может управлять командой"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.has_permission('can_manage_team')


class IsOwnerOrAdmin(permissions.BasePermission):
    """Владелец объекта или админ"""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        # Проверяем владельца
        if hasattr(obj, 'responsible'):
            if obj.responsible == request.user:
                return True
        if hasattr(obj, 'team_lead'):
            if obj.team_lead == request.user:
                return True
        if hasattr(obj, 'user'):
            if obj.user == request.user:
                return True
        
        # Проверяем роль
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role_name == 'admin'


class ReadOnly(permissions.BasePermission):
    """Только чтение"""
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS