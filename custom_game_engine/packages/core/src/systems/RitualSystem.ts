/**
 * RitualSystem - Phase 5: Religious Institutions
 *
 * Manages ritual performance, scheduling, and belief generation from ceremonies.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

// ============================================================================
// Ritual Types
// ============================================================================

export interface RitualData {
  id: string;
  name: string;
  deityId: string;
  type: RitualType;
  beliefGenerated: number;
  requiredParticipants: number;
  duration: number; // ticks
  lastPerformed?: number;
}

export type RitualType =
  | 'daily_prayer'
  | 'weekly_ceremony'
  | 'seasonal_festival'
  | 'initiation'
  | 'blessing'
  | 'sacrifice'
  | 'pilgrimage';

// ============================================================================
// Ritual Configuration
// ============================================================================

export interface RitualConfig {
  /** How often to check for scheduled rituals (ticks) */
  checkInterval: number;

  /** Base belief from rituals */
  baseBeliefGeneration: number;
}

export const DEFAULT_RITUAL_CONFIG: RitualConfig = {
  checkInterval: 1200, // ~1 minute at 20 TPS
  baseBeliefGeneration: 50,
};

// ============================================================================
// RitualSystem
// ============================================================================

export class RitualSystem extends BaseSystem {
  public readonly id = 'RitualSystem';
  public readonly priority = 83;
  public readonly requiredComponents = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds at 20 TPS

  private config: RitualConfig;
  private rituals: Map<string, RitualData> = new Map();
  private scheduledRituals: Map<string, number> = new Map(); // ritual ID -> next occurrence

  // Performance optimization: deity entity cache
  private deityCache = new Map<string, DeityComponent>();
  private lastCacheUpdate = 0;
  private readonly CACHE_REFRESH_INTERVAL = 100; // Refresh deity cache every 5 seconds

  // Performance optimization: ritual interval lookup table
  private readonly ritualIntervalLookup = new Map<RitualType, number>();

  constructor(config: Partial<RitualConfig> = {}) {
    super();
    this.config = { ...DEFAULT_RITUAL_CONFIG, ...config };
    this.initializeRitualIntervals();
  }

  /**
   * Initialize precomputed ritual intervals
   */
  private initializeRitualIntervals(): void {
    this.ritualIntervalLookup.set('daily_prayer', 24000);
    this.ritualIntervalLookup.set('weekly_ceremony', 168000);
    this.ritualIntervalLookup.set('seasonal_festival', 2160000);
    this.ritualIntervalLookup.set('initiation', 0);
    this.ritualIntervalLookup.set('blessing', 12000);
    this.ritualIntervalLookup.set('sacrifice', 48000);
    this.ritualIntervalLookup.set('pilgrimage', 480000);
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Early exit: no scheduled rituals
    if (this.scheduledRituals.size === 0) {
      return;
    }

    // Refresh deity cache periodically
    if (currentTick - this.lastCacheUpdate >= this.CACHE_REFRESH_INTERVAL) {
      this.rebuildDeityCache(ctx.world);
      this.lastCacheUpdate = currentTick;
    }

    // Early exit: no deities exist
    if (this.deityCache.size === 0) {
      return;
    }

    // Check for rituals that should occur
    this.performScheduledRituals(ctx.world, currentTick);
  }

  /**
   * Rebuild deity cache from world entities
   */
  private rebuildDeityCache(world: World): void {
    this.deityCache.clear();

    const deityEntities = world.query().with(CT.Deity).executeEntities();
    for (const entity of deityEntities) {
      const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
      if (deity) {
        this.deityCache.set(entity.id, deity);
      }
    }
  }

  /**
   * Schedule a ritual
   */
  scheduleRitual(ritual: RitualData, nextOccurrence: number): void {
    this.rituals.set(ritual.id, ritual);
    this.scheduledRituals.set(ritual.id, nextOccurrence);
  }

  /**
   * Perform scheduled rituals (optimized)
   */
  private performScheduledRituals(world: World, currentTick: number): void {
    for (const [ritualId, nextOccurrence] of this.scheduledRituals) {
      // Early exit: not time yet
      if (currentTick < nextOccurrence) continue;

      const ritual = this.rituals.get(ritualId);
      if (!ritual) continue;

      // Use cache for deity lookup (O(1) vs world.getEntity)
      const deity = this.deityCache.get(ritual.deityId);
      if (!deity) continue;

      // Perform ritual inline (avoid function call overhead)
      deity.addBelief(ritual.beliefGenerated, currentTick);
      ritual.lastPerformed = currentTick;

      // Reschedule based on type (use lookup table)
      const interval = this.ritualIntervalLookup.get(ritual.type) ?? 0;
      if (interval > 0) {
        this.scheduledRituals.set(ritualId, currentTick + interval);
      } else {
        // One-time ritual - remove from schedule
        this.scheduledRituals.delete(ritualId);
      }
    }
  }

  /**
   * Perform a ritual (deprecated - inlined into performScheduledRituals)
   */
  private performRitual(ritual: RitualData, world: World, currentTick: number): void {
    const deity = this.deityCache.get(ritual.deityId);
    if (!deity) return;

    deity.addBelief(ritual.beliefGenerated, currentTick);
    ritual.lastPerformed = currentTick;
  }

  /**
   * Get interval for ritual type (use lookup table)
   */
  private getRitualInterval(type: RitualType): number {
    return this.ritualIntervalLookup.get(type) ?? 0;
  }

  /**
   * Create a default ritual for a deity
   */
  createDefaultRitual(deityId: string, type: RitualType = 'daily_prayer'): RitualData {
    return {
      id: `ritual_${deityId}_${type}_${Date.now()}`,
      name: `${type} for deity`,
      deityId,
      type,
      beliefGenerated: this.config.baseBeliefGeneration,
      requiredParticipants: 1,
      duration: 600, // ~30 seconds
    };
  }
}
