#!/bin/bash
# Script to update all remaining TypeScript files to load from JSON
# This script will be reviewed and executed carefully

set -e  # Exit on error

echo "Starting JSON migration for remaining 13 files..."
echo "================================================"
echo ""

# Track statistics
FILES_UPDATED=0
TOTAL_LINES_BEFORE=0
TOTAL_LINES_AFTER=0

# Function to count lines and update stats
update_stats() {
    local file=$1
    local before=$(wc -l < "$file" 2>/dev/null || echo "0")
    echo "  Before: $before lines"
    TOTAL_LINES_BEFORE=$((TOTAL_LINES_BEFORE + before))
}

complete_file() {
    local file=$1
    local after=$(wc -l < "$file")
    echo "  After: $after lines"
    echo "  Removed: $((TOTAL_LINES_BEFORE - TOTAL_LINES_AFTER)) lines (from this file: $((before - after)))"
    TOTAL_LINES_AFTER=$((TOTAL_LINES_AFTER + after))
    FILES_UPDATED=$((FILES_UPDATED + 1))
    echo "  ✓ Complete"
    echo ""
}

echo "Summary:"
echo "Files updated: $FILES_UPDATED / 13"
echo "Total lines removed: $((TOTAL_LINES_BEFORE - TOTAL_LINES_AFTER))"
echo ""
echo "Next step: Run 'cd custom_game_engine && npm run build' to verify"
