/**
 * City Generator
 *
 * Procedural city generation using the building library.
 * Generates cities from grid-based planned towns to non-Euclidean nightmares.
 *
 * Usage:
 *   import { generateCity, CityType } from './city-generator';
 *   const city = generateCity({ type: 'grid', size: 'medium', species: 'medium' });
 */

import { VoxelBuildingDefinition, BuilderSpecies } from './types';
import {
  ALL_BUILDINGS,
  RESIDENTIAL_BUILDINGS as ALL_HOUSES,
  PRODUCTION_BUILDINGS as ALL_PRODUCTION,
  COMMERCIAL_BUILDINGS as ALL_COMMERCIAL,
  STORAGE_BUILDINGS as ALL_STORAGE,
  COMMUNITY_BUILDINGS as ALL_COMMUNITY,
  MILITARY_BUILDINGS as ALL_MILITARY,
  FARMING_BUILDINGS as ALL_FARMING,
  RESEARCH_BUILDINGS as ALL_RESEARCH,
} from './building-library-data';
import { cityFengShuiAnalyzer, type CityHarmonyAnalysis } from './city-feng-shui';
import cityConfig from '../data/city-config.json';

// =============================================================================
// TYPES
// =============================================================================

export type CityType =
  | 'grid'           // Planned human city with orthogonal streets
  | 'organic'        // Medieval organic growth
  | 'flying'         // Vertical city for flying creatures
  | 'non_euclidean'  // R'lyeh-style impossible geometry
  | 'dwarven'        // Underground vertical fortress (Dwarf Fortress homage)
  | 'literary'       // Underground literary realm (The Footnotes, Libraries)
  // Alien & Fantastical
  | 'crystalline'    // Geometric crystal lattice with resonance chambers
  | 'hive'           // Insectoid hexagonal cells and pheromone highways
  | 'fungal'         // Mycelium network with spore towers
  | 'aquatic'        // Underwater bubble domes and current highways
  | 'temporal'       // Exists across multiple time periods simultaneously
  | 'dream'          // Surreal Escher-like shifting architecture
  | 'void'           // Floating fragments in the space between stars
  | 'symbiotic'      // Living organism that IS the city
  | 'fractal'        // Self-similar recursive patterns at every scale
  | 'musical';       // Built from solidified sound and harmonic resonance

export type CitySize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export type DistrictType =
  | 'civic'        // Town hall, temples, schools
  | 'market'       // Shops, taverns, trading posts
  | 'residential'  // Houses of various tiers
  | 'industrial'   // Forges, workshops, tanneries
  | 'research'     // Libraries, labs, observatories
  | 'agricultural' // Farms, barns, mills
  | 'storage'      // Warehouses, silos, granaries
  | 'military'     // Barracks, armory, guard posts
  | 'slums'        // Poor housing
  | 'wealthy'      // Rich housing, manors
  // Dwarven underground
  | 'mine'         // Mining tunnels and ore extraction
  | 'forge'        // Magma forges, metalworking
  | 'greathall'    // Grand dining and meeting halls
  | 'crafthall'    // Workshops for skilled crafts
  | 'mushroom_farm' // Underground fungal farms
  // Literary underground
  | 'library'      // The great libraries and archives
  | 'margins'      // Space between written lines
  | 'footnotes'    // Underground realm of citations
  | 'typo_void'    // Chaotic misspelled realm
  | 'scriptorium'  // Where books are written
  // Crystalline districts
  | 'resonance_chamber'  // Harmonic frequency zones
  | 'prism_core'         // Central light-splitting nexus
  | 'facet_housing'      // Geometric living spaces
  | 'refraction_lab'     // Light manipulation research
  // Hive districts
  | 'brood_chamber'      // Where larvae grow
  | 'royal_cell'         // Queen's domain
  | 'worker_warren'      // Dense worker housing
  | 'nectar_store'       // Resource storage
  | 'pheromone_hub'      // Communication center
  // Fungal districts
  | 'mycelium_network'   // Underground connections
  | 'spore_tower'        // Reproduction/communication
  | 'decomposition_pit'  // Breaking down matter
  | 'fruiting_body'      // Surface structures
  // Aquatic districts
  | 'bubble_dome'        // Air-filled living spaces
  | 'kelp_forest'        // Farming/oxygen production
  | 'pressure_lock'      // Entry/exit zones
  | 'current_channel'    // Transportation highways
  | 'abyssal_shrine'     // Deep religious sites
  // Temporal districts
  | 'past_echo'          // Ruins of what was
  | 'present_anchor'     // Stable current moment
  | 'future_shadow'      // What may yet be
  | 'chrono_nexus'       // Time manipulation center
  | 'paradox_zone'       // Unstable temporal region
  // Dream districts
  | 'lucid_plaza'        // Clear, controlled space
  | 'nightmare_quarter'  // Dark twisted areas
  | 'memory_palace'      // Stored experiences
  | 'impossible_stair'   // Escher architecture
  | 'waking_edge'        // Boundary with reality
  // Void districts
  | 'gravity_anchor'     // Stable platform
  | 'star_dock'          // Arrival/departure
  | 'void_garden'        // Growing in nothing
  | 'silence_temple'     // Religious/meditative
  | 'tether_station'     // Connections between fragments
  // Symbiotic districts
  | 'heart_chamber'      // Central pumping organ
  | 'neural_cluster'     // Decision making center
  | 'digestion_tract'    // Processing/manufacturing
  | 'membrane_quarter'   // Outer protective layer
  | 'growth_bud'         // Expansion zones
  // Fractal districts
  | 'seed_pattern'       // Core recursive motif
  | 'iteration_ring'     // Repeating boundary
  | 'scale_bridge'       // Connects different sizes
  | 'infinity_edge'      // Where pattern continues forever
  // Musical districts
  | 'harmony_hall'       // Central consonance
  | 'rhythm_quarter'     // Percussion/timing
  | 'melody_spire'       // High-pitched structures
  | 'bass_foundation'    // Deep vibration base
  | 'dissonance_pit';    // Experimental/unstable

export interface Position {
  x: number;
  y: number;
}

export interface Position3D extends Position {
  z: number;  // Altitude for flying cities
}

export interface Plot {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  districtType: DistrictType;
  building?: VoxelBuildingDefinition;
  rotation?: 0 | 90 | 180 | 270;
}

export interface Street {
  id: string;
  points: Position[];
  width: number;
  type: 'arterial' | 'collector' | 'local' | 'alley';
}

export interface District {
  id: string;
  type: DistrictType;
  bounds: { x: number; y: number; width: number; height: number };
  plots: Plot[];
}

export interface CityLayout {
  width: number;
  height: number;
  grid: string[][];  // ASCII representation
  districts: District[];
  streets: Street[];
  plots: Plot[];
}

export interface CitySpec {
  type: CityType;
  size: CitySize;
  species: BuilderSpecies;
  name?: string;
  seed?: number;
  // Optional overrides
  districtWeights?: Partial<Record<DistrictType, number>>;
  wallsEnabled?: boolean;
  gatesCount?: number;
}

export interface GeneratedCity {
  spec: CitySpec;
  layout: CityLayout;
  buildings: VoxelBuildingDefinition[];
  ascii: string;  // Full ASCII representation
  stats: {
    totalBuildings: number;
    totalPlots: number;
    districtCounts: Record<DistrictType, number>;
    streetLength: number;
  };
  /** City-level Feng Shui harmony analysis */
  harmony?: CityHarmonyAnalysis;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * City sizes scaled for realistic 1 tile = 1 meter scale.
 * Loaded from city-config.json
 */
const CITY_SIZES: Record<CitySize, { sectors: number; tiles: number }> = cityConfig.citySizes as Record<CitySize, { sectors: number; tiles: number }>;

const SECTOR_SIZE = cityConfig.sectorSize;

/**
 * Street widths in tiles (1 tile = 1 meter).
 * Loaded from city-config.json
 */
const STREET_WIDTHS = cityConfig.streetWidths;

/**
 * Minimum distance between settlements (in tiles/meters).
 * Loaded from city-config.json
 */
export const CITY_SPACING: Record<CitySize, number> = cityConfig.citySpacing as Record<CitySize, number>;

/**
 * City generation density per biome (cities per 1,000,000 km²).
 * Loaded from city-config.json
 */
export const CITY_DENSITY_PER_MILLION_KM2: Record<string, number> = Object.fromEntries(
  Object.entries(cityConfig.cityDensityPerMillionKm2).filter(([key]) => !key.startsWith('_'))
) as Record<string, number>;

/**
 * Preferred city types by biome.
 * Loaded from city-config.json
 */
export const BIOME_CITY_TYPES: Record<string, CityType[]> = Object.fromEntries(
  Object.entries(cityConfig.biomeCityTypes).filter(([key]) => !key.startsWith('_'))
) as Record<string, CityType[]>;

/**
 * Maximum city size allowed per biome.
 * Loaded from city-config.json
 */
export const BIOME_MAX_CITY_SIZE: Record<string, CitySize> = cityConfig.biomeMaxCitySize as Record<string, CitySize>;

/**
 * Parse building specification string from JSON config.
 * Format: "BUILDING_CATEGORY[filter]"
 * Examples:
 *   "RESIDENTIAL_BUILDINGS" -> ALL_HOUSES
 *   "RESIDENTIAL_BUILDINGS[tier<=1]" -> ALL_HOUSES.filter(b => b.tier <= 1)
 *   "PRODUCTION_BUILDINGS[name~=forge||tier>=2]" -> ALL_PRODUCTION.filter(b => name includes 'forge' OR tier >= 2)
 */
function parseBuildingSpec(spec: string): VoxelBuildingDefinition[] {
  // Map category names to building arrays
  const categoryMap: Record<string, VoxelBuildingDefinition[]> = {
    RESIDENTIAL_BUILDINGS: ALL_HOUSES,
    PRODUCTION_BUILDINGS: ALL_PRODUCTION,
    COMMERCIAL_BUILDINGS: ALL_COMMERCIAL,
    STORAGE_BUILDINGS: ALL_STORAGE,
    COMMUNITY_BUILDINGS: ALL_COMMUNITY,
    MILITARY_BUILDINGS: ALL_MILITARY,
    FARMING_BUILDINGS: ALL_FARMING,
    RESEARCH_BUILDINGS: ALL_RESEARCH,
  };

  // Parse "CATEGORY[filter]" or just "CATEGORY"
  const match = spec.match(/^([A-Z_]+)(?:\[(.+)\])?$/);
  if (!match) {
    throw new Error(`Invalid building spec: ${spec}`);
  }

  const [, category, filterExpr] = match;
  if (!category) {
    throw new Error(`Invalid building spec format: ${spec}`);
  }
  const buildings = categoryMap[category];

  if (!buildings) {
    throw new Error(`Unknown building category: ${category}`);
  }

  // No filter - return all buildings
  if (!filterExpr) {
    return buildings;
  }

  // Parse filter expression
  // Support: tier<=1, tier>=3, name~=forge, name~=forge||tier>=2
  return buildings.filter((b: VoxelBuildingDefinition) => {
    // Split on || for OR conditions
    const conditions = filterExpr.split('||');

    for (const cond of conditions) {
      const trimmed = cond.trim();

      // tier<=N
      const tierLteMatch = trimmed.match(/^tier<=(\d+)$/);
      if (tierLteMatch) {
        const matchedValue = tierLteMatch[1];
        if (!matchedValue) {
          throw new Error(`Invalid tier<= filter: ${trimmed}`);
        }
        const value = parseInt(matchedValue);
        if (b.tier <= value) return true;
      }
      // tier>=N
      const tierGteMatch = trimmed.match(/^tier>=(\d+)$/);
      if (tierGteMatch) {
        const matchedValue = tierGteMatch[1];
        if (!matchedValue) {
          throw new Error(`Invalid tier>= filter: ${trimmed}`);
        }
        const value = parseInt(matchedValue);
        if (b.tier >= value) return true;
      }
      // name~=value (contains)
      const nameMatch = trimmed.match(/^name~=(.+)$/);
      if (nameMatch) {
        const value = nameMatch[1];
        if (!value) {
          throw new Error(`Invalid name~= filter: ${trimmed}`);
        }
        if (b.name?.toLowerCase().includes(value.toLowerCase())) return true;
      }
    }

    return false;
  });
}

/**
 * Build DISTRICT_BUILDINGS from JSON config.
 * Parses building specifications and applies filters.
 */
function buildDistrictBuildings(): Record<DistrictType, VoxelBuildingDefinition[]> {
  const result = {} as Record<DistrictType, VoxelBuildingDefinition[]>;

  for (const [district, spec] of Object.entries(cityConfig.districtBuildings)) {
    if (district.startsWith('_')) continue; // Skip comments
    result[district as DistrictType] = parseBuildingSpec(spec as string);
  }

  return result;
}

// District preferences for building categories (loaded from city-config.json)
const DISTRICT_BUILDINGS: Record<DistrictType, VoxelBuildingDefinition[]> = buildDistrictBuildings();

// District adjacency preferences (loaded from city-config.json)
export const DISTRICT_AFFINITIES: Record<DistrictType, { prefer: DistrictType[]; avoid: DistrictType[] }> =
  cityConfig.districtAffinities as unknown as Record<DistrictType, { prefer: DistrictType[]; avoid: DistrictType[] }>;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = result[i];
      const swapVal = result[j];
      if (temp === undefined || swapVal === undefined) {
        throw new Error('Array shuffle encountered undefined value');
      }
      result[i] = swapVal;
      result[j] = temp;
    }
    return result;
  }

  pick<T>(array: T[]): T {
    const index = Math.floor(this.next() * array.length);
    const value = array[index];
    if (value === undefined) {
      throw new Error(`Cannot pick from empty or invalid array at index ${index}`);
    }
    return value;
  }

  weightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      const weight = weights[i];
      if (weight === undefined) {
        throw new Error(`Missing weight at index ${i}`);
      }
      random -= weight;
      if (random <= 0) {
        const item = items[i];
        if (item === undefined) {
          throw new Error(`Missing item at index ${i}`);
        }
        return item;
      }
    }
    const lastItem = items[items.length - 1];
    if (lastItem === undefined) {
      throw new Error('Cannot pick from empty items array');
    }
    return lastItem;
  }
}

/**
 * Create empty grid
 */
function createEmptyGrid(width: number, height: number, fill = ' '): string[][] {
  return Array(height).fill(null).map(() => Array(width).fill(fill));
}

/**
 * Draw a filled rectangle on grid
 */
function fillRect(
  grid: string[][],
  x: number,
  y: number,
  width: number,
  height: number,
  char: string
): void {
  // Floor all coordinates to handle fractional inputs
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fw = Math.floor(width);
  const fh = Math.floor(height);
  for (let dy = 0; dy < fh; dy++) {
    for (let dx = 0; dx < fw; dx++) {
      const px = fx + dx;
      const py = fy + dy;
      const firstRow = grid[0];
      if (!firstRow) {
        throw new Error('Grid has no rows');
      }
      if (py >= 0 && py < grid.length && px >= 0 && px < firstRow.length) {
        const row = grid[py];
        if (!row) {
          throw new Error(`Grid row ${py} is undefined`);
        }
        row[px] = char;
      }
    }
  }
}

/**
 * Draw a rectangle outline on grid
 */
function strokeRect(
  grid: string[][],
  x: number,
  y: number,
  width: number,
  height: number,
  char: string
): void {
  // Floor all coordinates to handle fractional inputs
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fw = Math.floor(width);
  const fh = Math.floor(height);
  const gridH = grid.length;
  const gridW = grid[0]?.length ?? 0;
  for (let dx = 0; dx < fw; dx++) {
    const px = fx + dx;
    if (px >= 0 && px < gridW) {
      if (fy >= 0 && fy < gridH) {
        const topRow = grid[fy];
        if (!topRow) {
          throw new Error(`Grid row ${fy} is undefined`);
        }
        topRow[px] = char;
      }
      if (fy + fh - 1 >= 0 && fy + fh - 1 < gridH) {
        const bottomRow = grid[fy + fh - 1];
        if (!bottomRow) {
          throw new Error(`Grid row ${fy + fh - 1} is undefined`);
        }
        bottomRow[px] = char;
      }
    }
  }
  for (let dy = 0; dy < fh; dy++) {
    const py = fy + dy;
    if (py >= 0 && py < gridH) {
      const row = grid[py];
      if (!row) {
        throw new Error(`Grid row ${py} is undefined`);
      }
      if (fx >= 0 && fx < gridW) row[fx] = char;
      if (fx + fw - 1 >= 0 && fx + fw - 1 < gridW) row[fx + fw - 1] = char;
    }
  }
}

/**
 * Draw a line on grid
 */
function drawLine(
  grid: string[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  char: string,
  width = 1
): void {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (true) {
    // Draw with width
    for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
      const firstRow = grid[0];
      if (!firstRow) {
        throw new Error('Grid has no rows');
      }
      if (dx > dy) {
        // Horizontal-ish line, expand vertically
        if (y + w >= 0 && y + w < grid.length && x >= 0 && x < firstRow.length) {
          const row = grid[y + w];
          if (!row) {
            throw new Error(`Grid row ${y + w} is undefined`);
          }
          row[x] = char;
        }
      } else {
        // Vertical-ish line, expand horizontally
        if (y >= 0 && y < grid.length && x + w >= 0 && x + w < firstRow.length) {
          const row = grid[y];
          if (!row) {
            throw new Error(`Grid row ${y} is undefined`);
          }
          row[x + w] = char;
        }
      }
    }

    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

/**
 * Convert grid to string
 */
function gridToString(grid: string[][]): string {
  return grid.map(row => row.join('')).join('\n');
}

/**
 * Get building dimensions from layout
 */
function getBuildingDimensions(building: VoxelBuildingDefinition): { width: number; height: number } {
  const height = building.layout.length;
  const width = Math.max(...building.layout.map(row => row.length));
  return { width, height };
}

/**
 * Check if building fits in plot
 */
function buildingFitsInPlot(building: VoxelBuildingDefinition, plot: Plot): boolean {
  const dims = getBuildingDimensions(building);
  return dims.width <= plot.bounds.width && dims.height <= plot.bounds.height;
}

/**
 * Select building for a plot
 */
function selectBuildingForPlot(
  plot: Plot,
  species: BuilderSpecies,
  rng: SeededRandom
): VoxelBuildingDefinition | undefined {
  const districtBuildings = DISTRICT_BUILDINGS[plot.districtType] || ALL_BUILDINGS;

  // Filter by species and size
  const candidates = districtBuildings.filter(b => {
    // Species compatibility (undefined species = compatible with all)
    const bSpecies = b.species || 'medium';
    const speciesMatch = bSpecies === species ||
      (species === 'medium' && ['small', 'medium', 'tall'].includes(bSpecies)) ||
      (species === 'tall' && ['medium', 'tall'].includes(bSpecies));

    if (!speciesMatch) return false;

    // Size check
    return buildingFitsInPlot(b, plot);
  });

  if (candidates.length === 0) return undefined;

  // Weight by tier and variety
  const weights = candidates.map(b => 1 / (b.tier + 1));
  return rng.weightedPick(candidates, weights);
}

// =============================================================================
// GRID CITY GENERATOR (Planned Human)
// =============================================================================

/**
 * Generate a grid-based planned city.
 * Orthogonal streets, regular blocks, clear zoning.
 */
function generateGridCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  // Create empty grid
  const grid = createEmptyGrid(width, height, '.');

  const streets: Street[] = [];
  const districts: District[] = [];
  const plots: Plot[] = [];

  // Grid parameters
  const blockSize = SECTOR_SIZE * 2;  // 32 tiles per block
  const arterialSpacing = blockSize * 2;  // Every 2 blocks
  const localSpacing = blockSize;

  // 1. Generate arterial roads (main grid)
  let streetId = 0;

  // Horizontal arterials
  for (let y = arterialSpacing; y < height - arterialSpacing / 2; y += arterialSpacing) {
    const street: Street = {
      id: `street_h_${streetId++}`,
      points: [{ x: 0, y }, { x: width - 1, y }],
      width: STREET_WIDTHS.arterial,
      type: 'arterial',
    };
    streets.push(street);
    fillRect(grid, 0, y - 1, width, STREET_WIDTHS.arterial, '=');
  }

  // Vertical arterials
  for (let x = arterialSpacing; x < width - arterialSpacing / 2; x += arterialSpacing) {
    const street: Street = {
      id: `street_v_${streetId++}`,
      points: [{ x, y: 0 }, { x, y: height - 1 }],
      width: STREET_WIDTHS.arterial,
      type: 'arterial',
    };
    streets.push(street);
    fillRect(grid, x - 1, 0, STREET_WIDTHS.arterial, height, '|');
  }

  // Intersection markers
  for (let y = arterialSpacing; y < height - arterialSpacing / 2; y += arterialSpacing) {
    for (let x = arterialSpacing; x < width - arterialSpacing / 2; x += arterialSpacing) {
      fillRect(grid, x - 1, y - 1, STREET_WIDTHS.arterial, STREET_WIDTHS.arterial, '+');
    }
  }

  // 2. Generate local streets within blocks
  for (let by = 0; by < height; by += arterialSpacing) {
    for (let bx = 0; bx < width; bx += arterialSpacing) {
      // Add a local street through the middle of each super-block
      const midX = bx + arterialSpacing / 2;
      const midY = by + arterialSpacing / 2;

      if (midX < width && midY < height) {
        // Vertical local street
        if (midX > 0 && midX < width - 1) {
          fillRect(grid, midX, by, STREET_WIDTHS.local, Math.min(arterialSpacing, height - by), '-');
          streets.push({
            id: `local_v_${streetId++}`,
            points: [{ x: midX, y: by }, { x: midX, y: by + arterialSpacing }],
            width: STREET_WIDTHS.local,
            type: 'local',
          });
        }
        // Horizontal local street
        if (midY > 0 && midY < height - 1) {
          fillRect(grid, bx, midY, Math.min(arterialSpacing, width - bx), STREET_WIDTHS.local, '-');
          streets.push({
            id: `local_h_${streetId++}`,
            points: [{ x: bx, y: midY }, { x: bx + arterialSpacing, y: midY }],
            width: STREET_WIDTHS.local,
            type: 'local',
          });
        }
      }
    }
  }

  // 3. Assign districts based on distance from center
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  // District rings
  const districtRings: { maxDist: number; types: DistrictType[] }[] = [
    { maxDist: 0.15, types: ['civic', 'market'] },
    { maxDist: 0.3, types: ['market', 'wealthy', 'research'] },
    { maxDist: 0.5, types: ['residential', 'industrial'] },
    { maxDist: 0.7, types: ['residential', 'storage'] },
    { maxDist: 1.0, types: ['agricultural', 'slums'] },
  ];

  // 4. Create plots within blocks
  let plotId = 0;
  const plotSize = SECTOR_SIZE - 2;  // Leave room for streets

  for (let by = 2; by < height - plotSize; by += localSpacing / 2) {
    for (let bx = 2; bx < width - plotSize; bx += localSpacing / 2) {
      // Skip if on a street
      const cellChar = grid[by]?.[bx];
      if (cellChar === '=' || cellChar === '|' || cellChar === '+' || cellChar === '-') {
        continue;
      }

      // Determine district type by distance from center
      const distFromCenter = Math.sqrt(
        Math.pow(bx + plotSize / 2 - centerX, 2) +
        Math.pow(by + plotSize / 2 - centerY, 2)
      ) / maxDist;

      let districtType: DistrictType = 'residential';
      for (const ring of districtRings) {
        if (distFromCenter <= ring.maxDist) {
          districtType = rng.pick(ring.types);
          break;
        }
      }

      // Create plot
      const plot: Plot = {
        id: `plot_${plotId++}`,
        bounds: { x: bx, y: by, width: plotSize, height: plotSize },
        districtType,
      };

      // Select and assign building
      const building = selectBuildingForPlot(plot, spec.species, rng);
      if (building) {
        plot.building = building;

        // Draw building footprint
        const dims = getBuildingDimensions(building);
        const symbol = getDistrictSymbol(districtType);
        strokeRect(grid, bx, by, dims.width, dims.height, symbol);
      }

      plots.push(plot);
    }
  }

  // 5. Add walls if enabled
  if (spec.wallsEnabled !== false) {
    strokeRect(grid, 0, 0, width, height, '#');

    // Add gates
    const gateCount = spec.gatesCount ?? 4;
    const gatePositions = [
      { x: width / 2, y: 0 },           // North
      { x: width / 2, y: height - 1 },  // South
      { x: 0, y: height / 2 },          // West
      { x: width - 1, y: height / 2 },  // East
    ].slice(0, gateCount);

    for (const gate of gatePositions) {
      grid[Math.floor(gate.y)]![Math.floor(gate.x)]! = 'G';
      // Widen gate
      if (gate.y === 0 || gate.y === height - 1) {
        grid[Math.floor(gate.y)]![Math.floor(gate.x) - 1]! = 'G';
        grid[Math.floor(gate.y)]![Math.floor(gate.x) + 1]! = 'G';
      } else {
        grid[Math.floor(gate.y) - 1]![Math.floor(gate.x)]! = 'G';
        grid[Math.floor(gate.y) + 1]![Math.floor(gate.x)]! = 'G';
      }
    }
  }

  // 6. Mark city center
  fillRect(grid, Math.floor(centerX) - 2, Math.floor(centerY) - 2, 5, 5, 'C');
  grid[Math.floor(centerY)]![Math.floor(centerX)]! = 'T';  // Town hall / temple

  // Compile stats
  const districtCounts: Partial<Record<DistrictType, number>> = {};
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  const streetLength = streets.reduce((sum, s) => {
    const dx = s.points[1]!.x - s.points[0]!.x;
    const dy = s.points[1]!.y - s.points[0]!.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  return {
    spec,
    layout: { width, height, grid, districts, streets, plots },
    buildings: plots.filter(p => p.building).map(p => p.building!),
    ascii: gridToString(grid),
    stats: {
      totalBuildings: plots.filter(p => p.building).length,
      totalPlots: plots.length,
      districtCounts: districtCounts as Record<DistrictType, number>,
      streetLength: Math.round(streetLength),
    },
  };
}

/**
 * Get ASCII symbol for district type
 */
function getDistrictSymbol(type: DistrictType): string {
  const symbols: Record<DistrictType, string> = {
    civic: 'C',
    market: 'M',
    residential: 'R',
    industrial: 'I',
    research: 'L',  // Library
    agricultural: 'F',  // Farm
    storage: 'S',
    military: 'B',  // Barracks
    slums: 'r',  // lowercase residential
    wealthy: 'W',
    // Dwarven districts
    mine: 'M',
    forge: 'F',
    greathall: 'H',
    crafthall: 'C',
    mushroom_farm: 'm',
    // Literary districts
    library: 'L',
    margins: '|',
    footnotes: '¹',
    typo_void: '?',
    scriptorium: 'S',
    // Crystalline districts
    resonance_chamber: '◇',
    prism_core: '◆',
    facet_housing: '⬡',
    refraction_lab: '△',
    // Hive districts
    brood_chamber: '⬢',
    royal_cell: '♕',
    worker_warren: '≋',
    nectar_store: '⚲',
    pheromone_hub: '⊛',
    // Fungal districts
    mycelium_network: '≈',
    spore_tower: '⌂',
    decomposition_pit: '≡',
    fruiting_body: '∩',
    // Aquatic districts
    bubble_dome: '○',
    current_channel: '~',
    kelp_forest: '⌇',
    pressure_lock: '◎',
    abyssal_shrine: '▼',
    // Temporal districts
    past_echo: '←',
    present_anchor: '◈',
    future_shadow: '→',
    chrono_nexus: '⌛',
    paradox_zone: '⧗',
    // Dream districts
    lucid_plaza: '☁',
    nightmare_quarter: '☆',
    memory_palace: '⌘',
    impossible_stair: '∞',
    waking_edge: '│',
    // Void districts
    gravity_anchor: '⚓',
    star_dock: '★',
    void_garden: ' ',
    silence_temple: '●',
    tether_station: '◯',
    // Symbiotic districts
    heart_chamber: '♥',
    neural_cluster: '⊛',
    digestion_tract: '⊗',
    membrane_quarter: '⊕',
    growth_bud: '❁',
    // Fractal districts
    seed_pattern: '⋮',
    iteration_ring: '∿',
    scale_bridge: '※',
    infinity_edge: '∴',
    // Musical districts
    harmony_hall: '♫',
    rhythm_quarter: '♩',
    melody_spire: '♪',
    bass_foundation: '♭',
    dissonance_pit: '♯',
  };
  return symbols[type] || '?';
}

// =============================================================================
// ORGANIC CITY GENERATOR (Medieval)
// =============================================================================

/**
 * Generate an organic medieval city.
 * Voronoi-based blocks, radial growth from center.
 */
function generateOrganicCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '.');
  const streets: Street[] = [];
  const plots: Plot[] = [];

  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Generate Voronoi seed points
  const seedCount = Math.floor(size.sectors * size.sectors * 0.7);
  const seeds: { x: number; y: number; type: DistrictType }[] = [];

  // Central seed (civic)
  seeds.push({ x: centerX, y: centerY, type: 'civic' });

  // Generate other seeds with some clustering
  for (let i = 1; i < seedCount; i++) {
    // Prefer points closer to center initially, spreading out
    const angle = rng.next() * Math.PI * 2;
    const maxRadius = Math.min(width, height) / 2 - 10;
    const radius = Math.pow(rng.next(), 0.7) * maxRadius;  // Bias toward center

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    // Assign district type based on distance
    const distRatio = radius / maxRadius;
    let type: DistrictType;
    if (distRatio < 0.2) {
      type = rng.pick(['civic', 'market', 'wealthy']);
    } else if (distRatio < 0.4) {
      type = rng.pick(['market', 'residential', 'research']);
    } else if (distRatio < 0.6) {
      type = rng.pick(['residential', 'industrial']);
    } else if (distRatio < 0.8) {
      type = rng.pick(['residential', 'storage', 'slums']);
    } else {
      type = rng.pick(['agricultural', 'slums', 'military']);
    }

    seeds.push({ x: Math.floor(x), y: Math.floor(y), type });
  }

  // 2. Create Voronoi-like regions using simple nearest-seed assignment
  const regionMap: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => -1)
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearestSeed = 0;

      for (let i = 0; i < seeds.length; i++) {
        const dist = Math.sqrt(
          Math.pow(x - seeds[i]!.x, 2) + Math.pow(y - seeds[i]!.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestSeed = i;
        }
      }

      regionMap[y]![x]! = nearestSeed;
    }
  }

  // 3. Draw region boundaries as streets
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const current = regionMap[y]![x]!;
      const neighbors = [
        regionMap[y - 1]![x]!,
        regionMap[y + 1]![x]!,
        regionMap[y]![x - 1]!,
        regionMap[y]![x + 1]!,
      ];

      // If any neighbor is different, this is a boundary (street)
      if (neighbors.some(n => n !== current)) {
        grid[y]![x]! = '~';  // Organic street marker
      }
    }
  }

  // 4. Widen main streets (boundaries between different district types)
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (grid[y]![x]! === '~') {
        const current = regionMap[y]![x]!;
        const currentType = seeds[current]?.type;

        // Check if this borders a different district TYPE (not just different region)
        let bordersDifferentType = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighbor = regionMap[y + dy]?.[x + dx];
            if (neighbor !== undefined && neighbor !== current) {
              const neighborType = seeds[neighbor]?.type;
              if (neighborType !== currentType) {
                bordersDifferentType = true;
              }
            }
          }
        }

        if (bordersDifferentType) {
          // Widen to arterial
          grid[y]![x]! = '=';
          if (grid[y - 1]?.[x] === '.') grid[y - 1]![x]! = '=';
          if (grid[y + 1]?.[x] === '.') grid[y + 1]![x]! = '=';
          if (grid[y]?.[x - 1] === '.') grid[y]![x - 1]! = '=';
          if (grid[y]?.[x + 1] === '.') grid[y]![x + 1]! = '=';
        }
      }
    }
  }

  // 5. Create radial roads from center
  const roadCount = rng.nextInt(4, 8);
  for (let i = 0; i < roadCount; i++) {
    const angle = (i / roadCount) * Math.PI * 2 + rng.next() * 0.3;
    const endX = centerX + Math.cos(angle) * (width / 2 - 5);
    const endY = centerY + Math.sin(angle) * (height / 2 - 5);

    drawLine(grid, Math.floor(centerX), Math.floor(centerY),
             Math.floor(endX), Math.floor(endY), '=', 2);
  }

  // 6. Create plots within regions
  let plotId = 0;
  const plotSize = 8;  // Smaller plots for organic city
  const usedCells = new Set<string>();

  for (const seed of seeds) {
    // Find cells belonging to this seed's region
    const regionCells: Position[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (regionMap[y]![x]! === seeds.indexOf(seed)) {
          regionCells.push({ x, y });
        }
      }
    }

    // Place plots within region (not on streets)
    const shuffledCells = rng.shuffle(regionCells);
    let placedInRegion = 0;
    const maxPlotsPerRegion = Math.floor(regionCells.length / (plotSize * plotSize));

    for (const cell of shuffledCells) {
      if (placedInRegion >= maxPlotsPerRegion) break;

      // Check if we can place a plot here
      const key = `${Math.floor(cell.x / plotSize)},${Math.floor(cell.y / plotSize)}`;
      if (usedCells.has(key)) continue;

      // Check if area is clear (not on streets)
      let clear = true;
      for (let dy = 0; dy < plotSize && clear; dy++) {
        for (let dx = 0; dx < plotSize && clear; dx++) {
          const checkY = cell.y + dy;
          const checkX = cell.x + dx;
          if (checkY >= height || checkX >= width ||
              grid[checkY]![checkX]! === '=' || grid[checkY]![checkX]! === '~') {
            clear = false;
          }
        }
      }

      if (clear) {
        usedCells.add(key);

        const plot: Plot = {
          id: `plot_${plotId++}`,
          bounds: { x: cell.x, y: cell.y, width: plotSize, height: plotSize },
          districtType: seed.type,
        };

        // Select building
        const building = selectBuildingForPlot(plot, spec.species, rng);
        if (building) {
          plot.building = building;
          const dims = getBuildingDimensions(building);
          const symbol = getDistrictSymbol(seed.type);
          strokeRect(grid, cell.x, cell.y, Math.min(dims.width, plotSize),
                    Math.min(dims.height, plotSize), symbol);
        }

        plots.push(plot);
        placedInRegion++;
      }
    }
  }

  // 7. Draw city center (market square)
  const squareSize = Math.floor(size.sectors * 1.5);
  fillRect(grid, Math.floor(centerX) - squareSize, Math.floor(centerY) - squareSize,
           squareSize * 2, squareSize * 2, ' ');
  strokeRect(grid, Math.floor(centerX) - squareSize, Math.floor(centerY) - squareSize,
             squareSize * 2, squareSize * 2, 'M');
  grid[Math.floor(centerY)]![Math.floor(centerX)]! = 'T';  // Temple/Town hall

  // 8. Add walls
  if (spec.wallsEnabled !== false) {
    // Organic walls follow a roughly circular pattern
    const wallRadius = Math.min(width, height) / 2 - 3;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const wobble = rng.next() * 4 - 2;
      const wx = Math.floor(centerX + Math.cos(angle) * (wallRadius + wobble));
      const wy = Math.floor(centerY + Math.sin(angle) * (wallRadius + wobble));
      if (wy >= 0 && wy < height && wx >= 0 && wx < width) {
        grid[wy]![wx]! = '#';
      }
    }

    // Add gates where radial roads meet walls
    for (let i = 0; i < roadCount; i++) {
      const angle = (i / roadCount) * Math.PI * 2;
      const gx = Math.floor(centerX + Math.cos(angle) * wallRadius);
      const gy = Math.floor(centerY + Math.sin(angle) * wallRadius);
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
        grid[gy]![gx]! = 'G';
        // Widen gate
        for (let d = -1; d <= 1; d++) {
          const gx2 = Math.floor(centerX + Math.cos(angle + d * 0.05) * wallRadius);
          const gy2 = Math.floor(centerY + Math.sin(angle + d * 0.05) * wallRadius);
          if (gy2 >= 0 && gy2 < height && gx2 >= 0 && gx2 < width) {
            grid[gy2]![gx2]! = 'G';
          }
        }
      }
    }
  }

  // Compile stats
  const districtCounts: Partial<Record<DistrictType, number>> = {};
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets, plots },
    buildings: plots.filter(p => p.building).map(p => p.building!),
    ascii: gridToString(grid),
    stats: {
      totalBuildings: plots.filter(p => p.building).length,
      totalPlots: plots.length,
      districtCounts: districtCounts as Record<DistrictType, number>,
      streetLength: 0,  // Complex to calculate for organic
    },
  };
}

// =============================================================================
// FLYING CITY GENERATOR
// =============================================================================

export interface FlyingCityConfig {
  altitudeBands: {
    elite: { min: number; max: number };
    residential: { min: number; max: number };
    commerce: { min: number; max: number };
    ground: { min: number; max: number };
  };
  landingPadSize: number;
  flightLaneWidth: number;
}

interface FlyingPlot extends Plot {
  altitude: number;
  hasLandingPad: boolean;
  connectedTo: string[];  // IDs of connected plots (flight lanes)
}

/**
 * Generate a vertical flying city.
 * Altitude bands, landing platforms, no ground streets.
 */
function generateFlyingCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  // Flying cities are shown as top-down with altitude indicated
  const grid = createEmptyGrid(width, height, '·');  // Air
  const plots: FlyingPlot[] = [];
  const streets: Street[] = [];

  const centerX = width / 2;
  const centerY = height / 2;

  // Altitude configuration
  const config: FlyingCityConfig = {
    altitudeBands: {
      elite: { min: 80, max: 120 },
      residential: { min: 40, max: 80 },
      commerce: { min: 20, max: 50 },
      ground: { min: 0, max: 20 },
    },
    landingPadSize: 4,
    flightLaneWidth: 8,
  };

  // 1. Place central temple/spire at highest point
  const templeX = Math.floor(centerX);
  const templeY = Math.floor(centerY);
  fillRect(grid, templeX - 3, templeY - 3, 7, 7, '△');  // Spire symbol
  grid[templeY]![templeX]! = '▲';  // Peak

  plots.push({
    id: 'temple_spire',
    bounds: { x: templeX - 3, y: templeY - 3, width: 7, height: 7 },
    districtType: 'civic',
    altitude: config.altitudeBands.elite.max,
    hasLandingPad: true,
    connectedTo: [],
  });

  // 2. Generate thermal column locations (preferred building spots)
  const thermalCount = rng.nextInt(3, 6);
  const thermals: Position[] = [];
  for (let i = 0; i < thermalCount; i++) {
    const angle = (i / thermalCount) * Math.PI * 2;
    const dist = rng.nextInt(width / 4, width / 3);
    thermals.push({
      x: Math.floor(centerX + Math.cos(angle) * dist),
      y: Math.floor(centerY + Math.sin(angle) * dist),
    });
  }

  // Mark thermals
  for (const thermal of thermals) {
    grid[thermal.y]![thermal.x]! = '○';  // Thermal marker
  }

  // 3. Place buildings in altitude bands
  let plotId = 0;

  // Elite tier - near thermals, high altitude
  for (const thermal of thermals) {
    const offsetX = rng.nextInt(-5, 5);
    const offsetY = rng.nextInt(-5, 5);
    const px = thermal.x + offsetX;
    const py = thermal.y + offsetY;
    const altitude = rng.nextInt(config.altitudeBands.elite.min, config.altitudeBands.elite.max);

    if (px > 5 && px < width - 10 && py > 5 && py < height - 10) {
      const plot: FlyingPlot = {
        id: `elite_${plotId++}`,
        bounds: { x: px, y: py, width: 8, height: 8 },
        districtType: 'wealthy',
        altitude,
        hasLandingPad: true,
        connectedTo: [],
      };

      // Elite buildings are larger, have landing platforms
      strokeRect(grid, px, py, 8, 8, 'W');
      fillRect(grid, px + 1, py + 1, 6, 6, String(Math.floor(altitude / 10) % 10));
      // Landing pad
      fillRect(grid, px + 2, py - 2, 4, 2, '▭');

      plots.push(plot);
    }
  }

  // Residential tier - ring around center
  const resCount = Math.floor(size.sectors * 2);
  for (let i = 0; i < resCount; i++) {
    const angle = (i / resCount) * Math.PI * 2 + rng.next() * 0.5;
    const dist = rng.nextInt(width / 5, width / 3);
    const px = Math.floor(centerX + Math.cos(angle) * dist);
    const py = Math.floor(centerY + Math.sin(angle) * dist);
    const altitude = rng.nextInt(config.altitudeBands.residential.min, config.altitudeBands.residential.max);

    if (px > 3 && px < width - 8 && py > 3 && py < height - 8) {
      // Check for overlap with existing
      let overlaps = false;
      for (const existing of plots) {
        if (Math.abs(existing.bounds.x - px) < 10 && Math.abs(existing.bounds.y - py) < 10) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        const plot: FlyingPlot = {
          id: `res_${plotId++}`,
          bounds: { x: px, y: py, width: 6, height: 6 },
          districtType: 'residential',
          altitude,
          hasLandingPad: rng.next() > 0.3,
          connectedTo: [],
        };

        strokeRect(grid, px, py, 6, 6, 'R');
        grid[py + 2]![px + 2]! = String(Math.floor(altitude / 10) % 10);

        plots.push(plot);
      }
    }
  }

  // Commerce tier - scattered, lower altitude
  const comCount = Math.floor(size.sectors * 1.5);
  for (let i = 0; i < comCount; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.nextInt(width / 6, width / 2.5);
    const px = Math.floor(centerX + Math.cos(angle) * dist);
    const py = Math.floor(centerY + Math.sin(angle) * dist);
    const altitude = rng.nextInt(config.altitudeBands.commerce.min, config.altitudeBands.commerce.max);

    if (px > 2 && px < width - 6 && py > 2 && py < height - 6) {
      let overlaps = false;
      for (const existing of plots) {
        if (Math.abs(existing.bounds.x - px) < 8 && Math.abs(existing.bounds.y - py) < 8) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        const plot: FlyingPlot = {
          id: `com_${plotId++}`,
          bounds: { x: px, y: py, width: 5, height: 5 },
          districtType: 'market',
          altitude,
          hasLandingPad: true,
          connectedTo: [],
        };

        strokeRect(grid, px, py, 5, 5, 'M');

        plots.push(plot);
      }
    }
  }

  // Ground interface - single trading post
  const groundX = Math.floor(centerX + (rng.next() - 0.5) * width / 3);
  const groundY = height - 12;
  fillRect(grid, groundX - 4, groundY, 9, 8, 'G');
  strokeRect(grid, groundX - 4, groundY, 9, 8, '#');
  grid[groundY + 4]![groundX]! = 'T';  // Trading post

  plots.push({
    id: 'ground_trade',
    bounds: { x: groundX - 4, y: groundY, width: 9, height: 8 },
    districtType: 'market',
    altitude: 0,
    hasLandingPad: true,
    connectedTo: [],
  } as FlyingPlot);

  // 4. Draw flight lanes (dashed lines between connected structures)
  // Connect each plot to nearest neighbors
  for (const plot of plots) {
    const flyingPlot = plot as FlyingPlot;

    // Find 2-3 nearest plots at similar altitude
    const candidates = plots
      .filter(p => p.id !== plot.id)
      .map(p => ({
        plot: p,
        dist: Math.sqrt(
          Math.pow(p.bounds.x - plot.bounds.x, 2) +
          Math.pow(p.bounds.y - plot.bounds.y, 2)
        ),
        altDiff: Math.abs((p as FlyingPlot).altitude - flyingPlot.altitude),
      }))
      .filter(c => c.altDiff < 30)  // Similar altitude
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    for (const candidate of candidates) {
      // Draw dashed flight lane
      const x1 = plot.bounds.x + plot.bounds.width / 2;
      const y1 = plot.bounds.y + plot.bounds.height / 2;
      const x2 = candidate.plot.bounds.x + candidate.plot.bounds.width / 2;
      const y2 = candidate.plot.bounds.y + candidate.plot.bounds.height / 2;

      // Only draw if lane doesn't already exist
      if (!flyingPlot.connectedTo.includes(candidate.plot.id)) {
        flyingPlot.connectedTo.push(candidate.plot.id);
        (candidate.plot as FlyingPlot).connectedTo.push(plot.id);

        // Dashed line
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let s = 0; s < steps; s += 3) {  // Every 3rd pixel
          const t = s / steps;
          const lx = Math.floor(x1 + (x2 - x1) * t);
          const ly = Math.floor(y1 + (y2 - y1) * t);
          if (ly >= 0 && ly < height && lx >= 0 && lx < width) {
            if (grid[ly]![lx]! === '·') {
              grid[ly]![lx]! = '∙';  // Flight lane marker
            }
          }
        }
      }
    }
  }

  // 5. Add altitude legend
  // (In real implementation, would be separate layer)

  // Compile stats
  const districtCounts: Partial<Record<DistrictType, number>> = {};
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets, plots },
    buildings: [],  // Would select from flying-adapted buildings
    ascii: gridToString(grid),
    stats: {
      totalBuildings: plots.length,
      totalPlots: plots.length,
      districtCounts: districtCounts as Record<DistrictType, number>,
      streetLength: 0,  // No streets, flight lanes instead
    },
  };
}

// =============================================================================
// NON-EUCLIDEAN CITY GENERATOR (R'lyeh)
// =============================================================================

interface NonEuclideanPlot extends Plot {
  phase: number;  // Which phase this plot appears in (0 = all phases)
  viewpointVariants: Map<string, string[]>;  // Different layouts from different angles
  portalConnections: Array<{ targetPlotId: string; visualDistortion: string }>;
  sanityDrain: number;  // 0-10
}

/**
 * Generate a non-Euclidean R'lyeh-style city.
 * Impossible geometry, phase-shifting blocks, sanity-draining architecture.
 */
function generateNonEuclideanCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '░');  // Void/uncertain space
  const plots: NonEuclideanPlot[] = [];
  const streets: Street[] = [];

  const centerX = width / 2;
  const centerY = height / 2;
  const phaseCount = 5;  // Number of reality phases

  // 1. Generate the central tomb (always visible)
  const tombSize = Math.floor(size.sectors * 2);
  fillRect(grid, Math.floor(centerX) - tombSize, Math.floor(centerY) - tombSize,
           tombSize * 2, tombSize * 2, '▓');
  strokeRect(grid, Math.floor(centerX) - tombSize, Math.floor(centerY) - tombSize,
             tombSize * 2, tombSize * 2, '█');
  grid[Math.floor(centerY)]![Math.floor(centerX)]! = '卐';  // Ancient symbol at center

  plots.push({
    id: 'central_tomb',
    bounds: {
      x: Math.floor(centerX) - tombSize,
      y: Math.floor(centerY) - tombSize,
      width: tombSize * 2,
      height: tombSize * 2
    },
    districtType: 'civic',
    phase: 0,  // Visible in all phases
    viewpointVariants: new Map(),
    portalConnections: [],
    sanityDrain: 10,
  });

  // 2. Generate impossible angles (corridors that shouldn't connect)
  const corridorCount = rng.nextInt(5, 10);
  for (let i = 0; i < corridorCount; i++) {
    // Start from random edge
    const edge = rng.nextInt(0, 3);
    let startX: number, startY: number, endX: number, endY: number;

    switch (edge) {
      case 0: // Top
        startX = rng.nextInt(10, width - 10);
        startY = 5;
        break;
      case 1: // Right
        startX = width - 5;
        startY = rng.nextInt(10, height - 10);
        break;
      case 2: // Bottom
        startX = rng.nextInt(10, width - 10);
        startY = height - 5;
        break;
      default: // Left
        startX = 5;
        startY = rng.nextInt(10, height - 10);
        break;
    }

    // End at center with impossible curve
    endX = Math.floor(centerX) + rng.nextInt(-tombSize, tombSize);
    endY = Math.floor(centerY) + rng.nextInt(-tombSize, tombSize);

    // Draw with multiple turns that don't make geometric sense
    let x = startX;
    let y = startY;
    const path: Position[] = [{ x, y }];

    while (Math.abs(x - endX) > 3 || Math.abs(y - endY) > 3) {
      // Move in a direction, but sometimes reverse or spiral
      const chaos = rng.next();
      if (chaos < 0.6) {
        // Normal movement toward target
        if (Math.abs(x - endX) > Math.abs(y - endY)) {
          x += x < endX ? 2 : -2;
        } else {
          y += y < endY ? 2 : -2;
        }
      } else if (chaos < 0.8) {
        // Perpendicular movement (wrong direction)
        if (Math.abs(x - endX) > Math.abs(y - endY)) {
          y += rng.next() > 0.5 ? 2 : -2;
        } else {
          x += rng.next() > 0.5 ? 2 : -2;
        }
      } else {
        // Spiral/loop (creates the "acute behaving as obtuse" effect)
        const spiralAngle = rng.next() * Math.PI * 2;
        x += Math.floor(Math.cos(spiralAngle) * 3);
        y += Math.floor(Math.sin(spiralAngle) * 3);
      }

      // Clamp to bounds
      x = Math.max(3, Math.min(width - 3, x));
      y = Math.max(3, Math.min(height - 3, y));

      path.push({ x, y });

      if (y >= 0 && y < height && x >= 0 && x < width) {
        grid[y]![x]! = '≈';  // Impossible corridor
      }
    }

    // Mark the path with phase-dependent visibility
    const pathPhase = rng.nextInt(1, phaseCount);
    for (const point of path) {
      if (point.y >= 0 && point.y < height && point.x >= 0 && point.x < width) {
        // Use number to indicate phase visibility
        if (grid[point.y]![point.x]! === '░') {
          grid[point.y]![point.x]! = String(pathPhase % 10);
        }
      }
    }
  }

  // 3. Generate cyclopean structures (massive, incomprehensible)
  const structureCount = rng.nextInt(8, 15);
  let plotId = 0;

  for (let i = 0; i < structureCount; i++) {
    // Random position, avoiding center tomb
    let px: number, py: number;
    let attempts = 0;
    do {
      px = rng.nextInt(10, width - 20);
      py = rng.nextInt(10, height - 20);
      attempts++;
    } while (
      Math.abs(px - centerX) < tombSize + 10 &&
      Math.abs(py - centerY) < tombSize + 10 &&
      attempts < 20
    );

    if (attempts >= 20) continue;

    // Size varies wildly (cyclopean = massive scale variation)
    const structWidth = rng.nextInt(5, 20);
    const structHeight = rng.nextInt(5, 20);

    // Phase visibility (some structures only appear in certain phases)
    const phase = rng.next() > 0.3 ? rng.nextInt(1, phaseCount) : 0;

    // Sanity drain based on impossibility
    const sanityDrain = rng.nextInt(2, 8);

    // Structure shape - various impossible geometries
    const shapeType = rng.nextInt(0, 4);

    switch (shapeType) {
      case 0: // Inverted pyramid (stalactite-like)
        for (let dy = 0; dy < structHeight; dy++) {
          const rowWidth = Math.floor(structWidth * (1 - dy / structHeight));
          const startX = px + Math.floor((structWidth - rowWidth) / 2);
          for (let dx = 0; dx < rowWidth; dx++) {
            if (py + dy < height && startX + dx < width) {
              grid[py + dy]![startX + dx]! = phase === 0 ? '▼' : String(phase);
            }
          }
        }
        break;

      case 1: // Spiral tower
        for (let ring = 0; ring < Math.min(structWidth, structHeight) / 2; ring++) {
          const size = Math.min(structWidth, structHeight) - ring * 2;
          strokeRect(grid, px + ring, py + ring, size, size,
                    phase === 0 ? '◊' : String(phase));
        }
        break;

      case 2: // Fractured cube (gaps that shouldn't exist)
        strokeRect(grid, px, py, structWidth, structHeight, phase === 0 ? '□' : String(phase));
        // Add impossible gaps
        for (let g = 0; g < 3; g++) {
          const gx = px + rng.nextInt(1, structWidth - 2);
          const gy = py + rng.nextInt(1, structHeight - 2);
          if (gy < height && gx < width) {
            grid[gy]![gx]! = '⌀';  // Void/gap
          }
        }
        break;

      case 3: // Blob (organic, Cthulhu-esque)
        for (let dy = 0; dy < structHeight; dy++) {
          for (let dx = 0; dx < structWidth; dx++) {
            const distFromCenter = Math.sqrt(
              Math.pow(dx - structWidth / 2, 2) +
              Math.pow(dy - structHeight / 2, 2)
            );
            const threshold = (structWidth / 2) * (0.7 + 0.3 * Math.sin(dx * 0.5 + dy * 0.3));
            if (distFromCenter < threshold) {
              if (py + dy < height && px + dx < width) {
                grid[py + dy]![px + dx]! = phase === 0 ? '◎' : String(phase);
              }
            }
          }
        }
        break;

      default: // Standard but wrong-angled
        // Draw rectangle but with "impossible" markers at corners
        strokeRect(grid, px, py, structWidth, structHeight, phase === 0 ? '▢' : String(phase));
        // Mark corners as angle anomalies
        if (py < height && px < width) grid[py]![px]! = '∠';
        if (py < height && px + structWidth - 1 < width) grid[py]![px + structWidth - 1]! = '∠';
        if (py + structHeight - 1 < height && px < width) grid[py + structHeight - 1]![px]! = '∠';
        if (py + structHeight - 1 < height && px + structWidth - 1 < width) {
          grid[py + structHeight - 1]![px + structWidth - 1]! = '∠';
        }
    }

    // Create portal connections to random other structures
    const portalConnections: NonEuclideanPlot['portalConnections'] = [];
    if (rng.next() > 0.4 && plotId > 0) {
      const targetPlot = plots[rng.nextInt(0, plots.length - 1)]!;
      portalConnections.push({
        targetPlotId: targetPlot.id,
        visualDistortion: rng.pick([
          'acute_obtuse',      // Angles look wrong
          'concave_convex',    // Surfaces invert
          'scale_shift',       // Size changes with distance
          'time_echo',         // See past/future versions
          'phase_bleed',       // Multiple phases visible at once
        ]),
      });
    }

    plots.push({
      id: `structure_${plotId++}`,
      bounds: { x: px, y: py, width: structWidth, height: structHeight },
      districtType: 'research',  // Eldritch "research"
      phase,
      viewpointVariants: new Map(),
      portalConnections,
      sanityDrain,
    });
  }

  // 4. Add reality tears (phase boundaries visible as cracks)
  const tearCount = rng.nextInt(5, 12);
  for (let i = 0; i < tearCount; i++) {
    const x1 = rng.nextInt(0, width - 1);
    const y1 = rng.nextInt(0, height - 1);
    const x2 = x1 + rng.nextInt(-30, 30);
    const y2 = y1 + rng.nextInt(-30, 30);

    // Draw jagged line
    let x = x1;
    let y = y1;
    while (Math.abs(x - x2) > 1 || Math.abs(y - y2) > 1) {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        grid[y]![x]! = '╳';  // Reality tear
      }
      // Jagged movement
      x += (x < x2 ? 1 : -1) + rng.nextInt(-1, 1);
      y += (y < y2 ? 1 : -1) + rng.nextInt(-1, 1);
      x = Math.max(0, Math.min(width - 1, x));
      y = Math.max(0, Math.min(height - 1, y));
    }
  }

  // 5. "Streets" that loop impossibly
  const loopCount = rng.nextInt(3, 7);
  for (let i = 0; i < loopCount; i++) {
    // Start point
    const sx = rng.nextInt(width / 4, 3 * width / 4);
    const sy = rng.nextInt(height / 4, 3 * height / 4);

    // Create a loop that returns to start via impossible path
    let x = sx;
    let y = sy;
    const loopLength = rng.nextInt(20, 50);

    for (let step = 0; step < loopLength; step++) {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        if (grid[y]![x]! === '░') {
          grid[y]![x]! = '∞';  // Infinite loop marker
        }
      }

      // Move in a circle, but with distortions
      const angle = (step / loopLength) * Math.PI * 2;
      const radius = 10 + rng.next() * 5;
      x = Math.floor(sx + Math.cos(angle) * radius);
      y = Math.floor(sy + Math.sin(angle) * radius);
    }

    streets.push({
      id: `loop_${i}`,
      points: [{ x: sx, y: sy }],  // Loops back to itself
      width: 1,
      type: 'local',
    });
  }

  // 6. Add legend for phases
  // (In top-left corner, show phase indicators)
  for (let p = 1; p <= phaseCount; p++) {
    if (p < height) {
      grid[p]![1]! = String(p);
      grid[p]![2]! = ':';
      grid[p]![3]! = 'P';
      grid[p]![4]! = 'h';
      grid[p]![5]! = String(p);
    }
  }

  // Calculate total sanity drain
  const totalSanityDrain = plots.reduce((sum, p) => sum + p.sanityDrain, 0);

  // Compile stats
  const districtCounts: Partial<Record<DistrictType, number>> = {};
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets, plots: plots as Plot[] },
    buildings: [],  // Would use exotic-buildings tesseract/penteract
    ascii: gridToString(grid) + `\n\n[Sanity Drain: ${totalSanityDrain}] [Phases: ${phaseCount}]`,
    stats: {
      totalBuildings: plots.length,
      totalPlots: plots.length,
      districtCounts: districtCounts as Record<DistrictType, number>,
      streetLength: loopCount,  // Loops, not length
    },
  };
}

// =============================================================================
// DWARVEN UNDERGROUND CITY GENERATOR (Dwarf Fortress Homage)
// =============================================================================

/**
 * Dwarven z-level configuration
 */
interface DwarvenLevel {
  z: number;
  name: string;
  districts: DistrictType[];
  char: string;
}

const DWARVEN_LEVELS: DwarvenLevel[] = [
  { z: 0, name: 'Surface Gate', districts: ['military'], char: '▲' },
  { z: -1, name: 'Upper Halls', districts: ['greathall', 'residential'], char: '═' },
  { z: -2, name: 'Living Quarters', districts: ['residential', 'storage'], char: '▒' },
  { z: -3, name: 'Craft Halls', districts: ['crafthall', 'industrial'], char: '◊' },
  { z: -4, name: 'Mushroom Farms', districts: ['mushroom_farm', 'agricultural'], char: '♣' },
  { z: -5, name: 'Deep Storage', districts: ['storage', 'mine'], char: '▓' },
  { z: -6, name: 'Mining Tunnels', districts: ['mine'], char: '░' },
  { z: -7, name: 'Magma Forges', districts: ['forge'], char: '▼' },
];

/**
 * Generate a Dwarven underground fortress city.
 * Vertical layers with central great stairway, inspired by Dwarf Fortress.
 */
function generateDwarvenCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  // Create grid showing cross-section view
  const grid = createEmptyGrid(width, height, '█');  // Solid rock

  const streets: Street[] = [];
  const plots: Plot[] = [];
  let plotId = 0;

  // Central great stairway shaft
  const shaftWidth = Math.floor(width * 0.15);
  const shaftX = Math.floor((width - shaftWidth) / 2);

  // Draw the great stairway (vertical shaft through all levels)
  for (let y = 0; y < height; y++) {
    for (let x = shaftX; x < shaftX + shaftWidth; x++) {
      // Shaft walls
      if (x === shaftX || x === shaftX + shaftWidth - 1) {
        grid[y]![x]! = '║';
      } else {
        // Stair pattern
        const stairPhase = (y + x) % 4;
        grid[y]![x]! = stairPhase < 2 ? '═' : ' ';
      }
    }
  }

  // Calculate z-level boundaries (vertical stripes of the cross-section)
  const levelsToShow = Math.min(DWARVEN_LEVELS.length, Math.floor(height / 8));
  const levelHeight = Math.floor(height / levelsToShow);

  // Generate each level
  for (let levelIdx = 0; levelIdx < levelsToShow; levelIdx++) {
    const level = DWARVEN_LEVELS[levelIdx]!;
    const levelTop = levelIdx * levelHeight;
    const levelBottom = Math.min(levelTop + levelHeight - 1, height - 1);

    // Draw level separator (floor/ceiling)
    for (let x = 0; x < width; x++) {
      if (x < shaftX || x >= shaftX + shaftWidth) {
        grid[levelTop]![x]! = '━';
      }
    }

    // Level label on left
    const labelY = levelTop + Math.floor(levelHeight / 2);
    const label = `Z${level!.z}`;
    for (let i = 0; i < Math.min(label.length, 3); i++) {
      grid[labelY]![i]! = label[i]!;
    }

    // Generate rooms on this level
    const roomsPerSide = rng.nextInt(2, 4);
    const roomWidth = Math.floor((shaftX - 4) / roomsPerSide);
    const roomHeight = Math.floor((levelBottom - levelTop - 2) * 0.8);

    // Left side rooms
    for (let r = 0; r < roomsPerSide; r++) {
      const rx = 4 + r * (roomWidth + 1);
      const ry = levelTop + 2;
      const rw = roomWidth - 1;
      const rh = Math.max(3, roomHeight - rng.nextInt(0, 2));

      if (rx + rw < shaftX - 1) {
        // Carve room from rock
        fillRect(grid, rx, ry, rw, rh, level!.char);
        strokeRect(grid, rx, ry, rw, rh, '│');

        // Door to corridor
        grid[ry + Math.floor(rh / 2)]![rx + rw]! = '▪';

        const districtType = rng.pick(level!.districts);
        const plot: Plot = {
          id: `plot_${plotId++}`,
          bounds: { x: rx, y: ry, width: rw, height: rh },
          districtType,
          building: selectBuildingForPlot(
            { id: '', bounds: { x: rx, y: ry, width: rw, height: rh }, districtType },
            spec.species,
            rng
          ),
        };
        plots.push(plot);

        // Draw district marker
        const marker = districtType === 'mine' ? '⛏' :
                       districtType === 'forge' ? '🔥' :
                       districtType === 'greathall' ? '♔' :
                       districtType === 'crafthall' ? '⚒' :
                       districtType === 'mushroom_farm' ? '♣' :
                       districtType === 'residential' ? '☗' :
                       districtType === 'storage' ? '□' :
                       districtType === 'military' ? '⚔' : '◊';
        grid[ry + 1]![rx + 1]! = marker[0]!;
      }
    }

    // Right side rooms (mirror)
    for (let r = 0; r < roomsPerSide; r++) {
      const rx = shaftX + shaftWidth + 2 + r * (roomWidth + 1);
      const ry = levelTop + 2;
      const rw = roomWidth - 1;
      const rh = Math.max(3, roomHeight - rng.nextInt(0, 2));

      if (rx + rw < width - 2) {
        fillRect(grid, rx, ry, rw, rh, level!.char);
        strokeRect(grid, rx, ry, rw, rh, '│');
        grid[ry + Math.floor(rh / 2)]![rx]! = '▪';

        const districtType = rng.pick(level!.districts);
        const plot: Plot = {
          id: `plot_${plotId++}`,
          bounds: { x: rx, y: ry, width: rw, height: rh },
          districtType,
          building: selectBuildingForPlot(
            { id: '', bounds: { x: rx, y: ry, width: rw, height: rh }, districtType },
            spec.species,
            rng
          ),
        };
        plots.push(plot);

        const marker = districtType === 'mine' ? 'M' :
                       districtType === 'forge' ? 'F' :
                       districtType === 'greathall' ? 'H' :
                       districtType === 'crafthall' ? 'C' :
                       districtType === 'mushroom_farm' ? 'm' :
                       districtType === 'residential' ? 'R' :
                       districtType === 'storage' ? 'S' :
                       districtType === 'military' ? 'B' : 'X';
        grid[ry + 1]![rx + 1]! = marker;
      }
    }

    // Horizontal corridor connecting rooms on each level
    const corridorY = levelTop + Math.floor(levelHeight / 2);
    for (let x = 4; x < shaftX - 1; x++) {
      if (grid[corridorY]![x]! === '█') {
        grid[corridorY]![x]! = '·';
      }
    }
    for (let x = shaftX + shaftWidth + 1; x < width - 2; x++) {
      if (grid[corridorY]![x]! === '█') {
        grid[corridorY]![x]! = '·';
      }
    }
  }

  // Add fortress entrance at top
  const gateX = Math.floor(width / 2);
  grid[0]![gateX - 2]! = '┏';
  grid[0]![gateX - 1]! = '━';
  grid[0]![gateX]! = '▼';
  grid[0]![gateX + 1]! = '━';
  grid[0]![gateX + 2]! = '┓';
  grid[1]![gateX]! = '│';

  // Add magma pool at bottom levels
  const magmaY = height - 3;
  for (let x = 4; x < width - 4; x++) {
    if (rng.next() < 0.3) {
      grid[magmaY]![x]! = '~';  // Magma
      grid[magmaY + 1]![x]! = rng.next() < 0.5 ? '~' : '≈';
    }
  }

  // Compile stats
  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets, plots },
    buildings: plots.map(p => p.building).filter(Boolean) as VoxelBuildingDefinition[],
    ascii: gridToString(grid) + `\n\n[Cross-section view of ${levelsToShow} z-levels]`,
    stats: {
      totalBuildings: plots.filter(p => p.building).length,
      totalPlots: plots.length,
      districtCounts,
      streetLength: levelsToShow,  // Z-levels as "depth"
    },
  };
}

// =============================================================================
// LITERARY UNDERGROUND CITY GENERATOR (The Footnotes)
// =============================================================================

/**
 * Generate a Literary underground city.
 * The Footnotes realm from the Literary Surrealism spec.
 * Recursive libraries, marginalia passages, and the typo void.
 */
function generateLiteraryCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  // Create grid - looks like a page with text
  const grid = createEmptyGrid(width, height, '·');

  const streets: Street[] = [];
  const plots: Plot[] = [];
  let plotId = 0;

  // Page margins (left, right, top, bottom)
  const marginLeft = 6;
  const marginRight = width - 6;
  const marginTop = 4;
  const marginBottom = height - 4;

  // Draw page border (like a book page)
  strokeRect(grid, 2, 2, width - 4, height - 4, '│');
  grid[2]![2]! = '┌';
  grid[2]![width - 3]! = '┐';
  grid[height - 3]![2]! = '└';
  grid[height - 3]![width - 3]! = '┘';
  for (let x = 3; x < width - 3; x++) {
    grid[2]![x]! = '─';
    grid[height - 3]![x]! = '─';
  }

  // Left margin - The Margins district
  for (let y = marginTop; y < marginBottom; y++) {
    grid[y]![marginLeft - 1]! = '│';
    // Marginalia annotations
    if (rng.next() < 0.15) {
      const annotations = ['*', '†', '‡', '§', '¶', '№'];
      grid[y]![marginLeft - 3]! = rng.pick(annotations);
    }
  }

  // Right margin
  for (let y = marginTop; y < marginBottom; y++) {
    grid[y]![marginRight]! = '│';
  }

  // === THE GREAT LIBRARY (Central recursive structure) ===
  const libraryWidth = Math.floor((marginRight - marginLeft) * 0.4);
  const libraryHeight = Math.floor((marginBottom - marginTop) * 0.5);
  const libraryX = Math.floor((marginLeft + marginRight - libraryWidth) / 2);
  const libraryY = marginTop + 2;

  // Outer library walls (bookshelves)
  for (let y = libraryY; y < libraryY + libraryHeight; y++) {
    for (let x = libraryX; x < libraryX + libraryWidth; x++) {
      if (y === libraryY || y === libraryY + libraryHeight - 1) {
        grid[y]![x]! = '▬';  // Shelf
      } else if (x === libraryX || x === libraryX + libraryWidth - 1) {
        grid[y]![x]! = '▐';  // Bookcase
      } else {
        // Interior - book patterns
        const pattern = (x + y) % 3;
        grid[y]![x]! = pattern === 0 ? '░' : pattern === 1 ? '▒' : ' ';
      }
    }
  }

  // Add library entrance
  const libDoorX = libraryX + Math.floor(libraryWidth / 2);
  grid[libraryY]![libDoorX]! = '⌂';
  grid[libraryY]![libDoorX - 1]! = ' ';
  grid[libraryY]![libDoorX + 1]! = ' ';

  // Label
  const libLabel = 'LIBRARY';
  for (let i = 0; i < libLabel.length; i++) {
    if (libraryY - 1 >= 0) {
      grid[libraryY - 1]![libraryX + 2 + i]! = libLabel[i]!;
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: libraryX, y: libraryY, width: libraryWidth, height: libraryHeight },
    districtType: 'library',
    building: selectBuildingForPlot(
      { id: '', bounds: { x: libraryX, y: libraryY, width: libraryWidth, height: libraryHeight }, districtType: 'library' },
      spec.species,
      rng
    ),
  });

  // === RECURSIVE INNER LIBRARY (The Library That Contains Itself) ===
  // Draw a smaller library inside
  const innerLibW = Math.floor(libraryWidth * 0.3);
  const innerLibH = Math.floor(libraryHeight * 0.4);
  const innerLibX = libraryX + Math.floor((libraryWidth - innerLibW) / 2);
  const innerLibY = libraryY + Math.floor((libraryHeight - innerLibH) / 2);

  strokeRect(grid, innerLibX, innerLibY, innerLibW, innerLibH, '◊');
  grid[innerLibY + Math.floor(innerLibH / 2)]![innerLibX + Math.floor(innerLibW / 2)]! = '∞';

  // === THE SCRIPTORIUM (Writing area) ===
  const scripX = marginLeft + 2;
  const scripY = libraryY + libraryHeight + 3;
  const scripW = Math.floor(libraryWidth * 0.5);
  const scripH = 6;

  fillRect(grid, scripX, scripY, scripW, scripH, '.');
  strokeRect(grid, scripX, scripY, scripW, scripH, '─');
  grid[scripY]![scripX]! = '╭';
  grid[scripY]![scripX + scripW - 1]! = '╮';
  grid[scripY + scripH - 1]![scripX]! = '╰';
  grid[scripY + scripH - 1]![scripX + scripW - 1]! = '╯';

  // Writing desks
  for (let x = scripX + 2; x < scripX + scripW - 2; x += 3) {
    grid[scripY + 2]![x]! = '⊡';  // Desk
    grid[scripY + 3]![x]! = '✎';  // Quill
  }

  const scripLabel = 'SCRIPTORIUM';
  for (let i = 0; i < scripLabel.length; i++) {
    grid[scripY + 1]![scripX + 2 + i]! = scripLabel[i]!;
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: scripX, y: scripY, width: scripW, height: scripH },
    districtType: 'scriptorium',
  });

  // === THE FOOTNOTES (Below the main text) ===
  const footnotesY = height - 15;
  const footnoteLineX = marginLeft + 2;

  // Horizontal line separating footnotes
  for (let x = marginLeft; x < marginRight; x++) {
    grid[footnotesY]![x]! = '─';
  }

  // Footnote markers and text
  const footnoteMarkers = ['¹', '²', '³', '†', '‡'];
  for (let i = 0; i < 5; i++) {
    const fnY = footnotesY + 2 + i;
    if (fnY < marginBottom) {
      grid[fnY]![footnoteLineX]! = footnoteMarkers[i]!;

      // Simulate footnote text
      for (let x = footnoteLineX + 2; x < marginRight - 2; x++) {
        if (rng.next() < 0.7) {
          grid[fnY]![x]! = rng.next() < 0.1 ? ' ' : '·';
        }
      }

      // Random footnote buildings/plots
      if (rng.next() < 0.5) {
        const fnPlotX = footnoteLineX + 4 + i * 12;
        const fnPlotW = 8;
        const fnPlotH = 3;
        if (fnPlotX + fnPlotW < marginRight) {
          fillRect(grid, fnPlotX, fnY - 1, fnPlotW, fnPlotH, '░');
          plots.push({
            id: `plot_${plotId++}`,
            bounds: { x: fnPlotX, y: fnY - 1, width: fnPlotW, height: fnPlotH },
            districtType: 'footnotes',
          });
        }
      }
    }
  }

  const fnLabel = 'THE FOOTNOTES';
  for (let i = 0; i < fnLabel.length; i++) {
    grid[footnotesY + 1]![marginLeft + 2 + i]! = fnLabel[i]!;
  }

  // === THE TYPO VOID (Chaotic corner) ===
  const typoX = marginRight - 20;
  const typoY = libraryY + libraryHeight + 3;
  const typoW = 18;
  const typoH = 8;

  // Glitchy, misspelled area
  for (let y = typoY; y < typoY + typoH; y++) {
    for (let x = typoX; x < typoX + typoW; x++) {
      if (x < width - 8) {
        const chaos = rng.next();
        if (chaos < 0.2) {
          grid[y]![x]! = '?';
        } else if (chaos < 0.4) {
          grid[y]![x]! = '!';
        } else if (chaos < 0.5) {
          grid[y]![x]! = '#';
        } else if (chaos < 0.6) {
          grid[y]![x]! = '@';
        } else if (chaos < 0.7) {
          grid[y]![x]! = '$';
        } else {
          // Random "misspelled" letters
          const chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
          grid[y]![x]! = rng.pick(chars);
        }
      }
    }
  }

  // Void label (misspelled of course)
  const typoLabel = 'TYOP VOYD';  // Intentionally misspelled
  for (let i = 0; i < typoLabel.length; i++) {
    grid[typoY - 1]![typoX + i]! = typoLabel[i]!;
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: typoX, y: typoY, width: typoW, height: typoH },
    districtType: 'typo_void',
  });

  // === THE MARGINS (Left margin annotations) ===
  for (let y = marginTop + 5; y < marginBottom - 10; y += 8) {
    if (rng.next() < 0.6) {
      // Small annotation plot in margin
      fillRect(grid, 3, y, 2, 3, '¦');
      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: 3, y, width: 2, height: 3 },
        districtType: 'margins',
      });
    }
  }

  // === TEXT LINES (Decorative, representing the "page") ===
  const textStartY = marginTop + 1;
  for (let y = textStartY; y < libraryY - 2; y++) {
    // Simulate text lines
    for (let x = marginLeft + 1; x < marginRight - 1; x++) {
      if (grid[y]![x]! === '·') {
        if (rng.next() < 0.85) {
          grid[y]![x]! = '─';  // Text line
        }
      }
    }
    // Paragraph breaks
    if (rng.next() < 0.2) {
      for (let x = marginLeft + 1; x < marginLeft + 8; x++) {
        grid[y]![x]! = ' ';
      }
    }
  }

  // Page number at bottom
  const pageNum = `- ${rng.nextInt(1, 999)} -`;
  const pageNumX = Math.floor((width - pageNum.length) / 2);
  for (let i = 0; i < pageNum.length; i++) {
    grid[height - 2]![pageNumX + i]! = pageNum[i]!;
  }

  // Compile stats
  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets, plots },
    buildings: plots.map(p => p.building).filter(Boolean) as VoxelBuildingDefinition[],
    ascii: gridToString(grid) + `\n\n[The Footnotes: Where clarifications dwell beneath the text]`,
    stats: {
      totalBuildings: plots.filter(p => p.building).length,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,  // No streets in literary realm
    },
  };
}

// =============================================================================
// CRYSTALLINE CITY GENERATOR
// =============================================================================

/**
 * Generate a crystalline city.
 * Geometric faceted structures with resonance chambers and light prisms.
 */
function generateCrystallineCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '·');
  const plots: Plot[] = [];
  let plotId = 0;

  // Crystal lattice background pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x + y) % 8 === 0) grid[y]![x]! = '◇';
    }
  }

  // Central Prism Core - large hexagonal structure
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const coreRadius = Math.floor(Math.min(width, height) / 6);

  // Draw hexagonal prism core
  for (let angle = 0; angle < 6; angle++) {
    const a1 = (angle * Math.PI) / 3;
    const a2 = ((angle + 1) * Math.PI) / 3;
    const x1 = Math.floor(centerX + coreRadius * Math.cos(a1));
    const y1 = Math.floor(centerY + coreRadius * Math.sin(a1) * 0.6);
    const x2 = Math.floor(centerX + coreRadius * Math.cos(a2));
    const y2 = Math.floor(centerY + coreRadius * Math.sin(a2) * 0.6);
    drawLine(grid, x1, y1, x2, y2, '◆', 1);
  }

  // Fill prism core interior
  for (let y = centerY - coreRadius; y <= centerY + coreRadius; y++) {
    for (let x = centerX - coreRadius; x <= centerX + coreRadius; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow((y - centerY) * 1.5, 2));
        if (dist < coreRadius * 0.8) {
          grid[y]![x]! = rng.next() < 0.3 ? '✦' : '░';
        }
      }
    }
  }
  grid[centerY]![centerX]! = '☼';  // Light source

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - coreRadius, y: centerY - coreRadius, width: coreRadius * 2, height: coreRadius * 2 },
    districtType: 'prism_core',
  });

  // Resonance Chambers - arranged in ring around core
  const chamberCount = Math.floor(size.sectors * 0.8);
  for (let i = 0; i < chamberCount; i++) {
    const angle = (i / chamberCount) * Math.PI * 2;
    const dist = coreRadius * 1.8;
    const cx = Math.floor(centerX + Math.cos(angle) * dist);
    const cy = Math.floor(centerY + Math.sin(angle) * dist * 0.6);
    const cw = rng.nextInt(6, 10);
    const ch = rng.nextInt(4, 7);

    if (cx > cw && cx < width - cw && cy > ch && cy < height - ch) {
      // Diamond-shaped chamber
      for (let dy = 0; dy < ch; dy++) {
        for (let dx = 0; dx < cw; dx++) {
          const px = cx - cw / 2 + dx;
          const py = cy - ch / 2 + dy;
          const inDiamond = Math.abs(dx - cw / 2) / (cw / 2) + Math.abs(dy - ch / 2) / (ch / 2) <= 1;
          if (inDiamond && px >= 0 && px < width && py >= 0 && py < height) {
            grid[Math.floor(py)]![Math.floor(px)]! = '◈';
          }
        }
      }

      // Light beam from core to chamber
      drawLine(grid, centerX, centerY, cx, cy, '·', 1);
      for (let s = 0; s < 1; s += 0.1) {
        const lx = Math.floor(centerX + (cx - centerX) * s);
        const ly = Math.floor(centerY + (cy - centerY) * s);
        if (ly >= 0 && ly < height && lx >= 0 && lx < width && grid[ly]![lx]! === '·') {
          grid[ly]![lx]! = '∙';
        }
      }

      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: Math.floor(cx - cw / 2), y: Math.floor(cy - ch / 2), width: cw, height: ch },
        districtType: 'resonance_chamber',
      });
    }
  }

  // Facet Housing - geometric clusters in outer ring
  const housingCount = Math.floor(size.sectors * 1.2);
  for (let i = 0; i < housingCount; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.nextInt(Math.floor(coreRadius * 2.5), Math.floor(Math.min(width, height) / 2 - 5));
    const hx = Math.floor(centerX + Math.cos(angle) * dist);
    const hy = Math.floor(centerY + Math.sin(angle) * dist * 0.7);
    const hw = rng.nextInt(4, 7);
    const hh = rng.nextInt(3, 5);

    if (hx > hw && hx < width - hw && hy > hh && hy < height - hh) {
      strokeRect(grid, hx - hw / 2, hy - hh / 2, hw, hh, '▱');
      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: Math.floor(hx - hw / 2), y: Math.floor(hy - hh / 2), width: hw, height: hh },
        districtType: 'facet_housing',
      });
    }
  }

  // Refraction Labs - scattered, marked with special symbols
  const labCount = Math.floor(size.sectors * 0.4);
  for (let i = 0; i < labCount; i++) {
    const lx = rng.nextInt(10, width - 15);
    const ly = rng.nextInt(10, height - 10);

    if (grid[ly]![lx]! === '·' || grid[ly]![lx]! === '◇') {
      fillRect(grid, lx, ly, 5, 4, '▫');
      grid[ly + 2]![lx + 2]! = '⌬';  // Prism symbol
      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: lx, y: ly, width: 5, height: 4 },
        districtType: 'refraction_lab',
      });
    }
  }

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[Light refracts through geometric perfection]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// HIVE CITY GENERATOR
// =============================================================================

/**
 * Generate an insectoid hive city.
 * Hexagonal cells, pheromone highways, and the royal chamber.
 */
function generateHiveCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, ' ');
  const plots: Plot[] = [];
  let plotId = 0;

  // Hexagonal cell size
  const cellW = 8;
  const cellH = 6;

  // Draw hexagonal grid
  for (let row = 0; row < Math.floor(height / cellH); row++) {
    for (let col = 0; col < Math.floor(width / cellW); col++) {
      const offsetX = (row % 2) * (cellW / 2);
      const cx = col * cellW + offsetX + cellW / 2;
      const cy = row * cellH + cellH / 2;

      if (cx > cellW && cx < width - cellW && cy > cellH && cy < height - cellH) {
        // Draw hexagon
        const hexChars = '⬡⬢';
        const hexChar = hexChars[Math.floor(rng.next() * 2)]!;
        grid[Math.floor(cy)]![Math.floor(cx)]! = hexChar;

        // Cell walls
        grid[Math.floor(cy - 2)]![Math.floor(cx)]! = '─';
        grid[Math.floor(cy + 2)]![Math.floor(cx)]! = '─';
        grid[Math.floor(cy - 1)]![Math.floor(cx - 2)]! = '/';
        grid[Math.floor(cy - 1)]![Math.floor(cx + 2)]! = '\\';
        grid[Math.floor(cy + 1)]![Math.floor(cx - 2)]! = '\\';
        grid[Math.floor(cy + 1)]![Math.floor(cx + 2)]! = '/';
      }
    }
  }

  // Royal Cell - large central hexagon
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const royalR = Math.floor(Math.min(width, height) / 8);

  for (let dy = -royalR; dy <= royalR; dy++) {
    for (let dx = -royalR; dx <= royalR; dx++) {
      const py = centerY + dy;
      const px = centerX + dx;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        if (Math.abs(dx) + Math.abs(dy) * 1.5 <= royalR) {
          grid[py]![px]! = '♛';
        }
      }
    }
  }
  grid[centerY]![centerX]! = '♕';  // Queen

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - royalR, y: centerY - royalR, width: royalR * 2, height: royalR * 2 },
    districtType: 'royal_cell',
  });

  // Brood Chambers - clustered near royal cell
  const broodCount = Math.floor(size.sectors * 0.6);
  for (let i = 0; i < broodCount; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = royalR * 1.5 + rng.next() * royalR;
    const bx = Math.floor(centerX + Math.cos(angle) * dist);
    const by = Math.floor(centerY + Math.sin(angle) * dist);
    const bw = rng.nextInt(5, 8);
    const bh = rng.nextInt(4, 6);

    if (bx > bw && bx < width - bw && by > bh && by < height - bh) {
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          grid[by + dy]![bx + dx]! = rng.next() < 0.3 ? '○' : '◦';
        }
      }
      // Larvae symbols
      grid[by + Math.floor(bh / 2)]![bx + Math.floor(bw / 2)]! = '◎';

      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: bx, y: by, width: bw, height: bh },
        districtType: 'brood_chamber',
      });
    }
  }

  // Worker Warrens - dense outer ring
  const warrenCount = Math.floor(size.sectors * 1.5);
  for (let i = 0; i < warrenCount; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.nextInt(Math.floor(royalR * 3), Math.floor(Math.min(width, height) / 2 - 5));
    const wx = Math.floor(centerX + Math.cos(angle) * dist);
    const wy = Math.floor(centerY + Math.sin(angle) * dist);
    const ww = rng.nextInt(3, 5);
    const wh = rng.nextInt(2, 4);

    if (wx > ww && wx < width - ww && wy > wh && wy < height - wh) {
      fillRect(grid, wx, wy, ww, wh, '▪');
      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: wx, y: wy, width: ww, height: wh },
        districtType: 'worker_warren',
      });
    }
  }

  // Nectar Stores - golden storage cells
  const storeCount = Math.floor(size.sectors * 0.5);
  for (let i = 0; i < storeCount; i++) {
    const sx = rng.nextInt(10, width - 15);
    const sy = rng.nextInt(10, height - 10);

    if (grid[sy]![sx]! === ' ') {
      fillRect(grid, sx, sy, 4, 3, '▓');
      grid[sy + 1]![sx + 2]! = '❂';
      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: sx, y: sy, width: 4, height: 3 },
        districtType: 'nectar_store',
      });
    }
  }

  // Pheromone Highways - trails connecting major areas
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const endX = Math.floor(centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 5));
    const endY = Math.floor(centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 5));

    for (let t = 0; t < 1; t += 0.02) {
      const px = Math.floor(centerX + (endX - centerX) * t);
      const py = Math.floor(centerY + (endY - centerY) * t);
      if (py >= 0 && py < height && px >= 0 && px < width) {
        if (grid[py]![px]! === ' ') {
          grid[py]![px]! = '~';
        }
      }
    }
  }

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[The Hive Mind coordinates all]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// FUNGAL CITY GENERATOR
// =============================================================================

/**
 * Generate a fungal mycelium city.
 * Underground network with spore towers and decomposition pits.
 */
function generateFungalCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '░');
  const plots: Plot[] = [];
  let plotId = 0;

  // Mycelium network - branching filaments
  const networkNodes: Array<{ x: number; y: number }> = [];

  // Create initial nodes
  for (let i = 0; i < size.sectors * 2; i++) {
    networkNodes.push({
      x: rng.nextInt(10, width - 10),
      y: rng.nextInt(10, height - 10),
    });
  }

  // Connect nodes with mycelium threads
  for (const node of networkNodes) {
    // Find 2-3 nearest nodes
    const others = networkNodes
      .filter(n => n !== node)
      .map(n => ({ node: n, dist: Math.sqrt(Math.pow(n.x - node!.x, 2) + Math.pow(n.y - node!.y, 2)) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, rng.nextInt(2, 4));

    for (const other of others) {
      // Draw organic branching line
      let cx = node!.x;
      let cy = node!.y;
      while (Math.abs(cx - other.node!.x) > 1 || Math.abs(cy - other.node!.y) > 1) {
        if (cy >= 0 && cy < height && cx >= 0 && cx < width) {
          grid[cy]![cx]! = rng.next() < 0.3 ? '╌' : '·';
        }
        // Move toward target with some randomness
        if (rng.next() < 0.7) {
          cx += Math.sign(other.node!.x - cx);
        }
        if (rng.next() < 0.7) {
          cy += Math.sign(other.node!.y - cy);
        }
        // Random branching
        if (rng.next() < 0.1) {
          cx += rng.nextInt(-1, 1);
          cy += rng.nextInt(-1, 1);
        }
      }
    }

    // Mark node as mycelium network junction
    if (node!.y >= 0 && node!.y < height && node!.x >= 0 && node!.x < width) {
      grid[node!.y]![node!.x]! = '⊛';
      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: node!.x - 2, y: node!.y - 2, width: 4, height: 4 },
        districtType: 'mycelium_network',
      });
    }
  }

  // Spore Towers - tall structures at network junctions
  const towerCount = Math.floor(size.sectors * 0.4);
  for (let i = 0; i < towerCount && i < networkNodes.length; i++) {
    const node = networkNodes[i];
    const th = rng.nextInt(8, 15);

    // Draw tower
    for (let dy = 0; dy < th; dy++) {
      const py = node!.y - dy;
      if (py >= 0 && py < height) {
        const twidth = dy < 2 ? 3 : dy < 5 ? 2 : 1;
        for (let dx = -twidth; dx <= twidth; dx++) {
          const px = node!.x + dx;
          if (px >= 0 && px < width) {
            grid[py]![px]! = dy === th - 1 ? '☁' : dy === th - 2 ? '♠' : '┃';
          }
        }
      }
    }
    // Spore cloud at top
    for (let sy = node!.y - th - 2; sy <= node!.y - th + 1; sy++) {
      for (let sx = node!.x - 3; sx <= node!.x + 3; sx++) {
        if (sy >= 0 && sy < height && sx >= 0 && sx < width && rng.next() < 0.6) {
          grid[sy]![sx]! = '∴';
        }
      }
    }

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: node!.x - 2, y: node!.y - th, width: 4, height: th },
      districtType: 'spore_tower',
    });
  }

  // Decomposition Pits - dark areas where matter breaks down
  const pitCount = Math.floor(size.sectors * 0.3);
  for (let i = 0; i < pitCount; i++) {
    const px = rng.nextInt(15, width - 20);
    const py = rng.nextInt(15, height - 15);
    const pr = rng.nextInt(4, 8);

    for (let dy = -pr; dy <= pr; dy++) {
      for (let dx = -pr; dx <= pr; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pr) {
          const gy = py + dy;
          const gx = px + dx;
          if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
            grid[gy]![gx]! = dist < pr / 2 ? '▓' : '▒';
          }
        }
      }
    }
    grid[py]![px]! = '☠';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: px - pr, y: py - pr, width: pr * 2, height: pr * 2 },
      districtType: 'decomposition_pit',
    });
  }

  // Fruiting Bodies - surface mushroom structures
  const fruitCount = Math.floor(size.sectors * 0.6);
  for (let i = 0; i < fruitCount; i++) {
    const fx = rng.nextInt(5, width - 10);
    const fy = rng.nextInt(5, height - 5);
    const mushrooms = ['🍄', '♣', '⌂'];

    if (grid[fy]![fx]! === '░' || grid[fy]![fx]! === '·') {
      const mw = rng.nextInt(3, 6);
      const mh = rng.nextInt(2, 4);
      fillRect(grid, fx, fy, mw, mh, '○');
      grid[fy]![fx + Math.floor(mw / 2)]! = rng.pick(mushrooms);

      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: fx, y: fy, width: mw, height: mh },
        districtType: 'fruiting_body',
      });
    }
  }

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[The mycelium remembers everything]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// AQUATIC CITY GENERATOR
// =============================================================================

/**
 * Generate an underwater aquatic city.
 * Bubble domes, kelp forests, and current highways.
 */
function generateAquaticCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '≈');
  const plots: Plot[] = [];
  let plotId = 0;

  // Water background with depth gradient
  for (let y = 0; y < height; y++) {
    const depthChar = y < height / 3 ? '~' : y < height * 2 / 3 ? '≈' : '▓';
    for (let x = 0; x < width; x++) {
      if (rng.next() < 0.1) {
        grid[y]![x]! = depthChar;
      }
    }
  }

  // Bubble Domes - main living areas
  const domeCount = Math.floor(size.sectors * 0.8);
  const domes: Array<{ x: number; y: number; r: number }> = [];

  for (let i = 0; i < domeCount; i++) {
    const dx = rng.nextInt(15, width - 15);
    const dy = rng.nextInt(10, height - 10);
    const dr = rng.nextInt(5, 10);

    // Check overlap with existing domes
    let overlaps = false;
    for (const dome of domes) {
      const dist = Math.sqrt(Math.pow(dome.x - dx, 2) + Math.pow(dome.y - dy, 2));
      if (dist < dome.r + dr + 3) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      domes.push({ x: dx, y: dy, r: dr });

      // Draw dome (hemisphere shape)
      for (let dy2 = -dr; dy2 <= 0; dy2++) {
        for (let dx2 = -dr; dx2 <= dr; dx2++) {
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist < dr) {
            const gy = dy + dy2;
            const gx = dx + dx2;
            if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
              if (dist > dr - 1.5) {
                grid[gy]![gx]! = '◠';  // Dome shell
              } else {
                grid[gy]![gx]! = ' ';  // Air inside
              }
            }
          }
        }
      }
      // Dome base
      for (let bx = dx - dr + 1; bx < dx + dr; bx++) {
        if (bx >= 0 && bx < width && dy >= 0 && dy < height) {
          grid[dy]![bx]! = '═';
        }
      }
      grid[dy]![dx]! = '⌂';

      plots.push({
        id: `plot_${plotId++}`,
        bounds: { x: dx - dr, y: dy - dr, width: dr * 2, height: dr },
        districtType: 'bubble_dome',
      });
    }
  }

  // Kelp Forests - vertical strands
  const kelpCount = Math.floor(size.sectors * 1.2);
  for (let i = 0; i < kelpCount; i++) {
    const kx = rng.nextInt(5, width - 5);
    const ky = rng.nextInt(height / 2, height - 3);
    const kh = rng.nextInt(8, 20);

    for (let h = 0; h < kh; h++) {
      const py = ky - h;
      const sway = Math.floor(Math.sin(h * 0.5 + i) * 2);
      const px = kx + sway;
      if (py >= 0 && py < height && px >= 0 && px < width) {
        if (grid[py]![px]! === '≈' || grid[py]![px]! === '~') {
          grid[py]![px]! = h % 3 === 0 ? '⌇' : '│';
        }
      }
    }

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: kx - 2, y: ky - kh, width: 4, height: kh },
      districtType: 'kelp_forest',
    });
  }

  // Current Channels - flowing highways
  for (let c = 0; c < 4; c++) {
    const startY = rng.nextInt(10, height - 10);
    const direction = rng.next() < 0.5 ? 1 : -1;

    for (let x = 0; x < width; x++) {
      const y = startY + Math.floor(Math.sin(x * 0.1) * 5);
      if (y >= 0 && y < height) {
        grid[y]![x]! = direction > 0 ? '→' : '←';
        if (y + 1 < height) grid[y + 1]![x]! = '·';
        if (y - 1 >= 0) grid[y - 1]![x]! = '·';
      }
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: 0, y: 0, width: width, height: 3 },
    districtType: 'current_channel',
  });

  // Pressure Locks - entry points
  const lockCount = 3;
  for (let i = 0; i < lockCount; i++) {
    const lx = rng.nextInt(10, width - 15);
    const ly = 3;

    fillRect(grid, lx, ly, 5, 8, '▤');
    strokeRect(grid, lx, ly, 5, 8, '█');
    grid[ly + 7]![lx + 2]! = '▼';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: lx, y: ly, width: 5, height: 8 },
      districtType: 'pressure_lock',
    });
  }

  // Abyssal Shrine - deep religious structure
  const shrineX = Math.floor(width / 2);
  const shrineY = height - 8;

  strokeRect(grid, shrineX - 6, shrineY, 12, 6, '▓');
  fillRect(grid, shrineX - 4, shrineY + 1, 8, 4, '░');
  grid[shrineY + 2]![shrineX]! = '☆';
  grid[shrineY + 3]![shrineX]! = '†';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: shrineX - 6, y: shrineY, width: 12, height: 6 },
    districtType: 'abyssal_shrine',
  });

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[In the depths, the old ones dream]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// TEMPORAL CITY GENERATOR
// =============================================================================

/**
 * Generate a temporal city.
 * Exists across multiple time periods simultaneously.
 */
function generateTemporalCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '·');
  const plots: Plot[] = [];
  let plotId = 0;

  // Divide into three time zones
  const zoneWidth = Math.floor(width / 3);

  // === PAST ECHO (left zone) ===
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < zoneWidth; x++) {
      grid[y]![x]! = rng.next() < 0.1 ? '░' : '·';
    }
  }

  // Ancient ruins
  const ruinCount = Math.floor(size.sectors * 0.4);
  for (let i = 0; i < ruinCount; i++) {
    const rx = rng.nextInt(5, zoneWidth - 10);
    const ry = rng.nextInt(5, height - 10);
    const rw = rng.nextInt(6, 12);
    const rh = rng.nextInt(4, 8);

    // Crumbling walls
    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        if (dy === 0 || dy === rh - 1 || dx === 0 || dx === rw - 1) {
          if (rng.next() < 0.7) {  // Some walls missing
            grid[ry + dy]![rx + dx]! = '▪';
          }
        }
      }
    }
    grid[ry + Math.floor(rh / 2)]![rx + Math.floor(rw / 2)]! = '⌘';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: rx, y: ry, width: rw, height: rh },
      districtType: 'past_echo',
    });
  }

  // Time zone label
  const pastLabel = '<<<PAST<<<';
  for (let i = 0; i < pastLabel.length; i++) {
    grid[2]![5 + i]! = pastLabel[i]!;
  }

  // === PRESENT ANCHOR (center zone) ===
  for (let y = 0; y < height; y++) {
    for (let x = zoneWidth; x < zoneWidth * 2; x++) {
      grid[y]![x]! = '░';
    }
  }

  // Solid buildings
  const presentCount = Math.floor(size.sectors * 0.6);
  for (let i = 0; i < presentCount; i++) {
    const px = rng.nextInt(zoneWidth + 5, zoneWidth * 2 - 10);
    const py = rng.nextInt(5, height - 10);
    const pw = rng.nextInt(5, 9);
    const ph = rng.nextInt(4, 7);

    strokeRect(grid, px, py, pw, ph, '█');
    fillRect(grid, px + 1, py + 1, pw - 2, ph - 2, '▒');
    grid[py + ph - 1]![px + Math.floor(pw / 2)]! = '⊓';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: px, y: py, width: pw, height: ph },
      districtType: 'present_anchor',
    });
  }

  // Chrono Nexus - central time control
  const nexusX = zoneWidth + Math.floor(zoneWidth / 2);
  const nexusY = Math.floor(height / 2);
  const nexusR = 6;

  for (let dy = -nexusR; dy <= nexusR; dy++) {
    for (let dx = -nexusR; dx <= nexusR; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nexusR) {
        grid[nexusY + dy]![nexusX + dx]! = '◎';
      }
    }
  }
  grid[nexusY]![nexusX]! = '⧗';  // Hourglass

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: nexusX - nexusR, y: nexusY - nexusR, width: nexusR * 2, height: nexusR * 2 },
    districtType: 'chrono_nexus',
  });

  const presentLabel = '=NOW=';
  for (let i = 0; i < presentLabel.length; i++) {
    grid[2]![zoneWidth + 10 + i]! = presentLabel[i]!;
  }

  // === FUTURE SHADOW (right zone) ===
  for (let y = 0; y < height; y++) {
    for (let x = zoneWidth * 2; x < width; x++) {
      grid[y]![x]! = rng.next() < 0.2 ? '▒' : '·';
    }
  }

  // Ghostly future structures
  const futureCount = Math.floor(size.sectors * 0.5);
  for (let i = 0; i < futureCount; i++) {
    const fx = rng.nextInt(zoneWidth * 2 + 5, width - 10);
    const fy = rng.nextInt(5, height - 10);
    const fw = rng.nextInt(5, 10);
    const fh = rng.nextInt(4, 8);

    // Translucent/partial structures
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        if (rng.next() < 0.5) {  // Flickering existence
          grid[fy + dy]![fx + dx]! = '░';
        }
      }
    }
    grid[fy + Math.floor(fh / 2)]![fx + Math.floor(fw / 2)]! = '?';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: fx, y: fy, width: fw, height: fh },
      districtType: 'future_shadow',
    });
  }

  const futureLabel = '>>>FUTURE>>>';
  for (let i = 0; i < futureLabel.length; i++) {
    if (zoneWidth * 2 + 5 + i < width) {
      grid[2]![zoneWidth * 2 + 5 + i]! = futureLabel[i]!;
    }
  }

  // Zone boundaries - temporal rifts
  for (let y = 0; y < height; y++) {
    grid[y]![zoneWidth]! = '║';
    grid[y]![zoneWidth * 2]! = '║';
    if (rng.next() < 0.1) {
      grid[y]![zoneWidth]! = '⚡';
      grid[y]![zoneWidth * 2]! = '⚡';
    }
  }

  // Paradox Zones - unstable areas
  const paradoxCount = 3;
  for (let i = 0; i < paradoxCount; i++) {
    const px = rng.nextInt(10, width - 10);
    const py = rng.nextInt(10, height - 10);

    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 4) {
          const gy = py + dy;
          const gx = px + dx;
          if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
            grid[gy]![gx]! = rng.pick(['?', '!', '∞', '⟳', '◇']);
          }
        }
      }
    }
    grid[py]![px]! = '∞';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: px - 3, y: py - 3, width: 6, height: 6 },
      districtType: 'paradox_zone',
    });
  }

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[Time flows differently here]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// DREAM CITY GENERATOR
// =============================================================================

/**
 * Generate a surreal dream city.
 * Escher-like architecture, shifting spaces, and impossible geometry.
 */
function generateDreamCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '·');
  const plots: Plot[] = [];
  let plotId = 0;

  // Dreamy background with floating particles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rng.next() < 0.05) {
        grid[y]![x]! = rng.pick(['∘', '°', '˚', '·']);
      }
    }
  }

  // Impossible Stairs - Escher-style
  const stairCount = Math.floor(size.sectors * 0.3);
  for (let s = 0; s < stairCount; s++) {
    const sx = rng.nextInt(10, width - 20);
    const sy = rng.nextInt(10, height - 15);
    const direction = rng.next() < 0.5 ? 1 : -1;

    // Draw staircase that loops back
    for (let i = 0; i < 12; i++) {
      const px = sx + (i % 4) * 3 * direction;
      const py = sy + Math.floor(i / 4) * 3 - (i % 4);
      if (px >= 0 && px < width - 3 && py >= 0 && py < height - 2) {
        grid[py]![px]! = '┌';
        grid[py]![px + 1]! = '─';
        grid[py]![px + 2]! = '┐';
        grid[py + 1]![px]! = '│';
        grid[py + 1]![px + 2]! = '│';
        grid[py + 2]![px]! = '└';
        grid[py + 2]![px + 1]! = '─';
        grid[py + 2]![px + 2]! = '┘';
      }
    }

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: sx, y: sy, width: 15, height: 12 },
      districtType: 'impossible_stair',
    });
  }

  // Lucid Plaza - clear, centered area
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const plazaR = Math.floor(Math.min(width, height) / 8);

  for (let dy = -plazaR; dy <= plazaR; dy++) {
    for (let dx = -plazaR; dx <= plazaR; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < plazaR) {
        grid[centerY + dy]![centerX + dx]! = ' ';
      }
      if (Math.abs(dist - plazaR) < 1) {
        grid[centerY + dy]![centerX + dx]! = '○';
      }
    }
  }
  grid[centerY]![centerX]! = '☼';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - plazaR, y: centerY - plazaR, width: plazaR * 2, height: plazaR * 2 },
    districtType: 'lucid_plaza',
  });

  // Memory Palaces - structured but dreamlike
  const palaceCount = Math.floor(size.sectors * 0.4);
  for (let i = 0; i < palaceCount; i++) {
    const px = rng.nextInt(10, width - 15);
    const py = rng.nextInt(10, height - 12);
    const pw = rng.nextInt(8, 14);
    const ph = rng.nextInt(6, 10);

    // Ornate border
    strokeRect(grid, px, py, pw, ph, '▣');
    fillRect(grid, px + 1, py + 1, pw - 2, ph - 2, '░');

    // Internal pillars
    for (let c = 2; c < pw - 2; c += 3) {
      grid[py + 2]![px + c]! = '║';
      grid[py + ph - 3]![px + c]! = '║';
    }

    grid[py + Math.floor(ph / 2)]![px + Math.floor(pw / 2)]! = '⌘';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: px, y: py, width: pw, height: ph },
      districtType: 'memory_palace',
    });
  }

  // Nightmare Quarters - dark twisted corners
  const nightmareCount = Math.floor(size.sectors * 0.3);
  for (let i = 0; i < nightmareCount; i++) {
    const nx = rng.nextInt(5, width - 15);
    const ny = rng.nextInt(5, height - 12);
    const nw = rng.nextInt(8, 12);
    const nh = rng.nextInt(6, 10);

    // Dark, twisted shapes
    for (let dy = 0; dy < nh; dy++) {
      for (let dx = 0; dx < nw; dx++) {
        const gy = ny + dy;
        const gx = nx + dx + Math.floor(Math.sin(dy * 0.8) * 2);  // Warped
        if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
          grid[gy]![gx]! = rng.next() < 0.3 ? '▓' : '▒';
        }
      }
    }
    grid[ny + Math.floor(nh / 2)]![nx + Math.floor(nw / 2)]! = '☠';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: nx, y: ny, width: nw, height: nh },
      districtType: 'nightmare_quarter',
    });
  }

  // Waking Edge - boundary with reality
  for (let y = 0; y < height; y++) {
    grid[y]![width - 3]! = '│';
    grid[y]![width - 2]! = rng.next() < 0.3 ? '░' : '·';
    grid[y]![width - 1]! = '│';
    if (rng.next() < 0.1) {
      grid[y]![width - 3]! = '◇';
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: width - 5, y: 0, width: 5, height: height },
    districtType: 'waking_edge',
  });

  // Floating thought bubbles
  for (let i = 0; i < 10; i++) {
    const bx = rng.nextInt(5, width - 5);
    const by = rng.nextInt(5, height - 5);
    const thoughts = ['💭', '○', '◯', '◌'];
    if (grid[by]![bx]! === '·') {
      grid[by]![bx]! = rng.pick(thoughts);
    }
  }

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[The dreamer shapes the dream]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// VOID CITY GENERATOR
// =============================================================================

/**
 * Generate a void city.
 * Fragments floating in the space between stars.
 */
function generateVoidCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, ' ');
  const plots: Plot[] = [];
  let plotId = 0;

  // Starfield background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rng.next() < 0.03) {
        grid[y]![x]! = rng.pick(['·', '∙', '✦', '★', '☆']);
      }
    }
  }

  // Floating fragments/platforms
  const fragmentCount = Math.floor(size.sectors * 1.2);
  const fragments: Array<{ x: number; y: number; w: number; h: number }> = [];

  for (let i = 0; i < fragmentCount; i++) {
    const fx = rng.nextInt(5, width - 15);
    const fy = rng.nextInt(5, height - 10);
    const fw = rng.nextInt(8, 18);
    const fh = rng.nextInt(5, 12);

    // Irregular shape
    for (let dy = 0; dy < fh; dy++) {
      const rowWidth = Math.floor(fw * (1 - Math.abs(dy - fh / 2) / fh * 0.5));
      const rowStart = Math.floor((fw - rowWidth) / 2);
      for (let dx = rowStart; dx < rowStart + rowWidth; dx++) {
        if (rng.next() < 0.9) {  // Some gaps
          const gy = fy + dy;
          const gx = fx + dx;
          if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
            grid[gy]![gx]! = '░';
          }
        }
      }
    }

    fragments.push({ x: fx, y: fy, w: fw, h: fh });

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: fx, y: fy, width: fw, height: fh },
      districtType: 'gravity_anchor',
    });
  }

  // Tether Stations - connect fragments
  for (let i = 0; i < fragments.length - 1; i++) {
    const f1 = fragments[i];
    const f2 = fragments[(i + 1) % fragments.length];

    // Draw tether line
    const x1 = f1!.x + f1!.w / 2;
    const y1 = f1!.y + f1!.h / 2;
    const x2 = f2!.x + f2!.w / 2;
    const y2 = f2!.y + f2!.h / 2;

    for (let t = 0; t < 1; t += 0.03) {
      const px = Math.floor(x1 + (x2 - x1) * t);
      const py = Math.floor(y1 + (y2 - y1) * t);
      if (py >= 0 && py < height && px >= 0 && px < width) {
        if (grid[py]![px]! === ' ') {
          grid[py]![px]! = '─';
        }
      }
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    districtType: 'tether_station',
  });

  // Star Docks - arrival/departure points
  const dockCount = Math.floor(size.sectors * 0.2);
  for (let i = 0; i < dockCount && i < fragments.length; i++) {
    const frag = fragments[i];
    const dx = frag!.x + rng.nextInt(2, frag!.w - 6);
    const dy = frag!.y + 1;

    fillRect(grid, dx, dy, 4, 3, '▓');
    grid[dy + 1]![dx + 2]! = '◊';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: dx, y: dy, width: 4, height: 3 },
      districtType: 'star_dock',
    });
  }

  // Void Gardens - life in emptiness
  const gardenCount = Math.floor(size.sectors * 0.3);
  for (let i = 0; i < gardenCount && i < fragments.length; i++) {
    const frag = fragments[fragments.length - 1 - i];
    const gx = frag!.x + rng.nextInt(2, frag!.w - 5);
    const gy = frag!.y + rng.nextInt(1, frag!.h - 4);

    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        if (gy + dy < height && gx + dx < width) {
          grid[gy + dy]![gx + dx]! = rng.pick(['♣', '♠', '✿', '❀', '·']);
        }
      }
    }

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: gx, y: gy, width: 4, height: 3 },
      districtType: 'void_garden',
    });
  }

  // Silence Temple - central meditation space
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        grid[centerY + dy]![centerX + dx]! = '▒';
      }
      if (dist > 4 && dist < 6) {
        grid[centerY + dy]![centerX + dx]! = '◇';
      }
    }
  }
  grid[centerY]![centerX]! = '☯';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - 6, y: centerY - 5, width: 12, height: 10 },
    districtType: 'silence_temple',
  });

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[In the void, silence speaks]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// SYMBIOTIC CITY GENERATOR
// =============================================================================

/**
 * Generate a symbiotic city.
 * The city IS a living organism.
 */
function generateSymbioticCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '·');
  const plots: Plot[] = [];
  let plotId = 0;

  // Organic tissue background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y]![x]! = rng.next() < 0.3 ? '░' : '·';
    }
  }

  // Heart Chamber - central pulsing organ
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const heartR = Math.floor(Math.min(width, height) / 8);

  // Heart shape
  for (let dy = -heartR; dy <= heartR; dy++) {
    for (let dx = -heartR; dx <= heartR; dx++) {
      // Heart equation approximation
      const nx = dx / heartR;
      const ny = -dy / heartR;
      const inHeart = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny < 0;
      if (inHeart) {
        const gy = centerY + dy;
        const gx = centerX + dx;
        if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
          grid[gy]![gx]! = '♥';
        }
      }
    }
  }
  grid[centerY]![centerX]! = '❤';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - heartR, y: centerY - heartR, width: heartR * 2, height: heartR * 2 },
    districtType: 'heart_chamber',
  });

  // Blood vessels/arteries from heart
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    let cx = centerX;
    let cy = centerY;

    for (let len = 0; len < Math.min(width, height) / 2; len++) {
      cx += Math.cos(angle) + (rng.next() - 0.5) * 0.5;
      cy += Math.sin(angle) + (rng.next() - 0.5) * 0.5;
      const gx = Math.floor(cx);
      const gy = Math.floor(cy);
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
        if (grid[gy]![gx]! !== '♥' && grid[gy]![gx]! !== '❤') {
          grid[gy]![gx]! = len % 5 === 0 ? '●' : '─';
        }
      }
    }
  }

  // Neural Cluster - brain area
  const brainX = Math.floor(width * 0.7);
  const brainY = Math.floor(height * 0.3);
  const brainR = Math.floor(heartR * 0.8);

  for (let dy = -brainR; dy <= brainR; dy++) {
    for (let dx = -brainR; dx <= brainR; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < brainR) {
        const gy = brainY + dy;
        const gx = brainX + dx;
        if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
          // Brain wrinkle pattern
          grid[gy]![gx]! = ((dx + dy) % 3 === 0) ? '◉' : '○';
        }
      }
    }
  }
  grid[brainY]![brainX]! = '✧';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: brainX - brainR, y: brainY - brainR, width: brainR * 2, height: brainR * 2 },
    districtType: 'neural_cluster',
  });

  // Digestion Tract - processing/manufacturing
  const tractY = Math.floor(height * 0.7);
  const tractH = 8;

  for (let x = 10; x < width - 10; x++) {
    const wobble = Math.floor(Math.sin(x * 0.2) * 2);
    for (let dy = 0; dy < tractH; dy++) {
      const gy = tractY + dy + wobble;
      if (gy >= 0 && gy < height) {
        grid[gy]![x]! = dy === 0 || dy === tractH - 1 ? '▬' : '▒';
      }
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: 10, y: tractY, width: width - 20, height: tractH },
    districtType: 'digestion_tract',
  });

  // Membrane Quarter - outer protective layer
  for (let y = 0; y < height; y++) {
    grid[y]![0]! = '█';
    grid[y]![1]! = '▓';
    grid[y]![2]! = '▒';
    grid[y]![width - 1]! = '█';
    grid[y]![width - 2]! = '▓';
    grid[y]![width - 3]! = '▒';
  }
  for (let x = 0; x < width; x++) {
    grid[0]![x]! = '█';
    grid[1]![x]! = '▓';
    grid[2]![x]! = '▒';
    grid[height - 1]![x]! = '█';
    grid[height - 2]![x]! = '▓';
    grid[height - 3]![x]! = '▒';
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: 0, y: 0, width: 3, height: height },
    districtType: 'membrane_quarter',
  });

  // Growth Buds - expansion zones
  const budCount = Math.floor(size.sectors * 0.4);
  for (let i = 0; i < budCount; i++) {
    const bx = rng.nextInt(10, width - 15);
    const by = rng.nextInt(10, height - 12);
    const br = rng.nextInt(3, 6);

    for (let dy = -br; dy <= br; dy++) {
      for (let dx = -br; dx <= br; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < br) {
          const gy = by + dy;
          const gx = bx + dx;
          if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
            grid[gy]![gx]! = '◌';
          }
        }
      }
    }
    grid[by]![bx]! = '❁';

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: bx - br, y: by - br, width: br * 2, height: br * 2 },
      districtType: 'growth_bud',
    });
  }

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[The city breathes, the city dreams]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// FRACTAL CITY GENERATOR
// =============================================================================

/**
 * Generate a fractal city.
 * Self-similar patterns at every scale.
 */
function generateFractalCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '·');
  const plots: Plot[] = [];
  let plotId = 0;

  // Recursive pattern function
  function drawFractalSquare(x: number, y: number, size: number, depth: number): void {
    if (depth <= 0 || size < 3) return;

    const third = Math.floor(size / 3);

    // Draw the square outline
    for (let i = 0; i < size; i++) {
      if (y >= 0 && y < height && x + i >= 0 && x + i < width) grid[y]![x + i]! = '─';
      if (y + size - 1 >= 0 && y + size - 1 < height && x + i >= 0 && x + i < width) grid[y + size - 1]![x + i]! = '─';
    }
    for (let i = 0; i < size; i++) {
      if (y + i >= 0 && y + i < height && x >= 0 && x < width) grid[y + i]![x]! = '│';
      if (y + i >= 0 && y + i < height && x + size - 1 >= 0 && x + size - 1 < width) grid[y + i]![x + size - 1]! = '│';
    }

    // Corners
    if (y >= 0 && y < height && x >= 0 && x < width) grid[y]![x]! = '┌';
    if (y >= 0 && y < height && x + size - 1 >= 0 && x + size - 1 < width) grid[y]![x + size - 1]! = '┐';
    if (y + size - 1 >= 0 && y + size - 1 < height && x >= 0 && x < width) grid[y + size - 1]![x]! = '└';
    if (y + size - 1 >= 0 && y + size - 1 < height && x + size - 1 >= 0 && x + size - 1 < width) grid[y + size - 1]![x + size - 1]! = '┘';

    // Center marker
    const cx = x + Math.floor(size / 2);
    const cy = y + Math.floor(size / 2);
    if (cy >= 0 && cy < height && cx >= 0 && cx < width) {
      grid[cy]![cx]! = depth === 1 ? '◇' : '◆';
    }

    // Recurse into 8 surrounding cells (skip center for Sierpinski-like effect)
    if (third >= 3) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row === 1 && col === 1) continue;  // Skip center
          drawFractalSquare(x + col * third, y + row * third, third, depth - 1);
        }
      }
    }
  }

  // Start fractal from center with random offset
  const fractalSize = Math.min(width, height) - 4;
  const offsetX = rng.nextInt(-2, 2);
  const offsetY = rng.nextInt(-2, 2);
  const startX = Math.floor((width - fractalSize) / 2) + offsetX;
  const startY = Math.floor((height - fractalSize) / 2) + offsetY;
  const depth = rng.nextInt(3, 5);

  drawFractalSquare(startX, startY, fractalSize, depth);

  // Seed Pattern - central motif
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const seedR = Math.floor(Math.min(width, height) / 12);

  for (let dy = -seedR; dy <= seedR; dy++) {
    for (let dx = -seedR; dx <= seedR; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < seedR) {
        grid[centerY + dy]![centerX + dx]! = '░';
      }
    }
  }
  grid[centerY]![centerX]! = '✳';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - seedR, y: centerY - seedR, width: seedR * 2, height: seedR * 2 },
    districtType: 'seed_pattern',
  });

  // Iteration Rings - mark different scales
  const ringRadii = [seedR * 2, seedR * 4, seedR * 6];
  for (const r of ringRadii) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const px = Math.floor(centerX + Math.cos(angle) * r);
      const py = Math.floor(centerY + Math.sin(angle) * r);
      if (py >= 0 && py < height && px >= 0 && px < width) {
        if (grid[py]![px]! === '·') {
          grid[py]![px]! = '○';
        }
      }
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - seedR * 2, y: centerY - seedR * 2, width: seedR * 4, height: seedR * 4 },
    districtType: 'iteration_ring',
  });

  // Scale Bridges - connect different levels
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    for (let r = seedR; r < seedR * 6; r++) {
      const px = Math.floor(centerX + Math.cos(angle) * r);
      const py = Math.floor(centerY + Math.sin(angle) * r);
      if (py >= 0 && py < height && px >= 0 && px < width) {
        if (grid[py]![px]! === '·' || grid[py]![px]! === '░') {
          grid[py]![px]! = '═';
        }
      }
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX, y: centerY - seedR * 6, width: 1, height: seedR * 12 },
    districtType: 'scale_bridge',
  });

  // Infinity Edge - outer boundary that suggests infinite continuation
  for (let y = 0; y < height; y++) {
    grid[y]![0]! = '∞';
    grid[y]![width - 1]! = '∞';
  }
  for (let x = 0; x < width; x++) {
    grid[0]![x]! = '∞';
    grid[height - 1]![x]! = '∞';
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: 0, y: 0, width: width, height: 1 },
    districtType: 'infinity_edge',
  });

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[The pattern repeats forever inward]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// MUSICAL CITY GENERATOR
// =============================================================================

/**
 * Generate a musical city.
 * Built from solidified sound and harmonic resonance.
 */
function generateMusicalCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '·');
  const plots: Plot[] = [];
  let plotId = 0;

  // Musical staff lines
  const staffSpacing = Math.floor(height / 6);
  for (let staff = 0; staff < 5; staff++) {
    const y = staffSpacing + staff * Math.floor(staffSpacing * 0.8);
    for (let x = 0; x < width; x++) {
      if (y >= 0 && y < height) {
        grid[y]![x]! = '─';
      }
    }
  }

  // Treble clef at start
  const clefX = 5;
  const clefY = staffSpacing + Math.floor(staffSpacing * 0.8) * 2;
  if (clefY - 3 >= 0 && clefY + 3 < height && clefX + 3 < width) {
    grid[clefY - 3]![clefX]! = '∫';
    grid[clefY - 2]![clefX + 1]! = '╮';
    grid[clefY - 1]![clefX + 2]! = '│';
    grid[clefY]![clefX + 1]! = '○';
    grid[clefY + 1]![clefX]! = '╰';
    grid[clefY + 2]![clefX + 1]! = '│';
    grid[clefY + 3]![clefX]! = '╯';
  }

  // Harmony Hall - central resonance chamber
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const hallR = Math.floor(Math.min(width, height) / 8);

  // Amphitheater shape
  for (let dy = -hallR; dy <= hallR; dy++) {
    for (let dx = -hallR; dx <= hallR; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hallR && dy > -hallR / 2) {
        grid[centerY + dy]![centerX + dx]! = '░';
      }
      if (Math.abs(dist - hallR) < 1.5 && dy > -hallR / 2) {
        grid[centerY + dy]![centerX + dx]! = '◠';
      }
    }
  }
  grid[centerY]![centerX]! = '♪';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: centerX - hallR, y: centerY - hallR / 2, width: hallR * 2, height: hallR * 1.5 },
    districtType: 'harmony_hall',
  });

  // Melody Spires - tall resonating towers
  const spireCount = Math.floor(size.sectors * 0.5);
  for (let i = 0; i < spireCount; i++) {
    const sx = rng.nextInt(15, width - 10);
    const sy = rng.nextInt(5, height - 20);
    const sh = rng.nextInt(10, 20);

    // Draw spire
    for (let h = 0; h < sh; h++) {
      const py = sy + sh - h;
      const spireWidth = Math.max(1, 3 - Math.floor(h / 5));
      for (let w = -spireWidth; w <= spireWidth; w++) {
        const px = sx + w;
        if (py >= 0 && py < height && px >= 0 && px < width) {
          grid[py]![px]! = h === sh - 1 ? '♫' : '│';
        }
      }
    }

    // Sound waves emanating
    for (let wave = 1; wave <= 3; wave++) {
      const wy = sy - wave;
      if (wy >= 0) {
        for (let wx = -wave; wx <= wave; wx++) {
          if (sx + wx >= 0 && sx + wx < width) {
            grid[wy]![sx + wx]! = '~';
          }
        }
      }
    }

    plots.push({
      id: `plot_${plotId++}`,
      bounds: { x: sx - 2, y: sy, width: 4, height: sh },
      districtType: 'melody_spire',
    });
  }

  // Rhythm Quarter - percussion area
  const rhythmY = height - 15;
  const rhythmH = 10;

  for (let x = 10; x < width - 10; x++) {
    for (let dy = 0; dy < rhythmH; dy++) {
      const py = rhythmY + dy;
      if (py >= 0 && py < height) {
        // Drum-like patterns
        if ((x + dy) % 4 === 0) {
          grid[py]![x]! = '●';
        } else if ((x + dy) % 4 === 2) {
          grid[py]![x]! = '○';
        }
      }
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: 10, y: rhythmY, width: width - 20, height: rhythmH },
    districtType: 'rhythm_quarter',
  });

  // Bass Foundation - deep rumbling base
  for (let y = height - 5; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave = Math.sin(x * 0.3 + y * 0.5) > 0;
      grid[y]![x]! = wave ? '▓' : '▒';
    }
  }

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: 0, y: height - 5, width: width, height: 5 },
    districtType: 'bass_foundation',
  });

  // Dissonance Pit - experimental zone
  const pitX = rng.nextInt(width - 20, width - 8);
  const pitY = rng.nextInt(10, height - 20);
  const pitR = rng.nextInt(5, 8);

  for (let dy = -pitR; dy <= pitR; dy++) {
    for (let dx = -pitR; dx <= pitR; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < pitR) {
        const gy = pitY + dy;
        const gx = pitX + dx;
        if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
          grid[gy]![gx]! = rng.pick(['♯', '♭', '♮', '?', '!', '#']);
        }
      }
    }
  }
  grid[pitY]![pitX]! = '⚡';

  plots.push({
    id: `plot_${plotId++}`,
    bounds: { x: pitX - pitR, y: pitY - pitR, width: pitR * 2, height: pitR * 2 },
    districtType: 'dissonance_pit',
  });

  // Musical notes scattered throughout
  const notes = ['♩', '♪', '♫', '♬', '𝄞'];
  for (let i = 0; i < 20; i++) {
    const nx = rng.nextInt(10, width - 10);
    const ny = rng.nextInt(5, height - 10);
    if (grid[ny]![nx]! === '·') {
      grid[ny]![nx]! = rng.pick(notes);
    }
  }

  const districtCounts: Record<DistrictType, number> = {} as Record<DistrictType, number>;
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets: [], plots },
    buildings: [],
    ascii: gridToString(grid) + '\n\n[The city sings its own existence]',
    stats: {
      totalBuildings: 0,
      totalPlots: plots.length,
      districtCounts,
      streetLength: 0,
    },
  };
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate a city based on specification
 */
export function generateCity(spec: CitySpec): GeneratedCity {
  const seed = spec.seed ?? Date.now();
  const rng = new SeededRandom(seed);

  let city: GeneratedCity;
  switch (spec.type) {
    case 'grid':
      city = generateGridCity(spec, rng);
      break;
    case 'organic':
      city = generateOrganicCity(spec, rng);
      break;
    case 'flying':
      city = generateFlyingCity(spec, rng);
      break;
    case 'non_euclidean':
      city = generateNonEuclideanCity(spec, rng);
      break;
    case 'dwarven':
      city = generateDwarvenCity(spec, rng);
      break;
    case 'literary':
      city = generateLiteraryCity(spec, rng);
      break;
    // Alien & Fantastical city types
    case 'crystalline':
      city = generateCrystallineCity(spec, rng);
      break;
    case 'hive':
      city = generateHiveCity(spec, rng);
      break;
    case 'fungal':
      city = generateFungalCity(spec, rng);
      break;
    case 'aquatic':
      city = generateAquaticCity(spec, rng);
      break;
    case 'temporal':
      city = generateTemporalCity(spec, rng);
      break;
    case 'dream':
      city = generateDreamCity(spec, rng);
      break;
    case 'void':
      city = generateVoidCity(spec, rng);
      break;
    case 'symbiotic':
      city = generateSymbioticCity(spec, rng);
      break;
    case 'fractal':
      city = generateFractalCity(spec, rng);
      break;
    case 'musical':
      city = generateMusicalCity(spec, rng);
      break;
    default:
      throw new Error(`Unknown city type: ${spec.type}`);
  }

  // Run Feng Shui analysis on the generated city
  city.harmony = cityFengShuiAnalyzer.analyze(city.layout, spec.type);

  return city;
}

/**
 * Visualize a city with statistics
 */
export function visualizeCity(city: GeneratedCity): string {
  const lines: string[] = [];

  lines.push('═'.repeat(70));
  lines.push(`  ${city.spec.name || city.spec.type.toUpperCase() + ' CITY'}`);
  lines.push(`  Type: ${city.spec.type} | Size: ${city.spec.size} | Species: ${city.spec.species}`);
  lines.push('═'.repeat(70));
  lines.push('');
  lines.push(city.ascii);
  lines.push('');
  lines.push('─'.repeat(70));
  lines.push('STATISTICS:');
  lines.push(`  Total Plots: ${city.stats.totalPlots}`);
  lines.push(`  Buildings Placed: ${city.stats.totalBuildings}`);
  if (city.stats.streetLength > 0) {
    lines.push(`  Street Length: ${city.stats.streetLength} tiles`);
  }
  lines.push('');
  lines.push('DISTRICTS:');
  for (const [type, count] of Object.entries(city.stats.districtCounts)) {
    lines.push(`  ${type}: ${count} plots`);
  }

  // Add Feng Shui harmony analysis
  if (city.harmony) {
    lines.push('');
    lines.push('─'.repeat(70));
    lines.push('FENG SHUI ANALYSIS:');
    lines.push(`  Harmony Score: ${city.harmony.harmonyScore}/100 (${city.harmony.harmonyLevel})`);
    lines.push(`  Ming Tang: ${city.harmony.mingTang.hasCenter ? `${city.harmony.mingTang.shapeQuality} (${city.harmony.mingTang.centerSize} tiles)` : 'None'}`);
    lines.push(`  Chi Flow: ${city.harmony.dragonVeins.hasCirculation ? 'Circulates' : 'Blocked'} (${city.harmony.dragonVeins.primaryChannels.length} channels)`);
    lines.push(`  Districts: ${city.harmony.districtHarmony.compatiblePairs} harmonious, ${city.harmony.districtHarmony.conflictingPairs} conflicts`);
    const el = city.harmony.elementBalance;
    lines.push(`  Elements: Wood ${Math.round(el.wood * 100)}% | Fire ${Math.round(el.fire * 100)}% | Earth ${Math.round(el.earth * 100)}% | Metal ${Math.round(el.metal * 100)}% | Water ${Math.round(el.water * 100)}%`);
    if (city.harmony.shaQiPaths.length > 0) {
      lines.push(`  Sha Qi: ${city.harmony.shaQiPaths.length} harmful straight paths`);
    }
    if (city.harmony.issues.length > 0) {
      lines.push('');
      lines.push('  Issues:');
      for (const issue of city.harmony.issues.slice(0, 3)) {
        lines.push(`    [${issue.severity}] ${issue.issue}`);
      }
    }
    if (city.harmony.recommendations.length > 0) {
      lines.push('');
      lines.push('  Recommendations:');
      for (const rec of city.harmony.recommendations.slice(0, 2)) {
        lines.push(`    • ${rec}`);
      }
    }
  }

  lines.push('─'.repeat(70));

  return lines.join('\n');
}

// =============================================================================
// LEGEND
// =============================================================================

export const CITY_LEGEND = {
  // Streets
  '=': 'Arterial road',
  '|': 'Arterial road (vertical)',
  '+': 'Intersection',
  '-': 'Local street',
  '~': 'Organic street / Magma',

  // Districts
  'C': 'Civic',
  'M': 'Market / Mine',
  'R': 'Residential',
  'I': 'Industrial',
  'L': 'Library/Research',
  'F': 'Farm/Agricultural / Forge',
  'S': 'Storage',
  'B': 'Barracks/Military',
  'W': 'Wealthy',
  'r': 'Slums',
  'T': 'Town Hall/Temple',
  'G': 'Gate',
  'H': 'Great Hall',
  'm': 'Mushroom Farm',

  // Flying city
  '·': 'Open air / Corridor',
  '∙': 'Flight lane',
  '○': 'Thermal column',
  '△': 'Spire',
  '▲': 'Spire peak / Surface entrance',
  '▭': 'Landing platform',

  // Non-Euclidean
  '░': 'Uncertain space / Room interior',
  '▓': 'Tomb interior / Deep storage',
  '█': 'Cyclopean wall / Solid rock',
  '≈': 'Impossible corridor / Magma pool',
  '⌀': 'Void/gap',
  '∠': 'Angle anomaly',
  '╳': 'Reality tear',
  '∞': 'Infinite loop / Recursive library',
  '◊': 'Spiral structure / Craft hall',
  '□': 'Fractured cube',
  '◎': 'Organic mass',
  '▢': 'Wrong-angled building',
  '▼': 'Inverted structure / Entrance',
  '1-5': 'Phase visibility (1-5)',

  // Dwarven Underground
  '║': 'Great stairway shaft wall',
  '━': 'Level separator / Floor',
  '▪': 'Door',
  '♣': 'Mushroom farm',
  'Z': 'Z-level indicator',

  // Literary Underground
  '─': 'Text line / Footnote separator',
  '│': 'Page margin',
  '▬': 'Bookshelf',
  '▐': 'Bookcase',
  '⌂': 'Library entrance',
  '✎': 'Quill / Writing desk',
  '⊡': 'Scribe desk',
  '¹²³': 'Footnote markers',
  '†‡§¶': 'Marginalia annotations',
  '?!#@$': 'Typo Void chaos',
};

// =============================================================================
// DEMO
// =============================================================================

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  CITY GENERATOR DEMO');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const cities = [
    { type: 'grid' as const, size: 'small' as const, species: 'medium' as const, name: 'New Haven', seed: 12345 },
    { type: 'organic' as const, size: 'small' as const, species: 'medium' as const, name: 'Old Millbrook', seed: 54321 },
    { type: 'flying' as const, size: 'small' as const, species: 'medium' as const, name: 'Skyreach Aerie', seed: 11111 },
    { type: 'non_euclidean' as const, size: 'small' as const, species: 'medium' as const, name: "R'lyeh", seed: 66666 },
    { type: 'dwarven' as const, size: 'small' as const, species: 'medium' as const, name: 'Irondeep Hold', seed: 77777 },
    { type: 'literary' as const, size: 'small' as const, species: 'medium' as const, name: 'The Footnotes', seed: 88888 },
  ];

  for (const spec of cities) {
    console.log('\n');
    const city = generateCity(spec);
    console.log(visualizeCity(city));
  }

  console.log('\n\nLEGEND:');
  for (const [symbol, meaning] of Object.entries(CITY_LEGEND)) {
    console.log(`  ${symbol} = ${meaning}`);
  }
}
