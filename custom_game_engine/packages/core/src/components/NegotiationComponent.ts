/**
 * NegotiationComponent - Tracks active diplomatic negotiations between empires/nations
 *
 * Supports various negotiation types:
 * - Treaty negotiations (trade, defense, non-aggression)
 * - Territorial disputes
 * - War peace talks
 * - Federation membership negotiations
 * - Resource sharing agreements
 *
 * Design principles:
 * - Multi-party negotiations supported
 * - LLM-driven negotiation for soul agents
 * - Timeout and deadline mechanics
 * - Counteroffer tracking
 * - Audit trail for governance history
 */

import type { Component } from '../ecs/Component.js';
import type { PoliticalTier } from '../governance/types.js';

/**
 * Types of negotiations between political entities
 */
export type NegotiationType =
  | 'trade_agreement'       // Trade treaties and tariff negotiations
  | 'defense_pact'          // Mutual defense agreements
  | 'non_aggression'        // Non-aggression pacts
  | 'territorial_exchange'  // Territory swaps or sales
  | 'peace_treaty'          // End of hostilities
  | 'federation_membership' // Joining/leaving a federation
  | 'resource_rights'       // Mining, passage, resource extraction
  | 'technology_sharing'    // Research and technology cooperation
  | 'marriage_alliance'     // Dynastic marriages (empires)
  | 'vassalization'         // Subjugation agreements
  | 'independence'          // Independence negotiations
  | 'reparations';          // War reparations

/**
 * Status of a negotiation
 */
export type NegotiationStatus =
  | 'proposed'      // Initial proposal sent
  | 'countered'     // Counter-offer made
  | 'deliberating'  // Parties considering
  | 'accepted'      // All parties accepted
  | 'rejected'      // One or more parties rejected
  | 'expired'       // Deadline passed without agreement
  | 'withdrawn'     // Proposer withdrew
  | 'implemented';  // Agreement implemented

/**
 * A single term in the negotiation
 */
export interface NegotiationTerm {
  /** Unique term ID */
  id: string;

  /** Type of term */
  type: 'give' | 'receive' | 'mutual' | 'conditional';

  /** Category of term */
  category: 'territory' | 'resources' | 'gold' | 'military' | 'political' | 'cultural';

  /** Description of what is being offered/requested */
  description: string;

  /** Entity offering this term */
  offeredBy: string;

  /** Entity receiving benefit */
  beneficiary: string;

  /** Quantitative value (if applicable) */
  value?: number;

  /** Duration in ticks (if applicable) */
  duration?: number;

  /** Specific entity IDs affected (territories, fleets, etc.) */
  affectedEntityIds?: string[];

  /** Whether this term is agreed upon */
  agreed: boolean;
}

/**
 * An offer or counter-offer in the negotiation
 */
export interface NegotiationOffer {
  /** Unique offer ID */
  id: string;

  /** Entity making the offer */
  offeredBy: string;

  /** Tick when offer was made */
  offeredTick: number;

  /** Terms included in this offer */
  terms: NegotiationTerm[];

  /** Explanation/reasoning for the offer */
  reasoning?: string;

  /** Whether this is a counter to a previous offer */
  isCounterOffer: boolean;

  /** ID of offer this counters (if applicable) */
  counterToOfferId?: string;

  /** Response from each party */
  responses: Map<string, 'pending' | 'accepted' | 'rejected' | 'countered'>;
}

/**
 * A diplomatic negotiation between political entities
 */
export interface Negotiation {
  /** Unique negotiation ID */
  id: string;

  /** Type of negotiation */
  type: NegotiationType;

  /** Tier of the negotiating entities */
  tier: PoliticalTier;

  /** Entities participating in the negotiation */
  participantIds: string[];

  /** Entity that initiated the negotiation */
  initiatorId: string;

  /** Current status */
  status: NegotiationStatus;

  /** All offers/counter-offers in chronological order */
  offers: NegotiationOffer[];

  /** Current active offer (latest) */
  currentOfferId?: string;

  /** Tick when negotiation started */
  startedTick: number;

  /** Deadline tick for negotiation */
  deadlineTick: number;

  /** Tick when negotiation concluded (if applicable) */
  concludedTick?: number;

  /** Priority of the negotiation */
  priority: 'routine' | 'urgent' | 'critical';

  /** Tags for categorization */
  tags?: string[];

  /** Context data for LLM processing */
  context?: Record<string, unknown>;

  /** Final terms if accepted */
  agreedTerms?: NegotiationTerm[];

  /** Reason for rejection/expiry if applicable */
  failureReason?: string;
}

/**
 * NegotiationComponent - Tracks negotiations for a political entity
 */
export interface NegotiationComponent extends Component {
  type: 'negotiation';
  version: 1;

  /** Active negotiations this entity is participating in */
  activeNegotiations: Negotiation[];

  /** Completed negotiations (limited history) */
  completedNegotiations: Negotiation[];

  /** Maximum completed to retain (default: 100) */
  maxCompletedHistory: number;

  /** Negotiation preferences (affects AI decision making) */
  preferences: {
    /** Willingness to make concessions (0-1) */
    concessionWillingness: number;

    /** Patience for long negotiations (0-1) */
    patience: number;

    /** Risk tolerance for deals (0-1) */
    riskTolerance: number;

    /** Preferred negotiation tactics */
    preferredTactics: Array<'cooperative' | 'competitive' | 'accommodating' | 'avoiding' | 'compromising'>;
  };

  /** Statistics */
  stats: {
    totalNegotiationsInitiated: number;
    totalNegotiationsReceived: number;
    successfulNegotiations: number;
    failedNegotiations: number;
    averageNegotiationDuration: number; // In ticks
  };

  /** Relationship modifiers from past negotiations */
  relationshipHistory: Map<string, {
    entityId: string;
    trustModifier: number; // -1 to 1
    lastNegotiationTick: number;
    successRate: number; // 0-1
  }>;
}

/**
 * Create a new NegotiationComponent
 */
export function createNegotiationComponent(
  maxCompletedHistory: number = 100
): NegotiationComponent {
  return {
    type: 'negotiation',
    version: 1,
    activeNegotiations: [],
    completedNegotiations: [],
    maxCompletedHistory,
    preferences: {
      concessionWillingness: 0.5,
      patience: 0.5,
      riskTolerance: 0.5,
      preferredTactics: ['compromising'],
    },
    stats: {
      totalNegotiationsInitiated: 0,
      totalNegotiationsReceived: 0,
      successfulNegotiations: 0,
      failedNegotiations: 0,
      averageNegotiationDuration: 0,
    },
    relationshipHistory: new Map(),
  };
}

/**
 * Create a new negotiation
 */
export function createNegotiation(
  id: string,
  type: NegotiationType,
  tier: PoliticalTier,
  initiatorId: string,
  participantIds: string[],
  startedTick: number,
  deadlineTicks: number,
  priority: 'routine' | 'urgent' | 'critical' = 'routine',
  context?: Record<string, unknown>
): Negotiation {
  return {
    id,
    type,
    tier,
    participantIds,
    initiatorId,
    status: 'proposed',
    offers: [],
    startedTick,
    deadlineTick: startedTick + deadlineTicks,
    priority,
    context,
  };
}

/**
 * Create a negotiation offer
 */
export function createNegotiationOffer(
  id: string,
  offeredBy: string,
  terms: NegotiationTerm[],
  offeredTick: number,
  participantIds: string[],
  reasoning?: string,
  counterToOfferId?: string
): NegotiationOffer {
  const responses = new Map<string, 'pending' | 'accepted' | 'rejected' | 'countered'>();
  for (const participantId of participantIds) {
    if (participantId !== offeredBy) {
      responses.set(participantId, 'pending');
    }
  }

  return {
    id,
    offeredBy,
    offeredTick,
    terms,
    reasoning,
    isCounterOffer: counterToOfferId !== undefined,
    counterToOfferId,
    responses,
  };
}

/**
 * Add an offer to a negotiation
 */
export function addOfferToNegotiation(
  negotiation: Negotiation,
  offer: NegotiationOffer
): void {
  negotiation.offers.push(offer);
  negotiation.currentOfferId = offer.id;

  if (offer.isCounterOffer) {
    negotiation.status = 'countered';
  } else if (negotiation.offers.length === 1) {
    negotiation.status = 'proposed';
  }
}

/**
 * Record response to an offer
 */
export function recordOfferResponse(
  negotiation: Negotiation,
  offerId: string,
  responderId: string,
  response: 'accepted' | 'rejected' | 'countered'
): void {
  const offer = negotiation.offers.find(o => o.id === offerId);
  if (!offer) return;

  offer.responses.set(responderId, response);

  // Check if all parties have responded
  const allResponses = Array.from(offer.responses.values());
  const pendingCount = allResponses.filter(r => r === 'pending').length;

  if (pendingCount === 0) {
    // All parties responded
    const allAccepted = allResponses.every(r => r === 'accepted');
    const anyRejected = allResponses.some(r => r === 'rejected');
    const anyCountered = allResponses.some(r => r === 'countered');

    if (allAccepted) {
      negotiation.status = 'accepted';
      negotiation.agreedTerms = offer.terms;
    } else if (anyRejected && !anyCountered) {
      negotiation.status = 'rejected';
      negotiation.failureReason = 'One or more parties rejected the offer';
    } else if (anyCountered) {
      negotiation.status = 'countered';
    }
  } else {
    negotiation.status = 'deliberating';
  }
}

/**
 * Check if negotiation has expired
 */
export function checkNegotiationExpiry(
  negotiation: Negotiation,
  currentTick: number
): boolean {
  if (negotiation.status === 'accepted' || negotiation.status === 'rejected' ||
      negotiation.status === 'expired' || negotiation.status === 'withdrawn' ||
      negotiation.status === 'implemented') {
    return false; // Already concluded
  }

  if (currentTick >= negotiation.deadlineTick) {
    negotiation.status = 'expired';
    negotiation.concludedTick = currentTick;
    negotiation.failureReason = 'Deadline passed without agreement';
    return true;
  }

  return false;
}

/**
 * Get default deadline ticks based on negotiation type and priority
 */
export function getDefaultDeadlineTicks(
  type: NegotiationType,
  priority: 'routine' | 'urgent' | 'critical'
): number {
  // Base deadlines by type (in ticks at 20 TPS)
  const baseDeadlines: Record<NegotiationType, number> = {
    trade_agreement: 12000,      // 10 minutes
    defense_pact: 24000,         // 20 minutes
    non_aggression: 12000,       // 10 minutes
    territorial_exchange: 36000, // 30 minutes
    peace_treaty: 48000,         // 40 minutes
    federation_membership: 72000, // 1 hour
    resource_rights: 12000,      // 10 minutes
    technology_sharing: 24000,   // 20 minutes
    marriage_alliance: 48000,    // 40 minutes
    vassalization: 72000,        // 1 hour
    independence: 72000,         // 1 hour
    reparations: 24000,          // 20 minutes
  };

  // Priority multipliers
  const priorityMultipliers: Record<string, number> = {
    routine: 1.0,
    urgent: 0.5,
    critical: 0.25,
  };

  return Math.floor(baseDeadlines[type] * priorityMultipliers[priority]);
}

/**
 * Move a completed negotiation to history
 */
export function completeNegotiation(
  component: NegotiationComponent,
  negotiation: Negotiation,
  currentTick: number
): void {
  // Set concluded tick
  negotiation.concludedTick = currentTick;

  // Remove from active
  component.activeNegotiations = component.activeNegotiations.filter(
    n => n.id !== negotiation.id
  );

  // Add to completed
  component.completedNegotiations.push(negotiation);

  // Trim history if needed
  while (component.completedNegotiations.length > component.maxCompletedHistory) {
    component.completedNegotiations.shift();
  }

  // Update stats
  const duration = currentTick - negotiation.startedTick;
  const totalNegotiations = component.stats.successfulNegotiations + component.stats.failedNegotiations;

  if (negotiation.status === 'accepted' || negotiation.status === 'implemented') {
    component.stats.successfulNegotiations++;
  } else {
    component.stats.failedNegotiations++;
  }

  // Update average duration
  component.stats.averageNegotiationDuration =
    ((component.stats.averageNegotiationDuration * totalNegotiations) + duration) /
    (totalNegotiations + 1);

  // Update relationship history
  for (const participantId of negotiation.participantIds) {
    if (participantId === negotiation.initiatorId) continue;

    const existingRelation = component.relationshipHistory.get(participantId);
    const wasSuccessful = negotiation.status === 'accepted' || negotiation.status === 'implemented';

    if (existingRelation) {
      // Update existing relationship
      const successCount = existingRelation.successRate *
        (component.stats.successfulNegotiations + component.stats.failedNegotiations - 1);
      const newSuccessRate = (successCount + (wasSuccessful ? 1 : 0)) /
        (component.stats.successfulNegotiations + component.stats.failedNegotiations);

      component.relationshipHistory.set(participantId, {
        entityId: participantId,
        trustModifier: existingRelation.trustModifier + (wasSuccessful ? 0.05 : -0.1),
        lastNegotiationTick: currentTick,
        successRate: newSuccessRate,
      });
    } else {
      // Create new relationship entry
      component.relationshipHistory.set(participantId, {
        entityId: participantId,
        trustModifier: wasSuccessful ? 0.1 : -0.1,
        lastNegotiationTick: currentTick,
        successRate: wasSuccessful ? 1.0 : 0.0,
      });
    }
  }
}
