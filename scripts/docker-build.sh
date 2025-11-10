#!/bin/bash

# ================================
# Procheff v3 - Docker Build Script
# ================================
# This script builds the Docker image for production
# Usage: ./scripts/docker-build.sh [tag]
# Example: ./scripts/docker-build.sh v1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="procheff-v3"
TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-""}

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Procheff v3 - Docker Build${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Full image name
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"
fi

echo -e "${BLUE}Building image: ${FULL_IMAGE_NAME}${NC}"
echo ""

# Build the image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build \
    --platform linux/amd64 \
    --tag "${FULL_IMAGE_NAME}" \
    --file Dockerfile \
    .

echo ""
echo -e "${GREEN}✓ Docker image built successfully!${NC}"
echo -e "${BLUE}Image: ${FULL_IMAGE_NAME}${NC}"

# Get image size
IMAGE_SIZE=$(docker images "${FULL_IMAGE_NAME}" --format "{{.Size}}")
echo -e "${BLUE}Size: ${IMAGE_SIZE}${NC}"

# Optional: Push to registry
if [ -n "$REGISTRY" ]; then
    echo ""
    read -p "Push to registry? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Pushing to registry...${NC}"
        docker push "${FULL_IMAGE_NAME}"
        echo -e "${GREEN}✓ Image pushed successfully!${NC}"
    fi
fi

echo ""
echo -e "${BLUE}To test locally:${NC}"
echo -e "${YELLOW}docker run -p 8080:8080 --env-file .env.local ${FULL_IMAGE_NAME}${NC}"
echo ""

# Optional: Tag as latest
if [ "$TAG" != "latest" ]; then
    LATEST_IMAGE_NAME="${IMAGE_NAME}:latest"
    if [ -n "$REGISTRY" ]; then
        LATEST_IMAGE_NAME="${REGISTRY}/${LATEST_IMAGE_NAME}"
    fi

    echo -e "${BLUE}Tagging as latest...${NC}"
    docker tag "${FULL_IMAGE_NAME}" "${LATEST_IMAGE_NAME}"
    echo -e "${GREEN}✓ Tagged as: ${LATEST_IMAGE_NAME}${NC}"
fi

echo ""
echo -e "${GREEN}✓ Build completed!${NC}"
