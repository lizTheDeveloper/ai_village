# Work Order: PlantSystem Decomposition

**Phase:** Infrastructure (Maintainability)
**Created:** 2025-12-26
**Updated:** 2026-01-11
**Priority:** LOW
**Status:** READY - Package Extraction Complete

---

## Update (2026-01-11): Package Extraction COMPLETE ✅

The plant systems have been fully extracted from `@ai-village/core` to `@ai-village/botany`:

### Extraction Status
- ✅ PlantSystem ported with StateMutatorSystem integration
- ✅ PlantDiseaseSystem, PlantDiscoverySystem, WildPlantPopulationSystem synced
- ✅ registerAllSystems updated to require plant systems via config
- ✅ demo/main.ts now imports plant systems from @ai-village/botany
- ✅ demo/headless.ts now imports plant systems from @ai-village/botany
- ✅ scripts/headless-game.ts now imports plant systems from @ai-village/botany
- ✅ packages/shared-worker now imports plant systems from @ai-village/botany
- ✅ packages/city-simulator now imports plant systems from @ai-village/botany
- ✅ Plant tests moved to botany package (30/33 passing)
- ✅ Deprecated plant systems deleted from core

### Breaking Changes
- `registerAllSystems()` now **requires** `plantSystems` config
- Must import plant systems from `@ai-village/botany`:
  ```typescript
  import { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem } from '@ai-village/botany';
  ```

### Remaining Files in Core (Types & Constants - Shared)
- `PLANT_CONSTANTS` - Still exported from core (used by botany)
- `PlantComponent`, `PlantSpecies`, `PlantDisease` - Types remain in core

**This decomposition work order now targets `@ai-village/botany/src/systems/PlantSystem.ts`.**

---

## Problem Statement

`PlantSystem.ts` is **~1400 lines** (923 lines noted when work order was created, has grown with StateMutatorSystem integration) with **30+ functions**, handling:
- Plant lifecycle (growth stages)
- Environmental calculations (temperature, moisture)
- Weather effects (rain, frost)
- Soil effects (nutrients, moisture)
- Stage transitions
- Seed dispersal
- Germination

While better structured than AISystem, it still mixes concerns.

---

## Current Structure Analysis

```
PlantSystem.ts (923 lines)
├── Event Listeners (lines 115-293)
│   ├── weather:changed
│   ├── time:day_changed
│   ├── soil:moisture_changed
│   └── soil:nutrient_changed
├── Plant Validation (lines 294-308)
├── Environment (lines 309-395)
│   ├── getEnvironment()
│   ├── getTemperature()
│   └── getMoisture()
├── Weather Effects (lines 396-414)
├── Soil Effects (lines 415-518)
├── Growth Calculation (lines 519-590)
│   ├── updatePlantHourly()
│   ├── calculateGrowthProgress()
│   └── calculateTemperatureModifier()
├── Stage Transitions (lines 591-763)
│   ├── attemptStageTransition()
│   ├── checkTransitionConditions()
│   └── executeTransitionEffects()
├── Stage-Specific Updates (lines 764-858)
├── Seed Dispersal (lines 859-912)
└── Germination (lines 867-920)
```

---

## Proposed Architecture

```
packages/botany/src/systems/      # After extraction complete (current location)
├── PlantSystem.ts                 # Thin orchestrator (~200 lines)
├── plant/
│   ├── GrowthCalculator.ts        # Growth progress, modifiers
│   ├── EnvironmentProcessor.ts    # Temperature, moisture, weather
│   ├── StageTransitionHandler.ts  # Stage changes, effects
│   ├── SeedDispersalSystem.ts     # Seed spreading logic
│   └── PlantValidator.ts          # Validation utilities
```

**Note:** This decomposition should be done in `@ai-village/botany` once the package extraction is complete.

---

## Extraction Plan

### Phase 1: Extract GrowthCalculator

**plant/GrowthCalculator.ts** (~150 lines)
```typescript
export class GrowthCalculator {
  calculateGrowthProgress(
    plant: PlantComponent,
    species: PlantSpecies,
    environment: Environment,
    deltaHours: number
  ): number {
    const baseRate = species.growthRate;
    const tempMod = this.calculateTemperatureModifier(plant, environment.temperature);
    const moistMod = this.calculateMoistureModifier(plant, environment.moisture);

    return baseRate * tempMod * moistMod * deltaHours;
  }

  calculateTemperatureModifier(plant: PlantComponent, temp: number): number {
    // Extract from lines 554-574
  }

  calculateMoistureModifier(plant: PlantComponent, moisture: number): number {
    // Extract from lines 575-590
  }
}
```

### Phase 2: Extract EnvironmentProcessor

**plant/EnvironmentProcessor.ts** (~100 lines)
```typescript
export class EnvironmentProcessor {
  private weatherRainIntensity: string | null = null;
  private weatherFrostTemperature: number | null = null;
  private weatherTemperature: number = 20;

  getEnvironment(position: Position, world: World): Environment {
    return {
      temperature: this.getTemperature(position, world),
      moisture: this.getMoisture(position, world),
      light: this.getLight(world),
    };
  }

  applyWeatherEffects(plant: PlantComponent, environment: Environment): PlantComponent {
    // Extract from lines 344-395
  }

  handleWeatherChange(weather: WeatherState): void {
    this.weatherRainIntensity = weather.rain;
    this.weatherFrostTemperature = weather.frostTemp;
  }
}
```

### Phase 3: Extract StageTransitionHandler

**plant/StageTransitionHandler.ts** (~200 lines)
```typescript
export class StageTransitionHandler {
  attemptStageTransition(
    plant: PlantComponent,
    species: PlantSpecies,
    world: World
  ): PlantComponent | null {
    const nextStage = this.getNextStage(plant.stage);
    if (!nextStage) return null;

    if (this.checkTransitionConditions(plant, species, nextStage)) {
      return this.executeTransitionEffects(plant, nextStage, world);
    }
    return null;
  }

  private checkTransitionConditions(...): boolean {
    // Extract from lines 636-669
  }

  private executeTransitionEffects(...): PlantComponent {
    // Extract from lines 670-763
  }
}
```

### Phase 4: Extract SeedDispersalSystem

**plant/SeedDispersalSystem.ts** (~100 lines)
```typescript
export class SeedDispersalSystem {
  disperseSeeds(
    plant: PlantComponent,
    position: Position,
    species: PlantSpecies,
    world: World
  ): void {
    const seedCount = this.calculateSeedCount(plant, species);
    const positions = this.findSuitablePositions(position, seedCount, world);

    for (const pos of positions) {
      this.createSeed(pos, species, world);
    }
  }

  private isTileSuitable(position: Position, world: World): boolean {
    // Extract from lines 859-866
  }
}
```

### Phase 5: Thin Orchestrator

**PlantSystem.ts** (~200 lines)
```typescript
export class PlantSystem implements System {
  private growth = new GrowthCalculator();
  private environment = new EnvironmentProcessor();
  private transitions = new StageTransitionHandler();
  private dispersal = new SeedDispersalSystem();

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const plant = entity.getComponent<PlantComponent>('plant');
      const position = entity.getComponent<PositionComponent>('position');
      if (!plant || !position) continue;

      const env = this.environment.getEnvironment(position, world);
      const grown = this.growth.calculateGrowthProgress(plant, species, env, deltaTime);

      this.updatePlant(entity, plant, grown);
      this.transitions.attemptStageTransition(plant, species, world);
    }
  }
}
```

---

## Acceptance Criteria

### Criterion 1: PlantSystem < 250 Lines
- Only orchestration and event handling
- **Verification:** `wc -l`

### Criterion 2: Sub-Systems Exist
- GrowthCalculator, EnvironmentProcessor, StageTransitionHandler, SeedDispersalSystem
- Each < 200 lines
- **Verification:** file existence + line counts

### Criterion 3: Plants Still Grow
- All growth stages work
- Weather affects plants
- Seeds disperse correctly
- **Verification:** Playtest 24+ game hours

### Criterion 4: Tests Pass
- Existing PlantSystem tests pass
- New unit tests for extracted classes
- **Verification:** `npm test`

---

## Files to Create

- `plant/GrowthCalculator.ts`
- `plant/EnvironmentProcessor.ts`
- `plant/StageTransitionHandler.ts`
- `plant/SeedDispersalSystem.ts`
- `plant/PlantValidator.ts`

---

## Notes for Implementation Agent

1. **GrowthCalculator first** - Pure calculation, no dependencies
2. **Keep event handlers in PlantSystem** - They're orchestration
3. **Pass species as parameter** - Don't store lookup in sub-systems
4. **Test each stage** - Germination → seedling → vegetative → flowering → fruiting → seeding

---

## Success Metrics

- ✅ PlantSystem.ts < 250 lines
- ✅ Each sub-system < 200 lines
- ✅ Plants grow through all stages
- ✅ Weather effects work
- ✅ Seed dispersal works
- ✅ Tests pass

---

**Estimated Complexity:** MEDIUM
**Estimated Time:** 3-5 hours
**Priority:** LOW (PlantSystem works, just large)
