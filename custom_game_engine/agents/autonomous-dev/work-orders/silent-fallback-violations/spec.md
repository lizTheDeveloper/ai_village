# Silent Fallback Violations Cleanup

## Overview

The project's `CLAUDE.md` explicitly prohibits silent fallbacks - code that catches errors and continues with default values instead of failing fast. A code review found several violations that mask bugs and make debugging difficult.

## Core Principle (from CLAUDE.md)

> **NEVER use fallback values to mask errors.** If data is missing or invalid, crash immediately with a clear error message. This ensures bugs are found and fixed at their source rather than hidden.

---

## 1. Violations Found

### 1.1 NeedsSystem - Silent Skip on Missing Component

**File:** `packages/core/src/systems/NeedsSystem.ts:44`

**Current (VIOLATION):**
```typescript
const needs = entity.getComponent('needs');
if (!needs) {
  console.warn(`[NeedsSystem] Entity ${entity.id} has no needs component!`);
  continue;  // Silent fallback - skips entity
}
```

**Problem:**
- If an entity should have needs but doesn't, this is a bug
- The bug is logged but execution continues
- Over time, logs fill with warnings nobody reads
- The root cause (entity created without needs) is never fixed

**Required Fix:**
```typescript
const needs = entity.getComponent('needs');
if (!needs) {
  throw new Error(
    `[NeedsSystem] Entity ${entity.id} missing required 'needs' component. ` +
    `Entities in NeedsSystem query must have needs component. ` +
    `Check entity creation in ${entity.constructor.name}.`
  );
}
```

**Alternative (if some entities legitimately lack needs):**
Fix the system's entity query to only match entities WITH needs:
```typescript
// In system registration
world.registerSystem(new NeedsSystem(), {
  query: { required: ['agent', 'needs'] }  // Only match entities with needs
});
```

---

### 1.2 PlantSystem - Silent Fallback Species

**File:** `packages/core/src/systems/PlantSystem.ts:79`

**Current (VIOLATION):**
```typescript
const species = this.speciesLookup?.(plant.speciesId);
if (!species) {
  console.warn(`[PlantSystem] Unknown species ${plant.speciesId}, using fallback`);
  return this.defaultSpecies;  // Silent fallback
}
```

**Problem:**
- Unknown species indicates data corruption or missing definition
- Fallback species hides the problem
- Plant may behave incorrectly (wrong growth rate, yield, etc.)
- Bug is never fixed because "it works"

**Required Fix:**
```typescript
const species = this.speciesLookup?.(plant.speciesId);
if (!species) {
  throw new Error(
    `[PlantSystem] Unknown plant species '${plant.speciesId}' for entity ${entity.id}. ` +
    `Available species: ${this.getAvailableSpeciesIds().join(', ')}. ` +
    `Check PlantSpeciesRegistry or plant entity creation.`
  );
}
```

---

### 1.3 MemoryFormationSystem - Silent Event Skip

**File:** `packages/core/src/systems/MemoryFormationSystem.ts:173-196`

**Current (VIOLATION):**
```typescript
handleConversationEvent(event: ConversationEvent): void {
  const convData = event.data;
  if (!convData.speakerId || !convData.listenerId) {
    console.error(`[MemoryFormationSystem] Invalid conversation event: missing speaker or listener`);
    return;  // Silent skip
  }
  // ... process event
}
```

**Problem:**
- Invalid event data indicates a bug in the emitter
- Silently skipping means memories are never formed
- The conversation system keeps emitting bad events
- Agents appear to "forget" conversations (hard to debug)

**Required Fix:**
```typescript
handleConversationEvent(event: ConversationEvent): void {
  const convData = event.data;
  if (!convData.speakerId) {
    throw new Error(
      `[MemoryFormationSystem] Conversation event missing 'speakerId'. ` +
      `Event: ${JSON.stringify(event)}. ` +
      `Fix the event emitter (likely CommunicationSystem).`
    );
  }
  if (!convData.listenerId) {
    throw new Error(
      `[MemoryFormationSystem] Conversation event missing 'listenerId'. ` +
      `Event: ${JSON.stringify(event)}. ` +
      `Fix the event emitter (likely CommunicationSystem).`
    );
  }
  // ... process event
}
```

---

## 2. Pattern Recognition

### 2.1 How to Identify Violations

Search for these patterns:

```bash
# console.warn followed by continue/return
grep -rn "console.warn" --include="*.ts" | grep -v test | grep -v ".d.ts"

# Fallback patterns
grep -rn "|| fallback" --include="*.ts" | grep -v test
grep -rn "?? default" --include="*.ts" | grep -v test
grep -rn "if (!.*) return;" --include="*.ts" | grep -v test

# Get with default for required fields
grep -rn "\.get\(.*," --include="*.ts" | grep -v test
```

### 2.2 When Fallbacks ARE Acceptable

Per CLAUDE.md, fallbacks are OK for **truly optional** fields:

```typescript
// OK - description is optional, empty string is semantically valid
const description = data.get('description', '');

// OK - tags are optional, empty array is fine
const tags = data.get('tags', []);

// OK - debug flag with sensible default
const verbose = options.verbose ?? false;

// NOT OK - critical game state
const health = data.get('health', 100);  // WRONG - masks missing data

// NOT OK - required relationship
const targetId = event.targetId ?? 'unknown';  // WRONG - masks bug
```

---

## 3. Additional Violations to Check

These patterns were found and need investigation:

| File | Line | Pattern | Action Needed |
|------|------|---------|---------------|
| `GatherBehavior.ts` | 448 | `skills ?? 50` | Check if skills should be required |
| `GovernanceDataSystem.ts` | 140-141 | `age ?? 0, generation ?? 0` | These are placeholders - document or implement |
| `ActionQueue.ts` | Various | No action type validation | Add validation for unknown action types |
| `ResponseParser.ts` | Various | Returns `null` on parse failure | Should throw with context |

Run this search to find more:
```bash
cd custom_game_engine
grep -rn "console.warn\|console.error" packages/core/src/systems/*.ts | grep -v test
```

---

## 4. Implementation Guide

### 4.1 Converting a Silent Fallback

**Before:**
```typescript
const component = entity.getComponent('foo');
if (!component) {
  console.warn('Missing foo component');
  return defaultValue;
}
```

**After:**
```typescript
const component = entity.getComponent('foo');
if (!component) {
  throw new Error(
    `[SystemName] Entity ${entity.id} missing required 'foo' component. ` +
    `Context: ${additionalContext}. ` +
    `This indicates a bug in entity creation or system query.`
  );
}
```

### 4.2 Error Message Best Practices

Good error messages include:
1. **What** is missing/invalid
2. **Where** it was expected (entity ID, event type)
3. **Why** it matters (what will break)
4. **How** to fix it (what to check)

```typescript
// Good error message
throw new Error(
  `[PlantSystem] Plant entity ${entity.id} has unknown species '${speciesId}'. ` +
  `Valid species: wheat, corn, tomato. ` +
  `Check plant creation in FarmingBehavior or seed planting logic.`
);

// Bad error message
throw new Error('Invalid plant');
```

---

## 5. Testing Error Paths

After converting to throws, add tests for error cases:

```typescript
describe('NeedsSystem', () => {
  it('throws when entity lacks needs component', () => {
    const entity = createEntityWithoutNeeds();

    expect(() => {
      needsSystem.update([entity], 16);
    }).toThrow(/missing required 'needs' component/);
  });
});

describe('PlantSystem', () => {
  it('throws for unknown plant species', () => {
    const plant = createPlantWithSpecies('nonexistent_species');

    expect(() => {
      plantSystem.updatePlant(plant);
    }).toThrow(/Unknown plant species 'nonexistent_species'/);
  });
});

describe('MemoryFormationSystem', () => {
  it('throws when conversation event lacks speakerId', () => {
    const badEvent = { type: 'conversation', data: { listenerId: 'agent1' } };

    expect(() => {
      memorySystem.handleConversationEvent(badEvent);
    }).toThrow(/missing 'speakerId'/);
  });
});
```

---

## 6. Verification Checklist

Before marking complete:

- [ ] `NeedsSystem` throws on missing needs component
- [ ] `PlantSystem` throws on unknown species (no fallback)
- [ ] `MemoryFormationSystem` throws on invalid event data
- [ ] Tests added for each error path
- [ ] No `console.warn` + `continue` patterns in core systems
- [ ] No `console.error` + `return` patterns in event handlers
- [ ] Grep for `|| fallback` returns only truly optional cases
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test`

---

## 7. Files to Modify

| File | Change |
|------|--------|
| `packages/core/src/systems/NeedsSystem.ts` | Line 44: throw instead of warn+continue |
| `packages/core/src/systems/PlantSystem.ts` | Line 79: throw instead of warn+fallback |
| `packages/core/src/systems/MemoryFormationSystem.ts` | Lines 173-196: throw instead of error+return |
| `packages/core/src/systems/__tests__/NeedsSystem.test.ts` | Add error path tests |
| `packages/core/src/systems/__tests__/PlantSystem.test.ts` | Add error path tests |
| `packages/core/src/systems/__tests__/MemoryFormationSystem.test.ts` | Add error path tests |

---

## 8. Post-Implementation

After fixing these violations, run the game and watch for crashes. Each crash reveals a bug that was previously hidden:

1. **Entity creation bugs** - entities missing required components
2. **Data integrity bugs** - invalid species IDs, missing event fields
3. **System ordering bugs** - systems accessing data before it's initialized

These crashes are **good** - they show you bugs that existed but were invisible. Fix each at its source.

---

**End of Specification**
