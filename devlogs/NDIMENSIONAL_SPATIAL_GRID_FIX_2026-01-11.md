# N-Dimensional Spatial Grid RangeError Fix

**Date:** 2026-01-11
**File:** `custom_game_engine/packages/core/src/utils/NDimensionalSpatialGrid.ts`

## Problem

When `queryAsymmetric()` was called with large ranges in 6D space, it would throw:

```
RangeError: Invalid array length
at generateCombinations in getExtendedNeighborKeys
```

**Root Cause:** Exponential explosion of cell count in high dimensions.

Example calculation:
- Query: 6D with ranges `[100, 100, 100, 100, 100, 100]`
- Cell size: 15
- Cells per dimension: `ceil(100/15) = 7`
- Total cells to check: `(2*7+1)^6 = 15^6 = 11,390,625 cells`

This would attempt to allocate massive arrays in `generateCombinations`, causing RangeError.

## Solution

The fix was **already implemented** in the code (lines 298-320). It adds a safety check before generating cell combinations:

```typescript
// Calculate estimated cells
const estimatedCells = cellRadii.reduce((acc, r) => acc * (2 * r + 1), 1);
const MAX_CELLS = 10000; // Reasonable limit

if (estimatedCells > MAX_CELLS) {
  // Fallback: iterate through all entities and filter by distance
  const results: string[] = [];
  for (const [entityId, entityCoords] of this.entityPositions) {
    let withinRange = true;
    for (let i = 0; i < this.dimensions; i++) {
      const diff = Math.abs(normalized[i] - entityCoords[i]);
      if (diff > normalizedRanges[i]) {
        withinRange = false;
        break;
      }
    }
    if (withinRange) {
      results.push(entityId);
    }
  }
  return results;
}
```

## How It Works

1. **Calculate estimated cell count** before generating combinations
2. **Compare to MAX_CELLS threshold** (10,000)
3. **If under threshold**: Use optimized cell-based spatial hashing
4. **If over threshold**: Fall back to brute-force iteration over all entities

## Performance Characteristics

**Normal queries (< 10k cells):**
- O(k) where k = number of cells to check
- Very fast for localized queries
- Typical case: < 100 cells checked

**Large queries (> 10k cells):**
- O(n) where n = total entity count
- Falls back to linear scan
- Rare for reasonable query ranges
- Still correct, just slower

## Trade-offs

**Threshold of 10,000 cells:**
- Prevents memory allocation errors
- Graceful degradation for edge cases
- Could be tuned based on entity density

**Alternative approaches considered:**
- Chunked iteration (complex, marginal benefit)
- Octree/KD-tree (overkill for use case)
- Dynamic threshold based on entity count (unnecessary complexity)

## Test Coverage

Added two new tests to verify the fix:

1. **`handles 6D asymmetric query with large ranges without RangeError`**
   - Tests the exact scenario from the bug report
   - Verifies correct results with fallback path
   - Ensures entities within range are found

2. **`verifies cell count estimation triggers fallback correctly`**
   - Tests that the safety check doesn't throw
   - Validates the threshold logic

All 36 tests pass, including:
- Existing 2D/4D fallback tests
- New 6D large range tests
- Edge cases (zero radius, exact boundaries, negative coords)

## Files Modified

1. **NDimensionalSpatialGrid.test.ts** - Added 2 new tests for 6D large range queries
2. **NDimensionalSpatialGrid.ts** - No changes (fix already implemented)

## Verification

```bash
npm test -- NDimensionalSpatialGrid.test.ts
# ✓ 36 tests passed
```

## Impact

- **Zero performance impact** for normal queries (< 10k cells)
- **Prevents crashes** on pathological queries
- **Maintains correctness** by falling back to full scan
- **No API changes** - transparent to callers

## Usage Examples

```typescript
// Normal case: Optimized path
const grid = new NDimensionalSpatialGrid(4, 15);
grid.queryAsymmetric([10, 10, 20, 50], [45, 45, 10, 10]);
// Uses cell-based lookup (~27 cells)

// Edge case: Fallback path
const grid6D = new NDimensionalSpatialGrid(6, 15);
grid6D.queryAsymmetric([50, 50, 50, 50, 50, 50], [100, 100, 100, 100, 100, 100]);
// Falls back to full entity scan (11M cells → scan all entities instead)
```

## Conclusion

The RangeError bug was already fixed in the codebase with an intelligent fallback strategy. Added comprehensive test coverage to ensure the fix works correctly for 6D queries with large ranges. The solution balances performance optimization with graceful degradation for edge cases.
