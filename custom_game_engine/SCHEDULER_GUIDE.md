# Scheduler Architecture Guide

> **Last Updated:** 2026-01-04
> **Purpose:** Deep dive into the game loop, system scheduling, and time management

---

## Overview

The "scheduler" in Multiverse: The End of Eternity engine is **NOT a separate component** - it's the **GameLoop + System Priority ordering** working together to create deterministic, fixed-timestep execution.

**Key Concept:** Systems execute in priority order (lower priority = earlier) at a fixed 20 ticks per second (TPS).

---

## Table of Contents

1. [Fixed Timestep Architecture](#fixed-timestep-architecture)
2. [System Priority Ordering](#system-priority-ordering)
3. [Throttling & Update Intervals](#throttling--update-intervals)
4. [Time System Integration](#time-system-integration)
5. [Performance & Profiling](#performance--profiling)
6. [Multiverse Time Management](#multiverse-time-management)

---

## Fixed Timestep Architecture

### Core Constants

```typescript
const TICKS_PER_SECOND = 20;     // 20 TPS fixed
const MS_PER_TICK = 50;          // 50ms per tick
```

**In-Game Time Mapping:**
- 1 tick = 50ms real time = 1 in-game minute
- 1 hour = 60 ticks = 3 seconds real time
- 1 day = 1440 ticks = 72 seconds real time
- 1 year = 525,600 ticks = ~7.3 hours real time

### Game Loop Implementation

**Location:** `packages/core/src/loop/GameLoop.ts`

```typescript
export class GameLoop {
  readonly ticksPerSecond = 20;
  readonly msPerTick = 50;

  private lastTickTime = 0;
  private accumulator = 0;
  private animationFrameId: number | null = null;

  private loop = (): void => {
    if (this._state !== 'running') return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTickTime;
    this.lastTickTime = currentTime;

    // Accumulate time
    this.accumulator += deltaTime;

    // Execute fixed-timestep ticks
    let ticksThisFrame = 0;
    const maxTicksPerFrame = 5; // Spiral of death prevention

    while (this.accumulator >= this.msPerTick && ticksThisFrame < maxTicksPerFrame) {
      this.executeTick();
      this.accumulator -= this.msPerTick;
      ticksThisFrame++;
    }

    // If too far behind, reset (prevent spiral of death)
    if (this.accumulator > this.msPerTick * 10) {
      console.warn('[GameLoop] Accumulator too large, resetting (simulation lag)');
      this.accumulator = 0;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
```

### Why Fixed Timestep?

**Determinism**: Game logic runs at exactly 20 TPS regardless of frame rate.

**Benefits:**
- ✅ Physics/simulation consistency
- ✅ Replay-ability (same inputs = same outputs)
- ✅ Multiplayer sync (all clients tick at same rate)
- ✅ Time-based mechanics work correctly (day/night cycle, plant growth)

**Drawbacks:**
- ⚠️  CPU-intensive on slow machines (might drop frames)
- ⚠️  Need spiral of death protection

### Spiral of Death Prevention

**Problem:** If a tick takes > 50ms, accumulator keeps growing → more ticks needed → even slower → spiral!

**Solution:**
1. **Max ticks per frame**: Cap at 5 ticks
2. **Accumulator reset**: If > 500ms behind, reset

```typescript
let ticksThisFrame = 0;
const maxTicksPerFrame = 5;

while (accumulator >= msPerTick && ticksThisFrame < maxTicksPerFrame) {
  executeTick();
  accumulator -= msPerTick;
  ticksThisFrame++;
}

if (accumulator > msPerTick * 10) {
  accumulator = 0; // Give up catching up
}
```

**What happens:** On slow machines, game slows down (fewer ticks per second) but stays deterministic.

---

## System Priority Ordering

### Priority System

Systems register with a **priority number** (lower = runs first):

```typescript
interface System {
  id: string;
  priority: number;           // Execution order
  requiredComponents: ComponentType[];
  update(world: World, entities: Entity[], deltaTime: number): void;
}
```

### Priority Ranges

| Range | Category | Examples |
|-------|----------|----------|
| 1-10 | Core Infrastructure | Time, Weather, Multiverse |
| 10-50 | Environment | Plants, Animals, Soil |
| 50-100 | Agent Core | Brain, Movement, Needs |
| 100-200 | Cognition | Memory, Skills, Reflection |
| 200-300 | Social | Communication, Relationships |
| 300-400 | Activities | Building, Trading, Combat |
| 400-500 | Advanced | Magic, Divinity, Realms |
| 900-999 | Utility | Metrics, Auto-Save |

### Example Priority Sequence

```
Priority 3:  TimeSystem
   ↓ (updates game clock)
Priority 5:  WeatherSystem
   ↓ (uses time to determine weather)
Priority 10: PlantSystem
   ↓ (plants grow based on time/weather)
Priority 20: CircadianSystem
   ↓ (sleep pressure based on time)
Priority 50: PowerGridSystem
   ↓ (electricity flows early)
Priority 55: BeltSystem
   ↓ (items move on belts)
Priority 90: AgentBrainSystem
   ↓ (LLM decides what to do)
Priority 95: SteeringSystem
   ↓ (calculate movement forces)
Priority 100: MovementSystem
   ↓ (apply velocity to position)
Priority 120: MemoryFormationSystem
   ↓ (create memories from events)
Priority 999: MetricsCollectionSystem
   ↓ (observe everything that happened this tick)
```

### Why Priority Matters

**Causality:** Systems that produce data must run before systems that consume it.

**Example: Movement**
```
SteeringSystem (priority 95)
   ↓ (calculates velocity from steering forces)
MovementSystem (priority 100)
   ↓ (applies velocity to position)
```

If MovementSystem ran first, it would use **previous tick's velocity** → lag!

**Example: Time → Weather → Plants**
```
TimeSystem (priority 3)
   ↓ (updates hour, day, season)
WeatherSystem (priority 5)
   ↓ (uses season to determine weather)
PlantSystem (priority 10)
   ↓ (uses weather to determine growth)
```

If PlantSystem ran before WeatherSystem, plants would use **previous tick's weather** → wrong growth!

### System Registration

**Location:** `packages/core/src/systems/registerAllSystems.ts`

```typescript
export function registerAllSystems(gameLoop: GameLoop): void {
  const registry = gameLoop.systemRegistry;

  // Infrastructure (1-10)
  registry.register(new TimeSystem());  // priority: 3

  // Environment (10-50)
  registry.register(new WeatherSystem());  // priority: 5
  registry.register(new PlantSystem());    // priority: 10

  // Agent Core (50-100)
  registry.register(new AgentBrainSystem(...));  // priority: 90
  registry.register(new MovementSystem());       // priority: 100

  // ... many more systems
}
```

**Important:** Systems **must** be registered in **any order** - the `SystemRegistry` automatically sorts by priority.

---

## Throttling & Update Intervals

### Why Throttle?

Not all systems need to run **every tick**:
- Weather changes slowly (every ~5 seconds)
- Memory consolidation is rare (every ~50 seconds)
- Auto-save is infrequent (every ~5 minutes)

Running them every tick (50ms) wastes CPU!

### Throttling Pattern

**Basic throttle:**
```typescript
export class WeatherSystem implements System {
  priority = 5;
  requiredComponents = [CT.Weather];

  private UPDATE_INTERVAL = 100;  // Ticks
  private lastUpdate = 0;

  update(world: World, entities: Entity[]): void {
    // Throttle check
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;  // Skip this tick
    }

    this.lastUpdate = world.tick;

    // Actual weather logic runs here
    for (const entity of entities) {
      // ... update weather
    }
  }
}
```

**Result:** WeatherSystem runs every 100 ticks = every 5 seconds.

### Common Throttle Intervals

| System | Interval | Real Time | Reason |
|--------|----------|-----------|--------|
| SoilSystem | 20 ticks | ~1 second | Moisture changes slowly |
| WeatherSystem | 100 ticks | ~5 seconds | Weather changes slowly |
| PlantDiseaseSystem | 50 ticks | ~2.5 seconds | Disease spreads gradually |
| AnimalProductionSystem | 100 ticks | ~5 seconds | Production accumulates over time |
| BuildingMaintenanceSystem | 200 ticks | ~10 seconds | Decay is slow |
| WildAnimalSpawningSystem | 200 ticks | ~10 seconds | Don't spam spawns |
| MarketEventSystem | 500 ticks | ~25 seconds | Market fluctuations are slow |
| MemoryConsolidationSystem | 1000 ticks | ~50 seconds | Episodic → Semantic is rare |
| JournalingSystem | 1440 ticks | ~72 seconds | Once per game day |
| AncestorTransformationSystem | 500 ticks | ~25 seconds | Souls transform slowly |
| AutoSaveSystem | 6000 ticks | ~5 minutes | Save infrequently |

### Advanced: Staggered Updates

**Problem:** Many throttled systems all run on multiples of 100:
- Tick 100: WeatherSystem, AnimalProductionSystem run
- Tick 200: WeatherSystem, AnimalProductionSystem, BuildingMaintenanceSystem run

This creates **lag spikes** every 100 ticks!

**Solution:** Stagger updates using offset:

```typescript
export class WeatherSystem implements System {
  private UPDATE_INTERVAL = 100;
  private lastUpdate = 0;
  private OFFSET = 5;  // Run on ticks 5, 105, 205, etc.

  update(world: World, entities: Entity[]): void {
    if ((world.tick - this.OFFSET) % this.UPDATE_INTERVAL !== 0) {
      return;
    }

    // ... weather logic
  }
}
```

**Result:** Different systems run on different ticks, spreading CPU load.

---

## Time System Integration

### TimeSystem Architecture

**Priority:** 3 (runs very early)

**Purpose:**
- Advance game clock (tick → minute → hour → day)
- Emit time events (day change, phase change, week change)
- Integrate with MultiverseCoordinator for time scaling

### Time Component

**Singleton:** Only one `TimeComponent` exists per universe.

```typescript
interface TimeComponent {
  type: 'time';
  timeOfDay: number;          // 0-24 hours (continuous)
  dayLength: number;          // Real seconds per game day (default: 48s at 1x)
  speedMultiplier: number;    // Time speed (1 = normal, 2 = 2x, etc.)
  phase: 'dawn' | 'day' | 'dusk' | 'night';
  lightLevel: number;         // 0-1
  day: number;                // Current day (starts at 1)
}
```

### Time Progression

**Each tick (50ms):**

```typescript
update(world: World, entities: Entity[], deltaTime: number): void {
  // Get time scale from MultiverseCoordinator
  const universe = multiverseCoordinator.getUniverse(this.universeId);
  const timeScale = universe?.config.timeScale ?? 1.0;

  // Effective time scale = multiverse scale * local multiplier
  const effectiveTimeScale = timeScale * time.speedMultiplier;
  const effectiveDayLength = time.dayLength / effectiveTimeScale;

  // Calculate hours elapsed this tick
  // deltaTime is in seconds (50ms = 0.05s)
  const hoursElapsed = (deltaTime / effectiveDayLength) * 24;

  // Update time of day
  let newTimeOfDay = time.timeOfDay + hoursElapsed;

  // Day rollover
  if (newTimeOfDay >= 24) {
    newTimeOfDay -= 24;
    newDay = time.day + 1;

    // Emit day change event
    world.eventBus.emit({
      type: 'time:day_changed',
      data: { day: newDay }
    });
  }

  // Update phase
  const newPhase = calculatePhase(newTimeOfDay);
  if (newPhase !== oldPhase) {
    world.eventBus.emit({
      type: 'time:phase_changed',
      data: { phase: newPhase, oldPhase }
    });
  }
}
```

### Time Scaling Examples

**Normal Speed (timeScale = 1.0):**
- Day length: 48 seconds
- 1 tick (50ms) = 1 in-game minute
- 1 hour = 60 ticks = 3 seconds
- 1 day = 1440 ticks = 72 seconds

**Dev Speed (timeScale = 8.0):**
- Day length: 6 seconds (48 / 8)
- 1 tick = 8 in-game minutes
- 1 hour = 7.5 ticks = 0.375 seconds
- 1 day = 180 ticks = 9 seconds

**Multiverse Example:**
```typescript
// Universe A: Normal speed
multiverseCoordinator.setTimeScale('universe:main', 1.0);

// Universe B: 10x speed (for long-term simulation)
multiverseCoordinator.setTimeScale('universe:fast_forward', 10.0);

// Universe C: 0.1x speed (slow motion for observation)
multiverseCoordinator.setTimeScale('universe:slow_mo', 0.1);
```

All three universes run in the **same GameLoop** at **20 TPS**, but experience time at different rates!

### Day Phases

**Phase Transitions:**

| Phase | Start Hour | End Hour | Light Level |
|-------|------------|----------|-------------|
| Night | 19:00 | 5:00 | 0.1 |
| Dawn | 5:00 | 7:00 | 0.3 → 1.0 |
| Day | 7:00 | 17:00 | 1.0 |
| Dusk | 17:00 | 19:00 | 1.0 → 0.1 |

**Phase Events:**
```typescript
// TimeSystem emits when phase changes
world.eventBus.on('time:phase_changed', (event) => {
  console.log(`Phase changed: ${event.oldPhase} → ${event.newPhase}`);

  // Systems can react:
  // - CircadianSystem: Increase sleep pressure at night
  // - TemperatureSystem: Lower temperature at night
  // - LightingSystem: Adjust ambient light
});
```

---

## Performance & Profiling

### Tick Performance Tracking

**GameLoop tracks system performance:**

```typescript
private executeTick(): void {
  const tickStart = performance.now();

  const systems = this._systemRegistry.getSorted();
  const systemTimings: Array<{ id: string; time: number }> = [];

  for (const system of systems) {
    const systemStart = performance.now();

    system.update(world, entities, deltaTime);

    const systemTime = performance.now() - systemStart;
    systemTimings.push({ id: system.id, time: systemTime });
  }

  const tickTime = performance.now() - tickStart;

  // Update stats
  this.avgTickTime = this.avgTickTime * 0.9 + tickTime * 0.1;
  this.maxTickTime = Math.max(this.maxTickTime, tickTime);
}
```

### Performance Budget

**Target:** Each tick completes in < 50ms (so we can maintain 20 TPS)

**Budget Allocation:**
- Systems: ~30-40ms
- Rendering: ~10-15ms
- Event processing: ~2-5ms
- Buffer: ~5ms

**Example System Timings:**
```
TimeSystem:              0.1ms  (simple math)
WeatherSystem:           0.2ms  (throttled)
PlantSystem:             2-5ms  (100+ plants)
AgentBrainSystem:        10-20ms (LLM calls expensive!)
MovementSystem:          1-3ms  (position updates)
MemoryFormationSystem:   1-2ms  (memory creation)
MetricsCollectionSystem: 0.5ms  (observation only)
```

### Optimization Strategies

**1. Cache Queries (Critical!)**

```typescript
// ❌ BAD: Query in loop
update(world: World): void {
  for (const agent of agents) {
    const others = world.query().with(CT.Position).executeEntities();  // SLOW!
    for (const other of others) {
      // ...
    }
  }
}

// ✅ GOOD: Query once
update(world: World): void {
  const others = world.query().with(CT.Position).executeEntities();  // Once!
  for (const agent of agents) {
    for (const other of others) {
      // ...
    }
  }
}
```

**2. Use Squared Distance**

```typescript
// ❌ BAD: sqrt in hot path
if (Math.sqrt(dx*dx + dy*dy) < radius) { }

// ✅ GOOD: Squared comparison
if (dx*dx + dy*dy < radius*radius) { }
```

**3. Cache Singleton Entities**

```typescript
// ❌ BAD: Query every tick
const timeEntity = world.query().with(CT.Time).executeEntities()[0];

// ✅ GOOD: Cache ID
private timeEntityId: string | null = null;

if (!this.timeEntityId) {
  this.timeEntityId = world.query().with(CT.Time).executeEntities()[0].id;
}
const timeEntity = world.getEntity(this.timeEntityId);
```

**4. Throttle Non-Critical Systems**

Use update intervals for anything that doesn't need to run every 50ms.

**5. Use Spatial Indexing**

For proximity queries, use grid-based spatial indexing instead of brute-force distance checks.

### Profiling Tools

**Browser DevTools:**
- Performance tab → Record → Look for long frames
- `executeTick()` should be < 50ms
- Individual systems should be < 10ms

**In-Game Metrics:**
```typescript
// Access performance stats
console.log(`Avg tick time: ${gameLoop.avgTickTime.toFixed(2)}ms`);
console.log(`Max tick time: ${gameLoop.maxTickTime.toFixed(2)}ms`);
```

---

## Multiverse Time Management

### Absolute vs Relative Time

**Multiverse Time (Absolute):**
- Never decreases
- Tracks all universes simultaneously
- Used for causality ordering
- Stored as bigint (can grow very large)

**Universe Time (Relative):**
- Relative to universe creation
- Can have different time scales
- Tracked per-universe
- Used for in-game time (days, hours)

### Time Coordination Example

```typescript
// At multiverse tick 10,000:

Universe A (created at tick 0, timeScale 1.0):
  - universeTick: 10,000
  - day: 5 (10,000 / 2,000)
  - timeOfDay: 0 (midnight)

Universe B (forked from A at tick 6,000, timeScale 2.0):
  - universeTick: 4,000 (10,000 - 6,000)
  - day: 4 (4,000 * 2.0 / 2,000)
  - timeOfDay: 0 (midnight)
  - forkPoint: { parentId: A, parentTick: 6,000 }

Universe C (created at tick 8,000, timeScale 0.5):
  - universeTick: 2,000 (10,000 - 8,000)
  - day: 0.5 (2,000 * 0.5 / 2,000)
  - timeOfDay: 12 (noon)
```

### Cross-Universe Events

**Problem:** How do events in Universe A affect Universe B?

**Solution:** Multiverse absolute time provides causal ordering.

```typescript
// Universe A emits event at absoluteTick 10,000
event = {
  type: 'universe_event',
  sourceUniverse: 'A',
  absoluteTick: 10000,
  data: { ... }
};

// Universe B receives event
// Convert absoluteTick to local universe time
const eventLocalTick = absoluteTick - universeCreationTick;
// Event happened at local tick 4,000 in Universe B
```

---

## Best Practices

### 1. Always Use Fixed Timestep

Never use variable deltaTime for game logic:

```typescript
// ❌ BAD: Variable timestep
update(world: World, deltaTime: number): void {
  position.x += velocity.x * deltaTime;  // Non-deterministic!
}

// ✅ GOOD: Fixed timestep (deltaTime is always 0.05s)
update(world: World, deltaTime: number): void {
  // deltaTime is constant (50ms = 0.05s)
  position.x += velocity.x * 0.05;
}
```

### 2. System Priority is Critical

Choose priority carefully based on data dependencies:

```
Data Producer (low priority)
    ↓
Data Consumer (high priority)
```

### 3. Throttle When Possible

If a system doesn't need to run every 50ms, throttle it!

### 4. Profile Regularly

Use browser DevTools to profile tick performance. Watch for systems > 10ms.

### 5. Event-Driven When Appropriate

Don't poll every tick if you can use events:

```typescript
// ❌ BAD: Poll every tick
update(world: World): void {
  if (agent.health <= 0 && !agent.dead) {
    agent.dead = true;
    // Handle death
  }
}

// ✅ GOOD: Event-driven
world.eventBus.on('agent:health_zero', (event) => {
  // Handle death once
});
```

---

## Troubleshooting

### Slow Ticks (> 50ms)

**Symptoms:** Game stutters, accumulator grows

**Diagnosis:**
1. Profile with DevTools
2. Check `gameLoop.avgTickTime` and `gameLoop.maxTickTime`
3. Look for systems > 10ms

**Solutions:**
- Throttle expensive systems
- Cache queries
- Optimize hot paths (avoid `Math.sqrt`, use squared distance)
- Reduce entity count

### Spiral of Death

**Symptoms:** Game freezes, accumulator > 500ms

**Diagnosis:**
```typescript
if (gameLoop.accumulator > 500) {
  console.error('Spiral of death detected!');
}
```

**Solutions:**
- Fix slow tick (see above)
- Increase `maxTicksPerFrame` (carefully!)
- Reduce simulation complexity

### Time Drift

**Symptoms:** In-game time doesn't match real time

**Diagnosis:**
- Check `timeScale` in MultiverseCoordinator
- Verify `dayLength` in TimeComponent
- Check for paused universes

**Solutions:**
- Ensure `timeScale = 1.0` for realtime
- Verify TimeSystem priority is low (runs early)
- Check for throttling issues in TimeSystem

---

## Conclusion

The scheduler in Multiverse: The End of Eternity is a **fixed-timestep, priority-ordered system execution** architecture. Understanding this is crucial for:

- Writing performant systems
- Debugging timing issues
- Implementing multiverse features
- Optimizing game performance

**Key Takeaways:**
1. Fixed 20 TPS (50ms per tick)
2. Systems execute in priority order
3. Throttle non-critical systems
4. Profile and optimize hot paths
5. Multiverse enables different time scales in same loop

---

**End of Scheduler Guide**
