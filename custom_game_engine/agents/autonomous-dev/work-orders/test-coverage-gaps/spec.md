# Test Coverage Gaps

## Overview

Code review found that **74% of core systems have no tests** (29 out of 39 systems). Many existing tests are shallow (happy-path only) or use heavy mocking that doesn't test real behavior. This work order prioritizes test creation.

---

## 1. Critical Systems Without Tests

### Tier 1: Large Complex Systems (>500 lines) - HIGHEST PRIORITY

| System | Lines | Why Critical |
|--------|-------|--------------|
| `PlantSystem.ts` | 940 | Core farming gameplay, plant lifecycle |
| `BuildingSystem.ts` | 888 | Core construction, resource consumption |
| `MetricsCollectionSystem.ts` | 764 | Telemetry, debugging, analytics |
| `GoalGenerationSystem.ts` | 620 | Agent AI, goal-driven behavior |
| `TradingSystem.ts` | 541 | Economy, resource exchange |
| `ResearchSystem.ts` | 538 | Tech progression |
| `MoodSystem.ts` | 532 | Emotional state, behavior modifiers |

### Tier 2: Core Gameplay Systems - HIGH PRIORITY

| System | Lines | Why Critical |
|--------|-------|--------------|
| `NeedsSystem.ts` | ~200 | Fundamental agent survival |
| `TimeSystem.ts` | ~150 | Time progression, all systems depend on it |
| `MovementSystem.ts` | ~250 | Agent movement, collision |
| `ResourceGatheringSystem.ts` | 62 | Resource regeneration |
| `CommunicationSystem.ts` | 240 | Social interactions |

### Tier 3: Supporting Systems - MEDIUM PRIORITY

| System | Lines |
|--------|-------|
| `AnimalHousingSystem.ts` | ~200 |
| `AnimalSystem.ts` | 240 |
| `AnimalProductionSystem.ts` | ~200 |
| `WeatherSystem.ts` | ~150 |
| `TemperatureSystem.ts` | ~200 |
| `SocialGradientSystem.ts` | ~200 |
| `SkillSystem.ts` | ~300 |
| `MarketEventSystem.ts` | ~200 |
| `GovernanceDataSystem.ts` | 379 |

---

## 2. Action Handlers Without Tests

Only 4 of 14 action handlers have tests:

| Handler | Has Tests | Priority |
|---------|-----------|----------|
| `TillActionHandler.ts` | Partial (skipped) | HIGH |
| `HarvestActionHandler.ts` | Yes | - |
| `PlantActionHandler.ts` | No | HIGH |
| `CraftActionHandler.ts` | No | HIGH |
| `TradeActionHandler.ts` | No | MEDIUM |
| `GatherSeedsActionHandler.ts` | No | MEDIUM |
| `AnimalHousingActions.ts` | No | MEDIUM |
| `ActionQueue.ts` | No | HIGH |
| `ActionQueueClass.ts` | No | HIGH |

---

## 3. Behavior Classes Without Tests

Only 4 of 31+ behaviors have tests:

**No tests - HIGH PRIORITY (core gameplay):**
- `BuildBehavior.ts`
- `CraftBehavior.ts`
- `GatherBehavior.ts` (partial - see existing)
- `FarmBehaviors.ts`
- `SeekFoodBehavior.ts`
- `SleepBehavior.ts`

**No tests - MEDIUM PRIORITY:**
- `NavigationBehaviors.ts`
- `TradeBehavior.ts`
- `AnimalBehaviors.ts`
- `MeetingBehaviors.ts`

**No tests - LOW PRIORITY (simpler):**
- `IdleBehavior.ts`
- `WanderBehavior.ts`
- `ObserveBehavior.ts`
- `ReflectBehavior.ts`
- `SitQuietlyBehavior.ts`

---

## 4. Shallow/Problematic Tests to Improve

### 4.1 Tests with All Assertions Skipped

**JournalingSystem.test.ts**
```typescript
describe.skip('journaling', () => {
  // ALL tests skipped - "component access issue"
});
```
**Action:** Fix component access issue, un-skip tests.

### 4.2 Tests with Placeholder Assertions

Already covered in `fake-implementations-cleanup` work order.

### 4.3 Tests with Heavy Mocking

**AgentBrainSystem.test.ts**
```typescript
function createMockWorld(): World {
  return {
    query: vi.fn().mockReturnValue({
      executeEntities: vi.fn().mockReturnValue([]),  // Always empty!
    }),
  } as unknown as World;
}
```

**Problem:** Tests pass queries that return empty arrays, so real entity behavior is never tested.

**Fix:** Create tests with real entities:
```typescript
function createTestWorld(): World {
  const world = new World();
  const agent = world.createEntity();
  agent.addComponent(new AgentComponent());
  agent.addComponent(new PositionComponent(10, 10));
  agent.addComponent(new NeedsComponent());
  return world;
}
```

---

## 5. Missing Error Path Tests

Per CLAUDE.md, errors should crash with clear messages. Tests should verify this:

```typescript
describe('error handling', () => {
  it('throws when entity lacks required component', () => {
    const entity = createEntityWithoutNeeds();

    expect(() => {
      needsSystem.update([entity], 16);
    }).toThrow(/missing required 'needs' component/);
  });

  it('throws for unknown plant species', () => {
    const plant = createPlantWithSpecies('nonexistent');

    expect(() => {
      plantSystem.updatePlant(plant);
    }).toThrow(/Unknown plant species/);
  });
});
```

**Systems needing error path tests:**
- All systems after `silent-fallback-violations` work order is complete
- Especially: PlantSystem, NeedsSystem, BuildingSystem, MemoryFormationSystem

---

## 6. Test Template

Use this template for new system tests:

```typescript
// packages/core/src/systems/__tests__/XxxSystem.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../ecs/World';
import { XxxSystem } from '../XxxSystem';
import { XxxComponent } from '../../components/XxxComponent';

describe('XxxSystem', () => {
  let world: World;
  let system: XxxSystem;

  beforeEach(() => {
    world = new World();
    system = new XxxSystem();
    world.registerSystem(system);
  });

  describe('initialization', () => {
    it('registers with correct priority', () => {
      expect(system.priority).toBe(EXPECTED_PRIORITY);
    });

    it('subscribes to required events', () => {
      // Verify event subscriptions
    });
  });

  describe('update', () => {
    it('processes entities with required components', () => {
      const entity = createEntityWithComponents(world);

      system.update(16);

      expect(entity.getComponent('xxx').value).toBe(expectedValue);
    });

    it('skips entities without required components', () => {
      const entity = createEntityWithoutComponents(world);

      // Should not throw
      system.update(16);
    });
  });

  describe('error handling', () => {
    it('throws for invalid state', () => {
      const entity = createInvalidEntity(world);

      expect(() => system.update(16)).toThrow(/expected error message/);
    });
  });

  describe('edge cases', () => {
    it('handles empty entity list', () => {
      system.update(16);
      // Should not throw
    });

    it('handles maximum values', () => {
      // Test boundary conditions
    });
  });
});
```

---

## 7. Implementation Priority

### Week 1: Critical Systems
1. `PlantSystem.test.ts` - Plant growth, lifecycle, harvesting
2. `BuildingSystem.test.ts` - Construction, resource consumption
3. `NeedsSystem.test.ts` - Hunger, energy, health decay

### Week 2: Core Gameplay
4. `TimeSystem.test.ts` - Time progression, day/night
5. `ActionQueue.test.ts` - Action queuing, execution
6. `TillActionHandler.test.ts` - Un-skip and implement

### Week 3: Economy & Social
7. `TradingSystem.test.ts` - Trade mechanics
8. `CommunicationSystem.test.ts` - Conversations
9. `GoalGenerationSystem.test.ts` - Goal creation

### Week 4: Behaviors
10. `BuildBehavior.test.ts`
11. `CraftBehavior.test.ts`
12. `FarmBehaviors.test.ts`

### Ongoing: Error Path Tests
- Add error handling tests after each `silent-fallback-violations` fix

---

## 8. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Systems with tests | 10 (25%) | 30 (77%) |
| Action handlers with tests | 4 (28%) | 12 (85%) |
| Behaviors with tests | 4 (13%) | 15 (48%) |
| Skipped tests | 12+ | 0 |
| Placeholder assertions | 28 | 0 |

---

## 9. Verification

```bash
# Run all tests
npm run test

# Check coverage (if configured)
npm run test -- --coverage

# Find skipped tests
grep -rn "\.skip\|it\.skip\|describe\.skip" packages/core/src/**/*.test.ts
```

---

**End of Specification**
