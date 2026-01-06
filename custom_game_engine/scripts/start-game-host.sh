#!/bin/bash
# Game Host Mode - Starts metrics server, orchestration dashboard, and game server with browser

# Don't exit on errors - handle errors gracefully and keep terminal open
# set -e removed to prevent terminal exit on port conflicts or other errors

echo "=== Starting AI Village (Game Host Mode) ==="
echo ""
echo "This will start:"
echo "  - Metrics Server (port 8766) with Admin Console at /admin"
echo "  - PixelLab Sprite Daemon"
echo "  - API Server (port 3001)"
echo "  - Game Dev Server (port 3000)"
echo "  - Browser at http://localhost:3000"
echo ""

# Create logs directory
mkdir -p logs

# Generate timestamp for log files
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
METRICS_LOG="logs/metrics-server-${TIMESTAMP}.log"
API_LOG="logs/api-server-${TIMESTAMP}.log"
DEV_LOG="logs/dev-server-${TIMESTAMP}.log"

# PID files for reconnecting to existing servers
METRICS_PID_FILE=".metrics-server.pid"
PIXELLAB_PID_FILE=".pixellab-daemon.pid"
API_PID_FILE=".api-server.pid"
DEV_PID_FILE=".dev-server.pid"

# Function to check if a PID is still running
is_running() {
    kill -0 "$1" 2>/dev/null
}

# Function to start or reconnect to metrics server
start_metrics_server() {
    if [ -f "$METRICS_PID_FILE" ]; then
        METRICS_PID=$(cat "$METRICS_PID_FILE")
        if is_running "$METRICS_PID"; then
            echo "Metrics Server already running (PID: $METRICS_PID)"
            return
        fi
    fi

    echo "Starting Metrics Server..."
    echo "Logs: $METRICS_LOG"
    nohup npm run metrics-server > "$METRICS_LOG" 2>&1 &
    METRICS_PID=$!
    echo $METRICS_PID > "$METRICS_PID_FILE"
    sleep 2
}

# Function to start or reconnect to PixelLab daemon
start_pixellab_daemon() {
    if [ -f "$PIXELLAB_PID_FILE" ]; then
        PIXELLAB_PID=$(cat "$PIXELLAB_PID_FILE")
        if is_running "$PIXELLAB_PID"; then
            echo "PixelLab Daemon already running (PID: $PIXELLAB_PID)"
            return
        fi
    fi

    echo "Starting PixelLab Sprite Daemon..."
    echo "Logs: pixellab-daemon.log"
    nohup npx ts-node scripts/pixellab-daemon.ts >> pixellab-daemon.log 2>&1 &
    PIXELLAB_PID=$!
    echo $PIXELLAB_PID > "$PIXELLAB_PID_FILE"
    sleep 1
}

# Function to start or reconnect to API server
start_api_server() {
    if [ -f "$API_PID_FILE" ]; then
        API_PID=$(cat "$API_PID_FILE")
        if is_running "$API_PID"; then
            echo "API Server already running (PID: $API_PID)"
            return
        fi
    fi

    echo "Starting API Server..."
    echo "Logs: $API_LOG"
    (cd demo && nohup npm run api > "../$API_LOG" 2>&1 &
    echo $! > "../$API_PID_FILE")
    sleep 1
    API_PID=$(cat "$API_PID_FILE")
    sleep 2
}

# Function to start or reconnect to game dev server
start_dev_server() {
    if [ -f "$DEV_PID_FILE" ]; then
        DEV_PID=$(cat "$DEV_PID_FILE")
        if is_running "$DEV_PID"; then
            echo "Game Dev Server already running (PID: $DEV_PID)"
            return
        fi
    fi

    echo "Starting Game Dev Server..."
    echo "Logs: $DEV_LOG"

    # Load .env file and export variables for Vite
    if [ -f ".env" ]; then
        echo "Loading environment variables from .env..."
        export $(grep -v '^#' .env | grep -v '^$' | xargs)
    fi

    (cd demo && nohup npm run dev > "../$DEV_LOG" 2>&1 &
    echo $! > "../$DEV_PID_FILE")
    sleep 1
    DEV_PID=$(cat "$DEV_PID_FILE")
    sleep 2
}

# Start all servers
start_metrics_server
start_pixellab_daemon
start_api_server
start_dev_server

# Open browser to landing page (platform-specific)
echo ""
echo "Opening browser to central hub..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3000/hub.html 2>/dev/null || true
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3000/hub.html 2>/dev/null || echo "Please open http://localhost:3000/hub.html in your browser"
else
  echo "Please open http://localhost:3000/hub.html in your browser"
fi

echo ""
echo "=== AI Village Running ==="
echo ""
echo "Central Hub:   http://localhost:3000/hub.html"
echo "Game:          http://localhost:3000"
echo "API:           http://localhost:3001"
echo "Admin Console: http://localhost:8766/admin"
echo "PixelLab:      Background daemon (PID $PIXELLAB_PID)"
echo ""
echo "Servers are running in background (nohup)."
echo "Close this terminal and they'll keep running."
echo ""
echo "To stop servers: ./start.sh kill"
echo "To check status:  ./start.sh status"
echo "View sprites:     tail -f pixellab-daemon.log"
echo ""
echo "Press Ctrl+C to exit monitor (servers will continue running)"
echo ""

# Flags to track if we've already reported port conflicts
METRICS_PORT_CONFLICT=false
API_PORT_CONFLICT=false

# Monitor function - runs until interrupted
monitor_servers() {
    while true; do
        # Read current PIDs from files
        [ -f "$METRICS_PID_FILE" ] && METRICS_PID=$(cat "$METRICS_PID_FILE")
        [ -f "$API_PID_FILE" ] && API_PID=$(cat "$API_PID_FILE")
        [ -f "$DEV_PID_FILE" ] && DEV_PID=$(cat "$DEV_PID_FILE")

        # Check if game dev server is still running
        if [ -n "$DEV_PID" ] && ! is_running "$DEV_PID"; then
            echo ""
            echo "⚠️  Game server has stopped."
            echo "   Restart with: ./start.sh"
        fi

        # Check metrics server and restart if it crashed
        if [ -n "$METRICS_PID" ] && ! is_running "$METRICS_PID" && [ "$METRICS_PORT_CONFLICT" = false ]; then
            # Check if it was an address-in-use error
            if grep -q "EADDRINUSE\|address already in use" "$METRICS_LOG" 2>/dev/null; then
                echo ""
                echo "❌ Metrics server port already in use. Not restarting."
                echo "   Run './start.sh kill' to stop conflicting servers."
                METRICS_PORT_CONFLICT=true
            else
                echo ""
                echo "⚠️  Metrics server crashed, restarting..."
                nohup npm run metrics-server > "$METRICS_LOG" 2>&1 &
                METRICS_PID=$!
                echo $METRICS_PID > "$METRICS_PID_FILE"
            fi
        fi

        # Check API server and restart if it crashed
        if [ -n "$API_PID" ] && ! is_running "$API_PID" && [ "$API_PORT_CONFLICT" = false ]; then
            # Check if it was an address-in-use error
            if grep -q "EADDRINUSE\|address already in use" "$API_LOG" 2>/dev/null; then
                echo ""
                echo "❌ API server port already in use. Not restarting."
                echo "   Run './start.sh kill' to stop conflicting servers."
                API_PORT_CONFLICT=true
            else
                echo ""
                echo "⚠️  API server crashed, restarting..."
                (cd demo && nohup npm run api > "../$API_LOG" 2>&1 &
                echo $! > "../$API_PID_FILE")
                API_PID=$(cat "$API_PID_FILE")
            fi
        fi

        sleep 5
    done
}

# Trap Ctrl+C to exit monitor gracefully (servers keep running)
trap 'echo ""; echo "Monitor exiting. Servers are still running in background."; exit 0' INT TERM

# Start monitoring
monitor_servers
