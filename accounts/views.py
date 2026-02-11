from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings

import requests as http_requests
from projects.invitations import join_user_from_session_invite

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UpdateProfileSerializer,
)

User = get_user_model()


def _team_payload(team):
    if team is None:
        return None
    return {
        'id': team.id,
        'name': team.name,
        'invite_code': str(team.invite_code),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    captcha_token = request.data.get('captcha_token')
    recaptcha_private_key = getattr(settings, 'RECAPTCHA_PRIVATE_KEY', '')

    if recaptcha_private_key:
        if not captcha_token:
            return Response(
                {'captcha': 'Please complete the reCAPTCHA verification.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            captcha_response = http_requests.post(
                'https://www.google.com/recaptcha/api/siteverify',
                data={
                    'secret': recaptcha_private_key,
                    'response': captcha_token,
                },
                timeout=10,
            )
            captcha_result = captcha_response.json()
        except Exception:
            return Response(
                {'captcha': 'reCAPTCHA verification error.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not captcha_result.get('success'):
            return Response(
                {'captcha': 'reCAPTCHA verification failed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        joined_team = join_user_from_session_invite(request, user)
        return Response({
            'message': 'Registration successful',
            'user': UserSerializer(user).data,
            'joined_team': _team_payload(joined_team),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # reCAPTCHA verification (enabled when RECAPTCHA_PRIVATE_KEY is set)
        captcha_token = request.data.get('captcha_token')
        if getattr(settings, 'RECAPTCHA_PRIVATE_KEY', ''):
            if not captcha_token:
                return Response(
                    {'captcha': 'Please complete the reCAPTCHA verification.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                captcha_response = http_requests.post(
                    'https://www.google.com/recaptcha/api/siteverify',
                    data={
                        'secret': settings.RECAPTCHA_PRIVATE_KEY,
                        'response': captcha_token,
                    },
                    timeout=10,
                )
                captcha_result = captcha_response.json()
            except Exception:
                return Response(
                    {'captcha': 'reCAPTCHA verification error.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not captcha_result.get('success'):
                return Response(
                    {'captcha': 'reCAPTCHA verification failed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.check_password(password):
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({'error': 'Account is disabled'}, status=status.HTTP_401_UNAUTHORIZED)

        django_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        joined_team = join_user_from_session_invite(request, user)
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'joined_team': _team_payload(joined_team),
            'redirect_path': '/teams' if joined_team else None,
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    django_logout(request)
    return Response({'message': 'Logout successful'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    data = UserSerializer(request.user).data
    
    profile = getattr(request.user, 'profile', None)
    if profile and profile.role:
        data['role'] = {
            'name': profile.role.name,
            'display_name': profile.role.get_name_display()
        }
        data['permissions'] = {
            'can_create_tasks': profile.role.can_create_tasks,
            'can_edit_tasks': profile.role.can_edit_tasks,
            'can_delete_tasks': profile.role.can_delete_tasks,
            'can_assign_tasks': profile.role.can_assign_tasks,
            'can_create_projects': profile.role.can_create_projects,
            'can_edit_projects': profile.role.can_edit_projects,
            'can_delete_projects': profile.role.can_delete_projects,
            'can_manage_team': profile.role.can_manage_team,
            'can_invite_members': profile.role.can_invite_members,
            'can_remove_members': profile.role.can_remove_members,
            'can_view_reports': profile.role.can_view_reports,
            'can_manage_settings': profile.role.can_manage_settings,
        }
    else:
        data['role'] = {'name': 'member', 'display_name': 'Member'}
        data['permissions'] = {
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
        }
    
    return Response(data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    serializer = UpdateProfileSerializer(
        request.user, 
        data=request.data, 
        partial=True,
        context={'request': request}
    )
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(request.user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': 'Wrong password'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'message': 'Password changed successfully'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            token = default_token_generator.make_token(user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uidb64}/{token}"
            
            send_mail(
                subject='Password Reset - TaskFlow',
                message=f'Reset your password: {reset_url}',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@taskflow.com'),
                recipient_list=[email],
                fail_silently=True,
            )
            
        except User.DoesNotExist:
            pass
        except Exception as e:
            print(f"Email error: {e}")
        
        return Response({'message': 'If the email exists, a reset link has been sent'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        try:
            uidb64 = serializer.validated_data['uidb64']
            token = serializer.validated_data['token']
            
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            if not default_token_generator.check_token(user, token):
                return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({'message': 'Password reset successful'})
            
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({'error': 'Invalid reset link'}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        
        token = RefreshToken(refresh_token)
        
        return Response({'access': str(token.access_token)})
    except Exception:
        return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_roles(request):
    from .models import Role
    roles = Role.objects.all()
    data = [{'id': r.id, 'name': r.name, 'description': r.description} for r in roles]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_users(request):
    users = User.objects.all().order_by('-date_joined')
    data = []
    for user in users:
        user_data = UserSerializer(user).data
        profile = getattr(user, 'profile', None)
        if profile and profile.role:
            user_data['role'] = {'name': profile.role.name, 'display_name': profile.role.get_name_display()}
            user_data['permissions'] = {
                'can_create_tasks': profile.role.can_create_tasks,
                'can_manage_team': profile.role.can_manage_team,
            }
        else:
            user_data['role'] = {'name': 'member', 'display_name': 'Member'}
            user_data['permissions'] = {}
        data.append(user_data)
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def change_user_role(request, user_id):
    from .models import Role, UserProfile
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    role_id = request.data.get('role_id')
    if not role_id:
        return Response({'error': 'role_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        role = Role.objects.get(id=role_id)
    except Role.DoesNotExist:
        return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)
    
    profile, _ = UserProfile.objects.get_or_create(user=target_user)
    profile.role = role
    profile.save()
    
    return Response({'message': f"Role changed to {role.get_name_display()}"})
