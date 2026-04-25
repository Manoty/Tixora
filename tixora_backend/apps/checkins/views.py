# apps/checkins/views.py
import logging
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsOrganizerOrAdmin
from apps.events.models import Event
from django.db.models import Count, Q

from throttles import ScanRateThrottle
from .models import CheckIn
from .serializers import ScanTicketSerializer, CheckInSerializer
from .services import CheckInService

logger = logging.getLogger(__name__)


class ScanTicketView(APIView):
    """
    POST /api/v1/checkins/scan/
    Gate scanner sends UUID → instant admit/reject response.

    Who can scan:
    - Admins (any event)
    - Organizers (only their events, enforced via event_id)
    """
    permission_classes = [IsOrganizerOrAdmin]
    throttle_classes   = [ScanRateThrottle]

    def post(self, request):
        serializer = ScanTicketSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scanned_uuid = serializer.validated_data['ticket_uuid'].strip()
        event_id     = serializer.validated_data.get('event_id')

        try:
            result = CheckInService.process_scan(
                scanned_uuid = scanned_uuid,
                scanned_by   = request.user,
                event_id     = event_id,
            )

            # Return 200 for all processed scans — including rejections
            # The 'admitted' field tells the scanner what to do
            # 4xx is reserved for malformed requests, not business rejections
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"[Tixora-Scan] Scan endpoint error: {e}", exc_info=True)
            return Response(
                {'error': 'Scan processing failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EventCheckInListView(APIView):
    """
    GET /api/v1/checkins/event/<event_id>/
    Organizer/admin views all check-in records for an event.
    Includes failed scans — full audit log.
    """
    permission_classes = [IsOrganizerOrAdmin]

    def get(self, request, event_id):
        if request.user.role == 'organizer':
            event = get_object_or_404(
                Event, id=event_id, organizer=request.user
            )
        else:
            event = get_object_or_404(Event, id=event_id)

        checkins = CheckIn.objects.filter(
            ticket__ticket_type__event=event
        ).select_related(
            'ticket__ticket_type',
            'ticket__owner',
            'scanned_by',
        ).order_by('-scanned_at')

        # Filter by result
        result_filter = request.query_params.get('result')
        if result_filter:
            checkins = checkins.filter(result=result_filter)

        serializer = CheckInSerializer(checkins, many=True)

        # Build live stats
        total        = checkins.count()
        admitted     = checkins.filter(result=CheckIn.Result.SUCCESS).count()
        already_used = checkins.filter(result=CheckIn.Result.ALREADY_USED).count()
        invalid      = checkins.filter(result=CheckIn.Result.INVALID_TICKET).count()

        return Response({
            'event': event.title,
            'stats': {
                'total_scans':    total,
                'admitted':       admitted,
                'already_used':   already_used,
                'invalid_scans':  invalid,
            },
            'checkins': serializer.data,
        })


class EventCheckInStatsView(APIView):
    permission_classes = [IsOrganizerOrAdmin]

    def get(self, request, event_id):
        if request.user.role == 'organizer':
            event = get_object_or_404(Event, id=event_id, organizer=request.user)
        else:
            event = get_object_or_404(Event, id=event_id)

        from apps.tickets.models import Ticket

        total_tickets = Ticket.objects.filter(
            ticket_type__event=event,
            status__in=[Ticket.Status.ACTIVE, Ticket.Status.USED]
        ).count()

        admitted = Ticket.objects.filter(
            ticket_type__event=event,
            status=Ticket.Status.USED
        ).count()

        breakdown = Ticket.objects.filter(
            ticket_type__event=event
        ).values('ticket_type__name').annotate(
            total=Count('id'),
            used=Count('id', filter=Q(status='used'))
        )

        breakdown_data = [{
            'ticket_type': b['ticket_type__name'],
            'total':       b['total'],
            'admitted':    b['used'],
            'remaining':   b['total'] - b['used'],
        } for b in breakdown]

        recent_scans = CheckIn.objects.filter(
            ticket__ticket_type__event=event
        ).select_related(
            'ticket__owner',
            'ticket__ticket_type',
        ).order_by('-scanned_at')[:10]

        recent_data = [{
            'ticket_type': s.ticket.ticket_type.name if s.ticket else 'Unknown',
            'owner':       s.ticket.owner.get_full_name() if s.ticket else 'Unknown',
            'result':      s.result,
            'scanned_at':  s.scanned_at.strftime('%H:%M:%S'),
        } for s in recent_scans]

        return Response({
            'event':           event.title,
            'total_tickets':   total_tickets,
            'admitted':        admitted,
            'not_yet_entered': total_tickets - admitted,
            'attendance_pct':  round((admitted / total_tickets * 100), 1) if total_tickets else 0,
            'breakdown':       breakdown_data,
            'recent_scans':    recent_data,
        })