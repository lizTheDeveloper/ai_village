#!/bin/bash

# Bug Queue Processor
# Autonomously processes bugs from the queue by launching fix pipelines

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DASHBOARD_URL="http://localhost:3030"

echo "==================================="
echo "Bug Queue Processor Starting"
echo "==================================="
echo "Dashboard API: $DASHBOARD_URL"
echo "Project Root: $PROJECT_ROOT"
echo ""

# Function to get the next bug from the queue
get_next_bug() {
    curl -s "$DASHBOARD_URL/api/bugs/next" 2>/dev/null
}

# Function to assign bug to autonomous agent
assign_bug() {
    local bug_id=$1
    curl -s -X PATCH "$DASHBOARD_URL/api/bugs/$bug_id/assign" \
        -H "Content-Type: application/json" \
        -d '{"assignee":"autonomous-agent"}' \
        >/dev/null 2>&1
}

# Function to update bug status
update_bug_status() {
    local bug_id=$1
    local status=$2
    curl -s -X PATCH "$DASHBOARD_URL/api/bugs/$bug_id/status" \
        -H "Content-Type: application/json" \
        -d "{\"status\":\"$status\"}" \
        >/dev/null 2>&1
}

# Function to link bug to pipeline
link_bug_to_pipeline() {
    local bug_id=$1
    local pipeline_id=$2
    curl -s -X POST "$DASHBOARD_URL/api/bugs/$bug_id/link-pipeline" \
        -H "Content-Type: application/json" \
        -d "{\"pipelineId\":\"$pipeline_id\"}" \
        >/dev/null 2>&1
}

# Main processing loop
process_queue() {
    while true; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Checking bug queue..."

        # Get next bug
        bug_json=$(get_next_bug)

        if echo "$bug_json" | grep -q "error"; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') - No bugs in queue, waiting 30 seconds..."
            sleep 30
            continue
        fi

        # Parse bug details
        bug_id=$(echo "$bug_json" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        bug_title=$(echo "$bug_json" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
        bug_priority=$(echo "$bug_json" | grep -o '"priority":"[^"]*"' | cut -d'"' -f4)

        if [ -z "$bug_id" ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Failed to parse bug, waiting 30 seconds..."
            sleep 30
            continue
        fi

        echo ""
        echo "==================================="
        echo "Processing Bug: $bug_title"
        echo "ID: $bug_id"
        echo "Priority: $bug_priority"
        echo "==================================="
        echo ""

        # Assign bug to autonomous agent
        echo "Assigning bug to autonomous agent..."
        assign_bug "$bug_id"

        # Update status to IN_PROGRESS
        echo "Updating status to IN_PROGRESS..."
        update_bug_status "$bug_id" "IN_PROGRESS"

        # Create a fix feature name from bug ID
        fix_feature="bugfix-$(echo $bug_id | cut -d'-' -f2-)"

        # Launch fix pipeline
        echo "Launching fix pipeline for: $fix_feature"

        # Call orchestrator with the fix feature
        cd "$PROJECT_ROOT"
        "$SCRIPT_DIR/orchestrator.sh" --feature "$fix_feature" &
        pipeline_pid=$!
        pipeline_id="pipeline-$fix_feature-$pipeline_pid"

        echo "Pipeline launched: $pipeline_id (PID: $pipeline_pid)"

        # Link bug to pipeline
        echo "Linking bug to pipeline..."
        link_bug_to_pipeline "$bug_id" "$pipeline_id"

        # Wait for pipeline to complete
        echo "Waiting for pipeline to complete..."
        wait $pipeline_pid
        exit_code=$?

        echo ""
        echo "Pipeline completed with exit code: $exit_code"

        # Update bug status based on pipeline result
        if [ $exit_code -eq 0 ]; then
            echo "Pipeline succeeded - updating bug status to READY_FOR_TEST"
            update_bug_status "$bug_id" "READY_FOR_TEST"
        else
            echo "Pipeline failed - keeping bug in IN_PROGRESS"
            # Could optionally unassign or create a note
        fi

        echo ""
        echo "==================================="
        echo "Bug processing complete"
        echo "==================================="
        echo ""

        # Small delay before processing next bug
        sleep 5
    done
}

# Handle interrupts
trap 'echo ""; echo "Bug queue processor stopped"; exit 0' INT TERM

# Start processing
process_queue
