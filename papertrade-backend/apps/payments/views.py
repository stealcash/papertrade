from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from apps.users.utils import get_success_response, get_error_response
from .models import PaymentRecord
from .serializers import PaymentRecordSerializer


class WalletTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    from .models import WalletTransaction
    from .serializers import WalletTransactionSerializer
    
    queryset = WalletTransaction.objects.all()
    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refill_wallet(request):
    """Refill user wallet (for testing/demo purposes)."""
    from apps.adminpanel.utils import ConfigManager
    from .models import WalletTransaction
    from decimal import Decimal
    
    amount = request.data.get('amount')
    if amount:
        amount = Decimal(str(amount))
    else:
        amount = Decimal(str(ConfigManager.get_default_wallet_amount()))
    
    # Update balance (Add, don't replace)
    request.user.wallet_balance += amount
    request.user.save()
    
    # Create Transaction Record
    WalletTransaction.objects.create(
        user=request.user,
        transaction_type='CREDIT',
        amount=amount,
        balance_after=request.user.wallet_balance,
        description='Wallet Refill'
    )
    
    return get_success_response({
        'wallet_balance': str(request.user.wallet_balance),
        'message': 'Wallet refilled successfully'
    })
