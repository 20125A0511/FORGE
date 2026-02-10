from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id"), nullable=False
    )
    worker_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workers.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    scheduled_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    eta: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    route: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    actual_arrival: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_completion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    travel_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    travel_time_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    skill_match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    proximity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customer_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    ticket = relationship("Ticket", back_populates="assignment")
    worker = relationship("Worker", back_populates="assignments")

    def __repr__(self) -> str:
        return f"<Assignment(id={self.id}, ticket_id={self.ticket_id}, worker_id={self.worker_id}, status={self.status})>"
