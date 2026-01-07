# Environment Package - Environmental Simulation

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the environment systems to understand their architecture, interfaces, and usage patterns.

## Overview

The **Environment Package** (`@ai-village/environment`) implements comprehensive environmental simulation systems including time progression, weather patterns, temperature effects, and soil management for farming.

**What it does:**
- Day/night cycle with phases (dawn, day, dusk, night) and light levels
- Dynamic weather patterns (clear, rain, snow, storm, fog) with transitions
- Temperature simulation with thermal inertia, building insulation, and heat sources
- Soil system for farming (fertility, moisture, nutrients, fertilizer)
- Environmental effects on entities (temperature damage, movement modifiers, plant growth)

**Key files:**
- `packages/environment/src/systems/TimeSystem.ts` - Day/night cycle (priority 3)
- `packages/environment/src/systems/WeatherSystem.ts` - Weather patterns (priority 5)
- `packages/environment/src/systems/TemperatureSystem.ts` - Temperature effects (priority 14)
- `packages/environment/src/systems/SoilSystem.ts` - Soil management (priority 15)
- `packages/core/src/components/WeatherComponent.ts` - Weather state
- `packages/core/src/components/TemperatureComponent.ts` - Entity temperature

---

## Package Structure

```
packages/environment/
├── src/
│   ├── systems/
│   │   ├── TimeSystem.ts              # Day/night cycle, time progression
│   │   ├── WeatherSystem.ts           # Weather pattern simulation
│   │   ├── TemperatureSystem.ts       # Temperature effects and comfort
│   │   └── SoilSystem.ts              # Soil fertility and moisture
│   └── index.ts                       # Package exports
├── package.json
└── README.md                          # This file

packages/core/src/components/
├── WeatherComponent.ts                # Weather state (singleton)
├── TemperatureComponent.ts            # Entity temperature tracking
└── TimeComponent.ts                   # Time state (singleton)
```

---

## Core Concepts

### 1. Day/Night Cycle

The time system manages a continuous day/night cycle with four phases:

```typescript
type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

// Phase timing (hours in 24-hour format)
const DAWN_START_HOUR = 5;   // 5:00 - Dawn begins
const DAY_START_HOUR = 7;    // 7:00 - Full daylight
const DUSK_START_HOUR = 17;  // 17:00 - Sunset begins
const NIGHT_START_HOUR = 19; // 19:00 - Full darkness
```

**Time progression:**
- `timeOfDay`: 0-24 hours (continuous, wraps at 24)
- `dayLength`: Real-time seconds per game day (default: 48 seconds at 1x speed)
- `speedMultiplier`: Time acceleration (1x, 2x, 4x, 8x)
- `day`: Current day number (starts at 1)

**Light levels:**
- Dawn: 0.3 → 1.0 (gradual sunrise)
- Day: 1.0 (full brightness)
- Dusk: 1.0 → 0.1 (gradual sunset)
- Night: 0.1 (darkness)

**Example:**
```typescript
const time = createTimeComponent(
  6,    // Start at 6:00 (dawn)
  48,   // 48 seconds per game day
  1     // 1x speed
);

// After 24 seconds at 1x speed:
// timeOfDay = 18 (6:00 PM, dusk)
// phase = 'dusk'
// day = 1
```

### 2. Weather Patterns

Weather transitions randomly between five types with configurable intensity:

```typescript
type WeatherType = 'clear' | 'rain' | 'snow' | 'storm' | 'fog';

interface WeatherComponent {
  weatherType: WeatherType;
  intensity: number;          // 0-1 (0 = none, 1 = max intensity)
  duration: number;           // Seconds until next transition
  tempModifier: number;       // Temperature change (°C)
  movementModifier: number;   // Movement speed multiplier (0-1)
}
```

**Weather effects:**

| Type | Temp Modifier | Movement | Default Duration |
|------|--------------|----------|------------------|
| Clear | 0°C | 1.0× | 60-300s |
| Rain | -3°C | 0.8× | 60-300s |
| Snow | -8°C | 0.7× | 60-300s |
| Storm | -5°C | 0.5× | 60-300s |
| Fog | -2°C | 0.9× | 60-300s |

**Weather transitions:**
- 1% chance per second to transition (configurable)
- Minimum 60 seconds per weather state
- Weighted random selection (50% clear, 25% rain, 15% snow, 10% storm, 10% fog)
- Same weather type less likely to repeat (50% weight reduction)

### 3. Temperature System

Temperature affects entity comfort and health with gradual changes (thermal inertia):

```typescript
interface TemperatureComponent {
  currentTemp: number;        // Current body temperature (°C)
  comfortMin: number;         // Comfortable range min (default: 18°C)
  comfortMax: number;         // Comfortable range max (default: 26°C)
  toleranceMin: number;       // Survival range min (default: 5°C)
  toleranceMax: number;       // Survival range max (default: 40°C)
  state: TemperatureState;    // Comfort level
}

type TemperatureState =
  | 'comfortable'       // Within comfort range
  | 'cold'              // Below comfort, above tolerance
  | 'hot'               // Above comfort, below tolerance
  | 'dangerously_cold'  // Below tolerance (health damage)
  | 'dangerously_hot';  // Above tolerance (health damage)
```

**Temperature calculation:**
```typescript
// Base world temperature (°C)
const baseTemp = 20°C;

// Daily variation (sine wave, ±8°C)
const dailyVariation = 8 * sin((timeOfDay - 6) / 24 * 2π);

// Weather modifier
const weatherEffect = weather.tempModifier;

// Building insulation effect
const buildingEffect = insideBuilding ?
  (ambientTemp * (1 - insulation) + baseTemp) : ambientTemp;

// Heat source bonus (campfires)
const heatBonus = distance <= heatRadius ?
  heatAmount * (1 - distance / radius) : 0;

// Final ambient temperature
ambientTemp = baseTemp + dailyVariation + weatherEffect + heatBonus;

// Entity temperature changes gradually (thermal inertia)
bodyTemp += (ambientTemp - bodyTemp) * THERMAL_RATE * deltaTime;
// THERMAL_RATE = 0.15 (~7 seconds to change 1°C)
```

**Health damage:**
- `dangerously_cold` or `dangerously_hot`: -5 health/second
- Death at 0 health

**Thermal effects:**
- **Building insulation:** Walls reduce temperature change
  - Wood: 50% insulation
  - Stone: 80% insulation
  - Mud brick: 60% insulation
- **Heat sources:** Campfires provide warmth within radius
- **Tile-based rooms:** Detected by surrounding walls (3+ sides = indoors)

### 4. Soil System

Manages soil properties for farming with fertility, moisture, and nutrients:

```typescript
interface Tile {
  terrain: string;               // 'grass', 'dirt', etc.
  moisture: number;              // 0-100 (water content)
  fertility: number;             // 0-100 (base soil quality)
  biome: BiomeType;              // Determines initial fertility
  tilled: boolean;               // Ready for planting
  plantability: number;          // Uses remaining (0-3)
  nutrients: {
    nitrogen: number;            // 0-100 (leaf growth)
    phosphorus: number;          // 0-100 (root growth)
    potassium: number;           // 0-100 (fruit production)
  };
  fertilized: boolean;           // Has fertilizer applied
  fertilizerDuration: number;    // Seconds remaining
  composted: boolean;            // Compost applied
  lastWatered: number;           // Last watering tick
  lastTilled: number;            // Last tilling tick
}
```

**Soil mechanics:**

1. **Tilling:** Converts grass → dirt, makes plantable
   - Fertility based on biome:
     - Plains: 70-80
     - Forest: 60-70
     - River: 80-90
     - Desert: 20-30
     - Mountains: 40-50
   - Plantability: 3 uses per tilling
   - Nutrients initialized from fertility

2. **Moisture decay:**
   - Base: -10/day
   - Hot weather (>25°C): -15/day
   - Cold weather (<10°C): -5/day
   - Rain: +40 * intensity
   - Snow: +20 * intensity

3. **Soil depletion:**
   - Each harvest: -15 fertility, -1 plantability
   - Depleted (plantability = 0): Must re-till

4. **Fertilization:**
   - Boosts fertility and nutrients
   - Duration: 7-90 days depending on type
   - Types: compost, manure, fish meal, bone meal

---

## System APIs

### TimeSystem (Priority 3)

Manages day/night cycle and time progression. Runs first to establish time tracking.

**Dependencies:** None (runs first)

**Update interval:** Every tick (continuously advances time)

**Key methods:**

```typescript
class TimeSystem {
  // Set universe ID for time scale management
  setUniverseId(universeId: string): void;

  // Get temperature modifier for time of day
  static getTemperatureModifier(timeOfDay: number): number;
  // Returns: -5°C (night), -2°C (dawn/dusk), 0°C (day)
}
```

**Events emitted:**

```typescript
// Day transitions
'time:day_changed' → { day, newDay }

// Week transitions (every 7 days)
'time:new_week' → { week }

// Phase transitions
'time:phase_changed' → { phase, oldPhase, newPhase }
```

**Creating time entity:**

```typescript
import { createTimeComponent } from '@ai-village/environment';

const timeEntity = world.createEntity();
timeEntity.addComponent(createTimeComponent(
  6,    // Start at 6:00 AM (dawn)
  48,   // 48 seconds per game day
  1     // 1x speed multiplier
));

// Time automatically advances each tick
```

**Reading time state:**

```typescript
const timeEntities = world.query().with('time').executeEntities();
if (timeEntities.length > 0) {
  const time = timeEntities[0].getComponent<TimeComponent>('time');
  console.log(`Day ${time.day}, ${time.timeOfDay.toFixed(1)} hours`);
  console.log(`Phase: ${time.phase}, Light: ${time.lightLevel}`);
}
```

### WeatherSystem (Priority 5)

Simulates weather pattern transitions and effects.

**Dependencies:** `TimeSystem` (priority 3)

**Update interval:** Every tick (checks transition chance)

**Key methods:**

```typescript
// Weather system has no public API - weather transitions automatically
// Weather state is read-only through WeatherComponent
```

**Events emitted:**

```typescript
// Weather type changes
'weather:changed' → { oldWeather, weatherType, intensity }
```

**Creating weather entity:**

```typescript
import { createWeatherComponent } from '@ai-village/core';

const weatherEntity = world.createEntity();
weatherEntity.addComponent(createWeatherComponent(
  'clear',  // Initial weather type
  0,        // Intensity (0 for clear)
  120       // Duration (120 seconds)
));

// Weather automatically transitions based on duration and random chance
```

**Reading weather state:**

```typescript
const weatherEntities = world.query().with('weather').executeEntities();
if (weatherEntities.length > 0) {
  const weather = weatherEntities[0].getComponent<WeatherComponent>('weather');
  console.log(`Weather: ${weather.weatherType}`);
  console.log(`Intensity: ${weather.intensity}`);
  console.log(`Temp modifier: ${weather.tempModifier}°C`);
  console.log(`Movement: ${weather.movementModifier * 100}%`);
}
```

### TemperatureSystem (Priority 14)

Manages temperature effects on entities with thermal inertia, insulation, and heat sources.

**Dependencies:** `TimeSystem` (3), `WeatherSystem` (5)

**Update interval:** Every tick

**Performance optimizations:**
- Caches singleton entity IDs (time, weather)
- Refreshes building cache every 100 ticks
- Caches tile insulation calculations every 50 ticks
- Only simulates entities near agents (within 50 tiles)

**Key methods:**

```typescript
// Temperature system has no public API - effects are automatic
// Temperature changes gradually based on environment
```

**Events emitted:**

```typescript
// Entered dangerous temperature range
'temperature:danger' → {
  agentId,
  entityId,
  temperature,
  health,
  state
}

// Exited dangerous temperature range
'temperature:comfortable' → {
  agentId,
  entityId,
  temperature,
  state
}

// Critical health (from temperature damage)
'agent:health_critical' → { agentId, entityId, health }
```

**Creating temperature component:**

```typescript
import { createTemperatureComponent } from '@ai-village/core';

const agent = world.createEntity();
agent.addComponent(createTemperatureComponent(
  20,   // Current temp (20°C)
  18,   // Comfort min (18°C)
  26,   // Comfort max (26°C)
  5,    // Tolerance min (5°C)
  40    // Tolerance max (40°C)
));

// Temperature automatically adjusts to ambient conditions
```

**Checking temperature state:**

```typescript
const tempComp = agent.getComponent<TemperatureComponent>('temperature');

if (tempComp.state === 'dangerously_cold') {
  console.log('Agent is freezing! Find shelter!');
} else if (tempComp.state === 'cold') {
  console.log('Agent is cold but not in danger');
} else if (tempComp.state === 'comfortable') {
  console.log('Agent is comfortable');
}

// Health damage rate: 5 HP/second in dangerous temps
```

### SoilSystem (Priority 15)

Manages soil fertility, moisture, and nutrients for farming.

**Dependencies:** `TimeSystem` (3), `WeatherSystem` (5)

**Update interval:** Daily updates based on accumulated time

**Key methods:**

```typescript
class SoilSystem {
  // Convert grass → dirt, make plantable
  tillTile(world: World, tile: Tile, x: number, y: number): void;

  // Increase moisture by 20 (capped at 100)
  waterTile(world: World, tile: Tile, x: number, y: number): void;

  // Apply fertilizer boost
  fertilizeTile(
    world: World,
    tile: Tile,
    x: number,
    y: number,
    fertilizerType: FertilizerType
  ): void;

  // Reduce fertility after harvest
  depleteSoil(world: World, tile: Tile, x: number, y: number): void;

  // Process daily moisture decay
  decayMoisture(
    world: World,
    tile: Tile,
    x: number,
    y: number,
    temperature: number
  ): void;

  // Apply rain moisture increase
  applyRain(world: World, tile: Tile, x: number, y: number, intensity: number): void;

  // Apply snow moisture increase
  applySnow(world: World, tile: Tile, x: number, y: number, intensity: number): void;

  // Tick down fertilizer duration
  tickFertilizer(tile: Tile, deltaTime: number): void;
}
```

**Events emitted:**

```typescript
// Tile tilled for farming
'soil:tilled' → { x, y }

// Tile watered
'soil:watered' → { x, y, amount }

// Moisture changed
'soil:moistureChanged' → { x, y, oldMoisture, newMoisture }

// Fertilizer applied
'soil:fertilized' → { x, y, fertilizerType, nutrientBoost }

// Soil depleted (must re-till)
'soil:depleted' → { x, y, nutrientLevel }
```

**Fertilizer types:**

```typescript
import { FERTILIZERS } from '@ai-village/environment';

const compost = FERTILIZERS.compost;
// { fertilityBoost: 20, nitrogenBoost: 10, duration: 90 days }

const manure = FERTILIZERS.manure;
// { fertilityBoost: 25, nitrogenBoost: 15, duration: 90 days }

const fishMeal = FERTILIZERS['fish-meal'];
// { fertilityBoost: 15, nitrogenBoost: 20, duration: 7 days }

const boneMeal = FERTILIZERS['bone-meal'];
// { fertilityBoost: 10, phosphorusBoost: 25, duration: 14 days }
```

---

## Usage Examples

### Example 1: Setting Up Environmental Systems

```typescript
import {
  TimeSystem,
  WeatherSystem,
  TemperatureSystem,
  SoilSystem,
  createTimeComponent
} from '@ai-village/environment';
import { createWeatherComponent } from '@ai-village/core';

// Create systems
const timeSystem = new TimeSystem();
const weatherSystem = new WeatherSystem();
const tempSystem = new TemperatureSystem();
const soilSystem = new SoilSystem();

// Register systems with world
world.registerSystem(timeSystem);
world.registerSystem(weatherSystem);
world.registerSystem(tempSystem);
world.registerSystem(soilSystem);

// Create singleton entities
const timeEntity = world.createEntity();
timeEntity.addComponent(createTimeComponent(6, 48, 1));

const weatherEntity = world.createEntity();
weatherEntity.addComponent(createWeatherComponent('clear', 0, 120));

// Systems now automatically update environment
```

### Example 2: Farming Workflow

```typescript
import { SoilSystem, FERTILIZERS } from '@ai-village/environment';

const soilSystem = new SoilSystem();
const tile = world.getTileAt(50, 50);

// 1. Till the soil
soilSystem.tillTile(world, tile, 50, 50);
// → 'soil:tilled' event emitted
// tile.tilled = true
// tile.plantability = 3 (3 harvests before re-till)
// tile.fertility = 70-80 (plains biome)

// 2. Apply fertilizer
soilSystem.fertilizeTile(world, tile, 50, 50, FERTILIZERS.compost);
// → 'soil:fertilized' event emitted
// tile.fertility += 20
// tile.nutrients.nitrogen += 10
// tile.fertilizerDuration = 90 days

// 3. Water the soil
soilSystem.waterTile(world, tile, 50, 50);
// → 'soil:watered' event emitted
// → 'soil:moistureChanged' event emitted
// tile.moisture += 20 (capped at 100)

// 4. Plant crops (handled by PlantSystem)
// (crops grow based on soil.fertility, moisture, nutrients)

// 5. After harvest
soilSystem.depleteSoil(world, tile, 50, 50);
// tile.fertility -= 15
// tile.plantability -= 1
// If plantability reaches 0:
//   → 'soil:depleted' event emitted
//   tile.tilled = false (must re-till)
```

### Example 3: Temperature Monitoring

```typescript
import { createTemperatureComponent, isInDanger } from '@ai-village/core';

// Create agent with temperature component
const agent = world.createEntity();
agent.addComponent(createTemperatureComponent(
  20,   // Start at 20°C
  18, 26,  // Comfortable: 18-26°C
  5, 40    // Survival: 5-40°C
));

// Listen for temperature events
world.eventBus.on('temperature:danger', (event) => {
  console.log(`Agent ${event.data.agentId} in danger!`);
  console.log(`Temperature: ${event.data.temperature}°C`);
  console.log(`State: ${event.data.state}`);
  console.log(`Health: ${event.data.health}`);

  // Agent should seek shelter or build fire
});

world.eventBus.on('temperature:comfortable', (event) => {
  console.log(`Agent ${event.data.agentId} is safe now`);
});

// Check temperature in behavior system
const tempComp = agent.getComponent<TemperatureComponent>('temperature');
if (isInDanger(tempComp)) {
  // Trigger "find_shelter" or "build_fire" behavior
  behaviorQueue.push({ type: 'find_shelter', priority: 10 });
}
```

### Example 4: Weather-Responsive Farming

```typescript
// Listen for weather changes to manage crops
world.eventBus.on('weather:changed', (event) => {
  const { weatherType, intensity } = event.data;

  if (weatherType === 'rain') {
    // Rain automatically waters tiles via SoilSystem
    console.log(`Rain intensity ${intensity} - crops are being watered`);

    // Get all tilled tiles
    const tiles = world.getAllTiles().filter(t => t.tilled);

    for (const tile of tiles) {
      // SoilSystem.applyRain() called automatically
      // tile.moisture += 40 * intensity

      console.log(`Tile (${tile.x},${tile.y}) moisture: ${tile.moisture}`);
    }
  }

  if (weatherType === 'storm') {
    // Heavy rain + cold temps
    console.log('Storm! Crops may be damaged by cold');
    // Temperature drops by -5°C from weather.tempModifier
  }

  if (weatherType === 'snow') {
    // Very cold, some moisture
    console.log('Snow! Crops at risk of frost damage');
    // Temperature drops by -8°C
    // tile.moisture += 20 * intensity
  }
});
```

### Example 5: Building Insulation Effects

```typescript
// Create a building with insulation
const tent = world.createEntity();
tent.addComponent({
  type: 'building',
  buildingType: 'tent',
  interior: true,
  interiorRadius: 5,           // 5 tile radius
  insulation: 0.3,             // 30% insulation
  baseTemperature: 18,         // Maintains 18°C base
  isComplete: true
});
tent.addComponent({ type: 'position', x: 50, y: 50 });

// Agent inside tent (within 5 tiles of 50,50)
const agent = world.createEntity();
agent.addComponent({ type: 'position', x: 52, y: 52 });
agent.addComponent(createTemperatureComponent(20, 18, 26, 5, 40));

// TemperatureSystem automatically calculates:
// effectiveTemp = ambientTemp * (1 - 0.3) + 18
//
// If outside is -5°C (night in winter):
//   effectiveTemp = -5 * 0.7 + 18 = 14.5°C
//   (Agent is cold but not freezing)
//
// If outside is 0°C:
//   effectiveTemp = 0 * 0.7 + 18 = 18°C
//   (Agent is comfortable)

// Add heat source for warmth
const campfire = world.createEntity();
campfire.addComponent({
  type: 'building',
  buildingType: 'campfire',
  providesHeat: true,
  heatRadius: 8,
  heatAmount: 15,              // +15°C within radius
  isComplete: true
});
campfire.addComponent({ type: 'position', x: 50, y: 50 });

// Agent near campfire gets additional warmth:
// heatBonus = 15 * (1 - distance / 8)
// effectiveTemp = baseTemp + dailyVariation + weatherMod + heatBonus
```

---

## Architecture & Data Flow

### System Execution Order

```
1. TimeSystem (priority 3)
   ↓ Advances time, emits phase changes

2. WeatherSystem (priority 5)
   ↓ Transitions weather, emits weather changes

3. TemperatureSystem (priority 14)
   ↓ Calculates ambient temp, updates entity temps
   ↓ Applies health damage if dangerous

4. SoilSystem (priority 15)
   ↓ Processes daily updates, moisture decay

5. PlantSystem (priority 40)
   ↓ Uses soil data for plant growth

6. Agent systems (priority 100+)
   ↓ Agents react to environmental conditions
```

### Event Flow

```
TimeSystem
  ↓ 'time:phase_changed' { phase: 'night' }
TemperatureSystem
  → Calculates temperature (night = -5°C modifier)
  ↓ 'temperature:danger' { state: 'dangerously_cold' }
AgentBehaviorSystem
  → Triggers "find_shelter" behavior

WeatherSystem
  ↓ 'weather:changed' { weatherType: 'rain', intensity: 0.8 }
TemperatureSystem
  → Adds tempModifier (-3°C)
SoilSystem
  → Calls applyRain() for all outdoor tiles
  ↓ 'soil:moistureChanged' { oldMoisture: 30, newMoisture: 62 }
PlantSystem
  → Increases plant hydration

SoilSystem
  ↓ 'soil:depleted' { x: 50, y: 50 }
AgentBehaviorSystem
  → Triggers "till_soil" or "fertilize" behavior
```

### Component Relationships

```
Time Entity (singleton)
└── TimeComponent
    ├── timeOfDay → 0-24 hours
    ├── phase → DayPhase
    ├── day → Current day number
    └── speedMultiplier → Time acceleration

Weather Entity (singleton)
└── WeatherComponent
    ├── weatherType → WeatherType
    ├── intensity → 0-1
    ├── tempModifier → °C change
    └── movementModifier → Speed multiplier

Agent/Animal Entity
├── PositionComponent (required for temperature)
├── TemperatureComponent (optional)
│   ├── currentTemp → Body temperature
│   ├── state → TemperatureState
│   └── comfort/tolerance ranges
└── NeedsComponent (optional)
    └── health → Affected by temperature

Tile (not an entity)
├── terrain → 'grass', 'dirt', etc.
├── biome → BiomeType (determines fertility)
├── tilled → Ready for planting
├── moisture → 0-100 (water content)
├── fertility → 0-100 (soil quality)
├── nutrients → { nitrogen, phosphorus, potassium }
├── fertilized → Has active fertilizer
└── fertilizerDuration → Seconds remaining
```

---

## Performance Considerations

**Optimization strategies:**

1. **Singleton caching:** Time and weather entity IDs cached (avoid repeated queries)
2. **Building cache:** Refreshed every 100 ticks instead of every frame
3. **Tile insulation cache:** Cached per position every 50 ticks (walls rarely change)
4. **Active simulation radius:** Temperature only simulated within 50 tiles of agents
5. **Squared distance comparisons:** Avoids `Math.sqrt()` in hot paths
6. **Thermal inertia:** Prevents temperature from changing instantly (realistic + performant)

**Query caching:**

```typescript
// ❌ BAD: Query in loop
for (const agent of agents) {
  const buildings = world.query().with('building').executeEntities(); // Query every iteration!
  // Check if agent is inside any building
}

// ✅ GOOD: Query once, cache results
const buildings = world.query().with('building').executeEntities(); // Query once
for (const agent of agents) {
  // Use cached buildings
}
```

**Squared distance comparisons:**

```typescript
// ❌ BAD: Math.sqrt in hot path (called 1000s of times per second)
const distance = Math.sqrt(dx*dx + dy*dy);
if (distance < heatRadius) { }

// ✅ GOOD: Squared comparison (no sqrt needed)
const distanceSq = dx*dx + dy*dy;
if (distanceSq < heatRadius*heatRadius) { }
```

**Singleton caching pattern:**

```typescript
// Cache singleton entity IDs to avoid repeated queries
private timeEntityId: string | null = null;

// First access: find and cache
if (!this.timeEntityId) {
  const timeEntities = world.query().with('time').executeEntities();
  if (timeEntities.length > 0) {
    this.timeEntityId = timeEntities[0].id;
  }
}

// Subsequent accesses: use cached ID
if (this.timeEntityId) {
  const timeEntity = world.getEntity(this.timeEntityId);
  // Use entity...
}
```

---

## Troubleshooting

### Time not advancing

**Check:**
1. TimeComponent exists? (`world.query().with('time').executeEntities()`)
2. TimeSystem registered? (`world.systems` includes TimeSystem)
3. Game loop running? (deltaTime > 0)
4. Speed multiplier > 0? (`time.speedMultiplier`)

**Debug:**
```typescript
const timeEntities = world.query().with('time').executeEntities();
if (timeEntities.length === 0) {
  console.error('No time entity found!');
} else {
  const time = timeEntities[0].getComponent<TimeComponent>('time');
  console.log(`Time: ${time.timeOfDay.toFixed(2)} hours`);
  console.log(`Day: ${time.day}, Phase: ${time.phase}`);
  console.log(`Speed: ${time.speedMultiplier}x`);
}
```

### Weather not changing

**Check:**
1. WeatherComponent exists? (`world.query().with('weather').executeEntities()`)
2. WeatherSystem registered and has correct priority (5)?
3. TimeSystem running before WeatherSystem? (priority 3 < 5)
4. Duration ticking down? (should decrease each frame)

**Debug:**
```typescript
const weatherEntities = world.query().with('weather').executeEntities();
if (weatherEntities.length === 0) {
  console.error('No weather entity found!');
} else {
  const weather = weatherEntities[0].getComponent<WeatherComponent>('weather');
  console.log(`Weather: ${weather.weatherType}`);
  console.log(`Duration: ${weather.duration.toFixed(1)}s remaining`);
  console.log(`Intensity: ${weather.intensity}`);
}
```

### Temperature not affecting agents

**Check:**
1. Agent has TemperatureComponent? (`agent.hasComponent('temperature')`)
2. Agent has PositionComponent? (required for temperature system)
3. TemperatureSystem registered with correct priority (14)?
4. TimeSystem and WeatherSystem running first? (priorities 3, 5)

**Debug:**
```typescript
const agent = world.getEntity(agentId);
if (!agent.hasComponent('temperature')) {
  console.error('Agent missing TemperatureComponent!');
} else if (!agent.hasComponent('position')) {
  console.error('Agent missing PositionComponent!');
} else {
  const temp = agent.getComponent<TemperatureComponent>('temperature');
  console.log(`Body temp: ${temp.currentTemp.toFixed(1)}°C`);
  console.log(`State: ${temp.state}`);

  // Check ambient conditions
  const time = world.query().with('time').executeEntities()[0]
    .getComponent<TimeComponent>('time');
  const weather = world.query().with('weather').executeEntities()[0]
    .getComponent<WeatherComponent>('weather');

  const baseTemp = 20; // Default world temp
  const dailyMod = TimeSystem.getTemperatureModifier(time.timeOfDay);
  const weatherMod = weather.tempModifier;
  const ambientTemp = baseTemp + dailyMod + weatherMod;

  console.log(`Ambient temp: ${ambientTemp.toFixed(1)}°C`);
  console.log(`Daily mod: ${dailyMod}°C, Weather mod: ${weatherMod}°C`);
}
```

### Soil not depleting/replenishing

**Check:**
1. Tile has biome data? (`tile.biome !== undefined`)
2. Tile is tilled? (`tile.tilled === true`)
3. SoilSystem registered with correct priority (15)?
4. Calling soil methods correctly? (tillTile, waterTile, etc.)

**Debug:**
```typescript
const tile = world.getTileAt(50, 50);
console.log('Tile state:', {
  terrain: tile.terrain,
  biome: tile.biome,
  tilled: tile.tilled,
  fertility: tile.fertility,
  moisture: tile.moisture,
  plantability: tile.plantability,
  nutrients: tile.nutrients
});

// If biome is undefined, terrain generation failed
if (!tile.biome) {
  console.error('Tile missing biome data! Terrain generation failed.');
}
```

### Building insulation not working

**Check:**
1. Building has `interior: true`?
2. Building has `interiorRadius > 0`?
3. Building has `insulation` value (0-1)?
4. Building is `isComplete: true`?
5. Agent is within interiorRadius? (distance <= radius)
6. Agent has PositionComponent?

**Debug:**
```typescript
const building = world.getEntity(buildingId);
const buildingComp = building.getComponent<BuildingComponent>('building');
const buildingPos = building.getComponent<PositionComponent>('position');

console.log('Building state:', {
  type: buildingComp.buildingType,
  interior: buildingComp.interior,
  interiorRadius: buildingComp.interiorRadius,
  insulation: buildingComp.insulation,
  baseTemperature: buildingComp.baseTemperature,
  isComplete: buildingComp.isComplete
});

const agentPos = agent.getComponent<PositionComponent>('position');
const dx = agentPos.x - buildingPos.x;
const dy = agentPos.y - buildingPos.y;
const distance = Math.sqrt(dx*dx + dy*dy);

console.log(`Agent distance from building: ${distance.toFixed(2)}`);
console.log(`Interior radius: ${buildingComp.interiorRadius}`);
console.log(`Is inside: ${distance <= buildingComp.interiorRadius}`);
```

### Common Errors

**Error:** `Tile at (x,y) has no biome data`

**Fix:** Terrain generation failed or chunk not generated. Regenerate terrain or ensure biome is set during tile creation.

```typescript
// When creating tiles, always set biome
const tile = {
  terrain: 'grass',
  biome: 'plains',  // Required!
  moisture: 50,
  fertility: 0,
  // ... other fields
};
```

**Error:** `Cannot till X terrain at (x,y). Only grass and dirt can be tilled.`

**Fix:** Only grass and dirt terrains can be tilled. Convert other terrains first.

```typescript
// Check terrain before tilling
if (tile.terrain === 'grass' || tile.terrain === 'dirt') {
  soilSystem.tillTile(world, tile, x, y);
} else {
  console.log(`Cannot till ${tile.terrain}`);
}
```

**Error:** `Tile at (x,y) is already tilled. Plantability: 2/3 uses remaining.`

**Fix:** Tile is already tilled and not depleted. Use it for planting or wait until depleted.

```typescript
// Only re-till if depleted
if (!tile.tilled || tile.plantability === 0) {
  soilSystem.tillTile(world, tile, x, y);
} else {
  console.log(`Tile has ${tile.plantability} uses remaining`);
}
```

---

## Integration with Other Systems

### PlantSystem

Plants use soil conditions for growth calculations:

```typescript
// PlantSystem reads soil data every tick
const tile = world.getTileAt(plant.position.x, plant.position.y);

// Growth rate modified by soil conditions
let growthModifier = 1.0;

if (tile.moisture < 30) {
  growthModifier *= 0.5;  // Dry soil = slower growth
}

if (tile.fertility < 50) {
  growthModifier *= 0.7;  // Poor soil = slower growth
}

if (tile.nutrients.nitrogen < 30) {
  growthModifier *= 0.8;  // Low nitrogen = slower growth
}

plant.stageProgress += growthModifier * deltaTime;

// Emit soil consumption events
world.eventBus.emit({
  type: 'plant:nutrientConsumption',
  data: { x: tile.x, y: tile.y, consumed: 5 }
});
```

### MovementSystem

Weather affects movement speed:

```typescript
// MovementSystem applies weather movement modifier
const weather = world.query().with('weather').executeEntities()[0]
  .getComponent<WeatherComponent>('weather');

const baseSpeed = agent.getComponent<MovementComponent>('movement').speed;
const effectiveSpeed = baseSpeed * weather.movementModifier;

// Rain: 0.8x speed
// Storm: 0.5x speed
// Snow: 0.7x speed
```

### NeedsSystem

Temperature affects health and comfort needs:

```typescript
// NeedsSystem checks temperature state
const tempComp = agent.getComponent<TemperatureComponent>('temperature');
const needsComp = agent.getComponent<NeedsComponent>('needs');

if (tempComp.state === 'dangerously_cold' || tempComp.state === 'dangerously_hot') {
  // TemperatureSystem already applies health damage (-5/sec)
  // NeedsSystem can trigger urgent shelter-seeking behavior
  needsComp.comfort -= 10 * deltaTime;
}

if (tempComp.state === 'cold' || tempComp.state === 'hot') {
  // Uncomfortable but not dangerous
  needsComp.comfort -= 2 * deltaTime;
}
```

### BehaviorSystem

Environmental conditions influence agent decisions:

```typescript
// BehaviorPriority.ts calculates behavior priorities
const tempComp = agent.getComponent<TemperatureComponent>('temperature');
const weather = world.query().with('weather').executeEntities()[0]
  .getComponent<WeatherComponent>('weather');

// Temperature urgency
if (tempComp.state === 'dangerously_cold') {
  priorities['find_shelter'] = 100;  // Highest priority
  priorities['build_fire'] = 95;
}

// Weather considerations
if (weather.weatherType === 'storm') {
  priorities['seek_shelter'] = 80;
  priorities['work_outdoors'] = 10;  // Very low
}

if (weather.weatherType === 'rain') {
  priorities['water_crops'] = 0;  // Rain already watering
}
```

### WorldManager

World manager coordinates environmental event handling:

```typescript
// WorldManager listens for environment events
world.eventBus.on('weather:changed', (event) => {
  const { weatherType, intensity } = event.data;

  if (weatherType === 'rain' || weatherType === 'snow') {
    // Apply moisture to all outdoor tiles
    const tiles = world.getAllTiles();
    for (const tile of tiles) {
      if (!tile.isIndoors) {
        if (weatherType === 'rain') {
          soilSystem.applyRain(world, tile, tile.x, tile.y, intensity);
        } else {
          soilSystem.applySnow(world, tile, tile.x, tile.y, intensity);
        }
      }
    }
  }
});

world.eventBus.on('time:day_changed', (event) => {
  // Daily soil updates
  const tiles = world.getAllTiles().filter(t => t.tilled);
  const weather = world.query().with('weather').executeEntities()[0]
    .getComponent<WeatherComponent>('weather');

  const baseTemp = 20 + weather.tempModifier;

  for (const tile of tiles) {
    // Process moisture decay
    soilSystem.decayMoisture(world, tile, tile.x, tile.y, baseTemp);

    // Process fertilizer duration
    soilSystem.tickFertilizer(tile, 24 * 60 * 60); // 24 hours in seconds
  }
});
```

---

## Testing

Run environment system tests:

```bash
npm test -- TimeSystem.test.ts
npm test -- WeatherSystem.test.ts
npm test -- TemperatureSystem.test.ts
npm test -- Phase8-WeatherTemperature.test.ts
```

**Key test files:**
- `packages/core/src/systems/__tests__/TimeSystem.test.ts`
- `packages/core/src/systems/__tests__/TemperatureSystem.test.ts`
- `packages/core/src/systems/__tests__/Phase8-WeatherTemperature.test.ts`

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference with all 212+ systems
- **COMPONENTS_REFERENCE.md** - All 125+ component types
- **METASYSTEMS_GUIDE.md** - Deep dives into major metasystems
- **PERFORMANCE.md** - Performance optimization guide
- **packages/botany/README.md** - Plant system integration with environment

---

## Summary for Language Models

**Before working with environment systems:**
1. Understand the system execution order: Time (3) → Weather (5) → Temperature (14) → Soil (15)
2. Know that time and weather are singleton entities (one per world)
3. Understand thermal inertia: temperature changes gradually, not instantly
4. Know that soil fertility depends on biome data (never omit biome)
5. Understand event-driven architecture: systems emit events, other systems respond

**Common tasks:**
- **Advance time:** Create TimeComponent singleton, TimeSystem handles automatically
- **Change weather:** Create WeatherComponent singleton, transitions happen automatically
- **Add temperature to entity:** Create TemperatureComponent with comfort ranges
- **Till soil:** Call `soilSystem.tillTile(world, tile, x, y)`
- **Water crops:** Call `soilSystem.waterTile(world, tile, x, y)` or let rain do it
- **Apply fertilizer:** Call `soilSystem.fertilizeTile(world, tile, x, y, FERTILIZERS.compost)`
- **Check environment:** Query singleton entities for time/weather state

**Critical rules:**
- Never create multiple time/weather entities (singletons only)
- Always set biome when creating tiles (required for fertility calculation)
- Never skip required dependencies (Time before Weather before Temperature)
- Use squared distance comparisons (avoid Math.sqrt in hot paths)
- Cache singleton entity IDs to avoid repeated queries
- Validate all inputs (CLAUDE.md: no silent fallbacks)
- Use event system for environment changes (don't modify components directly)

**Event-driven architecture:**
- Listen to `time:*` events for day/phase changes
- Listen to `weather:*` events for weather transitions
- Listen to `temperature:*` events for danger states
- Listen to `soil:*` events for farming automation
- Emit events when modifying environmental state
- Never bypass systems for environment changes (use events)

**Performance critical:**
- Time/Weather systems run every tick (keep logic minimal)
- Temperature system has active simulation radius (50 tiles from agents)
- Building cache refreshed every 100 ticks (not every frame)
- Tile insulation cache refreshed every 50 ticks (walls rarely change)
- Use cached queries (avoid repeated world.query() in loops)
