/**
 * Room-Based Building Composer
 *
 * Generates valid building layouts from room specifications.
 * All dimensions are in whole voxel blocks.
 *
 * Usage:
 *   const building = composeFromRooms({
 *     rooms: [
 *       { type: 'bedroom', width: 4, height: 4 },
 *       { type: 'kitchen', width: 5, height: 4 },
 *     ],
 *     entrance: 'south',
 *     species: 'medium',
 *   });
 */

import { VoxelBuildingDefinition, BuilderSpecies, TILE_SYMBOLS } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type RoomType =
  | 'bedroom'      // Beds for sleeping
  | 'living'       // Open space with tables
  | 'kitchen'      // Counters and storage
  | 'storage'      // All storage
  | 'workshop'     // Workstations
  | 'library'      // Bookshelves
  | 'dining'       // Tables
  | 'hall'         // Large open space
  | 'empty';       // No furniture

export interface RoomSpec {
  type: RoomType;
  width: number;   // Interior width (not including walls)
  height: number;  // Interior height (not including walls)
  name?: string;   // Optional room name
}

export interface BuildingSpec {
  rooms: RoomSpec[];
  entrance?: 'north' | 'south' | 'east' | 'west';
  species?: BuilderSpecies;
  style?: string;
  name?: string;
  category?: string;
  tier?: number;
}

interface PlacedRoom {
  spec: RoomSpec;
  x: number;      // Position in layout (top-left corner including wall)
  y: number;
  fullWidth: number;   // Including walls
  fullHeight: number;
}

// =============================================================================
// ROOM SIZE PRESETS
// =============================================================================

export const ROOM_SIZES = {
  tiny:   { width: 2, height: 2 },   // 2x2 interior = 4x4 with walls
  small:  { width: 3, height: 3 },   // 3x3 interior = 5x5 with walls
  medium: { width: 5, height: 4 },   // 5x4 interior = 7x6 with walls
  large:  { width: 7, height: 5 },   // 7x5 interior = 9x7 with walls
  huge:   { width: 10, height: 7 },  // 10x7 interior = 12x9 with walls
} as const;

/**
 * Create a room spec with preset size
 */
export function room(type: RoomType, size: keyof typeof ROOM_SIZES, name?: string): RoomSpec {
  return {
    type,
    ...ROOM_SIZES[size],
    name,
  };
}

// =============================================================================
// LAYOUT GENERATION
// =============================================================================

/**
 * Generate a building from room specifications.
 * Rooms are arranged horizontally with proper shared walls.
 */
export function composeFromRooms(spec: BuildingSpec): VoxelBuildingDefinition {
  const { rooms, entrance = 'south', species = 'medium', style = 'rustic' } = spec;

  if (rooms.length === 0) {
    throw new Error('Building must have at least one room');
  }

  // Place rooms horizontally
  const placedRooms = placeRoomsHorizontally(rooms);

  // Calculate total building size - each room has its own walls, no overlap
  const totalWidth = placedRooms.reduce((sum, r) => sum + r.fullWidth, 0);
  const totalHeight = Math.max(...placedRooms.map(r => r.fullHeight));

  // Create layout grid filled with walls
  const layout = createEmptyLayout(totalWidth, totalHeight);

  // Draw each room independently
  let xOffset = 0;
  for (let i = 0; i < placedRooms.length; i++) {
    const room = placedRooms[i];
    drawRoom(layout, room, xOffset);

    // Add door to next room if not last
    // Door goes in the wall between this room and next room
    if (i < placedRooms.length - 1) {
      // The wall between rooms is at xOffset + room.fullWidth - 1 and xOffset + room.fullWidth
      // We need to make an opening: remove wall at connection point and add door
      const wallX = xOffset + room.fullWidth - 1;  // Right wall of current room
      const nextWallX = xOffset + room.fullWidth;  // Left wall of next room

      // Put door in current room's right wall
      // Door needs: wall above, wall below, floor left, floor right
      // So place door at a y where above and below are walls, and we punch through to next room
      const doorY = Math.floor(totalHeight / 2);

      // Make sure both cells at the door position become passable
      setTile(layout, wallX, doorY, TILE_SYMBOLS.FLOOR);     // Remove this room's wall
      setTile(layout, nextWallX, doorY, TILE_SYMBOLS.FLOOR); // Remove next room's wall
    }

    xOffset += room.fullWidth;
  }

  // Add entrance door at building edge
  addEntrance(layout, entrance, totalWidth, totalHeight);

  // Convert to string array
  const layoutStrings = layout.map(row => row.join(''));

  return {
    id: spec.name?.toLowerCase().replace(/\s+/g, '_') || 'composed_building',
    name: spec.name || 'Composed Building',
    description: `A ${rooms.length}-room ${spec.category || 'building'}.`,
    category: (spec.category as VoxelBuildingDefinition['category']) || 'residential',
    tier: spec.tier || 2,
    species: species,
    layout: layoutStrings,
    materials: { wall: 'stone', floor: 'wood', door: 'wood' },
    functionality: extractFunctionality(rooms),
    capacity: Math.max(2, rooms.length * 2),
    style: style as VoxelBuildingDefinition['style'],
  };
}

/**
 * Calculate room placements (horizontal arrangement)
 */
function placeRoomsHorizontally(rooms: RoomSpec[]): PlacedRoom[] {
  return rooms.map((spec, _index) => ({
    spec,
    x: 0, // Will be calculated during drawing
    y: 0,
    fullWidth: spec.width + 2,   // Add walls
    fullHeight: spec.height + 2,
  }));
}

/**
 * Create empty layout grid
 */
function createEmptyLayout(width: number, height: number): string[][] {
  const layout: string[][] = [];
  for (let y = 0; y < height; y++) {
    layout.push(new Array(width).fill(TILE_SYMBOLS.WALL));
  }
  return layout;
}

/**
 * Set a tile in the layout
 */
function setTile(layout: string[][], x: number, y: number, tile: string): void {
  if (y >= 0 && y < layout.length && x >= 0 && x < layout[y].length) {
    layout[y][x] = tile;
  }
}

/**
 * Draw a room onto the layout
 */
function drawRoom(layout: string[][], room: PlacedRoom, xOffset: number): void {
  const startX = xOffset;
  const startY = 0;

  // Fill interior with floor
  for (let y = 1; y < room.fullHeight - 1; y++) {
    for (let x = 1; x < room.fullWidth - 1; x++) {
      setTile(layout, startX + x, startY + y, TILE_SYMBOLS.FLOOR);
    }
  }

  // Add furniture based on room type
  addRoomFurniture(layout, room, startX, startY);
}

/**
 * Add furniture to a room based on type
 */
function addRoomFurniture(layout: string[][], room: PlacedRoom, startX: number, startY: number): void {
  const innerX = startX + 1;
  const innerY = startY + 1;
  const innerW = room.spec.width;
  const innerH = room.spec.height;

  switch (room.spec.type) {
    case 'bedroom':
      // Bed in corner
      setTile(layout, innerX, innerY, TILE_SYMBOLS.BED);
      if (innerW > 1) setTile(layout, innerX + 1, innerY, TILE_SYMBOLS.BED);
      // Storage
      if (innerW > 2) setTile(layout, innerX + innerW - 1, innerY, TILE_SYMBOLS.STORAGE);
      break;

    case 'kitchen':
      // Counter along top
      for (let x = 0; x < Math.min(innerW, 4); x++) {
        setTile(layout, innerX + x, innerY, TILE_SYMBOLS.COUNTER);
      }
      // Storage
      if (innerH > 2) setTile(layout, innerX, innerY + innerH - 1, TILE_SYMBOLS.STORAGE);
      break;

    case 'storage':
      // Storage along walls
      for (let x = 0; x < innerW; x++) {
        setTile(layout, innerX + x, innerY, TILE_SYMBOLS.STORAGE);
      }
      if (innerH > 2) {
        for (let x = 0; x < innerW; x++) {
          setTile(layout, innerX + x, innerY + innerH - 1, TILE_SYMBOLS.STORAGE);
        }
      }
      break;

    case 'workshop':
      // Workstations
      setTile(layout, innerX, innerY, TILE_SYMBOLS.WORKSTATION);
      if (innerW > 1) setTile(layout, innerX + 1, innerY, TILE_SYMBOLS.WORKSTATION);
      if (innerW > 2) setTile(layout, innerX + 2, innerY, TILE_SYMBOLS.WORKSTATION);
      // Storage
      if (innerW > 3) setTile(layout, innerX + innerW - 1, innerY, TILE_SYMBOLS.STORAGE);
      break;

    case 'dining':
    case 'living':
      // Table in center
      const centerX = innerX + Math.floor(innerW / 2);
      const centerY = innerY + Math.floor(innerH / 2);
      setTile(layout, centerX, centerY, TILE_SYMBOLS.TABLE);
      if (innerW > 2) setTile(layout, centerX - 1, centerY, TILE_SYMBOLS.TABLE);
      if (innerW > 3) setTile(layout, centerX + 1, centerY, TILE_SYMBOLS.TABLE);
      break;

    case 'library':
      // Bookshelves (storage) along sides
      for (let y = 0; y < innerH; y++) {
        setTile(layout, innerX, innerY + y, TILE_SYMBOLS.STORAGE);
      }
      // Table in center
      if (innerW > 3) {
        const cx = innerX + Math.floor(innerW / 2);
        const cy = innerY + Math.floor(innerH / 2);
        setTile(layout, cx, cy, TILE_SYMBOLS.TABLE);
      }
      break;

    case 'hall':
    case 'empty':
      // No furniture
      break;
  }
}

/**
 * Add entrance door on specified side
 */
function addEntrance(layout: string[][], side: string, width: number, height: number): void {
  switch (side) {
    case 'south':
      setTile(layout, Math.floor(width / 2), height - 1, TILE_SYMBOLS.DOOR);
      // Ensure floor in front of door
      setTile(layout, Math.floor(width / 2), height - 2, TILE_SYMBOLS.FLOOR);
      break;
    case 'north':
      setTile(layout, Math.floor(width / 2), 0, TILE_SYMBOLS.DOOR);
      setTile(layout, Math.floor(width / 2), 1, TILE_SYMBOLS.FLOOR);
      break;
    case 'east':
      setTile(layout, width - 1, Math.floor(height / 2), TILE_SYMBOLS.DOOR);
      setTile(layout, width - 2, Math.floor(height / 2), TILE_SYMBOLS.FLOOR);
      break;
    case 'west':
      setTile(layout, 0, Math.floor(height / 2), TILE_SYMBOLS.DOOR);
      setTile(layout, 1, Math.floor(height / 2), TILE_SYMBOLS.FLOOR);
      break;
  }
}

/**
 * Extract functionality from room specs
 */
function extractFunctionality(rooms: RoomSpec[]): VoxelBuildingDefinition['functionality'] {
  const functionality: VoxelBuildingDefinition['functionality'] = [];

  const bedCount = rooms.filter(r => r.type === 'bedroom').length * 2;
  if (bedCount > 0) {
    functionality.push({ type: 'sleeping', params: { beds: bedCount } });
  }

  const hasWorkshop = rooms.some(r => r.type === 'workshop');
  if (hasWorkshop) {
    functionality.push({ type: 'crafting', params: { speed: 1.0 } });
  }

  const storageRooms = rooms.filter(r => r.type === 'storage').length;
  if (storageRooms > 0) {
    functionality.push({ type: 'storage', params: { capacity: storageRooms * 50 } });
  }

  return functionality;
}

// =============================================================================
// QUICK BUILDING GENERATORS
// =============================================================================

/**
 * Generate a simple house
 */
export function simpleHouse(species: BuilderSpecies = 'medium'): VoxelBuildingDefinition {
  return composeFromRooms({
    name: 'Simple House',
    category: 'residential',
    tier: 1,
    species,
    rooms: [
      room('bedroom', 'small'),
      room('living', 'small'),
    ],
    entrance: 'south',
  });
}

/**
 * Generate a cottage with kitchen
 */
export function cottage(species: BuilderSpecies = 'medium'): VoxelBuildingDefinition {
  return composeFromRooms({
    name: 'Cottage',
    category: 'residential',
    tier: 2,
    species,
    rooms: [
      room('bedroom', 'small'),
      room('living', 'medium'),
      room('kitchen', 'small'),
    ],
    entrance: 'south',
  });
}

/**
 * Generate a workshop
 */
export function workshop(species: BuilderSpecies = 'medium'): VoxelBuildingDefinition {
  return composeFromRooms({
    name: 'Workshop',
    category: 'production',
    tier: 2,
    species,
    rooms: [
      room('workshop', 'large'),
      room('storage', 'medium'),
    ],
    entrance: 'south',
  });
}

/**
 * Generate a library
 */
export function library(species: BuilderSpecies = 'medium'): VoxelBuildingDefinition {
  return composeFromRooms({
    name: 'Library',
    category: 'research',
    tier: 3,
    species,
    rooms: [
      room('hall', 'small'),
      room('library', 'large'),
      room('storage', 'small'),
    ],
    entrance: 'south',
  });
}

// =============================================================================
// DEMO / TEST
// =============================================================================

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  ROOM-BASED BUILDING COMPOSER DEMO');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  // Import validator for testing
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { validateBuilding, visualizeBuilding } = require('./validator');

  const buildings = [
    simpleHouse('medium'),
    cottage('small'),
    workshop('medium'),
    library('tall'),
  ];

  for (const building of buildings) {
    console.log(`\n=== ${building.name} (${building.species}) ===\n`);
    console.log(visualizeBuilding(building));

    const result = validateBuilding(building);
    const errors = result.issues.filter((i: { severity: string }) => i.severity === 'error');
    if (errors.length === 0) {
      console.log('✓ VALID');
    } else {
      console.log('✗ ERRORS:');
      errors.forEach((e: { message: string }) => console.log(`  - ${e.message}`));
    }
  }
}
