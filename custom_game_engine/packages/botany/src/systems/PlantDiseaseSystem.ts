import type {
  SystemId,
  ComponentType,
  World,
  Entity,
  PlantComponent,
  EventBus,
  PlantSpecies,
  PlantDisease,
  PlantPest,
  PlantDiseaseState,
  PlantPestState,
  DiseaseSeverity,
} from '@ai-village/core';
import {
  BaseSystem,
  type SystemContext,
  ComponentType as CT,
  EntityImpl,
  DEFAULT_DISEASES,
  DEFAULT_PESTS,
} from '@ai-village/core';

/**
 * Configuration for the plant disease system
 */
export interface PlantDiseaseSystemConfig {
  /** Base chance for disease outbreak per plant per day */
  baseOutbreakChance: number;
  /** Base chance for pest arrival per plant per day */
  basePestChance: number;
  /** Enable disease spread between plants */
  enableSpread: boolean;
  /** How often to update (game hours) */
  updateInterval: number;
  /** Weather affects disease/pest rates */
  weatherModifiers: boolean;
}

const DEFAULT_CONFIG: PlantDiseaseSystemConfig = {
  baseOutbreakChance: 0.02,  // 2% per plant per day
  basePestChance: 0.03,      // 3% per plant per day
  enableSpread: true,
  updateInterval: 6,          // Every 6 game hours
  weatherModifiers: true
};

/**
 * PlantDiseaseSystem manages plant diseases and pest infestations
 *
 * Features:
 * - Disease outbreak based on conditions
 * - Disease spread between nearby plants
 * - Pest spawning and migration
 * - Damage application to plants
 * - Treatment effectiveness
 * - Environmental factor integration
 *
 * Dependencies:
 * @see PlantSystem (priority 20) - Must run after plants are updated to ensure correct plant health and stage data
 */
export class PlantDiseaseSystem extends BaseSystem {
  public readonly id: SystemId = 'plant_disease' as SystemId;
  public readonly priority: number = 25; // After PlantSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Plant];

  /**
   * Systems that must run before this one.
   * @see PlantSystem - provides plant health, stage, and genetics data for disease/pest calculations
   */
  public readonly dependsOn = ['plant'] as const;
  private config: PlantDiseaseSystemConfig;
  private speciesLookup: ((id: string) => PlantSpecies | undefined) | null = null;

  /** Registered diseases */
  private diseases: Map<string, PlantDisease> = new Map();

  /** Registered pests */
  private pests: Map<string, PlantPest> = new Map();

  /** Time tracking */
  private accumulatedTime: number = 0;

  /** Current environment state (from weather/time systems) */
  private currentEnvironment = {
    temperature: 20,
    moisture: 50,
    isRaining: false,
    isNight: false,
    season: 'summer'
  };

  constructor(config?: Partial<PlantDiseaseSystemConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  protected onInitialize(world: World, eventBus: EventBus): void {
    // Register default diseases and pests
    this.registerDefaults();
    this.setupEventListeners();
  }

  /**
   * Set the species lookup function
   */
  public setSpeciesLookup(lookup: (id: string) => PlantSpecies | undefined): void {
    this.speciesLookup = lookup;
  }

  /**
   * Register default diseases and pests
   */
  private registerDefaults(): void {
    for (const disease of DEFAULT_DISEASES) {
      this.diseases.set(disease.id, disease);
    }
    for (const pest of DEFAULT_PESTS) {
      this.pests.set(pest.id, pest);
    }
  }

  /**
   * Register a custom disease
   */
  public registerDisease(disease: PlantDisease): void {
    this.diseases.set(disease.id, disease);
  }

  /**
   * Register a custom pest
   */
  public registerPest(pest: PlantPest): void {
    this.pests.set(pest.id, pest);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for weather updates
    this.events.subscribe('weather:changed', (event: unknown) => {
      const e = event as { data: { weatherType: string } };
      const { weatherType } = e.data;
      this.currentEnvironment.isRaining = weatherType === 'rain' || weatherType === 'storm';
    });

    // Listen for time updates
    this.events.subscribe('world:time:hour', (event: unknown) => {
      const e = event as { data: { hour: number } };
      const { hour } = e.data;
      this.currentEnvironment.isNight = hour < 6 || hour > 20;
    });

    // Listen for season changes
    this.events.subscribe('world:time:season', (event: unknown) => {
      const e = event as { data: { season: string } };
      this.currentEnvironment.season = e.data.season;
    });

    // Listen for treatment applications
    this.events.subscribe('plant:treated', (event: unknown) => {
      const e = event as { data: { entityId: string; treatmentId: string; treatmentType: string } };
      const { entityId, treatmentId, treatmentType } = e.data;
      this.applyTreatmentFromEvent(entityId, treatmentId, treatmentType);
    });
  }

  /**
   * Handle treatment event (internal)
   */
  private applyTreatmentFromEvent(
    _entityId: string,
    _treatmentId: string,
    _treatmentType: string
  ): void {
    // This would look up the entity and apply treatment
    // For now this is a placeholder - actual treatment is done via applyTreatment()
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const activeEntities = ctx.activeEntities;

    // Get current game day for tracking
    const gameDay = this.getCurrentGameDay(world as any);

    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(CT.Plant);

      if (!plant) continue;
      if (plant.stage === 'seed' || plant.stage === 'dead') continue;

      const entityId = impl.id;
      const species = this.speciesLookup?.(plant.speciesId);
      const category = species?.category ?? 'crop';

      // Process existing diseases
      this.processDiseases(plant, entityId, gameDay);

      // Process existing pests
      this.processPests(plant, entityId, gameDay);

      // Check for new disease outbreaks
      this.checkDiseaseOutbreak(plant, entityId, category, gameDay);

      // Check for new pest infestations
      this.checkPestInfestation(plant, entityId, category, gameDay, world as any);

      // Disease spread
      if (this.config.enableSpread) {
        this.spreadDiseases(plant, entityId, world as any, gameDay, activeEntities);
      }

      // Pest migration
      this.migratePests(plant, entityId, world as any, gameDay, activeEntities);
    }
  }

  /**
   * Get current game day (simplified)
   */
  private getCurrentGameDay(_world: World): number {
    // In a real implementation, this would query the time system
    return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  }

  /**
   * Process active diseases on a plant
   */
  private processDiseases(plant: PlantComponent, entityId: string, _gameDay: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < plant.diseases.length; i++) {
      const diseaseState = plant.diseases[i];
      if (!diseaseState) continue;

      const disease = this.diseases.get(diseaseState.diseaseId);
      if (!disease) continue;

      diseaseState.daysActive++;

      // Check incubation period
      if (diseaseState.incubating) {
        if (diseaseState.daysActive >= disease.incubationDays) {
          diseaseState.incubating = false;
          diseaseState.spreading = true;

          this.events.emit('plant:diseaseSymptoms', {
            entityId,
            diseaseId: disease.id,
            diseaseName: disease.name,
            severity: diseaseState.severity
          });
        }
        continue; // No damage during incubation
      }

      // Apply damage based on severity
      const severityMultiplier = this.getSeverityMultiplier(diseaseState.severity);
      const resistanceFactor = 1 - (plant.genetics.diseaseResistance / 100);
      const healthDrain = disease.healthDrainPerDay * severityMultiplier * resistanceFactor;

      plant.health -= healthDrain;

      // Check for severity progression
      this.updateDiseaseSeverity(diseaseState, plant);

      // Check for plant death
      if (plant.health <= disease.lethalHealthThreshold) {
        this.events.emit('plant:diedFromDisease', {
          entityId,
          diseaseId: disease.id,
          diseaseName: disease.name
        });
        plant.stage = 'dead';
        plant.health = 0;
        toRemove.push(i);
        continue;
      }

      // Natural recovery chance (low)
      if (plant.genetics.diseaseResistance >= 80 && Math.random() < 0.05) {
        toRemove.push(i);

        this.events.emit('plant:diseaseRecovered', {
          entityId,
          diseaseId: disease.id,
          diseaseName: disease.name
        });
      }
    }

    // Remove cured/ended diseases
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      if (idx !== undefined) {
        plant.diseases.splice(idx, 1);
      }
    }
  }

  /**
   * Process active pest infestations
   */
  private processPests(plant: PlantComponent, entityId: string, _gameDay: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < plant.pests.length; i++) {
      const pestState = plant.pests[i];
      if (!pestState) continue;

      const pest = this.pests.get(pestState.pestId);
      if (!pest) continue;

      pestState.daysPresent++;

      // Check seasonal activity
      if (!pest.seasonalActivity.includes(this.currentEnvironment.season)) {
        // Pests leave during off-season
        if (Math.random() < 0.3) {
          toRemove.push(i);
          continue;
        }
      }

      // Population growth
      if (!pestState.controlled && pestState.population < pest.maxPopulation) {
        const newPests = Math.floor(pestState.population * pest.breedingRate);
        pestState.population = Math.min(pest.maxPopulation, pestState.population + newPests);
      }

      // Apply damage if population exceeds minimum
      if (pestState.population >= pest.minPopulation) {
        const damage = pestState.population * pest.damagePerPestPerDay;
        plant.health -= damage;

        // Consume yield
        if (pest.consumesYield && plant.fruitCount > 0) {
          const yieldLoss = Math.ceil(plant.fruitCount * pest.yieldDamagePercent);
          plant.fruitCount = Math.max(0, plant.fruitCount - yieldLoss);
        }
      }

      // Natural die-off
      if (Math.random() < 0.05) {
        pestState.population = Math.max(0, pestState.population - Math.floor(pestState.population * 0.1));
      }

      // Check if population died out
      if (pestState.population <= 0) {
        toRemove.push(i);

        this.events.emit('plant:pestsGone', {
          entityId,
          pestId: pest.id,
          pestName: pest.name
        });
      }
    }

    // Remove dead pest populations
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      if (idx !== undefined) {
        plant.pests.splice(idx, 1);
      }
    }
  }

  /**
   * Check for new disease outbreak on a plant
   */
  private checkDiseaseOutbreak(
    plant: PlantComponent,
    entityId: string,
    category: string,
    gameDay: number
  ): void {
    // Don't stack too many diseases
    if (plant.diseases.length >= 2) return;

    // Resistance reduces chance
    const resistanceFactor = 1 - (plant.genetics.diseaseResistance / 200);
    const outbreakChance = this.config.baseOutbreakChance * resistanceFactor;

    // Environment modifiers
    let environmentModifier = 1.0;
    if (this.config.weatherModifiers) {
      if (this.currentEnvironment.moisture > 70) environmentModifier *= 1.5;
      if (this.currentEnvironment.isRaining) environmentModifier *= 1.3;
    }

    if (Math.random() > outbreakChance * environmentModifier) {
      return;
    }

    // Select a disease based on conditions
    const eligibleDiseases: PlantDisease[] = [];
    for (const disease of this.diseases.values()) {
      if (!disease.susceptibleCategories.includes(category)) continue;
      if (disease.immuneSpecies?.includes(plant.speciesId)) continue;
      if (plant.diseases.some(d => d.diseaseId === disease.id)) continue;

      // Check favored conditions
      const conditions = disease.favoredConditions;
      if (conditions.minMoisture && this.currentEnvironment.moisture < conditions.minMoisture) continue;
      if (conditions.maxMoisture && this.currentEnvironment.moisture > conditions.maxMoisture) continue;
      if (conditions.minTemperature && this.currentEnvironment.temperature < conditions.minTemperature) continue;
      if (conditions.maxTemperature && this.currentEnvironment.temperature > conditions.maxTemperature) continue;
      if (conditions.requiresRain && !this.currentEnvironment.isRaining) continue;

      eligibleDiseases.push(disease);
    }

    if (eligibleDiseases.length === 0) return;

    // Random selection
    const selectedDisease = eligibleDiseases[Math.floor(Math.random() * eligibleDiseases.length)];
    if (!selectedDisease) return;

    // Create disease state
    const diseaseState: PlantDiseaseState = {
      diseaseId: selectedDisease.id,
      infectionDay: gameDay,
      severity: 'mild',
      incubating: true,
      daysActive: 0,
      spreading: false,
      treated: false
    };

    plant.diseases.push(diseaseState);

    this.events.emit('plant:diseaseContracted', {
      entityId,
      diseaseId: selectedDisease.id,
      diseaseName: selectedDisease.name,
      incubationDays: selectedDisease.incubationDays
    });
  }

  /**
   * Check for new pest infestation
   */
  private checkPestInfestation(
    plant: PlantComponent,
    entityId: string,
    category: string,
    gameDay: number,
    world: World
  ): void {
    // Don't stack too many pests
    if (plant.pests.length >= 3) return;

    let pestChance = this.config.basePestChance;

    // Environment modifiers
    if (this.config.weatherModifiers) {
      if (this.currentEnvironment.temperature > 25) pestChance *= 1.3;
    }

    if (Math.random() > pestChance) {
      return;
    }

    // Select a pest
    const eligiblePests: PlantPest[] = [];
    for (const pest of this.pests.values()) {
      if (!pest.targetCategories.includes(category)) continue;
      if (!pest.seasonalActivity.includes(this.currentEnvironment.season)) continue;
      if (plant.pests.some(p => p.pestId === pest.id)) continue;

      // Check repellents
      if (this.isRepelledByNearbyPlants(plant, pest, world)) continue;

      // Check conditions
      const conditions = pest.favoredConditions;
      if (conditions.minTemperature && this.currentEnvironment.temperature < conditions.minTemperature) continue;
      if (conditions.maxTemperature && this.currentEnvironment.temperature > conditions.maxTemperature) continue;
      if (conditions.nightActive && !this.currentEnvironment.isNight) continue;

      eligiblePests.push(pest);
    }

    if (eligiblePests.length === 0) return;

    // Weighted selection based on spawnChance
    let totalWeight = 0;
    for (const pest of eligiblePests) {
      totalWeight += pest.spawnChance;
    }

    let roll = Math.random() * totalWeight;
    let selectedPest: PlantPest | null = null;
    for (const pest of eligiblePests) {
      roll -= pest.spawnChance;
      if (roll <= 0) {
        selectedPest = pest;
        break;
      }
    }

    if (!selectedPest) return;

    // Create pest state
    const pestState: PlantPestState = {
      pestId: selectedPest.id,
      population: selectedPest.minPopulation + Math.floor(Math.random() * 5),
      arrivalDay: gameDay,
      daysPresent: 0,
      controlled: false
    };

    plant.pests.push(pestState);

    this.events.emit('plant:pestInfestation', {
      entityId,
      pestId: selectedPest.id,
      pestName: selectedPest.name,
      population: pestState.population
    });
  }

  /**
   * Check if pest is repelled by nearby companion plants
   */
  private isRepelledByNearbyPlants(
    plant: PlantComponent,
    pest: PlantPest,
    world: World
  ): boolean {
    if (!pest.repelledBy || pest.repelledBy.length === 0) return false;

    const plants = world.query().with(CT.Plant).executeEntities();

    for (const entity of plants) {
      const impl = entity as EntityImpl;
      const otherPlant = impl.getComponent<PlantComponent>(CT.Plant);

      if (!otherPlant || !otherPlant.position) continue;
      if (otherPlant === plant) continue;

      const dx = otherPlant.position.x - plant.position.x;
      const dy = otherPlant.position.y - plant.position.y;
      const distanceSquared = dx * dx + dy * dy;

      // Check if within companion radius (default 3 tiles, squared = 9)
      if (distanceSquared <= 9 && pest.repelledBy.includes(otherPlant.speciesId)) {
        return Math.random() < 0.6; // 60% chance to be repelled
      }
    }

    return false;
  }

  /**
   * Spread diseases to nearby plants
   */
  private spreadDiseases(
    plant: PlantComponent,
    entityId: string,
    _world: World,
    gameDay: number,
    activeEntities: ReadonlyArray<Entity>
  ): void {
    const spreadingDiseases = plant.diseases.filter(d => d.spreading);
    if (spreadingDiseases.length === 0) return;

    // Use filtered activeEntities instead of querying all plants
    const nearbyPlants = activeEntities;

    for (const diseaseState of spreadingDiseases) {
      const disease = this.diseases.get(diseaseState.diseaseId);
      if (!disease) continue;

      for (const entity of nearbyPlants) {
        const impl = entity as EntityImpl;
        if (impl.id === entityId) continue;

        const targetPlant = impl.getComponent<PlantComponent>(CT.Plant);
        if (!targetPlant || !targetPlant.position) continue;
        if (targetPlant.stage === 'seed' || targetPlant.stage === 'dead') continue;

        // Check distance
        const dx = targetPlant.position.x - plant.position.x;
        const dy = targetPlant.position.y - plant.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const spreadRadiusSquared = disease.spreadRadius * disease.spreadRadius;

        if (distanceSquared > spreadRadiusSquared) continue;

        // Check if already infected
        if (targetPlant.diseases.some(d => d.diseaseId === disease.id)) continue;

        // Check category susceptibility
        const targetSpecies = this.speciesLookup?.(targetPlant.speciesId);
        const targetCategory = targetSpecies?.category ?? 'crop';
        if (!disease.susceptibleCategories.includes(targetCategory)) continue;

        // Calculate spread chance (need actual distance for this)
        const distance = Math.sqrt(distanceSquared);
        const resistanceFactor = 1 - (targetPlant.genetics.diseaseResistance / 100);
        const distanceFactor = 1 - (distance / disease.spreadRadius);
        const spreadChance = disease.spreadChance * resistanceFactor * distanceFactor;

        if (Math.random() < spreadChance) {
          const newDiseaseState: PlantDiseaseState = {
            diseaseId: disease.id,
            infectionDay: gameDay,
            severity: 'mild',
            incubating: true,
            daysActive: 0,
            spreading: false,
            treated: false
          };

          targetPlant.diseases.push(newDiseaseState);

          this.events.emit('plant:diseaseSpread', {
            fromEntityId: entityId,
            toEntityId: impl.id,
            diseaseId: disease.id,
            diseaseName: disease.name
          });
        }
      }
    }
  }

  /**
   * Migrate pests to nearby plants
   */
  private migratePests(
    plant: PlantComponent,
    entityId: string,
    world: World,
    gameDay: number,
    activeEntities: ReadonlyArray<Entity>
  ): void {
    if (plant.pests.length === 0) return;

    for (const pestState of plant.pests) {
      const pest = this.pests.get(pestState.pestId);
      if (!pest) continue;

      if (Math.random() > pest.migrationChance) continue;
      if (pestState.population < pest.minPopulation * 2) continue; // Need surplus to migrate

      // Use filtered activeEntities instead of querying all plants
      const nearbyPlants = activeEntities;

      for (const entity of nearbyPlants) {
        const impl = entity as EntityImpl;
        if (impl.id === entityId) continue;

        const targetPlant = impl.getComponent<PlantComponent>(CT.Plant);
        if (!targetPlant || !targetPlant.position) continue;
        if (targetPlant.stage === 'seed' || targetPlant.stage === 'dead') continue;

        // Check distance
        const dx = targetPlant.position.x - plant.position.x;
        const dy = targetPlant.position.y - plant.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const migrationRadiusSquared = pest.migrationRadius * pest.migrationRadius;

        if (distanceSquared > migrationRadiusSquared) continue;

        // Check category
        const targetSpecies = this.speciesLookup?.(targetPlant.speciesId);
        const targetCategory = targetSpecies?.category ?? 'crop';
        if (!pest.targetCategories.includes(targetCategory)) continue;

        // Check repellents
        if (this.isRepelledByNearbyPlants(targetPlant, pest, world)) continue;

        // Migrate some pests
        const existingPest = targetPlant.pests.find(p => p.pestId === pest.id);
        const migratingCount = Math.floor(pestState.population * 0.3);

        if (existingPest) {
          existingPest.population = Math.min(
            pest.maxPopulation,
            existingPest.population + migratingCount
          );
        } else {
          targetPlant.pests.push({
            pestId: pest.id,
            population: migratingCount,
            arrivalDay: gameDay,
            daysPresent: 0,
            controlled: false
          });

          this.events.emit('plant:pestMigrated', {
            fromEntityId: entityId,
            toEntityId: impl.id,
            pestId: pest.id,
            pestName: pest.name,
            population: migratingCount
          });
        }

        pestState.population -= migratingCount;
        break; // Only migrate to one plant per tick
      }
    }
  }

  /**
   * Apply treatment to a plant (called externally)
   */
  public applyTreatment(
    plant: PlantComponent,
    entityId: string,
    treatmentId: string
  ): { success: boolean; message: string } {
    // Check diseases
    for (const diseaseState of plant.diseases) {
      const disease = this.diseases.get(diseaseState.diseaseId);
      if (!disease) continue;

      for (const treatment of disease.treatments) {
        if (treatment.itemId === treatmentId) {
          if (Math.random() < treatment.effectiveness) {
            // Remove disease
            const idx = plant.diseases.indexOf(diseaseState);
            if (idx !== -1) {
              plant.diseases.splice(idx, 1);
            }

            this.events.emit('plant:diseaseTreated', {
              entityId,
              diseaseId: disease.id,
              diseaseName: disease.name,
              treatmentId
            });

            return { success: true, message: `Successfully treated ${disease.name}` };
          } else {
            diseaseState.treated = true;
            return { success: false, message: `Treatment partially effective against ${disease.name}` };
          }
        }
      }
    }

    // Check pests
    for (const pestState of plant.pests) {
      const pest = this.pests.get(pestState.pestId);
      if (!pest) continue;

      for (const control of pest.controls) {
        if (control.itemId === treatmentId) {
          const killed = Math.floor(pestState.population * control.killEffectiveness);
          pestState.population -= killed;
          pestState.controlled = control.repelEffectiveness > 0.5;

          if (pestState.population <= 0) {
            const idx = plant.pests.indexOf(pestState);
            if (idx !== -1) {
              plant.pests.splice(idx, 1);
            }

            this.events.emit('plant:pestsEliminated', {
              entityId,
              pestId: pest.id,
              pestName: pest.name,
              treatmentId
            });

            return { success: true, message: `Eliminated ${pest.name} infestation` };
          } else {
            return {
              success: true,
              message: `Reduced ${pest.name} population from ${killed + pestState.population} to ${pestState.population}`
            };
          }
        }
      }
    }

    return { success: false, message: 'Treatment had no effect' };
  }

  /**
   * Get severity multiplier for damage calculations
   */
  private getSeverityMultiplier(severity: DiseaseSeverity): number {
    switch (severity) {
      case 'mild': return 0.5;
      case 'moderate': return 1.0;
      case 'severe': return 1.5;
      case 'terminal': return 2.0;
      default: return 1.0;
    }
  }

  /**
   * Update disease severity based on plant health
   */
  private updateDiseaseSeverity(diseaseState: PlantDiseaseState, plant: PlantComponent): void {
    if (plant.health > 70) {
      diseaseState.severity = 'mild';
    } else if (plant.health > 50) {
      diseaseState.severity = 'moderate';
    } else if (plant.health > 25) {
      diseaseState.severity = 'severe';
    } else {
      diseaseState.severity = 'terminal';
    }
  }

  /**
   * Get plant health status
   */
  public getPlantHealthStatus(plant: PlantComponent): {
    diseases: Array<{ id: string; name: string; severity: DiseaseSeverity }>;
    pests: Array<{ id: string; name: string; population: number }>;
    overallHealthModifier: number;
    overallGrowthModifier: number;
    overallYieldModifier: number;
    needsAttention: boolean;
  } {
    let healthMod = 1.0;
    let growthMod = 1.0;
    let yieldMod = 1.0;

    const diseaseInfo = plant.diseases.map(d => {
      const disease = this.diseases.get(d.diseaseId);
      if (disease && !d.incubating) {
        growthMod *= disease.growthPenalty;
        yieldMod *= disease.yieldPenalty;
      }
      return {
        id: d.diseaseId,
        name: disease?.name ?? 'Unknown',
        severity: d.severity
      };
    });

    const pestInfo = plant.pests.map(p => {
      const pest = this.pests.get(p.pestId);
      if (pest && p.population >= pest.minPopulation) {
        yieldMod *= (1 - pest.yieldDamagePercent);
      }
      return {
        id: p.pestId,
        name: pest?.name ?? 'Unknown',
        population: p.population
      };
    });

    return {
      diseases: diseaseInfo,
      pests: pestInfo,
      overallHealthModifier: healthMod,
      overallGrowthModifier: growthMod,
      overallYieldModifier: yieldMod,
      needsAttention: plant.diseases.length > 0 || plant.pests.some(p => {
        const pest = this.pests.get(p.pestId);
        return pest && p.population >= pest.minPopulation;
      })
    };
  }
}
