# apps/checkins/models.py
import uuid
from django.db import models
from django.conf import settings


class CheckIn(models.Model):
    """
    Audit log of every scan attempt — successful or not.

    WHY LOG FAILED ATTEMPTS TOO?
    - Detect fraud: same QR tried at multiple gates
    - Support: "I was denied entry but I have a valid ticket"
    - Security: brute force QR scanning attempts

    This is an append-only log. Never delete check-in records.
    """
    class Result(models.TextChoices):
        SUCCESS         = 'success',         'Success'
        ALREADY_USED    = 'already_used',    'Already Used'
        INVALID_TICKET  = 'invalid_ticket',  'Invalid Ticket'
        WRONG_EVENT     = 'wrong_event',     'Wrong Event'
        EXPIRED         = 'expired',         'Expired'
        CANCELLED       = 'cancelled',       'Ticket Cancelled'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket      = models.ForeignKey(
                    'tickets.Ticket',
                    on_delete=models.PROTECT,
                    related_name='checkins',
                    null=True, blank=True       # Null if QR code was completely invalid
                  )
    scanned_by  = models.ForeignKey(
                    settings.AUTH_USER_MODEL,
                    on_delete=models.PROTECT,
                    related_name='checkins_performed',
                    null=True, blank=True
                  )
    scanned_uuid = models.CharField(max_length=100)  # Raw value from QR code
    result       = models.CharField(max_length=30, choices=Result.choices)
    notes        = models.TextField(blank=True)
    scanned_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tixora_checkins'
        ordering = ['-scanned_at']

    def __str__(self):
        return f"CheckIn {self.scanned_at.strftime('%d %b %Y %H:%M')} — {self.result}"