# apps/events/urls.py
from django.urls import path
from .views import (
    PublicEventListView,
    PublicEventDetailView,
    CategoryListView,
    OrganizerEventListCreateView,
    OrganizerEventDetailView,
    TicketTypeListCreateView,
    TicketTypeDetailView,
    OrganizerEventStatsView,
)

urlpatterns = [

    # ── Public (Customer Browsing) ────────────────────────────
    path('',                        PublicEventListView.as_view(),   name='public-events'),
    path('categories/',             CategoryListView.as_view(),      name='categories'),
    path('<slug:slug>/',            PublicEventDetailView.as_view(), name='public-event-detail'),

    # ── Organizer Event Management ────────────────────────────
    path('manage/',                 OrganizerEventListCreateView.as_view(), name='organizer-events'),
    path('manage/<uuid:event_id>/', OrganizerEventDetailView.as_view(),    name='organizer-event-detail'),
    path('manage/<uuid:event_id>/stats/', OrganizerEventStatsView.as_view(), name='event-stats'),

    # ── Ticket Type Management ────────────────────────────────
    path(
        'manage/<uuid:event_id>/ticket-types/',
        TicketTypeListCreateView.as_view(),
        name='ticket-types'
    ),
    path(
        'manage/<uuid:event_id>/ticket-types/<uuid:tt_id>/',
        TicketTypeDetailView.as_view(),
        name='ticket-type-detail'
    ),
]