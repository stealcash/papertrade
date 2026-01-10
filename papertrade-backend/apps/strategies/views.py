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
    queryset = StrategyMaster.objects.all()
    serializer_class = StrategyMasterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = StrategyMaster.objects.all()
        scope = self.request.query_params.get('scope')
        
        if scope == 'system':
            # System strategies: Type=MANUAL OR Created by Admin
            # Assumption: Admins have is_staff=True or role='admin'/'superadmin'
            # Or simplified: All MANUAL strategies + Any AUTO strategy created by an admin
            from django.db.models import Q
            queryset = queryset.filter(
                Q(type='MANUAL') | 
                Q(created_by__role__in=['admin', 'superadmin']) | 
                Q(created_by__is_superuser=True) |
                Q(rule_based_strategy__created_by_admin__isnull=False)
            ).distinct()
            
        return queryset

    @action(detail=True, methods=['get'])
    def scan_results(self, request, pk=None):
        """
        Get the latest available signals for this strategy.
        """
        strategy = self.get_object()
        
        # Find latest date
        from django.db.models import Max
        latest_date = StrategySignal.objects.filter(strategy=strategy).aggregate(Max('date'))['date__max']
        
        if not latest_date:
            return Response({
                'date': None,
                'signals': [],
                'message': 'No signals found for this strategy.'
            })
            
        # Fetch signals for that date
        signals = StrategySignal.objects.filter(strategy=strategy, date=latest_date).select_related('stock')
        
        # Serialize simply (just what we need for the table)
        data = [{
            'stock_symbol': s.stock.symbol,
            'stock_name': s.stock.name,
            'direction': s.signal_direction,
            'entry_price': s.entry_price,
            'expected_value': s.expected_value
        } for s in signals]
        
        return Response({
            'date': latest_date,
            'signals': data,
            'count': len(data)
        })

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return get_success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return get_success_response(serializer.data, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return get_success_response(serializer.data)

    def perform_destroy(self, instance):
        # If AUTO strategy, delete linked rule_based strategy
        if instance.type == 'AUTO' and instance.rule_based_strategy:
            instance.rule_based_strategy.delete()
        instance.delete()
        return get_success_response({'deleted': True})


class StrategySignalViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StrategySignal.objects.all()
    serializer_class = StrategySignalSerializer
    
    def get_queryset(self):
        # Allow filtering by stock or strategy
        queryset = super().get_queryset()
        stock_id = self.request.query_params.get('stock')
        strategy_code = self.request.query_params.get('strategy')
        strategy_id = self.request.query_params.get('strategy_id')
        
        if stock_id:
            queryset = queryset.filter(stock_id=stock_id)
        if strategy_code:
            queryset = queryset.filter(strategy__code=strategy_code)
        if strategy_id:
            queryset = queryset.filter(strategy_id=strategy_id)
            
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
            
        return queryset.order_by('-date')

    @action(detail=False, methods=['get'])
    def performance(self, request):
        """
        Aggregate performance metrics by stock for a given strategy.
        """
        strategy_code = request.query_params.get('strategy')
        strategy_id = request.query_params.get('strategy_id')
        start_date = request.query_params.get('start_date')
        
        if not strategy_code and not strategy_id:
            return Response({"error": "strategy or strategy_id param is required"}, status=400)
            
        # Base Query
        queryset = StrategySignal.objects.all()
        if strategy_id:
            queryset = queryset.filter(strategy_id=strategy_id)
        elif strategy_code:
            queryset = queryset.filter(strategy__code=strategy_code)
            
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
            
        # Aggregation
        from django.db.models import Count, Sum, Q, F, Case, When, Value, DecimalField
        
        stats = queryset.values('stock__symbol', 'stock__id').annotate(
            total_signals=Count('id'),
            wins=Count('id', filter=Q(status='WIN')),
            losses=Count('id', filter=Q(status='LOSS')),
            neutral=Count('id', filter=Q(status='NEUTRAL')),
            pending=Count('id', filter=Q(status='PENDING')),
            total_pnl=Sum('pnl'),
            # Calculate Win Rate simple way to avoid complex DB math division by zero risks
            # We can do final calc in python loop/serializer
        ).order_by('-wins', 'stock__symbol')
        
        # Enrich with Sector/Category Data
        stock_ids = [s['stock__id'] for s in stats]
        from apps.stocks.models import Stock
        stock_map = {}
        
        # Prefetch to avoid N+1
        stocks = Stock.objects.filter(id__in=stock_ids).prefetch_related('sectors', 'categories')
        
        all_sectors = set()
        all_categories = set()
        
        for stock in stocks:
            s_sectors = [sec.name for sec in stock.sectors.all()]
            s_cats = [cat.name for cat in stock.categories.all()]
            stock_map[stock.id] = {
                'sectors': s_sectors,
                'categories': s_cats
            }
            all_sectors.update(s_sectors)
            all_categories.update(s_cats)

        results = []
        for s in stats:
            total = s['total_signals']
            resolved = s['wins'] + s['losses']
            win_rate = 0
            if resolved > 0:
                win_rate = round((s['wins'] / resolved) * 100, 1)
            
            enrichment = stock_map.get(s['stock__id'], {'sectors': [], 'categories': []})
                
            results.append({
                'stock_symbol': s['stock__symbol'],
                'stock_id': s['stock__id'],
                'total_signals': total,
                'wins': s['wins'],
                'losses': s['losses'],
                'pending': s['pending'],
                'win_rate': win_rate,
                'total_pnl': s['total_pnl'] or 0,
                'sectors': enrichment['sectors'],
                'categories': enrichment['categories']
            })
            
        # Date Range
        from django.db.models import Min, Max
        date_stats = queryset.aggregate(min_date=Min('date'), max_date=Max('date'))
            
        return Response({
            'data': results,
            'metadata': {
                'min_date': date_stats['min_date'],
                'max_date': date_stats['max_date'],
                'all_sectors': sorted(list(all_sectors)),
                'all_categories': sorted(list(all_categories))
            }
        })

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
        user = self.request.user
        if hasattr(user, '_meta') and user._meta.object_name == 'AdminUser':
             return self.queryset.all()
             
        return self.queryset.filter(user=user)
    
    def perform_create(self, serializer):
        import uuid
        from rest_framework.exceptions import ValidationError
        from apps.subscriptions.services import SubscriptionService

        code = serializer.validated_data.pop('code', None)
        user = self.request.user
        
        # Check if user is an AdminUser (based on model name or properties)
        if hasattr(user, '_meta') and user._meta.object_name == 'AdminUser':
            instance = serializer.save(created_by_admin=user)
            
            # Auto-create StrategyMaster
            final_code = code if code else f"AUTO_{instance.id}_{uuid.uuid4().hex[:4].upper()}"
            
            StrategyMaster.objects.create(
                name=instance.name,
                description=instance.description,
                code=final_code,
                type='AUTO',
                rule_based_strategy=instance,
                status='active'
            )
        else:
            # Subscription Enforcement
            # Check Count limit (Implicitly checks 'enabled' status too)
            allowed, msg = SubscriptionService.check_limit(user, 'STRATEGY_CREATE')
            if not allowed:
                 raise ValidationError({"subscription": msg})

            serializer.save(user=user)
    
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
