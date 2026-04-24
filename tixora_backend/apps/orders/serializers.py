# apps/orders/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Order, OrderItem
from apps.events.models import TicketType
from apps.events.serializers import TicketTypeSerializer

User = get_user_model()


class OrderItemInputSerializer(serializers.Serializer):
    """
    Validates a single line item in the order request.
    This is input-only — not a ModelSerializer.
    """
    ticket_type_id = serializers.UUIDField()
    quantity       = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        return value


class CreateOrderSerializer(serializers.Serializer):
    """
    Input serializer for creating an order.
    Accepts a list of ticket type + quantity pairs.

    Example input:
    {
      "items": [
        {"ticket_type_id": "uuid-here", "quantity": 2},
        {"ticket_type_id": "uuid-here", "quantity": 1}
      ]
    }
    """
    items = OrderItemInputSerializer(many=True, min_length=1)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('Order must contain at least one item.')

        # Check for duplicate ticket types in same order
        type_ids = [str(item['ticket_type_id']) for item in items]
        if len(type_ids) != len(set(type_ids)):
            raise serializers.ValidationError(
                'Duplicate ticket types in order. Combine quantities instead.'
            )
        return items


class OrderItemSerializer(serializers.ModelSerializer):
    """Read serializer for order line items."""
    ticket_type_name  = serializers.CharField(source='ticket_type.name', read_only=True)
    event_title       = serializers.CharField(
                          source='ticket_type.event.title', read_only=True
                        )
    event_id          = serializers.CharField(
                          source='ticket_type.event.id', read_only=True
                        )
    subtotal          = serializers.ReadOnlyField()

    class Meta:
        model  = OrderItem
        fields = [
            'id', 'ticket_type', 'ticket_type_name',
            'event_title', 'event_id',
            'quantity', 'price_at_purchase', 'subtotal',
        ]


class OrderSerializer(serializers.ModelSerializer):
    """Full order detail serializer."""
    items            = OrderItemSerializer(many=True, read_only=True)
    customer_email   = serializers.CharField(source='customer.email',     read_only=True)
    customer_name    = serializers.CharField(
                         source='customer.get_full_name', read_only=True
                       )
    payment_status   = serializers.SerializerMethodField()
    minutes_to_expiry = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = [
            'id', 'reference', 'status',
            'total_amount', 'customer_email', 'customer_name',
            'items', 'payment_status',
            'reserved_until', 'minutes_to_expiry',
            'confirmed_at', 'created_at',
        ]

    def get_payment_status(self, obj):
        """Return the latest payment attempt status."""
        latest = obj.payments.order_by('-initiated_at').first()
        return latest.status if latest else None

    def get_minutes_to_expiry(self, obj):
        """How many minutes until the reservation expires."""
        if not obj.reserved_until:
            return None
        from django.utils import timezone
        delta = obj.reserved_until - timezone.now()
        minutes = int(delta.total_seconds() / 60)
        return max(0, minutes)