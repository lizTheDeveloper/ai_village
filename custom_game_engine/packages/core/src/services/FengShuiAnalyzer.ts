/**
 * FengShuiAnalyzer - Analyzes spatial harmony of building layouts
 *
 * This service provides Feng Shui analysis capabilities for buildings.
 * It can analyze chi flow, element balance, proportions, and commanding positions.
 *
 * Used by:
 * - Architecture skill tree (spatial harmony nodes)
 * - BuildingSpatialAnalysisSystem (automatic analysis)
 * - Building designer integration
 */

import type {
  BuildingHarmonyComponent,
  ChiFlowAnalysis,
  ProportionAnalysis,
  CommandingPositionAnalysis,
  ElementBalance,
  HarmonyIssue,
  GridPosition,
} from '../components/BuildingHarmonyComponent.js';
import { createBuildingHarmonyComponent } from '../components/BuildingHarmonyComponent.js';

// ============================================================================
// Types
// ============================================================================

/** Tile symbols used in building layouts */
export const TILE_SYMBOLS = {
  WALL: '#',
  FLOOR: '.',
  DOOR: 'D',
  ENTRANCE: 'E',
  WINDOW: 'W',
  TABLE: 'T',
  BED: 'B',
  STORAGE: 'S',
  WORKSTATION: 'K',
  COUNTER: 'C',
  HEARTH: 'H',
  EMPTY: ' ',
} as const;

/** Map materials/furniture to elements */
const MATERIAL_ELEMENTS: Record<string, keyof ElementBalance> = {
  // Materials
  wood: 'wood',
  thatch: 'wood',
  stone: 'earth',
  mud_brick: 'earth',
  metal: 'metal',
  glass: 'water',
  ice: 'water',
  // Furniture
  table: 'wood',
  bed: 'wood',
  storage: 'earth',
  workstation: 'metal',
  counter: 'wood',
  hearth: 'fire',
};

/** Element control cycle (what controls what) */
const ELEMENT_CONTROLS: Record<string, string> = {
  wood: 'earth',   // Wood controls Earth (roots)
  earth: 'water',  // Earth controls Water (dams)
  water: 'fire',   // Water controls Fire (extinguishes)
  fire: 'metal',   // Fire controls Metal (melts)
  metal: 'wood',   // Metal controls Wood (chops)
};

/** Golden ratio for ideal proportions */
const GOLDEN_RATIO = 1.618;
const PROPORTION_TOLERANCE = 0.3; // 30% deviation is acceptable

/** Building layout for analysis */
export interface BuildingLayout {
  /** Layout as array of strings (ASCII art) */
  layout: string[];
  /** Wall material */
  wallMaterial?: string;
  /** Floor material */
  floorMaterial?: string;
  /** Door material */
  doorMaterial?: string;
  /** Room definitions if available */
  rooms?: Array<{ name: string; purpose: string }>;
}

/** Parsed layout for internal use */
interface ParsedLayout {
  width: number;
  height: number;
  tiles: string[][];
  entrance: GridPosition | null;
}

// ============================================================================
// Main Analyzer Class
// ============================================================================

export class FengShuiAnalyzer {
  /**
   * Perform complete Feng Shui analysis on a building layout.
   */
  analyze(
    building: BuildingLayout,
    currentTick: number,
    analyzedBy?: string
  ): BuildingHarmonyComponent {
    const layout = this.parseLayout(building.layout);
    const issues: HarmonyIssue[] = [];

    // 1. Chi Flow Analysis
    const chiFlow = this.analyzeChiFlow(layout, issues);

    // 2. Room Proportions
    const proportions = this.analyzeProportions(building, layout, issues);

    // 3. Commanding Positions
    const commandingPositions = this.analyzeCommandingPositions(layout, issues);

    // 4. Element Balance
    const elementBalance = this.analyzeElementBalance(building, layout, issues);

    // Calculate overall harmony score
    const harmonyScore = this.calculateHarmonyScore(
      chiFlow,
      proportions,
      commandingPositions,
      elementBalance
    );

    return createBuildingHarmonyComponent(
      harmonyScore,
      chiFlow,
      proportions,
      commandingPositions,
      elementBalance,
      issues,
      currentTick,
      analyzedBy
    );
  }

  /**
   * Get improvement suggestions based on analysis.
   */
  suggestImprovements(harmony: BuildingHarmonyComponent): string[] {
    const suggestions: string[] = [];

    // Priority 1: Fix Sha Qi
    if (harmony.chiFlow.hasShaQi) {
      suggestions.push('Add a screen, plant, or furniture to break the straight line from entrance');
    }

    // Priority 2: Fix commanding positions
    for (const v of harmony.commandingPositions.violations) {
      if (v.furniture.toLowerCase().includes('bed')) {
        suggestions.push(`Move bed to see the door diagonally, not directly`);
      } else if (v.furniture.toLowerCase().includes('desk')) {
        suggestions.push(`Position desk with wall behind and clear view of door`);
      }
    }

    // Priority 3: Fix stagnant areas
    if (harmony.chiFlow.stagnantAreas.length > 0) {
      suggestions.push(`Open up ${harmony.chiFlow.stagnantAreas.length} stagnant areas with doors or wider passages`);
    }

    // Priority 4: Balance elements
    if (harmony.deficientElement) {
      suggestions.push(`Add ${this.getElementSuggestion(harmony.deficientElement)} to balance ${harmony.deficientElement}`);
    }

    // Priority 5: Fix proportions
    if (!harmony.proportions.areBalanced) {
      suggestions.push(`Adjust room proportions to approach golden ratio (1.618)`);
    }

    return suggestions;
  }

  // ============================================================================
  // Layout Parsing
  // ============================================================================

  private parseLayout(layout: string[]): ParsedLayout {
    const height = layout.length;
    const width = Math.max(...layout.map(row => row.length), 0);
    const tiles: string[][] = layout.map(row => {
      const chars = row.split('');
      while (chars.length < width) chars.push(' ');
      return chars;
    });

    // Find entrance (door on edge)
    let entrance: GridPosition | null = null;
    for (let y = 0; y < height && !entrance; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y]?.[x] || ' ';
        if (tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.ENTRANCE) {
          if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
            entrance = { x, y };
            break;
          }
        }
      }
    }

    return { width, height, tiles, entrance };
  }

  // ============================================================================
  // Chi Flow Analysis
  // ============================================================================

  private analyzeChiFlow(layout: ParsedLayout, issues: HarmonyIssue[]): ChiFlowAnalysis {
    const stagnantAreas: GridPosition[] = [];
    let hasShaQi = false;

    if (!layout.entrance) {
      issues.push({
        principle: 'chi_flow',
        issue: 'No entrance found - chi cannot enter',
        suggestion: 'Add a door to allow energy flow',
      });
      return { hasGoodFlow: false, stagnantAreas: [], hasShaQi: false };
    }

    // Check for Sha Qi (straight lines from entrance)
    hasShaQi = this.checkShaQi(layout);
    if (hasShaQi) {
      issues.push({
        principle: 'sha_qi',
        issue: 'Straight line from entrance to opposite opening',
        suggestion: 'Add furniture or offset doors to slow chi flow',
        location: layout.entrance,
      });
    }

    // BFS from entrance to measure flow strength
    const visited = new Set<string>();
    const flowStrength = new Map<string, number>();
    const queue: Array<{ x: number; y: number; strength: number }> = [
      { ...layout.entrance, strength: 100 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const { x, y, strength } = current;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      flowStrength.set(key, strength);

      // Spread to neighbors
      const neighbors = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 },
      ];

      for (const n of neighbors) {
        if (n.x < 0 || n.x >= layout.width || n.y < 0 || n.y >= layout.height) continue;
        const tile = layout.tiles[n.y]?.[n.x] || ' ';
        if (this.isWalkable(tile) && !visited.has(`${n.x},${n.y}`)) {
          queue.push({ x: n.x, y: n.y, strength: strength * 0.9 });
        }
      }
    }

    // Find stagnant areas (< 30% flow)
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        const tile = layout.tiles[y]?.[x] || ' ';
        if (this.isWalkable(tile)) {
          const flow = flowStrength.get(`${x},${y}`) || 0;
          if (flow < 30 && flow > 0) {
            stagnantAreas.push({ x, y });
          }
        }
      }
    }

    if (stagnantAreas.length > 0) {
      issues.push({
        principle: 'chi_flow',
        issue: `${stagnantAreas.length} stagnant areas where chi doesn't flow well`,
        suggestion: 'Add openings or remove obstacles to improve circulation',
      });
    }

    const hasGoodFlow = stagnantAreas.length < 3 && !hasShaQi;
    return { hasGoodFlow, stagnantAreas, hasShaQi };
  }

  private checkShaQi(layout: ParsedLayout): boolean {
    if (!layout.entrance) return false;

    const { x: ex, y: ey } = layout.entrance;
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    for (const { dx, dy } of directions) {
      let x = ex + dx;
      let y = ey + dy;
      let straightDistance = 0;

      while (x >= 0 && x < layout.width && y >= 0 && y < layout.height) {
        const tile = layout.tiles[y]?.[x] || ' ';

        if (!this.isWalkable(tile) && tile !== TILE_SYMBOLS.DOOR && tile !== TILE_SYMBOLS.WINDOW) {
          break;
        }

        straightDistance++;

        // Check if we hit another opening on the edge
        if ((tile === TILE_SYMBOLS.DOOR || tile === TILE_SYMBOLS.WINDOW) &&
            (x === 0 || x === layout.width - 1 || y === 0 || y === layout.height - 1)) {
          if (straightDistance >= 4) {
            return true; // Sha Qi detected
          }
        }

        x += dx;
        y += dy;
      }
    }

    return false;
  }

  private isWalkable(tile: string): boolean {
    return tile === TILE_SYMBOLS.FLOOR ||
           tile === TILE_SYMBOLS.DOOR ||
           tile === TILE_SYMBOLS.ENTRANCE ||
           tile === TILE_SYMBOLS.TABLE ||
           tile === TILE_SYMBOLS.COUNTER ||
           tile === TILE_SYMBOLS.BED ||
           tile === TILE_SYMBOLS.STORAGE ||
           tile === TILE_SYMBOLS.WORKSTATION;
  }

  // ============================================================================
  // Proportions Analysis
  // ============================================================================

  private analyzeProportions(
    building: BuildingLayout,
    layout: ParsedLayout,
    issues: HarmonyIssue[]
  ): ProportionAnalysis {
    const unbalancedRooms: string[] = [];

    // Analyze overall building proportions
    const ratio = layout.width > layout.height
      ? layout.width / layout.height
      : layout.height / layout.width;

    const deviation = Math.abs(ratio - GOLDEN_RATIO) / GOLDEN_RATIO;

    if (deviation > PROPORTION_TOLERANCE) {
      if (ratio > 2.5) {
        unbalancedRooms.push('Main floor (too elongated)');
        issues.push({
          principle: 'proportions',
          issue: 'Building is too elongated',
          suggestion: 'Consider a more balanced width-to-length ratio',
        });
      } else if (ratio < 1.2) {
        unbalancedRooms.push('Main floor (too square)');
        issues.push({
          principle: 'proportions',
          issue: 'Building is too square',
          suggestion: 'Slightly elongating the layout can improve flow',
        });
      }
    }

    // Check named rooms if available
    if (building.rooms) {
      for (const _room of building.rooms) {
        // Would need room dimensions - for now, mark as checked
      }
    }

    return {
      areBalanced: unbalancedRooms.length === 0,
      unbalancedRooms,
      bestProportionedRoom: unbalancedRooms.length === 0 ? 'Main floor' : undefined,
    };
  }

  // ============================================================================
  // Commanding Positions Analysis
  // ============================================================================

  private analyzeCommandingPositions(
    layout: ParsedLayout,
    issues: HarmonyIssue[]
  ): CommandingPositionAnalysis {
    const violations: CommandingPositionAnalysis['violations'] = [];

    if (!layout.entrance) {
      return { wellPlaced: true, violations };
    }

    // Find beds and check their positions
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        const tile = layout.tiles[y]?.[x] || ' ';

        if (tile === TILE_SYMBOLS.BED) {
          const violation = this.checkBedPosition(layout, { x, y });
          if (violation) {
            violations.push(violation);
          }
        }

        if (tile === TILE_SYMBOLS.WORKSTATION) {
          const violation = this.checkDeskPosition(layout, { x, y });
          if (violation) {
            violations.push(violation);
          }
        }
      }
    }

    if (violations.length > 0) {
      issues.push({
        principle: 'commanding_position',
        issue: `${violations.length} furniture items not in commanding position`,
        suggestion: 'Position key furniture to see entrance diagonally with wall behind',
      });
    }

    return {
      wellPlaced: violations.length === 0,
      violations,
    };
  }

  private checkBedPosition(
    layout: ParsedLayout,
    bedPos: GridPosition
  ): CommandingPositionAnalysis['violations'][0] | null {
    if (!layout.entrance) return null;

    const { x: ex, y: ey } = layout.entrance;
    const { x: bx, y: by } = bedPos;

    // Check if directly in line with entrance (bad)
    if (bx === ex || by === ey) {
      // Check if there's clear line of sight
      if (this.hasLineOfSight(layout, bedPos, layout.entrance)) {
        return {
          furniture: 'Bed',
          issue: 'Directly facing entrance',
          location: bedPos,
        };
      }
    }

    // Check if has wall behind (good commanding position needs this)
    const hasWallBehind = this.hasWallBehind(layout, bedPos, layout.entrance);
    if (!hasWallBehind) {
      return {
        furniture: 'Bed',
        issue: 'No solid wall behind',
        location: bedPos,
      };
    }

    return null;
  }

  private checkDeskPosition(
    layout: ParsedLayout,
    deskPos: GridPosition
  ): CommandingPositionAnalysis['violations'][0] | null {
    if (!layout.entrance) return null;

    // Desk should have wall behind and view of entrance
    const hasWallBehind = this.hasWallBehind(layout, deskPos, layout.entrance);
    if (!hasWallBehind) {
      return {
        furniture: 'Desk/Workstation',
        issue: 'No solid wall behind',
        location: deskPos,
      };
    }

    return null;
  }

  private hasLineOfSight(layout: ParsedLayout, from: GridPosition, to: GridPosition): boolean {
    // Simple line check using Bresenham-like approach
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let err = dx - dy;
    let x = from.x;
    let y = from.y;

    while (x !== to.x || y !== to.y) {
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }

      if (x === to.x && y === to.y) break;

      const tile = layout.tiles[y]?.[x] || ' ';
      if (tile === TILE_SYMBOLS.WALL) {
        return false; // Blocked
      }
    }

    return true;
  }

  private hasWallBehind(layout: ParsedLayout, pos: GridPosition, entrance: GridPosition): boolean {
    // Determine "behind" based on entrance direction
    const dx = pos.x - entrance.x;
    const dy = pos.y - entrance.y;

    // Behind is opposite to entrance direction
    let checkX = pos.x;
    let checkY = pos.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      checkX = pos.x + (dx > 0 ? 1 : -1);
    } else {
      checkY = pos.y + (dy > 0 ? 1 : -1);
    }

    if (checkX < 0 || checkX >= layout.width || checkY < 0 || checkY >= layout.height) {
      return true; // Edge of building counts as wall
    }

    const tile = layout.tiles[checkY]?.[checkX] || ' ';
    return tile === TILE_SYMBOLS.WALL;
  }

  // ============================================================================
  // Element Balance Analysis
  // ============================================================================

  private analyzeElementBalance(
    building: BuildingLayout,
    layout: ParsedLayout,
    issues: HarmonyIssue[]
  ): ElementBalance {
    const balance: ElementBalance = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    // Count elements from materials
    const wallElement = MATERIAL_ELEMENTS[building.wallMaterial || 'stone'] || 'earth';
    const floorElement = MATERIAL_ELEMENTS[building.floorMaterial || 'wood'] || 'wood';
    const doorElement = MATERIAL_ELEMENTS[building.doorMaterial || 'wood'] || 'wood';

    // Weight by area
    const wallCount = this.countTiles(layout, TILE_SYMBOLS.WALL);
    const floorCount = this.countTiles(layout, TILE_SYMBOLS.FLOOR);

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
          case TILE_SYMBOLS.HEARTH: furnitureType = 'hearth'; break;
        }

        if (furnitureType) {
          const element = MATERIAL_ELEMENTS[furnitureType] || 'wood';
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
          principle: 'element_balance',
          issue: `${element.charAt(0).toUpperCase() + element.slice(1)} element is deficient`,
          suggestion: `Add ${this.getElementSuggestion(element as keyof ElementBalance)}`,
        });
      } else if (count > ideal * 2) {
        issues.push({
          principle: 'element_balance',
          issue: `${element.charAt(0).toUpperCase() + element.slice(1)} element is excessive`,
          suggestion: `Reduce ${element} or add its controlling element (${ELEMENT_CONTROLS[element]})`,
        });
      }
    }

    return balance;
  }

  private countTiles(layout: ParsedLayout, symbol: string): number {
    let count = 0;
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        if (layout.tiles[y]?.[x] === symbol) count++;
      }
    }
    return count;
  }

  private getElementSuggestion(element: keyof ElementBalance): string {
    switch (element) {
      case 'wood': return 'wooden furniture or plants';
      case 'fire': return 'a hearth, fireplace, or warm colors';
      case 'earth': return 'stone or ceramic items';
      case 'metal': return 'metal objects or workstations';
      case 'water': return 'a fountain, water feature, or glass items';
    }
  }

  // ============================================================================
  // Harmony Score Calculation
  // ============================================================================

  private calculateHarmonyScore(
    chiFlow: ChiFlowAnalysis,
    proportions: ProportionAnalysis,
    commandingPositions: CommandingPositionAnalysis,
    elementBalance: ElementBalance
  ): number {
    let score = 100;

    // Chi flow (30 points max penalty)
    if (!chiFlow.hasGoodFlow) score -= 15;
    if (chiFlow.hasShaQi) score -= 10;
    score -= Math.min(chiFlow.stagnantAreas.length * 2, 10);

    // Proportions (20 points max penalty)
    score -= Math.min(proportions.unbalancedRooms.length * 5, 20);

    // Commanding positions (25 points max penalty)
    score -= Math.min(commandingPositions.violations.length * 5, 25);

    // Element balance (25 points max penalty)
    const elements = Object.values(elementBalance);
    const avg = elements.reduce((a, b) => a + b, 0) / 5;
    const variance = elements.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 5;
    const stdDev = Math.sqrt(variance);
    const balanceScore = Math.max(0, 25 - stdDev / 2);
    score = score - 25 + balanceScore;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Shared analyzer instance */
export const fengShuiAnalyzer = new FengShuiAnalyzer();
