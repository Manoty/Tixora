# apps/checkins/serializers.py
from rest_framework import serializers
from .models import CheckIn


class ScanTicketSerializer(serializers.Serializer):
    """
    Input for a QR scan.
    The scanner sends only the UUID string decoded from the QR.
    Optionally includes the event_id to catch wrong-event scans.
    """
    ticket_uuid = serializers.CharField(max_length=100)
    event_id    = serializers.UUIDField(required=False, allow_null=True)


class CheckInSerializer(serializers.ModelSerializer):
    """Full check-in record — for audit logs and organizer dashboard."""
    ticket_uuid      = serializers.CharField(source='ticket.ticket_uuid',          read_only=True)
    ticket_type      = serializers.CharField(source='ticket.ticket_type.name',     read_only=True)
    event_title      = serializers.CharField(source='ticket.ticket_type.event.title', read_only=True)
    owner_name       = serializers.CharField(source='ticket.owner.get_full_name',  read_only=True)
    owner_email      = serializers.CharField(source='ticket.owner.email',          read_only=True)
    scanned_by_email = serializers.CharField(source='scanned_by.email',            read_only=True)

    class Meta:
        model  = CheckIn
        fields = [
            'id', 'ticket_uuid', 'ticket_type', 'event_title',
            'owner_name', 'owner_email',
            'scanned_by_email', 'scanned_uuid',
            'result', 'notes', 'scanned_at',
        ]


class ScanResultSerializer(serializers.Serializer):
    """
    Response after a scan attempt.
    Designed for fast reading on a mobile scanner screen.
    Green light / Red light — the gate operator needs clarity instantly.
    """
    result       = serializers.CharField()   # success / already_used / invalid / etc.
    admitted     = serializers.BooleanField()
    message      = serializers.CharField()
    ticket_info  = serializers.DictField(required=False)