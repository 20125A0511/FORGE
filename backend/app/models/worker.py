from datetime import datetime, time

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    certifications: Mapped[list] = mapped_column(JSON, default=list)
    skill_level: Mapped[str] = mapped_column(
        String(20), default="intermediate", nullable=False
    )
    current_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    availability_status: Mapped[str] = mapped_column(
        String(20), default="available", nullable=False
    )
    shift_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    shift_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    max_tickets_per_day: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    performance_rating: Mapped[float] = mapped_column(
        Float, default=4.0, nullable=False
    )
    total_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_time_fix_rate: Mapped[float] = mapped_column(
        Float, default=0.85, nullable=False
    )
    avg_resolution_minutes: Mapped[float] = mapped_column(
        Float, default=60.0, nullable=False
    )
    service_areas: Mapped[list] = mapped_column(JSON, default=list)
    tools_inventory: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    assigned_tickets = relationship("Ticket", back_populates="assigned_worker")
    assignments = relationship("Assignment", back_populates="worker")

    def __repr__(self) -> str:
        return f"<Worker(id={self.id}, name='{self.name}', status={self.availability_status})>"
