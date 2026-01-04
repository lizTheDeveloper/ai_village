#!/bin/bash
# Direct Vite start with logging
# Usage: ./start-direct.sh

# Create logs directory
mkdir -p ../logs

# Generate timestamp for log file
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="../logs/dev-server-${TIMESTAMP}.log"

# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting Vite dev server..."
echo "Logs: $LOG_FILE"
echo "Watch logs: tail -f $LOG_FILE"
echo ""

# Start vite directly
npx vite 2>&1 | tee "$LOG_FILE"
