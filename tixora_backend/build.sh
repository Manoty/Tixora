#!/usr/bin/env bash
# build.sh — Render build script

set -o errexit  # Exit immediately if any command fails

echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "🗄️  Running migrations..."
python manage.py migrate

echo "🌱 Seeding categories..."
python manage.py seed_categories

echo "✅ Build complete."