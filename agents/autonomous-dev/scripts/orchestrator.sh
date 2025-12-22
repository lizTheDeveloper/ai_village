#!/bin/bash
#
# AI Village Autonomous Development Orchestrator
#
# This script coordinates the autonomous development pipeline:
# 1. Spec Agent - Prepares work order
# 2. Test Agent - Writes tests (TDD)
# 3. Implementation Agent - Builds feature
# 4. Test Agent - Verifies tests pass
# 5. Playtest Agent - UI testing
# 6. Loop until approved or max retries
#
# Usage:
#   ./orchestrator.sh                    # Process next available feature
#   ./orchestrator.sh --feature NAME     # Process specific feature
#   ./orchestrator.sh --resume NAME      # Resume from last state
#

set -e

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"

# Directories
LOG_DIR="$PROJECT_ROOT/logs"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
PROMPT_DIR="$AGENT_DIR/prompts"

# Limits
MAX_IMPL_RETRIES=${MAX_IMPL_RETRIES:-3}
# No playtest retry limit - keep iterating until APPROVED (like Sonnet, it gets there eventually)

# NATS Config
source "$PROJECT_ROOT/.nats_config" 2>/dev/null || true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# Helpers
# =============================================================================

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
success() { echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC} $1"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $1"; }
header() { echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN} $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"; }

# Register this orchestrator instance with dashboard
register_pid() {
    local feature_name="$1"
    local pipelines_file="$AGENT_DIR/dashboard/.pipelines.json"
    local pid=$$
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

    # Create dashboard directory if it doesn't exist
    mkdir -p "$(dirname "$pipelines_file")"

    # Read existing pipelines or create empty array
    local existing="[]"
    if [ -f "$pipelines_file" ]; then
        existing=$(cat "$pipelines_file")
    fi

    # Create new pipeline entry
    local new_entry=$(cat <<EOF
{
  "id": "pipeline-$(date +%s)000",
  "featureName": "$feature_name",
  "pid": $pid,
  "startTime": "$timestamp",
  "status": "running",
  "logs": []
}
EOF
)

    # Append to array (simple approach - just add to existing array)
    if [ "$existing" = "[]" ]; then
        echo "[$new_entry]" > "$pipelines_file"
    else
        # Remove trailing ] and add new entry
        echo "$existing" | sed '$ s/]//' | sed "$ s/$/,/" > "$pipelines_file.tmp"
        echo "$new_entry" >> "$pipelines_file.tmp"
        echo "]" >> "$pipelines_file.tmp"
        mv "$pipelines_file.tmp" "$pipelines_file"
    fi

    log "Registered PID $pid for feature: $feature_name"
}

timestamp() { date +%Y%m%d-%H%M%S; }

ensure_dirs() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$WORK_ORDER_DIR"
}

# =============================================================================
# Agent Runners
# =============================================================================

run_agent() {
    local agent_name="$1"
    local prompt_file="$2"
    local extra_context="$3"
    # Include feature name in log file for parallel runs
    local feature_slug="${FEATURE_NAME:-unknown}"
    local log_file="$LOG_DIR/$(timestamp)-${feature_slug}-${agent_name}.log"

    log "Running ${agent_name} for ${feature_slug}..."
    log "Log: $log_file"

    # Build the prompt
    local prompt
    if [[ -f "$prompt_file" ]]; then
        prompt="$(cat "$prompt_file")"
    else
        error "Prompt file not found: $prompt_file"
        return 1
    fi

    # Add extra context if provided
    if [[ -n "$extra_context" ]]; then
        prompt="$prompt

---

## Context

$extra_context"
    fi

    # Run Claude Code
    cd "$PROJECT_ROOT"

    if claude --dangerously-skip-permissions --print -p "$prompt" 2>&1 | tee "$log_file"; then
        success "${agent_name} completed successfully"
        return 0
    else
        error "${agent_name} failed"
        return 1
    fi
}

run_spec_agent() {
    header "PHASE 1: SPEC AGENT"

    local context=""
    if [[ -n "$FEATURE_NAME" ]]; then
        context="Process this specific feature: $FEATURE_NAME"
    fi

    run_agent "spec-agent" "$PROMPT_DIR/spec-agent.md" "$context"
}

run_test_agent_pre() {
    header "PHASE 2: TEST AGENT (Pre-Implementation)"

    local work_order="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
    if [[ ! -f "$work_order" ]]; then
        error "Work order not found: $work_order"
        return 1
    fi

    local context="Work Order:

$(cat "$work_order")

---

Your task: Write tests for this feature. Tests should FAIL initially (TDD red phase)."

    run_agent "test-agent-pre" "$PROMPT_DIR/test-agent.md" "$context"
}

run_impl_agent() {
    header "PHASE 3: IMPLEMENTATION AGENT"

    local work_order="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
    if [[ ! -f "$work_order" ]]; then
        error "Work order not found: $work_order"
        return 1
    fi

    local context="Work Order:

$(cat "$work_order")

---

Your task: Implement this feature. Make all tests pass.

NOTE: If tests are broken/outdated (testing wrong behavior), you can write to:
  agents/autonomous-dev/work-orders/$FEATURE_NAME/test-results.md
With: Verdict: TESTS_NEED_FIX
And explain what tests need fixing. The test agent will fix them."

    # Include test results if they exist (from previous iteration)
    local test_results="$WORK_ORDER_DIR/$FEATURE_NAME/test-results.md"
    if [[ -f "$test_results" ]]; then
        context="$context

---

## Previous Test Results

$(cat "$test_results")"
        log "Including test results in context"
    fi

    # Include playtest report if it exists (from previous iteration)
    local playtest_report="$WORK_ORDER_DIR/$FEATURE_NAME/playtest-report.md"
    if [[ -f "$playtest_report" ]]; then
        context="$context

---

## Playtest Feedback (FIX THESE ISSUES)

$(cat "$playtest_report")"
        log "Including playtest feedback in context"
    fi

    run_agent "impl-agent" "$PROMPT_DIR/impl-agent.md" "$context"
}

run_test_agent_post() {
    header "PHASE 4: TEST AGENT (Post-Implementation)"

    local results_file="$WORK_ORDER_DIR/$FEATURE_NAME/test-results.md"

    local context="Feature: $FEATURE_NAME

Your task: Run the full test suite and verify all tests pass.

Commands to run:
cd custom_game_engine && npm run build && npm test

IMPORTANT: Write your results to: agents/autonomous-dev/work-orders/$FEATURE_NAME/test-results.md

The file MUST contain one of these verdicts on its own line:
- Verdict: PASS (all tests pass)
- Verdict: FAIL (tests failing)
- Verdict: TESTS_NEED_FIX (tests are broken/outdated, not implementation)"

    run_agent "test-agent-post" "$PROMPT_DIR/test-agent.md" "$context"
}

check_test_verdict() {
    local results_file="$WORK_ORDER_DIR/$FEATURE_NAME/test-results.md"
    if [[ ! -f "$results_file" ]]; then
        echo "NO_RESULTS"
        return
    fi

    if grep -q "Verdict.*PASS" "$results_file"; then
        echo "PASS"
    elif grep -q "Verdict.*TESTS_NEED_FIX" "$results_file"; then
        echo "TESTS_NEED_FIX"
    elif grep -q "Verdict.*FAIL" "$results_file"; then
        echo "FAIL"
    else
        echo "UNKNOWN"
    fi
}

run_test_maintenance_agent() {
    header "PHASE 4b: TEST MAINTENANCE"

    local results_file="$WORK_ORDER_DIR/$FEATURE_NAME/test-results.md"

    local context="Feature: $FEATURE_NAME

The tests are broken or outdated and need fixing.

Test Results:
$(cat "$results_file")

Your task: Fix the broken tests to match the current implementation.
Do NOT change the implementation - only fix the tests.

After fixing, write updated results to: agents/autonomous-dev/work-orders/$FEATURE_NAME/test-results.md
Use verdict: Verdict: PASS or Verdict: FAIL"

    run_agent "test-maintenance" "$PROMPT_DIR/test-agent.md" "$context"
}

run_playtest_agent() {
    header "PHASE 5: PLAYTEST AGENT"

    local work_order="$WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
    if [[ ! -f "$work_order" ]]; then
        error "Work order not found: $work_order"
        return 1
    fi

    # Create screenshots directory
    mkdir -p "$WORK_ORDER_DIR/$FEATURE_NAME/screenshots"

    local context="Work Order:

$(cat "$work_order")

---

Your task: Test this feature through the UI using Playwright MCP.
Save screenshots to: agents/autonomous-dev/work-orders/$FEATURE_NAME/screenshots/
Write report to: agents/autonomous-dev/work-orders/$FEATURE_NAME/playtest-report.md

REMEMBER: You cannot read code files. Only test via the browser."

    run_agent "playtest-agent" "$PROMPT_DIR/playtest-agent.md" "$context"
}

# =============================================================================
# State Management
# =============================================================================

get_feature_state() {
    local state_file="$WORK_ORDER_DIR/$FEATURE_NAME/.state"
    if [[ -f "$state_file" ]]; then
        cat "$state_file"
    else
        echo "NEW"
    fi
}

set_feature_state() {
    local state="$1"
    local state_dir="$WORK_ORDER_DIR/$FEATURE_NAME"
    local state_file="$state_dir/.state"
    mkdir -p "$state_dir"
    echo "$state" > "$state_file"
    log "State: $state"
}

check_playtest_verdict() {
    local report="$WORK_ORDER_DIR/$FEATURE_NAME/playtest-report.md"
    if [[ ! -f "$report" ]]; then
        echo "NO_REPORT"
        return
    fi

    if grep -q "Verdict.*APPROVED" "$report"; then
        echo "APPROVED"
    elif grep -q "Verdict.*NEEDS_WORK" "$report"; then
        echo "NEEDS_WORK"
    else
        echo "UNKNOWN"
    fi
}

# =============================================================================
# Main Pipeline
# =============================================================================

run_pipeline() {
    local impl_retries=0
    local playtest_retries=0

    ensure_dirs

    # Phase 1: Spec Agent
    local state=$(get_feature_state)
    if [[ "$state" == "NEW" ]] || [[ "$state" == "SPEC" ]]; then
        set_feature_state "SPEC"
        if ! run_spec_agent; then
            set_feature_state "BLOCKED"
            error "Spec Agent failed"
            return 1
        fi

        # Find the feature name from the work order if not specified
        if [[ -z "$FEATURE_NAME" ]]; then
            FEATURE_NAME=$(ls -t "$WORK_ORDER_DIR" | head -1)
            if [[ -z "$FEATURE_NAME" ]]; then
                error "No work order created"
                return 1
            fi
            log "Feature: $FEATURE_NAME"
        fi

        set_feature_state "TESTS_PRE"
    fi

    # Phase 2: Test Agent (Pre)
    state=$(get_feature_state)
    if [[ "$state" == "TESTS_PRE" ]]; then
        if ! run_test_agent_pre; then
            set_feature_state "BLOCKED"
            error "Test Agent (pre) failed"
            return 1
        fi
        set_feature_state "IMPL"
    fi

    # Implementation loop
    while true; do
        state=$(get_feature_state)

        # Phase 3: Implementation
        if [[ "$state" == "IMPL" ]]; then
            ((impl_retries++))
            if [[ $impl_retries -gt $MAX_IMPL_RETRIES ]]; then
                set_feature_state "BLOCKED"
                error "Max implementation retries ($MAX_IMPL_RETRIES) exceeded"
                return 1
            fi

            log "Implementation attempt $impl_retries/$MAX_IMPL_RETRIES"

            if ! run_impl_agent; then
                warn "Implementation failed, will retry..."
                continue
            fi
            set_feature_state "TESTS_POST"
        fi

        # Phase 4: Test Agent (Post)
        state=$(get_feature_state)
        if [[ "$state" == "TESTS_POST" ]]; then
            if ! run_test_agent_post; then
                warn "Test agent failed, returning to implementation..."
                set_feature_state "IMPL"
                continue
            fi

            # Check test verdict from results file
            test_verdict=$(check_test_verdict)
            log "Test verdict: $test_verdict"

            case "$test_verdict" in
                "PASS")
                    set_feature_state "PLAYTEST"
                    ;;
                "TESTS_NEED_FIX")
                    log "Tests need maintenance, not implementation..."
                    set_feature_state "TEST_MAINTENANCE"
                    ;;
                "FAIL"|"UNKNOWN"|"NO_RESULTS")
                    warn "Tests failed, returning to implementation..."
                    set_feature_state "IMPL"
                    continue
                    ;;
            esac
        fi

        # Phase 4b: Test Maintenance (fix broken tests)
        state=$(get_feature_state)
        if [[ "$state" == "TEST_MAINTENANCE" ]]; then
            if ! run_test_maintenance_agent; then
                warn "Test maintenance failed, returning to implementation..."
                set_feature_state "IMPL"
                continue
            fi

            # Re-check test verdict after maintenance
            test_verdict=$(check_test_verdict)
            log "Post-maintenance test verdict: $test_verdict"

            case "$test_verdict" in
                "PASS")
                    set_feature_state "PLAYTEST"
                    ;;
                *)
                    warn "Tests still failing after maintenance, returning to implementation..."
                    set_feature_state "IMPL"
                    continue
                    ;;
            esac
        fi

        # Phase 5: Playtest
        state=$(get_feature_state)
        if [[ "$state" == "PLAYTEST" ]]; then
            ((playtest_retries++))
            # No retry limit - keep iterating until APPROVED
            log "Playtest attempt $playtest_retries"

            if ! run_playtest_agent; then
                warn "Playtest agent failed, will retry..."
                continue
            fi

            # Check verdict
            verdict=$(check_playtest_verdict)
            log "Playtest verdict: $verdict"

            case "$verdict" in
                "APPROVED")
                    set_feature_state "READY_FOR_REVIEW"
                    break
                    ;;
                "NEEDS_WORK")
                    set_feature_state "IMPL"
                    impl_retries=0  # Reset impl retries for new round
                    continue
                    ;;
                *)
                    warn "Could not determine verdict, treating as NEEDS_WORK"
                    set_feature_state "IMPL"
                    continue
                    ;;
            esac
        fi

        # Check for completion
        state=$(get_feature_state)
        if [[ "$state" == "READY_FOR_REVIEW" ]]; then
            break
        fi
    done

    # Success!
    header "PIPELINE COMPLETE"
    success "Feature: $FEATURE_NAME"
    success "Status: READY FOR HUMAN REVIEW"
    echo ""
    echo "Review these files:"
    echo "  - Work Order: $WORK_ORDER_DIR/$FEATURE_NAME/work-order.md"
    echo "  - Playtest Report: $WORK_ORDER_DIR/$FEATURE_NAME/playtest-report.md"
    echo "  - Screenshots: $WORK_ORDER_DIR/$FEATURE_NAME/screenshots/"
    echo "  - Logs: $LOG_DIR/"
    echo ""
    echo "To approve:"
    echo "  $SCRIPT_DIR/approve-feature.sh $FEATURE_NAME"

    # Create ready marker
    cat > "$WORK_ORDER_DIR/$FEATURE_NAME/READY_FOR_REVIEW.md" << EOF
# Ready for Human Review

**Feature:** $FEATURE_NAME
**Completed:** $(date)
**Pipeline Runs:**
- Implementation attempts: $impl_retries
- Playtest attempts: $playtest_retries

## Files to Review

1. [Work Order](work-order.md)
2. [Playtest Report](playtest-report.md)
3. [Screenshots](screenshots/)

## Git Changes

Run \`git diff\` to see code changes.

## Approval

When satisfied, run:
\`\`\`bash
$SCRIPT_DIR/approve-feature.sh $FEATURE_NAME
\`\`\`
EOF

    return 0
}

# =============================================================================
# Argument Parsing
# =============================================================================

FEATURE_NAME=""
RESUME=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --feature)
            FEATURE_NAME="$2"
            shift 2
            ;;
        --resume)
            FEATURE_NAME="$2"
            RESUME=true
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --feature NAME   Process specific feature"
            echo "  --resume NAME    Resume feature from last state"
            echo "  --help           Show this help"
            echo ""
            echo "Environment:"
            echo "  MAX_IMPL_RETRIES      Max implementation attempts (default: 3)"
            echo "  (No playtest limit - keeps iterating until APPROVED)"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Main
# =============================================================================

header "AI VILLAGE AUTONOMOUS DEVELOPMENT"

log "Project: $PROJECT_ROOT"
log "Logs: $LOG_DIR"
log "Work Orders: $WORK_ORDER_DIR"

if [[ -n "$FEATURE_NAME" ]]; then
    log "Feature: $FEATURE_NAME"
    if [[ "$RESUME" == true ]]; then
        log "Mode: RESUME"
    else
        log "Mode: SPECIFIC"
    fi
    # Register with dashboard for tracking
    register_pid "$FEATURE_NAME"
else
    log "Mode: AUTO (next available)"
    # Register with dashboard (will update feature name once determined)
    register_pid "auto"
fi

echo ""

run_pipeline
