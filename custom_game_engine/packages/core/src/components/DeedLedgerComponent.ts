/**
 * DeedLedgerComponent - Neutral record of an agent's actions
 *
 * This is NOT a karma/morality system. It's a factual ledger of what happened.
 * Different deities interpret the ledger differently based on their values.
 *
 * Example: "Killed an enemy soldier"
 * - War god sees: +bravery, +combat_victory
 * - Peace deity sees: -killing, -violence
 * - Justice god sees: depends on context (was it lawful?)
 *
 * The ledger just records: { category: 'killing_enemy', count: 1 }
 */

import type { Component } from '../ecs/Component.js';
import type { DeedCategory, DeedWeight, JudgmentTier } from '../divinity/AfterlifePolicy.js';

// ============================================================================
// Deed Entry
// ============================================================================

/** A single recorded deed */
export interface DeedEntry {
  /** Deed category for evaluation */
  category: DeedCategory;

  /** Custom category name if category is 'custom' */
  customName?: string;

  /** Brief description of what happened */
  description: string;

  /** Game tick when deed occurred */
  tick: number;

  /** Entity ID of target (if applicable) */
  targetId?: string;

  /** Location where deed occurred */
  location?: { x: number; y: number };

  /** Additional context for evaluation */
  context?: Record<string, unknown>;

  /** Magnitude/severity (1 = normal, higher = more significant) */
  magnitude: number;
}

/** Aggregated deed counts by category */
export type DeedCounts = Partial<Record<DeedCategory, number>>;

/** Custom deed counts (for custom categories) */
export type CustomDeedCounts = Record<string, number>;

// ============================================================================
// Component Interface
// ============================================================================

/** Component tracking an agent's deeds for afterlife judgment */
export interface DeedLedgerComponent extends Component {
  type: 'deed_ledger';

  // =========================================================================
  // Recent Deeds (detailed, limited history)
  // =========================================================================

  /** Recent deed entries with full detail */
  recentDeeds: DeedEntry[];

  /** Maximum recent deeds to keep */
  maxRecentDeeds: number;

  // =========================================================================
  // Aggregated Counts (lifetime totals)
  // =========================================================================

  /** Lifetime deed counts by category */
  lifetimeCounts: DeedCounts;

  /** Lifetime custom deed counts */
  customCounts: CustomDeedCounts;

  /** Weighted magnitude sums (for severity-aware counting) */
  lifetimeMagnitudes: DeedCounts;

  // =========================================================================
  // Special Tracking
  // =========================================================================

  /** Number of oaths sworn */
  oathsSworn: number;

  /** Number of oaths kept */
  oathsKept: number;

  /** Number of oaths broken */
  oathsBroken: number;

  /** Entity IDs of kin killed */
  kinSlain: string[];

  /** Major betrayals (target ID -> description) */
  betrayals: Map<string, string>;

  /** Major acts of loyalty (target ID -> description) */
  loyalties: Map<string, string>;

  // =========================================================================
  // Death Context
  // =========================================================================

  /** How the agent died (set on death) */
  deathCircumstances?: {
    cause: string;
    diedInBattle: boolean;
    diedProtectingOthers: boolean;
    diedFleeing: boolean;
    diedWithHonor: boolean;
    lastWords?: string;
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new DeedLedgerComponent
 */
export function createDeedLedgerComponent(
  options?: {
    maxRecentDeeds?: number;
  }
): DeedLedgerComponent {
  return {
    type: 'deed_ledger',
    version: 1,
    recentDeeds: [],
    maxRecentDeeds: options?.maxRecentDeeds ?? 50,
    lifetimeCounts: {},
    customCounts: {},
    lifetimeMagnitudes: {},
    oathsSworn: 0,
    oathsKept: 0,
    oathsBroken: 0,
    kinSlain: [],
    betrayals: new Map(),
    loyalties: new Map(),
  };
}

// ============================================================================
// Deed Recording Functions
// ============================================================================

/**
 * Record a deed in the ledger
 */
export function recordDeed(
  ledger: DeedLedgerComponent,
  deed: Omit<DeedEntry, 'magnitude'> & { magnitude?: number }
): DeedLedgerComponent {
  const fullDeed: DeedEntry = {
    ...deed,
    magnitude: deed.magnitude ?? 1,
  };

  // Add to recent deeds (with limit)
  const recentDeeds = [fullDeed, ...ledger.recentDeeds].slice(0, ledger.maxRecentDeeds);

  // Update lifetime counts
  const lifetimeCounts = { ...ledger.lifetimeCounts };
  const lifetimeMagnitudes = { ...ledger.lifetimeMagnitudes };
  const customCounts = { ...ledger.customCounts };

  if (deed.category === 'custom' && deed.customName) {
    customCounts[deed.customName] = (customCounts[deed.customName] ?? 0) + 1;
  } else {
    lifetimeCounts[deed.category] = (lifetimeCounts[deed.category] ?? 0) + 1;
    lifetimeMagnitudes[deed.category] = (lifetimeMagnitudes[deed.category] ?? 0) + fullDeed.magnitude;
  }

  return {
    ...ledger,
    recentDeeds,
    lifetimeCounts,
    lifetimeMagnitudes,
    customCounts,
  };
}

/**
 * Record an oath sworn
 */
export function recordOathSworn(ledger: DeedLedgerComponent): DeedLedgerComponent {
  return {
    ...ledger,
    oathsSworn: ledger.oathsSworn + 1,
  };
}

/**
 * Record an oath kept
 */
export function recordOathKept(ledger: DeedLedgerComponent, tick: number): DeedLedgerComponent {
  return recordDeed(
    { ...ledger, oathsKept: ledger.oathsKept + 1 },
    {
      category: 'oath_keeping',
      description: 'Fulfilled a sworn oath',
      tick,
    }
  );
}

/**
 * Record an oath broken
 */
export function recordOathBroken(ledger: DeedLedgerComponent, tick: number, description?: string): DeedLedgerComponent {
  return recordDeed(
    { ...ledger, oathsBroken: ledger.oathsBroken + 1 },
    {
      category: 'oath_breaking',
      description: description ?? 'Broke a sworn oath',
      tick,
      magnitude: 2, // Oath-breaking is significant
    }
  );
}

/**
 * Record killing of kin
 */
export function recordKinslaying(
  ledger: DeedLedgerComponent,
  kinId: string,
  tick: number,
  description?: string
): DeedLedgerComponent {
  return recordDeed(
    { ...ledger, kinSlain: [...ledger.kinSlain, kinId] },
    {
      category: 'killing_kin',
      description: description ?? 'Killed a family member',
      tick,
      targetId: kinId,
      magnitude: 5, // Kinslaying is very significant
    }
  );
}

/**
 * Record a betrayal
 */
export function recordBetrayal(
  ledger: DeedLedgerComponent,
  targetId: string,
  tick: number,
  description: string
): DeedLedgerComponent {
  const betrayals = new Map(ledger.betrayals);
  betrayals.set(targetId, description);

  return recordDeed(
    { ...ledger, betrayals },
    {
      category: 'betrayal',
      description,
      tick,
      targetId,
      magnitude: 3,
    }
  );
}

/**
 * Record an act of loyalty
 */
export function recordLoyalty(
  ledger: DeedLedgerComponent,
  targetId: string,
  tick: number,
  description: string
): DeedLedgerComponent {
  const loyalties = new Map(ledger.loyalties);
  loyalties.set(targetId, description);

  return recordDeed(
    { ...ledger, loyalties },
    {
      category: 'loyalty',
      description,
      tick,
      targetId,
      magnitude: 2,
    }
  );
}

/**
 * Record death circumstances
 */
export function recordDeathCircumstances(
  ledger: DeedLedgerComponent,
  circumstances: DeedLedgerComponent['deathCircumstances']
): DeedLedgerComponent {
  return {
    ...ledger,
    deathCircumstances: circumstances,
  };
}

// ============================================================================
// Evaluation Functions
// ============================================================================

/**
 * Calculate a deed score based on deity's weights
 *
 * @param ledger - The deed ledger to evaluate
 * @param weights - The deity's deed weights
 * @param useMagnitude - Whether to use magnitude-weighted counts
 * @returns Total score (positive = favorable, negative = unfavorable)
 */
export function calculateDeedScore(
  ledger: DeedLedgerComponent,
  weights: DeedWeight[],
  useMagnitude: boolean = true
): number {
  let score = 0;
  const counts = useMagnitude ? ledger.lifetimeMagnitudes : ledger.lifetimeCounts;

  for (const weight of weights) {
    if (weight.category === 'custom' && weight.customName) {
      const count = ledger.customCounts[weight.customName] ?? 0;
      score += count * weight.weight;
    } else {
      const count = counts[weight.category] ?? 0;
      score += count * weight.weight;
    }
  }

  return score;
}

/**
 * Determine judgment tier based on score and thresholds
 */
export function getJudgmentTier(
  score: number,
  thresholds: {
    exemplary: number;
    favorable: number;
    unfavorable: number;
    condemned: number;
  }
): JudgmentTier {
  if (score >= thresholds.exemplary) return 'exemplary';
  if (score >= thresholds.favorable) return 'favorable';
  if (score <= thresholds.condemned) return 'condemned';
  if (score <= thresholds.unfavorable) return 'unfavorable';
  return 'neutral';
}

/**
 * Get a summary of the ledger for display
 */
export function getLedgerSummary(ledger: DeedLedgerComponent): string {
  const lines: string[] = [];

  // Oath status
  if (ledger.oathsSworn > 0) {
    lines.push(`Oaths: ${ledger.oathsKept}/${ledger.oathsSworn} kept, ${ledger.oathsBroken} broken`);
  }

  // Notable deeds
  const notable = Object.entries(ledger.lifetimeCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (notable.length > 0) {
    lines.push('Notable deeds: ' + notable.map(([cat, count]) => `${cat}(${count})`).join(', '));
  }

  // Kinslaying
  if (ledger.kinSlain.length > 0) {
    lines.push(`Kinslayer: ${ledger.kinSlain.length} kin slain`);
  }

  // Betrayals
  if (ledger.betrayals.size > 0) {
    lines.push(`Betrayals: ${ledger.betrayals.size}`);
  }

  return lines.join('\n') || 'No notable deeds recorded';
}
