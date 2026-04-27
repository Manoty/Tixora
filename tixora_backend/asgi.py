"""
ASGI config for tixora_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
import sys
from pathlib import Path

# Add the parent directory to sys.path so the tixora_backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tixora_backend.settings_dev')
application = get_asgi_application()
