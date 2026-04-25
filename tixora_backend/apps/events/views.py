# apps/events/views.py
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsOrganizer, IsOrganizerOrAdmin
from .models import Event, TicketType, Category
from .serializers import (
    CategorySerializer,
    EventListSerializer,
    EventDetailSerializer,
    EventWriteSerializer,
    TicketTypeSerializer,
)


# ─── Public / Customer Views ──────────────────────────────────────────────────

class PublicEventListView(APIView):
    """
    GET /api/v1/events/
    Public browsing — no auth required.
    Only returns PUBLISHED events.
    Supports: search, city filter, category filter.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Event.objects.filter(
            status=Event.Status.PUBLISHED
        ).select_related(
            'organizer', 'category'
        ).prefetch_related('ticket_types')

        # Search by title or venue
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(venue__icontains=search) |
                Q(city__icontains=search)
            )

        # Filter by city
        city = request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)

        # Filter by category slug
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        # Filter upcoming only
        upcoming = request.query_params.get('upcoming')
        if upcoming == 'true':
            from django.utils import timezone
            queryset = queryset.filter(start_date__gt=timezone.now())

        serializer = EventListSerializer(
            queryset, many=True, context={'request': request}
        )
        return Response({
            'count':  queryset.count(),
            'events': serializer.data
        })


class PublicEventDetailView(APIView):
    """
    GET /api/v1/events/<slug>/
    Public event detail — no auth required.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        event = get_object_or_404(
            Event.objects.select_related(
                'organizer', 'category'
            ).prefetch_related('ticket_types'),
            slug=slug,
            status=Event.Status.PUBLISHED
        )
        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)


class CategoryListView(APIView):
    """
    GET /api/v1/events/categories/
    Public list of all event categories.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


# ─── Organizer Views ──────────────────────────────────────────────────────────

class OrganizerEventListCreateView(APIView):
    """
    GET  /api/v1/events/manage/         — List own events
    POST /api/v1/events/manage/         — Create new event
    """
    permission_classes = [IsOrganizer]

    def get(self, request):
        """Organizer sees ALL their events regardless of status."""
        events = Event.objects.filter(
            organizer=request.user
        ).select_related('category').prefetch_related('ticket_types')

        # Optional status filter
        event_status = request.query_params.get('status')
        if event_status:
            events = events.filter(status=event_status)

        serializer = EventDetailSerializer(
            events, many=True, context={'request': request}
        )
        return Response({
            'count':  events.count(),
            'events': serializer.data
        })

    def post(self, request):
        serializer = EventWriteSerializer(data=request.data)
        if serializer.is_valid():
            event = serializer.save(organizer=request.user)
            return Response(
                EventDetailSerializer(event, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrganizerEventDetailView(APIView):
    """
    GET    /api/v1/events/manage/<id>/   — View own event
    PUT    /api/v1/events/manage/<id>/   — Update own event
    DELETE /api/v1/events/manage/<id>/   — Cancel own event
    """
    permission_classes = [IsOrganizer]

    def get_object(self, request, event_id):
        """Ensures organizer can only access their own events."""
        return get_object_or_404(
            Event, id=event_id, organizer=request.user
        )

    def get(self, request, event_id):
        event = self.get_object(request, event_id)
        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)

    def put(self, request, event_id):
        event = self.get_object(request, event_id)

        # Prevent editing cancelled or completed events
        if event.status in [Event.Status.CANCELLED, Event.Status.COMPLETED]:
            return Response(
                {'error': f'Cannot edit a {event.status} event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EventWriteSerializer(
            event, data=request.data, partial=True
        )
        if serializer.is_valid():
            updated_event = serializer.save()
            return Response(
                EventDetailSerializer(
                    updated_event, context={'request': request}
                ).data
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, event_id):
        event = self.get_object(request, event_id)

        # Can't cancel an event that already has confirmed orders
        has_confirmed_orders = event.ticket_types.filter(
            quantity_sold__gt=0
        ).exists()

        if has_confirmed_orders:
            return Response(
                {
                    'error': 'Cannot cancel an event with confirmed ticket sales. '
                             'Please contact Tixora support for assistance.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        event.status = Event.Status.CANCELLED
        event.save(update_fields=['status'])
        return Response(
            {'message': f'Event "{event.title}" has been cancelled.'},
            status=status.HTTP_200_OK
        )


# ─── Ticket Type Management ───────────────────────────────────────────────────

class TicketTypeListCreateView(APIView):
    """
    GET  /api/v1/events/manage/<event_id>/ticket-types/
    POST /api/v1/events/manage/<event_id>/ticket-types/
    """
    permission_classes = [IsOrganizer]

    def get_event(self, request, event_id):
        return get_object_or_404(
            Event, id=event_id, organizer=request.user
        )

    def get(self, request, event_id):
        event        = self.get_event(request, event_id)
        ticket_types = event.ticket_types.all()
        serializer   = TicketTypeSerializer(ticket_types, many=True)
        return Response(serializer.data)

    def post(self, request, event_id):
        event = self.get_event(request, event_id)

        # Prevent adding ticket types to cancelled/completed events
        if event.status in [Event.Status.CANCELLED, Event.Status.COMPLETED]:
            return Response(
                {'error': 'Cannot add ticket types to a cancelled or completed event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = TicketTypeSerializer(data=request.data)
        if serializer.is_valid():
            ticket_type = serializer.save(event=event)
            return Response(
                TicketTypeSerializer(ticket_type).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TicketTypeDetailView(APIView):
    """
    GET    /api/v1/events/manage/<event_id>/ticket-types/<tt_id>/
    PUT    /api/v1/events/manage/<event_id>/ticket-types/<tt_id>/
    DELETE /api/v1/events/manage/<event_id>/ticket-types/<tt_id>/
    """
    permission_classes = [IsOrganizer]

    def get_objects(self, request, event_id, tt_id):
        event       = get_object_or_404(Event, id=event_id, organizer=request.user)
        ticket_type = get_object_or_404(TicketType, id=tt_id, event=event)
        return event, ticket_type

    def get(self, request, event_id, tt_id):
        _, ticket_type = self.get_objects(request, event_id, tt_id)
        return Response(TicketTypeSerializer(ticket_type).data)

    def put(self, request, event_id, tt_id):
        _, ticket_type = self.get_objects(request, event_id, tt_id)

        # Prevent reducing quantity below already sold
        new_qty = request.data.get('total_quantity')
        if new_qty and int(new_qty) < ticket_type.quantity_sold:
            return Response(
                {
                    'error': f'Cannot reduce quantity below '
                             f'{ticket_type.quantity_sold} (already sold).'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = TicketTypeSerializer(
            ticket_type, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Organizer Sales Summary ──────────────────────────────────────────────────

class OrganizerEventStatsView(APIView):
    """
    GET /api/v1/events/manage/<event_id>/stats/
    Quick sales overview for the organizer dashboard.
    """
    permission_classes = [IsOrganizer]

    def get(self, request, event_id):
        event = get_object_or_404(
            Event, id=event_id, organizer=request.user
        )
        ticket_types = event.ticket_types.all()

        breakdown = []
        total_revenue = 0

        for tt in ticket_types:
            revenue = tt.quantity_sold * tt.price
            total_revenue += revenue
            breakdown.append({
                'ticket_type':    tt.name,
                'price':          tt.price,
                'total_quantity': tt.total_quantity,
                'sold':           tt.quantity_sold,
                'available':      tt.quantity_available,
                'revenue':        revenue,
                'sold_out':       tt.is_sold_out,
            })

        return Response({
            'event':          event.title,
            'status':         event.status,
            'start_date':     event.start_date,
            'total_capacity': event.total_capacity,
            'total_sold':     event.total_sold,
            'total_revenue':  total_revenue,
            'breakdown':      breakdown,
        })