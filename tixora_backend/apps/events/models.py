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