/**
 * TimeThrottleCoordinator - Coordinates system throttling based on time compression speed
 *
 * Automatically adjusts system update intervals based on the current time scale to maintain
 * performance during fast-forward and ultra-fast simulation modes.
 *
 * Speed Ranges:
 * - 1x-10x: All systems every tick (no throttling)
 * - 100x: Throttle non-critical systems (memory: 10 ticks, relationships: 20 ticks)
 * - 1000x: Heavy throttling (brain: 10, courtship: 500, reproduction: 500)
 * - 10000x+: Most systems disabled, statistical simulation takes over
 *
 * Integration:
 * - Listens to TimeCompressionSystem for speed changes via time:simulation_mode_changed
 * - Updates system throttle intervals via world.getSystem()
 * - Emits time:throttles_updated when changes are applied
 *
 * Dependencies:
 * - TimeCompressionSystem (priority 5) - Tracks current time scale
 *
 * See openspec/specs/grand-strategy/03-TIME-SCALING.md for full specification.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { TimeCompressionComponent } from '../components/TimeCompressionComponent.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Throttle configuration for a system at different time scales.
 */
interface SystemThrottle {
  systemId: SystemId;
  /** Baseline throttle interval at normal speed */
  baseInterval: number;
  /** Multiplier applied to interval based on speed (0.1 = slower throttle, 1.0 = proportional) */
  speedMultiplier: number;
  /** Maximum interval cap (prevents excessively long intervals) */
  maxInterval: number;
  /** If set, system is completely disabled above this speed */
  disableAtSpeed?: number;
}

// ============================================================================
// THROTTLE CONFIGURATION
// ============================================================================

/**
 * System throttle configurations.
 * Based on spec: openspec/specs/grand-strategy/03-TIME-SCALING.md lines 235-285
 */
const SYSTEM_THROTTLE_CONFIG: readonly SystemThrottle[] = [
  // Memory & Cognitive Systems (can be delayed during fast-forward)
  { systemId: 'memory_consolidation', baseInterval: 10, speedMultiplier: 1.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'memory_formation', baseInterval: 5, speedMultiplier: 0.5, maxInterval: 500, disableAtSpeed: 10000 },
  { systemId: 'skill_learning', baseInterval: 10, speedMultiplier: 0.5, maxInterval: 500, disableAtSpeed: 10000 },
  { systemId: 'reflection', baseInterval: 20, speedMultiplier: 1.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'goal_generation', baseInterval: 20, speedMultiplier: 1.0, maxInterval: 1000, disableAtSpeed: 10000 },

  // Social Systems (less critical at high speeds)
  { systemId: 'relationship_decay', baseInterval: 20, speedMultiplier: 1.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'courtship', baseInterval: 10, speedMultiplier: 5.0, maxInterval: 500, disableAtSpeed: 10000 },
  { systemId: 'friendship', baseInterval: 10, speedMultiplier: 3.0, maxInterval: 500, disableAtSpeed: 10000 },
  { systemId: 'social_fatigue', baseInterval: 50, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },

  // Reproduction (very slow at high speeds)
  { systemId: 'reproduction', baseInterval: 10, speedMultiplier: 5.0, maxInterval: 500, disableAtSpeed: 10000 },
  { systemId: 'parenting', baseInterval: 20, speedMultiplier: 3.0, maxInterval: 500, disableAtSpeed: 10000 },

  // Agent Brain (reduced frequency at very high speeds)
  { systemId: 'agent_brain', baseInterval: 1, speedMultiplier: 0.1, maxInterval: 10, disableAtSpeed: 10000 },

  // Building & Maintenance (slow updates)
  { systemId: 'building_maintenance', baseInterval: 50, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'durability', baseInterval: 100, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'roof_repair', baseInterval: 100, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },

  // Environment (very slow at scale)
  { systemId: 'weather', baseInterval: 100, speedMultiplier: 0.1, maxInterval: 1000 },
  { systemId: 'temperature', baseInterval: 100, speedMultiplier: 0.1, maxInterval: 1000 },
  { systemId: 'soil', baseInterval: 200, speedMultiplier: 0.1, maxInterval: 2000 },

  // Cultural & Religious (can be heavily throttled)
  { systemId: 'belief_generation', baseInterval: 50, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'belief_formation', baseInterval: 50, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'myth_generation', baseInterval: 100, speedMultiplier: 3.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'myth_retelling', baseInterval: 100, speedMultiplier: 3.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'ritual', baseInterval: 50, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'prayer', baseInterval: 20, speedMultiplier: 2.0, maxInterval: 500, disableAtSpeed: 10000 },
  { systemId: 'prayer_answering', baseInterval: 50, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'religious_competition', baseInterval: 100, speedMultiplier: 3.0, maxInterval: 1000, disableAtSpeed: 10000 },

  // City & Governance (moderate throttling)
  { systemId: 'city_director', baseInterval: 50, speedMultiplier: 1.0, maxInterval: 500, disableAtSpeed: 10000 },
  { systemId: 'village_governance', baseInterval: 100, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'city_governance', baseInterval: 100, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'province_governance', baseInterval: 200, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'governance_data', baseInterval: 100, speedMultiplier: 1.0, maxInterval: 1000, disableAtSpeed: 10000 },

  // Publishing & Media (very slow)
  { systemId: 'publishing_production', baseInterval: 100, speedMultiplier: 3.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'publishing_unlock', baseInterval: 200, speedMultiplier: 3.0, maxInterval: 1000, disableAtSpeed: 10000 },

  // Technology (slow but important)
  { systemId: 'technology_unlock', baseInterval: 50, speedMultiplier: 1.0, maxInterval: 500 },
  { systemId: 'research', baseInterval: 50, speedMultiplier: 1.0, maxInterval: 500 },

  // Animals & Wild Spawning (can be throttled)
  { systemId: 'wild_animal_spawning', baseInterval: 100, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'aquatic_animal_spawning', baseInterval: 100, speedMultiplier: 2.0, maxInterval: 1000, disableAtSpeed: 10000 },
  { systemId: 'animal_production', baseInterval: 50, speedMultiplier: 2.0, maxInterval: 500, disableAtSpeed: 10000 },

  // Spatial Systems (moderate throttling)
  { systemId: 'spatial_memory_query', baseInterval: 20, speedMultiplier: 1.0, maxInterval: 200, disableAtSpeed: 10000 },
  { systemId: 'chunk_loading', baseInterval: 10, speedMultiplier: 0.5, maxInterval: 100 },

  // Combat & Predators (reduced at high speed)
  { systemId: 'predator_attack', baseInterval: 20, speedMultiplier: 2.0, maxInterval: 500, disableAtSpeed: 10000 },

  // Visual Systems (can be heavily throttled)
  { systemId: 'agent_visuals', baseInterval: 5, speedMultiplier: 3.0, maxInterval: 100, disableAtSpeed: 1000 },
  { systemId: 'plant_visuals', baseInterval: 10, speedMultiplier: 3.0, maxInterval: 200, disableAtSpeed: 1000 },
  { systemId: 'animal_visuals', baseInterval: 10, speedMultiplier: 3.0, maxInterval: 200, disableAtSpeed: 1000 },

  // Metrics & Utility (minimal throttling)
  { systemId: 'metrics_collection', baseInterval: 20, speedMultiplier: 0.5, maxInterval: 200 },
];

/** Pre-built lookup for O(1) config access by systemId */
const THROTTLE_CONFIG_BY_ID: Record<SystemId, SystemThrottle> = Object.create(null);
for (const config of SYSTEM_THROTTLE_CONFIG) {
  THROTTLE_CONFIG_BY_ID[config.systemId] = config;
}

// ============================================================================
// SYSTEM
// ============================================================================

/**
 * TimeThrottleCoordinator - Adjusts system throttling based on time compression
 *
 * Priority: 4 (very early, after TimeCompressionSystem at 5)
 * This system must run early to update throttles before other systems process
 */
export class TimeThrottleCoordinator extends BaseSystem {
  public readonly id: SystemId = 'time_throttle_coordinator';
  public readonly priority: number = 4; // Very early, after TimeCompressionSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.TimeCompression];
  // Only run when time compression components exist (O(1) activation check)
  public readonly activationComponents = [CT.TimeCompression] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK - critical for time control

  /**
   * Systems that must run before this one.
   * @see TimeCompressionSystem (priority 5) - Tracks current time scale
   */
  public readonly dependsOn = ['time_compression'] as const;

  // ========== State Tracking ==========

  /** Cached TimeCompression entity ID (singleton pattern) */
  private timeCompressionEntityId: string | null = null;

  /** Last time scale for change detection */
  private lastTimeScale: number = 1;

  /** Current active throttle presets by system ID (object literal for GC) */
  private currentThrottles: Record<SystemId, number> = Object.create(null);

  /** Systems currently disabled due to speed threshold (object literal for GC) */
  private disabledSystems: Record<SystemId, boolean> = Object.create(null);

  /** Pre-allocated arrays for event emission (avoid Array.from allocations) */
  private throttledSystemsCache: SystemId[] = [];
  private disabledSystemsCache: SystemId[] = [];

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

    const currentScale = compression.currentTimeScale;

    // Early exit: Only update if time scale changed
    if (currentScale === this.lastTimeScale) {
      return;
    }

    // Apply new throttles
    this.applyThrottles(world, currentScale);

    // Build cached arrays for event emission (reuse arrays, avoid allocations)
    this.throttledSystemsCache.length = 0;
    for (const systemId in this.currentThrottles) {
      this.throttledSystemsCache.push(systemId as SystemId);
    }
    this.disabledSystemsCache.length = 0;
    for (const systemId in this.disabledSystems) {
      this.disabledSystemsCache.push(systemId as SystemId);
    }

    // Emit event
    ctx.emit('time:throttles_updated', {
      timeScale: currentScale,
      previousScale: this.lastTimeScale,
      throttledSystems: this.throttledSystemsCache,
      disabledSystems: this.disabledSystemsCache,
    }, entity.id);

    this.lastTimeScale = currentScale;
  }

  /**
   * Apply throttle intervals based on current time scale.
   * Implements the throttling strategy from spec lines 235-285.
   */
  private applyThrottles(world: World, timeScale: number): void {
    // Track which systems should be disabled (avoid allocations by reusing temp object)
    const newDisabledSystems: Record<SystemId, boolean> = Object.create(null);

    for (const config of SYSTEM_THROTTLE_CONFIG) {
      // Check if system should be disabled at this speed
      if (config.disableAtSpeed !== undefined && timeScale >= config.disableAtSpeed) {
        newDisabledSystems[config.systemId] = true;
        this.disableSystem(world, config.systemId);
        continue;
      }

      // Calculate throttle interval
      const interval = this.calculateThrottle(config, timeScale);
      this.currentThrottles[config.systemId] = interval;

      // Apply throttle to system
      this.setSystemThrottle(world, config.systemId, interval);
    }

    // Re-enable systems that were previously disabled but are now active
    for (const systemId in this.disabledSystems) {
      if (!newDisabledSystems[systemId as SystemId]) {
        this.enableSystem(world, systemId as SystemId);
        delete this.disabledSystems[systemId as SystemId];
      }
    }

    // Update disabled systems (add new ones)
    for (const systemId in newDisabledSystems) {
      this.disabledSystems[systemId as SystemId] = true;
    }
  }

  /**
   * Calculate throttle interval for a system based on time scale.
   *
   * Speed Ranges (from spec):
   * - 1x-10x: No throttling (use baseInterval)
   * - 100x: Light throttling (baseInterval * speedMultiplier)
   * - 1000x: Heavy throttling (baseInterval * speedMultiplier * scale factor)
   * - 10000x+: Disabled (handled separately)
   */
  private calculateThrottle(config: SystemThrottle, timeScale: number): number {
    // No throttling at normal speeds
    if (timeScale <= 10) {
      return config.baseInterval;
    }

    // Calculate throttle based on speed multiplier
    // speedMultiplier controls how aggressively we throttle:
    // - Low multiplier (0.1): slow increase in throttle
    // - High multiplier (5.0): rapid increase in throttle
    const speedFactor = Math.log10(timeScale / 10); // 0 at 10x, 1 at 100x, 2 at 1000x
    const throttle = config.baseInterval + (config.baseInterval * config.speedMultiplier * speedFactor);

    // Clamp to max interval
    return Math.min(Math.round(throttle), config.maxInterval);
  }

  /**
   * Set throttle interval for a system.
   * Updates the system's internal throttle if the system supports it.
   */
  private setSystemThrottle(world: World, systemId: SystemId, interval: number): void {
    const system = world.getSystem(systemId);
    if (!system) {
      return; // System not registered
    }

    // TypeScript doesn't know about throttleInterval property on arbitrary systems
    // Use type assertion to access it
    const systemWithThrottle = system as { throttleInterval?: number; setThrottleInterval?: (interval: number) => void };

    // Some systems may implement setThrottleInterval method
    if (typeof systemWithThrottle.setThrottleInterval === 'function') {
      systemWithThrottle.setThrottleInterval(interval);
    } else if ('throttleInterval' in systemWithThrottle) {
      // Direct property assignment (works for BaseSystem subclasses)
      // Note: This is a hack since throttleInterval is readonly in BaseSystem
      // Systems that need dynamic throttling should implement setThrottleInterval
      (systemWithThrottle as { throttleInterval: number }).throttleInterval = interval;
    }
  }

  /**
   * Disable a system by setting its throttle to a very high value.
   * This effectively prevents the system from running without unregistering it.
   */
  private disableSystem(world: World, systemId: SystemId): void {
    // Set throttle to max value (systems check throttle in BaseSystem.update)
    this.setSystemThrottle(world, systemId, Number.MAX_SAFE_INTEGER);
  }

  /**
   * Re-enable a previously disabled system.
   */
  private enableSystem(world: World, systemId: SystemId): void {
    // Recalculate appropriate throttle for current speed (O(1) lookup)
    const config = THROTTLE_CONFIG_BY_ID[systemId];
    if (config) {
      const interval = this.calculateThrottle(config, this.lastTimeScale);
      this.setSystemThrottle(world, systemId, interval);
    }
  }

  /**
   * Get current throttle for a system (public API for debugging/admin).
   */
  public getThrottleForSystem(systemId: SystemId): number | null {
    return this.currentThrottles[systemId] ?? null;
  }

  /**
   * Check if a system is currently disabled due to speed threshold.
   */
  public isSystemDisabled(systemId: SystemId): boolean {
    return this.disabledSystems[systemId] === true;
  }

  /**
   * Get all current throttle settings (for admin panel).
   */
  public getAllThrottles(): Readonly<Record<SystemId, number>> {
    return this.currentThrottles;
  }

  /**
   * Get list of currently disabled systems.
   */
  public getDisabledSystems(): ReadonlyArray<SystemId> {
    // Reuse cache array to avoid allocations
    this.disabledSystemsCache.length = 0;
    for (const systemId in this.disabledSystems) {
      this.disabledSystemsCache.push(systemId as SystemId);
    }
    return this.disabledSystemsCache;
  }
}
