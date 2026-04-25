# apps/tickets/serializers.py
from rest_framework import serializers
from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    """
    Full ticket detail — what the customer sees.
    Includes everything needed to display the ticket card + QR.
    """
    event_title    = serializers.CharField(
                       source='ticket_type.event.title',
                       read_only=True
                     )
    event_date     = serializers.DateTimeField(
                       source='ticket_type.event.start_date',
                       read_only=True
                     )
    event_venue    = serializers.CharField(
                       source='ticket_type.event.venue',
                       read_only=True
                     )
    event_city     = serializers.CharField(
                       source='ticket_type.event.city',
                       read_only=True
                     )
    ticket_type_name = serializers.CharField(
                         source='ticket_type.name',
                         read_only=True
                       )
    owner_name     = serializers.CharField(
                       source='owner.get_full_name',
                       read_only=True
                     )
    owner_email    = serializers.CharField(
                       source='owner.email',
                       read_only=True
                     )
    order_reference = serializers.CharField(
                        source='order.reference',
                        read_only=True
                      )
    qr_code_url    = serializers.SerializerMethodField()
    is_valid       = serializers.ReadOnlyField()

    class Meta:
        model  = Ticket
        fields = [
            'id', 'ticket_uuid',
            'event_title', 'event_date', 'event_venue', 'event_city',
            'ticket_type_name', 'owner_name', 'owner_email',
            'order_reference', 'status', 'is_valid',
            'qr_code_url', 'issued_at',
        ]

    def get_qr_code_url(self, obj):
        """Return absolute URL to the QR code image."""
        request = self.context.get('request')
        if obj.qr_code and request:
            return request.build_absolute_uri(obj.qr_code.url)
        return None


class TicketListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing tickets."""
    event_title      = serializers.CharField(
                         source='ticket_type.event.title',
                         read_only=True
                       )
    event_date       = serializers.DateTimeField(
                         source='ticket_type.event.start_date',
                         read_only=True
                       )
    ticket_type_name = serializers.CharField(
                         source='ticket_type.name',
                         read_only=True
                       )
    qr_code_url      = serializers.SerializerMethodField()

    class Meta:
        model  = Ticket
        fields = [
            'id', 'ticket_uuid', 'event_title',
            'event_date', 'ticket_type_name',
            'status', 'qr_code_url', 'issued_at',
        ]

    def get_qr_code_url(self, obj):
        request = self.context.get('request')
        if obj.qr_code and request:
            return request.build_absolute_uri(obj.qr_code.url)
        return None