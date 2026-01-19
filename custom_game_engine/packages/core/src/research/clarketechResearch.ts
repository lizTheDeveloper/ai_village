/**
 * Clarketech Research Definitions
 *
 * Advanced technologies (Tier 6-8) that integrate with the existing research system.
 * Named after Arthur C. Clarke's Third Law: "Any sufficiently advanced technology
 * is indistinguishable from magic."
 *
 * Prerequisites from existing tech tree:
 * - Tier 6 requires: experimental_research, machinery_ii, genetics_ii
 * - Tier 7 requires: Tier 6 clarketech
 * - Tier 8 requires: Tier 7 clarketech
 */

import type { ResearchDefinition } from './types.js';
import { ResearchRegistry } from './ResearchRegistry.js';
import researchData from '../../data/research/clarketech.json';

/**
 * Load clarketech research from JSON data
 */
function loadClarketechResearch(): ResearchDefinition[] {
  if (!Array.isArray(researchData)) {
    throw new Error('Failed to load clarketech research: data is not an array');
  }
  return researchData as ResearchDefinition[];
}

/**
 * Clarketech research definitions.
 * These are registered with the main ResearchRegistry on initialization.
 */
export const CLARKETECH_RESEARCH: ResearchDefinition[] = loadClarketechResearch();

/**
 * Register all clarketech research with the ResearchRegistry.
 * Should be called after registerDefaultResearch() since clarketech
 * has prerequisites from the default tech tree.
 */
export function registerClarketechResearch(): void {
  const registry = ResearchRegistry.getInstance();

  for (const research of CLARKETECH_RESEARCH) {
    registry.register(research);
  }
}

/**
 * Get the tier label for clarketech tiers
 */
export function getClarketechTierLabel(tier: number): string {
  switch (tier) {
    case 6:
      return 'Near Future';
    case 7:
      return 'Far Future';
    case 8:
      return 'Transcendent';
    default:
      return `Tier ${tier}`;
  }
}

/**
 * Check if a research ID is clarketech
 */
export function isClarketechResearch(researchId: string): boolean {
  return CLARKETECH_RESEARCH.some((r) => r.id === researchId);
}

/**
 * Get clarketech tier from research ID (returns undefined if not clarketech)
 */
export function getClarketechTier(researchId: string): number | undefined {
  const research = CLARKETECH_RESEARCH.find((r) => r.id === researchId);
  return research?.tier;
}
