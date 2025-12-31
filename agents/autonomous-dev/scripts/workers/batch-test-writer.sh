#!/bin/bash
#
# Batch Test Writer - Writes tests for multiple features in a single Claude Code session
#
# Usage: batch-test-writer.sh [--batch-size N]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
PROMPT_DIR="$AGENT_DIR/prompts"
LOG_DIR="$PROJECT_ROOT/logs"

BATCH_SIZE=5
STATE_TO_PROCESS="TESTS_PRE"
NEXT_STATE="IMPL"

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --batch-size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo "[BATCH TEST WRITER] Starting (batch size: $BATCH_SIZE)"

while true; do
    # Find features in TESTS_PRE state
    features=()
    for dir in "$WORK_ORDER_DIR"/*; do
        if [[ -d "$dir" ]] && [[ "$(basename "$dir")" != "_archived" ]] && [[ "$(basename "$dir")" != "archive" ]]; then
            feature=$(basename "$dir")
            state_file="$dir/.state"

            if [[ -f "$state_file" ]] && [[ "$(cat "$state_file")" == "$STATE_TO_PROCESS" ]]; then
                features+=("$feature")
            fi
        fi
    done

    # Check if we have work
    if [[ ${#features[@]} -eq 0 ]]; then
        echo "[BATCH TEST WRITER] No features in $STATE_TO_PROCESS state. Waiting..."
        sleep 10
        continue
    fi

    # Take up to BATCH_SIZE features
    batch=("${features[@]:0:$BATCH_SIZE}")
    echo "[BATCH TEST WRITER] Processing ${#batch[@]} features: ${batch[*]}"

    # Build combined prompt
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    LOG_FILE="$LOG_DIR/${TIMESTAMP}-batch-test-writer.log"

    PROMPT="$(cat "$PROMPT_DIR/test-agent.md")

---

## BATCH MODE - Multiple Features

You are processing ${#batch[@]} features in this session. For each feature:
1. Read the work order
2. Write comprehensive tests
3. Save to the feature's work order directory

Process ALL features before finishing.

---
"

    # Append each feature's work order
    for feature in "${batch[@]}"; do
        work_order="$WORK_ORDER_DIR/$feature/work-order.md"

        PROMPT="$PROMPT

## Feature: $feature

Work Order:
$(cat "$work_order")

Write tests to: \`agents/autonomous-dev/work-orders/$feature/\`

---
"
    done

    PROMPT="$PROMPT

Remember: Process all ${#batch[@]} features in this single session. Write tests for each one."

    # Run Claude Code once for all features
    cd "$PROJECT_ROOT"

    echo "[BATCH TEST WRITER] Starting Claude Code session..."
    if claude --dangerously-skip-permissions --model sonnet --mcp-config "$PROJECT_ROOT/.mcp.json" -p "$PROMPT" < /dev/null 2>&1 | tee "$LOG_FILE"; then
        echo "[BATCH TEST WRITER] Session completed successfully"

        # Advance all features to next state
        for feature in "${batch[@]}"; do
            echo "$NEXT_STATE" > "$WORK_ORDER_DIR/$feature/.state"
            echo "[BATCH TEST WRITER] ✓ $feature → $NEXT_STATE"
        done
    else
        echo "[BATCH TEST WRITER] Session failed - retrying batch in next iteration"
    fi

    echo "[BATCH TEST WRITER] Batch complete. Starting next batch in 5 seconds..."
    sleep 5
done
