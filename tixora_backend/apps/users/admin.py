# apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class TixoraUserAdmin(UserAdmin):
    list_display  = ['email', 'first_name', 'last_name', 'role', 'is_verified', 'created_at']
    list_filter   = ['role', 'is_verified', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering      = ['-created_at']
    fieldsets     = UserAdmin.fieldsets + (
        ('Tixora Profile', {'fields': ('role', 'phone_number', 'is_verified')}),
    )