"""
Email utilities for sending various emails.
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_welcome_email(user):
    """Send welcome email to new user."""
    subject = 'Welcome to PaperTrade!'
    message = f'''
    Hi {user.email},
    
    Welcome to PaperTrade - Your paper trading platform for Indian stocks!
    
    You have been given a trial period of 7 days with ₹100,000 virtual wallet.
    
    Get started:
    1. Browse stocks
    2. Create strategies
    3. Run backtests
    4. Analyze results
    
    Happy trading!
    
    Best regards,
    PaperTrade Team
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@papertrade.com',
            [user.email],
            fail_silently=False,
        )
        logger.info(f"Welcome email sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
        return False


def send_password_reset_email(user, reset_token):
    """Send password reset email."""
    subject = 'Reset Your PaperTrade Password'
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    
    message = f'''
    Hi {user.email},
    
    You requested to reset your password.
    
    Click the link below to reset your password:
    {reset_link}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
    
    Best regards,
    PaperTrade Team
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@papertrade.com',
            [user.email],
            fail_silently=False,
        )
        logger.info(f"Password reset email sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        return False


def send_backtest_completion_email(user, backtest_run):
    """Send backtest completion notification email."""
    subject = f'Backtest {backtest_run.run_id} Completed'
    
    message = f'''
    Hi {user.email},
    
    Your backtest has completed successfully!
    
    Run ID: {backtest_run.run_id}
    Total P/L: ₹{backtest_run.total_pnl}
    P/L Percentage: {backtest_run.pnl_percentage}%
    Number of Trades: {backtest_run.number_of_trades}
    
    View detailed results and download CSV export from your dashboard.
    
    Best regards,
    PaperTrade Team
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@papertrade.com',
            [user.email],
            fail_silently=False,
        )
        logger.info(f"Backtest completion email sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send backtest completion email to {user.email}: {str(e)}")
        return False


def send_subscription_confirmation_email(user, plan_name):
    """Send subscription confirmation email."""
    subject = f'Subscription Confirmed - {plan_name}'
    
    message = f'''
    Hi {user.email},
    
    Thank you for subscribing to {plan_name}!
    
    Your subscription is now active and you have access to all premium features.
    
    Features included:
    - Unlimited backtests
    - All predefined strategies
    - Custom strategy builder
    - Priority support
    - CSV exports
    
    Enjoy your trading journey!
    
    Best regards,
    PaperTrade Team
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@papertrade.com',
            [user.email],
            fail_silently=False,
        )
        logger.info(f"Subscription confirmation email sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send subscription confirmation email to {user.email}: {str(e)}")
        return False


def send_trial_expiry_reminder_email(user, days_left):
    """Send trial expiry reminder email."""
    subject = f'Your Trial Expires in {days_left} Days'
    
    message = f'''
    Hi {user.email},
    
    Your free trial will expire in {days_left} days.
    
    Don't lose access to:
    - Unlimited backtests
    - Advanced strategies
    - Historical data analysis
    
    Subscribe now to continue enjoying all features!
    
    View our plans: http://localhost:3000/subscription
    
    Best regards,
    PaperTrade Team
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@papertrade.com',
            [user.email],
            fail_silently=False,
        )
        logger.info(f"Trial expiry reminder sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send trial expiry reminder to {user.email}: {str(e)}")
        return False
