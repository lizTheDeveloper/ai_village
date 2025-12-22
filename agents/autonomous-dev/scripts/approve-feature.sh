#!/bin/bash
#
# Approve a completed feature and prepare for merge
#
# Usage:
#   ./approve-feature.sh FEATURE_NAME
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$AGENT_DIR")")"
WORK_ORDER_DIR="$AGENT_DIR/work-orders"
ARCHIVE_DIR="$WORK_ORDER_DIR/archive"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [[ -z "$1" ]]; then
    echo -e "${RED}Error: Feature name required${NC}"
    echo "Usage: $0 FEATURE_NAME"
    exit 1
fi

FEATURE_NAME="$1"
FEATURE_DIR="$WORK_ORDER_DIR/$FEATURE_NAME"

if [[ ! -d "$FEATURE_DIR" ]]; then
    echo -e "${RED}Error: Feature directory not found: $FEATURE_DIR${NC}"
    exit 1
fi

if [[ ! -f "$FEATURE_DIR/READY_FOR_REVIEW.md" ]]; then
    echo -e "${YELLOW}Warning: Feature not marked as ready for review${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Approving feature: $FEATURE_NAME${NC}"
echo ""

# Update MASTER_ROADMAP.md
echo "Updating MASTER_ROADMAP.md..."
# This would need more sophisticated parsing in practice
# For now, just note that it should be done

# Archive work order
echo "Archiving work order..."
mkdir -p "$ARCHIVE_DIR"
ARCHIVE_NAME="${FEATURE_NAME}_$(date +%Y%m%d)"
mv "$FEATURE_DIR" "$ARCHIVE_DIR/$ARCHIVE_NAME"

echo ""
echo -e "${GREEN}✓ Feature approved and archived${NC}"
echo ""
echo "Archived to: $ARCHIVE_DIR/$ARCHIVE_NAME"
echo ""
echo "Next steps:"
echo "  1. Update MASTER_ROADMAP.md (change 🚧 to ✅)"
echo "  2. Review git diff"
echo "  3. Create commit"
echo "  4. Push or create PR"
