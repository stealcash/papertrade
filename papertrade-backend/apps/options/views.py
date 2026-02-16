from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Min, Max
from django.db.models.functions import ExtractYear

from .models import OptionDailyData
from .serializers import OptionDailyDataSerializer
from apps.stocks.models import Stock

class OptionViewSet(viewsets.GenericViewSet):
    """
    ViewSet for retrieving option chain data.
    """
    queryset = OptionDailyData.objects.all()
    serializer_class = OptionDailyDataSerializer
    permission_classes = [AllowAny] 
    
    @action(detail=False, methods=['get'])
    def instruments(self, request):
        """List all enabled instruments (indices and stocks) for options."""
        instruments = Stock.objects.filter(is_option_enable=True).values(
            'symbol', 'name', 'option_symbol', 'is_index'
        ).order_by('is_index', 'symbol')
        return Response({'data': list(instruments)})
        
    @action(detail=False, methods=['get'])
    def indices(self, request):
        """Deprecated: use /instruments/ instead."""
        return self.instruments(request)

    @action(detail=False, methods=['get'])
    def years(self, request):
        """List available years for a symbol."""
        symbol = request.query_params.get('symbol')
        if not symbol:
            return Response({'error': 'Symbol required'}, status=400)
            
        # Get active years from data
        # Mapping frontend symbol to option_symbol logic if needed, 
        # but here we assume symbol passed matches underlying_symbol in OptionDailyData
        # Or look up Stock first
        
        # Try to find option_symbol from Stock if passed symbol
        stock = Stock.objects.filter(symbol=symbol).first()
        query_symbol = symbol
        if stock and stock.option_symbol:
            query_symbol = stock.option_symbol
            
        years = OptionDailyData.objects.filter(underlying_symbol=query_symbol) \
            .annotate(year=ExtractYear('expiry_date')) \
            .values_list('year', flat=True) \
            .distinct() \
            .order_by('year')
            
        return Response({'data': list(years)})

    @action(detail=False, methods=['get'])
    def expiries(self, request):
        """List expiry dates for a symbol and year."""
        symbol = request.query_params.get('symbol')
        year = request.query_params.get('year')
        
        if not symbol or not year:
            return Response({'error': 'Symbol and Year required'}, status=400)
            
        stock = Stock.objects.filter(symbol=symbol).first()
        query_symbol = symbol
        if stock and stock.option_symbol:
            query_symbol = stock.option_symbol
            
        expiries = OptionDailyData.objects.filter(
            underlying_symbol=query_symbol,
            expiry_date__year=year
        ).values_list('expiry_date', flat=True).distinct().order_by('expiry_date')
        
        return Response({'data': list(expiries)})
        
    @action(detail=False, methods=['get'])
    def chain(self, request):
        """Get option chain data."""
        symbol = request.query_params.get('symbol')
        expiry = request.query_params.get('expiry') # YYYY-MM-DD
        option_type = request.query_params.get('type') # CE or PE
        
        if not all([symbol, expiry]):
             return Response({'error': 'Symbol and Expiry required'}, status=400)

        stock = Stock.objects.filter(symbol=symbol).first()
        query_symbol = symbol
        if stock and stock.option_symbol:
            query_symbol = stock.option_symbol

        # Query
        queryset = OptionDailyData.objects.filter(
            underlying_symbol=query_symbol,
            expiry_date=expiry
        )

        if option_type and option_type.upper() != 'BOTH':
            queryset = queryset.filter(option_type=option_type)
        
        # Optional: Filter by record date (latest available or specific date)
        # For now, return all history for that expiry? Or just latest?
        # User requirement: "then price range option" - maybe implied seeing strikes?
        # Usually user wants to see data 'as of' a specific date. 
        
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        date_param = request.query_params.get('date')
        
        if from_date and to_date:
            queryset = queryset.filter(date__range=[from_date, to_date])
        elif date_param:
            queryset = queryset.filter(date=date_param)
        else:
            # If no date provided, return latest date available for this expiry
            # But if user wants "history", they should provide range. 
            # Default behavior: Latest snapshot
            latest_date = queryset.aggregate(max_date=Max('date'))['max_date']
            if latest_date:
                queryset = queryset.filter(date=latest_date)
            else:
                return Response({'data': []})
        
        # Determine available dates for this specific expiry/symbol combination for frontend dropdown?
        # Maybe handle that separately.
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'data': serializer.data,
            'date': queryset.first().date if queryset.exists() else None
        })
    
    @action(detail=False, methods=['get'])
    def dates(self, request):
        """Get available trading dates for a specific expiry to populate date dropdown."""
        symbol = request.query_params.get('symbol')
        expiry = request.query_params.get('expiry')
        
        if not symbol or not expiry:
             return Response({'error': 'Symbol and Expiry required'}, status=400)
             
        stock = Stock.objects.filter(symbol=symbol).first()
        query_symbol = symbol
        if stock and stock.option_symbol:
            query_symbol = stock.option_symbol
            
        dates = OptionDailyData.objects.filter(
            underlying_symbol=query_symbol,
            expiry_date=expiry
        ).values_list('date', flat=True).distinct().order_by('-date')
        
        return Response({'data': list(dates)})

    @action(detail=False, methods=['get'], url_path='latest-info')
    def latest_info(self, request):
        """Get the latest available year, expiry, and date for a symbol.
        This allows the frontend to auto-set all cascading filters at once."""
        symbol = request.query_params.get('symbol')
        if not symbol:
            return Response({'error': 'Symbol required'}, status=400)

        stock = Stock.objects.filter(symbol=symbol).first()
        query_symbol = symbol
        if stock and stock.option_symbol:
            query_symbol = stock.option_symbol

        # Find the record with the most recent date for this symbol
        latest_record = OptionDailyData.objects.filter(
            underlying_symbol=query_symbol
        ).order_by('-date', '-expiry_date').values('date', 'expiry_date').first()

        if not latest_record:
            return Response({'data': None})

        latest_date = latest_record['date']
        latest_expiry = latest_record['expiry_date']
        latest_year = latest_expiry.year if latest_expiry else latest_date.year

        return Response({'data': {
            'year': latest_year,
            'expiry': str(latest_expiry),
            'date': str(latest_date),
        }})
