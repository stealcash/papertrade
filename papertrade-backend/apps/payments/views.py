from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from apps.users.utils import get_success_response, get_error_response
from .models import PaymentRecord
from .serializers import PaymentRecordSerializer


class PaymentRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentRecord.objects.all()
    serializer_class = PaymentRecordSerializer
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
    amount = request.data.get('amount', ConfigManager.get_default_wallet_amount())
    
    request.user.wallet_balance = amount
    request.user.save()
    
    return get_success_response({
        'wallet_balance': str(request.user.wallet_balance),
        'message': 'Wallet refilled successfully'
    })
