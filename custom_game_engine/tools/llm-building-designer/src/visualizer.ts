/**
 * LLM Building Designer - Enhanced Visualizer
 *
 * Provides visual representations of buildings that help LLMs
 * understand and reason about the spatial layout.
 */

import {
  VoxelBuildingDefinition,
  BuildingFloor,
  SPECIES_HEIGHT_REQUIREMENTS,
  calculateCeilingComfort,
  TILE_SYMBOLS,
} from './types';
import { validateBuilding } from './validator';

/**
 * Create an ASCII grid visualization with coordinates and annotations.
 */
export function visualizeGrid(building: VoxelBuildingDefinition): string {
  const lines: string[] = [];
  const layout = building.layout;
  const height = layout.length;
  const width = Math.max(...layout.map(row => row.length));

  // Header
  lines.push(`┌─ ${building.name} ─┐`);
  lines.push(`│ ${building.category} | ${width}x${height} tiles`);
  lines.push('└' + '─'.repeat(width + 4) + '┘');
  lines.push('');

  // Column numbers (tens)
  if (width >= 10) {
    let tensRow = '    ';
    for (let x = 0; x < width; x++) {
      tensRow += x >= 10 ? Math.floor(x / 10).toString() : ' ';
    }
    lines.push(tensRow);
  }

  // Column numbers (ones)
  let onesRow = '    ';
  for (let x = 0; x < width; x++) {
    onesRow += (x % 10).toString();
  }
  lines.push(onesRow);

  // Top border
  lines.push('   ┌' + '─'.repeat(width) + '┐');

  // Layout rows with row numbers
  for (let y = 0; y < height; y++) {
    const rowNum = y.toString().padStart(2, ' ');
    const row = layout[y] || '';
    const paddedRow = row.padEnd(width, ' ');
    lines.push(`${rowNum} │${paddedRow}│`);
  }

  // Bottom border
  lines.push('   └' + '─'.repeat(width) + '┘');

  return lines.join('\n');
}

/**
 * Create a detailed analysis view showing what's at each position.
 */
export function visualizeAnalysis(building: VoxelBuildingDefinition): string {
  const result = validateBuilding(building);
  const lines: string[] = [];

  lines.push('═══ BUILDING ANALYSIS ═══');
  lines.push('');
  lines.push(visualizeGrid(building));
  lines.push('');

  // Legend
  lines.push('LEGEND:');
  lines.push('  # = Wall (blocks movement, provides insulation)');
  lines.push('  . = Floor (walkable interior space)');
  lines.push('  D = Door (entrance/exit point)');
  lines.push('  W = Window (in wall, allows light)');
  lines.push('  (space) = Outside/exterior');
  lines.push('');

  // Statistics
  lines.push('STATISTICS:');
  lines.push(`  Dimensions: ${result.dimensions.width} x ${result.dimensions.height}`);
  lines.push(`  Total tiles: ${result.dimensions.width * result.dimensions.height}`);
  lines.push(`  Walls: ${result.tileCounts.walls}`);
  lines.push(`  Floors: ${result.tileCounts.floors}`);
  lines.push(`  Doors: ${result.tileCounts.doors}`);
  lines.push(`  Windows: ${result.tileCounts.windows}`);
  lines.push(`  Rooms detected: ${result.rooms.length}`);
  lines.push('');

  // Entrances
  lines.push('ENTRANCES (doors to exterior):');
  if (result.pathfinding.entrances.length === 0) {
    lines.push('  ⚠ NO ENTRANCES FOUND');
  } else {
    for (const entrance of result.pathfinding.entrances) {
      lines.push(`  Door at (${entrance.x}, ${entrance.y})`);
    }
  }
  lines.push('');

  // Rooms
  lines.push('ROOMS:');
  for (const room of result.rooms) {
    const enclosed = room.isEnclosed ? '✓ enclosed' : '⚠ not enclosed';
    lines.push(`  ${room.id}: ${room.area} tiles (${enclosed})`);
  }
  lines.push('');

  // Pathfinding
  lines.push('PATHFINDING:');
  lines.push(`  Traversable: ${result.pathfinding.isTraversable ? 'Yes ✓' : 'No ✗'}`);
  if (result.pathfinding.deadEnds.length > 0) {
    lines.push(`  Dead ends: ${result.pathfinding.deadEnds.length}`);
  }
  lines.push('');

  // Validation status
  lines.push('VALIDATION:');
  lines.push(`  Status: ${result.isValid ? 'VALID ✓' : 'INVALID ✗'}`);

  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const infos = result.issues.filter(i => i.severity === 'info');

  if (errors.length > 0) {
    lines.push('');
    lines.push('  ERRORS (must fix):');
    for (const issue of errors) {
      lines.push(`    ✗ ${issue.message}`);
      if (issue.location) {
        lines.push(`      at position (${issue.location.x}, ${issue.location.y})`);
      }
      if (issue.suggestion) {
        lines.push(`      → ${issue.suggestion}`);
      }
    }
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('  WARNINGS (should review):');
    for (const issue of warnings) {
      lines.push(`    ⚠ ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`      → ${issue.suggestion}`);
      }
    }
  }

  if (infos.length > 0) {
    lines.push('');
    lines.push('  INFO:');
    for (const issue of infos) {
      lines.push(`    ℹ ${issue.message}`);
    }
  }

  if (result.isValid && errors.length === 0 && warnings.length === 0) {
    lines.push('  No issues found! Building is ready for use.');
  }

  return lines.join('\n');
}

/**
 * Create a "walkthrough" view showing how an agent would navigate.
 */
export function visualizePathfinding(building: VoxelBuildingDefinition): string {
  const result = validateBuilding(building);
  const lines: string[] = [];
  const layout = building.layout;
  const width = Math.max(...layout.map(row => row.length));
  const height = layout.length;

  // Create a mutable grid for annotation
  const grid: string[][] = layout.map(row => {
    const chars = row.split('');
    while (chars.length < width) chars.push(' ');
    return chars;
  });

  // Mark entrances with 'E'
  for (const entrance of result.pathfinding.entrances) {
    if (grid[entrance.y] && grid[entrance.y][entrance.x]) {
      grid[entrance.y][entrance.x] = 'E';
    }
  }

  // Mark dead ends with 'X'
  for (const deadEnd of result.pathfinding.deadEnds) {
    const tile = layout[deadEnd.y]?.[deadEnd.x];
    if (tile === '.' || tile === 'D') {
      grid[deadEnd.y][deadEnd.x] = 'x';
    }
  }

  lines.push('═══ PATHFINDING VIEW ═══');
  lines.push('');
  lines.push('Legend: E=Entrance, x=Dead end, .=Walkable, #=Wall');
  lines.push('');

  // Column numbers
  let colNums = '    ';
  for (let x = 0; x < width; x++) {
    colNums += (x % 10).toString();
  }
  lines.push(colNums);
  lines.push('   ┌' + '─'.repeat(width) + '┐');

  for (let y = 0; y < height; y++) {
    const rowNum = y.toString().padStart(2, ' ');
    lines.push(`${rowNum} │${grid[y].join('')}│`);
  }

  lines.push('   └' + '─'.repeat(width) + '┘');
  lines.push('');

  // Explain the path
  if (result.pathfinding.entrances.length > 0) {
    const entrance = result.pathfinding.entrances[0];
    lines.push(`Agent enters at position (${entrance.x}, ${entrance.y})`);
    lines.push(`Can reach ${result.rooms.reduce((sum, r) => sum + r.area, 0)} walkable tiles`);
  } else {
    lines.push('⚠ No entrance found - agents cannot enter this building!');
  }

  return lines.join('\n');
}

/**
 * Generate a compact summary for quick LLM understanding.
 */
export function summarizeBuilding(building: VoxelBuildingDefinition): string {
  const result = validateBuilding(building);

  return `Building "${building.name}" (${building.category}, tier ${building.tier})
Size: ${result.dimensions.width}x${result.dimensions.height} | Rooms: ${result.rooms.length} | Entrances: ${result.pathfinding.entrances.length}
Materials: ${building.materials.wall} walls, ${building.materials.floor} floors
Status: ${result.isValid ? 'VALID' : 'INVALID - ' + result.issues.filter(i => i.severity === 'error').map(i => i.message).join('; ')}`;
}

// =============================================================================
// MULTI-FLOOR VISUALIZATION (FLOOR SLICER)
// =============================================================================

/**
 * Get all floors from a building definition.
 * Returns ground floor (layout) plus any additional floors.
 */
export function getAllFloors(building: VoxelBuildingDefinition): BuildingFloor[] {
  const floors: BuildingFloor[] = [];

  // Ground floor (from layout)
  floors.push({
    level: 0,
    name: 'Ground Floor',
    layout: building.layout,
    ceilingHeight: getDefaultCeilingHeight(building),
  });

  // Additional floors
  if (building.floors) {
    for (const floor of building.floors) {
      floors.push(floor);
    }
  }

  // Sort by level
  return floors.sort((a, b) => a.level - b.level);
}

/**
 * Get default ceiling height based on species.
 */
function getDefaultCeilingHeight(building: VoxelBuildingDefinition): number {
  if (building.species && building.species !== 'custom') {
    return SPECIES_HEIGHT_REQUIREMENTS[building.species].comfortableCeiling;
  }
  return SPECIES_HEIGHT_REQUIREMENTS['medium'].comfortableCeiling; // Default to human height
}

/**
 * Visualize a single floor of a multi-story building.
 * The "floor slicer" - shows one horizontal slice.
 */
export function visualizeFloor(
  building: VoxelBuildingDefinition,
  floorLevel: number
): string {
  const lines: string[] = [];
  const floors = getAllFloors(building);
  const floor = floors.find(f => f.level === floorLevel);

  if (!floor) {
    return `ERROR: Floor ${floorLevel} not found. Building has ${floors.length} floor(s).`;
  }

  const layout = floor.layout;
  const height = layout.length;
  const width = Math.max(...layout.map(row => row.length));
  const ceilingHeight = floor.ceilingHeight || getDefaultCeilingHeight(building);

  // Header
  lines.push('╔' + '═'.repeat(width + 6) + '╗');
  lines.push(`║ FLOOR ${floorLevel}: ${floor.name || `Level ${floorLevel}`}`.padEnd(width + 7) + '║');
  lines.push(`║ Ceiling: ${ceilingHeight} voxels`.padEnd(width + 7) + '║');
  lines.push('╠' + '═'.repeat(width + 6) + '╣');

  // Column numbers
  let colNums = '    ';
  for (let x = 0; x < width; x++) {
    colNums += (x % 10).toString();
  }
  lines.push(`║ ${colNums}`.padEnd(width + 7) + '║');
  lines.push(`║    ┌${'─'.repeat(width)}┐`.padEnd(width + 7) + '║');

  // Layout rows
  for (let y = 0; y < height; y++) {
    const rowNum = y.toString().padStart(2, ' ');
    const row = layout[y] || '';
    const paddedRow = row.padEnd(width, ' ');
    lines.push(`║ ${rowNum} │${paddedRow}│`.padEnd(width + 7) + '║');
  }

  lines.push(`║    └${'─'.repeat(width)}┘`.padEnd(width + 7) + '║');

  // Stair connections
  const stairsUp = findTiles(layout, [TILE_SYMBOLS.STAIRS_UP, TILE_SYMBOLS.STAIRS_BOTH, 'X']);
  const stairsDown = findTiles(layout, [TILE_SYMBOLS.STAIRS_DOWN, TILE_SYMBOLS.STAIRS_BOTH, 'X']);

  if (stairsUp.length > 0 || stairsDown.length > 0) {
    lines.push('║'.padEnd(width + 7) + '║');
    lines.push('║ VERTICAL CONNECTIONS:'.padEnd(width + 7) + '║');
    for (const pos of stairsUp) {
      lines.push(`║   ↑ Stairs UP at (${pos.x}, ${pos.y}) → Floor ${floorLevel + 1}`.padEnd(width + 7) + '║');
    }
    for (const pos of stairsDown) {
      lines.push(`║   ↓ Stairs DOWN at (${pos.x}, ${pos.y}) → Floor ${floorLevel - 1}`.padEnd(width + 7) + '║');
    }
  }

  lines.push('╚' + '═'.repeat(width + 6) + '╝');

  return lines.join('\n');
}

/**
 * Find all positions of specific tile symbols.
 */
function findTiles(layout: string[], symbols: string[]): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < layout.length; y++) {
    for (let x = 0; x < layout[y].length; x++) {
      if (symbols.includes(layout[y][x])) {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

/**
 * Visualize ALL floors of a building stacked vertically.
 * Shows a cross-section view.
 */
export function visualizeAllFloors(building: VoxelBuildingDefinition): string {
  const lines: string[] = [];
  const floors = getAllFloors(building);
  const totalFloors = floors.length;

  lines.push('╔═══════════════════════════════════════════════════╗');
  lines.push(`║ ${building.name} - FLOOR PLAN OVERVIEW`.padEnd(51) + '║');
  lines.push(`║ ${totalFloors} Floor(s) | Species: ${building.species || 'medium (default)'}`.padEnd(51) + '║');
  lines.push('╚═══════════════════════════════════════════════════╝');
  lines.push('');

  // Show floors from top to bottom (like looking at a building)
  for (let i = totalFloors - 1; i >= 0; i--) {
    const floor = floors[i];
    lines.push(visualizeFloor(building, floor.level));
    if (i > 0) {
      lines.push('        │ (vertical connection) │');
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Visualize a vertical cross-section (slice through the building).
 * Shows how floors connect via stairs.
 */
export function visualizeCrossSection(
  building: VoxelBuildingDefinition,
  atX: number
): string {
  const lines: string[] = [];
  const floors = getAllFloors(building);

  lines.push(`═══ VERTICAL CROSS-SECTION at X=${atX} ═══`);
  lines.push('');

  // Build the cross-section from top floor to bottom
  for (let floorIdx = floors.length - 1; floorIdx >= 0; floorIdx--) {
    const floor = floors[floorIdx];
    const ceilingHeight = floor.ceilingHeight || getDefaultCeilingHeight(building);

    lines.push(`─── Floor ${floor.level}: ${floor.name || ''} (${ceilingHeight}v ceiling) ───`);

    // Show a slice of this floor
    for (let y = 0; y < floor.layout.length; y++) {
      const tile = floor.layout[y]?.[atX] || ' ';
      const leftTile = floor.layout[y]?.[atX - 1] || ' ';
      const rightTile = floor.layout[y]?.[atX + 1] || ' ';

      let row = `  y${y.toString().padStart(2, '0')}: `;
      row += `[${leftTile}${tile}${rightTile}]`;

      // Annotate special tiles
      if (tile === TILE_SYMBOLS.STAIRS_UP || tile === 'X') {
        row += ' ← stairs ↑';
      } else if (tile === TILE_SYMBOLS.STAIRS_DOWN || tile === 'v') {
        row += ' ← stairs ↓';
      } else if (tile === TILE_SYMBOLS.VOID || tile === 'O') {
        row += ' ← open to below';
      }

      lines.push(row);
    }

    if (floorIdx > 0) {
      // Show floor/ceiling between levels
      lines.push('  ════════════════════');
    }
  }

  lines.push('');
  lines.push('Legend: # wall, . floor, ^ stairs up, v stairs down, X stairwell, O void');

  return lines.join('\n');
}

/**
 * Show ceiling comfort analysis for a building.
 */
export function visualizeCeilingComfort(
  building: VoxelBuildingDefinition,
  creatureHeight?: number
): string {
  const lines: string[] = [];
  const floors = getAllFloors(building);

  // Determine creature height
  let height: number;
  if (creatureHeight) {
    height = creatureHeight;
  } else if (building.species && building.species !== 'custom') {
    height = SPECIES_HEIGHT_REQUIREMENTS[building.species].standingHeight;
  } else {
    height = SPECIES_HEIGHT_REQUIREMENTS['medium'].standingHeight;
  }

  lines.push('═══ CEILING COMFORT ANALYSIS ═══');
  lines.push(`Creature height: ${height} voxels`);
  lines.push('');

  for (const floor of floors) {
    const ceilingHeight = floor.ceilingHeight || getDefaultCeilingHeight(building);
    const comfort = calculateCeilingComfort(height, ceilingHeight);

    const emoji = {
      cramped: '😰',
      snug: '😐',
      comfortable: '😊',
      airy: '😄',
      cavernous: '🏛️',
    }[comfort.level];

    lines.push(`Floor ${floor.level}: ${floor.name || ''}`);
    lines.push(`  Ceiling: ${ceilingHeight} voxels | Ratio: ${(ceilingHeight / height).toFixed(1)}x creature height`);
    lines.push(`  ${emoji} ${comfort.level.toUpperCase()}: ${comfort.description}`);
    lines.push(`  Mood modifier: ${comfort.moodModifier >= 0 ? '+' : ''}${comfort.moodModifier}`);
    lines.push('');
  }

  return lines.join('\n');
}
