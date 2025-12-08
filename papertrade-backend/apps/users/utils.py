"""
JWT utilities for token generation and validation.
"""
import jwt
import datetime
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed


def generate_access_token(user):
    """Generate JWT access token for user."""
    # Determine user type based on model class name or attribute
    user_type = 'admin' if hasattr(user, 'role') and user.__class__.__name__ == 'AdminUser' else 'user'
    
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'user_type': user_type,
        'exp': timezone.now() + datetime.timedelta(hours=settings.JWT_ACCESS_EXP_HOURS),
        'iat': timezone.now(),
    }
    
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')
    return token


def decode_access_token(token):
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed('Token has expired')
    except jwt.InvalidTokenError:
        raise AuthenticationFailed('Invalid token')


def custom_exception_handler(exc, context):
    """Custom exception handler for standardized error responses."""
    from rest_framework.views import exception_handler
    from rest_framework.response import Response
    from django.utils import timezone
    
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Standardize error format
        error_code = 'ERROR'
        
        # Map specific exceptions to error codes
        if hasattr(exc, 'default_code'):
            error_code = exc.default_code.upper()
        
        custom_response = {
            'status': 'error',
            'code': error_code,
            'message': str(exc),
            'details': response.data if isinstance(response.data, dict) else {'detail': response.data},
            'timestamp': timezone.now().isoformat(),
        }
        
        response.data = custom_response
    
    return response


def get_error_response(code, message, details=None, status_code=400):
    """Generate standardized error response."""
    from rest_framework.response import Response
    from django.utils import timezone
    
    return Response({
        'status': 'error',
        'code': code,
        'message': message,
        'details': details or {},
        'timestamp': timezone.now().isoformat(),
    }, status=status_code)


def get_success_response(data, message='Success', status_code=200):
    """Generate standardized success response."""
    from rest_framework.response import Response
    from django.utils import timezone
    
    return Response({
        'status': 'success',
        'message': message,
        'data': data,
        'timestamp': timezone.now().isoformat(),
    }, status=status_code)
