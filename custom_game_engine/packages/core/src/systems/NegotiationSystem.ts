/**
 * NegotiationSystem - Processes diplomatic negotiations between empires/nations
 *
 * This system:
 * 1. Processes active negotiations and their deadlines
 * 2. Handles LLM-driven negotiation for soul agent governors
 * 3. Implements agreed-upon terms
 * 4. Records negotiations to governance history
 * 5. Emits events for UI and other systems
 *
 * Priority: 204 (after NationSystem, before FederationGovernanceSystem)
 * Throttle: 200 ticks (10 seconds) - negotiations don't need real-time updates
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  NegotiationComponent,
  Negotiation,
  NegotiationOffer,
  NegotiationTerm,
  NegotiationType,
} from '../components/NegotiationComponent.js';
import {
  createNegotiationComponent,
  createNegotiation,
  createNegotiationOffer,
  addOfferToNegotiation,
  recordOfferResponse,
  checkNegotiationExpiry,
  completeNegotiation,
  getDefaultDeadlineTicks,
} from '../components/NegotiationComponent.js';
import type {
  GovernanceHistoryComponent,
  GovernanceAuditEntry,
} from '../components/GovernanceHistoryComponent.js';
import { addGovernanceAuditEntry } from '../components/GovernanceHistoryComponent.js';
import { v4 as uuidv4 } from 'uuid';
import type { PoliticalTier } from '../governance/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Negotiation event data
 */
interface NegotiationEventData {
  negotiationId: string;
  type: NegotiationType;
  participantIds: string[];
  status: string;
  tick: number;
}

/**
 * Offer response event data
 */
interface OfferResponseEventData {
  negotiationId: string;
  offerId: string;
  responderId: string;
  response: string;
  tick: number;
}

// ============================================================================
// System
// ============================================================================

export class NegotiationSystem extends BaseSystem {
  public readonly id: SystemId = 'negotiation' as SystemId;
  public readonly priority: number = 204;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Negotiation];
  public readonly activationComponents = ['negotiation'] as const;
  public readonly metadata = {
    category: 'economy' as const,
    description: 'Processes diplomatic negotiations between empires and nations',
    dependsOn: ['empire' as SystemId, 'nation' as SystemId],
    writesComponents: [CT.Negotiation, CT.GovernanceHistory] as const,
  } as const;

  // Update interval: 200 ticks = 10 seconds
  protected readonly throttleInterval = 200;

  // Last update tick
  private lastUpdateTick: number = 0;

  // Cache governance history entity ID (singleton pattern - avoid repeated queries)
  private cachedHistoryEntityId: string | null = null;

  // Cache negotiation ID -> entity ID mapping for O(1) lookups
  private negotiationEntityIndex: Map<string, string> = new Map();

  // ========================================================================
  // Main Update Loop
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Skip if not time for update
    if (tick - this.lastUpdateTick < this.throttleInterval) {
      return;
    }
    this.lastUpdateTick = tick;

    // Process each entity with negotiations
    for (const entity of ctx.activeEntities) {
      const negotiation = entity.getComponent<NegotiationComponent>(CT.Negotiation);
      if (!negotiation) continue;

      // Process active negotiations
      this.processActiveNegotiations(ctx.world, entity as EntityImpl, negotiation, tick);
    }
  }

  // ========================================================================
  // Negotiation Processing
  // ========================================================================

  /**
   * Process all active negotiations for an entity
   */
  private processActiveNegotiations(
    world: World,
    entity: EntityImpl,
    component: NegotiationComponent,
    tick: number
  ): void {
    // Early exit if no active negotiations
    if (component.activeNegotiations.length === 0) {
      return;
    }

    const negotiationsToComplete: Negotiation[] = [];

    for (const negotiation of component.activeNegotiations) {
      // Check for expiry
      if (checkNegotiationExpiry(negotiation, tick)) {
        this.recordNegotiationResult(world, negotiation, tick);
        negotiationsToComplete.push(negotiation);

        world.eventBus.emit({
          type: 'negotiation:expired',
          source: entity.id,
          data: {
            negotiationId: negotiation.id,
            type: negotiation.type,
            participantIds: negotiation.participantIds,
            status: 'expired',
            tick,
          } as NegotiationEventData,
        });

        continue;
      }

      // Check if negotiation is concluded
      if (negotiation.status === 'accepted' || negotiation.status === 'rejected') {
        if (negotiation.status === 'accepted') {
          // Implement agreed terms
          this.implementAgreedTerms(world, negotiation, tick);
        }

        this.recordNegotiationResult(world, negotiation, tick);
        negotiationsToComplete.push(negotiation);

        world.eventBus.emit({
          type: `negotiation:${negotiation.status}`,
          source: entity.id,
          data: {
            negotiationId: negotiation.id,
            type: negotiation.type,
            participantIds: negotiation.participantIds,
            status: negotiation.status,
            tick,
          } as NegotiationEventData,
        });
      }
    }

    // Move completed negotiations to history
    for (const negotiation of negotiationsToComplete) {
      completeNegotiation(component, negotiation, tick);
    }
  }

  /**
   * Implement the agreed-upon terms of a successful negotiation
   */
  private implementAgreedTerms(
    world: World,
    negotiation: Negotiation,
    tick: number
  ): void {
    if (!negotiation.agreedTerms) return;

    for (const term of negotiation.agreedTerms) {
      // Emit implementation event for each term
      world.eventBus.emit({
        type: 'negotiation:term_implemented',
        source: negotiation.id,
        data: {
          negotiationId: negotiation.id,
          termId: term.id,
          termType: term.type,
          category: term.category,
          offeredBy: term.offeredBy,
          beneficiary: term.beneficiary,
          tick,
        },
      });

      // Implementation logic depends on term category
      // This would be extended based on game mechanics
      switch (term.category) {
        case 'gold':
          // Transfer gold between entities
          this.implementGoldTransfer(world, term);
          break;
        case 'territory':
          // Transfer territory control
          this.implementTerritoryTransfer(world, term);
          break;
        case 'military':
          // Implement military agreements
          this.implementMilitaryAgreement(world, term);
          break;
        // Add other categories as needed
      }
    }

    negotiation.status = 'implemented';
  }

  /**
   * Implement gold transfer term
   */
  private implementGoldTransfer(world: World, term: NegotiationTerm): void {
    // Find entities and transfer resources
    // This would integrate with economy systems
    // Implementation: transfer term.value from term.offeredBy to term.beneficiary
  }

  /**
   * Implement territory transfer term
   */
  private implementTerritoryTransfer(world: World, term: NegotiationTerm): void {
    // This would integrate with territory management systems
    // Implementation: transfer term.affectedEntityIds from term.offeredBy to term.beneficiary
  }

  /**
   * Implement military agreement term
   */
  private implementMilitaryAgreement(world: World, term: NegotiationTerm): void {
    // This would integrate with military systems
    // Implementation: establish military agreement per term.description
  }

  // ========================================================================
  // Governance History
  // ========================================================================

  /**
   * Record negotiation result to governance history
   */
  private recordNegotiationResult(
    world: World,
    negotiation: Negotiation,
    tick: number
  ): void {
    const historyEntity = this.getHistoryEntity(world);
    if (!historyEntity) return;

    const history = historyEntity.getComponent<GovernanceHistoryComponent>(CT.GovernanceHistory);
    if (!history) return;

    const outcome = negotiation.status === 'accepted' || negotiation.status === 'implemented'
      ? 'approved'
      : negotiation.status === 'rejected'
        ? 'rejected'
        : 'cancelled';

    const entry: GovernanceAuditEntry = {
      id: `audit-${uuidv4()}`,
      actionType: negotiation.status === 'accepted' ? 'policy_enacted' : 'vote_concluded',
      tier: negotiation.tier,
      tick,
      sourceAgentId: negotiation.initiatorId,
      targetAgentIds: negotiation.participantIds.filter(p => p !== negotiation.initiatorId),
      outcome,
      description: `${negotiation.type} negotiation ${negotiation.status}: ${negotiation.agreedTerms?.length || 0} terms`,
      data: {
        negotiationId: negotiation.id,
        negotiationType: negotiation.type,
        participantIds: negotiation.participantIds,
        offersCount: negotiation.offers.length,
        duration: tick - negotiation.startedTick,
        agreedTermsCount: negotiation.agreedTerms?.length || 0,
        failureReason: negotiation.failureReason,
      },
      tags: ['negotiation', negotiation.type, negotiation.status],
    };

    addGovernanceAuditEntry(history, entry);
  }

  /**
   * Get the governance history singleton entity (cached lookup)
   */
  private getHistoryEntity(world: World): EntityImpl | null {
    // Fast path: use cached ID
    if (this.cachedHistoryEntityId) {
      const cached = world.getEntity(this.cachedHistoryEntityId);
      if (cached) {
        return cached as EntityImpl;
      }
      // Cache invalidated, clear it
      this.cachedHistoryEntityId = null;
    }

    // Slow path: query for history entity
    const historyEntities = world.query().with(CT.GovernanceHistory).executeEntities();
    const firstEntity = historyEntities[0];
    if (firstEntity) {
      this.cachedHistoryEntityId = firstEntity.id;
      return firstEntity as EntityImpl;
    }
    return null;
  }

  /**
   * Index a negotiation for fast lookup
   */
  private indexNegotiation(negotiationId: string, entityId: string): void {
    this.negotiationEntityIndex.set(negotiationId, entityId);
  }

  /**
   * Remove negotiation from index
   */
  private unindexNegotiation(negotiationId: string): void {
    this.negotiationEntityIndex.delete(negotiationId);
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get or create negotiation component for an entity
   */
  public getOrCreateNegotiationComponent(
    world: World,
    entityId: string
  ): NegotiationComponent | null {
    const entity = world.getEntity(entityId);
    if (!entity) return null;

    let component = entity.getComponent<NegotiationComponent>(CT.Negotiation);
    if (!component) {
      component = createNegotiationComponent();
      (entity as EntityImpl).addComponent(component);
    }

    return component;
  }

  /**
   * Initiate a new negotiation between entities
   */
  public initiateNegotiation(
    world: World,
    initiatorId: string,
    targetIds: string[],
    type: NegotiationType,
    tier: PoliticalTier,
    initialTerms: NegotiationTerm[],
    priority: 'routine' | 'urgent' | 'critical' = 'routine',
    reasoning?: string,
    context?: Record<string, unknown>
  ): string | null {
    // Get or create negotiation components for all parties
    const initiatorComponent = this.getOrCreateNegotiationComponent(world, initiatorId);
    if (!initiatorComponent) return null;

    const allParticipants = [initiatorId, ...targetIds];

    // Create negotiation
    const negotiationId = `neg-${uuidv4()}`;
    const deadlineTicks = getDefaultDeadlineTicks(type, priority);
    const negotiation = createNegotiation(
      negotiationId,
      type,
      tier,
      initiatorId,
      allParticipants,
      world.tick,
      deadlineTicks,
      priority,
      context
    );

    // Create initial offer
    const offerId = `offer-${uuidv4()}`;
    const offer = createNegotiationOffer(
      offerId,
      initiatorId,
      initialTerms,
      world.tick,
      allParticipants,
      reasoning
    );

    addOfferToNegotiation(negotiation, offer);

    // Add negotiation to initiator's component
    initiatorComponent.activeNegotiations.push(negotiation);
    initiatorComponent.stats.totalNegotiationsInitiated++;

    // Index for fast lookup
    this.indexNegotiation(negotiationId, initiatorId);

    // Add negotiation reference to target entities
    for (const targetId of targetIds) {
      const targetComponent = this.getOrCreateNegotiationComponent(world, targetId);
      if (targetComponent) {
        // Create a reference to the same negotiation
        targetComponent.activeNegotiations.push(negotiation);
        targetComponent.stats.totalNegotiationsReceived++;
      }
    }

    // Emit negotiation started event
    world.eventBus.emit({
      type: 'negotiation:started',
      source: initiatorId,
      data: {
        negotiationId,
        type,
        initiatorId,
        targetIds,
        priority,
        deadlineTick: negotiation.deadlineTick,
        tick: world.tick,
      },
    });

    return negotiationId;
  }

  /**
   * Respond to a negotiation offer
   */
  public respondToOffer(
    world: World,
    entityId: string,
    negotiationId: string,
    response: 'accept' | 'reject' | 'counter',
    counterTerms?: NegotiationTerm[],
    reasoning?: string
  ): boolean {
    const component = this.getOrCreateNegotiationComponent(world, entityId);
    if (!component) return false;

    const negotiation = component.activeNegotiations.find(n => n.id === negotiationId);
    if (!negotiation || !negotiation.currentOfferId) return false;

    const currentOffer = negotiation.offers.find(o => o.id === negotiation.currentOfferId);
    if (!currentOffer) return false;

    if (response === 'counter' && counterTerms) {
      // Create counter-offer
      const counterOfferId = `offer-${uuidv4()}`;
      const counterOffer = createNegotiationOffer(
        counterOfferId,
        entityId,
        counterTerms,
        world.tick,
        negotiation.participantIds,
        reasoning,
        currentOffer.id
      );

      addOfferToNegotiation(negotiation, counterOffer);
      recordOfferResponse(negotiation, currentOffer.id, entityId, 'countered');
    } else {
      recordOfferResponse(
        negotiation,
        currentOffer.id,
        entityId,
        response === 'accept' ? 'accepted' : 'rejected'
      );
    }

    // Emit response event
    world.eventBus.emit({
      type: 'negotiation:response',
      source: entityId,
      data: {
        negotiationId,
        offerId: currentOffer.id,
        responderId: entityId,
        response,
        tick: world.tick,
      } as OfferResponseEventData,
    });

    return true;
  }

  /**
   * Withdraw from a negotiation
   */
  public withdrawNegotiation(
    world: World,
    entityId: string,
    negotiationId: string,
    reason?: string
  ): boolean {
    const component = this.getOrCreateNegotiationComponent(world, entityId);
    if (!component) return false;

    const negotiation = component.activeNegotiations.find(n => n.id === negotiationId);
    if (!negotiation) return false;

    // Only initiator can withdraw
    if (negotiation.initiatorId !== entityId) return false;

    negotiation.status = 'withdrawn';
    negotiation.failureReason = reason || 'Negotiation withdrawn by initiator';

    // Emit withdrawal event
    world.eventBus.emit({
      type: 'negotiation:withdrawn',
      source: entityId,
      data: {
        negotiationId,
        type: negotiation.type,
        participantIds: negotiation.participantIds,
        status: 'withdrawn',
        tick: world.tick,
      } as NegotiationEventData,
    });

    return true;
  }

  /**
   * Get active negotiations for an entity
   */
  public getActiveNegotiations(
    world: World,
    entityId: string
  ): Negotiation[] {
    const entity = world.getEntity(entityId);
    if (!entity) return [];

    const component = entity.getComponent<NegotiationComponent>(CT.Negotiation);
    if (!component) return [];

    return component.activeNegotiations;
  }

  /**
   * Get negotiation by ID (O(1) indexed lookup)
   */
  public getNegotiationById(
    world: World,
    negotiationId: string
  ): Negotiation | null {
    // Fast path: use index
    const indexedEntityId = this.negotiationEntityIndex.get(negotiationId);
    if (indexedEntityId) {
      const entity = world.getEntity(indexedEntityId);
      if (entity) {
        const component = entity.getComponent<NegotiationComponent>(CT.Negotiation);
        if (component) {
          const active = component.activeNegotiations.find(n => n.id === negotiationId);
          if (active) return active;

          const completed = component.completedNegotiations.find(n => n.id === negotiationId);
          if (completed) return completed;
        }
      }
      // Index stale, remove it
      this.negotiationEntityIndex.delete(negotiationId);
    }

    // Slow path: search all negotiation components
    const entities = world.query().with(CT.Negotiation).executeEntities();

    for (const entity of entities) {
      const component = entity.getComponent<NegotiationComponent>(CT.Negotiation);
      if (!component) continue;

      const active = component.activeNegotiations.find(n => n.id === negotiationId);
      if (active) {
        // Cache for future lookups
        this.indexNegotiation(negotiationId, entity.id);
        return active;
      }

      const completed = component.completedNegotiations.find(n => n.id === negotiationId);
      if (completed) {
        this.indexNegotiation(negotiationId, entity.id);
        return completed;
      }
    }

    return null;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: NegotiationSystem | null = null;

export function getNegotiationSystem(): NegotiationSystem {
  if (!systemInstance) {
    systemInstance = new NegotiationSystem();
  }
  return systemInstance;
}
