# apps/tickets/qr.py
import io
import uuid
import qrcode
import logging
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


class QRCodeGenerator:
    """
    Generates QR codes for Tixora tickets.

    SECURITY DESIGN:
    - Only encodes the ticket_uuid (a random UUID)
    - UUID is meaningless without our database
    - Scanner sends UUID to API → we validate → we admit or reject
    - No event name, price, or personal data in the QR

    WHY NOT ENCRYPT THE QR CONTENT?
    - A UUID is already effectively a secret (2^122 possible values)
    - Encryption adds complexity with minimal security gain
    - Our validation API is the security layer, not the QR content
    """

    # QR config — tuned for mobile scanning in varying lighting
    QR_VERSION        = 1      # Auto-size based on content
    ERROR_CORRECTION  = qrcode.constants.ERROR_CORRECT_H  # 30% damage recovery
    BOX_SIZE          = 10     # Pixels per QR module
    BORDER            = 4      # Quiet zone modules (QR spec minimum is 4)

    @classmethod
    def generate(cls, ticket_uuid: uuid.UUID) -> ContentFile:
        """
        Generate a QR code image for the given ticket UUID.

        Returns a Django ContentFile ready to be saved to ImageField.

        ERROR_CORRECT_H: highest error correction level.
        A physically printed ticket might get torn, dirty, or
        partially obscured — H level lets the scanner recover
        up to 30% data loss. Worth the slightly larger QR.
        """
        qr = qrcode.QRCode(
            version          = cls.QR_VERSION,
            error_correction = cls.ERROR_CORRECTION,
            box_size         = cls.BOX_SIZE,
            border           = cls.BORDER,
        )

        # The ONLY data in the QR — the ticket UUID as a clean string
        qr.add_data(str(ticket_uuid))
        qr.make(fit=True)

        # Generate image — black on white, standard for scanners
        img = qr.make_image(fill_color='black', back_color='white')

        # Save to in-memory buffer — no temp files on disk
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        filename = f"ticket_{ticket_uuid}.png"

        logger.debug(f"[Tixora-QR] Generated QR for ticket {ticket_uuid}")

        return ContentFile(buffer.read(), name=filename)