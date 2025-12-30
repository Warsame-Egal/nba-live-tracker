#!/bin/bash

# Deployment script for Oracle Cloud backend
# Usage: ./deploy-backend.sh

set -e

echo "Building production Docker image..."
cd nba-tracker-api
docker build -f Dockerfile.prod -t nba-backend:latest .

echo "Stopping existing container..."
docker stop nba-backend || true
docker rm nba-backend || true

echo "Starting new container..."
docker run -d \
  -p 8000:8000 \
  --name nba-backend \
  --restart unless-stopped \
  nba-backend:latest

echo "Deployment complete!"
echo "Check status: docker ps"
echo "Check logs: docker logs nba-backend"
echo "Test: curl http://localhost:8000/"

