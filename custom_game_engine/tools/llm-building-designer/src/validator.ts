/**
 * LLM Building Designer - Validation Module
 *
 * Validates building designs for structural integrity, pathfinding,
 * and other issues before integration into the game.
 */

import {
  VoxelBuildingDefinition,
  ValidationResult,
  ValidationIssue,
  Room,
  TILE_SYMBOLS,
  MATERIAL_PROPERTIES,
} from './types';

// =============================================================================
// HELPER TYPES
// =============================================================================

interface Position {
  x: number;
  y: number;
}

interface ParsedLayout {
  width: number;
  height: number;
  tiles: string[][];
}

// =============================================================================
// LAYOUT PARSING
// =============================================================================

/**
 * Parse a layout string array into a 2D tile grid.
 */
function parseLayout(layout: string[]): ParsedLayout {
  if (layout.length === 0) {
    throw new Error('Layout cannot be empty');
  }

  const height = layout.length;
  const width = Math.max(...layout.map(row => row.length));

  // Normalize all rows to same width
  const tiles: string[][] = layout.map(row => {
    const chars = row.split('');
    while (chars.length < width) {
      chars.push(' ');
    }
    return chars;
  });

  return { width, height, tiles };
}

/**
 * Get tile at position, returning ' ' for out of bounds.
 */
function getTile(tiles: string[][], x: number, y: number): string {
  if (y < 0 || y >= tiles.length) return ' ';
  if (x < 0 || x >= tiles[y].length) return ' ';
  return tiles[y][x];
}

/**
 * Check if a tile is walkable (floor or door).
 */
function isWalkable(tile: string): boolean {
  return tile === TILE_SYMBOLS.FLOOR ||
         tile === TILE_SYMBOLS.DOOR ||
         tile === TILE_SYMBOLS.ENTRANCE;
}

/**
 * Check if a tile is a wall or structural blocking element.
 */
function isBlocking(tile: string): boolean {
  return tile === TILE_SYMBOLS.WALL ||
         tile === TILE_SYMBOLS.WINDOW ||
         tile === TILE_SYMBOLS.PILLAR;
}

/**
 * Check if a tile is a structural wall (for floating wall detection).
 */
function isStructuralWall(tile: string): boolean {
  return tile === TILE_SYMBOLS.WALL;
}

/**
 * Check if a tile is a door/entrance.
 */
function isDoor(tile: string): boolean {
  return tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.ENTRANCE;
}

/**
 * Check if a tile is exterior (empty space).
 */
function isExterior(tile: string): boolean {
  return tile === TILE_SYMBOLS.EMPTY || tile === ' ';
}

// =============================================================================
// FLOOD FILL FOR ROOM DETECTION
// =============================================================================

/**
 * Flood fill from a starting position to find all connected floor tiles.
 * Returns the set of tiles that form a room.
 */
function floodFillRoom(
  tiles: string[][],
  startX: number,
  startY: number,
  visited: Set<string>
): Position[] {
  const roomTiles: Position[] = [];
  const queue: Position[] = [{ x: startX, y: startY }];
  const key = (x: number, y: number) => `${x},${y}`;

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const posKey = key(pos.x, pos.y);

    if (visited.has(posKey)) continue;
    visited.add(posKey);

    const tile = getTile(tiles, pos.x, pos.y);

    // Stop at walls, windows, exterior
    if (isBlocking(tile) || isExterior(tile)) continue;

    // Include this tile in the room
    roomTiles.push(pos);

    // Expand to 4-neighbors
    const neighbors: Position[] = [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ];

    for (const neighbor of neighbors) {
      if (!visited.has(key(neighbor.x, neighbor.y))) {
        queue.push(neighbor);
      }
    }
  }

  return roomTiles;
}

/**
 * Detect all rooms in the building using flood fill.
 */
function detectRooms(tiles: string[][], width: number, height: number): Room[] {
  const rooms: Room[] = [];
  const visited = new Set<string>();
  let roomId = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(tiles, x, y);
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (!isWalkable(tile)) continue;

      // Found unvisited walkable tile - start a new room
      const roomTiles = floodFillRoom(tiles, x, y, visited);

      if (roomTiles.length > 0) {
        const room: Room = {
          id: `room_${roomId++}`,
          tiles: roomTiles,
          area: roomTiles.length,
          isEnclosed: checkRoomEnclosure(tiles, roomTiles),
        };
        rooms.push(room);
      }
    }
  }

  return rooms;
}

/**
 * Check if a room is fully enclosed by walls/doors.
 */
function checkRoomEnclosure(tiles: string[][], roomTiles: Position[]): boolean {
  for (const tile of roomTiles) {
    // Check all 4 neighbors
    const neighbors: Position[] = [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 },
    ];

    for (const neighbor of neighbors) {
      const neighborTile = getTile(tiles, neighbor.x, neighbor.y);

      // If neighbor is exterior space, room is not enclosed
      if (isExterior(neighborTile)) {
        return false;
      }
    }
  }

  return true;
}

// =============================================================================
// ENTRANCE DETECTION
// =============================================================================

/**
 * Find all doors that connect to the exterior.
 */
function findEntrances(tiles: string[][], width: number, height: number): Position[] {
  const entrances: Position[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(tiles, x, y);

      if (!isDoor(tile)) continue;

      // Check if this door has an exterior neighbor
      const neighbors: Position[] = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];

      const hasExteriorNeighbor = neighbors.some(n =>
        isExterior(getTile(tiles, n.x, n.y))
      );

      if (hasExteriorNeighbor) {
        entrances.push({ x, y });
      }
    }
  }

  return entrances;
}

// =============================================================================
// PATHFINDING VALIDATION
// =============================================================================

/**
 * Check if all rooms are reachable from an entrance.
 */
function checkPathfinding(
  tiles: string[][],
  entrances: Position[],
  rooms: Room[]
): { isTraversable: boolean; unreachableRooms: Room[]; deadEnds: Position[] } {
  if (entrances.length === 0) {
    return {
      isTraversable: false,
      unreachableRooms: rooms,
      deadEnds: [],
    };
  }

  // Do a flood fill from the first entrance to find all reachable tiles
  const reachable = new Set<string>();
  const queue: Position[] = [...entrances];
  const key = (x: number, y: number) => `${x},${y}`;

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const posKey = key(pos.x, pos.y);

    if (reachable.has(posKey)) continue;
    reachable.add(posKey);

    const tile = getTile(tiles, pos.x, pos.y);

    // Can only walk through walkable tiles
    if (!isWalkable(tile)) continue;

    // Expand to 4-neighbors
    const neighbors: Position[] = [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ];

    for (const neighbor of neighbors) {
      if (!reachable.has(key(neighbor.x, neighbor.y))) {
        queue.push(neighbor);
      }
    }
  }

  // Check which rooms are unreachable
  const unreachableRooms = rooms.filter(room => {
    return !room.tiles.some(tile => reachable.has(key(tile.x, tile.y)));
  });

  // Find dead ends (walkable tiles with only one exit)
  const deadEnds: Position[] = [];
  for (const posKey of reachable) {
    const [x, y] = posKey.split(',').map(Number);
    const tile = getTile(tiles, x, y);

    if (!isWalkable(tile)) continue;

    // Count walkable neighbors
    const neighbors: Position[] = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];

    const walkableNeighbors = neighbors.filter(n =>
      isWalkable(getTile(tiles, n.x, n.y))
    );

    if (walkableNeighbors.length === 1) {
      deadEnds.push({ x, y });
    }
  }

  return {
    isTraversable: unreachableRooms.length === 0,
    unreachableRooms,
    deadEnds,
  };
}

// =============================================================================
// HOLE DETECTION
// =============================================================================

/**
 * Find holes in walls - places where a wall segment is missing
 * and should logically be there.
 */
function findWallHoles(tiles: string[][], width: number, height: number): Position[] {
  const holes: Position[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(tiles, x, y);

      // Only check floor tiles that might be holes
      if (tile !== TILE_SYMBOLS.FLOOR) continue;

      // Check if this floor tile breaks a wall line
      // A hole is when we have: wall - floor - wall in a line

      // Horizontal check (wall on left AND right)
      const left = getTile(tiles, x - 1, y);
      const right = getTile(tiles, x + 1, y);
      if (isBlocking(left) && isBlocking(right)) {
        // Check if this floor tile has exterior above or below
        const above = getTile(tiles, x, y - 1);
        const below = getTile(tiles, x, y + 1);
        if (isExterior(above) || isExterior(below)) {
          holes.push({ x, y });
          continue;
        }
      }

      // Vertical check (wall above AND below)
      const above = getTile(tiles, x, y - 1);
      const below = getTile(tiles, x, y + 1);
      if (isBlocking(above) && isBlocking(below)) {
        // Check if this floor tile has exterior left or right
        if (isExterior(left) || isExterior(right)) {
          holes.push({ x, y });
          continue;
        }
      }
    }
  }

  return holes;
}

/**
 * Find floating wall segments not connected to the main structure.
 * Only checks structural walls (#), not furniture (C, T, B, S, K).
 */
function findFloatingWalls(tiles: string[][], width: number, height: number): Position[] {
  // First, find all STRUCTURAL wall tiles (not furniture)
  const wallTiles: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isStructuralWall(getTile(tiles, x, y))) {
        wallTiles.push({ x, y });
      }
    }
  }

  if (wallTiles.length === 0) return [];

  // Find exterior walls (walls adjacent to exterior space)
  // These are the "anchor" walls that define the building perimeter
  const exteriorWalls: Position[] = [];
  for (const wall of wallTiles) {
    const neighbors = [
      { x: wall.x + 1, y: wall.y },
      { x: wall.x - 1, y: wall.y },
      { x: wall.x, y: wall.y + 1 },
      { x: wall.x, y: wall.y - 1 },
    ];
    const hasExterior = neighbors.some(n => isExterior(getTile(tiles, n.x, n.y)));
    if (hasExterior) {
      exteriorWalls.push(wall);
    }
  }

  // If no exterior walls found, use first wall as anchor
  if (exteriorWalls.length === 0 && wallTiles.length > 0) {
    exteriorWalls.push(wallTiles[0]);
  }

  // Flood fill from exterior walls to find all connected structural walls
  const connected = new Set<string>();
  const queue: Position[] = [...exteriorWalls];
  const key = (x: number, y: number) => `${x},${y}`;

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const posKey = key(pos.x, pos.y);

    if (connected.has(posKey)) continue;
    connected.add(posKey);

    // Expand to 8-neighbors (walls can connect diagonally)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (isStructuralWall(getTile(tiles, nx, ny)) && !connected.has(key(nx, ny))) {
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  // Any walls not in 'connected' are floating (interior walls not touching perimeter)
  return wallTiles.filter(wall => !connected.has(key(wall.x, wall.y)));
}

// =============================================================================
// DOOR VALIDATION
// =============================================================================

/**
 * Check for doors that lead to invalid locations.
 */
function findInvalidDoors(tiles: string[][], width: number, height: number): Position[] {
  const invalidDoors: Position[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(tiles, x, y);
      if (!isDoor(tile)) continue;

      // A valid door should have walkable or exterior on opposite sides
      // and walls on the other two sides

      const above = getTile(tiles, x, y - 1);
      const below = getTile(tiles, x, y + 1);
      const left = getTile(tiles, x - 1, y);
      const right = getTile(tiles, x + 1, y);

      // Check horizontal door (walls above/below, walkable left/right)
      const isHorizontalDoor =
        (isBlocking(above) || isExterior(above)) &&
        (isBlocking(below) || isExterior(below)) &&
        (isWalkable(left) || isExterior(left)) &&
        (isWalkable(right) || isExterior(right));

      // Check vertical door (walls left/right, walkable above/below)
      const isVerticalDoor =
        (isBlocking(left) || isExterior(left)) &&
        (isBlocking(right) || isExterior(right)) &&
        (isWalkable(above) || isExterior(above)) &&
        (isWalkable(below) || isExterior(below));

      if (!isHorizontalDoor && !isVerticalDoor) {
        // Door placement doesn't make sense
        invalidDoors.push({ x, y });
      }
    }
  }

  return invalidDoors;
}

// =============================================================================
// WINDOW VALIDATION
// =============================================================================

/**
 * Check if windows are properly placed in wall lines.
 */
function findInvalidWindows(tiles: string[][], width: number, height: number): Position[] {
  const invalidWindows: Position[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(tiles, x, y);
      if (tile !== TILE_SYMBOLS.WINDOW) continue;

      const above = getTile(tiles, x, y - 1);
      const below = getTile(tiles, x, y + 1);
      const left = getTile(tiles, x - 1, y);
      const right = getTile(tiles, x + 1, y);

      // Window should have walls or other windows on at least one axis
      const hasHorizontalWalls =
        (isBlocking(above) || above === TILE_SYMBOLS.WINDOW) &&
        (isBlocking(below) || below === TILE_SYMBOLS.WINDOW);

      const hasVerticalWalls =
        (isBlocking(left) || left === TILE_SYMBOLS.WINDOW) &&
        (isBlocking(right) || right === TILE_SYMBOLS.WINDOW);

      // Window should be part of a wall line
      if (!hasHorizontalWalls && !hasVerticalWalls) {
        invalidWindows.push({ x, y });
      }
    }
  }

  return invalidWindows;
}

/**
 * Check if a room has any windows in its walls.
 */
function checkRoomHasWindow(tiles: string[][], room: Room): boolean {
  // Check all tiles adjacent to the room
  for (const tile of room.tiles) {
    const neighbors: Position[] = [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 },
    ];

    for (const neighbor of neighbors) {
      if (getTile(tiles, neighbor.x, neighbor.y) === TILE_SYMBOLS.WINDOW) {
        return true;
      }
    }
  }

  return false;
}

// =============================================================================
// RESOURCE COST CALCULATION
// =============================================================================

/**
 * Calculate resource costs based on tile counts and materials.
 */
function calculateResourceCost(
  tiles: string[][],
  width: number,
  height: number,
  materials: VoxelBuildingDefinition['materials']
): Record<string, number> {
  const costs: Record<string, number> = {};

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(tiles, x, y);

      if (tile === TILE_SYMBOLS.WALL) {
        const material = materials.wall;
        const props = MATERIAL_PROPERTIES[material];
        // Default cost for exotic materials is 10
        costs[material] = (costs[material] || 0) + (props?.resourceCost ?? 10);
      } else if (tile === TILE_SYMBOLS.FLOOR) {
        const material = materials.floor;
        costs[material] = (costs[material] || 0) + 1;
      } else if (isDoor(tile)) {
        const material = materials.door;
        costs[material] = (costs[material] || 0) + 2; // Doors cost more
      } else if (tile === TILE_SYMBOLS.WINDOW) {
        costs['glass'] = (costs['glass'] || 0) + 2;
      }
    }
  }

  return costs;
}

// =============================================================================
// TILE COUNTING
// =============================================================================

function countTiles(tiles: string[][], width: number, height: number): ValidationResult['tileCounts'] {
  let walls = 0;
  let floors = 0;
  let doors = 0;
  let windows = 0;
  let empty = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = getTile(tiles, x, y);
      switch (tile) {
        case TILE_SYMBOLS.WALL:
        case TILE_SYMBOLS.PILLAR:
          walls++;
          break;
        case TILE_SYMBOLS.FLOOR:
          floors++;
          break;
        case TILE_SYMBOLS.DOOR:
        case TILE_SYMBOLS.ENTRANCE:
          doors++;
          break;
        case TILE_SYMBOLS.WINDOW:
          windows++;
          break;
        default:
          empty++;
      }
    }
  }

  return { walls, floors, doors, windows, empty };
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate a building definition and return detailed results.
 */
export function validateBuilding(building: VoxelBuildingDefinition): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Parse layout
  let parsed: ParsedLayout;
  try {
    parsed = parseLayout(building.layout);
  } catch (error) {
    return {
      isValid: false,
      issues: [{
        type: 'structural_issue',
        severity: 'error',
        message: `Failed to parse layout: ${error}`,
      }],
      rooms: [],
      dimensions: { width: 0, height: 0 },
      tileCounts: { walls: 0, floors: 0, doors: 0, windows: 0, empty: 0 },
      resourceCost: {},
      pathfinding: { isTraversable: false, entrances: [], deadEnds: [] },
    };
  }

  const { width, height, tiles } = parsed;

  // Detect rooms
  const rooms = detectRooms(tiles, width, height);

  // Find entrances
  const entrances = findEntrances(tiles, width, height);

  // Check for no entrance
  if (entrances.length === 0) {
    issues.push({
      type: 'no_entrance',
      severity: 'error',
      message: 'Building has no entrance (door connecting to exterior)',
      suggestion: 'Add a door (D) on the exterior wall',
    });
  }

  // Check pathfinding
  const pathfinding = checkPathfinding(tiles, entrances, rooms);

  if (!pathfinding.isTraversable) {
    for (const room of pathfinding.unreachableRooms) {
      issues.push({
        type: 'unreachable_room',
        severity: 'error',
        message: `Room ${room.id} (${room.area} tiles) cannot be reached from any entrance`,
        location: room.tiles[0],
        suggestion: 'Add a door connecting this room to the rest of the building',
      });
    }
  }

  // Check for holes in walls
  const holes = findWallHoles(tiles, width, height);
  for (const hole of holes) {
    issues.push({
      type: 'hole_in_wall',
      severity: 'warning',
      message: `Possible hole in wall at (${hole.x}, ${hole.y})`,
      location: hole,
      suggestion: 'Replace with wall (#) or add a door (D)',
    });
  }

  // Check for floating walls
  const floatingWalls = findFloatingWalls(tiles, width, height);
  for (const wall of floatingWalls) {
    issues.push({
      type: 'floating_wall',
      severity: 'warning',
      message: `Floating wall segment at (${wall.x}, ${wall.y}) not connected to main structure`,
      location: wall,
      suggestion: 'Connect to main structure or remove',
    });
  }

  // Check for invalid doors
  const invalidDoors = findInvalidDoors(tiles, width, height);
  for (const door of invalidDoors) {
    issues.push({
      type: 'door_to_nowhere',
      severity: 'error',
      message: `Door at (${door.x}, ${door.y}) is not properly placed between walls`,
      location: door,
      suggestion: 'Doors should have walls on two opposite sides',
    });
  }

  // Check for invalid windows (windows should be in wall lines)
  const invalidWindows = findInvalidWindows(tiles, width, height);
  for (const window of invalidWindows) {
    issues.push({
      type: 'structural_issue',
      severity: 'warning',
      message: `Window at (${window.x}, ${window.y}) is not placed in a wall line`,
      location: window,
      suggestion: 'Windows should replace wall segments, not standalone',
    });
  }

  // Check for rooms without windows (optional info)
  for (const room of rooms) {
    const hasWindow = checkRoomHasWindow(tiles, room);
    if (!hasWindow && room.area >= 9) {
      issues.push({
        type: 'structural_issue',
        severity: 'info',
        message: `Room ${room.id} has no windows (${room.area} tiles)`,
        location: room.tiles[0],
        suggestion: 'Consider adding windows (W) for light and aesthetics',
      });
    }
  }

  // Check room sizes
  for (const room of rooms) {
    if (room.area < 4) {
      issues.push({
        type: 'room_too_small',
        severity: 'warning',
        message: `Room ${room.id} is very small (${room.area} tiles)`,
        location: room.tiles[0],
        suggestion: 'Consider expanding or removing this room',
      });
    }

    if (room.area > 400) {
      issues.push({
        type: 'room_too_large',
        severity: 'info',
        message: `Room ${room.id} is very large (${room.area} tiles)`,
        location: room.tiles[0],
      });
    }

    if (!room.isEnclosed) {
      issues.push({
        type: 'structural_issue',
        severity: 'warning',
        message: `Room ${room.id} is not fully enclosed`,
        location: room.tiles[0],
        suggestion: 'Add walls or doors to fully enclose the room',
      });
    }
  }

  // Check for dead ends
  for (const deadEnd of pathfinding.deadEnds) {
    // Only warn about dead ends that aren't doors (doors are expected dead ends)
    const tile = getTile(tiles, deadEnd.x, deadEnd.y);
    if (!isDoor(tile)) {
      issues.push({
        type: 'pathfinding_blocked',
        severity: 'info',
        message: `Dead end at (${deadEnd.x}, ${deadEnd.y})`,
        location: deadEnd,
      });
    }
  }

  // Calculate resource costs
  const resourceCost = calculateResourceCost(tiles, width, height, building.materials);

  // Count tiles
  const tileCounts = countTiles(tiles, width, height);

  // Determine if valid (no errors)
  const isValid = !issues.some(issue => issue.severity === 'error');

  return {
    isValid,
    issues,
    rooms,
    dimensions: { width, height },
    tileCounts,
    resourceCost,
    pathfinding: {
      isTraversable: pathfinding.isTraversable,
      entrances,
      deadEnds: pathfinding.deadEnds,
    },
  };
}

/**
 * Quick validation check - returns true if building is valid, false otherwise.
 */
export function isValidBuilding(building: VoxelBuildingDefinition): boolean {
  return validateBuilding(building).isValid;
}

/**
 * Format validation result as a human-readable string.
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('=== Building Validation Report ===');
  lines.push(`Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
  lines.push(`Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
  lines.push(`Rooms: ${result.rooms.length}`);
  lines.push('');

  lines.push('Tile Counts:');
  lines.push(`  Walls: ${result.tileCounts.walls}`);
  lines.push(`  Floors: ${result.tileCounts.floors}`);
  lines.push(`  Doors: ${result.tileCounts.doors}`);
  lines.push(`  Windows: ${result.tileCounts.windows}`);
  lines.push('');

  lines.push('Resource Cost:');
  for (const [material, count] of Object.entries(result.resourceCost)) {
    lines.push(`  ${material}: ${count}`);
  }
  lines.push('');

  lines.push('Pathfinding:');
  lines.push(`  Traversable: ${result.pathfinding.isTraversable ? 'Yes' : 'No'}`);
  lines.push(`  Entrances: ${result.pathfinding.entrances.length}`);
  lines.push(`  Dead Ends: ${result.pathfinding.deadEnds.length}`);
  lines.push('');

  if (result.issues.length > 0) {
    lines.push('Issues:');
    for (const issue of result.issues) {
      const prefix = issue.severity === 'error' ? '[ERROR]' :
                     issue.severity === 'warning' ? '[WARN]' : '[INFO]';
      lines.push(`  ${prefix} ${issue.message}`);
      if (issue.location) {
        lines.push(`         at (${issue.location.x}, ${issue.location.y})`);
      }
      if (issue.suggestion) {
        lines.push(`         Suggestion: ${issue.suggestion}`);
      }
    }
  } else {
    lines.push('No issues found.');
  }

  return lines.join('\n');
}

/**
 * Visualize a building layout with annotations.
 */
export function visualizeBuilding(building: VoxelBuildingDefinition): string {
  const lines: string[] = [];

  lines.push(`Building: ${building.name}`);
  lines.push(`Category: ${building.category}`);
  lines.push(`Materials: wall=${building.materials.wall}, floor=${building.materials.floor}, door=${building.materials.door}`);
  lines.push('');

  // Add coordinate header
  const maxWidth = Math.max(...building.layout.map(row => row.length));
  const headerRow = '  ' + Array.from({ length: maxWidth }, (_, i) => i % 10).join('');
  lines.push(headerRow);

  // Add each row with line number
  for (let y = 0; y < building.layout.length; y++) {
    const rowNum = (y % 10).toString().padStart(2, ' ');
    lines.push(`${rowNum}${building.layout[y]}`);
  }

  lines.push('');
  lines.push('Legend:');
  lines.push('  # = Wall    . = Floor   D = Door');
  lines.push('  W = Window  E = Entrance  (space) = Outside');

  return lines.join('\n');
}
