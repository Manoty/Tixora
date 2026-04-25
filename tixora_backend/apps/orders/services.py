# apps/orders/services.py
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.events.models import TicketType
from .models import Order, OrderItem
from .utils import generate_order_reference, get_reservation_expiry


class OrderService:
    """
    Handles all order creation logic with proper concurrency control.

    WHY A SERVICE CLASS?
    - Business logic doesn't belong in views (too coupled to HTTP)
    - Doesn't belong in models (too much responsibility)
    - Service layer is independently testable
    - Can be called from views, management commands, or celery tasks
    """

    @staticmethod
    @transaction.atomic
    def create_order(customer, items_data):
        """
        Create an order with reserved tickets.

        CONCURRENCY STRATEGY:
        1. Lock TicketType rows with select_for_update()
        2. Validate availability AFTER locking
        3. Increment quantity_sold WITHIN the same transaction
        4. If anything fails → entire transaction rolls back

        select_for_update() tells PostgreSQL:
        "Lock these rows until my transaction commits."
        Any other transaction trying to lock the same rows
        will WAIT — not fail, not read stale data. WAIT.
        This guarantees exactly-once inventory deduction.
        """

        # ── Step 1: Collect all ticket type IDs from request ──────────────
        ticket_type_ids = [item['ticket_type_id'] for item in items_data]

        # ── Step 2: Lock the rows — this is the critical section ──────────
        # select_for_update() acquires a row-level exclusive lock.
        # Other transactions touching these rows will queue behind us.
        # nowait=False (default) means: wait for the lock, don't fail fast.
        ticket_types = TicketType.objects.select_for_update().filter(
            id__in=ticket_type_ids
        )

        # Build a lookup dict for fast access
        ticket_type_map = {str(tt.id): tt for tt in ticket_types}

        # ── Step 3: Validate each item ────────────────────────────────────
        errors = []
        validated_items = []

        for item_data in items_data:
            tt_id    = str(item_data['ticket_type_id'])
            quantity = item_data['quantity']

            # Does the ticket type exist?
            if tt_id not in ticket_type_map:
                errors.append(f'Ticket type {tt_id} not found.')
                continue

            tt = ticket_type_map[tt_id]

            # Is the event published?
            if tt.event.status != 'published':
                errors.append(f'"{tt.event.title}" is not currently on sale.')
                continue

            # Is the event cancelled?
            if tt.event.status == 'cancelled':
                errors.append(
                    f'"{tt.event.title}" has been cancelled. '
                    f'Please contact the organizer for refund information.'
                )
                continue

            # Has the event already ended?
            if tt.event.end_date < timezone.now():
                errors.append(f'"{tt.event.title}" has already ended.')
                continue

            # Is the ticket type active and on sale?
            if not tt.is_active:
                errors.append(f'"{tt.name}" tickets are not available.')
                continue

            # Does the customer want too many at once?
            if quantity > tt.max_per_order:
                errors.append(
                    f'Maximum {tt.max_per_order} "{tt.name}" tickets per order.'
                )
                continue

            # Are enough tickets available?
            # We check AFTER locking — so this is the true available count
            available = tt.total_quantity - tt.quantity_sold
            if quantity > available:
                if available == 0:
                    errors.append(f'"{tt.name}" tickets are sold out.')
                else:
                    errors.append(
                        f'Only {available} "{tt.name}" ticket(s) remaining.'
                    )
                continue

            validated_items.append({
                'ticket_type': tt,
                'quantity':    quantity,
                'price':       tt.price,   # Snapshot current price
            })    

        if errors:
            raise ValidationError({'items': errors})

        # ── Step 4: Create the Order ───────────────────────────────────────
        # Generate a unique reference — retry if collision (extremely rare)
        reference = generate_order_reference()
        while Order.objects.filter(reference=reference).exists():
            reference = generate_order_reference()

        order = Order.objects.create(
            customer       = customer,
            status         = Order.Status.RESERVED,
            reference      = reference,
            reserved_until = get_reservation_expiry(),
        )

        # ── Step 5: Create OrderItems + Deduct Inventory ──────────────────
        total_amount = 0

        for item in validated_items:
            tt       = item['ticket_type']
            quantity = item['quantity']
            price    = item['price']

            # Create the line item — price snapshot is critical
            OrderItem.objects.create(
                order             = order,
                ticket_type       = tt,
                quantity          = quantity,
                price_at_purchase = price,
            )

            # Deduct from inventory — WITHIN the locked transaction
            # F() expression: DB-level increment, avoids race conditions
            # even with select_for_update this is best practice
            from django.db.models import F
            TicketType.objects.filter(id=tt.id).update(
                quantity_sold=F('quantity_sold') + quantity
            )

            total_amount += quantity * price

        # ── Step 6: Set Order Total ────────────────────────────────────────
        order.total_amount = total_amount
        order.save(update_fields=['total_amount'])

        return order

    @staticmethod
    @transaction.atomic
    def cancel_order(order):
        """
        Cancel a pending/reserved order and release inventory.

        Can be called by:
        - Customer cancelling before payment
        - Cleanup task when reservation expires
        """
        if order.status not in [Order.Status.PENDING, Order.Status.RESERVED]:
            raise ValidationError(
                f'Cannot cancel an order with status: {order.status}'
            )

        from django.db.models import F

        # Release inventory for each item
        for item in order.items.select_related('ticket_type').all():
            TicketType.objects.filter(id=item.ticket_type.id).update(
                quantity_sold=F('quantity_sold') - item.quantity
            )

        order.status = Order.Status.CANCELLED
        order.save(update_fields=['status', 'updated_at'])

        return order