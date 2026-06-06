# Phase 3 — Task 1+2 Summary: Terraform + Helm Productionization

**Date:** 2026-06-06  
**Author:** Subagent (infra productionization)  

---

## Task 1: Terraform Environment Split Hardening

### Changes Made

#### 1. `infra/terraform/modules/monitoring/main.tf` — Fixed EKS alarm namespace

- **Before:** `namespace = "AWS/ECS"` (incorrect — that's ECS, not EKS)
- **After:** `namespace = "ContainerInsights"` (correct for EKS CloudWatch Container Insights)
- The `eks_node_cpu_high` alarm now targets the right metric namespace.

#### 2. `infra/terraform/modules/iam/main.tf` — Added per-queue worker IAM roles

- Added `backend_processing` IAM role + policy — S3 read/write for attachments, SSM read, ECR/CloudWatch common permissions. IRSA bound to `system:serviceaccount:default:backend-processing`.
- Added `backend_notifications` IAM role + policy — S3 read-only for attachments, SSM read, ECR/CloudWatch common. IRSA bound to `system:serviceaccount:default:backend-notifications`.
- Outputs for both new roles added to the module.

#### 3. `infra/terraform/outputs.tf` — Added missing outputs

- Added `backend_processing_role_arn` (from `module.iam`)
- Added `backend_notifications_role_arn` (from `module.iam`)
- Added `cloudwatch_log_group_scraper` (was created by monitoring module but not exposed to root)

### Files Verified (no changes needed)

- `infra/terraform/main.tf` — Module wiring is correct. `module.eks.backend_ecr_repository`, `module.storage.*_arn` references all resolve properly.
- `infra/terraform/variables.tf` — Validates environment is `staging` or `production`. All required variables have sensible defaults or are required.
- `infra/terraform/environments/staging/terraform.tfvars` ✅ — Correct: small instances, single-AZ, devops@.
- `infra/terraform/environments/production/terraform.tfvars` ✅ — Correct: large instances, multi-AZ, devops-alerts@.
- All module `main.tf` files reviewed — no missing variables or broken references.

---

## Task 2: Helm Release Shape

### Changes Made

#### 1. `infra/helm/backend/templates/deployment.yaml` — Added per-queue workers

- **Worker (default queue):** Added `-Q default` to explicitly bind to the default queue.
- **Processing:** New deployment — listens to `processing` queue, concurrency from `celery.processingConcurrency`.
- **Notifications:** New deployment — listens to `notifications` queue, concurrency from `celery.notificationsConcurrency`.

All deployments share the same container image, ConfigMap env, Secrets env, and IRSA wiring pattern.

#### 2. `infra/helm/backend/templates/service.yaml` — Added headless services

- Added `-processing` and `-notifications` headless ClusterIP services (port 8000, named "metrics") for Prometheus scraping.

#### 3. `infra/helm/backend/templates/hpa.yaml` — Added autoscaling

- Added HPA for `processing` (CPU/memory based, min 2, max 10).
- Added HPA for `notifications` (CPU/memory based, min 1, max 5).

#### 4. `infra/helm/backend/templates/serviceaccount.yaml` — Added IRSA entries

- Added `-processing` ServiceAccount with `processingRoleArn` annotation.
- Added `-notifications` ServiceAccount with `notificationsRoleArn` annotation.

#### 5. `infra/helm/backend/values.yaml` — Complete default config

- Added `environment: staging` field (referenced by deployment templates).
- Added `replicaCount.processing`, `replicaCount.notifications`.
- Added `resources.processing` (1cpu/2Gi limit, 250m/512Mi req) and `resources.notifications` (500m/512Mi limit, 100m/256Mi req).
- Added `serviceAccount.annotations.processingRoleArn`, `notificationsRoleArn`.
- Added `podDisruptionBudget.processing` (min 1) and `notifications` (disabled by default).
- Added `autoscaling.processing` and `autoscaling.notifications` blocks.
- Added `celery.processingConcurrency` (2) and `celery.notificationsConcurrency` (2).

#### 6. `infra/helm/backend/values-staging.yaml` (NEW)

- Environment: `staging`
- Reduced replica counts (api:1, worker:1, scraper:1, processing:1, notifications:1)
- Smaller resource requests/limits
- Staging ingress host: `api.staging.hi-hired.com.au`
- DEBUG log level
- Reduced Celery concurrency
- Staging-specific CORS origins

#### 7. `infra/helm/backend/values-production.yaml` (NEW)

- Environment: `production`
- Full replica counts (api:3, worker:3, scraper:2, processing:3, notifications:2)
- Larger resource requests/limits
- Production ingress host: `api.hi-hired.com.au`
- INFO log level
- Full Celery concurrency
- Production-specific CORS origins
- PodDisruptionBudget enabled for all deployments

### Verification

- **Helm/terraform CLI tools unavailable** on this host. All review done manually.
- Worker topology now matches docker-compose per-queue split: `scrapers`, `processing`, `notifications`, `default`.
- All deployments reference `.Values.environment` for label consistency.
- ConfigMap references match env vars in every deployment template.
- Secrets (SUPABASE_SERVICE_KEY, OPENAI_API_KEY, etc.) wired identically across all 5 deployments.
- IRSA annotations are explicit for each service type with matching IAM roles in Terraform.
- All values files have clear overlay hooks for staging vs production.

### CI/CD Integration Notes

Operator must set these at deploy time:
1. Populate IRSA role ARNs (`serviceAccount.annotations.*RoleArn`) from Terraform outputs.
2. Set `env.configMap.REDIS_URL` and `env.configMap.DATABASE_URL` from Terraform SSM outputs.
3. Create Kubernetes Secret `hi-hired-backend-secrets` with the env vars listed in `env.secrets`.
4. For cross-account or complex deploys, use `--values values-production.yaml` or `--values values-staging.yaml`.
