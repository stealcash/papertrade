from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)

class PatternFinderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            symbol = request.data.get('symbol')
            tolerance = request.data.get('tolerance', 0.5)

            if not symbol:
                return Response({"error": "Symbol is required"}, status=400)

            # Call FastAPI
            fastapi_url = settings.FASTAPI_SERVICE_URL
            secret = settings.INTERNAL_API_SECRET
            
            headers = {
                "x-internal-secret": secret,
                "Content-Type": "application/json"
            }
            payload = {
                "symbol": symbol,
                "tolerance": float(tolerance)
            }
            
            response = requests.post(
                f"{fastapi_url}/compute/pattern-finder",
                json=payload,
                headers=headers,
                timeout=30 # Long timeout for heavy compute
            )
            
            if response.status_code == 200:
                return Response(response.json())
            else:
                logger.error(f"FastAPI Pattern Finder failed: {response.text}")
                return Response({"error": "Calculation failed"}, status=500)

        except Exception as e:
            logger.error(f"Pattern Finder Proxy Error: {e}", exc_info=True)
            return Response({"error": str(e)}, status=500)
