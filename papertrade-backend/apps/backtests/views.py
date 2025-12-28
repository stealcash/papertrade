from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import uuid
from apps.users.utils import get_success_response, get_error_response
from .models import BacktestRun, Trade
from .serializers import BacktestRunSerializer, TradeSerializer, BacktestRunRequestSerializer


class BacktestRunViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and managing backtest runs."""
    
    queryset = BacktestRun.objects.all()
    serializer_class = BacktestRunSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    def list(self, request):
        queryset = self.get_queryset().order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return get_success_response(serializer.data)

    def destroy(self, request, pk=None):
        try:
            backtest = self.get_queryset().get(pk=pk)
            backtest.delete()
            return get_success_response(None, message='Backtest deleted successfully')
        except BacktestRun.DoesNotExist:
            return get_error_response('NOT_FOUND', 'Backtest not found', status_code=404)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple backtests."""
        ids = request.data.get('ids', [])
        if not ids:
            return get_error_response('VALIDATION_ERROR', 'No IDs provided', status_code=400)
        
        self.get_queryset().filter(id__in=ids).delete()
        return get_success_response(None, message='Backtests deleted successfully')
    
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

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Paginated results for a backtest run."""
        try:
            backtest = self.get_queryset().get(pk=pk)
            trades = backtest.list_of_trades_json
            
            # Filtering
            search = request.query_params.get('search', '').lower()
            if search:
                trades = [t for t in trades if search in t.get('stock_symbol', '').lower()]
            
            # Sorting (Default by date desc for recent first)
            # Assuming trades are stored by-date-asc, let's just reverse for display if needed? 
            # Or just rely on natural order. Let's keep natural order (by-date-asc usually) unless requested.
            
            # Pagination
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            
            total_count = len(trades)
            total_pages = (total_count + page_size - 1) // page_size
            
            start = (page - 1) * page_size
            end = start + page_size
            
            paginated_trades = trades[start:end]
            
            return get_success_response({
                'results': paginated_trades,
                'pagination': {
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'current_page': page,
                    'page_size': page_size
                }
            })
            
        except BacktestRun.DoesNotExist:
            return get_error_response('NOT_FOUND', 'Backtest not found', status_code=404)
        except ValueError:
             return get_error_response('INVALID_PARAM', 'Invalid page parameters', status_code=400)


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
    # Resolve selection to stock_ids
    stock_ids = []
    selection_mode = serializer.validated_data['selection_mode']
    selection_config = serializer.validated_data['selection_config']
    
    if selection_mode == 'stock':
        stock_ids = selection_config.get('ids', [])
    elif selection_mode == 'sector':
        # Fetch stocks in sectors
        from apps.stocks.models import Stock
        sector_ids = selection_config.get('ids', [])
        stock_ids = list(Stock.objects.filter(sectors__id__in=sector_ids).values_list('id', flat=True))
    elif selection_mode == 'category':
        from apps.stocks.models import Stock
        category_ids = selection_config.get('ids', [])
        stock_ids = list(Stock.objects.filter(categories__id__in=category_ids).values_list('id', flat=True))
    elif selection_mode == 'watchlist':
        from apps.stocks.models import Stock
        # Get user's watchlist
        stock_ids = list(Stock.objects.filter(watched_by__user=request.user).values_list('id', flat=True))
        
    if not stock_ids:
        return get_error_response('NO_STOCKS_SELECTED', 'No stocks found for the selection', status_code=400)

    # Create backtest run
    run_id = f"BT-{uuid.uuid4().hex[:12].upper()}"
    
    # Get Strategy
    from apps.strategies.models import StrategyMaster, StrategyRuleBased
    
    strategy_predefined = None
    strategy_rule_based = None
    
    if serializer.validated_data.get('strategy_id'):
        try:
            strategy_predefined = StrategyMaster.objects.get(id=serializer.validated_data['strategy_id'])
        except StrategyMaster.DoesNotExist:
            return get_error_response('INVALID_STRATEGY', 'StrategyMaster not found', status_code=400)
            
    elif serializer.validated_data.get('strategy_rule_based'):
        try:
            strategy_rule_based = StrategyRuleBased.objects.get(id=serializer.validated_data['strategy_rule_based'])
            # Optional: Check permission
            if strategy_rule_based.user and strategy_rule_based.user != request.user and not strategy_rule_based.is_public:
                 return get_error_response('PERMISSION_DENIED', 'You do not have access to this strategy', status_code=403)
        except StrategyRuleBased.DoesNotExist:
            return get_error_response('INVALID_STRATEGY', 'StrategyRuleBased not found', status_code=400)
    
    backtest = BacktestRun.objects.create(
        run_id=run_id,
        user=request.user,
        strategy_predefined=strategy_predefined,
        strategy_rule_based=strategy_rule_based,
        selection_mode=selection_mode,
        selection_config=selection_config,
        criteria_type=serializer.validated_data['criteria_type'],
        magnitude_threshold=serializer.validated_data.get('magnitude_threshold', 50),
        start_date=serializer.validated_data['start_date'],
        end_date=serializer.validated_data['end_date'],
        initial_wallet_amount=serializer.validated_data.get('initial_wallet', 100000),
        status='pending',
    )
    
    # Determine Execution Mode
    from apps.adminpanel.models import SystemConfig
    config = SystemConfig.objects.filter(key='BACKTEST_EXECUTION_MODE').first()
    mode = config.value if config else 'background'
    
    if mode == 'direct':
        # Synchronous Execution
        from .engine import BacktestEngine
        try:
            engine = BacktestEngine(backtest)
            engine.execute(stock_ids)
            backtest.refresh_from_db()
            return get_success_response({
                'run_id': run_id,
                'backtest_id': backtest.id,
                'status': backtest.status,
                'message': 'Backtest completed successfully (Direct Mode)'
            }, status_code=201)
        except Exception as e:
            backtest.status = 'failed'
            backtest.save()
            return get_error_response('EXECUTION_FAILED', f'Direct execution failed: {str(e)}', status_code=500)
    else:
        # Background Execution (Celery)
        execute_backtest_task.delay(
            backtest.id,
            stock_ids,
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
