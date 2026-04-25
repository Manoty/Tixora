# apps/payments/serializers.py
import re
from rest_framework import serializers
from .models import Payment


class InitiatePaymentSerializer(serializers.Serializer):
    """
    Input for initiating an STK Push.
    phone_number can differ from registered phone
    (e.g. paying with a different line).
    """
    order_reference = serializers.CharField()
    phone_number    = serializers.CharField()

    def validate_phone_number(self, value):
        phone = value.strip().replace(' ', '').replace('-', '')
        if phone.startswith('+254'):
            phone = phone[1:]
        elif phone.startswith('0'):
            phone = '254' + phone[1:]
        pattern = r'^254[71]\d{8}$'
        if not re.match(pattern, phone):
            raise serializers.ValidationError(
                'Enter a valid Kenyan phone number. e.g. 0712345678'
            )
        return phone


class PaymentStatusSerializer(serializers.ModelSerializer):
    """Read serializer for payment status polling."""
    order_reference = serializers.CharField(source='order.reference', read_only=True)

    class Meta:
        model  = Payment
        fields = [
            'id', 'order_reference', 'provider', 'status',
            'phone_number', 'amount',
            'checkout_request_id', 'mpesa_receipt',
            'result_code', 'result_description',
            'initiated_at', 'completed_at',
        ]
        read_only_fields = fields