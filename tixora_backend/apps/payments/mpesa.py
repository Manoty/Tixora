# apps/payments/mpesa.py
import base64
import logging
import requests
from datetime import datetime
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class MpesaService:
    """
    Wrapper around Safaricom Daraja API.

    WHY A SERVICE CLASS?
    - Isolates all M-Pesa logic in one place
    - Easy to swap sandbox → production (just change env vars)
    - Easy to mock in tests
    - Single responsibility: knows how to talk to Safaricom
    """

    SANDBOX_BASE_URL    = 'https://sandbox.safaricom.co.ke'
    PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke'

    def __init__(self):
        self.consumer_key    = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode       = settings.MPESA_SHORTCODE
        self.passkey         = settings.MPESA_PASSKEY
        self.callback_url    = settings.MPESA_CALLBACK_URL
        self.environment     = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')
        self.base_url        = (
            self.PRODUCTION_BASE_URL
            if self.environment == 'production'
            else self.SANDBOX_BASE_URL
        )

    def _get_access_token(self):
        """
        Fetch OAuth access token from Safaricom.
        Token expires in 1 hour — for production, cache this in Redis.
        For now, we fetch fresh per request (acceptable for sandbox/low volume).
        """
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            response = requests.get(
                url,
                auth=(self.consumer_key, self.consumer_secret),
                timeout=30
            )
            response.raise_for_status()
            token = response.json().get('access_token')
            if not token:
                raise ValueError('No access token in Safaricom response')
            return token
        except requests.exceptions.RequestException as e:
            logger.error(f"[Tixora-MPesa] Failed to get access token: {e}")
            raise Exception('Could not connect to M-Pesa. Please try again.')

    def _generate_password(self, timestamp):
        """
        STK Push password = Base64(Shortcode + Passkey + Timestamp)
        This is how Safaricom verifies the request came from us.
        """
        raw = f"{self.shortcode}{self.passkey}{timestamp}"
        return base64.b64encode(raw.encode()).decode()

    def _get_timestamp(self):
        """Format: YYYYMMDDHHmmss — Safaricom's required format."""
        return datetime.now().strftime('%Y%m%d%H%M%S')

    def stk_push(self, phone_number, amount, order_reference, description=None):
        """
        Initiate an STK Push to the customer's phone.

        Args:
            phone_number:    Kenyan number in 254XXXXXXXXX format
            amount:          Amount in KES (integer)
            order_reference: Our order reference (TIX-YYYYMMDD-XXXXXX)
            description:     What appears on customer's phone screen

        Returns:
            dict with CheckoutRequestID and MerchantRequestID

        Raises:
            Exception if Safaricom rejects the request
        """
        token     = self._get_access_token()
        timestamp = self._get_timestamp()
        password  = self._generate_password(timestamp)

        # Ensure amount is an integer — M-Pesa doesn't accept decimals
        amount = int(round(float(amount)))

        # Ensure phone is in correct format
        phone = self._normalize_phone(phone_number)

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password':          password,
            'Timestamp':         timestamp,
            'TransactionType':   'CustomerPayBillOnline',
            'Amount':            amount,
            'PartyA':            phone,         # Customer phone
            'PartyB':            self.shortcode, # Our shortcode
            'PhoneNumber':       phone,
            'CallBackURL':       self.callback_url,
            'AccountReference':  order_reference[:12],  # Max 12 chars
            'TransactionDesc':   description or f'Tixora Ticket {order_reference}',
        }

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"

        try:
            response = requests.post(
                url,
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type':  'application/json',
                },
                timeout=30
            )
            data = response.json()

            logger.info(
                f"[Tixora-MPesa] STK Push for order {order_reference}: "
                f"ResponseCode={data.get('ResponseCode')} "
                f"CheckoutRequestID={data.get('CheckoutRequestID')}"
            )

            # ResponseCode '0' = success (Safaricom uses strings, not integers)
            if data.get('ResponseCode') != '0':
                error_msg = data.get('errorMessage') or data.get('ResponseDescription', 'Unknown error')
                raise Exception(f'M-Pesa error: {error_msg}')

            return {
                'checkout_request_id':  data['CheckoutRequestID'],
                'merchant_request_id':  data['MerchantRequestID'],
                'response_description': data.get('ResponseDescription', ''),
            }

        except requests.exceptions.Timeout:
            logger.error(f"[Tixora-MPesa] STK Push timeout for order {order_reference}")
            raise Exception('M-Pesa request timed out. Please try again.')
        except requests.exceptions.RequestException as e:
            logger.error(f"[Tixora-MPesa] STK Push failed: {e}")
            raise Exception('Could not connect to M-Pesa. Please try again.')

    def query_stk_status(self, checkout_request_id):
        """
        Query the status of an STK Push.
        Use this for polling — customer asks "did my payment go through?"

        ResultCode '0' = success
        ResultCode '1032' = user cancelled
        ResultCode '1037' = timeout
        """
        token     = self._get_access_token()
        timestamp = self._get_timestamp()
        password  = self._generate_password(timestamp)

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password':          password,
            'Timestamp':         timestamp,
            'CheckoutRequestID': checkout_request_id,
        }

        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"

        try:
            response = requests.post(
                url,
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type':  'application/json',
                },
                timeout=30
            )
            return response.json()
        except Exception as e:
            logger.error(f"[Tixora-MPesa] Status query failed: {e}")
            raise Exception('Could not query M-Pesa status.')

    @staticmethod
    def _normalize_phone(phone):
        """
        Ensure phone is in 254XXXXXXXXX format.
        Phase 3 normalizes during registration, but STK push
        input might come from a form field — normalize again here.
        """
        phone = str(phone).strip().replace(' ', '').replace('-', '')
        if phone.startswith('+'):
            phone = phone[1:]
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        return phone