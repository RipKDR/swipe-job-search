"""Hi-Hired Backend - API router."""

from fastapi import APIRouter

from src.api.endpoints import forecast, health, jobs

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(jobs.router, prefix="/api/v1")
api_router.include_router(forecast.router, prefix="/api/v1")
