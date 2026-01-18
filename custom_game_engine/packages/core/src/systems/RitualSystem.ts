/**
 * RitualSystem - Phase 5: Religious Institutions
 *
 * Manages ritual performance, scheduling, and belief generation from ceremonies.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';

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
  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  private config: RitualConfig;
  private rituals: Map<string, RitualData> = new Map();
  private scheduledRituals: Map<string, number> = new Map(); // ritual ID -> next occurrence

  constructor(config: Partial<RitualConfig> = {}) {
    super();
    this.config = { ...DEFAULT_RITUAL_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Check for rituals that should occur
    this.performScheduledRituals(ctx.world, currentTick);
  }

  /**
   * Schedule a ritual
   */
  scheduleRitual(ritual: RitualData, nextOccurrence: number): void {
    this.rituals.set(ritual.id, ritual);
    this.scheduledRituals.set(ritual.id, nextOccurrence);
  }

  /**
   * Perform scheduled rituals
   */
  private performScheduledRituals(world: World, currentTick: number): void {
    for (const [ritualId, nextOccurrence] of this.scheduledRituals) {
      if (currentTick >= nextOccurrence) {
        const ritual = this.rituals.get(ritualId);
        if (ritual) {
          this.performRitual(ritual, world, currentTick);

          // Reschedule based on type
          const interval = this.getRitualInterval(ritual.type);
          this.scheduledRituals.set(ritualId, currentTick + interval);
        }
      }
    }
  }

  /**
   * Perform a ritual
   */
  private performRitual(ritual: RitualData, world: World, currentTick: number): void {
    // Find deity
    const deityEntity = world.getEntity(ritual.deityId);
    if (!deityEntity) return;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return;

    // Generate belief
    deity.addBelief(ritual.beliefGenerated, currentTick);

    // Update last performed
    ritual.lastPerformed = currentTick;
  }

  /**
   * Get interval for ritual type
   */
  private getRitualInterval(type: RitualType): number {
    const intervals: Record<RitualType, number> = {
      daily_prayer: 24000,        // ~20 minutes
      weekly_ceremony: 168000,    // ~2.3 hours
      seasonal_festival: 2160000, // ~30 hours
      initiation: 0,              // One-time
      blessing: 12000,            // ~10 minutes
      sacrifice: 48000,           // ~40 minutes
      pilgrimage: 480000,         // ~6.7 hours
    };

    return intervals[type];
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
