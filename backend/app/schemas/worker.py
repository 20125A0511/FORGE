from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkerBase(BaseModel):
    """Base schema for worker data."""

    name: str
    email: str
    phone: str | None = None
    skills: list[str] = []
    certifications: list[str] = []
    skill_level: str = "intermediate"
    service_areas: list[str] = []


class WorkerCreate(WorkerBase):
    """Schema for creating a new worker."""

    pass


class WorkerUpdate(BaseModel):
    """Schema for updating an existing worker."""

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    skills: list[str] | None = None
    certifications: list[str] | None = None
    skill_level: str | None = None
    current_lat: float | None = None
    current_lng: float | None = None
    availability_status: str | None = None
    shift_start: str | None = None
    shift_end: str | None = None
    service_areas: list[str] | None = None


class WorkerResponse(WorkerBase):
    """Schema for worker response with all fields."""

    id: int
    avatar_url: str | None
    current_lat: float | None
    current_lng: float | None
    availability_status: str
    shift_start: str | None
    shift_end: str | None
    max_tickets_per_day: int
    performance_rating: float
    total_completed: int
    first_time_fix_rate: float
    avg_resolution_minutes: float
    tools_inventory: list[str]
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkerListResponse(BaseModel):
    """Paginated list of workers."""

    workers: list[WorkerResponse]
    total: int
