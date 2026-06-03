# ---------------------------------------------------------------------------
# Hi-Hired Root Terraform Module
# ---------------------------------------------------------------------------
# Deploys the full AWS infrastructure for the Hi-Hired job-search platform:
# VPC, EKS, RDS PostgreSQL, ElastiCache Redis, S3 buckets, IAM roles, and
# CloudWatch monitoring. Uses ap-southeast-2 (Sydney) for AU compliance.
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State stored in S3 with DynamoDB locking — configure via backend config.
  # Example:
  #   terraform init \
  #     -backend-config="bucket=hi-hired-terraform-state-<env>" \
  #     -backend-config="key=terraform.tfstate" \
  #     -backend-config="region=ap-southeast-2" \
  #     -backend-config="dynamodb_table=hi-hired-terraform-locks"
  backend "s3" {
    bucket         = "hi-hired-terraform-state"         # Override per environment
    key            = "terraform.tfstate"
    region         = "ap-southeast-2"
    encrypt        = true
    dynamodb_table = "hi-hired-terraform-locks"
  }
}

# ---------------------------------------------------------------------------
# Provider: AWS (ap-southeast-2 / Sydney)
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Data sources: current account and caller identity
# ---------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# VPC Module
# ---------------------------------------------------------------------------
module "vpc" {
  source = "./modules/vpc"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  project_name       = "hi-hired"
}

# ---------------------------------------------------------------------------
# EKS Module
# ---------------------------------------------------------------------------
module "eks" {
  source = "./modules/eks"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  project_name       = "hi-hired"
}

# ---------------------------------------------------------------------------
# Database Module (RDS PostgreSQL + ElastiCache Redis)
# ---------------------------------------------------------------------------
module "database" {
  source = "./modules/database"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  project_name       = "hi-hired"
  multi_az           = var.database_multi_az
  rds_instance_class = var.rds_instance_class
  redis_node_type    = var.redis_node_type
}

# ---------------------------------------------------------------------------
# Storage Module (S3 buckets)
# ---------------------------------------------------------------------------
module "storage" {
  source = "./modules/storage"

  environment  = var.environment
  project_name = "hi-hired"
}

# ---------------------------------------------------------------------------
# IAM Module
# ---------------------------------------------------------------------------
module "iam" {
  source = "./modules/iam"

  environment              = var.environment
  project_name             = "hi-hired"
  github_org               = var.github_org
  github_repo              = var.github_repo
  eks_cluster_oidc_arn     = module.eks.cluster_oidc_arn
  eks_cluster_oidc_url     = module.eks.cluster_oidc_url
  eks_cluster_name         = module.eks.cluster_name
  backend_ecr_repository   = module.eks.backend_ecr_repository
  s3_job_attachments_arn   = module.storage.job_attachments_arn
  s3_logs_arn              = module.storage.logs_arn
  s3_terraform_state_arn   = module.storage.terraform_state_arn
}

# ---------------------------------------------------------------------------
# Monitoring Module (CloudWatch + SNS alerts)
# ---------------------------------------------------------------------------
module "monitoring" {
  source = "./modules/monitoring"

  environment  = var.environment
  project_name = "hi-hired"
  alert_email  = var.alert_email
}
