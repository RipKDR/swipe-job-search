# ---------------------------------------------------------------------------
# Hi-Hired Staging Environment Configuration
# ---------------------------------------------------------------------------
# Smaller instances, single-AZ database, developer-friendly settings.
# ---------------------------------------------------------------------------

environment          = "staging"
aws_region           = "ap-southeast-2"
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]

database_multi_az    = false
rds_instance_class   = "db.t3.medium"
redis_node_type      = "cache.t3.micro"

github_org           = "hi-hired"
github_repo          = "swipe-job-search"
alert_email          = "devops@hi-hired.com.au"
