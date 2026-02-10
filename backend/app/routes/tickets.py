"""Ticket management routes for FORGE."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Customer, Ticket, Worker
from app.schemas import (
    LLMAnalysisResponse,
    TicketCreate,
    TicketListResponse,
    TicketResponse,
    TicketUpdate,
)
from app.services import assignment_service, llm_service, notification_service
from app.utils.scoring import calculate_sla_deadline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.post("/", response_model=TicketResponse, status_code=201)
async def create_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new service ticket with AI-powered analysis."""
    # Build the ticket ORM object
    ticket = Ticket(
        title=ticket_in.title,
        description=ticket_in.description,
        raw_description=ticket_in.description,
        equipment_type=ticket_in.equipment_type,
        category=ticket_in.category,
        location_lat=ticket_in.location_lat,
        location_lng=ticket_in.location_lng,
        location_address=ticket_in.location_address,
        customer_name=ticket_in.customer_name,
        customer_email=ticket_in.customer_email,
        customer_phone=ticket_in.customer_phone,
        customer_id=ticket_in.customer_id,
        status="open",
    )

    # Look up customer tier for LLM context
    customer_tier = "standard"
    if ticket_in.customer_id:
        result = await db.execute(
            select(Customer).where(Customer.id == ticket_in.customer_id)
        )
        customer = result.scalar_one_or_none()
        if customer:
            customer_tier = customer.tier

    # Run LLM analysis
    try:
        analysis = await llm_service.analyze_ticket(
            title=ticket_in.title,
            description=ticket_in.description,
            customer_tier=customer_tier,
        )
        ticket.severity = analysis.severity
        ticket.equipment_type = analysis.equipment_type or ticket.equipment_type
        ticket.category = analysis.category or ticket.category
        ticket.skills_required = analysis.skills_required
        ticket.time_estimate_minutes = analysis.time_estimate_minutes
        ticket.llm_analysis = analysis.model_dump()
        ticket.confidence_score = analysis.confidence
    except Exception as e:
        logger.error(f"LLM analysis failed during ticket creation: {e}")
        ticket.severity = "P3"

    # Calculate SLA deadline
    ticket.sla_deadline = calculate_sla_deadline(ticket.severity)

    db.add(ticket)
    await db.flush()
    await db.refresh(ticket)

    # Send notification (fire-and-forget style)
    try:
        await notification_service.notify_ticket_created(ticket)
    except Exception as e:
        logger.warning(f"Failed to send ticket creation notification: {e}")

    logger.info(f"Created ticket #{ticket.id}: {ticket.title} [severity={ticket.severity}]")
    return ticket


@router.get("/", response_model=TicketListResponse)
async def list_tickets(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: str | None = Query(None, description="Filter by status"),
    severity: str | None = Query(None, description="Filter by severity"),
    search: str | None = Query(None, description="Search in title and description"),
    db: AsyncSession = Depends(get_db),
):
    """List tickets with pagination and optional filters."""
    query = select(Ticket)
    count_query = select(func.count(Ticket.id))

    # Apply filters
    if status:
        query = query.where(Ticket.status == status)
        count_query = count_query.where(Ticket.status == status)
    if severity:
        query = query.where(Ticket.severity == severity)
        count_query = count_query.where(Ticket.severity == severity)
    if search:
        search_filter = or_(
            Ticket.title.ilike(f"%{search}%"),
            Ticket.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply ordering and pagination
    offset = (page - 1) * page_size
    query = query.order_by(Ticket.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    tickets = result.scalars().all()

    return TicketListResponse(
        tickets=[TicketResponse.model_validate(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single ticket by ID."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_in: TicketUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing ticket."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = ticket_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)

    # If status changes to completed, record completion time
    if ticket_in.status == "completed" and ticket.completed_at is None:
        ticket.completed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(ticket)

    logger.info(f"Updated ticket #{ticket.id}: {update_data.keys()}")
    return ticket


@router.post("/{ticket_id}/analyze", response_model=LLMAnalysisResponse)
async def reanalyze_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Re-analyze a ticket using the LLM."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Look up customer tier
    customer_tier = "standard"
    if ticket.customer_id:
        cust_result = await db.execute(
            select(Customer).where(Customer.id == ticket.customer_id)
        )
        customer = cust_result.scalar_one_or_none()
        if customer:
            customer_tier = customer.tier

    analysis = await llm_service.analyze_ticket(
        title=ticket.title,
        description=ticket.raw_description or ticket.description,
        customer_tier=customer_tier,
    )

    # Update ticket with new analysis
    ticket.severity = analysis.severity
    ticket.equipment_type = analysis.equipment_type or ticket.equipment_type
    ticket.category = analysis.category or ticket.category
    ticket.skills_required = analysis.skills_required
    ticket.time_estimate_minutes = analysis.time_estimate_minutes
    ticket.llm_analysis = analysis.model_dump()
    ticket.confidence_score = analysis.confidence
    ticket.sla_deadline = calculate_sla_deadline(analysis.severity)

    await db.flush()
    await db.refresh(ticket)

    logger.info(f"Re-analyzed ticket #{ticket.id}: severity={analysis.severity}")
    return analysis


@router.get("/{ticket_id}/candidates")
async def get_worker_candidates(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get ranked worker candidates for a ticket assignment."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Query available workers
    workers_result = await db.execute(
        select(Worker).where(
            Worker.active == True,  # noqa: E712
            Worker.availability_status == "available",
        )
    )
    workers = workers_result.scalars().all()

    if not workers:
        return []

    # Rank workers using the assignment service
    scores = assignment_service.rank_workers(ticket, workers)
    return [
        {
            "worker_id": s.worker_id,
            "worker_name": s.worker_name,
            "skill_match_score": s.skill_match_score,
            "proximity_score": s.proximity_score,
            "availability_score": s.availability_score,
            "performance_score": s.performance_score,
            "overall_score": s.overall_score,
            "travel_distance_km": s.travel_distance_km,
            "travel_time_minutes": s.travel_time_minutes,
            "matching_skills": s.matching_skills,
            "missing_skills": s.missing_skills,
        }
        for s in scores
    ]
