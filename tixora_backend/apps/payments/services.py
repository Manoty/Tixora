# apps/payments/services.py
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order
from apps.tickets.services import TicketService   # We'll create this in Phase 7
from .models import Payment
from .mpesa import MpesaService

logger = logging.getLogger(__name__)


class PaymentService:

    @staticmethod
    @transaction.atomic
    def initiate_mpesa_payment(customer, order_reference, phone_number):
        """
        Initiate STK Push for a reserved order.

        Validations:
        1. Order must exist and belong to this customer
        2. Order must be in 'reserved' status (not expired, not paid)
        3. Reservation must not be expired
        4. No duplicate in-flight payment for same order

        WHY CHECK FOR DUPLICATE PAYMENTS?
        User might double-tap the pay button.
        We block a second STK Push if one is already pending.
        """

        # ── Fetch and validate the order ──────────────────────────────────
        try:
            order = Order.objects.get(
                reference=order_reference,
                customer=customer
            )
        except Order.DoesNotExist:
            raise ValidationError({'order': 'Order not found.'})

        if order.status == Order.Status.CONFIRMED:
            raise ValidationError({'order': 'This order has already been paid.'})

        if order.status == Order.Status.CANCELLED:
            raise ValidationError({
                'order': 'This order has been cancelled. Please create a new order.'
            })

        if order.status not in [Order.Status.RESERVED, Order.Status.PENDING]:
            raise ValidationError({
                'order': f'Order cannot be paid in its current state: {order.status}'
            })

        # ── Check reservation hasn't expired ──────────────────────────────
        if order.reserved_until and order.reserved_until < timezone.now():
            # Auto-cancel expired order
            from apps.orders.services import OrderService
            OrderService.cancel_order(order)
            raise ValidationError({
                'order': 'Your reservation has expired. Please start a new order.'
            })

        # ── Check for duplicate pending payment ───────────────────────────
        pending_payment = Payment.objects.filter(
            order=order,
            status__in=[Payment.Status.INITIATED, Payment.Status.PENDING]
        ).first()

        if pending_payment:
            raise ValidationError({
                'payment': 'A payment is already in progress for this order. '
                           'Please check your phone for the M-Pesa prompt.'
            })

        # ── Create payment record BEFORE calling Safaricom ────────────────
        # WHY? If the STK Push call fails after creating the record,
        # we can still track the attempt and show the user an error.
        payment = Payment.objects.create(
            order        = order,
            provider     = Payment.Provider.MPESA,
            status       = Payment.Status.INITIATED,
            phone_number = phone_number,
            amount       = order.total_amount,
        )

        # ── Initiate STK Push ─────────────────────────────────────────────
        try:
            mpesa   = MpesaService()
            result  = mpesa.stk_push(
                phone_number    = phone_number,
                amount          = order.total_amount,
                order_reference = order.reference,
                description     = f'Tixora Tickets - {order.reference}'
            )

            # Store Safaricom's tracking IDs
            payment.checkout_request_id = result['checkout_request_id']
            payment.merchant_request_id = result['merchant_request_id']
            payment.status              = Payment.Status.PENDING
            payment.save(update_fields=[
                'checkout_request_id',
                'merchant_request_id',
                'status'
            ])

            logger.info(
                f"[Tixora-Payment] STK Push sent for order {order.reference} "
                f"to {phone_number}. CheckoutID: {result['checkout_request_id']}"
            )

            return payment

        except Exception as e:
            # Mark payment as failed — don't leave it as INITIATED
            payment.status             = Payment.Status.FAILED
            payment.result_description = str(e)
            payment.completed_at       = timezone.now()
            payment.save(update_fields=['status', 'result_description', 'completed_at'])

            logger.error(
                f"[Tixora-Payment] STK Push failed for order {order.reference}: {e}"
            )
            raise ValidationError({'mpesa': str(e)})

    @staticmethod
    @transaction.atomic
    def process_mpesa_callback(callback_data):
        """
        Handle the async callback from Safaricom.

        This is called when Safaricom POSTs to our callback URL.
        It runs OUTSIDE a user request — triggered by Safaricom's servers.

        CRITICAL: This must be idempotent.
        Safaricom may send the same callback more than once.
        We must handle duplicate callbacks without double-confirming.

        WHY ALWAYS RETURN 200 TO SAFARICOM?
        If we return non-200, Safaricom retries the callback.
        Even if we have an internal error, we return 200 and log the issue.
        """
        try:
            # ── Parse the callback structure ──────────────────────────────
            stk_callback = (
                callback_data
                .get('Body', {})
                .get('stkCallback', {})
            )

            checkout_request_id = stk_callback.get('CheckoutRequestID')
            merchant_request_id = stk_callback.get('MerchantRequestID')
            result_code         = str(stk_callback.get('ResultCode', ''))
            result_desc         = stk_callback.get('ResultDesc', '')

            logger.info(
                f"[Tixora-Callback] Received: CheckoutID={checkout_request_id} "
                f"ResultCode={result_code} Desc={result_desc}"
            )

            # ── Find the matching payment ──────────────────────────────────
            try:
                payment = Payment.objects.select_for_update().get(
                    checkout_request_id=checkout_request_id
                )
            except Payment.DoesNotExist:
                logger.error(
                    f"[Tixora-Callback] No payment found for "
                    f"CheckoutRequestID: {checkout_request_id}"
                )
                return {'processed': False, 'reason': 'Payment not found'}

            # ── Idempotency check ─────────────────────────────────────────
            # If already processed, skip — don't double-confirm
            if payment.status in [Payment.Status.SUCCESS, Payment.Status.FAILED]:
                logger.warning(
                    f"[Tixora-Callback] Duplicate callback for already "
                    f"processed payment {payment.id}. Ignoring."
                )
                return {'processed': False, 'reason': 'Already processed'}

            # ── Update payment status ─────────────────────────────────────
            payment.result_code        = result_code
            payment.result_description = result_desc
            payment.completed_at       = timezone.now()

            if result_code == '0':
                # ── SUCCESS PATH ──────────────────────────────────────────
                # Extract M-Pesa receipt and metadata
                callback_metadata = stk_callback.get('CallbackMetadata', {})
                items = {
                    item['Name']: item.get('Value')
                    for item in callback_metadata.get('Item', [])
                }

                payment.mpesa_receipt = items.get('MpesaReceiptNumber')
                payment.status        = Payment.Status.SUCCESS
                payment.save()

                # ── Confirm the Order ─────────────────────────────────────
                order = payment.order
                order.status       = Order.Status.CONFIRMED
                order.confirmed_at = timezone.now()
                order.save(update_fields=['status', 'confirmed_at'])

                logger.info(
                    f"[Tixora-Callback] Payment SUCCESS for order "
                    f"{order.reference}. Receipt: {payment.mpesa_receipt}"
                )

                # ── Generate Tickets ──────────────────────────────────────
                # Phase 7 will implement TicketService.generate_tickets_for_order
                # For now, we call it and handle gracefully if not yet implemented
                try:
                    from apps.tickets.services import TicketService
                    TicketService.generate_tickets_for_order(order)
                    logger.info(
                        f"[Tixora-Callback] Tickets generated for order "
                        f"{order.reference}"
                    )
                except Exception as ticket_error:
                    # Log but don't fail the payment confirmation
                    # Tickets can be regenerated manually if needed
                    logger.error(
                        f"[Tixora-Callback] Ticket generation failed for "
                        f"order {order.reference}: {ticket_error}"
                    )

                return {
                    'processed':    True,
                    'status':       'success',
                    'order':        order.reference,
                    'receipt':      payment.mpesa_receipt,
                }

            else:
                # ── FAILURE PATH ──────────────────────────────────────────
                # Common codes:
                # 1032 = User cancelled
                # 1037 = Timeout (user didn't respond)
                # 2001 = Wrong PIN entered
                payment.status = Payment.Status.FAILED
                payment.save()

                logger.info(
                    f"[Tixora-Callback] Payment FAILED for order "
                    f"{payment.order.reference}. "
                    f"Code: {result_code} | Reason: {result_desc}"
                )

                # Note: We do NOT release the reservation on failure.
                # The user still has time in their reservation window to retry.
                return {
                    'processed': True,
                    'status':    'failed',
                    'reason':    result_desc,
                }

        except Exception as e:
            logger.error(f"[Tixora-Callback] Unhandled error: {e}", exc_info=True)
            return {'processed': False, 'error': str(e)}

    @staticmethod
    def poll_payment_status(customer, order_reference):
        """
        Let the frontend poll payment status.
        Returns the latest payment attempt for the order.
        """
        try:
            order = Order.objects.get(
                reference=order_reference,
                customer=customer
            )
        except Order.DoesNotExist:
            raise ValidationError({'order': 'Order not found.'})

        payment = Payment.objects.filter(
            order=order
        ).order_by('-initiated_at').first()

        if not payment:
            raise ValidationError({'payment': 'No payment found for this order.'})

        # If still pending, query Safaricom directly
        if payment.status == Payment.Status.PENDING:
            try:
                mpesa  = MpesaService()
                result = mpesa.query_stk_status(payment.checkout_request_id)
                # If Safaricom says it's done but callback hasn't arrived,
                # we log it — callback will still arrive and process it
                logger.info(
                    f"[Tixora-Poll] STK status for {order_reference}: "
                    f"{result}"
                )
            except Exception as e:
                logger.warning(f"[Tixora-Poll] Status query failed: {e}")

        return payment