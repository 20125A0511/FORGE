"""Customer portal auth: OTP request and verify."""

import logging
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Customer
from app.schemas.portal import (
    RequestOTPRequest,
    RequestOTPResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.utils.auth import create_portal_token
from app.utils.otp_store import store_otp, verify_otp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portal/auth", tags=["Portal Auth"])

EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def _is_email(s: str) -> bool:
    return bool(EMAIL_PATTERN.match((s or "").strip()))


@router.post("/request-otp", response_model=RequestOTPResponse)
async def request_otp(
    body: RequestOTPRequest,
):
    """Send OTP to email or phone. In dev, OTP is returned in response when DEBUG=True."""
    contact = (body.contact or "").strip()
    if not contact:
        raise HTTPException(status_code=400, detail="Contact is required")
    contact_type = body.contact_type
    if _is_email(contact) and contact_type != "email":
        contact_type = "email"
    elif not _is_email(contact) and contact_type != "phone":
        contact_type = "phone"
    otp = store_otp(contact, contact_type)
    resp = RequestOTPResponse(success=True, message="OTP sent. Check your email or phone.")
    if settings.DEBUG:
        resp.otp_dev = otp
    return resp


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp_endpoint(
    body: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify OTP and return JWT + customer info. Creates customer if not found."""
    contact = (body.contact or "").strip()
    if not contact or not body.otp:
        raise HTTPException(status_code=400, detail="Contact and OTP are required")
    contact_type = body.contact_type
    if _is_email(contact):
        contact_type = "email"
    else:
        contact_type = "phone"

    if not verify_otp(contact, contact_type, body.otp.strip()):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Find or create customer
    if contact_type == "email":
        result = await db.execute(select(Customer).where(Customer.email == contact))
    else:
        result = await db.execute(select(Customer).where(Customer.phone == contact))
    customer = result.scalar_one_or_none()

    if not customer:
        name = contact
        if contact_type == "email":
            name = contact.split("@")[0].replace(".", " ").replace("_", " ").title()
        customer = Customer(
            name=name,
            email=contact if contact_type == "email" else None,
            phone=contact if contact_type == "phone" else None,
        )
        db.add(customer)
        await db.flush()
        await db.refresh(customer)
        logger.info("Created new portal customer: id=%s, contact=%s", customer.id, contact)

    token = create_portal_token(customer.id)
    return VerifyOTPResponse(
        access_token=token,
        token_type="bearer",
        customer_id=customer.id,
        customer_name=customer.name,
        customer_email=customer.email,
        customer_phone=customer.phone,
    )
