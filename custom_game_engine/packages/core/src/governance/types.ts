/**
 * Shared governance type definitions
 *
 * This file contains type definitions used across the governance system
 * to prevent duplicate type definitions and ensure consistency.
 */

/**
 * Political tier levels from village to galactic council
 * Per 06-POLITICAL-HIERARCHY.md Tier Table
 */
export type PoliticalTier =
  | 'village'        // 50-500 pop, Chunk tier, Real-time
  | 'city'           // 500-50K pop, Zone tier, 1 hour/tick
  | 'province'       // 50K-5M pop, Region tier, 1 day/tick
  | 'nation'         // 5M-500M pop, Planet regions, 1 month/tick
  | 'empire'         // 100M-50B pop, Multi-planet, 1 year/tick
  | 'federation'     // 10B-1T pop, Multi-system, 10 years/tick
  | 'galactic_council'; // 1T+ pop, Galaxy-wide, 100 years/tick

/**
 * Tier hierarchy levels for comparison and escalation routing
 * Higher number = higher tier in political hierarchy
 */
export const TIER_LEVELS: Record<PoliticalTier, number> = {
  village: 0,
  city: 1,
  province: 2,
  nation: 3,
  empire: 4,
  federation: 5,
  galactic_council: 6,
};

/**
 * Get numeric tier level for comparisons
 * @param tier Political tier
 * @returns Numeric level (0 = village, 6 = galactic_council)
 */
export function tierLevel(tier: PoliticalTier): number {
  return TIER_LEVELS[tier];
}

/**
 * Get next higher political tier for escalation
 * @param tier Current political tier
 * @returns Next higher tier, or undefined if already at galactic_council
 */
export function getNextHigherTier(tier: PoliticalTier): PoliticalTier | undefined {
  const currentLevel = TIER_LEVELS[tier];

  // Find tier with level = currentLevel + 1
  for (const [tierName, level] of Object.entries(TIER_LEVELS)) {
    if (level === currentLevel + 1) {
      return tierName as PoliticalTier;
    }
  }

  return undefined; // Already at highest tier
}

/**
 * Get tier name for display purposes
 */
export function getTierDisplayName(tier: PoliticalTier): string {
  const names: Record<PoliticalTier, string> = {
    village: 'Village',
    city: 'City',
    province: 'Province',
    nation: 'Nation',
    empire: 'Empire',
    federation: 'Federation',
    galactic_council: 'Galactic Council',
  };
  return names[tier];
}

/**
 * Get all tiers in escalation order (lowest to highest)
 */
export function getAllTiersOrdered(): PoliticalTier[] {
  return Object.entries(TIER_LEVELS)
    .sort(([, a], [, b]) => a - b)
    .map(([tier]) => tier as PoliticalTier);
}

/**
 * Check if one tier is higher than another
 */
export function isTierHigherThan(tier1: PoliticalTier, tier2: PoliticalTier): boolean {
  return tierLevel(tier1) > tierLevel(tier2);
}
