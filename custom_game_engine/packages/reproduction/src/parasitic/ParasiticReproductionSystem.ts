/**
 * ParasiticReproductionSystem
 *
 * Handles reproduction for parasitically colonized hosts.
 * The collective controls mating decisions, not the individual hosts.
 *
 * Key differences from normal reproduction:
 * - Breeding pairs are assigned by the collective, not chosen by attraction
 * - Genetic optimization for host population is a primary goal
 * - Offspring are immediately queued for colonization
 * - The host's feelings about their assigned mate are irrelevant
 * - "Courtship" may be simulated for camouflage purposes only
 */

import { BaseSystem, type SystemContext } from '@ai-village/core';
import type { World, WorldMutator } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { EntityId, Tick, SystemId } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import { ParasiticColonizationComponent } from './ParasiticColonizationComponent.js';
import { CollectiveMindComponent, type BreedingAssignment } from './CollectiveMindComponent.js';

// ============================================================================
// Configuration
// ============================================================================

export interface ParasiticReproductionConfig {
  /** How often the collective evaluates breeding pairs (in ticks) */
  breedingEvaluationInterval: number;

  /** Maximum concurrent breeding assignments */
  maxConcurrentBreeding: number;

  /** Whether to simulate courtship for camouflage */
  simulateCourtship: boolean;

  /** Minimum integration level for breeding eligibility */
  minIntegrationForBreeding: number;

  /** Whether offspring are colonized at birth or shortly after */
  colonizeAtBirth: boolean;

  /** Delay before colonizing newborn (if not at birth) */
  colonizationDelay: number;
}

export const DEFAULT_PARASITIC_REPRODUCTION_CONFIG: ParasiticReproductionConfig = {
  breedingEvaluationInterval: 500,
  maxConcurrentBreeding: 10,
  simulateCourtship: true,
  minIntegrationForBreeding: 0.8,
  colonizeAtBirth: true,
  colonizationDelay: 100,
};

// ============================================================================
// Events
// ============================================================================

export interface BreedingAssignedEvent {
  type: 'parasitic_breeding_assigned';
  collectiveId: string;
  host1Id: EntityId;
  host2Id: EntityId;
  priority: number;
  desiredTraits: string[];
  tick: Tick;
}

export interface HostOffspringBornEvent {
  type: 'parasitic_offspring_born';
  collectiveId: string;
  parentIds: [EntityId, EntityId];
  offspringId: EntityId;
  colonizationScheduled: boolean;
  tick: Tick;
}

export interface ColonizationScheduledEvent {
  type: 'colonization_scheduled';
  collectiveId: string;
  targetId: EntityId;
  scheduledTick: Tick;
  reason: 'newborn' | 'expansion' | 'replacement';
}

// ============================================================================
// System
// ============================================================================

export class ParasiticReproductionSystem extends BaseSystem {
  public readonly id: SystemId = 'ParasiticReproductionSystem';
  public readonly priority = 51; // Run after normal ReproductionSystem
  public readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private config: ParasiticReproductionConfig;
  private lastEvaluationTick: Map<string, Tick> = new Map();
  private scheduledColonizations: Map<EntityId, { tick: Tick; collectiveId: string }> = new Map();

  constructor(config: Partial<ParasiticReproductionConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_PARASITIC_REPRODUCTION_CONFIG,
      ...config,
    };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Process each collective entity
    for (const entity of ctx.activeEntities) {
      const collective = entity.getComponent<CollectiveMindComponent>('collective_mind');
      if (!collective) continue;

      this.processCollective(ctx.world as any, entity.id, collective, currentTick);
    }

    // Process scheduled colonizations
    this.processScheduledColonizations(ctx.world as any, currentTick);
  }

  private processCollective(
    world: World,
    _collectiveEntityId: EntityId,
    collective: CollectiveMindComponent,
    currentTick: Tick,
  ): void {
    const lastEval = this.lastEvaluationTick.get(collective.collectiveId) ?? 0;

    // Check if it's time for breeding evaluation
    if (currentTick - lastEval >= this.config.breedingEvaluationInterval) {
      this.evaluateBreedingPairs(world, collective, currentTick);
      this.lastEvaluationTick.set(collective.collectiveId, currentTick);
    }
  }

  private evaluateBreedingPairs(
    _world: World,
    collective: CollectiveMindComponent,
    currentTick: Tick,
  ): void {
    // Don't evaluate if already at max concurrent breeding
    const activeAssignments = collective.breedingAssignments.filter(
      (a) => a.status === 'pending' || a.status === 'in_progress' || a.status === 'pregnant',
    );
    if (activeAssignments.length >= this.config.maxConcurrentBreeding) return;

    // Get evaluated pairs from collective
    const candidatePairs = collective.evaluateBreedingPairs();

    // Assign top pairs up to limit
    const slotsAvailable = this.config.maxConcurrentBreeding - activeAssignments.length;
    const pairsToAssign = candidatePairs.slice(0, slotsAvailable);

    for (const pair of pairsToAssign) {
      collective.assignBreedingPair(
        pair.host1Id,
        pair.host2Id,
        Math.round(pair.score * 100),
        pair.traits,
        currentTick,
      );
    }
  }

  private processScheduledColonizations(world: World, currentTick: Tick): void {
    const toProcess: Array<{ targetId: EntityId; collectiveId: string }> = [];

    for (const [targetId, schedule] of this.scheduledColonizations) {
      if (currentTick >= schedule.tick) {
        toProcess.push({ targetId, collectiveId: schedule.collectiveId });
      }
    }

    for (const { targetId, collectiveId } of toProcess) {
      this.executeColonization(world, targetId, collectiveId, currentTick);
      this.scheduledColonizations.delete(targetId);
    }
  }

  private executeColonization(
    world: World,
    targetId: EntityId,
    collectiveId: string,
    currentTick: Tick,
  ): void {
    const target = world.entities.get(targetId);
    if (!target) return;

    const impl = target as EntityImpl;

    // Get or create colonization component
    let colonization = impl.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

    if (!colonization) {
      colonization = new ParasiticColonizationComponent();
      impl.addComponent(colonization);
    }

    if (colonization.isColonized) return;

    // Find the collective
    const collectiveEntity = this.findCollective(world, collectiveId);
    if (!collectiveEntity) return;

    const collectiveImpl = collectiveEntity as EntityImpl;
    const collective = collectiveImpl.getComponent<CollectiveMindComponent>('collective_mind');
    if (!collective) return;

    // Create lineage for this colonization
    const lineage = collective.createLineage(currentTick);

    // Execute colonization
    colonization.colonize(
      collectiveId,
      'birth_colonization',
      lineage.lineageId,
      currentTick,
    );

    // Newborns have very low resistance
    colonization.currentResistance = 0.05;
    colonization.baseResistance = 0.1;

    // Register with collective
    collective.registerHost(targetId, lineage.lineageId, currentTick, {
      hostSpecies: 'newborn',
      hostAge: 0,
      hostFertile: false,
      strategicValue: 0.9,
    });

    // Update lineage
    lineage.currentHostId = targetId;
    lineage.hostHistory.push(targetId);
  }

  private findCollective(world: World, collectiveId: string): Entity | null {
    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const collective = impl.getComponent<CollectiveMindComponent>('collective_mind');
      if (collective?.collectiveId === collectiveId) return entity;
    }
    return null;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Manually trigger breeding between two colonized hosts.
   */
  public forceBreeding(
    world: World,
    host1Id: EntityId,
    host2Id: EntityId,
    collectiveId: string,
  ): boolean {
    const host1 = world.entities.get(host1Id);
    const host2 = world.entities.get(host2Id);

    if (!host1 || !host2) return false;

    const impl1 = host1 as EntityImpl;
    const impl2 = host2 as EntityImpl;

    const col1 = impl1.getComponent<ParasiticColonizationComponent>('parasitic_colonization');
    const col2 = impl2.getComponent<ParasiticColonizationComponent>('parasitic_colonization');

    if (!col1?.isColonized || !col2?.isColonized) return false;
    if (col1.parasite?.collectiveId !== collectiveId || col2.parasite?.collectiveId !== collectiveId) {
      return false;
    }

    // Check integration levels
    if (col1.integration && col1.integration.progress < this.config.minIntegrationForBreeding) return false;
    if (col2.integration && col2.integration.progress < this.config.minIntegrationForBreeding) return false;

    // Mark as designated breeders
    col1.designatedBreeder = true;
    col1.assignedMateId = host2Id;
    col2.designatedBreeder = true;
    col2.assignedMateId = host1Id;

    return true;
  }

  /**
   * Get all hosts currently assigned for breeding in a collective.
   */
  public getBreedingAssignments(collectiveId: string, world: World): BreedingAssignment[] {
    for (const entity of world.entities.values()) {
      const impl = entity as EntityImpl;
      const collective = impl.getComponent<CollectiveMindComponent>('collective_mind');
      if (collective?.collectiveId === collectiveId) {
        return collective.breedingAssignments;
      }
    }
    return [];
  }

  /**
   * Get pending colonization targets.
   */
  public getPendingColonizations(): Map<EntityId, { tick: Tick; collectiveId: string }> {
    return new Map(this.scheduledColonizations);
  }
}
