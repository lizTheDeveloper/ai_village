# AI Village Development Makefile
# Common development tasks for the custom game engine

.PHONY: help setup build test lint clean dev e2e check verify all

# Default target
help:
	@echo "AI Village Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup       - Install all dependencies"
	@echo "  make setup-hooks - Install pre-commit hooks"
	@echo ""
	@echo "Development:"
	@echo "  make build       - Build all packages"
	@echo "  make dev         - Start development mode (watch)"
	@echo "  make clean       - Clean build artifacts"
	@echo ""
	@echo "Testing:"
	@echo "  make test        - Run unit tests"
	@echo "  make test-watch  - Run tests in watch mode"
	@echo "  make e2e         - Run Playwright E2E tests"
	@echo "  make coverage    - Run tests with coverage"
	@echo ""
	@echo "Quality:"
	@echo "  make lint        - Run ESLint"
	@echo "  make check       - Run anti-pattern checks"
	@echo "  make verify      - Full verification (lint + test + build + check)"
	@echo ""
	@echo "NATS:"
	@echo "  make nats-status - Check NATS server status"
	@echo "  make nats-streams - List NATS streams"
	@echo ""
	@echo "Agents:"
	@echo "  make chatroom-test - Test chatroom MCP server"

# =============================================================================
# Setup
# =============================================================================

setup:
	@echo "Installing dependencies..."
	cd custom_game_engine && npm ci
	@echo "Installing Playwright browsers..."
	cd custom_game_engine && npx playwright install chromium
	@echo "Setup complete!"

setup-hooks:
	@echo "Installing pre-commit hooks..."
	cd custom_game_engine && npx husky install || true
	@echo "Pre-commit hooks installed!"

# =============================================================================
# Development
# =============================================================================

build:
	@echo "Building all packages..."
	cd custom_game_engine && npm run build

dev:
	@echo "Starting development mode..."
	cd custom_game_engine && npm run dev

clean:
	@echo "Cleaning build artifacts..."
	cd custom_game_engine && npm run clean
	rm -rf custom_game_engine/node_modules/.cache
	rm -rf custom_game_engine/coverage
	rm -rf custom_game_engine/playwright-report
	rm -rf custom_game_engine/test-results

# =============================================================================
# Testing
# =============================================================================

test:
	@echo "Running unit tests..."
	cd custom_game_engine && npm test

test-watch:
	@echo "Running tests in watch mode..."
	cd custom_game_engine && npm run test:watch

coverage:
	@echo "Running tests with coverage..."
	cd custom_game_engine && npm run test:coverage

e2e:
	@echo "Running E2E tests..."
	cd custom_game_engine && npx playwright test

e2e-ui:
	@echo "Running E2E tests with UI..."
	cd custom_game_engine && npx playwright test --ui

# =============================================================================
# Quality
# =============================================================================

lint:
	@echo "Running ESLint..."
	cd custom_game_engine && npm run lint

check:
	@echo "Checking for anti-patterns..."
	@echo ""
	@echo "=== console.warn (should be errors) ==="
	@grep -rn "console.warn" custom_game_engine/packages/ 2>/dev/null || echo "None found"
	@echo ""
	@echo "=== any types (should be typed) ==="
	@grep -rn ": any\|as any" custom_game_engine/packages/ 2>/dev/null || echo "None found"
	@echo ""
	@echo "=== TODO/FIXME comments ==="
	@grep -rn "TODO\|FIXME" custom_game_engine/packages/ 2>/dev/null || echo "None found"
	@echo ""
	@echo "=== Skipped tests ==="
	@grep -rn "\.skip\|\.only" custom_game_engine/packages/ --include="*.test.ts" --include="*.spec.ts" 2>/dev/null || echo "None found"
	@echo ""
	@echo "=== Nullish coalescing with defaults ==="
	@grep -rn "?? " custom_game_engine/packages/ 2>/dev/null | head -20 || echo "None found"
	@echo ""
	@echo "Anti-pattern check complete!"

verify: lint test build check
	@echo ""
	@echo "=== All verification passed! ==="

# Full verification including E2E
all: verify e2e
	@echo ""
	@echo "=== Full verification complete! ==="

# =============================================================================
# NATS
# =============================================================================

nats-status:
	@echo "Checking NATS server..."
	@nc -z -w 2 34.185.163.86 4222 && echo "NATS server is reachable" || echo "NATS server is NOT reachable"

nats-streams:
	@echo "Listing NATS streams..."
	@nats stream ls --context=gcp-orchestrator 2>/dev/null || echo "NATS CLI not configured. Run: nats context save gcp-orchestrator --server=nats://34.185.163.86:4222 --user=orchestrator --password=<password>"

nats-chatroom-info:
	@echo "Chatroom stream info..."
	@nats stream info AI_VILLAGE_CHATROOM --context=gcp-orchestrator 2>/dev/null || echo "Chatroom stream not found"

# =============================================================================
# Agents
# =============================================================================

chatroom-test:
	@echo "Testing chatroom MCP server..."
	@source .nats_config 2>/dev/null || true
	@python3 -c "import mcp_proxy_system.servers.chatroom_server; print('Chatroom server imports OK')" 2>/dev/null || echo "Failed to import chatroom server. Check dependencies."

# =============================================================================
# Shortcuts
# =============================================================================

t: test
b: build
l: lint
c: check
v: verify
