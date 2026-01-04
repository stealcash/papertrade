from rest_framework import serializers
from .models import Portfolio, Transaction
from apps.stocks.serializers import StockSerializer

class PortfolioSerializer(serializers.ModelSerializer):
    stock_details = StockSerializer(source='stock', read_only=True)
    current_value = serializers.SerializerMethodField()
    pnl = serializers.SerializerMethodField()
    pnl_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = ['id', 'stock', 'stock_details', 'quantity', 'average_buy_price', 
                  'invested_value', 'current_value', 'pnl', 'pnl_percentage', 'updated_at']
        read_only_fields = ['id', 'invested_value', 'updated_at']

    def get_current_value(self, obj):
        # Calculate based on latest stock price
        latest_price_obj = obj.stock.daily_prices.order_by('-date').first()
        if latest_price_obj:
            return obj.quantity * latest_price_obj.close_price
        return 0

    def get_pnl(self, obj):
        current = self.get_current_value(obj)
        invested = obj.invested_value
        return current - invested if current else 0

    def get_pnl_percentage(self, obj):
        invested = obj.invested_value
        if invested > 0:
            pnl = self.get_pnl(obj)
            return (pnl / invested) * 100
        return 0


class TransactionSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'stock', 'stock_symbol', 'type', 'quantity', 'price', 'amount', 'created_at']
        read_only_fields = ['id', 'amount', 'created_at']


class TradeRequestSerializer(serializers.Serializer):
    stock_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    action = serializers.ChoiceField(choices=['BUY', 'SELL'])
