#!/bin/bash
# Server Mode - Backend only (metrics server with admin console) for AI/autonomous operation

# Don't exit on errors - handle errors gracefully and keep terminal open
# set -e removed to prevent terminal exit on port conflicts or other errors

echo "=== Starting AI Village (Server Mode - Backend Only) ==="
echo ""
echo "This will start:"
echo "  - Metrics Server (port 8766) with Admin Console at /admin"
echo "  - API Server (port 3001) for multiverse/universe persistence"
echo "  - PixelLab Sprite Daemon"
echo ""
echo "No browser/frontend will be started."
echo "This mode is for autonomous AI operation and metrics collection."
echo ""

# Function to cleanup background processes on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  jobs -p | xargs -r kill 2>/dev/null || true
  wait 2>/dev/null || true
  echo "Stopped."
}
trap cleanup EXIT INT TERM

# Start metrics server
echo "Starting Metrics Server..."
npm run metrics-server &
METRICS_PID=$!
sleep 2

# Start API server for multiverse/universe persistence
echo "Starting API Server (multiverse persistence)..."
mkdir -p logs
API_LOG="logs/api-server-$(date +%Y%m%d-%H%M%S).log"
(cd demo && npm run api > "../$API_LOG" 2>&1) &
API_PID=$!
sleep 2

# Start PixelLab sprite generation daemon
echo "Starting PixelLab Sprite Daemon..."
npx ts-node scripts/pixellab-daemon.ts 2>&1 | tee -a pixellab-daemon.log &
PIXELLAB_PID=$!
sleep 1

echo ""
echo "=== AI Village Backend Running ==="
echo ""
echo "Admin Console: http://localhost:8766/admin"
echo "Metrics API:   http://localhost:8766"
echo "API Server:    http://localhost:3001 (multiverse sync)"
echo "PixelLab:      Background daemon (PID $PIXELLAB_PID)"
echo ""
echo "Query metrics with: curl http://localhost:8766/dashboard?session=latest"
echo "Admin console:      curl http://localhost:8766/admin"
echo "Check sprites:      tail -f pixellab-daemon.log"
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# Wait for any process to exit
wait -n
