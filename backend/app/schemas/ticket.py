from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TicketBase(BaseModel):
    """Base schema for ticket data."""

    title: str
    description: str
    equipment_type: str | None = None
    category: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    location_address: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None


class TicketCreate(TicketBase):
    """Schema for creating a new ticket."""

    customer_id: int | None = None


class TicketUpdate(BaseModel):
    """Schema for updating an existing ticket."""

    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    equipment_type: str | None = None
    category: str | None = None
    assigned_worker_id: int | None = None
    resolution_notes: str | None = None


class TicketResponse(TicketBase):
    """Schema for ticket response with all computed fields."""

    id: int
    severity: str
    status: str
    skills_required: list[str]
    time_estimate_minutes: int | None
    sla_deadline: datetime | None
    assigned_worker_id: int | None
    llm_analysis: dict | None
    confidence_score: float | None
    resolution_notes: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    """Paginated list of tickets."""

    tickets: list[TicketResponse]
    total: int
    page: int
    page_size: int


class LLMAnalysisResponse(BaseModel):
    """Schema for LLM analysis results."""

    severity: str
    confidence: float
    equipment_type: str | None
    category: str | None
    skills_required: list[str]
    time_estimate_minutes: int
    summary: str
    troubleshooting_steps: list[str]
