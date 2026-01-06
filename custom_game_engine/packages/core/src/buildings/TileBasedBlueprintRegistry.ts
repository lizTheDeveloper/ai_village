/**
 * TileBasedBlueprintRegistry - Tile-based building blueprints for voxel construction.
 *
 * RimWorld/Dwarf Fortress-style buildings defined as string layouts where:
 * - '#' = wall
 * - '.' = floor
 * - 'D' = door
 * - 'W' = window
 * - ' ' = empty (no tile placed)
 *
 * Example:
 * ```
 * "###D###"
 * "#.....#"
 * "#.....#"
 * "#######"
 * ```
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid input.
 */

import type { ResourceCost, SkillRequirement, BuildingCategory, BuildingFunction } from './BuildingBlueprintRegistry.js';

// Material types (matching @ai-village/world Tile.ts)
export type WallMaterial = 'wood' | 'stone' | 'mud_brick' | 'ice' | 'metal' | 'glass' | 'thatch';
export type DoorMaterial = 'wood' | 'stone' | 'metal' | 'cloth';
export type WindowMaterial = 'glass' | 'hide' | 'cloth';

/**
 * Tile position in world coordinates.
 */
export interface TilePosition {
  x: number;
  y: number;
}

/**
 * Tile type in a layout.
 */
export type TileType = 'wall' | 'floor' | 'door' | 'window' | 'empty';

/**
 * Parsed tile from a layout string.
 */
export interface ParsedTile {
  /** World X position (after applying origin) */
  x: number;
  /** World Y position (after applying origin) */
  y: number;
  /** Tile type */
  type: TileType;
  /** Material ID for this tile */
  materialId: string;
  /** Original symbol from layout */
  symbol: string;
}

/**
 * Material defaults for layout symbols.
 * Maps symbols to material IDs.
 */
export interface MaterialDefaults {
  /** Wall material (for '#') */
  wall: WallMaterial;
  /** Floor material (for '.') */
  floor: string;
  /** Door material (for 'D') */
  door: DoorMaterial;
  /** Window material (for 'W') */
  window?: WindowMaterial;
}

/**
 * Tile-based building blueprint with string layout.
 */
export interface TileBasedBlueprint {
  /** Unique blueprint ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Building category */
  category: BuildingCategory;

  /**
   * String-based layout for easy visualization.
   * Each string is a row, each character is a tile.
   * '#' = wall, '.' = floor, 'D' = door, 'W' = window, ' ' = empty
   */
  layoutString: string[];

  /** Default materials for layout symbols */
  materialDefaults: MaterialDefaults;

  /** Allow custom materials to override defaults? */
  allowCustomMaterials: boolean;

  /** Calculated width (from layoutString) */
  readonly width: number;

  /** Calculated height (from layoutString) */
  readonly height: number;

  /** Resource costs (calculated from layout + materials) */
  resourceCost: ResourceCost[];

  /** Required technologies */
  techRequired: string[];

  /** Terrain types this can be built on */
  terrainRequired: string[];

  /** Terrain types this cannot be built on */
  terrainForbidden: string[];

  /** Skill required to build */
  skillRequired?: SkillRequirement;

  /** Is this blueprint unlocked? */
  unlocked: boolean;

  /** Base build time in game ticks (per tile) */
  buildTimePerTile: number;

  /** Building tier (1-5) */
  tier: number;

  /** Building functionality when complete */
  functionality: BuildingFunction[];

  /** Can be rotated? */
  canRotate: boolean;

  /** Allowed rotation angles */
  rotationAngles: number[];
}

/**
 * Symbol to tile type mapping.
 */
const SYMBOL_TO_TYPE: Record<string, TileType> = {
  '#': 'wall',
  '.': 'floor',
  'D': 'door',
  'W': 'window',
  ' ': 'empty',
};

/**
 * Parse a layout string into tile positions.
 *
 * @param blueprint - The blueprint containing the layout
 * @param originX - World X origin for placement
 * @param originY - World Y origin for placement
 * @param rotation - Rotation in degrees (0, 90, 180, 270)
 * @param customMaterials - Optional material overrides
 * @returns Array of parsed tiles with world positions
 * @throws Error if rotation is invalid or layout is malformed
 */
export function parseLayout(
  blueprint: TileBasedBlueprint,
  originX: number,
  originY: number,
  rotation: number = 0,
  customMaterials?: Partial<MaterialDefaults>
): ParsedTile[] {
  // Validate rotation
  if (![0, 90, 180, 270].includes(rotation)) {
    throw new Error(`Invalid rotation: ${rotation}. Must be 0, 90, 180, or 270`);
  }

  if (!blueprint.canRotate && rotation !== 0) {
    throw new Error(`Blueprint "${blueprint.id}" does not support rotation`);
  }

  // Get layout (potentially rotated)
  const layout = rotation === 0
    ? blueprint.layoutString
    : rotateLayout(blueprint.layoutString, rotation);

  // Merge materials
  const materials: MaterialDefaults = {
    ...blueprint.materialDefaults,
    ...customMaterials,
  };

  const tiles: ParsedTile[] = [];

  for (let y = 0; y < layout.length; y++) {
    const row = layout[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const symbol = row[x];
      if (!symbol) continue;
      const type = SYMBOL_TO_TYPE[symbol];

      if (!type) {
        throw new Error(
          `Unknown symbol "${symbol}" at position (${x}, ${y}) in blueprint "${blueprint.id}"`
        );
      }

      // Skip empty tiles
      if (type === 'empty') {
        continue;
      }

      // Get material for this tile type
      const materialId = getMaterialForType(type, materials);

      tiles.push({
        x: originX + x,
        y: originY + y,
        type,
        materialId,
        symbol: symbol,
      });
    }
  }

  return tiles;
}

/**
 * Get material ID for a tile type.
 */
function getMaterialForType(type: TileType, materials: MaterialDefaults): string {
  switch (type) {
    case 'wall':
      return materials.wall;
    case 'floor':
      return materials.floor;
    case 'door':
      return materials.door;
    case 'window':
      if (!materials.window) {
        throw new Error('Window material not specified in MaterialDefaults');
      }
      return materials.window;
    case 'empty':
      return '';
  }
}

/**
 * Rotate a layout by the specified degrees.
 *
 * @param layout - Original layout strings
 * @param degrees - Rotation (90, 180, or 270)
 * @returns Rotated layout strings
 */
export function rotateLayout(layout: string[], degrees: number): string[] {
  if (degrees === 0) {
    return layout;
  }

  const width = Math.max(...layout.map(row => row.length));

  // Normalize rows to same width
  const normalized = layout.map(row => row.padEnd(width, ' '));

  if (degrees === 90) {
    return rotateLayout90(normalized);
  } else if (degrees === 180) {
    return rotateLayout180(normalized);
  } else if (degrees === 270) {
    return rotateLayout270(normalized);
  }

  throw new Error(`Invalid rotation degrees: ${degrees}`);
}

/**
 * Rotate layout 90 degrees clockwise.
 */
function rotateLayout90(layout: string[]): string[] {
  const height = layout.length;
  const firstRow = layout[0];
  if (!firstRow) return [];
  const width = firstRow.length;
  const result: string[] = [];

  for (let x = 0; x < width; x++) {
    let row = '';
    for (let y = height - 1; y >= 0; y--) {
      const layoutRow = layout[y];
      row += layoutRow ? layoutRow[x] ?? ' ' : ' ';
    }
    result.push(row);
  }

  return result;
}

/**
 * Rotate layout 180 degrees.
 */
function rotateLayout180(layout: string[]): string[] {
  return layout
    .map(row => row.split('').reverse().join(''))
    .reverse();
}

/**
 * Rotate layout 270 degrees clockwise (or 90 counter-clockwise).
 */
function rotateLayout270(layout: string[]): string[] {
  const height = layout.length;
  const firstRow = layout[0];
  if (!firstRow) return [];
  const width = firstRow.length;
  const result: string[] = [];

  for (let x = width - 1; x >= 0; x--) {
    let row = '';
    for (let y = 0; y < height; y++) {
      const layoutRow = layout[y];
      row += layoutRow ? layoutRow[x] ?? ' ' : ' ';
    }
    result.push(row);
  }

  return result;
}

/**
 * Calculate resource costs from a blueprint layout.
 * Each tile requires materials based on its type.
 */
export function calculateResourceCost(blueprint: TileBasedBlueprint): ResourceCost[] {
  const costs: Map<string, number> = new Map();

  for (const row of blueprint.layoutString) {
    for (const symbol of row) {
      const type = SYMBOL_TO_TYPE[symbol];
      if (!type || type === 'empty') continue;

      const materialId = getMaterialForType(type, blueprint.materialDefaults);

      // Each tile costs 1 unit of its material
      const current = costs.get(materialId) || 0;
      costs.set(materialId, current + 1);
    }
  }

  return Array.from(costs.entries()).map(([resourceId, amountRequired]) => ({
    resourceId,
    amountRequired,
  }));
}

/**
 * Calculate dimensions from layout string.
 */
export function calculateDimensions(layoutString: string[]): { width: number; height: number } {
  const height = layoutString.length;
  const width = Math.max(...layoutString.map(row => row.length));
  return { width, height };
}

/**
 * Validate a tile-based blueprint.
 * @throws Error if blueprint is invalid
 */
export function validateTileBasedBlueprint(blueprint: TileBasedBlueprint): void {
  if (!blueprint.id || blueprint.id.trim() === '') {
    throw new Error('Blueprint id cannot be empty');
  }

  if (blueprint.layoutString.length === 0) {
    throw new Error('Blueprint layoutString cannot be empty');
  }

  // Check all rows have valid symbols
  for (let y = 0; y < blueprint.layoutString.length; y++) {
    const row = blueprint.layoutString[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const symbol = row[x];
      if (!symbol) continue;
      if (!(symbol in SYMBOL_TO_TYPE)) {
        throw new Error(
          `Invalid symbol "${symbol}" at position (${x}, ${y}) in blueprint "${blueprint.id}". ` +
          `Valid symbols: ${Object.keys(SYMBOL_TO_TYPE).map(s => `"${s}"`).join(', ')}`
        );
      }
    }
  }

  // Check material defaults
  if (!blueprint.materialDefaults.wall) {
    throw new Error('Blueprint must specify wall material in materialDefaults');
  }
  if (!blueprint.materialDefaults.floor) {
    throw new Error('Blueprint must specify floor material in materialDefaults');
  }
  if (!blueprint.materialDefaults.door) {
    throw new Error('Blueprint must specify door material in materialDefaults');
  }

  // Check for windows in layout but no window material
  const hasWindows = blueprint.layoutString.some(row => row.includes('W'));
  if (hasWindows && !blueprint.materialDefaults.window) {
    throw new Error('Blueprint has windows but no window material specified in materialDefaults');
  }

  if (blueprint.canRotate && blueprint.rotationAngles.length === 0) {
    throw new Error('canRotate is true but rotationAngles is empty');
  }
}

/**
 * Create a tile-based blueprint with calculated properties.
 */
export function createTileBasedBlueprint(
  config: Omit<TileBasedBlueprint, 'width' | 'height' | 'resourceCost'> & {
    resourceCost?: ResourceCost[];
  }
): TileBasedBlueprint {
  const { width, height } = calculateDimensions(config.layoutString);

  const blueprint: TileBasedBlueprint = {
    ...config,
    width,
    height,
    resourceCost: config.resourceCost || [],
  };

  // Auto-calculate resource cost if not provided
  if (blueprint.resourceCost.length === 0) {
    blueprint.resourceCost = calculateResourceCost(blueprint);
  }

  // Validate before returning
  validateTileBasedBlueprint(blueprint);

  return blueprint;
}

/**
 * Registry for tile-based building blueprints.
 */
export class TileBasedBlueprintRegistry {
  private blueprints = new Map<string, TileBasedBlueprint>();

  /**
   * Register a tile-based blueprint.
   * @throws Error if blueprint with same id already exists
   * @throws Error if blueprint is invalid
   */
  register(blueprint: TileBasedBlueprint): void {
    validateTileBasedBlueprint(blueprint);

    if (this.blueprints.has(blueprint.id)) {
      throw new Error(`Tile-based blueprint with id "${blueprint.id}" already registered`);
    }

    this.blueprints.set(blueprint.id, blueprint);
  }

  /**
   * Get a blueprint by id.
   * @throws Error if blueprint not found
   */
  get(id: string): TileBasedBlueprint {
    const blueprint = this.blueprints.get(id);
    if (!blueprint) {
      throw new Error(`Tile-based blueprint "${id}" not found`);
    }
    return blueprint;
  }

  /**
   * Try to get a blueprint by id.
   * Returns undefined if not found.
   */
  tryGet(id: string): TileBasedBlueprint | undefined {
    return this.blueprints.get(id);
  }

  /**
   * Get all blueprints.
   */
  getAll(): TileBasedBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  /**
   * Get all unlocked blueprints.
   */
  getUnlocked(): TileBasedBlueprint[] {
    return Array.from(this.blueprints.values()).filter(bp => bp.unlocked);
  }

  /**
   * Get blueprints by category.
   */
  getByCategory(category: BuildingCategory): TileBasedBlueprint[] {
    return Array.from(this.blueprints.values()).filter(bp => bp.category === category);
  }

  /**
   * Register all default tile-based blueprints.
   *
   * NOTE: TileBasedBlueprintRegistry is for SMALL crafting items only.
   * For actual buildings (houses, workshops, etc.), use VoxelBuildingDefinition
   * in StandardVoxelBuildings.ts instead.
   */
  registerDefaults(): void {
    // NOTE: All residential buildings (houses, workshops, barns, towers) have been
    // moved to StandardVoxelBuildings.ts which uses VoxelBuildingDefinition.
    //
    // This registry should ONLY contain small crafting items like:
    // - Crafting benches
    // - Small workstations
    // - Decorative items
    //
    // For actual buildings with furniture and roofs, use VoxelBuildingDefinition.

    // TODO: Add small crafting benches here if needed (workbench, anvil, etc.)
  }
}

/**
 * Default global tile-based blueprint registry instance.
 */
export const defaultTileBasedBlueprintRegistry = new TileBasedBlueprintRegistry();

// Register default blueprints on initialization
defaultTileBasedBlueprintRegistry.registerDefaults();

/**
 * Get the default singleton TileBasedBlueprintRegistry instance.
 */
export function getTileBasedBlueprintRegistry(): TileBasedBlueprintRegistry {
  return defaultTileBasedBlueprintRegistry;
}
