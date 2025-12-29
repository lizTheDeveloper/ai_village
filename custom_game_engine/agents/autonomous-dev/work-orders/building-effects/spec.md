# Building Effects System Specification

## Overview

Buildings can provide area-of-effect bonuses and automation capabilities through their `functionality` array. This spec defines how the four unimplemented building function types should work:

1. **mood_aura** - Passive mood bonus to nearby agents
2. **gathering_boost** - Increased gathering yield in radius
3. **research** - Research speed bonus when working at building
4. **automation** - Automated task execution

## Current State

The `BuildingBlueprint.functionality` array is defined but only partially consumed:

| Type | Status | Consumer |
|------|--------|----------|
| `crafting` | Implemented | CraftingSystem |
| `storage` | Implemented | BuildingSystem (adds InventoryComponent) |
| `sleeping` | Implemented | SleepSystem (uses restBonus) |
| `shop` | Implemented | BuildingSystem (adds ShopComponent) |
| `research` | **Not Implemented** | - |
| `gathering_boost` | **Not Implemented** | - |
| `mood_aura` | **Not Implemented** | - |
| `automation` | **Not Implemented** | - |

---

## 1. Mood Aura System

### Purpose
Buildings with `mood_aura` functionality passively boost the mood of agents within their radius.

### Type Definition (existing)
```typescript
{ type: 'mood_aura'; moodBonus: number; radius: number }
```

### Behavior

1. **Radius Check**: Every tick, find agents within `radius` tiles of the building
2. **Mood Application**: Apply `moodBonus` to agent's mood (additive, not multiplicative)
3. **Stacking**: Multiple mood auras stack, but with diminishing returns
4. **Refresh Rate**: Check every 60 ticks (1 second) to avoid per-tick overhead

### Implementation: MoodAuraSystem

```typescript
interface MoodAuraSystem extends System {
  id: 'mood_aura';
  priority: 45; // Run before NeedsSystem
  requiredComponents: ['building', 'position'];
}
```

**Algorithm:**
```
for each completed building with mood_aura functionality:
  get all agents within radius
  for each agent:
    calculate total mood bonus (with diminishing returns if multiple sources)
    add to agent's NeedsComponent.mood (clamped 0-100)
```

### Diminishing Returns Formula
```typescript
function calculateStackedMoodBonus(bonuses: number[]): number {
  // Sort descending, apply 100%, 50%, 25%, 12.5%... to each
  const sorted = bonuses.sort((a, b) => b - a);
  let total = 0;
  let multiplier = 1.0;
  for (const bonus of sorted) {
    total += bonus * multiplier;
    multiplier *= 0.5;
  }
  return total;
}
```

### Buildings Using This
| Building | moodBonus | radius |
|----------|-----------|--------|
| campfire | 5 | 3 |
| garden_fence | 2 | 2 |
| monument | 15 | 8 |
| grand_hall | 25 | 15 |

### Events Emitted
- `building:mood_aura:applied` - { buildingId, agentIds, bonus }

---

## 2. Gathering Boost System

### Purpose
Buildings with `gathering_boost` increase resource yields when gathering within their radius.

### Type Definition (existing)
```typescript
{ type: 'gathering_boost'; resourceTypes: string[]; radius: number }
```

### Behavior

1. **Trigger**: When an agent gathers a resource, check if within radius of a gathering_boost building
2. **Filter**: Only apply if gathered resource type is in `resourceTypes` (empty = all types)
3. **Bonus**: Multiply yield by 1.25 (25% bonus per building, stackable)
4. **Stacking**: Multiplicative - two buildings = 1.25 * 1.25 = 1.5625x

### Implementation: Modify ResourceGatheringSystem

Rather than a new system, modify `ResourceGatheringSystem.gatherResource()`:

```typescript
// In ResourceGatheringSystem
private calculateGatheringBonus(
  agentPosition: Position,
  resourceType: string,
  world: World
): number {
  let multiplier = 1.0;

  const buildings = world.query()
    .with('building')
    .with('position')
    .executeEntities();

  for (const building of buildings) {
    const buildingComp = building.getComponent<BuildingComponent>('building');
    if (!buildingComp.isComplete) continue;

    const blueprint = getBlueprintForBuilding(buildingComp.buildingType);
    const gatheringFunc = blueprint.functionality.find(f => f.type === 'gathering_boost');
    if (!gatheringFunc) continue;

    const pos = building.getComponent<PositionComponent>('position');
    const distance = calculateDistance(agentPosition, pos);

    if (distance <= gatheringFunc.radius) {
      // Check resource type filter
      if (gatheringFunc.resourceTypes.length === 0 ||
          gatheringFunc.resourceTypes.includes(resourceType)) {
        multiplier *= 1.25;
      }
    }
  }

  return multiplier;
}
```

### Buildings Using This
| Building | resourceTypes | radius |
|----------|--------------|--------|
| well | ['water'] | 0 (on-site only) |
| small_garden | ['vegetables', 'herbs'] | 2 |
| greenhouse | ['exotic_crops', 'herbs', 'flowers'] | 4 |

### Events Emitted
- `gathering:boosted` - { agentId, resourceType, multiplier, buildingIds }

---

## 3. Research Bonus System

### Purpose
Buildings with `research` functionality provide speed bonuses when agents conduct research there.

### Type Definition (existing)
```typescript
{ type: 'research'; fields: string[]; bonus: number }
```

### Behavior

1. **Trigger**: When ResearchSystem advances research progress
2. **Check**: Agent must be at or adjacent to a research building
3. **Filter**: Only apply if research field matches one in `fields`
4. **Bonus**: Multiply progress rate by `bonus` (e.g., 1.5 = 50% faster)
5. **Stacking**: Take highest bonus only (no stacking)

### Implementation: ResearchSystem Integration

```typescript
// In ResearchSystem (to be implemented in Phase 13)
private getResearchSpeedMultiplier(
  agent: Entity,
  researchField: ResearchField,
  world: World
): number {
  const agentPos = agent.getComponent<PositionComponent>('position');
  let bestBonus = 1.0;

  const buildings = world.query()
    .with('building')
    .with('position')
    .executeEntities();

  for (const building of buildings) {
    const buildingComp = building.getComponent<BuildingComponent>('building');
    if (!buildingComp.isComplete) continue;

    const pos = building.getComponent<PositionComponent>('position');
    const distance = calculateDistance(agentPos, pos);

    // Must be at or adjacent to building
    if (distance > 2) continue;

    const blueprint = getBlueprintForBuilding(buildingComp.buildingType);
    const researchFunc = blueprint.functionality.find(f => f.type === 'research');
    if (!researchFunc) continue;

    // Check field match
    if (researchFunc.fields.includes(researchField)) {
      bestBonus = Math.max(bestBonus, researchFunc.bonus);
    }
  }

  return bestBonus;
}
```

### Buildings Using This
| Building | fields | bonus |
|----------|--------|-------|
| library | ['agriculture', 'construction', 'tools'] | 1.2 |
| alchemy_lab | ['alchemy'] | 1.5 |
| arcane_tower | ['arcane', 'experimental'] | 2.0 |
| inventors_hall | ['experimental', 'agriculture', 'construction', 'crafting', 'metallurgy', 'alchemy'] | 2.5 |

### Events Emitted
- `research:bonus_applied` - { agentId, researchId, field, bonus, buildingId }

---

## 4. Automation System

### Purpose
Buildings with `automation` functionality can perform tasks automatically without agent involvement.

### Type Definition (existing)
```typescript
{ type: 'automation'; tasks: string[] }
```

### Task Types

| Task ID | Description | Frequency |
|---------|-------------|-----------|
| `plant_seeds` | Auto-plant seeds in adjacent farm tiles | Every 30 min |
| `harvest_crops` | Auto-harvest mature crops in radius | Every 30 min |
| `water_plants` | Auto-water plants in radius | Every 1 hour |
| `grind_grain` | Convert grain to flour (requires inventory) | Continuous |
| `power_machines` | Provides power to adjacent machines | Passive |
| `move_items` | Transfer items between connected buildings | Every 5 min |
| `sort_items` | Organize items into designated storage | Every 10 min |
| `control_temperature` | Maintain optimal temperature in greenhouse | Passive |

### Implementation: AutomationSystem

```typescript
interface AutomationSystem extends System {
  id: 'automation';
  priority: 90; // Run late in tick
  requiredComponents: ['building', 'position'];
}
```

**Core Logic:**
```typescript
update(world: World, entities: Entity[], deltaTime: number): void {
  for (const entity of entities) {
    const building = entity.getComponent<BuildingComponent>('building');
    if (!building.isComplete) continue;

    const blueprint = getBlueprintForBuilding(building.buildingType);
    const autoFunc = blueprint.functionality.find(f => f.type === 'automation');
    if (!autoFunc) continue;

    for (const task of autoFunc.tasks) {
      if (this.shouldRunTask(task, world.tick)) {
        this.executeAutomationTask(entity, task, world);
      }
    }
  }
}

private executeAutomationTask(building: Entity, task: string, world: World): void {
  switch (task) {
    case 'water_plants':
      this.autoWaterPlants(building, world);
      break;
    case 'harvest_crops':
      this.autoHarvestCrops(building, world);
      break;
    case 'plant_seeds':
      this.autoPlantSeeds(building, world);
      break;
    // ... other tasks
  }
}
```

### Buildings Using This
| Building | tasks |
|----------|-------|
| auto_farm | ['plant_seeds', 'harvest_crops', 'water_plants'] |
| irrigation_channel | ['water_plants'] |
| water_wheel | ['grind_grain', 'power_machines'] |
| greenhouse | ['water_plants', 'control_temperature'] |
| conveyor_system | ['move_items', 'sort_items'] |

### Events Emitted
- `automation:task_executed` - { buildingId, task, result }
- `automation:task_failed` - { buildingId, task, reason }

---

## Implementation Priority

1. **mood_aura** - Simple, high player-visible impact
2. **gathering_boost** - Integrates with existing ResourceGatheringSystem
3. **research** - Required for Phase 13 Research System
4. **automation** - Complex, implement after core systems stable

## File Structure

```
packages/core/src/systems/
├── MoodAuraSystem.ts        # New system
├── AutomationSystem.ts      # New system
├── ResourceGatheringSystem.ts  # Modify for gathering_boost
└── ResearchSystem.ts        # Add research bonus support (Phase 13)
```

## Testing Requirements

### MoodAuraSystem Tests
- [ ] Agents receive mood bonus within radius
- [ ] No bonus outside radius
- [ ] Diminishing returns on stacking
- [ ] Only complete buildings apply effects

### GatheringBoost Tests
- [ ] Correct multiplier applied to yields
- [ ] Resource type filtering works
- [ ] Stacking multiplies correctly
- [ ] Radius check accurate

### ResearchBonus Tests
- [ ] Research speed increases at buildings
- [ ] Field filtering works
- [ ] Best bonus selected (no stacking)
- [ ] Agent must be adjacent

### AutomationSystem Tests
- [ ] Tasks execute at correct intervals
- [ ] Resources consumed/produced correctly
- [ ] Radius-based effects work
- [ ] Events emitted properly

## Dependencies

- `BuildingBlueprintRegistry` - Read functionality arrays
- `NeedsComponent` - Mood aura target
- `ResourceGatheringSystem` - Gathering boost integration
- `ResearchSystem` (Phase 13) - Research bonus integration
- `PlantSystem` - Automation watering/harvesting
