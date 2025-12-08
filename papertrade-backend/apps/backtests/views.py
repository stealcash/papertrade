from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import uuid
from apps.users.utils import get_success_response, get_error_response
from .models import BacktestRun, Trade
from .serializers import BacktestRunSerializer, TradeSerializer, BacktestRunRequestSerializer


class BacktestRunViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing backtest runs."""
    
    queryset = BacktestRun.objects.all()
    serializer_class = BacktestRunSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        """Export backtest results as CSV."""
        import csv
        import os
        from django.http import HttpResponse
        from django.conf import settings
        
        try:
            backtest = self.get_queryset().get(pk=pk)
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="backtest_{backtest.run_id}.csv"'
            
            writer = csv.writer(response)
            
            # Write header
            writer.writerow([
                'Run ID', 'Stock', 'Buy Date', 'Buy Price', 'Sell Date', 
                'Sell Price', 'Quantity', 'P/L', 'P/L %'
            ])
            
            # Write trades
            for trade in backtest.list_of_trades_json:
                buy_price = float(trade['buy_price'])
                sell_price = float(trade['sell_price'])
                pnl = float(trade['pnl'])
                pnl_pct = ((sell_price - buy_price) / buy_price * 100) if buy_price > 0 else 0
                
                writer.writerow([
                    backtest.run_id,
                    trade['stock_symbol'],
                    trade['buy_date'],
                    f"₹{buy_price:.2f}",
                    trade['sell_date'],
                    f"₹{sell_price:.2f}",
                    trade['quantity'],
                    f"₹{pnl:.2f}",
                    f"{pnl_pct:.2f}%"
                ])
            
            # Write summary
            writer.writerow([])
            writer.writerow(['Summary'])
            writer.writerow(['Total Trades', backtest.number_of_trades])
            writer.writerow(['Initial Wallet', f"₹{backtest.initial_wallet_amount}"])
            writer.writerow(['Final Wallet', f"₹{backtest.final_wallet_amount}"])
            writer.writerow(['Total P/L', f"₹{backtest.total_pnl}"])
            writer.writerow(['P/L %', f"{backtest.pnl_percentage}%"])
            
            return response
            
        except BacktestRun.DoesNotExist:
            return get_error_response('BACKTEST_NOT_FOUND', 'Backtest not found', status_code=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_backtest(request):
    """Run a backtest."""
    from .tasks import execute_backtest_task
    
    serializer = BacktestRunRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data', 
                                 serializer.errors, status_code=400)
    
    # Validate date range
    if serializer.validated_data['start_date'] >= serializer.validated_data['end_date']:
        return get_error_response('INVALID_DATE_RANGE', 
                                 'Start date must be before end date', 
                                 status_code=400)
    
    # Create backtest run
    run_id = f"BT-{uuid.uuid4().hex[:12].upper()}"
    
    backtest = BacktestRun.objects.create(
        run_id=run_id,
        user=request.user,
        start_date=serializer.validated_data['start_date'],
        end_date=serializer.validated_data['end_date'],
        initial_wallet_amount=serializer.validated_data['initial_wallet'],
        status='pending',
    )
    
    # Trigger Celery task for backtest execution
    execute_backtest_task.delay(
        backtest.id,
        serializer.validated_data['stock_ids'],
        serializer.validated_data.get('execution_mode', 'signal_close')
    )
    
    return get_success_response({
        'run_id': run_id,
        'backtest_id': backtest.id,
        'status': 'pending',
        'message': 'Backtest queued for execution'
    }, status_code=201)


class TradeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing trades."""
    
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    def list(self, request):
        queryset = self.get_queryset()
        
        # Filter by backtest run
        backtest_run_id = request.query_params.get('backtest_run_id')
        if backtest_run_id:
            queryset = queryset.filter(backtest_run_id=backtest_run_id)
        
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
