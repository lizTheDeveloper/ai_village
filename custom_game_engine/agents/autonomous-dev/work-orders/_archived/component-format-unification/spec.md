# Component Format Unification

## Overview

Multiple components exist in TWO incompatible formats: a class-based version and an interface-based "Legacy" version. This creates confusion, bugs, and maintenance burden. This work order unifies each component to a single format.

## The Problem

### Dual Formats Example: NeedsComponent

```typescript
// packages/core/src/components/NeedsComponent.ts

// Format 1: Class-based (0.0 to 1.0 scale)
export class NeedsComponent extends ComponentBase {
  public hunger: number;  // 0.0 to 1.0
  constructor() {
    this.hunger = 1.0;  // Full
  }
}

// Format 2: Interface-based (0 to 100 scale)
export interface NeedsComponentLegacy {
  hunger: number;  // 0 to 100
  hungerDecayRate: number;
}
```

### The Bug This Creates

Helper functions try to handle both with broken logic:

```typescript
export function isHungry(needs: NeedsComponentLegacy | NeedsComponent): boolean {
  return needs.hunger < 40 || needs.hunger < 0.4;
}
```

**Bug:** If `hunger = 0.5` (new format, 50% full):
- `0.5 < 40` → true (WRONG! Reports hungry when not)
- The `||` makes it always pass the first check for new format values

**Correct logic would need:**
```typescript
function isHungry(needs: NeedsComponent | NeedsComponentLegacy): boolean {
  // Have to detect which format and handle differently
  if (needs.hunger <= 1.0) {
    return needs.hunger < 0.4;  // New format: 0-1 scale
  } else {
    return needs.hunger < 40;   // Legacy format: 0-100 scale
  }
}
```

But this is fragile - what if hunger is exactly 1.0? Is that full (new) or nearly starving (legacy)?

---

## Components With Dual Formats

| Component | Class File | Has Legacy Interface | Scale Difference |
|-----------|-----------|---------------------|------------------|
| NeedsComponent | Yes | Yes (`NeedsComponentLegacy`) | 0-1 vs 0-100 |
| PersonalityComponent | Yes | Yes (`PersonalityComponentLegacy`) | Same scale |
| MemoryComponent | Yes (location) | Different file (`MemoryComponentClass`) | Different structure entirely |
| GoalsComponent | Yes | Partial | Minor differences |
| SkillsComponent | Yes | Factory function | Same structure |
| CircadianComponent | Yes | Factory function | Same structure |

---

## Decision: Which Format to Keep?

### Recommendation: Keep Class-Based, Delete Legacy

**Reasons:**

1. **Type safety** - Classes provide better TypeScript inference
2. **Encapsulation** - Can add methods, validation in constructors
3. **Consistency** - ECS pattern typically uses class-based components
4. **0-1 scale is better** - Easier math, no magic numbers

**Migration path:**
1. Pick the class-based version as canonical
2. Update all systems to use class version
3. Delete legacy interfaces and factory functions
4. Update helper functions to use single format

---

## Detailed Migration: NeedsComponent

### Step 1: Audit Usage

Find all uses of both formats:

```bash
# Find NeedsComponentLegacy usage
grep -rn "NeedsComponentLegacy" packages/

# Find createNeedsComponent usage (factory for legacy)
grep -rn "createNeedsComponent" packages/

# Find NeedsComponent class usage
grep -rn "new NeedsComponent" packages/
```

### Step 2: Standardize on 0-1 Scale

The class version uses 0-1, which is better:
- `0.0` = empty/critical
- `1.0` = full/healthy
- Easy percentage: `hunger * 100` for display

### Step 3: Update the Component

```typescript
// packages/core/src/components/NeedsComponent.ts

import { ComponentBase } from '../ecs/Component.js';

/**
 * Tracks an agent's physical needs on a 0.0 to 1.0 scale.
 * 0.0 = critical/empty, 1.0 = full/healthy
 */
export class NeedsComponent extends ComponentBase {
  public readonly type = 'needs';

  /** Hunger level: 0 = starving, 1 = full */
  public hunger: number = 1.0;

  /** Energy level: 0 = exhausted, 1 = energized */
  public energy: number = 1.0;

  /** Health level: 0 = dead, 1 = healthy */
  public health: number = 1.0;

  /** Hydration level: 0 = dehydrated, 1 = hydrated */
  public thirst: number = 1.0;

  /** Body temperature in Celsius */
  public temperature: number = 37;

  /** Social need: 0 = lonely, 1 = satisfied */
  public social: number = 0.5;

  /** Mental stimulation: 0 = bored, 1 = engaged */
  public stimulation: number = 0.5;

  /** Rate of hunger decay per game tick */
  public hungerDecayRate: number = 0.001;

  /** Rate of energy decay per game tick */
  public energyDecayRate: number = 0.0005;

  constructor(options?: Partial<NeedsComponent>) {
    super();
    if (options) {
      Object.assign(this, options);
    }
  }

  /** Clone this component */
  clone(): NeedsComponent {
    return new NeedsComponent({ ...this });
  }
}

// Helper functions - single format, no ambiguity
export function isHungry(needs: NeedsComponent): boolean {
  return needs.hunger < 0.4;
}

export function isStarving(needs: NeedsComponent): boolean {
  return needs.hunger < 0.1;
}

export function isTired(needs: NeedsComponent): boolean {
  return needs.energy < 0.3;
}

export function isExhausted(needs: NeedsComponent): boolean {
  return needs.energy < 0.1;
}

export function isHealthCritical(needs: NeedsComponent): boolean {
  return needs.health < 0.2;
}

export function isDying(needs: NeedsComponent): boolean {
  return needs.health < 0.05;
}

export function isLonely(needs: NeedsComponent): boolean {
  return needs.social < 0.3;
}

export function isBored(needs: NeedsComponent): boolean {
  return needs.stimulation < 0.3;
}

// DELETE these - no longer needed:
// - NeedsComponentLegacy interface
// - createNeedsComponent factory function
```

### Step 4: Update All Callers

**Before:**
```typescript
import { createNeedsComponent, NeedsComponentLegacy } from './NeedsComponent';
const needs: NeedsComponentLegacy = createNeedsComponent(100, 100, 100);
```

**After:**
```typescript
import { NeedsComponent } from './NeedsComponent';
const needs = new NeedsComponent({ hunger: 1.0, energy: 1.0, health: 1.0 });
```

**Value conversion (if existing data uses 0-100):**
```typescript
// One-time migration for saved games or existing entities
const legacyHunger = 75;  // Old 0-100 value
const newHunger = legacyHunger / 100;  // Convert to 0-1
```

### Step 5: Update Systems

Systems that check needs:

```typescript
// Before - ambiguous
if (needs.hunger < 40 || needs.hunger < 0.4) { ... }

// After - clear
if (needs.hunger < 0.4) { ... }
// Or use helper:
if (isHungry(needs)) { ... }
```

---

## Detailed Migration: PersonalityComponent

Similar process:

```typescript
// KEEP: Class-based
export class PersonalityComponent extends ComponentBase {
  public readonly type = 'personality';
  public openness: number;        // 0-1
  public conscientiousness: number;
  public extraversion: number;
  public agreeableness: number;
  public neuroticism: number;
  // ...
}

// DELETE: Legacy interface
export interface PersonalityComponentLegacy { ... }
export function generateRandomPersonality() { ... }
export function createPersonalityComponent() { ... }
```

---

## Detailed Migration: MemoryComponent

This one is more complex - there are TWO DIFFERENT components:

1. `MemoryComponent.ts` - Tracks spatial/location memories
2. `MemoryComponentClass.ts` - Tracks episodic/semantic/procedural memories

**These are not duplicates - they serve different purposes.**

**Resolution:**
- Rename `MemoryComponent` → `SpatialMemoryComponent` (what it actually is)
- Rename `MemoryComponentClass` → `MemoryComponent` (the main memory system)
- Or merge if they should be one component

```typescript
// Option 1: Separate concerns
export class SpatialMemoryComponent extends ComponentBase {
  type = 'spatial_memory';
  // Location-based memories
}

export class MemoryComponent extends ComponentBase {
  type = 'memory';
  // Episodic, semantic, procedural memories
}

// Option 2: Merge into one
export class MemoryComponent extends ComponentBase {
  type = 'memory';

  // Episodic memories (events)
  episodic: EpisodicMemory[] = [];

  // Semantic memories (facts)
  semantic: SemanticMemory[] = [];

  // Spatial memories (locations)
  spatial: SpatialMemory[] = [];

  // Procedural memories (skills)
  procedural: ProceduralMemory[] = [];
}
```

---

## Implementation Order

### Phase 1: NeedsComponent (Highest Impact)

1. Audit all usages of `NeedsComponentLegacy` and `createNeedsComponent`
2. Update component file to single class format
3. Update all callers (likely 20-30 files)
4. Update helper functions
5. Delete legacy exports
6. Run tests, fix failures

### Phase 2: PersonalityComponent

1. Similar process
2. Likely fewer callers than Needs

### Phase 3: MemoryComponent

1. Decide: merge or rename?
2. More complex migration due to different structures
3. May require data migration for existing saves

### Phase 4: Remaining Components

1. GoalsComponent
2. SkillsComponent
3. CircadianComponent
4. Any others found

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/core/src/components/NeedsComponent.ts` | Remove legacy, update helpers |
| `packages/core/src/components/PersonalityComponent.ts` | Remove legacy, update helpers |
| `packages/core/src/components/MemoryComponent.ts` | Rename to SpatialMemoryComponent |
| `packages/core/src/components/MemoryComponentClass.ts` | Rename to MemoryComponent |
| `packages/core/src/systems/NeedsSystem.ts` | Update to use class format |
| `packages/core/src/systems/SleepSystem.ts` | Update needs checks |
| `packages/core/src/behavior/behaviors/*.ts` | Update needs/personality usage |
| `packages/world/src/entities/AgentEntity.ts` | Update component creation |
| `packages/llm/src/StructuredPromptBuilder.ts` | Update personality access |
| ~20 more files | Various updates |

---

## Verification Checklist

- [ ] No `*Legacy` interfaces remain in component files
- [ ] No `create*Component` factory functions remain (use `new Component()`)
- [ ] All helper functions take single type (not union types)
- [ ] No `||` logic for handling dual scales
- [ ] Grep for `0-100` scale values returns 0 in needs-related code
- [ ] All component types use lowercase_with_underscores per CLAUDE.md
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] Game runs without errors

---

## Breaking Changes

This migration will break:
1. **Saved games** using legacy format - need migration script
2. **Tests** that create components with factory functions
3. **External code** importing legacy types (if any)

### Save Game Migration

```typescript
function migrateNeedsComponent(legacy: any): NeedsComponent {
  // Detect legacy format by scale
  const isLegacy = legacy.hunger > 1.0 || legacy.energy > 1.0;

  if (isLegacy) {
    return new NeedsComponent({
      hunger: legacy.hunger / 100,
      energy: legacy.energy / 100,
      health: legacy.health / 100,
      thirst: (legacy.thirst ?? 100) / 100,
      temperature: legacy.temperature ?? 37,
      social: 0.5,  // New field, default
      stimulation: 0.5,  // New field, default
    });
  }

  return new NeedsComponent(legacy);
}
```

---

**End of Specification**
