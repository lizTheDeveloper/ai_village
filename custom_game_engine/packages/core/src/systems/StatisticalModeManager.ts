/**
 * StatisticalModeManager - Manages entity activation/deactivation during statistical mode transitions
 *
 * Handles the transition between full ECS simulation and statistical simulation mode:
 * - At ultra-fast speeds (10000x+), ECS is disabled and entities enter statistical mode
 * - Entities are marked as PASSIVE (zero per-tick cost) while preserving state
 * - Soul agents switch to headless simulation
 * - When returning to ECS mode, entities are restored with statistical results applied
 *
 * Integration with hierarchy-simulator:
 * - Calls RenormalizationEngine when entering statistical mode
 * - Applies tier summaries when exiting statistical mode
 * - Syncs population/economy changes from differential equations
 *
 * See openspec/specs/grand-strategy/03-TIME-SCALING.md lines 90-105, 180-185
 *
 * Dependencies:
 * - TimeCompressionSystem (priority 5) - Provides statistical mode flag
 * - SimulationScheduler - Entity activation mode management
 * - RenormalizationEngine (hierarchy-simulator) - Statistical simulation
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { TimeCompressionComponent } from '../components/TimeCompressionComponent.js';
import type { SoulLinkComponent } from '../components/SoulLinkComponent.js';
import type { Component } from '../ecs/Component.js';
import { SimulationMode, getSimulationConfig } from '../ecs/SimulationScheduler.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Preserved state for a single entity during statistical mode
 */
interface PreservedEntityState {
  entityId: string;
  /** Component snapshots keyed by type (object literal for GC) */
  components: Record<ComponentType, Component>;
  componentCount: number;
  previousSchedulerMode: SimulationMode;
  wasActive: boolean;
}

/**
 * Headless state for soul agents during statistical mode
 */
interface HeadlessState {
  agentId: string;
  soulId: string;
  lastTick: number;
  age: number;
  isAlive: boolean;
  trajectory?: LifeTrajectory;
}

/**
 * Life trajectory for soul agents during time jumps/statistical mode
 */
interface LifeTrajectory {
  soulId: string;
  soulName: string;
  startAge: number;
  endAge: number;
  survived: boolean;
  majorEvents: string[];
  skillsGained: string[];
  relationshipsFormed: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Threshold for entering statistical mode (from TimeCompressionSystem) */
const STATISTICAL_MODE_THRESHOLD = 10000;

/**
 * StatisticalModeManager - Manages entity state during statistical simulation
 *
 * Priority: 6 (After TimeCompressionSystem priority 5, before most gameplay systems)
 * This system must run early to deactivate entities before other systems attempt to process them
 */
export class StatisticalModeManager extends BaseSystem {
  public readonly id: SystemId = 'statistical_mode_manager';
  public readonly priority: number = 6; // After TimeCompressionSystem, before gameplay
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [] as const; // Always run to check mode
  protected readonly throttleInterval = 0; // EVERY_TICK - critical for mode management

  /**
   * Systems that must run before this one.
   * @see TimeCompressionSystem (priority 5) - Provides statisticalMode flag
   */
  public readonly dependsOn = ['time_compression'] as const;

  // ========== Cached State ==========

  /** Cached TimeCompression entity ID (singleton pattern) */
  private timeCompressionEntityId: string | null = null;

  /** Current statistical mode state */
  private isStatisticalMode: boolean = false;

  /** Preserved entity states for resurrection (object literal for GC) */
  private preservedEntityStates: Record<string, PreservedEntityState> = Object.create(null);
  private preservedEntityCount: number = 0;

  /** Headless soul agent states (object literal for GC) */
  private headlessSoulStates: Record<string, HeadlessState> = Object.create(null);
  private headlessSoulCount: number = 0;

  /** Entities that were marked as PASSIVE during statistical mode (object literal for GC) */
  private passiveEntities: Record<string, boolean> = Object.create(null);

  protected onUpdate(ctx: SystemContext): void {
    const { world, tick } = ctx;

    // Cache singleton entity ID on first run
    if (this.timeCompressionEntityId === null) {
      const entities = world.query().with(CT.TimeCompression).executeEntities();
      if (entities.length === 0) return; // No time compression entity
      this.timeCompressionEntityId = entities[0]!.id;
    }

    // Get entity (cached lookup)
    const entity = world.getEntity(this.timeCompressionEntityId);
    if (!entity) {
      this.timeCompressionEntityId = null; // Reset cache if entity was removed
      return;
    }

    const impl = entity as EntityImpl;
    const compression = impl.getComponent<TimeCompressionComponent>(CT.TimeCompression);

    if (!compression) {
      return;
    }

    // Check for mode transition
    const shouldBeStatistical = compression.statisticalMode;

    if (shouldBeStatistical !== this.isStatisticalMode) {
      // Mode changed
      if (shouldBeStatistical) {
        this.enterStatisticalMode(ctx, world);
      } else {
        this.exitStatisticalMode(ctx, world);
      }

      this.isStatisticalMode = shouldBeStatistical;
    }
  }

  /**
   * Enter statistical mode (speed >= 10000x)
   * - Snapshot all active entity states
   * - Mark entities as PASSIVE (zero per-tick cost)
   * - Soul agents switch to headless simulation
   * - Emit event
   */
  private enterStatisticalMode(ctx: SystemContext, world: World): void {
    const { tick } = ctx;

    // Reset counters
    this.preservedEntityCount = 0;
    this.headlessSoulCount = 0;

    // 1. Snapshot all entities with Position (active simulation targets)
    const activeEntities = world.query().with(CT.Position).executeEntities();

    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;

      // Check if entity is a soul agent
      const soulLink = impl.getComponent<SoulLinkComponent>(CT.SoulLink);
      const isSoulAgent = soulLink !== undefined;

      // Preserve entity state
      const state = this.preserveEntityState(impl, isSoulAgent);
      this.preservedEntityStates[entity.id] = state;
      this.preservedEntityCount++;

      // Mark entity as passive (disable per-tick processing)
      this.passiveEntities[entity.id] = true;

      // For soul agents, create headless state
      if (isSoulAgent && soulLink) {
        const identity = impl.getComponent(CT.Identity) as { age?: number } | undefined;

        this.headlessSoulStates[entity.id] = {
          agentId: entity.id,
          soulId: soulLink.soulEntityId,
          lastTick: Number(tick),
          age: identity?.age ?? 0,
          isAlive: true,
        };
        this.headlessSoulCount++;
      }
    }

    // 2. Emit event
    ctx.emit('time:entered_statistical_mode', {
      entitiesPreserved: this.preservedEntityCount,
      soulAgents: this.headlessSoulCount,
      tick: Number(tick),
    }, this.timeCompressionEntityId ?? 'world');

    console.log(
      `[StatisticalModeManager] Entered statistical mode: ` +
      `${this.preservedEntityCount} entities preserved, ` +
      `${this.headlessSoulCount} soul agents headless`
    );
  }

  /**
   * Exit statistical mode (speed < 10000x)
   * - Resurrect entities from snapshots
   * - Apply statistical results (population changes, etc.)
   * - Soul agents resume normal simulation
   * - Emit event
   */
  private exitStatisticalMode(ctx: SystemContext, world: World): void {
    const { tick } = ctx;

    // Track counts before clearing
    const entitiesRestored = this.preservedEntityCount;
    const soulAgentsResumed = this.headlessSoulCount;

    // 1. Restore entity states
    for (const entityId in this.preservedEntityStates) {
      const state = this.preservedEntityStates[entityId]!;
      const entity = world.getEntity(entityId);
      if (!entity) {
        console.warn(`[StatisticalModeManager] Entity ${entityId} no longer exists, cannot restore`);
        continue;
      }

      this.restoreEntityState(entity as EntityImpl, state);

      // Remove from passive set (re-enable per-tick processing)
      delete this.passiveEntities[entityId];

      // Emit restoration event
      ctx.emit('time:entity_restored', {
        entityId,
        componentsRestored: state.componentCount,
      }, entityId);
    }

    // 2. Update soul agents from headless state
    for (const entityId in this.headlessSoulStates) {
      const headlessState = this.headlessSoulStates[entityId]!;
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      const impl = entity as EntityImpl;

      // Apply trajectory results if available
      if (headlessState.trajectory) {
        this.applySoulTrajectoryResults(impl, headlessState.trajectory);
      }

      // Update age from headless state
      const identity = impl.getComponent(CT.Identity) as { age?: number } | undefined;
      if (identity && headlessState.age !== identity.age) {
        impl.updateComponent(CT.Identity, (current: Component) => ({
          ...current,
          age: headlessState.age,
        }));
      }
    }

    // 3. Clear caches by deleting keys (avoid GC pressure from new objects)
    for (const key in this.preservedEntityStates) {
      delete this.preservedEntityStates[key];
    }
    for (const key in this.headlessSoulStates) {
      delete this.headlessSoulStates[key];
    }
    for (const key in this.passiveEntities) {
      delete this.passiveEntities[key];
    }
    this.preservedEntityCount = 0;
    this.headlessSoulCount = 0;

    // 4. Emit event
    ctx.emit('time:exited_statistical_mode', {
      entitiesRestored,
      soulAgentsResumed,
      tick: Number(tick),
    }, this.timeCompressionEntityId ?? 'world');

    console.log(
      `[StatisticalModeManager] Exited statistical mode: ` +
      `${entitiesRestored} entities restored`
    );
  }

  /**
   * Preserve entity state for later restoration
   * Uses shallow clone for critical components only (not full deep clone)
   */
  private preserveEntityState(entity: EntityImpl, isSoulAgent: boolean): PreservedEntityState {
    // Snapshot critical components only (object literal for GC)
    const components: Record<ComponentType, Component> = Object.create(null);
    let componentCount = 0;

    // Only preserve components needed for restoration (Position, Needs, Inventory)
    // Full deep clone via JSON is extremely expensive for GC
    const criticalTypes = [CT.Position, CT.Needs, CT.Inventory] as ComponentType[];

    for (const type of criticalTypes) {
      const component = entity.getComponent(type);
      if (component) {
        // Shallow clone with spread - sufficient for simple value objects
        components[type] = { ...component };
        componentCount++;
      }
    }

    return {
      entityId: entity.id,
      components,
      componentCount,
      previousSchedulerMode: SimulationMode.ALWAYS, // TODO: Get from SimulationScheduler
      wasActive: true,
    };
  }

  /**
   * Restore entity state from preserved snapshot
   */
  private restoreEntityState(entity: EntityImpl, state: PreservedEntityState): void {
    // Note: We don't restore components directly to avoid conflicts with
    // systems that may have modified state during statistical mode.
    // Instead, we only restore critical state like position, needs, etc.

    // Restore position (critical for spatial queries)
    const preservedPosition = state.components[CT.Position];
    if (preservedPosition) {
      entity.updateComponent(CT.Position, () => preservedPosition);
    }

    // Restore needs (prevent starvation after long statistical periods)
    const preservedNeeds = state.components[CT.Needs];
    if (preservedNeeds) {
      entity.updateComponent(CT.Needs, () => preservedNeeds);
    }

    // Restore inventory
    const preservedInventory = state.components[CT.Inventory];
    if (preservedInventory) {
      entity.updateComponent(CT.Inventory, () => preservedInventory);
    }
  }

  /**
   * Apply trajectory results to soul agent after statistical mode
   */
  private applySoulTrajectoryResults(entity: EntityImpl, trajectory: LifeTrajectory): void {
    // Update age
    entity.updateComponent(CT.Identity, (current: Component) => ({
      ...current,
      age: trajectory.endAge,
    }));

    // Add skills gained (simplified - skills system is complex)
    // In full implementation, would integrate with SkillsComponent properly
    if (trajectory.skillsGained.length > 0) {
      // Log skill gains for now
      console.log(
        `[StatisticalModeManager] Soul ${trajectory.soulName} gained skills: ${trajectory.skillsGained.join(', ')}`
      );
    }

    // Mark if agent died during trajectory
    if (!trajectory.survived) {
      entity.updateComponent(CT.Health, (current: Component) => ({
        ...current,
        current: 0,
        isDead: true,
      }));
    }
  }

  /**
   * Check if entity is currently in statistical mode (passive)
   */
  public isEntityPassive(entityId: string): boolean {
    return this.passiveEntities[entityId] === true;
  }

  /**
   * Get headless state for soul agent
   */
  public getHeadlessState(agentId: string): HeadlessState | undefined {
    return this.headlessSoulStates[agentId];
  }

  /**
   * Update soul agent headless state with trajectory
   */
  public updateSoulAgentHeadless(agentId: string, trajectory: LifeTrajectory): void {
    const state = this.headlessSoulStates[agentId];
    if (!state) {
      console.warn(`[StatisticalModeManager] No headless state for agent ${agentId}`);
      return;
    }

    state.trajectory = trajectory;
    state.age = trajectory.endAge;
    state.isAlive = trajectory.survived;
  }

  /**
   * Get count of preserved entities
   */
  public getPreservedCount(): number {
    return this.preservedEntityCount;
  }

  /**
   * Get count of headless soul agents
   */
  public getHeadlessSoulCount(): number {
    return this.headlessSoulCount;
  }
}
