"""
OTP authentication views.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from apps.users.utils import get_success_response, get_error_response
from apps.users.otp import generate_otp, send_otp_email, send_otp_sms, store_otp, verify_otp
from apps.users.models import User
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp(request):
    """Request OTP for login or verification."""
    email = request.data.get('email')
    mobile = request.data.get('mobile')
    otp_type = request.data.get('type', 'email')  # 'email' or 'sms'
    
    if not email and not mobile:
        return get_error_response(
            'MISSING_PARAMETER',
            'Email or mobile is required',
            status_code=400
        )
    
    # Check if user exists
    user = None
    if email:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return get_error_response(
                'USER_NOT_FOUND',
                'User with this email does not exist',
                status_code=404
            )
    
    # Generate OTP
    otp = generate_otp()
    
    # Send OTP
    success = False
    if otp_type == 'email' and email:
        success = send_otp_email(email, otp)
        store_otp(email, otp)
    elif otp_type == 'sms' and mobile:
        success = send_otp_sms(mobile, otp)
        store_otp(mobile, otp)
    
    if success:
        return get_success_response({
            'message': f'OTP sent successfully via {otp_type}',
            'otp_type': otp_type
        })
    else:
        return get_error_response(
            'OTP_SEND_FAILED',
            f'Failed to send OTP via {otp_type}',
            status_code=500
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_login(request):
    """Verify OTP and login user."""
    from apps.users.utils import generate_access_token
    
    email = request.data.get('email')
    mobile = request.data.get('mobile')
    otp = request.data.get('otp')
    
    if not otp:
        return get_error_response(
            'MISSING_OTP',
            'OTP is required',
            status_code=400
        )
    
    identifier = email or mobile
    if not identifier:
        return get_error_response(
            'MISSING_IDENTIFIER',
            'Email or mobile is required',
            status_code=400
        )
    
    # Verify OTP
    if not verify_otp(identifier, otp):
        return get_error_response(
            'INVALID_OTP',
            'Invalid or expired OTP',
            status_code=400
        )
    
    # Get user
    try:
        if email:
            user = User.objects.get(email=email)
        else:
            user = User.objects.get(mobile=mobile)
    except User.DoesNotExist:
        return get_error_response(
            'USER_NOT_FOUND',
            'User not found',
            status_code=404
        )
    
    # Generate token
    token = generate_access_token(user)
    
    return get_success_response({
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'wallet_balance': str(user.wallet_balance),
        },
        'token': token
    })
