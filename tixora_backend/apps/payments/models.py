# apps/payments/models.py
import uuid
from django.db import models


class Payment(models.Model):
    """
    Records every M-Pesa payment attempt.

    WHY NOT JUST A FIELD ON ORDER?
    - User may attempt payment multiple times (network failure, wrong PIN)
    - Each attempt is a separate M-Pesa transaction with its own CheckoutRequestID
    - Storing all attempts enables fraud detection and support investigations
    - The CONFIRMED payment is the one that matches a valid M-Pesa callback
    """
    class Status(models.TextChoices):
        INITIATED = 'initiated', 'Initiated'    # STK Push sent
        PENDING   = 'pending',   'Pending'      # Waiting for callback
        SUCCESS   = 'success',   'Success'      # M-Pesa confirmed
        FAILED    = 'failed',    'Failed'       # User cancelled or timeout
        CANCELLED = 'cancelled', 'Cancelled'

    class Provider(models.TextChoices):
        MPESA = 'mpesa', 'M-Pesa'
        # Future: CARD = 'card', 'Card'  (designed for extensibility)

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order               = models.ForeignKey(
                            'orders.Order',
                            on_delete=models.PROTECT,
                            related_name='payments'
                          )
    provider            = models.CharField(max_length=20, choices=Provider.choices, default=Provider.MPESA)
    status              = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)

    # M-Pesa specific fields
    phone_number        = models.CharField(max_length=15)
    amount              = models.DecimalField(max_digits=10, decimal_places=2)
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True)
    mpesa_receipt       = models.CharField(max_length=50, blank=True, null=True)  # e.g. QJH2XXXXXXX
    result_code         = models.CharField(max_length=10, blank=True, null=True)
    result_description  = models.TextField(blank=True, null=True)

    initiated_at        = models.DateTimeField(auto_now_add=True)
    completed_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tixora_payments'
        ordering = ['-initiated_at']

    def __str__(self):
        return f"Payment {self.id} — {self.status} — KES {self.amount}"