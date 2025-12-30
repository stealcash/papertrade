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

        # Create a map of id -> new_order
        order_map = {item['id']: item['order'] for item in items if 'id' in item and 'order' in item}
        
        if not order_map:
            return Response({'status': 'success'})

        # Fetch valid instances for this user
        instances = UserStock.objects.filter(id__in=order_map.keys(), user=request.user)
        
        # Update instances in memory
        to_update = []
        for instance in instances:
            if instance.id in order_map:
                instance.order = order_map[instance.id]
                to_update.append(instance)
        
        # Perform bulk update
        if to_update:
            UserStock.objects.bulk_update(to_update, ['order'])
                
        return Response({'status': 'success'})

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Bulk add/remove stocks.
        Expects: {'add': [stock_id, ...], 'remove': [stock_id, ...]}
        """
        add_ids = request.data.get('add', [])
        remove_ids = request.data.get('remove', [])
        
        user = request.user
        
        # Process Removals
        if remove_ids:
            # We filter by stock_id because frontend might send stock IDs not user_stock IDs in this logic
            UserStock.objects.filter(user=user, stock_id__in=remove_ids).delete()
            
        # Process Additions
        if add_ids:
            for stock_id in add_ids:
                # Use get_or_create to avoid duplicates
                if stock_id:
                    UserStock.objects.get_or_create(user=user, stock_id=stock_id)
        
        return Response({'status': 'success', 'message': 'Watchlist updated'})
