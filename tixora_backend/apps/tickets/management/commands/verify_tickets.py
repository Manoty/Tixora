# apps/tickets/management/commands/verify_tickets.py
from django.core.management.base import BaseCommand
from apps.orders.models import Order, OrderItem
from apps.tickets.models import Ticket


class Command(BaseCommand):
    help = 'Verify ticket counts match order items for all confirmed orders'

    def handle(self, *args, **kwargs):
        issues  = 0
        checked = 0

        confirmed_orders = Order.objects.filter(
            status=Order.Status.CONFIRMED
        ).prefetch_related('items', 'tickets')

        for order in confirmed_orders:
            checked += 1
            expected = sum(item.quantity for item in order.items.all())
            actual   = order.tickets.filter(
                status__in=[Ticket.Status.ACTIVE, Ticket.Status.USED]
            ).count()

            if expected != actual:
                issues += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Mismatch — Order {order.reference}: '
                        f'expected {expected} tickets, found {actual}'
                    )
                )
                # Auto-fix: regenerate missing tickets
                if actual < expected:
                    from apps.tickets.services import TicketService
                    # Delete and regenerate
                    order.tickets.all().delete()
                    try:
                        TicketService.generate_tickets_for_order(order)
                        self.stdout.write(
                            self.style.WARNING(
                                f'   🔧 Regenerated tickets for {order.reference}'
                            )
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'   Failed to fix: {e}')
                        )

        if issues == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ All {checked} confirmed orders have correct ticket counts.'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  Found {issues} issue(s) across {checked} orders.'
                )
            )