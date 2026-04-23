# apps/users/models.py
import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """
    Custom manager: email is the login field, not username.
    Real platforms use email — nobody remembers usernames.
    """
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)  # Keep username = email
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN     = 'admin',     'Admin'
        ORGANIZER = 'organizer', 'Organizer'
        CUSTOMER  = 'customer',  'Customer'

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email        = models.EmailField(unique=True)
    role         = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_verified  = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'       # Login with email
    REQUIRED_FIELDS = []            # No extra required fields for createsuperuser

    objects = UserManager()

    class Meta:
        db_table = 'tixora_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.email} [{self.role}]"

    @property
    def is_organizer(self):
        return self.role == self.Role.ORGANIZER

    @property
    def is_customer(self):
        return self.role == self.Role.CUSTOMER

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN