"""
OpenTelemetry distributed tracing setup for Hi-Hired Backend.

Provides setup_telemetry() which initializes the global TracerProvider
with an OTLP exporter. Gracefully degrades to a no-op tracer if the
OTLP endpoint is not configured or if optional dependencies are missing.

The tracer provider is stored as a module-level global so that middleware
and other components can access it via get_tracer_provider().
"""

import logging

logger = logging.getLogger(__name__)

# Module-level holder for the configured tracer provider
_tracer_provider = None
_tracer = None


def setup_telemetry(service_name: str = "hi-hired-backend"):
    """
    Configure OpenTelemetry with OTLP export.

    Stores the resulting TracerProvider at module level so that
    :func:`get_tracer_provider` and :func:`get_tracer` can retrieve it.

    Args:
        service_name: Service name to identify traces in the backend.

    Returns:
        An OpenTelemetry tracer instance (real or no-op).
    """
    from src.core.config import get_settings

    settings = get_settings()
    global _tracer_provider, _tracer

    # If no OTLP endpoint configured, log a warning and return a no-op tracer.
    if not settings.otlp_endpoint:
        logger.warning(
            "OTLP_ENDPOINT not set — telemetry is disabled. "
            "Set OTLP_ENDPOINT in your environment or .env file to enable tracing."
        )
        from opentelemetry import trace as otel_trace

        _tracer = otel_trace.get_tracer(service_name)
        return _tracer

    try:
        from opentelemetry import trace as otel_trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.resources import Resource
    except ImportError as exc:
        logger.warning(
            "OpenTelemetry packages not installed (%s). "
            "Install them with: pip install opentelemetry-api "
            "opentelemetry-sdk opentelemetry-exporter-otlp",
            exc,
        )
        from opentelemetry import trace as otel_trace

        _tracer = otel_trace.get_tracer(service_name)
        return _tracer

    resource = Resource.create(
        attributes={
            "service.name": service_name,
            "service.version": "0.1.0",
        }
    )

    provider = TracerProvider(resource=resource)

    try:
        exporter = OTLPSpanExporter(endpoint=settings.otlp_endpoint, insecure=True)
        span_processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(span_processor)
        logger.info(
            "OpenTelemetry initialized — exporting traces to %s",
            settings.otlp_endpoint,
        )
    except Exception as exc:
        logger.warning(
            "Failed to configure OTLP exporter for %s: %s. Falling back to no-op tracer.",
            settings.otlp_endpoint,
            exc,
        )
        # Return a no-op tracer instead of crashing
        otel_trace_api = __import__("opentelemetry", fromlist=["trace"]).trace
        _tracer = otel_trace_api.get_tracer(service_name)
        return _tracer

    otel_trace.set_tracer_provider(provider)
    _tracer_provider = provider
    _tracer = otel_trace.get_tracer(service_name)

    logger.info("Telemetry setup complete for service: %s", service_name)
    return _tracer


def get_tracer_provider():
    """Return the configured TracerProvider, or None if not initialised."""
    return _tracer_provider


def get_tracer():
    """Return the configured tracer, or None if not initialised."""
    return _tracer
