# apps/users/views.py
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from throttles import AuthRateThrottle

from .serializers import (
    TixoraTokenObtainPairSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


class TixoraLoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Returns access + refresh tokens with user profile embedded.
    Uses our custom serializer to include role in JWT payload.
    """
    serializer_class = TixoraTokenObtainPairSerializer
    throttle_classes = [AuthRateThrottle]


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Public endpoint — no auth required.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Issue tokens immediately after registration
            # so the user is logged in right away
            refresh = RefreshToken.for_user(user)
            # Embed custom claims
            refresh['email']     = user.email
            refresh['role']      = user.role
            refresh['full_name'] = user.get_full_name()
            refresh['user_id']   = str(user.id)
            return Response({
                'message': 'Account created successfully. Welcome to Tixora!',
                'tokens': {
                    'access':  str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': {
                    'id':        str(user.id),
                    'email':     user.email,
                    'full_name': user.get_full_name(),
                    'role':      user.role,
                    'phone':     user.phone_number,
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the refresh token — access token expires naturally.

    WHY NOT BLACKLIST ACCESS TOKENS?
    They're short-lived (60 min). Blacklisting every access token
    requires a DB hit on every request — defeats the point of JWT.
    Blacklisting only the refresh token is the industry standard.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'Logged out successfully.'},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {'error': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    """
    GET  /api/v1/auth/profile/  — View own profile
    PUT  /api/v1/auth/profile/  — Update name/phone
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Password updated successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)    