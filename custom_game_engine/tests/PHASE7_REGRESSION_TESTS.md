# Phase 7 Regression Tests Documentation

**File:** `tests/phase7-regression.spec.ts`
**Status:** ✅ All 15 tests passing
**Purpose:** Prevent regressions in the archetype entity creation system and building/shelter mechanics

---

## Test Coverage

### 1. Archetype Registry Tests

#### ✅ All building archetypes are registered
**What it tests:** Verifies that all three building archetypes (lean-to, campfire, storage-box) are properly registered in the ArchetypeRegistry and can create entities.

**Prevents regression:**
- Archetype registration failing
- ArchetypeRegistry not being initialized
- GameLoop not registering archetypes
- Missing archetype exports

---

### 2. BuildingComponent Tests

#### ✅ Campfire provides shelter (CRITICAL - Bug Fix Regression Test)
**What it tests:** Ensures campfires have `providesShelter: true`

**Prevents regression:**
- **CRITICAL BUG**: Campfires not providing shelter (original bug in BuildingComponent.ts:32)
- This was the primary bug that prevented BuildingSystem from working
- If this test fails, shelter restoration will be broken

**Bug History:**
- Originally, campfires only provided warmth
- Fixed to also provide shelter (fire protects from elements)
- This test ensures the fix stays in place

#### ✅ Lean-to has correct properties
**What it tests:** Validates lean-to building properties (shelter, blocks movement, complete)

**Prevents regression:**
- Lean-to properties changing unexpectedly
- Building type mismatches
- Incorrect default values

#### ✅ Storage box has storage capacity
**What it tests:** Ensures storage boxes have positive storage capacity

**Prevents regression:**
- Storage capacity being set to 0
- Storage functionality broken

---

### 3. Archetype System Tests

#### ✅ Entities created with correct components
**What it tests:** Verifies archetypes create entities with building + renderable components (but NOT position)

**Prevents regression:**
- Archetype components changing
- Extra components being added
- Missing required components
- Position accidentally included in archetype (should be added separately)

#### ✅ Position can be added after entity creation
**What it tests:** Confirms position components can be added post-creation and chunk indices calculate correctly

**Prevents regression:**
- World.addComponent() failing
- Position component validation issues
- Chunk index calculation errors (x/32, y/32 flooring)

---

### 4. BuildingSystem Tests

#### ✅ Restores shelter to nearby agents
**What it tests:** BuildingSystem increases shelter for agents within SHELTER_RANGE (3 tiles) at SHELTER_RESTORE_RATE (5 points/sec)

**Prevents regression:**
- BuildingSystem not running
- Shelter restoration logic broken
- Distance calculation errors
- Restore rate changes

**Expected behavior:** Shelter should increase by ~5-15 points in 3 seconds

#### ✅ Does NOT restore shelter to distant agents
**What it tests:** BuildingSystem ignores agents outside SHELTER_RANGE (tested at 10 tiles away)

**Prevents regression:**
- Distance checking failing
- All agents getting shelter regardless of position
- SHELTER_RANGE constant being changed to unreasonable values

**Expected behavior:** Distant agents' shelter should decay, not restore

#### ✅ Multiple buildings stack shelter restoration
**What it tests:** When multiple shelter-providing buildings are near an agent, shelter restoration still works

**Prevents regression:**
- Building query breaking with multiple results
- Shelter restoration only working with exactly 1 building
- Loop logic errors

---

### 5. NeedsComponent Tests

#### ✅ Shelter decays when not near buildings
**What it tests:** NeedsSystem decreases shelter over time when agent is not in shelter

**Prevents regression:**
- Shelter decay rate changes
- NeedsSystem not processing shelter
- Shelter decay being disabled

**Expected behavior:** ~0.5 points/second decay rate

---

### 6. Integration Tests

#### ✅ Full shelter restoration cycle
**What it tests:** Complete lifecycle:
1. Shelter set low (10%)
2. Decays without building
3. Restores with building present
4. Building removed
5. Decays again

**Prevents regression:**
- Any break in the shelter mechanics pipeline
- State not updating correctly
- BuildingSystem not responding to entity creation/destruction

**This is the most important test** - if this passes, the entire system works end-to-end.

---

### 7. Rendering Tests

#### ✅ Buildings have correct sprite IDs
**What it tests:** Each building archetype creates renderable components with matching spriteIds

**Prevents regression:**
- Sprite IDs getting mixed up
- Renderable components not being created
- spriteId property name changes

---

### 8. World/Spatial Tests

#### ✅ Spatial index updated when building created
**What it tests:** Buildings with position components are added to chunk-based spatial index

**Prevents regression:**
- Spatial index not updating
- World.addComponent() not updating index
- Chunk index key calculation errors

---

### 9. System Registry Tests

#### ✅ BuildingSystem registered in system registry
**What it tests:** BuildingSystem is present in the GameLoop's system registry

**Prevents regression:**
- BuildingSystem not being registered in main.ts
- System registry breaking
- System being removed accidentally

---

### 10. Critical Path Test

#### ✅ Archetype → Entity → Position → Query → System
**What it tests:** The entire integration chain:
1. Create entity from archetype ✓
2. Add position component ✓
3. Query can find entity ✓
4. BuildingSystem processes entity and affects agent ✓

**This is the ULTIMATE regression test** - validates the entire Phase 7 implementation in one test.

**Prevents regression:**
- Any break in the entity lifecycle
- Component system failures
- Query system failures
- System execution failures

---

## Running the Tests

```bash
# Run all Phase 7 regression tests
npx playwright test phase7-regression

# Run specific test
npx playwright test phase7-regression -g "Campfire provides shelter"

# Run with UI
npx playwright test phase7-regression --ui
```

---

## Test Maintenance

### When to Update These Tests

1. **If SHELTER_RANGE changes** → Update distance tests
2. **If SHELTER_RESTORE_RATE changes** → Update restoration amount expectations
3. **If new building archetypes added** → Add to archetype registration test
4. **If BuildingComponent properties change** → Update component property tests

### Critical Tests (MUST NEVER FAIL)

These tests protect against breaking bugs:

1. ✅ **Campfire provides shelter** - Original bug fix
2. ✅ **Full shelter restoration cycle** - End-to-end integration
3. ✅ **Critical Path test** - Complete system validation

If any of these fail, Phase 7 is broken.

---

## Test Results

Last run: All 15 tests passing (21.4s)

```
✅ Archetype Registry - All building archetypes are registered
✅ BuildingComponent - Campfire provides shelter (regression for bug fix)
✅ BuildingComponent - Lean-to has correct properties
✅ BuildingComponent - Storage box has storage capacity
✅ Archetype - Entities created with correct components
✅ Archetype - Position can be added after entity creation
✅ BuildingSystem - Restores shelter to nearby agents
✅ BuildingSystem - Does NOT restore shelter to distant agents
✅ BuildingSystem - Multiple buildings stack shelter restoration
✅ NeedsComponent - Shelter decays when not near buildings
✅ Integration - Full shelter restoration cycle
✅ Renderable - Buildings have correct sprite IDs
✅ World - Spatial index updated when building created
✅ BuildingSystem - Registered in system registry
✅ Critical Path - Archetype → Entity → Position → Query → System
```

---

## Related Files

- `packages/core/src/ecs/Archetype.ts` - Archetype system
- `packages/core/src/archetypes/BuildingArchetypes.ts` - Building templates
- `packages/core/src/components/BuildingComponent.ts` - Building data (LINE 32: campfire shelter fix)
- `packages/core/src/systems/BuildingSystem.ts` - Shelter restoration logic
- `packages/core/src/ecs/World.ts` - Entity creation
- `packages/core/src/loop/GameLoop.ts` - Archetype registration
