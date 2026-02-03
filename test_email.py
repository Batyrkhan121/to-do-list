"""
Тестовый скрипт для проверки отправки email.
Запусти: python test_email.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'to_do_manager.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email():
    try:
        send_mail(
            subject='🎉 Test Email from TaskFlow',
            message='If you see this, your email settings are working!',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.EMAIL_HOST_USER],  # Отправляем себе
            fail_silently=False,
        )
        print("✅ Email sent successfully!") 
        print(f"   Check inbox: {settings.EMAIL_HOST_USER}")
    except Exception as e:
        print(f"❌ Email failed: {e}")

if __name__ == '__main__':
    test_email()