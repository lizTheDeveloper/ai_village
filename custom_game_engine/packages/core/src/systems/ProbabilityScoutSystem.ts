/**
 * ProbabilityScoutSystem - Handles probability_scout ship missions
 *
 * Probability scouts are solo explorers that map unobserved probability branches
 * without causing timeline contamination. They have:
 * - observation_precision: 0.9 (best observers)
 * - Solo operation = perfect coherence
 * - Can view alternate timelines without triggering collapse
 *
 * Priority: 96 (after TimelineMergerSystem at 95)
 * Throttle: 100 ticks (5 seconds)
 *
 * See: openspec/IMPLEMENTATION_ROADMAP.md Phase 6.2
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type {
  ProbabilityScoutMissionComponent,
  BranchObservation,
} from '../components/ProbabilityScoutMissionComponent.js';
import {
  createProbabilityScoutMissionComponent,
  recordBranchObservation,
} from '../components/ProbabilityScoutMissionComponent.js';

// ============================================================================
// Constants
// ============================================================================

/** Progress per tick during scanning phase */
const SCANNING_RATE = 2; // 50 ticks to complete scanning

/** Progress per tick during observing phase */
const OBSERVING_RATE = 1; // 100 ticks per branch

/** Progress per tick during mapping phase */
const MAPPING_RATE = 3; // 33 ticks to complete mapping

/** Base collapse risk per observation */
const BASE_COLLAPSE_RISK = 0.01; // 1% base risk

/** Contamination per branch observed */
const CONTAMINATION_PER_BRANCH = 0.001; // Very low for scouts

// ============================================================================
// System
// ============================================================================

export class ProbabilityScoutSystem extends BaseSystem {
  public readonly id: SystemId = 'probability_scout' as SystemId;
  public readonly priority: number = 96;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [CT.Spaceship, CT.ProbabilityScoutMission] as const;
  protected readonly throttleInterval = 100; // Every 5 seconds

  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Handles probability_scout ship timeline observation missions',
    dependsOn: [] as SystemId[],
    writesComponents: [CT.Spaceship, CT.ProbabilityScoutMission] as const,
  } as const;

  // GC optimization: Pre-allocated working objects
  private readonly workingObservation: BranchObservation = {
    branchId: '',
    divergenceTick: 0,
    differences: [],
    precision: 0,
    observedTick: 0,
    collapseRisk: 0,
  };

  protected onUpdate(ctx: SystemContext): void {
    const { world, tick } = ctx;

    // Query probability_scout ships with active missions
    const scoutShips = world.query()
      .with(CT.Spaceship)
      .with(CT.ProbabilityScoutMission)
      .executeEntities();

    for (const entity of scoutShips) {
      const impl = entity as EntityImpl;
      const spaceship = impl.getComponent<SpaceshipComponent>(CT.Spaceship);
      const mission = impl.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);

      if (!spaceship || !mission) continue;

      // Only process probability_scout ships
      if (spaceship.ship_type !== 'probability_scout') continue;

      // Process mission based on phase
      this.processMissionPhase(ctx, impl, spaceship, mission);
    }
  }

  /**
   * Process mission based on current phase
   */
  private processMissionPhase(
    ctx: SystemContext,
    entity: EntityImpl,
    spaceship: SpaceshipComponent,
    mission: ProbabilityScoutMissionComponent
  ): void {
    switch (mission.phase) {
      case 'scanning':
        this.processScanning(ctx, entity, mission);
        break;
      case 'observing':
        this.processObserving(ctx, entity, spaceship, mission);
        break;
      case 'mapping':
        this.processMapping(ctx, entity, mission);
        break;
      case 'complete':
        // Mission complete, no processing needed
        break;
    }
  }

  /**
   * Scanning phase: Search for observable branches
   */
  private processScanning(
    ctx: SystemContext,
    entity: EntityImpl,
    mission: ProbabilityScoutMissionComponent
  ): void {
    mission.progress += SCANNING_RATE;

    if (mission.progress >= 100) {
      // Transition to observing
      mission.phase = 'observing';
      mission.progress = 0;

      ctx.emit('multiverse:scout_scanning_complete', {
        shipId: entity.id,
        tick: Number(ctx.tick),
      }, entity.id);
    }

    entity.updateComponent(CT.ProbabilityScoutMission, () => mission);
  }

  /**
   * Observing phase: Observe a probability branch without collapsing it
   */
  private processObserving(
    ctx: SystemContext,
    entity: EntityImpl,
    spaceship: SpaceshipComponent,
    mission: ProbabilityScoutMissionComponent
  ): void {
    const { tick } = ctx;
    mission.progress += OBSERVING_RATE;

    if (mission.progress >= 100) {
      // Complete observation of current branch
      const observation = this.createBranchObservation(
        mission,
        spaceship.navigation.observation_precision,
        Number(tick)
      );

      recordBranchObservation(mission, observation);

      // Small contamination increase
      mission.contaminationLevel += CONTAMINATION_PER_BRANCH;

      // Check for collapse (very rare for scouts)
      const collapseRoll = Math.random();
      if (collapseRoll < observation.collapseRisk) {
        mission.collapseEventsTriggered++;
        ctx.emit('multiverse:scout_triggered_collapse', {
          shipId: entity.id,
          branchId: observation.branchId,
          tick: Number(tick),
        }, entity.id);
      }

      ctx.emit('multiverse:branch_observed', {
        shipId: entity.id,
        branchId: observation.branchId,
        precision: observation.precision,
        tick: Number(tick),
      }, entity.id);

      // Check if we have a target branch or should continue
      if (mission.targetBranchId && observation.branchId === mission.targetBranchId) {
        // Found target, transition to mapping
        mission.phase = 'mapping';
        mission.progress = 0;
      } else if (mission.branchesMapped >= 5) {
        // Mapped enough branches, start mapping phase
        mission.phase = 'mapping';
        mission.progress = 0;
      } else {
        // Continue observing more branches
        mission.progress = 0;
      }
    }

    entity.updateComponent(CT.ProbabilityScoutMission, () => mission);
  }

  /**
   * Mapping phase: Compile observations into a coherent map
   */
  private processMapping(
    ctx: SystemContext,
    entity: EntityImpl,
    mission: ProbabilityScoutMissionComponent
  ): void {
    mission.progress += MAPPING_RATE;

    if (mission.progress >= 100) {
      // Mission complete
      mission.phase = 'complete';

      ctx.emit('multiverse:scout_mission_complete', {
        shipId: entity.id,
        branchesMapped: mission.branchesMapped,
        contaminationLevel: mission.contaminationLevel,
        collapseEvents: mission.collapseEventsTriggered,
        tick: Number(ctx.tick),
      }, entity.id);
    }

    entity.updateComponent(CT.ProbabilityScoutMission, () => mission);
  }

  /**
   * Create a branch observation record
   */
  private createBranchObservation(
    mission: ProbabilityScoutMissionComponent,
    observationPrecision: number,
    tick: number
  ): BranchObservation {
    // Generate branch ID (in real implementation, would query multiverse system)
    const branchId = mission.targetBranchId || `branch_${tick}_${Math.random().toString(36).slice(2, 8)}`;

    // Calculate collapse risk (lower for high precision scouts)
    const collapseRisk = BASE_COLLAPSE_RISK * (1 - observationPrecision * 0.9);

    return {
      branchId,
      divergenceTick: tick - Math.floor(Math.random() * 10000),
      differences: this.generateDifferences(),
      precision: observationPrecision,
      observedTick: tick,
      collapseRisk,
    };
  }

  /**
   * Generate random differences for branch (placeholder)
   */
  private generateDifferences(): string[] {
    const possibleDifferences = [
      'Population divergence',
      'Technology path differs',
      'War outcome changed',
      'Climate event altered',
      'Discovery timing shifted',
      'Leader succession varied',
      'Resource availability changed',
    ];

    const count = 1 + Math.floor(Math.random() * 3);
    const selected: string[] = [];
    for (let i = 0; i < count && i < possibleDifferences.length; i++) {
      const idx = Math.floor(Math.random() * possibleDifferences.length);
      const diff = possibleDifferences[idx];
      if (diff && !selected.includes(diff)) {
        selected.push(diff);
      }
    }
    return selected;
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Start a probability scout mission
   */
  public startMission(
    world: World,
    shipEntity: EntityImpl,
    targetBranchId?: string
  ): boolean {
    const spaceship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    if (!spaceship || spaceship.ship_type !== 'probability_scout') {
      return false;
    }

    const mission = createProbabilityScoutMissionComponent(
      shipEntity.id,
      spaceship.navigation.observation_precision,
      Number(world.tick),
      targetBranchId
    );

    shipEntity.addComponent(mission);
    return true;
  }

  /**
   * Get mission status
   */
  public getMissionStatus(entity: EntityImpl): ProbabilityScoutMissionComponent | undefined {
    return entity.getComponent<ProbabilityScoutMissionComponent>(CT.ProbabilityScoutMission);
  }
}
