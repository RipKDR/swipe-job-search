# ---------------------------------------------------------------------------
# Hi-Hired Monitoring Module
# ---------------------------------------------------------------------------
# CloudWatch log groups for EKS workloads (API, worker, scraper) and an SNS
# topic with email subscription for alarm notifications.
# ---------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "alert_email" {
  description = "Email address for alarm notifications"
  type        = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# CloudWatch Log Groups
# ---------------------------------------------------------------------------

# API service logs
resource "aws_cloudwatch_log_group" "api" {
  name              = "/${local.name_prefix}/api"
  retention_in_days = 30

  tags = {
    Name = "/${local.name_prefix}/api"
  }
}

# Worker service logs
resource "aws_cloudwatch_log_group" "worker" {
  name              = "/${local.name_prefix}/worker"
  retention_in_days = 30

  tags = {
    Name = "/${local.name_prefix}/worker"
  }
}

# Scraper service logs
resource "aws_cloudwatch_log_group" "scraper" {
  name              = "/${local.name_prefix}/scraper"
  retention_in_days = 30

  tags = {
    Name = "/${local.name_prefix}/scraper"
  }
}

# EKS cluster control plane logs (also emitted by EKS module)
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${local.name_prefix}/cluster"
  retention_in_days = 30

  tags = {
    Name = "/aws/eks/${local.name_prefix}/cluster"
  }
}

# RDS PostgreSQL logs
resource "aws_cloudwatch_log_group" "rds_postgres" {
  name              = "/${local.name_prefix}/rds/postgresql"
  retention_in_days = 30

  tags = {
    Name = "/${local.name_prefix}/rds/postgresql"
  }
}

# ---------------------------------------------------------------------------
# SNS Topic for CloudWatch Alarms
# ---------------------------------------------------------------------------
resource "aws_sns_topic" "alarms" {
  name = "${local.name_prefix}-alarms"

  tags = {
    Name = "${local.name_prefix}-alarms"
  }
}

# Email subscription for alarm notifications
resource "aws_sns_topic_subscription" "alarms_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ---------------------------------------------------------------------------
# CloudWatch Metric Alarms
# ---------------------------------------------------------------------------

# RDS CPU > 80% for 5 minutes
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${local.name_prefix}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS PostgreSQL CPU utilization exceeds 80%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = "${local.name_prefix}-postgres"
  }
}

# RDS free storage < 5GB for 5 minutes
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${local.name_prefix}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000000000" # 5GB in bytes
  alarm_description   = "RDS PostgreSQL free storage space below 5GB"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = "${local.name_prefix}-postgres"
  }
}

# RDS connections > 80% of max for 5 minutes
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${local.name_prefix}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS PostgreSQL database connections exceed 80% of max"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = "${local.name_prefix}-postgres"
  }
}

# Redis CPU > 80% for 5 minutes
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${local.name_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ElastiCache Redis CPU utilization exceeds 80%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    CacheClusterId = "${local.name_prefix}-redis"
  }
}

# Redis memory > 80% for 5 minutes
resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${local.name_prefix}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ElastiCache Redis memory usage exceeds 80%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    CacheClusterId = "${local.name_prefix}-redis"
  }
}

# EKS node group CPU > 80%
resource "aws_cloudwatch_metric_alarm" "eks_node_cpu_high" {
  alarm_name          = "${local.name_prefix}-eks-node-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS" # ContainerInsights publishes under ECS/ContainerInsights
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "EKS node CPU utilization exceeds 80%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "sns_alarm_topic_arn" {
  description = "ARN of the SNS topic for CloudWatch alarms"
  value       = aws_sns_topic.alarms.arn
}

output "cloudwatch_log_group_api" {
  description = "CloudWatch log group name for API service"
  value       = aws_cloudwatch_log_group.api.name
}

output "cloudwatch_log_group_worker" {
  description = "CloudWatch log group name for worker service"
  value       = aws_cloudwatch_log_group.worker.name
}

output "cloudwatch_log_group_scraper" {
  description = "CloudWatch log group name for scraper service"
  value       = aws_cloudwatch_log_group.scraper.name
}

output "cloudwatch_log_group_eks" {
  description = "CloudWatch log group name for EKS cluster"
  value       = aws_cloudwatch_log_group.eks_cluster.name
}
