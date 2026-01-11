readme = """# My Agent – Build, Push, Deploy

This folder contains everything required to build, push, and deploy an agent to **AWS AgentCore** using an ARM64 Docker image.

---

## Prerequisites

Make sure you have:

- Python 3.10+
- `uv`
- Docker with `buildx`
- AWS CLI configured
- An existing AWS ECR repository

---

## 1. Install Dependencies

Generate the lock file and install dependencies:

```bash
uv lock
uv sync
```

## 2. Build and Push Docker Image (ARM64)

AgentCore requires ARM64 images.
```bash
docker buildx build --platform linux/arm64 \\
  -t ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest \\
  --push .
```
Replace ACCOUNT_ID with your AWS account ID.

## 3. Run Locally for Testing
```bash
docker run --platform linux/arm64 -p 8000:8000 \\
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest
```
Open:
http://localhost:8000


## 4. Push to ECR (Helper Script)

If you are using the provided script:
```bash
python3 aws_ecr_push.py
```

## 5. Deploy to AWS AgentCore
```bash
python3 agent_deploy.py
```