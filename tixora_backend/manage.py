# manage.py
import os
import sys

def main():
    # Default to dev settings — override with DJANGO_SETTINGS_MODULE env var
    settings_module = os.environ.get(
        'DJANGO_SETTINGS_MODULE',
        'settings_dev'
    )
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure it's installed and your "
            "virtual environment is activated."
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()