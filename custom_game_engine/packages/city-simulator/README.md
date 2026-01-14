# City Simulator - Headless Testing Framework

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the city simulator to understand its architecture, setup patterns, and usage as a headless testing framework.

## Overview

The **City Simulator Package** (`@ai-village/city-simulator`) is a standalone headless testing framework that runs the full game engine without 3D rendering. It serves as both a demo application and a performance benchmarking tool for the ECS game engine.

**What it does:**
- Runs full ECS game simulation (agents, buildings, resources, systems) without 3D rendering
- Provides web dashboard for real-time monitoring of city metrics and strategic priorities
- Enables fast-forward simulation for performance testing and time-lapse observation
- Tests CityManager AI decision-making in isolation
- Supports multiple presets for different testing scenarios (basic, large-city, population-growth)
- Demonstrates proper system registration and world initialization patterns
- Benchmarks system performance at scale (50-200 agents)
- Validates game mechanics over extended simulation periods (days, weeks, months)

**Key files:**
- `src/HeadlessCitySimulator.ts` - Core headless game loop and world setup
- `src/main.ts` - Web dashboard UI connecting to simulator
- `index.html` - Browser-based control panel with real-time metrics
- `vite.config.ts` - Vite dev server configuration (port 3032)

**Use cases:**
- **Overnight testing:** Run weeks/months of game time to test long-term balance
- **Performance profiling:** Benchmark ECS systems at different entity counts
- **AI validation:** Test CityManager strategic decision-making
- **Integration testing:** Verify system interactions without rendering overhead
- **Regression testing:** Catch gameplay bugs before they reach main demo
- **Time travel development:** Test persistence and timeline systems

---

## Package Structure

```
packages/city-simulator/
├── src/
│   ├── HeadlessCitySimulator.ts    # Core simulator class
│   │   - GameLoop initialization
│   │   - System registration
│   │   - World entity creation
│   │   - Preset configurations
│   │   - Event-driven updates
│   │   - Performance optimization (sparse snapshots)
│   └── main.ts                     # Web UI dashboard
│       - Real-time metrics rendering
│       - Strategic priority controls
│       - Speed/pause controls
│       - Agent map visualization
│       - Decision history display
├── index.html                      # Browser control panel
├── vite.config.ts                  # Dev server config (port 3032)
├── package.json                    # Dependencies (@ai-village/core, @ai-village/botany)
├── TODO.md                         # Implementation audit
└── README.md                       # This file
```

---

## Core Concepts

### 1. Headless Simulation

The simulator runs the full game engine **without 3D rendering** for performance and testing:

```typescript
class HeadlessCitySimulator {
  private gameLoop: GameLoop;        // Core ECS game loop
  private cityManager: CityManager;  // Strategic AI decision-maker
  private running: boolean;          // Simulation state
  private ticksPerFrame: number;     // Speed control (1-100x)
}
```

**Benefits of headless mode:**
- **Fast-forward simulation:** Run months/years of game time quickly (100x speed)
- **Overnight testing:** Simulate long periods without GPU rendering
- **Performance profiling:** Isolate system performance without rendering overhead
- **Strategic testing:** Focus on CityManager AI decisions
- **Reproducibility:** Test scenarios with consistent initial conditions
- **Memory efficiency:** Sparse Timeline snapshots prevent OOM in long runs
- **Benchmarking:** Measure TPS at different entity counts and configurations

**Headless optimizations:**
```typescript
// Timeline: Sparse snapshots for overnight simulations
timelineManager.setConfig({
  autoSnapshot: true,
  canonEventSaves: true,        // Keep major events (births, deaths)
  intervalThresholds: [
    { afterTicks: 0, interval: 1200 },       // 1 min
    { afterTicks: 1200, interval: 4800 },    // 5 min
    { afterTicks: 6000, interval: 6000 },    // 10 min
    { afterTicks: 12000, interval: 72000 },  // Hourly after 10 min
  ],
  maxSnapshots: 50,              // vs default 100
  maxAge: 24 * 60 * 60 * 1000,   // 24hr retention
});

// System registration: Disable expensive subsystems
coreRegisterAllSystems(gameLoop, {
  llmQueue: undefined,           // No LLM in headless mode
  promptBuilder: undefined,      // No LLM in headless mode
  enableMetrics: false,          // Disable for max performance
  enableAutoSave: false,         // Disable for testing
});
```

### 2. Preset Configurations

Three presets demonstrate different gameplay scenarios and testing use cases:

```typescript
type SimulatorPreset = 'basic' | 'large-city' | 'population-growth';

// Basic: Small settlement with survival focus
// USE FOR: Baseline performance testing, quick iteration
{
  worldSize: { width: 200, height: 200 },
  initialPopulation: 50,
  storageBuildings: 1,
  foodPerStorage: 100,
  enableEconomy: false  // Minimal systems
}

// Large City: Full economy with distributed infrastructure
// USE FOR: Stress testing, performance profiling at scale
{
  worldSize: { width: 200, height: 200 },
  initialPopulation: 200,
  storageBuildings: 9,  // Distributed storage across city
  foodPerStorage: 500,
  enableEconomy: true   // All systems enabled
}

// Population Growth: Small start, reproduction systems enabled
// USE FOR: Long-term balance testing, emergent behavior validation
{
  worldSize: { width: 200, height: 200 },
  initialPopulation: 20,
  storageBuildings: 2,
  foodPerStorage: 200,
  enableEconomy: true   // Includes reproduction systems
}
```

**Select preset via URL:**
```
http://localhost:3032/?preset=basic
http://localhost:3032/?preset=large-city
http://localhost:3032/?preset=population-growth
```

**Preset performance characteristics:**
| Preset | Entities | TPS (1x) | TPS (100x) | Recommended for |
|--------|----------|----------|------------|-----------------|
| basic | ~125 | 20 | ~200-400 | Quick testing, baseline performance |
| large-city | ~450 | 20 | ~50-100 | Stress testing, scale validation |
| population-growth | ~100 | 20 | ~150-300 | Long-term balance, emergent behavior |

### 3. System Registration Pattern

The simulator demonstrates proper centralized system registration (use as reference):

```typescript
import { registerAllSystems as coreRegisterAllSystems } from '@ai-village/core';
import { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem } from '@ai-village/botany';

private registerSystemsForPreset(): void {
  // 1. Register materials and recipes (required before systems)
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  registerDefaultResearch();

  // 2. Generate session ID for metrics
  const gameSessionId = `headless_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 3. Configure plant systems from @ai-village/botany
  const plantSystems: PlantSystemsConfig = {
    PlantSystem,
    PlantDiscoverySystem,
    PlantDiseaseSystem,
    WildPlantPopulationSystem,
  };

  // 4. Use centralized registration from @ai-village/core
  const coreResult = coreRegisterAllSystems(this.gameLoop, {
    llmQueue: undefined,        // No LLM in headless mode
    promptBuilder: undefined,   // No LLM in headless mode
    gameSessionId,
    metricsServerUrl: 'ws://localhost:8765',
    enableMetrics: false,       // Disable for performance
    enableAutoSave: false,      // Disable for headless testing
    plantSystems,               // Botany package systems
  });

  console.log('[HeadlessSimulator] Registered full game systems (headless)');
}
```

**Critical order:**
1. Materials registration → Recipes → Research
2. System registration via `coreRegisterAllSystems`
3. World entity creation (time, weather, landmarks)
4. Initial entity spawning (agents, buildings, resources)
5. Stabilization ticks (1000 ticks to initialize systems)

**Why this order matters:**
- Materials must exist before recipes reference them
- Recipes must exist before buildings/systems use them
- Systems must be registered before entities are created (they register queries)
- World entity must exist before systems tick (TimeSystem, WeatherSystem query it)
- Stabilization ensures steering, pathfinding, and caches are initialized

### 4. World Entity Creation

The simulator demonstrates proper world entity setup (required for systems):

```typescript
// Create world entity with core components
const worldEntity = new EntityImpl(createEntityId(), world.tick);
worldEntity.addComponent(createTimeComponent());
worldEntity.addComponent(createWeatherComponent('clear', 0.5, 14400));
worldEntity.addComponent(createNamedLandmarksComponent());
(world as any)._addEntity(worldEntity);
(world as any)._worldEntityId = worldEntity.id; // Critical for systems!
```

**Why this matters:**
- TimeSystem requires `time` component on world entity
- WeatherSystem requires `weather` component
- LandmarkSystem requires `named_landmarks` component
- Many systems query `world._worldEntityId` for singleton data
- Without world entity, systems will throw or silently fail

**Common error:**
```typescript
// ❌ BAD: Forget to set _worldEntityId
(world as any)._addEntity(worldEntity);
// Systems will fail to find world entity

// ✅ GOOD: Always set _worldEntityId
(world as any)._addEntity(worldEntity);
(world as any)._worldEntityId = worldEntity.id;
```

### 5. CityManager Integration

The simulator demonstrates strategic AI integration:

```typescript
this.cityManager = new CityManager({
  decisionInterval: 14400,       // 1 game day (14400 ticks)
  statsUpdateInterval: 200,      // 10 game seconds (200 ticks)
  allowManualOverride: true,     // UI can override decisions
});

// Every tick
this.cityManager.tick(this.gameLoop.world);

// Manual control (UI sliders or programmatic)
this.cityManager.setPriorities({
  gathering: 0.25,
  building: 0.20,
  farming: 0.15,
  social: 0.10,
  exploration: 0.15,
  rest: 0.10,
  magic: 0.05
});
```

**Strategic priorities** control agent behavior distribution across the city. CityManager makes autonomous decisions every game day, but can be overridden manually.

**Testing CityManager AI:**
```typescript
// Subscribe to decision events
simulator.on('decision', (reasoning) => {
  console.log(`[Day ${simulator.getStats().daysElapsed}]`);
  console.log(`Focus: ${reasoning.focus}`);          // e.g., "gathering"
  console.log(`Reasoning: ${reasoning.reasoning}`);  // AI explanation
  console.log(`Concerns: ${reasoning.concerns}`);    // e.g., ["low food"]
});

// Force immediate decision (instead of waiting 1 day)
simulator.forceDecision();
```

---

## APIs

### HeadlessCitySimulator Class

Core simulator API for headless game execution.

```typescript
class HeadlessCitySimulator {
  // Lifecycle
  constructor(config: SimulatorConfig);
  async initialize(): Promise<void>;
  start(): void;
  pause(): void;
  reset(): void;
  setSpeed(ticksPerFrame: number): void; // 1-100x

  // Manual control
  setPriorities(priorities: StrategicPriorities): void;
  releaseManualControl(): void;
  forceDecision(): void;

  // State access
  getWorld(): World;
  getCityManager(): CityManager;
  getStats(): SimulatorStats;
  isRunning(): boolean;
  isManuallyControlled(): boolean;

  // Events
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
}
```

**Configuration:**

```typescript
interface SimulatorConfig {
  preset?: SimulatorPreset;           // 'basic' | 'large-city' | 'population-growth'
  worldSize?: { width: number; height: number };
  initialPopulation?: number;
  ticksPerBatch?: number;             // Ticks per frame (default: 1)
  autoRun?: boolean;                  // Start immediately (default: false)
}

interface SimulatorStats {
  ticksRun: number;                   // Total ticks executed
  daysElapsed: number;                // Game days (ticksRun / 14400)
  monthsElapsed: number;              // Game months (days / 30)
  ticksPerSecond: number;             // Real-time TPS
  cityStats: CityStats;               // Population, food, buildings, threats
  cityPriorities: StrategicPriorities; // Current strategic focus
}
```

**Events:**

```typescript
'initialized' → { population, preset }
'start' → {}
'pause' → {}
'reset' → {}
'tick' → ticksRun
'day' → dayNumber
'month' → monthNumber
'decision' → reasoning
'priorities-changed' → priorities
'speed' → ticksPerFrame
```

### UI Class (main.ts)

Browser dashboard for monitoring and control.

```typescript
class UI {
  constructor(simulator: HeadlessCitySimulator);

  // Auto-updates every tick
  private update(): void;
  private renderStats(stats: SimulatorStats): void;
  private renderPriorities(stats: SimulatorStats): void;
  private renderDecisions(): void;
  private renderRoster(stats: SimulatorStats): void;
  private renderMap(): void;
}
```

**Dashboard features:**
- Real-time city stats (population, food, resources, threats)
- Strategic priority sliders (manual override)
- Decision history (last 5 decisions with reasoning)
- Agent map visualization (200x200 grid with agent dots)
- Simulation controls (start, pause, reset, step, speed)

---

## Usage Examples

### Example 1: Running the Simulator

```bash
# Install dependencies
cd custom_game_engine/packages/city-simulator
npm install

# Run dev server (port 3032)
npm run dev

# Open browser to:
# http://localhost:3032/?preset=basic
```

### Example 2: Creating a Custom Preset

```typescript
// Add to getPresetConfig() in HeadlessCitySimulator.ts
case 'stress-test':
  return {
    worldSize: { width: 300, height: 300 },
    initialPopulation: 500,  // Stress test
    storageBuildings: 20,
    foodPerStorage: 1000,
    enableEconomy: true,
  };

// Access via URL:
// http://localhost:3032/?preset=stress-test
```

### Example 3: Programmatic Control

```typescript
// Create and initialize simulator
const simulator = new HeadlessCitySimulator({
  preset: 'large-city',
  autoRun: false,
});
await simulator.initialize();

// Subscribe to events
simulator.on('day', (day: number) => {
  const stats = simulator.getStats();
  console.log(`Day ${day}: Population ${stats.cityStats.population}, Food ${stats.cityStats.foodSupply.toFixed(1)} days`);
});

// Override strategic priorities
simulator.setPriorities({
  gathering: 0.40,  // Prioritize resource collection
  building: 0.10,
  farming: 0.30,
  social: 0.05,
  exploration: 0.05,
  rest: 0.05,
  magic: 0.05,
});

// Run simulation at 100x speed
simulator.setSpeed(100);
simulator.start();

// Pause after 30 game days
setTimeout(() => {
  simulator.pause();
  const stats = simulator.getStats();
  console.log(`Final stats:`, stats.cityStats);
}, 30 * 1000 / stats.ticksPerSecond); // Real-time duration
```

### Example 4: Performance Benchmarking

```typescript
// Benchmark TPS at different entity counts
async function benchmarkScaling() {
  const presets: SimulatorPreset[] = ['basic', 'large-city'];

  for (const preset of presets) {
    const simulator = new HeadlessCitySimulator({
      preset,
      autoRun: false,
    });
    await simulator.initialize();

    // Warm up
    simulator.setSpeed(1);
    simulator.start();
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Measure TPS over 30 seconds
    const startTick = simulator.getStats().ticksRun;
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 30000));
    const endTick = simulator.getStats().ticksRun;
    const endTime = Date.now();

    const tps = (endTick - startTick) / ((endTime - startTime) / 1000);
    const entityCount = simulator.getWorld().query().executeEntities().length;

    console.log(`${preset}: ${entityCount} entities, ${tps.toFixed(2)} TPS`);
    simulator.pause();
  }
}

benchmarkScaling();
// Output:
// basic: 125 entities, 20.00 TPS
// large-city: 450 entities, 18.50 TPS
```

### Example 5: Debugging World Setup

```typescript
// After initialization, inspect world state
const world = simulator.getWorld();

// Check world entity exists
const worldEntityId = (world as any)._worldEntityId;
if (!worldEntityId) {
  console.error('❌ World entity not set!');
}

// Check time component
const time = world.query().with('time').executeEntities()[0];
console.log('Time:', time?.getComponent('time'));

// Count entities by type
const agents = world.query().with('agent').executeEntities();
const buildings = world.query().with('building').executeEntities();
const resources = world.query().with('resource').executeEntities();

console.log(`Spawned ${agents.length} agents`);
console.log(`Created ${buildings.length} buildings`);
console.log(`Spawned ${resources.length} resources`);
console.log(`Total entities: ${world.query().executeEntities().length}`);
```

### Example 6: Testing Strategic Decisions

```typescript
const simulator = new HeadlessCitySimulator({ preset: 'basic' });
await simulator.initialize();

// Log all decisions with context
simulator.on('decision', (reasoning) => {
  const stats = simulator.getStats();
  console.log(`\n[Day ${stats.daysElapsed}] CityManager Decision`);
  console.log(`Focus: ${reasoning.focus}`);
  console.log(`Reasoning: ${reasoning.reasoning}`);
  console.log(`Concerns: ${reasoning.concerns.join(', ')}`);
  console.log(`City State:`, {
    population: stats.cityStats.population,
    food: stats.cityStats.foodSupply.toFixed(1),
    buildings: stats.cityStats.totalBuildings,
  });
});

// Run simulation and observe decisions
simulator.start();

// Force a decision immediately (don't wait for day 1)
simulator.forceDecision();
```

### Example 7: Long-term Balance Testing

```typescript
// Test population growth over 100 game days
async function testPopulationGrowth() {
  const simulator = new HeadlessCitySimulator({
    preset: 'population-growth',
    autoRun: false,
  });
  await simulator.initialize();

  const initialPop = simulator.getStats().cityStats.population;
  console.log(`Initial population: ${initialPop}`);

  // Fast-forward to 100 days
  simulator.setSpeed(100);
  simulator.start();

  return new Promise((resolve) => {
    simulator.on('day', (day: number) => {
      if (day >= 100) {
        simulator.pause();
        const stats = simulator.getStats();
        console.log(`\nDay 100 Results:`);
        console.log(`Population: ${stats.cityStats.population} (${stats.cityStats.population - initialPop > 0 ? '+' : ''}${stats.cityStats.population - initialPop})`);
        console.log(`Food supply: ${stats.cityStats.foodSupply.toFixed(1)} days`);
        console.log(`Buildings: ${stats.cityStats.totalBuildings}`);
        console.log(`Average TPS: ${stats.ticksPerSecond.toFixed(2)}`);
        resolve(true);
      }
    });
  });
}

testPopulationGrowth();
```

---

## Architecture & Data Flow

### System Execution Order

```
1. registerDefaultMaterials() (initialization)
   ↓ Material definitions registered
2. initializeDefaultRecipes() (initialization)
   ↓ Recipe registry populated
3. registerDefaultResearch() (initialization)
   ↓ Research tree configured
4. coreRegisterAllSystems(gameLoop, config) (initialization)
   ↓ All 212+ systems registered with priorities
5. World entity creation (initialization)
   ↓ Time, weather, landmarks components added
6. Initial entities spawned (initialization)
   ↓ Agents, buildings, resources created
7. Stabilization: 1000 ticks (initialization)
   ↓ Systems initialize caches and state

--- Simulation starts ---

8. GameLoop.tick(deltaTime) (every frame)
   ↓ Systems execute by priority (1 → 1000)
9. CityManager.tick(world) (every frame)
   ↓ Stats updates (every 200 ticks)
   ↓ Strategic decisions (every 14400 ticks = 1 day)
10. UI.update() (every 20 ticks)
    ↓ Dashboard re-renders
```

### Initialization Flow

```
HeadlessCitySimulator.constructor()
  ↓ GameLoop created
  ↓ Systems registered (coreRegisterAllSystems)
  ↓ CityManager created

HeadlessCitySimulator.initialize()
  ↓ Timeline configured (sparse snapshots, 24hr retention)
  ↓ World entity created (time, weather, landmarks)
  ↓ Buildings spawned (campfire, storage, farm, tent)
  ↓ Resources spawned (trees, stone, berry bushes)
  ↓ Agents spawned (position, steering, containment bounds)
  ↓ Stabilization: 1000 ticks
  ↓ CityManager.tick() (force initial stats)
  ↓ CityManager.forceDecision() (initial strategic assessment)
  ↓ 'initialized' event emitted

UI.constructor(simulator)
  ↓ Event listeners registered (tick, day, month, decision)
  ↓ Control buttons wired (start, pause, reset, step)
  ↓ Priority sliders wired (manual override)
  ↓ Initial render

HeadlessCitySimulator.start()
  ↓ running = true
  ↓ Animation loop started (requestAnimationFrame)
  ↓ 'start' event emitted

runLoop() (every frame)
  ↓ GameLoop.tick(0.05) × ticksPerFrame
  ↓ CityManager.tick(world)
  ↓ Events emitted (tick, day, month)
  ↓ requestAnimationFrame(runLoop)
```

### Event Flow

```
GameLoop.tick()
  ↓ Systems execute
  ↓ Emit game events (agent:died, building:constructed, etc.)

CityManager.tick(world)
  ↓ Update stats (every 200 ticks)
  ↓ Make decisions (every 14400 ticks)
  ↓ Broadcast priorities to agents

HeadlessCitySimulator
  ↓ Emit 'tick' (every 20 ticks)
  ↓ Emit 'day' (every 14400 ticks)
  ↓ Emit 'month' (every 30 days)
  ↓ Emit 'decision' (when CityManager decides)

UI
  ↓ Update dashboard (on 'tick')
  ↓ Log to console (on 'day', 'month', 'decision')
```

### Component Relationships

```
World Entity
├── time (required)
│   └── TimeSystem queries this
├── weather (required)
│   └── WeatherSystem queries this
└── named_landmarks (required)
    └── LandmarkSystem queries this

Agent Entity
├── position (required)
├── agent (required)
├── steering (required)
│   └── containmentBounds (large-city preset)
├── inventory (optional)
└── needs (optional)

Building Entity
├── position (required)
├── building (required)
├── renderable (required)
└── inventory (optional, for storage)

Resource Entity
├── position (required)
├── resource (required)
│   ├── resourceType: 'wood' | 'stone' | 'food'
│   ├── amount
│   └── harvestable
└── renderable (required)
```

---

## Performance Considerations

**Optimization strategies:**

1. **Headless mode:** No 3D rendering overhead (GPU-free)
2. **Metrics disabled:** `enableMetrics: false` in headless mode
3. **Auto-save disabled:** `enableAutoSave: false` for testing
4. **Sparse Timeline snapshots:** Reduced snapshot frequency for overnight sims
5. **Speed control:** `ticksPerFrame` adjusts simulation speed (1-100x)
6. **Update throttling:** UI updates every 20 ticks, not every frame
7. **No LLM systems:** `llmQueue: undefined` eliminates LLM overhead
8. **Simulation scheduler:** Entity culling reduces active entity count by ~97%

**Timeline configuration (headless mode):**

```typescript
timelineManager.setConfig({
  autoSnapshot: true,
  canonEventSaves: true,
  intervalThresholds: [
    { afterTicks: 0, interval: 1200 },       // Snapshot at 1 min
    { afterTicks: 1200, interval: 4800 },    // Snapshot at 5 min
    { afterTicks: 6000, interval: 6000 },    // Snapshot at 10 min
    { afterTicks: 12000, interval: 72000 },  // Hourly snapshots after 10 min
  ],
  maxSnapshots: 50,                // vs default 100
  maxAge: 24 * 60 * 60 * 1000,     // 24 hour retention, daily cleanup
});
```

**Why this matters:**
- **Overnight simulations:** Can run weeks/months of game time without OOM
- **Liminal spaces preserved:** Major events (births, deaths) still create snapshots
- **Memory bounded:** 50 snapshots max with daily cleanup prevents leaks
- **Performance impact:** ~10% faster than default Timeline config

**Speed optimization:**

```typescript
// ❌ BAD: Rendering every frame in headless mode
for (let i = 0; i < 100; i++) {
  gameLoop.tick(0.05);
  renderer.render(); // Unnecessary overhead!
}

// ✅ GOOD: Pure simulation, no rendering
simulator.setSpeed(100);  // 100 ticks per frame
simulator.start();        // Fast-forward via requestAnimationFrame
```

**Query caching example:**

```typescript
// ❌ BAD: Query in loop (from UI.renderMap)
for (let i = 0; i < 1000; i++) {
  const agents = world.query().with('position').with('agent').executeEntities();
  // ...
}

// ✅ GOOD: Query once, cache results
const agents = world.query().with('position').with('agent').executeEntities();
for (const agent of agents) {
  // Use cached results
}
```

**Benchmarking results (MacBook M1 Pro):**

| Preset | Entities | 1x TPS | 10x TPS | 100x TPS | Memory |
|--------|----------|--------|---------|----------|--------|
| basic | ~125 | 20 | 200 | 300-400 | ~80 MB |
| large-city | ~450 | 20 | 100 | 50-100 | ~200 MB |
| population-growth | ~100 | 20 | 180 | 250-350 | ~100 MB |

**Performance tips:**
- Use `basic` preset for quick iteration (fastest TPS)
- Use `large-city` preset for stress testing (most entities)
- Fast-forward to 100x only after stabilization (first 1000 ticks)
- Monitor TPS in dashboard - if <15, reduce speed or entity count
- Check browser DevTools Memory profiler for leaks during long runs

---

## Troubleshooting

### Simulator fails to initialize

**Check:**
1. System registration completed? (check console for "Registered full game systems")
2. World entity created? (`(world as any)._worldEntityId` exists?)
3. Materials/recipes registered? (before system registration)
4. Stabilization ticks completed? (1000 ticks after entity spawning)

**Debug:**
```typescript
const world = simulator.getWorld();
console.log('World entity ID:', (world as any)._worldEntityId);
console.log('Time entity:', world.query().with('time').executeEntities()[0]);
console.log('Agent count:', world.query().with('agent').executeEntities().length);
```

### Agents not spawning

**Check:**
1. `initialPopulation` set in config or preset?
2. `createWanderingAgent()` called for each agent?
3. Agents added to world via `(world as any)._addEntity(agent)`?
4. Stabilization ticks ran? (steering system needs initialization)

**Debug:**
```typescript
const agents = world.query().with('agent').executeEntities();
console.log(`Spawned ${agents.length} agents`);

const positions = world.query().with('position').executeEntities();
console.log(`Entities with position: ${positions.length}`);

// Check if agents have steering
const steering = world.query().with('steering').executeEntities();
console.log(`Agents with steering: ${steering.length}`);
```

### CityManager not making decisions

**Check:**
1. `decisionInterval` configured? (default: 14400 ticks = 1 day)
2. `cityManager.tick(world)` called every tick?
3. Enough game time elapsed? (decisions made once per day)
4. Manual override enabled? (UI sliders override decisions)

**Debug:**
```typescript
simulator.on('decision', (reasoning) => {
  console.log('Decision made:', reasoning);
});

// Force immediate decision
simulator.forceDecision();

// Check if manually controlled
console.log('Manually controlled:', simulator.isManuallyControlled());
```

### UI not updating

**Check:**
1. Event listeners registered? (`simulator.on('tick', ...)`)
2. Simulation running? (`simulator.isRunning()`)
3. UI update interval? (updates every 20 ticks by default)
4. Browser console errors? (check for DOM element not found)

**Debug:**
```typescript
console.log('Simulator running:', simulator.isRunning());
console.log('Stats:', simulator.getStats());

// Force update
(window as any).ui.update();

// Check event listeners
console.log('Event listeners:', simulator['eventListeners']);
```

### "World entity not set" error

**Error:** `Systems cannot find world entity ID`

**Fix:** Ensure world entity created before first tick:

```typescript
// ❌ BAD: Register systems, then run ticks before world entity
coreRegisterAllSystems(gameLoop, config);
gameLoop.tick(0.05); // ERROR: TimeSystem queries missing world entity
const worldEntity = new EntityImpl(createEntityId(), 0);
// ...

// ✅ GOOD: Create world entity, then register systems and tick
const worldEntity = new EntityImpl(createEntityId(), 0);
worldEntity.addComponent(createTimeComponent());
worldEntity.addComponent(createWeatherComponent('clear', 0.5, 14400));
worldEntity.addComponent(createNamedLandmarksComponent());
(world as any)._addEntity(worldEntity);
(world as any)._worldEntityId = worldEntity.id;

coreRegisterAllSystems(gameLoop, config);
gameLoop.tick(0.05); // OK: World entity exists
```

**Note:** The current implementation registers systems **before** world entity creation. This works because systems don't query for world entity until first `tick()`, which happens **after** initialization completes.

### Port 3032 already in use

**Error:** `EADDRINUSE: address already in use :::3032`

**Fix:** Kill existing process or change port:

```bash
# Find process using port 3032
lsof -i :3032

# Kill process
kill -9 <PID>

# Or change port in vite.config.ts
server: {
  port: 3033,  // Use different port
}
```

### Low TPS at high speed

**Symptom:** TPS drops below 15 when running at 100x speed

**Causes:**
1. Too many entities for CPU (large-city preset)
2. Expensive systems running every tick (LLM, metrics)
3. Memory pressure from Timeline snapshots
4. Browser throttling background tabs

**Fix:**
```typescript
// 1. Reduce speed
simulator.setSpeed(10); // Instead of 100

// 2. Use basic preset
const simulator = new HeadlessCitySimulator({ preset: 'basic' });

// 3. Increase Timeline intervals
timelineManager.setConfig({
  intervalThresholds: [
    { afterTicks: 0, interval: 7200 },      // 5 min
    { afterTicks: 7200, interval: 72000 },  // Hourly
  ],
});

// 4. Keep browser tab active (foreground)
```

### Memory leak during long runs

**Symptom:** Memory usage grows unbounded over hours

**Causes:**
1. Timeline retaining too many snapshots
2. Event listeners not cleaned up
3. World entity references accumulating

**Debug:**
```typescript
// Check snapshot count
const timeline = (window as any).timeline;
console.log('Snapshots:', timeline?.snapshots?.length);

// Check entity count over time
setInterval(() => {
  const count = simulator.getWorld().query().executeEntities().length;
  console.log(`Entities: ${count}`);
}, 60000);

// Monitor memory via DevTools Performance Monitor
```

**Fix:**
```typescript
// 1. Reduce maxSnapshots
timelineManager.setConfig({ maxSnapshots: 20 });

// 2. Enable daily cleanup
timelineManager.setConfig({ maxAge: 12 * 60 * 60 * 1000 }); // 12 hours

// 3. Periodic simulator reset for ultra-long runs
setInterval(() => {
  simulator.reset();
  simulator.initialize();
  simulator.start();
}, 24 * 60 * 60 * 1000); // Every 24 hours
```

---

## Integration with Other Systems

### Main Game Demo (demo package)

The city-simulator demonstrates patterns used in the main game:

```typescript
// city-simulator: Headless setup
const simulator = new HeadlessCitySimulator({ preset: 'basic' });
await simulator.initialize();
simulator.start();

// demo: Full game with rendering
const gameLoop = new GameLoop();
coreRegisterAllSystems(gameLoop, {
  llmQueue,
  promptBuilder,
  enableMetrics: true,
  enableAutoSave: true,
});
const renderer = new PixiRenderer(canvas);
gameLoop.start();
```

**Shared patterns:**
- System registration via `coreRegisterAllSystems`
- World entity setup (time, weather, landmarks)
- Entity creation (agents, buildings, resources)
- Stabilization ticks (1000 ticks after setup)

**Differences:**
- city-simulator: No LLM, no rendering, sparse snapshots
- demo: Full LLM integration, PixiJS rendering, full snapshots

### Orchestration Dashboard

The city-simulator can be monitored via orchestration dashboard:

```bash
# Start orchestration dashboard
cd custom_game_engine
./start.sh server

# City simulator accessible at:
# http://localhost:3032/?preset=large-city

# Orchestration dashboard at:
# http://localhost:3030
```

**Integration points:**
- City simulator events → Orchestration logs
- CityManager decisions → Decision history API
- Population metrics → Agent tracking

### Metrics Collection

Enable metrics for production monitoring:

```typescript
const simulator = new HeadlessCitySimulator({
  preset: 'large-city',
});

// Modify registerSystemsForPreset() to enable metrics
coreRegisterAllSystems(this.gameLoop, {
  enableMetrics: true,  // Enable metrics collection
  metricsServerUrl: 'ws://localhost:8765',
  gameSessionId: `headless_${Date.now()}`,
});
```

**Metrics tracked:**
- System execution times (per tick)
- Entity counts by component type
- Agent behaviors and actions
- City stats over time
- Decision frequency and reasoning

**Viewing metrics:**
```bash
# Access metrics dashboard
curl "http://localhost:8766/dashboard?session=latest"

# Query specific metrics
curl "http://localhost:8766/dashboard/agents?session=headless_1234567890"
```

---

## Testing

### Running the Simulator

```bash
# Development mode (hot reload)
cd packages/city-simulator
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Automated Testing

```typescript
// Example: Test population growth over 100 days
import { HeadlessCitySimulator } from '@ai-village/city-simulator';

async function testPopulationGrowth() {
  const simulator = new HeadlessCitySimulator({
    preset: 'population-growth',
    autoRun: false,
  });
  await simulator.initialize();

  const initialPop = simulator.getStats().cityStats.population;
  console.log(`Initial population: ${initialPop}`);

  // Run for 100 game days
  simulator.setSpeed(100); // Fast-forward
  simulator.start();

  await new Promise(resolve => {
    simulator.on('day', (day: number) => {
      if (day >= 100) {
        simulator.pause();
        const finalPop = simulator.getStats().cityStats.population;
        console.log(`Day 100 population: ${finalPop}`);
        console.log(`Growth: ${finalPop - initialPop} agents`);

        // Assertions
        if (finalPop <= initialPop) {
          console.error('❌ FAIL: Population did not grow');
        } else {
          console.log('✅ PASS: Population grew as expected');
        }
        resolve(true);
      }
    });
  });
}

testPopulationGrowth();
```

### Performance Testing

```typescript
// Example: Measure TPS at different entity counts
async function benchmarkTPS() {
  const configs = [
    { preset: 'basic', expectedTPS: 20 },
    { preset: 'large-city', expectedTPS: 18 },
  ];

  for (const { preset, expectedTPS } of configs) {
    const simulator = new HeadlessCitySimulator({
      preset: preset as any,
      autoRun: false,
    });
    await simulator.initialize();

    simulator.setSpeed(1);
    simulator.start();

    // Warm up
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Measure
    const stats = simulator.getStats();
    const actualTPS = stats.ticksPerSecond;

    console.log(`${preset}: ${actualTPS.toFixed(2)} TPS (expected ${expectedTPS})`);

    if (actualTPS < expectedTPS * 0.9) {
      console.error(`❌ FAIL: TPS below 90% of expected`);
    } else {
      console.log(`✅ PASS: TPS within acceptable range`);
    }

    simulator.pause();
  }
}

benchmarkTPS();
```

### Integration Testing

```typescript
// Example: Test CityManager decision-making
async function testCityManagerDecisions() {
  const simulator = new HeadlessCitySimulator({
    preset: 'basic',
    autoRun: false,
  });
  await simulator.initialize();

  let decisionCount = 0;
  simulator.on('decision', () => {
    decisionCount++;
  });

  simulator.setSpeed(100);
  simulator.start();

  // Run for 10 game days
  await new Promise(resolve => {
    simulator.on('day', (day: number) => {
      if (day >= 10) {
        simulator.pause();

        console.log(`Decisions made: ${decisionCount}`);

        // Expect ~10 decisions (1 per day)
        if (decisionCount >= 9 && decisionCount <= 11) {
          console.log('✅ PASS: CityManager making decisions as expected');
        } else {
          console.error(`❌ FAIL: Expected ~10 decisions, got ${decisionCount}`);
        }
        resolve(true);
      }
    });
  });
}

testCityManagerDecisions();
```

---

## Further Reading

- **ARCHITECTURE_OVERVIEW.md** - Master architecture document (ECS, packages, metasystems)
- **SYSTEMS_CATALOG.md** - Complete reference of all 212+ systems
- **COMPONENTS_REFERENCE.md** - All component types
- **METASYSTEMS_GUIDE.md** - Deep dives into major metasystems
- **packages/core/src/systems/registerAllSystems.ts** - Centralized system registration
- **packages/core/src/city/CityManager.ts** - Strategic AI decision-making
- **demo/src/main.ts** - Full game setup with rendering

---

## Summary for Language Models

**Before working with city-simulator:**
1. This is a **demo package AND testing framework**, not a core game system
2. Demonstrates proper **system registration** and **world initialization** patterns
3. Uses **headless mode** for fast-forward testing and overnight simulations
4. Integrates **CityManager** for strategic AI decision-making
5. Provides **web dashboard** for monitoring and manual control
6. **Primary use case:** Performance benchmarking, balance testing, regression testing

**Common tasks:**
- **Run simulator:** `cd packages/city-simulator && npm run dev`
- **Change preset:** Add `?preset=large-city` to URL
- **Override priorities:** Drag sliders in UI or call `setPriorities()`
- **Fast-forward:** `simulator.setSpeed(100)` for 100x speed
- **Debug world:** Inspect `simulator.getWorld()` and query entities
- **Test decisions:** Subscribe to `'decision'` event
- **Benchmark:** Use `Example 4: Performance Benchmarking` pattern
- **Long-term test:** Use `Example 7: Long-term Balance Testing` pattern

**Critical rules:**
- **System registration order:** Materials → Recipes → Research → Systems → World entity
- **World entity required:** TimeSystem, WeatherSystem, LandmarkSystem need world entity
- **Stabilization required:** Run 1000 ticks after entity spawning
- **Headless optimizations:** Disable metrics, auto-save, reduce Timeline snapshots
- **Event-driven UI:** Subscribe to simulator events, don't poll state
- **Always set _worldEntityId:** `(world as any)._worldEntityId = worldEntity.id`

**Performance tips:**
- Use `basic` preset for quick iteration (fastest TPS)
- Use `large-city` preset for stress testing (most entities)
- Monitor TPS - if <15, reduce speed or entity count
- Enable sparse Timeline snapshots for overnight runs
- Check DevTools Memory profiler for leaks

**Initialization pattern (use as reference):**
```typescript
// 1. Register materials/recipes/research
registerDefaultMaterials();
initializeDefaultRecipes(globalRecipeRegistry);
registerDefaultResearch();

// 2. Register systems
coreRegisterAllSystems(gameLoop, {
  enableMetrics: false,
  enableAutoSave: false,
  llmQueue: undefined,
  plantSystems: { PlantSystem, ... },
});

// 3. Create world entity
const worldEntity = new EntityImpl(createEntityId(), 0);
worldEntity.addComponent(createTimeComponent());
worldEntity.addComponent(createWeatherComponent('clear', 0.5, 14400));
worldEntity.addComponent(createNamedLandmarksComponent());
(world as any)._addEntity(worldEntity);
(world as any)._worldEntityId = worldEntity.id;

// 4. Spawn entities (agents, buildings, resources)
for (let i = 0; i < population; i++) {
  createWanderingAgent(world, x, y);
}
createInitialBuildings(world, cityCenter);
createResources(world, bounds);

// 5. Stabilize (1000 ticks)
for (let i = 0; i < 1000; i++) {
  gameLoop.tick(0.05);
}

// 6. Force initial stats/decisions
cityManager.tick(world);
cityManager.forceDecision(world);
```

**Testing patterns:**
```typescript
// Population growth test
simulator.on('day', (day) => {
  if (day === 100) {
    const growth = stats.cityStats.population - initialPop;
    console.log(`Growth: ${growth} agents`);
  }
});

// Performance benchmark
const startTick = simulator.getStats().ticksRun;
const startTime = Date.now();
await new Promise(resolve => setTimeout(resolve, 30000));
const tps = (simulator.getStats().ticksRun - startTick) / 30;
console.log(`TPS: ${tps.toFixed(2)}`);

// Decision validation
simulator.on('decision', (reasoning) => {
  console.log(`Focus: ${reasoning.focus}, Concerns: ${reasoning.concerns}`);
});
```

**This package is a reference implementation. Use it as a template for:**
- Custom simulations and testing scenarios
- Performance benchmarking at scale
- Long-term balance validation
- Integration testing without rendering overhead
- Understanding proper game initialization patterns
