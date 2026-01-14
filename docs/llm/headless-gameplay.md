# Headless Gameplay Guide

**Purpose:** Run game simulation without UI for fast-forward testing, performance benchmarking, and overnight experiments.

**Package:** `@ai-village/city-simulator`
**URL:** `http://localhost:3032`
**Speed:** 1-100x real-time

---

## Table of Contents

1. [Overview](#overview)
2. [Starting Headless Simulation](#starting-headless-simulation)
3. [Preset Configurations](#preset-configurations)
4. [Programmatic Control](#programmatic-control)
5. [Performance Benchmarking](#performance-benchmarking)
6. [Long-Running Experiments](#long-running-experiments)
7. [Automated Testing](#automated-testing)
8. [Integration with Metrics](#integration-with-metrics)

---

## Overview

### What is Headless Mode?

Headless simulation runs the full game engine (ECS, systems, entities) without 3D rendering:

**Includes:**
- All 212+ game systems (agents, plants, buildings, weather, etc.)
- Full ECS world (4,000-6,000 entities)
- Event bus and action queue
- Metrics collection (optional)
- CityManager strategic AI

**Excludes:**
- PixiJS 3D rendering
- User input handling (keyboard/mouse)
- GPU rendering overhead

### Why Use Headless Mode?

1. **Fast-forward:** Run at 100x speed (100 ticks per frame vs 1 tick/frame)
2. **Overnight testing:** Simulate weeks/months of game time (100 days = ~10 minutes at 100x)
3. **Performance profiling:** Isolate system performance without GPU overhead
4. **Automated testing:** Run reproducible experiments with preset configurations
5. **Memory efficiency:** Sparse Timeline snapshots prevent OOM during long runs

### Performance Comparison

| Mode | TPS (1x) | TPS (100x) | Entities | Use Case |
|------|----------|------------|----------|----------|
| **Full Game** (rendering) | 20 | 20 | 4,000+ | Development, debugging |
| **Headless Basic** | 20 | 300-400 | ~125 | Quick testing |
| **Headless Large** | 20 | 50-100 | ~450 | Stress testing |

---

## Starting Headless Simulation

### Method 1: Browser UI (Recommended for Observation)
```bash
cd custom_game_engine/packages/city-simulator
npm run dev

# Open browser to:
# http://localhost:3032/?preset=basic
```

**Dashboard provides:**
- Real-time city stats (population, food, resources)
- Strategic priority sliders (manual override)
- Decision history (CityManager reasoning)
- Agent map visualization
- Speed control (1x, 10x, 100x)

### Method 2: Programmatic (Recommended for Testing)
```javascript
// Node.js script
import { HeadlessCitySimulator } from '@ai-village/city-simulator';

const simulator = new HeadlessCitySimulator({
  preset: 'basic',
  autoRun: false,
});

await simulator.initialize();
simulator.start();
```

### Method 3: Integrated with Game Server
```bash
cd custom_game_engine
./start.sh

# Access headless simulator at:
# http://localhost:3032
```

---

## Preset Configurations

Three presets for different testing scenarios:

### 1. Basic (Quick Testing)
```javascript
{
  preset: 'basic',
  worldSize: { width: 200, height: 200 },
  initialPopulation: 50,
  storageBuildings: 1,
  foodPerStorage: 100,
  enableEconomy: false  // Minimal systems
}
```

**Entities:** ~125 (50 agents, 1 storage, 74 resources)
**TPS (100x):** 300-400
**Use for:** Quick iteration, baseline performance testing

**Start:**
```bash
http://localhost:3032/?preset=basic
```

### 2. Large City (Stress Testing)
```javascript
{
  preset: 'large-city',
  worldSize: { width: 200, height: 200 },
  initialPopulation: 200,
  storageBuildings: 9,  // Distributed across city
  foodPerStorage: 500,
  enableEconomy: true   // All systems
}
```

**Entities:** ~450 (200 agents, 9 storage, 241 resources)
**TPS (100x):** 50-100
**Use for:** Performance profiling, scalability validation, finding bottlenecks

**Start:**
```bash
http://localhost:3032/?preset=large-city
```

### 3. Population Growth (Long-term Balance)
```javascript
{
  preset: 'population-growth',
  worldSize: { width: 200, height: 200 },
  initialPopulation: 20,
  storageBuildings: 2,
  foodPerStorage: 200,
  enableEconomy: true   // Includes reproduction systems
}
```

**Entities:** ~100 (20 agents, 2 storage, 78 resources)
**TPS (100x):** 250-350
**Use for:** Overnight testing, population dynamics, emergent behavior

**Start:**
```bash
http://localhost:3032/?preset=population-growth
```

---

## Programmatic Control

### Basic API

```javascript
const sim = new HeadlessCitySimulator({ preset: 'basic' });
await sim.initialize();

// Lifecycle
sim.start();        // Start simulation
sim.pause();        // Pause simulation
sim.reset();        // Reset to initial state
sim.setSpeed(100);  // Set speed (1-100x)

// State access
const world = sim.getWorld();
const manager = sim.getCityManager();
const stats = sim.getStats();
const running = sim.isRunning();

// Manual control
sim.setPriorities({
  gathering: 0.40,
  building: 0.10,
  farming: 0.30,
  social: 0.05,
  exploration: 0.05,
  rest: 0.05,
  magic: 0.05,
});
sim.releaseManualControl();
sim.forceDecision();  // Force CityManager decision immediately
```

### Event Subscriptions

```javascript
// Lifecycle events
sim.on('initialized', ({ population, preset }) => {
  console.log(`Initialized ${preset} with ${population} agents`);
});

sim.on('start', () => {
  console.log('Simulation started');
});

sim.on('pause', () => {
  console.log('Simulation paused');
});

sim.on('reset', () => {
  console.log('Simulation reset');
});

// Time events
sim.on('tick', (ticksRun) => {
  // Fired every 20 ticks (1 second at 1x speed)
  if (ticksRun % 100 === 0) {
    console.log(`Tick ${ticksRun}`);
  }
});

sim.on('day', (dayNumber) => {
  console.log(`Day ${dayNumber} complete`);
});

sim.on('month', (monthNumber) => {
  console.log(`Month ${monthNumber} complete`);
});

// Decision events
sim.on('decision', (reasoning) => {
  console.log(`CityManager decision:`, reasoning);
  // reasoning: { focus, reasoning, concerns }
});

// Priority events
sim.on('priorities-changed', (priorities) => {
  console.log(`Priorities updated:`, priorities);
});

sim.on('speed', (ticksPerFrame) => {
  console.log(`Speed changed to ${ticksPerFrame}x`);
});
```

### Stats Object

```javascript
const stats = sim.getStats();

// Runtime metrics
stats.ticksRun;         // Total ticks executed
stats.daysElapsed;      // ticksRun / 14400
stats.monthsElapsed;    // daysElapsed / 30
stats.ticksPerSecond;   // Real-time TPS

// City metrics
stats.cityStats = {
  population: 50,
  foodSupply: 12.5,          // Days of food remaining
  totalBuildings: 5,
  threatLevel: 0.1,          // 0-1 danger level
  avgHealth: 85.2,
  avgHunger: 0.65,
  avgEnergy: 0.72,
};

// Strategic priorities
stats.cityPriorities = {
  gathering: 0.25,
  building: 0.20,
  farming: 0.15,
  social: 0.10,
  exploration: 0.15,
  rest: 0.10,
  magic: 0.05,
};
```

---

## Performance Benchmarking

### Benchmark TPS at Different Speeds

```javascript
async function benchmarkTPS() {
  const sim = new HeadlessCitySimulator({
    preset: 'large-city',
    autoRun: false,
  });
  await sim.initialize();

  // Warm up (1000 ticks)
  sim.setSpeed(1);
  sim.start();
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Measure TPS at 1x
  const startTick1x = sim.getStats().ticksRun;
  const startTime1x = Date.now();
  await new Promise(resolve => setTimeout(resolve, 30000));
  const endTick1x = sim.getStats().ticksRun;
  const endTime1x = Date.now();
  const tps1x = (endTick1x - startTick1x) / ((endTime1x - startTime1x) / 1000);

  console.log(`TPS at 1x: ${tps1x.toFixed(2)}`);

  // Measure TPS at 100x
  sim.setSpeed(100);
  const startTick100x = sim.getStats().ticksRun;
  const startTime100x = Date.now();
  await new Promise(resolve => setTimeout(resolve, 30000));
  const endTick100x = sim.getStats().ticksRun;
  const endTime100x = Date.now();
  const tps100x = (endTick100x - startTick100x) / ((endTime100x - startTime100x) / 1000);

  console.log(`TPS at 100x: ${tps100x.toFixed(2)}`);
  console.log(`Speedup: ${(tps100x / tps1x).toFixed(1)}x`);

  sim.pause();
}

benchmarkTPS();
// Output:
// TPS at 1x: 20.00
// TPS at 100x: 75.50
// Speedup: 3.8x
```

### Benchmark Entity Count Scaling

```javascript
async function benchmarkScaling() {
  const presets = ['basic', 'population-growth', 'large-city'];

  for (const preset of presets) {
    const sim = new HeadlessCitySimulator({
      preset: preset as any,
      autoRun: false,
    });
    await sim.initialize();

    // Measure entities
    const entityCount = sim.getWorld().query().executeEntities().length;

    // Measure TPS
    sim.setSpeed(1);
    sim.start();
    await new Promise(resolve => setTimeout(resolve, 30000));
    const tps = sim.getStats().ticksPerSecond;

    console.log(`${preset}: ${entityCount} entities, ${tps.toFixed(2)} TPS`);
    sim.pause();
  }
}

benchmarkScaling();
// Output:
// basic: 125 entities, 20.00 TPS
// population-growth: 100 entities, 20.00 TPS
// large-city: 450 entities, 18.50 TPS
```

---

## Long-Running Experiments

### Test Population Growth Over 100 Days

```javascript
async function testPopulationGrowth() {
  const sim = new HeadlessCitySimulator({
    preset: 'population-growth',
    autoRun: false,
  });
  await sim.initialize();

  const initialPop = sim.getStats().cityStats.population;
  console.log(`Initial population: ${initialPop}`);

  // Fast-forward to 100 days
  sim.setSpeed(100);
  sim.start();

  return new Promise((resolve) => {
    sim.on('day', (day) => {
      if (day % 10 === 0) {
        const stats = sim.getStats();
        console.log(`Day ${day}: Pop ${stats.cityStats.population}, Food ${stats.cityStats.foodSupply.toFixed(1)} days`);
      }

      if (day >= 100) {
        sim.pause();
        const stats = sim.getStats();
        console.log(`\nDay 100 Results:`);
        console.log(`Population: ${stats.cityStats.population} (${stats.cityStats.population > initialPop ? '+' : ''}${stats.cityStats.population - initialPop})`);
        console.log(`Food supply: ${stats.cityStats.foodSupply.toFixed(1)} days`);
        console.log(`Avg TPS: ${stats.ticksPerSecond.toFixed(2)}`);
        resolve(true);
      }
    });
  });
}

testPopulationGrowth();
// Output:
// Initial population: 20
// Day 10: Pop 22, Food 15.3 days
// Day 20: Pop 25, Food 18.7 days
// ...
// Day 100 Results:
// Population: 45 (+25)
// Food supply: 25.5 days
// Avg TPS: 275.80
```

### Overnight Resource Balance Test

```javascript
async function overnightResourceTest() {
  const sim = new HeadlessCitySimulator({
    preset: 'large-city',
    autoRun: false,
  });
  await sim.initialize();

  console.log('Starting overnight test (300 days = ~3 hours at 100x speed)');

  const resourceData = [];

  sim.setSpeed(100);
  sim.start();

  sim.on('day', (day) => {
    if (day % 30 === 0) {  // Every 30 days = 1 month
      const stats = sim.getStats();
      resourceData.push({
        day,
        population: stats.cityStats.population,
        food: stats.cityStats.foodSupply,
        avgHealth: stats.cityStats.avgHealth,
      });
      console.log(`Month ${day / 30}: ${JSON.stringify(resourceData[resourceData.length - 1])}`);
    }

    if (day >= 300) {
      sim.pause();
      console.log('\nOvernight test complete');
      console.log('Resource data:', resourceData);

      // Analysis
      const avgPop = resourceData.reduce((sum, d) => sum + d.population, 0) / resourceData.length;
      const avgFood = resourceData.reduce((sum, d) => sum + d.food, 0) / resourceData.length;
      console.log(`Avg population: ${avgPop.toFixed(1)}`);
      console.log(`Avg food supply: ${avgFood.toFixed(1)} days`);

      // Save results
      require('fs').writeFileSync('overnight-results.json', JSON.stringify(resourceData, null, 2));
    }
  });
}

overnightResourceTest();
```

---

## Automated Testing

### Regression Test: Population Stability

```javascript
async function testPopulationStability() {
  const sim = new HeadlessCitySimulator({
    preset: 'basic',
    autoRun: false,
  });
  await sim.initialize();

  const initialPop = sim.getStats().cityStats.population;
  sim.setSpeed(100);
  sim.start();

  return new Promise((resolve) => {
    sim.on('day', (day) => {
      if (day === 30) {
        sim.pause();
        const finalPop = sim.getStats().cityStats.population;
        const change = finalPop - initialPop;
        const changePercent = (change / initialPop) * 100;

        if (Math.abs(changePercent) > 20) {
          console.error(`❌ FAIL: Population changed by ${changePercent.toFixed(1)}% (expected <20%)`);
          process.exit(1);
        } else {
          console.log(`✅ PASS: Population stable (${changePercent.toFixed(1)}% change)`);
          resolve(true);
        }
      }
    });
  });
}

testPopulationStability();
```

### Test CityManager Decision-Making

```javascript
async function testCityManagerDecisions() {
  const sim = new HeadlessCitySimulator({
    preset: 'basic',
    autoRun: false,
  });
  await sim.initialize();

  let decisionCount = 0;
  const decisions = [];

  sim.on('decision', (reasoning) => {
    decisionCount++;
    decisions.push(reasoning);
    console.log(`Decision ${decisionCount}: ${reasoning.focus} (${reasoning.reasoning})`);
  });

  sim.setSpeed(100);
  sim.start();

  return new Promise((resolve) => {
    sim.on('day', (day) => {
      if (day === 10) {
        sim.pause();

        // Expect ~10 decisions (1 per day)
        if (decisionCount >= 9 && decisionCount <= 11) {
          console.log(`✅ PASS: CityManager making decisions (${decisionCount}/10 days)`);
        } else {
          console.error(`❌ FAIL: Expected ~10 decisions, got ${decisionCount}`);
          process.exit(1);
        }

        // Check decision diversity
        const focuses = [...new Set(decisions.map(d => d.focus))];
        if (focuses.length >= 3) {
          console.log(`✅ PASS: Decision diversity (${focuses.length} different focuses)`);
        } else {
          console.error(`❌ FAIL: Low decision diversity (only ${focuses.length} focuses)`);
          process.exit(1);
        }

        resolve(true);
      }
    });
  });
}

testCityManagerDecisions();
```

---

## Integration with Metrics

### Enable Metrics in Headless Mode

By default, headless mode **disables metrics** for max performance. To enable:

```javascript
// In HeadlessCitySimulator.ts, modify registerSystemsForPreset():
const coreResult = coreRegisterAllSystems(this.gameLoop, {
  llmQueue: undefined,
  promptBuilder: undefined,
  gameSessionId: `headless_${Date.now()}`,
  metricsServerUrl: 'ws://localhost:8765',
  enableMetrics: true,        // Change to true
  enableAutoSave: false,
  plantSystems,
});
```

### Query Metrics During Headless Run

```javascript
async function headlessWithMetrics() {
  const sim = new HeadlessCitySimulator({
    preset: 'large-city',
    autoRun: false,
  });
  await sim.initialize();

  sim.setSpeed(10);  // Slower for metrics sampling
  sim.start();

  // Query metrics every 30 seconds
  const metricsInterval = setInterval(async () => {
    const response = await fetch('http://localhost:8766/dashboard?session=latest');
    const data = await response.json();

    console.log(`Metrics: Pop ${data.metrics.population}, Gini ${data.metrics.wealthDistribution.giniCoefficient.toFixed(2)}`);
  }, 30000);

  // Stop after 100 days
  sim.on('day', (day) => {
    if (day >= 100) {
      sim.pause();
      clearInterval(metricsInterval);
      console.log('Headless run complete');
    }
  });
}

headlessWithMetrics();
```

---

## Related Documentation

- **[experiment-workflows.md](./experiment-workflows.md)** - Common experiment patterns
- **[observation-guide.md](./observation-guide.md)** - What to observe during runs
- **[examples.md](./examples.md)** - Complete working examples

---

## Troubleshooting

### Simulator Won't Initialize
**Symptom:** `initialize()` hangs or throws error

**Fix:**
```javascript
// Check console for system registration errors
await sim.initialize();
// Should log: "Registered full game systems (headless)"

// Verify world entity exists
const world = sim.getWorld();
console.log('World entity ID:', (world as any)._worldEntityId);
```

### Low TPS at High Speed
**Symptom:** TPS drops below 15 at 100x speed

**Fix:**
```javascript
// Use basic preset instead of large-city
const sim = new HeadlessCitySimulator({ preset: 'basic' });

// Or reduce speed
sim.setSpeed(10);  // Instead of 100

// Or increase Timeline snapshot intervals (in HeadlessCitySimulator.ts)
timelineManager.setConfig({
  intervalThresholds: [
    { afterTicks: 0, interval: 7200 },      // 5 min
    { afterTicks: 7200, interval: 72000 },  // Hourly
  ],
});
```

### Memory Leak During Long Runs
**Symptom:** Memory grows unbounded over hours

**Fix:**
```javascript
// In HeadlessCitySimulator.ts, Timeline is already configured for sparse snapshots:
timelineManager.setConfig({
  maxSnapshots: 50,                    // vs default 100
  maxAge: 24 * 60 * 60 * 1000,        // 24hr retention
  intervalThresholds: [
    // Hourly snapshots after 10 min
    { afterTicks: 12000, interval: 72000 },
  ],
});

// For ultra-long runs, reduce further:
timelineManager.setConfig({
  maxSnapshots: 20,
  maxAge: 12 * 60 * 60 * 1000,  // 12hr retention
});
```
