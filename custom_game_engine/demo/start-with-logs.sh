#!/bin/bash
# Start dev server with logging
# Usage: ./start-with-logs.sh

# Create logs directory
mkdir -p ../logs

# Generate timestamp for log file
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="../logs/dev-server-${TIMESTAMP}.log"

echo "Starting dev server..."
echo "Logs will be written to: $LOG_FILE"
echo "To watch logs in real-time: tail -f $LOG_FILE"
echo ""

# Start dev server with logging
npm run dev 2>&1 | tee "$LOG_FILE"
