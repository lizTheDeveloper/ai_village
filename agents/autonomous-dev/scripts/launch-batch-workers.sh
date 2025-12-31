#!/bin/bash
#
# Launch all batch workers in parallel
#
# This starts the continuous batch processing pipeline:
# - Batch Test Writer (writes tests for 5 features at a time)
# - Batch Implementer (implements 3 features at a time)
# - Batch Playtester (playtests 5 features at a time)
# - Batch Reviewer (reviews 5 features at a time)
# - Batch Committer (commits 5 features at a time)
#
# Each worker runs independently and continuously processes features in its stage.
#
# Usage: ./launch-batch-workers.sh [--test-batch N] [--impl-batch N] [--playtest-batch N]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$SCRIPT_DIR/workers"
LOG_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/../../logs"

# Default batch sizes
TEST_BATCH=5
IMPL_BATCH=3
PLAYTEST_BATCH=5
REVIEW_BATCH=5
COMMIT_BATCH=5

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --test-batch)
            TEST_BATCH="$2"
            shift 2
            ;;
        --impl-batch)
            IMPL_BATCH="$2"
            shift 2
            ;;
        --playtest-batch)
            PLAYTEST_BATCH="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo "════════════════════════════════════════════════════════════"
echo " LAUNCHING BATCH WORKERS"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Batch sizes:"
echo "  Test Writer: $TEST_BATCH features per batch"
echo "  Implementer: $IMPL_BATCH features per batch"
echo "  Playtester: $PLAYTEST_BATCH features per batch"
echo "  Reviewer: $REVIEW_BATCH features per batch"
echo "  Committer: $COMMIT_BATCH features per batch"
echo ""
echo "Workers will run continuously. Press Ctrl+C to stop all."
echo ""

mkdir -p "$LOG_DIR"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all batch workers..."
    kill $(jobs -p) 2>/dev/null || true
    wait
    echo "All workers stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Launch batch workers in background
echo "[$(date +%H:%M:%S)] Launching Batch Test Writer..."
bash "$WORKER_DIR/batch-test-writer.sh" --batch-size "$TEST_BATCH" > "$LOG_DIR/batch-test-writer.log" 2>&1 &
TEST_PID=$!

echo "[$(date +%H:%M:%S)] Launching Batch Implementer..."
bash "$WORKER_DIR/batch-implementer.sh" --batch-size "$IMPL_BATCH" > "$LOG_DIR/batch-implementer.log" 2>&1 &
IMPL_PID=$!

echo "[$(date +%H:%M:%S)] Launching Batch Playtester..."
bash "$WORKER_DIR/batch-playtester.sh" --batch-size "$PLAYTEST_BATCH" > "$LOG_DIR/batch-playtester.log" 2>&1 &
PLAYTEST_PID=$!

# TODO: Add batch-reviewer.sh and batch-committer.sh when ready

echo ""
echo "Workers launched:"
echo "  Test Writer: PID $TEST_PID (log: logs/batch-test-writer.log)"
echo "  Implementer: PID $IMPL_PID (log: logs/batch-implementer.log)"
echo "  Playtester: PID $PLAYTEST_PID (log: logs/batch-playtester.log)"
echo ""
echo "Monitor logs with:"
echo "  tail -f logs/batch-*.log"
echo ""
echo "Waiting for workers... (Ctrl+C to stop)"

# Wait for all workers
wait
