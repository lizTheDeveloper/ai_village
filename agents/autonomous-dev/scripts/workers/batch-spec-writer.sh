#!/bin/bash
#
# Batch Spec Writer - Creates work orders for multiple features in one session
#
# Usage: batch-spec-writer.sh [--batch-size N] [--feature-list "feat1 feat2..."]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
PROMPT_DIR="$AGENT_DIR/prompts"
LOG_DIR="$PROJECT_ROOT/logs"

BATCH_SIZE=5
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

echo "[BATCH SPEC WRITER] Starting (batch size: $BATCH_SIZE)"

# If feature list provided, use it; otherwise find from roadmap/bugs
if [[ -z "$FEATURE_LIST" ]]; then
    echo "[BATCH SPEC WRITER] No feature list provided. Checking roadmap/bugs..."
    # TODO: Auto-discover from roadmap.md or bugs.json
    echo "[BATCH SPEC WRITER] Waiting for features to be queued..."
    sleep 30
    exit 0
fi

# Split feature list into array
IFS=' ' read -ra features <<< "$FEATURE_LIST"

echo "[BATCH SPEC WRITER] Creating work orders for ${#features[@]} features: ${features[*]}"

# Build combined prompt
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/${TIMESTAMP}-batch-spec-writer.log"

PROMPT="$(cat "$PROMPT_DIR/spec-agent.md")

---

## BATCH MODE - Multiple Work Orders

You are creating work orders for ${#features[@]} features in this session.

For each feature below:
1. Create directory: \`agents/autonomous-dev/work-orders/[feature-name]/\`
2. Write file: \`agents/autonomous-dev/work-orders/[feature-name]/work-order.md\`
3. Follow the work order template

Process ALL features before finishing.

---

## Features to Spec:

"

for feature in "${features[@]}"; do
    PROMPT="$PROMPT
- **$feature**
"
done

PROMPT="$PROMPT

Remember: Create ${#features[@]} separate work order files, one for each feature."

# Run Claude Code once for all features
cd "$PROJECT_ROOT"

echo "[BATCH SPEC WRITER] Starting Claude Code session..."
if claude --dangerously-skip-permissions --model sonnet --mcp-config "$PROJECT_ROOT/.mcp.json" -p "$PROMPT" < /dev/null 2>&1 | tee "$LOG_FILE"; then
    echo "[BATCH SPEC WRITER] Session completed successfully"

    # Set all features to TESTS_PRE state
    for feature in "${features[@]}"; do
        state_file="$WORK_ORDER_DIR/$feature/.state"
        mkdir -p "$(dirname "$state_file")"
        echo "TESTS_PRE" > "$state_file"
        echo "[BATCH SPEC WRITER] ✓ $feature → TESTS_PRE"
    done
else
    echo "[BATCH SPEC WRITER] Session failed"
    exit 1
fi

echo "[BATCH SPEC WRITER] Batch complete!"
