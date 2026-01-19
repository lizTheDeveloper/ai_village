/**
 * Planet Presets - Default configurations for each planet type
 *
 * These presets define the terrain generation parameters and allowed biomes
 * for each planet archetype. Scientific presets are based on known exoplanet
 * classifications and astrophysical models.
 *
 * References:
 * - NASA Exoplanet Archive classifications
 * - Seager & Deming (2010) - Exoplanet Atmospheres
 * - Kaltenegger (2017) - How to Characterize Habitable Worlds
 */

import type { BiomeType } from '../chunks/Tile.js';
import type { PlanetType, PlanetPreset } from './PlanetTypes.js';
import planetPresetsData from '../../data/planet-presets.json';

// ============================================================================
// Load Planet Presets from JSON
// ============================================================================

interface RawPlanetPresetsData {
  biome_sets: Record<string, BiomeType[]>;
  presets: Record<PlanetType, Omit<PlanetPreset, 'allowedBiomes'> & { allowedBiomes: string | BiomeType[] }>;
}

interface PlanetPresetsData {
  biome_sets: Record<string, BiomeType[]>;
  presets: Record<PlanetType, PlanetPreset>;
}

function loadPlanetPresets(): Record<PlanetType, PlanetPreset> {
  const rawData = planetPresetsData as RawPlanetPresetsData;
  if (!rawData || !rawData.presets || !rawData.biome_sets) {
    throw new Error('Failed to load planet presets from JSON');
  }

  // Resolve biome set references
  const resolvedPresets: Record<string, PlanetPreset> = {};
  for (const [planetType, preset] of Object.entries(rawData.presets)) {
    const allowedBiomes = typeof preset.allowedBiomes === 'string'
      ? rawData.biome_sets[preset.allowedBiomes]
      : preset.allowedBiomes;

    if (!allowedBiomes) {
      throw new Error(`Missing biome set for planet type ${planetType}: ${preset.allowedBiomes}`);
    }

    resolvedPresets[planetType] = {
      ...preset,
      allowedBiomes,
    };
  }

  return resolvedPresets as Record<PlanetType, PlanetPreset>;
}

/**
 * Terrain generation presets for each planet type.
 * These define the biome palette, temperature/moisture offsets, and physical properties.
 *
 * Note: This is distinct from HorizonCalculator's PLANET_PRESETS which defines
 * physical parameters for rendering (gravity, radius, atmosphere curvature).
 */
export const PLANET_TERRAIN_PRESETS: Record<PlanetType, PlanetPreset> = loadPlanetPresets();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the default preset for a planet type.
 */
export function getPlanetPreset(type: PlanetType): PlanetPreset {
  const preset = PLANET_TERRAIN_PRESETS[type];
  if (!preset) {
    throw new Error(`Unknown planet type: ${type}`);
  }
  return preset;
}

/**
 * Create a full planet config from a preset with overrides.
 */
export function createPlanetConfigFromPreset(
  id: string,
  name: string,
  type: PlanetType,
  seed: string,
  overrides?: PlanetPreset
): import('./PlanetTypes.js').PlanetConfig {
  const preset = getPlanetPreset(type);

  return {
    $schema: 'https://aivillage.dev/schemas/planet/v1',
    id,
    name,
    type,
    seed,
    // Core terrain parameters
    temperatureOffset: overrides?.temperatureOffset ?? preset.temperatureOffset ?? 0,
    temperatureScale: overrides?.temperatureScale ?? preset.temperatureScale ?? 1.0,
    moistureOffset: overrides?.moistureOffset ?? preset.moistureOffset ?? 0,
    moistureScale: overrides?.moistureScale ?? preset.moistureScale ?? 1.0,
    elevationOffset: overrides?.elevationOffset ?? preset.elevationOffset ?? 0,
    elevationScale: overrides?.elevationScale ?? preset.elevationScale ?? 1.0,
    seaLevel: overrides?.seaLevel ?? preset.seaLevel ?? -0.3,
    allowedBiomes: overrides?.allowedBiomes ?? preset.allowedBiomes,
    // Physical properties
    ...(preset.gravity !== undefined && { gravity: overrides?.gravity ?? preset.gravity }),
    ...(preset.atmosphereDensity !== undefined && { atmosphereDensity: overrides?.atmosphereDensity ?? preset.atmosphereDensity }),
    ...(preset.atmosphereType !== undefined && { atmosphereType: overrides?.atmosphereType ?? preset.atmosphereType }),
    ...(preset.isTidallyLocked !== undefined && { isTidallyLocked: overrides?.isTidallyLocked ?? preset.isTidallyLocked }),
    ...(preset.isStarless !== undefined && { isStarless: overrides?.isStarless ?? preset.isStarless }),
    ...(preset.dayLengthHours !== undefined && { dayLengthHours: overrides?.dayLengthHours ?? preset.dayLengthHours }),
    ...(preset.skyColor !== undefined && { skyColor: overrides?.skyColor ?? preset.skyColor }),
    // Special terrain features
    ...(preset.hasFloatingIslands && { hasFloatingIslands: true }),
    ...(preset.hasLavaFlows && { hasLavaFlows: true }),
    ...(preset.hasCrystalFormations && { hasCrystalFormations: true }),
    ...(preset.hasCarbonFormations && { hasCarbonFormations: true }),
    ...(preset.hasSubsurfaceOcean && { hasSubsurfaceOcean: true }),
    ...(preset.hasGiantMushrooms && { hasGiantMushrooms: true }),
    ...(preset.hasMetallicTerrain && { hasMetallicTerrain: true }),
    ...(preset.corruptionLevel !== undefined && { corruptionLevel: preset.corruptionLevel }),
    ...(preset.description && { description: preset.description }),
    // Apply overrides for special features
    ...(overrides?.hasFloatingIslands !== undefined && { hasFloatingIslands: overrides.hasFloatingIslands }),
    ...(overrides?.hasLavaFlows !== undefined && { hasLavaFlows: overrides.hasLavaFlows }),
    ...(overrides?.hasCrystalFormations !== undefined && { hasCrystalFormations: overrides.hasCrystalFormations }),
    ...(overrides?.hasCarbonFormations !== undefined && { hasCarbonFormations: overrides.hasCarbonFormations }),
    ...(overrides?.hasSubsurfaceOcean !== undefined && { hasSubsurfaceOcean: overrides.hasSubsurfaceOcean }),
    ...(overrides?.hasGiantMushrooms !== undefined && { hasGiantMushrooms: overrides.hasGiantMushrooms }),
    ...(overrides?.hasMetallicTerrain !== undefined && { hasMetallicTerrain: overrides.hasMetallicTerrain }),
    ...(overrides?.corruptionLevel !== undefined && { corruptionLevel: overrides.corruptionLevel }),
    ...(overrides?.description && { description: overrides.description }),
  };
}

/**
 * Create a default "homeworld" terrestrial planet config.
 */
export function createHomeworldConfig(universeSeed: string): import('./PlanetTypes.js').PlanetConfig {
  return createPlanetConfigFromPreset(
    'planet:homeworld',
    'Homeworld',
    'terrestrial',
    `${universeSeed}:homeworld`,
    { description: 'The starting world - a diverse terrestrial planet in the habitable zone.' }
  );
}

/**
 * Get a random planet type weighted by scientific frequency.
 *
 * Based on Kepler mission statistics:
 * - Super-Earths are most common
 * - Gas dwarfs are very common
 * - Terrestrial (Earth-sized habitable) are rare
 */
export function getRandomPlanetType(rng: () => number): PlanetType {
  const roll = rng();

  // Weights roughly based on exoplanet frequency
  if (roll < 0.25) return 'super_earth';      // 25% - most common rocky
  if (roll < 0.40) return 'gas_dwarf';        // 15% - mini-Neptunes common
  if (roll < 0.50) return 'desert';           // 10% - Mars-like common
  if (roll < 0.58) return 'ice';              // 8% - frozen worlds
  if (roll < 0.65) return 'ocean';            // 7% - waterworlds
  if (roll < 0.70) return 'tidally_locked';   // 5% - around red dwarfs
  if (roll < 0.75) return 'volcanic';         // 5% - tidally heated
  if (roll < 0.79) return 'moon';             // 4% - satellites
  if (roll < 0.83) return 'hycean';           // 4% - new class
  if (roll < 0.86) return 'rogue';            // 3% - wanderers
  if (roll < 0.89) return 'carbon';           // 3% - exotic
  if (roll < 0.92) return 'iron';             // 3% - chthonian cores
  if (roll < 0.95) return 'terrestrial';      // 3% - Earth-like rare!
  if (roll < 0.97) return 'magical';          // 2% - fantasy
  if (roll < 0.98) return 'fungal';           // 1% - alien life
  if (roll < 0.99) return 'crystal';          // 1% - exotic
  return 'corrupted';                          // 1% - dark realms
}
