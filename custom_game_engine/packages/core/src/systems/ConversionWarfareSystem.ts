/**
 * ConversionWarfareSystem - Phase 8: Advanced Theology
 *
 * Handles aggressive conversion attempts between deities.
 * Conversion warfare includes:
 * - Active proselytizing to rival believers
 * - Propaganda campaigns
 * - Miracle displays to impress target believers
 * - Sending missionaries/angels to convert
 * - Counter-conversion efforts
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import { isFeatureAvailable, type RestrictionConfig } from '../divinity/UniverseConfig.js';

// ============================================================================
// Conversion Warfare Types
// ============================================================================

export interface ConversionCampaign {
  id: string;

  /** Deity running the campaign */
  attackerId: string;

  /** Target deity whose believers are being converted */
  targetId: string;

  /** Campaign tactics */
  tactics: ConversionTactic[];

  /** Started at tick */
  startedAt: number;

  /** Campaign duration */
  duration: number;

  /** Belief cost per tick */
  costPerTick: number;

  /** Success metrics */
  metrics: {
    believersTargeted: number;
    believersConverted: number;
    beliefSpent: number;
  };

  /** Campaign status */
  status: 'active' | 'completed' | 'failed' | 'countered';
}

export type ConversionTactic =
  | 'proselytizing'        // Send believers to convert others
  | 'miracle_display'      // Perform miracles to impress targets
  | 'propaganda'           // Send visions undermining target deity
  | 'missionary'           // Send dedicated missionaries
  | 'angel_intervention'   // Angels directly influence believers
  | 'promise_rewards'      // Promise benefits for conversion
  | 'threaten_punishment'; // Threaten punishment for non-conversion

export interface ConversionAttempt {
  campaignId: string;
  targetBeliever: string;
  tactic: ConversionTactic;
  timestamp: number;
  success: boolean;
  resistance: number; // 0-1, how much the believer resisted
}

// ============================================================================
// Conversion Configuration
// ============================================================================

export interface ConversionConfig {
  /** How often to process campaigns (ticks) */
  updateInterval: number;

  /** Base belief cost per conversion attempt */
  baseConversionCost: number;

  /** Base success rate (0-1) */
  baseSuccessRate: number;

  /** Minimum faith to be targeted for conversion */
  minTargetFaith: number;
}

export const DEFAULT_CONVERSION_CONFIG: ConversionConfig = {
  updateInterval: 300, // ~15 seconds at 20 TPS
  baseConversionCost: 50,
  baseSuccessRate: 0.2,
  minTargetFaith: 0.3, // Only target believers with weak faith
};

// ============================================================================
// ConversionWarfareSystem
// ============================================================================

export class ConversionWarfareSystem extends BaseSystem {
  public readonly id = 'ConversionWarfareSystem';
  public readonly priority = 79;
  public readonly requiredComponents = [] as const;
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = 300; // ~15 seconds at 20 TPS

  private config: ConversionConfig;
  private campaigns: Map<string, ConversionCampaign> = new Map();
  private attempts: ConversionAttempt[] = [];

  constructor(config: Partial<ConversionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONVERSION_CONFIG, ...config };
  }

  /**
   * Get the restriction config from the world's divine config
   */
  private getRestrictionConfig(world: World): RestrictionConfig | undefined {
    const divineConfig = world.divineConfig;
    return divineConfig?.restrictions;
  }

  /**
   * Check if conversion warfare is enabled in this universe
   */
  private isConversionWarfareEnabled(world: World): boolean {
    const restrictions = this.getRestrictionConfig(world);
    if (restrictions && !isFeatureAvailable('divine_war', restrictions)) {
      return false;
    }
    return true;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Process active campaigns
    this.processCampaigns(ctx.world, ctx.tick);
  }

  /**
   * Start a conversion campaign
   */
  startCampaign(
    attackerId: string,
    targetId: string,
    tactics: ConversionTactic[],
    duration: number = 0,
    currentTick: number,
    world?: World
  ): ConversionCampaign | null {
    // Check if conversion warfare is enabled in this universe
    if (world && !this.isConversionWarfareEnabled(world)) {
      return null;
    }

    const campaign: ConversionCampaign = {
      id: `campaign_${Date.now()}`,
      attackerId,
      targetId,
      tactics,
      startedAt: currentTick,
      duration,
      costPerTick: this.calculateCampaignCost(tactics),
      metrics: {
        believersTargeted: 0,
        believersConverted: 0,
        beliefSpent: 0,
      },
      status: 'active',
    };

    this.campaigns.set(campaign.id, campaign);

    // In full implementation, would emit event
    // world.eventBus.emit({ type: 'conversion_campaign_started', ... });

    return campaign;
  }

  /**
   * Calculate campaign cost based on tactics
   */
  private calculateCampaignCost(tactics: ConversionTactic[]): number {
    const tacticCosts: Record<ConversionTactic, number> = {
      proselytizing: 5,
      miracle_display: 20,
      propaganda: 10,
      missionary: 15,
      angel_intervention: 30,
      promise_rewards: 25,
      threaten_punishment: 15,
    };

    return tactics.reduce((sum, tactic) => sum + tacticCosts[tactic], 0);
  }

  /**
   * Process all active campaigns
   */
  private processCampaigns(world: World, currentTick: number): void {
    for (const campaign of this.campaigns.values()) {
      if (campaign.status !== 'active') continue;

      // Check if campaign should end
      if (campaign.duration > 0 && currentTick - campaign.startedAt >= campaign.duration) {
        campaign.status = 'completed';
        continue;
      }

      // Find attacker and target deities
      const attackerEntity = world.getEntity(campaign.attackerId);
      const targetEntity = world.getEntity(campaign.targetId);

      if (!attackerEntity || !targetEntity) {
        campaign.status = 'failed';
        continue;
      }

      const attacker = attackerEntity.components.get(CT.Deity) as DeityComponent | undefined;
      const target = targetEntity.components.get(CT.Deity) as DeityComponent | undefined;

      if (!attacker || !target) {
        campaign.status = 'failed';
        continue;
      }

      // Check if attacker has enough belief
      if (!attacker.spendBelief(campaign.costPerTick)) {
        campaign.status = 'failed';
        continue;
      }

      campaign.metrics.beliefSpent += campaign.costPerTick;

      // Attempt conversions
      this.attemptConversions(world, campaign, attacker, target, currentTick);
    }
  }

  /**
   * Attempt to convert believers
   */
  private attemptConversions(
    world: World,
    campaign: ConversionCampaign,
    attacker: DeityComponent,
    target: DeityComponent,
    currentTick: number
  ): void {
    // Find target's believers
    // Believers are agents (ALWAYS simulated)
    const spiritualEntities = world.query().with(CT.Spiritual).executeEntities();
    const targetBelievers = spiritualEntities.filter(e => {
      const spiritual = e.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      return spiritual && spiritual.believedDeity === campaign.targetId;
    });

    // Try to convert weak-faith believers
    for (const believerEntity of targetBelievers) {
      const spiritual = believerEntity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Only target believers with weak faith
      if (spiritual.faith > this.config.minTargetFaith) {
        continue;
      }

      campaign.metrics.believersTargeted++;

      // Attempt conversion
      const success = this.attemptConversion(campaign, spiritual, attacker, target);

      const attempt: ConversionAttempt = {
        campaignId: campaign.id,
        targetBeliever: believerEntity.id,
        tactic: campaign.tactics[0] ?? 'proselytizing',
        timestamp: currentTick,
        success,
        resistance: spiritual.faith,
      };

      this.attempts.push(attempt);

      if (success) {
        // Convert the believer
        this.convertBeliever(believerEntity.id, target, attacker, spiritual);
        campaign.metrics.believersConverted++;
      }

      // Only attempt one conversion per update (don't spam)
      break;
    }
  }

  /**
   * Attempt to convert a single believer
   */
  private attemptConversion(
    campaign: ConversionCampaign,
    spiritual: SpiritualComponent,
    _attacker: DeityComponent,
    _target: DeityComponent
  ): boolean {
    // Base success rate
    let successRate = this.config.baseSuccessRate;

    // Modify based on believer faith (lower faith = easier conversion)
    successRate += (1 - spiritual.faith) * 0.3;

    // Modify based on tactics
    const tacticBonus = campaign.tactics.length * 0.1;
    successRate += tacticBonus;

    // Random roll
    return Math.random() < successRate;
  }

  /**
   * Convert a believer from one deity to another
   */
  private convertBeliever(
    believerId: string,
    fromDeity: DeityComponent,
    toDeity: DeityComponent,
    spiritual: SpiritualComponent
  ): void {
    // Remove from old deity
    fromDeity.removeBeliever(believerId);

    // Add to new deity
    toDeity.addBeliever(believerId);

    // Update spiritual component
    spiritual.believedDeity = toDeity.identity.primaryName; // Should be deity ID, but using name for now
    spiritual.faith = 0.5; // Reset faith as new convert

    // In full implementation, would emit event
    // world.eventBus.emit({ type: 'believer_converted', ... });
  }

  /**
   * Stop a campaign
   */
  stopCampaign(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'completed';
    }
  }

  /**
   * Get campaign
   */
  getCampaign(campaignId: string): ConversionCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get all campaigns for a deity
   */
  getCampaignsForDeity(deityId: string): ConversionCampaign[] {
    return Array.from(this.campaigns.values())
      .filter(c => c.attackerId === deityId || c.targetId === deityId);
  }

  /**
   * Get active campaigns
   */
  getActiveCampaigns(): ConversionCampaign[] {
    return Array.from(this.campaigns.values())
      .filter(c => c.status === 'active');
  }

  /**
   * Get conversion attempts for a campaign
   */
  getAttemptsForCampaign(campaignId: string): ConversionAttempt[] {
    return this.attempts.filter(a => a.campaignId === campaignId);
  }
}
