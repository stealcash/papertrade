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
    
    class Meta:
        model = Stock
        fields = ['id', 'symbol', 'name', 'exchange_suffix', 
                 'categories', 'categories_details', 'sectors', 'status', 'last_synced_at', 
                 'extra', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


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
