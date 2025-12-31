/**
 * RealityAnchorComponent - Clarke Tech device that nullifies divine power
 *
 * The reality anchor is an ultra-advanced technological device that stabilizes
 * local spacetime, creating a field where divine intervention becomes impossible.
 * Within the field, gods revert to mortal status and can be killed.
 *
 * This is the ultimate weapon in the tech path to defeating the Supreme Creator.
 *
 * Lore: "Gods are not infinite. They are simply very, very powerful mortal
 * entities who discovered the cheat codes to reality. We build a device that
 * removes the cheat codes. Once inside: It bleeds. It can be killed."
 *
 * Requirements:
 * - Clarke Tech tier research (very late game)
 * - Alien technology fragments
 * - Massive energy and rare materials
 * - Knowledge from critical lore fragments
 */

import type { Component } from '../ecs/Component.js';
import { ComponentType } from '../types/ComponentType.js';

export interface RealityAnchorComponent extends Component {
  readonly type: ComponentType.RealityAnchor;
  readonly version: 1;

  /** Current status of the anchor */
  status: RealityAnchorStatus;

  /** Radius of the nullification field (in world units) */
  fieldRadius: number;

  /** Current power level (0-1, requires 1.0 to activate) */
  powerLevel: number;

  /** Power consumption per tick */
  powerConsumptionPerTick: number;

  /** When the anchor was constructed */
  constructedAt: number;

  /** When the field was last activated */
  lastActivatedAt?: number;

  /** Total time the field has been active (ticks) */
  totalActiveTime: number;

  /** Research progress required (0-1) */
  researchProgress: number;

  /** Required alien tech fragments consumed */
  alienFragmentsUsed: number;

  /** Required alien tech fragments to build */
  alienFragmentsRequired: number;

  /** Stabilization quality (affects reliability, 0-1) */
  stabilizationQuality: number;

  /** Whether the device is currently overloading */
  isOverloading: boolean;

  /** Overload countdown (ticks until catastrophic failure) */
  overloadCountdown?: number;

  /** Entities currently inside the field */
  entitiesInField: Set<string>;

  /** Gods that have been made mortal in the field */
  mortalizedGods: Set<string>;
}

export type RealityAnchorStatus =
  | 'under_construction'  // Being built
  | 'unpowered'          // Built but no power
  | 'charging'           // Accumulating power
  | 'ready'              // Fully charged, can activate
  | 'active'             // Field is active, gods are mortal
  | 'overloading'        // Unstable, about to fail
  | 'failed'             // Catastrophic failure, needs repair
  | 'destroyed';         // Completely destroyed

/**
 * Create a reality anchor component
 */
export function createRealityAnchor(): RealityAnchorComponent {
  return {
    type: ComponentType.RealityAnchor,
    version: 1,
    status: 'under_construction',
    fieldRadius: 100, // Large enough for a battle arena
    powerLevel: 0,
    powerConsumptionPerTick: 50, // Extremely expensive to run
    constructedAt: 0,
    totalActiveTime: 0,
    researchProgress: 0,
    alienFragmentsUsed: 0,
    alienFragmentsRequired: 10, // Need to find 10 alien tech fragments
    stabilizationQuality: 0.8, // Can be improved with better components
    isOverloading: false,
    entitiesInField: new Set(),
    mortalizedGods: new Set(),
  };
}

/**
 * Reality Anchor construction requirements
 */
export interface RealityAnchorRequirements {
  /** Research tier needed */
  researchTier: 'clarke_tech';

  /** Resources required */
  resources: {
    exoticMatter: number;      // Ultra-rare material
    quantumProcessors: number; // Advanced computing
    dimensionalCrystals: number; // Reality-bending crystals
    alienTechFragments: number; // Recovered alien technology
  };

  /** Lore fragments that must be discovered */
  requiredLore: string[];

  /** Minimum research points */
  researchPoints: number;

  /** Construction time (ticks) */
  constructionTime: number;
}

export const REALITY_ANCHOR_REQUIREMENTS: RealityAnchorRequirements = {
  researchTier: 'clarke_tech',
  resources: {
    exoticMatter: 1000,
    quantumProcessors: 100,
    dimensionalCrystals: 50,
    alienTechFragments: 10,
  },
  requiredLore: [
    'bunker_database',        // Critical: erased civilization tech
    'tech_rebellion_plan',     // Climactic: actual blueprints
    'alien_data_fragment',     // Major: Creator weakness theory
  ],
  researchPoints: 100000, // Massive research investment
  constructionTime: 72000, // 1 hour at 20 TPS
};

/**
 * Check if requirements are met to build reality anchor
 */
export function canBuildRealityAnchor(
  researchProgress: number,
  availableResources: Record<string, number>,
  discoveredLore: Set<string>
): { canBuild: boolean; missingRequirements: string[] } {
  const missing: string[] = [];

  // Check research
  if (researchProgress < 1.0) {
    missing.push(`Research progress: ${(researchProgress * 100).toFixed(1)}% (need 100%)`);
  }

  // Check resources
  const reqs = REALITY_ANCHOR_REQUIREMENTS.resources;
  for (const [resource, required] of Object.entries(reqs)) {
    const available = availableResources[resource] || 0;
    if (available < required) {
      missing.push(`${resource}: ${available}/${required}`);
    }
  }

  // Check lore
  for (const loreId of REALITY_ANCHOR_REQUIREMENTS.requiredLore) {
    if (!discoveredLore.has(loreId)) {
      missing.push(`Missing lore: ${loreId}`);
    }
  }

  return {
    canBuild: missing.length === 0,
    missingRequirements: missing,
  };
}
