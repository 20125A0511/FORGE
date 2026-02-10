"""In-memory OTP store for customer portal auth. Use Redis in production."""

import logging
import random
import string
from datetime import datetime, timezone, timedelta
from threading import Lock

logger = logging.getLogger(__name__)

# In-memory: contact -> { otp, expires_at }
_otp_store: dict[str, dict] = {}
_lock = Lock()

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10


def _normalize_contact(contact: str, contact_type: str) -> str:
    """Normalize email or phone for storage key."""
    s = (contact or "").strip().lower()
    if contact_type == "phone":
        s = "".join(c for c in s if c.isdigit())
    return s or contact


def generate_otp() -> str:
    """Generate a 6-digit numeric OTP."""
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def store_otp(contact: str, contact_type: str) -> str:
    """Store OTP for contact, return the OTP (to send to user)."""
    key = _normalize_contact(contact, contact_type)
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    with _lock:
        _otp_store[key] = {"otp": otp, "expires_at": expires_at}
    logger.info(f"[OTP] Stored for {contact_type} key (dev only - OTP: {otp})")
    return otp


def verify_otp(contact: str, contact_type: str, otp: str) -> bool:
    """Verify OTP for contact. Returns True if valid, False otherwise."""
    key = _normalize_contact(contact, contact_type)
    with _lock:
        entry = _otp_store.get(key)
        if not entry:
            return False
        now = datetime.now(timezone.utc)
        if now > entry["expires_at"]:
            del _otp_store[key]
            return False
        if entry["otp"] != otp:
            return False
        del _otp_store[key]
    return True
