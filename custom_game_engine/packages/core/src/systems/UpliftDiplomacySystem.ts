/**
 * UpliftDiplomacySystem - Civilization-to-civilization technological uplift diplomacy
 *
 * This system handles:
 * - Detection of primitive civilizations by advanced ones (tech gap ≥3 eras)
 * - Uplift offer decisions (Governor LLM-driven)
 * - Success/failure resolution based on era gap
 * - Cultural contamination mechanics (cargo cults, dependency traps, tech misuse)
 * - Ethical reputation tracking (Prime Directive vs Interventionist stance)
 * - Reputation effects on other civilizations' trust
 *
 * Priority: 220 (after governance systems at 195-200)
 *
 * Part of Grand Strategy Phase: Technology Eras & Civilization Uplift
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  UpliftAgreementComponent,
  UpliftOutcome,
} from '../components/UpliftAgreementComponent.js';
import {
  createUpliftAgreementComponent,
  calculateSuccessProbability,
  calculateCulturalContamination,
  determineUpliftOutcome,
  isUpliftActive,
} from '../components/UpliftAgreementComponent.js';
import type { CivilizationReputationComponent } from '../components/CivilizationReputationComponent.js';
import {
  createCivilizationReputationComponent,
  updateReputationFromUplift,
  updateKnownCivilization,
  getTrustLevel,
} from '../components/CivilizationReputationComponent.js';
import type { TechnologyEraComponent } from '../components/TechnologyEraComponent.js';
import { getEraIndex, getEraByIndex, recordEraTransition } from '../components/TechnologyEraComponent.js';

// ============================================================================
// System
// ============================================================================

export class UpliftDiplomacySystem extends BaseSystem {
  public readonly id: SystemId = 'uplift_diplomacy' as SystemId;
  public readonly priority: number = 220;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.TechnologyEra];
  public readonly activationComponents = ['technology_era'] as const;
  public readonly metadata = {
    category: 'economy' as const, // Governance/diplomatic systems use 'economy'
    description: 'Civilization-to-civilization technological uplift diplomacy',
    dependsOn: [] as SystemId[],
    writesComponents: [
      CT.TechnologyEra,
      CT.UpliftAgreement,
      CT.CivilizationReputation,
    ] as const,
  } as const;

  // Update interval: 1200 ticks = 60 seconds (strategic, infrequent)
  protected readonly throttleInterval = 1200;

  // ========================================================================
  // State
  // ========================================================================

  // Track which civilizations have been scanned recently (object literal for GC optimization)
  private lastScanTick: Record<string, number> = {};

  // Track active uplift agreements by uplifter civ ID
  private activeUplifts: Record<string, string[]> = {}; // civId -> agreementEntityIds[]

  /**
   * Initialize event listeners
   */
  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // === Governor Decision Events ===
    // React to governor decisions about uplift offers
    this.events.on('governance:uplift_offer_accepted', (data) => {
      this._onUpliftOfferAccepted(data);
    });

    this.events.on('governance:uplift_offer_rejected', (data) => {
      this._onUpliftOfferRejected(data);
    });

    // === Uplift Progress Events ===
    this.events.on('civilization:uplift_completed', (data) => {
      this._onUpliftCompleted(data);
    });

    this.events.on('civilization:uplift_failed', (data) => {
      this._onUpliftFailed(data);
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Step 1: Detect primitive civilizations and emit uplift opportunities
    this.detectUpliftOpportunities(ctx.world, tick);

    // Step 2: Process active uplift agreements
    this.processActiveUplifts(ctx.world, tick);

    // Step 3: Update reputation decay for modifiers
    this.decayReputationModifiers(ctx.world, tick);
  }

  // ========================================================================
  // Uplift Detection
  // ========================================================================

  /**
   * Detect primitive civilizations and emit uplift offer opportunities
   *
   * Scans for civilizations with tech gap ≥3 eras and emits events for
   * governor decision-making.
   */
  private detectUpliftOpportunities(world: World, tick: number): void {
    // Get all civilizations with TechnologyEraComponent
    const civilizations = world
      .query()
      .with(CT.TechnologyEra)
      .executeEntities();

    if (civilizations.length < 2) {
      return; // Need at least 2 civs for uplift
    }

    // For each advanced civilization
    for (const advancedEntity of civilizations) {
      const advancedTech = advancedEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
      if (!advancedTech) continue;

      const advancedEraIndex = getEraIndex(advancedTech.currentEra);

      // Skip if recently scanned (throttle per-civ scanning)
      const lastScan = this.lastScanTick[advancedEntity.id] ?? 0;
      if (tick - lastScan < this.throttleInterval) {
        continue;
      }
      this.lastScanTick[advancedEntity.id] = tick;

      // Ensure civilization has reputation component
      this.ensureReputationComponent(advancedEntity as EntityImpl);

      const reputation = advancedEntity.getComponent<CivilizationReputationComponent>(
        CT.CivilizationReputation
      );
      if (!reputation) continue;

      // Scan for primitive civilizations
      for (const primitiveEntity of civilizations) {
        if (primitiveEntity.id === advancedEntity.id) continue;

        const primitiveTech = primitiveEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
        if (!primitiveTech) continue;

        const primitiveEraIndex = getEraIndex(primitiveTech.currentEra);

        // Check for tech gap ≥3 eras
        const eraGap = advancedEraIndex - primitiveEraIndex;
        if (eraGap < 3) {
          continue; // Not enough gap for uplift consideration
        }

        // Update known civilizations in reputation
        updateKnownCivilization(
          reputation,
          primitiveEntity.id,
          primitiveTech.currentEra, // Use era as name placeholder
          primitiveTech.currentEra,
          primitiveEraIndex,
          0, // Distance calculation would require position data
          tick
        );

        // Check if already being uplifted by this civ
        const alreadyUplifting = this.isAlreadyUplifting(
          advancedEntity.id,
          primitiveEntity.id,
          world
        );
        if (alreadyUplifting) {
          continue;
        }

        // Check if primitive civ is already being uplifted by someone
        if (primitiveTech.upliftingCivIds.length > 0) {
          continue; // Already being uplifted by another civilization
        }

        // Emit uplift opportunity event for governor decision
        this.emitUpliftOpportunity(
          world,
          advancedEntity.id,
          primitiveEntity.id,
          advancedTech,
          primitiveTech,
          eraGap,
          tick
        );
      }
    }
  }

  /**
   * Emit uplift opportunity event for governor decision-making
   */
  private emitUpliftOpportunity(
    world: World,
    advancedCivId: string,
    primitiveCivId: string,
    advancedTech: TechnologyEraComponent,
    primitiveTech: TechnologyEraComponent,
    eraGap: number,
    tick: number
  ): void {
    // Calculate proposed era jump (can be 1 to eraGap, governor decides)
    const maxJump = Math.min(eraGap, 5); // Cap at 5 era jump
    const successProbability = calculateSuccessProbability(maxJump);

    world.eventBus.emit({
      type: 'governance:uplift_offer_available',
      source: advancedCivId,
      data: {
        advancedCivId,
        primitiveCivId,
        advancedEra: advancedTech.currentEra,
        primitiveEra: primitiveTech.currentEra,
        eraGap,
        maxEraJump: maxJump,
        successProbability,
        tick,
      },
    });
  }

  // ========================================================================
  // Uplift Agreement Processing
  // ========================================================================

  /**
   * Process active uplift agreements
   */
  private processActiveUplifts(world: World, tick: number): void {
    const agreements = world
      .query()
      .with(CT.UpliftAgreement)
      .executeEntities();

    for (const agreementEntity of agreements) {
      const agreement = agreementEntity.getComponent<UpliftAgreementComponent>(CT.UpliftAgreement);
      if (!agreement) continue;

      // Skip completed/failed agreements
      if (!isUpliftActive(agreement)) {
        continue;
      }

      // Process based on current phase
      if (agreement.currentPhase === 'negotiating') {
        // Negotiation phase - waiting for governor decision
        // Governor decisions handled via events, system just tracks timeout
        const elapsedTicks = tick - agreement.startTick;
        if (elapsedTicks > 600) {
          // 30 second timeout
          // Auto-reject if no decision made
          this.completeUplift(
            world,
            agreementEntity as EntityImpl,
            agreement,
            'rejection',
            tick
          );
        }
      } else if (agreement.currentPhase === 'in_progress') {
        // Active uplift in progress
        this.processActiveUplift(world, agreementEntity as EntityImpl, agreement, tick);
      }
    }
  }

  /**
   * Process an active uplift agreement
   */
  private processActiveUplift(
    world: World,
    agreementEntity: EntityImpl,
    agreement: UpliftAgreementComponent,
    tick: number
  ): void {
    // Calculate progress based on time elapsed
    const elapsedTicks = tick - agreement.startTick;
    const progress = Math.min(100, (elapsedTicks / agreement.durationTicks) * 100);

    // Update progress
    agreementEntity.updateComponent(CT.UpliftAgreement, (a) => ({
      ...a,
      progress,
    }));

    // Check if complete
    if (progress >= 100) {
      // Roll for success/failure
      const successRoll = Math.random();
      const contamination = calculateCulturalContamination(
        agreement.targetEraJump,
        successRoll
      );
      const outcome = determineUpliftOutcome(
        successRoll,
        agreement.successProbability,
        contamination
      );

      // Complete the uplift
      this.completeUplift(world, agreementEntity, agreement, outcome, tick);
    }
  }

  /**
   * Complete an uplift agreement with given outcome
   */
  private completeUplift(
    world: World,
    agreementEntity: EntityImpl,
    agreement: UpliftAgreementComponent,
    outcome: UpliftOutcome,
    tick: number
  ): void {
    // Get uplifter and uplifted entities
    const uplifterEntity = world.getEntity(agreement.uplifterCivId);
    const upliftedEntity = world.getEntity(agreement.upliftedCivId);

    if (!uplifterEntity || !upliftedEntity) {
      console.error('[UpliftDiplomacySystem] Missing uplifter or uplifted entity');
      return;
    }

    const uplifterTech = uplifterEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
    const upliftedTech = upliftedEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);

    if (!uplifterTech || !upliftedTech) {
      console.error('[UpliftDiplomacySystem] Missing technology era components');
      return;
    }

    // Update agreement
    agreementEntity.updateComponent(CT.UpliftAgreement, (a) => ({
      ...a,
      currentPhase: outcome === 'rejection' ? 'failed' : 'completed',
      progress: 100,
      outcome,
      completionTick: tick,
    }));

    // Apply outcome effects
    if (outcome === 'full_success' || outcome === 'partial_dependency') {
      // Advance uplifted civilization's era
      const currentEraIndex = getEraIndex(upliftedTech.currentEra);
      const newEraIndex = Math.min(14, currentEraIndex + agreement.targetEraJump);
      const newEra = getEraByIndex(newEraIndex);

      if (newEra) {
        (upliftedEntity as EntityImpl).updateComponent(CT.TechnologyEra, (tech) => ({
          ...tech,
          currentEra: newEra,
          eraProgress: 0,
          eraStartTick: tick,
          upliftedBy: agreement.uplifterCivId,
          upliftedAtTick: tick,
        }));

        // Record era transition
        recordEraTransition(
          upliftedTech,
          upliftedTech.currentEra,
          newEra,
          tick,
          'uplift',
          agreement.uplifterCivId
        );

        // Update uplifter's uplifting list
        (uplifterEntity as EntityImpl).updateComponent(CT.TechnologyEra, (tech) => {
          const updated = { ...tech };
          if (!updated.upliftingCivIds.includes(agreement.upliftedCivId)) {
            updated.upliftingCivIds = [...updated.upliftingCivIds, agreement.upliftedCivId];
          }
          return updated;
        });
      }
    }

    // Add complications based on outcome
    if (outcome === 'cargo_cult') {
      agreementEntity.updateComponent(CT.UpliftAgreement, (a) => ({
        ...a,
        complications: [
          ...a.complications,
          {
            type: 'cargo_cult' as const,
            description: 'Uplifted civilization misunderstood technology, forming cargo cult',
            tick,
            severity: 0.8,
          },
        ],
      }));
    } else if (outcome === 'tech_misuse') {
      agreementEntity.updateComponent(CT.UpliftAgreement, (a) => ({
        ...a,
        complications: [
          ...a.complications,
          {
            type: 'tech_misuse' as const,
            description: 'Technology misused, causing weapons proliferation or environmental damage',
            tick,
            severity: 0.9,
          },
        ],
      }));
    } else if (outcome === 'partial_dependency') {
      agreementEntity.updateComponent(CT.UpliftAgreement, (a) => ({
        ...a,
        complications: [
          ...a.complications,
          {
            type: 'dependency_trap' as const,
            description: 'Uplifted civilization became dependent on uplifter for continued support',
            tick,
            severity: 0.6,
          },
        ],
      }));
    }

    // Update uplifter's reputation
    const reputation = uplifterEntity.getComponent<CivilizationReputationComponent>(
      CT.CivilizationReputation
    );
    if (reputation) {
      updateReputationFromUplift(
        reputation,
        outcome,
        agreement.upliftedCivId,
        agreement.targetEraJump
      );

      // Add to uplift history
      reputation.upliftHistory.push({
        targetCivId: agreement.upliftedCivId,
        targetCivName: upliftedTech.currentEra, // Placeholder
        startTick: agreement.startTick,
        completionTick: tick,
        outcome,
        eraJump: agreement.targetEraJump,
      });
    }

    // Emit completion event
    if (outcome === 'full_success' || outcome === 'partial_dependency') {
      world.eventBus.emit({
        type: 'civilization:uplift_completed',
        source: agreementEntity.id,
        data: {
          uplifterCivId: agreement.uplifterCivId,
          upliftedCivId: agreement.upliftedCivId,
          outcome,
          eraJump: agreement.targetEraJump,
          sourceEra: agreement.sourceEra,
          targetEra: agreement.targetEra,
          tick,
        },
      });
    } else {
      world.eventBus.emit({
        type: 'civilization:uplift_failed',
        source: agreementEntity.id,
        data: {
          uplifterCivId: agreement.uplifterCivId,
          upliftedCivId: agreement.upliftedCivId,
          outcome,
          eraJump: agreement.targetEraJump,
          tick,
        },
      });
    }

    // Emit cargo cult event if applicable
    if (outcome === 'cargo_cult') {
      world.eventBus.emit({
        type: 'civilization:cargo_cult_formed',
        source: agreementEntity.id,
        data: {
          uplifterCivId: agreement.uplifterCivId,
          upliftedCivId: agreement.upliftedCivId,
          tick,
        },
      });
    }

    // Remove from active uplifts tracking
    this.removeFromActiveUplifts(agreement.uplifterCivId, agreementEntity.id);
  }

  // ========================================================================
  // Reputation Management
  // ========================================================================

  /**
   * Decay reputation modifiers over time
   */
  private decayReputationModifiers(world: World, tick: number): void {
    const reputationEntities = world
      .query()
      .with(CT.CivilizationReputation)
      .executeEntities();

    for (const entity of reputationEntities) {
      const reputation = entity.getComponent<CivilizationReputationComponent>(
        CT.CivilizationReputation
      );
      if (!reputation) continue;

      // Remove expired modifiers
      const activeModifiers = reputation.reputationModifiers.filter(
        (mod) => mod.expiryTick > tick
      );

      if (activeModifiers.length !== reputation.reputationModifiers.length) {
        (entity as EntityImpl).updateComponent(CT.CivilizationReputation, (rep) => ({
          ...rep,
          reputationModifiers: activeModifiers,
        }));
      }
    }
  }

  /**
   * Ensure civilization has reputation component
   */
  private ensureReputationComponent(civEntity: EntityImpl): void {
    if (!civEntity.hasComponent(CT.CivilizationReputation)) {
      civEntity.addComponent(createCivilizationReputationComponent('neutral'));
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if advanced civ is already uplifting primitive civ
   */
  private isAlreadyUplifting(advancedCivId: string, primitiveCivId: string, world: World): boolean {
    const agreements = world
      .query()
      .with(CT.UpliftAgreement)
      .executeEntities();

    for (const agreementEntity of agreements) {
      const agreement = agreementEntity.getComponent<UpliftAgreementComponent>(CT.UpliftAgreement);
      if (!agreement) continue;

      if (
        agreement.uplifterCivId === advancedCivId &&
        agreement.upliftedCivId === primitiveCivId &&
        isUpliftActive(agreement)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Track active uplift in internal state
   */
  private addToActiveUplifts(uplifterCivId: string, agreementEntityId: string): void {
    if (!(uplifterCivId in this.activeUplifts)) {
      this.activeUplifts[uplifterCivId] = [];
    }
    if (!this.activeUplifts[uplifterCivId].includes(agreementEntityId)) {
      this.activeUplifts[uplifterCivId].push(agreementEntityId);
    }
  }

  /**
   * Remove from active uplifts tracking
   */
  private removeFromActiveUplifts(uplifterCivId: string, agreementEntityId: string): void {
    if (uplifterCivId in this.activeUplifts) {
      this.activeUplifts[uplifterCivId] = this.activeUplifts[uplifterCivId].filter(
        (id) => id !== agreementEntityId
      );
    }
  }

  // ========================================================================
  // Event Handlers
  // ========================================================================

  /**
   * Handle governor acceptance of uplift offer
   */
  private _onUpliftOfferAccepted(data: {
    advancedCivId: string;
    primitiveCivId: string;
    eraJump: number;
    tick: number;
  }): void {
    const { advancedCivId, primitiveCivId, eraJump, tick } = data;

    // Get world from first entity query (not ideal, but works)
    // In production, would pass world via event context
    const world = this.getWorldFromContext();
    if (!world) return;

    const advancedEntity = world.getEntity(advancedCivId);
    const primitiveEntity = world.getEntity(primitiveCivId);

    if (!advancedEntity || !primitiveEntity) return;

    const advancedTech = advancedEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);
    const primitiveTech = primitiveEntity.getComponent<TechnologyEraComponent>(CT.TechnologyEra);

    if (!advancedTech || !primitiveTech) return;

    // Create uplift agreement entity
    const agreementEntity = world.createEntity();
    const successProbability = calculateSuccessProbability(eraJump);

    const agreement = createUpliftAgreementComponent({
      uplifterCivId: advancedCivId,
      upliftedCivId: primitiveCivId,
      startTick: tick,
      targetEraJump: eraJump,
      sourceEra: primitiveTech.currentEra,
      targetEra: getEraByIndex(getEraIndex(primitiveTech.currentEra) + eraJump) ?? 'transcendent',
      successProbability,
    });

    agreementEntity.addComponent(agreement);

    // Update to in_progress phase
    agreementEntity.updateComponent(CT.UpliftAgreement, (a) => ({
      ...a,
      currentPhase: 'in_progress',
    }));

    // Track in active uplifts
    this.addToActiveUplifts(advancedCivId, agreementEntity.id);

    // Emit started event
    world.eventBus.emit({
      type: 'civilization:uplift_started',
      source: agreementEntity.id,
      data: {
        uplifterCivId: advancedCivId,
        upliftedCivId: primitiveCivId,
        eraJump,
        successProbability,
        tick,
      },
    });
  }

  /**
   * Handle governor rejection of uplift offer
   */
  private _onUpliftOfferRejected(data: {
    advancedCivId: string;
    primitiveCivId: string;
    tick: number;
  }): void {
    // No agreement created, just tracking in reputation
    const world = this.getWorldFromContext();
    if (!world) return;

    const advancedEntity = world.getEntity(data.advancedCivId);
    if (!advancedEntity) return;

    const reputation = advancedEntity.getComponent<CivilizationReputationComponent>(
      CT.CivilizationReputation
    );
    if (!reputation) return;

    // Slight shift toward prime directive (chose non-interference)
    advancedEntity.updateComponent(CT.CivilizationReputation, (rep) => ({
      ...rep,
      primeDirectiveScore: Math.max(-100, rep.primeDirectiveScore - 2),
    }));
  }

  /**
   * Handle uplift completion event (from other systems)
   */
  private _onUpliftCompleted(data: {
    uplifterCivId: string;
    upliftedCivId: string;
    outcome: UpliftOutcome;
    tick: number;
  }): void {
    // Event logging, reputation already updated in completeUplift
  }

  /**
   * Handle uplift failure event (from other systems)
   */
  private _onUpliftFailed(data: {
    uplifterCivId: string;
    upliftedCivId: string;
    outcome: UpliftOutcome;
    tick: number;
  }): void {
    // Event logging, reputation already updated in completeUplift
  }

  /**
   * Get world from context (workaround for event handlers)
   * This is a temporary solution - ideally events would include world reference
   */
  private getWorldFromContext(): World | null {
    // This is a hack - in production, events should carry world reference
    // For now, we rely on the system having been initialized with a world
    return (this as any)._world ?? null;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: UpliftDiplomacySystem | null = null;

export function getUpliftDiplomacySystem(): UpliftDiplomacySystem {
  if (!systemInstance) {
    systemInstance = new UpliftDiplomacySystem();
  }
  return systemInstance;
}
