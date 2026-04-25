# tixora_backend/throttles.py
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """
    Strict throttle on login/register.
    Prevents brute-force password attacks.
    10 attempts per minute per IP.
    """
    scope = 'auth'


class PaymentRateThrottle(UserRateThrottle):
    """
    Limit payment initiation attempts.
    Prevents STK Push spam (each costs Safaricom API calls).
    5 attempts per minute per user.
    """
    scope = 'payment'


class ScanRateThrottle(UserRateThrottle):
    """
    Limit QR scan attempts.
    Prevents brute-force UUID guessing at the gate.
    60 scans per minute per scanner — fast enough for real gates.
    """
    scope = 'scan'