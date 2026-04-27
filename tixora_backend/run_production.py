#!/usr/bin/env python
"""
Production server runner for Tixora backend using Waitress.
This is a Windows-compatible alternative to Gunicorn.
"""

import os
import sys
from pathlib import Path

# Add the parent directory to sys.path so the tixora_backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tixora_backend.settings_prod')

# Import and serve the Django application
from waitress import serve
from tixora_backend.wsgi import application

if __name__ == "__main__":
    print("Starting Tixora production server with Waitress...")
    print("Server will be available at http://0.0.0.0:8000")
    print("Press Ctrl+C to stop the server")

    # Serve the application
    serve(
        application,
        host='0.0.0.0',
        port='8000',
        threads=4,  # Number of threads to use
        url_scheme='http'
    )