# ---------------------------------------------------------------------------
# Hi-Hired Storage Module
# ---------------------------------------------------------------------------
# S3 buckets for:
#   1. Job attachments (public-read for resume/cover-letter access)
#   2. Application logs (with lifecycle transition to Glacier after 30 days)
#   3. Terraform state (with versioning and DynamoDB locking)
# ---------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# S3 Bucket: Job Attachments (public-read)
# ---------------------------------------------------------------------------
# Stores user-uploaded resumes, cover letters, and other job attachments.
# Public-read ACL allows direct links from the frontend.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "job_attachments" {
  bucket = "${local.name_prefix}-job-attachments"

  tags = {
    Name = "${local.name_prefix}-job-attachments"
  }
}

resource "aws_s3_bucket_versioning" "job_attachments" {
  bucket = aws_s3_bucket.job_attachments.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "job_attachments" {
  bucket = aws_s3_bucket.job_attachments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "job_attachments" {
  bucket = aws_s3_bucket.job_attachments.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "job_attachments" {
  bucket = aws_s3_bucket.job_attachments.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadForGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.job_attachments.arn}/*"
      }
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "job_attachments" {
  bucket = aws_s3_bucket.job_attachments.id

  rule {
    id     = "expire-old-attachments"
    status = "Enabled"

    expiration {
      days = 365
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ---------------------------------------------------------------------------
# S3 Bucket: Application Logs (Glacier lifecycle)
# ---------------------------------------------------------------------------
# Stores CloudWatch exported logs, application logs, and access logs.
# Lifecycle transitions to Glacier after 30 days, expires after 7 years.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-logs"

  tags = {
    Name = "${local.name_prefix}-logs"
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555 # 7 years
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ---------------------------------------------------------------------------
# S3 Bucket: Terraform State (versioning + DynamoDB locking)
# ---------------------------------------------------------------------------
# Stores Terraform state files with versioning enabled.
# DynamoDB table for state locking is created below.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${local.name_prefix}-terraform-state"

  tags = {
    Name = "${local.name_prefix}-terraform-state"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ---------------------------------------------------------------------------
# DynamoDB Table for Terraform State Locking
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${local.name_prefix}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "${local.name_prefix}-terraform-locks"
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "job_attachments_bucket" {
  description = "S3 bucket name for job attachments"
  value       = aws_s3_bucket.job_attachments.id
}

output "job_attachments_arn" {
  description = "ARN of the job attachments S3 bucket"
  value       = aws_s3_bucket.job_attachments.arn
}

output "logs_bucket" {
  description = "S3 bucket name for application logs"
  value       = aws_s3_bucket.logs.id
}

output "logs_arn" {
  description = "ARN of the logs S3 bucket"
  value       = aws_s3_bucket.logs.arn
}

output "terraform_state_bucket" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "terraform_state_arn" {
  description = "ARN of the Terraform state S3 bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_lock_table" {
  description = "DynamoDB table name for Terraform state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}
