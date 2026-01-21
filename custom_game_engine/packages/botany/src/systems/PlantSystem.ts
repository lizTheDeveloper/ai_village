import type {
  SystemId,
  ComponentType,
  World,
  WorldMutator,
  Entity,
  PlantComponent,
  SeedComponent,
  PlantSpecies,
  StageTransition,
  EventBus,
  StateMutatorSystem,
} from '@ai-village/core';
import {
  BaseSystem,
  type SystemContext,
  ComponentType as CT,
  EntityImpl,
  applyGenetics,
  canGerminate,
  createSeedFromPlant,
  BugReporter,
  PLANT_CONSTANTS,
} from '@ai-village/core';

/**
 * Soil state interface for planting validation
 */
interface SoilState {
  nutrients: number;
  moisture?: number;
  tilled?: boolean;
}

interface Environment {
  temperature: number;
  moisture: number;
  nutrients: number;
  season: string;
  lightLevel: number;
}

/**
 * PlantSystem manages the plant lifecycle, stage transitions, health updates, and seed production
 *
 * PERFORMANCE: Uses StateMutatorSystem for batched vector updates for gradual changes
 * - Hydration decay, age increment, and health damage use batched deltas
 * - Stage progress and event emission run at appropriate frequencies
 *
 * Dependencies:
 * @see TimeSystem (priority 3) - Provides game time for plant growth, aging, and hourly updates
 * @see WeatherSystem (priority 5) - Provides weather events (rain, frost) affecting plant hydration and health
 * @see SoilSystem (priority 15) - Provides soil moisture and nutrient data affecting plant growth
 * @see StateMutatorSystem (priority 5) - Handles batched hydration/age/health updates
 */
export class PlantSystem extends BaseSystem {
  public readonly id: SystemId = 'plant';
  public readonly priority = 20; // After SoilSystem, WeatherSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Plant];

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides game time for plant aging and stage transitions
   * @see WeatherSystem - provides rain/frost events affecting plant hydration and health
   * @see SoilSystem - provides soil moisture and nutrient data for growth calculations
   * @see StateMutatorSystem - handles batched hydration/age/health updates
   */
  public readonly dependsOn = ['time', 'weather', 'soil', 'state_mutator'] as const;
  private speciesLookup: ((id: string) => PlantSpecies) | null = null;

  // Reference to StateMutatorSystem (set via setStateMutatorSystem)
  private stateMutator: StateMutatorSystem | null = null;

  // Performance: Update delta rates once per game hour (3600 ticks)
  private lastDeltaUpdateTick = 0;
  private readonly DELTA_UPDATE_INTERVAL = 3600; // 1 game hour at 20 TPS

  // Track corrupted plants that have already been reported (report once, not every tick)
  private reportedCorruptedPlants = new Set<string>();

  // Track cleanup functions for registered deltas
  private deltaCleanups = new Map<string, {
    hydration: () => void;
    age: () => void;
    dehydrationDamage?: () => void;
    malnutritionDamage?: () => void;
  }>();

  // Event listeners storage
  private weatherRainIntensity: string | null = null;
  private weatherFrostTemperature: number | null = null;
  private weatherTemperature: number = 20; // Default temperature
  private soilMoistureChanges: Map<string, number> = new Map();
  private soilNutrientChanges: Map<string, number> = new Map();
  private dayStarted: boolean = false;
  private daySkipCount: number = 0; // How many days to skip (for time:day_changed events)

  // Time tracking for plant updates
  private accumulatedTime: number = 0;
  private readonly HOUR_THRESHOLD = PLANT_CONSTANTS.HOUR_THRESHOLD; // Update plants once per day
  private lastUpdateLog: number = 0;

  // Track entity IDs for plants (to avoid using 'as any')
  private plantEntityIds: WeakMap<PlantComponent, string> = new WeakMap();

  protected onInitialize(world: World, eventBus: EventBus): void {
    this.registerEventListeners();
  }

  /**
   * Set the plant species lookup function (injected from world package)
   */
  public setSpeciesLookup(lookup: (id: string) => PlantSpecies): void {
    this.speciesLookup = lookup;
  }

  /**
   * Set the StateMutatorSystem reference.
   * Called by registerAllSystems during initialization.
   */
  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  /**
   * Get species definition - throws if species not found
   * Per CLAUDE.md: No silent fallbacks for production
   */
  private getSpecies(speciesId: string): PlantSpecies {
    if (!this.speciesLookup) {
      throw new Error(`PlantSystem species lookup not configured. Cannot resolve species "${speciesId}". Call setSpeciesLookup() to configure species definitions.`);
    }

    return this.speciesLookup(speciesId);
  }

  /**
   * Register event listeners for weather and soil events
   */
  private registerEventListeners(): void {
    // Weather events
    this.events.subscribe('weather:rain', (event: unknown) => {
      const e = event as { data?: { intensity?: string } };
      const intensity = e.data?.intensity;
      this.weatherRainIntensity = intensity || 'light';
    });

    this.events.subscribe('weather:frost', (event: unknown) => {
      const e = event as { data?: { temperature?: number } };
      const temperature = e.data?.temperature;
      this.weatherFrostTemperature = temperature ?? -2;
    });

    this.events.subscribe('weather:changed', (_event: unknown) => {
      // Weather changed event doesn't include temperature
      // Temperature updates come from weather:frost event
    });

    // Soil events
    this.events.subscribe('soil:moistureChanged', (event: unknown) => {
      const e = event as { data: { x: number; y: number; newMoisture: number } };
      const x = e.data.x;
      const y = e.data.y;
      const newMoisture = e.data.newMoisture;
      const key = `${x},${y}`;
      this.soilMoistureChanges.set(key, newMoisture);
    });

    this.events.subscribe('soil:depleted', (event: unknown) => {
      const e = event as { data: { x: number; y: number; nutrientLevel: number } };
      const x = e.data.x;
      const y = e.data.y;
      const nutrientLevel = e.data.nutrientLevel;
      const key = `${x},${y}`;
      this.soilNutrientChanges.set(key, nutrientLevel);
    });

    // Time events
    this.events.subscribe('time:day_changed', () => {
      this.dayStarted = true;
      this.daySkipCount += 1; // Increment day skip counter
    });
  }

  /** Run every 20 ticks (1 second at 20 TPS) - plants don't need per-frame updates */
  private static readonly UPDATE_INTERVAL = PLANT_CONSTANTS.UPDATE_INTERVAL;
  protected readonly throttleInterval = PlantSystem.UPDATE_INTERVAL;

  /**
   * Main update loop - runs every frame
   */
  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const entities = ctx.activeEntities;
    const deltaTime = ctx.deltaTime;
    if (entities.length === 0) return;

    // Multiply deltaTime by interval to compensate for throttled ticks
    const effectiveDeltaTime = deltaTime * PlantSystem.UPDATE_INTERVAL;

    // Get current tick for delta update timing
    const currentTick = world.tick;

    // Clear companion planting cache at start of each update
    this.clearCompanionCache();

    // Update agent positions in scheduler for proximity-based simulation culling
    world.simulationScheduler.updateAgentPositions(world);

    // Get time component to calculate game hours elapsed
    const timeEntities = world.query().with(CT.Time).executeEntities();
    let gameHoursElapsed = 0;

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0];
      const timeComp = timeEntity!.components.get('time') as { dayLength: number; speedMultiplier: number } | undefined;
      if (timeComp) {
        // Calculate effective day length based on speed multiplier
        const effectiveDayLength = timeComp.dayLength / timeComp.speedMultiplier;
        // Convert real-time effectiveDeltaTime to game hours
        gameHoursElapsed = (effectiveDeltaTime / effectiveDayLength) * 24;
      }
    } else {
      // Fallback: assume 10 minutes per day (600 seconds)
      gameHoursElapsed = (effectiveDeltaTime / 600) * 24;
    }

    // Accumulate time
    this.accumulatedTime += gameHoursElapsed;

    // Track last update time
    const now = Date.now();
    if (now - this.lastUpdateLog > 30000) {
      this.lastUpdateLog = now;
    }

    // Check if we've accumulated enough time for an update (every game hour)
    const shouldUpdate = this.accumulatedTime >= this.HOUR_THRESHOLD || this.dayStarted;

    // Calculate how many hours to process
    let hoursToProcess = 0;
    if (this.daySkipCount > 0) {
      // Day skip event - process full days
      hoursToProcess = this.daySkipCount * 24;
    } else if (shouldUpdate) {
      // Normal hourly update
      hoursToProcess = this.accumulatedTime;
    }

    // Validate all plant entities first (regardless of time accumulation)
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(CT.Plant);
      if (!plant) continue;

      // Validate position exists on plant component
      // If missing, skip this plant (don't crash whole system)
      if (!plant.position) {
        // Only report each corrupted plant once (not every tick)
        if (!this.reportedCorruptedPlants.has(entity.id)) {
          this.reportedCorruptedPlants.add(entity.id);
          console.error(`[PlantSystem] Plant entity ${entity.id} missing required position field - skipping`);
          BugReporter.reportCorruptedPlant({
            entityId: entity.id,
            reason: 'Missing position field',
            plantData: {
              speciesId: plant.speciesId,
              stage: plant.stage,
              health: plant.health
            }
          });
        }
        continue;
      }

      // Validate required fields
      try {
        this.validatePlant(plant);
      } catch (error) {
        // Only report each corrupted plant once (not every tick)
        if (!this.reportedCorruptedPlants.has(entity.id)) {
          this.reportedCorruptedPlants.add(entity.id);
          console.error(`[PlantSystem] Plant entity ${entity.id} failed validation: ${error} - skipping`);
          BugReporter.reportCorruptedPlant({
            entityId: entity.id,
            reason: `Validation failed: ${error}`,
            plantData: {
              speciesId: plant.speciesId,
              stage: plant.stage,
              health: plant.health,
              hydration: plant.hydration,
              nutrition: plant.nutrition,
              position: plant.position
            }
          });
        }
        continue;
      }

      // Validate species exists (per CLAUDE.md: throw instead of silent fallback)
      const species = this.getSpecies(plant.speciesId);
      void species; // Use species to prevent unused variable warning
    }

    // Skip processing if no hours to process
    if (!shouldUpdate || hoursToProcess === 0) {
      return;
    }

    // Filter entities using SimulationScheduler - only process visible plants
    // Note: Planted crops are handled specially below (always simulate)
    const visibleEntities = world.simulationScheduler.filterActiveEntities(
      entities as unknown as Entity[],
      world.tick
    );

    // Build set of visible entity IDs for quick lookup
    const visibleEntityIds = new Set<string>();
    for (const entity of visibleEntities) {
      visibleEntityIds.add(entity.id);
    }

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(CT.Plant);
      if (!plant) continue;

      // Skip plants missing critical data (validated above, but double-check)
      if (!plant.position) {
        continue;
      }

      // Simulation culling: Wild plants only simulate when visible
      // Planted crops always simulate (player investment requires always-on simulation)
      const isVisible = visibleEntityIds.has(entity.id);
      if (!plant.planted && !isVisible) {
        continue; // Skip wild plants that are off-screen (pause simulation)
      }

      // Store entity ID for this plant
      this.plantEntityIds.set(plant, entity.id);

      try {
        // Get species definition
        const species = this.getSpecies(plant.speciesId);

        // Get environment for this plant
        const environment = this.getEnvironment(plant.position, world as any);

        // Apply weather effects (every frame for immediate response)
        this.applyWeatherEffects(plant, environment);

        // Apply soil effects (every frame for immediate response)
        this.applySoilEffects(plant);

        // Update delta rates once per game hour (for continuous gradual changes)
        const shouldUpdateDeltas = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;
        if (shouldUpdateDeltas) {
          this.updatePlantDeltas(plant, species, environment, entity.id);
        }

        // Hourly updates - stage progress and event emission
        if (shouldUpdate) {
          this.updatePlantHourly(plant, species, environment, world as any, entity.id, hoursToProcess);
        }

        // Check for stage transition
        if (plant.stageProgress >= 1.0) {
          this.attemptStageTransition(plant, species, environment, world as any, entity.id);
        }

        // Check for death
        if (plant.health <= 0 && plant.stage !== 'dead') {
          plant.stage = 'dead';
          this.events.emit('plant:died', {
            plantId: entity.id,
            speciesId: plant.speciesId,
            cause: 'health_depleted',
            entityId: entity.id
          });
        }

        // Emit event for dead plants (renderer/world can handle removal)
        if (plant.stage === 'dead') {
          this.events.emit('plant:dead', {
            entityId: entity.id,
            position: plant.position
          });
        }
      } catch (error) {
        throw error; // Re-throw to ensure errors aren't silenced
      }
    }

    // MIDNIGHT FRUIT REGENERATION: All plants regenerate fruit once per day at midnight
    // This runs only when the day has just changed (midnight)
    if (this.dayStarted) {
      this.regenerateFruitAtMidnight(entities, world as any);
    }

    // Reset accumulated time and flags after update
    if (shouldUpdate) {
      this.accumulatedTime = 0;
      this.dayStarted = false;
      this.daySkipCount = 0; // Reset day skip counter
    }

    // Mark delta rates as updated
    const shouldUpdateDeltas = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;
    if (shouldUpdateDeltas) {
      this.lastDeltaUpdateTick = currentTick;
    }

    // Always clear weather effects after processing
    this.weatherRainIntensity = null;
    this.weatherFrostTemperature = null;
  }

  /**
   * Validate that plant has all required fields
   */
  private validatePlant(plant: PlantComponent): void {
    if (plant.health === undefined) {
      throw new Error('Plant health not set - required for lifecycle');
    }
    if (plant.hydration === undefined) {
      throw new Error('Plant hydration not set - required for lifecycle');
    }
    if (plant.nutrition === undefined) {
      throw new Error('Plant nutrition not set - required for lifecycle');
    }
  }

  /**
   * Get environmental conditions for a plant position
   */
  private getEnvironment(position: { x: number; y: number }, world: World): Environment {
    const temperature = this.getTemperature(position, world);
    const moisture = this.getMoisture(position, world);
    const nutrients = 80; // Default from soil
    const season = 'spring'; // Default
    const lightLevel = 100; // Default

    return {
      temperature,
      moisture,
      nutrients,
      season,
      lightLevel
    };
  }

  /**
   * Get temperature at position from TemperatureSystem
   */
  private getTemperature(_position: { x: number; y: number }, _world: World): number {
    // Use weather temperature
    return this.weatherTemperature;
  }

  /**
   * Get moisture at position from SoilSystem
   */
  private getMoisture(position: { x: number; y: number }, _world: World): number {
    const key = `${position.x},${position.y}`;
    return this.soilMoistureChanges.get(key) ?? 70; // Default moisture
  }

  /**
   * Apply weather effects to plant
   */
  private applyWeatherEffects(plant: PlantComponent, environment: Environment): void {
    // Get entity ID for logging
    const entityId = this.plantEntityIds.get(plant) || 'unknown';
    void environment; // Environment used later in hot weather check

    // Rain increases hydration
    if (this.weatherRainIntensity && !plant.isIndoors) {
      const hydrationGain = this.weatherRainIntensity === 'heavy' ? PLANT_CONSTANTS.HYDRATION_GAIN_HEAVY_RAIN :
                           this.weatherRainIntensity === 'light' ? PLANT_CONSTANTS.HYDRATION_GAIN_LIGHT_RAIN : PLANT_CONSTANTS.HYDRATION_GAIN_MEDIUM_RAIN;
      plant.hydration = Math.min(100, plant.hydration + hydrationGain);

    }

    // Frost damages cold-sensitive plants
    if (this.weatherFrostTemperature !== null) {
      const frostDamage = applyGenetics(plant, 'frostDamage', this.weatherFrostTemperature);
      if (frostDamage > 0) {
        const previousHealth = plant.health;
        plant.health -= frostDamage;

        this.events.emit('plant:healthChanged', {
            plantId: entityId,
            oldHealth: previousHealth,
            newHealth: plant.health,
            reason: 'frost',
            entityId: entityId
          });
      }
    }

    // Hot weather increases hydration decay
    if (environment.temperature > PLANT_CONSTANTS.HEAT_STRESS_THRESHOLD) {
      const extraDecay = (environment.temperature - PLANT_CONSTANTS.HEAT_STRESS_THRESHOLD) * PLANT_CONSTANTS.HEAT_STRESS_DAMAGE_MULTIPLIER;
      plant.hydration -= extraDecay;
    }
  }

  /**
   * Apply soil effects to plant
   */
  private applySoilEffects(plant: PlantComponent): void {
    const key = `${plant.position.x},${plant.position.y}`;

    // Update moisture from soil events
    if (this.soilMoistureChanges.has(key)) {
      const soilMoisture = this.soilMoistureChanges.get(key)!;
      plant.hydration = Math.min(100, plant.hydration + (soilMoisture - 50) * PLANT_CONSTANTS.SOIL_MOISTURE_TRANSFER_RATE);
    }

    // Update nutrition from soil events
    if (this.soilNutrientChanges.has(key)) {
      const soilNutrients = this.soilNutrientChanges.get(key)!;
      plant.nutrition = Math.max(0, soilNutrients);
    }
  }

  /**
   * Update plant deltas for continuous gradual changes
   * Called once per game hour to update delta rates
   */
  private updatePlantDeltas(
    plant: PlantComponent,
    _species: PlantSpecies,
    _environment: Environment,
    entityId: string
  ): void {
    if (!this.stateMutator) {
      throw new Error('[PlantSystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    // Clean up old deltas if they exist
    if (this.deltaCleanups.has(entityId)) {
      const cleanups = this.deltaCleanups.get(entityId)!;
      cleanups.hydration();
      cleanups.age();
      cleanups.dehydrationDamage?.();
      cleanups.malnutritionDamage?.();
    }

    // Hydration decay (per game minute)
    const hydrationDecayPerDay = applyGenetics(plant, 'hydrationDecay');
    const hydrationDecayPerMinute = -(hydrationDecayPerDay / (24 * 60)); // Convert day to minutes

    const hydrationCleanup = this.stateMutator.registerDelta({
      entityId,
      componentType: CT.Plant,
      field: 'hydration',
      deltaPerMinute: hydrationDecayPerMinute,
      min: 0,
      max: 100,
      source: 'plant_hydration_decay',
    });

    // Age increment (per game minute)
    // 1 game day = 1440 game minutes, age is in days
    const ageIncreasePerMinute = 1 / 1440; // ~0.000694 days per minute

    const ageCleanup = this.stateMutator.registerDelta({
      entityId,
      componentType: CT.Plant,
      field: 'age',
      deltaPerMinute: ageIncreasePerMinute,
      min: 0,
      source: 'plant_age',
    });

    // Health damage from critical conditions
    let dehydrationCleanup: (() => void) | undefined;
    let malnutritionCleanup: (() => void) | undefined;

    // Dehydration damage (if hydration < 20)
    if (plant.hydration < PLANT_CONSTANTS.HYDRATION_CRITICAL_THRESHOLD) {
      // DEHYDRATION_DAMAGE_PER_DAY / 1440 minutes per day
      const dehydrationDamagePerMinute = -(PLANT_CONSTANTS.DEHYDRATION_DAMAGE_PER_DAY / 1440);

      dehydrationCleanup = this.stateMutator.registerDelta({
        entityId,
        componentType: CT.Plant,
        field: 'health',
        deltaPerMinute: dehydrationDamagePerMinute,
        min: 0,
        max: 100,
        source: 'plant_dehydration_damage',
      });
    }

    // Malnutrition damage (if nutrition < 30)
    if (plant.nutrition < PLANT_CONSTANTS.NUTRITION_CRITICAL_THRESHOLD) {
      // MALNUTRITION_DAMAGE_PER_DAY / 1440 minutes per day
      const malnutritionDamagePerMinute = -(PLANT_CONSTANTS.MALNUTRITION_DAMAGE_PER_DAY / 1440);

      malnutritionCleanup = this.stateMutator.registerDelta({
        entityId,
        componentType: CT.Plant,
        field: 'health',
        deltaPerMinute: malnutritionDamagePerMinute,
        min: 0,
        max: 100,
        source: 'plant_malnutrition_damage',
      });
    }

    // Store cleanup functions
    this.deltaCleanups.set(entityId, {
      hydration: hydrationCleanup,
      age: ageCleanup,
      dehydrationDamage: dehydrationCleanup,
      malnutritionDamage: malnutritionCleanup,
    });
  }

  /**
   * Hourly plant update - called every game hour
   * Now focuses on stage progress and event emission (gradual changes handled by StateMutatorSystem)
   */
  private updatePlantHourly(
    plant: PlantComponent,
    species: PlantSpecies,
    environment: Environment,
    world: World,
    entityId: string,
    hoursElapsed: number
  ): void {
    // Note: Age, hydration, and health damage are now handled by StateMutatorSystem
    // This method focuses on stage progress and event emission

    // Track health for event emission
    const previousHealth = plant.health;
    const healthChangeCauses: string[] = [];

    // Check current critical conditions for event emission
    if (plant.hydration < PLANT_CONSTANTS.HYDRATION_CRITICAL_THRESHOLD) {
      healthChangeCauses.push(`dehydration (hydration=${plant.hydration.toFixed(0)})`);
    }
    if (plant.nutrition < PLANT_CONSTANTS.NUTRITION_CRITICAL_THRESHOLD) {
      healthChangeCauses.push(`malnutrition (nutrition=${plant.nutrition.toFixed(0)})`);
    }

    // Emit health warning if critical (even if health changed via StateMutatorSystem)
    if (plant.health < 50 && plant.health !== previousHealth && healthChangeCauses.length > 0) {
      this.events.emit('plant:healthChanged', {
          plantId: entityId,
          oldHealth: previousHealth,
          newHealth: plant.health,
          reason: healthChangeCauses.join(', '),
          entityId: entityId
        });
    }

    // Check if dead
    if (plant.health <= 0) {
      plant.stage = 'dead';
      return;
    }

    // Progress current stage (including companion planting effects)
    const growthAmount = this.calculateGrowthProgress(plant, species, environment, world, entityId);
    const hourlyGrowth = (growthAmount / 24) * hoursElapsed;
    plant.stageProgress += hourlyGrowth;

    // Emit nutrient consumption
    this.events.emit('plant:nutrientConsumption', {
        x: plant.position.x,
        y: plant.position.y,
        consumed: hourlyGrowth * PLANT_CONSTANTS.NUTRIENT_CONSUMPTION_MULTIPLIER,
        position: plant.position
      });

    // Stage-specific updates
    this.handleStageSpecificUpdates(plant, species, world, entityId);
  }

  /**
   * Calculate growth progress based on conditions
   */
  private calculateGrowthProgress(
    plant: PlantComponent,
    species: PlantSpecies,
    environment: Environment,
    world?: World,
    entityId?: string
  ): number {
    // Find current stage transition
    if (!species.stageTransitions) {
      return 0; // No stage transitions defined
    }
    const transition = species.stageTransitions.find(t => t.from === plant.stage);
    if (!transition) {
      return 0; // No more transitions
    }

    // Base progress (1 / baseDuration per day)
    let progress = 1 / transition.baseDuration;

    // Apply genetic growth rate
    const growthModifier = applyGenetics(plant, 'growth');
    progress *= growthModifier;

    // Apply environmental modifiers
    const tempModifier = this.calculateTemperatureModifier(plant, species, environment.temperature);
    const moistureModifier = this.calculateMoistureModifier(plant, environment.moisture);
    const nutritionModifier = plant.nutrition / 100;

    progress *= tempModifier * moistureModifier * nutritionModifier;

    // Health affects growth
    const healthModifier = plant.health / 100;
    progress *= healthModifier;

    // Apply companion planting modifier
    if (world && entityId) {
      const companionModifier = this.calculateCompanionModifier(plant, species, world, entityId);
      progress *= companionModifier;
    }

    return progress;
  }

  /**
   * Calculate temperature growth modifier
   */
  private calculateTemperatureModifier(
    _plant: PlantComponent,
    species: PlantSpecies,
    temperature: number
  ): number {
    // Default temperature range if not specified
    const tempRange = species.optimalTemperatureRange ?? [15, 25];
    const [minOptimal, maxOptimal] = tempRange;

    if (temperature < minOptimal - PLANT_CONSTANTS.TEMPERATURE_EXTREME_THRESHOLD || temperature > maxOptimal + PLANT_CONSTANTS.TEMPERATURE_EXTREME_THRESHOLD) {
      return PLANT_CONSTANTS.TEMPERATURE_PENALTY_EXTREME; // Very slow growth outside range
    }

    if (temperature >= minOptimal && temperature <= maxOptimal) {
      return PLANT_CONSTANTS.TEMPERATURE_BONUS_OPTIMAL; // Optimal growth
    }

    return PLANT_CONSTANTS.TEMPERATURE_PENALTY_SUBOPTIMAL; // Suboptimal but still grows
  }

  /**
   * Calculate moisture growth modifier
   */
  private calculateMoistureModifier(_plant: PlantComponent, moisture: number): number {
    if (moisture < PLANT_CONSTANTS.MOISTURE_THRESHOLD_DRY) {
      return PLANT_CONSTANTS.MOISTURE_PENALTY_DRY; // Very slow growth when dry
    }
    if (moisture > PLANT_CONSTANTS.MOISTURE_THRESHOLD_OVERWATERED) {
      return PLANT_CONSTANTS.MOISTURE_PENALTY_OVERWATERED; // Overwatered
    }
    if (moisture >= PLANT_CONSTANTS.MOISTURE_THRESHOLD_OPTIMAL_MIN && moisture <= PLANT_CONSTANTS.MOISTURE_THRESHOLD_OPTIMAL_MAX) {
      return PLANT_CONSTANTS.MOISTURE_BONUS_OPTIMAL; // Optimal
    }
    return PLANT_CONSTANTS.MOISTURE_PENALTY_SUBOPTIMAL; // Suboptimal
  }

  /**
   * Attempt to transition to next stage
   */
  private attemptStageTransition(
    plant: PlantComponent,
    species: PlantSpecies,
    environment: Environment,
    world: World,
    entityId: string
  ): void {
    if (!species.stageTransitions) {
      return; // No stage transitions defined
    }
    const transition = species.stageTransitions.find(t => t.from === plant.stage);

    if (!transition) {
      throw new Error(`No transition defined for stage: ${plant.stage} in species: ${plant.speciesId}`);
    }

    // Check if conditions are met
    if (!this.checkTransitionConditions(plant, transition, environment)) {
      return; // Stay in current stage
    }

    // Execute transition
    const previousStage = plant.stage;
    plant.stage = transition.to;
    plant.stageProgress = 0;

    // Execute transition effects
    this.executeTransitionEffects(plant, transition, species, world);

    // Emit stage change event
    this.events.emit('plant:stageChanged', {
        plantId: entityId,
        speciesId: species.id,
        from: previousStage,
        to: plant.stage,
        entityId: entityId
      });
  }

  /**
   * Check if transition conditions are met
   */
  private checkTransitionConditions(
    plant: PlantComponent,
    transition: StageTransition,
    environment: Environment
  ): boolean {
    const cond = transition.conditions;

    if (cond.minTemperature !== undefined && environment.temperature < cond.minTemperature) {
      return false;
    }
    if (cond.maxTemperature !== undefined && environment.temperature > cond.maxTemperature) {
      return false;
    }
    if (cond.minHydration !== undefined && plant.hydration < cond.minHydration) {
      return false;
    }
    if (cond.minNutrition !== undefined && plant.nutrition < cond.minNutrition) {
      return false;
    }
    if (cond.minHealth !== undefined && plant.health < cond.minHealth) {
      return false;
    }

    // Special conditions
    if (cond.requiresPollination && plant.flowerCount === 0) {
      return false; // Need flowers to be pollinated
    }

    return true;
  }

  /**
   * Execute transition effects
   */
  private executeTransitionEffects(
    plant: PlantComponent,
    transition: StageTransition,
    species: PlantSpecies,
    world: World
  ): void {
    // Get entity ID for event emission
    const entityId = this.plantEntityIds.get(plant) || 'unknown';

    for (const effect of transition.onTransition) {
      switch (effect.type) {
        case 'become_visible':
          // Plant becomes visible (rendering concern)
          break;

        case 'spawn_flowers':
          const flowerCount = this.parseRange(effect.params?.count || '3-8');
          plant.flowerCount = flowerCount;
          break;

        case 'flowers_become_fruit':
          plant.fruitCount = plant.flowerCount;
          plant.flowerCount = 0;
          break;

        case 'fruit_ripens':
          // Fruit is now harvestable
          break;

        case 'produce_seeds': {
          const seedCount = species.seedsPerPlant ?? PLANT_CONSTANTS.DEFAULT_SEEDS_PER_PLANT; // Default seeds if not specified
          const yieldModifier = applyGenetics(plant, 'yield');
          const calculatedSeeds = Math.floor(seedCount * yieldModifier);

          // Add to existing seeds (for perennial plants that cycle back to mature)
          plant.seedsProduced += calculatedSeeds;

          this.events.emit('plant:mature', {
              plantId: entityId,
              speciesId: plant.speciesId,
              position: plant.position
            });
          break;
        }

        case 'drop_seeds':
          this.disperseSeeds(plant, species, world);
          break;

        case 'return_nutrients_to_soil':
          this.events.emit('plant:nutrientReturn', {
              x: plant.position.x,
              y: plant.position.y,
              returned: 20,
              position: plant.position
            });
          break;

        case 'remove_plant':
          plant.stage = 'dead';
          break;
      }
    }
  }

  /**
   * Handle stage-specific updates
   */
  private handleStageSpecificUpdates(
    plant: PlantComponent,
    species: PlantSpecies,
    world: World,
    _entityId: string
  ): void {
    if (plant.stage === 'seeding' && plant.seedsProduced > 0) {
      // Gradually disperse seeds (only if not all dispersed via transition effect)
      // Transition effects already handle drop_seeds, so this is just for gradual dispersal
      const seedsToDrop = Math.max(1, Math.floor(plant.seedsProduced * PLANT_CONSTANTS.SEED_DISPERSAL_RATE_PER_HOUR)); // Per hour
      if (seedsToDrop > 0) {
        plant.seedsProduced -= seedsToDrop;
        this.disperseSeeds(plant, species, world, seedsToDrop);
      }
    }
  }

  /**
   * Disperse seeds around parent plant
   */
  private disperseSeeds(
    plant: PlantComponent,
    species: PlantSpecies,
    world: World,
    count?: number
  ): void {
    // Get entity ID for seed creation
    const entityId = this.plantEntityIds.get(plant) || `plant_${Date.now()}`;

    const seedsToDrop = count ?? Math.floor(plant.seedsProduced * PLANT_CONSTANTS.SEED_BURST_DISPERSAL_RATE);

    // If no seeds to drop, return early
    if (seedsToDrop === 0) {
      return;
    }

    // PERFORMANCE: Cache plant positions query before loop - avoids O(seeds × plants) → O(plants + seeds)
    const existingPlants = world.query().with(CT.Plant).with(CT.Position).executeEntities();
    const plantPositions: Array<{ x: number; y: number }> = [];
    for (const plantEntity of existingPlants) {
      const plantImpl = plantEntity as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>(CT.Plant);
      if (plantComp && plantComp.position) {
        plantPositions.push({
          x: Math.floor(plantComp.position.x),
          y: Math.floor(plantComp.position.y)
        });
      }
    }

    const dispersalRadius = species.seedDispersalRadius ?? PLANT_CONSTANTS.DEFAULT_DISPERSAL_RADIUS; // Default dispersal radius
    for (let i = 0; i < seedsToDrop; i++) {
      // Random position near parent
      const angle = Math.random() * Math.PI * 2;
      const distance = 1 + Math.random() * dispersalRadius;
      const dropPos = {
        x: Math.round(plant.position.x + Math.cos(angle) * distance),
        y: Math.round(plant.position.y + Math.sin(angle) * distance)
      };

      // Check if tile is suitable (using cached plant positions)
      if (!this.isTileSuitableCached(dropPos, world, plantPositions)) {
        continue;
      }

      // Create seed with inherited genetics from parent plant
      const seed = createSeedFromPlant(plant, species.id, {
        parentEntityId: entityId,
        sourceType: 'wild'
      });

      plant.seedsDropped.push(dropPos);

      this.events.emit('seed:dispersed', {
          plantId: entityId,
          speciesId: species.id,
          seedCount: 1,
          positions: [dropPos],
          position: dropPos,
          seed // Include the seed object in the event data
        });
    }

    // CRITICAL: Consume the seeds that were dispersed
    // Only subtract if count wasn't explicitly provided (transition effects should handle their own subtraction)
    if (count === undefined) {
      plant.seedsProduced -= seedsToDrop;
    }
  }

  /**
   * Check if tile is suitable for seed placement (using cached plant positions)
   * PERFORMANCE: Uses pre-cached plant positions to avoid repeated queries
   */
  private isTileSuitableCached(
    position: { x: number; y: number },
    world: World,
    plantPositions: Array<{ x: number; y: number }>
  ): boolean {
    // Check if world has tile access
    const worldWithTiles = world as { getTileAt?: (x: number, y: number) => any };
    if (typeof worldWithTiles.getTileAt !== 'function') {
      return false; // No tile access available
    }

    // Check if tile exists
    const tile = worldWithTiles.getTileAt(position.x, position.y);
    if (!tile) {
      return false; // Tile doesn't exist
    }

    // Check terrain type - seeds can only grow on suitable terrain
    const validTerrain = ['grass', 'dirt', 'tilled_soil'];
    if (tile.terrain && !validTerrain.includes(tile.terrain)) {
      return false; // Wrong terrain type
    }

    // Check if tile is already occupied by a plant (using cached positions)
    for (const plantPos of plantPositions) {
      if (plantPos.x === position.x && plantPos.y === position.y) {
        return false; // Already has a plant
      }
    }

    // Check soil quality if tilled
    if (tile.terrain === 'tilled_soil' && tile.fertility !== undefined && tile.fertility < PLANT_CONSTANTS.SOIL_FERTILITY_LOW_THRESHOLD) {
      return false; // Soil too depleted
    }

    return true; // Tile is suitable
  }

  /**
   * Try to germinate a seed into a new plant
   */
  public async tryGerminateSeed(
    seed: SeedComponent,
    position: { x: number; y: number },
    _world?: World
  ): Promise<boolean> {
    if (!canGerminate(seed)) {
      return false;
    }

    // Emit event for germination - world manager will create plant entity
    this.events.emit('seed:germinated', {
        seedId: seed.id,
        speciesId: seed.speciesId,
        position,
        generation: seed.generation
      });

    return true;
  }

  /**
   * Check if planting is allowed at position
   */
  public canPlantAt(
    _position: { x: number; y: number },
    _speciesId: string,
    soilState: SoilState
  ): boolean {
    // Check soil nutrients
    if (soilState.nutrients < PLANT_CONSTANTS.SOIL_NUTRIENT_LOW_THRESHOLD) {
      return false; // Too depleted
    }

    return true;
  }

  /**
   * Parse range string like "3-8" into random number
   */
  private parseRange(range: string): number {
    const parts = range.split('-');
    if (parts.length === 2 && parts[0] && parts[1]) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      return min + Math.floor(Math.random() * (max - min + 1));
    }
    return parseInt(range, 10) || 0;
  }

  // ============================================
  // Companion Planting System
  // ============================================

  /** Radius to check for companion plants (in tiles) */
  private static readonly COMPANION_RADIUS = PLANT_CONSTANTS.COMPANION_RADIUS;

  /** Squared radius for distance checks (avoids Math.sqrt in hot path) */
  private static readonly COMPANION_RADIUS_SQUARED = PlantSystem.COMPANION_RADIUS * PlantSystem.COMPANION_RADIUS;

  /** Bonus growth rate from beneficial companion */
  private static readonly COMPANION_BONUS = PLANT_CONSTANTS.COMPANION_BONUS;

  /** Penalty growth rate from harmful companion */
  private static readonly COMPANION_PENALTY = PLANT_CONSTANTS.COMPANION_PENALTY;

  /** Cache of nearby plants per position (cleared each update) */
  private nearbyPlantsCache: Map<string, Array<{ speciesId: string; distance: number }>> = new Map();

  /**
   * Get nearby plants within companion radius
   * Uses caching to avoid repeated queries for the same position
   */
  private getNearbyPlants(
    position: { x: number; y: number },
    world: World,
    excludeEntityId: string
  ): Array<{ speciesId: string; distance: number }> {
    const cacheKey = `${position.x},${position.y}`;

    if (this.nearbyPlantsCache.has(cacheKey)) {
      return this.nearbyPlantsCache.get(cacheKey)!;
    }

    const nearbyPlants: Array<{ speciesId: string; distance: number }> = [];
    const allPlants = world.query().with(CT.Plant).executeEntities();

    for (const plantEntity of allPlants) {
      if (plantEntity.id === excludeEntityId) continue;

      const plantImpl = plantEntity as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>(CT.Plant);
      if (!plantComp || !plantComp.position) continue;

      // Skip dead plants
      if (plantComp.stage === 'dead') continue;

      const dx = plantComp.position.x - position.x;
      const dy = plantComp.position.y - position.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= PlantSystem.COMPANION_RADIUS_SQUARED && distanceSquared > 0) {
        // Only compute actual distance when needed (for distance falloff calculation)
        const distance = Math.sqrt(distanceSquared);
        nearbyPlants.push({
          speciesId: plantComp.speciesId,
          distance
        });
      }
    }

    this.nearbyPlantsCache.set(cacheKey, nearbyPlants);
    return nearbyPlants;
  }

  /**
   * Calculate companion planting growth modifier
   * Returns a multiplier (1.0 = no effect, >1.0 = bonus, <1.0 = penalty)
   */
  private calculateCompanionModifier(
    plant: PlantComponent,
    species: PlantSpecies,
    world: World,
    entityId: string
  ): number {
    const companionEffects = species.properties?.environmental?.companionEffects;
    if (!companionEffects) {
      return 1.0; // No companion effects defined
    }

    const nearbyPlants = this.getNearbyPlants(plant.position, world, entityId);
    if (nearbyPlants.length === 0) {
      return 1.0; // No nearby plants
    }

    let modifier = 1.0;
    let benefitCount = 0;
    let harmCount = 0;

    // Check which nearby plants affect this plant
    for (const nearby of nearbyPlants) {
      // Distance-based effect falloff (closer = stronger)
      const distanceFactor = 1 - (nearby.distance / PlantSystem.COMPANION_RADIUS);

      // Check if this nearby plant benefits from us
      // (We need to check the nearby plant's species for what it benefits)
      const nearbySpecies = this.speciesLookup ? this.speciesLookup(nearby.speciesId) : null;
      const nearbyCompanionEffects = nearbySpecies?.properties?.environmental?.companionEffects;

      // Does the nearby plant benefit us?
      if (nearbyCompanionEffects?.benefitsNearby?.includes(species.id)) {
        modifier += PlantSystem.COMPANION_BONUS * distanceFactor;
        benefitCount++;
      }

      // Does the nearby plant harm us?
      if (nearbyCompanionEffects?.harmsNearby?.includes(species.id)) {
        modifier -= PlantSystem.COMPANION_PENALTY * distanceFactor;
        harmCount++;
      }

      // Do WE benefit from this nearby plant?
      if (companionEffects.benefitsNearby?.includes(nearby.speciesId)) {
        modifier += PlantSystem.COMPANION_BONUS * distanceFactor;
        benefitCount++;
      }

      // Do WE get harmed by this nearby plant?
      if (companionEffects.harmsNearby?.includes(nearby.speciesId)) {
        modifier -= PlantSystem.COMPANION_PENALTY * distanceFactor;
        harmCount++;
      }
    }

    // Clamp modifier to reasonable range
    modifier = Math.max(0.5, Math.min(1.5, modifier));

    // Emit event if significant companion effects are active
    if (benefitCount > 0 || harmCount > 0) {
      this.events.emit('plant:companionEffect', {
          plantId: entityId,
          speciesId: species.id,
          position: plant.position,
          benefitCount,
          harmCount,
          modifier
        });
    }

    return modifier;
  }

  /**
   * Check if any nearby plants provide pest repellent effects
   * Returns list of pests that are repelled
   */
  public getRepelledPests(
    position: { x: number; y: number },
    world: World
  ): string[] {
    const repelledPests: Set<string> = new Set();

    const nearbyPlants = this.getNearbyPlants(position, world, '');

    for (const nearby of nearbyPlants) {
      const nearbySpecies = this.speciesLookup ? this.speciesLookup(nearby.speciesId) : null;
      const companionEffects = nearbySpecies?.properties?.environmental?.companionEffects;

      if (companionEffects?.repels) {
        for (const pest of companionEffects.repels) {
          repelledPests.add(pest);
        }
      }
    }

    return Array.from(repelledPests);
  }

  /**
   * Check if any nearby plants attract specific creatures
   * Returns list of creatures that are attracted
   */
  public getAttractedCreatures(
    position: { x: number; y: number },
    world: World
  ): string[] {
    const attractedCreatures: Set<string> = new Set();

    const nearbyPlants = this.getNearbyPlants(position, world, '');

    for (const nearby of nearbyPlants) {
      const nearbySpecies = this.speciesLookup ? this.speciesLookup(nearby.speciesId) : null;
      const companionEffects = nearbySpecies?.properties?.environmental?.companionEffects;

      if (companionEffects?.attracts) {
        for (const creature of companionEffects.attracts) {
          attractedCreatures.add(creature);
        }
      }
    }

    return Array.from(attractedCreatures);
  }

  /**
   * Clear the nearby plants cache (called at start of each update)
   */
  private clearCompanionCache(): void {
    this.nearbyPlantsCache.clear();
  }

  /**
   * Regenerate fruit at midnight for all plants in appropriate stages.
   *
   * REQUIREMENT: Plants can only regenerate fruit once per day (at midnight).
   * This prevents continuous fruit regeneration and makes the game more balanced.
   *
   * Plants regenerate fruit if they are:
   * - In 'mature' or 'fruiting' stage (actively producing)
   * - Have health > 50 (healthy enough to produce)
   * - Have flowerCount > 0 (flowers available to become fruit)
   *
   * Fruit regeneration is based on:
   * - Number of flowers available
   * - Plant health (higher health = more fruit)
   * - Genetic yield modifier
   */
  private regenerateFruitAtMidnight(entities: ReadonlyArray<Entity>, _world: World): void {
    let plantsRegenerated = 0;

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(CT.Plant);
      if (!plant) continue;

      // Skip plants missing critical data
      if (!plant.position) {
        continue;
      }

      // Only regenerate for plants in appropriate stages
      const canRegenerate = ['mature', 'fruiting'].includes(plant.stage);
      if (!canRegenerate) continue;

      // Must be healthy enough to produce fruit
      if (plant.health < PLANT_CONSTANTS.HEALTH_UNHEALTHY_THRESHOLD) continue;

      // Get species to determine base fruit production
      try {
        const species = this.getSpecies(plant.speciesId);
      const seedsPerPlant = species.seedsPerPlant ?? PLANT_CONSTANTS.DEFAULT_SEEDS_PER_PLANT; // Default seeds if not specified

      // Calculate fruit regeneration based on health and genetics
      // Base: seedsPerPlant / 3 (fruit is less than seeds typically)
      const baseFruitCount = Math.max(1, Math.floor(seedsPerPlant / 3));
      const healthModifier = plant.health / 100;
      const yieldModifier = applyGenetics(plant, 'yield');

      // Calculate new fruit to add (at least 1 if conditions are met)
      const fruitToAdd = Math.max(1, Math.floor(baseFruitCount * healthModifier * yieldModifier));

      // Add fruit up to a reasonable maximum (based on species seedsPerPlant)
      const maxFruit = seedsPerPlant * 2;
      const previousFruit = plant.fruitCount;
      plant.fruitCount = Math.min(maxFruit, plant.fruitCount + fruitToAdd);

      if (plant.fruitCount > previousFruit) {
        const entityId = this.plantEntityIds.get(plant) || entity.id;
        plantsRegenerated++;

        this.events.emit('plant:fruitRegenerated', {
            plantId: entityId,
            speciesId: plant.speciesId,
            fruitAdded: plant.fruitCount - previousFruit,
            totalFruit: plant.fruitCount,
            position: plant.position
          });
      }
      } catch (error) {
        // Skip plants with invalid species or other errors
        BugReporter.reportCorruptedPlant({
          entityId: entity.id,
          reason: `Fruit regeneration failed: ${error}`,
          plantData: {
            speciesId: plant.speciesId,
            stage: plant.stage,
            health: plant.health,
            position: plant.position
          },
          stackTrace: error instanceof Error ? error.stack : undefined
        });
        continue;
      }
    }
  }

}
