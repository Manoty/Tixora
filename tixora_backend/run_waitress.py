#!/usr/bin/env python
"""
Simple Waitress runner for Tixora backend.
Run with: python run_waitress.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Set production settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tixora_backend.settings_prod')

# Import and run
from waitress import serve
from tixora_backend.wsgi import application

if __name__ == "__main__":
    print("🚀 Starting Tixora with Waitress...")
    serve(application, host='0.0.0.0', port='8000')