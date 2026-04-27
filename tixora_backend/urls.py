# tixora_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1 — all Tixora endpoints
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/events/', include('apps.events.urls')),
    path('api/v1/orders/', include('apps.orders.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/tickets/', include('apps.tickets.urls')),
    path('api/v1/checkins/', include('apps.checkins.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
def api_docs(request):
    """
    Basic API reference — lists all available endpoints.
    """
    return JsonResponse({
        'product':  'Tixora API',
        'version':  'v1',
        'base_url': '/api/v1/',
        'endpoints': {
            'auth': {
                'POST /auth/register/':        'Register new user',
                'POST /auth/login/':           'Login — returns JWT tokens',
                'POST /auth/logout/':          'Logout — blacklists refresh token',
                'POST /auth/token/refresh/':   'Refresh access token',
                'GET  /auth/profile/':         'View own profile',
                'PUT  /auth/profile/':         'Update own profile',
                'POST /auth/change-password/': 'Change password',
            },
            'events': {
                'GET  /events/':                                    'List published events (public)',
                'GET  /events/categories/':                         'List categories (public)',
                'GET  /events/<slug>/':                             'Event detail (public)',
                'GET  /events/manage/':                             'Organizer: list own events',
                'POST /events/manage/':                             'Organizer: create event',
                'GET  /events/manage/<id>/':                        'Organizer: view event',
                'PUT  /events/manage/<id>/':                        'Organizer: update event',
                'DEL  /events/manage/<id>/':                        'Organizer: cancel event',
                'GET  /events/manage/<id>/stats/':                  'Organizer: sales stats',
                'GET  /events/manage/<id>/ticket-types/':           'List ticket types',
                'POST /events/manage/<id>/ticket-types/':           'Add ticket type',
                'PUT  /events/manage/<id>/ticket-types/<id>/':      'Update ticket type',
                'DEL  /events/manage/<id>/ticket-types/<id>/':      'Delete ticket type',
            },
            'orders': {
                'POST /orders/':                    'Create order (reserves tickets)',
                'GET  /orders/my/':                 'Customer: list own orders',
                'GET  /orders/<reference>/':        'Order detail',
                'DEL  /orders/<reference>/':        'Cancel order',
                'GET  /orders/event/<id>/':         'Organizer: event orders',
                'POST /orders/expire-reservations/':'Admin: release expired holds',
            },
            'payments': {
                'POST /payments/initiate/':              'Initiate M-Pesa STK Push',
                'POST /payments/mpesa/callback/':        'M-Pesa callback (Safaricom)',
                'GET  /payments/status/<reference>/':    'Poll payment status',
                'GET  /payments/history/':               'Customer payment history',
            },
            'tickets': {
                'GET  /tickets/my/':                     'Customer: all tickets + QR codes',
                'GET  /tickets/order/<reference>/':      'Tickets for specific order',
                'GET  /tickets/<uuid>/':                 'Single ticket detail',
                'POST /tickets/regenerate/<reference>/': 'Admin: regenerate tickets',
            },
            'checkins': {
                'POST /checkins/scan/':                  'Scan QR code — admit or reject',
                'GET  /checkins/event/<id>/':            'Event check-in audit log',
                'GET  /checkins/event/<id>/stats/':      'Live entry stats',
            },
        },
    })
