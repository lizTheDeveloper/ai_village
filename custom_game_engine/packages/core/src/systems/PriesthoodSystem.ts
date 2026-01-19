/**
 * PriesthoodSystem - Phase 5: Religious Institutions
 *
 * Manages priest ordination, roles, and religious leadership.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';

// ============================================================================
// Priest Data
// ============================================================================

export interface PriestData {
  /** Agent ID */
  agentId: string;

  /** Deity they serve */
  deityId: string;

  /** Rank */
  rank: PriestRank;

  /** Role */
  role: PriestRole;

  /** When ordained */
  ordainedAt: number;

  /** Service time in ticks */
  serviceTime: number;

  /** Rituals performed */
  ritualsPerformed: number;

  /** Personal faith level */
  personalFaith: number;
}

export type PriestRank =
  | 'novice'
  | 'acolyte'
  | 'priest'
  | 'high_priest'
  | 'prophet';

export type PriestRole =
  | 'worship_leader'    // Leads regular worship
  | 'ritual_performer'  // Performs rituals
  | 'teacher'           // Educates believers
  | 'healer'            // Provides healing
  | 'prophet'           // Receives visions
  | 'missionary';       // Spreads faith

// ============================================================================
// Priesthood Configuration
// ============================================================================

export interface PriesthoodConfig {
  /** Minimum faith to become a priest */
  minFaithForOrdination: number;

  /** How often to check for new priests (ticks) */
  checkInterval: number;

  /** Faith threshold for promotion */
  promotionFaithThreshold: number;
}

export const DEFAULT_PRIESTHOOD_CONFIG: PriesthoodConfig = {
  minFaithForOrdination: 0.8,
  checkInterval: 2400, // ~2 minutes at 20 TPS
  promotionFaithThreshold: 0.9,
};

// ============================================================================
// PriesthoodSystem
// ============================================================================

export class PriesthoodSystem extends BaseSystem {
  public readonly id = 'PriesthoodSystem';
  public readonly priority = 84;
  public readonly requiredComponents = [];
  // Lazy activation: Skip entire system when no priesthood exists
  public readonly activationComponents = ['priesthood'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private config: PriesthoodConfig;
  private priests: Map<string, PriestData> = new Map();
  private lastCheck: number = 0;

  constructor(config: Partial<PriesthoodConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PRIESTHOOD_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Only check periodically
    if (currentTick - this.lastCheck < this.config.checkInterval) {
      return;
    }

    this.lastCheck = currentTick;

    // Find believers who could become priests
    this.checkForNewPriests(ctx.world, currentTick);

    // Update existing priests
    this.updatePriests(ctx.world, currentTick);
  }

  /**
   * Check for believers who could become priests
   */
  private checkForNewPriests(world: World, currentTick: number): void {
    // Believers are agents (ALWAYS simulated), so we iterate all
    for (const entity of world.entities.values()) {
      if (!entity.components.has(CT.Agent) || !entity.components.has(CT.Spiritual)) {
        continue;
      }

      // Skip if already a priest
      if (this.priests.has(entity.id)) {
        continue;
      }

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual || !spiritual.believedDeity) {
        continue;
      }

      // Check if faith is high enough
      if (spiritual.faith >= this.config.minFaithForOrdination) {
        this.ordainPriest(entity.id, spiritual.believedDeity, currentTick);
      }
    }
  }

  /**
   * Ordain a new priest
   */
  private ordainPriest(agentId: string, deityId: string, currentTick: number): void {
    const priest: PriestData = {
      agentId,
      deityId,
      rank: 'novice',
      role: 'worship_leader',
      ordainedAt: currentTick,
      serviceTime: 0,
      ritualsPerformed: 0,
      personalFaith: 0.8,
    };

    this.priests.set(agentId, priest);
  }

  /**
   * Update existing priests
   */
  private updatePriests(world: World, _currentTick: number): void {
    for (const priest of this.priests.values()) {
      const entity = world.getEntity(priest.agentId);
      if (!entity) {
        this.priests.delete(priest.agentId);
        continue;
      }

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Update service time
      priest.serviceTime++;

      // Update personal faith
      priest.personalFaith = spiritual.faith;

      // Check for promotion
      this.checkPromotion(priest);
    }
  }

  /**
   * Check if priest should be promoted
   */
  private checkPromotion(priest: PriestData): void {
    // Promote based on service time and faith
    if (priest.rank === 'novice' && priest.serviceTime > 10000 && priest.personalFaith > 0.85) {
      priest.rank = 'acolyte';
    } else if (priest.rank === 'acolyte' && priest.serviceTime > 50000 && priest.personalFaith > 0.9) {
      priest.rank = 'priest';
    } else if (priest.rank === 'priest' && priest.serviceTime > 100000 && priest.personalFaith > 0.95) {
      priest.rank = 'high_priest';
    }
  }

  /**
   * Get priest data
   */
  getPriest(agentId: string): PriestData | undefined {
    return this.priests.get(agentId);
  }

  /**
   * Check if agent is a priest
   */
  isPriest(agentId: string): boolean {
    return this.priests.has(agentId);
  }

  /**
   * Get all priests for a deity
   */
  getPriestsForDeity(deityId: string): PriestData[] {
    return Array.from(this.priests.values())
      .filter(p => p.deityId === deityId);
  }
}
