/**
 * PlanetInitializer - Orchestrates complete planet generation
 *
 * Coordinates terrain generation and biosphere generation to create
 * a fully-populated planet with alien life.
 */

import { Planet } from './Planet.js';
import { BiosphereGenerator, type ProgressCallback } from '../biosphere/BiosphereGenerator.js';
import { queueBiosphereSprites } from '../biosphere/queueBiosphereSprites.js';
import type { PlanetConfig } from './PlanetTypes.js';
import type { LLMProvider, GodCraftedDiscoverySystem } from '@ai-village/core';

export interface PlanetInitializationOptions {
  /** LLM provider for generating alien species */
  llmProvider: LLMProvider;

  /** Optional god-crafted discovery system */
  godCraftedSpawner?: GodCraftedDiscoverySystem;

  /** Whether to generate biosphere (default: true) */
  generateBiosphere?: boolean;

  /** Pre-existing biosphere data from server cache (skip LLM generation) */
  existingBiosphere?: any;

  /** Max species to generate in the biosphere. Limits LLM calls. Default: 8 */
  maxSpecies?: number;

  /** Console-era art style for all sprites on this planet (snes, genesis, gba, etc.). If not provided, determined from planet seed. */
  artStyle?: string;

  /** Whether to queue sprite generation (default: true) */
  queueSprites?: boolean;

  /** Path to sprite queue file (default: auto-detect) */
  spriteQueuePath?: string;

  /** Optional progress callback for UI updates */
  onProgress?: ProgressCallback;
}

/**
 * Initialize a complete planet with terrain and biosphere.
 */
export async function initializePlanet(
  config: PlanetConfig,
  options: PlanetInitializationOptions
): Promise<Planet> {
  const {
    llmProvider,
    godCraftedSpawner,
    generateBiosphere = true,
    existingBiosphere,
    maxSpecies = 8,
    artStyle,
    queueSprites = true,
    spriteQueuePath,
    onProgress,
  } = options;

  const reportProgress = (message: string) => {
    console.log(`[PlanetInitializer] ${message}`);
    if (onProgress) onProgress(message);
  };

  reportProgress(`🪐 Initializing planet ${config.name}...`);

  // Step 1: Create planet with terrain generator
  const planet = new Planet(config, godCraftedSpawner);

  // Step 2: Use existing biosphere from cache, or generate new one
  if (existingBiosphere) {
    // Use cached biosphere from server (skip 57s LLM generation!)
    reportProgress(`🌿 Using cached biosphere...`);

    try {
      // Convert server format to full BiosphereData format
      const speciesList = existingBiosphere.species || [];
      const sapientList = speciesList.filter((s: any) => s.type === 'sapient');

      const biosphere = {
        $schema: 'https://aivillage.dev/schemas/biosphere/v1' as const,
        planet: config,
        niches: existingBiosphere.niches || [],
        species: speciesList,
        foodWeb: existingBiosphere.foodWeb || { relationships: [], trophicLevels: [] },
        nicheFilling: existingBiosphere.nicheFilling || {},
        sapientSpecies: sapientList,
        artStyle: artStyle || existingBiosphere.artStyle || 'pixel',
        metadata: existingBiosphere.metadata || {
          generatedAt: existingBiosphere.generatedAt || Date.now(),
          generationTimeMs: existingBiosphere.generationDurationMs || 0,
          totalSpecies: speciesList.length,
          sapientCount: sapientList.length,
          trophicLevels: 3,
          averageSpeciesPerNiche: speciesList.length / Math.max(1, existingBiosphere.niches?.length || 1),
        },
      };

      planet.setBiosphere(biosphere);

      console.log(
        `[PlanetInitializer] Cached biosphere: ${biosphere.species.length} species, ` +
        `${biosphere.sapientSpecies.length} sapient`
      );

      // Still queue sprites for cached biosphere if needed
      if (queueSprites) {
        reportProgress(`🖼️ Preparing sprites...`);
        await queueBiosphereSprites(biosphere, spriteQueuePath);
        console.log(`[PlanetInitializer] Sprites queued`);
      }
    } catch (error) {
      console.error(`[PlanetInitializer] Failed to use cached biosphere:`, error);
    }
  } else if (generateBiosphere) {
    // Generate new biosphere via LLM (slow, ~57s)
    reportProgress(`🌿 Beginning biosphere generation...`);

    try {
      const biosphereGenerator = new BiosphereGenerator(llmProvider, config, onProgress, {
        maxSpecies,
        artStyle: artStyle as any,  // Cast to ArtStyle type (validated at runtime by BiosphereGenerator)
      });
      const biosphere = await biosphereGenerator.generateBiosphere();

      planet.setBiosphere(biosphere);

      console.log(
        `[PlanetInitializer] Biosphere stats: ${biosphere.species.length} species, ` +
        `${biosphere.sapientSpecies.length} sapient, ${biosphere.artStyle} style`
      );

      // Step 3: Queue sprites if requested
      if (queueSprites) {
        reportProgress(`🖼️ Preparing sprites...`);

        await queueBiosphereSprites(biosphere, spriteQueuePath);

        console.log(`[PlanetInitializer] Sprites queued`);
      }
    } catch (error) {
      console.error(`[PlanetInitializer] Failed to generate biosphere for ${config.name}:`, error);
      // Continue without biosphere on error
    }
  }

  reportProgress(`✅ Planet ${config.name} ready!`);

  return planet;
}

/**
 * Generate a random planet configuration.
 */
export function generateRandomPlanetConfig(
  seed: string,
  options?: Partial<PlanetConfig>
): PlanetConfig {
  // Use seed to deterministically choose planet type
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }

  const planetTypes = [
    'terrestrial',
    'super_earth',
    'desert',
    'ice',
    'ocean',
    'volcanic',
    'tidally_locked',
    'hycean',
    'rogue',
    'moon',
    'magical',
    'fungal',
    'crystal',
  ];

  const type = planetTypes[Math.abs(hash) % planetTypes.length] as PlanetConfig['type'];

  // Generate random parameters based on planet type
  const config = generatePlanetConfigFromType(type, seed);

  // Apply overrides
  if (options) {
    Object.assign(config, options);
  }

  return config;
}

/**
 * Generate planet configuration from a planet type.
 */
function generatePlanetConfigFromType(
  type: PlanetConfig['type'],
  seed: string
): PlanetConfig {
  // Base configuration
  const base: PlanetConfig = {
    id: `planet:${seed}`,
    name: generatePlanetName(seed),
    type,
    seed,
    temperatureOffset: 0,
    temperatureScale: 1.0,
    moistureOffset: 0,
    moistureScale: 1.0,
    elevationOffset: 0,
    elevationScale: 1.0,
    seaLevel: -0.3,
    allowedBiomes: [],
    gravity: 1.0,
    atmosphereDensity: 1.0,
  };

  // Type-specific configurations
  switch (type) {
    case 'terrestrial':
      base.allowedBiomes = ['plains', 'forest', 'mountains', 'ocean', 'river', 'wetland', 'desert', 'taiga', 'jungle'];
      base.atmosphereType = 'nitrogen_oxygen';
      break;

    case 'super_earth':
      base.allowedBiomes = ['plains', 'forest', 'mountains', 'ocean', 'wetland'];
      base.gravity = 1.5 + Math.random() * 1.0; // 1.5-2.5g
      base.atmosphereDensity = 1.2 + Math.random() * 0.5;
      base.atmosphereType = 'nitrogen_oxygen';
      break;

    case 'desert':
      base.allowedBiomes = ['desert', 'mountains', 'scrubland'];
      base.temperatureOffset = 0.3;
      base.moistureOffset = -0.6;
      base.atmosphereDensity = 0.4;
      base.atmosphereType = 'carbon_dioxide';
      break;

    case 'ice':
      base.allowedBiomes = ['tundra', 'mountains'];
      base.temperatureOffset = -0.8;
      base.hasSubsurfaceOcean = true;
      base.atmosphereDensity = 0.1;
      break;

    case 'ocean':
      base.allowedBiomes = ['ocean', 'wetland'];
      base.seaLevel = 0.5;
      base.moistureOffset = 1.0;
      base.atmosphereType = 'nitrogen_oxygen';
      break;

    case 'volcanic':
      base.allowedBiomes = ['lava_field', 'ash_plain', 'obsidian_waste', 'mountains', 'scrubland'];
      base.hasLavaFlows = true;
      base.temperatureOffset = 0.6;
      base.atmosphereDensity = 0.8;
      base.atmosphereType = 'sulfur';
      break;

    case 'tidally_locked':
      base.allowedBiomes = ['plains', 'desert', 'wetland', 'river'];
      base.isTidallyLocked = true;
      base.temperatureScale = 2.0;
      base.atmosphereType = 'nitrogen_oxygen';
      break;

    case 'hycean':
      base.allowedBiomes = ['ocean', 'wetland'];
      base.atmosphereDensity = 2.5;
      base.atmosphereType = 'hydrogen';
      base.gravity = 1.2;
      break;

    case 'rogue':
      base.allowedBiomes = ['tundra', 'mountains'];
      base.isStarless = true;
      base.temperatureOffset = -0.9;
      base.atmosphereDensity = 0.5;
      base.atmosphereType = 'methane';
      break;

    case 'moon':
      base.allowedBiomes = ['mountains', 'desert'];
      base.gravity = 0.3;
      base.atmosphereDensity = 0.01;
      base.atmosphereType = 'none';
      break;

    case 'magical':
      base.allowedBiomes = ['mana_spring', 'ley_nexus', 'forest', 'mountains', 'plains'];
      base.hasFloatingIslands = true;
      base.atmosphereType = 'nitrogen_oxygen';
      break;

    case 'fungal':
      base.allowedBiomes = ['mushroom_forest', 'mycelium_network', 'bioluminescent_marsh', 'wetland', 'forest'];
      base.hasGiantMushrooms = true;
      base.moistureOffset = 0.5;
      base.atmosphereType = 'nitrogen_oxygen';
      break;

    case 'crystal':
      base.allowedBiomes = ['crystal_plains', 'geode_caves', 'prismatic_forest', 'mountains'];
      base.hasCrystalFormations = true;
      base.atmosphereType = 'nitrogen_oxygen';
      break;

    default:
      base.allowedBiomes = ['plains', 'forest', 'mountains', 'ocean'];
  }

  return base;
}

/**
 * Generate a random planet name from seed.
 */
function generatePlanetName(seed: string): string {
  const prefixes = [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
    'Nova', 'Stellar', 'Cosmic', 'Nebula', 'Quantum', 'Void', 'Celestial',
    'Astral', 'Galactic', 'Orbital', 'Lunar', 'Solar'
  ];

  const suffixes = [
    'Prime', 'Major', 'Minor', 'Tertius', 'Secundus', 'Primus',
    'Alpha', 'Beta', 'Gamma', 'One', 'Two', 'Three', 'Four', 'Five',
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'
  ];

  const bodies = [
    'Terra', 'Mundo', 'Gaia', 'Theia', 'Rhea', 'Titan', 'Oberon',
    'Miranda', 'Ariel', 'Umbriel', 'Triton', 'Nereid', 'Proteus'
  ];

  // Hash seed to pick deterministic names
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }

  const prefix = prefixes[Math.abs(hash) % prefixes.length]!;
  const body = bodies[Math.abs(hash >> 8) % bodies.length]!;
  const suffix = suffixes[Math.abs(hash >> 16) % suffixes.length]!;

  // Randomly choose naming pattern
  const pattern = Math.abs(hash) % 4;

  switch (pattern) {
    case 0: return `${prefix} ${body}`;
    case 1: return `${body} ${suffix}`;
    case 2: return `${prefix}-${hash % 1000}`;
    case 3: return body;
    default: return `${body} ${suffix}`;
  }
}
