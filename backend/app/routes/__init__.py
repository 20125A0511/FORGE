from app.routes.tickets import router as tickets_router
from app.routes.workers import router as workers_router
from app.routes.assignments import router as assignments_router
from app.routes.customers import router as customers_router
from app.routes.dashboard import router as dashboard_router
from app.routes.portal_auth import router as portal_auth_router
from app.routes.portal_chat import router as portal_chat_router
from app.routes.tracking import router as tracking_router
from app.routes.sr_detail import router as sr_detail_router

__all__ = [
    "tickets_router",
    "workers_router",
    "assignments_router",
    "customers_router",
    "dashboard_router",
    "portal_auth_router",
    "portal_chat_router",
    "tracking_router",
    "sr_detail_router",
]
