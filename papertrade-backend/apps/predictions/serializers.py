from rest_framework import serializers
from .models import StockPrediction
from apps.stocks.models import Stock, StockPriceDaily
from decimal import Decimal
from datetime import timedelta

class StockPredictionSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    current_price = serializers.SerializerMethodField()
    return_percentage = serializers.SerializerMethodField()
    return_value = serializers.SerializerMethodField()
    
    return_1d = serializers.SerializerMethodField()
    return_7d = serializers.SerializerMethodField()
    
    class Meta:
        model = StockPrediction
        fields = [
            'id', 'stock', 'stock_symbol', 'stock_name', 'direction', 
            'status', 'entry_price', 'description', 'created_at', 
            'current_price', 'return_percentage', 'return_value',
            'return_1d', 'return_7d'
        ]
        read_only_fields = ['user', 'entry_price', 'status', 'created_at']

    def validate_description(self, value):
        if len(value.split()) > 1000:
            raise serializers.ValidationError("Description cannot exceed 1000 words.")
        return value

    def get_current_price(self, obj):
        # Fetch the latest available price from StockPriceDaily
        latest_price = StockPriceDaily.objects.filter(stock=obj.stock).order_by('-date').first()
        if latest_price:
            return latest_price.close_price
        return obj.entry_price

    def _calculate_return_pct(self, entry_price, current_price, direction):
        if not current_price or entry_price == 0:
            return None
            
        diff = current_price - entry_price
        pct = (diff / entry_price) * 100
        
        if direction == 'SELL':
            return round(pct * -1, 2)
        return round(pct, 2)

    def get_return_percentage(self, obj):
        """All-time return based on current price"""
        current = self.get_current_price(obj)
        res = self._calculate_return_pct(obj.entry_price, current, obj.direction)
        return res if res is not None else 0.0

    def get_return_1d(self, obj):
        """Return after 1 day from creation"""
        target_date = obj.created_at.date() + timedelta(days=1)
        price_obj = StockPriceDaily.objects.filter(stock=obj.stock, date=target_date).first()
        if price_obj:
            return self._calculate_return_pct(obj.entry_price, price_obj.close_price, obj.direction)
        return None  # Pending or No Data

    def get_return_7d(self, obj):
        """Return after 7 days from creation"""
        target_date = obj.created_at.date() + timedelta(days=7)
        price_obj = StockPriceDaily.objects.filter(stock=obj.stock, date=target_date).first()
        if price_obj:
            return self._calculate_return_pct(obj.entry_price, price_obj.close_price, obj.direction)
        return None # Pending or No Data

    def get_return_value(self, obj):
        current = self.get_current_price(obj)
        if not current:
            return 0.0
            
        diff = current - obj.entry_price
        if obj.direction == 'SELL':
            return diff * -1
        return diff

    def create(self, validated_data):
        from apps.subscriptions.services import SubscriptionService
        
        user = self.context['request'].user
        
        # Check Limits
        allowed, message = SubscriptionService.check_limit(user, 'PREDICTION_ADD')
        if not allowed:
             raise serializers.ValidationError(message)

        stock = validated_data['stock']
        
        # Auto-fetch current price
        latest_price_obj = StockPriceDaily.objects.filter(stock=stock).order_by('-date').first()
        entry_price = latest_price_obj.close_price if latest_price_obj else Decimal('0.00')
        
        prediction = StockPrediction.objects.create(
            user=user,
            entry_price=entry_price,
            **validated_data
        )
        
        # Increment Usage
        SubscriptionService.increment_usage(user, 'PREDICTION_ADD')
        
        return prediction
