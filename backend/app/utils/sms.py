"""SMS utility using Twilio. Falls back to logging when Twilio is not configured."""

import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy-load Twilio client
_twilio_client = None


def _get_client():
    global _twilio_client
    if _twilio_client is None and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client

            _twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            logger.info("[SMS] Twilio client initialized")
        except ImportError:
            logger.warning("[SMS] twilio package not installed — pip install twilio")
        except Exception as e:
            logger.warning("[SMS] Failed to init Twilio client: %s", e)
    return _twilio_client


async def send_sms(to: str, body: str) -> bool:
    """
    Send an SMS message. Returns True if sent successfully.
    Falls back to log-only when Twilio is not configured.
    """
    if not to:
        logger.warning("[SMS] No phone number provided, skipping")
        return False

    # Normalize: strip spaces, ensure starts with +
    to = to.strip().replace(" ", "").replace("-", "")
    if not to.startswith("+"):
        to = "+1" + to  # assume US if no country code

    client = _get_client()
    if client and settings.TWILIO_PHONE_NUMBER:
        try:
            message = client.messages.create(
                body=body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=to,
            )
            logger.info("[SMS] Sent to %s, SID: %s", to, message.sid)
            return True
        except Exception as e:
            logger.error("[SMS] Failed to send to %s: %s", to, e)
            return False
    else:
        # Dev mode: just log
        logger.info("[SMS-DEV] Would send to %s:\n%s", to, body)
        return True
