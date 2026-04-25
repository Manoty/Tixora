# apps/payments/urls.py
from django.urls import path
from .views import (
    InitiatePaymentView,
    MpesaCallbackView,
    PaymentStatusView,
    PaymentHistoryView,
)

urlpatterns = [
    path('initiate/',                        InitiatePaymentView.as_view(),  name='initiate-payment'),
    path('mpesa/callback/',                  MpesaCallbackView.as_view(),    name='mpesa-callback'),
    path('status/<str:order_reference>/',    PaymentStatusView.as_view(),    name='payment-status'),
    path('history/',                         PaymentHistoryView.as_view(),   name='payment-history'),
]