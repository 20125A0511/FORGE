"""Assignment management routes for FORGE."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Assignment, Ticket, Worker
from app.schemas import AssignmentCreate, AssignmentResponse, AssignmentUpdate
from app.services import assignment_service, notification_service
from app.services.optimization_service import optimization_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


async def _get_best_worker(ticket: Ticket, db: AsyncSession) -> Worker:
    """Find the best available worker for a ticket using the assignment service."""
    workers_result = await db.execute(
        select(Worker).where(
            Worker.active == True,  # noqa: E712
            Worker.availability_status == "available",
        )
    )
    workers = workers_result.scalars().all()

    if not workers:
        raise HTTPException(
            status_code=400, detail="No available workers found"
        )

    scores = assignment_service.rank_workers(ticket, workers)
    if not scores:
        raise HTTPException(
            status_code=400,
            detail="No suitable workers found for this ticket's requirements",
        )

    best_score = scores[0]
    # Fetch the full worker ORM object
    result = await db.execute(select(Worker).where(Worker.id == best_score.worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=500, detail="Best worker could not be loaded")
    return worker


def _calculate_eta(worker: Worker, ticket: Ticket) -> dict | None:
    """Calculate ETA using optimization service if coordinates are available."""
    if (
        worker.current_lat is not None
        and worker.current_lng is not None
        and ticket.location_lat is not None
        and ticket.location_lng is not None
    ):
        return optimization_service.calculate_eta(
            worker_lat=worker.current_lat,
            worker_lng=worker.current_lng,
            dest_lat=ticket.location_lat,
            dest_lng=ticket.location_lng,
        )
    return None


@router.post("/", response_model=AssignmentResponse, status_code=201)
async def create_assignment(
    assignment_in: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new assignment, optionally auto-selecting the best worker."""
    # Fetch the ticket
    ticket_result = await db.execute(
        select(Ticket).where(Ticket.id == assignment_in.ticket_id)
    )
    ticket = ticket_result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Determine the worker
    if assignment_in.worker_id:
        worker_result = await db.execute(
            select(Worker).where(Worker.id == assignment_in.worker_id)
        )
        worker = worker_result.scalar_one_or_none()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
    else:
        worker = await _get_best_worker(ticket, db)

    # Calculate ETA and route info
    eta_info = _calculate_eta(worker, ticket)
    eta_datetime = None
    travel_distance = None
    travel_time = None
    if eta_info:
        travel_distance = eta_info["distance_km"]
        travel_time = eta_info["eta_minutes"]
        eta_datetime = datetime.now(timezone.utc) + timedelta(minutes=travel_time)

    # Score the worker-ticket match for record-keeping
    scores = assignment_service.rank_workers(ticket, [worker])
    skill_match = scores[0].skill_match_score if scores else None
    proximity = scores[0].proximity_score if scores else None
    overall = scores[0].overall_score if scores else None

    # Create the assignment
    assignment = Assignment(
        ticket_id=ticket.id,
        worker_id=worker.id,
        status="pending",
        scheduled_time=assignment_in.scheduled_time,
        eta=eta_datetime,
        travel_distance_km=travel_distance,
        travel_time_minutes=travel_time,
        skill_match_score=skill_match,
        proximity_score=proximity,
        overall_score=overall,
        notes=assignment_in.notes,
    )
    db.add(assignment)

    # Update ticket status
    ticket.status = "assigned"
    ticket.assigned_worker_id = worker.id

    # Mark worker as busy
    worker.availability_status = "busy"

    await db.flush()
    await db.refresh(assignment)

    # Send notifications
    try:
        await notification_service.notify_ticket_assigned(ticket, worker)
    except Exception as e:
        logger.warning(f"Failed to send assignment notification: {e}")

    logger.info(
        f"Created assignment #{assignment.id}: ticket #{ticket.id} -> worker #{worker.id} ({worker.name})"
    )
    return assignment


@router.get("/", response_model=list[AssignmentResponse])
async def list_assignments(
    status: str | None = Query(None, description="Filter by assignment status"),
    db: AsyncSession = Depends(get_db),
):
    """List all assignments with optional status filter."""
    query = select(Assignment)
    if status:
        query = query.where(Assignment.status == status)
    query = query.order_by(Assignment.assigned_at.desc())

    result = await db.execute(query)
    assignments = result.scalars().all()
    return [AssignmentResponse.model_validate(a) for a in assignments]


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single assignment by ID."""
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: int,
    assignment_in: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an assignment and handle status transitions."""
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = assignment_in.model_dump(exclude_unset=True)
    new_status = update_data.get("status")

    # Apply updates
    for field, value in update_data.items():
        setattr(assignment, field, value)

    # Handle status transitions
    if new_status:
        # Fetch the associated ticket
        ticket_result = await db.execute(
            select(Ticket).where(Ticket.id == assignment.ticket_id)
        )
        ticket = ticket_result.scalar_one_or_none()

        if new_status == "en_route":
            if ticket:
                ticket.status = "in_progress"
        elif new_status == "arrived":
            assignment.actual_arrival = datetime.now(timezone.utc)
        elif new_status == "in_progress":
            pass  # Ticket already in_progress
        elif new_status == "completed":
            assignment.actual_completion = datetime.now(timezone.utc)
            if ticket:
                ticket.status = "completed"
                ticket.completed_at = datetime.now(timezone.utc)
            # Free up the worker
            worker_result = await db.execute(
                select(Worker).where(Worker.id == assignment.worker_id)
            )
            worker = worker_result.scalar_one_or_none()
            if worker:
                worker.availability_status = "available"
                worker.total_completed = (worker.total_completed or 0) + 1

        # Notify customer of status change
        if ticket:
            try:
                await notification_service.notify_status_change(ticket, new_status)
            except Exception as e:
                logger.warning(f"Failed to send status change notification: {e}")

    await db.flush()
    await db.refresh(assignment)

    logger.info(f"Updated assignment #{assignment.id}: {update_data.keys()}")
    return assignment


@router.post("/auto-assign/{ticket_id}", response_model=AssignmentResponse, status_code=201)
async def auto_assign_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Auto-assign a ticket to the best available worker."""
    # Fetch ticket
    ticket_result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id)
    )
    ticket = ticket_result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status not in ("open", "new"):
        raise HTTPException(
            status_code=400,
            detail=f"Ticket is already in '{ticket.status}' status and cannot be auto-assigned",
        )

    # Find best worker
    worker = await _get_best_worker(ticket, db)

    # Calculate ETA
    eta_info = _calculate_eta(worker, ticket)
    eta_datetime = None
    travel_distance = None
    travel_time = None
    if eta_info:
        travel_distance = eta_info["distance_km"]
        travel_time = eta_info["eta_minutes"]
        eta_datetime = datetime.now(timezone.utc) + timedelta(minutes=travel_time)

    # Score
    scores = assignment_service.rank_workers(ticket, [worker])
    skill_match = scores[0].skill_match_score if scores else None
    proximity = scores[0].proximity_score if scores else None
    overall = scores[0].overall_score if scores else None

    # Create assignment
    assignment = Assignment(
        ticket_id=ticket.id,
        worker_id=worker.id,
        status="pending",
        eta=eta_datetime,
        travel_distance_km=travel_distance,
        travel_time_minutes=travel_time,
        skill_match_score=skill_match,
        proximity_score=proximity,
        overall_score=overall,
    )
    db.add(assignment)

    # Update ticket
    ticket.status = "assigned"
    ticket.assigned_worker_id = worker.id

    # Mark worker busy
    worker.availability_status = "busy"

    await db.flush()
    await db.refresh(assignment)

    # Notifications
    try:
        await notification_service.notify_ticket_assigned(ticket, worker)
    except Exception as e:
        logger.warning(f"Failed to send auto-assignment notification: {e}")

    logger.info(
        f"Auto-assigned ticket #{ticket.id} to worker #{worker.id} ({worker.name})"
    )
    return assignment
