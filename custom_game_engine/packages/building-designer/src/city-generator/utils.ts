/**
 * City Generator Utilities
 *
 * Utility classes and functions for city generation including:
 * - SeededRandom: Deterministic random number generation
 * - Grid manipulation functions
 * - Building selection helpers
 */

import type { VoxelBuildingDefinition, BuilderSpecies } from '../types.js';
import type { Plot, DistrictType } from './types.js';
import { DISTRICT_BUILDINGS, ALL_BUILDINGS } from './constants.js';

// =============================================================================
// SEEDED RANDOM
// =============================================================================

/**
 * Simple seeded random number generator for deterministic city generation.
 */
export class SeededRandom {
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

// =============================================================================
// GRID UTILITIES
// =============================================================================

/**
 * Create empty grid with specified dimensions and fill character.
 */
export function createEmptyGrid(width: number, height: number, fill = ' '): string[][] {
  return Array(height).fill(null).map(() => Array(width).fill(fill));
}

/**
 * Draw a filled rectangle on grid.
 */
export function fillRect(
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
 * Draw a rectangle outline on grid.
 */
export function strokeRect(
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
 * Draw a line on grid using Bresenham's algorithm.
 */
export function drawLine(
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
 * Convert grid to string for ASCII output.
 */
export function gridToString(grid: string[][]): string {
  return grid.map(row => row.join('')).join('\n');
}

// =============================================================================
// BUILDING UTILITIES
// =============================================================================

/**
 * Get building dimensions from layout.
 */
export function getBuildingDimensions(building: VoxelBuildingDefinition): { width: number; height: number } {
  const height = building.layout.length;
  const width = Math.max(...building.layout.map(row => row.length));
  return { width, height };
}

/**
 * Check if building fits in plot.
 */
export function buildingFitsInPlot(building: VoxelBuildingDefinition, plot: Plot): boolean {
  const dims = getBuildingDimensions(building);
  return dims.width <= plot.bounds.width && dims.height <= plot.bounds.height;
}

/**
 * Select building for a plot based on district type and species.
 */
export function selectBuildingForPlot(
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

/**
 * Get ASCII symbol for district type.
 */
export function getDistrictSymbol(type: DistrictType): string {
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
    footnotes: '\u00B9',
    typo_void: '?',
    scriptorium: 'S',
    // Crystalline districts
    resonance_chamber: '\u25C7',
    prism_core: '\u25C6',
    facet_housing: '\u2B21',
    refraction_lab: '\u25B3',
    // Hive districts
    brood_chamber: '\u2B22',
    royal_cell: '\u2655',
    worker_warren: '\u224B',
    nectar_store: '\u26B2',
    pheromone_hub: '\u229B',
    // Fungal districts
    mycelium_network: '\u2248',
    spore_tower: '\u2302',
    decomposition_pit: '\u2261',
    fruiting_body: '\u2229',
    // Aquatic districts
    bubble_dome: '\u25CB',
    current_channel: '~',
    kelp_forest: '\u2307',
    pressure_lock: '\u25CE',
    abyssal_shrine: '\u25BC',
    // Temporal districts
    past_echo: '\u2190',
    present_anchor: '\u25C8',
    future_shadow: '\u2192',
    chrono_nexus: '\u231B',
    paradox_zone: '\u29D7',
    // Dream districts
    lucid_plaza: '\u2601',
    nightmare_quarter: '\u2606',
    memory_palace: '\u2318',
    impossible_stair: '\u221E',
    waking_edge: '\u2502',
    // Void districts
    gravity_anchor: '\u2693',
    star_dock: '\u2605',
    void_garden: ' ',
    silence_temple: '\u25CF',
    tether_station: '\u25EF',
    // Symbiotic districts
    heart_chamber: '\u2665',
    neural_cluster: '\u229B',
    digestion_tract: '\u2297',
    membrane_quarter: '\u2295',
    growth_bud: '\u2741',
    // Fractal districts
    seed_pattern: '\u22EE',
    iteration_ring: '\u223F',
    scale_bridge: '\u203B',
    infinity_edge: '\u2234',
    // Musical districts
    harmony_hall: '\u266B',
    rhythm_quarter: '\u2669',
    melody_spire: '\u266A',
    bass_foundation: '\u266D',
    dissonance_pit: '\u266F',
  };
  return symbols[type] || '?';
}
