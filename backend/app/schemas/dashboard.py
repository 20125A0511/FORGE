from pydantic import BaseModel

from app.schemas.ticket import TicketResponse


class DashboardStats(BaseModel):
    """Schema for dashboard statistics overview."""

    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    completed_today: int
    avg_response_minutes: float
    sla_compliance_rate: float
    active_workers: int
    total_workers: int
    tickets_by_severity: dict[str, int]
    tickets_by_status: dict[str, int]
    recent_tickets: list[TicketResponse]
