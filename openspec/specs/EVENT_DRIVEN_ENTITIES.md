# Event-Driven Entities & Entity Awakener Specification

**Status**: Draft
**Created**: 2026-01-22
**Priority**: High
**Inspiration**: Factorio (sleeping inserters), Entity Component System patterns
**System**: Core ECS (`packages/core/src/ecs/`), SimulationScheduler

## Problem Statement

Current entity update model:
- SimulationScheduler has ALWAYS/PROXIMITY/PASSIVE modes
- ALWAYS entities update every tick regardless of state
- PROXIMITY entities update when on-screen
- No concept of "sleeping until triggered"

**Missing optimization**: Entities that don't need updates until something changes:
- Plants: Only need update once per day (growth tick)
- Sleeping agents: Only need dream/memory consolidation at intervals
- Buildings: Only update when inventory changes or damaged
- Idle inserters (Factorio): Sleep until belt has items

**Factorio's insight**: Most entities spend most time doing nothing. Wake them only when relevant state changes.

## Current State (SimulationScheduler)

From `packages/core/src/ecs/SIMULATION_SCHEDULER.md`:
- `ALWAYS`: Agents, buildings - every tick
- `PROXIMITY`: Plants, animals - when visible
- `PASSIVE`: Resources - never (query only)

**Gap**: No temporal scheduling ("wake at tick X") or event-driven waking ("wake when inventory changes").

## Design Philosophy

**Three wake conditions**:
1. **Scheduled**: Wake at specific future tick (plants grow, agents wake up)
2. **Event-driven**: Wake when subscribed event fires (inventory changed, damaged)
3. **Proximity**: Wake when on-screen (already exists)

**Entity states**:
- `ACTIVE`: Processing every tick
- `SCHEDULED`: Sleeping until wake_tick
- `WAITING`: Sleeping until event
- `PASSIVE`: Never auto-wakes

## Solution Architecture

### Phase 1: Entity Sleep Component

```typescript
// packages/core/src/components/SleepComponent.ts

export interface SleepComponent {
  type: 'sleep';

  /** Current state */
  state: 'active' | 'scheduled' | 'waiting' | 'passive';

  /** For scheduled: tick to wake */
  wake_tick?: number;

  /** For waiting: events that wake this entity */
  wake_events?: string[];

  /** Last tick this entity was processed */
  last_processed_tick: number;

  /** Accumulated delta since last process (for catch-up) */
  accumulated_delta: number;
}
```

### Phase 2: Entity Awakener System

```typescript
// packages/core/src/systems/EntityAwakenerSystem.ts

export class EntityAwakenerSystem implements System {
  readonly name = 'EntityAwakenerSystem';
  readonly priority = 5; // Very early - before other systems

  /** Entities scheduled to wake, sorted by tick */
  private wakeQueue: PriorityQueue<{ entityId: string; wakeTick: number }>;

  /** Event subscriptions: event -> entity IDs */
  private eventSubscriptions: Map<string, Set<string>> = new Map();

  /** Entities active this tick (passed to other systems) */
  private activeThisTick: Set<string> = new Set();

  update(world: World): void {
    this.activeThisTick.clear();

    // 1. Wake scheduled entities
    while (this.wakeQueue.peek()?.wakeTick <= world.tick) {
      const { entityId } = this.wakeQueue.pop()!;
      this.wakeEntity(world, entityId, 'scheduled');
    }

    // 2. Process any fired events from last tick
    for (const event of world.getEventsLastTick()) {
      const subscribers = this.eventSubscriptions.get(event.type);
      if (subscribers) {
        for (const entityId of subscribers) {
          this.wakeEntity(world, entityId, 'event');
        }
      }
    }

    // 3. Always-active entities
    for (const entity of world.query().with('agent').execute()) {
      const sleep = entity.getComponent('sleep');
      if (!sleep || sleep.state === 'active') {
        this.activeThisTick.add(entity.id);
      }
    }
  }

  private wakeEntity(world: World, entityId: string, reason: string): void {
    const entity = world.getEntity(entityId);
    if (!entity) return;

    const sleep = entity.getComponent<SleepComponent>('sleep');
    if (sleep) {
      sleep.accumulated_delta = world.tick - sleep.last_processed_tick;
      sleep.state = 'active';
    }

    this.activeThisTick.add(entityId);
  }

  /** Schedule entity to wake at future tick */
  scheduleWake(entityId: string, wakeTick: number): void {
    this.wakeQueue.push({ entityId, wakeTick });
  }

  /** Subscribe entity to wake on event */
  subscribeToEvent(entityId: string, eventType: string): void {
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }
    this.eventSubscriptions.get(eventType)!.add(entityId);
  }

  /** Put entity to sleep until scheduled time */
  sleepUntil(world: World, entityId: string, wakeTick: number): void {
    const entity = world.getEntity(entityId);
    const sleep = entity?.getComponent<SleepComponent>('sleep');
    if (sleep) {
      sleep.state = 'scheduled';
      sleep.wake_tick = wakeTick;
      sleep.last_processed_tick = world.tick;
      this.scheduleWake(entityId, wakeTick);
    }
  }

  /** Put entity to sleep until event */
  sleepUntilEvent(world: World, entityId: string, events: string[]): void {
    const entity = world.getEntity(entityId);
    const sleep = entity?.getComponent<SleepComponent>('sleep');
    if (sleep) {
      sleep.state = 'waiting';
      sleep.wake_events = events;
      sleep.last_processed_tick = world.tick;
      events.forEach(e => this.subscribeToEvent(entityId, e));
    }
  }

  /** Check if entity is active this tick */
  isActive(entityId: string): boolean {
    return this.activeThisTick.has(entityId);
  }
}
```

### Phase 3: Integration with Existing Systems

**PlantGrowthSystem** (example):
```typescript
update(world: World): void {
  const awakener = world.getSystem<EntityAwakenerSystem>('EntityAwakenerSystem');

  for (const plant of world.query().with('plant', 'sleep').execute()) {
    if (!awakener.isActive(plant.id)) continue;

    const sleep = plant.getComponent<SleepComponent>('sleep');
    const growth = plant.getComponent<PlantComponent>('plant');

    // Process growth (may use accumulated_delta for catch-up)
    this.processGrowth(plant, sleep.accumulated_delta);

    // Schedule next growth tick (once per day = 24000 ticks at 20 TPS)
    const nextGrowthTick = world.tick + 24000;
    awakener.sleepUntil(world, plant.id, nextGrowthTick);
  }
}
```

**AgentBrainSystem** (sleeping agents):
```typescript
update(world: World): void {
  const awakener = world.getSystem<EntityAwakenerSystem>('EntityAwakenerSystem');
  const timeEntity = world.getTimeEntity();
  const hour = timeEntity.getComponent<TimeComponent>('time').hour;

  for (const agent of world.query().with('agent', 'sleep').execute()) {
    const sleep = agent.getComponent<SleepComponent>('sleep');
    const agentComp = agent.getComponent<AgentComponent>('agent');

    if (agentComp.isSleeping) {
      // Sleeping agents: only process dreams at intervals
      if (!awakener.isActive(agent.id)) continue;

      this.processDreams(agent, sleep.accumulated_delta);

      // Wake up at 6 AM
      const wakeHour = 6;
      const ticksUntilWake = this.calculateTicksUntil(world, wakeHour);
      awakener.sleepUntil(world, agent.id, world.tick + ticksUntilWake);
    } else {
      // Awake agents: always active
      this.processAwakeLogic(agent);
    }
  }
}
```

**BuildingSystem** (event-driven):
```typescript
onBuildingCreated(world: World, building: Entity): void {
  const awakener = world.getSystem<EntityAwakenerSystem>('EntityAwakenerSystem');

  // Building sleeps until inventory changes or takes damage
  awakener.sleepUntilEvent(world, building.id, [
    `inventory:${building.id}:changed`,
    `damage:${building.id}`,
    `power:${building.id}:changed`,
  ]);
}

update(world: World): void {
  const awakener = world.getSystem<EntityAwakenerSystem>('EntityAwakenerSystem');

  for (const building of world.query().with('building', 'sleep').execute()) {
    if (!awakener.isActive(building.id)) continue;

    // Process building logic...

    // Go back to sleep waiting for next event
    awakener.sleepUntilEvent(world, building.id, [
      `inventory:${building.id}:changed`,
      `damage:${building.id}`,
    ]);
  }
}
```

### Phase 4: Catch-Up Processing

When entity wakes after long sleep, may need to "catch up":

```typescript
interface CatchUpStrategy {
  /** Skip entirely - just mark as current */
  skip: boolean;

  /** Process accumulated time in one batch */
  batch: boolean;

  /** Process step-by-step (slow but accurate) */
  stepByStep: boolean;

  /** Maximum steps to simulate */
  maxSteps?: number;
}

// Plant growth: batch (calculate final growth state)
// Agent dreams: batch (generate dreams for entire sleep period)
// Building production: batch (calculate total output)
// Combat: step-by-step (need accurate simulation)
```

## Performance Impact

**Before** (1000 plants, 100 agents, 50 buildings):
- Plants: 1000 updates/tick (PROXIMITY: ~100 visible)
- Agents: 100 updates/tick
- Buildings: 50 updates/tick
- Total: ~250 active entities/tick

**After** (event-driven):
- Plants: ~1 update/tick average (24000 tick sleep cycle)
- Sleeping agents (night): 0 updates until wake time
- Buildings: 0 updates until event
- Total: ~10-30 active entities/tick

**90% reduction in entity processing**

## Integration with SimulationScheduler

EntityAwakener works WITH SimulationScheduler:
- SimulationScheduler: Spatial filtering (what's on screen)
- EntityAwakener: Temporal filtering (what needs update now)

```typescript
// Combined filtering
const spatiallyActive = simulationScheduler.filterActiveEntities(entities, tick);
const temporallyActive = spatiallyActive.filter(e => awakener.isActive(e.id));
```

## Migration Strategy

1. Add `SleepComponent` - optional, entities without it are always active
2. Add `EntityAwakenerSystem` at priority 5
3. Gradually add sleep support to systems (plants first)
4. Monitor performance gains
5. Expand to more entity types

## References

- [Factorio Friday Facts #176 - Belts optimization](https://factorio.com/blog/post/fff-176)
- [Game Programming Patterns - Event Queue](https://gameprogrammingpatterns.com/event-queue.html)
- [Entity Component System and sleeping entities](https://skypjack.github.io/2019-02-14-ecs-baf-part-1/)
