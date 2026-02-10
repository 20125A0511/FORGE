"""Customer portal chat: conversations and AI agent."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Conversation, ConversationMessage, Customer
from app.schemas.portal import (
    ChatMessage,
    ConversationDetail,
    ConversationSummary,
    SendMessageRequest,
    SendMessageResponse,
)
from app.services.conversation_agent import conversation_agent
from app.utils.auth import get_current_customer_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portal", tags=["Portal Chat"])


async def _get_customer(
    customer_id: int,
    db: AsyncSession,
) -> Customer:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/conversations")
async def create_conversation(
    customer_id: int = Depends(get_current_customer_id),
    db: AsyncSession = Depends(get_db),
):
    """Start a new conversation. Returns conversation id."""
    customer = await _get_customer(customer_id, db)
    conv = Conversation(customer_id=customer.id)
    db.add(conv)
    await db.flush()
    await db.refresh(conv)
    # Optional: add a welcome message from assistant
    welcome = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        content="Hi! I'm your FORGE support assistant. What type of service do you need today? (e.g. HVAC, Plumbing, Electrical) Describe your issue and I'll try to help.",
    )
    db.add(welcome)
    await db.flush()
    return {"conversation_id": conv.id, "message": welcome.content}


@router.get("/conversations")
async def list_conversations(
    customer_id: int = Depends(get_current_customer_id),
    db: AsyncSession = Depends(get_db),
):
    """List conversations for the current customer."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.customer_id == customer_id)
        .order_by(Conversation.updated_at.desc())
    )
    convs = result.scalars().all()
    summaries = []
    for c in convs:
        count_result = await db.execute(
            select(ConversationMessage).where(ConversationMessage.conversation_id == c.id)
        )
        count = len(count_result.scalars().all())
        summaries.append(
            ConversationSummary(
                id=c.id,
                customer_id=c.customer_id,
                ticket_id=c.ticket_id,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=count,
            )
        )
    return {"conversations": summaries}


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    customer_id: int = Depends(get_current_customer_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.customer_id == customer_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msg_result = await db.execute(
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conv.id)
        .order_by(ConversationMessage.created_at)
    )
    messages = msg_result.scalars().all()
    return ConversationDetail(
        id=conv.id,
        customer_id=conv.customer_id,
        ticket_id=conv.ticket_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[
            ChatMessage(
                role=m.role,
                content=m.content,
                metadata=m.metadata_,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.post("/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conversation_id: int,
    body: SendMessageRequest,
    customer_id: int = Depends(get_current_customer_id),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get the AI assistant reply. May create a ticket if user requests service."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.customer_id == customer_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    customer = await _get_customer(customer_id, db)

    # Load conversation history
    msg_result = await db.execute(
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conv.id)
        .order_by(ConversationMessage.created_at)
    )
    history = msg_result.scalars().all()
    messages_for_agent = [
        {"role": m.role, "content": m.content}
        for m in history
    ]
    messages_for_agent.append({"role": "user", "content": body.content})

    # Save user message
    user_msg = ConversationMessage(
        conversation_id=conv.id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    await db.flush()

    # Get AI reply (and optional ticket creation)
    reply_text, metadata = await conversation_agent.reply(
        messages=messages_for_agent,
        customer=customer,
        db=db,
    )

    # If a ticket was created, link it to conversation
    ticket_id = None
    ticket_severity = None
    ticket_status = None
    tracking_token = None
    if metadata and metadata.get("ticket_created"):
        ticket_id = metadata.get("ticket_id")
        ticket_severity = metadata.get("ticket_severity")
        ticket_status = metadata.get("ticket_status")
        tracking_token = metadata.get("tracking_token")
        conv.ticket_id = ticket_id
        await db.flush()

    # Save assistant message
    assistant_msg = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        content=reply_text,
        metadata_=metadata,
    )
    db.add(assistant_msg)
    await db.flush()
    await db.refresh(assistant_msg)

    return SendMessageResponse(
        message=ChatMessage(
            role="assistant",
            content=reply_text,
            metadata=metadata,
            created_at=assistant_msg.created_at,
        ),
        ticket_created=bool(metadata and metadata.get("ticket_created")),
        ticket_id=ticket_id,
        ticket_severity=ticket_severity,
        ticket_status=ticket_status,
        tracking_token=tracking_token,
    )
