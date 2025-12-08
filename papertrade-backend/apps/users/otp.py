"""
OTP utilities for user authentication.
"""
import random
import string
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def generate_otp(length=6):
    """Generate a random OTP."""
    return ''.join(random.choices(string.digits, k=length))


def send_otp_email(email, otp):
    """Send OTP via email."""
    subject = 'Your PaperTrade OTP Code'
    message = f'''
    Your OTP code is: {otp}
    
    This code will expire in 10 minutes.
    
    If you didn't request this code, please ignore this email.
    
    Best regards,
    PaperTrade Team
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@papertrade.com',
            [email],
            fail_silently=False,
        )
        logger.info(f"OTP sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP to {email}: {str(e)}")
        return False


def store_otp(email, otp, expiry_minutes=10):
    """Store OTP in cache with expiry."""
    cache_key = f'otp_{email}'
    cache.set(cache_key, otp, expiry_minutes * 60)
    logger.info(f"OTP stored for {email}")


def verify_otp(email, otp):
    """Verify OTP against stored value."""
    cache_key = f'otp_{email}'
    stored_otp = cache.get(cache_key)
    
    if stored_otp is None:
        logger.warning(f"OTP expired or not found for {email}")
        return False
    
    if stored_otp == otp:
        # Delete OTP after successful verification
        cache.delete(cache_key)
        logger.info(f"OTP verified successfully for {email}")
        return True
    
    logger.warning(f"Invalid OTP attempt for {email}")
    return False


def send_otp_sms(mobile, otp):
    """Send OTP via SMS (placeholder for SMS gateway integration)."""
    # TODO: Integrate with SMS gateway (Twilio, MSG91, etc.)
    logger.info(f"SMS OTP would be sent to {mobile}: {otp}")
    return True
