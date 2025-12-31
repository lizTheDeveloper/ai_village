#!/bin/bash
#
# Parallel Orchestrator - Massively parallel autonomous development
#
# This orchestrator runs multiple features through the pipeline simultaneously:
# - Batches playtests together (run 5 at once)
# - Test agent works on feature B while impl agent works on feature A
# - Maximum parallelization across the pipeline
#
# Usage:
#   ./parallel-orchestrator.sh           # Process all available features
#   ./parallel-orchestrator.sh --max N   # Run up to N features in parallel (default: 10)
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
WORKER_SCRIPT="$SCRIPT_DIR/workers/run-agent-worker.sh"

MAX_PARALLEL=10
BATCH_SIZE=5  # Run up to 5 playtests simultaneously

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --max)
            MAX_PARALLEL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} PARALLEL ORCHESTRATOR${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Max parallel features: $MAX_PARALLEL"
echo "Playtest batch size: $BATCH_SIZE"
echo ""

# Get all features and their states
get_features_by_state() {
    local target_state="$1"
    local features=()

    for dir in "$WORK_ORDER_DIR"/*; do
        if [[ -d "$dir" ]] && [[ "$(basename "$dir")" != "_archived" ]] && [[ "$(basename "$dir")" != "archive" ]]; then
            local feature=$(basename "$dir")
            local state_file="$dir/.state"
            local state="NEW"

            if [[ -f "$state_file" ]]; then
                state=$(cat "$state_file")
            fi

            if [[ "$state" == "$target_state" ]]; then
                features+=("$feature")
            fi
        fi
    done

    echo "${features[@]}"
}

# Run a phase for multiple features in parallel
batch_run_phase() {
    local phase="$1"
    shift
    local features=("$@")

    if [[ ${#features[@]} -eq 0 ]]; then
        return 0
    fi

    echo -e "${YELLOW}Running ${phase} for ${#features[@]} feature(s) in parallel...${NC}"

    local pids=()
    local feature_list=()

    # Start workers in parallel
    for feature in "${features[@]}"; do
        echo "  - $feature"
        bash "$WORKER_SCRIPT" "$phase" "$feature" &
        pids+=($!)
        feature_list+=("$feature")
    done

    # Wait for all to complete
    local success_count=0
    local fail_count=0

    for i in "${!pids[@]}"; do
        local pid=${pids[$i]}
        local feature=${feature_list[$i]}

        if wait $pid; then
            echo -e "${GREEN}✓${NC} $feature ($phase) succeeded"
            ((success_count++))
        else
            echo -e "✗ $feature ($phase) failed"
            ((fail_count++))
        fi
    done

    echo ""
    echo "Phase $phase: $success_count succeeded, $fail_count failed"
    echo ""
}

# Main orchestration loop
iteration=0
while true; do
    ((iteration++))
    echo -e "${BLUE}───────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE} Iteration $iteration${NC}"
    echo -e "${BLUE}───────────────────────────────────────────────────────────${NC}"
    echo ""

    # Count features at each stage
    spec_features=($(get_features_by_state "NEW"))
    spec_pending=($(get_features_by_state "SPEC"))
    test_pre_features=($(get_features_by_state "TESTS_PRE"))
    impl_features=($(get_features_by_state "IMPL"))
    test_post_features=($(get_features_by_state "TESTS_POST"))
    review_features=($(get_features_by_state "REVIEW"))
    playtest_features=($(get_features_by_state "PLAYTEST"))
    commit_features=($(get_features_by_state "COMMIT"))
    ready_features=($(get_features_by_state "READY_FOR_REVIEW"))

    # Show pipeline status
    echo "Pipeline Status:"
    echo "  NEW: ${#spec_features[@]}"
    echo "  SPEC: ${#spec_pending[@]}"
    echo "  TESTS_PRE: ${#test_pre_features[@]}"
    echo "  IMPL: ${#impl_features[@]}"
    echo "  TESTS_POST: ${#test_post_features[@]}"
    echo "  REVIEW: ${#review_features[@]}"
    echo "  PLAYTEST: ${#playtest_features[@]}"
    echo "  COMMIT: ${#commit_features[@]}"
    echo "  READY_FOR_REVIEW: ${#ready_features[@]}"
    echo ""

    # Check if any work to do
    total_work=$((${#spec_features[@]} + ${#spec_pending[@]} + ${#test_pre_features[@]} + ${#impl_features[@]} + ${#test_post_features[@]} + ${#review_features[@]} + ${#playtest_features[@]} + ${#commit_features[@]}))

    if [[ $total_work -eq 0 ]]; then
        echo -e "${GREEN}All features processed!${NC}"
        echo ""
        if [[ ${#ready_features[@]} -gt 0 ]]; then
            echo "Ready for human review:"
            for feature in "${ready_features[@]}"; do
                echo "  - $feature"
            done
        fi
        break
    fi

    # Run phases in parallel across features
    # Note: Each phase can run simultaneously on different features

    # Phase 1: Spec (limit to MAX_PARALLEL new features)
    if [[ ${#spec_features[@]} -gt 0 ]]; then
        batch_spec=("${spec_features[@]:0:$MAX_PARALLEL}")
        batch_run_phase "spec" "${batch_spec[@]}"
    fi

    # Phase 2: Test Pre (run all in parallel up to MAX_PARALLEL)
    if [[ ${#test_pre_features[@]} -gt 0 ]]; then
        batch_test_pre=("${test_pre_features[@]:0:$MAX_PARALLEL}")
        batch_run_phase "test-pre" "${batch_test_pre[@]}"
    fi

    # Phase 3: Implementation (run all in parallel up to MAX_PARALLEL)
    if [[ ${#impl_features[@]} -gt 0 ]]; then
        batch_impl=("${impl_features[@]:0:$MAX_PARALLEL}")
        batch_run_phase "impl" "${batch_impl[@]}"
    fi

    # Phase 4: Test Post (run all in parallel up to MAX_PARALLEL)
    if [[ ${#test_post_features[@]} -gt 0 ]]; then
        batch_test_post=("${test_post_features[@]:0:$MAX_PARALLEL}")
        batch_run_phase "test-post" "${batch_test_post[@]}"
    fi

    # Phase 5: Review (run all in parallel up to MAX_PARALLEL)
    if [[ ${#review_features[@]} -gt 0 ]]; then
        batch_review=("${review_features[@]:0:$MAX_PARALLEL}")
        batch_run_phase "review" "${batch_review[@]}"
    fi

    # Phase 6: Playtest (BATCH MULTIPLE TOGETHER)
    if [[ ${#playtest_features[@]} -gt 0 ]]; then
        # Run playtests in batches
        batch_playtest=("${playtest_features[@]:0:$BATCH_SIZE}")
        echo -e "${YELLOW}═══ BATCHED PLAYTESTS (${#batch_playtest[@]} features) ═══${NC}"
        batch_run_phase "playtest" "${batch_playtest[@]}"
    fi

    # Phase 7: Commit (run all in parallel up to MAX_PARALLEL)
    if [[ ${#commit_features[@]} -gt 0 ]]; then
        batch_commit=("${commit_features[@]:0:$MAX_PARALLEL}")
        batch_run_phase "commit" "${batch_commit[@]}"
    fi

    # Sleep briefly before next iteration
    sleep 2
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} PARALLEL ORCHESTRATOR COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
