/**
 * Economy, trade, and resource events.
 */
import type { EntityId } from '../../types.js';

export interface EconomyEvents {
  'resource:gathered': {
    agentId: EntityId;
    resourceType: string;
    amount: number;
    position: { x: number; y: number };
    sourceEntityId?: EntityId;
  };
  'resource:depleted': {
    resourceId: EntityId;
    resourceType: string;
    agentId?: EntityId;
  };
  'resource:regenerated': {
    resourceId: EntityId;
    resourceType: string;
    amount: number;
  };

  'crafting:job_queued': {
    jobId: string | number;
    recipeId: string;
    station?: EntityId;
  };
  'crafting:job_started': {
    jobId: string | number;
    recipeId: string;
    agentId: EntityId;
  };
  'crafting:job_completed': {
    jobId: string | number;
    recipeId: string;
  };
  'crafting:job_cancelled': {
    jobId: string | number;
    reason?: string;
  };
  'crafting:completed': {
    jobId: string | number;
    recipeId: string;
    agentId: EntityId;
    produced: Array<{ itemId: string; amount: number; quality?: number }>;
  };
  'crafting:panel_opened': Record<string, never>;
  'crafting:panel_closed': Record<string, never>;
  'crafting:recipe_selected': {
    recipeId: string;
  };

  'cooking:completed': {
    agentId: EntityId;
    recipeId: string;
    itemId: string;
    quantity: number;
    quality: number;
    xpGained: number;
    leveledUp: boolean;
    newLevel?: number;
  };

  'storage:full': {
    storageId: EntityId;
    agentId?: EntityId;
  };
  'storage:not_found': {
    storageId?: EntityId;
    agentId: EntityId;
  };
  'items:deposited': {
    storageId: EntityId;
    agentId: EntityId;
    items: Array<{ itemId: string; amount: number }>;
  };

  'inventory:full': {
    entityId: EntityId;
    agentId?: EntityId;
  };
  'inventory:changed': {
    entityId: EntityId;
    agentId?: EntityId;
    changes?: Array<{ itemId: string; delta: number }>;
  };

  'trade:buy': {
    buyerId: EntityId;
    sellerId: EntityId;
    shopId?: EntityId;
    itemId: string;
    quantity: number;
    totalPrice: number;
    unitPrice: number;
  };

  'trade:sell': {
    sellerId: EntityId;
    buyerId: EntityId;
    shopId?: EntityId;
    itemId: string;
    quantity: number;
    totalPrice: number;
    unitPrice: number;
  };

  'trade:offer_made': {
    offerId: string;
    offererId: EntityId;
    targetId: EntityId;
    offeredItems: Array<{ itemId: string; quantity: number }>;
    requestedItems: Array<{ itemId: string; quantity: number }>;
    currencyOffered: number;
    currencyRequested: number;
  };

  'trade:offer_accepted': {
    offerId: string;
    offererId: EntityId;
    targetId: EntityId;
  };

  'trade:offer_rejected': {
    offerId: string;
    offererId: EntityId;
    targetId: EntityId;
    reason?: string;
  };

  'market:price_changed': {
    itemId: string;
    oldPrice: number;
    newPrice: number;
    reason: string;
  };

  'market:event_started': {
    eventId: string;
    eventType: 'shortage' | 'surplus' | 'festival' | 'merchant_arrival';
    description: string;
    duration: number;
  };

  'market:event_ended': {
    eventId: string;
    eventType: 'shortage' | 'surplus' | 'festival' | 'merchant_arrival';
  };

  'trade_agreement:proposed': {
    agreementId: string;
    proposerId: string;
    targetId: string;
    scope: string;
    facilitationCost: number;
    requiresEscrow: boolean;
  };
  'trade_agreement:counter_offered': {
    agreementId: string;
    responderId: string;
    proposerId?: string;
    reasoning: string;
  };
  'trade_agreement:accepted': {
    agreementId: string;
    acceptorId: string;
    proposerId?: string;
  };
  'trade_agreement:rejected': {
    agreementId: string;
    rejectorId: string;
    reason?: string;
  };
  'trade_agreement:cancelled': {
    agreementId: string;
    civId: string;
    reason: string;
  };
  'trade_agreement:delivery_made': {
    agreementId: string;
    escrowId?: string;
    termIndex?: number;
    itemId: string;
    quantity: number;
    from: string;
    to: string;
  };
  'trade_agreement:delivery_failed': {
    agreementId: string;
    termIndex: number;
    reason: string;
  };
  'trade_agreement:violated': {
    agreementId: string;
    violatorId: string;
    termIndex: number;
    reason: string;
  };
  'trade_agreement:expired': {
    agreementId: string;
  };
  'trade_agreement:renewed': {
    agreementId: string;
  };
  'trade_agreement:fulfilled': {
    agreementId: string;
    totalValueExchanged: number;
  };

  'trade:remote_acceptance': {
    agreementId: string;
    fromUniverse: string;
    tick: bigint;
  };
  'trade:remote_cancellation': {
    agreementId: string;
    fromUniverse: string;
    reason?: string;
    tick: bigint;
  };
  'trade:remote_violation': {
    agreementId: string;
    fromUniverse: string;
    reason?: string;
    tick: bigint;
  };

  'trade:escort_assigned': {
    agreementId: string;
    squadronId: string;
    shipCount: number;
  };

  'trade:escort_completed': {
    agreementId: string;
    squadronId: string;
  };

  'trade:escort_failed': {
    agreementId: string;
    squadronId: string;
    reason: string;
  };

  'trade:escort_needed': {
    agreementId: string;
    minimumFleetSize: number;
    provider?: string;
  };

  'gathering:tool_error': {
    agentId: string;
    toolId: string;
    error: string;
  };

  'item:dropped': {
    entityId?: string;
    material?: string;
    amount?: number;
    itemId?: string;
    quantity?: number;
    position: { x: number; y: number };
  };

  'item:equipped': {
    slot: string;
    itemId: string;
  };

  'item:transferred': {
    source: {
      type: string;
      index?: number;
      slot?: string;
    } | null;
    item: {
      itemId: string;
      quantity: number;
      quality?: number;
    } | null;
  };

  'tool_used': {
    itemInstanceId: string;
    durabilityLost: number;
    remainingCondition: number;
    usageType: string;
  };

  'tool_low_durability': {
    itemInstanceId: string;
    condition: number;
    agentId?: EntityId;
    toolType: string;
  };

  'tool_broken': {
    itemInstanceId: string;
    toolType: string;
    agentId?: EntityId;
  };

  'production:tier_changed': {
    entityId: EntityId;
    oldTier: number;
    newTier: number;
    techLevel: number;
  };

  // Trade Network events (Tier 3)
  'trade:network_formed': {
    networkId: string;
    scope: 'planet' | 'system' | 'sector';
    nodeCount: number;
    edgeCount: number;
  };

  'trade:hub_identified': {
    networkId: string;
    nodeId: EntityId;
    betweenness: number;
    tier: 'major' | 'minor';
  };

  'trade:chokepoint_detected': {
    networkId: string;
    nodeId: EntityId;
    criticalityScore: number;
    strategicValue: number;
    affectedNodes: EntityId[];
  };

  'trade:network_resilience_low': {
    networkId: string;
    resilienceScore: number;
    criticalNodeCount: number;
  };

  // Blockade events
  'trade:blockade_started': {
    blockadeId: string;
    networkId: string;
    targetNodeId: EntityId;
    blockadingFaction: EntityId;
    fleetStrength: number;
  };

  'trade:shortage_detected': {
    nodeId: EntityId;
    blockadeId: string;
    blockadedChokepoint: EntityId;
    severity: number;
  };

  // Shipping lane lifecycle events
  'economy:lane:created': {
    laneId: string;
    originId: EntityId;
    destinationId: EntityId;
  };

  'economy:lane:removed': {
    laneId: string;
    reason?: string;
  };

  'economy:lane:abandoned': {
    laneId: string;
    ticksSinceLastUse: number;
  };

  'economy:lane:blocked': {
    laneId: string;
    caravanId: string;
  };

  'economy:lane:caravan_departed': {
    caravanId: string;
    laneId: string;
    agreementId: string;
    cargo: Array<{ itemId: string; quantity: number }>;
    originId: EntityId;
    destinationId: EntityId;
  };

  'economy:lane:caravan_arrived': {
    caravanId: string;
    laneId: string;
    agreementId: string;
    cargo: Array<{ itemId: string; quantity: number }>;
    destinationId: EntityId;
    travelTime: number;
  };

  'economy:lane:caravan_lost': {
    caravanId: string;
    reason: string;
  };

  'economy:lane:hazard_encountered': {
    caravanId: string;
    laneId: string;
    hazardType: 'pirates' | 'weather' | 'monsters' | 'passage_instability';
    outcome: 'survived' | 'damaged' | 'destroyed';
  };
}

export type EconomyEventType = keyof EconomyEvents;
export type EconomyEventData = EconomyEvents[EconomyEventType];
