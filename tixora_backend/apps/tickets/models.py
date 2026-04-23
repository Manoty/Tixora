# apps/tickets/models.py
import uuid
from django.db import models
from django.conf import settings


class Ticket(models.Model):
    """
    A single issued ticket — ONE row per attendee seat.

    GENERATED ONLY AFTER PAYMENT IS CONFIRMED.
    Why? Prevents QR codes existing for unpaid orders.

    The QR code encodes only `ticket_uuid` — a random UUID.
    The scanner hits our API with that UUID to validate.
    We NEVER encode price, name, or event data in the QR —
    those can be forged. Only the UUID matters, and it's validated server-side.
    """
    class Status(models.TextChoices):
        ACTIVE   = 'active',   'Active'
        USED     = 'used',     'Used'       # Scanned at entry
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED  = 'refunded',  'Refunded'

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order        = models.ForeignKey(
                     'orders.Order',
                     on_delete=models.PROTECT,
                     related_name='tickets'
                   )
    order_item   = models.ForeignKey(
                     'orders.OrderItem',
                     on_delete=models.PROTECT,
                     related_name='tickets'
                   )
    ticket_type  = models.ForeignKey(
                     'events.TicketType',
                     on_delete=models.PROTECT,
                     related_name='tickets'
                   )
    owner        = models.ForeignKey(
                     settings.AUTH_USER_MODEL,
                     on_delete=models.PROTECT,
                     related_name='tickets'
                   )

    ticket_uuid  = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    qr_code      = models.ImageField(upload_to='tickets/qr_codes/', blank=True, null=True)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    issued_at    = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tixora_tickets'
        ordering = ['-issued_at']

    def __str__(self):
        return f"Ticket {self.ticket_uuid} — {self.ticket_type.name} [{self.status}]"

    @property
    def event(self):
        return self.ticket_type.event

    @property
    def is_valid(self):
        """A ticket is valid if active and event hasn't ended."""
        from django.utils import timezone
        return (
            self.status == self.Status.ACTIVE and
            self.event.end_date > timezone.now()
        )