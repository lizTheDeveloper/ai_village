# Temperature & Shelter System Specification

**Status:** Draft
**Phase:** 8 (Temperature & Weather)
**Replaces:** Current shelter decay system (Phase 7)

---

## Overview

Shelter and temperature work like RimWorld/Dwarf Fortress: agents need protection from environmental conditions (extreme temperatures, weather) rather than shelter being an arbitrary decaying stat.

**Core Principle:** Shelter is needed when environmental conditions threaten agent health/comfort, not as a standalone need.

---

## 1. Temperature System

### 1.1 World Temperature

```typescript
interface WorldTemperature {
  baseTemp: number;        // Base temperature for current season/biome (°C)
  dailyVariation: number;  // Temperature swing from day to night (°C)
  currentTemp: number;     // Current ambient temperature (°C)
}
```

**Temperature Calculation:**
```
currentTemp = baseTemp + dailyVariation * sin(timeOfDay)
```

**Seasonal Base Temperatures (Temperate Biome):**
- Spring: 15°C (59°F)
- Summer: 25°C (77°F)
- Fall: 12°C (54°F)
- Winter: -5°C (23°F)

**Daily Variation:** ±8°C
- Day peak: baseTemp + 8°C
- Night low: baseTemp - 8°C

### 1.2 Zone Temperature

Certain areas have modified temperatures:

```typescript
interface TemperatureZone {
  baseModifier: number;    // Fixed temperature change (°C)
  insulation: number;      // 0-1, reduces external temperature influence
}
```

**Zone Types:**
- **Outdoors:** No modifier (uses world temperature)
- **Under tree cover:** -2°C in summer, +2°C in winter (shade/windbreak)
- **Inside building:** Modified by building type
- **Near campfire:** +10°C within 3 tiles, fades with distance

**Building Temperature:**
```
buildingTemp = outsideTemp * (1 - insulation) + baseModifier
```

Examples:
- **Lean-to:** insulation=0.3, modifier=+5°C (basic wind protection)
- **Campfire (outdoors):** modifier=+10°C within range
- **Future stone building:** insulation=0.7, modifier=+8°C

---

## 2. Agent Temperature Comfort

### 2.1 Comfort Range

```typescript
interface AgentTemperaturePreference {
  comfortMin: number;      // Minimum comfortable temp (°C)
  comfortMax: number;      // Maximum comfortable temp (°C)
  toleranceMin: number;    // Below this = health damage
  toleranceMax: number;    // Above this = health damage
}
```

**Default Human Values:**
- Comfort: 18-24°C (64-75°F)
- Tolerance: 0-35°C (32-95°F)
- Damage rate: 0.5 health/second when outside tolerance

### 2.2 Temperature Effects

```typescript
enum TemperatureState {
  DANGEROUSLY_COLD = 'dangerously_cold',  // < toleranceMin
  COLD = 'cold',                          // toleranceMin to comfortMin
  COMFORTABLE = 'comfortable',            // comfortMin to comfortMax
  HOT = 'hot',                           // comfortMax to toleranceMax
  DANGEROUSLY_HOT = 'dangerously_hot'    // > toleranceMax
}
```

**Effects by State:**

| State | Health Change | Mood | LLM Context |
|-------|---------------|------|-------------|
| Dangerously Cold | -0.5/sec | Panic | "freezing to death" |
| Cold | 0 | Unhappy | "uncomfortably cold" |
| Comfortable | 0 | Neutral | "comfortable" |
| Hot | 0 | Unhappy | "uncomfortably hot" |
| Dangerously Hot | -0.5/sec | Panic | "overheating" |

**LLM Decision Impact:**
- Agents in danger zones prioritize finding appropriate shelter
- "Too cold" → seek warmth (campfire, building, warmer area)
- "Too hot" → seek shade (trees, building, cooler area)

---

## 3. Weather System

### 3.1 Weather Types

```typescript
enum WeatherType {
  CLEAR = 'clear',
  RAIN = 'rain',
  SNOW = 'snow',
  STORM = 'storm'
}

interface Weather {
  type: WeatherType;
  intensity: number;        // 0-1
  tempModifier: number;     // Temperature change (°C)
  movementModifier: number; // Movement speed multiplier
  visibilityModifier: number; // Vision range multiplier
}
```

**Weather Effects:**

| Type | Temp Modifier | Movement | Visibility | Needs Shelter |
|------|---------------|----------|------------|---------------|
| Clear | 0°C | 1.0x | 1.0x | No |
| Rain | -3°C | 0.8x | 0.7x | Yes |
| Snow | -8°C | 0.6x | 0.5x | Yes |
| Storm | -5°C | 0.5x | 0.4x | Yes (urgent) |

### 3.2 Weather Protection

**Coverage Types:**
- **None:** Full weather exposure (health drain in rain/snow)
- **Partial:** Tree cover, lean-to (50% protection)
- **Full:** Enclosed building (100% protection)

**Weather Damage:**
- Rain (no shelter): -0.1 health/sec after 5 minutes
- Snow (no shelter): -0.3 health/sec after 2 minutes
- Storm (no shelter): -0.5 health/sec immediately

---

## 4. Building System Redesign

### 4.1 BuildingComponent Update

```typescript
interface BuildingComponent extends Component {
  type: 'building';
  buildingType: BuildingType;
  tier: number;

  // Temperature properties
  providesHeat: boolean;        // Campfire, furnace
  heatRadius: number;           // Tiles of heat effect
  heatAmount: number;           // Temperature increase (°C)

  insulation: number;           // 0-1, reduces outside temp influence
  baseTemperature: number;      // Additional temp when inside (°C)

  // Weather protection
  weatherProtection: 'none' | 'partial' | 'full';

  // Spatial
  interior: boolean;            // Can agents go "inside"?
  interiorRadius?: number;      // If exterior heat source, range

  // Legacy (remove)
  providesWarmth: boolean;      // DEPRECATED
  providesShelter: boolean;     // DEPRECATED
  blocksMovement: boolean;
  storageCapacity: number;
}
```

### 4.2 Building Archetypes

**Campfire:**
```typescript
{
  providesHeat: true,
  heatRadius: 3,
  heatAmount: 10,
  insulation: 0,
  baseTemperature: 0,
  weatherProtection: 'none',
  interior: false
}
```

**Lean-to:**
```typescript
{
  providesHeat: false,
  heatRadius: 0,
  heatAmount: 0,
  insulation: 0.3,
  baseTemperature: 5,
  weatherProtection: 'partial',
  interior: true,
  interiorRadius: 2
}
```

**Future - Stone House:**
```typescript
{
  providesHeat: false,
  heatRadius: 0,
  heatAmount: 0,
  insulation: 0.7,
  baseTemperature: 8,
  weatherProtection: 'full',
  interior: true,
  interiorRadius: 5
}
```

---

## 5. Temperature System Implementation

### 5.1 TemperatureComponent

```typescript
interface TemperatureComponent extends Component {
  type: 'temperature';
  currentTemp: number;         // Agent's current body/environment temp
  comfortMin: number;          // Species-specific
  comfortMax: number;
  toleranceMin: number;
  toleranceMax: number;
  state: TemperatureState;
}
```

### 5.2 TemperatureSystem

**Priority:** 14 (after NeedsSystem, before BuildingSystem)

**Responsibilities:**
1. Calculate ambient temperature at agent's position
2. Apply building modifiers (heat sources, insulation)
3. Apply weather effects
4. Update agent temperature state
5. Apply health damage if outside tolerance
6. Emit temperature events for LLM context

**Temperature Calculation:**
```typescript
function calculateAgentTemperature(
  agent: Entity,
  world: World,
  weather: Weather
): number {
  const pos = agent.getComponent<PositionComponent>('position');

  // Start with world ambient temperature
  let temp = world.weather.currentTemp + weather.tempModifier;

  // Check if agent is inside a building
  const building = findEnclosingBuilding(pos, world);
  if (building) {
    const b = building.getComponent<BuildingComponent>('building');
    // Apply insulation and base temperature
    temp = temp * (1 - b.insulation) + b.baseTemperature;
  }

  // Check for nearby heat sources
  const heatSources = findNearbyHeatSources(pos, world);
  for (const source of heatSources) {
    const distance = calculateDistance(pos, source);
    const heatEffect = source.heatAmount * (1 - distance / source.heatRadius);
    temp += heatEffect;
  }

  return temp;
}
```

---

## 6. NeedsComponent Update

### 6.1 Remove Shelter, Add Temperature

**Before:**
```typescript
interface NeedsComponent {
  hunger: number;
  energy: number;
  shelter: number;           // REMOVE
  shelterDecayRate: number;  // REMOVE
}
```

**After:**
```typescript
interface NeedsComponent {
  hunger: number;
  energy: number;
  health: number;            // ADD - affected by temperature/weather
  hungerDecayRate: number;
  energyDecayRate: number;
}
```

**Health Damage Sources:**
- Extreme temperature (outside tolerance range)
- Weather exposure (rain/snow without shelter)
- Starvation (hunger = 0)

### 6.2 Helper Functions Update

**Remove:**
- `needsShelter()`
- `isExposed()`

**Add:**
```typescript
function needsTemperatureRelief(
  needs: NeedsComponent,
  temp: TemperatureComponent
): boolean {
  return temp.state === 'dangerously_cold' ||
         temp.state === 'dangerously_hot';
}

function isUncomfortable(temp: TemperatureComponent): boolean {
  return temp.state !== 'comfortable';
}
```

---

## 7. Agent Behavior Updates

### 7.1 LLM Context

Add temperature to agent perception:

```typescript
const context = {
  // ... existing context
  environment: {
    temperature: temperatureComp.currentTemp,
    temperatureState: temperatureComp.state,
    weather: world.weather.type,
    weatherIntensity: world.weather.intensity,
    nearbyHeatSources: findNearbyHeatSources(pos, world).length,
    inShelter: !!findEnclosingBuilding(pos, world)
  }
}
```

**Example LLM Prompt Addition:**
```
Environment:
- Temperature: -2°C (dangerously cold - you are freezing)
- Weather: Snow (heavy)
- In shelter: No
- Nearby heat sources: 1 campfire (3 tiles away)

You are freezing and losing health. You need warmth immediately.
```

### 7.2 Behavior Priority

When temperature is dangerous, it overrides other needs:

```typescript
if (temp.state === 'dangerously_cold') {
  // Seek heat: campfire, building, or build one
  return 'seek_warmth';
} else if (temp.state === 'dangerously_hot') {
  // Seek cooling: shade, water, building
  return 'seek_cooling';
}
```

### 7.3 New Behaviors

**seek_warmth:**
1. Find nearest campfire/heat source within vision
2. If found, move toward it
3. If none found and have resources, build campfire
4. If no resources, move toward buildings/shelter

**seek_cooling:**
1. Find nearest shade (trees, building)
2. Move toward it
3. Avoid open sunlit areas

---

## 8. World/Environment Updates

### 8.1 Weather System (WorldComponent)

```typescript
interface WeatherComponent extends Component {
  type: 'weather';
  current: WeatherType;
  intensity: number;
  tempModifier: number;
  duration: number;          // Ticks remaining
  nextWeather: WeatherType;
}
```

### 8.2 WeatherSystem

**Priority:** 5 (early, before agent decisions)

**Responsibilities:**
1. Update current weather based on season/randomness
2. Apply temperature modifiers
3. Emit weather change events
4. Update visual effects (future: rain/snow particles)

**Weather Transitions:**
- Clear → Rain: 10% chance per hour in spring/fall
- Rain → Clear: 30% chance per hour
- Rain → Snow: If temp < 0°C
- Snow → Clear: If temp > 5°C

---

## 9. Migration Path

### 9.1 Phase 7 → Phase 8 Changes

**Deprecate:**
- ✗ Remove `shelter` from NeedsComponent
- ✗ Remove `shelterDecayRate` from NeedsComponent
- ✗ Remove `needsShelter()`, `isExposed()` functions
- ✗ Remove BuildingSystem shelter restoration logic
- ✗ Remove `providesShelter` boolean from BuildingComponent

**Add:**
- ✓ TemperatureComponent
- ✓ TemperatureSystem
- ✓ WeatherComponent
- ✓ WeatherSystem
- ✓ Building heat/insulation properties
- ✓ `health` to NeedsComponent
- ✓ `seek_warmth` and `seek_cooling` behaviors

### 9.2 Backward Compatibility

**Regression Tests:**
- Update Phase 7 tests to check temperature instead of shelter
- Remove shelter-specific tests
- Add temperature zone tests
- Add weather protection tests

**Data Migration:**
None needed (shelter stat is removed, not migrated)

---

## 10. Implementation Checklist

### 10.1 Core Systems
- [ ] Create TemperatureComponent
- [ ] Create TemperatureSystem
- [ ] Create WeatherComponent
- [ ] Create WeatherSystem
- [ ] Update BuildingComponent with heat/insulation properties
- [ ] Remove shelter from NeedsComponent, add health

### 10.2 Building Updates
- [ ] Update campfireArchetype with heat properties
- [ ] Update leanToArchetype with insulation/weather protection
- [ ] Update storageBoxArchetype (no temp effects)
- [ ] Remove `providesShelter` boolean logic

### 10.3 Agent Behavior
- [ ] Add temperature context to LLM prompts
- [ ] Implement `seek_warmth` behavior
- [ ] Implement `seek_cooling` behavior
- [ ] Update behavior priority for temperature danger
- [ ] Add temperature state to agent decisions

### 10.4 World/Spatial
- [ ] Add world temperature calculation
- [ ] Add seasonal temperature variations
- [ ] Add time-of-day temperature variations
- [ ] Implement weather state machine
- [ ] Add weather transition logic

### 10.5 Testing
- [ ] Write temperature system unit tests
- [ ] Write weather system unit tests
- [ ] Write integration tests for temperature + buildings
- [ ] Write agent behavior tests for temperature response
- [ ] Update Phase 7 regression tests
- [ ] Add new Phase 8 regression tests

### 10.6 Rendering (Future)
- [ ] Add temperature indicator to agent UI
- [ ] Add weather visual effects (rain/snow particles)
- [ ] Add heat shimmer effect near campfires
- [ ] Add building interior rendering

---

## 11. Success Criteria

**Phase 8 is complete when:**

1. ✓ Agents have temperature comfort ranges
2. ✓ World temperature varies by season and time of day
3. ✓ Weather affects temperature and agent movement
4. ✓ Buildings provide heat and/or insulation
5. ✓ Campfires radiate heat to nearby agents
6. ✓ Agents seek warmth when cold, shade when hot
7. ✓ Agents take health damage from extreme temperatures
8. ✓ Agents seek shelter during rain/snow
9. ✓ LLM receives temperature context and makes appropriate decisions
10. ✓ All regression tests pass

**Visual Confirmation:**
- Agent builds campfire when cold → moves next to it → temperature increases → stops seeking warmth
- Agent seeks shade tree when hot → temperature decreases → returns to normal behavior
- Snow starts falling → agents seek buildings → stay inside until weather clears

---

## 12. Future Enhancements (Phase 9+)

- Clothing system (insulation layers)
- Fire fuel consumption (campfires burn out)
- Heating systems (furnaces, fireplaces)
- Cooling systems (fans, ice cellars)
- Temperature-based crop growth
- Hypothermia/heatstroke conditions
- Temperature-based AI personality (some agents more cold-tolerant)
- Seasonal clothing changes
