# apps/payments/views.py
import json
import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .serializers import InitiatePaymentSerializer, PaymentStatusSerializer
from .services import PaymentService

logger = logging.getLogger(__name__)


class InitiatePaymentView(APIView):
    """
    POST /api/v1/payments/initiate/
    Customer initiates M-Pesa STK Push for a reserved order.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiatePaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = PaymentService.initiate_mpesa_payment(
                customer        = request.user,
                order_reference = serializer.validated_data['order_reference'],
                phone_number    = serializer.validated_data['phone_number'],
            )
            return Response({
                'message':             'STK Push sent! Check your phone for the M-Pesa prompt.',
                'payment_id':          str(payment.id),
                'checkout_request_id': payment.checkout_request_id,
                'amount':              str(payment.amount),
                'phone':               payment.phone_number,
                'status':              payment.status,
            }, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"[Tixora-Payment] Unexpected error: {e}", exc_info=True)
            return Response(
                {'error': 'Payment initiation failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MpesaCallbackView(APIView):
    """
    POST /api/v1/payments/mpesa/callback/

    Receives async payment results from Safaricom.

    SECURITY NOTES:
    1. This endpoint is PUBLIC — Safaricom doesn't send auth headers
    2. We authenticate by matching checkout_request_id (only we know this)
    3. In production: whitelist Safaricom IP ranges at nginx/firewall level
    4. NEVER require JWT auth here — Safaricom can't send tokens

    ALWAYS return HTTP 200 — even on errors.
    Non-200 causes Safaricom to retry indefinitely.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info(
            f"[Tixora-Callback] Received M-Pesa callback: "
            f"{json.dumps(request.data, indent=2)}"
        )

        result = PaymentService.process_mpesa_callback(request.data)

        # ALWAYS return 200 to Safaricom
        return Response(
            {'ResultCode': 0, 'ResultDesc': 'Accepted'},
            status=status.HTTP_200_OK
        )


class PaymentStatusView(APIView):
    """
    GET /api/v1/payments/status/<order_reference>/

    Frontend polls this to check if payment succeeded.
    React will call this every 3 seconds after showing the STK prompt.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, order_reference):
        try:
            payment = PaymentService.poll_payment_status(
                customer        = request.user,
                order_reference = order_reference,
            )
            serializer = PaymentStatusSerializer(payment)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)


class PaymentHistoryView(APIView):
    """
    GET /api/v1/payments/history/
    Customer views their payment history.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Payment
        payments = Payment.objects.filter(
            order__customer=request.user
        ).select_related('order').order_by('-initiated_at')

        serializer = PaymentStatusSerializer(payments, many=True)
        return Response({
            'count':    payments.count(),
            'payments': serializer.data,
        })