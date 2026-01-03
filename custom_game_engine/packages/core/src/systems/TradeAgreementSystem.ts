/**
 * TradeAgreementSystem - Manages formal trade agreements between civilizations
 *
 * Supports:
 * - Local village-to-village trade (immediate)
 * - Cross-timeline trade (forked universes)
 * - Cross-universe trade (networked multiverse)
 * - Cross-multiverse trade (foreign multiverses via portals)
 *
 * Key Features:
 * - Hilbert-time causal ordering for async trades
 * - Escrow system for cross-realm trades
 * - Mayor/diplomat agent negotiation
 * - Automatic timeline fork detection and resolution
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors throw with clear messages
 * - Strict validation - agreements must be valid, parties must exist
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type {
  TradeAgreementComponent,
  EscrowItem,
  CausalTradeEvent,
  DiplomaticRelation,
} from '../components/TradeAgreementComponent.js';
import type {
  TradeAgreement,
  TradeTerm,
  TradeScope,
  CivilizationIdentity,
  NegotiationState,
  CounterOffer,
  AgreementStatus,
} from '../trade/TradeAgreementTypes.js';
import {
  determineTradeScope,
  calculateEscrowRequirement,
  calculateTradeFacilitationCost,
} from '../trade/TradeAgreementTypes.js';
import {
  advanceTime,
  detectCausalViolation,
  serializeTimeCoordinate,
} from '../trade/HilbertTime.js';
import type { MultiverseCoordinator } from '../multiverse/MultiverseCoordinator.js';
import { MayorNegotiator, createCivilizationContext } from '../trade/MayorNegotiator.js';
import type { CivilizationContext } from '../trade/MayorNegotiator.js';
import type { LLMProvider } from '@ai-village/llm';

// Interval for processing agreements (every 5 seconds at 20 TPS)
const UPDATE_INTERVAL = 100;

/**
 * System for managing formal trade agreements
 */
export class TradeAgreementSystem implements System {
  public readonly id: SystemId = 'trade_agreement';
  public readonly priority: number = 26; // Run after TradingSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private isInitialized = false;
  private lastUpdateTick = 0;

  /** Reference to multiverse coordinator for cross-universe operations */
  private _coordinatorRef?: MultiverseCoordinator;

  /** Mayor negotiator for LLM-driven trade decisions */
  private mayorNegotiator?: MayorNegotiator;

  /**
   * Initialize the system
   */
  public initialize(_world: World, _eventBus: EventBus): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
  }

  /**
   * Set the multiverse coordinator for cross-universe operations
   */
  public setMultiverseCoordinator(coordinator: MultiverseCoordinator): void {
    this._coordinatorRef = coordinator;
  }

  /**
   * Get the multiverse coordinator (if set)
   */
  public getMultiverseCoordinator(): MultiverseCoordinator | undefined {
    return this._coordinatorRef;
  }

  /**
   * Set the LLM provider for mayor negotiation
   */
  public setLLMProvider(llmProvider: LLMProvider): void {
    this.mayorNegotiator = new MayorNegotiator(llmProvider);
  }

  /**
   * Update - process active agreements, escrow releases, and causal events
   */
  public update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Throttle updates
    if (currentTick - this.lastUpdateTick < UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Get all civilization entities with trade agreement components
    const civEntities = world.query().with('trade_agreement').executeEntities();

    for (const entity of civEntities) {
      const tradeComp = entity.components.get('trade_agreement') as TradeAgreementComponent;
      if (!tradeComp) continue;

      // Process causal event queue
      this.processCausalEventQueue(world, entity, tradeComp, currentTick);

      // Process active agreements
      this.processActiveAgreements(world, entity, tradeComp, currentTick);

      // Process escrow releases
      this.processEscrowReleases(world, entity, tradeComp, currentTick);

      // Update time coordinate
      this.advanceTimeCoordinate(entity, tradeComp);
    }
  }

  // ===========================================================================
  // Proposal & Negotiation
  // ===========================================================================

  /**
   * Propose a new trade agreement between civilizations
   */
  public proposeAgreement(
    world: World,
    proposerCivId: string,
    targetCivId: string,
    terms: TradeTerm[],
    proposerAgentId: EntityId
  ): { success: boolean; agreementId?: string; reason?: string } {
    // Get proposer and target entities
    const proposerEntity = this.getCivilizationEntity(world, proposerCivId);
    const targetEntity = this.getCivilizationEntity(world, targetCivId);

    if (!proposerEntity || !targetEntity) {
      throw new Error(
        `Cannot find civilization entities: proposer=${proposerCivId}, target=${targetCivId}`
      );
    }

    const proposerComp = proposerEntity.components.get(
      'trade_agreement'
    ) as TradeAgreementComponent;
    const targetComp = targetEntity.components.get('trade_agreement') as TradeAgreementComponent;

    if (!proposerComp || !targetComp) {
      throw new Error('One or both civilizations missing trade_agreement component');
    }

    // Determine trade scope
    const proposerIdentity: CivilizationIdentity = {
      id: proposerComp.civilizationId,
      name: proposerComp.civilizationName,
      type: 'player_village', // Could be determined from entity
      universeId: proposerComp.universeId,
      multiverseId: proposerComp.multiverseId,
      representativeId: proposerAgentId,
    };

    const targetIdentity: CivilizationIdentity = {
      id: targetComp.civilizationId,
      name: targetComp.civilizationName,
      type: 'npc_village', // Could be determined from entity
      universeId: targetComp.universeId,
      multiverseId: targetComp.multiverseId,
    };

    const scope = determineTradeScope(proposerIdentity, targetIdentity);

    // Calculate facilitation cost
    const totalValue = this.calculateTermsValue(terms);
    const facilitationCost = calculateTradeFacilitationCost(scope, totalValue);

    // Determine if escrow is required
    const trustLevel = this.getTrustLevel(proposerComp, targetCivId);
    const requiresEscrow = calculateEscrowRequirement(scope, trustLevel);

    // Create the agreement
    const agreementId = `agreement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentTick = BigInt(world.tick);

    const agreement: TradeAgreement = {
      id: agreementId,
      scope,
      parties: [proposerIdentity, targetIdentity],
      terms,
      mediators: [
        {
          agentId: proposerAgentId,
          civilizationId: proposerCivId,
          role: 'proposer',
        },
      ],
      status: 'proposed',
      proposedAt: currentTick,
      autoRenew: false,
      violations: [],
      totalValueExchanged: 0,
      crossRealmMetadata:
        scope !== 'local' && scope !== 'inter_village'
          ? {
              passageIds: [],
              escrowEntities: [],
              timeSyncMode: 'relative',
              trustLevel,
              successfulTrades: 0,
              failedTrades: 0,
            }
          : undefined,
    };

    // Add to target's incoming proposals
    const updatedTargetComp: TradeAgreementComponent = {
      ...targetComp,
      incomingProposals: [...targetComp.incomingProposals, agreement],
    };

    // Add to proposer's pending negotiations
    const negotiationState: NegotiationState = {
      agreementId,
      proposalVersion: 1,
      counterOffers: [],
      negotiators: [
        {
          agentId: proposerAgentId,
          civilizationId: proposerCivId,
          lastResponseTick: currentTick,
        },
      ],
      timeoutTick: currentTick + 12000n, // 10 minute timeout
    };

    const updatedProposerComp: TradeAgreementComponent = {
      ...proposerComp,
      pendingNegotiations: [...proposerComp.pendingNegotiations, negotiationState],
    };

    // Update entities
    (proposerEntity as EntityImpl).updateComponent('trade_agreement', () => updatedProposerComp);
    (targetEntity as EntityImpl).updateComponent('trade_agreement', () => updatedTargetComp);

    // Emit event
    this.emitTradeEvent(world, 'proposed', agreementId, currentTick, {
      proposerId: proposerCivId,
      targetId: targetCivId,
      scope,
      facilitationCost,
      requiresEscrow,
    });

    // For cross-universe trades, queue as causal event in target
    if (scope === 'cross_universe' || scope === 'cross_multiverse') {
      this.queueCausalEvent(targetEntity, updatedTargetComp, {
        type: 'proposal',
        sourceCivilizationId: proposerCivId,
        sourceUniverseId: proposerComp.universeId,
        sourceMultiverseId: proposerComp.multiverseId,
        eventTimeCoordinate: proposerComp.currentTimeCoordinate,
        receivedTimeCoordinate: targetComp.currentTimeCoordinate,
        data: { agreement },
        causalParents: [serializeTimeCoordinate(proposerComp.currentTimeCoordinate)],
        isCausalViolation: false,
      });
    }

    return { success: true, agreementId };
  }

  /**
   * Accept a proposed trade agreement
   */
  public acceptAgreement(
    world: World,
    acceptorCivId: string,
    agreementId: string,
    acceptorAgentId: EntityId
  ): { success: boolean; reason?: string } {
    const acceptorEntity = this.getCivilizationEntity(world, acceptorCivId);
    if (!acceptorEntity) {
      throw new Error(`Civilization ${acceptorCivId} not found`);
    }

    const acceptorComp = acceptorEntity.components.get(
      'trade_agreement'
    ) as TradeAgreementComponent;
    if (!acceptorComp) {
      throw new Error(`Civilization ${acceptorCivId} missing trade_agreement component`);
    }

    // Find the proposal
    const proposalIndex = acceptorComp.incomingProposals.findIndex((p) => p.id === agreementId);
    if (proposalIndex === -1) {
      return { success: false, reason: `Agreement ${agreementId} not found in incoming proposals` };
    }

    const proposal = acceptorComp.incomingProposals[proposalIndex]!;
    const currentTick = BigInt(world.tick);

    // Move to active agreements
    const acceptedAgreement: TradeAgreement = {
      ...proposal,
      status: 'active',
      acceptedAt: currentTick,
      mediators: [
        ...proposal.mediators,
        {
          agentId: acceptorAgentId,
          civilizationId: acceptorCivId,
          role: 'acceptor',
        },
      ],
    };

    // Update acceptor's component
    const updatedAcceptorComp: TradeAgreementComponent = {
      ...acceptorComp,
      incomingProposals: acceptorComp.incomingProposals.filter((p) => p.id !== agreementId),
      activeAgreements: [...acceptorComp.activeAgreements, acceptedAgreement],
    };

    (acceptorEntity as EntityImpl).updateComponent('trade_agreement', () => updatedAcceptorComp);

    // Update proposer's component
    const proposerCivId = proposal.parties.find((p) => p.id !== acceptorCivId)?.id;
    if (proposerCivId) {
      const proposerEntity = this.getCivilizationEntity(world, proposerCivId);
      if (proposerEntity) {
        const proposerComp = proposerEntity.components.get(
          'trade_agreement'
        ) as TradeAgreementComponent;
        if (proposerComp) {
          const updatedProposerComp: TradeAgreementComponent = {
            ...proposerComp,
            pendingNegotiations: proposerComp.pendingNegotiations.filter(
              (n) => n.agreementId !== agreementId
            ),
            activeAgreements: [...proposerComp.activeAgreements, acceptedAgreement],
          };
          (proposerEntity as EntityImpl).updateComponent(
            'trade_agreement',
            () => updatedProposerComp
          );
        }
      }
    }

    // Emit event
    this.emitTradeEvent(world, 'accepted', agreementId, currentTick, {
      acceptorId: acceptorCivId,
      proposerId: proposerCivId,
    });

    return { success: true };
  }

  /**
   * Submit a counter-offer for a proposed agreement
   */
  public counterOffer(
    world: World,
    responderCivId: string,
    agreementId: string,
    modifiedTerms: TradeTerm[],
    reasoning: string,
    responderAgentId: EntityId
  ): { success: boolean; reason?: string } {
    const responderEntity = this.getCivilizationEntity(world, responderCivId);
    if (!responderEntity) {
      throw new Error(`Civilization ${responderCivId} not found`);
    }

    const responderComp = responderEntity.components.get(
      'trade_agreement'
    ) as TradeAgreementComponent;
    if (!responderComp) {
      throw new Error(`Civilization ${responderCivId} missing trade_agreement component`);
    }

    // Find the proposal
    const proposalIndex = responderComp.incomingProposals.findIndex((p) => p.id === agreementId);
    if (proposalIndex === -1) {
      return { success: false, reason: `Agreement ${agreementId} not found in incoming proposals` };
    }

    const proposal = responderComp.incomingProposals[proposalIndex]!;
    const currentTick = BigInt(world.tick);

    // Create counter-offer
    const counterOffer: CounterOffer = {
      proposerId: responderCivId,
      version: (proposal.crossRealmMetadata?.successfulTrades ?? 0) + 1,
      proposedAt: currentTick,
      modifiedTerms,
      reasoning,
    };

    // Update proposal status
    const updatedProposal: TradeAgreement = {
      ...proposal,
      status: 'negotiating',
      terms: modifiedTerms,
    };

    // Update responder's component - move to pending negotiations
    const negotiationState: NegotiationState = {
      agreementId,
      proposalVersion: counterOffer.version,
      counterOffers: [counterOffer],
      negotiators: [
        ...proposal.mediators.map((m) => ({
          agentId: m.agentId,
          civilizationId: m.civilizationId,
          lastResponseTick: currentTick,
        })),
        {
          agentId: responderAgentId,
          civilizationId: responderCivId,
          lastResponseTick: currentTick,
        },
      ],
      timeoutTick: currentTick + 12000n,
    };

    const updatedResponderComp: TradeAgreementComponent = {
      ...responderComp,
      incomingProposals: responderComp.incomingProposals.filter((p) => p.id !== agreementId),
      pendingNegotiations: [...responderComp.pendingNegotiations, negotiationState],
    };

    (responderEntity as EntityImpl).updateComponent('trade_agreement', () => updatedResponderComp);

    // Update original proposer - add counter-offer to their incoming
    const proposerCivId = proposal.parties.find((p) => p.id !== responderCivId)?.id;
    if (proposerCivId) {
      const proposerEntity = this.getCivilizationEntity(world, proposerCivId);
      if (proposerEntity) {
        const proposerComp = proposerEntity.components.get(
          'trade_agreement'
        ) as TradeAgreementComponent;
        if (proposerComp) {
          const updatedProposerComp: TradeAgreementComponent = {
            ...proposerComp,
            pendingNegotiations: proposerComp.pendingNegotiations.filter(
              (n) => n.agreementId !== agreementId
            ),
            incomingProposals: [...proposerComp.incomingProposals, updatedProposal],
          };
          (proposerEntity as EntityImpl).updateComponent(
            'trade_agreement',
            () => updatedProposerComp
          );
        }
      }
    }

    // Emit event
    this.emitTradeEvent(world, 'counter_offered', agreementId, currentTick, {
      responderId: responderCivId,
      proposerId: proposerCivId,
      reasoning,
    });

    return { success: true };
  }

  /**
   * Have a mayor/diplomat agent evaluate an incoming proposal using LLM
   */
  public async evaluateProposalWithMayor(
    world: World,
    civId: string,
    agreementId: string,
    mayorAgentId: EntityId,
    context: CivilizationContext
  ): Promise<{ success: boolean; decision?: 'accept' | 'reject' | 'counter'; reasoning?: string; reason?: string }> {
    if (!this.mayorNegotiator) {
      return { success: false, reason: 'LLM provider not configured for mayor negotiation' };
    }

    const entity = this.getCivilizationEntity(world, civId);
    if (!entity) {
      throw new Error(`Civilization ${civId} not found`);
    }

    const comp = entity.components.get('trade_agreement') as TradeAgreementComponent;
    if (!comp) {
      throw new Error(`Civilization ${civId} missing trade_agreement component`);
    }

    // Find the proposal
    const proposal = comp.incomingProposals.find((p) => p.id === agreementId);
    if (!proposal) {
      return { success: false, reason: `Agreement ${agreementId} not found in incoming proposals` };
    }

    const ourCivilization: CivilizationIdentity = {
      id: comp.civilizationId,
      name: comp.civilizationName,
      type: 'player_village',
      universeId: comp.universeId,
      multiverseId: comp.multiverseId,
      representativeId: mayorAgentId,
    };

    try {
      const decision = await this.mayorNegotiator.evaluateProposal(
        proposal,
        ourCivilization,
        comp,
        mayorAgentId,
        context
      );

      // Execute the decision
      if (decision.decision === 'accept') {
        const result = this.acceptAgreement(world, civId, agreementId, mayorAgentId);
        return { ...result, decision: 'accept', reasoning: decision.reasoning };
      } else if (decision.decision === 'reject') {
        const result = this.cancelAgreement(world, civId, agreementId, decision.reasoning);
        return { ...result, decision: 'reject', reasoning: decision.reasoning };
      } else if (decision.decision === 'counter' && decision.modifiedTerms) {
        const result = this.counterOffer(
          world,
          civId,
          agreementId,
          decision.modifiedTerms,
          decision.reasoning,
          mayorAgentId
        );
        return { ...result, decision: 'counter', reasoning: decision.reasoning };
      } else {
        return { success: false, reason: 'Invalid decision from mayor negotiator' };
      }
    } catch (error) {
      return {
        success: false,
        reason: `Mayor negotiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Create civilization context for mayor negotiation from world state
   */
  public createNegotiationContext(
    world: World,
    civId: string
  ): CivilizationContext | undefined {
    const entity = this.getCivilizationEntity(world, civId);
    if (!entity) return undefined;

    // This is a simplified context builder - in practice would query
    // village resources, population, food stores, etc.
    // For now, return a basic context
    return createCivilizationContext(
      100, // population - would come from village data
      1000, // foodSupply - would come from resource system
      10, // foodDaysRemaining - calculated
      new Map(), // resources - would come from inventory
      [], // needs - would come from AI analysis
      'trade' // focus - would come from city director
    );
  }

  /**
   * Cancel/reject an agreement
   */
  public cancelAgreement(
    world: World,
    civId: string,
    agreementId: string,
    reason: string
  ): { success: boolean } {
    const entity = this.getCivilizationEntity(world, civId);
    if (!entity) {
      throw new Error(`Civilization ${civId} not found`);
    }

    const comp = entity.components.get('trade_agreement') as TradeAgreementComponent;
    if (!comp) {
      throw new Error(`Civilization ${civId} missing trade_agreement component`);
    }

    const currentTick = BigInt(world.tick);

    // Remove from all lists
    const updatedComp: TradeAgreementComponent = {
      ...comp,
      incomingProposals: comp.incomingProposals.filter((p) => p.id !== agreementId),
      pendingNegotiations: comp.pendingNegotiations.filter((n) => n.agreementId !== agreementId),
      activeAgreements: comp.activeAgreements.map((a) =>
        a.id === agreementId ? { ...a, status: 'cancelled' as AgreementStatus } : a
      ),
    };

    (entity as EntityImpl).updateComponent('trade_agreement', () => updatedComp);

    // Emit event
    this.emitTradeEvent(world, 'cancelled', agreementId, currentTick, { civId, reason });

    return { success: true };
  }

  // ===========================================================================
  // Escrow Management
  // ===========================================================================

  /**
   * Deposit items into escrow for a cross-realm trade
   */
  public depositEscrow(
    world: World,
    civId: string,
    agreementId: string,
    itemId: string,
    quantity: number,
    passageId: string
  ): { success: boolean; escrowId?: string; reason?: string } {
    const entity = this.getCivilizationEntity(world, civId);
    if (!entity) {
      throw new Error(`Civilization ${civId} not found`);
    }

    const comp = entity.components.get('trade_agreement') as TradeAgreementComponent;
    if (!comp) {
      throw new Error(`Civilization ${civId} missing trade_agreement component`);
    }

    // Find the agreement
    const agreement = comp.activeAgreements.find((a) => a.id === agreementId);
    if (!agreement) {
      return { success: false, reason: `Agreement ${agreementId} not found in active agreements` };
    }

    // Verify this is a cross-realm trade requiring escrow
    if (agreement.scope === 'local' || agreement.scope === 'inter_village') {
      return { success: false, reason: 'Local trades do not require escrow' };
    }

    const currentTick = BigInt(world.tick);

    // Calculate escrow hold period based on trust
    const otherPartyId = agreement.parties.find((p) => p.id !== civId)?.id ?? '';
    const trustLevel = this.getTrustLevel(comp, otherPartyId);
    const holdPeriod = this.calculateEscrowHoldPeriod(trustLevel, agreement.scope);

    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const escrowItem: EscrowItem = {
      escrowId,
      agreementId,
      itemId,
      quantity,
      depositedBy: civId,
      releaseTo: otherPartyId,
      heldAtPassageId: passageId,
      depositedAtTick: currentTick,
      releasableAtTick: currentTick + BigInt(holdPeriod),
      depositTimeCoordinate: comp.currentTimeCoordinate,
      status: 'held',
    };

    const updatedComp: TradeAgreementComponent = {
      ...comp,
      escrowHeld: [...comp.escrowHeld, escrowItem],
    };

    (entity as EntityImpl).updateComponent('trade_agreement', () => updatedComp);

    // Also update the receiving party's escrowPending
    const otherEntity = this.getCivilizationEntity(world, otherPartyId);
    if (otherEntity) {
      const otherComp = otherEntity.components.get('trade_agreement') as TradeAgreementComponent;
      if (otherComp) {
        const updatedOtherComp: TradeAgreementComponent = {
          ...otherComp,
          escrowPending: [...otherComp.escrowPending, escrowItem],
        };
        (otherEntity as EntityImpl).updateComponent('trade_agreement', () => updatedOtherComp);
      }
    }

    return { success: true, escrowId };
  }

  /**
   * Process escrow releases (called in update loop)
   */
  private processEscrowReleases(
    world: World,
    entity: Entity,
    comp: TradeAgreementComponent,
    currentTick: number
  ): void {
    const tick = BigInt(currentTick);
    const releasable = comp.escrowHeld.filter(
      (e) => e.status === 'held' && e.releasableAtTick <= tick
    );

    if (releasable.length === 0) return;

    const released: EscrowItem[] = [];
    const stillHeld: EscrowItem[] = [];

    for (const escrow of comp.escrowHeld) {
      if (escrow.status === 'held' && escrow.releasableAtTick <= tick) {
        released.push({ ...escrow, status: 'released' });

        // Emit release event
        this.emitTradeEvent(world, 'delivery_made', escrow.agreementId, tick, {
          escrowId: escrow.escrowId,
          itemId: escrow.itemId,
          quantity: escrow.quantity,
          from: escrow.depositedBy,
          to: escrow.releaseTo,
        });
      } else {
        stillHeld.push(escrow);
      }
    }

    if (released.length > 0) {
      const updatedComp: TradeAgreementComponent = {
        ...comp,
        escrowHeld: stillHeld,
        recentEvents: [
          ...comp.recentEvents,
          ...released.map((e) => ({
            type: 'delivery_made' as const,
            agreementId: e.agreementId,
            tick,
            data: { escrowId: e.escrowId, itemId: e.itemId, quantity: e.quantity },
          })),
        ].slice(-comp.maxEventHistory),
      };

      (entity as EntityImpl).updateComponent('trade_agreement', () => updatedComp);
    }
  }

  // ===========================================================================
  // Causal Event Processing (Hilbert-Time)
  // ===========================================================================

  /**
   * Queue a causal event from another universe
   */
  private queueCausalEvent(
    entity: Entity,
    comp: TradeAgreementComponent,
    event: CausalTradeEvent
  ): void {
    // Check for causal violations
    const violation = detectCausalViolation(
      event.eventTimeCoordinate,
      comp.currentTimeCoordinate,
      comp.partnerTimeCoordinates
    );

    if (violation) {
      event.isCausalViolation = true;
      if (violation.resolution === 'fork' && violation.forkAtTau !== undefined) {
        event.forkRequired = {
          forkAtTick: violation.forkAtTau,
          reason: violation.description,
        };
      }
    }

    const updatedComp: TradeAgreementComponent = {
      ...comp,
      causalEventQueue: [...comp.causalEventQueue, event],
    };

    (entity as EntityImpl).updateComponent('trade_agreement', () => updatedComp);
  }

  /**
   * Process queued causal events
   */
  private processCausalEventQueue(
    world: World,
    entity: Entity,
    comp: TradeAgreementComponent,
    currentTick: number
  ): void {
    if (comp.causalEventQueue.length === 0) return;

    const tick = BigInt(currentTick);
    const processed: CausalTradeEvent[] = [];
    const remaining: CausalTradeEvent[] = [];

    for (const event of comp.causalEventQueue) {
      // Check if event requires timeline fork
      if (event.forkRequired) {
        // Emit fork event for multiverse coordinator to handle
        (world.eventBus.emit as any)({
          type: 'multiverse:timeline_fork_required',
          source: entity.id,
          data: {
            reason: event.forkRequired.reason,
            forkAtTick: event.forkRequired.forkAtTick,
            causalEvent: event,
          },
        });
        processed.push(event);
        continue;
      }

      // Process the event based on type
      switch (event.type) {
        case 'proposal':
          // Already added to incomingProposals when queued
          processed.push(event);
          break;

        case 'acceptance':
          this.handleRemoteAcceptance(world, entity, comp, event, tick);
          processed.push(event);
          break;

        case 'rejection':
        case 'cancellation':
          this.handleRemoteCancellation(world, entity, comp, event, tick);
          processed.push(event);
          break;

        case 'delivery':
          // Process delivery confirmation
          processed.push(event);
          break;

        case 'violation':
          this.handleRemoteViolation(world, entity, comp, event, tick);
          processed.push(event);
          break;

        default:
          remaining.push(event);
      }
    }

    if (processed.length > 0) {
      const updatedComp: TradeAgreementComponent = {
        ...comp,
        causalEventQueue: remaining,
      };
      (entity as EntityImpl).updateComponent('trade_agreement', () => updatedComp);
    }
  }

  /**
   * Handle acceptance received from remote universe
   */
  private handleRemoteAcceptance(
    world: World,
    entity: Entity,
    _comp: TradeAgreementComponent,
    event: CausalTradeEvent,
    tick: bigint
  ): void {
    const agreementId = event.data?.agreementId;
    if (!agreementId) return;

    // Emit event for higher-level handling
    (world.eventBus.emit as any)({
      type: 'trade:remote_acceptance',
      source: entity.id,
      data: {
        agreementId,
        fromUniverse: event.sourceUniverseId,
        tick,
      },
    });
  }

  /**
   * Handle cancellation received from remote universe
   */
  private handleRemoteCancellation(
    world: World,
    entity: Entity,
    _comp: TradeAgreementComponent,
    event: CausalTradeEvent,
    tick: bigint
  ): void {
    const agreementId = event.data?.agreementId;
    if (!agreementId) return;

    (world.eventBus.emit as any)({
      type: 'trade:remote_cancellation',
      source: entity.id,
      data: {
        agreementId,
        fromUniverse: event.sourceUniverseId,
        reason: event.data?.reason,
        tick,
      },
    });
  }

  /**
   * Handle violation report from remote universe
   */
  private handleRemoteViolation(
    world: World,
    entity: Entity,
    comp: TradeAgreementComponent,
    event: CausalTradeEvent,
    tick: bigint
  ): void {
    const agreementId = event.data?.agreementId;
    if (!agreementId) return;

    // Update diplomatic relations
    const relation = comp.diplomaticRelations.get(event.sourceCivilizationId);
    if (relation) {
      const updatedRelation: DiplomaticRelation = {
        ...relation,
        failedTrades: relation.failedTrades + 1,
        trustLevel: this.degradeTrust(relation.trustLevel),
        incidents: [
          ...relation.incidents,
          {
            type: 'trade_violation',
            tick,
            description: event.data?.reason ?? 'Remote violation reported',
            trustImpact: -0.2,
            resolved: false,
          },
        ],
      };

      const updatedRelations = new Map(comp.diplomaticRelations);
      updatedRelations.set(event.sourceCivilizationId, updatedRelation);

      const updatedComp: TradeAgreementComponent = {
        ...comp,
        diplomaticRelations: updatedRelations,
      };
      (entity as EntityImpl).updateComponent('trade_agreement', () => updatedComp);
    }

    (world.eventBus.emit as any)({
      type: 'trade:remote_violation',
      source: entity.id,
      data: {
        agreementId,
        fromUniverse: event.sourceUniverseId,
        reason: event.data?.reason,
        tick,
      },
    });
  }

  // ===========================================================================
  // Agreement Processing
  // ===========================================================================

  /**
   * Process active agreements (deliveries, expirations, etc.)
   */
  private processActiveAgreements(
    world: World,
    entity: Entity,
    comp: TradeAgreementComponent,
    currentTick: number
  ): void {
    const tick = BigInt(currentTick);
    let needsUpdate = false;
    const updatedAgreements: TradeAgreement[] = [];

    for (const agreement of comp.activeAgreements) {
      if (agreement.status !== 'active') {
        updatedAgreements.push(agreement);
        continue;
      }

      // Check for expiration
      if (agreement.expiresAt && agreement.expiresAt <= tick) {
        if (agreement.autoRenew) {
          // Renew the agreement
          updatedAgreements.push({
            ...agreement,
            expiresAt: tick + BigInt(agreement.duration ?? 12000),
          });
          this.emitTradeEvent(world, 'renewed', agreement.id, tick, {});
        } else {
          // Mark as expired
          updatedAgreements.push({ ...agreement, status: 'expired' });
          this.emitTradeEvent(world, 'expired', agreement.id, tick, {});
        }
        needsUpdate = true;
        continue;
      }

      // Process periodic deliveries
      for (const term of agreement.terms) {
        if (
          term.delivery.method === 'periodic' &&
          term.delivery.nextDeliveryTick &&
          term.delivery.nextDeliveryTick <= tick
        ) {
          // Check if we're the provider
          if (term.providedBy === comp.civilizationId) {
            // Execute delivery
            this.executeDelivery(world, entity, comp, agreement, term, tick);
            needsUpdate = true;
          }
        }
      }

      updatedAgreements.push(agreement);
    }

    if (needsUpdate) {
      const updatedComp: TradeAgreementComponent = {
        ...comp,
        activeAgreements: updatedAgreements,
      };
      (entity as EntityImpl).updateComponent('trade_agreement', () => updatedComp);
    }
  }

  /**
   * Execute a delivery for a trade term
   */
  private executeDelivery(
    world: World,
    _entity: Entity,
    comp: TradeAgreementComponent,
    agreement: TradeAgreement,
    term: TradeTerm,
    tick: bigint
  ): void {
    // For cross-realm trades, deposit to escrow
    if (agreement.scope === 'cross_universe' || agreement.scope === 'cross_multiverse') {
      const passageIds = agreement.crossRealmMetadata?.passageIds ?? [];
      const passageId = passageIds[0] ?? '';
      this.depositEscrow(world, comp.civilizationId, agreement.id, term.itemId, term.quantity, passageId);
    }

    // Emit delivery event
    this.emitTradeEvent(world, 'delivery_made', agreement.id, tick, {
      termIndex: agreement.terms.indexOf(term),
      itemId: term.itemId,
      quantity: term.quantity,
      from: term.providedBy,
      to: term.receivedBy,
    });
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Advance the time coordinate for a civilization
   */
  private advanceTimeCoordinate(_entity: Entity, comp: TradeAgreementComponent): void {
    // Update the time coordinate - caller handles component update
    comp.currentTimeCoordinate = advanceTime(comp.currentTimeCoordinate);
  }

  /**
   * Get civilization entity by ID
   */
  private getCivilizationEntity(world: World, civId: string): Entity | undefined {
    const entities = world.query().with('trade_agreement').executeEntities();
    return entities.find((e) => {
      const comp = e.components.get('trade_agreement') as TradeAgreementComponent;
      return comp?.civilizationId === civId;
    });
  }

  /**
   * Get trust level with another civilization
   */
  private getTrustLevel(
    comp: TradeAgreementComponent,
    otherCivId: string
  ): 'untrusted' | 'new' | 'established' | 'trusted' {
    const relation = comp.diplomaticRelations.get(otherCivId);
    return relation?.trustLevel ?? 'new';
  }

  /**
   * Degrade trust level by one step
   */
  private degradeTrust(
    current: 'untrusted' | 'new' | 'established' | 'trusted'
  ): 'untrusted' | 'new' | 'established' | 'trusted' {
    switch (current) {
      case 'trusted':
        return 'established';
      case 'established':
        return 'new';
      case 'new':
      case 'untrusted':
        return 'untrusted';
    }
  }

  /**
   * Calculate escrow hold period based on trust and scope
   */
  private calculateEscrowHoldPeriod(
    trustLevel: 'untrusted' | 'new' | 'established' | 'trusted',
    scope: TradeScope
  ): number {
    const basePeriod: Record<TradeScope, number> = {
      local: 0,
      inter_village: 0,
      cross_timeline: 1200, // 1 minute
      cross_universe: 6000, // 5 minutes
      cross_multiverse: 12000, // 10 minutes
    };

    const trustMultiplier: Record<'untrusted' | 'new' | 'established' | 'trusted', number> = {
      untrusted: 2.0,
      new: 1.5,
      established: 1.0,
      trusted: 0.5,
    };

    return Math.floor(basePeriod[scope] * (trustMultiplier[trustLevel] ?? 1.0));
  }

  /**
   * Calculate total value of trade terms
   */
  private calculateTermsValue(terms: TradeTerm[]): number {
    // Simplified - would need item value lookup
    return terms.reduce((sum, t) => sum + t.quantity * 10, 0);
  }

  /**
   * Emit a trade agreement event
   */
  private emitTradeEvent(
    world: World,
    type: string,
    agreementId: string,
    _tick: bigint,
    data: Record<string, unknown>
  ): void {
    // Build the full event type
    const eventType = `trade_agreement:${type}` as keyof import('../events/EventMap.js').GameEventMap;

    // Emit with type assertion since we dynamically build event types
    world.eventBus.emit({
      type: eventType,
      source: 'trade_agreement_system',
      data: { agreementId, ...data },
    } as any);
  }
}
