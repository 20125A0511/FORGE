from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    """Base schema for customer data."""

    name: str
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    tier: str = "standard"


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer."""

    pass


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer."""

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    tier: str | None = None


class CustomerResponse(CustomerBase):
    """Schema for customer response with all fields."""

    id: int
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
