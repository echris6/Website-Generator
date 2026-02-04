#!/bin/bash

# Deploy Website Video Generator to Google Cloud Run
# This script builds and deploys your video generator with one command

set -e  # Exit on error

echo "🚀 Deploying Website Video Generator to Cloud Run..."
echo ""

# Configuration
PROJECT_ID="website-video-generator"
SERVICE_NAME="website-video-gen"
REGION="us-central1"
MEMORY="4Gi"
CPU="2"
TIMEOUT="600s"
MAX_INSTANCES="100"
MIN_INSTANCES="0"
CONCURRENCY="1"

echo "📋 Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Memory: $MEMORY"
echo "  CPU: $CPU CPUs"
echo "  Timeout: $TIMEOUT"
echo "  Concurrency: $CONCURRENCY (one video per container)"
echo "  Max Instances: $MAX_INSTANCES"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please run: brew install google-cloud-sdk"
    exit 1
fi

# Set the project
echo "🔧 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Build and deploy in one command
echo ""
echo "🏗️  Building and deploying to Cloud Run..."
echo "   This will:"
echo "   1. Build the Docker image"
echo "   2. Push it to Google Container Registry"
echo "   3. Deploy to Cloud Run"
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region=$REGION \
  --memory=$MEMORY \
  --cpu=$CPU \
  --timeout=$TIMEOUT \
  --max-instances=$MAX_INSTANCES \
  --min-instances=$MIN_INSTANCES \
  --concurrency=$CONCURRENCY \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium" \
  --platform=managed

echo ""
echo "✅ Deployment complete!"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo "🌐 Your video generator is live at:"
echo "   $SERVICE_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Test the endpoint: curl $SERVICE_URL/health"
echo "   2. Update your n8n workflow to call: $SERVICE_URL/generate-video"
echo "   3. Update your Supabase environment variables with this URL"
echo ""
echo "💰 Cost estimate for 10,000 videos/month: ~\$20-25"
echo ""
