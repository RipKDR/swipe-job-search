"""Hi-Hired Backend - FastAPI application entrypoint."""

import logging
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, generate_latest

from src.api.middleware.rate_limit import RateLimitMiddleware
from src.api.router import api_router
from src.core.config import get_settings
from src.core.errors import APIException, api_error_handler
from src.core.telemetry import setup_telemetry

logger = logging.getLogger(__name__)

# Load .env at startup so Settings reads HH_-prefixed vars from the file.
load_dotenv()

settings = get_settings()

# --- Observability ---
tracer = setup_telemetry(service_name="hi-hired-backend")
logger.info("Telemetry initialised, tracer=%s", tracer.__class__.__name__)

# --- Prometheus metrics ---
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    labelnames=["method", "path", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    labelnames=["method", "path", "status"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

app = FastAPI(
    title="Hi-Hired Backend",
    version="0.1.0",
    description="Job search and matching API for Hi-Hired",
)


# --- Prometheus metrics endpoint (registered before middleware stack) ---
@app.get("/metrics")
async def metrics_endpoint():
    return Response(content=generate_latest(), media_type="text/plain; version=0.0.4")


# --- Prometheus metrics middleware (outermost — captures all requests) ---
@app.middleware("http")
async def prometheus_metrics_middleware(request, call_next):
    method = request.method
    path = request.url.path

    # Normalise templated paths for cardinality control
    route = request.scope.get("route")
    if route is not None and hasattr(route, "path"):
        path = route.path

    start = time.monotonic()
    status = "500"  # default if exception occurs before response
    try:
        response = await call_next(request)
        status = str(response.status_code)
        return response
    except Exception:
        raise
    finally:
        duration = time.monotonic() - start
        HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status=status).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=method, path=path, status=status
        ).observe(duration)


# Register standardised error handlers
app.add_exception_handler(APIException, api_error_handler)
app.add_exception_handler(HTTPException, api_error_handler)

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
