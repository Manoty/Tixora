from apps.orders.models import Order
from django.utils import timezone

order = Order.objects.filter(status='reserved').last()

if order:
    order.status = Order.Status.CONFIRMED
    order.confirmed_at = timezone.now()
    order.save()

    print(f"Confirmed: {order.reference}")
    print(f"Total: {order.total_amount}")
    print(f"Items: {order.items.count()}")

    for item in order.items.all():
        print(f"{item.quantity}x {item.ticket_type.name} @ KES {item.price_at_purchase}")
else:
    print("No reserved orders found")