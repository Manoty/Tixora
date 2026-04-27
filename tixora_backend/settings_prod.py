# tixora_backend/settings_prod.py
from settings import *
import os

DEBUG = False

# Lock to your real domain — update before deploying
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

# Lock CORS to your real frontend domain
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')

# ── Security Headers ───────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER       = True
SECURE_CONTENT_TYPE_NOSNIFF     = True
X_FRAME_OPTIONS                 = 'DENY'
SECURE_HSTS_SECONDS             = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS  = True
SECURE_HSTS_PRELOAD             = True

# Force HTTPS in production
# Uncomment once SSL is set up:
# SECURE_SSL_REDIRECT           = True
# SESSION_COOKIE_SECURE         = True
# CSRF_COOKIE_SECURE            = True

# ── Static Files (Whitenoise) ──────────────────────────────────────────────
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_ROOT         = BASE_DIR / 'staticfiles'

# ── Production Logging ─────────────────────────────────────────────────────
LOGGING = {
    'version':                  1,
    'disable_existing_loggers': False,
    'formatters': {
        'production': {
            'format':  '[{asctime}] [{levelname}] [{name}] {message}',
            'style':   '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'file': {
            'class':     'logging.handlers.RotatingFileHandler',
            'filename':  BASE_DIR / 'logs/tixora_prod.log',
            'maxBytes':  10 * 1024 * 1024,  # 10MB per file
            'backupCount': 5,               # Keep 5 rotated files
            'formatter': 'production',
        },
        'console': {
            'class':     'logging.StreamHandler',
            'formatter': 'production',
        },
    },
    'loggers': {
        'django': {
            'handlers':  ['file', 'console'],
            'level':     'WARNING',
            'propagate': False,
        },
        'apps.payments': {
            'handlers':  ['file', 'console'],
            'level':     'INFO',
            'propagate': False,
        },
        'apps.orders': {
            'handlers':  ['file', 'console'],
            'level':     'INFO',
            'propagate': False,
        },
        'apps.checkins': {
            'handlers':  ['file', 'console'],
            'level':     'INFO',
            'propagate': False,
        },
    },
}