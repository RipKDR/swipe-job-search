# Hi-Hired Backend

Backend service for the Hi-Hired swipe-based job matching platform.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your credentials

python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn src.main:app --reload
```

Use `.venv/bin/pip` (not bare `pip`) on Debian/Ubuntu — system Python is PEP 668–protected.

## Docker

```bash
docker-compose up --build
```

## Tests

```bash
.venv/bin/python -m pytest tests/ -v
```

## Project Structure

```
backend/
├── src/
│   ├── main.py              # FastAPI entrypoint
│   ├── core/config.py        # Pydantic Settings
│   ├── api/router.py         # API routing
│   ├── schemas/              # Pydantic models
│   ├── services/             # Business logic
│   └── workers/              # Celery tasks
└── tests/                    # Test suite
```
