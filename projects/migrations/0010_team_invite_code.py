import uuid
from django.db import migrations, models


def populate_invite_codes(apps, schema_editor):
    Team = apps.get_model('projects', 'Team')
    used_codes = set()

    for team in Team.objects.all().order_by('id'):
        code = team.invite_code

        if not code or code in used_codes:
            code = uuid.uuid4()
            while code in used_codes:
                code = uuid.uuid4()
            team.invite_code = code
            team.save(update_fields=['invite_code'])

        used_codes.add(code)


def add_team_leads_to_members(apps, schema_editor):
    Team = apps.get_model('projects', 'Team')
    for team in Team.objects.select_related('team_lead').all():
        if team.team_lead_id:
            team.members.add(team.team_lead_id)


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0009_calendar_event'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='invite_code',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.RunPython(populate_invite_codes, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(add_team_leads_to_members, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='team',
            name='invite_code',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
