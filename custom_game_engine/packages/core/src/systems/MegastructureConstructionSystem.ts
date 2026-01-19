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

// ============================================================================
// SYSTEM
// ============================================================================

export class MegastructureConstructionSystem extends BaseSystem {
  public readonly id: SystemId = 'megastructure_construction' as SystemId;
  public readonly priority: number = 300;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.ConstructionProject];
  public readonly activationComponents = ['construction_project'] as const;
  public readonly metadata = {
    category: 'construction' as const,
    description: 'Manages megastructure construction projects',
    dependsOn: ['economy', 'inventory'] as const,
    writesComponents: [CT.ConstructionProject, CT.Inventory] as const,
  };

  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  // PERF: Cache entities for fast lookups
  private projectCache: Map<string, EntityImpl> = new Map();
  private inventoryCache: Map<string, EntityImpl> = new Map();

  // PERF: Reusable working objects
  private workingMissingResources: Record<string, number> = {};

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
   * PERF: Rebuild entity caches
   */
  private rebuildCaches(world: World): void {
    this.projectCache.clear();
    this.inventoryCache.clear();

    // Cache construction projects
    const projectEntities = world.query().with(CT.ConstructionProject).executeEntities();
    for (let i = 0; i < projectEntities.length; i++) {
      const entity = projectEntities[i];
      if (!entity) continue;
      const project = entity.getComponent<ConstructionProjectComponent>(CT.ConstructionProject);
      if (!project) continue;
      this.projectCache.set(project.projectId, entity as EntityImpl);
    }

    // Cache inventory entities (buildings, stockpiles, etc.)
    const invEntities = world.query().with(CT.Inventory).executeEntities();
    for (let i = 0; i < invEntities.length; i++) {
      const entity = invEntities[i];
      if (!entity) continue;
      this.inventoryCache.set(entity.id, entity as EntityImpl);
    }
  }

  /**
   * Process construction progress for a single project
   */
  private processConstruction(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    tick: number
  ): void {
    // Check if project is complete
    if (isComplete(project)) {
      this.completeConstruction(ctx, projectEntity, project);
      return;
    }

    // Get blueprint for this megastructure type
    const blueprint = getMegastructureBlueprint(project.megastructureType);
    if (!blueprint) {
      this.handleConstructionFailure(
        ctx,
        projectEntity,
        project,
        'unknown_megastructure_type'
      );
      return;
    }

    // Check if we're behind schedule
    if (isBehindSchedule(project, tick)) {
      this.handleDelay(ctx, projectEntity, project, tick);
    }

    // Calculate construction progress based on resources + labor + energy
    const progressDelta = this.calculateProgressDelta(project, blueprint, tick);

    // Update project progress
    this.updateConstructionProgress(ctx.world, projectEntity, project, progressDelta);

    // Consume resources if progress was made
    if (progressDelta > 0) {
      this.consumeResources(ctx, projectEntity, project, blueprint, progressDelta);
    }

    // Check for phase transitions
    this.checkPhaseTransition(ctx, projectEntity, project);

    // Risk management
    this.updateRisks(ctx, projectEntity, project, tick);
  }

  /**
   * Calculate how much progress can be made this tick
   */
  private calculateProgressDelta(
    project: ConstructionProjectComponent,
    blueprint: MegastructureBlueprint,
    tick: number
  ): number {
    // Base progress rate (per tick)
    const totalTicks = blueprint.constructionTimeYears * 365 * 24 * 60 * 3; // Convert years to ticks (20 TPS)
    const baseProgressPerTick = 1.0 / totalTicks;

    // Labor multiplier (0-1 based on allocation vs requirement)
    const laborRatio = Math.min(1.0, project.progress.laborAllocated / blueprint.laborRequired);
    const laborMultiplier = 0.5 + (laborRatio * 0.5); // 50% base, up to 100% with full labor

    // Energy multiplier (similar to labor)
    const energyRatio = Math.min(1.0, project.progress.energyAllocated / blueprint.totalMass);
    const energyMultiplier = 0.7 + (energyRatio * 0.3); // 70% base, up to 100% with full energy

    // Resource availability multiplier
    const resourceCompletion = getResourceCompletionPercent(project);
    const resourceMultiplier = Math.min(1.0, resourceCompletion);

    // Risk penalty (higher risk = slower progress)
    const riskPenalty = 1.0 - (project.risks.collapseRisk * 0.5); // Up to 50% slowdown at max risk

    // Final progress delta
    const progressDelta =
      baseProgressPerTick *
      laborMultiplier *
      energyMultiplier *
      resourceMultiplier *
      riskPenalty;

    return progressDelta;
  }

  /**
   * Update construction progress
   */
  private updateConstructionProgress(
    world: World,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    deltaProgress: number
  ): void {
    // Use helper from ConstructionProjectComponent
    updateProgress(project, deltaProgress);

    // Emit progress event every 10%
    const currentMilestone = Math.floor(project.progress.overallProgress * 10) * 10;
    const previousProgress = project.progress.overallProgress - deltaProgress;
    const previousMilestone = Math.floor(previousProgress * 10) * 10;

    if (currentMilestone > previousMilestone) {
      this.emitProgressEvent(world, project, currentMilestone);
    }
  }

  /**
   * Consume resources from stockpiles
   * PERF: Batch resource consumption
   */
  private consumeResources(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    blueprint: MegastructureBlueprint,
    progressDelta: number
  ): void {
    // Get current phase
    const currentPhase = getCurrentPhase(project);
    if (!currentPhase) return;

    // Calculate how many resources to consume this tick
    const phaseResourcesNeeded = currentPhase.resourcesNeeded;
    const consumptionRate = progressDelta; // Proportional to progress made

    // Track total resources consumed
    let resourcesConsumed = 0;

    // Try to consume from manager entity's inventory (if specified)
    if (project.coordination.managerEntityId) {
      const managerEntity = this.inventoryCache.get(project.coordination.managerEntityId);
      if (managerEntity) {
        const inventory = managerEntity.getComponent<InventoryComponent>(CT.Inventory);
        if (inventory) {
          for (const [itemId, totalNeeded] of Object.entries(phaseResourcesNeeded)) {
            const amountToConsume = Math.ceil(totalNeeded * consumptionRate);
            const availableInInventory = inventory.items[itemId]?.quantity || 0;

            if (availableInInventory >= amountToConsume) {
              // Consume resources
              ctx.components(managerEntity).update<InventoryComponent>(CT.Inventory, (inv) => {
                const updatedItems = { ...inv.items };
                if (updatedItems[itemId]) {
                  updatedItems[itemId] = {
                    ...updatedItems[itemId],
                    quantity: updatedItems[itemId].quantity - amountToConsume,
                  };
                  if (updatedItems[itemId].quantity <= 0) {
                    delete updatedItems[itemId];
                  }
                }
                return { ...inv, items: updatedItems };
              });

              // Track delivery
              project.progress.resourcesDelivered[itemId] =
                (project.progress.resourcesDelivered[itemId] || 0) + amountToConsume;

              resourcesConsumed += amountToConsume;
            }
          }
        }
      }
    }

    // If insufficient resources, increase budget overrun risk
    if (resourcesConsumed === 0) {
      increaseCollapseRisk(project, 0.001); // +0.1% risk per tick without resources
    }
  }

  /**
   * Check if we should transition to next phase
   */
  private checkPhaseTransition(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent
  ): void {
    // Check if current phase is complete
    if (project.progress.phaseProgress >= 1.0) {
      const currentPhaseName = getCurrentPhaseName(project);
      const nextPhaseIndex = project.progress.currentPhase + 1;

      if (nextPhaseIndex < project.timeline.phases.length) {
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
    }
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
    // TODO: Create MegastructureComponent on target entity
    // This will be implemented when MegastructureComponent is created
    // For now, just emit completion event

    ctx.emit(
      'construction_complete',
      {
        projectId: project.projectId,
        megastructureType: project.megastructureType,
        targetEntityId: project.targetEntityId,
        constructionTimeYears: (ctx.tick - project.timeline.startTick) / (365 * 24 * 60 * 3), // Ticks to years
        totalCost: this.calculateTotalCost(project),
      },
      projectEntity.id
    );

    // Remove construction project component (project is complete)
    ctx.components(projectEntity).remove(CT.ConstructionProject);
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
   */
  private handleDelay(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    tick: number
  ): void {
    // Calculate delay
    const expectedTicks = project.timeline.estimatedCompletionTick - project.timeline.startTick;
    const elapsedTicks = tick - project.timeline.startTick;
    const expectedProgress = Math.min(1.0, elapsedTicks / expectedTicks);
    const actualProgress = project.progress.overallProgress;
    const delayPercent = (expectedProgress - actualProgress) / expectedProgress;

    // Only penalize if significantly behind (>10%)
    if (delayPercent > 0.1) {
      const delayTicks = Math.floor(elapsedTicks * delayPercent);

      // Add delay to timeline
      addDelay(project, delayTicks);

      // Increase collapse risk slightly
      increaseCollapseRisk(project, 0.0005); // +0.05% risk

      ctx.emit(
        'construction_delayed',
        {
          projectId: project.projectId,
          megastructureType: project.megastructureType,
          delayTicks,
          delayPercent: Math.round(delayPercent * 100),
        },
        projectEntity.id
      );
    }
  }

  /**
   * Update project risks over time
   */
  private updateRisks(
    ctx: SystemContext,
    projectEntity: EntityImpl,
    project: ConstructionProjectComponent,
    tick: number
  ): void {
    // Roll for catastrophic failure
    const failureRoll = Math.random();
    const ticksSinceStart = tick - project.timeline.startTick;
    const yearsElapsed = ticksSinceStart / (365 * 24 * 60 * 3);

    // Annual failure chance based on collapse risk
    const annualFailureChance = project.risks.collapseRisk;
    const tickFailureChance = annualFailureChance / (365 * 24 * 60 * 3); // Convert to per-tick

    if (failureRoll < tickFailureChance) {
      // Catastrophic failure!
      this.handleConstructionFailure(
        ctx,
        projectEntity,
        project,
        'structural_collapse_during_construction'
      );
      return;
    }

    // Gradually increase risk over time (entropy)
    if (yearsElapsed > 10) {
      increaseCollapseRisk(project, 0.0001); // +0.01% per tick after 10 years
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
   */
  private calculateTotalCost(project: ConstructionProjectComponent): Record<string, number> {
    return { ...project.progress.resourcesDelivered };
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
  projectEntity.addComponent({
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
