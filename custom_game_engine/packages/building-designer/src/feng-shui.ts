/**
 * Feng Shui Analysis & Room Evolution
 *
 * Implements full Feng Shui evaluation for buildings:
 * - Chi (energy) flow analysis
 * - Sha Qi detection (killing breath - straight lines)
 * - Room proportions (golden ratio ideals)
 * - Commanding position for beds/desks
 * - Five elements balance
 * - Room evolution for optimal harmony
 */

import {
  VoxelBuildingDefinition,
  FengShuiAnalysis,
  FENG_SHUI_ELEMENTS,
  TILE_SYMBOLS,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const GOLDEN_RATIO = 1.618;
const IDEAL_PROPORTION_TOLERANCE = 0.3; // 30% deviation from golden ratio is OK

// Element cycle (controlling/destructive cycle)
// Also: generating cycle is wood->fire->earth->metal->water->wood
export const ELEMENT_CONTROLS: Record<string, string> = {
  wood: 'earth',  // Wood parts Earth (roots)
  earth: 'water', // Earth dams Water
  water: 'fire',  // Water extinguishes Fire
  fire: 'metal',  // Fire melts Metal
  metal: 'wood',  // Metal chops Wood
};

// =============================================================================
// MAIN ANALYZER
// =============================================================================

/**
 * Perform complete Feng Shui analysis on a building.
 */
export function analyzeFengShui(building: VoxelBuildingDefinition): FengShuiAnalysis {
  const layout = parseLayout(building.layout);
  const issues: FengShuiAnalysis['issues'] = [];

  // 1. Chi Flow Analysis
  const chiFlow = analyzeChiFlow(layout, issues);

  // 2. Room Proportions
  const proportions = analyzeProportions(building, issues);

  // 3. Commanding Positions
  const commandingPositions = analyzeCommandingPositions(layout, issues);

  // 4. Element Balance
  const elementBalance = analyzeElementBalance(building, layout, issues);

  // Calculate overall harmony score
  const harmonyScore = calculateHarmonyScore(chiFlow, proportions, commandingPositions, elementBalance, issues);

  return {
    harmonyScore,
    chiFlow,
    proportions,
    commandingPositions,
    elementBalance,
    issues,
  };
}

// =============================================================================
// CHI FLOW ANALYSIS
// =============================================================================

interface ParsedLayout {
  width: number;
  height: number;
  tiles: string[][];
  entrance: { x: number; y: number } | null;
}

function parseLayout(layout: string[]): ParsedLayout {
  const height = layout.length;
  const width = Math.max(...layout.map(row => row.length));
  const tiles: string[][] = layout.map(row => {
    const chars = row.split('');
    while (chars.length < width) chars.push(' ');
    return chars;
  });

  // Find entrance
  let entrance: { x: number; y: number } | null = null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y]?.[x] || ' ';
      if (tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.ENTRANCE) {
        // Check if it's on an edge (exterior door)
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          entrance = { x, y };
          break;
        }
      }
    }
    if (entrance) break;
  }

  return { width, height, tiles, entrance };
}

function analyzeChiFlow(
  layout: ParsedLayout,
  issues: FengShuiAnalysis['issues']
): FengShuiAnalysis['chiFlow'] {
  const stagnantAreas: Array<{ x: number; y: number }> = [];
  let hasShaQi = false;

  if (!layout.entrance) {
    issues.push({
      principle: 'Chi Flow',
      issue: 'No entrance found - chi cannot enter',
      suggestion: 'Add a door to allow energy flow',
    });
    return { hasGoodFlow: false, stagnantAreas: [], hasShaQi: false };
  }

  // Check for Sha Qi (straight lines from entrance)
  hasShaQi = checkShaQi(layout);
  if (hasShaQi) {
    issues.push({
      principle: 'Sha Qi',
      issue: 'Straight line from entrance to opposite opening',
      suggestion: 'Add furniture or offset doors to slow chi flow',
      location: layout.entrance,
    });
  }

  // Find stagnant areas (dead ends, corners with no flow)
  const visited = new Set<string>();
  const flowStrength = new Map<string, number>();

  // BFS from entrance to measure flow
  const queue: Array<{ x: number; y: number; strength: number }> = [
    { ...layout.entrance, strength: 100 },
  ];

  while (queue.length > 0) {
    const { x, y, strength } = queue.shift()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    flowStrength.set(key, strength);

    // Spread to neighbors with reduced strength
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const n of neighbors) {
      if (n.x < 0 || n.x >= layout.width || n.y < 0 || n.y >= layout.height) continue;
      const tile = layout.tiles[n.y]?.[n.x] || ' ';
      if (isWalkable(tile) && !visited.has(`${n.x},${n.y}`)) {
        queue.push({ x: n.x, y: n.y, strength: strength * 0.9 });
      }
    }
  }

  // Find areas with very low flow (stagnant)
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const tile = layout.tiles[y]?.[x] || ' ';
      if (isWalkable(tile)) {
        const flow = flowStrength.get(`${x},${y}`) || 0;
        if (flow < 30 && flow > 0) {
          stagnantAreas.push({ x, y });
        }
      }
    }
  }

  if (stagnantAreas.length > 0) {
    issues.push({
      principle: 'Chi Flow',
      issue: `${stagnantAreas.length} stagnant areas where chi doesn't flow well`,
      suggestion: 'Add openings or remove obstacles to improve circulation',
    });
  }

  const hasGoodFlow = stagnantAreas.length < 3 && !hasShaQi;

  return { hasGoodFlow, stagnantAreas, hasShaQi };
}

function checkShaQi(layout: ParsedLayout): boolean {
  if (!layout.entrance) return false;

  const { x: ex, y: ey } = layout.entrance;

  // Check straight lines in all four directions from entrance
  const directions = [
    { dx: 1, dy: 0 },  // East
    { dx: -1, dy: 0 }, // West
    { dx: 0, dy: 1 },  // South
    { dx: 0, dy: -1 }, // North
  ];

  for (const { dx, dy } of directions) {
    let x = ex + dx;
    let y = ey + dy;
    let straightDistance = 0;

    while (x >= 0 && x < layout.width && y >= 0 && y < layout.height) {
      const tile = layout.tiles[y]?.[x] || ' ';

      if (!isWalkable(tile) && tile !== TILE_SYMBOLS.DOOR && tile !== TILE_SYMBOLS.WINDOW) {
        break; // Hit a wall
      }

      straightDistance++;

      // Check if we hit another opening (door/window)
      if ((tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.WINDOW) &&
          (x === 0 || x === layout.width - 1 || y === 0 || y === layout.height - 1)) {
        if (straightDistance >= 4) {
          return true; // Sha Qi detected!
        }
      }

      x += dx;
      y += dy;
    }
  }

  return false;
}

function isWalkable(tile: string): boolean {
  return tile === TILE_SYMBOLS.FLOOR ||
         tile === TILE_SYMBOLS.DOOR ||
         tile === TILE_SYMBOLS.ENTRANCE ||
         tile === TILE_SYMBOLS.TABLE ||
         tile === TILE_SYMBOLS.COUNTER ||
         tile === TILE_SYMBOLS.BED ||
         tile === TILE_SYMBOLS.STORAGE ||
         tile === TILE_SYMBOLS.WORKSTATION;
}

// =============================================================================
// ROOM PROPORTIONS
// =============================================================================

function analyzeProportions(
  building: VoxelBuildingDefinition,
  issues: FengShuiAnalysis['issues']
): FengShuiAnalysis['proportions'] {
  const unbalancedRooms: string[] = [];

  // Analyze main floor
  const layout = building.layout;
  const height = layout.length;
  const width = Math.max(...layout.map(row => row.length));

  // Check overall building proportions
  const ratio = Math.max(width, height) / Math.min(width, height);
  const idealRatio = GOLDEN_RATIO;
  const deviation = Math.abs(ratio - idealRatio) / idealRatio;

  if (deviation > IDEAL_PROPORTION_TOLERANCE) {
    if (ratio > 2.5) {
      unbalancedRooms.push('Main floor (too narrow/long)');
      issues.push({
        principle: 'Proportions',
        issue: 'Building is too elongated',
        suggestion: 'Aim for proportions closer to golden ratio (1.6:1)',
      });
    } else if (ratio < 1.2) {
      // Too square isn't great either, but less of an issue
      issues.push({
        principle: 'Proportions',
        issue: 'Building is very square - consider more dynamic proportions',
        suggestion: 'Slight asymmetry creates more interesting chi flow',
      });
    }
  }

  // Check individual floors
  if (building.floors) {
    for (const floor of building.floors) {
      const fHeight = floor.layout.length;
      const fWidth = Math.max(...floor.layout.map(row => row.length));
      const fRatio = Math.max(fWidth, fHeight) / Math.min(fWidth, fHeight);

      if (fRatio > 3) {
        unbalancedRooms.push(`Floor ${floor.level}: ${floor.name || 'unnamed'} (too narrow)`);
      }
    }
  }

  return {
    areBalanced: unbalancedRooms.length === 0,
    unbalancedRooms,
  };
}

// =============================================================================
// COMMANDING POSITIONS
// =============================================================================

function analyzeCommandingPositions(
  layout: ParsedLayout,
  issues: FengShuiAnalysis['issues']
): FengShuiAnalysis['commandingPositions'] {
  const violations: Array<{ furniture: string; issue: string; location: { x: number; y: number } }> = [];

  // Find beds and check if they can "see" the entrance
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const tile = layout.tiles[y]?.[x] || ' ';

      if (tile === TILE_SYMBOLS.BED) {
        // Check if bed has clear sightline to any door
        const canSeeDoor = hasLineOfSightToDoor(layout, x, y);
        const isDirectlyFacingDoor = isInDirectLineFromDoor(layout, x, y);

        if (!canSeeDoor) {
          violations.push({
            furniture: 'Bed',
            issue: 'Cannot see entrance from bed position',
            location: { x, y },
          });
        } else if (isDirectlyFacingDoor) {
          violations.push({
            furniture: 'Bed',
            issue: 'Bed directly in line with door (coffin position)',
            location: { x, y },
          });
        }
      }

      if (tile === TILE_SYMBOLS.WORKSTATION) {
        const canSeeDoor = hasLineOfSightToDoor(layout, x, y);
        if (!canSeeDoor) {
          violations.push({
            furniture: 'Desk/Workstation',
            issue: 'Cannot see entrance from work position',
            location: { x, y },
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    issues.push({
      principle: 'Commanding Position',
      issue: `${violations.length} furniture pieces poorly positioned`,
      suggestion: 'Position beds and desks to see the entrance diagonally',
    });
  }

  return {
    wellPlaced: violations.length === 0,
    violations,
  };
}

function hasLineOfSightToDoor(layout: ParsedLayout, fromX: number, fromY: number): boolean {
  // Simple check: can we see any door from this position?
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const tile = layout.tiles[y]?.[x] || ' ';
      if (tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.ENTRANCE) {
        if (hasLineOfSight(layout, fromX, fromY, x, y)) {
          return true;
        }
      }
    }
  }
  return false;
}

function hasLineOfSight(layout: ParsedLayout, x1: number, y1: number, x2: number, y2: number): boolean {
  // Bresenham's line algorithm to check for walls
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (x !== x2 || y !== y2) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }

    // Check if this position is blocked
    const tile = layout.tiles[y]?.[x] || ' ';
    if (tile === TILE_SYMBOLS.WALL || tile === TILE_SYMBOLS.PILLAR) {
      return false;
    }
  }

  return true;
}

function isInDirectLineFromDoor(layout: ParsedLayout, x: number, y: number): boolean {
  // Check if this position is directly in line with a door (same row or column)
  for (let dy = 0; dy < layout.height; dy++) {
    for (let dx = 0; dx < layout.width; dx++) {
      const tile = layout.tiles[dy]?.[dx] || ' ';
      if (tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.ENTRANCE) {
        if ((dx === x || dy === y) && hasLineOfSight(layout, x, y, dx, dy)) {
          return true;
        }
      }
    }
  }
  return false;
}

// =============================================================================
// ELEMENT BALANCE
// =============================================================================

function analyzeElementBalance(
  building: VoxelBuildingDefinition,
  layout: ParsedLayout,
  issues: FengShuiAnalysis['issues']
): FengShuiAnalysis['elementBalance'] {
  const balance = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  // Count elements from materials
  const wallMaterial = building.materials?.wall || 'stone';
  const floorMaterial = building.materials?.floor || 'wood';
  const doorMaterial = building.materials?.door || 'wood';

  const wallElement = FENG_SHUI_ELEMENTS[wallMaterial] || 'earth';
  const floorElement = FENG_SHUI_ELEMENTS[floorMaterial] || 'earth';
  const doorElement = FENG_SHUI_ELEMENTS[doorMaterial] || 'wood';

  // Weight by area
  const wallCount = countTiles(layout, TILE_SYMBOLS.WALL);
  const floorCount = countTiles(layout, TILE_SYMBOLS.FLOOR);

  balance[wallElement] += wallCount * 2;
  balance[floorElement] += floorCount;
  balance[doorElement] += 5;

  // Count furniture elements
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const tile = layout.tiles[y]?.[x] || ' ';
      let furnitureType: string | null = null;

      switch (tile) {
        case TILE_SYMBOLS.TABLE: furnitureType = 'table'; break;
        case TILE_SYMBOLS.BED: furnitureType = 'bed'; break;
        case TILE_SYMBOLS.STORAGE: furnitureType = 'storage'; break;
        case TILE_SYMBOLS.WORKSTATION: furnitureType = 'workstation'; break;
        case TILE_SYMBOLS.COUNTER: furnitureType = 'counter'; break;
      }

      if (furnitureType) {
        const element = FENG_SHUI_ELEMENTS[furnitureType] || 'wood';
        balance[element] += 3;
      }
    }
  }

  // Check for imbalances
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  const ideal = total / 5;

  for (const [element, count] of Object.entries(balance)) {
    if (count < ideal * 0.3) {
      issues.push({
        principle: 'Five Elements',
        issue: `${element.charAt(0).toUpperCase() + element.slice(1)} element is deficient`,
        suggestion: `Add ${getElementSuggestion(element as keyof typeof balance)}`,
      });
    } else if (count > ideal * 2) {
      issues.push({
        principle: 'Five Elements',
        issue: `${element.charAt(0).toUpperCase() + element.slice(1)} element is excessive`,
        suggestion: `Reduce ${element} or add its controlling element (${ELEMENT_CONTROLS[element]})`,
      });
    }
  }

  return balance;
}

function countTiles(layout: ParsedLayout, symbol: string): number {
  let count = 0;
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      if (layout.tiles[y]?.[x] === symbol) count++;
    }
  }
  return count;
}

function getElementSuggestion(element: string): string {
  switch (element) {
    case 'wood': return 'wooden furniture or plants';
    case 'fire': return 'a hearth, fireplace, or warm colors';
    case 'earth': return 'stone or ceramic items';
    case 'metal': return 'metal objects or workstations';
    case 'water': return 'a fountain, water feature, or glass items';
    default: return 'appropriate materials';
  }
}

// =============================================================================
// HARMONY SCORE CALCULATION
// =============================================================================

function calculateHarmonyScore(
  chiFlow: FengShuiAnalysis['chiFlow'],
  proportions: FengShuiAnalysis['proportions'],
  commandingPositions: FengShuiAnalysis['commandingPositions'],
  elementBalance: FengShuiAnalysis['elementBalance'],
  _issues: FengShuiAnalysis['issues']  // Used implicitly via other params
): number {
  let score = 100;

  // Chi flow (30 points)
  if (!chiFlow.hasGoodFlow) score -= 15;
  if (chiFlow.hasShaQi) score -= 10;
  score -= Math.min(chiFlow.stagnantAreas.length * 2, 10);

  // Proportions (20 points)
  if (!proportions.areBalanced) score -= proportions.unbalancedRooms.length * 5;

  // Commanding positions (25 points)
  score -= Math.min(commandingPositions.violations.length * 5, 25);

  // Element balance (25 points)
  const elements = Object.values(elementBalance);
  const avg = elements.reduce((a, b) => a + b, 0) / 5;
  const variance = elements.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 5;
  const stdDev = Math.sqrt(variance);
  const balanceScore = Math.max(0, 25 - stdDev / 2);
  score = score - 25 + balanceScore;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// =============================================================================
// ROOM EVOLUTION
// =============================================================================

/**
 * Suggest improvements to a building's Feng Shui.
 */
export function suggestImprovements(analysis: FengShuiAnalysis): string[] {
  const suggestions: string[] = [];

  // Priority 1: Fix Sha Qi
  if (analysis.chiFlow.hasShaQi) {
    suggestions.push('Add a screen, plant, or furniture to break the straight line from entrance');
  }

  // Priority 2: Fix commanding positions
  for (const v of analysis.commandingPositions.violations) {
    if (v.furniture === 'Bed') {
      suggestions.push(`Move bed at (${v.location.x},${v.location.y}) to see the door diagonally`);
    }
  }

  // Priority 3: Improve chi flow
  if (analysis.chiFlow.stagnantAreas.length > 0) {
    suggestions.push('Add openings or mirrors to circulate energy in dead areas');
  }

  // Priority 4: Balance elements
  const elements = Object.entries(analysis.elementBalance);
  const avg = elements.reduce((s, [, v]) => s + v, 0) / 5;

  const deficient = elements.filter(([, v]) => v < avg * 0.5);
  for (const [element] of deficient) {
    suggestions.push(`Add ${getElementSuggestion(element)} to balance the ${element} element`);
  }

  return suggestions;
}

/**
 * Evolve room layout for better Feng Shui.
 * Returns an improved building with higher harmony score.
 */
export function evolveForFengShui(
  building: VoxelBuildingDefinition,
  maxIterations: number = 10
): { building: VoxelBuildingDefinition; analysis: FengShuiAnalysis; improvements: string[] } {
  let current = { ...building, layout: [...building.layout] };
  let currentAnalysis = analyzeFengShui(current);
  const improvements: string[] = [];

  for (let i = 0; i < maxIterations; i++) {
    if (currentAnalysis.harmonyScore >= 85) break; // Good enough

    // Try each improvement strategy
    const improved = tryImproveBuilding(current, currentAnalysis);

    if (improved) {
      const newAnalysis = analyzeFengShui(improved.building);
      if (newAnalysis.harmonyScore > currentAnalysis.harmonyScore) {
        current = improved.building;
        currentAnalysis = newAnalysis;
        improvements.push(improved.change);
      }
    }
  }

  return {
    building: current,
    analysis: currentAnalysis,
    improvements,
  };
}

function tryImproveBuilding(
  building: VoxelBuildingDefinition,
  analysis: FengShuiAnalysis
): { building: VoxelBuildingDefinition; change: string } | null {
  const layout = building.layout.map(row => row.split(''));
  const height = layout.length;
  const width = Math.max(...layout.map(row => row.length));

  // Normalize widths
  for (let y = 0; y < height; y++) {
    while (layout[y].length < width) layout[y].push(' ');
  }

  // Strategy 1: Break Sha Qi by adding furniture
  if (analysis.chiFlow.hasShaQi) {
    // Find the straight path and add a table to break it
    const entrance = findEntrance(layout);
    if (entrance) {
      const breakPoint = findBreakPoint(layout, entrance);
      if (breakPoint && layout[breakPoint.y][breakPoint.x] === TILE_SYMBOLS.FLOOR) {
        layout[breakPoint.y][breakPoint.x] = TILE_SYMBOLS.TABLE;
        return {
          building: { ...building, layout: layout.map(row => row.join('')) },
          change: `Added table at (${breakPoint.x},${breakPoint.y}) to break Sha Qi`,
        };
      }
    }
  }

  // Strategy 2: Move bed to commanding position
  for (const v of analysis.commandingPositions.violations) {
    if (v.furniture === 'Bed') {
      // Try to find a better position for this bed
      const newPos = findCommandingPosition(layout, v.location);
      if (newPos) {
        layout[v.location.y][v.location.x] = TILE_SYMBOLS.FLOOR;
        layout[newPos.y][newPos.x] = TILE_SYMBOLS.BED;
        return {
          building: { ...building, layout: layout.map(row => row.join('')) },
          change: `Moved bed from (${v.location.x},${v.location.y}) to (${newPos.x},${newPos.y}) for commanding position`,
        };
      }
    }
  }

  // Strategy 3: Add element-balancing furniture
  const elements = Object.entries(analysis.elementBalance);
  const avg = elements.reduce((s, [, v]) => s + v, 0) / 5;
  const deficient = elements.find(([, v]) => v < avg * 0.5);

  if (deficient) {
    const [element] = deficient;
    const symbol = getElementFurniture(element);
    const emptySpot = findEmptySpot(layout);
    if (emptySpot && symbol) {
      layout[emptySpot.y][emptySpot.x] = symbol;
      return {
        building: { ...building, layout: layout.map(row => row.join('')) },
        change: `Added ${element} element furniture at (${emptySpot.x},${emptySpot.y})`,
      };
    }
  }

  return null;
}

function findEntrance(layout: string[][]): { x: number; y: number } | null {
  const height = layout.length;
  const width = layout[0]?.length || 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = layout[y]?.[x] || ' ';
      if (tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.ENTRANCE) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          return { x, y };
        }
      }
    }
  }
  return null;
}

function findBreakPoint(layout: string[][], entrance: { x: number; y: number }): { x: number; y: number } | null {
  const height = layout.length;
  const width = layout[0]?.length || 0;

  // Walk from entrance in its facing direction
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (const { dx, dy } of directions) {
    let x = entrance.x + dx * 2; // Skip first tile
    let y = entrance.y + dy * 2;

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const tile = layout[y]?.[x] || ' ';
      if (tile === TILE_SYMBOLS.FLOOR) {
        return { x, y };
      }
    }
  }

  return null;
}

function findCommandingPosition(layout: string[][], _bedLocation: { x: number; y: number }): { x: number; y: number } | null {
  const height = layout.length;
  const width = layout[0]?.length || 0;

  // Find a corner position with diagonal view to door
  const corners = [
    { x: 1, y: 1 },
    { x: width - 2, y: 1 },
    { x: 1, y: height - 2 },
    { x: width - 2, y: height - 2 },
  ];

  for (const pos of corners) {
    const tile = layout[pos.y]?.[pos.x] || ' ';
    if (tile === TILE_SYMBOLS.FLOOR) {
      return pos;
    }
  }

  return null;
}

function findEmptySpot(layout: string[][]): { x: number; y: number } | null {
  const height = layout.length;
  const width = layout[0]?.length || 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (layout[y]?.[x] === TILE_SYMBOLS.FLOOR) {
        return { x, y };
      }
    }
  }
  return null;
}

function getElementFurniture(element: string): string | null {
  switch (element) {
    case 'wood': return TILE_SYMBOLS.TABLE;
    case 'fire': return TILE_SYMBOLS.WORKSTATION; // Forge represents fire
    case 'earth': return TILE_SYMBOLS.STORAGE;
    case 'metal': return TILE_SYMBOLS.WORKSTATION;
    case 'water': return null; // Need to add fountain symbol
    default: return null;
  }
}

// =============================================================================
// VISUALIZATION
// =============================================================================

/**
 * Create a visual report of Feng Shui analysis.
 */
export function visualizeFengShui(building: VoxelBuildingDefinition): string {
  const analysis = analyzeFengShui(building);
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`  FENG SHUI ANALYSIS: ${building.name}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Harmony Score
  const scoreBar = '█'.repeat(Math.floor(analysis.harmonyScore / 5)) +
                   '░'.repeat(20 - Math.floor(analysis.harmonyScore / 5));
  const scoreEmoji = analysis.harmonyScore >= 80 ? '🏯' :
                     analysis.harmonyScore >= 60 ? '🏠' :
                     analysis.harmonyScore >= 40 ? '🏚️' : '⚠️';
  lines.push(`  Harmony Score: ${scoreEmoji} ${analysis.harmonyScore}/100`);
  lines.push(`  [${scoreBar}]`);
  lines.push('');

  // Chi Flow
  lines.push('  CHI FLOW:');
  lines.push(`    Flow: ${analysis.chiFlow.hasGoodFlow ? '✓ Good' : '✗ Blocked'}`);
  lines.push(`    Sha Qi: ${analysis.chiFlow.hasShaQi ? '✗ Present (killing breath!)' : '✓ None'}`);
  lines.push(`    Stagnant areas: ${analysis.chiFlow.stagnantAreas.length}`);
  lines.push('');

  // Proportions
  lines.push('  PROPORTIONS:');
  lines.push(`    Balance: ${analysis.proportions.areBalanced ? '✓ Good' : '✗ Issues'}`);
  if (analysis.proportions.unbalancedRooms.length > 0) {
    for (const room of analysis.proportions.unbalancedRooms) {
      lines.push(`      - ${room}`);
    }
  }
  lines.push('');

  // Commanding Positions
  lines.push('  COMMANDING POSITIONS:');
  lines.push(`    Status: ${analysis.commandingPositions.wellPlaced ? '✓ All good' : '✗ Violations'}`);
  for (const v of analysis.commandingPositions.violations) {
    lines.push(`      - ${v.furniture}: ${v.issue}`);
  }
  lines.push('');

  // Five Elements
  lines.push('  FIVE ELEMENTS:');
  const elements = analysis.elementBalance;
  const total = Object.values(elements).reduce((a, b) => a + b, 0);
  for (const [name, value] of Object.entries(elements)) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const bar = '█'.repeat(Math.floor(pct / 5));
    const emoji = { wood: '🌳', fire: '🔥', earth: '🪨', metal: '⚙️', water: '💧' }[name] || '';
    lines.push(`    ${emoji} ${name.padEnd(6)}: ${bar.padEnd(20)} ${pct}%`);
  }
  lines.push('');

  // Issues & Suggestions
  if (analysis.issues.length > 0) {
    lines.push('  ISSUES:');
    for (const issue of analysis.issues) {
      lines.push(`    ⚠ [${issue.principle}] ${issue.issue}`);
      lines.push(`      → ${issue.suggestion}`);
    }
    lines.push('');
  }

  // Improvement suggestions
  const suggestions = suggestImprovements(analysis);
  if (suggestions.length > 0) {
    lines.push('  SUGGESTED IMPROVEMENTS:');
    for (const s of suggestions) {
      lines.push(`    • ${s}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// =============================================================================
// DEMO
// =============================================================================

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { simpleHouse, cottage, workshop } = require('./room-composer');

  console.log('\n');
  console.log(visualizeFengShui(simpleHouse()));
  console.log('\n');
  console.log(visualizeFengShui(cottage()));
  console.log('\n');
  console.log(visualizeFengShui(workshop()));

  // Demonstrate evolution
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  EVOLVING A BUILDING FOR BETTER FENG SHUI');
  console.log('═══════════════════════════════════════════════════════════════');

  const original = simpleHouse();
  console.log('\nOriginal:');
  console.log(original.layout.join('\n'));

  const evolved = evolveForFengShui(original);
  console.log(`\nEvolved (${evolved.analysis.harmonyScore} harmony):`);
  console.log(evolved.building.layout.join('\n'));

  if (evolved.improvements.length > 0) {
    console.log('\nImprovements made:');
    for (const imp of evolved.improvements) {
      console.log(`  • ${imp}`);
    }
  }
}
