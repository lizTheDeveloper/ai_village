#!/bin/bash
#
# Run a single agent with specified prompt and context
#
# Usage:
#   ./run-agent.sh AGENT_NAME [--work-order PATH] [--context "extra context"]
#
# Examples:
#   ./run-agent.sh spec-agent
#   ./run-agent.sh impl-agent --work-order work-orders/feature/work-order.md
#   ./run-agent.sh playtest-agent --work-order work-orders/feature/work-order.md
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"

LOG_DIR="$PROJECT_ROOT/logs"
PROMPT_DIR="$AGENT_DIR/prompts"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

timestamp() { date +%Y%m%d-%H%M%S; }

# Parse arguments
AGENT_NAME=""
WORK_ORDER=""
EXTRA_CONTEXT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --work-order)
            WORK_ORDER="$2"
            shift 2
            ;;
        --context)
            EXTRA_CONTEXT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 AGENT_NAME [options]"
            echo ""
            echo "Agents:"
            echo "  spec-agent     - Prepare work orders"
            echo "  test-agent     - Write/run tests"
            echo "  impl-agent     - Implement features"
            echo "  playtest-agent - UI testing"
            echo ""
            echo "Options:"
            echo "  --work-order PATH  Path to work order file"
            echo "  --context TEXT     Additional context for agent"
            echo ""
            exit 0
            ;;
        *)
            if [[ -z "$AGENT_NAME" ]]; then
                AGENT_NAME="$1"
            else
                echo -e "${RED}Error: Unknown argument: $1${NC}"
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$AGENT_NAME" ]]; then
    echo -e "${RED}Error: Agent name required${NC}"
    echo "Usage: $0 AGENT_NAME [options]"
    exit 1
fi

# Map agent name to prompt file
case "$AGENT_NAME" in
    spec-agent|spec)
        PROMPT_FILE="$PROMPT_DIR/spec-agent.md"
        ;;
    test-agent|test)
        PROMPT_FILE="$PROMPT_DIR/test-agent.md"
        ;;
    impl-agent|impl|implementation)
        PROMPT_FILE="$PROMPT_DIR/impl-agent.md"
        ;;
    playtest-agent|playtest)
        PROMPT_FILE="$PROMPT_DIR/playtest-agent.md"
        ;;
    *)
        echo -e "${RED}Error: Unknown agent: $AGENT_NAME${NC}"
        echo "Valid agents: spec-agent, test-agent, impl-agent, playtest-agent"
        exit 1
        ;;
esac

if [[ ! -f "$PROMPT_FILE" ]]; then
    echo -e "${RED}Error: Prompt file not found: $PROMPT_FILE${NC}"
    exit 1
fi

# Build prompt
PROMPT="$(cat "$PROMPT_FILE")"

# Add work order context
if [[ -n "$WORK_ORDER" ]]; then
    if [[ ! -f "$WORK_ORDER" ]]; then
        echo -e "${RED}Error: Work order not found: $WORK_ORDER${NC}"
        exit 1
    fi
    PROMPT="$PROMPT

---

## Work Order

$(cat "$WORK_ORDER")"
fi

# Add extra context
if [[ -n "$EXTRA_CONTEXT" ]]; then
    PROMPT="$PROMPT

---

## Additional Context

$EXTRA_CONTEXT"
fi

# Setup
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(timestamp)-${AGENT_NAME}.log"

echo -e "${BLUE}Running: $AGENT_NAME${NC}"
echo -e "${BLUE}Log: $LOG_FILE${NC}"
echo ""

# Run Claude Code
cd "$PROJECT_ROOT"

if claude --dangerously-skip-permissions --print -p "$PROMPT" < /dev/null 2>&1 | tee "$LOG_FILE"; then
    echo ""
    echo -e "${GREEN}✓ Agent completed successfully${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Agent failed${NC}"
    exit 1
fi
