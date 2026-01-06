/**
 * DeityRelations - Rivalry and alliance mechanics between gods
 *
 * Phase 4: Basic rivalry system allowing gods to form relationships,
 * compete for believers, and engage in divine politics.
 */

import type { DivineDomain } from './DeityTypes.js';

// ============================================================================
// Relationship Types
// ============================================================================

/** Status of a relationship between deities */
export type RelationshipStatus =
  | 'allied'          // Working together
  | 'friendly'        // Positive but not allied
  | 'neutral'         // No strong feeling
  | 'competitive'     // Healthy competition
  | 'hostile'         // Active rivalry
  | 'war';            // Open conflict

/** Sentiment toward another deity */
export interface DeityRelation {
  /** Deity ID this relation is about */
  otherDeityId: string;

  /** Current status */
  status: RelationshipStatus;

  /** Sentiment (-1 hostile to 1 friendly) */
  sentiment: number;

  /** How strong the feeling is (0-1) */
  intensity: number;

  /** Reason for this relationship */
  reasons: string[];

  /** Historical interactions */
  interactions: RelationshipEvent[];

  /** When relationship was established */
  establishedAt: number;

  /** Last interaction time */
  lastInteraction?: number;
}

/** An event in the relationship history */
export interface RelationshipEvent {
  type: 'cooperation' | 'conflict' | 'betrayal' | 'assistance' | 'provocation' | 'reconciliation';
  description: string;
  sentimentImpact: number; // Change to sentiment
  timestamp: number;
}

// ============================================================================
// Rivalry Detection
// ============================================================================

/** Reasons deities might become rivals */
export type RivalryReason =
  | 'domain_overlap'      // Both claim same domain
  | 'believer_competition' // Competing for same believers
  | 'ideological'         // Opposing values/personalities
  | 'territorial'         // Want same sacred sites
  | 'historical_grievance' // Past conflict
  | 'prophesied';         // Prophecy says they must oppose

/** Factors that create rivalry */
export interface RivalryFactors {
  /** How much their domains overlap (0-1) */
  domainOverlap: number;

  /** How many believers they're competing for */
  sharedBelieverPool: number;

  /** How opposed their personalities are (0-1) */
  personalityConflict: number;

  /** Whether they want the same sacred sites */
  territorialConflict: boolean;

  /** Past conflicts */
  historicalConflicts: number;
}

/** Reasons deities might become allies */
export type AllianceReason =
  | 'complementary_domains' // Domains work well together
  | 'common_enemy'         // Both oppose the same deity
  | 'similar_values'       // Similar personalities
  | 'mutual_benefit'       // Alliance helps both
  | 'family'               // Related through mythology
  | 'prophesied';          // Prophecy says they should ally

/** Factors that create alliance */
export interface AllianceFactors {
  /** How complementary their domains are (0-1) */
  domainSynergy: number;

  /** Common enemies */
  commonRivals: string[];

  /** How similar their personalities are (0-1) */
  personalityAlignment: number;

  /** Mutual benefits */
  mutualBenefits: string[];
}

// ============================================================================
// Relationship Functions
// ============================================================================

/**
 * Calculate initial relationship between two deities
 */
export function calculateInitialRelationship(
  deity1: {
    id: string;
    domain: DivineDomain;
    secondaryDomains: DivineDomain[];
    personality: {
      benevolence: number;
      interventionism: number;
      wrathfulness: number;
    };
  },
  deity2: {
    id: string;
    domain: DivineDomain;
    secondaryDomains: DivineDomain[];
    personality: {
      benevolence: number;
      interventionism: number;
      wrathfulness: number;
    };
  }
): DeityRelation {
  // Calculate domain overlap
  const domains1 = new Set([deity1.domain, ...deity1.secondaryDomains]);
  const domains2 = new Set([deity2.domain, ...deity2.secondaryDomains]);

  const overlap = [...domains1].filter(d => domains2.has(d)).length;
  const domainOverlap = overlap / Math.max(domains1.size, domains2.size);

  // Calculate personality conflict
  const benevolenceConflict = Math.abs(deity1.personality.benevolence - deity2.personality.benevolence);
  const interventionConflict = Math.abs(deity1.personality.interventionism - deity2.personality.interventionism);
  const personalityConflict = (benevolenceConflict + interventionConflict) / 2;

  // Calculate domain synergy
  const domainSynergy = calculateDomainSynergy(deity1.domain, deity2.domain);

  // Determine initial sentiment
  let sentiment = 0;

  // Domain overlap creates competition (-0.5)
  if (domainOverlap > 0.5) {
    sentiment -= 0.5 * domainOverlap;
  }

  // Domain synergy creates cooperation (+0.3)
  if (domainSynergy > 0.5) {
    sentiment += 0.3 * domainSynergy;
  }

  // Personality conflict creates hostility (-0.4)
  if (personalityConflict > 0.5) {
    sentiment -= 0.4 * personalityConflict;
  }

  // Similar personalities create friendship (+0.3)
  if (personalityConflict < 0.3) {
    sentiment += 0.3 * (1 - personalityConflict);
  }

  // Clamp to [-1, 1]
  sentiment = Math.max(-1, Math.min(1, sentiment));

  // Determine status from sentiment
  let status: RelationshipStatus;
  if (sentiment > 0.6) status = 'allied';
  else if (sentiment > 0.2) status = 'friendly';
  else if (sentiment > -0.2) status = 'neutral';
  else if (sentiment > -0.6) status = 'competitive';
  else status = 'hostile';

  // Build reasons
  const reasons: string[] = [];
  if (domainOverlap > 0.5) {
    reasons.push(`Competing for ${deity1.domain} domain`);
  }
  if (domainSynergy > 0.5) {
    reasons.push(`Complementary domains`);
  }
  if (personalityConflict > 0.5) {
    reasons.push('Opposing values');
  }
  if (personalityConflict < 0.3) {
    reasons.push('Similar worldviews');
  }

  return {
    otherDeityId: deity2.id,
    status,
    sentiment,
    intensity: Math.abs(sentiment),
    reasons,
    interactions: [],
    establishedAt: Date.now(),
  };
}

/**
 * Calculate how well two domains work together
 */
export function calculateDomainSynergy(domain1: DivineDomain, domain2: DivineDomain): number {
  // Define domain synergies
  const synergies: Record<DivineDomain, DivineDomain[]> = {
    harvest: ['nature', 'sky', 'water', 'earth'],
    war: ['death', 'fire', 'storm'],
    wisdom: ['time', 'mystery', 'craft'],
    craft: ['fire', 'earth', 'wisdom'],
    nature: ['earth', 'water', 'sky', 'harvest'],
    death: ['time', 'war', 'dreams'],
    love: ['beauty', 'home'],
    chaos: ['storm', 'trickery', 'fire'],
    order: ['justice', 'time', 'wisdom'],
    fortune: ['trade', 'travel'],
    protection: ['home', 'order', 'justice'],
    healing: ['nature', 'water', 'home'],
    mystery: ['dreams', 'wisdom', 'chaos'],
    time: ['death', 'wisdom', 'order'],
    sky: ['storm', 'nature', 'harvest'],
    earth: ['nature', 'craft', 'harvest'],
    water: ['nature', 'healing', 'harvest'],
    fire: ['craft', 'war', 'storm'],
    storm: ['sky', 'war', 'chaos'],
    hunt: ['nature', 'war'],
    home: ['healing', 'protection', 'love'],
    travel: ['trade', 'fortune'],
    trade: ['fortune', 'travel', 'craft'],
    justice: ['order', 'protection'],
    vengeance: ['war', 'justice'],
    dreams: ['mystery', 'death', 'time'],
    fear: ['death', 'chaos'],
    beauty: ['love', 'craft'],
    trickery: ['chaos', 'fortune'],
  };

  const synergisticWith = synergies[domain1] || [];
  return synergisticWith.includes(domain2) ? 0.8 : 0.2;
}

/**
 * Calculate rivalry factors between two deities
 */
export function calculateRivalryFactors(
  deity1: {
    id: string;
    domain: DivineDomain;
    secondaryDomains: DivineDomain[];
    personality: {
      benevolence: number;
      interventionism: number;
      wrathfulness: number;
    };
    believers: Set<string>;
  },
  deity2: {
    id: string;
    domain: DivineDomain;
    secondaryDomains: DivineDomain[];
    personality: {
      benevolence: number;
      interventionism: number;
      wrathfulness: number;
    };
    believers: Set<string>;
  },
  relation?: DeityRelation
): RivalryFactors {
  // Domain overlap
  const domains1 = new Set([deity1.domain, ...deity1.secondaryDomains]);
  const domains2 = new Set([deity2.domain, ...deity2.secondaryDomains]);
  const overlap = [...domains1].filter(d => domains2.has(d)).length;
  const domainOverlap = overlap / Math.max(domains1.size, domains2.size);

  // Shared believer pool - count believers who worship both deities
  const sharedBelievers = [...deity1.believers].filter(id => deity2.believers.has(id));
  const sharedBelieverPool = sharedBelievers.length;

  // Personality conflict
  const benevolenceConflict = Math.abs(deity1.personality.benevolence - deity2.personality.benevolence);
  const interventionConflict = Math.abs(deity1.personality.interventionism - deity2.personality.interventionism);
  const wrathfulnessSum = deity1.personality.wrathfulness + deity2.personality.wrathfulness;

  const personalityConflict = (benevolenceConflict + interventionConflict + wrathfulnessSum * 0.5) / 3;

  // Territorial conflict - infer from domain overlap and shared believers
  // Gods with overlapping domains and shared believers likely compete for the same sacred sites
  const territorialConflict = domainOverlap > 0.5 && sharedBelieverPool > 0;

  // Historical conflicts
  const historicalConflicts = relation?.interactions.filter(i => i.type === 'conflict' || i.type === 'provocation').length || 0;

  return {
    domainOverlap,
    sharedBelieverPool,
    personalityConflict,
    territorialConflict,
    historicalConflicts,
  };
}

/**
 * Calculate alliance factors between two deities
 */
export function calculateAllianceFactors(
  deity1: {
    id: string;
    domain: DivineDomain;
    secondaryDomains: DivineDomain[];
    personality: {
      benevolence: number;
      interventionism: number;
    };
  },
  deity2: {
    id: string;
    domain: DivineDomain;
    secondaryDomains: DivineDomain[];
    personality: {
      benevolence: number;
      interventionism: number;
    };
  }
): AllianceFactors {
  // Domain synergy
  const domainSynergy = calculateDomainSynergy(deity1.domain, deity2.domain);

  // Common rivals - requires access to all deity relations to compute
  // This would need to be populated by the caller with external context
  // (e.g., DeityRegistry.getCommonRivals(deity1.id, deity2.id))
  const commonRivals: string[] = [];

  // Personality alignment
  const benevolenceAlignment = 1 - Math.abs(deity1.personality.benevolence - deity2.personality.benevolence);
  const interventionAlignment = 1 - Math.abs(deity1.personality.interventionism - deity2.personality.interventionism);
  const personalityAlignment = (benevolenceAlignment + interventionAlignment) / 2;

  // Mutual benefits
  const mutualBenefits: string[] = [];
  if (domainSynergy > 0.6) {
    mutualBenefits.push('Complementary domains increase both gods\' influence');
  }
  if (personalityAlignment > 0.7) {
    mutualBenefits.push('Similar values make cooperation easy');
  }

  return {
    domainSynergy,
    commonRivals,
    personalityAlignment,
    mutualBenefits,
  };
}

/**
 * Update relationship based on an interaction
 */
export function updateRelationshipFromEvent(
  relation: DeityRelation,
  event: RelationshipEvent
): DeityRelation {
  // Add event to history
  const interactions = [...relation.interactions, event];

  // Update sentiment
  let sentiment = relation.sentiment + event.sentimentImpact;
  sentiment = Math.max(-1, Math.min(1, sentiment));

  // Update status based on new sentiment
  let status: RelationshipStatus;
  if (sentiment > 0.6) status = 'allied';
  else if (sentiment > 0.2) status = 'friendly';
  else if (sentiment > -0.2) status = 'neutral';
  else if (sentiment > -0.6) status = 'competitive';
  else if (sentiment > -0.8) status = 'hostile';
  else status = 'war';

  return {
    ...relation,
    status,
    sentiment,
    intensity: Math.abs(sentiment),
    interactions,
    lastInteraction: event.timestamp,
  };
}

/**
 * Create a default neutral relationship
 */
export function createNeutralRelationship(otherDeityId: string): DeityRelation {
  return {
    otherDeityId,
    status: 'neutral',
    sentiment: 0,
    intensity: 0,
    reasons: [],
    interactions: [],
    establishedAt: Date.now(),
  };
}
