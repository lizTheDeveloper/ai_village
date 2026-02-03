# Antipattern Remediation Progress

**Date:** 2024-12-24
**Status:** In Progress

## Completed Fixes ✅

### 1. Dead Code Cleanup (Complete)
**File:** `packages/core/src/systems/SeedGatheringSystem.ts`
**Impact:** Reduced file from 353 lines to 47 lines (-306 lines of commented code)
**Result:** Clear documentation of disabled system with migration requirements

### 2. Magic Numbers Constants (Complete)
**New File:** `packages/core/src/constants/GameBalance.ts`
**Impact:** Centralized 40+ magic numbers into documented constants
**Categories:**
- Behavior priorities (CRITICAL_SURVIVAL=100, DANGER=95, etc.)
- AI configuration (LLM_COOLDOWN_TICKS, VISION_RANGE, etc.)
- Sleep thresholds (FORCED_SLEEP_THRESHOLD=85, etc.)
- Social, farming, time, and movement configs

**Usage:** Import from `@ai-village/core/constants`

### 3. Silent Fallback Fixes (Partial)
**File:** `packages/core/src/systems/BuildingSystem.ts:129`
**Before:**
```typescript
return configs[buildingType] || { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 };
```
**After:**
```typescript
const config = configs[buildingType];
if (!config) {
  throw new Error(`Unknown building type: "${buildingType}". Add fuel config to BuildingSystem.ts`);
}
return config;
```
**Impact:** Unknown building types now crash immediately with clear error message

### 4. Build Verification (Complete)
- All changes compile successfully
- No TypeScript errors introduced
- `npm run build` passes

---

## Remaining Work 🚧

### High Priority

#### 1. Console.warn → Proper Errors
**Scope:** 47 instances across production code
**Effort:** Medium (requires case-by-case analysis)
**Files:**
- `packages/core/src/systems/AISystem.ts`
- `packages/renderer/src/AgentInfoPanel.ts`
- `packages/llm/src/OpenAICompatProvider.ts`
- `packages/core/src/systems/PlantSystem.ts`
- And 7 more files

**Example Fix Needed:**
```typescript
// BAD - Silently continues with invalid state
if (!plantEntity) {
  console.warn(`Plant ${plantId} not found`);
  return;
}

// GOOD - Throws error to surface bug
if (!plantEntity) {
  throw new EntityNotFoundError(`Plant ${plantId} not found`);
}
```

#### 2. Typed Event Bus
**Scope:** Core event system refactor
**Effort:** High (requires updating all event emissions and subscriptions)
**Current Issue:**
```typescript
eventBus.subscribe('action:till', (event: any) => {
  // No type safety on event.data
});
```

**Recommended Approach:**
```typescript
// 1. Define EventMap
interface GameEventMap {
  'action:till': { x: number; y: number; agentId?: string };
  'seed:gathered': { agentId: string; plantId: string; speciesId: string; seedCount: number };
  // ... 50+ more events
}

// 2. Make EventBus generic
class TypedEventBus {
  subscribe<K extends keyof GameEventMap>(
    type: K,
    handler: (data: GameEventMap[K]) => void
  ): void;
}
```

**Challenges:**
- Need to audit all event types and their payloads
- Update ~100+ event subscriptions across codebase
- Maintain backward compatibility during migration

#### 3. Component Type Interfaces
**Scope:** Replace `any` types with proper interfaces
**Effort:** High
**Files with 100+ instances:**
- `packages/llm/src/StructuredPromptBuilder.ts` - Every component cast to `any`
- `demo/src/main.ts` - 60+ event handlers typed as `any`
- `packages/core/src/systems/AISystem.ts` - Component access patterns

**Example Fix:**
```typescript
// BAD
const needs = agent.components.get('needs') as any;
const vision = agent.components.get('vision') as any;

// GOOD - Define interfaces
interface NeedsComponent {
  type: 'needs';
  hunger: number;
  energy: number;
  health: number;
}

const needs = agent.components.get<NeedsComponent>('needs');
```

### Medium Priority

#### 4. God Object Refactoring
**File:** `packages/core/src/systems/AISystem.ts` (3,341 lines)
**Effort:** Very High
**Recommendation:** Extract into focused systems:
- `BehaviorStateMachine.ts` - Core behavior switching
- `SensorySystem.ts` - Vision/hearing
- `SocialSystem.ts` - Meetings, conversations
- `FarmingBehaviors.ts` - Farm actions
- `NavigationBehaviors.ts` - Pathfinding

**Note:** This is a major refactoring that should be done incrementally

#### 5. Test Helper Cleanup
**File:** `packages/core/src/World.ts`
**Status:** Deferred (test-only code, lower priority)
**Issue:** Component registry uses silent fallbacks, but only impacts tests

---

## Impact Summary

### Completed
- **306 lines** of dead code removed
- **40+ magic numbers** now centralized and documented
- **1 critical silent fallback** fixed (BuildingSystem)
- **Build stability** maintained

### Remaining
- **47 console.warn** instances need error handling
- **100+ any types** need proper interfaces
- **Event bus** needs type safety
- **God object** needs decomposition

---

## Recommendations for Next Steps

1. **Quick Win:** Replace console.warn in critical paths (AISystem, BuildingSystem)
2. **Medium Term:** Create component type interfaces (week-long effort)
3. **Long Term:** Typed event bus migration (major version change)
4. **Strategic:** Plan AISystem decomposition (requires architectural design)

---

## Notes

- All fixes follow CLAUDE.md guidelines: fail fast, no silent fallbacks
- Constants file enables easier game balance tuning
- Build remains stable after all changes
- Test suite status: Not run (recommend running full suite)
