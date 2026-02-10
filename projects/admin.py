from django.contrib import admin
from django.utils.html import format_html
from .models import Task, Project, Team, Category, TeamMessage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'colored_badge', 'task_count', 'created_at')
    search_fields = ('name',)

    def colored_badge(self, obj):
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px;">{}</span>',
            obj.color, obj.name
        )
    colored_badge.short_description = "Badge"

    def task_count(self, obj):
        return obj.tasks.count()
    task_count.short_description = "Tasks"


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'team', 'responsible', 'priority', 'status', 'due_date', 'is_completed')
    list_filter = ('status', 'priority', 'team', 'is_completed')
    search_fields = ('title', 'description')
    actions = ['mark_completed']

    def mark_completed(self, request, queryset):
        for task in queryset:
            task.complete()
    mark_completed.short_description = "Mark as completed"


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('project_title', 'team', 'status', 'deadline')
    list_filter = ('status', 'team')
    filter_horizontal = ('tasks',)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'team_lead', 'member_count', 'is_active')
    list_filter = ('is_active',)
    filter_horizontal = ('members',)

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = "Members"


@admin.register(TeamMessage)
class TeamMessageAdmin(admin.ModelAdmin):
    list_display = ('team', 'author', 'short_content', 'created_at')
    list_filter = ('team', 'created_at')
    search_fields = ('content', 'author__username', 'team__name')

    def short_content(self, obj):
        if len(obj.content) <= 80:
            return obj.content
        return f"{obj.content[:77]}..."
    short_content.short_description = "Message"


admin.site.site_header = "📋 To Do Manager"
admin.site.site_title = "To Do Manager Admin"
