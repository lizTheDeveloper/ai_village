#!/bin/bash
#
# Batch Committer - Commits multiple features in a single Claude Code session
#
# Usage: batch-committer.sh [--batch-size N] [--feature-list "feature1 feature2 feature3"]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
PROMPT_DIR="$AGENT_DIR/prompts"
LOG_DIR="$PROJECT_ROOT/logs"

BATCH_SIZE=5
STATE_TO_PROCESS="COMMIT"
NEXT_STATE="READY_FOR_REVIEW"
FEATURE_LIST=""

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --batch-size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        --feature-list)
            FEATURE_LIST="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo "[BATCH COMMITTER] Starting (batch size: $BATCH_SIZE)"

# One-shot mode if feature list provided
if [[ -n "$FEATURE_LIST" ]]; then
    read -ra batch <<< "$FEATURE_LIST"
    echo "[BATCH COMMITTER] One-shot mode: processing ${#batch[@]} features: ${batch[*]}"
else
    # Continuous mode - find features in COMMIT state
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

    if [[ ${#features[@]} -eq 0 ]]; then
        echo "[BATCH COMMITTER] No features in $STATE_TO_PROCESS state."
        exit 0
    fi

    # Take up to BATCH_SIZE features
    batch=("${features[@]:0:$BATCH_SIZE}")
    echo "[BATCH COMMITTER] Processing ${#batch[@]} features: ${batch[*]}"
fi

# Build combined prompt
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/${TIMESTAMP}-batch-committer.log"

PROMPT="$(cat "$PROMPT_DIR/commit-agent.md")

---

## BATCH MODE - Multiple Features

You are processing ${#batch[@]} features in this session. For each feature:
1. Review the changes made
2. Create a git commit with an appropriate message
3. Follow the project's commit message conventions

Process ALL features before finishing. Each feature gets its own commit.

---
"

# Append each feature's information
for feature in "${batch[@]}"; do
    work_order="$WORK_ORDER_DIR/$feature/work-order.md"

    PROMPT="$PROMPT

## Feature: $feature

Work Order:
$(cat "$work_order" 2>/dev/null || echo "No work order found")

Changes are in: \`agents/autonomous-dev/work-orders/$feature/\`

---
"
done

PROMPT="$PROMPT

Remember: Process all ${#batch[@]} features in this single session. Create a commit for each one."

# Run Claude Code once for all features
cd "$PROJECT_ROOT"

echo "[BATCH COMMITTER] Starting Claude Code session..."
if claude --dangerously-skip-permissions --model sonnet --mcp-config "$PROJECT_ROOT/.mcp.json" -p "$PROMPT" < /dev/null 2>&1 | tee "$LOG_FILE"; then
    echo "[BATCH COMMITTER] Session completed successfully"

    # Advance all features to next state
    for feature in "${batch[@]}"; do
        echo "$NEXT_STATE" > "$WORK_ORDER_DIR/$feature/.state"
        echo "[BATCH COMMITTER] ✓ $feature → $NEXT_STATE"
    done
else
    echo "[BATCH COMMITTER] Session failed"
    exit 1
fi

echo "[BATCH COMMITTER] Batch complete"
