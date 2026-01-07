class ForceCorsMiddleware:
    """
    Middleware to forcefully add CORS headers to every response.
    This acts as a 'sledgehammer' fix when standard libraries fail.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Get the Origin from the request
        origin = request.META.get('HTTP_ORIGIN')
        
        if not origin:
            # Fallback to Referer host if Origin is missing (common in some clients)
            referer = request.META.get('HTTP_REFERER')
            if referer:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(referer)
                    origin = f"{parsed.scheme}://{parsed.netloc}"
                except:
                    pass

        if origin:
            # allow the specific origin (required if credentials=true)
            response["Access-Control-Allow-Origin"] = origin
        else:
            # fallback to * if no origin
            response["Access-Control-Allow-Origin"] = "*"

        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        
        # Dynamic Headers: Echo what the client asks for to avoid missing header errors
        requested_headers = request.META.get('HTTP_ACCESS_CONTROL_REQUEST_HEADERS', '')
        if requested_headers:
             response["Access-Control-Allow-Headers"] = requested_headers
        else:
             response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRFToken, sentry-trace, baggage, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform, Accept, Origin"
        
        response["Access-Control-Allow-Credentials"] = "true"
        
        # Handle OPTIONS requests (Preflight) directly
        if request.method == "OPTIONS":
            response.status_code = 200
            response.content = b""

        return response
