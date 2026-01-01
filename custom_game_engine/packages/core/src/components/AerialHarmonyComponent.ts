/**
 * AerialHarmonyComponent - 3D spatial harmony for flying creatures
 *
 * Flying entities experience chi flow differently than ground-dwellers:
 * - Thermals (rising warm air) are positive chi
 * - Wind corridors between buildings can be chi highways or danger zones
 * - Tall structures create aerial Sha Qi (killing breath in flight paths)
 * - Perching spots need 3D commanding positions with approach vectors
 *
 * Skill-gated perception (architecture skill):
 * - Level 2: Basic thermal sense ("feels like a good place to rest")
 * - Level 3: Wind corridor awareness, perching quality
 * - Level 4+: Full 3D harmony analysis with flight path recommendations
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Position in 3D space for aerial analysis.
 */
export interface AerialPosition {
  x: number;
  y: number;
  z: number; // Altitude/z-level
}

/**
 * Thermal zone - area of rising warm air.
 */
export interface ThermalZone {
  /** Center position of thermal */
  center: AerialPosition;
  /** Radius of effect in tiles */
  radius: number;
  /** Strength of uplift (0-100) */
  strength: number;
  /** Source of heat (building type or terrain) */
  source: string;
  /** Z-range where thermal is effective */
  minZ: number;
  maxZ: number;
}

/**
 * Wind corridor between structures.
 */
export interface WindCorridor {
  /** Start position */
  start: AerialPosition;
  /** End position */
  end: AerialPosition;
  /** Width of corridor in tiles */
  width: number;
  /** Is this a safe flight path or dangerous? */
  isSafe: boolean;
  /** Risk level (0 = safe, 100 = extremely dangerous) */
  riskLevel: number;
  /** Description of why it's risky or safe */
  description: string;
}

/**
 * Aerial Sha Qi - dangerous straight-line alignments at altitude.
 */
export interface AerialShaQi {
  /** Line of dangerous chi */
  from: AerialPosition;
  to: AerialPosition;
  /** Severity (0-100) */
  severity: number;
  /** What causes this Sha Qi */
  cause: string;
  /** Z-levels affected */
  affectedAltitudes: number[];
}

/**
 * Perching spot analysis - 3D commanding position for flying creatures.
 */
export interface PerchingSpot {
  /** Location of perch */
  position: AerialPosition;
  /** Entity/building ID providing the perch */
  providedBy: string;
  /** Type of perch (rooftop, branch, ledge, etc.) */
  perchType: string;
  /** Commanding position quality (0-100) */
  commandingQuality: number;
  /** Number of clear approach vectors */
  approachVectors: number;
  /** Can see threats approaching? */
  hasThreatVisibility: boolean;
  /** Has solid backing (wall, trunk)? */
  hasBackingProtection: boolean;
  /** Description for agents */
  description: string;
}

/**
 * 3D volumetric element balance in airspace.
 */
export interface VolumetricElementBalance {
  /** Element strength at different altitudes */
  byAltitude: {
    ground: ElementDistribution; // z = 0
    canopy: ElementDistribution; // z = 3
    flying: ElementDistribution; // z = 5
    high: ElementDistribution;   // z > 10
  };
  /** Overall balance assessment */
  isBalanced: boolean;
  /** Dominant element in this airspace */
  dominantElement: string;
  /** Deficient element */
  deficientElement?: string;
}

export interface ElementDistribution {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

/**
 * Aerial harmony levels.
 */
export type AerialHarmonyLevel =
  | 'treacherous'    // 0-20: Dangerous to fly
  | 'turbulent'      // 21-40: Uncomfortable
  | 'calm'           // 41-60: Neutral
  | 'favorable'      // 61-80: Good flying
  | 'sublime'        // 81-100: Perfect aerial chi

/**
 * Issue found in aerial harmony analysis.
 */
export interface AerialHarmonyIssue {
  principle: 'thermal_flow' | 'wind_corridor' | 'aerial_sha_qi' | 'perching' | 'element_balance';
  issue: string;
  suggestion: string;
  location?: AerialPosition;
  altitude?: number;
}

// ============================================================================
// Component Interface
// ============================================================================

/**
 * AerialHarmonyComponent - Stores 3D aerial Feng Shui analysis.
 * Attached to regions/chunks of airspace.
 */
export interface AerialHarmonyComponent extends Component {
  type: 'aerial_harmony';

  /** Overall aerial harmony score (0-100) */
  harmonyScore: number;

  /** Harmony level category */
  harmonyLevel: AerialHarmonyLevel;

  /** Thermal zones (rising chi) */
  thermals: ThermalZone[];

  /** Wind corridors between structures */
  windCorridors: WindCorridor[];

  /** Aerial Sha Qi lines */
  aerialShaQi: AerialShaQi[];

  /** Quality perching spots */
  perchingSpots: PerchingSpot[];

  /** Volumetric element balance */
  elementBalance: VolumetricElementBalance;

  /** All identified issues */
  issues: AerialHarmonyIssue[];

  /** Best flight altitude for this area */
  optimalFlightAltitude: number;

  /** Recommended flight paths (as waypoint sequences) */
  recommendedPaths: AerialPosition[][];

  /** Analysis metadata */
  analyzedAt: number; // Tick
  analyzedBy?: string; // Agent ID who analyzed (for skill tracking)

  /** Area covered by this analysis */
  areaBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Get harmony level from score.
 */
export function getAerialHarmonyLevel(score: number): AerialHarmonyLevel {
  if (score >= 81) return 'sublime';
  if (score >= 61) return 'favorable';
  if (score >= 41) return 'calm';
  if (score >= 21) return 'turbulent';
  return 'treacherous';
}

/**
 * Create an empty element distribution.
 */
function createEmptyElementDistribution(): ElementDistribution {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

/**
 * Create an AerialHarmonyComponent with analysis results.
 */
export function createAerialHarmonyComponent(
  harmonyScore: number,
  thermals: ThermalZone[],
  windCorridors: WindCorridor[],
  aerialShaQi: AerialShaQi[],
  perchingSpots: PerchingSpot[],
  elementBalance: VolumetricElementBalance,
  issues: AerialHarmonyIssue[],
  optimalFlightAltitude: number,
  recommendedPaths: AerialPosition[][],
  areaBounds: AerialHarmonyComponent['areaBounds'],
  analyzedAt: number,
  analyzedBy?: string
): AerialHarmonyComponent {
  return {
    type: 'aerial_harmony',
    version: 1,
    harmonyScore: Math.max(0, Math.min(100, Math.round(harmonyScore))),
    harmonyLevel: getAerialHarmonyLevel(harmonyScore),
    thermals,
    windCorridors,
    aerialShaQi,
    perchingSpots,
    elementBalance,
    issues,
    optimalFlightAltitude,
    recommendedPaths,
    areaBounds,
    analyzedAt,
    analyzedBy,
  };
}

/**
 * Create a default (empty) AerialHarmonyComponent.
 */
export function createDefaultAerialHarmonyComponent(
  areaBounds: AerialHarmonyComponent['areaBounds'],
  analyzedAt: number
): AerialHarmonyComponent {
  return createAerialHarmonyComponent(
    50, // Neutral score
    [],
    [],
    [],
    [],
    {
      byAltitude: {
        ground: createEmptyElementDistribution(),
        canopy: createEmptyElementDistribution(),
        flying: createEmptyElementDistribution(),
        high: createEmptyElementDistribution(),
      },
      isBalanced: true,
      dominantElement: 'none',
    },
    [],
    5, // Default flying altitude
    [],
    areaBounds,
    analyzedAt
  );
}

/**
 * Get deficient and excessive elements from balance.
 */
export function getElementImbalances(
  balance: VolumetricElementBalance
): { deficient?: string; excessive?: string } {
  const totals = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  // Sum across all altitudes
  for (const altitude of Object.values(balance.byAltitude)) {
    totals.wood += altitude.wood;
    totals.fire += altitude.fire;
    totals.earth += altitude.earth;
    totals.metal += altitude.metal;
    totals.water += altitude.water;
  }

  const values = Object.entries(totals);
  const total = values.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return {};

  const avg = total / 5;
  let minEl: string | undefined;
  let maxEl: string | undefined;
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const [el, val] of values) {
    if (val < minVal) {
      minVal = val;
      minEl = el;
    }
    if (val > maxVal) {
      maxVal = val;
      maxEl = el;
    }
  }

  return {
    deficient: minVal < avg * 0.3 ? minEl : undefined,
    excessive: maxVal > avg * 2 ? maxEl : undefined,
  };
}
