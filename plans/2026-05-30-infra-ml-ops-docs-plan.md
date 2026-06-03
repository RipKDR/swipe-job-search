# Infrastructure, ML, Operations, and Docs Integration Plan

> **For Hermes:** Use `software-development/subagent-driven-development` to execute this plan task-by-task.

**Goal:** Productionize infra, telemetry, MLflow, lifecycle automation, CI/CD, and the docs packaging workflow without turning the docs asset generator into a second platform.

**Architecture:** The repo already has Terraform modules, a Helm chart, Celery workers, telemetry hooks, ML pipeline code, pruning/health services, and GitHub Actions workflows. This plan makes the deployment and operational story explicit: environment overlays, telemetry collection, promotion gates, scheduled jobs, and a reproducible docs-artifact path.

**Tech Stack:** Terraform, Helm, EKS, RDS, ElastiCache, S3, GitHub Actions, OpenTelemetry, Jaeger, Prometheus, MLflow, Celery beat, Playwright, DOCX/PNG asset generation.

---

## Blueprint

- **Intent:** make the platform deployable, observable, and repeatable in a way that matches the code already in the repo.
- **Constraints:** keep infra files single-owner, keep telemetry consistent across runtime surfaces, keep ML promotion gates explicit, and keep docs asset generation small and reproducible.
- **Data Contract:** Terraform variables/outputs, Helm values, OTEL spans/metrics, MLflow run metadata, pruning schedules, CI job artifacts, and generated cover-image outputs.
- **Success Criteria:** a clean staging/prod infrastructure path, visible telemetry, reproducible model promotion, predictable pruning, and a documented docs-artifact workflow.

## Technical Schema

- **Data Flow:** branch -> CI -> infra validation -> build -> deploy -> telemetry -> model/pipeline execution -> scheduled pruning -> docs generation.
- **Component Boundaries:** `infra/terraform`, `infra/helm/backend`, `backend/src/core/telemetry.py`, `backend/src/services/ml_pipeline.py`, `backend/src/services/data_pruner.py`, `.github/workflows`, `docs/scripts`.
- **Algorithm Selection:** use environment-specific Terraform overlays, chart values overrides, model promotion gates, scheduled workers, and a single docs-artifact generator.
- **State Management:** remote state for infra, Helm values for deploy-time config, MLflow for experiment/model state, Prometheus/Jaeger for observability, and `docs/scripts/output/` for generated images.
- **Interfaces:** infra variable/outputs contracts, chart values, OTEL exporter config, MLflow registry state, and workflow promotion gates.

## Tasks

### Task 1: Harden the Terraform environment split

**Objective:** Make staging and production deploy paths explicit and repeatable.

**Files:**
- Update: `infra/terraform/main.tf`
- Update: `infra/terraform/variables.tf`
- Update: `infra/terraform/outputs.tf`
- Update: `infra/terraform/environments/staging/terraform.tfvars`
- Update: `infra/terraform/environments/production/terraform.tfvars`
- Update: the module files under `infra/terraform/modules/*`

**Plan:**
- Confirm each module exposes the outputs the application actually needs.
- Make the environment overlays explicit instead of assuming one-off local edits.
- Ensure the infra layer can be validated without manual guesswork.

**Verification:**
- `terraform fmt -recursive`
- `terraform validate`
- Staging and production inputs are clearly separated.

### Task 2: Finish the Helm release shape

**Objective:** Make the backend chart deployable by CI without manual intervention.

**Files:**
- Update: `infra/helm/backend/values.yaml`
- Update: `infra/helm/backend/templates/deployment.yaml`
- Update: `infra/helm/backend/templates/service.yaml`
- Update: `infra/helm/backend/templates/ingress.yaml`
- Update: `infra/helm/backend/templates/hpa.yaml`
- Update: `infra/helm/backend/templates/serviceaccount.yaml`

**Plan:**
- Ensure secrets, config, ingress, autoscaling, and service account wiring are explicit.
- Add overlay values if staging and production need different runtime settings.
- Keep the chart aligned with the backend deployment model used by CI.

**Verification:**
- `helm template` renders the chart without missing values.
- The chart can be promoted from staging to production with only values changes.

### Task 3: Close the telemetry loop

**Objective:** Make tracing, metrics, and logs visible enough to debug real production behavior.

**Files:**
- Update: `backend/src/core/telemetry.py`
- Update: `backend/src/main.py`
- Update: `backend/prometheus.yml`
- Update: `infra/terraform/modules/monitoring/main.tf`

**Plan:**
- Verify telemetry initializes once and propagates across the runtime surfaces that matter.
- Add the missing collector/exporter deployment path if the current setup still stops at library instrumentation.
- Add metrics and alert rules that match the platform’s actual failure modes.

**Verification:**
- Traces are visible end to end.
- Metrics export is not dependent on a manual local-only step.
- Log correlation uses a stable request/trace identifier.

### Task 4: Productionize MLflow and retraining

**Objective:** Turn the ML pipeline into a real operational loop instead of a code path that only runs manually.

**Files:**
- Update: `backend/src/services/ml_pipeline.py`
- Update: `backend/src/services/match_scorer.py`
- Create: `backend/src/services/mlflow_service.py` if a thin integration layer is needed
- Update: `backend/tests/test_ml_pipeline.py`

**Plan:**
- Define how runs are logged, how artifacts are stored, and how the best model is promoted.
- Make the promotion gate and retraining cadence explicit.
- Keep drift detection and business metrics separate from the scoring code itself.

**Verification:**
- Training and promotion are reproducible.
- The production model can be identified unambiguously.
- Regression tests cover the promotion gate and failure paths.

### Task 5: Operationalize pruning and scraper health

**Objective:** Make lifecycle management and scraper health a first-class operational workflow.

**Files:**
- Update: `backend/src/services/data_pruner.py`
- Update: `backend/src/services/scraper_health.py`
- Update: `backend/src/workers/scraper.py`
- Update: `backend/src/workers/celery_app.py`

**Plan:**
- Confirm the schedule that runs pruning and health checks.
- Persist quarantine state so bad sources do not silently reappear.
- Tie alerting to the same health signals the workers already emit.

**Verification:**
- A failed source becomes visible before it becomes a user-facing bug.
- Quarantine and recovery are testable.

### Task 6: Tighten CI/CD and release promotion

**Objective:** Make the release conveyor explicit from pull request to release tag.

**Files:**
- Update: `.github/workflows/ci.yml`
- Update: `.github/workflows/cd.yml`
- Update: `.github/workflows/release.yml`
- Update: `.github/workflows/pr-review.yml`
- Update: any Helm or deployment inputs those workflows consume

**Plan:**
- Keep PR validation, staging deploys, and release promotion as separate gates.
- Ensure infra validation, image publishing, deploy, and smoke tests are all visible in the workflow graph.
- Keep mobile and backend release concerns separate, but coordinated.

**Verification:**
- The workflow graph matches the intended promotion path.
- A failed gate stops the release before production.

### Task 7: Fold the docs cover generator into the docs workflow

**Objective:** Keep the prompt-collection cover art reproducible and small enough to maintain.

**Files:**
- Update: `docs/scripts/gen-cover-bg.py`
- Update: `docs/README.md`
- Optionally update: `docs/scripts/output/*` if committed artifacts are part of the release process

**Plan:**
- Document the command and the four generated assets.
- Treat the generator as a docs utility, not a platform subsystem.
- Only add a new cover variant if a new document family appears.

**Verification:**
- `python3 docs/scripts/gen-cover-bg.py`
- The expected PNGs exist in `docs/scripts/output/`.
- A contributor can follow the docs without guessing where the assets come from.

## Risks

- Infra files are easy to corrupt if multiple tasks touch the same module or workflow at once.
- Telemetry can become noisy if spans, metrics, and logs are wired differently across services.
- MLflow scope can balloon if model tracking and operational promotion are not separated.
- Docs asset generation can become a second design system if new variants are added without a clear reason.
