#!/bin/bash
# Game Host Mode - Starts metrics server, orchestration dashboard, and game server with browser

# Don't exit on errors - handle errors gracefully and keep terminal open
# set -e removed to prevent terminal exit on port conflicts or other errors

echo "=== Starting AI Village (Game Host Mode) ==="
echo ""
echo "This will start:"
echo "  - Metrics Server (port 8766)"
echo "  - Orchestration Dashboard (port 3030)"
echo "  - Game Dev Server (port 3000)"
echo "  - Browser at http://localhost:3000"
echo ""

# PID files for reconnecting to existing servers
METRICS_PID_FILE=".metrics-server.pid"
ORCH_PID_FILE=".orch-dashboard.pid"
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
    nohup npm run metrics-server > /tmp/metrics-server.log 2>&1 &
    METRICS_PID=$!
    echo $METRICS_PID > "$METRICS_PID_FILE"
    sleep 2
}

# Function to start or reconnect to orchestration dashboard
start_orch_dashboard() {
    if [ -f "$ORCH_PID_FILE" ]; then
        ORCH_PID=$(cat "$ORCH_PID_FILE")
        if is_running "$ORCH_PID"; then
            echo "Orchestration Dashboard already running (PID: $ORCH_PID)"
            return
        fi
    fi

    echo "Starting Orchestration Dashboard..."
    (cd ../agents/autonomous-dev/dashboard && nohup node server.js > /tmp/orch-dashboard.log 2>&1 &
    echo $! > "../../../custom_game_engine/.orch-dashboard.pid")
    sleep 1
    ORCH_PID=$(cat "$ORCH_PID_FILE")
    sleep 1
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

    # Load .env file and export variables for Vite
    if [ -f ".env" ]; then
        echo "Loading environment variables from .env..."
        export $(grep -v '^#' .env | grep -v '^$' | xargs)
    fi

    (cd demo && nohup npm run dev > /tmp/dev-server.log 2>&1 &
    echo $! > "../$DEV_PID_FILE")
    sleep 1
    DEV_PID=$(cat "$DEV_PID_FILE")
    sleep 2
}

# Start all servers
start_metrics_server
start_orch_dashboard
start_dev_server

# Open browser (platform-specific)
echo ""
echo "Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3000 2>/dev/null || true
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3000 2>/dev/null || echo "Please open http://localhost:3000 in your browser"
else
  echo "Please open http://localhost:3000 in your browser"
fi

echo ""
echo "=== AI Village Running ==="
echo ""
echo "Game:          http://localhost:3000"
echo "Dashboard:     http://localhost:8766"
echo "Orchestration: http://localhost:3030"
echo ""
echo "Servers are running in background (nohup)."
echo "Close this terminal and they'll keep running."
echo ""
echo "To stop servers: ./start.sh kill"
echo "To check status:  ./start.sh status"
echo ""
echo "Press Ctrl+C to exit monitor (servers will continue running)"
echo ""

# Flags to track if we've already reported port conflicts
METRICS_PORT_CONFLICT=false
ORCH_PORT_CONFLICT=false

# Monitor function - runs until interrupted
monitor_servers() {
    while true; do
        # Read current PIDs from files
        [ -f "$METRICS_PID_FILE" ] && METRICS_PID=$(cat "$METRICS_PID_FILE")
        [ -f "$ORCH_PID_FILE" ] && ORCH_PID=$(cat "$ORCH_PID_FILE")
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
            if grep -q "EADDRINUSE\|address already in use" /tmp/metrics-server.log 2>/dev/null; then
                echo ""
                echo "❌ Metrics server port already in use. Not restarting."
                echo "   Run './start.sh kill' to stop conflicting servers."
                METRICS_PORT_CONFLICT=true
            else
                echo ""
                echo "⚠️  Metrics server crashed, restarting..."
                nohup npm run metrics-server > /tmp/metrics-server.log 2>&1 &
                METRICS_PID=$!
                echo $METRICS_PID > "$METRICS_PID_FILE"
            fi
        fi

        # Check orchestration dashboard and restart if it crashed
        if [ -n "$ORCH_PID" ] && ! is_running "$ORCH_PID" && [ "$ORCH_PORT_CONFLICT" = false ]; then
            # Check if it was an address-in-use error
            if grep -q "EADDRINUSE\|address already in use" /tmp/orch-dashboard.log 2>/dev/null; then
                echo ""
                echo "❌ Orchestration dashboard port already in use. Not restarting."
                echo "   Run './start.sh kill' to stop conflicting servers."
                ORCH_PORT_CONFLICT=true
            else
                echo ""
                echo "⚠️  Orchestration dashboard crashed, restarting..."
                (cd ../agents/autonomous-dev/dashboard && nohup node server.js > /tmp/orch-dashboard.log 2>&1 &
                echo $! > "../../../custom_game_engine/.orch-dashboard.pid")
                ORCH_PID=$(cat "$ORCH_PID_FILE")
            fi
        fi

        sleep 5
    done
}

# Trap Ctrl+C to exit monitor gracefully (servers keep running)
trap 'echo ""; echo "Monitor exiting. Servers are still running in background."; exit 0' INT TERM

# Start monitoring
monitor_servers
