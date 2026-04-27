# tixora_backend/wsgi.py
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    os.environ.get('DJANGO_SETTINGS_MODULE', 'tixora_backend.settings_dev')
)

application = get_wsgi_application()