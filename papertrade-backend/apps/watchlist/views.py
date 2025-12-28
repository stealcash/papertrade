from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import UserStock
from .serializers import UserStockSerializer

class WatchlistViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserStockSerializer

    def get_queryset(self):
        return UserStock.objects.filter(user=self.request.user).order_by('order')

    def list(self, request):
        """List watchlist items with pagination."""
        queryset = self.get_queryset()
        
        # Pagination parameters
        page_size = request.query_params.get('page_size', 10)
        
        from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
        paginator = Paginator(queryset, page_size)
        page = request.query_params.get('page')

        try:
            stocks_page = paginator.page(page or 1)
        except PageNotAnInteger:
            stocks_page = paginator.page(1)
        except EmptyPage:
            stocks_page = paginator.page(paginator.num_pages)

        serializer = self.get_serializer(stocks_page, many=True)
        
        from apps.users.utils import get_success_response
        return get_success_response({
            'stocks': serializer.data,
            'pagination': {
                'total_count': paginator.count,
                'total_pages': paginator.num_pages,
                'current_page': stocks_page.number,
                'page_size': int(page_size)
            }
        })

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder stocks. Expects {'items': [{'id': 1, 'order': 0}, ...]}
        """
        items = request.data.get('items', [])
        if not items:
            return Response({'error': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Bulk update could be better, but simple loop for now
        for item in items:
            item_id = item.get('id')
            new_order = item.get('order')
            if item_id is not None and new_order is not None:
                UserStock.objects.filter(id=item_id, user=request.user).update(order=new_order)
                
        return Response({'status': 'success'})
