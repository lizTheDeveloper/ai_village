#!/bin/bash
#
# Batch CLI - Manually batch features for processing
#
# Usage:
#   ./batch-cli.sh queue test feature-a feature-b feature-c
#   ./batch-cli.sh trigger test --size 5
#   ./batch-cli.sh status
#   ./batch-cli.sh clear test
#

DASHBOARD_URL="http://localhost:3030"

case "$1" in
    queue)
        # Queue features for a phase
        phase="$2"
        shift 2
        features="$@"

        # Convert features to JSON array
        feature_array=$(printf '%s\n' "${features[@]}" | jq -R . | jq -s .)

        curl -s -X POST "$DASHBOARD_URL/api/batch/queue/$phase" \
            -H "Content-Type: application/json" \
            -d "{\"features\": $feature_array}" | jq .
        ;;

    trigger)
        # Trigger batch processing
        phase="$2"
        size="${4:-5}"  # Default batch size 5

        curl -s -X POST "$DASHBOARD_URL/api/batch/trigger/$phase" \
            -H "Content-Type: application/json" \
            -d "{\"batchSize\": $size}" | jq .
        ;;

    status)
        # Show queue status
        curl -s "$DASHBOARD_URL/api/batch/queue" | jq .
        ;;

    clear)
        # Clear a queue
        phase="${2:-all}"
        curl -s -X DELETE "$DASHBOARD_URL/api/batch/queue/$phase" | jq .
        ;;

    *)
        echo "Batch CLI - Manual batch processing"
        echo ""
        echo "Usage:"
        echo "  $0 queue <phase> <feature1> <feature2> ...   - Add features to batch queue"
        echo "  $0 trigger <phase> [--size N]                - Trigger batch processing"
        echo "  $0 status                                     - Show queue status"
        echo "  $0 clear [phase|all]                          - Clear queue(s)"
        echo ""
        echo "Phases: spec, test, impl, playtest, commit"
        echo ""
        echo "Examples:"
        echo "  # Queue 3 features for testing"
        echo "  $0 queue test item-stacking resource-nodes crafting-queue"
        echo ""
        echo "  # Trigger batch test writing (5 features at once)"
        echo "  $0 trigger test --size 5"
        echo ""
        echo "  # Check queue status"
        echo "  $0 status"
        echo ""
        echo "  # Clear playtest queue"
        echo "  $0 clear playtest"
        exit 1
        ;;
esac
