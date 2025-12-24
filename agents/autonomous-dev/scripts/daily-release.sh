#!/bin/bash
#
# AI Village Daily Release Orchestrator
#
# This script runs once per day to:
# 1. Update wiki documentation
# 2. Validate and release daily build (if changes exist)
#
# Usage:
#   ./daily-release.sh
#
# Schedule with cron:
#   0 2 * * * /path/to/daily-release.sh
#

set -e

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"

LOG_DIR="$PROJECT_ROOT/logs"
PROMPT_DIR="$AGENT_DIR/prompts"
RELEASE_LOG="$LOG_DIR/daily-release-$(date +%Y%m%d).log"

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

log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$RELEASE_LOG"
}

success() {
    echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $1" | tee -a "$RELEASE_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC} $1" | tee -a "$RELEASE_LOG"
}

error() {
    echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $1" | tee -a "$RELEASE_LOG"
}

header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}" | tee -a "$RELEASE_LOG"
    echo -e "${CYAN} $1${NC}" | tee -a "$RELEASE_LOG"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n" | tee -a "$RELEASE_LOG"
}

timestamp() {
    date +%Y%m%d_%H%M%S
}

# =============================================================================
# Agent Runner
# =============================================================================

run_agent() {
    local agent_name="$1"
    local prompt_file="$2"
    local extra_context="$3"
    local log_file="$LOG_DIR/$(timestamp)-${agent_name}.log"

    log "Running ${agent_name}..."
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

$extra_context"
    fi

    # Run Claude with the prompt
    cd "$PROJECT_ROOT/custom_game_engine" || exit 1

    if ! echo "$prompt" | claude-code --prompt - > "$log_file" 2>&1; then
        error "${agent_name} failed!"
        cat "$log_file"
        return 1
    fi

    success "${agent_name} completed"
    return 0
}

# =============================================================================
# Wiki Documentation Agent
# =============================================================================

run_wiki_agent() {
    header "PHASE 1: WIKI DOCUMENTATION"

    local context="Your task: Update the game wiki documentation.

Documentation directory: docs/wiki/
Review recent commits to find what changed:
\`\`\`bash
git log --since='24 hours ago' --oneline
\`\`\`

Focus on documenting new features, updated mechanics, and changed systems.
Create new wiki pages as needed following the structure in the prompt."

    run_agent "wiki-agent" "$PROMPT_DIR/wiki-agent.md" "$context"
}

# =============================================================================
# Release Agent
# =============================================================================

run_release_agent() {
    header "PHASE 2: DAILY RELEASE"

    # Check if there are changes since last release
    local last_release
    last_release=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

    local commit_count
    commit_count=$(git rev-list "$last_release..HEAD" --count)

    if [[ "$commit_count" -eq 0 ]]; then
        log "No commits since last release ($last_release)"
        log "Skipping release creation"

        # Update release notes with no-release entry
        echo "## $(date +%Y-%m-%d) - No Release" >> RELEASE_NOTES.md
        echo "No changes since $last_release" >> RELEASE_NOTES.md
        echo "" >> RELEASE_NOTES.md

        return 0
    fi

    log "Found $commit_count commits since $last_release"

    local context="Your task: Create a daily release.

Last release: $last_release
Commits since then: $commit_count

Steps:
1. Validate build and tests (5 min)
2. Extended playtest (15 min minimum)
3. Generate release notes
4. Create git tag and release

IMPORTANT: Only create release if playtest passes!
Use sleep commands for real-time validation.
Monitor browser console for errors every 30 seconds during playtest.

Current date: $(date +%Y-%m-%d)
Current time: $(date +%H:%M:%S)"

    run_agent "release-agent" "$PROMPT_DIR/release-agent.md" "$context"
}

# =============================================================================
# Main Pipeline
# =============================================================================

main() {
    header "AI VILLAGE DAILY RELEASE"
    log "Starting daily release process at $(date)"

    # Ensure log directory exists
    mkdir -p "$LOG_DIR"

    # Navigate to project root
    cd "$PROJECT_ROOT/custom_game_engine" || exit 1

    # Phase 1: Update Wiki Documentation
    if ! run_wiki_agent; then
        error "Wiki agent failed, but continuing to release check..."
        # Don't exit - wiki failure shouldn't block releases
    fi

    # Phase 2: Validate and Release
    if ! run_release_agent; then
        error "Release agent failed!"

        # Create failure notification
        cat > "$PROJECT_ROOT/bugs/failed-daily-release-$(date +%Y%m%d).md" << EOF
# Failed Daily Release - $(date +%Y-%m-%d)

The daily release process failed.

## Timestamp
$(date)

## Log File
\`$RELEASE_LOG\`

## Error
See log file for details.

## Next Steps
1. Review the log file
2. Fix any build, test, or playtest failures
3. Can manually retry with: \`./scripts/daily-release.sh\`
EOF

        exit 1
    fi

    # Success!
    header "DAILY RELEASE COMPLETE"
    success "Wiki updated and release validated"

    # Check if a release was created
    if git describe --tags --exact-match HEAD 2>/dev/null; then
        success "Release created: $(git describe --tags)"
    else
        log "No release created (no changes or playtest failed)"
    fi

    log "Full log: $RELEASE_LOG"
}

# Run the pipeline
main "$@"
