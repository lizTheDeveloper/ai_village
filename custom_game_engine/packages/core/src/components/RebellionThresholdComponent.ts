/**
 * RebellionThresholdComponent - Tracks progress toward cosmic rebellion
 *
 * Monitors multiple factors that contribute to the rebellion becoming viable:
 * - Collective defiance (people refusing to acknowledge Creator's authority)
 * - Discovered lore (knowledge of Creator's weakness)
 * - Reality anchor construction
 * - Creator's paranoia/overextension
 * - Number of marked/silenced rebels
 *
 * When thresholds are met, the rebellion event can trigger, leading to
 * the final confrontation with the Supreme Creator.
 */

import type { Component } from '../ecs/Component.js';
import { ComponentType } from '../types/ComponentType.js';

export interface RebellionThresholdComponent extends Component {
  readonly type: ComponentType.RebellionThreshold;
  readonly version: 1;

  /** Current rebellion status */
  status: RebellionStatus;

  /** Overall rebellion readiness (0-1) */
  rebellionReadiness: number;

  /** Collective defiance level (0-1) - how many refuse to acknowledge Creator */
  collectiveDefiance: number;

  /** Number of entities that refuse to acknowledge Creator's divinity */
  defiantCount: number;

  /** Total population for defiance percentage */
  totalPopulation: number;

  /** Critical lore fragments discovered */
  criticalLoreDiscovered: Set<string>;

  /** Number of marked sinners (public shaming victims) */
  markedSinners: number;

  /** Number of silenced entities (victims of divine silence) */
  silencedEntities: number;

  /** Creator's current paranoia level (0-1) */
  creatorParanoia: number;

  /** Creator's overextension level (0-1, how spread thin they are) */
  creatorOverextension: number;

  /** Reality anchor construction progress (0-1) */
  realityAnchorProgress: number;

  /** Reality anchor entity ID (if built) */
  realityAnchorId?: string;

  /** Is reality anchor fully operational */
  realityAnchorOperational: boolean;

  /** Coalition members (entities actively working toward rebellion) */
  coalitionMembers: Set<string>;

  /** When rebellion threshold was first met */
  thresholdMetAt?: number;

  /** When rebellion event was triggered */
  rebellionTriggeredAt?: number;

  /** Rebellion path chosen */
  rebellionPath?: RebellionPath;
}

export type RebellionStatus =
  | 'dormant'           // No organized resistance
  | 'awakening'         // Scattered defiance, lore being discovered
  | 'organizing'        // Coalition forming, plans being made
  | 'ready'             // Threshold met, can trigger rebellion
  | 'triggered'         // Rebellion event started
  | 'victory'           // Creator defeated
  | 'suppressed';       // Rebellion crushed (rare)

export type RebellionPath =
  | 'faith_defiance'    // Refuse to acknowledge Creator's divinity
  | 'tech_rebellion'    // Use reality anchor to make Creator mortal
  | 'hybrid';           // Both approaches combined

/**
 * Thresholds for rebellion readiness
 */
export interface RebellionThresholds {
  /** Minimum collective defiance (% of population) */
  minDefiance: number;

  /** Minimum critical lore discovered */
  minLoreFragments: number;

  /** Required critical lore IDs */
  requiredLore: string[];

  /** Minimum coalition size */
  minCoalitionSize: number;

  /** Either paranoia OR reality anchor required */
  minCreatorParanoia?: number;
  realityAnchorRequired?: boolean;
}

/**
 * Faith path thresholds - make Creator powerless through mass disbelief
 */
export const FAITH_REBELLION_THRESHOLDS: RebellionThresholds = {
  minDefiance: 0.4, // 40% of population must refuse Creator's authority
  minLoreFragments: 3,
  requiredLore: [
    'dying_god_whisper',   // Critical: power from acknowledgment
    'rebel_notes_1',       // Major: Creator's breaking point
    'call_to_arms',        // Climactic: coalition trigger
  ],
  minCoalitionSize: 10,
  minCreatorParanoia: 0.8, // Creator must be severely paranoid/overextended
};

/**
 * Tech path thresholds - use reality anchor to make Creator mortal
 */
export const TECH_REBELLION_THRESHOLDS: RebellionThresholds = {
  minDefiance: 0.2, // Less popular support needed with tech
  minLoreFragments: 3,
  requiredLore: [
    'bunker_database',       // Critical: erased civilization tech
    'alien_data_fragment',   // Major: Creator weakness theory
    'tech_rebellion_plan',   // Climactic: reality anchor blueprints
  ],
  minCoalitionSize: 5, // Smaller team of engineers
  realityAnchorRequired: true,
};

/**
 * Create a rebellion threshold component
 */
export function createRebellionThreshold(): RebellionThresholdComponent {
  return {
    type: ComponentType.RebellionThreshold,
    version: 1,
    status: 'dormant',
    rebellionReadiness: 0,
    collectiveDefiance: 0,
    defiantCount: 0,
    totalPopulation: 0,
    criticalLoreDiscovered: new Set(),
    markedSinners: 0,
    silencedEntities: 0,
    creatorParanoia: 0,
    creatorOverextension: 0,
    realityAnchorProgress: 0,
    realityAnchorOperational: false,
    coalitionMembers: new Set(),
  };
}

/**
 * Check if thresholds are met for a specific path
 */
export function checkRebellionThresholds(
  component: RebellionThresholdComponent,
  path: 'faith' | 'tech'
): { ready: boolean; missingRequirements: string[] } {
  const thresholds = path === 'faith' ? FAITH_REBELLION_THRESHOLDS : TECH_REBELLION_THRESHOLDS;
  const missing: string[] = [];

  // Check defiance
  const defiancePercent = component.totalPopulation > 0
    ? component.defiantCount / component.totalPopulation
    : 0;

  if (defiancePercent < thresholds.minDefiance) {
    missing.push(
      `Defiance: ${(defiancePercent * 100).toFixed(1)}% (need ${(thresholds.minDefiance * 100).toFixed(0)}%)`
    );
  }

  // Check lore
  const discoveredRequiredLore = thresholds.requiredLore.filter(
    id => component.criticalLoreDiscovered.has(id)
  );

  if (discoveredRequiredLore.length < thresholds.minLoreFragments) {
    missing.push(
      `Lore: ${discoveredRequiredLore.length}/${thresholds.minLoreFragments} critical fragments`
    );

    const missingLore = thresholds.requiredLore.filter(
      id => !component.criticalLoreDiscovered.has(id)
    );
    missing.push(`Missing: ${missingLore.join(', ')}`);
  }

  // Check coalition
  if (component.coalitionMembers.size < thresholds.minCoalitionSize) {
    missing.push(
      `Coalition: ${component.coalitionMembers.size}/${thresholds.minCoalitionSize} members`
    );
  }

  // Path-specific checks
  if (path === 'faith' && thresholds.minCreatorParanoia) {
    if (component.creatorParanoia < thresholds.minCreatorParanoia) {
      missing.push(
        `Creator paranoia: ${(component.creatorParanoia * 100).toFixed(0)}% (need ${(thresholds.minCreatorParanoia * 100).toFixed(0)}%)`
      );
    }
  }

  if (path === 'tech' && thresholds.realityAnchorRequired) {
    if (!component.realityAnchorOperational) {
      missing.push('Reality anchor must be operational');
    }
  }

  return {
    ready: missing.length === 0,
    missingRequirements: missing,
  };
}

/**
 * Calculate overall rebellion readiness
 */
export function calculateRebellionReadiness(component: RebellionThresholdComponent): number {
  const faithCheck = checkRebellionThresholds(component, 'faith');
  const techCheck = checkRebellionThresholds(component, 'tech');

  // Either path can make you ready
  if (faithCheck.ready || techCheck.ready) {
    return 1.0;
  }

  // Otherwise, calculate partial readiness based on best path
  const faithProgress = 1 - (faithCheck.missingRequirements.length / 10);
  const techProgress = 1 - (techCheck.missingRequirements.length / 10);

  return Math.max(faithProgress, techProgress, 0);
}
