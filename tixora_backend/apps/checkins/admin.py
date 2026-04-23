# apps/checkins/admin.py
from django.contrib import admin
from .models import CheckIn

@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display  = ['ticket', 'scanned_by', 'result', 'scanned_at']
    list_filter   = ['result']
    search_fields = ['scanned_uuid', 'ticket__ticket_uuid']
    readonly_fields = ['scanned_at', 'scanned_uuid']