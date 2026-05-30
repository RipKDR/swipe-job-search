# ---------------------------------------------------------------------------
# Hi-Hired Database Module
# ---------------------------------------------------------------------------
# RDS PostgreSQL (Multi-AZ, encrypted, automated backups) and
# ElastiCache Redis cluster for Celery broker / cache.
# ---------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for security group rules"
  type        = string
}

variable "database_subnet_ids" {
  description = "List of subnet IDs for the RDS subnet group"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ElastiCache subnet group"
  type        = list(string)
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "multi_az" {
  description = "Enable Multi-AZ for RDS PostgreSQL"
  type        = bool
  default     = false
}

variable "rds_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# Random password for RDS master user (stored in SSM)
# ---------------------------------------------------------------------------
resource "random_password" "rds_master" {
  length  = 24
  special = false
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL Subnet Group
# ---------------------------------------------------------------------------
resource "aws_db_subnet_group" "postgres" {
  name        = "${local.name_prefix}-postgres"
  description = "Database subnet group for Hi-Hired PostgreSQL"
  subnet_ids  = var.database_subnet_ids

  tags = {
    Name = "${local.name_prefix}-postgres-subnet-group"
  }
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL Parameter Group
# ---------------------------------------------------------------------------
resource "aws_db_parameter_group" "postgres" {
  name   = "${local.name_prefix}-postgres-pg"
  family = "postgres16"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries slower than 1s
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL Instance
# ---------------------------------------------------------------------------
resource "aws_db_instance" "postgres" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.rds_instance_class

  db_name  = "hihired"
  username = "hihired_admin"
  password = random_password.rds_master.result

  allocated_storage     = 50
  max_allocated_storage = 200
  storage_type          = "gp3"
  storage_encrypted     = true

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  parameter_group_name   = aws_db_parameter_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:05:00-sun:06:00"
  copy_tags_to_snapshot   = true
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${local.name_prefix}-postgres-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "${local.name_prefix}-postgres"
  }
}

# ---------------------------------------------------------------------------
# SSM Parameter for RDS Master Password
# ---------------------------------------------------------------------------
resource "aws_ssm_parameter" "rds_master_password" {
  name        = "/${local.name_prefix}/rds/master-password"
  description = "RDS PostgreSQL master password"
  type        = "SecureString"
  value       = random_password.rds_master.result

  tags = {
    Name = "${local.name_prefix}-rds-master-password"
  }
}

resource "aws_ssm_parameter" "rds_connection_string" {
  name        = "/${local.name_prefix}/rds/connection-string"
  description = "RDS PostgreSQL JDBC connection string"
  type        = "SecureString"
  value       = "postgresql://hihired_admin:${random_password.rds_master.result}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"

  tags = {
    Name = "${local.name_prefix}-rds-connection-string"
  }
}

# ---------------------------------------------------------------------------
# Security Group: RDS
# ---------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from private subnets"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [for cidr in data.aws_subnet.private[*].cidr_block : cidr]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-rds-sg"
  }
}

data "aws_subnet" "private" {
  count = length(var.private_subnet_ids)
  id    = var.private_subnet_ids[count.index]
}

# ---------------------------------------------------------------------------
# ElastiCache Redis Subnet Group
# ---------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${local.name_prefix}-redis"
  description = "Subnet group for ElastiCache Redis"
  subnet_ids  = var.private_subnet_ids
}

# ---------------------------------------------------------------------------
# ElastiCache Redis Parameter Group
# ---------------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "redis" {
  name        = "${local.name_prefix}-redis-pg"
  family      = "redis7"

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
}

# ---------------------------------------------------------------------------
# ElastiCache Redis Cluster (Single node — scale with cluster mode if needed)
# ---------------------------------------------------------------------------
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${local.name_prefix}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]
  port                 = 6379

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}

# ---------------------------------------------------------------------------
# Security Group: Redis
# ---------------------------------------------------------------------------
resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis from private subnets"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [for cidr in data.aws_subnet.private[*].cidr_block : cidr]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-redis-sg"
  }
}

# ---------------------------------------------------------------------------
# SSM Parameters for Redis
# ---------------------------------------------------------------------------
resource "aws_ssm_parameter" "redis_endpoint" {
  name        = "/${local.name_prefix}/redis/endpoint"
  description = "ElastiCache Redis endpoint"
  type        = "SecureString"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address

  tags = {
    Name = "${local.name_prefix}-redis-endpoint"
  }
}

resource "aws_ssm_parameter" "redis_connection_string" {
  name        = "/${local.name_prefix}/redis/connection-string"
  description = "Redis connection string for Celery"
  type        = "SecureString"
  value       = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}/0"

  tags = {
    Name = "${local.name_prefix}-redis-connection-string"
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "database_endpoint" {
  description = "RDS PostgreSQL primary endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
}

output "database_name" {
  description = "RDS PostgreSQL database name"
  value       = aws_db_instance.postgres.db_name
}

output "database_username" {
  description = "RDS PostgreSQL master username"
  value       = aws_db_instance.postgres.username
}

output "database_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint (host:port)"
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}"
}

output "redis_host" {
  description = "ElastiCache Redis primary endpoint host"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].port
}

output "ssm_rds_password_arn" {
  description = "ARN of SSM parameter for RDS master password"
  value       = aws_ssm_parameter.rds_master_password.arn
}

output "ssm_redis_connection_arn" {
  description = "ARN of SSM parameter for Redis connection string"
  value       = aws_ssm_parameter.redis_connection_string.arn
}
