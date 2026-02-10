"""Public tracking API — no auth required. Accessed via unique tracking_token."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Assignment, Ticket, Worker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/track", tags=["Tracking"])


class TechnicianInfo(BaseModel):
    name: str
    phone: str | None
    current_lat: float | None
    current_lng: float | None
    avatar_url: str | None


class AssignmentInfo(BaseModel):
    status: str
    eta: datetime | None
    assigned_at: datetime | None
    travel_distance_km: float | None
    travel_time_minutes: float | None
    actual_arrival: datetime | None
    actual_completion: datetime | None


class TrackingResponse(BaseModel):
    ticket_id: int
    title: str
    description: str
    severity: str
    status: str
    category: str | None
    equipment_type: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    location_lat: float | None
    location_lng: float | None
    location_address: str | None
    sla_deadline: datetime | None
    technician: TechnicianInfo | None
    assignment: AssignmentInfo | None


@router.get("/{tracking_token}", response_model=TrackingResponse)
async def get_tracking_info(
    tracking_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: get service request status by tracking token."""
    result = await db.execute(
        select(Ticket).where(Ticket.tracking_token == tracking_token)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Service request not found")

    # Build technician info if assigned
    technician = None
    assignment_info = None

    if ticket.assigned_worker_id:
        worker_result = await db.execute(
            select(Worker).where(Worker.id == ticket.assigned_worker_id)
        )
        worker = worker_result.scalar_one_or_none()
        if worker:
            technician = TechnicianInfo(
                name=worker.name,
                phone=worker.phone,
                current_lat=worker.current_lat,
                current_lng=worker.current_lng,
                avatar_url=worker.avatar_url,
            )

    # Get assignment info
    assignment_result = await db.execute(
        select(Assignment).where(Assignment.ticket_id == ticket.id)
    )
    assignment = assignment_result.scalar_one_or_none()
    if assignment:
        assignment_info = AssignmentInfo(
            status=assignment.status,
            eta=assignment.eta,
            assigned_at=assignment.assigned_at,
            travel_distance_km=assignment.travel_distance_km,
            travel_time_minutes=assignment.travel_time_minutes,
            actual_arrival=assignment.actual_arrival,
            actual_completion=assignment.actual_completion,
        )

    return TrackingResponse(
        ticket_id=ticket.id,
        title=ticket.title,
        description=ticket.description,
        severity=ticket.severity,
        status=ticket.status,
        category=ticket.category,
        equipment_type=ticket.equipment_type,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        completed_at=ticket.completed_at,
        location_lat=ticket.location_lat,
        location_lng=ticket.location_lng,
        location_address=ticket.location_address,
        sla_deadline=ticket.sla_deadline,
        technician=technician,
        assignment=assignment_info,
    )
