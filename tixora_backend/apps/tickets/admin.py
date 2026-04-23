# apps/tickets/admin.py
from django.contrib import admin
from .models import Ticket

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display  = ['ticket_uuid', 'owner', 'ticket_type', 'status', 'issued_at']
    list_filter   = ['status']
    search_fields = ['ticket_uuid', 'owner__email']
    readonly_fields = ['ticket_uuid', 'qr_code', 'issued_at']