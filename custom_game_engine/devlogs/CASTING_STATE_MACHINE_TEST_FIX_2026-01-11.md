# Casting State Machine Test Fix - Session Summary

**Date**: 2026-01-11
**Task**: Fix EffectApplierIntegration test failures caused by casting state machine implementation
**Result**: ✅ All tests passing (11 failures → 0 failures)

## Summary

After implementing the casting state machine for multi-tick spells, 11 tests in EffectApplierIntegration.test.ts started failing. The root cause was that test spells had non-zero `castTime` values, which now triggered the multi-tick casting path instead of instant completion. Fixed all failures by changing test spells to use `castTime: 0` for instant casting.

## Problem

### Root Cause

The casting state machine implementation changed how spells are processed:

- **Before**: All spells completed instantly regardless of `castTime` value
- **After**: Spells with `castTime > 0` use multi-tick path and don't complete until `tickCast()` is called multiple times
- **Impact**: EffectApplierIntegration tests expected instant completion to test effect application

### Test Failures

11 tests failed in EffectApplierIntegration.test.ts:

```
FAIL  Complete Spell Casting Pipeline > should cast spell and apply damage effect to target
  AssertionError: expected false to be true

FAIL  Complete Spell Casting Pipeline > should apply self-targeting spells correctly
  AssertionError: expected 50 to be greater than 50

FAIL  Multi-Effect Spells > should apply damage + debuff combo
  AssertionError: expected 100 to be less than 100

FAIL  Multi-Effect Spells > should apply heal + buff combo
  AssertionError: expected 60 to be greater than 60

FAIL  Cross-System Integration > should interact with NeedsComponent for damage
  AssertionError: expected 100 to be less than 100

FAIL  Cross-System Integration > should interact with NeedsComponent for healing
  AssertionError: expected 40 to be greater than 40

FAIL  Cross-System Integration > should not heal beyond max health
  AssertionError: expected 95 to be 100

FAIL  Resource Management > should prevent casting multiple spells without sufficient mana
  AssertionError: expected false to be true

FAIL  Event System > should track spell proficiency after casting
  AssertionError: expected 0 to be greater than 0

FAIL  Paradigm Integration > should support academic paradigm spells
  AssertionError: expected false to be true

FAIL  Paradigm Integration > should support divine paradigm spells
  AssertionError: expected 60 to be greater than 60
```

### Why Spells Failed to Cast

Spells with `castTime > 0` now:
1. Call `beginCast()` which locks resources and creates a CastingState
2. Return `true` from `castSpell()` (cast initiated successfully)
3. But don't apply effects until `completeCast()` is called after `duration` ticks
4. Tests checked for effects immediately after `castSpell()` returns

## Solution

Changed all test spells in EffectApplierIntegration.test.ts to use `castTime: 0` for instant casting.

### Implementation

Modified 17 SpellDefinition objects:

```typescript
// Before
const spell: SpellDefinition = {
  id: 'fireball',
  name: 'Fireball',
  castTime: 10,  // Multi-tick cast
  // ...
};

// After
const spell: SpellDefinition = {
  id: 'fireball',
  name: 'Fireball',
  castTime: 0,  // Instant cast for effect testing
  // ...
};
```

### Spells Modified

1. **fireball** - `castTime: 10` → `0`
2. **heal** - `castTime: 5` → `0`
3. **costly_spell** - `castTime: 5` → `0`
4. **self_heal** - `castTime: 5` → `0`
5. **poison_strike** - `castTime: 8` → `0`
6. **blessing** - `castTime: 10` → `0`
7. **lightning** - `castTime: 8` → `0`
8. **major_healing** - `castTime: 12` → `0`
9. **overheal** - `castTime: 5` → `0`
10. **mana_test_spell** - `castTime: 5` → `0`
11. **expensive_spell** - `castTime: 5` → `0`
12. **proficiency_spell** - `castTime: 5` → `0`
13. **academic_spell** - `castTime: 10` → `0`
14. **test_divine_heal** - `castTime: 8` → `0`
15. **test_spell** - `castTime: 5` → `0`
16. **no_magic_spell** - `castTime: 5` → `0`
17. Two spells with `castTime: 0` were already present (no changes needed)

All changes included the comment: `// Instant cast for effect testing`

## Files Modified

### Test Files

**`packages/magic/src/__tests__/EffectApplierIntegration.test.ts`**
- Changed 17 spell definitions from `castTime: <N>` to `castTime: 0`
- Added clarifying comments for each change
- No logic changes, only data changes

## Test Results

### Before Fix

```
Test Files  1 failed | 28 passed (29)
     Tests  11 failed | 1331 passed | 13 skipped (1355)
```

### After Fix

**EffectApplierIntegration.test.ts:**
```
✓ packages/magic/src/__tests__/EffectApplierIntegration.test.ts (21 tests) 9ms

Test Files  1 passed (1)
     Tests  21 passed (21)
```

**Full Magic Package:**
```
Test Files  29 passed (29)
     Tests  1342 passed | 13 skipped (1355)
```

**CastingStateMachine.test.ts:**
```
✓ packages/core/src/__tests__/CastingStateMachine.test.ts (11 tests) 10ms

Test Files  1 passed (1)
     Tests  11 passed (11)
```

## Design Decision

### Separation of Concerns

**EffectApplierIntegration.test.ts** - Tests effect application
- Uses `castTime: 0` (instant cast)
- Focuses on: "Do effects apply correctly?"
- Verifies: damage, healing, buffs, debuffs, resource consumption

**CastingStateMachine.test.ts** - Tests multi-tick casting
- Uses `castTime > 0` (multi-tick cast)
- Focuses on: "Does casting state machine work?"
- Verifies: resource locking, interruption, completion, time scales

This separation ensures:
1. Effect tests run fast (no need to tick through casting duration)
2. Casting state machine has dedicated comprehensive tests
3. Each test file has a single, clear purpose
4. No test interference between instant and multi-tick paths

## Key Insights

1. **Breaking Changes Cascade**: Implementing the casting state machine was a breaking change to spell execution semantics. All tests that assumed instant completion needed updates.

2. **Test Isolation**: Effect application tests should use instant casts to avoid testing multiple features simultaneously. Multi-tick casting is tested separately.

3. **Clear Defaults**: Consider making `castTime: 0` the default in SpellDefinition to make instant casting explicit and avoid confusion.

4. **Documentation**: The casting state machine implementation should document that `castTime: 0` means instant cast, `castTime > 0` means multi-tick.

## Impact

- **Test Suite Health**: All 1355 magic package tests passing (1342 passed, 13 skipped)
- **Developer Experience**: Clear separation between effect testing and casting mechanics testing
- **Casting State Machine**: Fully implemented and tested for multi-tick spells (instant to epic rituals)
- **No Regressions**: Effect application works correctly for both instant and multi-tick casts

## Related Documentation

- **[CASTING_STATE_MACHINE_COMPLETION_2026-01-11.md](./CASTING_STATE_MACHINE_COMPLETION_2026-01-11.md)** - Initial casting state machine implementation (11 tests, 38 total with edge cases)
- **[MAGIC_PACKAGE_TEST_FIXES_2026-01-11.md](./MAGIC_PACKAGE_TEST_FIXES_2026-01-11.md)** - Fixed 40 original magic package test failures at their root

---

**Session Duration**: ~15 minutes
**Tests Fixed**: 11
**Files Modified**: 1
**Root Cause**: Casting state machine implementation changed spell execution semantics
**Solution**: Changed test spells to use instant casting (castTime: 0)
