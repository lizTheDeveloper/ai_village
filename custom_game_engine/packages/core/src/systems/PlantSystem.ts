import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { PlantComponent } from '../components/PlantComponent.js';
import { SeedComponent } from '../components/SeedComponent.js';
import { applyGenetics, canGerminate, createSeedFromPlant } from '../genetics/PlantGenetics.js';
import type { PlantSpecies, StageTransition } from '../types/PlantSpecies.js';

import type { EventBus as CoreEventBus } from '../events/EventBus.js';

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
 */
export class PlantSystem implements System {
  public readonly id: SystemId = 'plant';
  public readonly priority = 20; // After SoilSystem, WeatherSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Plant];
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

  // Track entity IDs for plants (to avoid using 'as any')
  private plantEntityIds: WeakMap<PlantComponent, string> = new WeakMap();

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
    });
  }

  /**
   * Main update loop - runs every frame
   */
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    if (entities.length === 0) return;

    // Clear companion planting cache at start of each update
    this.clearCompanionCache();

    // Get agent positions for proximity-based simulation culling
    const agentPositions: Array<{ x: number; y: number }> = [];
    const agentEntities = world.query().with(CT.Agent).with(CT.Position).executeEntities();
    for (const agentEntity of agentEntities) {
      const pos = agentEntity.components.get(CT.Position) as { x: number; y: number } | undefined;
      if (pos) {
        agentPositions.push({ x: pos.x, y: pos.y });
      }
    }

    // Get time component to calculate game hours elapsed
    const timeEntities = world.query().with(CT.Time).executeEntities();
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
      if (!plant.position) {
        throw new Error(`Plant entity ${entity.id} missing required position field in PlantComponent`);
      }

      // Validate required fields
      this.validatePlant(plant);

      // Validate species exists (throws if lookup not configured or species unknown)
      const species = this.getSpecies(plant.speciesId);
      void species; // Use species to prevent unused variable warning
    }

    // Skip processing if no hours to process
    if (!shouldUpdate || hoursToProcess === 0) {
      return;
    }

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(CT.Plant);
      if (!plant) continue;

      // Simulation culling: Only update wild plants if near agents
      // Planted crops always simulate (even when agents are far away)
      if (!plant.planted) {
        const VISION_RANGE = 15; // tiles - from GameBalance.VISION_RANGE_TILES
        let nearAgent = false;

        for (const agentPos of agentPositions) {
          const dx = plant.position.x - agentPos.x;
          const dy = plant.position.y - agentPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= VISION_RANGE) {
            nearAgent = true;
            break;
          }
        }

        // Skip wild plants that are far from all agents (pause simulation)
        if (!nearAgent) continue;
      }

      // Store entity ID for this plant
      this.plantEntityIds.set(plant, entity.id);

      try {
        // Get species definition
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

    // MIDNIGHT FRUIT REGENERATION: All plants regenerate fruit once per day at midnight
    // This runs only when the day has just changed (midnight)
    if (this.dayStarted) {
      this.regenerateFruitAtMidnight(entities, world);
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
    const entityId = this.plantEntityIds.get(plant) || 'unknown';
    void environment; // Environment used later in hot weather check

    // Rain increases hydration
    if (this.weatherRainIntensity && !plant.isIndoors) {
      const hydrationGain = this.weatherRainIntensity === 'heavy' ? 30 :
                           this.weatherRainIntensity === 'light' ? 10 : 20;
      plant.hydration = Math.min(100, plant.hydration + hydrationGain);

    }

    // Frost damages cold-sensitive plants
    if (this.weatherFrostTemperature !== null) {
      const frostDamage = applyGenetics(plant, 'frostDamage', this.weatherFrostTemperature);
      if (frostDamage > 0) {
        const previousHealth = plant.health;
        plant.health -= frostDamage;

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
    // Convert hours to fraction of a day
    const daysElapsed = hoursElapsed / 24;

    // Age the plant (in days)
    plant.age += daysElapsed;

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

    // Progress current stage (including companion planting effects)
    const growthAmount = this.calculateGrowthProgress(plant, species, environment, world, entityId);
    const hourlyGrowth = (growthAmount / 24) * hoursElapsed;
    plant.stageProgress += hourlyGrowth;

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
    environment: Environment,
    world?: World,
    entityId?: string
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
          const seedCount = species.seedsPerPlant;
          const yieldModifier = applyGenetics(plant, 'yield');
          const calculatedSeeds = Math.floor(seedCount * yieldModifier);

          // Add to existing seeds (for perennial plants that cycle back to mature)
          plant.seedsProduced += calculatedSeeds;

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
    // Get entity ID for seed creation
    const entityId = this.plantEntityIds.get(plant) || `plant_${Date.now()}`;

    const seedsToDrop = count ?? Math.floor(plant.seedsProduced * 0.3);

    // If no seeds to drop, return early
    if (seedsToDrop === 0) {
      return;
    }

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
  }

  /**
   * Check if tile is suitable for seed placement
   */
  private isTileSuitable(position: { x: number; y: number }, world: World): boolean {
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

    // Check if tile is already occupied by a plant
    const existingPlants = world.query().with(CT.Plant).with(CT.Position).executeEntities();
    for (const plantEntity of existingPlants) {
      const plantImpl = plantEntity as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>(CT.Plant);
      if (plantComp && plantComp.position) {
        const plantX = Math.floor(plantComp.position.x);
        const plantY = Math.floor(plantComp.position.y);
        if (plantX === position.x && plantY === position.y) {
          return false; // Already has a plant
        }
      }
    }

    // Check soil quality if tilled
    if (tile.terrain === 'tilled_soil' && tile.fertility !== undefined && tile.fertility < 0.2) {
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
    soilState: SoilState
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

  // ============================================
  // Companion Planting System
  // ============================================

  /** Radius to check for companion plants (in tiles) */
  private static readonly COMPANION_RADIUS = 3;

  /** Bonus growth rate from beneficial companion */
  private static readonly COMPANION_BONUS = 0.15;

  /** Penalty growth rate from harmful companion */
  private static readonly COMPANION_PENALTY = 0.20;

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
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= PlantSystem.COMPANION_RADIUS && distance > 0) {
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
      this.eventBus.emit({
        type: 'plant:companionEffect',
        source: 'plant-system',
        data: {
          plantId: entityId,
          speciesId: species.id,
          position: plant.position,
          benefitCount,
          harmCount,
          modifier
        }
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

      // Only regenerate for plants in appropriate stages
      const canRegenerate = ['mature', 'fruiting'].includes(plant.stage);
      if (!canRegenerate) continue;

      // Must be healthy enough to produce fruit
      if (plant.health < 50) continue;

      // Get species to determine base fruit production
      const species = this.getSpecies(plant.speciesId);

      // Calculate fruit regeneration based on health and genetics
      // Base: seedsPerPlant / 3 (fruit is less than seeds typically)
      const baseFruitCount = Math.max(1, Math.floor(species.seedsPerPlant / 3));
      const healthModifier = plant.health / 100;
      const yieldModifier = applyGenetics(plant, 'yield');

      // Calculate new fruit to add (at least 1 if conditions are met)
      const fruitToAdd = Math.max(1, Math.floor(baseFruitCount * healthModifier * yieldModifier));

      // Add fruit up to a reasonable maximum (based on species seedsPerPlant)
      const maxFruit = species.seedsPerPlant * 2;
      const previousFruit = plant.fruitCount;
      plant.fruitCount = Math.min(maxFruit, plant.fruitCount + fruitToAdd);

      if (plant.fruitCount > previousFruit) {
        const entityId = this.plantEntityIds.get(plant) || entity.id;
        plantsRegenerated++;

        this.eventBus.emit({
          type: 'plant:fruitRegenerated',
          source: 'plant-system',
          data: {
            plantId: entityId,
            speciesId: plant.speciesId,
            fruitAdded: plant.fruitCount - previousFruit,
            totalFruit: plant.fruitCount,
            position: plant.position
          }
        });
      }
    }
  }

}
