# apps/tickets/management/commands/generate_tickets.py
from django.core.management.base import BaseCommand
from apps.orders.models import Order
from apps.tickets.services import TicketService


class Command(BaseCommand):
    help = 'Generate tickets for all confirmed orders that have none'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reference',
            type=str,
            help='Generate tickets for a specific order reference only',
        )

    def handle(self, *args, **options):
        reference = options.get('reference')

        if reference:
            orders = Order.objects.filter(
                reference=reference,
                status=Order.Status.CONFIRMED
            )
        else:
            # Find confirmed orders with no tickets
            from apps.tickets.models import Ticket
            orders_with_tickets = Ticket.objects.values_list(
                'order_id', flat=True
            ).distinct()
            orders = Order.objects.filter(
                status=Order.Status.CONFIRMED
            ).exclude(id__in=orders_with_tickets)

        if not orders.exists():
            self.stdout.write(self.style.WARNING('No eligible orders found.'))
            return

        total_generated = 0
        for order in orders:
            try:
                tickets = TicketService.generate_tickets_for_order(order)
                total_generated += len(tickets)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ {order.reference} → {len(tickets)} ticket(s) generated'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ {order.reference} → Failed: {e}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎟️  Total tickets generated: {total_generated}'
            )
        )