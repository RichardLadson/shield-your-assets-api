# AWS Infrastructure for Shield Your Assets API

This directory contains all the CloudFormation templates and scripts needed to deploy your Shield Your Assets API to AWS using managed services.

## 📋 Prerequisites

Before you begin, ensure you have:

1. **AWS CLI installed and configured**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region (us-east-1)
   ```

2. **Docker installed and running**
   ```bash
   docker --version
   ```

3. **PostgreSQL client** (for database migration)
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

4. **jq** (for JSON processing)
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   ```

## 🚀 Quick Start (Complete Deployment)

### Step 1: Deploy Infrastructure

```bash
cd aws-infrastructure
./deploy.sh
```

This script will:
- Create VPC with public/private subnets
- Set up RDS PostgreSQL database
- Create S3 buckets for file storage
- Configure ECS cluster and load balancer
- Set up monitoring and alerts
- Store secrets in AWS Secrets Manager

**You'll be prompted for:**
- Database password (min 8 characters)
- JWT secret (min 32 characters)
- GoHighLevel credentials (optional)
- Email addresses for notifications

### Step 2: Migrate Database

```bash
./database-migration.sh
```

Choose from:
1. **Restore from existing database** - Migrates your current data
2. **Run fresh migrations** - Sets up new database schema
3. **Manual migration** - Handle it yourself

### Step 3: Deploy Application

```bash
./build-and-deploy.sh
```

This will:
- Build Docker image
- Push to Amazon ECR
- Update ECS service
- Run health checks

### Step 4: Access Your Application

Your API will be available at the load balancer URL provided after deployment.

## 📁 File Structure

```
aws-infrastructure/
├── vpc-stack.yaml              # VPC and networking
├── rds-stack.yaml              # Database setup
├── s3-stack.yaml               # File storage buckets
├── ecs-stack.yaml              # Container orchestration
├── secrets-stack.yaml          # Secrets management
├── monitoring-stack.yaml       # CloudWatch dashboards & alarms
├── deploy.sh                   # Main deployment script
├── build-and-deploy.sh         # Application deployment
├── database-migration.sh       # Database migration helper
└── README.md                   # This file
```

## 🔧 Individual Stack Deployment

If you prefer to deploy stacks individually:

### 1. VPC Stack
```bash
aws cloudformation create-stack \
  --stack-name shield-assets-vpc \
  --template-body file://vpc-stack.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=shield-assets-prod
```

### 2. S3 Stack
```bash
aws cloudformation create-stack \
  --stack-name shield-assets-s3 \
  --template-body file://s3-stack.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=shield-assets-prod \
  --capabilities CAPABILITY_NAMED_IAM
```

### 3. RDS Stack
```bash
aws cloudformation create-stack \
  --stack-name shield-assets-rds \
  --template-body file://rds-stack.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=shield-assets-prod \
               ParameterKey=DBMasterPassword,ParameterValue=YourStrongPassword123
```

### 4. Secrets Stack
```bash
aws cloudformation create-stack \
  --stack-name shield-assets-secrets \
  --template-body file://secrets-stack.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=shield-assets-prod \
               ParameterKey=JWTSecret,ParameterValue=your-32-character-jwt-secret-here \
  --capabilities CAPABILITY_NAMED_IAM
```

### 5. ECS Stack
```bash
aws cloudformation create-stack \
  --stack-name shield-assets-ecs \
  --template-body file://ecs-stack.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=shield-assets-prod \
  --capabilities CAPABILITY_NAMED_IAM
```

### 6. Monitoring Stack
```bash
aws cloudformation create-stack \
  --stack-name shield-assets-monitoring \
  --template-body file://monitoring-stack.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=shield-assets-prod \
               ParameterKey=NotificationEmail,ParameterValue=admin@yourdomain.com
```

## 🔍 What Gets Created

### Networking
- **VPC** with public and private subnets across 2 AZs
- **Internet Gateway** for public access
- **NAT Gateway** for private subnet internet access
- **Security Groups** with least-privilege access

### Database
- **RDS PostgreSQL** with Multi-AZ for high availability
- **Automated backups** (7-day retention)
- **Performance Insights** enabled
- **Encryption at rest** enabled

### Storage
- **S3 buckets** for documents and reports
- **Lifecycle policies** for cost optimization
- **Encryption** enabled by default
- **Versioning** enabled for data protection

### Compute
- **ECS Fargate** for serverless containers
- **Application Load Balancer** with health checks
- **Auto-scaling** based on CPU utilization
- **Container insights** for monitoring

### Security
- **Secrets Manager** for secure credential storage
- **IAM roles** with minimal required permissions
- **Security groups** restricting network access
- **Encryption** at rest and in transit

### Monitoring
- **CloudWatch Dashboard** with key metrics
- **Alarms** for CPU, memory, response time, errors
- **SNS notifications** for alerts
- **Log aggregation** and retention

## 💰 Estimated Monthly Costs

| Service | Configuration | Est. Cost |
|---------|---------------|-----------|
| ECS Fargate | 2 tasks, 0.5 vCPU, 1GB RAM | $40 |
| RDS PostgreSQL | db.t3.small, Multi-AZ, 100GB | $120 |
| Application Load Balancer | 1 ALB | $25 |
| S3 Storage | 100GB + requests | $25 |
| CloudWatch | Logs, metrics, dashboards | $30 |
| NAT Gateway | 1 gateway | $45 |
| Data Transfer | ~50GB/month | $5 |
| **Total** | | **~$290/month** |

*Costs may vary based on usage patterns and AWS pricing changes*

## 🔧 Configuration

### Environment Variables

Your application will automatically receive these environment variables from AWS Secrets Manager:

- `DB_HOST` - RDS endpoint
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `S3_DOCUMENTS_BUCKET` - Documents S3 bucket
- `S3_REPORTS_BUCKET` - Reports S3 bucket
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Set to 'production'
- `AWS_REGION` - AWS region

### SSL Certificate (Optional)

To add HTTPS support:

1. **Request certificate from ACM:**
   ```bash
   aws acm request-certificate \
     --domain-name api.yourdomain.com \
     --validation-method DNS
   ```

2. **Add DNS validation record** to your domain

3. **Update load balancer** to use HTTPS

## 📊 Monitoring & Troubleshooting

### View Application Logs
```bash
aws logs tail /ecs/shield-assets-prod-api --follow
```

### Check Service Status
```bash
aws ecs describe-services \
  --cluster shield-assets-prod-cluster \
  --services shield-assets-prod-api-service
```

### Scale Service
```bash
aws ecs update-service \
  --cluster shield-assets-prod-cluster \
  --service shield-assets-prod-api-service \
  --desired-count 3
```

### Access Database
```bash
# Get credentials from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id shield-assets-prod/rds/credentials

# Connect to database
psql -h <endpoint> -U medicaid_admin -d medicaid_planning
```

## 🚨 Common Issues

### Deployment Fails
1. **Check AWS credentials:** `aws sts get-caller-identity`
2. **Verify region:** Ensure you're using `us-east-1`
3. **Check quotas:** Some AWS accounts have service limits

### Application Won't Start
1. **Check ECS logs:** Look for container startup errors
2. **Verify secrets:** Ensure all required secrets are created
3. **Check security groups:** Database access from ECS tasks

### Database Connection Issues
1. **Security groups:** RDS security group allows ECS security group
2. **Network:** ECS tasks in private subnets can reach RDS
3. **Credentials:** Check AWS Secrets Manager values

### High Costs
1. **Review unused resources:** Delete test stacks
2. **Optimize RDS:** Consider smaller instance types for development
3. **S3 costs:** Check for unexpected data transfer

## 🔄 Updates and Maintenance

### Update Application
```bash
./build-and-deploy.sh
```

### Update Infrastructure
```bash
# Modify CloudFormation templates as needed
./deploy.sh
```

### Backup Database
```bash
# Manual backup
./database-migration.sh
# Choose option 1 and provide RDS as source
```

### Rollback Application
```bash
aws ecs update-service \
  --cluster shield-assets-prod-cluster \
  --service shield-assets-prod-api-service \
  --task-definition shield-assets-prod-api:PREVIOUS_REVISION
```

## 🆘 Support

If you encounter issues:

1. **Check deployment logs** in the console output
2. **Review CloudFormation events** in AWS Console
3. **Examine CloudWatch logs** for application errors
4. **Verify all prerequisites** are installed

## 🗑️ Cleanup

To delete all resources:

```bash
# Delete in reverse order
aws cloudformation delete-stack --stack-name shield-assets-prod-monitoring
aws cloudformation delete-stack --stack-name shield-assets-prod-ecs
aws cloudformation delete-stack --stack-name shield-assets-prod-secrets
aws cloudformation delete-stack --stack-name shield-assets-prod-rds
aws cloudformation delete-stack --stack-name shield-assets-prod-s3
aws cloudformation delete-stack --stack-name shield-assets-prod-vpc

# Delete ECR repository
aws ecr delete-repository --repository-name shield-assets-api --force
```

⚠️ **Warning:** This will permanently delete all your data and infrastructure!