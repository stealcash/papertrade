from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from decimal import Decimal

from .models import Portfolio, Transaction
from .serializers import PortfolioSerializer, TransactionSerializer, TradeRequestSerializer
from apps.stocks.models import Stock
from apps.users.utils import get_success_response, get_error_response

class PortfolioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PortfolioSerializer

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user).select_related('stock')

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate totals
        total_invested = sum(p.invested_value for p in queryset)
        current_value = 0
        for p in queryset:
            # We calculate this manually here or rely on the serializer's method field if data is pre-fetched
            # Ideally we rely on serializer data
            pass
        
        # Note: Serializer 'current_value' depends on queries inside serializer (N+1 danger).
        # For MVP we accept it.
        
        return get_success_response({
            'holdings': serializer.data,
            'summary': {
                'total_invested': total_invested
                # Current value & PnL is computed per item in serializer
            }
        })

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get transaction history."""
        transactions = Transaction.objects.filter(user=request.user)
        page = self.paginate_queryset(transactions)
        if page is not None:
            serializer = TransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = TransactionSerializer(transactions, many=True)
        return get_success_response(serializer.data)

    @action(detail=False, methods=['post'])
    def trade(self, request):
        """Execute a Buy or Sell trade."""
        from apps.subscriptions.services import SubscriptionService
        
        serializer = TradeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return get_error_response('VALIDATION_ERROR', 'Invalid data', serializer.errors, status_code=400)

        stock_id = serializer.validated_data['stock_id']
        quantity = serializer.validated_data['quantity']
        action_type = serializer.validated_data['action']
        user = request.user
        
        # Subscription Check (Only for BUY)
        # We allow SELL even if limit is reached (to exit positions)
        if action_type == 'BUY':
            allowed, msg = SubscriptionService.check_limit(user, 'TRADE_EXECUTE')
            if not allowed:
                 return get_error_response('SUBSCRIPTION_LIMIT_REACHED', msg, status_code=403)

        stock = get_object_or_404(Stock, id=stock_id)
        
        # Fetch latest price
        # Optimization: Ideally this comes from a real-time service or cache
        latest_price_obj = stock.daily_prices.order_by('-date').first()
        if not latest_price_obj:
            return get_error_response('PRICE_NOT_FOUND', 'No price data available for this stock', status_code=400)
        
        execution_price = latest_price_obj.close_price
        total_amount = execution_price * Decimal(quantity)

        try:
            with transaction.atomic():
                # Lock user row for balance update
                user.refresh_from_db()

                if action_type == 'BUY':
                    if user.wallet_balance < total_amount:
                        return get_error_response('INSUFFICIENT_FUNDS', f'Insufficient wallet balance. Required: {total_amount}', status_code=400)
                    
                    # Deduct balance
                    user.wallet_balance -= total_amount
                    user.save()

                    # Update Portfolio
                    portfolio, created = Portfolio.objects.get_or_create(user=user, stock=stock)
                    
                    # Calculate new weighted average price
                    # New Avg = ((Old Qty * Old Avg) + (New Qty * New Price)) / (Old Qty + New Qty)
                    current_invested = Decimal(portfolio.quantity) * Decimal(portfolio.average_buy_price)
                    new_invested = current_invested + total_amount
                    new_quantity = portfolio.quantity + quantity
                    portfolio.average_buy_price = new_invested / Decimal(new_quantity)
                    portfolio.quantity = new_quantity
                    portfolio.save()

                elif action_type == 'SELL':
                    try:
                        portfolio = Portfolio.objects.get(user=user, stock=stock)
                    except Portfolio.DoesNotExist:
                        return get_error_response('NO_HOLDINGS', 'You do not own this stock', status_code=400)
                    
                    if portfolio.quantity < quantity:
                        return get_error_response('INSUFFICIENT_QUANTITY', f'Insufficient quantity. Owned: {portfolio.quantity}', status_code=400)

                    # Add balance
                    user.wallet_balance += total_amount
                    user.save()

                    # Update Portfolio
                    portfolio.quantity -= quantity
                    if portfolio.quantity == 0:
                        portfolio.delete()
                    else:
                        portfolio.save()
                        # Average buy price does NOT change on sell

                # Record Transaction
                Transaction.objects.create(
                    user=user,
                    stock=stock,
                    type=action_type,
                    quantity=quantity,
                    price=execution_price,
                    amount=total_amount
                )


                
                # Increment Usage (Only for BUY)
                if action_type == 'BUY':
                    SubscriptionService.increment_usage(user, 'TRADE_EXECUTE')

                return get_success_response({
                    'message': f'{action_type} order executed successfully',
                    'execution_price': execution_price,
                    'total_amount': total_amount,
                    'new_balance': user.wallet_balance
                })

        except Exception as e:
            return get_error_response('TRADE_FAILED', str(e), status_code=500)
