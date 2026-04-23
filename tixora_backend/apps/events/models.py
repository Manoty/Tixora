# apps/events/models.py
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Category(models.Model):
    """Event categories: Music, Tech, Sports, Comedy, etc."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)

    class Meta:
        db_table = 'tixora_categories'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Event(models.Model):
    class Status(models.TextChoices):
        DRAFT      = 'draft',      'Draft'
        PUBLISHED  = 'published',  'Published'
        CANCELLED  = 'cancelled',  'Cancelled'
        COMPLETED  = 'completed',  'Completed'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizer   = models.ForeignKey(
                    settings.AUTH_USER_MODEL,
                    on_delete=models.PROTECT,   # Never delete an organizer with active events
                    related_name='organized_events'
                  )
    category    = models.ForeignKey(
                    Category,
                    on_delete=models.SET_NULL,
                    null=True, blank=True,
                    related_name='events'
                  )

    title       = models.CharField(max_length=200)
    slug        = models.SlugField(unique=True, max_length=220)
    description = models.TextField()
    venue       = models.CharField(max_length=300)
    city        = models.CharField(max_length=100)
    banner      = models.ImageField(upload_to='events/banners/', blank=True, null=True)

    start_date  = models.DateTimeField()
    end_date    = models.DateTimeField()
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tixora_events'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.title} — {self.start_date.strftime('%d %b %Y')}"

    @property
    def is_upcoming(self):
        return self.start_date > timezone.now()

    @property
    def is_on_sale(self):
        return self.status == self.Status.PUBLISHED and self.is_upcoming

    @property
    def total_capacity(self):
        """Sum of all ticket type capacities."""
        return self.ticket_types.aggregate(
            total=models.Sum('total_quantity')
        )['total'] or 0

    @property
    def total_sold(self):
        """Sum of all confirmed sold tickets."""
        return self.ticket_types.aggregate(
            total=models.Sum('quantity_sold')
        )['total'] or 0
        
# apps/events/models.py  (continued — same file)

class TicketType(models.Model):
    """
    Defines a tier of ticket for an event.
    e.g.: Regular (KES 500, 500 seats), VIP (KES 2000, 50 seats)

    WHY SEPARATE FROM TICKET?
    - TicketType is a template/config: price, qty, name
    - Ticket is an issued instance: who owns it, QR code, etc.
    - Separating them prevents data duplication and allows
      price changes without affecting already-issued tickets.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event           = models.ForeignKey(
                        Event,
                        on_delete=models.CASCADE,
                        related_name='ticket_types'
                      )

    name            = models.CharField(max_length=100)        # "VIP", "Regular", "Early Bird"
    description     = models.TextField(blank=True)
    price           = models.DecimalField(max_digits=10, decimal_places=2)
    total_quantity  = models.PositiveIntegerField()
    quantity_sold   = models.PositiveIntegerField(default=0)  # Incremented on confirmed payment
    max_per_order   = models.PositiveIntegerField(default=5)  # Anti-scalping

    sale_start      = models.DateTimeField(null=True, blank=True)
    sale_end        = models.DateTimeField(null=True, blank=True)

    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tixora_ticket_types'
        unique_together = ['event', 'name']  # Can't have two "VIP" tiers for same event

    def __str__(self):
        return f"{self.event.title} — {self.name} (KES {self.price})"

    @property
    def quantity_available(self):
        return self.total_quantity - self.quantity_sold

    @property
    def is_sold_out(self):
        return self.quantity_available <= 0

    @property
    def is_on_sale(self):
        now = timezone.now()
        if self.sale_start and now < self.sale_start:
            return False
        if self.sale_end and now > self.sale_end:
            return False
        return self.is_active and not self.is_sold_out        