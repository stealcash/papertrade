from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import AdminUser, SystemConfig
from .serializers import AdminLoginSerializer, AdminUserSerializer
from apps.users.utils import generate_access_token, get_error_response, get_success_response
from apps.users.models import User
from apps.users.serializers import UserSerializer


def can_manage_config(user):
    """Check if user has permission to manage system configuration."""
    if not isinstance(user, AdminUser):
        return False
    
    # Superadmin always has access
    if user.role == 'superadmin':
        return True
    
    # Admin has access if config allows
    if user.role == 'admin':
        try:
            config = SystemConfig.objects.get(key='ADMIN_CAN_MANAGE_CONFIG')
            return config.value.lower() == 'true'
        except SystemConfig.DoesNotExist:
            return False
    
    return False

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    """Admin login endpoint."""
    serializer = AdminLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data', 
                                 serializer.errors, status_code=400)
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    
    try:
        user = AdminUser.objects.get(email=email)
        
        if not user.check_password(password):
            return get_error_response('INVALID_CREDENTIALS', 'Invalid email or password', 
                                    status_code=401)
        
        if not user.is_active:
            return get_error_response('USER_INACTIVE', 'Account is inactive', 
                                    status_code=403)
        
        # Update last login
        user.last_login = timezone.now()
        user.save()
        
        token = generate_access_token(user)
        
        return get_success_response({
            'user': AdminUserSerializer(user).data,
            'token': token,
        }, message='Login successful')
        
    except AdminUser.DoesNotExist:
        return get_error_response('INVALID_CREDENTIALS', 'Invalid email or password', 
                                status_code=401)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_profile(request):
    """Get current admin profile."""
    if not isinstance(request.user, AdminUser):
        return get_error_response('FORBIDDEN', 'Access denied', status_code=403)
        
    return get_success_response(AdminUserSerializer(request.user).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all users (admin/superadmin only) with pagination."""
    if not isinstance(request.user, AdminUser):
        return get_error_response('FORBIDDEN', 'Access denied', status_code=403)
    
    # Get query params
    page = request.query_params.get('page', 1)
    page_size = request.query_params.get('page_size', 10)
    sort_by = request.query_params.get('sort_by', 'created_at')
    order = request.query_params.get('order', 'desc')
    
    # Sorting validation
    allowed_sort_fields = ['email', 'role', 'is_active', 'wallet_balance', 'created_at']
    if sort_by not in allowed_sort_fields:
        sort_by = 'created_at'
        
    order_prefix = '-' if order == 'desc' else ''
    
    users = User.objects.all().order_by(f'{order_prefix}{sort_by}')
    
    # Pagination
    from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
    paginator = Paginator(users, page_size)
    
    try:
        users_page = paginator.page(page)
    except PageNotAnInteger:
        users_page = paginator.page(1)
    except EmptyPage:
        users_page = paginator.page(paginator.num_pages)
        
    serializer = UserSerializer(users_page, many=True)
    
    return get_success_response({
        'users': serializer.data,
        'pagination': {
            'total_count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': users_page.number,
            'page_size': int(page_size)
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_configs(request):
    """List all system configurations."""
    if not can_manage_config(request.user):
        return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
    
    configs = SystemConfig.objects.all()
    data = [{'key': c.key, 'value': c.value, 'description': c.description} for c in configs]
    return get_success_response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_config(request):
    """Create a new system configuration."""
    if not can_manage_config(request.user):
        return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
    
    key = request.data.get('key')
    value = request.data.get('value')
    description = request.data.get('description', '')
    is_public = request.data.get('is_public', False)
    
    if not key or not value:
        return get_error_response('VALIDATION_ERROR', 'Key and value are required', status_code=400)
    
    if SystemConfig.objects.filter(key=key).exists():
        return get_error_response('ALREADY_EXISTS', 'Configuration with this key already exists', status_code=400)
    
    config = SystemConfig.objects.create(
        key=key,
        value=value,
        description=description,
        is_public=is_public
    )
    return get_success_response({'key': config.key, 'value': config.value}, 
                                message='Configuration created successfully')

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_config(request, key):
    """Update a system configuration."""
    if not can_manage_config(request.user):
        return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
    
    try:
        config = SystemConfig.objects.get(key=key)
        value = request.data.get('value')
        if value is None:
            return get_error_response('VALIDATION_ERROR', 'Value is required', status_code=400)
        
        config.value = value
        if 'description' in request.data:
            config.description = request.data['description']
        config.save()
        return get_success_response({'key': config.key, 'value': config.value}, 
                                    message='Configuration updated successfully')
    except SystemConfig.DoesNotExist:
        return get_error_response('NOT_FOUND', 'Configuration not found', status_code=404)
    except Exception as e:
        return get_error_response('SERVER_ERROR', str(e), status_code=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_config(request, key):
    """Delete a system configuration."""
    if not can_manage_config(request.user):
        return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
    
    try:
        config = SystemConfig.objects.get(key=key)
        config.delete()
        return get_success_response(None, message='Configuration deleted successfully')
    except SystemConfig.DoesNotExist:
        return get_error_response('NOT_FOUND', 'Configuration not found', status_code=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_admin(request):
    """Create a new admin user (superadmin only)."""
    if not isinstance(request.user, AdminUser) or request.user.role != 'superadmin':
        return get_error_response('FORBIDDEN', 'Superadmin access required', status_code=403)
    
    email = request.data.get('email')
    password = request.data.get('password')
    name = request.data.get('name', '')
    role = request.data.get('role', 'admin')
    can_manage_stocks = request.data.get('can_manage_stocks', False)
    
    if not email or not password:
        return get_error_response('VALIDATION_ERROR', 'Email and password are required', status_code=400)
    
    if role not in ['admin', 'superadmin']:
        return get_error_response('VALIDATION_ERROR', 'Invalid role. Must be admin or superadmin', status_code=400)
    
    if AdminUser.objects.filter(email=email).exists():
        return get_error_response('ALREADY_EXISTS', 'Admin user with this email already exists', status_code=400)
    
    admin = AdminUser.objects.create(
        email=email,
        name=name,
        role=role,
        is_active=True,
        can_manage_stocks=can_manage_stocks
    )
    admin.set_password(password)
    admin.save()
    
    return get_success_response(AdminUserSerializer(admin).data, 
                                message='Admin user created successfully')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_admins(request):
    """List all admin users (superadmin only)."""
    if not isinstance(request.user, AdminUser) or request.user.role != 'superadmin':
        return get_error_response('FORBIDDEN', 'Superadmin access required', status_code=403)
    
    # Get query params
    page = request.query_params.get('page', 1)
    page_size = request.query_params.get('page_size', 10)
    sort_by = request.query_params.get('sort_by', 'created_at')
    order = request.query_params.get('order', 'desc')
    
    # Sorting validation
    allowed_sort_fields = ['name', 'email', 'role', 'is_active', 'last_login', 'created_at']
    if sort_by not in allowed_sort_fields:
        sort_by = 'created_at'
        
    order_prefix = '-' if order == 'desc' else ''
    
    admins = AdminUser.objects.all().order_by(f'{order_prefix}{sort_by}')
    
    # Pagination
    from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
    paginator = Paginator(admins, page_size)
    
    try:
        admins_page = paginator.page(page)
    except PageNotAnInteger:
        admins_page = paginator.page(1)
    except EmptyPage:
        admins_page = paginator.page(paginator.num_pages)
        
    return get_success_response({
        'admins': AdminUserSerializer(admins_page, many=True).data,
        'pagination': {
            'total_count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': admins_page.number,
            'page_size': int(page_size)
        }
    })

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def update_admin(request, admin_id):
    """Get or update an admin user (superadmin only)."""
    if not isinstance(request.user, AdminUser) or request.user.role != 'superadmin':
        return get_error_response('FORBIDDEN', 'Superadmin access required', status_code=403)
    
    try:
        admin = AdminUser.objects.get(id=admin_id)
    except AdminUser.DoesNotExist:
        return get_error_response('NOT_FOUND', 'Admin user not found', status_code=404)

    if request.method == 'GET':
        return get_success_response(AdminUserSerializer(admin).data)
        
    # Prevent modifying self role/status to avoid lockout
    if admin.id == request.user.id:
        if 'role' in request.data and request.data['role'] != admin.role:
             return get_error_response('FORBIDDEN', 'Cannot change your own role', status_code=403)
        if 'is_active' in request.data and not request.data['is_active']:
             return get_error_response('FORBIDDEN', 'Cannot deactivate your own account', status_code=403)

    serializer = AdminUserSerializer(admin, data=request.data, partial=True)
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)
        
    serializer.save()
    return get_success_response(serializer.data, message='Admin updated successfully')

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_admin(request, admin_id):
    """Delete an admin user (superadmin only)."""
    if not isinstance(request.user, AdminUser) or request.user.role != 'superadmin':
        return get_error_response('FORBIDDEN', 'Superadmin access required', status_code=403)
    
    try:
        admin = AdminUser.objects.get(id=admin_id)
    except AdminUser.DoesNotExist:
        return get_error_response('NOT_FOUND', 'Admin user not found', status_code=404)
        
    if admin.id == request.user.id:
        return get_error_response('FORBIDDEN', 'Cannot delete your own account', status_code=403)
        
    admin.delete()
    return get_success_response(None, message='Admin deleted successfully')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_user_status(request, user_id):
    """Toggle active status of a regular user."""
    if not isinstance(request.user, AdminUser):
        return get_error_response('FORBIDDEN', 'Access denied', status_code=403)
        
    try:
        user = User.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save()
        
        status_msg = 'activated' if user.is_active else 'deactivated'
        return get_success_response(
            UserSerializer(user).data, 
            message=f'User {status_msg} successfully'
        )
    except User.DoesNotExist:
        return get_error_response('NOT_FOUND', 'User not found', status_code=404)
from apps.stocks.models import Stock
from apps.sectors.models import Sector
from apps.backtests.models import BacktestRun

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics."""
    if not isinstance(request.user, AdminUser):
        return get_error_response('FORBIDDEN', 'Access denied', status_code=403)
        
    stats = {
        'total_users': User.objects.count(),
        'total_stocks': Stock.objects.count(),
        'total_sectors': Sector.objects.count(),
        'total_backtests': BacktestRun.objects.count(),
    }
    
    return get_success_response(stats)

from django.db import connection

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tables(request):
    """List all public tables (Superadmin only)."""
    if not isinstance(request.user, AdminUser) or request.user.role != 'superadmin':
        return get_error_response('FORBIDDEN', 'Superadmin access required', status_code=403)

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
        return get_success_response({'tables': tables})
    except Exception as e:
        return get_error_response('SERVER_ERROR', str(e), status_code=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_table_schema(request, table_name):
    """Get schema for a specific table (Superadmin only)."""
    if not isinstance(request.user, AdminUser) or request.user.role != 'superadmin':
        return get_error_response('FORBIDDEN', 'Superadmin access required', status_code=403)

    try:
        with connection.cursor() as cursor:
            # check if table exists
            cursor.execute("""
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = %s
            """, [table_name])
            if not cursor.fetchone():
                return get_error_response('NOT_FOUND', f'Table {table_name} not found', status_code=404)

            # fetch columns
            cursor.execute("""
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable, 
                    column_default,
                    character_maximum_length
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position;
            """, [table_name])
            
            columns = []
            for row in cursor.fetchall():
                columns.append({
                    'name': row[0],
                    'type': row[1],
                    'nullable': row[2] == 'YES',
                    'default': row[3],
                    'max_length': row[4]
                })

            # Fetch Foreign Keys
            cursor.execute("""
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM 
                    information_schema.key_column_usage AS kcu
                JOIN 
                    information_schema.constraint_column_usage AS ccu
                    ON kcu.constraint_name = ccu.constraint_name
                    AND kcu.table_schema = ccu.table_schema
                WHERE 
                    kcu.table_schema = 'public'
                    AND kcu.table_name = %s
                    AND kcu.constraint_name IN (
                        SELECT constraint_name 
                        FROM information_schema.table_constraints 
                        WHERE constraint_type = 'FOREIGN KEY'
                    );
            """, [table_name])

            foreign_keys = []
            for row in cursor.fetchall():
                foreign_keys.append({
                    'column': row[0],
                    'foreign_table': row[1],
                    'foreign_column': row[2]
                })

        return get_success_response({
            'table': table_name, 
            'columns': columns,
            'foreign_keys': foreign_keys
        })
    except Exception as e:
        return get_error_response('SERVER_ERROR', str(e), status_code=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_query(request):
    """Execute raw SQL query (Superadmin only)."""
    if not isinstance(request.user, AdminUser) or request.user.role != 'superadmin':
        return get_error_response('FORBIDDEN', 'Superadmin access required', status_code=403)

    query = request.data.get('query')
    if not query:
        return get_error_response('VALIDATION_ERROR', 'Query is required', status_code=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute(query)
            
            # For SELECT queries, fetch results
            if cursor.description:
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                return get_success_response({
                    'columns': columns,
                    'rows': rows,
                    'row_count': len(rows)
                })
            else:
                # For INSERT, UPDATE, DELETE, etc.
                return get_success_response({
                    'message': 'Query executed successfully',
                    'row_count': cursor.rowcount
                })
                
    except Exception as e:
        return get_error_response('DB_ERROR', str(e), status_code=400)
