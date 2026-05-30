"""Hi-Hired Backend - FastAPI application entrypoint."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.middleware.rate_limit import RateLimitMiddleware
from src.api.router import api_router
from src.core.config import get_settings
from src.core.telemetry import setup_telemetry

logger = logging.getLogger(__name__)

settings = get_settings()

# --- Observability ---
tracer = setup_telemetry(service_name="hi-hired-backend")
logger.info("Telemetry initialised, tracer=%s", tracer.__class__.__name__)

app = FastAPI(
    title="Hi-Hired Backend",
    version="0.1.0",
    description="Job search and matching API for Hi-Hired",
)

# Rate-limit middleware is added first (innermost, runs after CORS) so that
# rate-limited requests receive proper CORS headers on the 429 response.
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
