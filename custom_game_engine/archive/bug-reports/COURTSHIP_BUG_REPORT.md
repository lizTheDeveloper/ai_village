# Courtship System Bug Report

**Date:** 2026-01-01
**Severity:** Critical - Courtship system completely non-functional
**Status:** Root cause identified

---

## Summary

The courtship system never triggers because the compatibility calculation returns `NaN`, which fails all threshold checks. Agents with perfect compatibility (same species, actively seeking, high romantic inclination, positive relationship) never initiate courtship.

---

## Root Cause

**Missing personality fields cause NaN in compatibility calculation.**

### Bug Location

`packages/world/src/entities/AgentEntity.ts:128-135`

```typescript
const personality = new PersonalityComponent({
  openness: randomTrait(),
  conscientiousness: randomTrait(),
  extraversion: randomTrait(),
  agreeableness: randomTrait(),
  neuroticism: randomTrait(),
  // Missing: workEthic, creativity, generosity, leadership, spirituality
});
```

### Consequence

`packages/core/src/reproduction/courtship/compatibility.ts:137-142`

```typescript
// 4. Creativity similarity - closer is better
const creativityDiff = Math.abs(personality1.creativity - personality2.creativity);
const creativityScore = 1 - creativityDiff;

// 5. Spirituality similarity - closer is better
const spiritualityDiff = Math.abs(personality1.spirituality - personality2.spirituality);
const spiritualityScore = 1 - spiritualityDiff;
```

When `creativity` and `spirituality` are `undefined`:
- `Math.abs(undefined - undefined)` = `NaN`
- `1 - NaN` = `NaN`
- Final compatibility score = `NaN`
- `NaN > threshold` = `false` (always fails)

---

## Evidence

### Test Results

```bash
$ npx tsx debug-compatibility.ts
🎯 COMPATIBILITY SCORE: NaN
   Threshold (romanticInclination=0.9): 0.2300
   Would trigger courtship: NO ✗
```

### Agents Tested

- Romeo & Juliet (test-romance-pair.ts)
- Same species (Human)
- Both actively seeking
- Romantic inclination: 0.9
- Compatible personalities (Big Five)
- Pre-seeded positive relationship
- Distance: 1 tile (within 10-tile range)
- **Result:** No courtship activity after 5000 ticks

---

## Impact

**100% courtship failure rate.**

- All courtship tests fail
- No romantic relationships form naturally
- Reproduction system non-functional
- Social dynamics broken

---

## Fix Required

### Option 1: Set all personality fields (Recommended)

`packages/world/src/entities/AgentEntity.ts:128-135`

```typescript
const personality = new PersonalityComponent({
  // Big Five
  openness: randomTrait(),
  conscientiousness: randomTrait(),
  extraversion: randomTrait(),
  agreeableness: randomTrait(),
  neuroticism: randomTrait(),
  // Additional traits
  workEthic: randomTrait(),
  creativity: randomTrait(),
  generosity: randomTrait(),
  leadership: randomTrait(),
  spirituality: randomTrait(),
});
```

### Option 2: Make compatibility calculation defensive (NOT recommended)

Per CLAUDE.md guidelines, we should NOT use fallbacks to hide missing data. The current behavior (returning NaN) correctly signals a data integrity problem, but it should **throw an error** instead of silently failing.

Better defensive code:

```typescript
if (personality1.creativity === undefined || personality2.creativity === undefined) {
  throw new Error('PersonalityComponent missing required field: creativity');
}

if (personality1.spirituality === undefined || personality2.spirituality === undefined) {
  throw new Error('PersonalityComponent missing required field: spirituality');
}
```

---

## Recommendation

**Fix Option 1** - Set all personality fields when creating agents.

This is the correct solution because:
1. PersonalityComponent expects these fields
2. Compatibility calculation depends on them
3. Follows "fail fast" principle - PersonalityComponent constructor should validate all required fields
4. No performance impact

---

## Testing

After fix, verify:
1. `npx tsx debug-compatibility.ts` - Score should be 0-1, not NaN
2. `npx tsx test-romance-pair.ts` - Courtship should trigger within 500-2000 ticks
3. `npx tsx test-courtship.ts` - At least some courtship activity with 5 agents

---

## Related Issues

- Courtship system documentation claims it's functional, but has never worked
- No test coverage for compatibility calculation validates NaN handling
- PersonalityComponent constructor doesn't validate all fields are set
