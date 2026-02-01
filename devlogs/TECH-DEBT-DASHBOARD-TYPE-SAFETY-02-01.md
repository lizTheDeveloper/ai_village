# Dashboard Views Type Safety Fixes - February 1, 2026

## Overview

Fixed dangerous type assertions (`as unknown as`) in 4 dashboard view files, replacing them with proper typed component access. This resolves violations of CLAUDE.md guidelines that explicitly prohibit type assertion escape hatches.

## Files Modified

1. `/home/user/ai_village/custom_game_engine/packages/core/src/dashboard/views/AgentInfoView.ts`
2. `/home/user/ai_village/custom_game_engine/packages/core/src/dashboard/views/RelationshipsView.ts`
3. `/home/user/ai_village/custom_game_engine/packages/core/src/dashboard/views/MemoryView.ts`
4. `/home/user/ai_village/custom_game_engine/packages/core/src/dashboard/views/PopulationView.ts`

## Changes Made

### Pattern Replaced

**BEFORE (Unsafe):**
```typescript
const agent = entity.components.get('agent') as unknown as {
  currentBehavior?: string;
  currentAction?: string;
  age?: number;
} | undefined;
```

**AFTER (Type-safe):**
```typescript
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { AgentComponent } from '../../components/AgentComponent.js';

const agent = entity.getComponent<AgentComponent>(CT.Agent);
```

### Specific Fixes

#### 1. AgentInfoView.ts (15+ unsafe casts removed)
- Added imports for component types: `AgentComponent`, `IdentityComponent`, `NeedsComponent`, `SkillsComponent`, `InventoryComponent`, `PositionComponent`
- Replaced all `entity.components.get()` calls with typed `entity.getComponent<T>(CT.Type)`
- Fixed NeedsComponent value handling: converted from 0-1 scale to 0-100 scale for display (was incorrectly assuming 0-100 with maxHunger/maxEnergy fields that don't exist)

#### 2. RelationshipsView.ts (5+ unsafe casts removed + 1 bug fix)
- Added imports for component types: `AgentComponent`, `RelationshipComponent`, `PersonalityComponent`, `IdentityComponent`
- **BUG FIX**: Changed from non-existent `'social'` component to correct `'relationship'` component (CT.Relationship)
- Fixed relationship field mapping:
  - `rel.strength` → `rel.affinity` (actual field in RelationshipComponent)
  - `rel.type` → derived from `affinity` and `romantic.bondType`
- Fixed sociability field: `personality.sociability` → `personality.extraversion` (actual field)
- Replaced unsafe casts for target agent name lookup

#### 3. MemoryView.ts (6+ unsafe casts removed)
- Added imports for component types: `AgentComponent`, `IdentityComponent`, `EpisodicMemoryComponent`, `SemanticMemoryComponent`, `ReflectionComponent`, `JournalComponent`
- Fixed memory property access: `episodicMemory.memories` → `episodicMemory.episodicMemories` (actual getter name)
- Replaced type assertions with explicit mapping to view interface types
- Properly mapped EpisodicMemory → MemoryEntry, SemanticBelief → Belief, Reflection → Reflection (view interface)

#### 4. PopulationView.ts (2+ unsafe casts removed)
- Added imports for component types: `AgentComponent`, `NeedsComponent`
- Fixed agent property access: used `agent.behavior` and `agent.age` directly
- Fixed needs value handling: converted from 0-1 scale to 0-100 scale for comparison

## Technical Details

### Component Access Pattern

The codebase has proper typed component access via `Entity.getComponent()`:
```typescript
// Entity interface provides two overloads:
getComponent<K extends keyof ComponentTypeMap>(type: K): ComponentTypeMap[K] | undefined;
getComponent<T extends Component>(type: ComponentType): T | undefined;
```

Using `entity.components.get()` bypasses this type safety and returns untyped `Component | undefined`.

### Component Types

All component types are enumerated in `ComponentType` enum:
- `ComponentType.Agent = 'agent'`
- `ComponentType.Needs = 'needs'`
- `ComponentType.Relationship = 'relationship'`
- etc.

### NeedsComponent Scale

NeedsComponent uses 0-1 scale for all values (not 0-100):
- `hunger: number` (0.0 = starving, 1.0 = full)
- `energy: number` (0.0 = exhausted, 1.0 = energized)
- `health: number` (0.0 = dead, 1.0 = healthy)

No `maxHunger`, `maxEnergy`, or `maxHealth` fields exist - they're always assumed to be 1.0.

## Bugs Fixed

1. **RelationshipsView**: Was trying to access non-existent `'social'` component instead of `'relationship'` component
2. **RelationshipsView**: Was accessing non-existent `strength` and `type` fields on Relationship (should be `affinity` and derived type)
3. **RelationshipsView**: Was accessing non-existent `sociability` field on PersonalityComponent (should be `extraversion`)
4. **AgentInfoView**: Was assuming NeedsComponent had `maxHunger/maxEnergy/maxHealth` fields (don't exist, values are 0-1 scale)
5. **PopulationView**: Same NeedsComponent scale issue
6. **MemoryView**: Was accessing `episodicMemory.memories` (should be `episodicMemory.episodicMemories`)

## Verification

Build check: No TypeScript errors in modified files
```bash
cd custom_game_engine/packages/core && npx tsc --noEmit
# No errors in dashboard/views/* files
```

## CLAUDE.md Compliance

✅ **Rule 3 (No Type Assertion Escape Hatches)**: All `as unknown as` casts removed
✅ **Rule 2 (No Silent Fallbacks)**: Components properly validated before use
✅ Proper type guards and null checks maintained

## Migration Pattern

For future dashboard views or similar code, use this pattern:

```typescript
// 1. Import ComponentType enum
import { ComponentType as CT } from '../../types/ComponentType.js';

// 2. Import component type interfaces
import type { SomeComponent } from '../../components/SomeComponent.js';

// 3. Use typed getComponent
const comp = entity.getComponent<SomeComponent>(CT.SomeType);

// 4. Check for null before use
if (!comp) {
  // Handle missing component
  return;
}

// 5. Access properties directly - TypeScript knows the type
const value = comp.someProperty;
```

## Impact

- **Type Safety**: Full TypeScript type checking on all component access
- **Maintainability**: Changes to component interfaces will now be caught at compile time
- **Bug Prevention**: Eliminated entire class of "undefined property" runtime errors
- **Code Quality**: Follows established codebase patterns and CLAUDE.md guidelines
