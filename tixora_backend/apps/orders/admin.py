# apps/orders/admin.py
from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model  = OrderItem
    extra  = 0
    fields = ['ticket_type', 'quantity', 'price_at_purchase']
    readonly_fields = ['price_at_purchase']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ['reference', 'customer', 'status', 'total_amount', 'created_at']
    list_filter   = ['status']
    search_fields = ['reference', 'customer__email']
    readonly_fields = ['reference', 'total_amount', 'created_at']
    inlines       = [OrderItemInline]