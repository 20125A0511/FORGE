import math
import logging
from datetime import datetime, timezone
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class WorkerScore:
    worker_id: int
    worker_name: str
    skill_match_score: float  # 0-1
    proximity_score: float    # 0-1
    availability_score: float # 0-1
    performance_score: float  # 0-1
    overall_score: float      # weighted combination
    travel_distance_km: float
    travel_time_minutes: float
    matching_skills: list[str]
    missing_skills: list[str]

class AssignmentService:
    WEIGHTS = {
        "skill_match": 0.40,
        "proximity": 0.30,
        "availability": 0.20,
        "performance": 0.10,
    }
    
    MAX_DISTANCE_KM = 100  # Maximum reasonable travel distance
    AVG_SPEED_KMH = 40     # Average speed for travel time estimation
    
    def rank_workers(self, ticket, workers) -> list[WorkerScore]:
        """Rank all available workers for a given ticket. Takes SQLAlchemy Ticket and Worker objects."""
        scores = []
        for worker in workers:
            if worker.availability_status != "available" or not worker.active:
                continue
            score = self._score_worker(ticket, worker)
            if score is not None:
                scores.append(score)
        
        scores.sort(key=lambda s: s.overall_score, reverse=True)
        return scores
    
    def _score_worker(self, ticket, worker) -> WorkerScore | None:
        """Calculate comprehensive score for a worker-ticket match."""
        # Skill match score
        required_skills = set(ticket.skills_required or [])
        worker_skills = set(worker.skills or [])
        
        if required_skills:
            matching = required_skills & worker_skills
            skill_score = len(matching) / len(required_skills)
            matching_skills = list(matching)
            missing_skills = list(required_skills - worker_skills)
        else:
            skill_score = 1.0  # No specific skills required
            matching_skills = list(worker_skills)
            missing_skills = []
        
        # Skill level bonus
        level_bonus = {"junior": 0, "intermediate": 0.05, "senior": 0.10, "expert": 0.15}
        skill_score = min(1.0, skill_score + level_bonus.get(worker.skill_level, 0))
        
        # Proximity score
        travel_distance = self._haversine_distance(
            ticket.location_lat, ticket.location_lng,
            worker.current_lat, worker.current_lng
        )
        
        if travel_distance is None:
            proximity_score = 0.5  # Unknown location, neutral score
            travel_distance = 20.0  # Assume moderate distance
        elif travel_distance > self.MAX_DISTANCE_KM:
            return None  # Too far, skip this worker
        else:
            proximity_score = max(0, 1.0 - (travel_distance / self.MAX_DISTANCE_KM))
        
        travel_time = (travel_distance / self.AVG_SPEED_KMH) * 60  # minutes
        
        # Availability score
        availability_score = 1.0
        # Penalize workers near their daily limit
        if worker.max_tickets_per_day > 0:
            # We'd need current assignment count, but for now use a simple heuristic
            availability_score = 1.0  # Full availability if status is "available"
        
        # Performance score (normalized from 0-5 rating to 0-1)
        performance_score = (worker.performance_rating / 5.0) * 0.6 + worker.first_time_fix_rate * 0.4
        
        # Calculate weighted overall score
        overall = (
            self.WEIGHTS["skill_match"] * skill_score +
            self.WEIGHTS["proximity"] * proximity_score +
            self.WEIGHTS["availability"] * availability_score +
            self.WEIGHTS["performance"] * performance_score
        )
        
        return WorkerScore(
            worker_id=worker.id,
            worker_name=worker.name,
            skill_match_score=round(skill_score, 3),
            proximity_score=round(proximity_score, 3),
            availability_score=round(availability_score, 3),
            performance_score=round(performance_score, 3),
            overall_score=round(overall, 3),
            travel_distance_km=round(travel_distance, 2),
            travel_time_minutes=round(travel_time, 1),
            matching_skills=matching_skills,
            missing_skills=missing_skills,
        )
    
    @staticmethod
    def _haversine_distance(lat1, lng1, lat2, lng2) -> float | None:
        """Calculate the great-circle distance between two points in km."""
        if any(v is None for v in [lat1, lng1, lat2, lng2]):
            return None
        
        R = 6371  # Earth's radius in kilometers
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c

# Singleton
assignment_service = AssignmentService()
