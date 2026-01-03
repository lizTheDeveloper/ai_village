#!/bin/bash
# First-time setup script for AI Village

set -e

echo "=== AI Village Setup ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: Must run from custom_game_engine directory"
  exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed"
  echo "Please install Node.js from https://nodejs.org/"
  exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Build TypeScript if dist doesn't exist
if [ ! -d "packages/core/dist" ]; then
  echo "Building TypeScript..."
  npm run build
  echo ""
fi

# Check for LLM server (optional)
echo "Checking for LLM server..."
if [[ "$OSTYPE" == "darwin"* ]] && command -v mlx_lm.server &> /dev/null; then
  echo "✓ MLX server available (recommended for macOS)"
elif command -v ollama &> /dev/null; then
  echo "✓ Ollama available"
else
  echo "⚠ No LLM server detected (optional)"
  echo "  For AI agents, install MLX (macOS) or Ollama"
  echo "  See MLX_SETUP.md for details"
fi

echo ""
echo "✓ Setup complete!"
