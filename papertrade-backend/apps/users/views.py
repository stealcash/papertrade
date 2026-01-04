from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, Permission, RolePermission
from .serializers import (
    UserSerializer, SignupSerializer, LoginSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    PermissionSerializer, RolePermissionSerializer
)
from .utils import generate_access_token, get_error_response, get_success_response


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """User signup endpoint."""
    serializer = SignupSerializer(data=request.data)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data', 
                                 serializer.errors, status_code=400)
    
    user = serializer.save()
    
    # Assign Trial Plan
    try:
        from apps.subscriptions.models import Plan, UserSubscription
        
        # Get active default plan, prioritizing recently updated ones
        default_plan = Plan.objects.filter(is_active=True, is_default=True).order_by('-id').first()
        
        if default_plan:
            UserSubscription.objects.create(
                user=user,
                plan=default_plan,
                status='active',
                end_date=timezone.now() + timezone.timedelta(days=default_plan.default_period_days)
            )
        else:
             # Fallback to 'trial' slug if no default is explicitly marked
             # Optional: remove this if strict 'is_default' is required, but safer to keep fallback.
            trial_plan = Plan.objects.filter(slug='trial').first()
            if trial_plan:
                 UserSubscription.objects.create(
                    user=user,
                    plan=trial_plan,
                    status='active',
                    end_date=timezone.now() + timezone.timedelta(days=30)
                )
    except Exception as e:
        print(f"Error assigning trial plan: {e}")
        # Non-blocking error, user is created but subscription failed
    
    token = generate_access_token(user)
    
    return get_success_response({
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'wallet_balance': str(user.wallet_balance),
        },
        'token': token
    }, status_code=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login endpoint."""
    serializer = LoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data', 
                                 serializer.errors, status_code=400)
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    
    try:
        user = User.objects.get(email=email)
        
        # Check if account is locked
        if user.is_locked():
            return get_error_response('ACCOUNT_LOCKED', 
                                    'Account is locked due to multiple failed login attempts. Try again later.',
                                    status_code=403)
        
        # Verify password
        if not user.check_password(password):
            user.increment_failed_login()
            return get_error_response('INVALID_CREDENTIALS', 'Invalid email or password', 
                                    status_code=401)
        
        # Check if user is active
        if not user.is_active:
            return get_error_response('USER_INACTIVE', 'User account is inactive', 
                                    status_code=403)
        
        # Reset failed login attempts
        user.reset_failed_login()
        
        # Generate token
        token = generate_access_token(user)
        
        return get_success_response({
            'user': UserSerializer(user).data,
            'token': token,
        }, message='Login successful')
        
    except User.DoesNotExist:
        return get_error_response('INVALID_CREDENTIALS', 'Invalid email or password', 
                                status_code=401)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get current user profile."""
    return get_success_response(UserSerializer(request.user).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user profile."""
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data', 
                                 serializer.errors, status_code=400)
    
    serializer.save()
    return get_success_response(serializer.data, message='Profile updated successfully')


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Request password reset."""
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data', 
                                 serializer.errors, status_code=400)
    
    # TODO: Implement password reset email logic
    # For now, just return success
    return get_success_response({}, message='Password reset email sent')


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Confirm password reset."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data', 
                                 serializer.errors, status_code=400)
    
    # TODO: Implement password reset confirmation logic
    return get_success_response({}, message='Password reset successful')


class PermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for Permission model."""
    
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List all permissions."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)


class RolePermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for RolePermission model."""
    
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List all role permissions."""
        role = request.query_params.get('role')
        queryset = self.get_queryset()
        
        if role:
            queryset = queryset.filter(role=role)
        
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
