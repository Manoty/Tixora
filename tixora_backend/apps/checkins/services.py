# apps/checkins/services.py
import logging
import uuid as uuid_module
from django.db import transaction
from django.utils import timezone

from apps.tickets.models import Ticket
from .models import CheckIn

logger = logging.getLogger(__name__)


class CheckInService:
    """
    Handles QR scan validation with full audit logging.

    CONCURRENCY:
    Two scanners hit the same QR simultaneously.
    select_for_update() locks the Ticket row.
    First scanner wins — marks as used.
    Second scanner reads status='used' → rejected.
    """

    # Human-readable messages for each result code
    RESULT_MESSAGES = {
        CheckIn.Result.SUCCESS:        '✅ Admitted — Welcome!',
        CheckIn.Result.ALREADY_USED:   '🚫 Ticket already used.',
        CheckIn.Result.INVALID_TICKET: '❌ Invalid QR code.',
        CheckIn.Result.WRONG_EVENT:    '⚠️  Wrong event.',
        CheckIn.Result.EXPIRED:        '⏰ Event has ended.',
        CheckIn.Result.CANCELLED:      '🚫 Ticket cancelled.',
    }

    @staticmethod
    @transaction.atomic
    def process_scan(scanned_uuid, scanned_by, event_id=None):
        """
        Validate a scanned QR code and record the check-in attempt.

        Args:
            scanned_uuid: Raw string decoded from QR code
            scanned_by:   User (admin/organizer) performing the scan
            event_id:     Optional — validates ticket belongs to this event

        Returns:
            dict with result, admitted, message, and ticket_info
        """

        ticket    = None
        result    = None
        notes     = ''
        admitted  = False
        info      = {}

        try:
            uuid_module.UUID(str(scanned_uuid))
        except ValueError:
            result = CheckIn.Result.INVALID_TICKET
            notes  = f'Malformed UUID: {scanned_uuid[:100]}'  # Truncate for safety
            logger.warning(
                f"[Tixora-Scan] Malformed UUID from {scanned_by.email}: "
                f"{scanned_uuid[:50]}"
            )
            CheckInService._log_scan(
                ticket=None,
                scanned_by=scanned_by,
                scanned_uuid=str(scanned_uuid)[:100],
                result=result,
                notes=notes,
            )
            return CheckInService._build_response(result, False, {})
        try:
            # ── Step 1: Find the ticket — lock the row ─────────────────
            try:
                ticket = Ticket.objects.select_for_update().select_related(
                    'ticket_type__event',
                    'owner',
                    'order',
                ).get(ticket_uuid=scanned_uuid)

            except Ticket.DoesNotExist:
                result = CheckIn.Result.INVALID_TICKET
                notes  = f'No ticket found for UUID: {scanned_uuid}'
                logger.warning(
                    f"[Tixora-Scan] Invalid UUID scanned by "
                    f"{scanned_by.email}: {scanned_uuid}"
                )
                CheckInService._log_scan(
                    ticket=None,
                    scanned_by=scanned_by,
                    scanned_uuid=scanned_uuid,
                    result=result,
                    notes=notes,
                )
                return CheckInService._build_response(result, admitted, info)

            # ── Step 2: Event validation ───────────────────────────────
            event = ticket.ticket_type.event

            if event_id and str(event.id) != str(event_id):
                result = CheckIn.Result.WRONG_EVENT
                notes  = (
                    f'Ticket belongs to "{event.title}" '
                    f'but scanner is set to event {event_id}'
                )
                logger.warning(
                    f"[Tixora-Scan] Wrong event — ticket {scanned_uuid} "
                    f"belongs to '{event.title}'"
                )
                CheckInService._log_scan(
                    ticket=ticket,
                    scanned_by=scanned_by,
                    scanned_uuid=scanned_uuid,
                    result=result,
                    notes=notes,
                )
                info = CheckInService._ticket_info(ticket)
                return CheckInService._build_response(result, admitted, info)

            # ── Step 3: Event expiry check ─────────────────────────────
            if event.end_date < timezone.now():
                result = CheckIn.Result.EXPIRED
                notes  = f'Event "{event.title}" ended at {event.end_date}'
                CheckInService._log_scan(
                    ticket=ticket,
                    scanned_by=scanned_by,
                    scanned_uuid=scanned_uuid,
                    result=result,
                    notes=notes,
                )
                info = CheckInService._ticket_info(ticket)
                return CheckInService._build_response(result, admitted, info)

            # ── Step 4: Ticket status checks ───────────────────────────
            if ticket.status == Ticket.Status.USED:
                result = CheckIn.Result.ALREADY_USED
                # Find original check-in for context
                original = CheckIn.objects.filter(
                    ticket=ticket,
                    result=CheckIn.Result.SUCCESS
                ).first()
                notes = (
                    f'Already scanned at '
                    f'{original.scanned_at.strftime("%d %b %Y %H:%M") if original else "unknown time"}'
                )
                logger.warning(
                    f"[Tixora-Scan] Reuse attempt — ticket {scanned_uuid} "
                    f"already used. Scanned by: {scanned_by.email}"
                )
                CheckInService._log_scan(
                    ticket=ticket,
                    scanned_by=scanned_by,
                    scanned_uuid=scanned_uuid,
                    result=result,
                    notes=notes,
                )
                info = CheckInService._ticket_info(ticket)
                return CheckInService._build_response(result, admitted, info)

            if ticket.status == Ticket.Status.CANCELLED:
                result = CheckIn.Result.CANCELLED
                notes  = 'Ticket has been cancelled.'
                CheckInService._log_scan(
                    ticket=ticket,
                    scanned_by=scanned_by,
                    scanned_uuid=scanned_uuid,
                    result=result,
                    notes=notes,
                )
                info = CheckInService._ticket_info(ticket)
                return CheckInService._build_response(result, admitted, info)

            # ── Step 5: SUCCESS — mark as used ─────────────────────────
            # This happens INSIDE the locked transaction.
            # Any concurrent scan of the same UUID will
            # read status='used' after this commits.
            ticket.status = Ticket.Status.USED
            ticket.save(update_fields=['status', 'updated_at'])

            result   = CheckIn.Result.SUCCESS
            admitted = True
            notes    = f'Admitted by {scanned_by.email}'
            info     = CheckInService._ticket_info(ticket)

            CheckInService._log_scan(
                ticket=ticket,
                scanned_by=scanned_by,
                scanned_uuid=scanned_uuid,
                result=result,
                notes=notes,
            )

            logger.info(
                f"[Tixora-Scan] ✅ SUCCESS — ticket {scanned_uuid} "
                f"admitted by {scanned_by.email} "
                f"for event '{event.title}'"
            )

            return CheckInService._build_response(result, admitted, info)

        except Exception as e:
            logger.error(
                f"[Tixora-Scan] Unexpected error processing scan "
                f"{scanned_uuid}: {e}",
                exc_info=True
            )
            raise

    @staticmethod
    def _log_scan(ticket, scanned_by, scanned_uuid, result, notes=''):
        """Append-only audit log. Never update, never delete."""
        CheckIn.objects.create(
            ticket       = ticket,
            scanned_by   = scanned_by,
            scanned_uuid = str(scanned_uuid),
            result       = result,
            notes        = notes,
        )

    @staticmethod
    def _ticket_info(ticket):
        """Build ticket context dict for scan response."""
        return {
            'ticket_uuid':   str(ticket.ticket_uuid),
            'owner_name':    ticket.owner.get_full_name(),
            'owner_email':   ticket.owner.email,
            'ticket_type':   ticket.ticket_type.name,
            'event':         ticket.ticket_type.event.title,
            'event_date':    ticket.ticket_type.event.start_date.strftime('%d %b %Y %H:%M'),
            'ticket_status': ticket.status,
        }

    @staticmethod
    def _build_response(result, admitted, ticket_info=None):
        return {
            'result':      result,
            'admitted':    admitted,
            'message':     CheckInService.RESULT_MESSAGES.get(result, 'Unknown result.'),
            'ticket_info': ticket_info or {},
        }