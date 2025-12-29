#!/bin/bash
# Complexity Analysis Script for AI Village Game Engine
# Run periodically during retrospectives or before major refactors

set -e
cd "$(dirname "$0")/.."

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           COMPLEXITY ANALYSIS REPORT                          ║"
echo "║           $(date '+%Y-%m-%d %H:%M')                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# ============================================================================
# 1. FILE SIZE ANALYSIS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 FILES OVER 500 LINES (God Object Warning)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
find packages -name "*.ts" -not -path "*node_modules*" -not -path "*__tests__*" -exec wc -l {} \; 2>/dev/null | \
  awk '$1 > 500 {print $1 " lines: " $2}' | sort -rn | head -20

LARGE_FILES=$(find packages -name "*.ts" -not -path "*node_modules*" -not -path "*__tests__*" -exec wc -l {} \; 2>/dev/null | awk '$1 > 500' | wc -l)
echo ""
echo "Total files over 500 lines: $LARGE_FILES"
if [ "$LARGE_FILES" -gt 5 ]; then
  echo "⚠️  WARNING: Consider refactoring large files"
fi

# ============================================================================
# 2. FUNCTION COUNT PER FILE
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 FILES WITH 20+ FUNCTIONS (SRP Violation Warning)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
find packages -name "*.ts" -not -path "*node_modules*" -not -path "*__tests__*" -not -path "*dist*" -print0 2>/dev/null | while IFS= read -r -d '' file; do
  count=$(grep -cE "^\s*(private|public|protected|async)?\s+\w+\s*\(" "$file" 2>/dev/null || echo "0")
  if [ "$count" -gt 20 ] 2>/dev/null; then
    echo "$count functions: $file"
  fi
done | sort -rn | head -10

# ============================================================================
# 3. ANY TYPE USAGE
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 'any' TYPE USAGE (Type Safety)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ANY_COUNT=$(grep -rn ": any" packages/*/src/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | wc -l | tr -d ' ')
ANY_CAST=$(grep -rn "as any" packages/*/src/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | wc -l | tr -d ' ')
echo "Explicit 'any' types: $ANY_COUNT"
echo "Type casts 'as any':  $ANY_CAST"
echo "Total any usage:      $((ANY_COUNT + ANY_CAST))"

if [ "$((ANY_COUNT + ANY_CAST))" -gt 20 ]; then
  echo ""
  echo "Top files with 'any':"
  grep -rn ": any\|as any" packages/*/src/ --include="*.ts" 2>/dev/null | \
    grep -v "__tests__" | cut -d: -f1 | sort | uniq -c | sort -rn | head -5
fi

# ============================================================================
# 4. CIRCULAR DEPENDENCIES
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 CIRCULAR DEPENDENCIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v npx &> /dev/null; then
  CIRCULAR=$(npx madge --circular packages/core/src/ 2>/dev/null | grep -v "No circular" || echo "")
  if [ -z "$CIRCULAR" ]; then
    echo "✅ No circular dependencies found"
  else
    echo "⚠️  Circular dependencies detected:"
    echo "$CIRCULAR"
  fi
else
  echo "⏭️  Skipped (npx not available)"
fi

# ============================================================================
# 5. SPREAD OPERATOR IN UPDATECOMPONENT (Known Bug Pattern)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐛 SPREAD OPERATOR BUG PATTERN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SPREAD_COUNT=$(grep -rn "updateComponent.*{[[:space:]]*\.\.\." packages/*/src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "updateComponent with spread operator: $SPREAD_COUNT"
if [ "$SPREAD_COUNT" -gt 0 ]; then
  echo "⚠️  WARNING: Spread operators in updateComponent destroy class prototypes!"
  echo "Locations:"
  grep -rn "updateComponent.*{[[:space:]]*\.\.\." packages/*/src/ --include="*.ts" 2>/dev/null | head -10
fi

# ============================================================================
# 6. SILENT FALLBACK PATTERNS (CLAUDE.md Violation)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔇 SILENT FALLBACK PATTERNS (CLAUDE.md Compliance)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# || with literals (not variables)
OR_FALLBACK=$(grep -rn "|| ['\"\`\[{0-9]" packages/*/src/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | grep -v "console\." | wc -l | tr -d ' ')
# ?? with literals
NULL_FALLBACK=$(grep -rn "\?\? ['\"\`\[{0-9]" packages/*/src/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | wc -l | tr -d ' ')

echo "|| with literal fallback: $OR_FALLBACK"
echo "?? with literal fallback: $NULL_FALLBACK"
echo "(Note: Some ?? usage is valid for optional fields)"

# ============================================================================
# 7. CONSOLE.WARN USAGE (Potential Silent Failures)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  CONSOLE.WARN USAGE (Potential Silent Failures)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
WARN_COUNT=$(grep -rn "console\.warn" packages/*/src/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | wc -l | tr -d ' ')
echo "console.warn calls: $WARN_COUNT"
if [ "$WARN_COUNT" -gt 0 ]; then
  echo "Review these - warnings that continue execution may mask bugs:"
  grep -rn "console\.warn" packages/*/src/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | head -5
fi

# ============================================================================
# 8. TEST COVERAGE GAPS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TEST FILE COVERAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SRC_FILES=$(find packages/*/src -name "*.ts" -not -path "*__tests__*" -not -name "*.test.ts" -not -name "index.ts" 2>/dev/null | wc -l | tr -d ' ')
TEST_FILES=$(find packages -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "Source files: $SRC_FILES"
echo "Test files:   $TEST_FILES"
echo "Ratio:        $(echo "scale=2; $TEST_FILES / $SRC_FILES" | bc 2>/dev/null || echo "N/A")"

# ============================================================================
# 9. IMPORT COMPLEXITY
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 FILES WITH 15+ IMPORTS (High Coupling)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
find packages -name "*.ts" -not -path "*node_modules*" -not -path "*__tests__*" -not -path "*dist*" -print0 2>/dev/null | while IFS= read -r -d '' file; do
  count=$(grep -c "^import " "$file" 2>/dev/null || echo "0")
  if [ "$count" -gt 15 ] 2>/dev/null; then
    echo "$count imports: $file"
  fi
done | sort -rn | head -10

# ============================================================================
# 10. ESLINT COMPLEXITY ANALYSIS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 ESLINT COMPLEXITY VIOLATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v npx &> /dev/null; then
  # Run eslint with complexity rules, count violations
  ESLINT_OUTPUT=$(npx eslint packages/*/src/**/*.ts \
    --rule 'complexity: [error, 15]' \
    --rule 'max-lines: [error, 500]' \
    --rule 'max-lines-per-function: [error, 100]' \
    --rule 'max-depth: [error, 4]' \
    --format compact 2>/dev/null || true)

  COMPLEXITY_VIOLATIONS=$(echo "$ESLINT_OUTPUT" | grep -c "complexity" || echo 0)
  MAX_LINES_VIOLATIONS=$(echo "$ESLINT_OUTPUT" | grep -c "max-lines" || echo 0)
  MAX_FUNC_VIOLATIONS=$(echo "$ESLINT_OUTPUT" | grep -c "max-lines-per-function" || echo 0)
  MAX_DEPTH_VIOLATIONS=$(echo "$ESLINT_OUTPUT" | grep -c "max-depth" || echo 0)

  echo "Cyclomatic complexity > 15:    $COMPLEXITY_VIOLATIONS"
  echo "File lines > 500:              $MAX_LINES_VIOLATIONS"
  echo "Function lines > 100:          $MAX_FUNC_VIOLATIONS"
  echo "Nesting depth > 4:             $MAX_DEPTH_VIOLATIONS"

  if [ "$COMPLEXITY_VIOLATIONS" -gt 0 ] || [ "$MAX_LINES_VIOLATIONS" -gt 0 ]; then
    echo ""
    echo "Top violations:"
    echo "$ESLINT_OUTPUT" | grep -E "complexity|max-lines" | head -10
  fi
else
  echo "⏭️  Skipped (npx not available)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        SUMMARY                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "| Metric                          | Count | Threshold | Status |"
echo "|--------------------------------|-------|-----------|--------|"
printf "| Files over 500 lines           | %5s | ≤5        | %s |\n" "$LARGE_FILES" "$([ "$LARGE_FILES" -le 5 ] && echo '✅' || echo '⚠️ ')"
printf "| 'any' type usage               | %5s | ≤20       | %s |\n" "$((ANY_COUNT + ANY_CAST))" "$([ "$((ANY_COUNT + ANY_CAST))" -le 20 ] && echo '✅' || echo '⚠️ ')"
printf "| Spread in updateComponent      | %5s | 0         | %s |\n" "$SPREAD_COUNT" "$([ "$SPREAD_COUNT" -eq 0 ] && echo '✅' || echo '🐛')"
printf "| console.warn calls             | %5s | ≤10       | %s |\n" "$WARN_COUNT" "$([ "$WARN_COUNT" -le 10 ] && echo '✅' || echo '⚠️ ')"
echo ""
echo "Run completed: $(date '+%Y-%m-%d %H:%M:%S')"
