# apps/events/admin.py
from django.contrib import admin
from .models import Event, TicketType, Category

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}

class TicketTypeInline(admin.TabularInline):
    model  = TicketType
    extra  = 1
    fields = ['name', 'price', 'total_quantity', 'quantity_sold', 'max_per_order', 'is_active']
    readonly_fields = ['quantity_sold']

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display  = ['title', 'organizer', 'status', 'start_date', 'total_capacity', 'total_sold']
    list_filter   = ['status', 'city', 'category']
    search_fields = ['title', 'venue', 'organizer__email']
    prepopulated_fields = {'slug': ('title',)}
    inlines       = [TicketTypeInline]