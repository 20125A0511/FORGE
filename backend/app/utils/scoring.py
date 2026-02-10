"""Utility functions for scoring and calculations."""
import math
from datetime import datetime, timedelta, timezone


def calculate_sla_deadline(severity: str, created_at: datetime | None = None) -> datetime:
    """Calculate SLA deadline based on severity level."""
    if created_at is None:
        created_at = datetime.now(timezone.utc)
    
    sla_hours = {
        "P1": 2,
        "P2": 4,
        "P3": 24,
        "P4": 72,
    }
    hours = sla_hours.get(severity, 24)
    return created_at + timedelta(hours=hours)


def is_within_sla(sla_deadline: datetime | None) -> bool:
    """Check if current time is within SLA deadline."""
    if sla_deadline is None:
        return True
    now = datetime.now(timezone.utc)
    return now < sla_deadline


def sla_time_remaining_minutes(sla_deadline: datetime | None) -> float | None:
    """Calculate minutes remaining until SLA deadline."""
    if sla_deadline is None:
        return None
    now = datetime.now(timezone.utc)
    delta = sla_deadline - now
    return delta.total_seconds() / 60


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance between two GPS coordinates in kilometers."""
    R = 6371  # Earth's radius in km
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def estimate_travel_time_minutes(distance_km: float, avg_speed_kmh: float = 40.0) -> float:
    """Estimate travel time in minutes given distance and average speed."""
    if avg_speed_kmh <= 0:
        return 0.0
    return (distance_km / avg_speed_kmh) * 60
