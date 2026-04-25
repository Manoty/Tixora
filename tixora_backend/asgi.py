"""
ASGI config for tixora_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
import sys

# Add the project directory to the sys.path
sys.path.insert(0, os.path.dirname(__file__))

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
application = get_asgi_application()
