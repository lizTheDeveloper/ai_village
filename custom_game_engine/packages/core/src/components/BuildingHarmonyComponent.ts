/**
 * BuildingHarmonyComponent - Stores Feng Shui analysis results for buildings
 *
 * This component is added to building entities after spatial harmony analysis.
 * It contains the harmony score and detailed breakdown of Feng Shui factors.
 *
 * Integration with Architecture Skill Tree:
 * - Agents with 'flow-awareness' can read basic harmony info
 * - Agents with 'spatial-harmony-mastery' can see full details
 * - Harmony score affects occupant mood and productivity
 */

import type { Component } from '../ecs/Component.js';

/** Position in 2D space */
export interface GridPosition {
  x: number;
  y: number;
}

/** Chi flow analysis results */
export interface ChiFlowAnalysis {
  /** Whether chi flows well through the space */
  hasGoodFlow: boolean;
  /** Areas where chi stagnates (< 30% flow strength) */
  stagnantAreas: GridPosition[];
  /** Whether there's Sha Qi (killing breath) - straight lines 4+ tiles */
  hasShaQi: boolean;
  /** Sha Qi line endpoints if present */
  shaQiLines?: Array<{ from: GridPosition; to: GridPosition }>;
}

/** Room proportion analysis */
export interface ProportionAnalysis {
  /** Whether room proportions are balanced (near golden ratio 1.618) */
  areBalanced: boolean;
  /** Room names that have poor proportions */
  unbalancedRooms: string[];
  /** Closest room to golden ratio */
  bestProportionedRoom?: string;
}

/** Furniture commanding position analysis */
export interface CommandingPositionAnalysis {
  /** Whether key furniture is well-placed */
  wellPlaced: boolean;
  /** Violations of commanding position principles */
  violations: Array<{
    furniture: string;
    issue: string;
    location: GridPosition;
  }>;
}

/** Five element balance */
export interface ElementBalance {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

/** A specific Feng Shui issue with suggestion */
export interface HarmonyIssue {
  /** Which principle is violated */
  principle: 'chi_flow' | 'proportions' | 'commanding_position' | 'element_balance' | 'sha_qi';
  /** Description of the issue */
  issue: string;
  /** Suggested fix */
  suggestion: string;
  /** Location if applicable */
  location?: GridPosition;
}

/** Harmony level thresholds */
export type HarmonyLevel = 'discordant' | 'disharmonious' | 'neutral' | 'harmonious' | 'sublime';

export interface BuildingHarmonyComponent extends Component {
  type: 'building_harmony';

  /** Overall harmony score (0-100) */
  harmonyScore: number;

  /** Harmony level category */
  harmonyLevel: HarmonyLevel;

  /** Chi flow analysis */
  chiFlow: ChiFlowAnalysis;

  /** Room proportion analysis */
  proportions: ProportionAnalysis;

  /** Commanding position analysis */
  commandingPositions: CommandingPositionAnalysis;

  /** Five element balance counts */
  elementBalance: ElementBalance;

  /** Most deficient element */
  deficientElement?: keyof ElementBalance;

  /** Most excessive element */
  excessiveElement?: keyof ElementBalance;

  /** Specific issues found */
  issues: HarmonyIssue[];

  /** Game tick when last analyzed */
  lastAnalyzedTick: number;

  /** Whether this building has been optimized by an architect */
  wasOptimized: boolean;

  /** Entity ID of architect who analyzed/optimized (if any) */
  analyzedBy?: string;
}

/**
 * Get harmony level from score.
 */
export function getHarmonyLevelFromScore(score: number): HarmonyLevel {
  if (score <= 20) return 'discordant';
  if (score <= 40) return 'disharmonious';
  if (score <= 60) return 'neutral';
  if (score <= 80) return 'harmonious';
  return 'sublime';
}

/**
 * Create a new BuildingHarmonyComponent with analysis results.
 */
export function createBuildingHarmonyComponent(
  harmonyScore: number,
  chiFlow: ChiFlowAnalysis,
  proportions: ProportionAnalysis,
  commandingPositions: CommandingPositionAnalysis,
  elementBalance: ElementBalance,
  issues: HarmonyIssue[],
  currentTick: number,
  analyzedBy?: string
): BuildingHarmonyComponent {
  // Calculate deficient/excessive elements
  const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
  const total = elements.reduce((sum, el) => sum + elementBalance[el], 0);
  const ideal = total / 5;

  let deficientElement: keyof ElementBalance | undefined;
  let excessiveElement: keyof ElementBalance | undefined;
  let maxDeficiency = 0;
  let maxExcess = 0;

  for (const element of elements) {
    const value = elementBalance[element];
    const deficiency = ideal - value;
    const excess = value - ideal;

    if (deficiency > maxDeficiency && value < ideal * 0.3) {
      maxDeficiency = deficiency;
      deficientElement = element;
    }
    if (excess > maxExcess && value > ideal * 2) {
      maxExcess = excess;
      excessiveElement = element;
    }
  }

  return {
    type: 'building_harmony',
    version: 1,
    harmonyScore,
    harmonyLevel: getHarmonyLevelFromScore(harmonyScore),
    chiFlow,
    proportions,
    commandingPositions,
    elementBalance,
    deficientElement,
    excessiveElement,
    issues,
    lastAnalyzedTick: currentTick,
    wasOptimized: false,
    analyzedBy,
  };
}

/**
 * Create a default/empty harmony component for buildings without analysis.
 */
export function createDefaultHarmonyComponent(currentTick: number): BuildingHarmonyComponent {
  return {
    type: 'building_harmony',
    version: 1,
    harmonyScore: 50, // Neutral default
    harmonyLevel: 'neutral',
    chiFlow: {
      hasGoodFlow: true,
      stagnantAreas: [],
      hasShaQi: false,
    },
    proportions: {
      areBalanced: true,
      unbalancedRooms: [],
    },
    commandingPositions: {
      wellPlaced: true,
      violations: [],
    },
    elementBalance: {
      wood: 20,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 20,
    },
    issues: [],
    lastAnalyzedTick: currentTick,
    wasOptimized: false,
  };
}

/**
 * Calculate mood modifier from harmony score.
 * Positive for harmonious, negative for discordant.
 */
export function getHarmonyMoodModifier(harmonyScore: number): number {
  // -0.5 to +0.5 based on score
  return (harmonyScore - 50) / 100;
}

/**
 * Calculate productivity modifier from harmony score.
 */
export function getHarmonyProductivityModifier(harmonyScore: number): number {
  // -0.25 to +0.25 based on score
  return (harmonyScore - 50) / 200;
}

/**
 * Calculate rest quality modifier from harmony score.
 * Rest is most affected by spatial harmony.
 */
export function getHarmonyRestModifier(harmonyScore: number): number {
  // -0.75 to +0.75 based on score
  return ((harmonyScore - 50) / 100) * 1.5;
}
