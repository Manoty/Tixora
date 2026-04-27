# tixora_backend/settings_dev.py
from .settings import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Use console email backend in dev — no real emails sent
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'