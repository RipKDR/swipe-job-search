# Phase 3 - Task 3+4 Summary: Telemetry Loop + MLflow Productionization

## Task 3: Close the telemetry loop

### Changes made

1. **`backend/src/core/telemetry.py`** — Added module-level accessors:
   - `get_tracer_provider()` — returns the configured `TracerProvider` (or `None` if not initialised)
   - `get_tracer()` — returns the configured tracer (or `None`)
   - `setup_telemetry()` now stores the provider/tracer in globals for middleware access
   - Graceful degradation preserved (no-op when OTLP not configured)

2. **`backend/src/main.py`** — Added Prometheus request metrics:
   - `http_requests_total` counter (labels: method, path, status)
   - `http_request_duration_seconds` histogram (same labels + tuned buckets)
   - `/metrics` endpoint returning `prometheus_client.generate_latest()`
   - ASGI middleware wraps all requests (outermost) so rate-limited requests are still measured
   - Paths are normalised via FastAPI route templates to avoid cardinality explosion

3. **`backend/prometheus.yml`** — Expanded scrape targets:
   - `hi-hired-api` → `api:8000`
   - `hi-hired-worker` → `worker:8000`
   - `hi-hired-celery-beat` → `celery-beat:8000`
   - `hi-hired-scraper` → `scraper:8000` (new — was missing)
   - All services, workers, and scrapers are now scrape targets

4. **`infra/terraform/modules/monitoring/main.tf`** — Added 5xx alert:
   - `alb_5xx_rate_high` alarm: 5xx rate > 5% over 5 minutes
   - Uses CloudWatch metric math: `(HTTPCode_Target_5XX_Count / RequestCount) * 100`
   - Configurable ALB name via `alb_name` variable (default: `${project_name}-${environment}-alb`)
   - New output `cloudwatch_alarm_alb_5xx`

5. **`backend/pyproject.toml`** — Added `prometheus-client>=0.25.0` dependency

## Task 4: Productionize MLflow and retraining

### Files created

1. **`backend/src/services/mlflow_service.py`** — `MLflowService` class:
   - `setup_tracking()` — set tracking URI (idempotent)
   - `load_model(model_name, version, stage)` — load from registry with version/stage pinning
   - `get_production_model_uri(model_name)` — current Production version URI
   - `promote_to_production(model_name, version)` — transition from Staging to Production
   - `register_model(run_id, model_name, stage)` — register run + transition to Staging
   - `log_params()`, `log_metrics()`, `log_dict()` — convenience wrappers
   - `get_run_id()` — current active run ID
   - All operations wrap exceptions and return `None`/`False` on failure

2. **`backend/src/workers/ml_training.py`** — Weekly retraining task:
   - `retrain_match_model()` — Celery task registered as `src.workers.ml_training.retrain_match_model`
   - Collects recent labelled swipes (stub), runs pipeline, promotes to Production if gate passes
   - Configured with 2 retries and 5-minute backoff

### Files modified

3. **`backend/src/services/ml_pipeline.py`** — Refactored to use `MLflowService`:
   - `MLflowService` replaces raw MLflow calls in `_log_to_mlflow()` and `_register_model()`
   - `_compute_data_hash()` — SHA-256 of training data for reproducibility
   - Training result now includes `data_hash` key
   - `promotion_gate` property returns `_PROMOTION_GATE` (0.3)

4. **`backend/src/workers/celery_app.py`** — Added beat schedule:
   - `retrain-match-model` task runs every 7 days (604800 seconds)

5. **`backend/tests/test_ml_pipeline.py`** — Added new test classes/methods:
   - `TestMatchTrainingPipeline`: `test_data_hash_deterministic`, `test_data_hash_changes_with_data`, `test_data_hash_format`, `test_promotion_gate_below_threshold`
   - `TestMLflowService`: 10 tests covering init, setup_tracking, model loading (nonexistent), production URI, promotion failure, register failure, log with/without active run, get_run_id, lifecycle

### Test results

- **26 tests** in `test_ml_pipeline.py` — all pass (21 fast + 5 slow)
- **255 tests** in rest of test suite — all pass (no regressions)
- **Total: 281 passing** across the project
