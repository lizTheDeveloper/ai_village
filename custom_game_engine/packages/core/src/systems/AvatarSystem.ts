/**
 * AvatarSystem - Phase 6: Avatar System
 *
 * Manages avatar manifestation, maintenance, and interactions with mortals.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import { isFeatureAvailable, type AvatarConfig as DivineAvatarConfig, type RestrictionConfig } from '../divinity/UniverseConfig.js';

// ============================================================================
// Avatar Types
// ============================================================================

export interface AvatarData {
  id: string;
  deityId: string;
  entityId: string;
  manifestedAt: number;
  beliefCostPerTick: number;
  purpose: AvatarPurpose;
  location: { x: number; y: number };
  active: boolean;
}

export type AvatarPurpose =
  | 'observe'           // Watch believers
  | 'guide'             // Lead believers
  | 'protect'           // Defend from threats
  | 'teach'             // Share wisdom
  | 'judge'             // Evaluate believers
  | 'perform_miracle';  // Do specific divine act

// ============================================================================
// Avatar Configuration
// ============================================================================

export interface AvatarConfig {
  /** Base belief cost per tick for avatar */
  baseCostPerTick: number;

  /** Belief required to manifest avatar */
  manifestationCost: number;

  /** How often to update avatars (ticks) */
  updateInterval: number;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  baseCostPerTick: 5,
  manifestationCost: 500,
  updateInterval: 100, // ~5 seconds at 20 TPS
};

// ============================================================================
// AvatarSystem
// ============================================================================

export class AvatarSystem extends BaseSystem {
  public readonly id = 'AvatarSystem';
  public readonly name = 'AvatarSystem';
  public readonly priority = 75;
  public readonly requiredComponents = [];
  // Only run when avatar components exist (O(1) activation check)
  public readonly activationComponents = ['avatar'] as const;

  private config: AvatarConfig;
  private avatars: Map<string, AvatarData> = new Map();

  protected readonly throttleInterval = 100; // ~5 seconds at 20 TPS


  constructor(config: Partial<AvatarConfig> = {}) {
    super();
    this.config = { ...DEFAULT_AVATAR_CONFIG, ...config };
  }

  /**
   * Get the divine avatar config from the world's divine config
   */
  private getDivineAvatarConfig(world: World): DivineAvatarConfig | undefined {
    return world.divineConfig?.avatars;
  }

  /**
   * Get the restriction config from the world's divine config
   */
  private getRestrictionConfig(world: World): RestrictionConfig | undefined {
    return world.divineConfig?.restrictions;
  }

  /**
   * Check if avatars are enabled in this universe
   */
  private areAvatarsEnabled(world: World): boolean {
    // Check the avatars config
    const avatarConfig = this.getDivineAvatarConfig(world);
    if (avatarConfig && !avatarConfig.avatarsAllowed) {
      return false;
    }

    // Also check restrictions
    const restrictions = this.getRestrictionConfig(world);
    if (restrictions && !isFeatureAvailable('avatars', restrictions)) {
      return false;
    }

    return true;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Update existing avatars
    this.updateAvatars(ctx.world, ctx.tick);
  }

  /**
   * Manifest an avatar for a deity
   */
  manifestAvatar(
    deityId: string,
    world: World,
    location: { x: number; y: number },
    purpose: AvatarPurpose = 'observe'
  ): AvatarData | null {
    // Check if avatars are enabled in this universe
    if (!this.areAvatarsEnabled(world)) {
      return null;
    }

    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Get manifestation cost from divine config or fall back to local config
    const divineAvatarConfig = this.getDivineAvatarConfig(world);
    const manifestationCost = divineAvatarConfig?.manifestationCost ?? this.config.manifestationCost;

    // Check if deity has enough belief
    if (deity.belief.currentBelief < manifestationCost) {
      return null;
    }

    // Spend belief
    deity.spendBelief(manifestationCost);

    // Create avatar entity
    const avatarEntity = world.createEntity();

    // Note: In full implementation, would add appropriate components
    // For now, just tracking the avatar data

    const avatar: AvatarData = {
      id: avatarEntity.id,
      deityId,
      entityId: avatarEntity.id,
      manifestedAt: world.tick,
      beliefCostPerTick: this.config.baseCostPerTick,
      purpose,
      location,
      active: true,
    };

    this.avatars.set(avatar.id, avatar);

    // EXOTIC PLOT EVENT: champion_chosen when deity creates an avatar
    // Avatars are divine champions/manifestations
    const deityIdentity = deity.identity;
    const soulComp = avatarEntity.getComponent(CT.Soul);
    this.events.emit('divinity:champion_chosen', {
      championId: avatarEntity.id,
      soulId: (soulComp as any)?.soulId || avatarEntity.id,
      deityId,
      deityName: deityIdentity.primaryName,
      championType: 'avatar',
      dutiesAssigned: [purpose, 'represent_deity', 'manifest_divine_will'],
      powerGranted: Math.floor(deity.belief.currentBelief * 0.1), // 10% of deity's belief as power
      tick: world.tick,
    });

    return avatar;
  }

  /**
   * Update all active avatars
   */
  private updateAvatars(world: World, _currentTick: number): void {
    // Get maintenance cost multiplier from divine config
    const divineAvatarConfig = this.getDivineAvatarConfig(world);
    const maintenanceMultiplier = divineAvatarConfig?.maintenanceCostMultiplier ?? 1.0;

    for (const avatar of this.avatars.values()) {
      if (!avatar.active) continue;

      // Find deity
      const deityEntity = world.getEntity(avatar.deityId);
      if (!deityEntity) {
        this.dismissAvatar(avatar.id);
        continue;
      }

      const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
      if (!deity) {
        this.dismissAvatar(avatar.id);
        continue;
      }

      // Deduct maintenance cost with config multiplier
      const adjustedCost = Math.ceil(avatar.beliefCostPerTick * maintenanceMultiplier);
      const canMaintain = deity.spendBelief(adjustedCost);

      if (!canMaintain) {
        // Not enough belief - dismiss avatar
        this.dismissAvatar(avatar.id);
      }
    }
  }

  /**
   * Dismiss an avatar
   */
  dismissAvatar(avatarId: string): void {
    const avatar = this.avatars.get(avatarId);
    if (avatar) {
      avatar.active = false;
      // In full implementation, would despawn the entity
    }
  }

  /**
   * Get avatar
   */
  getAvatar(avatarId: string): AvatarData | undefined {
    return this.avatars.get(avatarId);
  }

  /**
   * Get all avatars for a deity
   */
  getAvatarsForDeity(deityId: string): AvatarData[] {
    return Array.from(this.avatars.values())
      .filter(a => a.deityId === deityId && a.active);
  }
}
