# ---------------------------------------------------------------------------
# Hi-Hired Terraform Outputs
# ---------------------------------------------------------------------------
# Values consumed by CI/CD pipelines and cross-stack references.
# ---------------------------------------------------------------------------

# -- Networking ---------------------------------------------------------------
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (EKS node groups, RDS, Redis)"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets (RDS subnet group)"
  value       = module.vpc.database_subnet_ids
}

# -- EKS ----------------------------------------------------------------------
output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority" {
  description = "Base64-encoded certificate data for the EKS cluster"
  value       = module.eks.cluster_certificate_authority
  sensitive   = true
}

output "backend_ecr_repository_url" {
  description = "ECR repository URL for the backend Docker image"
  value       = module.eks.backend_ecr_repository_url
}

output "eks_node_role_arn" {
  description = "IAM role ARN for EKS managed node group"
  value       = module.eks.node_role_arn
}

# -- Database -----------------------------------------------------------------
output "database_endpoint" {
  description = "RDS PostgreSQL primary endpoint (host:port)"
  value       = module.database.database_endpoint
  sensitive   = true
}

output "database_name" {
  description = "RDS PostgreSQL database name"
  value       = module.database.database_name
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint (host:port)"
  value       = module.database.redis_endpoint
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = module.database.redis_port
}

# -- Storage ------------------------------------------------------------------
output "job_attachments_bucket" {
  description = "S3 bucket name for job attachments (public-read)"
  value       = module.storage.job_attachments_bucket
}

output "logs_bucket" {
  description = "S3 bucket name for application logs"
  value       = module.storage.logs_bucket
}

output "terraform_state_bucket" {
  description = "S3 bucket name for Terraform state"
  value       = module.storage.terraform_state_bucket
}

# -- IAM ----------------------------------------------------------------------
output "backend_api_role_arn" {
  description = "IAM role ARN for the backend API service"
  value       = module.iam.backend_api_role_arn
}

output "backend_worker_role_arn" {
  description = "IAM role ARN for the backend worker service"
  value       = module.iam.backend_worker_role_arn
}

output "backend_scraper_role_arn" {
  description = "IAM role ARN for the backend scraper service"
  value       = module.iam.backend_scraper_role_arn
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC federation"
  value       = module.iam.github_actions_role_arn
}

# -- Monitoring ---------------------------------------------------------------
output "sns_alarm_topic_arn" {
  description = "ARN of the SNS topic for CloudWatch alarms"
  value       = module.monitoring.sns_alarm_topic_arn
}

output "cloudwatch_log_group_api" {
  description = "CloudWatch log group name for the API service"
  value       = module.monitoring.cloudwatch_log_group_api
}

output "cloudwatch_log_group_worker" {
  description = "CloudWatch log group name for the worker service"
  value       = module.monitoring.cloudwatch_log_group_worker
}
