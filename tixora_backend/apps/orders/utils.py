# apps/orders/utils.py
import random
import string
from django.utils import timezone
from datetime import timedelta


def generate_order_reference():
    """
    Generate a human-readable unique order reference.
    Format: TIX-YYYYMMDD-XXXXXX
    e.g.: TIX-20240915-K7M2NP

    WHY NOT UUID? Customers need to quote this to support.
    'My order is TIX-20240915-K7M2NP' is usable.
    A UUID is not.
    """
    date_part   = timezone.now().strftime('%Y%m%d')
    random_part = ''.join(
        random.choices(string.ascii_uppercase + string.digits, k=6)
    )
    return f"TIX-{date_part}-{random_part}"


def get_reservation_expiry():
    """
    Tickets are held for 15 minutes.
    After this, unreleased orders are cancelled by cleanup.
    """
    return timezone.now() + timedelta(minutes=15)