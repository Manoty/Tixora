# apps/users/serializers.py
import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class TixoraTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to embed user info
    directly into the token payload.

    WHY? The React frontend reads role from the decoded token
    to guard routes instantly — no extra /me API call needed.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']     = user.email
        token['role']      = user.role
        token['full_name'] = user.get_full_name()
        token['user_id']   = str(user.id)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Append user profile to login response body
        data['user'] = {
            'id':        str(self.user.id),
            'email':     self.user.email,
            'full_name': self.user.get_full_name(),
            'role':      self.user.role,
            'phone':     self.user.phone_number,
        }
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new user registration.
    Validates password strength, phone format, and role assignment.
    """
    password         = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = [
            'email', 'first_name', 'last_name',
            'phone_number', 'role',
            'password', 'confirm_password'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name':  {'required': True},
        }

    def validate_email(self, value):
        """Normalize and check uniqueness."""
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                'An account with this email already exists.'
            )
        return email

    def validate_phone_number(self, value):
        """
        Validate Kenyan phone number format.
        Accepts: 0712345678, +254712345678, 254712345678
        Normalizes to: 254712345678 (for M-Pesa compatibility)
        """
        if not value:
            return value
        phone = value.strip().replace(' ', '').replace('-', '')
        if phone.startswith('+254'):
            phone = phone[1:]  # Remove +
        elif phone.startswith('0'):
            phone = '254' + phone[1:]  # Replace leading 0
        pattern = r'^254[71]\d{8}$'
        if not re.match(pattern, phone):
            raise serializers.ValidationError(
                'Enter a valid Kenyan phone number. e.g. 0712345678'
            )
        return phone

    def validate_role(self, value):
        """Customers and organizers can self-register. Admin accounts are created by admins only."""
        if value == 'admin':
            raise serializers.ValidationError(
                'Admin accounts cannot be created via registration.'
            )
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Read/update own profile."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'full_name', 'phone_number', 'role',
            'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name()


class ChangePasswordSerializer(serializers.Serializer):
    """Authenticated password change."""
    old_password     = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        return attrs

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user