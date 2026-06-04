#!/bin/bash
# Dev startup script for Vigilant AI
# Usage: docker exec hermes-webui-thok-hermes-webui-1 bash /workspace/vigilant_ai/scripts/dev-start.sh
set -e

BUN=/home/hermeswebui/.hermes/home/.local/bin/bun
PROJECT=/workspace/vigilant_ai

echo "[dev-start] Killing old servers..."
# Kill any existing bun server processes (inside container)
pkill -f "bun server/index.ts" 2>/dev/null || true
sleep 1
# Force kill if still running
for pid in $(pgrep -f "bun server" 2>/dev/null); do
  kill -9 "$pid" 2>/dev/null || true
done

echo "[dev-start] Pulling latest dev..."
cd "$PROJECT"
git config --global --add safe.directory "$PROJECT" 2>/dev/null || true
git fetch origin
git checkout dev
git pull origin dev

echo "[dev-start] Installing dependencies..."
$BUN install

echo "[dev-start] Building frontend..."
$BUN run build --outDir dist-build 2>/dev/null || $BUN run build
# Workaround for dist/ permissions
if [ -d dist-build ]; then
  mv dist dist-old 2>/dev/null || true
  mv dist-build dist
fi

echo "[dev-start] Starting server on port 8788..."
PORT=8788 $BUN server/index.ts
