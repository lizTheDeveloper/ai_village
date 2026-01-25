import type { WorldMutator } from '@ai-village/core';
import type { Chunk } from '../chunks/Chunk.js';
import { CHUNK_SIZE, setTileAt } from '../chunks/Chunk.js';
import type { Tile, TerrainType, BiomeType, FluidLayer } from '../chunks/Tile.js';
import { createEmptyNeighbors } from '../chunks/TileNeighbors.js';
import {
  getOceanBiomeZone,
  calculatePressure,
  calculateLightLevel,
  calculateWaterTemperature,
} from '../ocean/OceanBiomes.js';
import type { OceanBiomeZone } from '../ocean/OceanBiomes.js';
import { PerlinNoise } from './PerlinNoise.js';
import { createTree } from '../entities/TreeEntity.js';
import { createRock } from '../entities/RockEntity.js';
import { createMountain } from '../entities/MountainEntity.js';
import { createLeafPile } from '../entities/LeafPileEntity.js';
import { createFiberPlant } from '../entities/FiberPlantEntity.js';
import { createBerryBush } from '../entities/BerryBushEntity.js';
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
import type { PlanetConfig } from '../planet/PlanetTypes.js';

/**
 * Generates terrain using Perlin noise.
 *
 * Supports planet-specific terrain generation through PlanetConfig.
 * Planet parameters modify the base noise values to create distinct
 * planetary environments (desert worlds, ice planets, etc.).
 */
export class TerrainGenerator {
  private elevationNoise: PerlinNoise;
  private moistureNoise: PerlinNoise;
  private temperatureNoise: PerlinNoise;
  private seed: string;
  /** Public so BackgroundChunkGenerator can access for entity spawning */
  public animalSpawner: WildAnimalSpawningSystem;
  /** Public so BackgroundChunkGenerator can access for entity spawning */
  public godCraftedSpawner?: GodCraftedDiscoverySystem;

  // Planet configuration (optional - defaults to terrestrial)
  private planetConfig?: PlanetConfig;

  // Planet terrain modifiers (cached from config for performance)
  private tempOffset: number = 0;
  private tempScale: number = 1.0;
  private moistureOffset: number = 0;
  private moistureScale: number = 1.0;
  private elevationOffset: number = 0;
  private elevationScale: number = 1.0;
  private seaLevel: number = -0.3;
  private allowedBiomes?: BiomeType[];

  // Terrain thresholds (can be modified by planet config)
  private WATER_LEVEL = -0.3;
  private readonly SAND_LEVEL = -0.1;
  private readonly STONE_LEVEL = 0.5;

  /**
   * Create a terrain generator.
   *
   * @param seed - Seed for deterministic generation
   * @param godCraftedSpawner - Optional system for spawning god-crafted content
   * @param planetConfig - Optional planet configuration for terrain modifiers
   */
  constructor(
    seed: string = 'default',
    godCraftedSpawner?: GodCraftedDiscoverySystem,
    planetConfig?: PlanetConfig
  ) {
    this.seed = seed;
    const seedHash = this.hashString(seed);

    this.elevationNoise = new PerlinNoise(seedHash);
    this.moistureNoise = new PerlinNoise(seedHash + 1000);
    this.temperatureNoise = new PerlinNoise(seedHash + 2000);
    this.animalSpawner = new WildAnimalSpawningSystem();
    this.godCraftedSpawner = godCraftedSpawner;

    // Apply planet configuration if provided
    if (planetConfig) {
      this.planetConfig = planetConfig;
      this.tempOffset = planetConfig.temperatureOffset ?? 0;
      this.tempScale = planetConfig.temperatureScale ?? 1.0;
      this.moistureOffset = planetConfig.moistureOffset ?? 0;
      this.moistureScale = planetConfig.moistureScale ?? 1.0;
      this.elevationOffset = planetConfig.elevationOffset ?? 0;
      this.elevationScale = planetConfig.elevationScale ?? 1.0;
      this.seaLevel = planetConfig.seaLevel ?? -0.3;
      this.WATER_LEVEL = this.seaLevel;
      this.allowedBiomes = planetConfig.allowedBiomes;
    }
  }

  /**
   * Get the planet configuration.
   */
  getPlanetConfig(): PlanetConfig | undefined {
    return this.planetConfig;
  }

  /**
   * Filter a biome through the allowed list, returning a fallback if not allowed.
   *
   * @param biome - The originally determined biome
   * @param terrain - The terrain type (used for fallback selection)
   * @returns The biome if allowed, or a suitable fallback
   */
  private filterBiome(biome: BiomeType, terrain: TerrainType): BiomeType {
    // If no restrictions, return the original biome
    if (!this.allowedBiomes || this.allowedBiomes.length === 0) {
      return biome;
    }

    // If biome is allowed, return it
    if (this.allowedBiomes.includes(biome)) {
      return biome;
    }

    // Find a suitable fallback based on terrain type
    return this.getFallbackBiome(biome, terrain);
  }

  /**
   * Get a fallback biome when the original isn't allowed on this planet.
   *
   * @param originalBiome - The biome we wanted but isn't allowed
   * @param terrain - The terrain type (helps select appropriate fallback)
   * @returns A fallback biome from the allowed list
   */
  private getFallbackBiome(originalBiome: BiomeType, terrain: TerrainType): BiomeType {
    if (!this.allowedBiomes || this.allowedBiomes.length === 0) {
      return originalBiome;
    }

    // Define fallback chains - each biome maps to preferred alternatives
    const fallbackChains: Record<BiomeType, BiomeType[]> = {
      // -----------------------------------------------------------------------
      // Standard Biomes
      // -----------------------------------------------------------------------

      // Cold biomes
      tundra: ['taiga', 'mountains', 'desert', 'plains'],
      taiga: ['tundra', 'forest', 'woodland', 'plains'],

      // Temperate biomes
      plains: ['savanna', 'woodland', 'scrubland', 'desert'],
      forest: ['woodland', 'taiga', 'jungle', 'plains'],
      woodland: ['forest', 'plains', 'savanna', 'taiga'],

      // Hot/dry biomes
      desert: ['scrubland', 'savanna', 'plains', 'tundra'],
      scrubland: ['desert', 'savanna', 'plains', 'woodland'],
      savanna: ['scrubland', 'plains', 'woodland', 'desert'],

      // Wet biomes
      jungle: ['forest', 'woodland', 'wetland', 'plains'],
      wetland: ['jungle', 'river', 'forest', 'plains'],
      river: ['ocean', 'wetland', 'plains'],
      ocean: ['river', 'wetland'],

      // Elevation biomes
      mountains: ['foothills', 'tundra', 'desert', 'plains'],
      foothills: ['mountains', 'plains', 'woodland', 'scrubland'],

      // -----------------------------------------------------------------------
      // Ice World Biomes
      // -----------------------------------------------------------------------
      glacier: ['frozen_ocean', 'permafrost', 'tundra', 'mountains'],
      frozen_ocean: ['glacier', 'ocean', 'permafrost', 'tundra'],
      ice_caves: ['glacier', 'mountains', 'permafrost', 'tundra'],
      permafrost: ['tundra', 'glacier', 'frozen_ocean', 'plains'],

      // -----------------------------------------------------------------------
      // Volcanic Biomes
      // -----------------------------------------------------------------------
      lava_field: ['ash_plain', 'obsidian_waste', 'caldera', 'mountains'],
      ash_plain: ['obsidian_waste', 'lava_field', 'desert', 'scrubland'],
      obsidian_waste: ['ash_plain', 'lava_field', 'mountains', 'desert'],
      caldera: ['lava_field', 'ash_plain', 'mountains', 'wetland'],
      sulfur_flats: ['ash_plain', 'lava_field', 'desert', 'scrubland'],

      // -----------------------------------------------------------------------
      // Crystal Biomes
      // -----------------------------------------------------------------------
      crystal_plains: ['prismatic_forest', 'quartz_desert', 'plains', 'desert'],
      geode_caves: ['crystal_plains', 'mountains', 'prismatic_forest', 'plains'],
      prismatic_forest: ['crystal_plains', 'forest', 'geode_caves', 'plains'],
      quartz_desert: ['crystal_plains', 'desert', 'prismatic_forest', 'scrubland'],

      // -----------------------------------------------------------------------
      // Fungal Biomes
      // -----------------------------------------------------------------------
      mushroom_forest: ['spore_field', 'mycelium_network', 'forest', 'wetland'],
      spore_field: ['mushroom_forest', 'mycelium_network', 'plains', 'wetland'],
      mycelium_network: ['mushroom_forest', 'spore_field', 'wetland', 'plains'],
      bioluminescent_marsh: ['mycelium_network', 'wetland', 'spore_field', 'jungle'],

      // -----------------------------------------------------------------------
      // Corrupted/Dark Biomes
      // -----------------------------------------------------------------------
      blighted_land: ['shadow_forest', 'corruption_heart', 'plains', 'scrubland'],
      shadow_forest: ['blighted_land', 'forest', 'corruption_heart', 'woodland'],
      corruption_heart: ['blighted_land', 'shadow_forest', 'void_edge', 'mountains'],
      void_edge: ['corruption_heart', 'blighted_land', 'shadow_forest', 'desert'],

      // -----------------------------------------------------------------------
      // Magical Biomes
      // -----------------------------------------------------------------------
      arcane_forest: ['forest', 'mana_spring', 'floating_isle', 'woodland'],
      floating_isle: ['arcane_forest', 'mountains', 'ley_nexus', 'plains'],
      mana_spring: ['arcane_forest', 'ley_nexus', 'wetland', 'forest'],
      ley_nexus: ['mana_spring', 'arcane_forest', 'floating_isle', 'plains'],

      // -----------------------------------------------------------------------
      // Exotic Planet Biomes (scientifically grounded)
      // -----------------------------------------------------------------------
      twilight_zone: ['eternal_day', 'eternal_night', 'plains', 'scrubland'],
      eternal_day: ['twilight_zone', 'desert', 'lava_field', 'plains'],
      eternal_night: ['twilight_zone', 'frozen_ocean', 'glacier', 'tundra'],
      carbon_forest: ['forest', 'mountains', 'plains', 'obsidian_waste'],
      iron_plains: ['plains', 'crater_field', 'regolith_waste', 'mountains'],
      hydrogen_sea: ['ocean', 'frozen_ocean', 'ammonia_ocean', 'wetland'],
      ammonia_ocean: ['hydrogen_sea', 'ocean', 'frozen_ocean', 'wetland'],
      subsurface_ocean: ['frozen_ocean', 'ocean', 'glacier', 'ice_caves'],
      crater_field: ['regolith_waste', 'iron_plains', 'mountains', 'desert'],
      regolith_waste: ['crater_field', 'iron_plains', 'desert', 'plains'],
      hycean_depths: ['ocean', 'subsurface_ocean', 'wetland', 'river'],
    };

    const chain = fallbackChains[originalBiome] || ['plains'];

    // Find the first allowed biome in the fallback chain
    for (const fallback of chain) {
      if (this.allowedBiomes.includes(fallback)) {
        return fallback;
      }
    }

    // Last resort: return the first allowed biome, or 'plains' if list is empty
    return this.allowedBiomes[0] ?? 'plains';
  }

  /**
   * Map exotic biomes to their appropriate terrain types.
   *
   * Standard biomes keep their original terrain, but exotic biomes
   * need exotic terrain types to match their visual appearance.
   */
  private mapBiomeToTerrain(biome: BiomeType, originalTerrain: TerrainType, moisture: number): TerrainType {
    // Exotic biome → terrain mappings
    switch (biome) {
      // -----------------------------------------------------------------------
      // Ice World Biomes
      // -----------------------------------------------------------------------
      case 'glacier':
        return 'ice';
      case 'frozen_ocean':
        return 'water'; // Frozen water surface
      case 'ice_caves':
        return 'ice';
      case 'permafrost':
        return moisture > 0.3 ? 'snow' : 'ice';

      // -----------------------------------------------------------------------
      // Volcanic Biomes
      // -----------------------------------------------------------------------
      case 'lava_field':
        return 'lava';
      case 'ash_plain':
        return 'ash';
      case 'obsidian_waste':
        return 'obsidian';
      case 'caldera':
        return moisture > 0.2 ? 'water' : 'basalt'; // May have crater lakes
      case 'sulfur_flats':
        return 'sulfur';

      // -----------------------------------------------------------------------
      // Crystal Biomes
      // -----------------------------------------------------------------------
      case 'crystal_plains':
        return 'crystal';
      case 'geode_caves':
        return 'geode';
      case 'prismatic_forest':
        return 'prismatic';
      case 'quartz_desert':
        return 'crystal';

      // -----------------------------------------------------------------------
      // Fungal Biomes
      // -----------------------------------------------------------------------
      case 'mushroom_forest':
        return 'mycelium';
      case 'spore_field':
        return 'spore_soil';
      case 'mycelium_network':
        return 'mycelium';
      case 'bioluminescent_marsh':
        return moisture > 0.6 ? 'water' : 'mycelium';

      // -----------------------------------------------------------------------
      // Corrupted/Dark Biomes
      // -----------------------------------------------------------------------
      case 'blighted_land':
        return 'corrupted';
      case 'shadow_forest':
        return 'shadow_grass';
      case 'corruption_heart':
        return 'corrupted';
      case 'void_edge':
        return 'void_stone';

      // -----------------------------------------------------------------------
      // Magical Biomes
      // -----------------------------------------------------------------------
      case 'arcane_forest':
        return 'ley_grass';
      case 'floating_isle':
        return 'aether';
      case 'mana_spring':
        return moisture > 0.5 ? 'water' : 'mana_stone';
      case 'ley_nexus':
        return 'mana_stone';

      // -----------------------------------------------------------------------
      // Exotic Planet Biomes
      // -----------------------------------------------------------------------
      case 'twilight_zone':
        return originalTerrain; // Keep original terrain in habitable zone
      case 'eternal_day':
        return 'sand'; // Scorched earth
      case 'eternal_night':
        return 'ice'; // Frozen side
      case 'carbon_forest':
        return 'carbon';
      case 'iron_plains':
        return 'iron';
      case 'hydrogen_sea':
        return 'hydrogen_ice';
      case 'ammonia_ocean':
        return 'water'; // Ammonia liquid
      case 'subsurface_ocean':
        return 'water';
      case 'crater_field':
        return 'stone';
      case 'regolith_waste':
        return 'sand'; // Dusty regolith
      case 'hycean_depths':
        return 'water';

      // -----------------------------------------------------------------------
      // Standard Biomes - keep original terrain
      // -----------------------------------------------------------------------
      default:
        return originalTerrain;
    }
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
   *
   * Public so BackgroundChunkGenerator can call after worker-generated tiles.
   */
  placeEntities(chunk: Chunk, world: WorldMutator): void {
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
          if (forestDensity === 'dense') {
            // Trees - 85% chance (increased from 80%)
            if (Math.random() > 0.15) {
              const treeType = Math.random();
              if (treeType < 0.6) {
                // 60% oak trees (6-15 voxels)
                const treeHeight = 6 + Math.floor(Math.random() * 10);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'oak-tree' });
              } else if (treeType < 0.9) {
                // 30% pine trees (8-18 voxels)
                const treeHeight = 8 + Math.floor(Math.random() * 11);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
              } else {
                // 10% willow trees near water (4-12 voxels)
                const treeHeight = 4 + Math.floor(Math.random() * 9);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
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
            // Rocks in dense forest - scattered boulders - 8% chance
            if (Math.random() < 0.08) {
              createRock(world, worldX, worldY, 'limestone');
            }
            // Berry bushes - 12% chance in dense forest
            if (Math.random() < 0.12) {
              createBerryBush(world, worldX, worldY);
            }
          }
          // Young forest
          else if (forestDensity === 'young') {
            // Trees - 70% chance (increased from 60%)
            if (Math.random() > 0.3) {
              const treeType = Math.random();
              if (treeType < 0.4) {
                // 40% oak trees
                const treeHeight = 6 + Math.floor(Math.random() * 10);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'oak-tree' });
              } else if (treeType < 0.8) {
                // 40% pine trees
                const treeHeight = 8 + Math.floor(Math.random() * 11);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
              } else {
                // 20% generic trees
                const treeHeight = 4 + Math.floor(Math.random() * 9);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
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
            // Rocks in young forest - 10% chance
            if (Math.random() < 0.10) {
              createRock(world, worldX, worldY, 'limestone');
            }
            // Berry bushes - 15% chance
            if (Math.random() < 0.15) {
              createBerryBush(world, worldX, worldY);
            }
          }
          // Open woodland
          else if (forestDensity === 'open') {
            // Trees - 40% chance (increased from 30%)
            if (Math.random() > 0.6) {
              const treeType = Math.random();
              if (treeType < 0.3) {
                // 30% oak trees
                const treeHeight = 6 + Math.floor(Math.random() * 10);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'oak-tree' });
              } else if (treeType < 0.6) {
                // 30% pine trees
                const treeHeight = 8 + Math.floor(Math.random() * 11);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
              } else {
                // 40% generic trees
                const treeHeight = 4 + Math.floor(Math.random() * 9);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
              }
            }
            // Understory - 20% mushrooms, 20% ferns, 30% moss
            // Leaf piles - 20% chance
            if (Math.random() < 0.2) {
              createLeafPile(world, worldX, worldY);
            }
            // Rocks in open woodland - more exposed - 15% chance
            if (Math.random() < 0.15) {
              createRock(world, worldX, worldY, 'limestone');
            }
            // Berry bushes - 18% chance
            if (Math.random() < 0.18) {
              createBerryBush(world, worldX, worldY);
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
            // Berry bushes - 35% chance (high in clearings - good foraging areas!)
            if (Math.random() < 0.35) {
              createBerryBush(world, worldX, worldY);
            }
            // Rocks in clearings - exposed boulders - 20% chance
            if (Math.random() < 0.20) {
              createRock(world, worldX, worldY, 'limestone');
            }
            // Wild garlic, herbs - 25% chance
            if (Math.random() < 0.25) {
              createFiberPlant(world, worldX, worldY); // Wild garlic/herbs placeholder
            }
          }
          // Forest edge/ecotone
          else if (forestDensity === 'edge') {
            // Trees - 15-20% chance (increased for variety)
            if (Math.random() > 0.82) {
              const treeHeight = 4 + Math.floor(Math.random() * 9);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'oak-tree' });
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
              createRock(world, worldX, worldY, 'limestone');
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
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'oak-tree' });
            }
          }
        }

        // === WOODLAND PLANT PLACEMENT (forest → plains transition) ===
        else if (tile.biome === 'woodland') {
          // Woodland: 30-50% tree density based on moisture
          const moisture = (tile.moisture / 100) * 2 - 1; // Convert back to -1..1
          const woodlandDensity = 0.30 + Math.max(0, Math.min(0.20, (moisture - 0.05) / 0.30 * 0.20));

          if (placementValue > 0.1 && Math.random() < woodlandDensity) {
            // Medium trees (1-3 tiles)
            const treeHeight = 1 + Math.floor(Math.random() * 3);
            createTree(world, worldX, worldY, treeHeight, { speciesId: 'oak-tree' });
          }

          // Leaf piles: 15% chance
          if (Math.random() < 0.15) {
            createLeafPile(world, worldX, worldY);
          }

          // Fiber plants: 20% chance
          if (Math.random() < 0.20) {
            createFiberPlant(world, worldX, worldY);
          }
        }

        // === WETLAND PLANT PLACEMENT (land → water transition) ===
        else if (tile.biome === 'wetland') {
          // Wetland: 20-30% tree density, short trees
          if (placementValue > 0.3 && Math.random() < 0.25) {
            const treeHeight = Math.floor(Math.random() * 3); // 0-2 tiles
            createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
          }

          // High vegetation density (marsh plants, reeds, etc.)
          if (Math.random() < 0.50) {
            createFiberPlant(world, worldX, worldY); // Wetland plants placeholder
          }
        }

        // === SAVANNA PLANT PLACEMENT (hot grassland) ===
        else if (tile.biome === 'savanna') {
          // Savanna: 10-15% tree density, widely spaced trees
          if (placementValue > 0.5 && Math.random() < 0.12) {
            const treeHeight = 1 + Math.floor(Math.random() * 3);
            createTree(world, worldX, worldY, treeHeight, { speciesId: 'oak-tree' });
          }

          // Grass and hardy plants: 35% chance
          if (Math.random() < 0.35) {
            createFiberPlant(world, worldX, worldY);
          }
        }

        // === SCRUBLAND PLANT PLACEMENT (desert → plains transition) ===
        else if (tile.biome === 'scrubland') {
          // Scrubland: sparse vegetation
          // Fiber plants (desert shrubs): 10% chance
          if (Math.random() < 0.10) {
            createFiberPlant(world, worldX, worldY);
          }

          // Rocks: 15-20% density
          if (placementValue < 0.0 && Math.random() < 0.18) {
            createRock(world, worldX, worldY, 'sandstone');
          }
        }

        // === TUNDRA ENTITY PLACEMENT (frozen arctic) ===
        else if (tile.biome === 'tundra') {
          // Reconstruct tundra features for entity placement
          const regionalScale = 0.0005;
          const detailScale = 0.005;

          // Permafrost polygon patterns
          const permafrostNoise = this.moistureNoise.octaveNoise(
            worldX * detailScale * 2,
            worldY * detailScale * 2,
            3,
            0.4
          );

          // Exposed bedrock detection
          const bedrockNoise = this.elevationNoise.octaveNoise(
            worldX * regionalScale * 2,
            worldY * regionalScale * 2,
            2,
            0.6
          );
          const isExposedBedrock = bedrockNoise > 0.4 && tile.moisture < 50;

          // Rocks on exposed bedrock - 40% chance
          if (isExposedBedrock && Math.random() < 0.40) {
            createRock(world, worldX, worldY, 'basalt');
          }

          // Scattered rocks on permafrost - 8% chance
          if (permafrostNoise > 0.3 && Math.random() < 0.08) {
            createRock(world, worldX, worldY, 'basalt');
          }

          // Sparse tundra vegetation (lichen, moss, hardy shrubs) - 15% chance
          if (Math.random() < 0.15) {
            createFiberPlant(world, worldX, worldY); // Arctic moss/lichen placeholder
          }

          // Very rare stunted trees in sheltered areas - 2% chance
          if (tile.moisture > 50 && placementValue > 0.4 && Math.random() < 0.02) {
            const treeHeight = Math.floor(Math.random() * 2); // Very short trees (0-1)
            createTree(world, worldX, worldY, treeHeight, { speciesId: 'wind_pine' });
          }
        }

        // === TAIGA ENTITY PLACEMENT (cold coniferous forest) ===
        else if (tile.biome === 'taiga') {
          // Reconstruct taiga features for entity placement
          const regionalScale = 0.0005;

          // Bog detection
          const bogNoise = this.moistureNoise.octaveNoise(
            worldX * regionalScale,
            worldY * regionalScale,
            3,
            0.5
          );
          const isBog = bogNoise > 0.3 && tile.moisture > 60;

          // Shield rock exposure
          const shieldNoise = this.elevationNoise.octaveNoise(
            worldX * 0.000005 * 5,
            worldY * 0.000005 * 5,
            2,
            0.7
          );
          const isShieldRock = shieldNoise > 0.4;

          // Conifer density based on terrain type
          // Note: Type assertion needed because TS narrows out 'forest' from earlier else-if
          if ((tile.terrain as string) === 'forest') {
            // Dense conifer stands - 75% tree coverage
            if (Math.random() < 0.75) {
              // Primarily spruce and pine (tall, narrow conifers)
              const treeType = Math.random();
              if (treeType < 0.6) {
                // 60% spruce (6-14 voxels)
                const treeHeight = 6 + Math.floor(Math.random() * 9);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
              } else if (treeType < 0.9) {
                // 30% pine (5-12 voxels)
                const treeHeight = 5 + Math.floor(Math.random() * 8);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
              } else {
                // 10% birch (4-10 voxels)
                const treeHeight = 4 + Math.floor(Math.random() * 7);
                createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
              }
            }
            // Understory plants - 25% chance
            if (Math.random() < 0.25) {
              createFiberPlant(world, worldX, worldY); // Ferns, moss
            }
            // Berry bushes (lingonberries, cloudberries) - 20% chance
            if (Math.random() < 0.20) {
              createBerryBush(world, worldX, worldY);
            }
            // Leaf piles - 30% chance
            if (Math.random() < 0.30) {
              createLeafPile(world, worldX, worldY);
            }
          } else if (isBog) {
            // Boggy areas - sparse trees, lots of moss
            // Stunted trees - 15% chance
            if (Math.random() < 0.15) {
              const treeHeight = 2 + Math.floor(Math.random() * 4);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
            }
            // Sphagnum moss and sedges - 50% chance
            if (Math.random() < 0.50) {
              createFiberPlant(world, worldX, worldY);
            }
            // Cloudberries in bogs - 25% chance
            if (Math.random() < 0.25) {
              createBerryBush(world, worldX, worldY);
            }
          } else if (isShieldRock) {
            // Rocky outcrops - exposed granite
            // Rocks - 35% chance
            if (Math.random() < 0.35) {
              createRock(world, worldX, worldY, 'granite');
            }
            // Hardy plants in rock crevices - 10% chance
            if (Math.random() < 0.10) {
              createFiberPlant(world, worldX, worldY);
            }
          } else {
            // Open taiga grassland
            // Scattered conifers - 30% chance
            if (Math.random() < 0.30) {
              const treeHeight = 4 + Math.floor(Math.random() * 6);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'pine-tree' });
            }
            // Ground cover - 40% chance
            if (Math.random() < 0.40) {
              createFiberPlant(world, worldX, worldY);
            }
          }
        }

        // === JUNGLE ENTITY PLACEMENT (tropical rainforest) ===
        else if (tile.biome === 'jungle') {
          // Reconstruct jungle features for entity placement
          const regionalScale = 0.0005;
          const detailScale = 0.005;

          // Canopy gap detection
          const gapNoise = this.temperatureNoise.octaveNoise(
            worldX * detailScale * 1.5,
            worldY * detailScale * 1.5,
            3,
            0.5
          );
          const isCanopyGap = gapNoise > 0.45;

          // Swampy lowland detection
          const swampNoise = this.moistureNoise.octaveNoise(
            worldX * regionalScale * 0.4,
            worldY * regionalScale * 0.4,
            2,
            0.6
          );
          const isSwampyLowland = swampNoise > 0.4 && tile.moisture > 80;

          // Floodplain detection
          const floodNoise = this.moistureNoise.octaveNoise(
            worldX * regionalScale * 0.6,
            worldY * regionalScale * 0.6,
            3,
            0.5
          );
          const isFloodplain = floodNoise > 0.3 && tile.elevation < 1;

          if (isCanopyGap) {
            // Canopy gaps - dense understory, no tall trees
            // Dense shrubs and vines - 70% chance
            if (Math.random() < 0.70) {
              createFiberPlant(world, worldX, worldY);
            }
            // Young trees competing for light - 40% chance
            if (Math.random() < 0.40) {
              const treeHeight = 2 + Math.floor(Math.random() * 4);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
            }
            // Fruit trees in gaps - 25% chance
            if (Math.random() < 0.25) {
              createBerryBush(world, worldX, worldY); // Tropical fruit placeholder
            }
          } else if (isSwampyLowland) {
            // Swampy jungle - mangrove-like trees
            // Mangrove/swamp trees - 50% chance
            if (Math.random() < 0.50) {
              const treeHeight = 3 + Math.floor(Math.random() * 5);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
            }
            // Aquatic plants - 60% chance
            if (Math.random() < 0.60) {
              createFiberPlant(world, worldX, worldY);
            }
          } else if (isFloodplain) {
            // Floodplain - tall trees with buttress roots
            // Giant trees - 60% chance
            if (Math.random() < 0.60) {
              const treeHeight = 10 + Math.floor(Math.random() * 10);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
            }
            // Dense undergrowth - 55% chance
            if (Math.random() < 0.55) {
              createFiberPlant(world, worldX, worldY);
            }
          } else {
            // Dense primary jungle
            // Emergent layer trees (very tall) - 15% chance
            if (placementValue > 0.4 && Math.random() < 0.15) {
              const treeHeight = 12 + Math.floor(Math.random() * 8);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
            }
            // Canopy layer trees - 70% chance
            else if (Math.random() < 0.70) {
              const treeHeight = 8 + Math.floor(Math.random() * 6);
              createTree(world, worldX, worldY, treeHeight, { speciesId: 'willow' });
            }
            // Dense understory - 80% chance
            if (Math.random() < 0.80) {
              createFiberPlant(world, worldX, worldY);
            }
            // Leaf litter - 50% chance
            if (Math.random() < 0.50) {
              createLeafPile(world, worldX, worldY);
            }
            // Tropical fruits - 18% chance
            if (Math.random() < 0.18) {
              createBerryBush(world, worldX, worldY);
            }
            // Rocks are rare in dense jungle - 3% chance
            if (placementValue < -0.4 && Math.random() < 0.03) {
              createRock(world, worldX, worldY, 'shale');
            }
          }
        }

        // === FOOTHILLS PLANT PLACEMENT (mountain → plains transition) ===
        else if (tile.biome === 'foothills') {
          // Foothills: 5-15% tree density at high moisture
          if (tile.moisture > 50 && placementValue > 0.4 && Math.random() < 0.10) {
            const treeHeight = 1 + Math.floor(Math.random() * 2); // Short alpine trees
            createTree(world, worldX, worldY, treeHeight, { speciesId: 'wind_pine' });
          }

          // Rocks: 20-40% density based on elevation (using placementValue as proxy)
          const rockDensity = 0.20 + Math.max(0, Math.min(0.20, placementValue * 0.30));
          if (Math.random() < rockDensity) {
            createRock(world, worldX, worldY, 'granite');
          }
        }

        // Place rocks in mountains and stone areas
        if (tile.terrain === 'stone' && placementValue < -0.2) {
          if (Math.random() > 0.5) {
            // 50% chance (increased from 20% for better resource availability)
            createRock(world, worldX, worldY, 'granite');
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
            createRock(world, worldX, worldY, 'sandstone');
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
              createRock(world, worldX, worldY, 'sandstone');
            }
          }
          // 1a. Rock spires/hoodoos on mesa tops (isolated erosion remnants)
          else if (isMesaRegion && !isMesaEdge && placementValue > 0.4) {
            if (Math.random() > 0.90) {
              // 10% chance - tall rock spires rising from mesa surface
              createRock(world, worldX, worldY, 'sandstone');
            }
          }
          // 2. Canyon walls - stratified rock layers
          else if (isCanyonWall) {
            if (Math.random() > 0.20) {
              // 80% chance - visible canyon walls
              createRock(world, worldX, worldY, 'sandstone');
            }
          }
          // 3. Arroyo banks - erosion debris
          else if (isArroyoBank) {
            if (Math.random() > 0.35) {
              // 65% chance - rocks exposed by water erosion
              createRock(world, worldX, worldY, 'sandstone');
            }
          }
          // 4. Canyon/arroyo floors - scattered boulders
          else if ((isCanyon || isArroyo) && placementValue < -0.1) {
            if (Math.random() > 0.70) {
              // 30% chance - fallen rocks and debris
              createRock(world, worldX, worldY, 'sandstone');
            }
          }
          // 5. Rocky desert outcroppings (not dunes)
          else if (!isDuneField && placementValue < -0.25) {
            if (Math.random() > 0.25) {
              // 75% chance in outcrop zones - hoodoos and rock formations
              createRock(world, worldX, worldY, 'sandstone');
            }
          }
          // 6. Dune fields - very rare rocks (mostly sandy)
          else if (isDuneField && placementValue < -0.5) {
            if (Math.random() > 0.92) {
              // 8% chance - occasional exposed bedrock in dunes
              createRock(world, worldX, worldY, 'sandstone');
            }
          }
        }

        // Scatter some rocks near spawn point (within ~30 tiles of origin) for early game
        // PERFORMANCE: Use squared distance to avoid Math.sqrt in hot path
        const distFromOriginSquared = worldX * worldX + worldY * worldY;
        const maxSpawnDistSquared = 30 * 30; // 900
        if (distFromOriginSquared < maxSpawnDistSquared && tile.terrain === 'grass') {
          if (Math.random() > 0.95) {
            // 5% chance for rocks on grass near spawn
            createRock(world, worldX, worldY, 'limestone');
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
    // PERFORMANCE: Math.sqrt required here - result used for division in spawnFlatten calculation
    const distanceFromSpawn = Math.sqrt(worldX * worldX + worldY * worldY);
    const spawnFlatten = Math.max(0, 1 - distanceFromSpawn / 500); // 1.0 at origin, 0.0 at distance 500+

    // Blend elevation based on continentalness and erosion
    let elevation = baseElevation * 0.6 + continentalness * 0.4;

    // Add ridges in mountainous areas, smooth in eroded areas
    if (continentalness > 0.3) {
      const ridgeStrength = (continentalness - 0.3) * (1 - erosion * 0.5);
      elevation = elevation * (1 - ridgeStrength) + ridgedNoise * ridgeStrength;
    }

    // Apply planet elevation modifiers
    elevation = Math.max(-1, Math.min(1,
      (elevation * this.elevationScale) + this.elevationOffset
    ));

    // Save original elevation for biome determination (before forest/desert/spawn modifications)
    const biomeElevation = elevation;

    // Moisture uses biome scale for climate zones (~20km patterns)
    // NOTE: Calculated early because desert geological features need moisture/temperature
    const rawMoisture = this.moistureNoise.octaveNoise(
      worldX * biomeScale,
      worldY * biomeScale,
      3,
      0.5
    );
    // Apply planet moisture modifiers
    const moisture = Math.max(-1, Math.min(1,
      (rawMoisture * this.moistureScale) + this.moistureOffset
    ));

    // Temperature uses continental scale for large climate bands (~200km patterns)
    const rawTemperature = this.temperatureNoise.octaveNoise(
      worldX * continentalScale * 2,
      worldY * continentalScale * 2,
      2,
      0.5
    );
    // Apply planet temperature modifiers
    const temperature = Math.max(-1, Math.min(1,
      (rawTemperature * this.tempScale) + this.tempOffset
    ));

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

    // === TUNDRA GEOLOGICAL REALISM ===
    // Simulates arctic terrain with permafrost patterns, wind erosion, and exposed bedrock.
    //
    // Features implemented:
    // - PERMAFROST POLYGONS: Geometric frost-heave patterns creating subtle elevation changes
    // - WIND-SWEPT RIDGES: Snow drifts and exposed rock from constant wind erosion
    // - FROZEN LAKES: Scattered ice-covered depressions (linked to moisture)
    // - PINGOS: Ice-cored hills (rare, distinctive arctic feature)
    // - EXPOSED BEDROCK: Rocky outcrops where snow has been scoured away
    //
    const isColdRegion = temperature < -0.3;

    if (isColdRegion && elevation > -0.1) {
      // 1. Permafrost polygon patterns (subtle geometric elevation changes)
      const permafrostNoise = this.moistureNoise.octaveNoise(
        worldX * detailScale * 2,
        worldY * detailScale * 2,
        3,
        0.4
      );
      const hasPermafrostPolygons = permafrostNoise > 0.3;

      // 2. Wind ridge patterns (elongated features from prevailing winds)
      const windNoise = this.temperatureNoise.octaveNoise(
        worldX * regionalScale * 1.5,
        worldY * regionalScale * 0.5, // Elongated in one direction
        2,
        0.5
      );
      const isWindRidge = windNoise > 0.35;

      // 3. Pingo detection (ice-cored hills - rare)
      const pingoNoise = this.elevationNoise.octaveNoise(
        worldX * regionalScale * 0.3,
        worldY * regionalScale * 0.3,
        2,
        0.7
      );
      const isPingo = pingoNoise > 0.55 && moisture > 0.0;

      // 4. Exposed bedrock (wind-scoured areas)
      const bedrockNoise = this.elevationNoise.octaveNoise(
        worldX * regionalScale * 2,
        worldY * regionalScale * 2,
        2,
        0.6
      );
      const isExposedBedrock = bedrockNoise > 0.4 && moisture < 0.0;

      // Apply tundra features
      if (isPingo) {
        // Pingos create small hills (3-50m in real scale)
        const pingoHeight = (pingoNoise - 0.55) / 0.45;
        elevation = elevation + pingoHeight * 0.15;
      } else if (isWindRidge) {
        // Wind ridges create elongated snow drifts
        const ridgeHeight = (windNoise - 0.35) / 0.65;
        elevation = elevation + ridgeHeight * 0.08;
      } else if (hasPermafrostPolygons) {
        // Permafrost polygons create subtle geometric patterns
        const polygonEffect = Math.sin(permafrostNoise * Math.PI * 4) * 0.03;
        elevation = elevation + polygonEffect;
      } else if (isExposedBedrock) {
        // Exposed bedrock is slightly higher (snow blown away)
        elevation = elevation + 0.02;
      }
    }

    // === TAIGA GEOLOGICAL REALISM ===
    // Simulates boreal forest terrain with boggy lowlands, rocky ridges, and glacial features.
    //
    // Features implemented:
    // - MUSKEG/BOGS: Waterlogged depressions with sphagnum moss (high moisture areas)
    // - GLACIAL DRUMLINS: Elongated hills left by ancient glaciers
    // - ESKERS: Winding ridges of glacial sediment
    // - ROCKY OUTCROPS: Canadian Shield-style exposed granite
    // - CONIFER STANDS: Dense patches vs sparse areas
    //
    const isTaigaRegion = temperature >= -0.4 && temperature < -0.1 && moisture > -0.2;

    if (isTaigaRegion && elevation > -0.1) {
      // 1. Muskeg/bog detection (waterlogged areas)
      const bogNoise = this.moistureNoise.octaveNoise(
        worldX * regionalScale,
        worldY * regionalScale,
        3,
        0.5
      );
      const isBog = bogNoise > 0.3 && moisture > 0.2;

      // 2. Glacial drumlin patterns (elongated hills)
      const drumlinNoise = this.elevationNoise.octaveNoise(
        worldX * regionalScale * 0.8,
        worldY * regionalScale * 0.4, // Elongated
        3,
        0.6
      );
      const isDrumlin = drumlinNoise > 0.35;

      // 3. Esker ridges (winding glacial features)
      const eskerNoise = this.temperatureNoise.octaveNoise(
        worldX * regionalScale * 1.2,
        worldY * regionalScale * 1.2,
        4,
        0.55
      );
      const isEsker = Math.abs(eskerNoise) < 0.1;

      // 4. Rocky outcrops (shield rock exposure)
      const shieldNoise = this.elevationNoise.octaveNoise(
        worldX * continentalScale * 5,
        worldY * continentalScale * 5,
        2,
        0.7
      );
      const isShieldRock = shieldNoise > 0.4;

      // Apply taiga features
      if (isBog) {
        // Bogs are depressions with waterlogged soil
        const bogDepth = (bogNoise - 0.3) / 0.7;
        elevation = elevation - bogDepth * 0.1;
      } else if (isEsker) {
        // Eskers are raised winding ridges
        const eskerHeight = (0.1 - Math.abs(eskerNoise)) / 0.1;
        elevation = elevation + eskerHeight * 0.12;
      } else if (isDrumlin) {
        // Drumlins are smooth elongated hills
        const drumlinHeight = (drumlinNoise - 0.35) / 0.65;
        elevation = elevation + drumlinHeight * 0.1;
      } else if (isShieldRock) {
        // Shield rock creates gentle domes
        elevation = elevation + 0.05;
      }
    }

    // === JUNGLE GEOLOGICAL REALISM ===
    // Simulates tropical rainforest terrain with river floodplains, canopy gaps, and varied topography.
    //
    // Features implemented:
    // - FLOODPLAINS: Low-lying areas near water with rich alluvial soil
    // - JUNGLE HILLS: Rolling terrain with steep ravines
    // - CANOPY GAPS: Natural clearings from treefalls
    // - SWAMPY LOWLANDS: Perpetually wet areas with standing water
    // - RIVER TERRACES: Stepped terrain from ancient river levels
    //
    const isJungleRegion = temperature > 0.25 && moisture > 0.35;

    if (isJungleRegion && elevation > -0.1) {
      // 1. Floodplain detection (flat, low areas)
      const floodNoise = this.moistureNoise.octaveNoise(
        worldX * regionalScale * 0.6,
        worldY * regionalScale * 0.6,
        3,
        0.5
      );
      const isFloodplain = floodNoise > 0.3 && elevation < 0.1;

      // 2. Jungle hills and ravines
      const hillNoise = this.elevationNoise.octaveNoise(
        worldX * regionalScale * 1.5,
        worldY * regionalScale * 1.5,
        4,
        0.6
      );
      const isJungleHill = hillNoise > 0.25;

      // 3. Ravine/gully patterns (water erosion channels)
      const ravineNoise = this.moistureNoise.octaveNoise(
        worldX * detailScale * 0.8,
        worldY * detailScale * 0.8,
        4,
        0.55
      );
      const isRavine = Math.abs(ravineNoise) < 0.08;

      // 4. Canopy gap detection (small clearings)
      const gapNoise = this.temperatureNoise.octaveNoise(
        worldX * detailScale * 1.5,
        worldY * detailScale * 1.5,
        3,
        0.5
      );
      const isCanopyGap = gapNoise > 0.45;

      // 5. Swampy lowland detection
      const swampNoise = this.moistureNoise.octaveNoise(
        worldX * regionalScale * 0.4,
        worldY * regionalScale * 0.4,
        2,
        0.6
      );
      const isSwampyLowland = swampNoise > 0.4 && moisture > 0.5 && elevation < 0.05;

      // Apply jungle features
      if (isSwampyLowland) {
        // Swampy lowlands are slightly below surrounding terrain
        elevation = elevation - 0.08;
      } else if (isFloodplain) {
        // Floodplains are flat and low
        const flattenStrength = (floodNoise - 0.3) / 0.7;
        elevation = elevation * (1 - flattenStrength * 0.5);
      } else if (isRavine) {
        // Ravines cut through jungle terrain
        const ravineDepth = (0.08 - Math.abs(ravineNoise)) / 0.08;
        elevation = elevation - ravineDepth * 0.15;
      } else if (isJungleHill) {
        // Jungle hills with steeper terrain
        const hillHeight = (hillNoise - 0.25) / 0.75;
        elevation = elevation + hillHeight * 0.2;
      } else if (isCanopyGap) {
        // Canopy gaps don't change elevation much, just mark for entity placement
        elevation = elevation - 0.01;
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

    // Determine terrain and biome using ORIGINAL elevation (before forest/desert/spawn modifications)
    // This ensures biome boundaries follow environmental gradients, not micro-terrain features
    const { terrain, biome: rawBiome, fluid, oceanZone } = this.determineTerrainAndBiome(
      biomeElevation,
      moisture,
      temperature
    );

    // Filter biome through allowed list if planet config specifies restrictions
    const biome = this.filterBiome(rawBiome, terrain);

    // Map biome to appropriate terrain type (exotic biomes need exotic terrains)
    const mappedTerrain = this.mapBiomeToTerrain(biome, terrain, moisture);

    // Calculate tile Z elevation based on improved noise
    // Scale: water (planetary ocean) = -11000 to 0, plains = -1 to 2, hills = 2-6, mountains = 6-15
    let tileElevation = 0;
    if (biome === 'ocean') {
      // OCEAN: Planetary-scale depth (0 to -11,000m for trenches)
      // Map elevation -1.0 to -0.3 to depth 0 to -11000m
      // Deeper elevation values = deeper ocean trenches
      const depthFactor = (this.WATER_LEVEL - elevation) / (1.0 + this.WATER_LEVEL);
      // Non-linear mapping: shallow areas common, deep trenches rare
      const depthCurve = Math.pow(depthFactor, 2.5); // Exponential curve
      tileElevation = -Math.floor(depthCurve * 11000); // 0 to -11000m
    } else if (biome === 'river') {
      // Rivers: Shallow water (0 to -10m)
      tileElevation = Math.floor((elevation + 1) * -5); // -7 to 0m
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

    // Adjust by terrain type (using mappedTerrain for exotic biomes)
    if (mappedTerrain === 'water' || mappedTerrain === 'stone' || mappedTerrain === 'lava' ||
        mappedTerrain === 'void_stone' || mappedTerrain === 'hydrogen_ice') {
      fertility = 0; // Not farmable
    } else if (mappedTerrain === 'sand' && biome !== 'desert' && biome !== 'quartz_desert') {
      // Sand near water (beaches) - low fertility
      fertility = Math.min(fertility, 0.3);
    } else if (mappedTerrain === 'corrupted' || mappedTerrain === 'sulfur' || mappedTerrain === 'obsidian') {
      // Hostile terrains - very low fertility
      fertility = Math.min(fertility, 0.1);
    }

    // For ocean tiles, update fluid properties based on actual depth
    let finalFluid = fluid;
    let finalOceanZone = oceanZone;

    if (biome === 'ocean' && tileElevation < 0) {
      // Calculate ocean zone based on actual tile depth
      finalOceanZone = getOceanBiomeZone(tileElevation) || undefined;

      // Calculate realistic water properties
      const waterTemp = calculateWaterTemperature(tileElevation, temperature * 20 + 10); // Convert -1/1 to 10-30°C
      const pressure = calculatePressure(tileElevation);

      // Dwarf Fortress-style depth (0-7) for flow simulation
      // Map ocean depth to DF depth scale for compatibility
      const dfDepth = tileElevation >= -200 ? Math.floor(Math.abs(tileElevation) / 30) + 1 : 7;

      finalFluid = {
        type: 'water' as const,
        depth: Math.min(7, Math.max(1, dfDepth)), // Clamp to 1-7
        pressure: pressure,
        temperature: waterTemp,
        stagnant: true, // No flow initially
        lastUpdate: 0,
      };
    }

    // V8 OPTIMIZATION: Always return object with identical shape for hidden class consistency.
    // All optional properties must be explicitly set (to value or undefined) in same order.
    return {
      terrain: mappedTerrain,
      floor: undefined, // V8: Initialize for consistent shape
      elevation: tileElevation,
      neighbors: createEmptyNeighbors(),
      moisture: Math.max(0, Math.min(100, normalizedMoisture * 100)),
      fertility: Math.max(0, Math.min(100, fertility * 100)),
      biome,
      // Tile-based building system (V8: pre-initialize for shape consistency)
      wall: undefined,
      door: undefined,
      window: undefined,
      roof: undefined,
      // Soil management
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
      // Fluid & mining systems (V8: always set, even if undefined)
      fluid: finalFluid || undefined,
      oceanZone: finalOceanZone || undefined,
      mineable: undefined,
      embeddedResource: undefined,
      resourceAmount: undefined,
      ceilingSupported: undefined,
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
      // -----------------------------------------------------------------------
      // Standard Biomes
      // -----------------------------------------------------------------------
      plains: [70, 80],
      forest: [60, 70],
      river: [80, 90],
      ocean: [0, 0], // Not farmable
      desert: [20, 30],
      mountains: [40, 50],
      // Transition biomes
      scrubland: [35, 45],     // Desert → Plains transition
      wetland: [75, 85],       // High moisture, rich soil
      foothills: [50, 60],     // Mountain → Plains transition
      savanna: [50, 60],       // Hot grassland
      woodland: [65, 75],      // Forest → Plains transition (good soil)
      // Cold biomes
      tundra: [15, 25],        // Frozen permafrost, minimal growth
      taiga: [40, 55],         // Cold coniferous forest, acidic soil
      // Tropical biome
      jungle: [70, 85],        // Rich tropical soil, rapid decomposition

      // -----------------------------------------------------------------------
      // Ice World Biomes
      // -----------------------------------------------------------------------
      glacier: [0, 5],         // Solid ice, no soil
      frozen_ocean: [0, 0],    // Frozen water, not farmable
      ice_caves: [5, 15],      // Some mineral deposits
      permafrost: [10, 20],    // Frozen ground, barely farmable

      // -----------------------------------------------------------------------
      // Volcanic Biomes
      // -----------------------------------------------------------------------
      lava_field: [0, 0],      // Active lava, not farmable
      ash_plain: [30, 50],     // Volcanic ash is nutrient-rich over time
      obsidian_waste: [5, 15], // Volcanic glass, poor soil
      caldera: [25, 40],       // Old crater, some fertility
      sulfur_flats: [0, 10],   // Toxic sulfur deposits

      // -----------------------------------------------------------------------
      // Crystal Biomes
      // -----------------------------------------------------------------------
      crystal_plains: [20, 35],   // Mineral-rich but rocky
      geode_caves: [15, 25],      // Underground, limited light
      prismatic_forest: [35, 50], // Crystal-forest hybrid
      quartz_desert: [10, 20],    // Crystal desert, poor soil

      // -----------------------------------------------------------------------
      // Fungal Biomes
      // -----------------------------------------------------------------------
      mushroom_forest: [80, 95],     // Excellent fungal decomposition
      spore_field: [65, 80],         // Rich in organic matter
      mycelium_network: [75, 90],    // Nutrient transfer via mycelium
      bioluminescent_marsh: [70, 85], // Wet fungal environment

      // -----------------------------------------------------------------------
      // Corrupted/Dark Biomes
      // -----------------------------------------------------------------------
      blighted_land: [5, 20],     // Corrupted soil, hostile to life
      shadow_forest: [25, 40],   // Dark but some fertility
      corruption_heart: [0, 5],  // Extremely hostile
      void_edge: [0, 0],         // Reality breakdown, not farmable

      // -----------------------------------------------------------------------
      // Magical Biomes
      // -----------------------------------------------------------------------
      arcane_forest: [70, 90],   // Magically enhanced growth
      floating_isle: [60, 75],   // Floating terrain, good soil
      mana_spring: [85, 100],    // Maximum magical fertility
      ley_nexus: [80, 95],       // Magical energy boost

      // -----------------------------------------------------------------------
      // Exotic Planet Biomes
      // -----------------------------------------------------------------------
      twilight_zone: [55, 70],     // Habitable ring, moderate fertility
      eternal_day: [20, 35],       // Scorched, low fertility
      eternal_night: [10, 25],     // Frozen, minimal fertility
      carbon_forest: [40, 55],     // Carbon-based life possible
      iron_plains: [15, 30],       // Metallic soil, poor for plants
      hydrogen_sea: [0, 0],        // Liquid hydrogen, not farmable
      ammonia_ocean: [0, 0],       // Ammonia ocean, not farmable
      subsurface_ocean: [30, 50],  // Protected ocean, some life
      crater_field: [10, 25],      // Impact craters, mineral-rich
      regolith_waste: [5, 15],     // Dusty barren terrain
      hycean_depths: [40, 60],     // Deep ocean, moderate life
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
  /**
   * Determine terrain for foothills based on elevation gradient.
   * Blends stone, dirt, and grass based on how close to mountain threshold.
   */
  private determineFoothillsTerrain(elevation: number, moisture: number): TerrainType {
    // elevation range: 0.35 to 0.5
    const elevationFactor = (elevation - 0.35) / 0.15; // 0.0 at base, 1.0 at mountains

    // Higher elevation = more stone
    const stoneThreshold = 0.4 + elevationFactor * 0.4; // 40-80% chance of stone
    const terrainRoll = Math.random();

    if (terrainRoll < stoneThreshold) {
      return 'stone';
    } else if (moisture > 0.1) {
      return 'grass';
    } else {
      return 'dirt';
    }
  }

  /**
   * Blend between two terrain types based on a gradient value.
   * Used for smooth transitions (e.g., sand → dirt in scrubland).
   */
  private determineTransitionTerrain(
    terrainA: TerrainType,
    terrainB: TerrainType,
    value: number,
    minValue: number,
    maxValue: number
  ): TerrainType {
    const factor = (value - minValue) / (maxValue - minValue); // 0.0 to 1.0
    const threshold = factor; // 0% terrainB at min, 100% terrainB at max

    return Math.random() < threshold ? terrainB : terrainA;
  }

  /**
   * Determine biome with soft transitions using environmental gradients.
   * Returns both the biome and terrain type based on elevation, moisture, temperature.
   */
  private determineTerrainAndBiome(
    elevation: number,
    moisture: number,
    temperature: number
  ): { terrain: TerrainType; biome: BiomeType; fluid?: FluidLayer; oceanZone?: OceanBiomeZone } {

    // PRIORITY 1: Water (hard boundary at WATER_LEVEL)
    if (elevation < this.WATER_LEVEL) {
      // Calculate water depth (0-7 scale, Dwarf Fortress convention)
      // Range: elevation -1.0 to -0.3 maps to depth 7 to 1
      const depthFactor = (this.WATER_LEVEL - elevation) / (1.0 + this.WATER_LEVEL);
      const waterDepth = Math.max(1, Math.min(7, Math.floor(depthFactor * 7) + 1));

      return {
        terrain: 'water',
        biome: elevation < -0.5 ? 'ocean' : 'river',
        fluid: {
          type: 'water' as const,
          depth: waterDepth,
          pressure: waterDepth, // Initial pressure = depth
          temperature: 20, // 20°C default
          stagnant: true, // No flow initially
          lastUpdate: 0,
        },
      };
    }

    // PRIORITY 2: Near-water transitions (beaches, wetlands, marshes)
    if (elevation < this.SAND_LEVEL) { // -0.1 to -0.3 range
      // High moisture near water = wetland/marsh
      if (moisture > 0.3) {
        return { terrain: 'grass', biome: 'wetland' };
      }
      // Low moisture near water = beach
      return {
        terrain: 'sand',
        biome: moisture < -0.3 ? 'desert' : 'plains',
      };
    }

    // PRIORITY 3: Wetlands (just above water level, high moisture)
    if (elevation < 0.05 && moisture > 0.35) {
      return { terrain: 'grass', biome: 'wetland' };
    }

    // PRIORITY 4: Mountains and foothills (elevation-based)
    if (elevation > this.STONE_LEVEL) { // > 0.5
      return { terrain: 'stone', biome: 'mountains' };
    }
    if (elevation > 0.35) { // 0.35 to 0.5 = foothills
      // Foothills terrain is a blend
      const terrain = this.determineFoothillsTerrain(elevation, moisture);
      return { terrain, biome: 'foothills' };
    }

    // PRIORITY 5: Temperature/moisture-based biomes (forests, deserts, plains)

    // === COLD BIOMES (temperature < -0.2) ===

    // Tundra - frozen arctic terrain (very cold, any moisture)
    if (temperature < -0.4) {
      // Permafrost with sparse vegetation
      if (moisture > 0.2) {
        // Wet tundra - marshes and permafrost pools
        return { terrain: 'snow', biome: 'tundra' };
      } else if (moisture > -0.2) {
        // Dry tundra - wind-swept snow and exposed rock
        return { terrain: 'snow', biome: 'tundra' };
      } else {
        // Polar desert - extremely cold and dry
        return { terrain: 'snow', biome: 'tundra' };
      }
    }

    // Taiga (boreal forest) - cold with moderate moisture
    if (temperature < -0.1 && temperature >= -0.4 && moisture > 0.1) {
      // Cold coniferous forest
      return { terrain: 'forest', biome: 'taiga' };
    }

    // Taiga transition - cold grassland turning to tundra
    if (temperature < -0.1 && temperature >= -0.4 && moisture <= 0.1 && moisture > -0.2) {
      return { terrain: 'grass', biome: 'taiga' };
    }

    // === HOT BIOMES ===

    // Jungle/Rainforest - hot and very wet
    if (temperature > 0.3 && moisture > 0.5) {
      return { terrain: 'forest', biome: 'jungle' };
    }

    // Jungle transition - hot and wet but not quite rainforest
    if (temperature > 0.25 && moisture > 0.35 && moisture <= 0.5) {
      return { terrain: 'forest', biome: 'jungle' };
    }

    // Hot and dry = Desert spectrum
    if (temperature > 0.2 && moisture < -0.3) {
      return { terrain: 'sand', biome: 'desert' };
    }

    // Hot with some moisture = Scrubland (desert transition)
    if (temperature > 0.2 && moisture >= -0.3 && moisture < -0.1) {
      const terrain = this.determineTransitionTerrain('sand', 'dirt', moisture, -0.3, -0.1);
      return { terrain, biome: 'scrubland' };
    }

    // Hot with moderate moisture = Savanna (grassland with sparse trees)
    if (temperature > 0.3 && moisture >= -0.1 && moisture < 0.15) {
      return { terrain: 'grass', biome: 'savanna' };
    }

    // High moisture = Forest spectrum (temperate zones)
    if (moisture > 0.35 && temperature > -0.2) {
      return { terrain: 'forest', biome: 'forest' };
    }

    // Moderate-high moisture = Woodland (forest transition)
    if (moisture >= 0.2 && temperature > -0.2) {
      return { terrain: 'forest', biome: 'woodland' };
    }

    // Light moisture = Woodland-grassland transition
    if (moisture >= 0.05 && temperature > -0.2) {
      return { terrain: 'grass', biome: 'woodland' };
    }

    // Dry grassland (plains edge toward desert)
    if (moisture >= -0.1 && moisture <= 0.05) {
      return { terrain: moisture > 0 ? 'grass' : 'dirt', biome: 'plains' };
    }

    // DEFAULT: Plains/grassland
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
   *
   * Public so BackgroundChunkGenerator can call after worker-generated tiles.
   */
  determineChunkBiome(chunk: Chunk): BiomeType {
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
