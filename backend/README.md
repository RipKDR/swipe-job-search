# Hi-Hired Backend

Backend service for the Hi-Hired swipe-based job matching platform.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your credentials

pip install -e ".[dev]"
uvicorn src.main:app --reload
```

## Docker

```bash
docker-compose up --build
```

## Tests

```bash
python -m pytest tests/ -v
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
