from django.urls import path
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from . import views
from .social_auth import google_auth, github_auth, get_oauth_urls


@api_view(['GET'])
@permission_classes([AllowAny])
def get_recaptcha_key(request):
    public_key = getattr(settings, 'RECAPTCHA_PUBLIC_KEY', '')
    private_key = getattr(settings, 'RECAPTCHA_PRIVATE_KEY', '')
    enabled = bool(public_key and private_key)
    return Response({
        'site_key': public_key if enabled else '',
        'enabled': enabled,
    })


urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('refresh/', views.refresh_token, name='refresh-token'),
    path('me/', views.me, name='me'),
    path('profile/', views.update_profile, name='update-profile'),
    path('change-password/', views.change_password, name='change-password'),
    path('password-reset/', views.password_reset_request, name='password-reset'),
    path('password-reset-confirm/', views.password_reset_confirm, name='password-reset-confirm'),
    path('recaptcha-key/', get_recaptcha_key, name='recaptcha-key'),
    path('oauth/urls/', get_oauth_urls, name='oauth-urls'),
    path('oauth/google/', google_auth, name='oauth-google'),
    path('oauth/github/', github_auth, name='oauth-github'),
    path('roles/', views.get_roles, name='roles'),
    path('users/', views.get_all_users, name='all-users'),
    path('users/<int:user_id>/role/', views.change_user_role, name='change-user-role'),
]
