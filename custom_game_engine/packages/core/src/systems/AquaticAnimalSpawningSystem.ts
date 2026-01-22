import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { BioluminescentComponent, type BioluminescentPattern } from '../components/BioluminescentComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createTemperatureComponent } from '../components/TemperatureComponent.js';
import { createMovementComponent } from '../components/MovementComponent.js';
import {
  getSpeciesForOceanZone,
  getSpeciesAtDepth,
  getAquaticSpecies,
  isBioluminescent,
  type AquaticSpecies,
} from '@ai-village/world';
import type { OceanBiomeZone } from '@ai-village/world';

/**
 * AquaticAnimalSpawningSystem spawns aquatic creatures in ocean chunks
 * Priority: 91 (runs after WildAnimalSpawningSystem)
 *
 * Dependencies:
 * - None (passive system): Triggered by chunk generation
 *   - Called via spawnAquaticAnimalsInChunk() when ocean chunks are generated
 *   - No dependencies on other systems' per-tick updates
 *
 * Related Systems:
 * - WildAnimalSpawningSystem: Spawns land animals
 * - AnimalSystem: Manages aquatic animals after creation
 * - AgentSwimmingSystem: Handles depth-based mechanics
 */
export class AquaticAnimalSpawningSystem extends BaseSystem {
  public readonly id: SystemId = 'aquatic_animal_spawning';
  public readonly priority: number = 91;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // PERF: Method-driven system - spawning is via spawnAquaticAnimalsInChunk(), not per-tick
  // High throttle ensures onUpdate() is rarely called (it does nothing anyway)
  protected readonly throttleInterval = 6000; // 5 minutes
  // PERF: Skip entirely when no animals exist (nothing to spawn into)
  public readonly activationComponents = ['animal'] as const;

  private spawnedChunks: Set<string> = new Set();

  protected onUpdate(_ctx: SystemContext): void {
    // No per-tick updates needed
    // Spawning is handled via spawnAquaticAnimalsInChunk() method
  }

  /**
   * Spawn aquatic animals in a newly generated ocean chunk
   */
  public spawnAquaticAnimalsInChunk(
    world: World,
    chunkData: {
      x: number;
      y: number;
      biome: string;
      size: number;
      depth: number; // Average depth of chunk
      oceanZone?: OceanBiomeZone;
    }
  ): Entity[] {
    // Validate required fields per CLAUDE.md - NO SILENT FALLBACKS
    if (chunkData.biome === undefined || chunkData.biome === null) {
      throw new Error('Chunk data missing required "biome" field');
    }
    if (chunkData.x === undefined || chunkData.x === null) {
      throw new Error('Chunk data missing required "x" field');
    }
    if (chunkData.y === undefined || chunkData.y === null) {
      throw new Error('Chunk data missing required "y" field');
    }
    if (chunkData.size === undefined || chunkData.size === null) {
      throw new Error('Chunk data missing required "size" field');
    }
    if (chunkData.depth === undefined || chunkData.depth === null) {
      throw new Error('Chunk data missing required "depth" field');
    }

    const { x: chunkX, y: chunkY, biome, size: chunkSize, depth, oceanZone } = chunkData;

    // Only spawn in ocean biomes
    if (biome !== 'ocean') {
      return [];
    }

    const chunkKey = `${chunkX},${chunkY}`;

    // Don't spawn in the same chunk twice
    if (this.spawnedChunks.has(chunkKey)) {
      return [];
    }

    this.spawnedChunks.add(chunkKey);

    // Get species that can spawn at this depth/zone
    let spawnableSpecies: AquaticSpecies[] = [];

    if (oceanZone) {
      // Use ocean zone if available
      spawnableSpecies = getSpeciesForOceanZone(oceanZone);
    } else {
      // Fallback to depth-based spawning
      spawnableSpecies = getSpeciesAtDepth(depth);
    }

    if (spawnableSpecies.length === 0) {
      return [];
    }

    const spawnedEntities: Entity[] = [];

    // Spawn aquatic animals based on species density
    for (const species of spawnableSpecies) {
      // Roll for spawning based on density
      const shouldSpawn = Math.random() < species.spawnDensity;
      if (!shouldSpawn) {
        continue;
      }

      // Determine how many animals to spawn
      // For schooling species, spawn 3-10
      // For herd/flock species, spawn 1-3
      // For solitary species, spawn 1
      let count = 1;
      if (species.schooling?.enabled) {
        const min = Math.min(3, species.schooling.minSchoolSize);
        const max = Math.min(10, species.schooling.maxSchoolSize);
        count = Math.floor(min + Math.random() * (max - min + 1));
      } else if (species.socialStructure === 'herd' || species.socialStructure === 'flock') {
        count = Math.floor(1 + Math.random() * 3); // 1-3 animals
      } else if (species.socialStructure === 'pack') {
        count = Math.floor(1 + Math.random() * 2); // 1-2 animals
      }

      // Spawn the animals
      for (let i = 0; i < count; i++) {
        const entity = this.spawnAquaticAnimal(
          world,
          chunkX,
          chunkY,
          chunkSize,
          species.id,
          depth,
          oceanZone
        );
        if (entity) {
          spawnedEntities.push(entity);
        }
      }
    }

    return spawnedEntities;
  }

  /**
   * Spawn a single aquatic animal
   */
  private spawnAquaticAnimal(
    world: World,
    chunkX: number,
    chunkY: number,
    chunkSize: number,
    speciesId: string,
    depth: number,
    oceanZone?: OceanBiomeZone
  ): Entity | null {
    const speciesData = getAquaticSpecies(speciesId);

    // Random position within chunk
    const x = chunkX * chunkSize + Math.random() * chunkSize;
    const y = chunkY * chunkSize + Math.random() * chunkSize;

    // Random depth variation within species range
    const depthVariation = (speciesData.depthRange.max - speciesData.depthRange.min) * 0.2;
    const spawnDepth = Math.max(
      speciesData.depthRange.max,
      Math.min(speciesData.depthRange.min, depth + (Math.random() - 0.5) * depthVariation)
    );

    const entity = this.createAquaticAnimalEntity(world, speciesData, speciesId, x, y, spawnDepth);

    // Emit spawn event
    world.eventBus.emit({
      type: 'animal_spawned',
      source: entity.id,
      data: {
        animalId: entity.id,
        speciesId,
        position: { x, y }, // Note: z is stored in entity's PositionComponent
        chunkX,
        chunkY,
        biome: 'ocean',
      },
    });

    return entity;
  }

  /**
   * Create an aquatic animal entity with all required components
   */
  private createAquaticAnimalEntity(
    world: World,
    speciesData: AquaticSpecies,
    speciesId: string,
    x: number,
    y: number,
    z: number
  ): Entity {
    // Random age (adult or juvenile for wild animals)
    const minAge = speciesData.infantDuration + speciesData.juvenileDuration;
    const maxAge =
      speciesData.infantDuration + speciesData.juvenileDuration + speciesData.adultDuration * 0.5;
    const age = minAge + Math.random() * (maxAge - minAge);

    // Determine life stage based on age
    const lifeStage = this.getLifeStage(age, speciesData);

    // Create animal entity
    const entity = world.createEntity();
    const entityImpl = entity as EntityImpl;
    const animalId = entity.id;

    // Add AnimalComponent
    const animalData = {
      id: animalId,
      speciesId,
      name: `Wild ${speciesData.name}`,
      position: { x, y, z },
      age,
      lifeStage,
      health: 80 + Math.random() * 20, // 80-100 health
      size: speciesData.baseSize,
      state: 'idle' as const,
      hunger: Math.random() * 30, // 0-30 hunger
      thirst: 0, // Aquatic animals don't have thirst
      energy: 70 + Math.random() * 30, // 70-100 energy
      stress: Math.random() * 20, // 0-20 stress
      mood: 50 + Math.random() * 30, // 50-80 mood
      wild: true,
      bondLevel: 0,
      trustLevel: 0,
    };
    entityImpl.addComponent(new AnimalComponent(animalData));

    // Add PositionComponent (required for rendering and spatial queries)
    entityImpl.addComponent(createPositionComponent(x, y, z));

    // Add RenderableComponent (required for rendering)
    const spriteId = this.getAquaticAnimalSprite(speciesId);
    entityImpl.addComponent(createRenderableComponent(spriteId, 'entity'));

    // Add MovementComponent (required for AnimalBrainSystem and movement)
    entityImpl.addComponent(createMovementComponent(speciesData.baseSpeed));

    // Add TemperatureComponent (aquatic animals need temperature comfort)
    entityImpl.addComponent(
      createTemperatureComponent(
        speciesData.minComfortTemp, // currentTemp - will be updated by TemperatureSystem
        speciesData.minComfortTemp,
        speciesData.maxComfortTemp,
        speciesData.minComfortTemp - 5, // toleranceMin (tighter for aquatic)
        speciesData.maxComfortTemp + 5 // toleranceMax
      )
    );

    // Add BioluminescentComponent if species has bioluminescence
    if (isBioluminescent(speciesData) && speciesData.bioluminescence) {
      const biolumData = {
        pattern: speciesData.bioluminescence.pattern,
        state: 'bright' as const, // Start with light on
        color: speciesData.bioluminescence.color,
        brightness: speciesData.bioluminescence.brightness,
        currentBrightness: speciesData.bioluminescence.brightness,
        purpose: speciesData.bioluminescence.purpose,
        energyCost: 0.01, // 1% energy per tick when active
        controllable: true,
        flashRate: speciesData.bioluminescence.pattern === ('pulsing' as BioluminescentPattern) ? 2 : undefined,
        flashPhase: 0,
        triggers: {
          inDarkness: true, // Activate in dark zones
          whenHungry: speciesData.bioluminescence.pattern === 'lure',
        },
      };
      entityImpl.addComponent(new BioluminescentComponent(biolumData));
    }

    return entity;
  }

  /**
   * Get sprite ID for aquatic animal species
   * Maps species to sprite IDs (placeholders for now, can be replaced with PixelLab sprites)
   */
  private getAquaticAnimalSprite(speciesId: string): string {
    // Map to existing or placeholder sprites
    const spriteMap: Record<string, string> = {
      kelp: 'kelp',
      sea_otter: 'sea_otter',
      clownfish: 'fish_orange', // Placeholder
      lanternfish: 'fish_small', // Placeholder
      giant_squid: 'squid',
      anglerfish: 'anglerfish',
      vampire_squid: 'squid_small',
      tripod_fish: 'fish_tripod',
      grenadier_fish: 'fish_deep',
      hadal_snailfish: 'fish_hadal',
      giant_tube_worm: 'tube_worm',
      yeti_crab: 'crab_yeti',
    };

    return spriteMap[speciesId] || speciesId;
  }

  /**
   * Determine life stage based on age and species durations
   */
  private getLifeStage(
    age: number,
    speciesData: AquaticSpecies
  ): 'infant' | 'juvenile' | 'adult' | 'elder' {
    if (age < speciesData.infantDuration) {
      return 'infant';
    } else if (age < speciesData.infantDuration + speciesData.juvenileDuration) {
      return 'juvenile';
    } else if (
      age <
      speciesData.infantDuration + speciesData.juvenileDuration + speciesData.adultDuration
    ) {
      return 'adult';
    } else {
      return 'elder';
    }
  }
}
