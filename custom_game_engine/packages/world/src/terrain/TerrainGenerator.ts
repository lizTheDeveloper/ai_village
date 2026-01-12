import type { WorldMutator } from '@ai-village/core';
import type { Chunk } from '../chunks/Chunk.js';
import { CHUNK_SIZE, setTileAt } from '../chunks/Chunk.js';
import type { Tile, TerrainType, BiomeType } from '../chunks/Tile.js';
import { PerlinNoise } from './PerlinNoise.js';
import { createTree } from '../entities/TreeEntity.js';
import { createRock } from '../entities/RockEntity.js';
import { createMountain } from '../entities/MountainEntity.js';
import { createLeafPile } from '../entities/LeafPileEntity.js';
import { createFiberPlant } from '../entities/FiberPlantEntity.js';
import {
  createIronDeposit,
  createCoalDeposit,
  createCopperDeposit,
  createGoldDeposit,
} from '../entities/OreDepositEntity.js';
import {
  WildAnimalSpawningSystem,
  getMapKnowledge,
  SECTOR_SIZE,
  type GodCraftedDiscoverySystem,
} from '@ai-village/core';

/**
 * Generates terrain using Perlin noise.
 */
export class TerrainGenerator {
  private elevationNoise: PerlinNoise;
  private moistureNoise: PerlinNoise;
  private temperatureNoise: PerlinNoise;
  private seed: string;
  private animalSpawner: WildAnimalSpawningSystem;
  private godCraftedSpawner?: GodCraftedDiscoverySystem;

  // Terrain thresholds
  private readonly WATER_LEVEL = -0.3;
  private readonly SAND_LEVEL = -0.1;
  private readonly STONE_LEVEL = 0.5;

  constructor(seed: string = 'default', godCraftedSpawner?: GodCraftedDiscoverySystem) {
    this.seed = seed;
    const seedHash = this.hashString(seed);

    this.elevationNoise = new PerlinNoise(seedHash);
    this.moistureNoise = new PerlinNoise(seedHash + 1000);
    this.temperatureNoise = new PerlinNoise(seedHash + 2000);
    this.animalSpawner = new WildAnimalSpawningSystem();
    this.godCraftedSpawner = godCraftedSpawner;
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

    // Update MapKnowledge sector terrain data for pathfinding
    this.updateSectorTerrainData(chunk);

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

      // Spawn god-crafted content in chunk
      if (this.godCraftedSpawner) {
        this.godCraftedSpawner.spawnContentInChunk(world, {
          x: chunk.x,
          y: chunk.y,
          biome: chunkBiome,
          size: CHUNK_SIZE,
        });
      }
    }

    chunk.generated = true;
  }

  /**
   * Update MapKnowledge sector terrain data from chunk tiles.
   * Sectors may span multiple chunks, so we collect tiles per sector.
   */
  private updateSectorTerrainData(chunk: Chunk): void {
    const mapKnowledge = getMapKnowledge();

    // Group tiles by sector
    const sectorTiles = new Map<string, Array<{ elevation: number; terrain: string }>>();

    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = chunk.x * CHUNK_SIZE + localX;
        const worldY = chunk.y * CHUNK_SIZE + localY;
        const tile = chunk.tiles[localY * CHUNK_SIZE + localX];

        if (!tile) continue;

        // Calculate sector coordinates
        const sectorX = Math.floor(worldX / SECTOR_SIZE);
        const sectorY = Math.floor(worldY / SECTOR_SIZE);
        const key = `${sectorX},${sectorY}`;

        if (!sectorTiles.has(key)) {
          sectorTiles.set(key, []);
        }

        sectorTiles.get(key)!.push({
          elevation: tile.elevation,
          terrain: tile.terrain,
        });
      }
    }

    // Update each sector
    for (const [key, tiles] of sectorTiles) {
      const parts = key.split(',') as [string, string];
      const sectorX = parseInt(parts[0], 10);
      const sectorY = parseInt(parts[1], 10);
      mapKnowledge.updateSectorTerrain(sectorX, sectorY, tiles);
    }
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

        // Skip water tiles - no land entities in water
        if (tile.terrain === 'water') continue;

        // Get placement value
        const placementValue = placementNoise.noise(worldX * 0.1, worldY * 0.1);

        // Place trees in forests and grassy areas
        if (tile.terrain === 'forest' && placementValue > -0.2) {
          if (Math.random() > 0.2) {
            // 80% chance for dense forests
            // Random tree height: 1-4 tiles (taller in forests)
            const treeHeight = 1 + Math.floor(Math.random() * 4);
            createTree(world, worldX, worldY, treeHeight);
          }
        } else if (tile.terrain === 'grass' && placementValue > 0.1) {
          if (Math.random() > 0.7) {
            // 30% chance for scattered trees on grass
            // Shorter trees on grass: 0-2 tiles
            const treeHeight = Math.floor(Math.random() * 3);
            createTree(world, worldX, worldY, treeHeight);
          }
        }

        // Place rocks in mountains and stone areas
        if (tile.terrain === 'stone' && placementValue < -0.2) {
          if (Math.random() > 0.5) {
            // 50% chance (increased from 20% for better resource availability)
            createRock(world, worldX, worldY);
          }
        }

        // Place mountains in mountain biome
        if (tile.biome === 'mountains' && placementValue > 0.3) {
          if (Math.random() > 0.85) {
            // 15% chance for mountain peaks
            // Height based on noise value - higher placement value = taller peak
            const mountainHeight = 3 + Math.floor((placementValue - 0.3) * 15);
            createMountain(world, worldX, worldY, mountainHeight);
          }
        }

        // Place rocks in sand/beach areas
        if (tile.terrain === 'sand' && placementValue < 0) {
          if (Math.random() > 0.9) {
            // 10% chance for rocks on beaches
            createRock(world, worldX, worldY);
          }
        }

        // === DESERT ROCK PLACEMENT (geologically realistic) ===
        if (tile.biome === 'desert') {
          // Recompute geological features for rock placement
          const regionalScale = 0.0005;
          const continentalScale = 0.000005;
          const detailScale = 0.005;

          // Mesa detection
          const mesaNoise = this.elevationNoise.octaveNoise(
            worldX * continentalScale * 4,
            worldY * continentalScale * 4,
            2,
            0.7
          );
          const isMesaRegion = mesaNoise > 0.4;
          const mesaEdgeNoise = this.elevationNoise.octaveNoise(
            worldX * regionalScale * 3,
            worldY * regionalScale * 3,
            2,
            0.5
          );
          const isMesaEdge = isMesaRegion && mesaEdgeNoise < -0.15;

          // Arroyo detection
          const arroyoNoise = this.moistureNoise.octaveNoise(
            worldX * regionalScale * 1.2,
            worldY * regionalScale * 1.2,
            4,
            0.55
          );
          const isArroyo = Math.abs(arroyoNoise) < 0.08;
          const isArroyoBank = Math.abs(arroyoNoise) > 0.06 && Math.abs(arroyoNoise) < 0.12;

          // Canyon detection
          const canyonNoise = this.moistureNoise.octaveNoise(
            worldX * regionalScale * 0.8,
            worldY * regionalScale * 0.8,
            3,
            0.6
          );
          const isCanyon = Math.abs(canyonNoise) < 0.12;
          const isCanyonWall = Math.abs(canyonNoise) > 0.10 && Math.abs(canyonNoise) < 0.18;

          // Dune field detection
          const duneNoise = this.temperatureNoise.octaveNoise(
            worldX * regionalScale * 0.6,
            worldY * regionalScale * 0.6,
            3,
            0.6
          );
          const isDuneField = duneNoise > 0.2 && !isMesaRegion;

          // Rock placement based on geological features
          // Priority order matches erosion patterns: mesa edges → canyon walls → arroyo banks → floors → outcrops → dunes

          // 1. Mesa edges and buttes - dense rock walls (stratified cliffs)
          if (isMesaEdge) {
            if (Math.random() > 0.15) {
              // 85% chance - forms continuous rock walls on mesa cliffs
              createRock(world, worldX, worldY);
            }
          }
          // 1a. Rock spires/hoodoos on mesa tops (isolated erosion remnants)
          else if (isMesaRegion && !isMesaEdge && placementValue > 0.4) {
            if (Math.random() > 0.90) {
              // 10% chance - tall rock spires rising from mesa surface
              createRock(world, worldX, worldY);
            }
          }
          // 2. Canyon walls - stratified rock layers
          else if (isCanyonWall) {
            if (Math.random() > 0.20) {
              // 80% chance - visible canyon walls
              createRock(world, worldX, worldY);
            }
          }
          // 3. Arroyo banks - erosion debris
          else if (isArroyoBank) {
            if (Math.random() > 0.35) {
              // 65% chance - rocks exposed by water erosion
              createRock(world, worldX, worldY);
            }
          }
          // 4. Canyon/arroyo floors - scattered boulders
          else if ((isCanyon || isArroyo) && placementValue < -0.1) {
            if (Math.random() > 0.70) {
              // 30% chance - fallen rocks and debris
              createRock(world, worldX, worldY);
            }
          }
          // 5. Rocky desert outcroppings (not dunes)
          else if (!isDuneField && placementValue < -0.25) {
            if (Math.random() > 0.25) {
              // 75% chance in outcrop zones - hoodoos and rock formations
              createRock(world, worldX, worldY);
            }
          }
          // 6. Dune fields - very rare rocks (mostly sandy)
          else if (isDuneField && placementValue < -0.5) {
            if (Math.random() > 0.92) {
              // 8% chance - occasional exposed bedrock in dunes
              createRock(world, worldX, worldY);
            }
          }
        }

        // Scatter some rocks near spawn point (within ~30 tiles of origin) for early game
        const distFromOrigin = Math.sqrt(worldX * worldX + worldY * worldY);
        if (distFromOrigin < 30 && tile.terrain === 'grass') {
          if (Math.random() > 0.95) {
            // 5% chance for rocks on grass near spawn
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

        // Place ore deposits in stone/mountain terrain
        // Use separate noise layers for each ore type to create natural veins
        if (tile.terrain === 'stone') {
          const oreNoise = placementNoise.noise(worldX * 0.15, worldY * 0.15);

          // Iron ore - common, 15% chance in stone
          if (oreNoise > 0.3 && Math.random() > 0.85) {
            createIronDeposit(world, worldX, worldY);
          }
          // Coal - common, 10% chance in stone (different noise range)
          else if (oreNoise < -0.3 && Math.random() > 0.9) {
            createCoalDeposit(world, worldX, worldY);
          }
          // Copper - uncommon, 5% chance in stone
          else if (oreNoise > 0.1 && oreNoise < 0.3 && Math.random() > 0.95) {
            createCopperDeposit(world, worldX, worldY);
          }
          // Gold - rare, 2% chance only in deep stone (high elevation)
          else if (oreNoise < -0.5 && Math.random() > 0.98) {
            createGoldDeposit(world, worldX, worldY);
          }
        }

        // Agent spawning disabled - agents are now created explicitly in main.ts
        // This allows precise control over agent count and starting positions
      }
    }
  }

  /**
   * Ridged noise - creates sharp mountain ridges and cliffs.
   * Based on technique from Red Blob Games and Minecraft terrain generation.
   * Uses absolute value to create sharp peaks instead of smooth hills.
   */
  private ridgedNoise(x: number, y: number): number {
    // Use 4 octaves for detailed ridges
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    const persistence = 0.5;
    const lacunarity = 2;

    for (let i = 0; i < 4; i++) {
      // Get noise value and apply ridge transformation
      const noise = this.elevationNoise.noise(x * frequency, y * frequency);
      // Ridge: 2 * (0.5 - abs(0.5 - noise)) creates sharp peaks
      const ridge = 2 * (0.5 - Math.abs(0.5 - noise));
      value += ridge * amplitude;

      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // Normalize to -1 to 1 range
    return (value / 2) - 0.5;
  }

  /**
   * Generate a single tile at world coordinates.
   *
   * Scale notes (1 tile = 1 meter, humans are 2 tiles tall):
   * - Local terrain features (hills, groves): 100-500m = scale 0.002-0.01
   * - Regional features (forests, valleys): 1-5km = scale 0.0002-0.001
   * - Biome-scale features (climate zones): 10-50km = scale 0.00002-0.0001
   * - Continental features (land masses): 100-500km = scale 0.000002-0.00001
   */
  private generateTile(worldX: number, worldY: number): Tile {
    // Terrain detail scale (local hills, rocks, small features: ~200m)
    const detailScale = 0.005;

    // Regional scale (forests, valleys, rivers: ~2km)
    const regionalScale = 0.0005;

    // Biome scale (climate zones, large biomes: ~20km)
    const biomeScale = 0.00005;

    // Continental scale (land masses, oceans: ~200km)
    const continentalScale = 0.000005;

    // Multi-octave noise for base elevation (smooth rolling terrain)
    // Using 6 octaves with persistence 0.5 for natural fractal detail
    const baseElevation = this.elevationNoise.octaveNoise(worldX * detailScale, worldY * detailScale, 6, 0.5);

    // Continentalness - determines if area is ocean/land/mountains (large scale)
    const continentalness = this.elevationNoise.octaveNoise(
      worldX * continentalScale,
      worldY * continentalScale,
      3,
      0.6
    );

    // Ridged noise for sharp mountain peaks and cliffs (abs value creates ridges)
    const ridgedNoise = this.ridgedNoise(worldX * regionalScale * 2, worldY * regionalScale * 2);

    // Erosion factor - flatter areas vs rough terrain
    const erosion = this.moistureNoise.octaveNoise(
      worldX * regionalScale,
      worldY * regionalScale,
      4,
      0.5
    );

    // Flatten spawn area (within 500 tiles / 500m of origin for gentler starting terrain)
    const distanceFromSpawn = Math.sqrt(worldX * worldX + worldY * worldY);
    const spawnFlatten = Math.max(0, 1 - distanceFromSpawn / 500); // 1.0 at origin, 0.0 at distance 500+

    // Blend elevation based on continentalness and erosion
    let elevation = baseElevation * 0.6 + continentalness * 0.4;

    // Add ridges in mountainous areas, smooth in eroded areas
    if (continentalness > 0.3) {
      const ridgeStrength = (continentalness - 0.3) * (1 - erosion * 0.5);
      elevation = elevation * (1 - ridgeStrength) + ridgedNoise * ridgeStrength;
    }

    // Moisture uses biome scale for climate zones (~20km patterns)
    // NOTE: Calculated early because desert geological features need moisture/temperature
    const moisture = this.moistureNoise.octaveNoise(
      worldX * biomeScale,
      worldY * biomeScale,
      3,
      0.5
    );
    // Temperature uses continental scale for large climate bands (~200km patterns)
    const temperature = this.temperatureNoise.octaveNoise(
      worldX * continentalScale * 2,
      worldY * continentalScale * 2,
      2,
      0.5
    );

    // === DESERT GEOLOGICAL REALISM ===
    // Simulates realistic desert terrain formation through erosion and geological processes.
    //
    // Features implemented:
    // - MESAS: Flat-topped highlands formed by differential erosion of sedimentary layers
    // - BUTTES: Isolated mesa remnants created by edge erosion
    // - ARROYOS: Narrow dry riverbeds carved by ancient flash floods (deepest channels)
    // - CANYONS: Wider erosion valleys from sustained water flow
    // - DUNE FIELDS: Sandy desert areas with rolling wave patterns from wind erosion
    // - ROCKY DESERT: Bedrock exposure with minimal sand cover
    // - HOODOOS/SPIRES: Tall rock formations on mesa tops (erosion remnants)
    //
    // Geological priority (features applied in order):
    // 1. Arroyos cut deepest (ancient water erosion)
    // 2. Canyons cut through most terrain (sustained erosion)
    // 3. Mesas create raised plateaus with flat tops
    // 4. Dune fields add gentle rolling topography
    // 5. Rocky desert maintains base elevation
    //
    // Rock placement follows natural erosion patterns:
    // - Mesa cliff edges: 85% density (stratified walls)
    // - Canyon walls: 80% density (exposed layers)
    // - Arroyo banks: 65% density (erosion debris)
    // - Channel floors: 30% density (fallen boulders)
    // - Rocky outcrops: 75% density (bedrock formations)
    // - Dune fields: 8% density (rare bedrock exposure)
    //
    const isDryAndHot = moisture < -0.3 && temperature > 0.2;

    if (isDryAndHot && elevation > -0.1) {
      // Multiple noise layers for different geological features

      // 1. Mesa/plateau formation (large flat-topped highlands)
      const mesaNoise = this.elevationNoise.octaveNoise(
        worldX * continentalScale * 4,
        worldY * continentalScale * 4,
        2,
        0.7
      );
      const isMesaRegion = mesaNoise > 0.4;

      // 2. Arroyo (dry riverbed) - ancient water erosion channels
      const arroyoNoise = this.moistureNoise.octaveNoise(
        worldX * regionalScale * 1.2,
        worldY * regionalScale * 1.2,
        4,
        0.55
      );
      const isArroyo = Math.abs(arroyoNoise) < 0.08; // Very narrow channels

      // 3. Dune field detection (sandy desert)
      const duneNoise = this.temperatureNoise.octaveNoise(
        worldX * regionalScale * 0.6,
        worldY * regionalScale * 0.6,
        3,
        0.6
      );
      const isDuneField = duneNoise > 0.2 && !isMesaRegion;

      // 4. Canyon/wash system (deeper erosion)
      const canyonNoise = this.moistureNoise.octaveNoise(
        worldX * regionalScale * 0.8,
        worldY * regionalScale * 0.8,
        3,
        0.6
      );
      const isCanyon = Math.abs(canyonNoise) < 0.12;

      // Apply geological features in priority order

      // Arroyos cut through everything (deepest erosion channels)
      if (isArroyo) {
        const arroyoDepth = (0.08 - Math.abs(arroyoNoise)) / 0.08; // 0-1
        elevation = elevation - arroyoDepth * 0.5; // Deep cut channels
      }
      // Canyons cut through most terrain
      else if (isCanyon) {
        const canyonDepth = (0.12 - Math.abs(canyonNoise)) / 0.12; // 0-1
        elevation = elevation - canyonDepth * 0.35;
      }
      // Mesa regions - raise elevation and flatten top
      else if (isMesaRegion) {
        const mesaHeight = (mesaNoise - 0.4) / 0.6; // 0-1, taller with higher noise
        const mesaTop = 0.4 + mesaHeight * 0.4; // Flat top at 0.4-0.8 range

        // Flatten the mesa top (reduce fractal detail on top)
        const flattenFactor = mesaHeight * 0.7;
        elevation = elevation * (1 - flattenFactor) + mesaTop * flattenFactor;

        // Add some erosion at mesa edges
        const edgeNoise = this.elevationNoise.octaveNoise(
          worldX * regionalScale * 3,
          worldY * regionalScale * 3,
          2,
          0.5
        );
        if (edgeNoise < -0.2) {
          // Eroded edge - creates buttes and isolated formations
          elevation = elevation - 0.2;
        }
      }
      // Dune fields - add rolling wave patterns
      else if (isDuneField) {
        const duneWaves = this.temperatureNoise.octaveNoise(
          worldX * detailScale * 2,
          worldY * detailScale * 2,
          3,
          0.7
        );
        // Gentle rolling dunes - add small elevation variation
        elevation = elevation + duneWaves * 0.15;
      }
      // Rocky desert (default) - keep base elevation with erosion
      else {
        // Slight erosion in rocky desert areas
        elevation = elevation * 0.9;
      }
    }

    // Flatten spawn area - lerp toward 0 elevation
    elevation = elevation * (1 - spawnFlatten * 0.8);

    // Determine terrain and biome
    // (moisture and temperature already calculated above for desert features)
    const { terrain, biome } = this.determineTerrainAndBiome(
      elevation,
      moisture,
      temperature
    );

    // Calculate tile Z elevation based on improved noise
    // Scale: water = -2 to -1, plains = -1 to 2, hills = 2-6, mountains = 6-15
    let tileElevation = 0;
    if (biome === 'ocean' || biome === 'river') {
      // Water is below sea level
      tileElevation = Math.floor((elevation + 1) * -1.5); // -3 to -1
    } else if (biome === 'mountains') {
      // Mountains use ridged noise for cliffs - map 0.5-1.0 to 6-15
      const mountainFactor = (elevation - this.STONE_LEVEL) / (1 - this.STONE_LEVEL);
      tileElevation = 6 + Math.floor(mountainFactor * 9);
    } else if (elevation > 0.15) {
      // Hills start at lower threshold for more varied terrain
      // Map 0.15-0.5 to elevation 2-6
      const hillFactor = (elevation - 0.15) / (0.5 - 0.15);
      tileElevation = 2 + Math.floor(hillFactor * 4);
    } else if (elevation > -0.1) {
      // Gentle rolling plains - small elevation changes (-1 to 2)
      tileElevation = Math.floor(elevation * 5);
    } else {
      // Low areas (slight depressions) - elevation -1 to 0
      tileElevation = Math.floor(elevation * 3);
    }

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
      elevation: tileElevation,
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

    // Desert (with potential canyon terrain)
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
