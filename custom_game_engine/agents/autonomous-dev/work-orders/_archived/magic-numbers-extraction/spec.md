# Magic Numbers Extraction

## Overview

Code review found hundreds of hardcoded numeric literals scattered throughout systems, behaviors, and actions. These "magic numbers" make code harder to understand, tune, and maintain. This work order extracts them into named constants.

---

## 1. Proposed Constants Files

Create organized constant files:

```
packages/core/src/constants/
├── TimeConstants.ts      # Durations, intervals, tick rates
├── SpatialConstants.ts   # Distances, radii, coordinates
├── NeedsConstants.ts     # Thresholds for hunger, energy, health
├── GameplayConstants.ts  # Yields, costs, multipliers
└── index.ts              # Barrel export
```

---

## 2. Time and Duration Constants

### TimeConstants.ts

```typescript
// packages/core/src/constants/TimeConstants.ts

/** Ticks per second (standard game speed) */
export const TICKS_PER_SECOND = 20;

/** Seconds in one game day at 1x speed */
export const GAME_DAY_SECONDS = 48;

/** Ticks in one game hour */
export const TICKS_PER_HOUR = 1200; // 20 TPS * 60 seconds

/** Ticks in one game day */
export const TICKS_PER_DAY = 28800; // TICKS_PER_HOUR * 24

// Time of day phases
export const DAWN_START_HOUR = 5;
export const DAY_START_HOUR = 7;
export const DUSK_START_HOUR = 17;
export const NIGHT_START_HOUR = 19;

// Light levels
export const LIGHT_LEVEL_NIGHT = 0.3;
export const LIGHT_LEVEL_DAWN_DUSK = 0.7;
export const LIGHT_LEVEL_DAY = 0.9;

// Action durations (in ticks)
export const TILL_DURATION_WITH_HOE = 200;      // 10 seconds
export const TILL_DURATION_WITH_SHOVEL = 250;   // 12.5 seconds
export const TILL_DURATION_BY_HAND = 400;       // 20 seconds
export const HARVEST_DURATION_BASE = 160;       // 8 seconds
export const GATHER_SEEDS_DURATION = 100;       // 5 seconds
export const TRADE_DURATION = 40;               // 2 seconds

// Behavior intervals (in ticks)
export const MONOLOGUE_INTERVAL = 300;          // 15 seconds
export const OBSERVE_MAX_DURATION = 400;        // 20 seconds
export const PRACTICE_MAX_DURATION = 500;       // 25 seconds
export const REFLECT_MAX_DURATION = 200;        // 10 seconds

// Sleep durations (in game hours)
export const SLEEP_MIN_HOURS = 4;
export const SLEEP_MAX_HOURS = 12;

// System intervals
export const MARKET_EVENT_CHECK_INTERVAL = 2400;  // 2 minutes
export const CLEANLINESS_UPDATE_INTERVAL = 86400; // 24 hours in seconds
```

**Files to update:**
- `systems/TimeSystem.ts:22, 41-44, 54-55, 61-62`
- `systems/MarketEventSystem.ts:51, 147-148`
- `systems/AnimalHousingSystem.ts:23`
- `actions/TillActionHandler.ts:57, 63, 69, 78, 83, 86`
- `actions/HarvestActionHandler.ts:52`
- `actions/GatherSeedsActionHandler.ts:43`
- `actions/TradeActionHandler.ts:48`
- `behavior/behaviors/SleepBehavior.ts:220, 222`
- `behavior/behaviors/ObserveBehavior.ts:30, 50`
- `behavior/behaviors/ReflectBehavior.ts:68`

---

## 3. Spatial Constants

### SpatialConstants.ts

```typescript
// packages/core/src/constants/SpatialConstants.ts

/** Distance for diagonal adjacency (Math.sqrt(2)) */
export const DIAGONAL_DISTANCE = Math.sqrt(2);

/** Distance considered "adjacent" for interactions */
export const ADJACENT_DISTANCE = 1.5;

/** Standard interaction distance */
export const INTERACTION_DISTANCE = 2.0;

// Search radii
export const GATHER_MAX_RANGE = 50;
export const HOME_RADIUS = 15;
export const HARVEST_DISTANCE = 1.5;
export const TILL_SEARCH_RADIUS = 10;
export const PLANT_SEARCH_RADIUS = 15;
export const WATER_SEARCH_RADIUS = 15;
export const TAMING_RANGE = 40;
export const HOUSING_RANGE = 50;
export const SHOP_SEARCH_RADIUS = 50;
export const CRAFT_STATION_SEARCH_RADIUS = 30;

// Follow behavior
export const FOLLOW_MIN_DISTANCE = 3;
export const FOLLOW_MAX_DISTANCE = 5;

// Meeting/social
export const MEETING_ARRIVAL_THRESHOLD = 2.0;

// Building placement
export const PLACEMENT_SEARCH_RADIUS = 10;
export const ADJACENT_BUILDING_CHECK = 2;

// Verification system
export const VERIFICATION_RANGE = 5;
export const CLAIM_AGE_THRESHOLD = 200;
```

**Files to update:**
- `behavior/behaviors/DepositItemsBehavior.ts:129`
- `behavior/behaviors/NavigationBehaviors.ts:46, 48`
- `behavior/behaviors/TradeBehavior.ts:24, 27`
- `behavior/behaviors/CraftBehavior.ts:26, 29`
- `behavior/behaviors/SleepBehavior.ts:57`
- `behavior/behaviors/GatherBehavior.ts:37, 40, 43`
- `behavior/behaviors/FarmBehaviors.ts:20, 23, 211, 269, 399, 457-458`
- `behavior/behaviors/FollowAgentBehavior.ts:18, 21`
- `behavior/behaviors/AnimalBehaviors.ts:22, 24, 26, 28`
- `behavior/behaviors/MeetingBehaviors.ts:30`
- `behavior/behaviors/BuildBehavior.ts:153, 323`
- `systems/VerificationSystem.ts:20, 22, 200`

---

## 4. Needs Constants

### NeedsConstants.ts

```typescript
// packages/core/src/constants/NeedsConstants.ts

// Hunger thresholds (0-100 scale for legacy, 0-1 for new)
export const HUNGER_THRESHOLD_SEEK_FOOD = 70;
export const HUNGER_RESTORED_DEFAULT = 25;

// Energy thresholds
export const ENERGY_CRITICAL = 10;
export const ENERGY_LOW = 30;
export const ENERGY_MODERATE = 50;
export const ENERGY_HIGH = 70;
export const ENERGY_FULL = 100;

// Energy work multipliers
export const WORK_SPEED_CRITICAL = 0.5;
export const WORK_SPEED_LOW = 0.75;
export const WORK_SPEED_MODERATE = 0.9;
export const WORK_SPEED_NORMAL = 1.0;

// Sleep completion thresholds
export const SLEEP_COMPLETE_ENERGY = 100;
export const SLEEP_INTERRUPT_HUNGER = 10;
export const SLEEP_INTERRUPT_ENERGY = 70;

// Sleep quality modifiers
export const SLEEP_QUALITY_SHELTER = 0.5;
export const SLEEP_QUALITY_HOUSE = 0.4;
export const SLEEP_QUALITY_BED = 0.2;
export const SLEEP_QUALITY_LUXURY = 0.1;
export const SLEEP_QUALITY_MIN = 0.1;
export const SLEEP_QUALITY_MAX = 1.0;

// Health thresholds
export const HEALTH_CRITICAL = 20;
export const HEALTH_DAMAGE_RATE = 0.5; // per second in dangerous temps

// Cleanliness thresholds (housing)
export const CLEANLINESS_WARNING = 30;
export const CLEANLINESS_PENALTY = 50;
export const STRESS_PENALTY_MULTIPLIER = 0.01;

// Temperature
export const BODY_TEMP_NORMAL = 37;
export const WORLD_TEMP_BASE = 20;
export const TEMP_DAILY_VARIATION = 8;
export const THERMAL_CHANGE_RATE = 0.15;

// Mood
export const MOOD_DECAY_RATE = 0.01;
```

**Files to update:**
- `behavior/behaviors/SeekFoodBehavior.ts:24, 50, 68, 81`
- `behavior/behaviors/GatherBehavior.ts:263-273`
- `behavior/behaviors/SleepBehavior.ts:133, 139, 141, 143, 148, 214, 216, 218`
- `systems/TemperatureSystem.ts:20-23, 94`
- `systems/AnimalHousingSystem.ts:76, 127, 129-130, 134`
- `components/MoodComponent.ts:238`

---

## 5. Gameplay Constants

### GameplayConstants.ts

```typescript
// packages/core/src/constants/GameplayConstants.ts

// Resource yields
export const BASE_SEED_YIELD_HARVEST = 20;
export const BASE_SEED_YIELD_GATHER = 10;
export const BASE_FRUIT_YIELD = 3;

// Skill modifiers
export const SKILL_YIELD_MULTIPLIER_BASE = 0.5;
export const SKILL_YIELD_MULTIPLIER_SCALE = 1.5;
export const SKILL_LEVEL_HARVEST_THRESHOLD = 5;

// Market events
export const MARKET_EVENT_CHANCE = 0.1;  // 10% per check
export const MARKET_EVENT_DURATION_MIN_DAYS = 1;
export const MARKET_EVENT_DURATION_MAX_DAYS = 5;
export const MARKET_SHORTAGE_MULTIPLIER_MIN = 1.5;
export const MARKET_SHORTAGE_MULTIPLIER_MAX = 2.5;
export const MARKET_SURPLUS_MULTIPLIER_MIN = 0.5;
export const MARKET_SURPLUS_MULTIPLIER_MAX = 0.8;

// Genetics variance
export const MUTATION_CHANCE = 0.1;
export const MUTATION_MAGNITUDE = 0.1;
export const INHERITANCE_VARIANCE_MIN = 0.9;
export const INHERITANCE_VARIANCE_MAX = 1.1;

// Wild animal spawning
export const SPAWN_COUNT_MIN = 1;
export const SPAWN_COUNT_MAX = 3;
export const SPAWN_COUNT_HERD = 2;

// Soil fertility ranges
export const SOIL_FERTILITY_MIN = 60;
export const SOIL_FERTILITY_MAX = 80;
export const SOIL_MOISTURE_MIN = 40;
export const SOIL_MOISTURE_MAX = 70;

// Hydration threshold for watering
export const HYDRATION_THRESHOLD = 50;
```

**Files to update:**
- `actions/HarvestActionHandler.ts:243, 252-253, 263`
- `actions/GatherSeedsActionHandler.ts:229`
- `behavior/behaviors/GatherBehavior.ts:445-449`
- `systems/MarketEventSystem.ts:52, 148, 158, 172`
- `genetics/PlantGenetics.ts:90-91`
- `genetics/SleepGenetics.ts:47-50, 59`
- `systems/WildAnimalSpawningSystem.ts:81-83`
- `systems/SoilSystem.ts:380-388`
- `behavior/behaviors/FarmBehaviors.ts:458`

---

## 6. Implementation Plan

### Phase 1: Create Constants Files (1 hour)
1. Create `packages/core/src/constants/` directory
2. Create all four constants files with exports
3. Create `index.ts` barrel export

### Phase 2: Update Systems (2 hours)
1. Update all system files to import constants
2. Replace magic numbers with constant references
3. Run build after each file

### Phase 3: Update Behaviors (2 hours)
1. Update all behavior files
2. Replace magic numbers with constant references

### Phase 4: Update Actions (1 hour)
1. Update all action handler files
2. Replace magic numbers with constant references

### Phase 5: Cleanup (30 min)
1. Grep for remaining numeric literals
2. Decide if remaining ones need extraction
3. Document any intentional inline numbers

---

## 7. Verification

```bash
# Find remaining magic numbers (may have false positives)
grep -rn "[^a-zA-Z][0-9]\{2,\}[^a-zA-Z0-9]" packages/core/src/systems/*.ts
grep -rn "[^a-zA-Z][0-9]\{2,\}[^a-zA-Z0-9]" packages/core/src/behavior/**/*.ts

# Verify no broken imports
npm run build

# Verify tests still pass
npm run test
```

---

**End of Specification**
