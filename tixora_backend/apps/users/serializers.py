# apps/users/serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class TixoraTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Embed user info directly in the JWT payload
        token['email'] = user.email
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        return token