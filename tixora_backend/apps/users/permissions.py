# apps/users/permissions.py
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only admin users."""
    message = 'Access restricted to Tixora administrators.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsOrganizer(BasePermission):
    """Only organizers."""
    message = 'Access restricted to event organizers.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'organizer'
        )


class IsCustomer(BasePermission):
    """Only customers."""
    message = 'Access restricted to customers.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'customer'
        )


class IsOrganizerOrAdmin(BasePermission):
    """Organizers or admins."""
    message = 'Access restricted to organizers and administrators.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ['organizer', 'admin']
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission.
    User can only access their own objects, unless they're admin.
    Usage: check_object_permissions(request, obj) in views.
    """
    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # obj must have a 'customer' or 'owner' or 'user' field
        owner = getattr(obj, 'customer', None) or \
                getattr(obj, 'owner', None) or \
                getattr(obj, 'user', None)
        return owner == request.user