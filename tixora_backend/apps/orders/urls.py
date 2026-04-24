# apps/orders/urls.py
from django.urls import path
from .views import (
    CreateOrderView,
    CustomerOrderListView,
    CustomerOrderDetailView,
    ExpireReservationsView,
    OrganizerOrderListView,
)

urlpatterns = [
    # Customer
    path('',                          CreateOrderView.as_view(),       name='create-order'),
    path('my/',                       CustomerOrderListView.as_view(),  name='my-orders'),
    path('<str:reference>/',          CustomerOrderDetailView.as_view(), name='order-detail'),

    # System / Admin
    path('expire-reservations/',      ExpireReservationsView.as_view(), name='expire-reservations'),

    # Organizer
    path('event/<uuid:event_id>/',    OrganizerOrderListView.as_view(), name='event-orders'),
]