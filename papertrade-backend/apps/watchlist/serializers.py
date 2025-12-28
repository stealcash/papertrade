from rest_framework import serializers
from .models import UserStock
from apps.stocks.serializers import StockSerializer

class UserStockSerializer(serializers.ModelSerializer):
    stock_details = StockSerializer(source='stock', read_only=True)

    class Meta:
        model = UserStock
        fields = ['id', 'stock', 'stock_details', 'order', 'created_at']
        read_only_fields = ['id', 'created_at', 'user']
    
    def create(self, validated_data):
        user = self.context['request'].user
        stock = validated_data['stock']
        
        # Check if already exists
        if UserStock.objects.filter(user=user, stock=stock).exists():
            raise serializers.ValidationError("Stock already in watchlist")
            
        validated_data['user'] = user
        return super().create(validated_data)
