from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import StockPrediction
from .serializers import StockPredictionSerializer

class StockPredictionViewSet(viewsets.ModelViewSet):
    serializer_class = StockPredictionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = StockPrediction.objects.filter(user=self.request.user)
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date and end_date:
             from datetime import datetime, timedelta
             try:
                 start = datetime.strptime(start_date, '%Y-%m-%d').date()
                 end = datetime.strptime(end_date, '%Y-%m-%d').date()
                 
                 if (end - start).days > 7:
                     from rest_framework.exceptions import ValidationError
                     raise ValidationError({"date_range": "Date range cannot exceed 7 days."})
             except ValueError:
                 pass # Let generic filter logic handle invalid dates or ignore
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
            
        return queryset
    
    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        """Delete all predictions for the current user."""
        count, _ = self.get_queryset().delete()
        return Response({'message': f'Deleted {count} predictions'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def delete_batch(self, request):
        """Delete specific predictions by ID list."""
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Ensure we only delete predictions owned by the user
        count, _ = self.get_queryset().filter(id__in=ids).delete()
        return Response({'message': f'Deleted {count} predictions'}, status=status.HTTP_200_OK)
