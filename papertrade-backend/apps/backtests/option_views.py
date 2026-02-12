from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import uuid
from apps.users.utils import get_success_response, get_error_response
from .models import OptionBacktestRun, OptionTrade
from .option_serializers import (
    OptionBacktestRunSerializer,
    OptionBacktestRunListSerializer,
    OptionBacktestRunRequestSerializer,
    OptionTradeSerializer
)


class OptionBacktestRunViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and managing option backtest runs."""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return OptionBacktestRun.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Use lightweight serializer for list, full serializer for detail."""
        if self.action == 'list':
            return OptionBacktestRunListSerializer
        return OptionBacktestRunSerializer
    
    def list(self, request):
        queryset = self.get_queryset().order_by('-created_at')
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 10))
        page = int(request.query_params.get('page', 1))
        
        from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
        paginator = Paginator(queryset, page_size)
        
        try:
            runs_page = paginator.page(page)
        except PageNotAnInteger:
            runs_page = paginator.page(1)
        except EmptyPage:
            runs_page = paginator.page(paginator.num_pages)
        
        serializer = self.get_serializer(runs_page, many=True)
        return get_success_response({
            'results': serializer.data,
            'pagination': {
                'total_count': paginator.count,
                'total_pages': paginator.num_pages,
                'current_page': runs_page.number,
                'page_size': page_size
            }
        })
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return get_success_response(serializer.data)
    
    def destroy(self, request, pk=None):
        try:
            backtest = self.get_queryset().get(pk=pk)
            backtest.delete()
            return get_success_response(None, message='Option backtest deleted successfully')
        except OptionBacktestRun.DoesNotExist:
            return get_error_response('NOT_FOUND', 'Option backtest not found', status_code=404)
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple option backtests."""
        ids = request.data.get('ids', [])
        if not ids:
            return get_error_response('VALIDATION_ERROR', 'No IDs provided', status_code=400)
        
        self.get_queryset().filter(id__in=ids).delete()
        return get_success_response(None, message='Option backtests deleted successfully')
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Paginated trade results for an option backtest run."""
        try:
            backtest = self.get_queryset().get(pk=pk)
            trades_queryset = backtest.trades.all().order_by('-entry_date')
            
            # Pagination
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            
            from django.core.paginator import Paginator
            paginator = Paginator(trades_queryset, page_size)
            
            trades_page = paginator.page(page)
            serializer = OptionTradeSerializer(trades_page, many=True)
            
            return get_success_response({
                'results': serializer.data,
                'pagination': {
                    'total_count': paginator.count,
                    'total_pages': paginator.num_pages,
                    'current_page': page,
                    'page_size': page_size
                }
            })
            
        except OptionBacktestRun.DoesNotExist:
            return get_error_response('NOT_FOUND', 'Option backtest not found', status_code=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_option_backtest(request):
    """Run an option backtest."""
    from .option_engine_v2 import OptionBacktestEngineV2
    from apps.subscriptions.services import SubscriptionService
    
    # Subscription Check
    allowed, msg = SubscriptionService.check_limit(request.user, 'OPTION_BACKTEST_RUN')
    if not allowed:
        return get_error_response('SUBSCRIPTION_LIMIT_REACHED', {'subscription': msg}, status_code=403)
    
    serializer = OptionBacktestRunRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return get_error_response('VALIDATION_ERROR', 'Invalid input data',
                                 serializer.errors, status_code=400)
    
    # Get Strategy
    from apps.strategies.models import OptionStrategy
    try:
        strategy = OptionStrategy.objects.get(id=serializer.validated_data['strategy_id'])
        
        # Permission check: must be system strategy OR user's own strategy
        if strategy.user and strategy.user != request.user and not strategy.is_system:
            return get_error_response('PERMISSION_DENIED', 
                                     'You do not have access to this strategy', status_code=403)
    except OptionStrategy.DoesNotExist:
        return get_error_response('INVALID_STRATEGY', 'Strategy not found', status_code=400)
    
    # Create backtest run
    run_id = f"OPT-BT-{uuid.uuid4().hex[:12].upper()}"
    
    backtest = OptionBacktestRun.objects.create(
        run_id=run_id,
        user=request.user,
        strategy=strategy,
        snapshot_name=strategy.name,
        snapshot_description=strategy.description,
        snapshot_config=strategy.configuration,
        underlying_symbol=serializer.validated_data['underlying_symbol'],
        lot_size=serializer.validated_data.get('lot_size', 50),
        start_date=serializer.validated_data['start_date'],
        end_date=serializer.validated_data['end_date'],
        status='pending',
    )
    
    # Increment Usage
    SubscriptionService.increment_usage(request.user, 'OPTION_BACKTEST_RUN')
    
    # Execute (Direct mode for now, can add Celery later)
    try:
        engine = OptionBacktestEngineV2(backtest)
        engine.execute()
        
        backtest.refresh_from_db()
        return get_success_response({
            'run_id': run_id,
            'backtest_id': backtest.id,
            'status': backtest.status,
            'message': 'Option backtest completed successfully'
        }, status_code=201)
    except Exception as e:
        backtest.status = 'failed'
        backtest.error_message = str(e)
        backtest.save()
        return get_error_response('EXECUTION_FAILED', 
                                 f'Option backtest execution failed: {str(e)}', status_code=500)
