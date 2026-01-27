import type {
  SystemId,
  ComponentType,
  World,
  WorldMutator,
  Entity,
  PlantComponent,
  PlantSpecies,
  EventBus,
} from '@ai-village/core';
import {
  BaseSystem,
  type SystemContext,
  ComponentType as CT,
  EntityImpl,
} from '@ai-village/core';
import { DEFAULT_POPULATION_CONFIG, type PopulationConfig } from '../data/index.js';

/**
 * Seed bank entry - dormant seeds in soil
 */
export interface SeedBankEntry {
  speciesId: string;
  position: { x: number; y: number };
  viability: number;
  ageInDays: number;
  dormant: boolean;
}

/**
 * Biome distribution configuration
 */
export interface BiomeDistribution {
  biomeId: string;
  speciesWeights: Map<string, number>; // Species ID -> spawn weight
  maxDensityModifier: number;
}

/**
 * WildPlantPopulationSystem manages the ecology of wild plants
 *
 * Features:
 * - Biome-based spawning of wild plants
 * - Population density management
 * - Seed bank simulation
 * - Seasonal population dynamics
 */
export class WildPlantPopulationSystem extends BaseSystem {
  public readonly id: SystemId = 'wild_plant_population' as SystemId;
  public readonly priority: number = 15; // Before PlantSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly dependsOn = [] as const;

  /** Throttle to every 10 seconds (200 ticks at 20 TPS) */
  protected readonly throttleInterval = 200;

  private speciesLookup: ((id: string) => PlantSpecies) | null = null;
  private config: PopulationConfig;

  /** Seed banks keyed by chunk position */
  private seedBanks: Map<string, SeedBankEntry[]> = new Map();

  /** Track plant counts per chunk for density management */
  private chunkPlantCounts: Map<string, number> = new Map();

  /** Biome-specific spawn weights */
  private biomeDistributions: Map<string, BiomeDistribution> = new Map();

  /** Wild plant species registry */
  private wildPlantSpecies: PlantSpecies[] = [];

  /** Time tracking */
  private accumulatedTime: number = 0;
  private readonly UPDATE_INTERVAL = 24; // Update once per game day

  constructor(config?: Partial<PopulationConfig>) {
    super();
    this.config = {
      ...DEFAULT_POPULATION_CONFIG,
      ...config
    };
  }

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    this.registerEventListeners();
  }

  /**
   * Set the plant species lookup function
   */
  public setSpeciesLookup(lookup: (id: string) => PlantSpecies): void {
    this.speciesLookup = lookup;
  }

  /**
   * Register wild plant species for spawning
   */
  public registerWildSpecies(species: PlantSpecies[]): void {
    this.wildPlantSpecies = species.filter(s =>
      s.biomes && s.biomes.length > 0
    );

    // Build biome distributions
    this.buildBiomeDistributions();
  }

  /**
   * Build spawn weight distributions for each biome
   */
  private buildBiomeDistributions(): void {
    this.biomeDistributions.clear();

    for (const species of this.wildPlantSpecies) {
      if (!species.biomes) continue;

      for (const biome of species.biomes) {
        if (!this.biomeDistributions.has(biome)) {
          this.biomeDistributions.set(biome, {
            biomeId: biome,
            speciesWeights: new Map(),
            maxDensityModifier: 1.0
          });
        }

        const dist = this.biomeDistributions.get(biome)!;
        // Weight based on rarity
        const weight = this.getRarityWeight(species.rarity || 'common');
        dist.speciesWeights.set(species.id, weight);
      }
    }
  }

  /**
   * Get spawn weight based on rarity
   */
  private getRarityWeight(rarity: string): number {
    switch (rarity) {
      case 'common': return 1.0;
      case 'uncommon': return 0.4;
      case 'rare': return 0.1;
      case 'legendary': return 0.01;
      default: return 0.5;
    }
  }

  /**
   * Register event listeners
   */
  private registerEventListeners(): void {
    // Listen for seed dispersal events
    this.events.subscribe('seed:dispersed', (event: unknown) => {
      const e = event as { data: { speciesId: string; position?: { x: number; y: number } } };
      const { speciesId, position } = e.data;
      if (position) {
        this.addToSeedBank(speciesId, position);
      }
    });

    // Listen for plant death events
    this.events.subscribe('plant:died', (event: unknown) => {
      const e = event as { data: { speciesId: string } };
      const { speciesId } = e.data;
      // When plants die, their seeds may enter the seed bank
      const species = this.speciesLookup?.(speciesId);
      if (species) {
        // Add some seeds to bank based on species
        // Position would come from the event data
      }
    });
  }

  /**
   * Add a seed to the soil seed bank
   */
  public addToSeedBank(speciesId: string, position: { x: number; y: number }): void {
    const chunkKey = this.getChunkKey(position);

    if (!this.seedBanks.has(chunkKey)) {
      this.seedBanks.set(chunkKey, []);
    }

    const bank = this.seedBanks.get(chunkKey)!;

    // Limit seed bank size per chunk
    if (bank.length >= 50) {
      // Remove oldest/least viable seeds
      bank.sort((a, b) => b.viability - a.viability);
      bank.pop();
    }

    bank.push({
      speciesId,
      position: { ...position },
      viability: 0.9 + Math.random() * 0.1,
      ageInDays: 0,
      dormant: Math.random() < 0.3 // 30% chance seed is dormant
    });
  }

  /**
   * Get chunk key for position
   */
  private getChunkKey(position: { x: number; y: number }): string {
    const chunkX = Math.floor(position.x / 16);
    const chunkY = Math.floor(position.y / 16);
    return `${chunkX},${chunkY}`;
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const deltaTime = ctx.deltaTime;

    // Accumulate time (assuming game runs at ~60fps with deltaTime in seconds)
    this.accumulatedTime += deltaTime;

    // Only update once per game day
    if (this.accumulatedTime < this.UPDATE_INTERVAL) {
      return;
    }
    this.accumulatedTime = 0;

    // Update agent positions in scheduler for proximity-based filtering
    world.simulationScheduler.updateAgentPositions(world);

    // Update plant counts per chunk (only for visible chunks)
    this.updateChunkCounts(world);

    // Age seed bank entries
    this.ageSeedBank();

    // Try to germinate seeds from bank
    this.germinateSeedBank(world);

    // Natural spawning in low-density areas
    this.checkNaturalSpawning(world);
  }

  /**
   * Update plant counts per chunk (only for visible chunks near agents)
   */
  private updateChunkCounts(world: World): void {
    this.chunkPlantCounts.clear();

    const plants = world.query().with(CT.Plant).executeEntities();

    // Filter to only visible plants (near agents) using SimulationScheduler
    const visiblePlants = world.simulationScheduler.filterActiveEntities(
      plants as unknown as Entity[],
      world.tick
    );

    for (const entity of visiblePlants) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(CT.Plant);
      if (!plant || !plant.position) continue;

      // Only count wild plants
      if (plant.planted) continue;

      const key = this.getChunkKey(plant.position);
      this.chunkPlantCounts.set(key, (this.chunkPlantCounts.get(key) || 0) + 1);
    }
  }

  /**
   * Age seeds in the bank and reduce viability
   */
  private ageSeedBank(): void {
    for (const [, bank] of this.seedBanks) {
      const toRemove: number[] = [];

      for (let i = 0; i < bank.length; i++) {
        const seed = bank[i];
        if (!seed) continue;

        seed.ageInDays++;

        // Viability decreases with age
        seed.viability *= 0.995; // ~50% viability after 1 year

        // Remove non-viable seeds
        if (seed.viability < 0.1) {
          toRemove.push(i);
        }
      }

      // Remove in reverse order
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const removeIdx = toRemove[i];
        if (removeIdx !== undefined) {
          bank.splice(removeIdx, 1);
        }
      }
    }
  }

  /**
   * Try to germinate seeds from the seed bank
   */
  private germinateSeedBank(world: World): void {
    // PERFORMANCE: Cache plant query before loop - avoids O(chunks × seeds × plants) → O(plants + chunks × seeds)
    const allPlants = world.query().with(CT.Plant).executeEntities();
    const crowdingRadiusSquared = this.config.crowdingRadius * this.config.crowdingRadius;

    for (const [chunkKey, bank] of this.seedBanks) {
      const currentCount = this.chunkPlantCounts.get(chunkKey) || 0;

      // Check density limit
      if (currentCount >= this.config.maxDensity) {
        continue;
      }

      // Try to germinate some seeds
      const slotsAvailable = this.config.maxDensity - currentCount;
      let germinated = 0;

      for (const seed of bank) {
        if (germinated >= slotsAvailable) break;
        if (seed.dormant) continue;

        // Check germination conditions
        if (Math.random() < seed.viability * 0.3) { // 30% max chance
          // Check for crowding at specific position (using cached plants)
          if (!this.isPositionCrowdedCached(seed.position, allPlants, crowdingRadiusSquared)) {
            this.emitGerminationEvent(seed);
            seed.viability = 0; // Mark as used
            germinated++;
          }
        }
      }

      // Clean up used seeds
      const filtered = bank.filter(s => s.viability >= 0.1);
      this.seedBanks.set(chunkKey, filtered);
    }
  }

  /**
   * Check if a position is too crowded for a new plant (using cached plants)
   * PERFORMANCE: Uses pre-cached plant list and squared distance comparison
   */
  private isPositionCrowdedCached(
    position: { x: number; y: number },
    plants: ReadonlyArray<Entity>,
    crowdingRadiusSquared: number
  ): boolean {
    for (const entity of plants) {
      const impl = entity as EntityImpl;
      const plant = impl.getComponent<PlantComponent>(CT.Plant);
      if (!plant || !plant.position) continue;

      const dx = plant.position.x - position.x;
      const dy = plant.position.y - position.y;
      const distanceSquared = dx * dx + dy * dy;

      // PERFORMANCE: Squared distance comparison avoids Math.sqrt
      if (distanceSquared < crowdingRadiusSquared) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for natural spawning in low-density areas
   */
  private checkNaturalSpawning(world: World): void {
    // Natural spawning happens in chunks with low density
    // This simulates wind-blown or animal-carried seeds

    for (const [chunkKey, count] of this.chunkPlantCounts) {
      if (count >= this.config.minPopulation) {
        continue; // Already has enough plants
      }

      if (Math.random() > this.config.spawnChance) {
        continue; // Spawn check failed
      }

      // Parse chunk position
      const [chunkXStr, chunkYStr] = chunkKey.split(',');
      const chunkX = parseInt(chunkXStr || '0', 10);
      const chunkY = parseInt(chunkYStr || '0', 10);

      // Random position in chunk
      const x = chunkX * 16 + Math.floor(Math.random() * 16);
      const y = chunkY * 16 + Math.floor(Math.random() * 16);

      // Get biome at position (simplified - would need world tile data)
      const biome = this.getBiomeAtPosition({ x, y }, world);
      if (!biome) continue;

      // Select species based on biome weights
      const species = this.selectSpeciesForBiome(biome);
      if (!species) continue;

      // Emit spawn event
      this.events.emit('wild_plant:spawn', {
        speciesId: species.id,
        position: { x, y },
        biome
      });
    }
  }

  /**
   * Get biome at position (simplified)
   */
  private getBiomeAtPosition(
    _position: { x: number; y: number },
    _world: World
  ): string | null {
    // In a full implementation, this would query the terrain/biome data
    // For now, return a default biome
    return 'plains';
  }

  /**
   * Select a species to spawn based on biome weights
   */
  private selectSpeciesForBiome(biome: string): PlantSpecies | null {
    const dist = this.biomeDistributions.get(biome);
    if (!dist) return null;

    // Calculate total weight
    let totalWeight = 0;
    for (const weight of dist.speciesWeights.values()) {
      totalWeight += weight;
    }

    if (totalWeight === 0) return null;

    // Weighted random selection
    let roll = Math.random() * totalWeight;
    for (const [speciesId, weight] of dist.speciesWeights) {
      roll -= weight;
      if (roll <= 0) {
        return this.speciesLookup ? this.speciesLookup(speciesId) : null;
      }
    }

    return null;
  }

  /**
   * Emit germination event for world to handle
   */
  private emitGerminationEvent(seed: SeedBankEntry): void {
    this.events.emit('seed:germinated', {
      seedId: `seedbank_${Date.now()}`,
      speciesId: seed.speciesId,
      position: seed.position,
      generation: 0
    });
  }

  /**
   * Get seed bank stats for a chunk
   */
  public getSeedBankStats(chunkKey: string): { total: number; bySpecies: Map<string, number> } {
    const bank = this.seedBanks.get(chunkKey) || [];
    const bySpecies = new Map<string, number>();

    for (const seed of bank) {
      bySpecies.set(seed.speciesId, (bySpecies.get(seed.speciesId) || 0) + 1);
    }

    return {
      total: bank.length,
      bySpecies
    };
  }

  /**
   * Get population density for a chunk
   */
  public getPopulationDensity(chunkKey: string): number {
    return this.chunkPlantCounts.get(chunkKey) || 0;
  }
}
