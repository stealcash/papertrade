from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from apps.users.utils import get_success_response, get_error_response
from .models import Notification, BroadcastNotification
from .serializers import NotificationSerializer, BroadcastNotificationSerializer


class IsSystemAdmin(BasePermission):
    """
    Custom permission to only allow access to AdminUser.
    """
    def has_permission(self, request, view):
        # Check if user has 'role' attribute (AdminUser has it, regular User doesn't usually or handled differently)
        # and if that role is admin/superadmin.
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Check for AdminUser specific logic
        if hasattr(request.user, 'role') and request.user.role in ['admin', 'superadmin']:
            return True
            
        return False



class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    def list(self, request):
        # 30-day retention filter
        cutoff_date = timezone.now() - timedelta(days=30)
        
        # 1. Personal Notifications
        personal_qs = self.get_queryset().filter(created_at__gte=cutoff_date)
        
        # Filter by read status
        is_read_param = request.query_params.get('is_read')
        if is_read_param is not None:
            is_read_bool = is_read_param.lower() == 'true'
            personal_qs = personal_qs.filter(is_read=is_read_bool)
        
        # 2. Broadcast Notifications
        broadcasts = []
        # If filtering by "Read=True", skip broadcasts (as they are technically unread/system-wide)
        # If filtering by "Read=False" or no filter, include them.
        if is_read_param is None or is_read_param.lower() == 'false':
            b_qs = BroadcastNotification.objects.filter(created_at__gte=cutoff_date)
            
            # Filter by Plan
            try:
                # Check if user has subscription
                if hasattr(request.user, 'subscription'):
                    user_plan = request.user.subscription.plan
                    b_qs = b_qs.filter(
                        Q(target_audience='all') | 
                        Q(target_audience='plan', target_plan=user_plan)
                    )
                else:
                    b_qs = b_qs.filter(target_audience='all')
            except Exception:
                # Fallback
                b_qs = b_qs.filter(target_audience='all')
                
            broadcasts = list(b_qs)

        # Merge and Sort (Desc)
        combined = sorted(list(personal_qs) + broadcasts, key=lambda x: x.created_at, reverse=True)
        
        results = []
        for item in combined:
            if isinstance(item, Notification):
                data = NotificationSerializer(item).data
                data['source'] = 'personal'
            else:
                data = BroadcastNotificationSerializer(item).data
                data['source'] = 'broadcast'
                data['is_read'] = False  # Broadcasts are effectively stateless/unread
            results.append(data)
            
        return get_success_response(results)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read."""
        try:
            notification = self.get_queryset().get(pk=pk)
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save()
            
            return get_success_response(
                NotificationSerializer(notification).data,
                message='Notification marked as read'
            )
        except Notification.DoesNotExist:
            return get_error_response('NOTIFICATION_NOT_FOUND', 'Notification not found', status_code=404)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return get_success_response({}, message='All notifications marked as read')


class BroadcastNotificationViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing broadcasts."""
    queryset = BroadcastNotification.objects.all()
    serializer_class = BroadcastNotificationSerializer
    permission_classes = [IsSystemAdmin]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
