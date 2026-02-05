from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponseNotFound


def spa(request):
    """Serve the built React app (Vite) index.html for client-side routing."""
    dist_dir = Path(settings.BASE_DIR) / "frontend" / "dist"
    index_file = dist_dir / "index.html"

    if not index_file.exists():
        return HttpResponseNotFound(
            "Frontend build not found. Build it with: cd frontend && npm install && npm run build"
        )

    return FileResponse(index_file.open("rb"), content_type="text/html")
