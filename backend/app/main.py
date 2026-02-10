"""FORGE - Field Operations and Resource Governance Engine.

AI-powered field service management platform with LLM-driven ticket analysis,
intelligent worker assignment, and route optimization.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routes import (
    assignments_router,
    customers_router,
    dashboard_router,
    portal_auth_router,
    portal_chat_router,
    sr_detail_router,
    tickets_router,
    tracking_router,
    workers_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, cleanup on shutdown."""
    logger.info("Starting FORGE - Field Operations and Resource Governance Engine")
    await init_db()
    logger.info("Database tables initialized")
    yield
    logger.info("Shutting down FORGE")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AI-powered field service management platform - "
        "LLM-driven ticket analysis, intelligent worker assignment, "
        "and route optimization"
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tickets_router)
app.include_router(workers_router)
app.include_router(assignments_router)
app.include_router(customers_router)
app.include_router(dashboard_router)
app.include_router(portal_auth_router)
app.include_router(portal_chat_router)
app.include_router(tracking_router)
app.include_router(sr_detail_router)


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with application info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Field Operations and Resource Governance Engine",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
