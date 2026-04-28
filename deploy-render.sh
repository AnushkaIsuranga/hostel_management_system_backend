#!/usr/bin/env bash
set -euo pipefail

# UniHome Render Deployment Script
# Usage: ./deploy-render.sh [staging|production] [branch]
# Example: ./deploy-render.sh staging main

ENVIRONMENT=${1:-staging}
BRANCH=${2:-main}
RENDER_API_KEY="${RENDER_API_KEY:-}"

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
  echo "Error: Environment must be 'staging' or 'production'"
  exit 1
fi

if [ -z "$RENDER_API_KEY" ]; then
  echo "Error: RENDER_API_KEY environment variable is required"
  echo "Get it from: https://dashboard.render.com/api-tokens"
  exit 1
fi

# Service configuration
case "$ENVIRONMENT" in
  staging)
    SERVICE_ID="srv_XXXXXXXX"  # Replace with actual Render service ID
    SERVICE_NAME="unihome-backend-staging"
    DOMAIN="staging.unihome.lk"
    ;;
  production)
    SERVICE_ID="srv_YYYYYYYY"  # Replace with actual Render service ID
    SERVICE_NAME="unihome-backend-production"
    DOMAIN="api.unihome.lk"
    ;;
esac

echo "🚀 Deploying UniHome Backend to Render"
echo "   Environment: $ENVIRONMENT"
echo "   Service: $SERVICE_NAME"
echo "   Branch: $BRANCH"
echo "   Domain: $DOMAIN"
echo ""

# Verify Render API key
echo "🔐 Verifying Render API key..."
if ! curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/users/me > /dev/null; then
  echo "❌ Invalid Render API key"
  exit 1
fi
echo "✅ API key valid"

# Trigger deployment
echo ""
echo "📦 Triggering deployment..."
RESPONSE=$(curl -s -X POST \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"clearCache\": \"full\"}")

DEPLOY_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$DEPLOY_ID" ]; then
  echo "❌ Failed to trigger deployment"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Deployment triggered"
echo "   Deployment ID: $DEPLOY_ID"
echo ""

# Monitor deployment
echo "⏳ Monitoring deployment progress..."
echo ""

while true; do
  STATUS=$(curl -s \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    "https://api.render.com/v1/services/$SERVICE_ID/deploys/$DEPLOY_ID" | \
    grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  case "$STATUS" in
    "created"|"build_in_progress"|"deploy_in_progress")
      echo -ne "\r⏳ Status: $STATUS..."
      sleep 5
      ;;
    "live")
      echo ""
      echo "✅ Deployment successful!"
      echo "🌍 Service available at: https://$DOMAIN"
      break
      ;;
    "build_failed"|"deploy_failed")
      echo ""
      echo "❌ Deployment failed: $STATUS"
      echo "📋 Check logs at: https://dashboard.render.com/services/$SERVICE_NAME"
      exit 1
      ;;
    *)
      echo ""
      echo "⚠️  Unknown status: $STATUS"
      break
      ;;
  esac
done

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Post-deployment checks:"
echo "   1. Health check: curl https://$DOMAIN/health"
echo "   2. API test: curl https://$DOMAIN/api/universities"
echo "   3. Dashboard: https://dashboard.render.com/services/$SERVICE_NAME"
echo ""
