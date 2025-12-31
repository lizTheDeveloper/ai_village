#!/bin/bash
#
# Batch Playtester - Playtests multiple features in a single Claude Code session
#
# Usage: batch-playtester.sh [--batch-size N]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
PROMPT_DIR="$AGENT_DIR/prompts"
LOG_DIR="$PROJECT_ROOT/logs"

BATCH_SIZE=5
STATE_TO_PROCESS="PLAYTEST"
NEXT_STATE="COMMIT"

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

echo "[BATCH PLAYTESTER] Starting (batch size: $BATCH_SIZE)"

while true; do
    # Find features in PLAYTEST state
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
        echo "[BATCH PLAYTESTER] No features in $STATE_TO_PROCESS state. Waiting..."
        sleep 10
        continue
    fi

    # Take up to BATCH_SIZE features
    batch=("${features[@]:0:$BATCH_SIZE}")
    echo "[BATCH PLAYTESTER] Processing ${#batch[@]} features: ${batch[*]}"

    # Build combined prompt
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    LOG_FILE="$LOG_DIR/${TIMESTAMP}-batch-playtester.log"

    PROMPT="$(cat "$PROMPT_DIR/playtest-agent.md")

---

## BATCH MODE - Multiple Features

You are playtesting ${#batch[@]} features in this session. For each feature:
1. Read the work order
2. Test mechanics via LLM dashboard (Phase 1)
3. Test UI via browser if needed (Phase 2)
4. Write playtest report with verdict

Process ALL features before finishing. Create a report for each.

---
"

    # Append each feature's work order
    for feature in "${batch[@]}"; do
        work_order="$WORK_ORDER_DIR/$feature/work-order.md"

        PROMPT="$PROMPT

## Feature: $feature

Work Order:
$(cat "$work_order")

Write report to: \`agents/autonomous-dev/work-orders/$feature/playtest-report.md\`
Screenshots to: \`agents/autonomous-dev/work-orders/$feature/screenshots/\`

---
"
    done

    PROMPT="$PROMPT

Remember: Test all ${#batch[@]} features and write a report for each with a clear APPROVED or NEEDS_WORK verdict."

    # Run Claude Code once for all features
    cd "$PROJECT_ROOT"

    echo "[BATCH PLAYTESTER] Starting Claude Code session..."
    if claude --dangerously-skip-permissions --model sonnet --mcp-config "$PROJECT_ROOT/.mcp.json" -p "$PROMPT" < /dev/null 2>&1 | tee "$LOG_FILE"; then
        echo "[BATCH PLAYTESTER] Session completed successfully"

        # Check each feature's verdict and update state
        for feature in "${batch[@]}"; do
            report="$WORK_ORDER_DIR/$feature/playtest-report.md"

            if [[ -f "$report" ]]; then
                verdict_section=$(grep -A 3 "^## Verdict" "$report" 2>/dev/null | tail -4 || echo "")

                if echo "$verdict_section" | grep -qi "APPROVED\|PASS"; then
                    echo "$NEXT_STATE" > "$WORK_ORDER_DIR/$feature/.state"
                    echo "[BATCH PLAYTESTER] ✓ $feature → $NEXT_STATE (APPROVED)"
                elif echo "$verdict_section" | grep -qi "NEEDS_WORK\|FAIL"; then
                    echo "IMPL" > "$WORK_ORDER_DIR/$feature/.state"
                    echo "[BATCH PLAYTESTER] ↩ $feature → IMPL (NEEDS_WORK)"
                else
                    echo "[BATCH PLAYTESTER] ? $feature - unclear verdict, leaving in PLAYTEST"
                fi
            else
                echo "[BATCH PLAYTESTER] ✗ $feature - no report generated, leaving in PLAYTEST"
            fi
        done
    else
        echo "[BATCH PLAYTESTER] Session failed - retrying batch in next iteration"
    fi

    echo "[BATCH PLAYTESTER] Batch complete. Starting next batch in 5 seconds..."
    sleep 5
done
