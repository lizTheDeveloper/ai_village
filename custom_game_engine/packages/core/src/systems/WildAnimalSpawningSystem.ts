import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createTemperatureComponent } from '../components/TemperatureComponent.js';
import { createMovementComponent } from '../components/MovementComponent.js';
import { getSpawnableSpecies, getAnimalSpecies, type AnimalSpecies } from '../data/animalSpecies.js';

/**
 * WildAnimalSpawningSystem spawns wild animals in chunks
 * Priority: 90 (runs very late, after most other systems)
 *
 * Dependencies:
 * - None (passive system): Triggered by chunk generation, not per-tick updates
 *   - Called via spawnAnimalsInChunk() when new chunks are generated
 *   - No dependencies on other systems' per-tick updates
 *
 * Related Systems:
 * - ChunkGenerationSystem: Triggers spawning via spawnAnimalsInChunk()
 * - AnimalSystem: Will manage spawned animals after creation
 * - TemperatureSystem: Applies temperature comfort to spawned animals
 */
export class WildAnimalSpawningSystem extends BaseSystem {
  public readonly id: SystemId = 'wild_animal_spawning';
  public readonly priority: number = 90;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private spawnedChunks: Set<string> = new Set();

  protected onUpdate(_ctx: SystemContext): void {
    // No per-tick updates needed
    // Spawning is handled via spawnAnimalsInChunk() method
  }

  /**
   * Spawn animals in a newly generated chunk
   */
  public spawnAnimalsInChunk(
    world: World,
    chunkData: { x: number; y: number; biome: string; size: number }
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

    const { x: chunkX, y: chunkY, biome, size: chunkSize } = chunkData;
    const chunkKey = `${chunkX},${chunkY}`;

    // Don't spawn in the same chunk twice
    if (this.spawnedChunks.has(chunkKey)) {
      return [];
    }

    this.spawnedChunks.add(chunkKey);

    // Get species that can spawn in this biome
    const spawnableSpecies = getSpawnableSpecies(biome);
    if (spawnableSpecies.length === 0) {
      return [];
    }

    const spawnedEntities: Entity[] = [];

    // Spawn animals based on species density
    for (const species of spawnableSpecies) {
      // Roll for spawning based on density
      const shouldSpawn = Math.random() < species.spawnDensity;
      if (!shouldSpawn) {
        continue;
      }

      // Determine how many animals to spawn
      // For herd/flock species, spawn 1-3
      // For solitary species, spawn 1
      let count = 1;
      if (species.socialStructure === 'herd' || species.socialStructure === 'flock') {
        count = Math.floor(1 + Math.random() * 3); // 1-3 animals
      } else if (species.socialStructure === 'pack') {
        count = Math.floor(1 + Math.random() * 2); // 1-2 animals
      }

      // Spawn the animals
      for (let i = 0; i < count; i++) {
        const entity = this.spawnAnimal(world, chunkX, chunkY, chunkSize, species.id, biome);
        if (entity) {
          spawnedEntities.push(entity);
        }
      }
    }

    return spawnedEntities;
  }

  /**
   * Spawn a single animal
   */
  private spawnAnimal(
    world: World,
    chunkX: number,
    chunkY: number,
    chunkSize: number,
    speciesId: string,
    biome: string
  ): Entity | null {
    const speciesData = getAnimalSpecies(speciesId);

    // Random position within chunk
    const x = chunkX * chunkSize + Math.random() * chunkSize;
    const y = chunkY * chunkSize + Math.random() * chunkSize;

    const entity = this.createAnimalEntity(world, speciesData, speciesId, x, y);

    // Emit spawn event
    world.eventBus.emit({
      type: 'animal_spawned',
      source: entity.id,
      data: {
        animalId: entity.id,
        speciesId,
        position: { x, y },
        chunkX,
        chunkY,
        biome,
      },
    });

    return entity;
  }

  /**
   * Create an animal entity with all required components.
   * Shared between spawnAnimal() and spawnSpecificAnimal() to stay DRY.
   */
  private createAnimalEntity(
    world: World,
    speciesData: AnimalSpecies,
    speciesId: string,
    x: number,
    y: number
  ): Entity {
    // Random age (adult or juvenile for wild animals)
    const minAge = speciesData.infantDuration + speciesData.juvenileDuration;
    const maxAge = speciesData.infantDuration + speciesData.juvenileDuration + speciesData.adultDuration * 0.5;
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
      position: { x, y },
      age,
      lifeStage,
      health: 80 + Math.random() * 20, // 80-100 health
      size: speciesData.baseSize,
      state: 'idle' as const,
      hunger: Math.random() * 30, // 0-30 hunger
      thirst: Math.random() * 30, // 0-30 thirst
      energy: 70 + Math.random() * 30, // 70-100 energy
      stress: Math.random() * 20, // 0-20 stress
      mood: 50 + Math.random() * 30, // 50-80 mood
      wild: true,
      isDomesticated: false,
      bondLevel: 0,
      trustLevel: 0,
    };
    entityImpl.addComponent(new AnimalComponent(animalData));

    // Add PositionComponent (required for rendering and spatial queries)
    entityImpl.addComponent(createPositionComponent(x, y));

    // Add RenderableComponent (required for rendering)
    // Select a random variant for species that have them (sheep_white, sheep_black, etc.)
    const spriteId = this.getAnimalSpriteVariant(speciesId);
    entityImpl.addComponent(createRenderableComponent(spriteId, 'entity'));

    // Add MovementComponent (required for AnimalBrainSystem and movement)
    entityImpl.addComponent(createMovementComponent(speciesData.baseSpeed));

    // Add TemperatureComponent (Phase 8 integration - animals need temperature comfort)
    entityImpl.addComponent(createTemperatureComponent(
      20, // currentTemp - will be updated by TemperatureSystem
      speciesData.minComfortTemp,
      speciesData.maxComfortTemp,
      speciesData.minComfortTemp - 10, // toleranceMin
      speciesData.maxComfortTemp + 10  // toleranceMax
    ));

    return entity;
  }

  /**
   * Get a random sprite variant for an animal species
   * Maps base species (e.g., 'sheep') to specific variants (e.g., 'sheep_white', 'sheep_black')
   */
  private getAnimalSpriteVariant(speciesId: string): string {
    // Map species to their available variants
    const variants: Record<string, string[]> = {
      'sheep': ['sheep_white', 'sheep_black', 'sheep_grey'],
      'chicken': ['chicken_white', 'chicken_brown', 'chicken_black'],
      'cow': ['cow_black_white', 'cow_brown', 'cow_brown_white'],
      'horse': ['horse_brown', 'horse_black', 'horse_white', 'horse_chestnut'],
      'dog': ['dog_brown', 'dog_black', 'dog_white', 'dog_spotted'],
      'cat': ['cat_orange', 'cat_grey', 'cat_black', 'cat_white'],
      'rabbit': ['rabbit_white', 'rabbit_brown', 'rabbit_grey'],
      'deer': ['deer_brown', 'deer_spotted'],
      'pig': ['pig_pink', 'pig_black'],
      'goat': ['goat_brown', 'goat_black', 'goat_white'],
    };

    const availableVariants = variants[speciesId];
    if (availableVariants && availableVariants.length > 0) {
      // Return random variant
      return availableVariants[Math.floor(Math.random() * availableVariants.length)]!;
    }

    // Fallback to species ID if no variants defined
    return speciesId;
  }

  /**
   * Determine life stage based on age and species durations.
   */
  private getLifeStage(
    age: number,
    speciesData: AnimalSpecies
  ): 'infant' | 'juvenile' | 'adult' | 'elder' {
    if (age < speciesData.infantDuration) {
      return 'infant';
    } else if (age < speciesData.infantDuration + speciesData.juvenileDuration) {
      return 'juvenile';
    } else if (age < speciesData.infantDuration + speciesData.juvenileDuration + speciesData.adultDuration) {
      return 'adult';
    } else {
      return 'elder';
    }
  }

  /**
   * Spawn a specific animal species at a given position (public method for testing)
   * Validates all required parameters per CLAUDE.md - NO SILENT FALLBACKS
   */
  public spawnSpecificAnimal(
    world: World,
    speciesId: string,
    position: { x: number; y: number } | undefined
  ): Entity {
    // Validate required position parameter
    if (!position) {
      throw new Error('Position is required for spawning animal');
    }
    if (position.x === undefined || position.x === null) {
      throw new Error('Position missing required "x" field');
    }
    if (position.y === undefined || position.y === null) {
      throw new Error('Position missing required "y" field');
    }

    // Validate species exists
    const speciesData = getAnimalSpecies(speciesId);
    if (!speciesData) {
      throw new Error(`Invalid species ID: ${speciesId}`);
    }

    const { x, y } = position;

    // Use shared helper for component creation
    const entity = this.createAnimalEntity(world, speciesData, speciesId, x, y);

    // Calculate chunk coordinates for event emission
    const chunkSize = 32;
    const chunkX = Math.floor(x / chunkSize);
    const chunkY = Math.floor(y / chunkSize);

    // Emit spawn event
    world.eventBus.emit({
      type: 'animal_spawned',
      source: entity.id,
      data: {
        animalId: entity.id,
        speciesId,
        position: { x, y },
        chunkX,
        chunkY,
        biome: 'unknown', // Unknown biome for manually spawned animals
      },
    });

    return entity;
  }

  /**
   * Clear spawned chunks (for testing or world reset)
   */
  public clearSpawnedChunks(): void {
    this.spawnedChunks.clear();
  }
}
