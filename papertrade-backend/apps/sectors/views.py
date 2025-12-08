from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.users.utils import get_success_response, get_error_response
from apps.stocks.views import can_manage_stocks_sectors
from .models import Sector, SectorPriceDaily
from .serializers import SectorSerializer, SectorPriceDailySerializer


class SectorViewSet(viewsets.ModelViewSet):
    queryset = Sector.objects.all()
    serializer_class = SectorSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
    
    def create(self, request):
        """Create a new sector."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)
        
        serializer.save()
        return get_success_response(serializer.data, message='Sector created successfully', status_code=201)
    
    def update(self, request, pk=None):
        """Update a sector."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        try:
            sector = self.get_queryset().get(pk=pk)
        except Sector.DoesNotExist:
            return get_error_response('SECTOR_NOT_FOUND', 'Sector not found', status_code=404)
        
        serializer = self.get_serializer(sector, data=request.data, partial=True)
        if not serializer.is_valid():
            return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)
        
        serializer.save()
        return get_success_response(serializer.data, message='Sector updated successfully')
    
    def destroy(self, request, pk=None):
        """Delete a sector."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        try:
            sector = self.get_queryset().get(pk=pk)
            sector.delete()
            return get_success_response(None, message='Sector deleted successfully')
        except Sector.DoesNotExist:
            return get_error_response('SECTOR_NOT_FOUND', 'Sector not found', status_code=404)


class SectorPriceDailyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SectorPriceDaily.objects.all()
    serializer_class = SectorPriceDailySerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        queryset = self.get_queryset()
        sector_id = request.query_params.get('sector_id')
        if sector_id:
            queryset = queryset.filter(sector_id=sector_id)
        
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
