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

    def get_object(self):
        """
        Support lookup by ID or Code.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        if lookup_value and lookup_value.isdigit():
            try:
                obj = queryset.get(pk=lookup_value)
                self.check_object_permissions(self.request, obj)
                return obj
            except (ValueError, StrategyMaster.DoesNotExist):
                # Fallthrough to try code
                pass

        # Try matching by code
        from django.shortcuts import get_object_or_404
        obj = get_object_or_404(queryset, code=lookup_value)
        self.check_object_permissions(self.request, obj)
        return obj
    
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
        Get signals for this strategy. 
        If 'date' param is provided, returns signals for that specific date.
        Otherwise returns signals for the latest available date.
        Also specifically fetches the *current* (latest) price for comparison.
        """
        # Subscription Enforce
        from apps.subscriptions.services import SubscriptionService
        from rest_framework.exceptions import PermissionDenied

        # Check Limits ONLY if this request comes from Stock Finder feature
        # (Market Scanner uses same endpoint but might be unlimited/different plan)
        source = request.query_params.get('source')
        if source == 'stock_finder':
            is_allowed, message = SubscriptionService.check_limit(request.user, 'STOCK_FINDER_SCAN')
            if not is_allowed:
                raise PermissionDenied(detail={"message": message, "code": "PLAN_LIMIT_REACHED"})

        strategy = self.get_object()
        
        target_date_str = request.query_params.get('date')
        
        # Determine the effective date (Exact or Previous Working Day)
        # We find the latest date available that is <= target_date (or just latest if no target provided)
        
        filter_kwargs = {'strategy': strategy}
        if target_date_str:
            filter_kwargs['date__lte'] = target_date_str
            
        from django.db.models import Max
        # This one query handles both "Latest available" (if no date param) 
        # AND "Previous working day" (if date param is a holiday/weekend)
        effective_date = StrategySignal.objects.filter(**filter_kwargs).aggregate(Max('date'))['date__max']
        
        if not effective_date:
            return Response({
                'date': target_date_str, # Return requested date so client knows
                'signals': [],
                'message': 'No signals found on or before this date.'
            })
            
        # Fetch signals for that effective date
        signals = StrategySignal.objects.filter(strategy=strategy, date=effective_date)

        # Apply Filters (Sector / Category)
        sector_id = request.query_params.get('sector')
        if sector_id:
            signals = signals.filter(stock__sectors__id=sector_id)
            
        category_id = request.query_params.get('category')
        if category_id:
            signals = signals.filter(stock__categories__id=category_id)

        signals = signals.select_related('stock')
        
        # Fetch LATEST prices for these stocks to compare (Current Market Price)
        # We need the price from the 'latest' available date in DB, not just target_date
        stock_ids = [s.stock_id for s in signals]
        latest_prices_map = {}
        
        if stock_ids:
            from apps.stocks.models import StockPriceDaily
            # Fetch latest price for each stock
            # Using distinct('stock') is Postgres specific but efficient
            try:
                latest_qs = StockPriceDaily.objects.filter(stock_id__in=stock_ids)\
                                .order_by('stock', '-date')\
                                .distinct('stock')\
                                .values('stock_id', 'close_price', 'date')
                
                for item in latest_qs:
                    latest_prices_map[item['stock_id']] = {
                        'price': item['close_price'],
                        'date': item['date']
                    }
            except Exception as e:
                # Fallback if DB doesn't support distinct on fields (e.g. SQLite)
                # Naive approach
                for sid in stock_ids:
                     lp = StockPriceDaily.objects.filter(stock_id=sid).order_by('-date').values('close_price', 'date').first()
                     if lp:
                         latest_prices_map[sid] = {'price': lp['close_price'], 'date': lp['date']}
        
        # Serialize
        data = []
        for s in signals:
            current_info = latest_prices_map.get(s.stock_id, {})
            data.append({
                'stock_symbol': s.stock.symbol,
                'stock_name': s.stock.name,
                'direction': s.signal_direction,
                'entry_price': s.entry_price,
                'expected_value': s.expected_value,
                'latest_price': current_info.get('price'),
                'latest_date': current_info.get('date') 
            })
        
        # Increment Usage (Only for Stock Finder)
        if source == 'stock_finder':
            SubscriptionService.increment_usage(request.user, 'STOCK_FINDER_SCAN')

        return Response({
            'date': effective_date,
            'signals': data,
            'count': len(data)
        })

    @action(detail=False, methods=['post'])
    def import_manual(self, request):
        """
        Import/Sync manual strategies defined in code to the database.
        """
        # Define known manual strategies here (mirroring logic.py handling)
        MANUAL_STRATEGIES = [
            {
                "code": "DAILY_CLOSE_MOMENTUM",
                "name": "Daily Close Momentum",
                "description": "Basic Trend Follower: Predicts UP if Close > Previous Close.",
                "type": "MANUAL",
                "status": "active"
            },
            {
                "code": "TWO_DAY_CLOSE_MOMENTUM", 
                "name": "Two Day Momentum",
                "description": "Stronger Trend: Predicts UP if 2 consecutive days of gains.",
                "type": "MANUAL",
                "status": "active"
            },
            {
                 "code": "OVERSOLD_REVERSAL",
                 "name": "RSI Oversold Reversal",
                 "description": "Mean Reversion: Predicts UP if RSI drops below 30.",
                 "type": "MANUAL",
                 "status": "active"
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for strat_def in MANUAL_STRATEGIES:
            obj, created = StrategyMaster.objects.update_or_create(
                code=strat_def['code'],
                defaults={
                    'name': strat_def['name'],
                    'description': strat_def['description'],
                    'type': strat_def['type'],
                    'status': strat_def['status']
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
                
        return get_success_response({
            'message': f"Imported {created_count} new strategies, updated {updated_count}.",
            'created': created_count,
            'updated': updated_count
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
            SubscriptionService.increment_usage(user, 'STRATEGY_CREATE')
    
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
    
    @action(detail=False, methods=['get'])
    def community(self, request):
        """Get public community strategies."""
        queryset = self.queryset.filter(is_public=True)
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)


from .models import StockFinderHistory
from .serializers import StockFinderHistorySerializer

class StockFinderViewSet(viewsets.ModelViewSet):
    """ViewSet for Stock Finder history and scanning logic."""
    permission_classes = [IsAuthenticated]
    serializer_class = StockFinderHistorySerializer
    pagination_class = None # Or implement if history gets large

    def get_queryset(self):
        return StockFinderHistory.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def scan(self, request):
        """
        Primary endpoint for multi-strategy scanning.
        Supports both SYSTEM (pre-calculated) and USER (live-calculated) strategies.
        """
        from apps.subscriptions.services import SubscriptionService
        from apps.stocks.models import StockPriceDaily, Stock
        from .models import StrategyRuleBased, StrategySignal
        from .logic import StrategyEngine
        from datetime import timedelta, datetime

        # 1. Subscription Check
        is_allowed, message = SubscriptionService.check_limit(request.user, 'STOCK_FINDER_SCAN')
        if not is_allowed:
            return get_error_response('PLAN_LIMIT_REACHED', message, status_code=403)

        # 2. Extract Params
        strategies_meta = request.data.get('strategies', [])
        direction = request.data.get('direction', 'UP')
        target_date_str = request.data.get('date')
        sector_id = request.data.get('sector')
        category_id = request.data.get('category')

        if not strategies_meta:
            return get_error_response('VALIDATION_ERROR', 'At least one strategy must be selected.')

        # 3. Resolve Effective Date
        # If target_date is not provided, use the latest price date from DB
        from django.db.models import Max
        if target_date_str:
            effective_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        else:
            effective_date = StockPriceDaily.objects.aggregate(Max('date'))['date__max']

        if not effective_date:
            return get_success_response({
                'date': str(target_date_str),
                'signals': [],
                'message': 'No price data found in system.'
            })

        # 4. Perform Intersection
        final_stock_ids = None
        
        # We need to track actual strategy names for history
        strategy_history_summary = []
        
        # Track signal metadata (entry_price, expected_value) for results
        primary_signals_map = {} # stock_id -> {entry, expected}

        for strat in strategies_meta:
            strat_id = strat.get('id')
            strat_type = strat.get('type')
            current_stock_ids = set()

            if strat_type == 'USER':
                # LIVE EVALUATION
                try:
                    user_strat = StrategyRuleBased.objects.get(id=strat_id)
                    strategy_history_summary.append({'id': user_strat.id, 'name': user_strat.name})
                    
                    # Fetch candidate stocks
                    stocks_to_scan = Stock.objects.filter(status='active')
                    if sector_id:
                        stocks_to_scan = stocks_to_scan.filter(sectors__id=sector_id)
                    if category_id:
                        stocks_to_scan = stocks_to_scan.filter(categories__id=category_id)
                    
                    # Optimization: Only scan stocks that are still in the intersection
                    if final_stock_ids is not None:
                        stocks_to_scan = stocks_to_scan.filter(id__in=final_stock_ids)

                    # Scan each stock
                    for s in stocks_to_scan:
                        # Fetch prices with enough buffer for indicators (50 days)
                        # We need prices up to effective_date
                        prices = StockPriceDaily.objects.filter(
                            stock=s, 
                            date__lte=effective_date
                        ).order_by('-date')[:60] # Fetch last 60 for safe buffer
                        prices = list(reversed(list(prices))) # Back to chronological
                        
                        if not prices: continue
                        
                        # Rules evaluation
                        signals = StrategyEngine.calculate_rule_based_strategy(prices, user_strat.rules_json)
                        
                        # Filter for target date and direction
                        # Note: signals are for the NEXT trading day relative to evaluation day
                        # So if we want to find stocks for 'effective_date', we check signals matching that date
                        match = next((sig for sig in signals if sig['date'] == effective_date and sig['signal_direction'] == direction), None)
                        if match:
                            current_stock_ids.add(s.id)
                            # Record metadata if not already recorded (preference to first strategy)
                            if s.id not in primary_signals_map:
                                primary_signals_map[s.id] = {
                                    'entry_price': match.get('entry_price'),
                                    'expected_value': match.get('expected_value')
                                }
                except StrategyRuleBased.DoesNotExist:
                    continue

            else:
                # PRE-CALCULATED EVALUATION (System Strategy)
                try:
                    system_strat = StrategyMaster.objects.get(id=strat_id)
                    strategy_history_summary.append({'id': system_strat.id, 'name': system_strat.name})
                    
                    signals_qs = StrategySignal.objects.filter(
                        strategy_id=strat_id,
                        date=effective_date,
                        signal_direction=direction
                    ).select_related('stock')
                    
                    if sector_id:
                        signals_qs = signals_qs.filter(stock__sectors__id=sector_id)
                    if category_id:
                        signals_qs = signals_qs.filter(stock__categories__id=category_id)
                    
                    for sig in signals_qs:
                        current_stock_ids.add(sig.stock_id)
                        if sig.stock_id not in primary_signals_map:
                            primary_signals_map[sig.stock_id] = {
                                'entry_price': float(sig.entry_price) if sig.entry_price else None,
                                'expected_value': float(sig.expected_value) if sig.expected_value else None
                            }
                except StrategyMaster.DoesNotExist:
                    continue

            # Intersect
            if final_stock_ids is None:
                final_stock_ids = current_stock_ids
            else:
                final_stock_ids = final_stock_ids.intersection(current_stock_ids)
            
            if not final_stock_ids:
                break

        # 5. Build Result Payload
        results = []
        if final_stock_ids:
            # Fetch latest price info for display
            latest_prices = StockPriceDaily.objects.filter(stock_id__in=final_stock_ids)\
                                .order_by('stock_id', '-date')\
                                .distinct('stock_id')\
                                .select_related('stock')
            
            for lp in latest_prices:
                meta = primary_signals_map.get(lp.stock_id, {})
                results.append({
                    'stock_id': lp.stock_id,
                    'stock_symbol': lp.stock.symbol,
                    'stock_name': lp.stock.name,
                    'direction': direction,
                    'entry_price': meta.get('entry_price'),
                    'expected_value': meta.get('expected_value'),
                    'latest_price': float(lp.close_price),
                    'latest_date': str(lp.date)
                })

        # 6. Save to History
        history = StockFinderHistory.objects.create(
            user=request.user,
            strategies=strategy_history_summary,
            filters={
                'date': str(effective_date),
                'requested_date': target_date_str,
                'direction': direction,
                'sector_id': sector_id,
                'category_id': category_id
            },
            results=results
        )

        # 7. Increment Usage
        SubscriptionService.increment_usage(request.user, 'STOCK_FINDER_SCAN')

        return get_success_response({
            'history_id': history.id,
            'date': str(effective_date),
            'results': results,
            'count': len(results)
        })

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)


from .models import OptionStrategy
from .serializers import OptionStrategySerializer

class OptionStrategyViewSet(viewsets.ModelViewSet):
    serializer_class = OptionStrategySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        
        # If AdminUser, show all strategies
        if hasattr(user, '_meta') and user._meta.object_name == 'AdminUser':
             return OptionStrategy.objects.all().order_by('-created_at')
             
        # For regular Users, show system strategies OR strategies belonging to them
        return OptionStrategy.objects.filter(Q(is_system=True) | Q(user=user)).order_by('-created_at')

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from apps.subscriptions.services import SubscriptionService
        
        user = self.request.user
        # If AdminUser, don't assign to user field (set is_system=True instead if desired, 
        # or just leave user=None)
        if hasattr(user, '_meta') and user._meta.object_name == 'AdminUser':
            serializer.save(user=None, is_system=True)
        else:
            # Subscription Enforcement
            allowed, msg = SubscriptionService.check_limit(user, 'OPTION_STRATEGY_CREATE')
            if not allowed:
                raise ValidationError({'subscription': msg})

            serializer.save(user=user)
            SubscriptionService.increment_usage(user, 'OPTION_STRATEGY_CREATE')

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple option strategies."""
        ids = request.data.get('ids', [])
        if not ids:
            return get_error_response('VALIDATION_ERROR', 'No IDs provided', status_code=400)
        
        # Security: only delete strategies belonging to the user OR any if admin
        queryset = self.get_queryset()
        queryset.filter(id__in=ids).delete()
        return get_success_response(None, message='Option strategies deleted successfully')

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)
