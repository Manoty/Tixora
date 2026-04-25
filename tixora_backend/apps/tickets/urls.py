# apps/tickets/urls.py
from django.urls import path
from .views import (
    CustomerTicketListView,
    CustomerTicketDetailView,
    OrderTicketsView,
    RegenerateTicketsView,
)

urlpatterns = [
    # Customer
    path('my/',                          CustomerTicketListView.as_view(),  name='my-tickets'),
    path('order/<str:reference>/',       OrderTicketsView.as_view(),        name='order-tickets'),
    path('<uuid:ticket_uuid>/',          CustomerTicketDetailView.as_view(), name='ticket-detail'),

    # Admin
    path('regenerate/<str:reference>/', RegenerateTicketsView.as_view(),   name='regenerate-tickets'),
]