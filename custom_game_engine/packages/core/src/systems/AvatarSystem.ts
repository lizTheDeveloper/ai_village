/**
 * AvatarSystem - Phase 6: Avatar System
 *
 * Manages avatar manifestation, maintenance, and interactions with mortals.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';

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

export class AvatarSystem implements System {
  public readonly id = 'AvatarSystem';
  public readonly name = 'AvatarSystem';
  public readonly priority = 75;
  public readonly requiredComponents = [];

  private config: AvatarConfig;
  private avatars: Map<string, AvatarData> = new Map();
  private lastUpdate: number = 0;

  constructor(config: Partial<AvatarConfig> = {}) {
    this.config = { ...DEFAULT_AVATAR_CONFIG, ...config };
  }

  update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdate < this.config.updateInterval) {
      return;
    }

    this.lastUpdate = currentTick;

    // Update existing avatars
    this.updateAvatars(world, currentTick);
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
    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Check if deity has enough belief
    if (deity.belief.currentBelief < this.config.manifestationCost) {
      return null;
    }

    // Spend belief
    deity.spendBelief(this.config.manifestationCost);

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

    return avatar;
  }

  /**
   * Update all active avatars
   */
  private updateAvatars(world: World, _currentTick: number): void {
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

      // Deduct maintenance cost
      const canMaintain = deity.spendBelief(avatar.beliefCostPerTick);

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
