#!/usr/bin/env bash
set -euo pipefail

IMAGE="${IMAGE:-andy880/hostel-api:latest}"
APP_DIR="${APP_DIR:-/home/ubuntu/apps/hostel-api}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
APP_PREFIX="${APP_PREFIX:-hostel-api}"
BLUE_PORT="${BLUE_PORT:-3001}"
GREEN_PORT="${GREEN_PORT:-3002}"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

echo "Pulling image: $IMAGE"
docker pull "$IMAGE"

if docker ps --format '{{.Names}}' | grep -q "^${APP_PREFIX}-blue$"; then
  NEW_COLOR="green"
  OLD_COLOR="blue"
  PORT="$GREEN_PORT"
else
  NEW_COLOR="blue"
  OLD_COLOR="green"
  PORT="$BLUE_PORT"
fi

NEW_CONTAINER="${APP_PREFIX}-${NEW_COLOR}"
OLD_CONTAINER="${APP_PREFIX}-${OLD_COLOR}"

echo "Starting $NEW_CONTAINER on host port $PORT"
docker rm -f "$NEW_CONTAINER" >/dev/null 2>&1 || true

docker run -d \
  --name "$NEW_CONTAINER" \
  --restart unless-stopped \
  -p "$PORT:3000" \
  --env-file "$ENV_FILE" \
  "$IMAGE"

sleep 5
if ! docker ps --format '{{.Names}}' | grep -q "^${NEW_CONTAINER}$"; then
  echo "New container failed to start: $NEW_CONTAINER"
  exit 1
fi

echo "Stopping old container if present: $OLD_CONTAINER"
docker stop "$OLD_CONTAINER" >/dev/null 2>&1 || true
docker rm "$OLD_CONTAINER" >/dev/null 2>&1 || true

echo "Deployment complete. Active container: $NEW_CONTAINER"
