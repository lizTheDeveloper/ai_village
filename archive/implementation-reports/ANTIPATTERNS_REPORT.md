# AI Village Codebase Antipattern Report

**Date:** 2024-12-24
**Reviewed By:** Claude Code
**Scope:** `custom_game_engine/` TypeScript codebase

---

## Executive Summary

This report identifies antipatterns that will cause long-term maintenance burden, make bugs harder to find, and slow down development velocity. The codebase shows signs of rapid iteration with technical debt accumulating in several areas.

**Critical Issues:** 3
**High Severity:** 4
**Medium Severity:** 3

---

## Critical Issues

### 1. Pervasive Silent Fallbacks (Violates CLAUDE.md)

**Severity:** Critical
**Impact:** Bugs are masked, invalid states propagate silently

The codebase guidelines in `CLAUDE.md` explicitly prohibit silent fallbacks, yet they are widespread:

**Location:** `packages/core/src/World.ts:25-56`
```typescript
// BAD: Every field has a silent fallback
'Agent': (data: any) => ({
  behavior: data.behavior || 'wander',      // Masks missing behavior
  behaviorState: data.behaviorState || {},  // Masks missing state
  thinkInterval: data.thinkInterval || 20,  // Masks missing config
  lastThinkTick: data.lastThinkTick || 0,
  llmCooldown: data.llmCooldown || 0,
}),
'Position': (data: any) => createPositionComponent(data.x || 0, data.y || 0),
'Resource': (data: any) => ({
  amount: data.amount || 0,           // Critical game data shouldn't default
  regenerationRate: data.regenerationRate || 0,
}),
```

**Additional Locations:**
- `demo/src/main.ts:991-992` - Resource colors/icons fallback
- `packages/core/src/systems/BuildingSystem.ts:129` - Building config fallback
- `packages/core/src/systems/PlantSystem.ts:64,292,617` - Plant data fallbacks

**Recommendation:** Validate data at boundaries and throw explicit errors:
```typescript
'Agent': (data: AgentData) => {
  if (!data.behavior) throw new Error('Agent requires behavior field');
  return { ...data, type: 'agent', version: 1 };
},
```

---

### 2. Massive God Objects

**Severity:** Critical
**Impact:** Hard to test, understand, and modify; high coupling

| File | Lines | Issue |
|------|-------|-------|
| `packages/core/src/systems/AISystem.ts` | **3,341** | Contains 20+ behavior handlers, LLM integration, vision, hearing, meetings, farming, navigation |
| `demo/src/main.ts` | **1,872** | Game initialization, event handling, UI wiring, debugging all mixed |
| `packages/renderer/src/Renderer.ts` | **1,248** | Rendering, entity iteration, camera, UI coordination |
| `packages/llm/src/StructuredPromptBuilder.ts` | **888** | Prompt building, inventory analysis, social context, building suggestions |

**AISystem.ts specifically** violates single responsibility:
- Agent behavior state machine
- LLM decision queuing
- Vision/hearing processing
- Meeting coordination
- Farming/tilling behaviors
- Navigation/exploration behaviors
- Building behaviors
- Priority calculation

**Recommendation:** Extract into focused systems:
- `BehaviorStateMachine.ts` - Core behavior switching
- `SensorySystem.ts` - Vision/hearing processing
- `SocialSystem.ts` - Meetings, conversations
- `FarmingBehaviors.ts` - Farm-related behaviors
- `NavigationBehaviors.ts` - Pathfinding behaviors

---

### 3. Excessive `any` Type Usage

**Severity:** Critical
**Impact:** TypeScript's benefits completely negated; runtime errors

Found **100+** instances of `: any` or `as any` in production code:

**Worst Offenders:**

`packages/llm/src/StructuredPromptBuilder.ts:22-30`:
```typescript
buildPrompt(agent: Entity, world: any): string {
  const name = agent.components.get('identity') as any;
  const personality = agent.components.get('personality') as any;
  const needs = agent.components.get('needs') as any;
  const vision = agent.components.get('vision') as any;
  const memory = agent.components.get('memory') as any;
  const inventory = agent.components.get('inventory') as any;
  // Every component is cast to any!
```

`demo/src/main.ts` - 60+ event handlers all typed as `any`:
```typescript
gameLoop.world.eventBus.subscribe('action:till', (event: any) => {
gameLoop.world.eventBus.subscribe('action:water', (event: any) => {
gameLoop.world.eventBus.subscribe('soil:tilled', (event: any) => {
// No type safety on any event data
```

`packages/core/src/systems/AISystem.ts:115-116`:
```typescript
const circadian = impl.getComponent('circadian') as any;
const temperature = impl.getComponent('temperature') as any;
```

**Recommendation:** Define proper interfaces for all components and events:
```typescript
interface TillEvent {
  type: 'action:till';
  source: string;
  data: { x: number; y: number; agentId?: string };
}

eventBus.subscribe<TillEvent>('action:till', (event) => {
  // event.data is now typed
});
```

---

## High Severity Issues

### 4. Console.warn Used for Errors (Violates CLAUDE.md)

**Severity:** High
**Impact:** Errors continue execution with invalid state

Found 47 instances of `console.warn` that should throw:

`packages/core/src/systems/SeedGatheringSystem.ts:70-80`:
```typescript
if (!plantEntity) {
  console.warn(`[SeedGatheringSystem] Plant ${plantId} not found`);
  this.clearAgentAction(agent);  // Silently continues!
  return;
}
```

`packages/renderer/src/AgentInfoPanel.ts:52-59`:
```typescript
if (!this.world?.getEntity) {
  console.warn('[AgentInfoPanel] World not available');
  return;  // Panel renders with stale data
}
```

`packages/llm/src/OpenAICompatProvider.ts:239-240`:
```typescript
console.warn(`[OpenAICompatProvider] Tool calling failed, falling back to text-based parsing`);
// Silently degrades - caller never knows
```

**Recommendation:** Throw errors or return Result types:
```typescript
if (!plantEntity) {
  throw new EntityNotFoundError(`Plant ${plantId} not found`);
}
```

---

### 5. Magic Numbers Throughout

**Severity:** High
**Impact:** Unclear intent, hard to tune, inconsistent values

`packages/core/src/systems/AISystem.ts` contains dozens of magic numbers:

```typescript
private readonly llmRequestCooldown: number = 60; // What is 60? Ticks? Seconds?
llmCooldown: 1200, // 1 minute cooldown at 20 TPS
if (circadian.sleepDrive > 85) // Why 85?
Math.random() < 0.15 // 15% chance - why?
const nearbyAgents = this.getNearbyAgents(impl, world, 15); // 15 what? tiles?
```

Priority values with no central definition:
```typescript
case 'forced_sleep': return 100;
case 'flee': return 95;
return 90; // What makes 90 special?
case 'seek_food': return 40;
case 'deposit_items': return 60;
```

**Recommendation:** Create constants file:
```typescript
// constants/GameBalance.ts
export const BEHAVIOR_PRIORITIES = {
  CRITICAL_SURVIVAL: 100,
  DANGER: 90,
  IMPORTANT: 60,
  MODERATE: 40,
  LOW: 10,
} as const;

export const AI_CONFIG = {
  LLM_COOLDOWN_TICKS: 60,
  GATHER_CHANCE: 0.15,
  VISION_RANGE_TILES: 15,
} as const;
```

---

### 6. Dead/Disabled Code Left in Place

**Severity:** High
**Impact:** Confusion, maintenance burden, build complexity

`packages/core/src/systems/SeedGatheringSystem.ts` is 95% commented out:
```typescript
update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
  // TODO: This system needs to be updated to use ActionQueue
  // Temporarily disabled to fix build errors
  return;

  /*
  // 300+ lines of commented code...
  */
}
```

Similar issues in:
- `demo/src/main.ts:1673-1697` - 25 lines of commented event handlers
- `packages/world/src/plant-species/index.ts:48-50` - Disabled exports

**Recommendation:** Either complete the migration or delete the code. Git preserves history.

---

### 7. Untyped Event Bus

**Severity:** High
**Impact:** No compile-time validation of event payloads

The event system has no type safety:

```typescript
// Emitting - no validation
world.eventBus.emit({
  type: 'seed:gathered',
  source: agent.id,
  data: {
    agentId: agent.id,
    plantId: plantEntity.id,
    // Typo here would compile fine:
    specesId: plant.speciesId,  // No error!
  }
});

// Subscribing - no type inference
gameLoop.world.eventBus.subscribe('seed:gathered', (event: any) => {
  // event.data.speciesId could be undefined and we'd never know
});
```

**Recommendation:** Create typed event definitions:
```typescript
interface EventMap {
  'seed:gathered': { agentId: string; plantId: string; speciesId: string; seedCount: number };
  'plant:died': { entityId: string; cause: 'drought' | 'frost' | 'disease' };
  'action:till': { x: number; y: number; agentId?: string };
}

class TypedEventBus {
  emit<K extends keyof EventMap>(type: K, data: EventMap[K]): void;
  subscribe<K extends keyof EventMap>(type: K, handler: (data: EventMap[K]) => void): void;
}
```

---

## Medium Severity Issues

### 8. Inconsistent Component Access Patterns

**Severity:** Medium
**Impact:** Cognitive load, easy to introduce bugs

Components accessed three different ways:

```typescript
// Pattern 1: getComponent with type assertion
const agent = impl.getComponent<AgentComponent>('agent')!;

// Pattern 2: components.get with as any
const personality = agent.components.get('personality') as any;

// Pattern 3: Class-based components
const trustNetwork = new TrustNetworkComponent(data);
```

**Recommendation:** Standardize on typed getComponent pattern with proper interfaces.

---

### 9. TODOs Without Tracking

**Severity:** Medium
**Impact:** Forgotten work, incomplete features shipping

Found 20+ TODOs in production code without issue tracking:

```typescript
// packages/core/src/systems/SoilSystem.ts:67
* TODO: Add agentId parameter for tool checking when agent-initiated tilling

// packages/core/src/actions/AgentAction.ts:102
return { type: 'talk', targetId: 'nearest' }; // TODO: Parse specific target

// packages/core/src/systems/AISystem.ts:2562
// TODO: Integrate with TemperatureSystem when temperature component is available

// packages/llm/src/AgentContextBuilder.ts:32
distance: Math.random() * 10, // TODO: Calculate actual distance
```

**Recommendation:** Convert TODOs to GitHub issues with proper tracking.

---

### 10. Tight Coupling via Global Event Bus

**Severity:** Medium
**Impact:** Hard to test in isolation, hidden dependencies

`demo/src/main.ts` subscribes to 20+ events from core systems, creating invisible coupling:

```typescript
gameLoop.world.eventBus.subscribe('action:till', ...);
gameLoop.world.eventBus.subscribe('action:water', ...);
gameLoop.world.eventBus.subscribe('action:fertilize', ...);
gameLoop.world.eventBus.subscribe('agent:action:completed', ...);
gameLoop.world.eventBus.subscribe('agent:action:started', ...);
gameLoop.world.eventBus.subscribe('agent:action:failed', ...);
gameLoop.world.eventBus.subscribe('soil:tilled', ...);
gameLoop.world.eventBus.subscribe('soil:watered', ...);
// ... 12 more
```

**Recommendation:** Create explicit integration layer or use dependency injection.

---

## Summary of Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Add strict component validation, remove `|| fallback` | Medium |
| 2 | Type the event bus with EventMap | Medium |
| 3 | Extract AISystem into focused systems | High |
| 4 | Replace `console.warn` with proper errors | Low |
| 5 | Create constants file for magic numbers | Low |
| 6 | Delete or complete SeedGatheringSystem | Low |
| 7 | Define proper component interfaces | High |
| 8 | Convert TODOs to tracked issues | Low |

---

## Appendix: Files Requiring Immediate Attention

1. `packages/core/src/World.ts` - Silent fallbacks in component factories
2. `packages/core/src/systems/AISystem.ts` - God object, magic numbers
3. `packages/llm/src/StructuredPromptBuilder.ts` - Pervasive `any` types
4. `demo/src/main.ts` - Untyped events, mixed concerns
5. `packages/core/src/systems/SeedGatheringSystem.ts` - Dead code
