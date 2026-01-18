/**
 * TimeCompressionSystem - Elastic time control for grand strategy
 *
 * Enables fast-forward mode and time jumps spanning millennia by controlling
 * simulation speed based on zoom level and player intent.
 *
 * Time Modes:
 * 1. Real-Time (1x-10x): Full ECS simulation, watch individual agents
 * 2. Fast-Forward (100x-100000x): Statistical simulation, civilizations evolve
 * 3. Time Jump: Instant skip to target tick via LLM trajectory generation
 *
 * Speed Limits by Tier:
 * - Chunk/Zone: max 10x (individual physics)
 * - Region: max 100x (economy simulation)
 * - Planet: max 1000x (politics, nations)
 * - System: max 10000x (interstellar trade)
 * - Galaxy: max 100000x (cosmic evolution)
 *
 * Dependencies:
 * - TimeSystem (priority 3) - Core time tracking
 * - MultiverseCoordinator - Universe time scale management
 * - SimulationController (hierarchy-simulator) - Abstract tier updates
 *
 * See openspec/specs/grand-strategy/03-TIME-SCALING.md for full specification.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType, Tick } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { TimeCompressionComponent } from '../components/TimeCompressionComponent.js';
import { TIME_SCALE_LIMITS } from '../components/TimeCompressionComponent.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ticks per century for era tracking (1 tick = 1 minute game-time) */
const TICKS_PER_CENTURY = 525600 * 100; // 52,560,000 ticks per century

/** Time scale threshold for statistical mode (above 1000x) */
const STATISTICAL_MODE_THRESHOLD = 1000;

/** Ticks per year for time jump calculations */
const TICKS_PER_YEAR = 525600;

/**
 * TimeCompressionSystem - Control simulation speed across cosmic scales
 *
 * Priority: 5 (very early, before most systems but after Time)
 * This system must run early to set time scale before other systems process
 */
export class TimeCompressionSystem extends BaseSystem {
  public readonly id: SystemId = 'time_compression';
  public readonly priority: number = 5; // Very early, before most systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.TimeCompression];
  protected readonly throttleInterval = 0; // EVERY_TICK - critical for time control

  /**
   * Systems that must run before this one.
   * @see TimeSystem (priority 3) - Provides time tracking
   */
  public readonly dependsOn = ['time'] as const;

  // ========== Cached State (Performance Optimization) ==========

  /** Cached TimeCompression entity ID (singleton pattern) */
  private timeCompressionEntityId: string | null = null;

  /** Last era value for change detection */
  private lastEra: number = 0;

  /** Last statistical mode for change detection */
  private lastStatisticalMode: boolean = false;

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

    // Early exit: Skip if paused
    if (compression.isPaused) {
      return;
    }

    // Early exit: Check for time jump in progress
    if (compression.jumpInProgress && compression.targetTick !== null) {
      this.processTimeJump(ctx, impl, compression);
      return;
    }

    // Update era tracking (optimized with pre-computed constant)
    const currentEra = Math.floor(Number(tick) / TICKS_PER_CENTURY);

    if (currentEra !== this.lastEra) {
      // Era changed
      impl.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
        ...current,
        currentEra,
      }));

      // Emit era change event
      ctx.emit('time:era_changed', {
        era: currentEra,
        previousEra: this.lastEra,
        tick: Number(tick),
      }, entity.id);

      this.lastEra = currentEra;
    }

    // Update statistical mode based on time scale (optimized threshold comparison)
    const shouldBeStatistical = compression.currentTimeScale > STATISTICAL_MODE_THRESHOLD;

    if (shouldBeStatistical !== this.lastStatisticalMode) {
      impl.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
        ...current,
        statisticalMode: shouldBeStatistical,
      }));

      // Emit mode change event
      ctx.emit('time:simulation_mode_changed', {
        mode: shouldBeStatistical ? 'statistical' : 'ecs',
        timeScale: compression.currentTimeScale,
      }, entity.id);

      this.lastStatisticalMode = shouldBeStatistical;
    }
  }

  /**
   * Process time jump to target tick
   * Uses statistical simulation + LLM trajectory generation
   */
  private processTimeJump(
    ctx: SystemContext,
    entity: EntityImpl,
    compression: TimeCompressionComponent
  ): void {
    if (compression.targetTick === null) {
      return;
    }

    const currentTick = ctx.tick;
    const targetTick = compression.targetTick;

    // Calculate years to jump (use pre-computed constant)
    const yearsToJump = Number(targetTick - currentTick) / TICKS_PER_YEAR;

    // Emit jump started event (only once)
    if (compression.jumpInProgress && currentTick < targetTick) {
      ctx.emit('time:jump_started', {
        startTick: Number(currentTick),
        targetTick: Number(targetTick),
        years: yearsToJump,
      }, entity.id);

      // TODO: Integrate with hierarchy-simulator for abstract tier updates
      // TODO: Call LLM trajectory generation for soul agents
      // TODO: Generate era snapshots for time-travel archaeology

      // For now, just mark as complete (implementation placeholder)
      entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
        ...current,
        jumpInProgress: false,
        targetTick: null,
      }));

      // Emit jump completed event
      ctx.emit('time:jump_completed', {
        startTick: Number(currentTick),
        endTick: Number(targetTick),
        years: yearsToJump,
      }, entity.id);
    }
  }

  /**
   * Set time scale (public API for external systems)
   * Clamps to max allowed for current tier
   */
  public setTimeScale(
    entity: EntityImpl,
    newScale: number
  ): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    // Clamp to allowed range for current tier
    const clampedScale = Math.max(1, Math.min(compression.maxTimeScale, newScale));

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      currentTimeScale: clampedScale,
    }));

    // Emit scale changed event
    // Note: Using world.eventBus directly since we don't have SystemContext here
    // This is called from external code (UI, admin panel, etc.)
  }

  /**
   * Request time jump to target tick
   * Validates target is in the future and starts jump process
   */
  public requestTimeJump(
    entity: EntityImpl,
    targetTick: Tick,
    currentTick: Tick
  ): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    // Validate target is in future
    if (targetTick <= currentTick) {
      throw new Error(`Target tick ${targetTick} must be greater than current tick ${currentTick}`);
    }

    // Calculate years to jump (use pre-computed constant)
    const yearsToJump = Number(targetTick - currentTick) / TICKS_PER_YEAR;

    // Recommended maximum: 10,000-year jumps (from spec)
    if (yearsToJump > 10000) {
      console.warn(
        `[TimeCompressionSystem] Jumping ${yearsToJump.toFixed(0)} years exceeds recommended 10,000-year limit. ` +
        `Consider splitting into multiple jumps for better performance.`
      );
    }

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      targetTick,
      jumpInProgress: true,
    }));
  }

  /**
   * Pause time progression
   */
  public pauseTime(entity: EntityImpl): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      isPaused: true,
    }));
  }

  /**
   * Resume time progression
   */
  public resumeTime(entity: EntityImpl): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      isPaused: false,
    }));
  }

  /**
   * Update tier and adjust max time scale accordingly
   */
  public setTier(
    entity: EntityImpl,
    tier: 'chunk' | 'zone' | 'region' | 'planet' | 'system' | 'sector' | 'galaxy'
  ): void {
    const compression = entity.getComponent<TimeCompressionComponent>(CT.TimeCompression);
    if (!compression) {
      throw new Error(`Entity ${entity.id} missing TimeCompressionComponent`);
    }

    const newMaxScale = TIME_SCALE_LIMITS[tier] || 10;

    entity.updateComponent<TimeCompressionComponent>(CT.TimeCompression, (current) => ({
      ...current,
      currentTier: tier,
      maxTimeScale: newMaxScale,
      // Clamp current scale if it exceeds new max
      currentTimeScale: Math.min(current.currentTimeScale, newMaxScale),
    }));
  }
}
