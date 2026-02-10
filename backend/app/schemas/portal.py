"""Pydantic schemas for customer portal (auth + chat)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RequestOTPRequest(BaseModel):
    """Request OTP for email or phone."""

    contact: str = Field(..., min_length=3, description="Email address or phone number")
    contact_type: str = Field(..., pattern="^(email|phone)$")


class RequestOTPResponse(BaseModel):
    """Response after requesting OTP (OTP is sent via channel, not returned in prod)."""

    success: bool = True
    message: str = "OTP sent. Check your email or phone."
    # Dev only: include OTP in response when DEBUG=True
    otp_dev: str | None = None


class VerifyOTPRequest(BaseModel):
    """Verify OTP and complete auth."""

    contact: str = Field(..., min_length=3)
    contact_type: str = Field(..., pattern="^(email|phone)$")
    otp: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]+$")


class VerifyOTPResponse(BaseModel):
    """Response with JWT and customer info."""

    access_token: str
    token_type: str = "bearer"
    customer_id: int
    customer_name: str
    customer_email: str | None = None
    customer_phone: str | None = None


class ChatMessage(BaseModel):
    """Single chat message."""

    role: str  # user, assistant
    content: str
    metadata: dict | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SendMessageRequest(BaseModel):
    """User sends a message in the conversation."""

    content: str = Field(..., min_length=1, max_length=8000)


class SendMessageResponse(BaseModel):
    """Assistant reply and optional ticket created."""

    message: ChatMessage
    ticket_created: bool = False
    ticket_id: int | None = None
    ticket_severity: str | None = None
    ticket_status: str | None = None
    tracking_token: str | None = None


class ConversationSummary(BaseModel):
    """Summary of a conversation for list view."""

    id: int
    customer_id: int
    ticket_id: int | None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(BaseModel):
    """Conversation with messages."""

    id: int
    customer_id: int
    ticket_id: int | None
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessage] = []

    model_config = ConfigDict(from_attributes=True)
