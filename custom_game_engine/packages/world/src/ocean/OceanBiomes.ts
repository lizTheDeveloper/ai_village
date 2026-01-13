/**
 * OceanBiomes - Planetary-scale ocean depth zones with physical properties
 *
 * Implements realistic ocean stratification:
 * - Epipelagic (0 to -200m): Sunlight zone - photosynthesis, most life
 * - Mesopelagic (-200 to -1000m): Twilight zone - dim light, bioluminescence
 * - Bathypelagic (-1000 to -4000m): Midnight zone - pitch black, extreme pressure
 * - Abyssal (-4000 to -6000m): Deep ocean floor - near-freezing, sparse life
 * - Hadal (-6000 to -11000m): Ocean trenches - crushing pressure, chemosynthesis
 *
 * Physical formulas:
 * - Pressure: P = ρgh (1 ATM per 10m depth)
 * - Light decay: Beer-Lambert law (exponential)
 * - Temperature: Thermocline at 200-1000m, then near-freezing
 */

export type OceanBiomeZone =
  | 'epipelagic'
  | 'mesopelagic'
  | 'bathypelagic'
  | 'abyssal'
  | 'hadal';

/**
 * Ocean biome zone properties.
 */
export interface OceanZoneProperties {
  name: string;
  depthRange: [number, number]; // [min_depth, max_depth] in meters
  lightLevel: number; // 0-100
  temperature: number; // °C
  pressureAtm: number; // Atmospheres
  photosynthesis: boolean;
  bioluminescence: boolean;
  energySource: 'sunlight' | 'detritus' | 'hydrothermal';
  lifeDensity: number; // 0-1
  description: string;
}

/**
 * Ocean zone definitions from PLANETARY_WATER_PHYSICS_SPEC.md
 */
export const OCEAN_ZONES: Record<OceanBiomeZone, OceanZoneProperties> = {
  epipelagic: {
    name: 'Epipelagic Zone',
    depthRange: [0, -200],
    lightLevel: 100,
    temperature: 20, // 10-25°C depending on latitude
    pressureAtm: 1, // 1-20 atm
    photosynthesis: true,
    bioluminescence: false,
    energySource: 'sunlight',
    lifeDensity: 0.9,
    description:
      'Sunlit surface waters. Photosynthesis drives ecosystem. Most marine life here. Kelp forests, coral reefs, fish schools.',
  },

  mesopelagic: {
    name: 'Mesopelagic Zone',
    depthRange: [-200, -1000],
    lightLevel: 10, // Twilight zone
    temperature: 10, // 5-15°C
    pressureAtm: 100, // 20-100 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'detritus', // "Marine snow" falling from above
    lifeDensity: 0.5,
    description:
      'Twilight zone. Dim blue light fades to black. Bioluminescence begins. Predators with large eyes hunt in gloom.',
  },

  bathypelagic: {
    name: 'Bathypelagic Zone',
    depthRange: [-1000, -4000],
    lightLevel: 0, // Midnight zone
    temperature: 4, // Near-freezing
    pressureAtm: 400, // 100-400 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'detritus',
    lifeDensity: 0.2,
    description:
      'Midnight zone. Pitch black. Extreme pressure. Bioluminescent creatures flash to hunt. Alien-looking fish with huge mouths.',
  },

  abyssal: {
    name: 'Abyssal Zone',
    depthRange: [-4000, -6000],
    lightLevel: 0,
    temperature: 2, // 0-3°C
    pressureAtm: 600, // 400-600 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'detritus',
    lifeDensity: 0.1,
    description:
      'Abyssal plain. Near-freezing. Crushing pressure. Sparse life. Slow-moving scavengers on seafloor. Occasional whale falls (feasts).',
  },

  hadal: {
    name: 'Hadal Zone',
    depthRange: [-6000, -11000], // Mariana Trench depth
    lightLevel: 0,
    temperature: 1, // 1-4°C (can be higher near vents)
    pressureAtm: 1100, // 600-1100 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'hydrothermal', // Chemosynthetic bacteria at vents
    lifeDensity: 0.15, // Higher than abyssal due to vents
    description:
      'Ocean trenches. Maximum depth. Pressure would crush most life. Hydrothermal vents support chemosynthetic ecosystems. Alien life.',
  },
};

/**
 * Get ocean biome zone for a given depth.
 *
 * @param depth - Depth in meters (negative values)
 * @returns Ocean zone or null if not underwater
 */
export function getOceanBiomeZone(depth: number): OceanBiomeZone | null {
  if (depth >= 0) return null; // Not underwater

  if (depth < -6000) return 'hadal';
  if (depth < -4000) return 'abyssal';
  if (depth < -1000) return 'bathypelagic';
  if (depth < -200) return 'mesopelagic';
  return 'epipelagic';
}

/**
 * Get zone properties for a given depth.
 *
 * @param depth - Depth in meters (negative values)
 * @returns Ocean zone properties or null if not underwater
 */
export function getOceanZoneProperties(
  depth: number
): OceanZoneProperties | null {
  const zone = getOceanBiomeZone(depth);
  return zone ? OCEAN_ZONES[zone] : null;
}

/**
 * Calculate water pressure at depth using P = ρgh formula.
 *
 * @param depth - Depth in meters (negative values)
 * @returns Pressure in atmospheres (1 ATM per 10m depth)
 */
export function calculatePressure(depth: number): number {
  if (depth >= 0) return 1; // Surface = 1 ATM

  // P = ρgh, where ρ (water density) = 1000 kg/m³, g = 9.8 m/s²
  // Simplified: 1 ATM per 10m depth
  return 1 + Math.abs(depth) / 10;
}

/**
 * Calculate light level at depth using Beer-Lambert law (exponential decay).
 *
 * @param depth - Depth in meters (negative values)
 * @returns Light level 0-100 (0 = pitch black, 100 = full sunlight)
 */
export function calculateLightLevel(depth: number): number {
  if (depth >= 0) return 100; // Surface = full light

  // Beer-Lambert law: I = I₀ * e^(-k*z)
  // k (extinction coefficient) ≈ 0.04 for clear ocean water
  // At 200m (epipelagic boundary): ~0.04% light remains
  const k = 0.04;
  const absDepth = Math.abs(depth);
  const lightLevel = 100 * Math.exp(-k * absDepth);

  return Math.max(0, Math.min(100, lightLevel));
}

/**
 * Calculate water temperature at depth.
 *
 * @param depth - Depth in meters (negative values)
 * @param surfaceTemp - Surface temperature in °C (default 20°C)
 * @returns Temperature in °C
 */
export function calculateWaterTemperature(
  depth: number,
  surfaceTemp = 20
): number {
  if (depth >= 0) return surfaceTemp;

  const absDepth = Math.abs(depth);

  // Thermocline: rapid temperature drop from surface to 1000m
  if (absDepth <= 200) {
    // Epipelagic: gradual drop from surface temp to 15°C
    return surfaceTemp - (absDepth / 200) * (surfaceTemp - 15);
  } else if (absDepth <= 1000) {
    // Mesopelagic: thermocline (15°C to 4°C)
    const thermoclineFactor = (absDepth - 200) / 800;
    return 15 - thermoclineFactor * 11; // 15°C → 4°C
  } else {
    // Deep ocean: near-freezing (4°C → 1°C)
    const deepFactor = Math.min(1, (absDepth - 1000) / 5000);
    return 4 - deepFactor * 3; // 4°C → 1°C
  }
}

/**
 * Check if depth allows photosynthesis (requires sunlight).
 *
 * @param depth - Depth in meters (negative values)
 * @returns True if photosynthesis is possible
 */
export function canPhotosynthesize(depth: number): boolean {
  const lightLevel = calculateLightLevel(depth);
  return lightLevel >= 1; // Need at least 1% light for photosynthesis
}

/**
 * Get biome name suitable for Tile.biome field.
 * Maps ocean zones to BiomeType.
 *
 * @param depth - Depth in meters (negative values)
 * @returns BiomeType string ('ocean' for all zones currently)
 */
export function getOceanBiomeType(depth: number): string {
  // For now, all ocean zones map to 'ocean' BiomeType
  // Future: could add specific types like 'ocean_deep', 'ocean_trench'
  return 'ocean';
}
