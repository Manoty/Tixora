# apps/payments/admin.py
from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['order', 'provider', 'status', 'amount', 'mpesa_receipt', 'initiated_at']
    list_filter   = ['status', 'provider']
    search_fields = ['order__reference', 'mpesa_receipt', 'phone_number']
    readonly_fields = ['checkout_request_id', 'merchant_request_id', 'mpesa_receipt']