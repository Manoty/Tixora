# apps/orders/models.py
import uuid
from django.db import models
from django.conf import settings


class Order(models.Model):
    """
    Represents a customer's purchase intent.

    LIFECYCLE:
    pending → reserved (tickets held) → confirmed (paid) → cancelled

    WHY 'reserved' STATE?
    Tickets are held for N minutes after order creation.
    This prevents: "I'm mid-checkout and someone else buys the last ticket."
    This is how every real ticketing platform works.
    """
    class Status(models.TextChoices):
        PENDING   = 'pending',   'Pending'       # Created, not yet paid
        RESERVED  = 'reserved',  'Reserved'      # Tickets held, awaiting payment
        CONFIRMED = 'confirmed', 'Confirmed'     # Payment successful
        CANCELLED = 'cancelled', 'Cancelled'     # Expired or user cancelled
        REFUNDED  = 'refunded',  'Refunded'      # Post-payment cancellation

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer        = models.ForeignKey(
                        settings.AUTH_USER_MODEL,
                        on_delete=models.PROTECT,
                        related_name='orders'
                      )
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_amount    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reference       = models.CharField(max_length=50, unique=True)  # e.g. TIX-20240115-XXXX

    reserved_until  = models.DateTimeField(null=True, blank=True)   # Ticket hold expiry
    confirmed_at    = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tixora_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.reference} — {self.customer.email}"

    def calculate_total(self):
        """Recompute total from line items."""
        total = sum(item.subtotal for item in self.items.all())
        self.total_amount = total
        self.save(update_fields=['total_amount'])
        return total


class OrderItem(models.Model):
    """
    Line item within an order.
    e.g.: 2x VIP tickets at KES 2,000 each = KES 4,000

    WHY STORE price_at_purchase?
    Prices can change. The customer paid THIS price.
    Never recalculate from current TicketType.price.
    """
    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order             = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    ticket_type       = models.ForeignKey(
                          'events.TicketType',
                          on_delete=models.PROTECT,  # Never delete a type with sold tickets
                          related_name='order_items'
                        )
    quantity          = models.PositiveIntegerField()
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)  # Snapshot of price

    class Meta:
        db_table = 'tixora_order_items'

    def __str__(self):
        return f"{self.quantity}x {self.ticket_type.name} @ KES {self.price_at_purchase}"

    @property
    def subtotal(self):
        return self.quantity * self.price_at_purchase