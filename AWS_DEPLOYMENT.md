# AWS Deployment Guide - Docker + ECS

This guide covers deploying the Inspira Grid Next.js application to AWS using Docker and Amazon ECS (Elastic Container Service).

## Prerequisites

- AWS Account with appropriate permissions
- Docker Desktop installed and running
- AWS CLI configured with credentials
- Git repository (optional but recommended)

## Deployment Options

### Option 1: AWS ECS with Fargate (Recommended - Serverless)
### Option 2: AWS App Runner (Simplest)
### Option 3: AWS EC2 with Docker

---

## Option 1: Deploy to AWS ECS with Fargate

### Step 1: Build and Test Docker Image Locally

```powershell
# Build the Docker image
docker build -t inspira-grid-frontend .

# Test locally
docker run -p 3000:3000 --env-file .env.production inspira-grid-frontend

# Or use docker-compose
docker-compose up
```

Visit http://localhost:3000 to verify it works.

### Step 2: Create ECR Repository

```powershell
# Create an ECR repository
aws ecr create-repository --repository-name inspira-grid-frontend --region us-east-1

# Get the repository URI (save this)
aws ecr describe-repositories --repository-names inspira-grid-frontend --region us-east-1
```

### Step 3: Push Image to ECR

```powershell
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Tag your image
docker tag inspira-grid-frontend:latest <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/inspira-grid-frontend:latest

# Push to ECR
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/inspira-grid-frontend:latest
```

### Step 4: Create ECS Task Definition

Create a file `ecs-task-definition.json`:

```json
{
  "family": "inspira-grid-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "inspira-grid-frontend",
      "image": "<YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/inspira-grid-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXT_PUBLIC_FIREBASE_API_KEY",
          "value": "AIzaSyDT960YVCmsPyKDaj47k586y9K6DCkKZyo"
        },
        {
          "name": "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
          "value": "inspira-grid-c2e1a.firebaseapp.com"
        },
        {
          "name": "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
          "value": "inspira-grid-c2e1a"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/inspira-grid-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register the task:

```powershell
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### Step 5: Create ECS Cluster and Service

```powershell
# Create cluster
aws ecs create-cluster --cluster-name inspira-grid-cluster --region us-east-1

# Create service (you'll need VPC and subnet IDs)
aws ecs create-service \
  --cluster inspira-grid-cluster \
  --service-name inspira-grid-frontend-service \
  --task-definition inspira-grid-frontend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"
```

### Step 6: Setup Load Balancer (Optional but Recommended)

Use AWS Console to:
1. Create an Application Load Balancer
2. Configure target group for port 3000
3. Update ECS service to use the load balancer

---

## Option 2: Deploy to AWS App Runner (Simplest)

AWS App Runner is the easiest option for containerized apps.

### Step 1: Build and Push to ECR (Same as Option 1, Steps 1-3)

### Step 2: Create App Runner Service via AWS Console

1. Go to AWS App Runner console
2. Click "Create service"
3. Choose "Container registry" → "Amazon ECR"
4. Select your ECR image
5. Configure:
   - **Port**: 3000
   - **Environment variables**: Add all variables from `.env.production`
6. Click "Create & Deploy"

App Runner will provide you with a URL like: `https://xxxxx.us-east-1.awsapprunner.com`

---

## Option 3: Deploy to EC2 with Docker

### Step 1: Launch EC2 Instance

```powershell
# Create a t3.medium instance with Docker
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 1 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx
```

### Step 2: Connect and Setup Docker

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@<PUBLIC_IP>

# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Deploy Your App

```bash
# Clone your repo or upload files
git clone <your-repo>
cd inspira-grid-frontend

# Create .env.production file
nano .env.production
# Paste your environment variables

# Build and run
docker-compose up -d
```

---

## Environment Variables Configuration

Make sure to update these in your deployment:

- `NEXTAUTH_URL`: Your actual AWS domain
- `NEXT_PUBLIC_APP_URL`: Your actual AWS domain
- `NEXT_PUBLIC_WS_URL`: WebSocket URL (if applicable)
- `NEXTAUTH_SECRET`: Generate a secure secret

Generate secure secret:
```powershell
openssl rand -base64 32
```

---

## Post-Deployment

1. **Setup Custom Domain**: Use Route 53 to point your domain to the load balancer/App Runner
2. **Enable HTTPS**: Use AWS Certificate Manager for SSL/TLS
3. **Monitor Logs**: Use CloudWatch Logs
4. **Auto-scaling**: Configure based on CPU/memory usage

---

## Estimated Costs

- **App Runner**: ~$25-50/month for small apps
- **ECS Fargate**: ~$15-40/month (0.25 vCPU, 0.5 GB)
- **EC2 t3.medium**: ~$30/month + data transfer

---

## Quick Start Commands

```powershell
# 1. Test locally
docker-compose up

# 2. Login to AWS
aws configure

# 3. Create ECR and push
aws ecr create-repository --repository-name inspira-grid-frontend --region us-east-1
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker build -t inspira-grid-frontend .
docker tag inspira-grid-frontend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/inspira-grid-frontend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/inspira-grid-frontend:latest

# 4. Deploy via App Runner (easiest) - use AWS Console
```

---

## Troubleshooting

- **Build fails**: Check Node version in Dockerfile matches your local version
- **Container crashes**: Check CloudWatch logs
- **Environment variables not working**: Ensure they're set in task definition/App Runner config
- **Port issues**: Ensure security groups allow inbound traffic on port 3000 (or 80/443 for ALB)

---

For questions or issues, refer to AWS documentation or contact your DevOps team.
