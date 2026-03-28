/**
 * CulturalDriftComponent — tracks a Norn's cultural region assignment.
 *
 * Per CLAUDE.md:
 *   - Component types use lowercase_with_underscores
 *   - NO silent fallbacks
 */

import type { Component } from '../ecs/Component.js';

/**
 * Cultural region identifier — derived from z-level as "deck".
 * Each z-level range maps to a distinct cultural region.
 */
export type CulturalRegionId = string; // e.g., 'deck_surface', 'deck_underground', 'deck_above'

/**
 * Per-Norn cultural tracking.
 */
export interface CulturalDriftComponent extends Component {
  type: 'cultural_drift';

  /** Current cultural region (derived from most-visited z-level) */
  primaryRegion: CulturalRegionId;

  /** Visit history: region → visit count (updated each time Norn moves) */
  regionVisits: Record<string, number>;

  /** Total visits tracked (for computing primary region threshold) */
  totalVisits: number;

  /** Tick when the Norn last moved to a different region */
  lastRegionChangeTick: number;

  /** Whether this Norn is currently in a "foreign" region */
  inForeignRegion: boolean;
}

/**
 * Per-region cultural state — attached to region-tracking entities.
 */
export interface CulturalRegionStateComponent extends Component {
  type: 'cultural_region_state';

  /** Region identifier */
  regionId: CulturalRegionId;

  /** Word usage preferences for this region: word → weight */
  wordPreferences: Record<string, number>;

  /** Ritual IDs practiced primarily in this region */
  regionalRituals: string[];

  /** Number of Norns whose primary region is this one */
  populationCount: number;

  /** Tick of last drift evaluation */
  lastDriftTick: number;
}

/**
 * Derive a cultural region ID from a z-level.
 */
export function regionFromZLevel(z: number): CulturalRegionId {
  if (z < -10) return 'deck_deep_underground';
  if (z < 0) return 'deck_underground';
  if (z === 0) return 'deck_surface';
  if (z <= 10) return 'deck_above';
  return 'deck_high';
}

/**
 * Create a default cultural drift component for a Norn.
 */
export function createCulturalDrift(initialRegion: CulturalRegionId): CulturalDriftComponent {
  if (!initialRegion) {
    throw new Error('Cannot create cultural drift: missing initialRegion');
  }
  return {
    type: 'cultural_drift',
    version: 1,
    primaryRegion: initialRegion,
    regionVisits: { [initialRegion]: 1 },
    totalVisits: 1,
    lastRegionChangeTick: 0,
    inForeignRegion: false,
  };
}

/**
 * Create a default cultural region state.
 */
export function createCulturalRegionState(regionId: CulturalRegionId): CulturalRegionStateComponent {
  if (!regionId) {
    throw new Error('Cannot create cultural region state: missing regionId');
  }
  return {
    type: 'cultural_region_state',
    version: 1,
    regionId,
    wordPreferences: {},
    regionalRituals: [],
    populationCount: 0,
    lastDriftTick: 0,
  };
}
