/**
 * RitualSystem - Phase 5: Religious Institutions
 *
 * Manages ritual performance, scheduling, and belief generation from ceremonies.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
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
  public readonly requiredComponents: string[] = [];
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

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // When a myth becomes canonical, schedule a commemorative ritual
    this.events.onGeneric('lore:myth_canonized', (data: unknown) => {
        const mythData = data as {
            deityId?: string;
            mythTitle?: string;
            sourceGame?: string;
        };

        // Only process MVEE myths
        if (mythData.sourceGame && mythData.sourceGame !== 'mvee') return;

        if (!mythData.deityId) return;

        // Check if deity exists in our cache
        const deity = this.deityCache.get(mythData.deityId);
        if (!deity) return;

        // Schedule a commemorative blessing ritual for myth canonization
        const ritualId = `myth_commemoration_${Date.now()}`;
        const ritual: RitualData = {
            id: ritualId,
            name: `Commemoration of "${mythData.mythTitle ?? 'a sacred myth'}"`,
            deityId: mythData.deityId,
            type: 'blessing',
            beliefGenerated: this.config.baseBeliefGeneration * 1.5, // Canonization bonus
            requiredParticipants: 1,
            duration: 200, // ~10 seconds
        };

        // Schedule it for the next check interval
        const nextTick = (this.lastCacheUpdate || 0) + this.config.checkInterval;
        this.scheduleRitual(ritual, nextTick);
    });

    // When a legend forms, also consider ritual
    this.events.onGeneric('mythology:legend_formed', (data: unknown) => {
        const legendData = data as {
            deityId?: string;
            heroName?: string;
            sourceGame?: string;
        };

        if (legendData.sourceGame && legendData.sourceGame !== 'mvee') return;
        if (!legendData.deityId) return;

        const deity = this.deityCache.get(legendData.deityId);
        if (!deity) return;

        // Schedule a ceremony for the legend
        const ritualId = `legend_ceremony_${Date.now()}`;
        const ritual: RitualData = {
            id: ritualId,
            name: `Ceremony for the legend of ${legendData.heroName ?? 'a hero'}`,
            deityId: legendData.deityId,
            type: 'weekly_ceremony',
            beliefGenerated: this.config.baseBeliefGeneration * 2.0, // Legends generate more belief
            requiredParticipants: 3,
            duration: 400, // ~20 seconds
        };

        const nextTick = (this.lastCacheUpdate || 0) + this.config.checkInterval;
        this.scheduleRitual(ritual, nextTick);
    });
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

      // Cross-game lore export event (see cross-game-lore-bridge-spec-v1.md)
      this.events.emitGeneric('lore:ritual_performed', {
        sourceGame: 'mvee',
        ritualId: ritual.id,
        name: ritual.name,
        deityId: ritual.deityId,
        type: ritual.type,
        beliefGenerated: ritual.beliefGenerated,
        requiredParticipants: ritual.requiredParticipants,
        duration: ritual.duration,
        timestamp: currentTick,
      });

      // Emit festival event for seasonal festivals (cross-game lore bridge)
      if (ritual.type === 'seasonal_festival') {
        this.events.emitGeneric('lore:festival_occurred', {
          sourceGame: 'mvee',
          ritualId: ritual.id,
          name: ritual.name,
          deityId: ritual.deityId,
          timestamp: currentTick,
        });
      }

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
