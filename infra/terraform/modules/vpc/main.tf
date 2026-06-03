# ---------------------------------------------------------------------------
# Hi-Hired VPC Module
# ---------------------------------------------------------------------------
# Creates a multi-AZ VPC with public, private, and database subnets across
# 3 availability zones. Includes Internet Gateway, NAT Gateways (one per AZ),
# and proper route tables for each subnet tier.
# ---------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

# ---------------------------------------------------------------------------
# VPC
# ---------------------------------------------------------------------------
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

# ---------------------------------------------------------------------------
# Internet Gateway
# ---------------------------------------------------------------------------
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

# ---------------------------------------------------------------------------
# Elastic IPs (one per NAT Gateway per AZ)
# ---------------------------------------------------------------------------
resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-${var.environment}-nat-eip-${count.index}"
  }
}

# ---------------------------------------------------------------------------
# NAT Gateways (one per AZ for HA)
# ---------------------------------------------------------------------------
resource "aws_nat_gateway" "this" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-${var.environment}-nat-${count.index}"
  }

  depends_on = [aws_internet_gateway.this]
}

# ---------------------------------------------------------------------------
# Public Subnets
# ---------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                          = "${var.project_name}-${var.environment}-public-${count.index}"
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
  }
}

# ---------------------------------------------------------------------------
# Private Subnets (EKS node groups, application workloads)
# ---------------------------------------------------------------------------
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name                                          = "${var.project_name}-${var.environment}-private-${count.index}"
    "kubernetes.io/role/internal-elb"             = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
  }
}

# ---------------------------------------------------------------------------
# Database Subnets (RDS, ElastiCache)
# ---------------------------------------------------------------------------
resource "aws_subnet" "database" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 2 * length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-${var.environment}-database-${count.index}"
  }
}

# ---------------------------------------------------------------------------
# Public Route Table
# ---------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ---------------------------------------------------------------------------
# Private Route Tables (one per AZ, each with its own NAT Gateway)
# ---------------------------------------------------------------------------
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[count.index].id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index}"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ---------------------------------------------------------------------------
# Database Route Tables (private — route through NAT for egress)
# ---------------------------------------------------------------------------
resource "aws_route_table" "database" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[count.index].id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-database-rt-${count.index}"
  }
}

resource "aws_route_table_association" "database" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database[count.index].id
}

# ---------------------------------------------------------------------------
# VPC Flow Logs (optional — uncomment to enable)
# ---------------------------------------------------------------------------
# resource "aws_flow_log" "this" {
#   iam_role_arn    = aws_iam_role.flow_logs.arn
#   log_destination = aws_cloudwatch_log_group.flow_logs.arn
#   traffic_type    = "ALL"
#   vpc_id          = aws_vpc.this.id
# }

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "CIDR block of the created VPC"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

output "public_subnet_cidrs" {
  description = "CIDR blocks of the public subnets"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "CIDR blocks of the private subnets"
  value       = aws_subnet.private[*].cidr_block
}

output "database_subnet_cidrs" {
  description = "CIDR blocks of the database subnets"
  value       = aws_subnet.database[*].cidr_block
}

output "nat_gateway_ips" {
  description = "Elastic IPs associated with NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}
