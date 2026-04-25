# apps/tickets/views.py
import logging
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsOrganizerOrAdmin
from apps.orders.models import Order
from .models import Ticket
from .serializers import TicketSerializer, TicketListSerializer
from .services import TicketService

logger = logging.getLogger(__name__)


class CustomerTicketListView(APIView):
    """
    GET /api/v1/tickets/my/
    Customer views all their tickets across all events.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = Ticket.objects.filter(
            owner=request.user
        ).select_related(
            'ticket_type__event',
            'order',
        ).order_by('-issued_at')

        # Filter by status
        ticket_status = request.query_params.get('status')
        if ticket_status:
            tickets = tickets.filter(status=ticket_status)

        serializer = TicketListSerializer(
            tickets, many=True, context={'request': request}
        )
        return Response({
            'count':   tickets.count(),
            'tickets': serializer.data,
        })


class CustomerTicketDetailView(APIView):
    """
    GET /api/v1/tickets/<ticket_uuid>/
    Customer views a single ticket with full QR code.
    This is the "show ticket at gate" view.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_uuid):
        ticket = get_object_or_404(
            Ticket.objects.select_related(
                'ticket_type__event',
                'order',
                'owner',
            ),
            ticket_uuid=ticket_uuid,
            owner=request.user  # Can only view own tickets
        )
        serializer = TicketSerializer(ticket, context={'request': request})
        return Response(serializer.data)


class OrderTicketsView(APIView):
    """
    GET /api/v1/tickets/order/<reference>/
    Get all tickets for a specific order.
    Used after payment to show the customer all their tickets.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        order = get_object_or_404(
            Order,
            reference=reference,
            customer=request.user
        )

        if order.status != Order.Status.CONFIRMED:
            return Response(
                {'error': 'Tickets are only available for confirmed orders.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tickets = Ticket.objects.filter(
            order=order
        ).select_related(
            'ticket_type__event',
            'order',
            'owner',
        )

        serializer = TicketSerializer(
            tickets, many=True, context={'request': request}
        )
        return Response({
            'order_reference': order.reference,
            'count':           tickets.count(),
            'tickets':         serializer.data,
        })


class RegenerateTicketsView(APIView):
    """
    POST /api/v1/tickets/regenerate/<reference>/
    Admin-only: regenerate tickets for a confirmed order.
    Use case: original QR codes were compromised or corrupted.
    """
    permission_classes = [IsOrganizerOrAdmin]

    def post(self, request, reference):
        order = get_object_or_404(Order, reference=reference)

        if order.status != Order.Status.CONFIRMED:
            return Response(
                {'error': 'Can only regenerate tickets for confirmed orders.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete existing tickets (QR codes will be regenerated with new UUIDs)
        existing = Ticket.objects.filter(order=order)
        count    = existing.count()

        if count > 0:
            # Delete QR code files from storage
            for ticket in existing:
                if ticket.qr_code:
                    ticket.qr_code.delete(save=False)
            existing.delete()
            logger.warning(
                f"[Tixora-Tickets] Admin {request.user.email} deleted "
                f"{count} tickets for order {reference} — regenerating."
            )

        try:
            tickets = TicketService.generate_tickets_for_order(order)
            serializer = TicketSerializer(
                tickets, many=True, context={'request': request}
            )
            return Response({
                'message': f'Regenerated {len(tickets)} ticket(s) for {reference}.',
                'tickets': serializer.data,
            })
        except Exception as e:
            logger.error(f"[Tixora-Tickets] Regeneration failed: {e}")
            return Response(
                {'error': 'Ticket regeneration failed. Check logs.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )