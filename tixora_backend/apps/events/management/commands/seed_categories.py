# apps/events/management/commands/seed_categories.py
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.events.models import Category

CATEGORIES = [
    'Music', 'Tech & Innovation', 'Sports', 'Comedy',
    'Arts & Culture', 'Food & Drink', 'Business',
    'Health & Wellness', 'Education', 'Fashion',
]

class Command(BaseCommand):
    help = 'Seed Tixora event categories'

    def handle(self, *args, **kwargs):
        created = 0
        for name in CATEGORIES:
            _, was_created = Category.objects.get_or_create(
                name=name,
                defaults={'slug': slugify(name)}
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Seeded {created} categories. '
                f'{len(CATEGORIES) - created} already existed.'
            )
        )