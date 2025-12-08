from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from apps.users.utils import get_success_response, get_error_response
from .models import StrategyPredefined, StrategyRuleBased
from .serializers import StrategyPredefinedSerializer, StrategyRuleBasedSerializer


class StrategyPredefinedViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StrategyPredefined.objects.filter(status='active')
    serializer_class = StrategyPredefinedSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return get_success_response(serializer.data)


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
