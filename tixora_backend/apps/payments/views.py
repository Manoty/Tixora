from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from throttles import PaymentRateThrottle
from orders.models import Order
from .serializers import PaymentInitiationSerializer

User = get_user_model()


class InitiatePaymentView(APIView):
    """
    POST /api/v1/payments/initiate/
    Initiates an STK Push for payment via Safaricom M-Pesa.
    Requires authenticated user and valid order ID.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [PaymentRateThrottle]

    def post(self, request):
        serializer = PaymentInitiationSerializer(data=request.data)
        if serializer.is_valid():
            order_id = serializer.validated_data.get('order_id')
            phone = serializer.validated_data.get('phone')
            
            try:
                order = Order.objects.get(id=order_id, user=request.user)
            except Order.DoesNotExist:
                return Response(
                    {'error': 'Order not found or does not belong to you.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # TODO: Implement STK Push logic with Safaricom M-Pesa API
            return Response({
                'message': 'Payment initiated. Please complete the prompt on your phone.',
                'order_id': str(order.id),
                'amount': float(order.total_price),
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)