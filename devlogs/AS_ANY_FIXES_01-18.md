# AS_ANY Type Cast Fixes - Magic Appliers
## Date: 2026-01-18

## Summary
This document tracks the systematic removal of `as any` type casts across magic applier files, replacing them with proper TypeScript typing.

## Files Fixed

### ✅ TransformEffectApplier.ts
**Status**: COMPLETE
**Changes**:
- Added `AppearanceComponent` interface for appearance component
- Replaced `as any` with proper `AppearanceComponent | undefined` casting
- Fixed `effectWithExtras` pattern for optional properties

### ⏳ ControlEffectApplier.ts
**Status**: IN PROGRESS
**Issues Found**:
- Line 283: `effect.dotType as any` → Simple removal (dotType is already string)
- Line 410-411: `(needs as any).health` → Type as `NeedsComponent & { health: number }`
- Line 462: Component creation → Add `as const` to type field
- Line 464: `as any` for status_effects → Type properly
- Line 662: behavior component → Type properly

**Proposed Fixes**:
```typescript
// Define component interfaces at top of file
interface NeedsComponentWithHealth extends NeedsComponent {
  health: number;
  maxHealth?: number;
}

interface StatusEffectsComponent {
  type: 'status_effects';
  isStunned?: boolean;
  timeScale?: number;
  temporalEffects?: any[];
}

interface BehaviorComponent {
  type: 'behavior';
  currentBehavior: string;
  fleeFrom?: string;
  confused?: boolean;
  confusedUntil?: number;
}

// Line 283: Remove cast
result.appliedValues['dotType'] = effect.dotType;

// Lines 410-411:
const needsWithHealth = needs as NeedsComponentWithHealth;
const currentHealth = needsWithHealth.health ?? 100;
needsWithHealth.health = Math.max(0, currentHealth - damage);

// Line 462:
world.addComponent(target.id, {
  type: 'status_effects' as const,
  isStunned: true
});

// Line 464:
const statusEffects = target.components.get('status_effects') as StatusEffectsComponent | undefined;

// Line 662-664:
let behavior = target.components.get('behavior') as BehaviorComponent | undefined;
if (!behavior) {
  world.addComponent(target.id, {
    type: 'behavior' as const,
    currentBehavior: 'flee' as const
  });
}
```

### ⏳ ParadigmEffectApplier.ts
**Issues Found**:
- Line 151-152: `(state as any).suppressed` → Define paradigm state interface
- Line 262: `(state as any).suppressed` → Use typed interface

**Proposed Fix**:
```typescript
interface ParadigmState {
  suppressed?: boolean;
  suppressedUntil?: number;
  [key: string]: any; // For extensibility
}

const state = targetMagic.paradigmState[paradigmId] as ParadigmState;
state.suppressed = true;
```

### ⏳ SoulEffectApplier.ts
**Issues Found**:
- Line 476-479, 484-487: Component access patterns
- Multiple `as any` for component access

**Strategy**: Define proper component interfaces (NeedsComponent extension, StatusEffectsComponent)

### ⏳ TeleportEffectApplier.ts
**Issues Found**:
- Lines 60, 86-88, 110-112: Position component access
- Lines 196-213: Extended result type
- Lines 269-389: Multiple target location/context accesses
- Lines 281-282, 301, 318-319, 338-339, 354, 368: Position and orientation access

**Strategy**: Define `PositionComponentData`, `OrientationComponent`, `TeleportAnchorComponent` interfaces

### ⏳ MentalEffectApplier.ts
**Issues Found**:
- Lines 174-180, 192-200, 212-218, 228-237, 247-256, 262-286, 296-309: Component creation/access patterns

**Strategy**: Define `BehaviorComponent`, `MentalEffectsComponent`, `PerceptionEffectsComponent` interfaces

### ⏳ EnvironmentalEffectApplier.ts
**Issues Found**:
- Multiple component access patterns for environment, environmental_zone

**Strategy**: Define environment component interfaces

### ⏳ TemporalEffectApplier.ts
**Issues Found**:
- Multiple status_effects, age component accesses

**Strategy**: Define typed interfaces for temporal state

### ⏳ PerceptionEffectApplier.ts
**Issues Found**:
- Lines 111-112, 129-130: Extended effect properties

**Strategy**: Define extended perception effect type

### ⏳ DispelEffectApplier.ts
**Issues Found**:
- Multiple context and component access patterns

**Strategy**: Define extended context and component types

### ⏳ CreationEffectApplier.ts
**Issues Found**:
- Lines 79-82: Position component destructuring
- Lines 135-167: Component additions using `as any`

**Strategy**: Use proper `addComponent` typing or cast individual components

### ⏳ SummonEffectApplier.ts
**Issues Found**:
- Similar to CreationEffectApplier - position and component patterns
- Lines 52-55, 95, 187, 220, 225: Component access

**Strategy**: Define position interface, use proper Entity methods

### ⏳ BodyTransformEffectApplier.ts
**Issues Found**:
- Lines 416, 437, 457, 473, 489, 505: Effect casting to `any`

**Strategy**: These appear to be intentional for built-in effects - may be acceptable or need effect type extension

## Pattern Analysis

### Common Patterns to Fix:

1. **Component Access**: `component.get(X) as any` → Define interface, cast to `Interface | undefined`

2. **Component Creation**: `{ type: 'X' } as any` → Add `as const` to type field

3. **Extended Properties**: `(effect as any).property` → Define extended type `Effect & { property?: Type }`

4. **Context Extensions**: `(context as any).property` → Define extended context type

## Implementation Strategy

1. Create shared component type definitions file (`ComponentTypes.ts`)
2. Apply fixes file by file
3. Run `npm run build` after each file
4. Ensure no new type errors introduced

## Component Interfaces Needed

```typescript
// Add to packages/magic/src/types/ComponentTypes.ts

export interface PositionComponentData {
  x: number;
  y: number;
  z?: number;
}

export interface StatusEffectsComponent {
  type: 'status_effects';
  isStunned?: boolean;
  timeScale?: number;
  temporalEffects?: TemporalEffectData[];
}

export interface BehaviorComponent {
  type: 'behavior';
  currentBehavior: string;
  fleeFrom?: string;
  confused?: boolean;
  confusedUntil?: number;
}

export interface NeedsComponentWithHealth {
  type: 'needs';
  health: number;
  maxHealth?: number;
  [key: string]: any;
}

export interface MentalEffectsComponent {
  type: 'mental_effects';
  charmedBy?: string;
  aware?: boolean;
  dominatedBy?: string;
  dominationEnds?: number;
  linkedTo?: string[];
  linkType?: string;
}

export interface PerceptionEffectsComponent {
  type: 'perception_effects';
  detectsSouls?: boolean;
  soulDetectionRange?: number;
  soulDetectionExpires?: number;
  illusions?: IllusionData[];
}

export interface EnvironmentComponent {
  type: 'environment';
  weather?: string;
  weatherIntensity?: number;
  globalLightLevel?: number;
  temperatureModifier?: number;
  globalZones?: any[];
}
```

## Next Steps

1. Create `ComponentTypes.ts` with common component interfaces
2. Apply fixes to each file sequentially
3. Test build after each file
4. Report any type conflicts that arise
