#!/bin/bash
# Player Mode - Opens browser to existing game server

echo "=== AI Village (Player Mode) ==="
echo ""
echo "Opening browser to central hub..."
echo ""
echo "Note: Make sure a game server is already running"
echo "      (use start-game-host.sh or npm run dev)"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "⚠ Warning: No server detected at http://localhost:3000"
  echo ""
  echo "Start the server first with:"
  echo "  ./start.sh gamehost"
  echo ""
  exit 1
fi

# Open browser to landing page (platform-specific)
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3000/hub.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3000/hub.html 2>/dev/null || echo "Please open http://localhost:3000/hub.html in your browser"
else
  echo "Please open http://localhost:3000/hub.html in your browser"
fi

echo "✓ Browser opened"
