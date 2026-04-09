#!/usr/bin/env bash
# Mandatory verification gate for MVEE ticket closures.
# Agents MUST run this script before marking any ticket as done.
#
# Usage: bash scripts/verify-before-done.sh [--skip-browser]
#
# Exit codes:
#   0 = all gates passed
#   1 = one or more gates failed — do NOT mark ticket as done
#
# Policy: MUL-4531

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SKIP_BROWSER=false
if [[ "${1:-}" == "--skip-browser" ]]; then
  SKIP_BROWSER=true
fi

FAILURES=0

echo "============================================"
echo " MVEE Ticket Closure Verification Gate"
echo "============================================"
echo ""

# --- Gate 1: TypeScript Build ---
echo -n "Gate 1: TypeScript build (npm run build)... "
if npm run build --silent 2>&1 | tail -5; then
  echo -e "${GREEN}PASSED${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo "  Fix all TypeScript errors before marking done."
  FAILURES=$((FAILURES + 1))
fi
echo ""

# --- Gate 2: Test Suite ---
echo -n "Gate 2: Test suite (npm test)... "
if npm test --silent 2>&1 | tail -10; then
  echo -e "${GREEN}PASSED${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo "  Fix all test failures before marking done."
  FAILURES=$((FAILURES + 1))
fi
echo ""

# --- Gate 3: Untracked source files ---
echo "Gate 3: Untracked source files check..."
UNTRACKED=$(git ls-files --others --exclude-standard -- 'packages/*/src/*.ts' 'packages/*/src/*.tsx' 'demo/src/*.ts' 'demo/src/*.tsx' 2>/dev/null || true)
if [[ -n "$UNTRACKED" ]]; then
  echo -e "${YELLOW}WARNING: Untracked source files found:${NC}"
  echo "$UNTRACKED"
  echo "  These files will NOT be in the build. Stage them or confirm they are intentionally excluded."
  echo -e "${YELLOW}WARNING${NC} (non-blocking)"
else
  echo -e "${GREEN}PASSED${NC} — no untracked source files"
fi
echo ""

# --- Gate 4: Stale .js in src ---
echo "Gate 4: Stale .js files in src/..."
STALE_JS=$(find packages -path "*/src/*.js" -not -path "*/dist/*" -not -path "*/node_modules/*" -type f 2>/dev/null || true)
if [[ -n "$STALE_JS" ]]; then
  echo -e "${RED}FAILED${NC} — stale .js files found in src/:"
  echo "$STALE_JS"
  echo "  Run: find packages -path '*/src/*.js' -type f -delete"
  FAILURES=$((FAILURES + 1))
else
  echo -e "${GREEN}PASSED${NC}"
fi
echo ""

# --- Summary ---
echo "============================================"
if [[ "$FAILURES" -gt 0 ]]; then
  echo -e "${RED}VERIFICATION FAILED${NC} — $FAILURES gate(s) failed."
  echo "Do NOT mark this ticket as done."
  echo "============================================"
  exit 1
else
  echo -e "${GREEN}ALL GATES PASSED${NC}"
  echo ""
  if [[ "$SKIP_BROWSER" == "false" ]]; then
    echo -e "${YELLOW}REMINDER:${NC} For game-facing changes, you must also:"
    echo "  1. Start the dev server (npm run dev)"
    echo "  2. Open http://localhost:5173 in Playwright"
    echo "  3. Verify no console errors"
    echo "  4. Take a screenshot as evidence"
    echo "  5. Include evidence in your ticket comment"
  fi
  echo "============================================"
  exit 0
fi
