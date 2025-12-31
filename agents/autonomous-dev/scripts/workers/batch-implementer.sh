#!/bin/bash
#
# Batch Implementer - Implements multiple features in a single Claude Code session
#
# Usage: batch-implementer.sh [--batch-size N]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
PROMPT_DIR="$AGENT_DIR/prompts"
LOG_DIR="$PROJECT_ROOT/logs"

BATCH_SIZE=3  # Smaller batch for implementation (more complex)
STATE_TO_PROCESS="IMPL"
NEXT_STATE="TESTS_POST"

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

echo "[BATCH IMPLEMENTER] Starting (batch size: $BATCH_SIZE)"

while true; do
    # Find features in IMPL state
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
        echo "[BATCH IMPLEMENTER] No features in $STATE_TO_PROCESS state. Waiting..."
        sleep 10
        continue
    fi

    # Take up to BATCH_SIZE features
    batch=("${features[@]:0:$BATCH_SIZE}")
    echo "[BATCH IMPLEMENTER] Processing ${#batch[@]} features: ${batch[*]}"

    # Build combined prompt
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    LOG_FILE="$LOG_DIR/${TIMESTAMP}-batch-implementer.log"

    PROMPT="$(cat "$PROMPT_DIR/implementation-agent.md")

---

## BATCH MODE - Multiple Features

You are implementing ${#batch[@]} features in this session. For each feature:
1. Read the work order and tests
2. Implement the feature to make tests pass
3. Follow CLAUDE.md guidelines strictly

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

Implementation files typically in: \`custom_game_engine/packages/\`

---
"
    done

    PROMPT="$PROMPT

Remember: Implement all ${#batch[@]} features in this single session."

    # Run Claude Code once for all features
    cd "$PROJECT_ROOT"

    echo "[BATCH IMPLEMENTER] Starting Claude Code session..."
    if claude --dangerously-skip-permissions --model sonnet --mcp-config "$PROJECT_ROOT/.mcp.json" -p "$PROMPT" < /dev/null 2>&1 | tee "$LOG_FILE"; then
        echo "[BATCH IMPLEMENTER] Session completed successfully"

        # Advance all features to next state
        for feature in "${batch[@]}"; do
            echo "$NEXT_STATE" > "$WORK_ORDER_DIR/$feature/.state"
            echo "[BATCH IMPLEMENTER] ✓ $feature → $NEXT_STATE"
        done
    else
        echo "[BATCH IMPLEMENTER] Session failed - retrying batch in next iteration"
    fi

    echo "[BATCH IMPLEMENTER] Batch complete. Starting next batch in 5 seconds..."
    sleep 5
done
