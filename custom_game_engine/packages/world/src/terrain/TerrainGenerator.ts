import type { WorldMutator } from '@ai-village/core';
import type { Chunk } from '../chunks/Chunk.js';
import { CHUNK_SIZE, setTileAt } from '../chunks/Chunk.js';
import type { Tile, TerrainType, BiomeType } from '../chunks/Tile.js';
import { PerlinNoise } from './PerlinNoise.js';
import { createTree } from '../entities/TreeEntity.js';
import { createRock } from '../entities/RockEntity.js';
import { createLLMAgent } from '../entities/AgentEntity.js';

/**
 * Generates terrain using Perlin noise.
 */
export class TerrainGenerator {
  private elevationNoise: PerlinNoise;
  private moistureNoise: PerlinNoise;
  private temperatureNoise: PerlinNoise;
  private seed: string;

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

        // Place LLM agents in plains and grassy areas (very sparse)
        if ((tile.terrain === 'grass' || tile.terrain === 'dirt') && tile.biome === 'plains') {
          if (Math.random() > 0.998) {
            // 0.2% chance - very rare
            // All agents are now LLM-controlled
            createLLMAgent(world, worldX + 0.5, worldY + 0.5, 2.0);
          }
        }
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

    // Normalize moisture and fertility (0-1 range)
    const normalizedMoisture = (moisture + 1) / 2;
    let fertility = (moisture + 1) / 2;

    // Adjust fertility based on terrain
    if (terrain === 'water' || terrain === 'stone') {
      fertility = 0;
    } else if (terrain === 'sand') {
      fertility *= 0.3;
    } else if (terrain === 'forest') {
      fertility *= 1.2;
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
      composted: false,
    };
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
}
