from rest_framework import serializers
from .models import Stock, StockCategory, StockPriceDaily, Stock5MinByDay


class StockCategorySerializer(serializers.ModelSerializer):
    """Serializer for StockCategory model."""
    
    class Meta:
        model = StockCategory
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockSerializer(serializers.ModelSerializer):
    """Serializer for Stock model."""
    
    categories_details = StockCategorySerializer(source='categories', many=True, read_only=True)
    last_price = serializers.SerializerMethodField()
    is_in_watchlist = serializers.SerializerMethodField()
    last_sync_at = serializers.DateTimeField(source='last_synced_at', read_only=True)
    active_signals = serializers.SerializerMethodField()
    
    class Meta:
        model = Stock
        fields = ['id', 'symbol', 'name', 'exchange_suffix', 
                 'categories', 'categories_details', 'sectors', 'status', 
                 'last_synced_at', 'last_sync_at', 'last_price', 'is_in_watchlist',
                 'active_signals',
                 'extra', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_price(self, obj):
        # Fetch latest price from related daily_prices
        # Optimization: This causes N+1 if not prefetched. 
        # Ideally, should be annotated in ViewSet. 
        # For now, simplistic approach:
        latest_price = obj.daily_prices.order_by('-date').first()
        return latest_price.close_price if latest_price else None

    def get_is_in_watchlist(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                # Check safely, again beware N+1
                return obj.watched_by.filter(user=request.user).exists()
            except ValueError:
                # Occurs if request.user is not a User instance (e.g. AdminUser)
                return False
        return False

    def get_active_signals(self, obj):
        from apps.strategies.models import StrategySignal
        from apps.strategies.serializers import StrategySignalSerializer
        from django.utils import timezone
        
        # Fetch signals for today and future
        today = timezone.now().date()
        signals = StrategySignal.objects.filter(stock=obj, date__gte=today).order_by('date')
        return StrategySignalSerializer(signals, many=True).data


class StockPriceDailySerializer(serializers.ModelSerializer):
    """Serializer for StockPriceDaily model."""
    
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    
    class Meta:
        model = StockPriceDaily
        fields = ['id', 'stock', 'stock_symbol', 'date', 'open_price', 'high_price', 
                 'low_price', 'close_price', 'volume', 'iv', 'timewise_json', 
                 'extra', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class Stock5MinByDaySerializer(serializers.ModelSerializer):
    """Serializer for Stock5MinByDay model."""
    
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    
    class Meta:
        model = Stock5MinByDay
        fields = ['id', 'stock', 'stock_symbol', 'date', 'candles_json', 
                 'extra', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
