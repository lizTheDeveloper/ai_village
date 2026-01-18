/**
 * AngelSystem - Phase 7: Angels
 *
 * Manages angel creation, AI behavior, and interactions with believers.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { Prayer } from '../components/SpiritualComponent.js';
import { AngelAIDecisionProcessor } from './AngelAIDecisionProcessor.js';
import { isFeatureAvailable, type AngelConfig as DivineAngelConfig, type RestrictionConfig } from '../divinity/UniverseConfig.js';

/**
 * LLM Provider interface (matches AngelAIDecisionProcessor requirements)
 */
interface LLMProvider {
  generate(prompt: string): Promise<string>;
}

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

export class AngelSystem extends BaseSystem {
  public readonly id = 'AngelSystem';
  public readonly name = 'AngelSystem';
  public readonly priority = 74;
  public readonly requiredComponents = [];
  // Only run when angel components exist (O(1) activation check)
  public readonly activationComponents = ['angel'] as const;

  protected readonly throttleInterval = 200; // ~10 seconds at 20 TPS

  private config: AngelConfig;
  private angels: Map<string, AngelData> = new Map();
  private aiProcessor: AngelAIDecisionProcessor;

  constructor(config: Partial<AngelConfig> = {}, llmProvider?: LLMProvider) {
    super();
    this.config = { ...DEFAULT_ANGEL_CONFIG, ...config };
    this.aiProcessor = new AngelAIDecisionProcessor(llmProvider);
  }

  /**
   * Set LLM provider for angel AI (for dependency injection)
   */
  setLLMProvider(provider: LLMProvider): void {
    this.aiProcessor.setLLMProvider(provider);
  }

  /**
   * Get the divine angel config from the world's divine config
   */
  private getDivineAngelConfig(world: World): DivineAngelConfig | undefined {
    return world.divineConfig?.angels;
  }

  /**
   * Get the restriction config from the world's divine config
   */
  private getRestrictionConfig(world: World): RestrictionConfig | undefined {
    return world.divineConfig?.restrictions;
  }

  /**
   * Check if angels are enabled in this universe
   */
  private areAngelsEnabled(world: World): boolean {
    // Check the angels config
    const angelConfig = this.getDivineAngelConfig(world);
    if (angelConfig && !angelConfig.angelsAllowed) {
      return false;
    }

    // Also check restrictions
    const restrictions = this.getRestrictionConfig(world);
    if (restrictions && !isFeatureAvailable('angels', restrictions)) {
      return false;
    }

    return true;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Update angels
    this.updateAngels(ctx.world, ctx.tick);
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
    // Check if angels are enabled in this universe
    if (!this.areAngelsEnabled(world)) {
      return null;
    }

    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Get divine config multipliers
    const divineAngelConfig = this.getDivineAngelConfig(world);
    const creationMultiplier = divineAngelConfig?.creationCostMultiplier ?? 1.0;

    // Calculate cost with config multiplier
    const baseCost = this.config.creationCosts[rank];
    const cost = Math.ceil(baseCost * creationMultiplier);

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
    // Get maintenance cost multiplier from divine config
    const divineAngelConfig = this.getDivineAngelConfig(world);
    const maintenanceMultiplier = divineAngelConfig?.maintenanceCostMultiplier ?? 1.0;

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

      // Deduct maintenance cost with config multiplier
      const adjustedCost = Math.ceil(angel.beliefCostPerTick * maintenanceMultiplier);
      const canMaintain = deity.spendBelief(adjustedCost);

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
   * Angel AI decision making - handle prayers assigned to this angel
   */
  private performAngelAI(angel: AngelData, world: World): void {
    // If already has a task, continue it
    if (angel.currentTask) {
      return;
    }

    // Find deity
    const deityEntity = world.getEntity(angel.deityId);
    if (!deityEntity) return;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return;

    // Get all believers with unanswered prayers
    const believersWithPrayers = this.getAgentsWithUnansweredPrayers(deity, world);
    if (believersWithPrayers.length === 0) {
      // No prayers to handle, assign default task
      angel.currentTask = this.assignTask(angel);
      return;
    }

    // Find best prayer for this angel to handle
    const bestMatch = this.findBestPrayerForAngel(angel, believersWithPrayers, world);
    if (!bestMatch) {
      angel.currentTask = this.assignTask(angel);
      return;
    }

    // Answer the prayer using AI processor (async, but we don't await - fires and forgets)
    this.aiProcessor.answerPrayerWithAngel(angel, bestMatch.prayer, bestMatch.agentId, world).then((success) => {
      if (success) {
        // Clear current task on success
        angel.currentTask = undefined;

        // Remove from deity's prayer queue
        deity.removePrayer(bestMatch.prayer.id);
      }
    }).catch((error) => {
      console.error(`[AngelSystem] Failed to answer prayer: ${error}`);
      angel.currentTask = undefined;
    });

    // Mark as busy
    angel.currentTask = {
      type: 'deliver_message',
      targetId: bestMatch.agentId,
      completionCondition: 'prayer_answered',
    };
  }

  /**
   * Get all agents with unanswered prayers
   */
  private getAgentsWithUnansweredPrayers(deity: DeityComponent, world: World): Array<{ agentId: string; spiritual: SpiritualComponent }> {
    const result: Array<{ agentId: string; spiritual: SpiritualComponent }> = [];

    for (const believerId of deity.believers) {
      const agent = world.getEntity(believerId);
      if (!agent) continue;

      const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Check for unanswered prayers
      const unansweredPrayers = spiritual.prayers.filter(p => !p.answered);
      if (unansweredPrayers.length > 0) {
        result.push({ agentId: believerId, spiritual });
      }
    }

    return result;
  }

  /**
   * Find the best prayer for this angel to handle
   */
  private findBestPrayerForAngel(
    angel: AngelData,
    believersWithPrayers: Array<{ agentId: string; spiritual: SpiritualComponent }>,
    _world: World
  ): { agentId: string; prayer: Prayer } | null {
    // Collect all unanswered prayers from all believers
    const allPrayers: Array<{ agentId: string; prayer: Prayer }> = [];

    for (const { agentId, spiritual } of believersWithPrayers) {
      const unansweredPrayers = spiritual.prayers.filter(p => !p.answered);
      for (const prayer of unansweredPrayers) {
        allPrayers.push({ agentId, prayer });
      }
    }

    if (allPrayers.length === 0) return null;

    // Simple scoring to find best match
    let bestPrayer: { agentId: string; prayer: Prayer } | null = null;
    let bestScore = -Infinity;

    for (const { agentId, prayer } of allPrayers) {
      // Simple scoring based on purpose match for now
      const purposeMatch = this.scorePrayerForAngel(angel, prayer);
      if (purposeMatch > bestScore) {
        bestScore = purposeMatch;
        bestPrayer = { agentId, prayer };
      }
    }

    return bestPrayer;
  }

  /**
   * Score how well a prayer matches this angel's purpose
   */
  private scorePrayerForAngel(angel: AngelData, prayer: Prayer): number {
    const prayerType = prayer.type;

    // Match prayer type to angel purpose
    if (prayerType === 'help' || prayerType === 'plea') {
      if (angel.purpose === 'protect_believers') return 1.0;
      if (angel.purpose === 'perform_miracles') return 0.8;
      return 0.3;
    }

    if (prayerType === 'guidance') {
      if (angel.purpose === 'deliver_messages') return 1.0;
      return 0.5;
    }

    if (prayerType === 'gratitude') {
      if (angel.purpose === 'gather_souls') return 1.0;
      return 0.4;
    }

    return 0.5;
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
