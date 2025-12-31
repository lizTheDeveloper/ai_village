#!/bin/bash
#
# Generic Agent Worker - Runs a single agent phase for a single feature
#
# Usage: run-agent-worker.sh <phase> <feature-name>
#   phase: spec|test-pre|test-post|impl|review|playtest|commit
#   feature-name: name of work order directory
#

set -e

PHASE="$1"
FEATURE_NAME="$2"

if [[ -z "$PHASE" ]] || [[ -z "$FEATURE_NAME" ]]; then
    echo "Usage: $0 <phase> <feature-name>"
    exit 1
fi

# Resolve directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"

LOG_DIR="$PROJECT_ROOT/logs"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
PROMPT_DIR="$AGENT_DIR/prompts"

mkdir -p "$LOG_DIR"

# State management
STATE_FILE="$WORK_ORDER_DIR/$FEATURE_NAME/.state"

get_state() {
    if [[ -f "$STATE_FILE" ]]; then
        cat "$STATE_FILE"
    else
        echo "NEW"
    fi
}

set_state() {
    echo "$1" > "$STATE_FILE"
}

# Map phase to prompt file and agent name
case "$PHASE" in
    spec)
        PROMPT_FILE="$PROMPT_DIR/spec-agent.md"
        AGENT_NAME="spec-agent"
        CONTEXT="Process this specific feature: $FEATURE_NAME"
        ;;
    test-pre)
        PROMPT_FILE="$PROMPT_DIR/test-agent.md"
        AGENT_NAME="test-agent-pre"
        WORK_ORDER="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
        CONTEXT="Work Order:\n\n$(cat "$WORK_ORDER")\n\n---\n\nWrite comprehensive tests for this feature."
        ;;
    test-post)
        PROMPT_FILE="$PROMPT_DIR/test-agent.md"
        AGENT_NAME="test-agent-post"
        WORK_ORDER="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
        CONTEXT="Work Order:\n\n$(cat "$WORK_ORDER")\n\n---\n\nRun tests and report results."
        ;;
    impl)
        PROMPT_FILE="$PROMPT_DIR/implementation-agent.md"
        AGENT_NAME="implementation-agent"
        WORK_ORDER="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
        CONTEXT="Work Order:\n\n$(cat "$WORK_ORDER")"
        ;;
    review)
        PROMPT_FILE="$PROMPT_DIR/review-agent.md"
        AGENT_NAME="review-agent"
        WORK_ORDER="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
        CONTEXT="Work Order:\n\n$(cat "$WORK_ORDER")"
        ;;
    playtest)
        PROMPT_FILE="$PROMPT_DIR/playtest-agent.md"
        AGENT_NAME="playtest-agent"
        WORK_ORDER="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
        CONTEXT="Work Order:\n\n$(cat "$WORK_ORDER")"
        ;;
    commit)
        PROMPT_FILE="$PROMPT_DIR/commit-agent.md"
        AGENT_NAME="commit-agent"
        WORK_ORDER="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
        PLAYTEST_REPORT="$WORK_ORDER_DIR/$FEATURE_NAME/playtest-report.md"
        CONTEXT="Work Order:\n\n$(cat "$WORK_ORDER")\n\n---\n\nPlaytest Report:\n\n$(cat "$PLAYTEST_REPORT")"
        ;;
    *)
        echo "Unknown phase: $PHASE"
        exit 1
        ;;
esac

# Log file with feature name for parallel runs
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/${TIMESTAMP}-${FEATURE_NAME}-${AGENT_NAME}.log"

echo "[$(date +%H:%M:%S)] Running ${AGENT_NAME} for ${FEATURE_NAME}..."
echo "[$(date +%H:%M:%S)] Log: $LOG_FILE"

# Build prompt
PROMPT="$(cat "$PROMPT_FILE")"
if [[ -n "$CONTEXT" ]]; then
    PROMPT="$PROMPT

---

## Context

$CONTEXT"
fi

# Run Claude Code
cd "$PROJECT_ROOT"

if claude --dangerously-skip-permissions --model sonnet --mcp-config "$PROJECT_ROOT/.mcp.json" -p "$PROMPT" < /dev/null 2>&1 | tee "$LOG_FILE"; then
    echo "[$(date +%H:%M:%S)] ${AGENT_NAME} completed successfully"
    exit 0
else
    echo "[$(date +%H:%M:%S)] ${AGENT_NAME} failed"
    exit 1
fi
