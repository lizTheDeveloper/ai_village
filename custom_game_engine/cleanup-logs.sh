#!/bin/bash
# Cleanup old dev server log files
# Run this at the end of the day or whenever you want to clean up

LOG_DIR="/Users/annhoward/src/ai_village/custom_game_engine/logs"

echo "Cleaning up log files older than 1 day in $LOG_DIR..."

# Delete log files older than 1 day
find "$LOG_DIR" -name "dev-server-*.log" -type f -mtime +1 -delete

# Show remaining logs
echo "Remaining log files:"
ls -lh "$LOG_DIR" 2>/dev/null || echo "No log files found"

echo "Done!"
