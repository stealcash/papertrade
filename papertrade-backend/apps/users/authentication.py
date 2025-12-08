from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from apps.adminpanel.models import AdminUser
from .utils import decode_access_token

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
            
        try:
            token = auth_header.split(' ')[1]
            payload = decode_access_token(token)
        except IndexError:
            raise AuthenticationFailed('Token prefix missing')
        except Exception as e:
            raise AuthenticationFailed(str(e))
            
        user_type = payload.get('user_type')
        user_id = payload.get('user_id')
        
        if user_type == 'admin':
            try:
                user = AdminUser.objects.get(id=user_id)
            except AdminUser.DoesNotExist:
                raise AuthenticationFailed('User not found')
        else:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                raise AuthenticationFailed('User not found')
                
        return (user, token)
