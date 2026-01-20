/**
 * MegastructureConstructionSystem - Manages megastructure construction projects
 *
 * Phase 5: Grand Strategy - Megastructure Construction
 *
 * This system handles:
 * - Tracking construction progress on megastructure projects
 * - Advancing projects through construction phases
 * - Resource consumption from stockpiles
 * - Labor and energy allocation
 * - Construction completion and megastructure activation
 * - Risk management and catastrophic failures
 *
 * Priority: 300 (after economic systems, before automation)
 * Throttle: 100 ticks (5 seconds at 20 TPS - construction is slow)
 *
 * Based on openspec/specs/grand-strategy/09-MEGASTRUCTURES.md
 *
 * @see ConstructionProjectComponent
 * @see MegastructureBlueprints.ts
 * @see MegastructureComponent (will be created on completion)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  ConstructionProjectComponent,
  ConstructionPhase,
  ProjectProgress,
  ProjectRisks,
} from '../components/ConstructionProjectComponent.js';
import {
  updateProgress,
  isComplete,
  getCurrentPhase,
  getCurrentPhaseName,
  getMissingResources,
  hasAllResources,
  getResourceCompletionPercent,
  isBehindSchedule,
  increaseCollapseRisk,
  addDelay,
} from '../components/ConstructionProjectComponent.js';
import {
  getMegastructureBlueprint,
  type MegastructureBlueprint,
} from '../megastructures/MegastructureBlueprints.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { MegastructureComponent } from '../components/MegastructureComponent.js';

// ============================================================================
// FAST PRNG (xorshift32)
// ============================================================================

/**
 * Fast xorshift32 PRNG for collapse risk rolls
 * ~10x faster than Math.random()
 */
class XorShift32 {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0 || 1; // Ensure non-zero
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (x >>> 0) / 0xffffffff; // Return [0, 1)
  }
}

// ============================================================================
// SYSTEM
// ============================================================================

export class MegastructureConstructionSystem extends BaseSystem {
  public readonly id: SystemId = 'megastructure_construction' as SystemId;
  public readonly priority: number = 300;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.ConstructionProject];
  public readonly activationComponents = ['construction_project'] as const;
  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Manages megastructure construction projects',
    dependsOn: ['economy', 'inventory'] as const,
    writesComponents: [CT.ConstructionProject, CT.Inventory] as const,
  };

  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  // PERF: Cache entities for fast lookups
  private projectCache: Map<string, EntityImpl> = new Map();
  private inventoryCache: Map<string, EntityImpl> = new Map();
  private blueprintCache: Map<string, MegastructureBlueprint> = new Map();

  // PERF: Reusable working objects (zero allocation in hot paths)
  private workingMissingResources: Record<string, number> = {};
  private workingSlotIndices: number[] = [];
  private workingResourceConsumption: Map<string, number> = new Map();

  // PERF: Fast PRNG for collapse risk rolls
  private prng: XorShift32 = new XorShift32();

  // PERF: Constants precomputed
  private static readonly TICKS_PER_YEAR = 365 * 24 * 60 * 3; // 20 TPS
  private static readonly RISK_PER_TICK_NO_RESOURCES = 0.001;
  private static readonly RISK_PER_TICK_DELAY = 0.0005;
  private static readonly RISK_PER_TICK_ENTROPY = 0.0001;
  private static readonly DELAY_THRESHOLD = 0.1;
  private static readonly PROGRESS_MILESTONE_STEP = 0.1;
  private static readonly ENTROPY_START_YEARS = 10;

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;
    const entities = ctx.activeEntities;
    const entityCount = entities.length;

    // PERF: Early exit - no projects to process
    if (entityCount === 0) return;

    // PERF: Build caches once per update
    this.rebuildCaches(ctx.world);

    // PERF: Process each construction project with indexed loop
    for (let i = 0; i < entityCount; i++) {
      const projectEntity = entities[i];
      if (!projectEntity) continue;

      const project = projectEntity.getComponent<ConstructionProjectComponent>(CT.ConstructionProject);
      if (!project) continue;

      // Process project construction
      this.processConstruction(ctx, projectEntity as EntityImpl, project, tick);
    }
  }

  /**
   * PERF: Rebuild entity caches - indexed loops, early continue
   */
  private rebuildCaches(world: World): void {
    // PERF: Clear without reallocating
    this.projectCache.clear();
    this.inventoryCache.clear();

    // Cache construction projects - indexed loop
    const projectEntities = world.query().with(CT.ConstructionProject).executeEntities();
    const projectCount = projectEntities.length;
    for (let i = 0; i < projectCount; i++) {
      const entity = projectEntities[i];
      if (!entity) continue;
      const project = entity.getComponent<ConstructionProjectComponent>(CT.ConstructionProject);
      if (!project) continue;
      this.projectCache.set(project.projectId, entity as EntityImpl);
    }

    // Cache inventory entities - indexed loop
    const invEntities = world.query().with(CT.Inventory).executeEntities();
    const invCount = invEntities.length;
    for (let i = 0; i < invCount; i++) {
      const entity = invEntities[i];
      if (!entity) continue;
      this.inventoryCache.set(entity.id, entity as EntityImpl);
    }
  }

  /**
   * Process construction progress for a single project
   * PERF: Early exits, blueprint caching, inlined checks
   */
  private processConstruction(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    tick: number
  ): void {
    // PERF: Inline isComplete check for early exit
    if (project.progress.overallProgress >= 1.0) {
      this.completeConstruction(ctx, projectEntity, project);
      return;
    }

    // PERF: Blueprint cache with Map lookup
    let blueprint = this.blueprintCache.get(project.megastructureType);
    if (!blueprint) {
      blueprint = getMegastructureBlueprint(project.megastructureType);
      if (!blueprint) {
        this.handleConstructionFailure(
          ctx,
          projectEntity,
          project,
          'unknown_megastructure_type'
        );
        return;
      }
      this.blueprintCache.set(project.megastructureType, blueprint);
    }

    // Calculate construction progress based on resources + labor + energy
    const progressDelta = this.calculateProgressDelta(project, blueprint, tick);

    // PERF: Early exit if no progress can be made
    if (progressDelta <= 0) {
      // Still check risks even with no progress
      this.updateRisks(ctx, projectEntity, project, tick);
      return;
    }

    // Update project progress
    this.updateConstructionProgress(ctx.world, projectEntity, project, progressDelta);

    // Consume resources
    this.consumeResources(ctx, projectEntity, project, blueprint, progressDelta);

    // PERF: Inline phase transition check
    if (project.progress.phaseProgress >= 1.0) {
      this.checkPhaseTransition(ctx, projectEntity, project);
    }

    // PERF: Inline delay check before calling handler
    const expectedTicks = project.timeline.estimatedCompletionTick - project.timeline.startTick;
    const elapsedTicks = tick - project.timeline.startTick;
    if (elapsedTicks > 0 && expectedTicks > 0) {
      const expectedProgress = elapsedTicks / expectedTicks;
      const delayPercent = (expectedProgress - project.progress.overallProgress) / expectedProgress;
      if (delayPercent > MegastructureConstructionSystem.DELAY_THRESHOLD) {
        this.handleDelay(ctx, projectEntity, project, tick, delayPercent);
      }
    }

    // Risk management
    this.updateRisks(ctx, projectEntity, project, tick);
  }

  /**
   * Calculate how much progress can be made this tick
   * PERF: Precomputed constants, inlined multiplier calculations
   */
  private calculateProgressDelta(
    project: ConstructionProjectComponent,
    blueprint: MegastructureBlueprint,
    tick: number
  ): number {
    // PERF: Use precomputed constant instead of multiplication chain
    const totalTicks = blueprint.constructionTimeYears * MegastructureConstructionSystem.TICKS_PER_YEAR;
    const baseProgressPerTick = 1.0 / totalTicks;

    // PERF: Inline calculations, avoid intermediate variables where possible
    const progress = project.progress;
    const risks = project.risks;

    // Labor multiplier (0-1 based on allocation vs requirement)
    const laborRatio = progress.laborAllocated / blueprint.laborRequired;
    const laborMult = laborRatio >= 1.0 ? 1.0 : 0.5 + laborRatio * 0.5;

    // Energy multiplier
    const energyRatio = progress.energyAllocated / blueprint.totalMass;
    const energyMult = energyRatio >= 1.0 ? 1.0 : 0.7 + energyRatio * 0.3;

    // Resource availability multiplier
    const resourceMult = getResourceCompletionPercent(project);

    // Risk penalty (higher risk = slower progress)
    const riskPenalty = 1.0 - risks.collapseRisk * 0.5;

    // PERF: Single multiplication chain
    return baseProgressPerTick * laborMult * energyMult * resourceMult * riskPenalty;
  }

  /**
   * Update construction progress
   * PERF: Bitwise ops for milestone calculation, early exit on no milestone change
   */
  private updateConstructionProgress(
    world: World,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    deltaProgress: number
  ): void {
    const previousProgress = project.progress.overallProgress;

    // Use helper from ConstructionProjectComponent
    updateProgress(project, deltaProgress);

    // PERF: Use integer multiplication + bitwise truncation for milestone calculation
    const currentMilestone = ((project.progress.overallProgress * 10) | 0) * 10;
    const previousMilestone = ((previousProgress * 10) | 0) * 10;

    // PERF: Early exit if no milestone crossed
    if (currentMilestone <= previousMilestone) return;

    this.emitProgressEvent(world, project, currentMilestone);
  }

  /**
   * Consume resources from stockpiles
   * PERF: Single-pass algorithm, batch updates, reusable arrays
   */
  private consumeResources(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    blueprint: MegastructureBlueprint,
    progressDelta: number
  ): void {
    // PERF: Inline getCurrentPhase check
    const phases = project.timeline.phases;
    const phaseIdx = project.progress.currentPhase;
    if (phaseIdx < 0 || phaseIdx >= phases.length) return;

    const currentPhase = phases[phaseIdx];
    if (!currentPhase) {
      throw new Error(`Construction phase at index ${phaseIdx} is undefined`);
    }
    const phaseResourcesNeeded = currentPhase.resourcesNeeded;

    // PERF: Early exit if no manager entity
    const managerId = project.coordination.managerEntityId;
    if (!managerId) return;

    const managerEntity = this.inventoryCache.get(managerId);
    if (!managerEntity) return;

    const inventory = managerEntity.getComponent<InventoryComponent>(CT.Inventory);
    if (!inventory?.slots) return;

    const slots = inventory.slots;
    const slotCount = slots.length;

    // PERF: Reuse working array for slot indices (zero allocation)
    this.workingSlotIndices.length = 0;
    this.workingResourceConsumption.clear();

    // PERF: Single pass to identify all resources to consume
    let totalConsumed = 0;

    for (const itemId in phaseResourcesNeeded) {
      const totalNeeded = phaseResourcesNeeded[itemId];
      if (totalNeeded === undefined) {
        throw new Error(`Phase resource quantity undefined for itemId: ${itemId}`);
      }
      const amountToConsume = Math.ceil(totalNeeded * progressDelta);

      let remainingToConsume = amountToConsume;
      this.workingSlotIndices.length = 0;

      // Find slots with this item
      for (let i = 0; i < slotCount && remainingToConsume > 0; i++) {
        const slot = slots[i];
        if (slot && slot.itemId === itemId) {
          this.workingSlotIndices.push(i);
          const consumed = slot.quantity < remainingToConsume ? slot.quantity : remainingToConsume;
          remainingToConsume -= consumed;
        }
      }

      // Only consume if we found enough resources
      if (remainingToConsume === 0) {
        this.workingResourceConsumption.set(itemId, amountToConsume);
        totalConsumed += amountToConsume;
      }
    }

    // PERF: Early exit if no resources to consume
    if (totalConsumed === 0) {
      increaseCollapseRisk(project, MegastructureConstructionSystem.RISK_PER_TICK_NO_RESOURCES);
      return;
    }

    // PERF: Batch update inventory in single pass
    ctx.components(managerEntity).update<InventoryComponent>(CT.Inventory, (inv) => {
      const updatedSlots = [...inv.slots];

      for (const [itemId, amountToConsume] of this.workingResourceConsumption) {
        let toConsume = amountToConsume;

        // Consume from slots (reverse iteration to handle removals)
        for (let i = updatedSlots.length - 1; i >= 0 && toConsume > 0; i--) {
          const slot = updatedSlots[i];
          if (slot && slot.itemId === itemId) {
            const consumed = slot.quantity < toConsume ? slot.quantity : toConsume;
            const newQty = slot.quantity - consumed;
            toConsume -= consumed;

            if (newQty <= 0) {
              // Remove empty slot
              updatedSlots.splice(i, 1);
            } else {
              updatedSlots[i] = { ...slot, quantity: newQty };
            }
          }
        }

        // Track delivery
        const delivered = project.progress.resourcesDelivered;
        delivered[itemId] = (delivered[itemId] || 0) + amountToConsume;
      }

      return { ...inv, slots: updatedSlots } as InventoryComponent;
    });
  }

  /**
   * Check if we should transition to next phase
   * PERF: Inlined checks, early exit
   */
  private checkPhaseTransition(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent
  ): void {
    // PERF: Already checked in processConstruction, but kept for safety
    const nextPhaseIndex = project.progress.currentPhase + 1;
    const phases = project.timeline.phases;

    // PERF: Early exit if no next phase
    if (nextPhaseIndex >= phases.length) return;

    const currentPhaseName = getCurrentPhaseName(project);

    // Transition to next phase
    this.transitionPhase(ctx, projectEntity, project, nextPhaseIndex);

    ctx.emit(
      'construction_phase_complete',
      {
        projectId: project.projectId,
        megastructureType: project.megastructureType,
        completedPhase: currentPhaseName,
        nextPhaseIndex,
      },
      projectEntity.id
    );
  }

  /**
   * Transition to next construction phase
   */
  private transitionPhase(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    nextPhaseIndex: number
  ): void {
    ctx.components(projectEntity).update<ConstructionProjectComponent>(
      CT.ConstructionProject,
      (current) => ({
        ...current,
        progress: {
          ...current.progress,
          currentPhase: nextPhaseIndex,
          phaseProgress: 0,
        },
      })
    );
  }

  /**
   * Complete construction and create megastructure
   */
  private completeConstruction(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent
  ): void {
    // Get blueprint for megastructure details
    const blueprint = this.blueprintCache.get(project.megastructureType);
    if (!blueprint) {
      this.handleConstructionFailure(
        ctx,
        projectEntity,
        project,
        'blueprint_not_found_at_completion'
      );
      return;
    }

    // Create operational megastructure on target entity
    this.createOperationalMegastructure(ctx, project, blueprint);

    // Emit construction completion event
    ctx.emit(
      'construction_complete',
      {
        projectId: project.projectId,
        megastructureType: project.megastructureType,
        targetEntityId: project.targetEntityId,
        constructionTimeYears: (ctx.tick - project.timeline.startTick) / MegastructureConstructionSystem.TICKS_PER_YEAR,
        totalCost: this.calculateTotalCost(project),
      },
      projectEntity.id
    );

    // Mark project as complete by setting progress to 100%
    // Don't remove component - preserve for historical record per CONSERVATION_OF_GAME_MATTER
    ctx.components(projectEntity).update<ConstructionProjectComponent>(
      CT.ConstructionProject,
      (current) => ({
        ...current,
        progress: {
          ...current.progress,
          overallProgress: 1.0,
          phaseProgress: 1.0,
        },
      })
    );
  }

  /**
   * Create operational megastructure component on target entity
   * Called when construction project completes
   */
  private createOperationalMegastructure(
    ctx: SystemContext,
    project: ConstructionProjectComponent,
    blueprint: MegastructureBlueprint
  ): void {
    const currentTick = ctx.tick;
    const targetEntityId = project.targetEntityId;

    // Get or create target entity
    let targetEntity: EntityImpl | null = null;
    if (targetEntityId) {
      targetEntity = ctx.world.getEntity(targetEntityId) as EntityImpl | null;
    }

    // If no target entity specified or entity doesn't exist, create new entity
    if (!targetEntity) {
      targetEntity = ctx.world.createEntity() as EntityImpl;
      if (!targetEntity) {
        throw new Error('Failed to create megastructure entity');
      }
    }

    // Generate unique megastructure ID
    const megastructureId = `${blueprint.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Build location object from project target
    const location: any = {
      systemId: undefined,
      planetId: undefined,
      sectorId: undefined,
      coordinates: undefined,
    };

    // Determine tier and populate location based on blueprint
    const tier = blueprint.tier;

    // Create megastructure component with all blueprint data
    const megastructureComponent = {
      type: 'megastructure' as const,
      version: 1,
      megastructureId,
      name: `${blueprint.name} (${project.projectId})`,
      category: blueprint.category,
      structureType: blueprint.id,
      tier,
      location,
      construction: {
        phase: 'operational' as const,
        progress: 1.0,
        startedAt: project.timeline.startTick,
        completedAt: currentTick,
        resourcesInvested: project.progress.resourcesDelivered,
        laborInvested: project.progress.laborAllocated,
        energyInvested: project.progress.energyAllocated,
      },
      operational: true,
      efficiency: 1.0,
      maintenance: {
        lastMaintenanceAt: currentTick,
        maintenanceCostPerYear: blueprint.maintenancePerYear,
        energyCostPerYear: blueprint.energyMaintenancePerYear,
        degradationRate: blueprint.degradationRate / 100, // Convert from % to fraction
        failureTime: blueprint.failureTimeYears,
        maintenanceDebt: 0,
      },
      yearsInDecay: 0,
      decayStageIndex: 0,
      archaeologicalValue: 0,
      capabilities: blueprint.capabilities,
      strategic: {
        militaryValue: blueprint.militaryValue,
        economicValue: blueprint.economicValue,
        culturalValue: blueprint.culturalValue,
        controlledBy: project.coordination.managerEntityId,
        contested: false,
      },
      events: [
        {
          tick: currentTick,
          eventType: 'construction_completed',
          description: `${blueprint.name} construction completed - now operational`,
        },
      ],
    };

    // Add megastructure component to target entity
    targetEntity.addComponent(megastructureComponent);

    // Emit megastructure activation event with full details
    ctx.emit(
      'megastructure_activated',
      {
        entityId: targetEntity.id,
        megastructureId,
        structureType: blueprint.id,
        category: blueprint.category,
        tier,
        name: megastructureComponent.name,
        location,
        capabilities: blueprint.capabilities as Record<string, unknown>,
        projectId: project.projectId,
        constructionTimeYears: (currentTick - project.timeline.startTick) / MegastructureConstructionSystem.TICKS_PER_YEAR,
      },
      targetEntity.id
    );
  }

  /**
   * Handle construction failure
   */
  private handleConstructionFailure(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    reason: string
  ): void {
    ctx.emit(
      'construction_failed',
      {
        projectId: project.projectId,
        megastructureType: project.megastructureType,
        reason,
        progress: project.progress.overallProgress,
        resourcesLost: this.calculateTotalCost(project),
      },
      projectEntity.id
    );

    // Mark project as failed but keep component (for archaeology/recovery)
    ctx.components(projectEntity).update<ConstructionProjectComponent>(
      CT.ConstructionProject,
      (current) => ({
        ...current,
        risks: {
          ...current.risks,
          collapseRisk: 1.0, // Complete failure
          vulnerableTo: [...current.risks.vulnerableTo, 'catastrophic_failure'],
        },
      })
    );
  }

  /**
   * Handle construction delays
   * PERF: Delay percent passed in, bitwise rounding
   */
  private handleDelay(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    tick: number,
    delayPercent: number
  ): void {
    const elapsedTicks = tick - project.timeline.startTick;
    const delayTicks = (elapsedTicks * delayPercent) | 0; // PERF: Bitwise floor

    // Add delay to timeline
    addDelay(project, delayTicks);

    // Increase collapse risk slightly
    increaseCollapseRisk(project, MegastructureConstructionSystem.RISK_PER_TICK_DELAY);

    ctx.emit(
      'construction_delayed',
      {
        projectId: project.projectId,
        megastructureType: project.megastructureType,
        delayTicks,
        delayPercent: (delayPercent * 100) | 0, // PERF: Bitwise round
      },
      projectEntity.id
    );
  }

  /**
   * Update project risks over time
   * PERF: Fast PRNG, precomputed constants, inlined calculations
   */
  private updateRisks(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    tick: number
  ): void {
    const ticksSinceStart = tick - project.timeline.startTick;

    // PERF: Use fast xorshift32 PRNG instead of Math.random()
    const failureRoll = this.prng.next();

    // Annual failure chance based on collapse risk, converted to per-tick
    const tickFailureChance = project.risks.collapseRisk / MegastructureConstructionSystem.TICKS_PER_YEAR;

    // PERF: Early exit on failure (rare case)
    if (failureRoll < tickFailureChance) {
      this.handleConstructionFailure(
        ctx,
        projectEntity,
        project,
        'structural_collapse_during_construction'
      );
      return;
    }

    // PERF: Gradually increase risk over time (entropy) - check years with precomputed constant
    const yearsElapsed = ticksSinceStart / MegastructureConstructionSystem.TICKS_PER_YEAR;
    if (yearsElapsed > MegastructureConstructionSystem.ENTROPY_START_YEARS) {
      increaseCollapseRisk(project, MegastructureConstructionSystem.RISK_PER_TICK_ENTROPY);
    }
  }

  /**
   * Emit progress milestone event
   */
  private emitProgressEvent(
    world: World,
    project: ConstructionProjectComponent,
    milestone: number
  ): void {
    world.eventBus.emit({
      type: 'construction_progress',
      source: 'system',
      data: {
        projectId: project.projectId,
        megastructureType: project.megastructureType,
        milestone,
        progress: project.progress.overallProgress,
        currentPhase: getCurrentPhaseName(project),
      },
    });
  }

  /**
   * Calculate total resources invested so far
   * PERF: Direct reference instead of shallow copy (read-only usage)
   */
  private calculateTotalCost(project: ConstructionProjectComponent): Record<string, number> {
    // PERF: Return direct reference - caller only reads this
    return project.progress.resourcesDelivered;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Start a new megastructure construction project
 *
 * Creates a new entity with ConstructionProjectComponent.
 * Returns the project ID.
 */
export function startMegastructureProject(
  world: World,
  blueprintId: string,
  targetLocation: {
    tier: string;
    entityId?: string;
    coordinates?: { x: number; y: number; z: number };
  },
  managerEntityId?: string
): string {
  const blueprint = getMegastructureBlueprint(blueprintId);

  if (!blueprint) {
    throw new Error(`Unknown megastructure blueprint: ${blueprintId}`);
  }

  // Generate unique project ID
  const projectId = `${blueprintId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Calculate timeline
  const currentTick = world.tick;
  const totalTicks = blueprint.constructionTimeYears * 365 * 24 * 60 * 3; // Years to ticks (20 TPS)

  // Convert blueprint phases to ConstructionPhase format
  const phases: ConstructionPhase[] = blueprint.phases.map((phase) => ({
    name: phase.name,
    durationTicks: Math.floor((phase.durationPercent / 100) * totalTicks),
    resourcesNeeded: blueprint.resources, // TODO: Distribute resources across phases based on resourcePercent
    milestones: [phase.description],
  }));

  // Create construction project entity
  const projectEntity = world.createEntity();
  (projectEntity as any).addComponent({
    type: 'construction_project',
    version: 1,
    projectId,
    megastructureType: blueprintId,
    targetEntityId: targetLocation.entityId,
    requirements: {
      techLevelRequired: blueprint.techLevelRequired,
      resources: blueprint.resources,
      totalMass: blueprint.totalMass,
      laborRequired: blueprint.laborRequired,
      energyRequired: blueprint.totalMass * 1000, // Simple heuristic: 1000 kWh per kg
    },
    timeline: {
      startTick: currentTick,
      estimatedCompletionTick: currentTick + totalTicks,
      phases,
    },
    progress: {
      currentPhase: 0,
      phaseProgress: 0,
      overallProgress: 0,
      resourcesDelivered: {},
      laborAllocated: 0,
      energyAllocated: 0,
    },
    coordination: {
      managerEntityId,
      workerCount: 0,
      factoryCount: 0,
    },
    risks: {
      collapseRisk: blueprint.collapseRiskBase,
      budgetOverrun: 0,
      delayTicks: 0,
      vulnerableTo: blueprint.vulnerableTo,
    },
  });

  // Emit project started event
  world.eventBus.emit({
    type: 'construction_started',
    source: projectEntity.id,
    data: {
      projectId,
      megastructureType: blueprintId,
      blueprintName: blueprint.name,
      targetLocation,
      estimatedYears: blueprint.constructionTimeYears,
      requiredResources: blueprint.resources,
    },
  });

  return projectId;
}
