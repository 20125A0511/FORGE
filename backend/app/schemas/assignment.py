from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AssignmentCreate(BaseModel):
    """Schema for creating a new assignment."""

    ticket_id: int
    worker_id: int | None = None
    scheduled_time: datetime | None = None
    notes: str | None = None


class AssignmentUpdate(BaseModel):
    """Schema for updating an existing assignment."""

    status: str | None = None
    eta: datetime | None = None
    notes: str | None = None
    customer_rating: int | None = None
    customer_feedback: str | None = None


class AssignmentResponse(BaseModel):
    """Schema for assignment response with all fields."""

    id: int
    ticket_id: int
    worker_id: int
    status: str
    assigned_at: datetime
    scheduled_time: datetime | None
    eta: datetime | None
    route: dict | None
    actual_arrival: datetime | None
    actual_completion: datetime | None
    travel_distance_km: float | None
    travel_time_minutes: float | None
    skill_match_score: float | None
    proximity_score: float | None
    overall_score: float | None
    notes: str | None
    customer_rating: int | None
    customer_feedback: str | None

    model_config = ConfigDict(from_attributes=True)
