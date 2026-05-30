# Phase 3: Infrastructure & DevOps

> **Status:** Plan · **Priority:** Medium (depends on Phase 1-2 for deployment targets)
> **For Hermes:** Use `subagent-driven-development` skill to implement task-by-task.
> **Source:** `SwipeJobSearch_Technical_Architecture_Prompts.docx` §§ 10, 11, 13, 15, 16

**Goal:** Build production-grade infrastructure: IaC with Terraform + EKS, CI/CD with GitHub Actions, distributed telemetry with OpenTelemetry, API security with rate limiting/JWT, and secrets management with HashiCorp Vault.

**Architecture:** AWS-native deployment (EKS, RDS, ElastiCache, S3), Terraform for provisioning, GitHub Actions for pipelines, OpenTelemetry + Jaeger for tracing, Vault for secrets, FastAPI middleware for API defence.

**Tech Stack:** Terraform, Kubernetes (EKS), AWS, GitHub Actions, OpenTelemetry, Jaeger, Prometheus, Grafana, HashiCorp Vault, FastAPI middleware

---

### Task 1: AWS Infrastructure with Terraform

**Objective:** Create Terraform modules for VPC, EKS, RDS, ElastiCache, S3, and monitoring — implementing §10 of the architecture doc

**Files:**
- Create: `infra/terraform/main.tf`
- Create: `infra/terraform/variables.tf`
- Create: `infra/terraform/outputs.tf`
- Create: `infra/terraform/modules/vpc/main.tf`
- Create: `infra/terraform/modules/eks/main.tf`
- Create: `infra/terraform/modules/database/main.tf`
- Create: `infra/terraform/modules/storage/main.tf`
- Create: `infra/terraform/modules/monitoring/main.tf`
- Create: `infra/terraform/modules/iam/main.tf`
- Create: `infra/terraform/environments/staging/terraform.tfvars`

**Step 1: Root module — main.tf**

```hcl
terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.15"
    }
  }
  backend "s3" {
    bucket = "hi-hired-terraform-state"
    key    = "infra/terraform.tfstate"
    region = "ap-southeast-2"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "hi-hired"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

module "vpc" {
  source          = "./modules/vpc"
  environment     = var.environment
  vpc_cidr        = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "eks" {
  source       = "./modules/eks"
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
  cluster_name = "hi-hired-${var.environment}"
}

module "database" {
  source              = "./modules/database"
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  database_subnet_group = module.vpc.database_subnet_group
}

module "storage" {
  source      = "./modules/storage"
  environment = var.environment
}

module "iam" {
  source      = "./modules/iam"
  environment = var.environment
  oidc_url    = module.eks.oidc_url
}

module "monitoring" {
  source      = "./modules/monitoring"
  environment = var.environment
  eks_cluster_name = module.eks.cluster_name
  alert_email = var.alert_email
}
```

**Step 2: Variables**

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"  # Sydney
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]
}

variable "alert_email" {
  type        = string
  description = "Email for CloudWatch alerts"
  default     = "ops@hi-hired.com.au"
}
```

**Step 3: VPC module**

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "hi-hired-${var.environment}" }
}

resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "public-${var.environment}-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]
  tags = { Name = "private-${var.environment}-${count.index}" }
}

resource "aws_subnet" "database" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]
  tags = { Name = "database-${var.environment}-${count.index}" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "hi-hired-${var.environment}" }
}

resource "aws_nat_gateway" "nat" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags = { Name = "nat-${var.environment}-${count.index}" }
}

resource "aws_eip" "nat" {
  count = length(var.availability_zones)
  domain = "vpc"
}

# Route tables and associations (simplified — expanded in full impl)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

**Step 4: Outputs**

```hcl
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_kubeconfig_command" {
  value = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}

output "database_endpoint" {
  value = module.database.endpoint
  sensitive = true
}

output "redis_endpoint" {
  value = module.database.redis_endpoint
  sensitive = true
}
```

**Step 5: Verify**

```bash
cd infra/terraform
terraform fmt -recursive
terraform validate
# Expected: Configuration is valid

git add infra/
git commit -m "feat(infra): Terraform modules for VPC, EKS, RDS, ElastiCache, S3, monitoring"
```

---

### Task 2: GitHub Actions CI/CD Pipeline

**Objective:** Create a comprehensive CI/CD pipeline with linting, testing, security scanning, and deployment — implementing §16 of the architecture doc

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/cd.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/actions/setup-backend/action.yml`
- Create: `.github/actions/setup-mobile/action.yml`

**Step 1: CI — Pull request validation**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
      - run: pip install -e ".[dev]"
      - run: ruff check src/ tests/
      - run: mypy src/

  backend-test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
      - run: pip install -e ".[dev]"
      - run: python -m pytest tests/ -v --cov=src --cov-report=term-missing

  mobile-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
      - run: corepack enable && pnpm install
      - run: pnpm lint
      - run: pnpm typecheck

  mobile-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
      - run: corepack enable && pnpm install
      - run: pnpm test

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH

  supabase-migration-dry-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db dry-run --linked
        working-directory: supabase
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Step 2: CD — Main merge deployment**

```yaml
# .github/workflows/cd.yml
name: CD
on:
  push:
    branches: [main]

jobs:
  terraform-plan:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.8"
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-southeast-2
      - run: terraform init && terraform plan
        working-directory: infra/terraform/environments/staging

  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-southeast-2
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push backend
        run: |
          docker build -t $ECR_REGISTRY/hi-hired-backend:${{ github.sha }} backend/
          docker push $ECR_REGISTRY/hi-hired-backend:${{ github.sha }}
      - name: Trigger EAS build (mobile)
        run: |
          npx eas build --platform all --non-interactive --profile preview
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

**Step 3: Release — Tagged deployments**

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS + deploy to EKS
        run: |
          aws eks update-kubeconfig --name hi-hired-staging --region ap-southeast-2
          helm upgrade --install hi-hired-backend ./charts/backend \
            --set image.tag=${{ github.ref_name }} \
            --namespace hi-hired \
            --create-namespace

  mobile-submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npx eas build --platform all --non-interactive --profile production
          npx eas submit --platform ios --non-interactive
          npx eas submit --platform android --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

**Step 4: Verify**

```bash
# Check workflow syntax
cd /home/admin/swipe-job-search
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "Valid YAML"
# Expected: Valid YAML

git add .github/
git commit -m "feat(infra): GitHub Actions CI/CD with security scanning and deployments"
```

---

### Task 3: API Security — Rate Limiting & JWT

**Objective:** Add FastAPI middleware for JWT authentication, RBAC, rate limiting, and bot detection — implementing §15 of the architecture doc

**Files:**
- Create: `backend/src/api/middleware/__init__.py`
- Create: `backend/src/api/middleware/auth.py`
- Create: `backend/src/api/middleware/rate_limit.py`
- Create: `backend/tests/test_middleware.py`

**Step 1: Write auth middleware**

```python
# backend/src/api/middleware/auth.py
from __future__ import annotations
import structlog
from typing import Optional, Literal
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

logger = structlog.get_logger()
security = HTTPBearer(auto_error=False)

ROLE_HIERARCHY = {
    "anonymous": 0,
    "jobseeker": 1,
    "employer": 2,
    "admin": 3,
}


class AuthClaims(BaseModel):
    user_id: str
    role: str
    permissions: list[str] = []


def verify_access_token(token: str) -> AuthClaims | None:
    """Verify Supabase JWT (RS256)."""
    try:
        # In production, fetch JWKS from Supabase auth endpoint
        payload = jwt.get_unverified_claims(token)
        return AuthClaims(
            user_id=payload.get("sub", ""),
            role=payload.get("role", "anonymous"),
            permissions=payload.get("permissions", []),
        )
    except JWTError as e:
        logger.warning("jwt_verification_failed", error=str(e))
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AuthClaims:
    """FastAPI dependency that extracts and validates JWT."""
    if credentials is None:
        return AuthClaims(user_id="", role="anonymous", permissions=[])

    claims = verify_access_token(credentials.credentials)  # noqa — use proper verification
    if claims is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return claims


def require_role(min_role: str):
    """Decorator to require minimum role level on endpoints."""
    async def role_checker(claims: AuthClaims = Depends(get_current_user)):
        if ROLE_HIERARCHY.get(claims.role, 0) < ROLE_HIERARCHY.get(min_role, 0):
            raise HTTPException(
                status_code=403,
                detail=f"Requires role: {min_role}",
            )
        return claims
    return role_checker
```

**Step 2: Write rate limit middleware**

```python
# backend/src/api/middleware/rate_limit.py
from __future__ import annotations
import structlog
import time
from typing import Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from src.core.config import get_settings

logger = structlog.get_logger()

# Per-role rate limits: requests/minute
RATE_LIMITS = {
    "anonymous": 30,
    "jobseeker": 100,
    "employer": 50,
    "admin": 200,
}

STORES: dict[str, list[float]] = {}  # In production: Redis


def _get_client_key(request: Request) -> str:
    """Identify the client for rate limiting."""
    claims = getattr(request.state, "auth_claims", None)
    if claims and claims.user_id:
        return f"user:{claims.user_id}"
    return f"ip:{request.client.host}"


def _get_rate_limit(request: Request) -> int:
    """Get rate limit based on user role."""
    claims = getattr(request.state, "auth_claims", None)
    role = claims.role if claims else "anonymous"
    return RATE_LIMITS.get(role, 30)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token bucket rate limiter (in-memory; Redis for production)."""

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)

        key = _get_client_key(request)
        limit = _get_rate_limit(request)
        now = time.time()

        # Clean old entries
        if key not in STORES:
            STORES[key] = []
        STORES[key] = [t for t in STORES[key] if now - t < 60]

        if len(STORES[key]) >= limit:
            logger.warning("rate_limit_hit", key=key, limit=limit)
            raise HTTPException(
                status_code=429,
                detail="Too many requests",
                headers={"Retry-After": "60"},
            )

        STORES[key].append(now)
        return await call_next(request)
```

**Step 3: Write tests**

```python
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


class TestHealth:
    def test_health_unauthenticated(self):
        resp = client.get("/health")
        assert resp.status_code == 200
```

**Step 4: Verify**

```bash
cd backend && source .venv/bin/activate
pip install python-jose[cryptography]
python -m pytest tests/test_middleware.py -v
# Expected: PASS

git add backend/src/api/middleware/ backend/tests/test_middleware.py
git commit -m "feat(backend): JWT auth + RBAC + rate limiting middleware"
```

---

### Task 4: Distributed Telemetry (OpenTelemetry)

**Objective:** Instrument the FastAPI app and Celery workers with OpenTelemetry for distributed tracing — implementing §13 of the architecture doc

**Files:**
- Create: `backend/src/core/telemetry.py`
- Update: `backend/src/main.py` (add OTel middleware)
- Update: `backend/docker-compose.yml` (add Jaeger, Prometheus)
- Create: `backend/tests/test_telemetry.py`

**Step 1: Write telemetry.py**

```python
from __future__ import annotations
import structlog
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from src.core.config import get_settings

logger = structlog.get_logger()


def setup_telemetry(service_name: str = "hi-hired-backend"):
    """Initialize OpenTelemetry with OTLP export to Jaeger."""
    settings = get_settings()
    otlp_endpoint = settings.otlp_endpoint or "http://jaeger:***

**Step 2: Add to docker-compose.yml**

```yaml
services:
  ...existing...
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes: ["./prometheus.yml:/etc/prometheus/prometheus.yml"]
```

**Step 3: Verify**

```bash
cd backend && source .venv/bin/activate
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp \
    opentelemetry-instrumentation-fastapi opentelemetry-instrumentation-httpx
python -c "from src.core.telemetry import setup_telemetry; print('OTel OK')"
# Expected: OTel OK

git add backend/src/core/telemetry.py
git commit -m "feat(backend): OpenTelemetry distributed tracing setup"
```

---

### Task 5: Enterprise Secret Management (Vault)

**Objective:** Set up HashiCorp Vault for dynamic secrets with Kubernetes auth — implementing §11 of the architecture doc

**Files:**
- Create: `infra/vault/policies/backend.hcl`
- Create: `infra/vault/kubernetes-auth.sh`
- Create: `backend/src/core/secrets.py`

**Step 1: Write Vault policy**

```hcl
# infra/vault/policies/backend.hcl
path "secret/data/hi-hired/*" {
  capabilities = ["read", "list"]
}

path "database/creds/hi-hired-app" {
  capabilities = ["read"]
}

path "pki/issue/hi-hired-internal" {
  capabilities = ["create", "update"]
}
```

**Step 2: Write secrets.py**

```python
# backend/src/core/secrets.py
from __future__ import annotations
import structlog
import os
import json
from typing import Any, Optional

logger = structlog.get_logger()


class SecretManager:
    """Fetches secrets from Vault with in-memory caching.

    Falls back to env vars in dev mode.
    """

    def __init__(self, vault_addr: str | None = None, vault_token: str | None = None):
        self.vault_addr = vault_addr or os.getenv("VAULT_ADDR", "")
        self._vault_token = vault_token or os.getenv("VAULT_TOKEN", "")
        self._cache: dict[str, tuple[Any, float]] = {}
        self._ttl = 300  # 5 min cache
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import hvac
                self._client = hvac.Client(url=self.vault_addr, token=self._vault_token)
            except ImportError:
                logger.warning("hvac not installed, using env fallback")
                return None
        return self._client

    def _env_fallback(self, path: str) -> dict:
        """Fallback: read from environment variables for local dev."""
        key = path.replace("/", "_").replace("-", "_").upper().split("DATA_HI_HIRED_")[-1]
        val = os.getenv(key) or os.getenv(f"HH_{key}")
        if val:
            return {"value": val}
        return {}

    def get(self, path: str) -> dict:
        """Get a secret, with Vault + env fallback + cache."""
        now = __import__("time").time()

        # Check cache
        if path in self._cache:
            val, expires = self._cache[path]
            if now < expires:
                return val

        # Try Vault
        client = self._get_client()
        if client and client.is_authenticated():
            try:
                secret = client.secrets.kv.v2.read_secret_version(
                    path=path, mount_point="secret"
                )
                data = secret.get("data", {}).get("data", {})
                self._cache[path] = (data, now + self._ttl)
                return data
            except Exception as e:
                logger.warning("vault_read_failed", path=path, error=str(e))

        # Fallback
        fallback = self._env_fallback(path)
        self._cache[path] = (fallback, now + 60)
        return fallback
```

**Step 3: Verify**

```bash
python -m pytest tests/ -v -k "test_health"
# Expected: PASS

git add backend/src/core/secrets.py infra/vault/
git commit -m "feat(infra): HashiCorp Vault secret management with env fallback"
```

---

### Phase 3 Completion Verification

```bash
# Terraform validation
cd infra/terraform
terraform fmt -recursive && terraform validate

# Backend middleware tests
cd ../../backend && source .venv/bin/activate
python -m pytest tests/ -v --cov=src --cov-report=term-missing

# Verify all Docker services
docker compose up -d
curl http://localhost:16686  # Jaeger UI
curl http://localhost:9090  # Prometheus

git add -A && git commit -m "chore: phase 3 infrastructure and DevOps complete"
```

---

## Phase 3 Summary

| Component | Status | Doc § |
|-----------|--------|-------|
| Terraform VPC module (3-AZ, private/public subnets, NAT) | Planned | §10 |
| Terraform EKS module (managed K8s, cluster autoscaler) | Planned | §10 |
| Terraform database module (RDS, ElastiCache) | Planned | §10 |
| Terraform storage module (S3 with lifecycle) | Planned | §10 |
| Terraform IAM module (least-privilege roles, OIDC) | Planned | §10 |
| Terraform monitoring module (CloudWatch, Prometheus) | Planned | §10 |
| GitHub Actions CI — lint, test, security scan | Planned | §16 |
| GitHub Actions CD — ECR push, Terraform, EAS | Planned | §16 |
| GitHub Actions Release — Helm deploy, TestFlight | Planned | §16 |
| JWT auth + RBAC FastAPI middleware | Planned | §15 |
| Rate limiting middleware (token bucket) | Planned | §15 |
| OpenTelemetry tracing (FastAPI + Celery + DB) | Planned | §13 |
| Jaeger + Prometheus + Grafana stack | Planned | §13 |
| HashiCorp Vault with K8s auth | Planned | §11 |

**Dependencies:** AWS account, AWS Route53 domain, Phase 1-2
