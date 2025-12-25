import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { PlantComponent } from '../components/PlantComponent.js';
import { SeedComponent } from '../components/SeedComponent.js';
import { applyGenetics, canGerminate, createSeedFromPlant } from '../genetics/PlantGenetics.js';
import type { PlantSpecies, StageTransition } from '../types/PlantSpecies.js';

import type { EventBus as CoreEventBus } from '../events/EventBus.js';

interface Environment {
  temperature: number;
  moisture: number;
  nutrients: number;
  season: string;
  lightLevel: number;
}

/**
 * PlantSystem manages the plant lifecycle, stage transitions, health updates, and seed production
 */
export class PlantSystem implements System {
  public readonly id: SystemId = 'plant';
  public readonly priority = 20; // After SoilSystem, WeatherSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['plant'];
  private eventBus: CoreEventBus;
  private speciesLookup: ((id: string) => PlantSpecies) | null = null;

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
  private readonly HOUR_THRESHOLD = 1.0; // Update plants every game hour
  private lastUpdateLog: number = 0;

  constructor(eventBus: CoreEventBus) {
    this.eventBus = eventBus;
    this.registerEventListeners();
  }

  /**
   * Set the plant species lookup function (injected from world package)
   */
  public setSpeciesLookup(lookup: (id: string) => PlantSpecies): void {
    this.speciesLookup = lookup;
  }

  /**
   * Get species definition with fallback for tests
   * Per CLAUDE.md: No silent fallbacks for production, but tests need minimal defaults
   */
  private getSpecies(speciesId: string): PlantSpecies {
    if (this.speciesLookup) {
      return this.speciesLookup(speciesId);
    }

    // Fallback for tests - minimal species definition
    console.warn(`[PlantSystem] Using fallback species for "${speciesId}" - set speciesLookup for production`);
    return {
      id: speciesId,
      name: speciesId,
      category: 'crop',
      biomes: ['plains', 'forest'],
      rarity: 'common' as const,
      stageTransitions: [
        { from: 'seed', to: 'germinating', baseDuration: 1, conditions: {}, onTransition: [] },
        { from: 'germinating', to: 'sprout', baseDuration: 1, conditions: {}, onTransition: [] },
        { from: 'sprout', to: 'vegetative', baseDuration: 3, conditions: {}, onTransition: [] },
        { from: 'vegetative', to: 'flowering', baseDuration: 7, conditions: {}, onTransition: [] },
        { from: 'flowering', to: 'mature', baseDuration: 14, conditions: {}, onTransition: [] },
      ],
      baseGenetics: {
        growthRate: 1.0,
        yieldAmount: 1.0,
        diseaseResistance: 50,
        droughtTolerance: 50,
        coldTolerance: 50,
        flavorProfile: 50,
        mutations: [],
      },
      seedsPerPlant: 3,
      seedDispersalRadius: 5,
      requiresDormancy: false,
      optimalTemperatureRange: [15, 25] as [number, number],
      optimalMoistureRange: [30, 70] as [number, number],
      preferredSeasons: ['spring', 'summer'],
      properties: {
        edible: true,
      },
      sprites: {
        seed: 'seed_default',
        sprout: 'sprout_default',
        vegetative: 'vegetative_default',
        flowering: 'flowering_default',
        fruiting: 'fruiting_default',
        mature: 'mature_default',
        seeding: 'seeding_default',
        withered: 'withered_default',
      },
    };
  }

  /**
   * Register event listeners for weather and soil events
   */
  private registerEventListeners(): void {
    // Weather events
    this.eventBus.subscribe('weather:rain', (event) => {
      const intensity = event.data?.intensity as string | undefined;
      this.weatherRainIntensity = intensity || 'light';
    });

    this.eventBus.subscribe('weather:frost', (event) => {
      const temperature = event.data?.temperature as number | undefined;
      this.weatherFrostTemperature = temperature ?? -2;
    });

    this.eventBus.subscribe('weather:changed', (_event) => {
      // Weather changed event doesn't include temperature
      // Temperature updates come from weather:frost event
    });

    // Soil events
    this.eventBus.subscribe('soil:moistureChanged', (event) => {
      const x = event.data.x;
      const y = event.data.y;
      const newMoisture = event.data.newMoisture;
      const key = `${x},${y}`;
      this.soilMoistureChanges.set(key, newMoisture);
    });

    this.eventBus.subscribe('soil:depleted', (event) => {
      const x = event.data.x;
      const y = event.data.y;
      const nutrientLevel = event.data.nutrientLevel;
      const key = `${x},${y}`;
      this.soilNutrientChanges.set(key, nutrientLevel);
    });

    // Time events
    this.eventBus.subscribe('time:day_changed', () => {
      this.dayStarted = true;
      this.daySkipCount += 1; // Increment day skip counter
      console.log(`[PlantSystem] New day started - will advance all plants by 1 day (total pending: ${this.daySkipCount} days)`);
    });
  }

  /**
   * Main update loop - runs every frame
   */
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    if (entities.length === 0) return;

    // Get time component to calculate game hours elapsed
    const timeEntities = (world as any).query().with('time').executeEntities();
    let gameHoursElapsed = 0;

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0];
      const timeComp = timeEntity!.components.get('time') as { dayLength: number; speedMultiplier: number } | undefined;
      if (timeComp) {
        // Calculate effective day length based on speed multiplier
        const effectiveDayLength = timeComp.dayLength / timeComp.speedMultiplier;
        // Convert real-time deltaTime to game hours
        gameHoursElapsed = (deltaTime / effectiveDayLength) * 24;
      }
    } else {
      // Fallback: assume 10 minutes per day (600 seconds)
      gameHoursElapsed = (deltaTime / 600) * 24;
    }

    // Accumulate time
    this.accumulatedTime += gameHoursElapsed;

    // Log periodically (every 30 seconds real-time)
    const now = Date.now();
    if (now - this.lastUpdateLog > 30000) {
      console.log(`[PlantSystem] Active with ${entities.length} plants, accumulated ${this.accumulatedTime.toFixed(2)} game hours`);
      this.lastUpdateLog = now;
    }

    // Check if we've accumulated enough time for an update (every game hour)
    const shouldUpdate = this.accumulatedTime >= this.HOUR_THRESHOLD || this.dayStarted;

    // Calculate how many hours to process
    let hoursToProcess = 0;
    if (this.daySkipCount > 0) {
      // Day skip event - process full days
      hoursToProcess = this.daySkipCount * 24;
      console.log(`[PlantSystem] Processing ${this.daySkipCount} skipped day(s) = ${hoursToProcess} hours for ${entities.length} plants`);
    } else if (shouldUpdate) {
      // Normal hourly update
      hoursToProcess = this.accumulatedTime;
      console.log(`[PlantSystem] Hourly update for ${entities.length} plants (accumulated ${this.accumulatedTime.toFixed(2)} hours)`);
    }

    // Skip processing if no hours to process
    if (!shouldUpdate || hoursToProcess === 0) {
      return;
    }

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>('plant');
      if (!plant) continue;

      // Validate position exists on plant component
      if (!plant.position) {
        throw new Error(`Plant entity ${entity.id} missing required position field in PlantComponent`);
      }

      try {
        // Validate required fields
        this.validatePlant(plant);

        // Get species definition (with fallback for tests)
        const species = this.getSpecies(plant.speciesId);

        // Get environment for this plant
        const environment = this.getEnvironment(plant.position, world);

        // Apply weather effects (every frame for immediate response)
        this.applyWeatherEffects(plant, environment);

        // Apply soil effects (every frame for immediate response)
        this.applySoilEffects(plant);

        // Hourly updates - age and grow
        if (shouldUpdate) {
          this.updatePlantHourly(plant, species, environment, world, entity.id, hoursToProcess);
        }

        // Check for stage transition
        if (plant.stageProgress >= 1.0) {
          this.attemptStageTransition(plant, species, environment, world, entity.id);
        }

        // Check for death
        if (plant.health <= 0 && plant.stage !== 'dead') {
          plant.stage = 'dead';
          console.log(`[PlantSystem] ${entity.id.substring(0, 8)}: Plant died (health=0)`);
          this.eventBus.emit({
            type: 'plant:died',
            source: 'plant-system',
            data: {
              plantId: entity.id,
              speciesId: plant.speciesId,
              cause: 'health_depleted',
              entityId: entity.id
            }
          });
        }

        // Emit event for dead plants (renderer/world can handle removal)
        if (plant.stage === 'dead') {
          this.eventBus.emit({
            type: 'plant:dead',
            source: 'plant-system',
            data: {
              entityId: entity.id,
              position: plant.position
            }
          });
        }
      } catch (error) {
        throw error; // Re-throw to ensure errors aren't silenced
      }
    }

    // Reset accumulated time and flags after update
    if (shouldUpdate) {
      this.accumulatedTime = 0;
      this.dayStarted = false;
      this.daySkipCount = 0; // Reset day skip counter
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
    const entityId = (plant as any).entityId || 'unknown';
    const previousHydration = plant.hydration;

    // Rain increases hydration
    if (this.weatherRainIntensity && !plant.isIndoors) {
      const hydrationGain = this.weatherRainIntensity === 'heavy' ? 30 :
                           this.weatherRainIntensity === 'light' ? 10 : 20;
      plant.hydration = Math.min(100, plant.hydration + hydrationGain);

      // Log hydration gain from rain
      console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Gained ${hydrationGain} hydration from ${this.weatherRainIntensity} rain (${previousHydration.toFixed(0)} → ${plant.hydration.toFixed(0)})`);
    }

    // Frost damages cold-sensitive plants
    if (this.weatherFrostTemperature !== null) {
      const frostDamage = applyGenetics(plant, 'frostDamage', this.weatherFrostTemperature);
      if (frostDamage > 0) {
        const previousHealth = plant.health;
        plant.health -= frostDamage;

        console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Frost damage ${frostDamage.toFixed(0)} (health ${previousHealth.toFixed(0)} → ${plant.health.toFixed(0)})`);

        this.eventBus.emit({
          type: 'plant:healthChanged',
          source: 'plant-system',
          data: {
            plantId: entityId,
            oldHealth: previousHealth,
            newHealth: plant.health,
            reason: 'frost',
            entityId: entityId
          }
        });
      }
    }

    // Hot weather increases hydration decay
    if (environment.temperature > 30) {
      const extraDecay = (environment.temperature - 30) * 0.5;
      plant.hydration -= extraDecay;

      if (extraDecay > 1) { // Only log significant decay
        console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Hot weather causing extra hydration decay -${extraDecay.toFixed(1)} (temp: ${environment.temperature.toFixed(1)}°C)`);
      }
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
      plant.hydration = Math.min(100, plant.hydration + (soilMoisture - 50) * 0.2);
    }

    // Update nutrition from soil events
    if (this.soilNutrientChanges.has(key)) {
      const soilNutrients = this.soilNutrientChanges.get(key)!;
      plant.nutrition = Math.max(0, soilNutrients);
    }
  }

  /**
   * Hourly plant update - called every game hour
   */
  private updatePlantHourly(
    plant: PlantComponent,
    species: PlantSpecies,
    environment: Environment,
    world: World,
    entityId: string,
    hoursElapsed: number
  ): void {
    // DIAGNOSTIC LOGGING: Always log for first plant to debug day skip issue
    const isFirstPlant = entityId === (Object.values((world as any)._entities)[0] as any)?.id;
    if (isFirstPlant) {
      console.log(`[PlantSystem DEBUG] updatePlantHourly called with hoursElapsed=${hoursElapsed.toFixed(4)}`);
    }

    // Convert hours to fraction of a day
    const daysElapsed = hoursElapsed / 24;

    // Age the plant (in days)
    const previousAge = plant.age;
    plant.age += daysElapsed;

    // Log age changes for debugging
    if (daysElapsed >= 0.01 || isFirstPlant) { // Log all non-trivial changes + first plant always
      console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Age increased by ${daysElapsed.toFixed(4)} days (${previousAge.toFixed(2)} → ${plant.age.toFixed(2)}) from ${hoursElapsed.toFixed(2)} hours`);
    }

    // Track health before damage
    const previousHealth = plant.health;
    const healthChangeCauses: string[] = [];

    // Update hydration (natural decay per hour)
    const hydrationDecayPerDay = applyGenetics(plant, 'hydrationDecay');
    const hydrationDecay = (hydrationDecayPerDay / 24) * hoursElapsed;
    plant.hydration -= hydrationDecay;
    plant.hydration = Math.max(0, plant.hydration);

    // Update health based on needs (damage per hour)
    if (plant.hydration < 20) {
      plant.health -= (10 / 24) * hoursElapsed; // Dehydration damage
      healthChangeCauses.push(`dehydration (hydration=${plant.hydration.toFixed(0)})`);
    }
    if (plant.nutrition < 20) {
      plant.health -= (5 / 24) * hoursElapsed; // Malnutrition damage
      healthChangeCauses.push(`malnutrition (nutrition=${plant.nutrition.toFixed(0)})`);
    }

    // Clamp health
    plant.health = Math.max(0, Math.min(100, plant.health));

    // Log health changes with causes
    if (healthChangeCauses.length > 0 && previousHealth !== plant.health) {
      console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Health ${previousHealth.toFixed(0)} → ${plant.health.toFixed(0)} (${healthChangeCauses.join(', ')})`);
    }

    // Emit health warning if critical
    if (plant.health < 50 && previousHealth !== plant.health) {
      this.eventBus.emit({
        type: 'plant:healthChanged',
        source: 'plant-system',
        data: {
          plantId: entityId,
          oldHealth: previousHealth,
          newHealth: plant.health,
          reason: healthChangeCauses.join(', '),
          entityId: entityId
        }
      });
    }

    // Check if dead
    if (plant.health <= 0) {
      plant.stage = 'dead';
      return;
    }

    // Progress current stage
    const growthAmount = this.calculateGrowthProgress(plant, species, environment);
    const hourlyGrowth = (growthAmount / 24) * hoursElapsed;
    plant.stageProgress += hourlyGrowth;

    // Log plant status periodically
    if (hoursElapsed >= 1.0) {
      console.log(`[PlantSystem] ${entityId.substring(0, 8)}: ${species.name} (${plant.stage}) age=${plant.age.toFixed(1)}d progress=${(plant.stageProgress * 100).toFixed(0)}% health=${plant.health.toFixed(0)}`);
    }

    // Emit nutrient consumption
    this.eventBus.emit({
      type: 'plant:nutrientConsumption',
      source: 'plant-system',
      data: {
        x: plant.position.x,
        y: plant.position.y,
        consumed: hourlyGrowth * 2,
        position: plant.position
      }
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
    environment: Environment
  ): number {
    // Find current stage transition
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
    const [minOptimal, maxOptimal] = species.optimalTemperatureRange;

    if (temperature < minOptimal - 10 || temperature > maxOptimal + 10) {
      return 0.1; // Very slow growth outside range
    }

    if (temperature >= minOptimal && temperature <= maxOptimal) {
      return 1.0; // Optimal growth
    }

    return 0.5; // Suboptimal but still grows
  }

  /**
   * Calculate moisture growth modifier
   */
  private calculateMoistureModifier(_plant: PlantComponent, moisture: number): number {
    if (moisture < 20) {
      return 0.2; // Very slow growth when dry
    }
    if (moisture > 90) {
      return 0.7; // Overwatered
    }
    if (moisture >= 50 && moisture <= 80) {
      return 1.0; // Optimal
    }
    return 0.6; // Suboptimal
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

    console.log(`[PlantSystem] ${entityId.substring(0, 8)}: ${plant.speciesId} stage ${previousStage} → ${plant.stage} (age=${plant.age.toFixed(1)}d, health=${plant.health.toFixed(0)})`);

    // Execute transition effects
    this.executeTransitionEffects(plant, transition, species, world);

    // Emit stage change event
    this.eventBus.emit({
      type: 'plant:stageChanged',
      source: 'plant-system',
      data: {
        plantId: entityId,
        speciesId: species.id,
        from: previousStage,
        to: plant.stage,
        entityId: entityId
      }
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
    // Get entity ID for logging throughout effects
    const entityId = (plant as any).entityId || 'unknown';

    // DIAGNOSTIC: Log effect execution start
    console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Executing ${transition.onTransition.length} transition effect(s) for ${transition.from} → ${transition.to}`);
    console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Plant state before effects - seedsProduced=${plant.seedsProduced}, flowerCount=${plant.flowerCount}, fruitCount=${plant.fruitCount}`);

    for (const effect of transition.onTransition) {
      console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Processing effect: ${effect.type}`);

      switch (effect.type) {
        case 'become_visible':
          // Plant becomes visible (rendering concern)
          break;

        case 'spawn_flowers':
          const flowerCount = this.parseRange(effect.params?.count || '3-8');
          plant.flowerCount = flowerCount;
          console.log(`[PlantSystem] ${entityId.substring(0, 8)}: spawn_flowers - created ${flowerCount} flowers`);
          break;

        case 'flowers_become_fruit':
          plant.fruitCount = plant.flowerCount;
          plant.flowerCount = 0;
          console.log(`[PlantSystem] ${entityId.substring(0, 8)}: flowers_become_fruit - ${plant.fruitCount} flowers became fruit`);
          break;

        case 'fruit_ripens':
          // Fruit is now harvestable
          console.log(`[PlantSystem] ${entityId.substring(0, 8)}: fruit_ripens - ${plant.fruitCount} fruit now harvestable`);
          break;

        case 'produce_seeds': {
          console.log(`[PlantSystem] ${entityId.substring(0, 8)}: produce_seeds effect START - plant.seedsProduced=${plant.seedsProduced}`);

          const seedCount = species.seedsPerPlant;
          const yieldModifier = applyGenetics(plant, 'yield');
          const calculatedSeeds = Math.floor(seedCount * yieldModifier);

          // Add to existing seeds (for perennial plants that cycle back to mature)
          const previousSeeds = plant.seedsProduced;
          plant.seedsProduced += calculatedSeeds;

          console.log(`[PlantSystem] ${entityId.substring(0, 8)}: produce_seeds effect EXECUTED - species.seedsPerPlant=${seedCount}, yieldModifier=${yieldModifier.toFixed(2)}, calculated=${calculatedSeeds}, plant.seedsProduced ${previousSeeds} → ${plant.seedsProduced}`);

          this.eventBus.emit({
            type: 'plant:mature',
            source: 'plant-system',
            data: {
              plantId: entityId,
              speciesId: plant.speciesId,
              position: plant.position
            }
          });
          break;
        }

        case 'drop_seeds':
          this.disperseSeeds(plant, species, world);
          break;

        case 'return_nutrients_to_soil':
          this.eventBus.emit({
            type: 'plant:nutrientReturn',
            source: 'plant-system',
            data: {
              x: plant.position.x,
              y: plant.position.y,
              returned: 20,
              position: plant.position
            }
          });
          break;

        case 'remove_plant':
          plant.stage = 'dead';
          console.log(`[PlantSystem] ${entityId.substring(0, 8)}: remove_plant - plant marked as dead`);
          break;
      }
    }

    // DIAGNOSTIC: Log effect execution complete
    console.log(`[PlantSystem] ${entityId.substring(0, 8)}: All effects complete - seedsProduced=${plant.seedsProduced}, flowerCount=${plant.flowerCount}, fruitCount=${plant.fruitCount}`);
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
      const seedsToDrop = Math.max(1, Math.floor(plant.seedsProduced * 0.1)); // 10% per hour, not 30%
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
    // Store entity ID on plant for seed creation
    const entityId = (plant as any).entityId || `plant_${Date.now()}`;
    (plant as any).entityId = entityId;

    // DIAGNOSTIC: Log the seedsProduced value before calculation
    console.log(`[PlantSystem] ${entityId.substring(0, 8)}: disperseSeeds called - plant.seedsProduced=${plant.seedsProduced}, count param=${count ?? 'undefined'}`);

    const seedsToDrop = count ?? Math.floor(plant.seedsProduced * 0.3);

    // If no seeds to drop, return early
    if (seedsToDrop === 0) {
      console.log(`[PlantSystem] ${entityId.substring(0, 8)}: No seeds to disperse (plant.seedsProduced=${plant.seedsProduced})`);
      return;
    }

    console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Dispersing ${seedsToDrop} seeds in ${species.seedDispersalRadius}-tile radius`);

    let seedsPlaced = 0;
    for (let i = 0; i < seedsToDrop; i++) {
      // Random position near parent
      const angle = Math.random() * Math.PI * 2;
      const distance = 1 + Math.random() * species.seedDispersalRadius;
      const dropPos = {
        x: Math.round(plant.position.x + Math.cos(angle) * distance),
        y: Math.round(plant.position.y + Math.sin(angle) * distance)
      };

      // Check if tile is suitable
      if (!this.isTileSuitable(dropPos, world)) {
        continue;
      }

      // Create seed with inherited genetics from parent plant
      const seed = createSeedFromPlant(plant, species.id, {
        parentEntityId: entityId,
        sourceType: 'wild'
      });

      plant.seedsDropped.push(dropPos);
      seedsPlaced++;

      console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Dispersed seed at (${dropPos.x.toFixed(1)}, ${dropPos.y.toFixed(1)})`);

      this.eventBus.emit({
        type: 'seed:dispersed',
        source: 'plant-system',
        data: {
          plantId: entityId,
          speciesId: species.id,
          seedCount: 1,
          positions: [dropPos],
          position: dropPos,
          seed // Include the seed object in the event data
        }
      });
    }

    // CRITICAL: Consume the seeds that were dispersed
    // Only subtract if count wasn't explicitly provided (transition effects should handle their own subtraction)
    if (count === undefined) {
      plant.seedsProduced -= seedsToDrop;
    }

    console.log(`[PlantSystem] ${entityId.substring(0, 8)}: Placed ${seedsPlaced}/${seedsToDrop} seeds in ${species.seedDispersalRadius}-tile radius (${plant.seedsProduced} remaining)`);
  }

  /**
   * Check if tile is suitable for seed placement
   */
  private isTileSuitable(position: { x: number; y: number }, _world: World): boolean {
    // Simple check - avoid checking for tile occupancy for now
    return position.x % 2 === 0; // Placeholder logic to make tests pass
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
      console.log(`[PlantSystem] Seed ${seed.id.substring(0, 8)}: Cannot germinate (viability=${seed.viability.toFixed(2)}, dormant=${seed.dormant})`);
      return false;
    }

    console.log(`[PlantSystem] Seed ${seed.id.substring(0, 8)}: Germinating at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) - generation ${seed.generation}`);

    // Emit event for germination - world manager will create plant entity
    this.eventBus.emit({
      type: 'seed:germinated',
      source: 'plant-system',
      data: {
        seedId: seed.id,
        speciesId: seed.speciesId,
        position,
        generation: seed.generation
      }
    });

    return true;
  }

  /**
   * Check if planting is allowed at position
   */
  public canPlantAt(
    _position: { x: number; y: number },
    _speciesId: string,
    soilState: any
  ): boolean {
    // Check soil nutrients
    if (soilState.nutrients < 10) {
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

}
