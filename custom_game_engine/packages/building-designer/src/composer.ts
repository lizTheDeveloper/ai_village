/**
 * LLM Building Designer - Compositional Module System
 *
 * Provides pre-defined building modules that LLMs can compose together,
 * so they don't have to reinvent walls and doors for every building.
 */

import {
  BuildingComposition,
  ModuleType,
  ModulePlacement,
  Direction,
  TILE_SYMBOLS,
} from './types';

// =============================================================================
// MODULE TEMPLATES
// =============================================================================

/**
 * Generate a module layout based on type and size.
 * Each module is a self-contained room pattern.
 */
export function generateModule(
  type: ModuleType,
  width: number,
  height: number,
  connections: Direction[] = []
): string[] {
  const layout: string[] = [];

  // Initialize with walls
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const isTop = y === 0;
      const isBottom = y === height - 1;
      const isLeft = x === 0;
      const isRight = x === width - 1;
      const isEdge = isTop || isBottom || isLeft || isRight;

      if (isEdge) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    layout.push(row);
  }

  // Add doors for connections
  for (const dir of connections) {
    addConnectionDoor(layout, width, height, dir);
  }

  // Add furniture based on module type
  addModuleFurniture(layout, type, width, height);

  return layout;
}

/**
 * Add a door on the specified side for connecting to adjacent modules.
 */
function addConnectionDoor(
  layout: string[],
  width: number,
  height: number,
  direction: Direction
): void {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);

  switch (direction) {
    case 'north':
      layout[0] = replaceAt(layout[0], midX, TILE_SYMBOLS.DOOR);
      break;
    case 'south':
      layout[height - 1] = replaceAt(layout[height - 1], midX, TILE_SYMBOLS.DOOR);
      break;
    case 'east':
      layout[midY] = replaceAt(layout[midY], width - 1, TILE_SYMBOLS.DOOR);
      break;
    case 'west':
      layout[midY] = replaceAt(layout[midY], 0, TILE_SYMBOLS.DOOR);
      break;
  }
}

/**
 * Add furniture to a module based on its type.
 */
function addModuleFurniture(
  layout: string[],
  type: ModuleType,
  width: number,
  height: number
): void {
  // Skip if room is too small for furniture
  if (width < 4 || height < 4) return;

  switch (type) {
    case 'bedroom':
      // Place bed in corner
      layout[1] = replaceAt(layout[1], 1, TILE_SYMBOLS.BED);
      layout[1] = replaceAt(layout[1], 2, TILE_SYMBOLS.BED);
      layout[2] = replaceAt(layout[2], 1, TILE_SYMBOLS.BED);
      layout[2] = replaceAt(layout[2], 2, TILE_SYMBOLS.BED);
      // Storage chest
      if (width > 4) {
        layout[1] = replaceAt(layout[1], width - 2, TILE_SYMBOLS.STORAGE);
      }
      break;

    case 'storage_room':
      // Storage along walls
      for (let x = 1; x < width - 1; x++) {
        layout[1] = replaceAt(layout[1], x, TILE_SYMBOLS.STORAGE);
        if (height > 4) {
          layout[height - 2] = replaceAt(layout[height - 2], x, TILE_SYMBOLS.STORAGE);
        }
      }
      break;

    case 'workshop':
      // Workstations
      layout[1] = replaceAt(layout[1], 1, TILE_SYMBOLS.WORKSTATION);
      layout[1] = replaceAt(layout[1], 2, TILE_SYMBOLS.WORKSTATION);
      // Storage for materials
      if (width > 4) {
        layout[1] = replaceAt(layout[1], width - 2, TILE_SYMBOLS.STORAGE);
      }
      break;

    case 'kitchen':
      // Counter along one wall
      for (let x = 1; x < Math.min(width - 1, 5); x++) {
        layout[1] = replaceAt(layout[1], x, TILE_SYMBOLS.COUNTER);
      }
      // Storage
      if (height > 4) {
        layout[height - 2] = replaceAt(layout[height - 2], 1, TILE_SYMBOLS.STORAGE);
      }
      break;

    case 'dining_hall':
      // Tables in center
      const tableStartX = Math.floor(width / 4);
      const tableEndX = Math.floor((width * 3) / 4);
      const tableY = Math.floor(height / 2);
      for (let x = tableStartX; x <= tableEndX; x++) {
        layout[tableY] = replaceAt(layout[tableY], x, TILE_SYMBOLS.TABLE);
        if (height > 5) {
          layout[tableY - 1] = replaceAt(layout[tableY - 1], x, TILE_SYMBOLS.TABLE);
        }
      }
      break;

    case 'library':
      // Bookshelves (storage) along walls
      for (let y = 1; y < height - 1; y += 2) {
        layout[y] = replaceAt(layout[y], 1, TILE_SYMBOLS.STORAGE);
        if (width > 5) {
          layout[y] = replaceAt(layout[y], width - 2, TILE_SYMBOLS.STORAGE);
        }
      }
      // Reading table in center
      if (width > 5 && height > 5) {
        const centerY = Math.floor(height / 2);
        const centerX = Math.floor(width / 2);
        layout[centerY] = replaceAt(layout[centerY], centerX, TILE_SYMBOLS.TABLE);
      }
      break;

    case 'entrance_hall':
      // Main entrance on south side
      layout[height - 1] = replaceAt(layout[height - 1], Math.floor(width / 2), 'E');
      break;

    case 'stairwell':
      // Stairs in center
      const centerY = Math.floor(height / 2);
      const centerX = Math.floor(width / 2);
      layout[centerY] = replaceAt(layout[centerY], centerX, TILE_SYMBOLS.STAIRS_BOTH);
      break;

    case 'hallway':
      // Hallways are just empty corridors - no furniture
      break;

    case 'courtyard':
      // Mark interior as exterior (no roof)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          layout[y] = replaceAt(layout[y], x, TILE_SYMBOLS.EMPTY);
        }
      }
      break;

    // empty_room and room_with_door need no furniture
  }
}

/**
 * Helper to replace a character at a position in a string.
 */
function replaceAt(str: string, index: number, char: string): string {
  if (index < 0 || index >= str.length) return str;
  return str.substring(0, index) + char + str.substring(index + 1);
}

// =============================================================================
// COMPOSITION EXPANSION
// =============================================================================

/**
 * Expand a compositional building definition into a full layout.
 * This converts the high-level module description into ASCII tiles.
 */
export function expandComposition(composition: BuildingComposition): string[] {
  const { footprint, modules } = composition;

  // Initialize empty layout
  const layout: string[] = [];
  for (let y = 0; y < footprint.height; y++) {
    layout.push(TILE_SYMBOLS.EMPTY.repeat(footprint.width));
  }

  // Place each module
  for (const placement of modules) {
    const moduleLayout = generateModule(
      placement.module,
      placement.size.width,
      placement.size.height,
      placement.connections || []
    );

    // Apply rotation if specified
    const rotatedLayout = placement.rotation
      ? rotateLayout(moduleLayout, placement.rotation)
      : moduleLayout;

    // Overlay module onto main layout
    overlayModule(layout, rotatedLayout, placement.position.x, placement.position.y);
  }

  return layout;
}

/**
 * Overlay a module layout onto the main building layout.
 */
function overlayModule(
  mainLayout: string[],
  moduleLayout: string[],
  startX: number,
  startY: number
): void {
  for (let y = 0; y < moduleLayout.length; y++) {
    const targetY = startY + y;
    if (targetY < 0 || targetY >= mainLayout.length) continue;

    for (let x = 0; x < moduleLayout[y].length; x++) {
      const targetX = startX + x;
      if (targetX < 0 || targetX >= mainLayout[targetY].length) continue;

      const moduleTile = moduleLayout[y][x];
      const existingTile = mainLayout[targetY][targetX];

      // Merge tiles intelligently
      const mergedTile = mergeTiles(existingTile, moduleTile);
      mainLayout[targetY] = replaceAt(mainLayout[targetY], targetX, mergedTile);
    }
  }
}

/**
 * Merge two tiles when modules overlap.
 * - Doors take priority over walls (creates openings)
 * - Walls take priority over empty space
 * - Floor takes priority over empty space
 */
function mergeTiles(existing: string, incoming: string): string {
  // If existing is empty, use incoming
  if (existing === TILE_SYMBOLS.EMPTY) return incoming;

  // Door creates opening in wall
  if (incoming === TILE_SYMBOLS.DOOR && existing === TILE_SYMBOLS.WALL) {
    return TILE_SYMBOLS.DOOR;
  }
  if (existing === TILE_SYMBOLS.DOOR && incoming === TILE_SYMBOLS.WALL) {
    return TILE_SYMBOLS.DOOR;
  }

  // Wall wins over floor (shared walls)
  if (incoming === TILE_SYMBOLS.WALL) return TILE_SYMBOLS.WALL;

  // Otherwise keep incoming
  return incoming;
}

/**
 * Rotate a layout by 90, 180, or 270 degrees.
 */
function rotateLayout(layout: string[], degrees: 90 | 180 | 270): string[] {
  if (degrees === 180) {
    // Reverse rows and each row's characters
    return layout.map(row => row.split('').reverse().join('')).reverse();
  }

  const height = layout.length;
  const width = layout[0]?.length || 0;
  const rotated: string[] = [];

  if (degrees === 90) {
    // Rotate 90 degrees clockwise
    for (let x = 0; x < width; x++) {
      let newRow = '';
      for (let y = height - 1; y >= 0; y--) {
        newRow += layout[y]?.[x] || TILE_SYMBOLS.EMPTY;
      }
      rotated.push(newRow);
    }
  } else if (degrees === 270) {
    // Rotate 90 degrees counter-clockwise
    for (let x = width - 1; x >= 0; x--) {
      let newRow = '';
      for (let y = 0; y < height; y++) {
        newRow += layout[y]?.[x] || TILE_SYMBOLS.EMPTY;
      }
      rotated.push(newRow);
    }
  }

  return rotated;
}

// =============================================================================
// COMPOSITION HELPERS
// =============================================================================

/**
 * Describe available modules for LLM prompts.
 */
export const MODULE_DESCRIPTIONS: Record<ModuleType, string> = {
  empty_room: 'Basic room with walls and floor, no furniture',
  room_with_door: 'Empty room with a door on one side',
  bedroom: 'Room with bed and storage chest',
  storage_room: 'Room lined with storage containers',
  workshop: 'Room with workstations and material storage',
  kitchen: 'Room with counter and food storage',
  dining_hall: 'Room with tables for eating',
  library: 'Room with bookshelves and reading table',
  hallway: 'Narrow corridor connecting other rooms',
  entrance_hall: 'Entry area with main door to exterior',
  stairwell: 'Vertical connector with stairs between floors',
  courtyard: 'Open area with no roof (exterior)',
  balcony: 'Exterior extension overlooking lower floor',
  tower_base: 'Round or octagonal room for towers',
};

/**
 * Create a simple composition from a textual description.
 * This is what a small LLM would call instead of designing tile-by-tile.
 */
export function composeBuilding(
  _name: string,  // Reserved for future use (building registry)
  modules: Array<{
    type: ModuleType;
    size?: 'small' | 'medium' | 'large';
    connections?: Direction[];
  }>
): BuildingComposition {
  const sizeMappings = {
    small: { width: 4, height: 4 },
    medium: { width: 6, height: 6 },
    large: { width: 8, height: 8 },
  };

  // Calculate footprint by placing modules in a row (simple layout)
  let currentX = 0;
  const placements: ModulePlacement[] = [];

  for (const mod of modules) {
    const size = sizeMappings[mod.size || 'medium'];
    placements.push({
      module: mod.type,
      size,
      position: { x: currentX, y: 0 },
      connections: mod.connections,
    });
    currentX += size.width - 1; // -1 for shared wall
  }

  return {
    footprint: { width: currentX + 1, height: sizeMappings['medium'].height },
    floorCount: 1,
    modules: placements,
    entrance: { x: 0, y: sizeMappings['medium'].height - 1, facing: 'south' },
  };
}

/**
 * Quick building templates for common building types.
 */
export const BUILDING_TEMPLATES = {
  simple_house: (): BuildingComposition => composeBuilding('Simple House', [
    { type: 'entrance_hall', size: 'small', connections: ['east'] },
    { type: 'bedroom', size: 'medium', connections: ['west', 'east'] },
    { type: 'storage_room', size: 'small', connections: ['west'] },
  ]),

  workshop_building: (): BuildingComposition => composeBuilding('Workshop', [
    { type: 'entrance_hall', size: 'small', connections: ['east'] },
    { type: 'workshop', size: 'large', connections: ['west', 'east'] },
    { type: 'storage_room', size: 'medium', connections: ['west'] },
  ]),

  tavern: (): BuildingComposition => composeBuilding('Tavern', [
    { type: 'entrance_hall', size: 'medium', connections: ['east'] },
    { type: 'dining_hall', size: 'large', connections: ['west', 'north'] },
    { type: 'kitchen', size: 'medium', connections: ['south'] },
  ]),

  library: (): BuildingComposition => composeBuilding('Library', [
    { type: 'entrance_hall', size: 'small', connections: ['north'] },
    { type: 'library', size: 'large', connections: ['south', 'east'] },
    { type: 'storage_room', size: 'small', connections: ['west'] },
  ]),
};
