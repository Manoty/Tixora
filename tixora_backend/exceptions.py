# tixora_backend/exceptions.py
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def tixora_exception_handler(exc, context):
    """
    Custom exception handler for consistent API error responses.

    Every error from Tixora follows this shape:
    {
        "error":   "Human-readable message",
        "code":    "machine_readable_code",
        "details": { ... }   ← optional field-level errors
    }

    WHY CONSISTENT ERROR SHAPES?
    The React frontend can handle any error with one pattern.
    No more: is it data.error? data.detail? data.message? data.non_field_errors?
    """
    # Let DRF handle it first
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            'error':   _get_error_message(response.data),
            'code':    _get_error_code(response.status_code),
            'details': response.data if isinstance(response.data, dict) else {},
        }

        # Log server errors
        if response.status_code >= 500:
            logger.error(
                f"[Tixora-Error] 500 in {context['view'].__class__.__name__}: "
                f"{exc}",
                exc_info=True
            )

        response.data = error_data

    return response


def _get_error_message(data):
    """Extract a clean string message from DRF error data."""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return str(data[0]) if data else 'An error occurred.'
    if isinstance(data, dict):
        # Try common keys
        for key in ['detail', 'error', 'message', 'non_field_errors']:
            if key in data:
                val = data[key]
                return str(val[0]) if isinstance(val, list) else str(val)
        # Take first field error
        first_key = next(iter(data))
        val = data[first_key]
        return f"{first_key}: {val[0] if isinstance(val, list) else val}"
    return 'An unexpected error occurred.'


def _get_error_code(status_code):
    codes = {
        400: 'bad_request',
        401: 'unauthorized',
        403: 'forbidden',
        404: 'not_found',
        405: 'method_not_allowed',
        409: 'conflict',
        429: 'rate_limited',
        500: 'server_error',
    }
    return codes.get(status_code, 'error')