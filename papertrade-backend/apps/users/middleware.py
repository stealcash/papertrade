"""
Middleware for JWT authentication and rate limiting.
"""
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.utils import timezone
from django.http import JsonResponse
from .utils import decode_access_token
from .models import User


class JWTAuthenticationMiddleware(MiddlewareMixin):
    """Middleware to authenticate users via JWT token."""
    
    def process_request(self, request):
        """Extract and validate JWT token from Authorization header."""
        # Skip authentication for certain paths
        skip_paths = ['/admin/', '/api/v1/auth/login', '/api/v1/auth/signup', 
                     '/api/v1/schema/', '/api/v1/docs/', '/api/v1/redoc/']
        
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Get token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = decode_access_token(token)
            user_type = payload.get('user_type', 'user')
            
            if user_type == 'admin':
                from apps.adminpanel.models import AdminUser
                user = AdminUser.objects.get(id=payload['user_id'])
            else:
                user = User.objects.get(id=payload['user_id'])
            
            if not user.is_active:
                return self._get_json_error('USER_INACTIVE', 'User account is inactive', status_code=403)
            
            # Attach user to request
            request.user = user
            request.user_id = user.id
            
            # Rate limiting check (skip for admins)
            if user_type != 'admin' and not self.check_rate_limit(user):
                return self._get_json_error('RATE_LIMIT_EXCEEDED', 
                                        'Rate limit exceeded. Maximum 100 requests per minute.', 
                                        status_code=429)
            
        except (User.DoesNotExist, AdminUser.DoesNotExist if 'AdminUser' in locals() else User.DoesNotExist):
            return self._get_json_error('USER_NOT_FOUND', 'User not found', status_code=404)
        except Exception as e:
            return self._get_json_error('AUTHENTICATION_FAILED', str(e), status_code=401)
        
        return None
    
    def _get_json_error(self, code, message, status_code):
        """Helper to return rendered JsonResponse."""
        return JsonResponse({
            'status': 'error',
            'code': code,
            'message': message,
            'timestamp': timezone.now().isoformat(),
        }, status=status_code)

    def check_rate_limit(self, user):
        """Check if user has exceeded rate limit."""
        from django.conf import settings
        
        cache_key = f'rate_limit:{user.id}'
        current_count = cache.get(cache_key, 0)
        
        if current_count >= settings.RATE_LIMIT_PER_MINUTE:
            return False
        
        # Increment counter
        cache.set(cache_key, current_count + 1, 60)  # 60 seconds TTL
        return True
