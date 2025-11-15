#!/bin/bash
# Procheff v3 - Docker Hub Deployment Script
# Builds image locally and pushes to Docker Hub for DigitalOcean deployment

set -e

# Configuration
DOCKER_USERNAME="aydarnuman"  # Docker Hub username
IMAGE_NAME="procheff-v3"
VERSION="3.0.0"
DOCKER_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}"

echo "🐳 Procheff v3 - Docker Hub Deployment"
echo "======================================"
echo ""

# Step 1: Check Docker login
echo "1️⃣ Checking Docker Hub authentication..."
if ! docker info | grep -q "Username: ${DOCKER_USERNAME}"; then
    echo "⚠️  Not logged in to Docker Hub"
    echo "Please run: docker login"
    exit 1
fi
echo "✅ Authenticated as ${DOCKER_USERNAME}"
echo ""

# Step 2: Build Docker image
echo "2️⃣ Building Docker image..."
echo "   Image: ${DOCKER_IMAGE}:${VERSION}"
echo ""

docker build \
    --tag ${DOCKER_IMAGE}:${VERSION} \
    --tag ${DOCKER_IMAGE}:latest \
    --platform linux/amd64 \
    --progress=plain \
    .

echo ""
echo "✅ Docker image built successfully"
echo ""

# Step 3: Push to Docker Hub
echo "3️⃣ Pushing to Docker Hub..."
echo "   Pushing: ${DOCKER_IMAGE}:${VERSION}"
docker push ${DOCKER_IMAGE}:${VERSION}

echo "   Pushing: ${DOCKER_IMAGE}:latest"
docker push ${DOCKER_IMAGE}:latest

echo ""
echo "✅ Images pushed to Docker Hub"
echo ""

# Step 4: Display deployment info
echo "======================================"
echo "🎉 Docker Hub Deployment Complete!"
echo "======================================"
echo ""
echo "📦 Images available:"
echo "   • ${DOCKER_IMAGE}:${VERSION}"
echo "   • ${DOCKER_IMAGE}:latest"
echo ""
echo "🔗 Docker Hub URL:"
echo "   https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
echo ""
echo "📝 Next Steps - DigitalOcean Deployment:"
echo "   1. SSH to droplet: ssh root@161.35.217.113"
echo "   2. Pull image: docker pull ${DOCKER_IMAGE}:latest"
echo "   3. Run with docker-compose or docker run"
echo ""
echo "💡 Quick deploy command for DigitalOcean:"
echo "   ssh root@161.35.217.113 'docker pull ${DOCKER_IMAGE}:latest && docker-compose -f /path/to/docker-compose.yml up -d'"
echo ""