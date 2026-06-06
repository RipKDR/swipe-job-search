# ---------------------------------------------------------------------------
# Hi-Hired IAM Module
# ---------------------------------------------------------------------------
# IAM roles for backend workloads (API, worker, scraper) and GitHub Actions
# OIDC federation. Each role follows the principle of least privilege with
# scoped permissions to the resources it needs.
# ---------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "github_org" {
  description = "GitHub organisation for OIDC trust"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository for OIDC trust"
  type        = string
}

variable "eks_cluster_oidc_arn" {
  description = "ARN of the EKS OIDC provider"
  type        = string
}

variable "eks_cluster_oidc_url" {
  description = "URL of the EKS OIDC provider"
  type        = string
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "backend_ecr_repository" {
  description = "Name of the backend ECR repository"
  type        = string
}

variable "s3_job_attachments_arn" {
  description = "ARN of the job attachments S3 bucket"
  type        = string
}

variable "s3_logs_arn" {
  description = "ARN of the logs S3 bucket"
  type        = string
}

variable "s3_terraform_state_arn" {
  description = "ARN of the Terraform state S3 bucket"
  type        = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# Common permissions for all backend services
# ---------------------------------------------------------------------------
locals {
  common_permissions = [
    "ecr:GetAuthorizationToken",
    "ecr:BatchCheckLayerAvailability",
    "ecr:GetDownloadUrlForLayer",
    "ecr:BatchGetImage",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
    "logs:DescribeLogStreams",
  ]

  common_resources = [
    "*",
  ]
}

# ---------------------------------------------------------------------------
# IAM Role: Backend API
# ---------------------------------------------------------------------------
# Used by the FastAPI application running on EKS via IRSA.
# Needs: S3 read for attachments, SSM read for secrets, CloudWatch logs.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "backend_api" {
  name = "${local.name_prefix}-backend-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_cluster_oidc_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_cluster_oidc_url, "https://", "")}:sub" = "system:serviceaccount:default:backend-api"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_api" {
  name = "${local.name_prefix}-backend-api"
  role = aws_iam_role.backend_api.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "S3JobAttachmentsRead"
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket",
          ]
          Resource = [
            var.s3_job_attachments_arn,
            "${var.s3_job_attachments_arn}/*",
          ]
        },
        {
          Sid    = "SSMReadParameters"
          Effect = "Allow"
          Action = [
            "ssm:GetParameter",
            "ssm:GetParameters",
            "ssm:GetParametersByPath",
          ]
          Resource = [
            "arn:aws:ssm:*:*:parameter/${local.name_prefix}/*",
          ]
        },
      ],
      [
        {
          Sid      = "CommonPermissions"
          Effect   = "Allow"
          Action   = local.common_permissions
          Resource = local.common_resources
        }
      ]
    )
  })
}

# ---------------------------------------------------------------------------
# IAM Role: Backend Worker (Celery)
# ---------------------------------------------------------------------------
# Needs: S3 read/write for attachments, SSM read, CloudWatch logs.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "backend_worker" {
  name = "${local.name_prefix}-backend-worker"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_cluster_oidc_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_cluster_oidc_url, "https://", "")}:sub" = "system:serviceaccount:default:backend-worker"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_worker" {
  name = "${local.name_prefix}-backend-worker"
  role = aws_iam_role.backend_worker.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "S3JobAttachmentsFull"
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket",
          ]
          Resource = [
            var.s3_job_attachments_arn,
            "${var.s3_job_attachments_arn}/*",
          ]
        },
        {
          Sid    = "S3LogsWrite"
          Effect = "Allow"
          Action = [
            "s3:PutObject",
          ]
          Resource = [
            var.s3_logs_arn,
            "${var.s3_logs_arn}/*",
          ]
        },
        {
          Sid    = "SSMReadParameters"
          Effect = "Allow"
          Action = [
            "ssm:GetParameter",
            "ssm:GetParameters",
            "ssm:GetParametersByPath",
          ]
          Resource = [
            "arn:aws:ssm:*:*:parameter/${local.name_prefix}/*",
          ]
        },
      ],
      [
        {
          Sid      = "CommonPermissions"
          Effect   = "Allow"
          Action   = local.common_permissions
          Resource = local.common_resources
        }
      ]
    )
  })
}

# ---------------------------------------------------------------------------
# IAM Role: Backend Scraper
# ---------------------------------------------------------------------------
# Used by the Celery scraper worker. Needs broader S3 and network access.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "backend_scraper" {
  name = "${local.name_prefix}-backend-scraper"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_cluster_oidc_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_cluster_oidc_url, "https://", "")}:sub" = "system:serviceaccount:default:backend-scraper"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_scraper" {
  name = "${local.name_prefix}-backend-scraper"
  role = aws_iam_role.backend_scraper.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "S3FullAccess"
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket",
          ]
          Resource = [
            var.s3_job_attachments_arn,
            "${var.s3_job_attachments_arn}/*",
            var.s3_logs_arn,
            "${var.s3_logs_arn}/*",
          ]
        },
        {
          Sid    = "SSMReadParameters"
          Effect = "Allow"
          Action = [
            "ssm:GetParameter",
            "ssm:GetParameters",
            "ssm:GetParametersByPath",
          ]
          Resource = [
            "arn:aws:ssm:*:*:parameter/${local.name_prefix}/*",
          ]
        },
      ],
      [
        {
          Sid      = "CommonPermissions"
          Effect   = "Allow"
          Action   = local.common_permissions
          Resource = local.common_resources
        }
      ]
    )
  })
}

# ---------------------------------------------------------------------------
# IAM Role: Backend Processing Worker
# ---------------------------------------------------------------------------
# Used by the Celery processing queue worker on EKS via IRSA.
# Needs: S3 read/write for attachments, SSM read, CloudWatch logs.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "backend_processing" {
  name = "${local.name_prefix}-backend-processing"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_cluster_oidc_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_cluster_oidc_url, "https://", "")}:sub" = "system:serviceaccount:default:backend-processing"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_processing" {
  name = "${local.name_prefix}-backend-processing"
  role = aws_iam_role.backend_processing.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "S3JobAttachmentsFull"
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket",
          ]
          Resource = [
            var.s3_job_attachments_arn,
            "${var.s3_job_attachments_arn}/*",
          ]
        },
        {
          Sid    = "SSMReadParameters"
          Effect = "Allow"
          Action = [
            "ssm:GetParameter",
            "ssm:GetParameters",
            "ssm:GetParametersByPath",
          ]
          Resource = [
            "arn:aws:ssm:*:*:parameter/${local.name_prefix}/*",
          ]
        },
      ],
      [
        {
          Sid      = "CommonPermissions"
          Effect   = "Allow"
          Action   = local.common_permissions
          Resource = local.common_resources
        }
      ]
    )
  })
}

# ---------------------------------------------------------------------------
# IAM Role: Backend Notifications Worker
# ---------------------------------------------------------------------------
# Used by the Celery notifications queue worker on EKS via IRSA.
# Needs: SSM read for API keys (email/push), S3 read for templates.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "backend_notifications" {
  name = "${local.name_prefix}-backend-notifications"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_cluster_oidc_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_cluster_oidc_url, "https://", "")}:sub" = "system:serviceaccount:default:backend-notifications"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_notifications" {
  name = "${local.name_prefix}-backend-notifications"
  role = aws_iam_role.backend_notifications.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "S3ReadAttachments"
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:ListBucket",
          ]
          Resource = [
            var.s3_job_attachments_arn,
            "${var.s3_job_attachments_arn}/*",
          ]
        },
        {
          Sid    = "SSMReadParameters"
          Effect = "Allow"
          Action = [
            "ssm:GetParameter",
            "ssm:GetParameters",
            "ssm:GetParametersByPath",
          ]
          Resource = [
            "arn:aws:ssm:*:*:parameter/${local.name_prefix}/*",
          ]
        },
      ],
      [
        {
          Sid      = "CommonPermissions"
          Effect   = "Allow"
          Action   = local.common_permissions
          Resource = local.common_resources
        }
      ]
    )
  })
}

# ---------------------------------------------------------------------------
# IAM Role: GitHub Actions OIDC
# ---------------------------------------------------------------------------
# Allows GitHub Actions workflows (deploy, release) to assume this role
# to run Terraform, push to ECR, and deploy Helm charts to EKS.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "github_actions" {
  name = "${local.name_prefix}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::*:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "${local.name_prefix}-github-actions"
  role = aws_iam_role.github_actions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRPushPull"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = [
          "arn:aws:ecr:*:*:repository/${var.backend_ecr_repository}",
        ]
      },
      {
        Sid    = "EKSAccess"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi",
        ]
        Resource = [
          "arn:aws:eks:*:*:cluster/${var.eks_cluster_name}",
        ]
      },
      {
        Sid    = "S3TerraformState"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          var.s3_terraform_state_arn,
          "${var.s3_terraform_state_arn}/*",
        ]
      },
      {
        Sid    = "DynamoDBTerraformLocks"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable",
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${local.name_prefix}-terraform-locks",
        ]
      },
      {
        Sid    = "SSMReadParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
        ]
        Resource = [
          "arn:aws:ssm:*:*:parameter/${local.name_prefix}/*",
        ]
      },
    ]
  })
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "backend_api_role_arn" {
  description = "IAM role ARN for the backend API service"
  value       = aws_iam_role.backend_api.arn
}

output "backend_worker_role_arn" {
  description = "IAM role ARN for the backend worker service"
  value       = aws_iam_role.backend_worker.arn
}

output "backend_scraper_role_arn" {
  description = "IAM role ARN for the backend scraper service"
  value       = aws_iam_role.backend_scraper.arn
}

output "backend_processing_role_arn" {
  description = "IAM role ARN for the backend processing worker service"
  value       = aws_iam_role.backend_processing.arn
}

output "backend_notifications_role_arn" {
  description = "IAM role ARN for the backend notifications worker service"
  value       = aws_iam_role.backend_notifications.arn
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC federation"
  value       = aws_iam_role.github_actions.arn
}
