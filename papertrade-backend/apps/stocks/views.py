from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.users.utils import get_success_response, get_error_response
from .models import Stock, StockCategory, StockPriceDaily, Stock5MinByDay
from .serializers import (
    StockSerializer, StockCategorySerializer, 
    StockPriceDailySerializer, Stock5MinByDaySerializer
)


def can_manage_stocks_sectors(user):
    """Check if user has permission to manage stocks and sectors."""
    from apps.adminpanel.models import AdminUser, SystemConfig
    
    if not isinstance(user, AdminUser):
        return False
    
    # Superadmin always has access
    if user.role == 'superadmin':
        return True
    
    # Admin has access if flag is set
    if user.role == 'admin':
        return user.can_manage_stocks
    
    return False


class StockCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for StockCategory model."""
    
    queryset = StockCategory.objects.all()
    serializer_class = StockCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List all stock categories."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
    
    def create(self, request):
        """Create a new stock category."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)
        
        serializer.save()
        return get_success_response(serializer.data, message='Stock category created successfully', status_code=201)
    
    def update(self, request, pk=None):
        """Update a stock category."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        try:
            category = self.get_queryset().get(pk=pk)
        except StockCategory.DoesNotExist:
            return get_error_response('CATEGORY_NOT_FOUND', 'Stock category not found', status_code=404)
        
        serializer = self.get_serializer(category, data=request.data, partial=True)
        if not serializer.is_valid():
            return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)
        
        serializer.save()
        return get_success_response(serializer.data, message='Stock category updated successfully')
    
    def destroy(self, request, pk=None):
        """Delete a stock category."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        try:
            category = self.get_queryset().get(pk=pk)
            category.delete()
            return get_success_response(None, message='Stock category deleted successfully')
        except StockCategory.DoesNotExist:
            return get_error_response('CATEGORY_NOT_FOUND', 'Stock category not found', status_code=404)


class StockViewSet(viewsets.ModelViewSet):
    """ViewSet for Stock model."""
    
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List all stocks with optional filtering."""
        queryset = self.get_queryset()
        
        # Filter by status
        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by category
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(categories__name=category)
        
        # Search by symbol or enum
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(symbol__icontains=search) | 
                models.Q(enum__icontains=search)
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get single stock details."""
        try:
            stock = self.get_queryset().get(pk=pk)
            serializer = self.get_serializer(stock)
            return get_success_response(serializer.data)
        except Stock.DoesNotExist:
            return get_error_response('STOCK_NOT_FOUND', 'Stock not found', status_code=404)
    
    def create(self, request):
        """Create a new stock."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)
        
        serializer.save()
        return get_success_response(serializer.data, message='Stock created successfully', status_code=201)
    
    def update(self, request, pk=None):
        """Update a stock."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        try:
            stock = self.get_queryset().get(pk=pk)
        except Stock.DoesNotExist:
            return get_error_response('STOCK_NOT_FOUND', 'Stock not found', status_code=404)
        
        serializer = self.get_serializer(stock, data=request.data, partial=True)
        if not serializer.is_valid():
            return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)
        
        serializer.save()
        return get_success_response(serializer.data, message='Stock updated successfully')
    
    def destroy(self, request, pk=None):
        """Delete a stock."""
        if not can_manage_stocks_sectors(request.user):
            return get_error_response('FORBIDDEN', 'Admin access required', status_code=403)
        
        try:
            stock = self.get_queryset().get(pk=pk)
            stock.delete()
            return get_success_response(None, message='Stock deleted successfully')
        except Stock.DoesNotExist:
            return get_error_response('STOCK_NOT_FOUND', 'Stock not found', status_code=404)


class StockPriceDailyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for StockPriceDaily model (read-only)."""
    
    queryset = StockPriceDaily.objects.all()
    serializer_class = StockPriceDailySerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List stock prices with filtering."""
        queryset = self.get_queryset()
        
        # Filter by stocks (comma-separated IDs)
        stock_ids = request.query_params.get('stock_ids')
        if stock_ids:
            ids = [id.strip() for id in stock_ids.split(',') if id.strip()]
            if ids:
                queryset = queryset.filter(stock_id__in=ids)
        
        # Backward compatibility for single stock_id
        elif request.query_params.get('stock_id'):
            queryset = queryset.filter(stock_id=request.query_params.get('stock_id'))
        
        # Filter by sectors (comma-separated ids)
        sector_ids = request.query_params.get('sector_ids')
        if sector_ids:
            ids = [id.strip() for id in sector_ids.split(',') if id.strip()]
            if ids:
                queryset = queryset.filter(stock__sectors__id__in=ids)
        
        # Backward compatibility for single sector_id
        elif request.query_params.get('sector_id'):
            queryset = queryset.filter(stock__sectors__id=request.query_params.get('sector_id'))
            
        # Filter by categories (comma-separated ids)
        category_ids = request.query_params.get('category_ids')
        if category_ids:
            ids = [id.strip() for id in category_ids.split(',') if id.strip()]
            if ids:
                queryset = queryset.filter(stock__categories__id__in=ids)

        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)


class Stock5MinByDayViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Stock5MinByDay model (read-only)."""
    
    queryset = Stock5MinByDay.objects.all()
    serializer_class = Stock5MinByDaySerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List 5-minute candle data."""
        queryset = self.get_queryset()
        
        # Filter by stock
        stock_id = request.query_params.get('stock_id')
        if stock_id:
            queryset = queryset.filter(stock_id=stock_id)
        
        # Filter by date
        date = request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
