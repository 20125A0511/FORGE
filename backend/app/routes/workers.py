"""Worker management routes for FORGE."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Assignment, Worker
from app.schemas import (
    AssignmentResponse,
    WorkerCreate,
    WorkerListResponse,
    WorkerResponse,
    WorkerUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workers", tags=["Workers"])


@router.post("/", response_model=WorkerResponse, status_code=201)
async def create_worker(
    worker_in: WorkerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new field worker."""
    worker = Worker(
        name=worker_in.name,
        email=worker_in.email,
        phone=worker_in.phone,
        skills=worker_in.skills,
        certifications=worker_in.certifications,
        skill_level=worker_in.skill_level,
        service_areas=worker_in.service_areas,
    )
    db.add(worker)
    await db.flush()
    await db.refresh(worker)

    logger.info(f"Created worker #{worker.id}: {worker.name}")
    return worker


@router.get("/", response_model=WorkerListResponse)
async def list_workers(
    status: str | None = Query(None, description="Filter by availability status"),
    skill: str | None = Query(None, description="Filter by skill"),
    search: str | None = Query(None, description="Search by name or email"),
    db: AsyncSession = Depends(get_db),
):
    """List workers with optional filters."""
    query = select(Worker).where(Worker.active == True)  # noqa: E712
    count_query = select(func.count(Worker.id)).where(Worker.active == True)  # noqa: E712

    if status:
        query = query.where(Worker.availability_status == status)
        count_query = count_query.where(Worker.availability_status == status)
    if skill:
        # Filter workers whose skills JSON array contains the given skill
        query = query.where(Worker.skills.contains([skill]))
        count_query = count_query.where(Worker.skills.contains([skill]))
    if search:
        search_filter = or_(
            Worker.name.ilike(f"%{search}%"),
            Worker.email.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Worker.name)
    result = await db.execute(query)
    workers = result.scalars().all()

    return WorkerListResponse(
        workers=[WorkerResponse.model_validate(w) for w in workers],
        total=total,
    )


@router.get("/{worker_id}", response_model=WorkerResponse)
async def get_worker(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single worker by ID."""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker


@router.patch("/{worker_id}", response_model=WorkerResponse)
async def update_worker(
    worker_id: int,
    worker_in: WorkerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing worker."""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    update_data = worker_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(worker, field, value)

    await db.flush()
    await db.refresh(worker)

    logger.info(f"Updated worker #{worker.id}: {update_data.keys()}")
    return worker


@router.patch("/{worker_id}/location", response_model=WorkerResponse)
async def update_worker_location(
    worker_id: int,
    location: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update a worker's GPS location."""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    lat = location.get("lat")
    lng = location.get("lng")
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Both 'lat' and 'lng' are required")

    worker.current_lat = float(lat)
    worker.current_lng = float(lng)

    await db.flush()
    await db.refresh(worker)

    logger.info(f"Updated location for worker #{worker.id}: ({lat}, {lng})")
    return worker


@router.patch("/{worker_id}/status", response_model=WorkerResponse)
async def update_worker_status(
    worker_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update a worker's availability status."""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="'status' is required")

    valid_statuses = {"available", "busy", "on_break", "off_duty"}
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}",
        )

    worker.availability_status = new_status

    await db.flush()
    await db.refresh(worker)

    logger.info(f"Updated status for worker #{worker.id}: {new_status}")
    return worker


@router.get("/{worker_id}/assignments", response_model=list[AssignmentResponse])
async def get_worker_assignments(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all assignments for a specific worker."""
    # Verify worker exists
    worker_result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = worker_result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    result = await db.execute(
        select(Assignment)
        .where(Assignment.worker_id == worker_id)
        .order_by(Assignment.assigned_at.desc())
    )
    assignments = result.scalars().all()
    return [AssignmentResponse.model_validate(a) for a in assignments]
