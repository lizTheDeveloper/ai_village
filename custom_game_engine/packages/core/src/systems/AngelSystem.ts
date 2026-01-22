/**
 * AngelSystem - Phase 7: Angels
 *
 * Manages angel creation, AI behavior, and interactions with believers.
 *
 * Phase 28 Updates:
 * - Angels have their own mana pool (independent resource model)
 * - Evolution/tier system for angel promotion
 * - Integration with AngelPhoneSystem for communication
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { type Entity, EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { Prayer } from '../components/SpiritualComponent.js';
import { AngelAIDecisionProcessor } from './AngelAIDecisionProcessor.js';
import { isFeatureAvailable, type AngelConfig as DivineAngelConfig, type RestrictionConfig } from '../divinity/UniverseConfig.js';
// Phase 28 components
import {
  createAngelEvolutionComponent,
  type AngelEvolutionComponent,
  TIER_BONUSES,
} from '../components/AngelEvolutionComponent.js';
import {
  createAngelResourceComponent,
  type AngelResourceComponent,
} from '../components/AngelResourceComponent.js';
import { setupAngelMessaging } from './AngelPhoneSystem.js';

/**
 * LLM Provider interface (matches AngelAIDecisionProcessor requirements)
 */
interface LLMProvider {
  generate(prompt: string): Promise<string>;
}

// ============================================================================
// Angel Types (re-exported from AngelTypes.ts to maintain backward compatibility)
// ============================================================================

export {
  type AngelData,
  type AngelRank,
  type AngelPurpose,
  type AngelTask,
  type AngelConfig,
  DEFAULT_ANGEL_CONFIG,
} from './AngelTypes.js';

// Import for local use
import type { AngelData, AngelRank, AngelPurpose, AngelTask, AngelConfig } from './AngelTypes.js';
import { DEFAULT_ANGEL_CONFIG } from './AngelTypes.js';

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
   *
   * Phase 28 update: Angels now have their own mana pool and evolution components.
   * Big upfront cost, then they're self-sustaining.
   */
  createAngel(
    deityId: string,
    world: World,
    rank: AngelRank,
    purpose: AngelPurpose,
    options: {
      autonomousAI?: boolean;
      tier?: number;
      name?: string;
    } = {}
  ): AngelData | null {
    const { autonomousAI = true, tier = 1, name } = options;

    // Check if angels are enabled in this universe
    if (!this.areAngelsEnabled(world)) {
      return null;
    }

    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Check tier is unlocked (tier 1 is always available)
    if (tier > 1) {
      const isUnlocked = (tier === 2 && deity.angelArmy.tier2Unlocked) ||
                         (tier === 3 && deity.angelArmy.tier3Unlocked) ||
                         (tier === 4 && deity.angelArmy.tier4Unlocked);
      if (!isUnlocked) {
        return null;
      }
    }

    // Get divine config multipliers
    const divineAngelConfig = this.getDivineAngelConfig(world);
    const creationMultiplier = divineAngelConfig?.creationCostMultiplier ?? 1.0;

    // Calculate cost with config multiplier and tier
    // Higher tier = higher creation cost
    const tierMultiplier = Math.pow(2, tier - 1); // 1x, 2x, 4x, 8x
    const baseCost = this.config.creationCosts[rank];
    const cost = Math.ceil(baseCost * creationMultiplier * tierMultiplier);

    if (deity.belief.currentBelief < cost) {
      return null;
    }

    // Spend belief (big upfront cost)
    deity.spendBelief(cost);

    // Create angel entity
    const angelEntity = world.createEntity();

    // Generate name if not provided
    const angelName = name || this.generateAngelName(deity, tier);

    // Get tier name from deity's angel species or use default
    const tierName = deity.getAngelTierName(tier);

    // Add evolution component (Phase 28.8)
    const evolutionComponent = createAngelEvolutionComponent({
      tier,
      tierName,
      level: 1,
      currentDescription: `A ${tierName} serving ${deity.identity.primaryName}`,
    });
    (angelEntity as EntityImpl).addComponent(evolutionComponent);

    // Add resource component (Phase 28.9 - independent mana pool)
    const resourceComponent = createAngelResourceComponent({
      tier,
      currentTick: world.tick,
    });
    (angelEntity as EntityImpl).addComponent(resourceComponent);

    // Set up messaging (Phase 28.6 - God's Phone)
    setupAngelMessaging(
      world,
      angelEntity,
      deityId,
      deity.identity.primaryName,
      angelName,
      world.tick
    );

    // Create angel data
    const angel: AngelData = {
      id: angelEntity.id,
      deityId,
      entityId: angelEntity.id,
      rank,
      purpose,
      createdAt: world.tick,
      beliefCostPerTick: 0, // Phase 28: No longer drains deity belief
      active: true,
      autonomousAI,
      tier,
      name: angelName,
    };

    this.angels.set(angel.id, angel);

    // Register angel with deity's army
    deity.addAngel(angelEntity.id, tier);

    return angel;
  }

  /**
   * Generate a name for an angel
   */
  private generateAngelName(deity: DeityComponent, _tier: number): string {
    // Generate angel-like names with suffix based on deity
    const prefixes = ['Ae', 'An', 'Ar', 'Az', 'Ca', 'Ce', 'Da', 'El', 'Ga', 'Ha', 'Is', 'Je', 'Ka', 'La', 'Ma', 'Me', 'Mi', 'Na', 'Or', 'Ra', 'Sa', 'Se', 'Ta', 'Ur', 'Za'];
    const middles = ['ra', 'ri', 'pha', 'bri', 'tha', 'di', 'li', 'mi', 'ni', 'vi'];
    const suffixes = ['el', 'iel', 'ael', 'ith', 'on', 'im', 'oth', 'iah', 'ael'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]!;
    const middle = middles[Math.floor(Math.random() * middles.length)]!;
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]!;

    return prefix + middle + suffix;
  }

  /**
   * Promote an angel to the next tier
   */
  promoteAngel(
    angelId: string,
    world: World,
    newTierName: string,
    newDescription: string,
    newSpriteId?: string
  ): boolean {
    const angel = this.angels.get(angelId);
    if (!angel || !angel.active) return false;

    const angelEntity = world.getEntity(angel.entityId);
    if (!angelEntity) return false;

    const evolution = angelEntity.getComponent<AngelEvolutionComponent>('angel_evolution');
    const resource = angelEntity.getComponent<AngelResourceComponent>('angel_resource');

    if (!evolution || !resource) return false;

    // Check if eligible for promotion
    if (!evolution.promotionEligible) return false;

    // Promote evolution component
    const success = evolution.promote({
      newTierName,
      newDescription,
      newSpriteId,
      currentTick: world.tick,
    });

    if (!success) return false;

    // Update resource component for new tier
    resource.updateForTier(evolution.tier);

    // Update angel data
    angel.tier = evolution.tier;

    // Update deity's army counts
    const deityEntity = world.getEntity(angel.deityId);
    if (deityEntity) {
      const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
      if (deity) {
        // Remove from old tier, add to new
        deity.removeAngel(angelId, angel.tier - 1);
        deity.addAngel(angelId, angel.tier);
      }
    }

    return true;
  }

  /**
   * Update all active angels
   *
   * Phase 28: Angels are now self-sustaining with their own mana pool.
   * They no longer drain deity belief for maintenance.
   */
  private updateAngels(world: World, currentTick: number): void {
    for (const angel of this.angels.values()) {
      if (!angel.active) continue;

      // Get angel entity
      const angelEntity = world.getEntity(angel.entityId);
      if (!angelEntity) {
        this.dismissAngel(angel.id);
        continue;
      }

      // Get resource component
      const resource = angelEntity.getComponent<AngelResourceComponent>('angel_resource');
      const evolution = angelEntity.getComponent<AngelEvolutionComponent>('angel_evolution');

      if (!resource) {
        // Legacy angel without resource component - still works
        if (angel.autonomousAI) {
          this.performAngelAI(angel, world);
        }
        continue;
      }

      // Check if angel is disrupted
      if (resource.isDisrupted()) {
        // Check if can reform
        if (resource.canReform(currentTick)) {
          resource.reform(currentTick);
          // Angel is back!
        } else {
          // Still disrupted, skip
          continue;
        }
      }

      // Check if permanently destroyed
      if (resource.isPermanentlyDestroyed()) {
        this.dismissAngel(angel.id);
        continue;
      }

      // Regenerate mana
      resource.regenerateMana(currentTick);

      // If autonomous AI, perform tasks
      if (angel.autonomousAI) {
        this.performAngelAI(angel, world);

        // Record service time for evolution (1 tick = small amount of time)
        if (evolution && currentTick % 1200 === 0) { // Every minute at 20 TPS
          evolution.addServiceTime(1 / 60); // 1 minute = 1/60 hour
        }
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
