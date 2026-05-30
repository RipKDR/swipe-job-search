# ---------------------------------------------------------------------------
# Hi-Hired Production Environment Configuration
# ---------------------------------------------------------------------------
# Larger instances, Multi-AZ database, maximum resilience.
# Uses a different VPC CIDR to avoid peering conflicts.
# ---------------------------------------------------------------------------

environment          = "production"
aws_region           = "ap-southeast-2"
vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]

database_multi_az    = true
rds_instance_class   = "db.r6g.large"
redis_node_type      = "cache.r6g.large"

github_org           = "hi-hired"
github_repo          = "swipe-job-search"
alert_email          = "devops-alerts@hi-hired.com.au"
