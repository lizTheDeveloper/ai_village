#!/bin/bash
# AI Village Main Launcher
# Usage: ./start.sh [mode]
# Modes: gamehost (default), server, player, kill, status

# Don't exit on errors - let subscripts handle their own errors
# set -e removed to prevent terminal exit

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Parse arguments
MODE="${1:-gamehost}"

# Function to show server status
show_status() {
  echo ""
  echo "=== AI Village Server Status ==="
  echo ""

  local found=0

  # Try to get status from orchestrator first (port 3030)
  local orch_response=$(curl -s http://localhost:3030/api/server/stats 2>/dev/null)
  if [ -n "$orch_response" ] && echo "$orch_response" | grep -q '"serversUp"'; then
    echo "  ✅ Orchestration Dashboard: Running (port 3030)"
    found=1

    # Parse services from orchestrator
    if echo "$orch_response" | grep -q '"gameServer":true'; then
      local game_status=$(curl -s http://localhost:3030/api/game-server/status 2>/dev/null)
      local game_url=$(echo "$game_status" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
      local game_pid=$(echo "$game_status" | grep -o '"pid":[0-9]*' | cut -d':' -f2)
      echo "  ✅ Game Server: Running (PID $game_pid) - $game_url"
    else
      echo "  ⚫ Game Server: Not running"
    fi

    if echo "$orch_response" | grep -q '"parallelWorkers":true'; then
      echo "  ✅ Parallel Workers: Running"
    fi

    if echo "$orch_response" | grep -q '"bugQueueProcessor":true'; then
      echo "  ✅ Bug Queue Processor: Running"
    fi

    # Check metrics server separately
    if curl -s http://localhost:8766/ >/dev/null 2>&1; then
      echo "  ✅ Metrics Dashboard: Running (port 8766)"
    fi

    # Check PixelLab daemon
    if pgrep -f "pixellab-daemon" >/dev/null 2>&1; then
      local pixellab_pid=$(pgrep -f "pixellab-daemon" | head -1)
      echo "  ✅ PixelLab Daemon: Running (PID $pixellab_pid)"
    fi
  else
    # Fallback to port scanning if orchestrator not running
    local ports=(3000 3001 3002 8766 3030)
    local names=("Game (default)" "Game (alt 1)" "Game (alt 2)" "Metrics Dashboard" "Orchestration")

    for i in "${!ports[@]}"; do
      local port=${ports[$i]}
      local name=${names[$i]}
      local pid=$(lsof -ti:$port 2>/dev/null | head -1)
      if [ -n "$pid" ]; then
        echo "  ✅ Port $port ($name): Running (PID $pid)"
        found=1
      fi
    done
  fi

  if [ $found -eq 0 ]; then
    echo "  No servers running"
  fi
  echo ""
}

# Function to show and tail logs
show_logs() {
  echo ""
  echo "=== AI Village Server Logs ==="
  echo ""

  # Create logs directory if it doesn't exist
  mkdir -p logs

  # Find most recent log files
  local metrics_log=$(ls -t logs/metrics-server-*.log 2>/dev/null | head -1)
  local orch_log=$(ls -t logs/orch-dashboard-*.log 2>/dev/null | head -1)
  local dev_log=$(ls -t logs/dev-server-*.log 2>/dev/null | head -1)

  if [ -z "$metrics_log" ] && [ -z "$orch_log" ] && [ -z "$dev_log" ]; then
    echo "  No log files found in logs/"
    echo "  Logs are created when servers start."
    echo ""
    return
  fi

  echo "Recent log files:"
  echo ""
  [ -n "$metrics_log" ] && echo "  📊 Metrics:        $metrics_log"
  [ -n "$orch_log" ] && echo "  🎛️  Orchestration:  $orch_log"
  [ -n "$dev_log" ] && echo "  🎮 Game Server:    $dev_log"
  echo ""

  # If argument is "tail" or "watch", tail the most recent dev server log
  if [ "$1" = "tail" ] || [ "$1" = "watch" ]; then
    if [ -n "$dev_log" ]; then
      echo "Watching: $dev_log"
      echo "Press Ctrl+C to exit"
      echo ""
      tail -f "$dev_log"
    else
      echo "No dev server log found to tail"
    fi
  else
    echo "To watch logs in real-time:"
    echo "  ./start.sh logs tail"
    echo ""
  fi
}

# Function to clean old logs
cleanup_logs() {
  echo ""
  echo "=== Cleaning Up Old Log Files ==="
  echo ""

  mkdir -p logs

  local count=$(find logs -name "*.log" -type f -mtime +1 2>/dev/null | wc -l | tr -d ' ')

  if [ "$count" -eq 0 ]; then
    echo "  No old log files to clean (older than 1 day)"
  else
    echo "  Removing $count log file(s) older than 1 day..."
    find logs -name "*.log" -type f -mtime +1 -delete
    echo "  ✅ Cleanup complete"
  fi

  echo ""
  echo "Current log files:"
  ls -lh logs/*.log 2>/dev/null || echo "  No log files"
  echo ""
}

# Function to kill all servers
kill_servers() {
  echo ""
  echo "=== Stopping AI Village Servers ==="
  echo ""

  # Kill by port first (most reliable)
  local ports=(3000 3001 3002 8766 3030)
  for port in "${ports[@]}"; do
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs kill -9 2>/dev/null && echo "  Killed process on port $port" || true
    fi
  done

  # Kill by process name as cleanup
  pkill -9 -f "vite" 2>/dev/null && echo "  Stopped Vite dev servers" || true
  pkill -9 -f "metrics-server" 2>/dev/null && echo "  Stopped Metrics server" || true
  pkill -9 -f "tsx.*metrics-server" 2>/dev/null && echo "  Stopped tsx metrics-server" || true
  pkill -9 -f "node.*dashboard.*server" 2>/dev/null && echo "  Stopped Orchestration dashboard" || true
  pkill -9 -f "pixellab-daemon" 2>/dev/null && echo "  Stopped PixelLab daemon" || true
  pkill -9 -f "tsc --build --watch" 2>/dev/null && echo "  Stopped TypeScript watch" || true

  echo ""
  echo "All servers stopped."
  echo ""
}

# Handle kill, status, logs, and cleanup without banner
case "$MODE" in
  kill|stop)
    kill_servers
    exit 0
    ;;
  status)
    show_status
    exit 0
    ;;
  logs)
    show_logs "$2"
    exit 0
    ;;
  cleanup)
    cleanup_logs
    exit 0
    ;;
esac

# Display banner
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║         AI Village Game Engine            ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# First-time setup check
if [ ! -f ".setup-complete" ]; then
  echo "First-time setup required..."
  echo ""
  bash scripts/setup.sh
  touch .setup-complete
  echo ""
fi

# Launch appropriate mode
case "$MODE" in
  gamehost|host|game)
    bash scripts/start-game-host.sh
    ;;
  server|backend)
    bash scripts/start-server.sh
    ;;
  player|client)
    bash scripts/start-player.sh
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo ""
    echo "Usage: ./start.sh [mode]"
    echo ""
    echo "Modes:"
    echo "  gamehost (default) - Full game host with browser (metrics + orchestration + game + browser)"
    echo "  server             - Backend only for AI operation (metrics + orchestration)"
    echo "  player             - Open browser to existing server"
    echo "  kill               - Stop all running servers"
    echo "  status             - Show running server status"
    echo "  logs [tail]        - Show recent log files (add 'tail' to watch in real-time)"
    echo "  cleanup            - Remove log files older than 1 day"
    echo ""
    echo "Examples:"
    echo "  ./start.sh              # Start game host (default)"
    echo "  ./start.sh gamehost     # Start game host (explicit)"
    echo "  ./start.sh server       # Start backend only"
    echo "  ./start.sh player       # Open browser to existing server"
    echo "  ./start.sh kill         # Stop all servers"
    echo "  ./start.sh status       # Check what's running"
    echo "  ./start.sh logs         # List recent log files"
    echo "  ./start.sh logs tail    # Watch latest dev server log"
    echo "  ./start.sh cleanup      # Clean up old log files"
    echo ""
    exit 1
    ;;
esac
