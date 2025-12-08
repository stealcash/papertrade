from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.users.utils import get_success_response, get_error_response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    def list(self, request):
        queryset = self.get_queryset()
        
        # Filter by read status
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
    
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
