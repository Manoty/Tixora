# apps/orders/management/commands/expire_reservations.py
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.orders.models import Order
from apps.orders.services import OrderService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Cancel all expired ticket reservations and release inventory'

    def handle(self, *args, **kwargs):
        expired = Order.objects.filter(
            status=Order.Status.RESERVED,
            reserved_until__lt=timezone.now()
        ).prefetch_related('items__ticket_type')

        count  = 0
        errors = 0

        for order in expired:
            try:
                OrderService.cancel_order(order)
                count += 1
                logger.info(
                    f"[Tixora-Cleanup] Expired reservation: {order.reference}"
                )
            except Exception as e:
                errors += 1
                logger.error(
                    f"[Tixora-Cleanup] Failed to expire {order.reference}: {e}"
                )

        msg = f'Released {count} expired reservation(s). Errors: {errors}'
        self.stdout.write(
            self.style.SUCCESS(f'✅ {msg}') if not errors
            else self.style.WARNING(f'⚠️  {msg}')
        )