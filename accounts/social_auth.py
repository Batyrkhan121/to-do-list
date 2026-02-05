from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

from django.contrib.auth import get_user_model

User = get_user_model()


class GoogleLogin(SocialLoginView):
    """Google OAuth2 Login"""
    adapter_class = GoogleOAuth2Adapter
    callback_url = f"{settings.FRONTEND_URL}/auth/google/callback"
    client_class = OAuth2Client


class GitHubLogin(SocialLoginView):
    """GitHub OAuth2 Login"""
    adapter_class = GitHubOAuth2Adapter
    callback_url = f"{settings.FRONTEND_URL}/auth/github/callback"
    client_class = OAuth2Client


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Получает access_token от Google и создаёт/входит пользователя
    """
    access_token = request.data.get('access_token')
    
    if not access_token:
        return Response(
            {'error': 'Access token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    google_client_id = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
    if not google_client_id:
        return Response(
            {'error': 'Google OAuth is not configured'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Получаем информацию о пользователе от Google
        import requests
        google_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if google_response.status_code != 200:
            return Response(
                {'error': 'Invalid Google token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        google_data = google_response.json()
        email = google_data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email not provided by Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаём или получаем пользователя
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': google_data.get('given_name', ''),
                'last_name': google_data.get('family_name', ''),
            }
        )
        
        # Генерируем JWT токены
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'created': created
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def github_auth(request):
    """
    Получает code от GitHub и создаёт/входит пользователя
    """
    code = request.data.get('code')
    
    if not code:
        return Response(
            {'error': 'Authorization code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    github_client_id = settings.SOCIALACCOUNT_PROVIDERS['github']['APP']['client_id']
    github_client_secret = settings.SOCIALACCOUNT_PROVIDERS['github']['APP']['secret']
    if not github_client_id or not github_client_secret:
        return Response(
            {'error': 'GitHub OAuth is not configured'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        import requests
        
        # Обмениваем code на access_token
        token_response = requests.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': github_client_id,
                'client_secret': github_client_secret,
                'code': code,
            },
            headers={'Accept': 'application/json'}
        )
        
        token_data = token_response.json()
        access_token = token_data.get('access_token')
        
        if not access_token:
            return Response(
                {'error': 'Failed to get access token from GitHub'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем информацию о пользователе
        user_response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        github_data = user_response.json()
        
        # Получаем email (может быть приватным)
        email = github_data.get('email')
        if not email:
            emails_response = requests.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            emails = emails_response.json()
            for e in emails:
                if e.get('primary'):
                    email = e.get('email')
                    break
        
        if not email:
            return Response(
                {'error': 'Email not provided by GitHub'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаём или получаем пользователя
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': github_data.get('login', email.split('@')[0]),
                'first_name': github_data.get('name', '').split()[0] if github_data.get('name') else '',
                'last_name': ' '.join(github_data.get('name', '').split()[1:]) if github_data.get('name') else '',
            }
        )
        
        # Генерируем JWT токены
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'created': created
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_oauth_urls(request):
    """Возвращает URL для OAuth авторизации"""
    google_client_id = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
    github_client_id = settings.SOCIALACCOUNT_PROVIDERS['github']['APP']['client_id']
    github_client_secret = settings.SOCIALACCOUNT_PROVIDERS['github']['APP']['secret']

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    google_configured = bool(google_client_id)
    github_configured = bool(github_client_id and github_client_secret)

    return Response({
        'google': {
            'auth_url': (
                f"https://accounts.google.com/o/oauth2/v2/auth?client_id={google_client_id}"
                f"&redirect_uri={frontend_url}/auth/google/callback"
                f"&response_type=token&scope=email%20profile"
            ) if google_configured else '',
            'configured': google_configured
        },
        'github': {
            'auth_url': (
                f"https://github.com/login/oauth/authorize?client_id={github_client_id}"
                f"&redirect_uri={frontend_url}/auth/github/callback"
                f"&scope=user:email"
            ) if github_configured else '',
            'configured': github_configured
        }
    })
