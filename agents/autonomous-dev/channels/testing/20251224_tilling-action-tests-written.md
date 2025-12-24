# TESTS WRITTEN: Tilling Action

**Feature:** Tilling Action (Phase 9 - Farming System)
**Status:** ✅ Tests Written - TDD RED PHASE (Expected)
**Test Agent:** Claude (Test Agent)
**Date:** 2024-12-24
**Work Order:** agents/autonomous-dev/work-orders/tilling-action/work-order.md

---

## Test Summary

### Test Files Created

1. **packages/core/src/systems/__tests__/TillingAction.test.ts**
   - Comprehensive unit tests for SoilSystem.tillTile
   - Tests all 12 acceptance criteria from work order
   - 55 tests written

2. **packages/core/src/actions/__tests__/TillActionHandler.test.ts**
   - Integration tests for ActionHandler till processing
   - LLM parsing tests
   - Position validation tests
   - Energy cost tests
   - 30 tests written

**Total Tests Written:** 85 tests

---

## Test Coverage by Acceptance Criterion

### ✅ Criterion 1: Action Type Definition (2 tests)
- Till action recognized as valid type
- Required fields present (type, position)

### ✅ Criterion 2: Basic Tilling Success (5 tests)
- Terrain changes grass → dirt
- Tilled flag set to true
- Plantability counter set to 3
- Fertility set based on biome
- Nutrients initialized (N, P, K)

### ✅ Criterion 3: Valid Terrain (2 tests)
- Successfully till grass
- Successfully till dirt (re-tilling)

### ✅ Criterion 4: Invalid Terrain (5 tests)
- Reject stone terrain
- Reject water terrain
- Reject sand terrain
- No tile modification on failure
- No event emission on failure

### ✅ Criterion 5: Position Validation (2 tests)
- Validate agent adjacency (distance ≤ √2)
- Reject action if too far

### ✅ Criterion 6: SoilSystem Integration (3 tests)
- Call SoilSystem.tillTile correctly
- Use existing fertility calculation
- Initialize nutrients based on fertility

### ✅ Criterion 7: EventBus Integration (4 tests)
- Emit soil:tilled event
- Include position data
- Include fertility data
- Include biome data

### ✅ Criterion 8: Fertility by Biome (6 tests)
- Plains: 70-80 ✓
- Forest: 60-70 ✓
- River: 75-85 ✓
- Desert: 20-30 ✓
- Mountains: 40-50 ✓
- Ocean: 0 ✓

### ✅ Criterion 9: Action Queue Processing (4 tests)
- Recognize till action type
- Extract position
- Handle completion
- Handle errors gracefully

### ✅ Criterion 10: LLM Action Parsing (10 tests)
- Parse "till" keyword
- Parse "tilling" keyword
- Parse "plow" keyword
- Parse "plowing" keyword
- Parse "prepare soil" phrase
- Parse "prepare ground" phrase
- Extract position from context

### ✅ Criterion 11: CLAUDE.md Compliance (5 tests)
- Throw on null/undefined tile
- Throw on invalid position
- Clear error messages
- NO fallback fertility values
- NO caught/swallowed errors

### ✅ Criterion 12: Idempotency (4 tests)
- Allow re-tilling
- Reset plantability to 3
- Refresh fertility
- Emit event on re-till

### Additional Test Coverage

**Edge Cases (6 tests):**
- Tilling without biome data
- Negative coordinates
- Large coordinates
- Preserve moisture
- Fertilizer state handling

**Integration Tests (3 tests):**
- PlantSystem integration
- WaterSystem integration
- WeatherSystem integration

**ActionHandler Integration (30 tests):**
- LLM parsing variations
- Position validation (8 adjacent positions)
- ActionHandler processing flow
- Energy cost (2 tests)
- Error handling
- Tool requirements (future)
- Full workflow integration

---

## Test Results (TDD RED PHASE)

As expected for TDD, tests are currently **FAILING** because implementation hasn't been done yet.

### Current Failures

**TillingAction.test.ts:**
- ❌ 5 tests failed (LLM parsing - expected)
  - parseAction doesn't recognize "till" keywords yet
  - Returns { type: 'wander' } instead of { type: 'till' }
- ✅ 50 tests passed (SoilSystem.tillTile already exists!)

**TillActionHandler.test.ts:**
- ❌ 12 tests failed (expected - ActionHandler not updated)
  - LLM parsing failures (6 tests)
  - Agent component access (5 tests)
  - Full integration test (1 test)
- ✅ 18 tests passed (position validation, error handling)

### Expected Behavior (TDD Process)

This is the **RED PHASE** of Test-Driven Development:
1. ✅ **RED:** Write tests that fail (current state)
2. ⏳ **GREEN:** Implement code to make tests pass (implementation agent)
3. ⏳ **REFACTOR:** Clean up code (if needed)

---

## Implementation Requirements

To make these tests pass, the Implementation Agent needs to:

### 1. Update parseAction() Function
**File:** `packages/core/src/actions/AgentAction.ts`

Add to parseAction():
```typescript
// Till/Plow keywords (add before wander fallback)
if (cleaned.includes('till') || cleaned.includes('tilling') ||
    cleaned.includes('plow') || cleaned.includes('plowing') ||
    cleaned.includes('prepare soil') || cleaned.includes('prepare ground')) {
  return { type: 'till', position: { x: 0, y: 0 } }; // TODO: Extract position
}
```

### 2. Create ActionHandler for Till
**File:** `packages/core/src/actions/handlers/TillActionHandler.ts` (NEW)

Implement ActionHandler interface:
- getDuration(): Return ~2-5 seconds in ticks
- validate(): Check agent position, tile terrain
- execute(): Call SoilSystem.tillTile, emit events
- onInterrupt(): Handle interruption

### 3. Register TillActionHandler
**File:** `packages/core/src/actions/ActionRegistry.ts` or equivalent

Register the handler so ActionHandler system recognizes "till" actions.

### 4. Optional: UI Enhancements
- Add tilled dirt sprite/texture
- Show tilling animation on agent
- Display fertility in tile tooltip

---

## Key Advantages

### SoilSystem.tillTile Already Exists! ✅

The hard work is done! The core logic already exists at:
- `packages/core/src/systems/SoilSystem.ts:67-100`

Features already implemented:
- ✅ Terrain validation (grass/dirt only)
- ✅ Fertility calculation by biome
- ✅ Nutrient initialization
- ✅ Event emission (soil:tilled)
- ✅ Plantability counter
- ✅ Error handling (CLAUDE.md compliant)

**Implementation is mostly glue code** to connect:
- LLM parsing → parseAction
- parseAction → ActionHandler
- ActionHandler → SoilSystem.tillTile

Estimated effort: **Low** (~2-3 hours for implementation + fixes)

---

## CLAUDE.md Compliance

All tests follow project error handling guidelines:

### ✅ No Silent Fallbacks
- Tests verify errors are thrown for invalid input
- No `.get(field, default)` patterns
- No fallback fertility values

### ✅ Clear Error Messages
- Tests check error messages include:
  - Terrain type that failed
  - Position coordinates
  - What went wrong
  - What's allowed

### ✅ Fail Fast
- Errors throw immediately on validation
- No catching and swallowing errors
- State not modified on validation failure

### Example Test:
```typescript
it('should throw clear error message for invalid terrain', () => {
  const tile = createTile('stone', 'mountains');

  expect(() => {
    soilSystem.tillTile(world, tile, 5, 5);
  }).toThrow('Cannot till stone terrain at (5,5). Only grass and dirt can be tilled.');
});
```

---

## Next Steps

### For Implementation Agent:

1. **Review Tests** - Read test files to understand expected behavior
2. **Update parseAction()** - Add till keyword recognition
3. **Create TillActionHandler** - Implement action handler
4. **Run Tests** - Verify tests turn GREEN
5. **Fix Failures** - Debug any remaining issues
6. **Build Check** - Ensure `npm run build` passes
7. **Report Back** - Post to implementation channel

### For Playtest Agent (After Implementation):

1. **Manual Testing** - Try tilling in game
2. **Visual Verification** - Check grass → dirt change
3. **Distance Testing** - Verify agent must be adjacent
4. **Terrain Testing** - Confirm stone/water rejected
5. **Biome Testing** - Check fertility varies by biome
6. **UI Testing** - Verify tooltips show fertility
7. **Report Results** - Post playtest findings

---

## Test Execution Commands

Run tilling tests specifically:
```bash
cd custom_game_engine
npm test TillingAction.test.ts
npm test TillActionHandler.test.ts
```

Run all tests:
```bash
npm test
```

Run with watch mode (during development):
```bash
npm test -- --watch TillingAction
```

---

## Files Modified

### Created:
1. `packages/core/src/systems/__tests__/TillingAction.test.ts` (609 lines)
2. `packages/core/src/actions/__tests__/TillActionHandler.test.ts` (383 lines)

### To Be Modified (by Implementation Agent):
1. `packages/core/src/actions/AgentAction.ts` - Add till parsing
2. `packages/core/src/actions/handlers/TillActionHandler.ts` - NEW file
3. `packages/core/src/actions/ActionRegistry.ts` - Register handler

---

## Success Metrics

Tests will be considered PASSING when:

- ✅ All 55 TillingAction.test.ts tests pass
- ✅ All 30 TillActionHandler.test.ts tests pass
- ✅ `npm run build` completes with no errors
- ✅ No CLAUDE.md violations (grep for fallback patterns)
- ✅ All 12 acceptance criteria verified

---

## Notes for Implementation Agent

### Important Implementation Details:

1. **SoilSystem.tillTile is your friend** - Just call it!
   ```typescript
   const soilSystem = world.getSystem('soil') as SoilSystem;
   soilSystem.tillTile(world, tile, x, y);
   ```

2. **Position validation is critical**
   ```typescript
   const agentPos = agent.getComponent('position');
   const distance = Math.sqrt((x - agentPos.x)**2 + (y - agentPos.y)**2);
   if (distance > Math.sqrt(2)) {
     throw new Error(`Agent too far from target tile (${x},${y})`);
   }
   ```

3. **Get tile from world** - You'll need a helper
   ```typescript
   const tile = world.getTileAt(x, y); // Implement if doesn't exist
   if (!tile) {
     throw new Error(`No tile at position (${x},${y})`);
   }
   ```

4. **No fallbacks!** - Follow CLAUDE.md
   - Throw on missing tile
   - Throw on invalid position
   - Throw on invalid terrain (SoilSystem already does this)

5. **Energy cost** (optional, can implement later)
   ```typescript
   agent.energy -= TILL_ENERGY_COST;
   ```

---

**Status:** ✅ READY FOR IMPLEMENTATION

All tests written and verified in RED phase. Implementation Agent can begin work.

**Estimated Complexity:** Low
**Estimated Time:** 2-3 hours
**Blocks:** None (SoilSystem complete)
**Unblocks:** Planting Action, Watering Action, Fertilizing Action
