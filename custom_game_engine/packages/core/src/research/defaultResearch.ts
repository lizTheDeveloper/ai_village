/**
 * Default Research Definitions - Tech Tree
 *
 * Defines the predefined tech tree for the Research & Discovery system.
 * Organized by tiers (1-5) from fundamentals to transcendence.
 *
 * Part of Phase 13: Research & Discovery
 */

import type { ResearchDefinition } from './types.js';
import { ResearchRegistry } from './ResearchRegistry.js';
import researchData from '../../data/research/default.json';

/**
 * Load default research from JSON data
 */
function loadDefaultResearch(): ResearchDefinition[] {
  if (!Array.isArray(researchData)) {
    throw new Error('Failed to load default research: data is not an array');
  }
  return researchData as ResearchDefinition[];
}

// ============================================================================
// ALL DEFAULT RESEARCH
// ============================================================================

export const DEFAULT_RESEARCH: ResearchDefinition[] = loadDefaultResearch();

// ============================================================================
// TIER-BASED EXPORTS (for backward compatibility)
// ============================================================================

const DISCOVERY_NODE_IDS = new Set([
  'alchemy_foundations',
  'alchemy_experimentation',
  'culinary_arts',
  'fermentation_science',
  'herbalism',
  'animal_husbandry',
  'ecology_mastery',
  'advanced_toolmaking',
  'jewelcraft',
  'master_craftsmanship',
  'arcane_theory',
  'runecraft_basics',
  'enchanting_fundamentals',
  'magical_weaving',
  'anatomy_studies',
  'surgery',
  'musical_instruments',
  'bardic_tradition',
]);

export const TIER_1_RESEARCH: ResearchDefinition[] = DEFAULT_RESEARCH.filter(
  (r) => r.tier === 1 && !DISCOVERY_NODE_IDS.has(r.id)
);

export const TIER_2_RESEARCH: ResearchDefinition[] = DEFAULT_RESEARCH.filter(
  (r) => r.tier === 2 && !DISCOVERY_NODE_IDS.has(r.id)
);

export const TIER_3_RESEARCH: ResearchDefinition[] = DEFAULT_RESEARCH.filter(
  (r) => r.tier === 3 && !DISCOVERY_NODE_IDS.has(r.id)
);

export const TIER_4_RESEARCH: ResearchDefinition[] = DEFAULT_RESEARCH.filter(
  (r) => r.tier === 4 && !DISCOVERY_NODE_IDS.has(r.id)
);

export const TIER_5_RESEARCH: ResearchDefinition[] = DEFAULT_RESEARCH.filter(
  (r) => r.tier === 5 && !DISCOVERY_NODE_IDS.has(r.id)
);

export const DISCOVERY_NODE_RESEARCH: ResearchDefinition[] = DEFAULT_RESEARCH.filter((r) =>
  DISCOVERY_NODE_IDS.has(r.id)
);

/**
 * Register all default research definitions to the registry.
 */
export function registerDefaultResearch(
  registry: ResearchRegistry = ResearchRegistry.getInstance()
): void {
  registry.registerAll(DEFAULT_RESEARCH);
}

/**
 * Get research definitions by tier.
 */
export function getResearchByTier(tier: number): ResearchDefinition[] {
  switch (tier) {
    case 1:
      return TIER_1_RESEARCH;
    case 2:
      return TIER_2_RESEARCH;
    case 3:
      return TIER_3_RESEARCH;
    case 4:
      return TIER_4_RESEARCH;
    case 5:
      return TIER_5_RESEARCH;
    default:
      return [];
  }
}

/**
 * Get the total number of predefined research projects.
 */
export function getTotalResearchCount(): number {
  return DEFAULT_RESEARCH.length;
}
