# apps/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    TixoraLoginView,
    RegisterView,
    LogoutView,
    ProfileView,
    ChangePasswordView,
)

urlpatterns = [
    # Auth
    path('register/',        RegisterView.as_view(),       name='register'),
    path('login/',           TixoraLoginView.as_view(),    name='login'),
    path('logout/',          LogoutView.as_view(),         name='logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),   name='token_refresh'),

    # Profile
    path('profile/',         ProfileView.as_view(),        name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
]