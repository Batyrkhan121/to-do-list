from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0008_category_alter_project_options_alter_task_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CalendarEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('calendar_id', models.CharField(default='my', max_length=50)),
                ('color', models.CharField(default='#2563eb', max_length=7)),
                ('location', models.CharField(blank=True, max_length=200)),
                ('participants', models.JSONField(blank=True, default=list)),
                ('recurrence', models.CharField(choices=[('none', 'Does not repeat'), ('daily', 'Daily'), ('weekly', 'Weekly')], default='none', max_length=20)),
                ('series_id', models.CharField(blank=True, max_length=50, null=True)),
                ('is_all_day', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='calendar_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['start_time'],
            },
        ),
    ]
