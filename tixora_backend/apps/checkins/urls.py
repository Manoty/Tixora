# apps/checkins/urls.py
from django.urls import path
from .views import (
    ScanTicketView,
    EventCheckInListView,
    EventCheckInStatsView,
)

urlpatterns = [
    path('scan/',                          ScanTicketView.as_view(),        name='scan-ticket'),
    path('event/<uuid:event_id>/',         EventCheckInListView.as_view(),  name='event-checkins'),
    path('event/<uuid:event_id>/stats/',   EventCheckInStatsView.as_view(), name='checkin-stats'),
]