# tixora_backend/middleware.py
import json
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware:
    """
    Add security headers to every response.
    These protect against common web attacks.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Prevent browsers from sniffing content type
        response['X-Content-Type-Options'] = 'nosniff'

        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'

        # Force HTTPS in production (ignored on HTTP)
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        # Restrict browser features
        response['X-XSS-Protection'] = '1; mode=block'

        # Remove server fingerprint
        response['Server'] = 'Tixora'

        return response


class RequestSizeMiddleware:
    """
    Reject oversized request bodies.
    Prevents memory exhaustion attacks via huge payloads.
    Max: 10MB (generous for image uploads, tight for JSON attacks)
    """
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        content_length = request.META.get('CONTENT_LENGTH')

        if content_length and int(content_length) > self.MAX_UPLOAD_SIZE:
            from django.http import JsonResponse
            logger.warning(
                f"[Tixora-Security] Oversized request from "
                f"{request.META.get('REMOTE_ADDR')}: {content_length} bytes"
            )
            return JsonResponse(
                {'error': 'Request body too large.', 'code': 'payload_too_large'},
                status=413
            )

        return self.get_response(request)