# tixora_backend/tixora_backend/settings_prod.py
from .settings import *
import os
import dj_database_url

DEBUG = False

ALLOWED_HOSTS  = os.getenv('ALLOWED_HOSTS', '').split(',')
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')

# ── Database — Render provides DATABASE_URL ────────────────────────────────
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age = 600,
            ssl_require  = True,
        )
    }

# ── Security ───────────────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER      = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
X_FRAME_OPTIONS                = 'DENY'
SECURE_HSTS_SECONDS            = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD            = True
SECURE_SSL_REDIRECT            = True
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True

# ── Whitenoise — static files ──────────────────────────────────────────────
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_ROOT         = BASE_DIR / 'staticfiles'

# ── Logging — Render captures stdout ──────────────────────────────────────
LOGGING = {
    'version':                  1,
    'disable_existing_loggers': False,
    'formatters': {
        'render': {
            'format': '[{asctime}] [{levelname}] {name}: {message}',
            'style':  '{',
        },
    },
    'handlers': {
        'console': {
            'class':     'logging.StreamHandler',
            'formatter': 'render',
        },
    },
    'loggers': {
        'django':         {'handlers': ['console'], 'level': 'WARNING'},
        'apps.payments':  {'handlers': ['console'], 'level': 'INFO'},
        'apps.orders':    {'handlers': ['console'], 'level': 'INFO'},
        'apps.checkins':  {'handlers': ['console'], 'level': 'INFO'},
    },
}