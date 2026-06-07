FROM python:3.12-slim AS builder

WORKDIR /app

# Copy dependency manifest first for layer caching
COPY pyproject.toml .
# src/ includes the package source for `pip install -e .`
COPY src/ src/

# Installing dev for now (includes pytest, ruff, mypy for CI).
# Layer is cached as long as pyproject.toml and src/ don't change.
RUN pip install --no-cache-dir -e ".[dev]"

# ── API server ─────────────────────────────────────────────────────────
FROM builder AS api

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=5)" || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ── Celery worker ──────────────────────────────────────────────────────
FROM builder AS worker

CMD ["celery", "-A", "src.workers.celery_app", "worker", "--loglevel=info"]

# ── Celery beat scheduler ──────────────────────────────────────────────
FROM builder AS beat

CMD ["celery", "-A", "src.workers.celery_app", "beat", "--loglevel=info"]

# ── Development (volume-mount for hot reload) ──────────────────────────
FROM builder AS development

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
