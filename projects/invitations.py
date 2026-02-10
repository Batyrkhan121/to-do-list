from __future__ import annotations

from typing import Optional

from .models import Team

INVITE_CODE_SESSION_KEY = "invite_code"


def store_invite_code(request, invite_code: str) -> None:
    request.session[INVITE_CODE_SESSION_KEY] = str(invite_code)
    request.session.modified = True
def join_user_from_session_invite(request, user) -> Optional[Team]:
    invite_code = request.session.get(INVITE_CODE_SESSION_KEY)
    if not invite_code:
        return None

    team = Team.objects.filter(invite_code=invite_code, is_active=True).first()
    request.session.pop(INVITE_CODE_SESSION_KEY, None)
    request.session.modified = True

    if team is None:
        return None

    team.members.add(user)
    return team
