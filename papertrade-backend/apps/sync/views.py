from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import datetime
import os
import json

from apps.users.utils import get_success_response, get_error_response
from apps.adminpanel.models import SystemConfig
from .models import SyncLog
from .serializers import SyncLogSerializer


class SyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SyncLog.objects.all()
    serializer_class = SyncLogSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(get_success_response(serializer.data))


class MarketStatusViewSet(viewsets.ViewSet):
    """
    Market Open/Closed Status (File-Based).
    Source: fixtures/market_holidays/{year}.json
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        year = request.query_params.get('year', datetime.now().year)
        try:
            year = int(year)
        except ValueError:
            year = datetime.now().year
            
        from apps.common.market_schedule import MarketSchedule
        holidays_map = MarketSchedule.get_holidays_for_year(year)
        
        # Convert {date: reasoning} -> List of objects for frontend consistency
        data = []
        for date_str, reason in holidays_map.items():
            # Format YYYYMMDD -> YYYY-MM-DD
            formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
            data.append({
                'date': formatted_date,
                'is_market_open': False,
                'reason': reason
            })
            
        # Sort by date
        data.sort(key=lambda x: x['date'])
        
        return Response(get_success_response(data))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_normal_sync(request):
    """
    Trigger NORMAL sync - uses last_synced_at timestamps.
    
    Body:
    {
        "sync_type": "stock" | "sector" | "option"
    }
    """
    from .tasks import sync_stocks_task
    
    # Check permissions
    allowed_roles_config = SystemConfig.objects.filter(key='sync.allowed_roles').first()
    allowed_roles = allowed_roles_config.value.split(',') if allowed_roles_config else ['admin', 'superadmin']
    
    if request.user.role not in allowed_roles:
        return get_error_response(
            code='PERMISSION_DENIED',
            message='You do not have permission to trigger sync',
            details={'allowed_roles': allowed_roles},
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    sync_type = request.data.get('sync_type', 'stock')
    
    # Trigger appropriate sync task
    run_sync = request.data.get('run_sync', False)

    if sync_type == 'stock':
        if run_sync:
             task = sync_stocks_task.apply(kwargs={'is_auto': False, 'user_id': request.user.id, 'sync_indices': False})
        else:
             task = sync_stocks_task.delay(is_auto=False, user_id=request.user.id, sync_indices=False)
    elif sync_type == 'sector':
        if run_sync:
             task = sync_stocks_task.apply(kwargs={'is_auto': False, 'user_id': request.user.id, 'sync_indices': True})
        else:
             task = sync_stocks_task.delay(is_auto=False, user_id=request.user.id, sync_indices=True)
    elif sync_type == 'option':
        # Option sync not implemented yet
        return get_error_response(
            code='NOT_IMPLEMENTED',
            message='Option sync is not implemented yet',
            status_code=status.HTTP_501_NOT_IMPLEMENTED
        )
    else:
        return get_error_response(
            code='INVALID_SYNC_TYPE',
            message='sync_type must be stock, sector, or option',
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    return get_success_response({
            'task_id': task.id,
            'sync_type': sync_type,
            'mode': 'normal',
            'message': 'Normal sync triggered successfully'
        },
        status_code=status.HTTP_202_ACCEPTED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_hard_sync(request):
    """
    Trigger HARD sync - uses specific date range + instrument selection.
    
    Body:
    {
        "sync_type": "stock" | "sector" | "option",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "instruments": ["RELIANCE", "TCS", "INFY"]  // optional, all if not provided
    }
    """
    from .tasks import sync_hard_task
    
    # Check if user is allowed to trigger hard sync
    if request.user.role == 'admin':
        can_hard_sync_config = SystemConfig.objects.filter(key='admin.can_trigger_hard_sync').first()
        can_hard_sync = can_hard_sync_config.value.lower() == 'true' if can_hard_sync_config else False
        
        if not can_hard_sync:
            return get_error_response(
                code='PERMISSION_DENIED',
                message='Only superadmins can trigger hard sync',
                status_code=status.HTTP_403_FORBIDDEN
            )
    elif request.user.role not in ['admin', 'superadmin']:
        return get_error_response(
            code='PERMISSION_DENIED',
            message='Only admins and superadmins can trigger hard sync',
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Validate request data
    from django.conf import settings
    print(f"DTO-DEBUG API: Broker URL: {settings.CELERY_BROKER_URL}")
    print(f"DTO-DEBUG API: Redis Backend: {settings.CELERY_RESULT_BACKEND}")
    if hasattr(settings, 'CELERY_BROKER_USE_SSL'):
        print(f"DTO-DEBUG API: SSL Config: {settings.CELERY_BROKER_USE_SSL}")

    sync_type = request.data.get('sync_type')
    start_date_str = request.data.get('start_date')
    end_date_str = request.data.get('end_date')
    instruments = request.data.get('instruments', [])
    
    if not all([sync_type, start_date_str, end_date_str]):
        return get_error_response(
            code='MISSING_PARAMETERS',
            message='sync_type, start_date, and end_date are required',
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate dates
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        if start_date > end_date:
            raise ValueError("start_date cannot be after end_date")
    except ValueError as e:
        return get_error_response(
            code='INVALID_DATE',
            message=str(e),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Trigger hard sync task
    # Run sync task
    run_sync = request.data.get('run_sync', False)
    
    if run_sync:
        # Run synchronously (bypass Celery AND Dispatcher Queue)
        from .tasks import sync_stocks_task
        
        if sync_type == 'stock':
             task = sync_stocks_task.apply(kwargs={
                'is_auto': False,
                'user_id': request.user.id,
                'from_date': start_date_str,
                'to_date': end_date_str,
                'instruments': instruments,
                'sync_indices': False
             })
        elif sync_type == 'sector':
             task = sync_stocks_task.apply(kwargs={
                'is_auto': False,
                'user_id': request.user.id,
                'from_date': start_date_str,
                'to_date': end_date_str,
                'instruments': None, # Sectors hard sync usually all
                'sync_indices': True
             })
        else:
             # Fallback/Option not supported yet in sync mode or handled above already
             pass
    else:
        # Run asynchronously (Celery)
        task = sync_hard_task.delay(
            sync_type=sync_type,
            start_date=start_date_str,
            end_date=end_date_str,
            instruments=instruments,
            user_id=request.user.id
        )
    
    return get_success_response({
            'task_id': task.id,
            'sync_type': sync_type,
            'mode': 'hard',
            'start_date': start_date_str,
            'end_date': end_date_str,
            'instruments_count': len(instruments) if instruments else 'all',
            'message': 'Hard sync triggered successfully'
        },
        status_code=status.HTTP_202_ACCEPTED
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_external_logs(request):
    """List available external API logs."""
    # Check permissions (Superadmin only for logs)
    if request.user.role != 'superadmin':
         return get_error_response(
            code='PERMISSION_DENIED',
            message='Only superadmins can view system logs',
            status_code=status.HTTP_403_FORBIDDEN
        )
        
    try:
        from .utils import ExternalAPILogger
        logger_util = ExternalAPILogger()
        
        logs = []
        if os.path.exists(logger_util.log_dir):
            for filename in os.listdir(logger_util.log_dir):
                if filename.endswith('.log'):
                    file_path = logger_util.log_dir / filename
                    stats = os.stat(file_path)
                    logs.append({
                        'filename': filename,
                        'size_bytes': stats.st_size,
                        'modified_at': datetime.fromtimestamp(stats.st_mtime).isoformat()
                    })
        
        # Sort by filename desc (newest date first)
        logs.sort(key=lambda x: x['filename'], reverse=True)
        
        return get_success_response(logs)
        
    except Exception as e:
        return get_error_response(
            code='INTERNAL_ERROR',
            message=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_external_log(request, filename):
    """Get content of a specific log file."""
    # Check permissions
    if request.user.role != 'superadmin':
         return get_error_response(
            code='PERMISSION_DENIED',
            message='Only superadmins can view system logs',
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from .utils import ExternalAPILogger
        logger_util = ExternalAPILogger()
        
        # Security check: filename must be plain and end with .log
        if '/' in filename or '\\' in filename or not filename.endswith('.log'):
             return get_error_response(
                code='INVALID_FILENAME',
                message='Invalid filename',
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
        file_path = logger_util.log_dir / filename
        if not os.path.exists(file_path):
             return get_error_response(
                code='NOT_FOUND',
                message='Log file not found',
                status_code=status.HTTP_404_NOT_FOUND
            )
            
        lines = []
        with open(file_path, 'r') as f:
            for line in f:
                try:
                    lines.append(json.loads(line))
                except:
                    lines.append({'raw': line.strip()})
        
        return get_success_response({
            'filename': filename,
            'lines': lines
        })
        
    except Exception as e:
        return get_error_response(
            code='INTERNAL_ERROR',
            message=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
