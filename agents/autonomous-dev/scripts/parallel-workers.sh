#!/bin/bash
#
# Parallel Worker Manager for AI Village Autonomous Development
#
# Maintains N parallel orchestrator workers running at all times.
# Each worker gets its own git worktree for isolation.
# When one finishes, automatically starts another.
#
# Usage:
#   ./parallel-workers.sh              # Run with 3 workers (default)
#   ./parallel-workers.sh -n 5         # Run with 5 workers
#   ./parallel-workers.sh --features f1,f2,f3  # Process specific features
#

set -e

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"

# Default number of parallel workers
NUM_WORKERS=3

# Directory for worker worktrees
WORKTREE_BASE="$PROJECT_ROOT/.worktrees"

# Directory for tracking worker state
WORKER_STATE_DIR="$AGENT_DIR/dashboard/.workers"
WORKER_LOG_DIR="$PROJECT_ROOT/logs/workers"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# =============================================================================
# Helpers
# =============================================================================

log() { echo -e "${BLUE}[$(date +%H:%M:%S)] [MANAGER]${NC} $1"; }
success() { echo -e "${GREEN}[$(date +%H:%M:%S)] [MANAGER] ✓${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] [MANAGER] ⚠${NC} $1"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] [MANAGER] ✗${NC} $1"; }
header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"
}

worker_log() {
    local worker_id=$1
    local msg=$2
    local colors=("$RED" "$GREEN" "$YELLOW" "$BLUE" "$MAGENTA" "$CYAN")
    local color="${colors[$((worker_id % ${#colors[@]}))]}"
    echo -e "${color}[$(date +%H:%M:%S)] [WORKER-$worker_id]${NC} $msg"
}

# =============================================================================
# Worker Management
# =============================================================================

declare -A WORKER_PIDS
declare -A WORKER_FEATURES
declare -A WORKER_BRANCHES
declare -A WORKER_WORKTREES
declare -a FEATURE_QUEUE

# Initialize directories
init_dirs() {
    mkdir -p "$WORKER_STATE_DIR"
    mkdir -p "$WORKER_LOG_DIR"
    mkdir -p "$WORKTREE_BASE"
    # Clean up stale state files
    rm -f "$WORKER_STATE_DIR"/*.pid 2>/dev/null || true
}

# Get next available feature from MASTER_ROADMAP
get_next_feature() {
    local roadmap="$PROJECT_ROOT/MASTER_ROADMAP.md"

    # Get list of already-claimed features (from work-orders with .state files showing in-progress)
    local claimed=""
    for state_file in "$AGENT_DIR/work-orders"/*/.state 2>/dev/null; do
        if [[ -f "$state_file" ]]; then
            local state=$(cat "$state_file")
            if [[ "$state" != "READY_FOR_REVIEW" && "$state" != "APPROVED" ]]; then
                local feature=$(basename "$(dirname "$state_file")")
                claimed="$claimed $feature"
            fi
        fi
    done

    # Also exclude features workers are currently processing
    for pid in "${!WORKER_FEATURES[@]}"; do
        if [[ -n "${WORKER_FEATURES[$pid]}" && "${WORKER_FEATURES[$pid]}" != "auto" ]]; then
            claimed="$claimed ${WORKER_FEATURES[$pid]}"
        fi
    done

    # If queue has items, use those
    if [[ ${#FEATURE_QUEUE[@]} -gt 0 ]]; then
        local next="${FEATURE_QUEUE[0]}"
        FEATURE_QUEUE=("${FEATURE_QUEUE[@]:1}")
        echo "$next"
        return
    fi

    # Otherwise return empty - orchestrator will use auto mode
    echo ""
}

# Generate branch name from feature
generate_branch_name() {
    local feature="$1"
    local worker_id="$2"
    local timestamp=$(date +%Y%m%d-%H%M%S)

    if [[ -n "$feature" ]]; then
        # Sanitize feature name for branch
        local sanitized=$(echo "$feature" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
        echo "feature/${sanitized}"
    else
        echo "feature/worker${worker_id}-auto-${timestamp}"
    fi
}

# Setup git worktree for a worker
setup_worktree() {
    local worker_id=$1
    local branch=$2
    local worktree_path="$WORKTREE_BASE/worker-$worker_id"

    cd "$PROJECT_ROOT"

    # Remove existing worktree if present
    if [[ -d "$worktree_path" ]]; then
        worker_log "$worker_id" "Cleaning up existing worktree..."
        git worktree remove --force "$worktree_path" 2>/dev/null || rm -rf "$worktree_path"
    fi

    # Get base branch
    local base_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

    # Delete branch if it exists (we'll recreate it fresh)
    git branch -D "$branch" 2>/dev/null || true

    # Create new worktree with new branch
    worker_log "$worker_id" "Creating worktree at $worktree_path..."
    if git worktree add -b "$branch" "$worktree_path" "origin/$base_branch" 2>/dev/null || \
       git worktree add -b "$branch" "$worktree_path" "$base_branch" 2>/dev/null; then
        worker_log "$worker_id" "Worktree created successfully"
        echo "$worktree_path"
        return 0
    else
        error "Failed to create worktree for worker $worker_id"
        return 1
    fi
}

# Cleanup worktree for a worker
cleanup_worktree() {
    local worker_id=$1
    local worktree_path="$WORKTREE_BASE/worker-$worker_id"
    local branch="${WORKER_BRANCHES[$worker_id]:-}"

    cd "$PROJECT_ROOT"

    if [[ -d "$worktree_path" ]]; then
        worker_log "$worker_id" "Removing worktree..."
        git worktree remove --force "$worktree_path" 2>/dev/null || rm -rf "$worktree_path"
    fi
}

# Start a new worker
start_worker() {
    local worker_id=$1
    local feature="${2:-}"

    local branch=$(generate_branch_name "$feature" "$worker_id")
    local log_file="$WORKER_LOG_DIR/worker-${worker_id}-$(date +%Y%m%d-%H%M%S).log"

    worker_log "$worker_id" "Starting worker..."
    worker_log "$worker_id" "Branch: $branch"
    worker_log "$worker_id" "Feature: ${feature:-auto}"

    # Setup worktree
    local worktree_path
    worktree_path=$(setup_worktree "$worker_id" "$branch")
    if [[ $? -ne 0 || -z "$worktree_path" ]]; then
        error "Failed to setup worktree for worker $worker_id"
        return 1
    fi

    worker_log "$worker_id" "Worktree: $worktree_path"
    worker_log "$worker_id" "Log: $log_file"

    # Build orchestrator command - run from worktree
    local cmd="$worktree_path/agents/autonomous-dev/scripts/orchestrator.sh"
    if [[ -n "$feature" ]]; then
        cmd="$cmd --feature $feature"
    fi

    # Run orchestrator in background from worktree directory
    (
        cd "$worktree_path"
        exec $cmd
    ) > "$log_file" 2>&1 &

    local pid=$!

    # Track this worker
    WORKER_PIDS[$worker_id]=$pid
    WORKER_FEATURES[$worker_id]="${feature:-auto}"
    WORKER_BRANCHES[$worker_id]="$branch"
    WORKER_WORKTREES[$worker_id]="$worktree_path"

    # Write state file
    echo "$pid" > "$WORKER_STATE_DIR/worker-${worker_id}.pid"
    echo "$branch" > "$WORKER_STATE_DIR/worker-${worker_id}.branch"
    echo "${feature:-auto}" > "$WORKER_STATE_DIR/worker-${worker_id}.feature"
    echo "$worktree_path" > "$WORKER_STATE_DIR/worker-${worker_id}.worktree"

    worker_log "$worker_id" "Started with PID $pid"
}

# Check if a worker is still running
is_worker_running() {
    local worker_id=$1
    local pid="${WORKER_PIDS[$worker_id]:-}"

    if [[ -z "$pid" ]]; then
        return 1
    fi

    if kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Handle worker completion
handle_worker_complete() {
    local worker_id=$1
    local pid="${WORKER_PIDS[$worker_id]}"
    local feature="${WORKER_FEATURES[$worker_id]}"
    local branch="${WORKER_BRANCHES[$worker_id]}"
    local worktree="${WORKER_WORKTREES[$worker_id]}"

    # Get exit status
    wait "$pid" 2>/dev/null
    local exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        success "Worker $worker_id completed successfully"
        success "  Feature: $feature"
        success "  Branch: $branch"
        success "  Ready for review/merge!"
    else
        warn "Worker $worker_id exited with code $exit_code (feature: $feature)"
    fi

    # Keep worktree around so changes can be reviewed/merged
    # User can clean up manually or we can add a cleanup command
    worker_log "$worker_id" "Worktree preserved at: $worktree"
    worker_log "$worker_id" "Branch: $branch"

    # Clean up tracking
    unset WORKER_PIDS[$worker_id]
    unset WORKER_FEATURES[$worker_id]
    unset WORKER_BRANCHES[$worker_id]
    unset WORKER_WORKTREES[$worker_id]
    rm -f "$WORKER_STATE_DIR/worker-${worker_id}.pid"
}

# Main monitoring loop
monitor_workers() {
    log "Starting monitoring loop..."
    log "Target workers: $NUM_WORKERS"

    while true; do
        # Check each worker slot
        for ((i=1; i<=NUM_WORKERS; i++)); do
            if ! is_worker_running "$i"; then
                # Worker slot is empty or completed
                if [[ -n "${WORKER_PIDS[$i]:-}" ]]; then
                    # Was running, now complete
                    handle_worker_complete "$i"
                fi

                # Start a new worker in this slot
                local next_feature=$(get_next_feature)
                start_worker "$i" "$next_feature"

                # Small delay between starting workers
                sleep 5
            fi
        done

        # Status report
        local running=0
        for ((i=1; i<=NUM_WORKERS; i++)); do
            if is_worker_running "$i"; then
                ((running++))
            fi
        done

        log "Workers running: $running / $NUM_WORKERS"

        # Print active workers
        for ((i=1; i<=NUM_WORKERS; i++)); do
            if is_worker_running "$i"; then
                worker_log "$i" "Active - Feature: ${WORKER_FEATURES[$i]:-unknown}, Branch: ${WORKER_BRANCHES[$i]:-unknown}"
            fi
        done

        # Sleep before next check
        sleep 60
    done
}

# Show status
show_status() {
    header "WORKER STATUS"

    for ((i=1; i<=10; i++)); do  # Check up to 10 potential workers
        local pid_file="$WORKER_STATE_DIR/worker-${i}.pid"
        local branch_file="$WORKER_STATE_DIR/worker-${i}.branch"
        local feature_file="$WORKER_STATE_DIR/worker-${i}.feature"
        local worktree_file="$WORKER_STATE_DIR/worker-${i}.worktree"

        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            local branch=$(cat "$branch_file" 2>/dev/null || echo "unknown")
            local feature=$(cat "$feature_file" 2>/dev/null || echo "unknown")
            local worktree=$(cat "$worktree_file" 2>/dev/null || echo "unknown")

            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}Worker $i:${NC} Running (PID: $pid)"
            else
                echo -e "${YELLOW}Worker $i:${NC} Stopped (stale PID: $pid)"
            fi
            echo "  Branch: $branch"
            echo "  Feature: $feature"
            echo "  Worktree: $worktree"
            echo ""
        fi
    done

    # List worktrees
    echo -e "${CYAN}Git Worktrees:${NC}"
    cd "$PROJECT_ROOT"
    git worktree list
}

# Cleanup completed worktrees
cleanup_worktrees() {
    header "CLEANING UP WORKTREES"

    cd "$PROJECT_ROOT"

    # List and remove worktrees
    for worktree in "$WORKTREE_BASE"/worker-*; do
        if [[ -d "$worktree" ]]; then
            local name=$(basename "$worktree")
            log "Removing $name..."
            git worktree remove --force "$worktree" 2>/dev/null || rm -rf "$worktree"
        fi
    done

    # Prune worktree references
    git worktree prune

    success "Cleanup complete"
}

# Cleanup on exit
cleanup() {
    warn "Shutting down parallel workers..."

    for worker_id in "${!WORKER_PIDS[@]}"; do
        local pid="${WORKER_PIDS[$worker_id]}"
        if kill -0 "$pid" 2>/dev/null; then
            warn "Stopping worker $worker_id (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
        fi
    done

    # Clean up state files
    rm -f "$WORKER_STATE_DIR"/*.pid 2>/dev/null || true

    log "Workers stopped. Worktrees preserved for review."
    log "Run '$0 --cleanup' to remove worktrees"
    exit 0
}

# =============================================================================
# Argument Parsing
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--num-workers)
            NUM_WORKERS="$2"
            shift 2
            ;;
        --features)
            IFS=',' read -ra FEATURE_QUEUE <<< "$2"
            shift 2
            ;;
        --status)
            show_status
            exit 0
            ;;
        --cleanup)
            cleanup_worktrees
            exit 0
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -n, --num-workers N    Number of parallel workers (default: 3)"
            echo "  --features f1,f2,...   Comma-separated list of features to process"
            echo "  --status               Show current worker status"
            echo "  --cleanup              Remove all worker worktrees"
            echo "  --help                 Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                     # Run 3 workers in auto mode"
            echo "  $0 -n 5                # Run 5 workers in auto mode"
            echo "  $0 --features soil-system,farming-ui,crop-growth"
            echo "  $0 --status            # Check worker status"
            echo "  $0 --cleanup           # Clean up worktrees after review"
            echo ""
            echo "Each worker gets its own git worktree for isolation."
            echo "Completed worktrees are preserved for review/merging."
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

trap cleanup SIGINT SIGTERM

header "PARALLEL WORKER MANAGER"

log "Project: $PROJECT_ROOT"
log "Workers: $NUM_WORKERS"
log "Worktree base: $WORKTREE_BASE"
log "State dir: $WORKER_STATE_DIR"
log "Log dir: $WORKER_LOG_DIR"

if [[ ${#FEATURE_QUEUE[@]} -gt 0 ]]; then
    log "Feature queue: ${FEATURE_QUEUE[*]}"
fi

init_dirs

# Start initial workers
header "STARTING WORKERS"

for ((i=1; i<=NUM_WORKERS; i++)); do
    next_feature=$(get_next_feature)
    start_worker "$i" "$next_feature"
    sleep 5  # Stagger startup
done

# Enter monitoring loop
monitor_workers
