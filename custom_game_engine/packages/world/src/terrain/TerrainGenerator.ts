import type { WorldMutator } from '@ai-village/core';
import type { Chunk } from '../chunks/Chunk.js';
import { CHUNK_SIZE, setTileAt } from '../chunks/Chunk.js';
import type { Tile, TerrainType, BiomeType } from '../chunks/Tile.js';
import { PerlinNoise } from './PerlinNoise.js';
import { createTree } from '../entities/TreeEntity.js';
import { createRock } from '../entities/RockEntity.js';
import { createLeafPile } from '../entities/LeafPileEntity.js';
import { createFiberPlant } from '../entities/FiberPlantEntity.js';
import { WildAnimalSpawningSystem } from '@ai-village/core';

/**
 * Generates terrain using Perlin noise.
 */
export class TerrainGenerator {
  private elevationNoise: PerlinNoise;
  private moistureNoise: PerlinNoise;
  private temperatureNoise: PerlinNoise;
  private seed: string;
  private animalSpawner: WildAnimalSpawningSystem;

  // Terrain thresholds
  private readonly WATER_LEVEL = -0.3;
  private readonly SAND_LEVEL = -0.1;
  private readonly STONE_LEVEL = 0.5;

  constructor(seed: string = 'default') {
    this.seed = seed;
    const seedHash = this.hashString(seed);

    this.elevationNoise = new PerlinNoise(seedHash);
    this.moistureNoise = new PerlinNoise(seedHash + 1000);
    this.temperatureNoise = new PerlinNoise(seedHash + 2000);
    this.animalSpawner = new WildAnimalSpawningSystem();
  }

  /**
   * Generate terrain for a chunk.
   */
  generateChunk(chunk: Chunk, world?: WorldMutator): void {
    if (chunk.generated) return;

    // Generate tiles
    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = chunk.x * CHUNK_SIZE + localX;
        const worldY = chunk.y * CHUNK_SIZE + localY;

        const tile = this.generateTile(worldX, worldY);
        setTileAt(chunk, localX, localY, tile);
      }
    }

    // Place entities (trees, rocks)
    if (world) {
      this.placeEntities(chunk, world);

      // Spawn wild animals in chunk
      const chunkBiome = this.determineChunkBiome(chunk);
      this.animalSpawner.spawnAnimalsInChunk(world, {
        x: chunk.x,
        y: chunk.y,
        biome: chunkBiome,
        size: CHUNK_SIZE,
      });
    }

    chunk.generated = true;
  }

  /**
   * Place trees and rocks in a chunk.
   */
  private placeEntities(chunk: Chunk, world: WorldMutator): void {
    const placementNoise = new PerlinNoise(this.hashString(this.seed) + 5000);

    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = chunk.x * CHUNK_SIZE + localX;
        const worldY = chunk.y * CHUNK_SIZE + localY;

        const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
        if (!tile) continue;

        // Get placement value
        const placementValue = placementNoise.noise(worldX * 0.1, worldY * 0.1);

        // Place trees in forests and grassy areas
        if (tile.terrain === 'forest' && placementValue > 0.3) {
          if (Math.random() > 0.4) {
            // 60% chance (increased from 30% for better resource availability)
            createTree(world, worldX, worldY);
          }
        } else if (tile.terrain === 'grass' && placementValue > 0.4) {
          if (Math.random() > 0.85) {
            // 15% chance (increased from 5% for better resource availability)
            createTree(world, worldX, worldY);
          }
        }

        // Place rocks in mountains and stone areas
        if (tile.terrain === 'stone' && placementValue < -0.2) {
          if (Math.random() > 0.5) {
            // 50% chance (increased from 20% for better resource availability)
            createRock(world, worldX, worldY);
          }
        }

        // Also place rocks in sand/beach areas (new - for better resource distribution)
        if (tile.terrain === 'sand' && placementValue < 0) {
          if (Math.random() > 0.9) {
            // 10% chance for rocks on beaches
            createRock(world, worldX, worldY);
          }
        }

        // Place leaf piles in forests
        if (tile.terrain === 'forest' && placementValue < -0.1) {
          if (Math.random() > 0.7) {
            // 30% chance for leaf piles in forests
            createLeafPile(world, worldX, worldY);
          }
        }

        // Place fiber plants in grass areas
        if (tile.terrain === 'grass' && placementValue < 0.2) {
          if (Math.random() > 0.85) {
            // 15% chance for fiber plants in grass
            createFiberPlant(world, worldX, worldY);
          }
        }

        // Agent spawning disabled - agents are now created explicitly in main.ts
        // This allows precise control over agent count and starting positions
      }
    }
  }

  /**
   * Generate a single tile at world coordinates.
   */
  private generateTile(worldX: number, worldY: number): Tile {
    // Scale for noise (smaller = more zoomed out)
    const scale = 0.02;

    // Get noise values
    const elevation = this.elevationNoise.octaveNoise(worldX * scale, worldY * scale, 4, 0.5);
    const moisture = this.moistureNoise.octaveNoise(
      worldX * scale * 1.3,
      worldY * scale * 1.3,
      3,
      0.5
    );
    const temperature = this.temperatureNoise.octaveNoise(
      worldX * scale * 0.8,
      worldY * scale * 0.8,
      2,
      0.5
    );

    // Determine terrain and biome
    const { terrain, biome } = this.determineTerrainAndBiome(
      elevation,
      moisture,
      temperature
    );

    // Normalize moisture (0-1 range)
    const normalizedMoisture = (moisture + 1) / 2;

    // Calculate biome-based fertility (0-1 range)
    // Work order spec requires:
    // - Plains/Meadow: 70-80
    // - Forest: 60-70
    // - Riverside: 80-90
    // - Desert: 20-30
    // - Mountains: 40-50
    let fertility = this.calculateBiomeFertility(biome, moisture);

    // Adjust by terrain type
    if (terrain === 'water' || terrain === 'stone') {
      fertility = 0; // Not farmable
    } else if (terrain === 'sand' && biome !== 'desert') {
      // Sand near water (beaches) - low fertility
      fertility = Math.min(fertility, 0.3);
    }

    return {
      terrain,
      biome,
      moisture: Math.max(0, Math.min(100, normalizedMoisture * 100)),
      fertility: Math.max(0, Math.min(100, fertility * 100)),
      tilled: false,
      plantability: 0,
      nutrients: {
        nitrogen: Math.max(0, Math.min(100, fertility * 100)),
        phosphorus: Math.max(0, Math.min(100, fertility * 80)),
        potassium: Math.max(0, Math.min(100, fertility * 90)),
      },
      fertilized: false,
      fertilizerDuration: 0,
      lastWatered: 0,
      lastTilled: 0,
      composted: false,
      plantId: null,
    };
  }

  /**
   * Calculate fertility based on biome type.
   * Returns a value in 0-1 range that will be multiplied by 100 for the tile.
   *
   * Spec requirements (per work order):
   * - Plains/Meadow: 70-80
   * - Forest: 60-70
   * - Riverside: 80-90
   * - Desert: 20-30
   * - Mountains: 40-50
   */
  private calculateBiomeFertility(biome: BiomeType, moisture: number): number {
    // Base fertility ranges per biome (0-100 scale)
    const BIOME_FERTILITY_RANGES: Record<BiomeType, [number, number]> = {
      plains: [70, 80],
      forest: [60, 70],
      river: [80, 90],
      ocean: [0, 0], // Not farmable
      desert: [20, 30],
      mountains: [40, 50],
    };

    const range = BIOME_FERTILITY_RANGES[biome];
    if (!range) {
      throw new Error(`No fertility data for biome: ${biome}`);
    }

    const [min, max] = range;

    // Add some variation based on moisture within the range
    // Higher moisture = higher fertility within biome range
    const normalizedMoisture = (moisture + 1) / 2; // Convert -1..1 to 0..1
    const fertility = min + (max - min) * normalizedMoisture;

    // Convert to 0-1 range for storage (will be multiplied by 100)
    return fertility / 100;
  }

  /**
   * Determine terrain type and biome from noise values.
   */
  private determineTerrainAndBiome(
    elevation: number,
    moisture: number,
    temperature: number
  ): { terrain: TerrainType; biome: BiomeType } {
    // Water
    if (elevation < this.WATER_LEVEL) {
      return {
        terrain: 'water',
        biome: elevation < -0.5 ? 'ocean' : 'river',
      };
    }

    // Sand (beaches/desert)
    if (elevation < this.SAND_LEVEL) {
      return {
        terrain: 'sand',
        biome: moisture < -0.3 ? 'desert' : 'plains',
      };
    }

    // Mountains/stone
    if (elevation > this.STONE_LEVEL) {
      return {
        terrain: 'stone',
        biome: 'mountains',
      };
    }

    // Forest
    if (moisture > 0.2 && temperature > -0.2) {
      return {
        terrain: 'forest',
        biome: 'forest',
      };
    }

    // Desert
    if (moisture < -0.3 && temperature > 0.2) {
      return {
        terrain: 'sand',
        biome: 'desert',
      };
    }

    // Plains/grassland
    return {
      terrain: moisture > 0 ? 'grass' : 'dirt',
      biome: 'plains',
    };
  }

  /**
   * Simple string hash function.
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get the seed used by this generator.
   */
  getSeed(): string {
    return this.seed;
  }

  /**
   * Determine the dominant biome in a chunk for animal spawning.
   * Counts biome occurrences and returns the most common one.
   */
  private determineChunkBiome(chunk: Chunk): BiomeType {
    const biomeCounts = new Map<BiomeType, number>();

    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
        if (!tile || !tile.biome) continue;

        const count = biomeCounts.get(tile.biome) || 0;
        biomeCounts.set(tile.biome, count + 1);
      }
    }

    // Find the most common biome
    let dominantBiome: BiomeType = 'plains'; // Default fallback
    let maxCount = 0;

    for (const [biome, count] of biomeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantBiome = biome;
      }
    }

    return dominantBiome;
  }
}
