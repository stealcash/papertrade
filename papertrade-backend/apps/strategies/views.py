from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from apps.users.utils import get_success_response, get_error_response
from django.db import models
from .models import StrategyMaster, StrategyRuleBased, StrategySignal
from .serializers import StrategyMasterSerializer, StrategyRuleBasedSerializer, StrategySignalSerializer
from .logic import StrategyEngine


class StrategyMasterViewSet(viewsets.ModelViewSet):
    queryset = StrategyMaster.objects.all()
    serializer_class = StrategyMasterSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'code'
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)


class StrategySignalViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StrategySignal.objects.all()
    serializer_class = StrategySignalSerializer
    
    def get_queryset(self):
        # Allow filtering by stock or strategy
        queryset = super().get_queryset()
        stock_id = self.request.query_params.get('stock')
        strategy_code = self.request.query_params.get('strategy')
        
        if stock_id:
            queryset = queryset.filter(stock_id=stock_id)
        if strategy_code:
            queryset = queryset.filter(strategy__code=strategy_code)
            
        return queryset.order_by('-date')

class SyncStrategiesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Trigger sync.
        {
            "type": "stock" | "sector",
            "id": <id>,
            "strategy": <code>,
            "mode": "normal" | "hard"
        }
        """
        sync_type = request.data.get('type')
        target_id = request.data.get('id')
        strategy_code = request.data.get('strategy')
        mode = request.data.get('mode', 'normal')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        # New optional fields for bulk sync
        all_stocks = request.data.get('all_stocks')
        symbols = request.data.get('symbols') # List of strings
        
        if not strategy_code:
             return get_error_response('Missing required field: strategy')
             
        if not any([target_id, all_stocks, symbols]) and sync_type == 'stock':
             return get_error_response('Must provide id, symbols list, or all_stocks=true')

        from apps.stocks.models import Stock
        
        stocks_to_sync = []
        if sync_type == 'stock':
            if all_stocks:
                stocks_to_sync = list(Stock.objects.filter(status='active'))
            elif symbols:
                stocks_to_sync = list(Stock.objects.filter(symbol__in=symbols, status='active'))
            elif target_id:
                try:
                    stock = Stock.objects.get(id=target_id)
                    stocks_to_sync.append(stock)
                except Stock.DoesNotExist:
                    return get_error_response('Stock not found')
        elif sync_type == 'sector':
            # Implement sector logic later if needed
            return get_error_response('Sector sync not yet implemented')
            
        count = 0
        for stock in stocks_to_sync:
            result = StrategyEngine.run_strategy(
                stock, 
                strategy_code, 
                mode, 
                start_date=start_date, 
                end_date=end_date
            )
            if result:
                count += result
                
        return get_success_response({'signals_generated': count})


class StrategyRuleBasedViewSet(viewsets.ModelViewSet):
    queryset = StrategyRuleBased.objects.all()
    serializer_class = StrategyRuleBasedSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own strategies and public ones
        return self.queryset.filter(
            models.Q(user=self.request.user) | models.Q(is_public=True)
        )
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def community(self, request):
        """Get public community strategies."""
        queryset = self.queryset.filter(is_public=True)
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
