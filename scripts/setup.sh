#!/bin/bash
#
# AI Village Development Environment Setup
#
# This script sets up a new development environment with all required
# dependencies, tools, and configurations.
#
# Usage:
#   ./scripts/setup.sh
#
# Requirements:
#   - Node.js 20+ (recommend using nvm)
#   - Python 3.10+ (for MCP servers)
#   - Git
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "==========================================="
echo "  AI Village Development Setup"
echo "==========================================="
echo ""

# =============================================================================
# Check prerequisites
# =============================================================================

info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 20+ first."
    echo "  Recommended: Use nvm (https://github.com/nvm-sh/nvm)"
    echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "    nvm install 20"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js version 18+ is required. Current: $(node -v)"
    exit 1
fi
success "Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm is not installed."
    exit 1
fi
success "npm $(npm -v)"

# Check Python (optional, for MCP servers)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    success "Python $PYTHON_VERSION"
else
    warn "Python 3 not found. MCP servers won't be available."
fi

# Check Git
if ! command -v git &> /dev/null; then
    error "Git is not installed."
    exit 1
fi
success "Git $(git --version | cut -d' ' -f3)"

echo ""

# =============================================================================
# Install Node.js dependencies
# =============================================================================

info "Installing Node.js dependencies..."

cd "$PROJECT_ROOT/custom_game_engine"

if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

success "Node.js dependencies installed"

cd "$PROJECT_ROOT"

# =============================================================================
# Install Playwright browsers
# =============================================================================

info "Installing Playwright browsers..."

cd "$PROJECT_ROOT/custom_game_engine"
npx playwright install chromium

success "Playwright browsers installed"

cd "$PROJECT_ROOT"

# =============================================================================
# Setup environment files
# =============================================================================

info "Setting up environment files..."

# Create .env from example if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    warn "Created .env from .env.example - please update with your credentials"
elif [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# AI Village Environment Configuration
# Copy this to .env and fill in your values

# NATS Configuration
NATS_URL=nats://34.185.163.86:4222
NATS_USER=orchestrator
NATS_PASSWORD=your_password_here
NATS_NAMESPACE=ai_village

# Project Settings
PROJECT_NAME=ai_village
EOF
    warn "Created .env template - please update with your credentials"
else
    success ".env already exists"
fi

# Create .nats_config if it doesn't exist
if [ ! -f ".nats_config" ]; then
    cat > .nats_config << 'EOF'
# NATS Server Configuration
# Source this file: source .nats_config

export NATS_URL=nats://34.185.163.86:4222
export NATS_USER=orchestrator
export NATS_PASSWORD=your_password_here
export NATS_CONTEXT=gcp-orchestrator
export NATS_NAMESPACE=ai_village
export PROJECT_NAME=ai_village
EOF
    warn "Created .nats_config template - please update with your credentials"
else
    success ".nats_config already exists"
fi

# =============================================================================
# Setup Python environment (optional)
# =============================================================================

if command -v python3 &> /dev/null; then
    info "Setting up Python environment for MCP servers..."

    # Check if fastmcp and nats-py are installed
    if python3 -c "import fastmcp; import nats" 2>/dev/null; then
        success "Python MCP dependencies already installed"
    else
        warn "Installing Python MCP dependencies..."
        pip3 install fastmcp nats-py --quiet 2>/dev/null || {
            warn "Could not install Python dependencies globally."
            warn "Consider using a virtual environment:"
            echo "    python3 -m venv .venv"
            echo "    source .venv/bin/activate"
            echo "    pip install fastmcp nats-py"
        }
    fi
fi

# =============================================================================
# Setup pre-commit hooks
# =============================================================================

info "Setting up pre-commit hooks..."

cd "$PROJECT_ROOT/custom_game_engine"

# Check if husky is available
if [ -d "node_modules/husky" ] || npm list husky >/dev/null 2>&1; then
    npx husky install 2>/dev/null || true
    success "Pre-commit hooks installed"
else
    warn "Husky not found. Skipping pre-commit hooks."
    warn "To install: cd custom_game_engine && npm install husky --save-dev && npx husky install"
fi

cd "$PROJECT_ROOT"

# =============================================================================
# Setup NATS CLI context (optional)
# =============================================================================

if command -v nats &> /dev/null; then
    info "Checking NATS CLI context..."

    if nats context ls 2>/dev/null | grep -q "gcp-orchestrator"; then
        success "NATS context 'gcp-orchestrator' already configured"
    else
        warn "NATS context not configured. To set up:"
        echo "    nats context save gcp-orchestrator \\"
        echo "      --server=nats://34.185.163.86:4222 \\"
        echo "      --user=orchestrator \\"
        echo "      --password=<your-password>"
    fi
else
    info "NATS CLI not installed (optional)"
    echo "    To install: brew install nats-io/nats-tools/nats"
fi

# =============================================================================
# Verify installation
# =============================================================================

echo ""
info "Verifying installation..."

cd "$PROJECT_ROOT/custom_game_engine"

# Try to build
if npm run build >/dev/null 2>&1; then
    success "Build successful"
else
    error "Build failed. Please check for errors."
    exit 1
fi

# Try to run tests
if npm test >/dev/null 2>&1; then
    success "Tests passing"
else
    warn "Some tests may be failing. Run 'npm test' for details."
fi

cd "$PROJECT_ROOT"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "==========================================="
echo "  Setup Complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "  1. Update .env and .nats_config with your credentials"
echo "  2. Run 'make verify' to check everything works"
echo "  3. Run 'make dev' to start development mode"
echo ""
echo "Useful commands:"
echo "  make help     - Show all available commands"
echo "  make build    - Build the project"
echo "  make test     - Run unit tests"
echo "  make e2e      - Run E2E tests"
echo "  make verify   - Full verification"
echo ""
echo "Documentation:"
echo "  - CLAUDE.md   - Development guidelines"
echo "  - openspec/   - System specifications"
echo ""
