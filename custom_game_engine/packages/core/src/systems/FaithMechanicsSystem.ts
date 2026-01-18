/**
 * FaithMechanicsSystem - Faith growth and decay mechanics
 *
 * Handles:
 * - Faith decay from unanswered prayers
 * - Faith growth from answered prayers and visions
 * - Crisis of faith mechanics
 * - Natural faith drift toward baseline
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SpiritualComponent, Prayer, Doubt } from '../components/SpiritualComponent.js';
import type { EntityImpl, Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';

const CT = {
  Agent: 'agent',
  Spiritual: 'spiritual',
  Deity: 'deity',
} as const;

/**
 * Configuration for faith mechanics
 */
interface FaithConfig {
  /** Ticks between faith updates (default: 1200 = ~1 min at 20 TPS) */
  updateInterval: number;

  /** Faith decay per tick for unanswered prayers (default: 0.0001) */
  unansweredPrayerDecay: number;

  /** Time before prayer is considered unanswered (ticks, default: 12000 = ~10 min) */
  prayerTimeoutTicks: number;

  /** Natural drift rate toward baseline faith (default: 0.001) */
  baselineDriftRate: number;

  /** Minimum faith before crisis (default: 0.1) */
  crisisThreshold: number;

  /** Ticks in crisis before losing faith entirely (default: 24000 = ~20 min) */
  crisisTimeoutTicks: number;
}

const DEFAULT_CONFIG: FaithConfig = {
  updateInterval: 1200,
  unansweredPrayerDecay: 0.0001,
  prayerTimeoutTicks: 12000,
  baselineDriftRate: 0.001,
  crisisThreshold: 0.1,
  crisisTimeoutTicks: 24000,
};

/**
 * FaithMechanicsSystem processes faith changes over time.
 */
export class FaithMechanicsSystem extends BaseSystem {
  public readonly id = 'faith_mechanics';
  public readonly priority: number = 85; // After prayer system, before decision making
  public readonly requiredComponents = [] as const;

  private config: FaithConfig;
  protected readonly throttleInterval: number;

  constructor(config: Partial<FaithConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.throttleInterval = this.config.updateInterval;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Process all agents with spiritual components
    // Believers are agents (ALWAYS simulated), so we iterate all
    for (const entity of ctx.world.entities.values()) {
      if (!entity.components.has(CT.Spiritual)) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent;
      if (!spiritual) continue;

      // Process faith mechanics
      this.processFaithDecay(entity, spiritual, ctx.tick);
      this.processBaselineDrift(entity, spiritual);
      this.processCrisisOfFaith(entity, spiritual, ctx.tick);
    }
  }

  /**
   * Process faith decay from unanswered prayers
   */
  private processFaithDecay(
    entity: Entity,
    spiritual: SpiritualComponent,
    currentTick: number
  ): void {
    if (spiritual.prayers.length === 0) return;

    let unansweredCount = 0;
    const updatedPrayers: Prayer[] = [];

    for (const prayer of spiritual.prayers) {
      // Check if prayer has timed out
      if (
        !prayer.answered &&
        currentTick - prayer.timestamp > this.config.prayerTimeoutTicks
      ) {
        unansweredCount++;

        // Mark prayer as timed out
        updatedPrayers.push({
          ...prayer,
          responseType: 'silence',
        });
      } else {
        updatedPrayers.push(prayer);
      }
    }

    // Apply faith decay
    if (unansweredCount > 0) {
      const decay = this.config.unansweredPrayerDecay * unansweredCount;
      const newFaith = Math.max(0, spiritual.faith - decay);

      // Create doubt for unanswered prayers
      const doubt: Doubt = {
        id: `doubt_${Date.now()}_${Math.random()}`,
        reason: `${unansweredCount} prayer${unansweredCount > 1 ? 's' : ''} went unanswered`,
        severity: Math.min(0.3, unansweredCount * 0.1),
        timestamp: currentTick,
        resolved: false,
      };

      const updatedDoubts = [...spiritual.doubts, doubt];

      (entity as EntityImpl).addComponent({
        ...spiritual,
        faith: newFaith,
        prayers: updatedPrayers,
        doubts: updatedDoubts,
        unansweredPrayers: spiritual.unansweredPrayers + unansweredCount,
      } as SpiritualComponent);
    } else if (updatedPrayers.length !== spiritual.prayers.length) {
      // Just update prayers if we marked any as timed out
      (entity as EntityImpl).addComponent({
        ...spiritual,
        prayers: updatedPrayers,
      } as SpiritualComponent);
    }
  }

  /**
   * Process natural drift toward baseline faith
   */
  private processBaselineDrift(
    entity: Entity,
    spiritual: SpiritualComponent
  ): void {
    const currentFaith = spiritual.faith;
    const baseline = spiritual.baselineFaith;

    // No drift if at baseline
    if (Math.abs(currentFaith - baseline) < 0.01) return;

    // Drift toward baseline
    const drift = this.config.baselineDriftRate;
    const newFaith = currentFaith > baseline
      ? Math.max(baseline, currentFaith - drift)
      : Math.min(baseline, currentFaith + drift);

    if (newFaith !== currentFaith) {
      (entity as EntityImpl).addComponent({
        ...spiritual,
        faith: newFaith,
      } as SpiritualComponent);
    }
  }

  /**
   * Process crisis of faith mechanics
   */
  private processCrisisOfFaith(
    entity: Entity,
    spiritual: SpiritualComponent,
    currentTick: number
  ): void {
    // Calculate total doubt severity
    const totalDoubts = spiritual.doubts
      .filter(d => !d.resolved)
      .reduce((sum, d) => sum + d.severity, 0);

    const inCrisis = spiritual.faith < this.config.crisisThreshold || totalDoubts > 0.5;

    // Start crisis
    if (inCrisis && !spiritual.crisisOfFaith) {
      (entity as EntityImpl).addComponent({
        ...spiritual,
        crisisOfFaith: true,
        crisisStarted: currentTick,
      } as SpiritualComponent);
    }

    // Handle active crisis
    if (spiritual.crisisOfFaith && spiritual.crisisStarted) {
      const crisisDuration = currentTick - spiritual.crisisStarted;

      // Crisis timeout - lose faith entirely
      if (crisisDuration > this.config.crisisTimeoutTicks) {
        (entity as EntityImpl).addComponent({
          ...spiritual,
          faith: 0,
          believedDeity: undefined,
          crisisOfFaith: false,
        } as SpiritualComponent);
      }
      // Crisis resolved - faith restored above threshold
      else if (spiritual.faith >= this.config.crisisThreshold && totalDoubts < 0.3) {
        (entity as EntityImpl).addComponent({
          ...spiritual,
          crisisOfFaith: false,
          crisisStarted: undefined,
        } as SpiritualComponent);
      }
    }
  }

  /**
   * Get faith mechanics statistics for debugging
   */
  public getStats(): {
    totalBelievers: number;
    averageFaith: number;
    inCrisis: number;
    unansweredPrayerRatio: number;
  } {
    let totalBelievers = 0;
    let totalFaith = 0;
    let inCrisis = 0;
    let totalPrayers = 0;
    let totalUnanswered = 0;

    // Believers are agents (ALWAYS simulated), so we iterate all
    for (const entity of this.world.entities.values()) {
      if (!entity.components.has(CT.Spiritual)) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent;
      if (!spiritual || !spiritual.believedDeity) continue;

      totalBelievers++;
      totalFaith += spiritual.faith;
      if (spiritual.crisisOfFaith) inCrisis++;
      totalPrayers += spiritual.totalPrayers;
      totalUnanswered += spiritual.unansweredPrayers;
    }

    return {
      totalBelievers,
      averageFaith: totalBelievers > 0 ? totalFaith / totalBelievers : 0,
      inCrisis,
      unansweredPrayerRatio: totalPrayers > 0 ? totalUnanswered / totalPrayers : 0,
    };
  }
}
