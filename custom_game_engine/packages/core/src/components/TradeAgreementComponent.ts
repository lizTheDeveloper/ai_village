import type { Component } from '../ecs/Component.js';
import type {
  TradeAgreement,
  NegotiationState,
  TradeAgreementEvent,
} from '../trade/TradeAgreementTypes.js';
import type { HilbertTimeCoordinate } from '../trade/HilbertTime.js';

/**
 * TradeAgreementComponent - Tracks trade agreements for a civilization entity
 *
 * Attached to civilization entities (villages, cities, AI settlements).
 * Manages active agreements, pending negotiations, and trade history.
 *
 * Supports:
 * - Local village-to-village trade
 * - Cross-timeline trade (forked universes)
 * - Cross-universe trade (networked multiverse)
 * - Cross-multiverse trade (foreign multiverses via portals)
 */
export interface TradeAgreementComponent extends Component {
  type: 'trade_agreement';

  /** Civilization identity */
  civilizationId: string;
  civilizationName: string;

  /** Universe and multiverse location */
  universeId: string;
  multiverseId: string;

  /** Active trade agreements */
  activeAgreements: TradeAgreement[];

  /** Pending negotiations (awaiting response) */
  pendingNegotiations: NegotiationState[];

  /** Incoming proposals awaiting our response */
  incomingProposals: TradeAgreement[];

  /** Recent trade events (for UI/history) */
  recentEvents: TradeAgreementEvent[];

  /** Maximum events to retain in history */
  maxEventHistory: number;

  /**
   * Cross-realm escrow tracking
   * Items held pending delivery confirmation
   */
  escrowHeld: EscrowItem[];

  /**
   * Items we're expecting to receive from escrow
   */
  escrowPending: EscrowItem[];

  /**
   * Causal event queue for async trade batching
   * Events from other universes waiting to be processed
   */
  causalEventQueue: CausalTradeEvent[];

  /**
   * Last known time coordinates of trading partners
   * Used for detecting causal violations and timeline forks
   */
  partnerTimeCoordinates: Map<string, HilbertTimeCoordinate>;

  /**
   * Our current time coordinate in Hilbert-time
   */
  currentTimeCoordinate: HilbertTimeCoordinate;

  /**
   * Diplomatic standing with other civilizations
   */
  diplomaticRelations: Map<string, DiplomaticRelation>;
}

/**
 * Item held in escrow for cross-realm trade
 */
export interface EscrowItem {
  /** Unique escrow transaction ID */
  escrowId: string;

  /** Agreement this belongs to */
  agreementId: string;

  /** Item being held */
  itemId: string;
  quantity: number;

  /** Who deposited this */
  depositedBy: string;

  /** Who will receive this */
  releaseTo: string;

  /** Portal/passage where escrow is held */
  heldAtPassageId: string;

  /** Tick when item was deposited */
  depositedAtTick: bigint;

  /** Tick when item can be released (escrow period) */
  releasableAtTick: bigint;

  /** Time coordinate when deposited (for causal ordering) */
  depositTimeCoordinate: HilbertTimeCoordinate;

  /** Status */
  status: 'held' | 'released' | 'disputed' | 'expired';
}

/**
 * Causal trade event from async universe
 * Queued for processing when we sync with that universe
 */
export interface CausalTradeEvent {
  /** Event type */
  type: 'proposal' | 'acceptance' | 'rejection' | 'cancellation' | 'delivery' | 'violation';

  /** Source civilization */
  sourceCivilizationId: string;
  sourceUniverseId: string;
  sourceMultiverseId: string;

  /** Time coordinate when event was created */
  eventTimeCoordinate: HilbertTimeCoordinate;

  /** Time coordinate when we received it */
  receivedTimeCoordinate: HilbertTimeCoordinate;

  /** The event data */
  data: any;

  /**
   * Causal parents - events this depends on
   * Used to detect if we received events out of order
   */
  causalParents: string[];

  /**
   * Whether this event creates a causal violation
   * (arrived "before" its causal parents in our τ)
   */
  isCausalViolation: boolean;

  /**
   * If causal violation, what fork should be created
   */
  forkRequired?: {
    forkAtTick: bigint;
    reason: string;
  };
}

/**
 * Diplomatic relation with another civilization
 */
export interface DiplomaticRelation {
  /** Other civilization ID */
  civilizationId: string;

  /** Trust level (affects escrow requirements) */
  trustLevel: 'untrusted' | 'new' | 'established' | 'trusted';

  /** Successful trades count */
  successfulTrades: number;

  /** Failed/violated trades count */
  failedTrades: number;

  /** Total value exchanged */
  totalValueExchanged: number;

  /** Outstanding favors (for favor currency) */
  favorsOwed: string[];
  favorsOwedTo: string[];

  /** Last interaction tick */
  lastInteractionTick: bigint;

  /** Diplomatic incidents (violations, disputes) */
  incidents: DiplomaticIncident[];
}

/**
 * Record of diplomatic incident
 */
export interface DiplomaticIncident {
  /** What happened */
  type: 'trade_violation' | 'escrow_dispute' | 'causal_fork' | 'favor_defaulted';

  /** When it happened */
  tick: bigint;

  /** Description */
  description: string;

  /** Impact on trust */
  trustImpact: number;

  /** Whether resolved */
  resolved: boolean;
}

/**
 * Create a new TradeAgreementComponent with defaults
 */
export function createTradeAgreementComponent(
  civilizationId: string,
  civilizationName: string,
  universeId: string,
  multiverseId: string
): TradeAgreementComponent {
  return {
    type: 'trade_agreement',
    version: 1,
    civilizationId,
    civilizationName,
    universeId,
    multiverseId,
    activeAgreements: [],
    pendingNegotiations: [],
    incomingProposals: [],
    recentEvents: [],
    maxEventHistory: 100,
    escrowHeld: [],
    escrowPending: [],
    causalEventQueue: [],
    partnerTimeCoordinates: new Map(),
    currentTimeCoordinate: {
      tau: 0n,
      beta: 'root',
      sigma: 0,
      origin: universeId,
      causalParents: [],
    },
    diplomaticRelations: new Map(),
  };
}
