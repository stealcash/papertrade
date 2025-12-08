from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import date

from .models import Option5Min
from .serializers import (
    Option5MinSerializer,
    OptionContractSerializer,
    OptionCandlesRequestSerializer,
    OptionCandlesResponseSerializer
)
from apps.users.utils import get_success_response, get_error_response


class OptionContractListView(generics.ListAPIView):
    """
    List option contracts with filtering.
    
    Query params:
    - underlying_type: stock or sector
    - underlying: symbol (e.g. RELIANCE, NIFTY50)
    - expiry_date: YYYY-MM-DD
    - option_type: CE or PE
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = Option5MinSerializer
    
    def get_queryset(self):
        queryset = Option5Min.objects.all()
        
        # Apply filters
        underlying_type = self.request.query_params.get('underlying_type')
        underlying = self.request.query_params.get('underlying')
        expiry_date = self.request.query_params.get('expiry_date')
        option_type = self.request.query_params.get('option_type')
        
        if underlying_type:
            queryset = queryset.filter(underlying_type=underlying_type)
        if underlying:
            queryset = queryset.filter(underlying_symbol=underlying)
        if expiry_date:
            queryset = queryset.filter(expiry_date=expiry_date)
        if option_type:
            queryset = queryset.filter(option_type=option_type)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response(
            get_success_response(
                data=serializer.data,
                message=f"Retrieved {len(serializer.data)} option contracts"
            )
        )


class OptionCandlesView(APIView):
    """
    Get 5-minute candles for a specific option contract.
    
    Query params:
    - underlying_type: stock or sector
    - underlying: symbol
    - expiry_date: YYYY-MM-DD
    - option_type: CE or PE
    - strike: strike price
    - date: (optional) specific date for candles, defaults to today
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Validate request
        request_serializer = OptionCandlesRequestSerializer(data=request.query_params)
        if not request_serializer.is_valid():
            return Response(
                get_error_response(
                    code='INVALID_PARAMETERS',
                    message='Invalid request parameters',
                    details=request_serializer.errors
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = request_serializer.validated_data
        
        # Find the option contract
        try:
            option = Option5Min.objects.get(
                underlying_type=validated_data['underlying_type'],
                underlying_symbol=validated_data['underlying_symbol'],
                expiry_date=validated_data['expiry_date'],
                option_type=validated_data['option_type'],
                option_strike=validated_data['strike']
            )
        except Option5Min.DoesNotExist:
            return Response(
                get_error_response(
                    code='CONTRACT_NOT_FOUND',
                    message='Option contract not found',
                    details={'requested': validated_data}
                ),
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prepare response
        contract_data = {
            'underlying_type': option.underlying_type,
            'underlying_symbol': option.underlying_symbol,
            'expiry_date': option.expiry_date,
            'option_type': option.option_type,
            'option_strike': option.option_strike,
            'contract_identifier': option.contract_identifier
        }
        
        response_data = {
            'contract': contract_data,
            'date': validated_data.get('date', date.today()),
            'candles': option.candles_json
        }
        
        return Response(
            get_success_response(
                data=response_data,
                message='Option candles retrieved successfully'
            )
        )


class OptionContractDetailView(generics.RetrieveAPIView):
    """Get details of a specific option contract by ID."""
    
    permission_classes = [IsAuthenticated]
    queryset = Option5Min.objects.all()
    serializer_class = Option5MinSerializer
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response(
            get_success_response(
                data=serializer.data,
                message='Option contract details retrieved'
            )
        )
