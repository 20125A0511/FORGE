"""Customer management routes for FORGE."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Customer, Ticket
from app.schemas import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    TicketResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.post("/", response_model=CustomerResponse, status_code=201)
async def create_customer(
    customer_in: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new customer."""
    customer = Customer(
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone,
        company=customer_in.company,
        address=customer_in.address,
        location_lat=customer_in.location_lat,
        location_lng=customer_in.location_lng,
        tier=customer_in.tier,
    )
    db.add(customer)
    await db.flush()
    await db.refresh(customer)

    logger.info(f"Created customer #{customer.id}: {customer.name}")
    return customer


@router.get("/", response_model=list[CustomerResponse])
async def list_customers(
    search: str | None = Query(None, description="Search by name, email, or company"),
    db: AsyncSession = Depends(get_db),
):
    """List customers with optional search."""
    query = select(Customer)

    if search:
        search_filter = or_(
            Customer.name.ilike(f"%{search}%"),
            Customer.email.ilike(f"%{search}%"),
            Customer.company.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    query = query.order_by(Customer.name)
    result = await db.execute(query)
    customers = result.scalars().all()
    return [CustomerResponse.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single customer by ID."""
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing customer."""
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    await db.flush()
    await db.refresh(customer)

    logger.info(f"Updated customer #{customer.id}: {update_data.keys()}")
    return customer


@router.get("/{customer_id}/tickets", response_model=list[TicketResponse])
async def get_customer_tickets(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all tickets for a specific customer."""
    # Verify customer exists
    cust_result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    result = await db.execute(
        select(Ticket)
        .where(Ticket.customer_id == customer_id)
        .order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()
    return [TicketResponse.model_validate(t) for t in tickets]
