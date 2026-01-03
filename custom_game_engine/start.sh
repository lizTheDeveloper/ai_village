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
  pkill -9 -f "tsc --build --watch" 2>/dev/null && echo "  Stopped TypeScript watch" || true

  echo ""
  echo "All servers stopped."
  echo ""
}

# Handle kill and status without banner
case "$MODE" in
  kill|stop)
    kill_servers
    exit 0
    ;;
  status)
    show_status
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
    echo ""
    echo "Examples:"
    echo "  ./start.sh              # Start game host (default)"
    echo "  ./start.sh gamehost     # Start game host (explicit)"
    echo "  ./start.sh server       # Start backend only"
    echo "  ./start.sh player       # Open browser to existing server"
    echo "  ./start.sh kill         # Stop all servers"
    echo "  ./start.sh status       # Check what's running"
    echo ""
    exit 1
    ;;
esac
