import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _gen_tracking_token() -> str:
    return uuid.uuid4().hex


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tracking_token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, default=_gen_tracking_token
    )
    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    raw_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(2), default="P3", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="new", nullable=False)
    equipment_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    skills_required: Mapped[list] = mapped_column(JSON, default=list)
    time_estimate_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sla_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    assigned_worker_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("workers.id"), nullable=True
    )
    llm_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    customer = relationship("Customer", back_populates="tickets")
    assigned_worker = relationship("Worker", back_populates="assigned_tickets")
    assignment = relationship("Assignment", back_populates="ticket", uselist=False)
    conversation = relationship(
        "Conversation", back_populates="ticket", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Ticket(id={self.id}, title='{self.title}', severity={self.severity}, status={self.status})>"
