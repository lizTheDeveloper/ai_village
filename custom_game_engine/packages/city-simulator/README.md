# City Simulator - Standalone Headless Demo Package

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the city simulator to understand its architecture, setup patterns, and usage.

## Overview

The **City Simulator Package** (`@ai-village/city-simulator`) is a standalone demo/testing application that runs the full game engine in headless mode with a web-based dashboard. It demonstrates proper system initialization, game loop setup, and strategic city management.

**What it does:**
- Runs full ECS game simulation (agents, buildings, resources, systems) without 3D rendering
- Provides web dashboard for monitoring city metrics and strategic priorities
- Tests CityManager AI decision-making in isolation
- Supports multiple presets for different testing scenarios (basic, large-city, population-growth)
- Enables fast-forward simulation for time-lapse observation
- Demonstrates proper system registration and world initialization patterns

**Key files:**
- `src/HeadlessCitySimulator.ts` - Core headless game loop and world setup
- `src/main.ts` - Web dashboard UI connecting to simulator
- `index.html` - Browser-based control panel with real-time metrics
- `vite.config.ts` - Vite dev server configuration (port 3032)

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
│   └── main.ts                     # Web UI dashboard
│       - Real-time metrics rendering
│       - Strategic priority controls
│       - Speed/pause controls
│       - Agent map visualization
├── index.html                      # Browser control panel
├── vite.config.ts                  # Dev server config (port 3032)
├── package.json                    # Dependencies (@ai-village/core)
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
- **Fast-forward simulation:** Run months/years of game time quickly
- **Overnight testing:** Simulate long periods without GPU rendering
- **Performance profiling:** Isolate system performance without rendering overhead
- **Strategic testing:** Focus on CityManager AI decisions
- **Reproducibility:** Test scenarios with consistent initial conditions

### 2. Preset Configurations

Three presets demonstrate different gameplay scenarios:

```typescript
type SimulatorPreset = 'basic' | 'large-city' | 'population-growth';

// Basic: Small settlement with survival focus
{
  worldSize: { width: 200, height: 200 },
  initialPopulation: 50,
  storageBuildings: 1,
  foodPerStorage: 100,
  enableEconomy: false  // Minimal systems
}

// Large City: Full economy with distributed infrastructure
{
  worldSize: { width: 200, height: 200 },
  initialPopulation: 200,
  storageBuildings: 9,  // Distributed storage across city
  foodPerStorage: 500,
  enableEconomy: true   // All systems enabled
}

// Population Growth: Small start, reproduction systems enabled
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

### 3. System Registration Pattern

The simulator demonstrates proper centralized system registration:

```typescript
import { registerAllSystems as coreRegisterAllSystems } from '@ai-village/core';

private registerSystemsForPreset(): void {
  // 1. Register materials and recipes (required before systems)
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  registerDefaultResearch();

  // 2. Generate session ID for metrics
  const gameSessionId = `headless_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 3. Use centralized registration from @ai-village/core
  const coreResult = coreRegisterAllSystems(this.gameLoop, {
    llmQueue: undefined,        // No LLM in headless mode
    promptBuilder: undefined,   // No LLM in headless mode
    gameSessionId,
    metricsServerUrl: 'ws://localhost:8765',
    enableMetrics: false,       // Disable for performance
    enableAutoSave: false,      // Disable for headless testing
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

// Manual control
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

**Strategic priorities** control agent behavior distribution across the city.

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
case 'custom-test':
  return {
    worldSize: { width: 150, height: 150 },
    initialPopulation: 30,
    storageBuildings: 2,
    foodPerStorage: 150,
    enableEconomy: true,
  };

// Access via URL:
// http://localhost:3032/?preset=custom-test
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
  console.log(`Day ${day}: Population ${simulator.getStats().cityStats.population}`);
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

// Run simulation
simulator.start();

// Fast-forward (100x speed)
simulator.setSpeed(100);

// Run for 30 game days
setTimeout(() => {
  simulator.pause();
  const stats = simulator.getStats();
  console.log(`Final stats:`, stats.cityStats);
}, 30 * 1000); // Real-time seconds (depends on ticksPerSecond)
```

### Example 4: Debugging World Setup

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
console.log('Time:', time.getComponent('time'));

// Count agents
const agents = world.query().with('agent').executeEntities();
console.log(`Spawned ${agents.length} agents`);

// Count buildings
const buildings = world.query().with('building').executeEntities();
console.log(`Created ${buildings.length} buildings`);

// Check resources
const resources = world.query().with('resource').executeEntities();
console.log(`Spawned ${resources.length} resources`);
```

### Example 5: Testing Strategic Decisions

```typescript
const simulator = new HeadlessCitySimulator({ preset: 'basic' });
await simulator.initialize();

// Subscribe to CityManager decisions
simulator.on('decision', (reasoning) => {
  console.log(`[Day ${simulator.getStats().daysElapsed}]`);
  console.log(`Focus: ${reasoning.focus}`);
  console.log(`Reasoning: ${reasoning.reasoning}`);
  console.log(`Concerns: ${reasoning.concerns.join(', ')}`);
});

// Run simulation and observe decisions
simulator.start();

// Force a decision immediately
simulator.forceDecision();
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
```

### "World entity not set" error

**Error:** `Systems cannot find world entity ID`

**Fix:** Ensure world entity created before system registration:

```typescript
// ❌ BAD: Register systems first
coreRegisterAllSystems(gameLoop, config);
const worldEntity = new EntityImpl(createEntityId(), 0);
// ...

// ✅ GOOD: Create world entity first, then register systems
const worldEntity = new EntityImpl(createEntityId(), 0);
worldEntity.addComponent(createTimeComponent());
// ...
(world as any)._addEntity(worldEntity);
(world as any)._worldEntityId = worldEntity.id;

// Then register systems
coreRegisterAllSystems(gameLoop, config);
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
coreRegisterAllSystems(gameLoop, { ... });
const renderer = new PixiRenderer(canvas);
gameLoop.start();
```

**Shared patterns:**
- System registration via `coreRegisterAllSystems`
- World entity setup (time, weather, landmarks)
- Entity creation (agents, buildings, resources)
- Stabilization ticks (1000 ticks after setup)

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

### Metrics Collection

Enable metrics for production monitoring:

```typescript
const simulator = new HeadlessCitySimulator({
  preset: 'large-city',
  // ... config
});

// Modify registerSystemsForPreset() to enable metrics
coreRegisterAllSystems(this.gameLoop, {
  enableMetrics: true,  // Enable metrics collection
  metricsServerUrl: 'ws://localhost:8765',
  // ...
});
```

**Metrics tracked:**
- System execution times
- Entity counts by component type
- Agent behaviors and actions
- City stats over time

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
        resolve(true);
      }
    });
  });
}

testPopulationGrowth();
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
1. This is a **demo package**, not a core game system
2. Demonstrates proper **system registration** and **world initialization**
3. Uses **headless mode** for fast-forward testing and overnight simulations
4. Integrates **CityManager** for strategic AI decision-making
5. Provides **web dashboard** for monitoring and manual control

**Common tasks:**
- **Run simulator:** `cd packages/city-simulator && npm run dev`
- **Change preset:** Add `?preset=large-city` to URL
- **Override priorities:** Drag sliders in UI or call `setPriorities()`
- **Fast-forward:** `simulator.setSpeed(100)` for 100x speed
- **Debug world:** Inspect `simulator.getWorld()` and query entities
- **Test decisions:** Subscribe to `'decision'` event

**Critical rules:**
- **System registration order:** Materials → Recipes → Research → Systems → World entity
- **World entity required:** TimeSystem, WeatherSystem, LandmarkSystem need world entity
- **Stabilization required:** Run 1000 ticks after entity spawning
- **Headless optimizations:** Disable metrics, auto-save, reduce Timeline snapshots
- **Event-driven UI:** Subscribe to simulator events, don't poll state

**Initialization pattern (use as reference):**
```typescript
// 1. Register materials/recipes/research
registerDefaultMaterials();
initializeDefaultRecipes(globalRecipeRegistry);
registerDefaultResearch();

// 2. Register systems
coreRegisterAllSystems(gameLoop, { enableMetrics: false, enableAutoSave: false });

// 3. Create world entity
const worldEntity = new EntityImpl(createEntityId(), 0);
worldEntity.addComponent(createTimeComponent());
worldEntity.addComponent(createWeatherComponent('clear', 0.5, 14400));
worldEntity.addComponent(createNamedLandmarksComponent());
(world as any)._addEntity(worldEntity);
(world as any)._worldEntityId = worldEntity.id;

// 4. Spawn entities (agents, buildings, resources)
// ...

// 5. Stabilize (1000 ticks)
for (let i = 0; i < 1000; i++) {
  gameLoop.tick(0.05);
}

// 6. Force initial stats/decisions
cityManager.tick(world);
cityManager.forceDecision(world);
```

**This package is a reference implementation. Use it as a template for custom simulations, testing scenarios, and understanding proper game initialization patterns.**
