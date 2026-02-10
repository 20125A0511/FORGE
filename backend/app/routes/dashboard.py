"""Dashboard and analytics routes for FORGE."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Assignment, Ticket, Worker
from app.schemas import DashboardStats, TicketResponse, WorkerResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive dashboard statistics."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total tickets
    total_result = await db.execute(select(func.count(Ticket.id)))
    total_tickets = total_result.scalar() or 0

    # Open tickets (status = open or new)
    open_result = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status.in_(["open", "new"]))
    )
    open_tickets = open_result.scalar() or 0

    # In-progress tickets
    in_progress_result = await db.execute(
        select(func.count(Ticket.id)).where(
            Ticket.status.in_(["assigned", "in_progress"])
        )
    )
    in_progress_tickets = in_progress_result.scalar() or 0

    # Completed today
    completed_today_result = await db.execute(
        select(func.count(Ticket.id)).where(
            and_(
                Ticket.status == "completed",
                Ticket.completed_at >= today_start,
            )
        )
    )
    completed_today = completed_today_result.scalar() or 0

    # Average response time (time from creation to first assignment, in minutes)
    avg_response_result = await db.execute(
        select(
            func.avg(
                func.extract(
                    "epoch",
                    Assignment.assigned_at - Ticket.created_at,
                )
                / 60
            )
        ).select_from(Assignment.__table__.join(Ticket.__table__, Assignment.ticket_id == Ticket.id))
    )
    avg_response_minutes = avg_response_result.scalar() or 0.0

    # SLA compliance: completed tickets that were completed before their SLA deadline
    sla_total_result = await db.execute(
        select(func.count(Ticket.id)).where(
            and_(
                Ticket.status == "completed",
                Ticket.sla_deadline.is_not(None),
            )
        )
    )
    sla_total = sla_total_result.scalar() or 0

    sla_met_result = await db.execute(
        select(func.count(Ticket.id)).where(
            and_(
                Ticket.status == "completed",
                Ticket.sla_deadline.is_not(None),
                Ticket.completed_at <= Ticket.sla_deadline,
            )
        )
    )
    sla_met = sla_met_result.scalar() or 0
    sla_compliance_rate = (sla_met / sla_total * 100) if sla_total > 0 else 100.0

    # Worker stats
    active_workers_result = await db.execute(
        select(func.count(Worker.id)).where(
            and_(
                Worker.active == True,  # noqa: E712
                Worker.availability_status.in_(["available", "busy"]),
            )
        )
    )
    active_workers = active_workers_result.scalar() or 0

    total_workers_result = await db.execute(
        select(func.count(Worker.id)).where(Worker.active == True)  # noqa: E712
    )
    total_workers = total_workers_result.scalar() or 0

    # Tickets by severity
    severity_result = await db.execute(
        select(Ticket.severity, func.count(Ticket.id))
        .group_by(Ticket.severity)
    )
    tickets_by_severity = {row[0]: row[1] for row in severity_result.all()}

    # Tickets by status
    status_result = await db.execute(
        select(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
    )
    tickets_by_status = {row[0]: row[1] for row in status_result.all()}

    # Recent tickets (last 10)
    recent_result = await db.execute(
        select(Ticket).order_by(Ticket.created_at.desc()).limit(10)
    )
    recent_tickets = recent_result.scalars().all()

    return DashboardStats(
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        in_progress_tickets=in_progress_tickets,
        completed_today=completed_today,
        avg_response_minutes=round(float(avg_response_minutes), 1),
        sla_compliance_rate=round(sla_compliance_rate, 1),
        active_workers=active_workers,
        total_workers=total_workers,
        tickets_by_severity=tickets_by_severity,
        tickets_by_status=tickets_by_status,
        recent_tickets=[TicketResponse.model_validate(t) for t in recent_tickets],
    )


@router.get("/map-data")
async def get_map_data(
    db: AsyncSession = Depends(get_db),
):
    """Get live map data including active workers and open/in-progress tickets."""
    # Active workers with locations
    workers_result = await db.execute(
        select(Worker).where(
            and_(
                Worker.active == True,  # noqa: E712
                Worker.current_lat.is_not(None),
                Worker.current_lng.is_not(None),
            )
        )
    )
    workers = workers_result.scalars().all()

    # Open and in-progress tickets with locations
    tickets_result = await db.execute(
        select(Ticket).where(
            and_(
                Ticket.status.in_(["open", "new", "assigned", "in_progress"]),
                Ticket.location_lat.is_not(None),
                Ticket.location_lng.is_not(None),
            )
        )
    )
    tickets = tickets_result.scalars().all()

    return {
        "workers": [
            {
                "id": w.id,
                "name": w.name,
                "lat": w.current_lat,
                "lng": w.current_lng,
                "status": w.availability_status,
                "skills": w.skills,
            }
            for w in workers
        ],
        "tickets": [
            {
                "id": t.id,
                "title": t.title,
                "lat": t.location_lat,
                "lng": t.location_lng,
                "severity": t.severity,
                "status": t.status,
                "category": t.category,
            }
            for t in tickets
        ],
    }


@router.get("/sla-alerts")
async def get_sla_alerts(
    db: AsyncSession = Depends(get_db),
):
    """Get tickets at risk of SLA breach (deadline within 2 hours)."""
    now = datetime.now(timezone.utc)
    alert_threshold = now + timedelta(hours=2)

    result = await db.execute(
        select(Ticket).where(
            and_(
                Ticket.status.in_(["open", "new", "assigned", "in_progress"]),
                Ticket.sla_deadline.is_not(None),
                Ticket.sla_deadline <= alert_threshold,
            )
        ).order_by(Ticket.sla_deadline.asc())
    )
    tickets = result.scalars().all()

    return [
        {
            "id": t.id,
            "title": t.title,
            "severity": t.severity,
            "status": t.status,
            "sla_deadline": t.sla_deadline.isoformat() if t.sla_deadline else None,
            "minutes_remaining": (
                (t.sla_deadline - now).total_seconds() / 60
                if t.sla_deadline
                else None
            ),
            "is_breached": t.sla_deadline < now if t.sla_deadline else False,
            "assigned_worker_id": t.assigned_worker_id,
            "category": t.category,
        }
        for t in tickets
    ]
