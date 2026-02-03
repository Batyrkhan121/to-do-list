from django.core.management.base import BaseCommand
from accounts.models import Role


class Command(BaseCommand):
    help = 'Creates default roles with permissions'

    def handle(self, *args, **options):
        roles_config = [
            {
                'name': 'admin',
                'description': 'Full access to all features',
                'can_create_tasks': True,
                'can_edit_tasks': True,
                'can_delete_tasks': True,
                'can_assign_tasks': True,
                'can_create_projects': True,
                'can_edit_projects': True,
                'can_delete_projects': True,
                'can_manage_team': True,
                'can_invite_members': True,
                'can_remove_members': True,
                'can_view_reports': True,
                'can_manage_settings': True,
            },
            {
                'name': 'manager',
                'description': 'Can manage tasks, projects and team members',
                'can_create_tasks': True,
                'can_edit_tasks': True,
                'can_delete_tasks': True,
                'can_assign_tasks': True,
                'can_create_projects': True,
                'can_edit_projects': True,
                'can_delete_projects': False,
                'can_manage_team': True,
                'can_invite_members': True,
                'can_remove_members': False,
                'can_view_reports': True,
                'can_manage_settings': False,
            },
            {
                'name': 'member',
                'description': 'Can create and edit own tasks',
                'can_create_tasks': True,
                'can_edit_tasks': True,
                'can_delete_tasks': False,
                'can_assign_tasks': False,
                'can_create_projects': False,
                'can_edit_projects': False,
                'can_delete_projects': False,
                'can_manage_team': False,
                'can_invite_members': False,
                'can_remove_members': False,
                'can_view_reports': False,
                'can_manage_settings': False,
            },
            {
                'name': 'viewer',
                'description': 'Read-only access',
                'can_create_tasks': False,
                'can_edit_tasks': False,
                'can_delete_tasks': False,
                'can_assign_tasks': False,
                'can_create_projects': False,
                'can_edit_projects': False,
                'can_delete_projects': False,
                'can_manage_team': False,
                'can_invite_members': False,
                'can_remove_members': False,
                'can_view_reports': True,
                'can_manage_settings': False,
            },
        ]

        for role_data in roles_config:
            role, created = Role.objects.update_or_create(
                name=role_data['name'],
                defaults=role_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(
                self.style.SUCCESS(f'{status} role: {role.name}')
            )

        self.stdout.write(self.style.SUCCESS('✅ All roles have been set up!'))