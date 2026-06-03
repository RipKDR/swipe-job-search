# ---------------------------------------------------------------------------
# Hi-Hired Terraform Variables
# ---------------------------------------------------------------------------

# -- Global ------------------------------------------------------------------
variable "aws_region" {
  description = "AWS region for all resources (ap-southeast-2 for AU compliance)"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Deployment environment (staging / production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "hi-hired"
}

# -- Networking ---------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AWS availability zones to deploy into (minimum 2, recommended 3)"
  type        = list(string)
  default     = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]
}

# -- Database -----------------------------------------------------------------
variable "database_multi_az" {
  description = "Enable Multi-AZ deployment for RDS PostgreSQL"
  type        = bool
  default     = false
}

variable "rds_instance_class" {
  description = "RDS instance type for PostgreSQL"
  type        = string
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

# -- IAM / GitHub Actions ----------------------------------------------------
variable "github_org" {
  description = "GitHub organisation or username for OIDC trust"
  type        = string
  default     = "hi-hired"
}

variable "github_repo" {
  description = "GitHub repository name for OIDC trust"
  type        = string
  default     = "swipe-job-search"
}

# -- Monitoring ----------------------------------------------------------------
variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications (SNS subscription)"
  type        = string
}
