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

        // === FOREST PLANT PLACEMENT (density-based) ===
        if (tile.terrain === 'forest' || (tile.biome === 'forest' && tile.terrain === 'grass')) {
          // Reconstruct forest density using same noise as generateTile
          const regionalScale = 0.0005;
          const detailScale = 0.005;

          const densityNoise = this.elevationNoise.octaveNoise(
            worldX * regionalScale * 0.8,
            worldY * regionalScale * 0.8,
            3,
            0.6
          );

          const clearingNoise = this.moistureNoise.octaveNoise(
            worldX * detailScale,
            worldY * detailScale,
            4,
            0.5
          );

          let forestDensity: string;
          if (clearingNoise < -0.4) {
            forestDensity = 'clearing';
          } else if (densityNoise > 0.3) {
            forestDensity = 'dense';
          } else if (densityNoise > 0.0) {
            forestDensity = 'young';
          } else if (densityNoise > -0.3) {
            forestDensity = 'open';
          } else {
            forestDensity = 'edge';
          }

          // Dense old-growth forest
          if (forestDensity === 'dense' && placementValue > -0.3) {
            // Trees - 80% chance
            if (Math.random() > 0.2) {
              const treeType = Math.random();
              if (treeType < 0.6) {
                // 60% oak trees (6-15 voxels)
                const treeHeight = 6 + Math.floor(Math.random() * 10);
                createTree(world, worldX, worldY, treeHeight);
              } else if (treeType < 0.9) {
                // 30% pine trees (8-18 voxels)
                const treeHeight = 8 + Math.floor(Math.random() * 11);
                createTree(world, worldX, worldY, treeHeight);
              } else {
                // 10% generic trees (4-12 voxels)
                const treeHeight = 4 + Math.floor(Math.random() * 9);
                createTree(world, worldX, worldY, treeHeight);
              }
            }
            // Understory plants
            else if (Math.random() < 0.5) {
              // 50% chance for mushrooms
              createLeafPile(world, worldX, worldY); // Placeholder - mushrooms not yet implemented
            } else if (Math.random() < 0.4) {
              // 40% chance for ferns
              createLeafPile(world, worldX, worldY); // Placeholder - ferns not yet implemented
            }
            // Moss - 60% chance
            if (Math.random() < 0.6) {
              // Moss patch (not yet implemented, using leaf pile as placeholder)
            }
            // Leaf piles - 40% chance
            if (Math.random() < 0.4) {
              createLeafPile(world, worldX, worldY);
            }
          }
          // Young forest
          else if (forestDensity === 'young' && placementValue > -0.2) {
            // Trees - 60% chance
            if (Math.random() > 0.4) {
              const treeType = Math.random();
              if (treeType < 0.4) {
                // 40% oak trees
                const treeHeight = 6 + Math.floor(Math.random() * 10);
                createTree(world, worldX, worldY, treeHeight);
              } else if (treeType < 0.8) {
                // 40% pine trees
                const treeHeight = 8 + Math.floor(Math.random() * 11);
                createTree(world, worldX, worldY, treeHeight);
              } else {
                // 20% generic trees
                const treeHeight = 4 + Math.floor(Math.random() * 9);
                createTree(world, worldX, worldY, treeHeight);
              }
            }
            // Understory - 30% mushrooms, 30% ferns, 40% moss
            else if (Math.random() < 0.3) {
              createLeafPile(world, worldX, worldY); // Mushroom placeholder
            }
            // Leaf piles - 30% chance
            if (Math.random() < 0.3) {
              createLeafPile(world, worldX, worldY);
            }
          }
          // Open woodland
          else if (forestDensity === 'open' && placementValue > -0.1) {
            // Trees - 30% chance
            if (Math.random() > 0.7) {
              const treeType = Math.random();
              if (treeType < 0.3) {
                // 30% oak trees
                const treeHeight = 6 + Math.floor(Math.random() * 10);
                createTree(world, worldX, worldY, treeHeight);
              } else if (treeType < 0.6) {
                // 30% pine trees
                const treeHeight = 8 + Math.floor(Math.random() * 11);
                createTree(world, worldX, worldY, treeHeight);
              } else {
                // 40% generic trees
                const treeHeight = 4 + Math.floor(Math.random() * 9);
                createTree(world, worldX, worldY, treeHeight);
              }
            }
            // Understory - 20% mushrooms, 20% ferns, 30% moss
            // Leaf piles - 20% chance
            if (Math.random() < 0.2) {
              createLeafPile(world, worldX, worldY);
            }
          }
          // Forest clearings (meadow-like)
          else if (forestDensity === 'clearing') {
            // No trees, wildflowers and grass
            if (Math.random() < 0.6) {
              createFiberPlant(world, worldX, worldY); // Wildflower placeholder
            }
            // Grass - 40% chance
            if (Math.random() < 0.4) {
              createFiberPlant(world, worldX, worldY); // Grass placeholder
            }
            // Berry bushes - 20% chance
            if (Math.random() < 0.2) {
              createFiberPlant(world, worldX, worldY); // Berry bush placeholder
            }
          }
          // Forest edge/ecotone
          else if (forestDensity === 'edge' && placementValue > 0.0) {
            // Trees - 10-20% chance
            if (Math.random() > 0.85) {
              const treeHeight = 4 + Math.floor(Math.random() * 9);
              createTree(world, worldX, worldY, treeHeight);
            }
          }
        }
        // === PLAINS PLANT PLACEMENT (meadow-based) ===
        else if (tile.terrain === 'grass' || (tile.biome === 'plains' && tile.terrain === 'dirt')) {
          // Reconstruct plains features using same noise as generateTile
          const regionalScale = 0.0005;

          const meadowNoise = this.moistureNoise.octaveNoise(
            worldX * regionalScale,
            worldY * regionalScale,
            3,
            0.6
          );

          const outcroppingNoise = this.elevationNoise.octaveNoise(
            worldX * regionalScale * 2,
            worldY * regionalScale * 2,
            2,
            0.6
          );

          const isRockyPatch = outcroppingNoise > 0.35;
          const isMeadowFlowery = !isRockyPatch && meadowNoise > 0.2;
          const isMeadowGrassy = !isRockyPatch && meadowNoise <= 0.2;

          // Rocky patches - hardy plants and rocks
          if (isRockyPatch) {
            // Grass - 50% chance
            if (Math.random() < 0.5) {
              createFiberPlant(world, worldX, worldY); // Grass placeholder
            }
            // Sage - 30% chance
            if (Math.random() < 0.3) {
              createFiberPlant(world, worldX, worldY); // Sage placeholder
            }
            // Yarrow - 20% chance
            if (Math.random() < 0.2) {
              createFiberPlant(world, worldX, worldY); // Yarrow placeholder
            }
            // Thistle - 40% chance
            if (Math.random() < 0.4) {
              createFiberPlant(world, worldX, worldY); // Thistle placeholder
            }
            // Rocks - higher density (10-15%)
            if (placementValue < -0.2 && Math.random() < 0.12) {
              createRock(world, worldX, worldY);
            }
          }
          // Meadow patches (flower-rich)
          else if (isMeadowFlowery && placementValue > -0.1) {
            // Wildflowers - 60% chance
            if (Math.random() < 0.6) {
              createFiberPlant(world, worldX, worldY); // Wildflower placeholder
            }
            // Clover - 40% chance
            if (Math.random() < 0.4) {
              createFiberPlant(world, worldX, worldY); // Clover placeholder
            }
            // Yarrow - 20% chance
            if (Math.random() < 0.2) {
              createFiberPlant(world, worldX, worldY); // Yarrow placeholder
            }
            // Sage - 15% chance
            if (Math.random() < 0.15) {
              createFiberPlant(world, worldX, worldY); // Sage placeholder
            }
            // Grass - 30% chance
            if (Math.random() < 0.3) {
              createFiberPlant(world, worldX, worldY); // Grass placeholder
            }
          }
          // Grassland (grass-heavy)
          else if (isMeadowGrassy && placementValue > 0.0) {
            // Grass - 70% chance
            if (Math.random() < 0.7) {
              createFiberPlant(world, worldX, worldY); // Grass placeholder
            }
            // Clover - 30% chance
            if (Math.random() < 0.3) {
              createFiberPlant(world, worldX, worldY); // Clover placeholder
            }
            // Wild onion - 10% chance
            if (Math.random() < 0.1) {
              createFiberPlant(world, worldX, worldY); // Wild onion placeholder
            }
            // Thistle - 10% chance
            if (Math.random() < 0.1) {
              createFiberPlant(world, worldX, worldY); // Thistle placeholder
            }
            // Scattered trees - 5% chance
            if (placementValue > 0.3 && Math.random() < 0.05) {
              const treeHeight = Math.floor(Math.random() * 3);
              createTree(world, worldX, worldY, treeHeight);
            }
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

    // === FOREST DENSITY GRADIENTS ===
    // Creates realistic forest structure: dense old-growth, young forest, sparse woodland, clearings.
    //
    // Forest types implemented:
    // - DENSE OLD-GROWTH: 60-80% tree density, elevation boost +0.05
    // - YOUNG FOREST: 40-50% tree density, standard elevation
    // - OPEN WOODLAND: 20-30% tree density, slight elevation reduction -0.02
    // - FOREST CLEARINGS: 0% trees (pure grass), meadow-like, elevation reduction -0.03
    // - FOREST EDGE/ECOTONE: Transition zone to plains (10-20% trees)
    //
    // Density levels stored for plant placement later.
    let forestDensity: string | null = null;

    const isForestRegion = moisture > 0.2 && temperature > -0.2;

    if (isForestRegion) {
      // Multiple noise layers for forest density

      // 1. Regional scale for forest density gradient
      const densityNoise = this.elevationNoise.octaveNoise(
        worldX * regionalScale * 0.8,
        worldY * regionalScale * 0.8,
        3,
        0.6
      );

      // 2. Detail scale for clearing placement
      const clearingNoise = this.moistureNoise.octaveNoise(
        worldX * detailScale,
        worldY * detailScale,
        4,
        0.5
      );

      // 3. Edge detection (transition to plains)
      const edgeNoise = this.temperatureNoise.octaveNoise(
        worldX * regionalScale * 1.2,
        worldY * regionalScale * 1.2,
        2,
        0.5
      );

      // Determine forest density level
      if (clearingNoise < -0.4) {
        // Forest clearing - no trees, meadow-like
        forestDensity = 'clearing';
        elevation = elevation - 0.03;
      } else if (densityNoise > 0.3) {
        // Dense old-growth forest
        forestDensity = 'dense';
        elevation = elevation + 0.05;
      } else if (densityNoise > 0.0) {
        // Young forest
        forestDensity = 'young';
        // Standard elevation, no change
      } else if (densityNoise > -0.3) {
        // Open woodland
        forestDensity = 'open';
        elevation = elevation - 0.02;
      } else {
        // Forest edge/ecotone
        forestDensity = 'edge';
        elevation = elevation - 0.01;
      }

      // Blend with moisture/temperature for realistic transitions
      if (moisture < 0.3) {
        // Drier forest areas tend to be more sparse
        if (forestDensity === 'dense') forestDensity = 'young';
        else if (forestDensity === 'young') forestDensity = 'open';
      }
    }

    // === PLAINS GEOLOGICAL REALISM ===
    // Simulates realistic plains terrain with rolling hills, meadows, and natural features.
    //
    // Features implemented:
    // - ROLLING HILLS: Gentle undulations using ridged noise (±0.1 to 0.15 elevation change)
    // - MEADOW PATCHES: Flower-rich vs grass-heavy areas using regional noise
    // - ROCKY OUTCROPPINGS: Occasional small rock formations (10-15% of plains)
    // - GENTLE VALLEYS: Shallow drainage patterns using moisture noise
    // - ANCIENT STONE CIRCLES: Very rare (0.3% chance) landmark features
    //
    // Elevation modulation:
    // - Hills add +0.05 to +0.15 elevation variation
    // - Valleys reduce elevation by -0.03 to -0.05
    // - Outcroppings add +0.02 to +0.04 local elevation
    //
    // Meadow types stored for plant placement:
    // - meadow_flowery: High wildflower density
    // - meadow_grassy: High grass density
    // - meadow_rocky: Higher rock and hardy plant density
    let plainsFeature: string | null = null;

    const isPlainsRegion = elevation > -0.1 && elevation < 0.15 && moisture > -0.2;

    if (isPlainsRegion) {
      // Multiple noise layers for different geological features

      // 1. Regional meadow differentiation (flower-rich vs grass-heavy areas)
      const meadowNoise = this.moistureNoise.octaveNoise(
        worldX * regionalScale,
        worldY * regionalScale,
        3,
        0.6
      );

      // 2. Detail scale for small rolling hills
      const hillNoise = this.elevationNoise.octaveNoise(
        worldX * detailScale * 0.8,
        worldY * detailScale * 0.8,
        4,
        0.5
      );

      // 3. Continental scale for subtle regional variation
      const regionalVariation = this.temperatureNoise.octaveNoise(
        worldX * continentalScale * 3,
        worldY * continentalScale * 3,
        2,
        0.5
      );

      // 4. Valley detection (shallow drainage patterns)
      const valleyNoise = this.moistureNoise.octaveNoise(
        worldX * regionalScale * 1.5,
        worldY * regionalScale * 1.5,
        3,
        0.55
      );
      const isValley = Math.abs(valleyNoise) < 0.1;

      // 5. Rocky outcropping detection
      const outcroppingNoise = this.elevationNoise.octaveNoise(
        worldX * regionalScale * 2,
        worldY * regionalScale * 2,
        2,
        0.6
      );
      const isRockyPatch = outcroppingNoise > 0.35;

      // Determine meadow type for plant placement
      if (isRockyPatch) {
        plainsFeature = 'meadow_rocky';
      } else if (meadowNoise > 0.2) {
        plainsFeature = 'meadow_flowery';
      } else {
        plainsFeature = 'meadow_grassy';
      }

      // Apply geological features

      // Valleys - gentle depression
      if (isValley) {
        const valleyDepth = (0.1 - Math.abs(valleyNoise)) / 0.1; // 0-1
        elevation = elevation - valleyDepth * 0.04;
      }
      // Rocky outcroppings - slight elevation increase
      else if (isRockyPatch) {
        const outcroppingHeight = (outcroppingNoise - 0.35) / 0.65; // 0-1
        elevation = elevation + outcroppingHeight * 0.03;
      }
      // Rolling hills - gentle undulation
      else {
        const hillHeight = hillNoise * 0.12; // ±0.12 elevation change
        elevation = elevation + hillHeight;

        // Add subtle regional variation
        elevation = elevation + regionalVariation * 0.05;
      }
    }

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
