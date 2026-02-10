"""Technician service request detail — public endpoint accessed via link in SMS."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Assignment, Customer, Ticket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sr", tags=["Service Request Detail"])


class CustomerInfo(BaseModel):
    name: str | None
    email: str | None
    phone: str | None
    address: str | None
    company: str | None


class SRDetailResponse(BaseModel):
    ticket_id: int
    title: str
    description: str
    severity: str
    status: str
    category: str | None
    equipment_type: str | None
    skills_required: list[str]
    time_estimate_minutes: int | None
    location_lat: float | None
    location_lng: float | None
    location_address: str | None
    sla_deadline: str | None
    created_at: str
    customer: CustomerInfo | None
    assignment_status: str | None
    assignment_eta: str | None
    assignment_notes: str | None


@router.get("/{ticket_id}", response_model=SRDetailResponse)
async def get_sr_detail(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint for technician: get full SR details."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Service request not found")

    # Customer info
    customer_info = None
    if ticket.customer_id:
        cust_result = await db.execute(
            select(Customer).where(Customer.id == ticket.customer_id)
        )
        customer = cust_result.scalar_one_or_none()
        if customer:
            customer_info = CustomerInfo(
                name=customer.name,
                email=customer.email,
                phone=customer.phone,
                address=customer.address,
                company=customer.company,
            )
    elif ticket.customer_name or ticket.customer_email or ticket.customer_phone:
        customer_info = CustomerInfo(
            name=ticket.customer_name,
            email=ticket.customer_email,
            phone=ticket.customer_phone,
            address=ticket.location_address,
            company=None,
        )

    # Assignment info
    assignment_result = await db.execute(
        select(Assignment).where(Assignment.ticket_id == ticket.id)
    )
    assignment = assignment_result.scalar_one_or_none()

    return SRDetailResponse(
        ticket_id=ticket.id,
        title=ticket.title,
        description=ticket.description,
        severity=ticket.severity,
        status=ticket.status,
        category=ticket.category,
        equipment_type=ticket.equipment_type,
        skills_required=ticket.skills_required or [],
        time_estimate_minutes=ticket.time_estimate_minutes,
        location_lat=ticket.location_lat,
        location_lng=ticket.location_lng,
        location_address=ticket.location_address,
        sla_deadline=str(ticket.sla_deadline) if ticket.sla_deadline else None,
        created_at=str(ticket.created_at),
        customer=customer_info,
        assignment_status=assignment.status if assignment else None,
        assignment_eta=str(assignment.eta) if assignment and assignment.eta else None,
        assignment_notes=assignment.notes if assignment else None,
    )
