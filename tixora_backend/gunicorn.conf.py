# gunicorn.conf.py
import multiprocessing

# Server socket
bind            = '0.0.0.0:8000'
backlog         = 2048

# Workers — (2 × CPU cores) + 1 is the standard formula
workers         = multiprocessing.cpu_count() * 2 + 1
worker_class    = 'sync'
worker_connections = 1000
timeout         = 60
keepalive       = 2

# Logging
accesslog       = 'logs/gunicorn_access.log'
errorlog        = 'logs/gunicorn_error.log'
loglevel        = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name       = 'tixora'

# Restart workers after this many requests (prevents memory leaks)
max_requests        = 1000
max_requests_jitter = 100