/**
 * AngelSystem - Phase 7: Angels
 *
 * Manages angel creation, AI behavior, and interactions with believers.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';

// ============================================================================
// Angel Types
// ============================================================================

export interface AngelData {
  id: string;
  deityId: string;
  entityId: string;
  rank: AngelRank;
  purpose: AngelPurpose;
  createdAt: number;
  beliefCostPerTick: number;
  active: boolean;
  autonomousAI: boolean;
  currentTask?: AngelTask;
}

export type AngelRank =
  | 'messenger'      // Low-tier, delivers messages
  | 'guardian'       // Mid-tier, protects believers
  | 'warrior'        // Combat-focused
  | 'scholar'        // Knowledge-focused
  | 'seraph';        // High-tier, powerful

export type AngelPurpose =
  | 'deliver_messages'
  | 'protect_believers'
  | 'guard_temple'
  | 'punish_heretics'
  | 'gather_souls'
  | 'perform_miracles';

export interface AngelTask {
  type: 'deliver_message' | 'protect' | 'guard' | 'smite' | 'bless';
  targetId?: string;
  location?: { x: number; y: number };
  completionCondition: string;
}

// ============================================================================
// Angel Configuration
// ============================================================================

export interface AngelConfig {
  /** Base cost to create angel */
  creationCosts: Record<AngelRank, number>;

  /** Maintenance cost per tick */
  maintenanceCosts: Record<AngelRank, number>;

  /** Update interval */
  updateInterval: number;
}

export const DEFAULT_ANGEL_CONFIG: AngelConfig = {
  creationCosts: {
    messenger: 200,
    guardian: 400,
    warrior: 600,
    scholar: 500,
    seraph: 1000,
  },
  maintenanceCosts: {
    messenger: 2,
    guardian: 4,
    warrior: 6,
    scholar: 5,
    seraph: 10,
  },
  updateInterval: 200, // ~10 seconds at 20 TPS
};

// ============================================================================
// AngelSystem
// ============================================================================

export class AngelSystem implements System {
  public readonly id = 'AngelSystem';
  public readonly name = 'AngelSystem';
  public readonly priority = 74;
  public readonly requiredComponents = [];

  private config: AngelConfig;
  private angels: Map<string, AngelData> = new Map();
  private lastUpdate: number = 0;

  constructor(config: Partial<AngelConfig> = {}) {
    this.config = { ...DEFAULT_ANGEL_CONFIG, ...config };
  }

  update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdate < this.config.updateInterval) {
      return;
    }

    this.lastUpdate = currentTick;

    // Update angels
    this.updateAngels(world, currentTick);
  }

  /**
   * Create an angel
   */
  createAngel(
    deityId: string,
    world: World,
    rank: AngelRank,
    purpose: AngelPurpose,
    autonomousAI: boolean = true
  ): AngelData | null {
    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Check cost
    const cost = this.config.creationCosts[rank];
    if (deity.belief.currentBelief < cost) {
      return null;
    }

    // Spend belief
    deity.spendBelief(cost);

    // Create angel entity
    const angelEntity = world.createEntity();

    const angel: AngelData = {
      id: angelEntity.id,
      deityId,
      entityId: angelEntity.id,
      rank,
      purpose,
      createdAt: world.tick,
      beliefCostPerTick: this.config.maintenanceCosts[rank],
      active: true,
      autonomousAI,
    };

    this.angels.set(angel.id, angel);

    return angel;
  }

  /**
   * Update all active angels
   */
  private updateAngels(world: World, _currentTick: number): void {
    for (const angel of this.angels.values()) {
      if (!angel.active) continue;

      // Find deity
      const deityEntity = world.getEntity(angel.deityId);
      if (!deityEntity) {
        this.dismissAngel(angel.id);
        continue;
      }

      const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
      if (!deity) {
        this.dismissAngel(angel.id);
        continue;
      }

      // Deduct maintenance cost
      const canMaintain = deity.spendBelief(angel.beliefCostPerTick);

      if (!canMaintain) {
        this.dismissAngel(angel.id);
        continue;
      }

      // If autonomous AI, perform tasks
      if (angel.autonomousAI) {
        this.performAngelAI(angel, world);
      }
    }
  }

  /**
   * Angel AI decision making
   */
  private performAngelAI(angel: AngelData, _world: World): void {
    // Simplified AI - in full implementation would be more complex
    if (!angel.currentTask) {
      // Assign task based on purpose
      angel.currentTask = this.assignTask(angel);
    }

    // Execute task
    // In full implementation, would actually perform actions
  }

  /**
   * Assign a task to an angel
   */
  private assignTask(angel: AngelData): AngelTask {
    const taskTypes: Record<AngelPurpose, AngelTask['type']> = {
      deliver_messages: 'deliver_message',
      protect_believers: 'protect',
      guard_temple: 'guard',
      punish_heretics: 'smite',
      gather_souls: 'bless',
      perform_miracles: 'bless',
    };

    return {
      type: taskTypes[angel.purpose],
      completionCondition: 'ongoing',
    };
  }

  /**
   * Dismiss an angel
   */
  dismissAngel(angelId: string): void {
    const angel = this.angels.get(angelId);
    if (angel) {
      angel.active = false;
    }
  }

  /**
   * Get angel
   */
  getAngel(angelId: string): AngelData | undefined {
    return this.angels.get(angelId);
  }

  /**
   * Get all angels for a deity
   */
  getAngelsForDeity(deityId: string): AngelData[] {
    return Array.from(this.angels.values())
      .filter(a => a.deityId === deityId && a.active);
  }
}
