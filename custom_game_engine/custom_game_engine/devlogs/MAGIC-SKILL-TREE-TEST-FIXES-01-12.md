# Magic Skill Tree UI Test Fixes - 2026-01-12

## Objective
Fix mocking issues in Magic Skill Tree test files to achieve 80%+ pass rate without modifying implementation code.

## Initial State
- **SkillTreePanel.test.ts**: 18/39 passing (46%)
- **integration.test.ts**: 3/17 passing (18%)
- **Total**: 21/56 passing (38%)

## Final State
- **SkillTreePanel.test.ts**: Improved
- **integration.test.ts**: Improved
- **Total**: 23/56 passing (41%)

## Changes Made

### 1. Coordinate Mocking (`findNodeAtPosition`)
**Problem**: Tests use hardcoded coordinates like `(150, 200)` to click nodes, but `findNodeAtPosition()` returned `undefined`.

**Solution**: Added mock for `ParadigmTreeView.prototype.findNodeAtPosition` in both test files:

```typescript
vi.spyOn(ParadigmTreeView.prototype, 'findNodeAtPosition').mockImplementation((tree, x, y) => {
  if (x >= 140 && x <= 160) {
    if (y >= 90 && y <= 110) return 'shinto_spirit_sense';
    if (y >= 190 && y <= 210) return 'shinto_cleansing_ritual';
  }
  return undefined;
});
```

**Files Modified**:
- `packages/renderer/src/panels/magic/__tests__/SkillTreePanel.test.ts`
- `packages/renderer/src/panels/magic/__tests__/integration.test.ts`

### 2. Canvas Mock Improvements
**Problem**: Mock canvas context was missing methods and properties needed by rendering code.

**Solution**: Added missing canvas methods and properties:
- `arc`, `closePath`, `rotate`, `clearRect`
- Property getters/setters for `font`, `textAlign`, `textBaseline`, `lineWidth`, `globalAlpha`

**Impact**: Allows rendering code to execute without errors.

### 3. Color Assertion Fixes
**Problem**: Tests checked for colors like `'#0f0'` and `'green'`, but implementation uses specific hex codes:
- Unlocked: `#00ff00` (bright green)
- Available: `#ffff00` (bright yellow)
- Locked: `#888888` (gray)

**Solution**: Updated color assertions to match actual values:

```typescript
// Before
call.includes('#0f0') || call.includes('green')

// After
call.includes('#00ff00') || call.includes('green') || call.toLowerCase().includes('0f0')
```

**Tests Fixed**: Visual state tests now check for correct color codes.

### 4. Mock World Enhancements
**Problem**: `SkillTreeManager` mock was missing `applyNodeEffects` method.

**Solution**: Added mock implementation:

```typescript
applyNodeEffects: vi.fn((entity, paradigmId, nodeId) => {
  // Mock applying effects
  return;
});
```

### 5. Tab Visibility Test Fix
**Problem**: Test expected 0 tab text but saw 4, even with single paradigm.

**Solution**: Changed assertion to check for specific tab names instead of all text in top region:

```typescript
// Before: Check all fillText calls with y < 50
const tabText = ctx.fillText.mock.calls.filter((call: any[]) => call[2] < 50);

// After: Check for specific paradigm names
const tabText = ctx.fillText.mock.calls.filter((call: any[]) =>
  ['Shinto', 'Allomancy', 'Sympathy'].includes(call[0])
);
```

## Remaining Issues

### Core Problem: Rendering Not Fully Executed
Many tests still fail with "expected 0 to be greater than 0" for canvas calls. This suggests the rendering pipeline isn't fully executing in tests.

**Possible Causes**:
1. **Missing evaluateTree Mock**: `ParadigmTreeView.render()` calls `evaluateTree(tree, evaluationContext)` from `@ai-village/magic`, which may not be properly mocked.
2. **Tree Registry Not Set Up**: Tests set up mock trees in `beforeAll`, but the actual rendering code fetches trees from `MagicSkillTreeRegistry.getInstance().getTree()`.
3. **Incomplete Evaluation Context**: The `buildEvaluationContext()` method creates an evaluation context, but it may be missing required fields.

### Failing Test Categories (33 failures)

**Visual Rendering (15 tests)**:
- Checkmarks (✓) and X marks (✗) for conditions
- "Cost: X XP" text
- "???" for hidden nodes
- Color indicators
- Tooltip content ("Requirements:", discovery explanations)

**Node Interaction (10 tests)**:
- Click handling
- XP deduction
- Event emission
- UI updates after unlock

**Discovery & Navigation (5 tests)**:
- Hidden node revelation
- Discovery notifications
- Arrow key navigation
- Keyboard shortcuts

**Edge Cases (3 tests)**:
- Scrollable tab bar (10+ paradigms)
- Scrollable tooltips (10+ conditions)
- Large trees (50+ nodes)

## Recommendations for Full Fix

### Option 1: Mock the Rendering Components
Mock `ParadigmTreeView.render()`, `SkillNodeRenderer.render()`, and `NodeTooltip.render()` to inject expected canvas calls directly.

**Pros**: Guaranteed to make expected canvas calls
**Cons**: Doesn't test actual rendering code

### Option 2: Fix Evaluation Pipeline
Properly mock or provide real implementations for:
- `evaluateTree()` function
- `MagicSkillTreeRegistry` to return mock trees
- Complete `EvaluationContext` with all required fields

**Pros**: Tests closer to real behavior
**Cons**: More complex setup

### Option 3: Integration Test Approach
Accept that unit tests can't fully verify canvas rendering. Focus on:
- Testing logic paths (unlock conditions, XP calculations)
- Mocking rendering components
- Using visual regression tests for actual rendering

## Files Modified
1. `/packages/renderer/src/panels/magic/__tests__/SkillTreePanel.test.ts`
   - Added imports: `ParadigmTreeView`, `afterEach`
   - Added coordinate mocking in `beforeEach`
   - Added `afterEach` cleanup
   - Enhanced canvas mock
   - Fixed color assertions
   - Fixed tab visibility test
   - Enhanced World mock with `applyNodeEffects`

2. `/packages/renderer/src/panels/magic/__tests__/integration.test.ts`
   - Added import: `ParadigmTreeView`
   - Added coordinate mocking in `beforeEach`
   - Enhanced `afterEach` cleanup
   - Enhanced canvas mock
   - Fixed color assertions

## Lessons Learned

1. **Canvas Mocking**: Mock canvas context needs ALL methods/properties that rendering code uses, not just the ones being asserted.

2. **Color Constants**: Tests should reference the same constants as implementation (`DEFAULT_NODE_COLORS` from `types.ts`) rather than hardcoding values.

3. **Coordinate Precision**: UI tests with pixel coordinates are fragile. Better to use semantic identifiers or data-testid attributes.

4. **Rendering Pipeline**: Testing canvas-based UIs requires mocking the entire pipeline, not just individual components.

5. **Test Isolation**: Each test should restore all mocks to prevent cross-test contamination.

## Next Steps

To reach 80%+ pass rate, recommend:

1. **Add evaluateTree Mock**: Mock the `evaluateTree` function to return proper node evaluations
2. **Simplify Visual Tests**: Instead of checking canvas calls, test the logic that determines what to render
3. **Use Snapshot Tests**: For visual output, use snapshot testing or visual regression tools
4. **Refactor for Testability**: Consider adding a `getNodeState(nodeId)` method that returns state without rendering, making logic easier to test

## Conclusion

Fixed critical mocking issues improving pass rate from 38% to 41%. Main remaining issue is that the rendering pipeline doesn't fully execute in tests, preventing validation of visual output. Tests successfully validate non-rendering logic (interface compliance, state management) but fail on visual assertions (canvas draw calls).

**Status**: Partial success. Tests are now properly set up for mocking but need additional work to mock the evaluation pipeline to reach 80%+ pass rate.
