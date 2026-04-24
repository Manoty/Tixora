# apps/orders/views.py
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from apps.users.permissions import IsOrganizerOrAdmin
from .models import Order
from .serializers import CreateOrderSerializer, OrderSerializer
from .services import OrderService


class CreateOrderView(APIView):
    """
    POST /api/v1/orders/
    Customer creates a new order.
    Tickets are reserved immediately for 15 minutes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = OrderService.create_order(
                customer   = request.user,
                items_data = serializer.validated_data['items']
            )
            return Response(
                OrderSerializer(order).data,
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': 'Unable to create order. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerOrderListView(APIView):
    """
    GET /api/v1/orders/
    Customer views their own orders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(
            customer=request.user
        ).prefetch_related(
            'items__ticket_type__event',
            'payments'
        ).order_by('-created_at')

        # Optional status filter
        order_status = request.query_params.get('status')
        if order_status:
            orders = orders.filter(status=order_status)

        serializer = OrderSerializer(orders, many=True)
        return Response({
            'count':  orders.count(),
            'orders': serializer.data
        })


class CustomerOrderDetailView(APIView):
    """
    GET    /api/v1/orders/<reference>/  — View order detail
    DELETE /api/v1/orders/<reference>/  — Cancel order (pre-payment only)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, request, reference):
        return get_object_or_404(
            Order.objects.prefetch_related(
                'items__ticket_type__event',
                'payments',
                'tickets'
            ),
            reference=reference,
            customer=request.user   # Customers can only see own orders
        )

    def get(self, request, reference):
        order = self.get_object(request, reference)
        return Response(OrderSerializer(order).data)

    def delete(self, request, reference):
        order = self.get_object(request, reference)

        # Can only cancel pending/reserved orders
        if order.status == Order.Status.CONFIRMED:
            return Response(
                {
                    'error': 'Confirmed orders cannot be cancelled here. '
                             'Contact Tixora support for refund assistance.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.status == Order.Status.CANCELLED:
            return Response(
                {'error': 'This order is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            OrderService.cancel_order(order)
            return Response({
                'message': f'Order {order.reference} cancelled. '
                            f'Tickets have been released.'
            })
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)


class ExpireReservationsView(APIView):
    """
    POST /api/v1/orders/expire-reservations/
    Admin/system endpoint to release expired reservations.

    In production this would be called by a scheduled task (Celery beat).
    For now, it can be triggered manually or by a cron job.
    """
    permission_classes = [IsOrganizerOrAdmin]

    def post(self, request):
        expired_orders = Order.objects.filter(
            status=Order.Status.RESERVED,
            reserved_until__lt=timezone.now()
        ).prefetch_related('items__ticket_type')

        count = 0
        errors = []

        for order in expired_orders:
            try:
                OrderService.cancel_order(order)
                count += 1
            except Exception as e:
                errors.append(str(e))

        return Response({
            'message':  f'Expired {count} reservations.',
            'released': count,
            'errors':   errors,
        })


class OrganizerOrderListView(APIView):
    """
    GET /api/v1/orders/event/<event_id>/
    Organizer views all orders for their event.
    """
    permission_classes = [IsOrganizerOrAdmin]

    def get(self, request, event_id):
        from apps.events.models import Event
        from django.shortcuts import get_object_or_404

        # Organizers can only see orders for their own events
        if request.user.role == 'organizer':
            event = get_object_or_404(
                Event, id=event_id, organizer=request.user
            )
        else:
            event = get_object_or_404(Event, id=event_id)

        orders = Order.objects.filter(
            items__ticket_type__event=event
        ).prefetch_related(
            'items__ticket_type',
            'payments',
            'customer'
        ).distinct().order_by('-created_at')

        # Filter by status
        order_status = request.query_params.get('status')
        if order_status:
            orders = orders.filter(status=order_status)

        serializer = OrderSerializer(orders, many=True)
        return Response({
            'event':  event.title,
            'count':  orders.count(),
            'orders': serializer.data,
        })