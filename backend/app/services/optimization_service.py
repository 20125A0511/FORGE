"""Route optimization service for FORGE.

Provides single-worker route optimization (nearest-neighbor TSP heuristic),
multi-worker fleet optimization (geographic clustering + per-worker TSP),
and simple ETA calculations using haversine distances.
"""

import math
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class RouteStop:
    """A single stop along an optimized route."""

    location_lat: float
    location_lng: float
    location_address: str | None
    ticket_id: int | None
    order: int
    distance_from_previous_km: float
    estimated_arrival_minutes: float


@dataclass
class OptimizedRoute:
    """The result of a route optimization for one worker."""

    stops: list[RouteStop]
    total_distance_km: float
    total_time_minutes: float
    worker_id: int | None = None


class OptimizationService:
    """Route and fleet optimization service.

    Uses a nearest-neighbor heuristic for the Travelling Salesman Problem (TSP)
    and simple geographic clustering for multi-worker scenarios.
    """

    AVG_SPEED_KMH: float = 40.0  # Average travel speed for ETA estimates

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def optimize_route(
        self,
        worker_location: tuple[float, float],
        job_locations: list[dict],
    ) -> OptimizedRoute:
        """Optimize the visiting order for a single worker using nearest-neighbor TSP.

        Args:
            worker_location: ``(lat, lng)`` of the worker's current position.
            job_locations: List of dicts, each containing at least
                ``location_lat``, ``location_lng``, and optionally
                ``location_address`` and ``ticket_id``.

        Returns:
            An :class:`OptimizedRoute` with stops in optimized order.
        """
        if not job_locations:
            return OptimizedRoute(stops=[], total_distance_km=0.0, total_time_minutes=0.0)

        # Build index of unvisited jobs
        unvisited = list(range(len(job_locations)))
        ordered: list[int] = []

        current_lat, current_lng = worker_location

        while unvisited:
            nearest_idx = None
            nearest_dist = float("inf")
            for idx in unvisited:
                job = job_locations[idx]
                dist = self._haversine(
                    current_lat, current_lng,
                    job["location_lat"], job["location_lng"],
                )
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest_idx = idx

            unvisited.remove(nearest_idx)
            ordered.append(nearest_idx)
            job = job_locations[nearest_idx]
            current_lat = job["location_lat"]
            current_lng = job["location_lng"]

        # Build RouteStop list
        stops: list[RouteStop] = []
        total_distance = 0.0
        total_time = 0.0
        prev_lat, prev_lng = worker_location

        for order, idx in enumerate(ordered):
            job = job_locations[idx]
            dist = self._haversine(prev_lat, prev_lng, job["location_lat"], job["location_lng"])
            travel_min = self._travel_minutes(dist)
            total_distance += dist
            total_time += travel_min

            stops.append(
                RouteStop(
                    location_lat=job["location_lat"],
                    location_lng=job["location_lng"],
                    location_address=job.get("location_address"),
                    ticket_id=job.get("ticket_id"),
                    order=order + 1,
                    distance_from_previous_km=round(dist, 2),
                    estimated_arrival_minutes=round(total_time, 1),
                )
            )
            prev_lat = job["location_lat"]
            prev_lng = job["location_lng"]

        return OptimizedRoute(
            stops=stops,
            total_distance_km=round(total_distance, 2),
            total_time_minutes=round(total_time, 1),
        )

    def optimize_fleet_routes(
        self,
        workers: list[dict],
        tickets: list[dict],
    ) -> list[OptimizedRoute]:
        """Assign tickets to workers and optimize each worker's route.

        Strategy:
        1. Cluster tickets geographically using simple nearest-worker assignment.
        2. Optimise the visit order within each cluster (per worker) via
           nearest-neighbor TSP.

        Args:
            workers: List of dicts with ``id``, ``current_lat``, ``current_lng``.
            tickets: List of dicts with ``ticket_id``, ``location_lat``,
                ``location_lng``, ``location_address``.

        Returns:
            One :class:`OptimizedRoute` per worker that received at least one ticket.
        """
        if not workers or not tickets:
            return []

        # Step 1 – assign each ticket to its nearest worker (greedy clustering)
        worker_jobs: dict[int, list[dict]] = {w["id"]: [] for w in workers}

        for ticket in tickets:
            best_worker_id = None
            best_dist = float("inf")
            for w in workers:
                dist = self._haversine(
                    w["current_lat"], w["current_lng"],
                    ticket["location_lat"], ticket["location_lng"],
                )
                if dist < best_dist:
                    best_dist = dist
                    best_worker_id = w["id"]
            if best_worker_id is not None:
                worker_jobs[best_worker_id].append(ticket)

        # Step 2 – optimise route for each worker
        routes: list[OptimizedRoute] = []
        for w in workers:
            jobs = worker_jobs.get(w["id"], [])
            if not jobs:
                continue
            route = self.optimize_route(
                worker_location=(w["current_lat"], w["current_lng"]),
                job_locations=jobs,
            )
            route.worker_id = w["id"]
            routes.append(route)

        return routes

    def calculate_eta(
        self,
        worker_lat: float,
        worker_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> dict:
        """Calculate estimated time of arrival for a worker heading to a destination.

        Returns:
            A dict with ``distance_km`` and ``eta_minutes``.
        """
        dist = self._haversine(worker_lat, worker_lng, dest_lat, dest_lng)
        eta = self._travel_minutes(dist)
        return {
            "distance_km": round(dist, 2),
            "eta_minutes": round(eta, 1),
        }

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Great-circle distance between two GPS points in kilometres."""
        R = 6371  # Earth's radius in km
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return R * c

    def _travel_minutes(self, distance_km: float) -> float:
        """Convert distance to estimated travel time in minutes."""
        if self.AVG_SPEED_KMH <= 0:
            return 0.0
        return (distance_km / self.AVG_SPEED_KMH) * 60


# Singleton
optimization_service = OptimizationService()
