# Work Order: Magic System Missing Features & Validations

**Phase:** Magic System - Core Integrity
**Created:** 2025-12-29
**Status:** PENDING
**Priority:** HIGH

---

## Spec Reference

- **Test Suite:** `packages/core/src/__tests__/Magic*`
- **Exploit Report:** `MAGIC_EXPLOITS_COMPREHENSIVE.md`
- **Related:** `CLAUDE.md` (Error Handling section)

---

## Problem Statement

Vulnerability testing revealed **107 confirmed exploits** in the magic system across 289 tests. While many exploits are intentional (magic should be powerful), there are critical missing implementations and validations that cause:

1. **Test Failures** (14 tests): Missing core components prevent tests from running
2. **State Corruption** (27 confirmed): Invalid states are allowed
3. **Arithmetic Exploits** (15 confirmed): No bounds checking on stats
4. **Race Conditions** (8 confirmed): Timing exploits allow impossible actions
5. **Economic Breaking** (8 confirmed): Infinite wealth generation

**Test Results:**
- 258 tests passed (89%)
- 31 tests failed due to missing features (not protections)
- All failures indicate missing implementations, not working safeguards

---

## Requirements Summary

### Category 1: Missing Core Implementations (Blocking Tests)

**Critical - Prevents Tests from Running**

1. **ItemQuality Enum** - Not available in test scope
   - Tests fail: 4 in `MagicSystemCrossExploits.test.ts`
   - Needed for: Quality-based crafting/trading exploits
   - Location: Should be in `packages/core/src/items/ItemQuality.ts`

2. **SpiritualComponent.recentPrayers** - Not initialized as array
   - Tests fail: 2 in `MagicSystemTimingExploits.test.ts`, 1 in `MagicSystemStateExploits.test.ts`
   - Error: `Cannot read properties of undefined (reading 'length')`
   - Fix: Initialize as empty array in `createSpiritualComponent()`

3. **MagicComponent.paradigmSpecificState** - Not initialized as Map
   - Tests fail: 4 in `MagicSystemStateExploits.test.ts`
   - Error: `Cannot read properties of undefined (reading 'set')`
   - Fix: Initialize as `new Map()` in `createMagicComponent()`

4. **SpiritualComponent.deityId** - Returns undefined instead of empty string
   - Tests fail: 1 in `MagicSystemStateExploits.test.ts`
   - Expected: `''` when created with empty string
   - Actual: `undefined`

5. **InventoryComponent.items** - Structure issue
   - Tests fail: 1 in `MagicSystemCrossExploits.test.ts`
   - Error: `Cannot read properties of undefined (reading 'push')`
   - Fix: Ensure `createInventoryComponent()` initializes items array

### Category 2: Missing Validations (State Corruption)

**High Priority - Allows Invalid States**

6. **Stat Caps** - No maximum enforced
   - Proficiency can exceed 100 → 10x power exploit
   - Corruption can exceed 1.0 → infinite power bonus
   - Faith can exceed 1.0 or go negative → broken divine magic
   - Luck can reach MAX_SAFE_INTEGER → 100% success rate

7. **Paradigm Conflicts** - Mutually exclusive paradigms allowed simultaneously
   - Divine + Pact can coexist (should be exclusive)
   - No validation on `knownParadigmIds` assignment
   - Can add same paradigm multiple times

8. **State Transition Validation** - Invalid state combinations allowed
   - `casting=false` with `activeSpellId` set
   - `magicUser=false` while casting
   - `homeParadigmId` not in `knownParadigmIds`
   - Spell knowledge without paradigm knowledge

9. **Mana Pool Integrity** - Inconsistent states allowed
   - `locked > current` (negative available mana)
   - `current > maximum` (overflow)
   - `maximum < 0` (impossible pool)
   - Multiple pools with same source

### Category 3: Missing Arithmetic Safety

**High Priority - Exploit Vectors**

10. **Cooldown Floor** - Can go negative
    - Negative cooldown = instant extra casts
    - Reduction stacking: 10 items × -20% = 10 tick cooldown
    - No minimum enforced (should be 1 tick minimum)

11. **Duration Bounds** - No validation
    - Negative duration triggers expiry effects instantly
    - `MAX_SAFE_INTEGER` duration = effectively permanent
    - Duration stacking not limited

12. **Mana Regeneration Overflow** - Creates mana from nothing
    - Scenario: At full 100/100, increase max to 200
    - Now 100/200, regen = 0.1 × 200 = 20
    - Created 20 mana from nothing
    - Fix: Regen should be based on deficit, not maximum

13. **Locked Mana Bounds** - Can be negative or exceed current
    - Negative locked = extra available mana (150 from 100)
    - Locked > current = negative available
    - Fix: `locked = Math.max(0, Math.min(current, locked))`

### Category 4: Missing Race Condition Protections

**Medium Priority - Timing Exploits**

14. **Simultaneous Cast Prevention** - No mana reservation
    - Can start casting spell A (60 mana)
    - Before mana deducted, start spell B (60 mana)
    - Both check against same 100 mana pool
    - Fix: Reserve/lock mana at cast start, not end

15. **Paradigm Switch Lock** - Can switch mid-cast
    - Start Academic spell (Conservation law applies)
    - Switch to Blood Magic mid-cast (no Conservation)
    - Fix: Lock paradigm for duration of cast

16. **Cooldown Check Timing** - Off-by-one allows early casting
    - Check uses `>=` instead of `>`
    - Can cast 1 tick before cooldown ends
    - Fix: Strict inequality checks

### Category 5: Missing Balance Systems

**Medium Priority - Economic Exploits**

17. **Price Manipulation Caps** - Commerce magic uncapped
    - Can reduce price by 0.5 per cast, no floor
    - 30 casts: 100 gold → 0.00009 gold (free)
    - Reverse: 30 casts: 1 gold → 1 billion gold
    - Fix: Price multiplier caps (min 0.1x, max 10x per cast)

18. **Market Saturation** - No supply/demand mechanics
    - Can create infinite items with Craft magic
    - No price degradation from flooding market
    - Fix: Track item quantities, reduce value with oversupply

19. **Luck Debt Compounding** - Luck gains not balanced by losses
    - Can accumulate 1000 luck with no downside
    - Luck debt should compound faster than gains
    - Fix: Luck debt interest rate > gain rate

20. **Belief Resistance** - No reality anchors
    - Belief magic can convince masses of anything
    - No skeptics or competing beliefs
    - Fix: NPC awareness stat, belief decay rate

---

## Acceptance Criteria

### Criterion 1: Core Component Initialization
- **WHEN:** `createSpiritualComponent()` is called
- **THEN:** `recentPrayers` SHALL be initialized as empty array `[]`
- **AND:** `deityId` SHALL be the provided string (or `''` if empty)

### Criterion 2: MagicComponent Initialization
- **WHEN:** `createMagicComponent()` is called
- **THEN:** `paradigmSpecificState` SHALL be initialized as `new Map()`

### Criterion 3: Stat Caps Enforced
- **WHEN:** Any stat is set (proficiency, corruption, faith, luck)
- **THEN:** The value SHALL be clamped to valid range:
  - Proficiency: [0, 100]
  - Corruption: [0, 1.0]
  - Faith: [0, 1.0]
  - Luck: [-100, 100]

### Criterion 4: Paradigm Conflict Validation
- **WHEN:** Adding a paradigm to `knownParadigmIds`
- **THEN:** The system SHALL check for conflicts:
  - Divine and Pact are mutually exclusive
  - Cannot add same paradigm twice
  - Cannot add paradigm that doesn't exist

### Criterion 5: State Transition Validation
- **WHEN:** Setting `casting` or `activeSpellId`
- **THEN:** The system SHALL enforce valid states:
  - If `casting=true`, `activeSpellId` MUST be defined
  - If `casting=false`, `activeSpellId` MUST be undefined
  - If casting, `magicUser` MUST be true

### Criterion 6: Mana Pool Integrity
- **WHEN:** Setting `locked`, `current`, or `maximum` on mana pool
- **THEN:** The system SHALL enforce bounds:
  - `locked >= 0`
  - `locked <= current`
  - `current >= 0`
  - `current <= maximum`
  - `maximum > 0`

### Criterion 7: Cooldown Floor
- **WHEN:** Calculating effective cooldown after reductions
- **THEN:** The result SHALL be at least 1 tick
- **NOT:** Allow zero or negative cooldowns

### Criterion 8: Mana Reservation
- **WHEN:** Starting a spell cast
- **THEN:** The system SHALL:
  1. Check available mana (current - locked)
  2. Lock the spell's mana cost
  3. Prevent other casts until completion or cancel
  4. Deduct from current on completion

### Criterion 9: Price Manipulation Caps
- **WHEN:** Commerce magic modifies item price
- **THEN:** The multiplier per cast SHALL be clamped:
  - Minimum: 0.5x (can't go below half price in one cast)
  - Maximum: 2.0x (can't double in one cast)
  - Absolute floor: 0.01 gold (can never be free)

### Criterion 10: Luck Debt Balance
- **WHEN:** Using Luck magic
- **THEN:** Debt SHALL accumulate faster than gains:
  - Luck gain: +1 per event
  - Luck debt interest: 1.1x per day (compounds)
  - Total luck (current - debt) capped at 100

---

## Files to Create

**New Files:**
1. `packages/core/src/magic/MagicValidator.ts` - Validation utilities
2. `packages/core/src/magic/StateCaps.ts` - Stat clamping functions
3. `packages/core/src/magic/ParadigmConflicts.ts` - Conflict definitions
4. `packages/core/src/__tests__/MagicValidator.test.ts` - Validation tests

---

## Files to Modify

### Critical (Test Blockers)
1. `packages/core/src/components/SpiritualComponent.ts`
   - Line: `createSpiritualComponent()` function
   - Change: Initialize `recentPrayers: []` and ensure `deityId` is stored

2. `packages/core/src/components/MagicComponent.ts`
   - Line: `createMagicComponent()` function
   - Change: Initialize `paradigmSpecificState: new Map()`

3. `packages/core/src/components/InventoryComponent.ts`
   - Line: `createInventoryComponent()` function
   - Change: Ensure `items: []` is initialized

### High Priority (State Corruption)
4. `packages/core/src/components/MagicComponent.ts`
   - Add: `setKnownParadigm()` with conflict validation
   - Add: `setProficiency()` with clamping
   - Add: `setCorruption()` with clamping

5. `packages/core/src/components/SpiritualComponent.ts`
   - Add: `setFaith()` with clamping [0, 1]

6. `packages/core/src/magic/MagicLawEnforcer.ts`
   - Add: State transition validation before spell cast
   - Add: Mana pool integrity checks

### Medium Priority (Arithmetic)
7. `packages/core/src/systems/AgentBrainSystem.ts` (or spell casting system)
   - Modify: Mana reservation logic (lock at start, deduct at end)
   - Add: Cooldown floor (minimum 1 tick)

8. `packages/core/src/economy/PricingService.ts`
   - Add: Price manipulation caps
   - Add: Market saturation tracking

---

## Implementation Plan

### Phase 1: Critical Fixes (Unblock Tests)
**Estimated: 2 hours**

1. Initialize `recentPrayers` in `SpiritualComponent`
2. Initialize `paradigmSpecificState` in `MagicComponent`
3. Fix `deityId` to store empty string correctly
4. Verify `InventoryComponent` items array initialization
5. Re-run tests: All 289 tests should now execute

### Phase 2: Validation Layer
**Estimated: 4 hours**

6. Create `MagicValidator.ts` with validation functions
7. Create `StateCaps.ts` with clamping utilities
8. Create `ParadigmConflicts.ts` with conflict definitions
9. Add validation calls at all mutation points
10. Write comprehensive tests for validators

### Phase 3: State Integrity
**Estimated: 3 hours**

11. Add state transition validation
12. Add mana pool integrity checks
13. Add paradigm conflict enforcement
14. Update tests to expect validation errors

### Phase 4: Arithmetic Safety
**Estimated: 3 hours**

15. Implement cooldown floor
16. Implement stat caps (proficiency, corruption, faith, luck)
17. Fix mana regeneration overflow
18. Clamp locked mana bounds

### Phase 5: Race Condition Protections
**Estimated: 4 hours**

19. Implement mana reservation system
20. Add paradigm switch lock during cast
21. Fix cooldown check timing (off-by-one)
22. Add integration tests for race conditions

### Phase 6: Balance Systems
**Estimated: 6 hours**

23. Implement price manipulation caps
24. Add market saturation mechanics
25. Implement luck debt compounding
26. Add belief resistance/skepticism
27. Balance tuning and testing

**Total Estimated Time: 22 hours**

---

## Success Definition

### Must Have (Blocks Completion)
1. ✅ All 289 magic system tests execute (no crashes)
2. ✅ Zero TypeErrors from undefined properties
3. ✅ Stat caps enforced (proficiency, corruption, faith, luck)
4. ✅ Paradigm conflicts prevented (Divine + Pact)
5. ✅ State transitions validated (no casting while not magic user)
6. ✅ Mana pool integrity maintained (locked ≤ current ≤ maximum)
7. ✅ Build passes: `npm run build`
8. ✅ All existing tests pass: `npm run test`

### Should Have (Exploits Mitigated)
9. ✅ Cooldown floor enforced (minimum 1 tick)
10. ✅ Mana reservation prevents double-casting
11. ✅ Price manipulation capped (0.5x to 2.0x per cast)
12. ✅ Luck debt compounds faster than gains
13. ✅ Duration bounds enforced (positive, below MAX_SAFE_INTEGER)

### Nice to Have (Balance)
14. ⭕ Market saturation affects prices
15. ⭕ Belief resistance/skepticism system
16. ⭕ Combo detection warnings at runtime
17. ⭕ Economic crash events on manipulation

---

## Testing Requirements

### New Tests Required
1. `MagicValidator.test.ts` - All validation functions
2. `StateCaps.test.ts` - Clamping edge cases
3. `ParadigmConflicts.test.ts` - All conflict scenarios
4. `ManaReservation.test.ts` - Race condition prevention

### Existing Tests to Update
1. `MagicSystemCrossExploits.test.ts` - Fix ItemQuality imports
2. `MagicSystemTimingExploits.test.ts` - Update for new validations
3. `MagicSystemStateExploits.test.ts` - Expect errors on invalid states
4. `MagicSystemAdversarial.test.ts` - Update for capped stats

### Regression Tests
- All 258 currently passing tests must still pass
- Exploit tests should fail (validation prevents exploits)
- Edge case tests verify caps and bounds

---

## Dependencies

### Blocks
- None (can start immediately)

### Blocked By
- None (self-contained work)

### Related Work Orders
- `itemquality-system` - ItemQuality enum implementation
- `phase-12-economy` - Economic systems
- `test-coverage-gaps` - Additional magic system tests

---

## Rollout Plan

### Development
1. Create feature branch: `magic-system-validations`
2. Implement in phases (as outlined above)
3. Run tests after each phase
4. Fix regressions immediately

### Testing
1. Run full test suite: `npm test`
2. Run magic-specific tests: `npm test -- Magic`
3. Check exploit tests now fail (validations work)
4. Manual testing in game with edge cases

### Integration
1. Merge to main after all phases complete
2. Monitor for regressions in gameplay
3. Balance tuning based on playtesting
4. Document new validation APIs

---

## Risk Assessment

### High Risk
- **Breaking Changes**: Adding validations will break exploits (intended)
- **Mitigation**: Update tests to expect validation errors

### Medium Risk
- **Performance**: Validation on every stat change could impact performance
- **Mitigation**: Only validate on external mutations, not internal calculations

### Low Risk
- **Scope Creep**: Balance systems (Phase 6) could expand indefinitely
- **Mitigation**: Mark Phase 6 items as "Nice to Have", can defer

---

## Notes

### Design Decisions

**Intentional Exploits (Keep):**
- Magic breaking economy (Commerce, Belief, etc.) - This is intended
- Powerful paradigm combinations - This is creative gameplay
- Time manipulation effects - This is part of magic fantasy

**Unintentional Exploits (Fix):**
- State corruption (casting while not magic user)
- Arithmetic exploits (negative cooldowns, overflow stats)
- Race conditions (double-casting, simultaneous mana spending)
- Missing validations (uncapped stats, conflicting paradigms)

**Philosophy:**
- Magic should be powerful but not broken
- Exploits should be creative gameplay, not engine bugs
- Validation errors should be clear and actionable
- Balance systems should emerge from simulation, not hard caps

### Open Questions

1. Should paradigm conflict be hard error or soft warning?
   - **Recommendation:** Hard error in strict mode, warning in casual mode

2. Should stat caps be configurable per paradigm?
   - **Recommendation:** Yes, some paradigms might allow >100 proficiency

3. Should combo detection run at runtime?
   - **Recommendation:** Yes, but only warn player, don't prevent

4. How to handle save files with invalid states?
   - **Recommendation:** Sanitize on load, log warnings, attempt repair

---

## Appendix: Test Failure Summary

### ItemQuality Errors (4 failures)
```
FAIL  MagicSystemCrossExploits.test.ts > EXPLOIT: Craft magic to upgrade items
TypeError: Cannot read properties of undefined (reading 'Poor')
```

### SpiritualComponent Errors (3 failures)
```
FAIL  MagicSystemTimingExploits.test.ts > EXPLOIT: Spam prayers
TypeError: Cannot read properties of undefined (reading 'length')
```

### MagicComponent Errors (4 failures)
```
FAIL  MagicSystemStateExploits.test.ts > EXPLOIT: Circular references
TypeError: Cannot read properties of undefined (reading 'set')
```

### Logic Errors (3 failures)
```
FAIL  MagicSystemStateExploits.test.ts > EXPLOIT: Spiritual component with no deity
AssertionError: expected undefined to be ''
```

**Total:** 14 failures preventing full test coverage

---

**End of Work Order**

**Next Steps:**
1. Review and approve work order
2. Create feature branch
3. Begin Phase 1 implementation
4. Track progress in this file

**Estimated Completion:** 3-4 days (22 hours across phases)
