/**
 * Trade Agreement Types - Formal trade agreements between civilizations
 *
 * Supports:
 * - Local village-to-village trade
 * - Cross-timeline trade (forked universes)
 * - Cross-universe trade (networked multiverse)
 * - Cross-multiverse trade (foreign multiverses via portals)
 *
 * Mediated by mayor/diplomat agents representing their civilizations.
 */

import type { EntityId } from '../types.js';

// ============================================================================
// Trade Scope - Where Does This Trade Happen?
// ============================================================================

export type TradeScope =
  | 'local'              // Same universe, same civilization
  | 'inter_village'      // Same universe, different villages
  | 'cross_timeline'     // Different timeline (forked universe in same multiverse)
  | 'cross_universe'     // Different universe in same multiverse
  | 'cross_multiverse';  // Different multiverse (requires portal)

// ============================================================================
// Civilization Identity
// ============================================================================

export interface CivilizationIdentity {
  /** Unique civilization ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Type of civilization */
  type: 'player_village' | 'npc_village' | 'ai_city' | 'autonomous_settlement';

  /** Universe ID where this civilization exists */
  universeId: string;

  /** Multiverse ID */
  multiverseId: string;

  /** Diplomatic representative (mayor, diplomat, etc.) */
  representativeId?: EntityId;

  /** City manager AI agent (if applicable) */
  cityManagerId?: EntityId;
}

// ============================================================================
// Trade Terms
// ============================================================================

export interface TradeTerm {
  /** What is being traded */
  itemId: string;

  /** Quantity */
  quantity: number;

  /** Who provides this */
  providedBy: string; // Civilization ID

  /** Who receives this */
  receivedBy: string; // Civilization ID

  /** Delivery schedule */
  delivery: DeliverySchedule;

  /** Payment/exchange */
  payment?: PaymentTerm;
}

export interface DeliverySchedule {
  /** Delivery method */
  method: 'immediate' | 'periodic' | 'on_demand' | 'escrow';

  /** Frequency for periodic deliveries (ticks) */
  frequency?: number;

  /** Total deliveries (for periodic) */
  totalDeliveries?: number;

  /** Deliveries completed so far */
  deliveriesCompleted?: number;

  /** Next delivery at tick */
  nextDeliveryTick?: bigint;

  /** Delivery location */
  deliveryLocation?: DeliveryLocation;
}

export interface DeliveryLocation {
  /** For local trades - specific building/storage */
  buildingId?: string;

  /** For cross-universe trades - passage ID to use */
  passageId?: string;

  /** For cross-multiverse trades - requires escrow at portal */
  requiresEscrow: boolean;
}

export interface PaymentTerm {
  /** What is being paid */
  currency: 'gold' | 'belief' | 'barter' | 'favor';

  /** Amount (for gold/belief) */
  amount?: number;

  /** Bartered items (for barter) */
  barteredItems?: Array<{ itemId: string; quantity: number }>;

  /** Favor owed (for favor currency) */
  favorDescription?: string;
}

// ============================================================================
// Trade Agreement
// ============================================================================

export interface TradeAgreement {
  /** Unique agreement ID */
  id: string;

  /** Agreement scope */
  scope: TradeScope;

  /** Parties involved */
  parties: CivilizationIdentity[];

  /** Trade terms */
  terms: TradeTerm[];

  /** Mediators (mayor/diplomat agents) */
  mediators: Array<{
    agentId: EntityId;
    civilizationId: string;
    role: 'proposer' | 'acceptor' | 'witness';
  }>;

  /** Agreement status */
  status: AgreementStatus;

  /** When agreement was proposed */
  proposedAt: bigint;

  /** When agreement was accepted */
  acceptedAt?: bigint;

  /** When agreement expires */
  expiresAt?: bigint;

  /** Duration (ticks) */
  duration?: number;

  /** Auto-renewal */
  autoRenew: boolean;

  /** Violation history */
  violations: TradeViolation[];

  /** Total value exchanged (for tracking) */
  totalValueExchanged: number;

  /** Metadata for cross-universe/multiverse trades */
  crossRealmMetadata?: CrossRealmMetadata;
}

export type AgreementStatus =
  | 'proposed'        // Waiting for acceptance
  | 'negotiating'     // Counter-offers being exchanged
  | 'active'          // Currently in effect
  | 'fulfilled'       // All terms completed
  | 'expired'         // Duration elapsed
  | 'violated'        // Terms were violated
  | 'cancelled';      // Mutually cancelled

export interface TradeViolation {
  /** What term was violated */
  termIndex: number;

  /** Who violated it */
  violatorId: string;

  /** When it happened */
  tick: bigint;

  /** Description */
  reason: string;

  /** Penalty applied */
  penalty?: string;
}

// ============================================================================
// Cross-Realm Trade Metadata
// ============================================================================

export interface CrossRealmMetadata {
  /** Passage IDs used for trade routes */
  passageIds: string[];

  /** Escrow entities (items held at portal pending delivery) */
  escrowEntities: Array<{
    entityId: EntityId;
    itemId: string;
    quantity: number;
    heldAtUniverseId: string;
    releasesAtTick: bigint;
  }>;

  /** Time synchronization */
  timeSyncMode: 'absolute' | 'relative' | 'manual';

  /** Tick offset between universes */
  tickOffset?: bigint;

  /** Exchange rate for belief/currency across multiverses */
  exchangeRate?: number;

  /** Trust level (affects escrow requirements) */
  trustLevel: 'untrusted' | 'new' | 'established' | 'trusted';

  /** Successful trades count */
  successfulTrades: number;

  /** Failed trades count */
  failedTrades: number;
}

// ============================================================================
// Negotiation State
// ============================================================================

export interface NegotiationState {
  /** Agreement being negotiated */
  agreementId: string;

  /** Current proposal version */
  proposalVersion: number;

  /** Counter-offers */
  counterOffers: CounterOffer[];

  /** Active negotiators */
  negotiators: Array<{
    agentId: EntityId;
    civilizationId: string;
    lastResponseTick: bigint;
  }>;

  /** Negotiation timeout */
  timeoutTick: bigint;
}

export interface CounterOffer {
  /** Who made this counter-offer */
  proposerId: string;

  /** Version number */
  version: number;

  /** Proposed at tick */
  proposedAt: bigint;

  /** Modified terms */
  modifiedTerms: TradeTerm[];

  /** Reasoning (for LLM mayor agents) */
  reasoning?: string;

  /** Response */
  response?: 'accepted' | 'rejected' | 'countered';
}

// ============================================================================
// Trade Events
// ============================================================================

export interface TradeAgreementEvent {
  /** Event type */
  type: TradeAgreementEventType;

  /** Agreement ID */
  agreementId: string;

  /** When it happened */
  tick: bigint;

  /** Event data */
  data: any;
}

export type TradeAgreementEventType =
  | 'proposed'
  | 'counter_offered'
  | 'accepted'
  | 'rejected'
  | 'delivery_made'
  | 'delivery_failed'
  | 'violated'
  | 'fulfilled'
  | 'expired'
  | 'renewed'
  | 'cancelled';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine trade scope based on civilization locations
 */
export function determineTradeScope(
  civ1: CivilizationIdentity,
  civ2: CivilizationIdentity
): TradeScope {
  // Same universe
  if (civ1.universeId === civ2.universeId) {
    return civ1.id === civ2.id ? 'local' : 'inter_village';
  }

  // Same multiverse
  if (civ1.multiverseId === civ2.multiverseId) {
    // Check if they're timeline forks (would need parent tracking)
    // For now, classify as cross-universe
    return 'cross_universe';
  }

  // Different multiverse
  return 'cross_multiverse';
}

/**
 * Calculate escrow requirements based on trade scope and trust
 */
export function calculateEscrowRequirement(
  scope: TradeScope,
  trustLevel: 'untrusted' | 'new' | 'established' | 'trusted'
): boolean {
  // Cross-multiverse always requires escrow
  if (scope === 'cross_multiverse') {
    return true;
  }

  // Cross-universe requires escrow unless trusted
  if (scope === 'cross_universe') {
    return trustLevel !== 'trusted';
  }

  // Local trades don't need escrow if established
  return trustLevel === 'untrusted';
}

/**
 * Calculate belief cost for cross-realm trade facilitation
 */
export function calculateTradeFacilitationCost(
  scope: TradeScope,
  totalValue: number
): number {
  const baseMultiplier: Record<TradeScope, number> = {
    local: 0.0,              // No belief cost
    inter_village: 0.01,     // 1% of value
    cross_timeline: 0.05,    // 5% of value
    cross_universe: 0.1,     // 10% of value
    cross_multiverse: 0.25,  // 25% of value (very expensive)
  };

  return totalValue * baseMultiplier[scope];
}

/**
 * Estimate delivery time based on scope and method
 */
export function estimateDeliveryTime(
  scope: TradeScope,
  method: DeliverySchedule['method']
): number {
  if (method === 'immediate') {
    const baseTicks: Record<TradeScope, number> = {
      local: 100,              // ~5 seconds
      inter_village: 1200,     // ~1 minute
      cross_timeline: 2400,    // ~2 minutes
      cross_universe: 6000,    // ~5 minutes
      cross_multiverse: 12000, // ~10 minutes
    };
    return baseTicks[scope];
  }

  return 0; // For periodic/on_demand, timing is custom
}
