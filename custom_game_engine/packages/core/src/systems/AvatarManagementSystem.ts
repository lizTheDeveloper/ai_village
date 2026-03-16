/**
 * AvatarManagementSystem - Manages player avatar jack-in/jack-out
 *
 * Handles the mechanics of agents binding to avatar entities (jack-in) and
 * releasing them (jack-out). Distinct from the deity AvatarSystem which
 * manages gods manifesting in the world.
 *
 * Priority 10: runs just after PossessionSystem (priority 5).
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import type { AvatarComponent } from '../components/AvatarComponent.js';
import { createAvatarEntityComponent } from '../components/AvatarComponent.js';
import type { AvatarRosterComponent } from '../components/AvatarRosterComponent.js';
import { createAvatarRosterComponent } from '../components/AvatarRosterComponent.js';
import type { AvatarState, AvatarSessionStats, AvatarStance, AvatarEmoteType, AvatarSkillBonus, AvatarSelfInspection } from '../types/AvatarTypes.js';
import {
  validateAvatarTransition,
  accumulateStats,
  createEmptySessionStats,
} from '../types/AvatarTypes.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';

// Re-export factory for use by other systems
export { createAvatarRosterComponent };

// Ticks-per-second constant at 20 TPS
const TICKS_PER_SECOND = 20;

export class AvatarManagementSystem extends BaseSystem {
  public readonly id = 'AvatarManagementSystem' as const;
  public readonly priority = 10;
  public readonly requiredComponents: string[] = [] as const;
  public readonly activationComponents = ['avatar_roster'] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world as unknown as World;
    const currentTick = ctx.tick;

    // Process auto-respawn deadlines for avatars in destroyed state
    const avatarEntities = world
      .query()
      .with('avatar_entity')
      .executeEntities();

    for (const avatarEntity of avatarEntities) {
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      if (!avatarComp) continue;

      // Only act on destroyed avatars awaiting respawn
      if (avatarComp.state !== 'destroyed') continue;
      if (avatarComp.autoRespawnDeadlineTick === null) continue;
      if (currentTick < avatarComp.autoRespawnDeadlineTick) continue;

      // Auto-respawn deadline expired and no agent is bound: clear the deadline
      // Actual respawn is handled by AvatarRespawnSystem
      if (avatarComp.boundAgentId === null) {
        (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
          ...c,
          autoRespawnDeadlineTick: null,
        }));
      }
    }
  }

  /**
   * Create a new avatar entity for an agent.
   * Throws if the agent is already at maxAvatars.
   */
  createAvatar(
    agentEntity: Entity,
    name: string,
    world: World,
    spawnLocation: { x: number; y: number }
  ): Entity {
    // Ensure the agent has a roster
    if (!agentEntity.hasComponent('avatar_roster')) {
      (agentEntity as EntityImpl).addComponent(createAvatarRosterComponent(agentEntity.id));
    }

    const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
    if (!roster) {
      throw new Error(
        `[AvatarManagementSystem] Agent ${agentEntity.id} missing avatar_roster after add`
      );
    }

    if (roster.avatarIds.length >= roster.maxAvatars) {
      throw new Error(
        `[AvatarManagementSystem] Agent ${agentEntity.id} has reached max avatars ` +
        `(${roster.maxAvatars}). Cannot create more.`
      );
    }

    const avatarId = `avatar:${agentEntity.id}:${world.tick}:${Math.random().toString(36).slice(2, 8)}`;
    const avatarEntity = world.createEntity();

    (avatarEntity as EntityImpl).addComponent(createAvatarEntityComponent(avatarId, name, world.tick));
    (avatarEntity as EntityImpl).addComponent(createPositionComponent(spawnLocation.x, spawnLocation.y, 0));

    // Register avatar in roster
    (agentEntity as EntityImpl).updateComponent<AvatarRosterComponent>('avatar_roster', (r) => ({
      ...r,
      avatarIds: [...r.avatarIds, avatarEntity.id],
    }));

    return avatarEntity;
  }

  /**
   * Jack an agent into one of their avatars.
   * Returns success/failure with a reason string on failure.
   */
  jackIn(
    agentEntity: Entity,
    avatarEntityId: string,
    world: World
  ): { success: boolean; reason?: string } {
    const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
    if (!roster) {
      return { success: false, reason: 'Agent has no avatar_roster component' };
    }

    if (roster.activeAvatarId !== null) {
      return {
        success: false,
        reason: `Agent is already jacked in to avatar ${roster.activeAvatarId}`,
      };
    }

    const avatarEntity = world.getEntity(avatarEntityId);
    if (!avatarEntity) {
      return { success: false, reason: `Avatar entity ${avatarEntityId} not found` };
    }

    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      return { success: false, reason: `Entity ${avatarEntityId} has no avatar_entity component` };
    }

    if (avatarComp.state === 'bound') {
      return {
        success: false,
        reason: `Avatar ${avatarComp.avatarId} is already bound to agent ${avatarComp.boundAgentId}`,
      };
    }

    if (avatarComp.state === 'destroyed') {
      return {
        success: false,
        reason: `Avatar ${avatarComp.avatarId} is destroyed and cannot be jacked into`,
      };
    }

    // Validate transition: unbound/dormant/suspended → bound
    validateAvatarTransition(avatarComp.state, 'bound');

    const previousState = avatarComp.state;

    // Ensure avatar has a position component (use agent's position if missing)
    if (!avatarEntity.hasComponent('position')) {
      const agentPos = agentEntity.getComponent<{ type: string; version: number; x: number; y: number; z: number }>('position');
      (avatarEntity as EntityImpl).addComponent(createPositionComponent(agentPos?.x ?? 0, agentPos?.y ?? 0, 0));
    }

    // Compute skill bonuses from agent's SkillsComponent
    const skillBonuses: AvatarSkillBonus[] = this._computeSkillBonuses(agentEntity);

    // Bind the avatar
    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      state: 'bound',
      boundAgentId: agentEntity.id,
      sessionStats: createEmptySessionStats(),
      lastActiveTick: world.tick,
      appliedSkillBonuses: skillBonuses,
    }));

    (agentEntity as EntityImpl).updateComponent<AvatarRosterComponent>('avatar_roster', (r) => ({
      ...r,
      activeAvatarId: avatarEntityId,
    }));

    this.events.emit('avatar:jack_in', {
      avatarId: avatarComp.avatarId,
      agentId: agentEntity.id,
      avatarState: 'bound' as AvatarState,
      tick: world.tick,
      skillBonuses,
    });

    this.events.emit('avatar:state_changed', {
      avatarId: avatarComp.avatarId,
      from: previousState,
      to: 'bound' as AvatarState,
      tick: world.tick,
    });

    return { success: true };
  }

  /**
   * Jack an agent out of their current avatar.
   * Returns success/failure and sessionStats on success.
   */
  jackOut(
    agentEntity: Entity,
    mode: 'dormant' | 'suspended' | 'despawn',
    world: World
  ): { success: boolean; sessionStats?: AvatarSessionStats; reason?: string } {
    const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
    if (!roster) {
      return { success: false, reason: 'Agent has no avatar_roster component' };
    }

    if (!roster.activeAvatarId) {
      return { success: false, reason: 'Agent is not currently jacked in to any avatar' };
    }

    const activeAvatarId = roster.activeAvatarId;
    const avatarEntity = world.getEntity(activeAvatarId);
    if (!avatarEntity) {
      // Avatar entity gone — clean up roster
      (agentEntity as EntityImpl).updateComponent<AvatarRosterComponent>('avatar_roster', (r) => ({
        ...r,
        activeAvatarId: null,
        avatarIds: r.avatarIds.filter((id) => id !== activeAvatarId),
      }));
      return { success: false, reason: `Avatar entity ${activeAvatarId} not found` };
    }

    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      return {
        success: false,
        reason: `Entity ${activeAvatarId} has no avatar_entity component`,
      };
    }

    if (avatarComp.state !== 'bound') {
      return {
        success: false,
        reason: `Avatar ${avatarComp.avatarId} is in state '${avatarComp.state}', expected 'bound'`,
      };
    }

    const newState: AvatarState = mode === 'despawn' ? 'destroyed' : mode;
    validateAvatarTransition('bound', newState);

    // Calculate playtime for this session
    const sessionTicks = world.tick - avatarComp.lastActiveTick;
    const sessionSeconds = sessionTicks / TICKS_PER_SECOND;

    const finalSessionStats: AvatarSessionStats = {
      ...avatarComp.sessionStats,
      playtimeSeconds: avatarComp.sessionStats.playtimeSeconds + sessionSeconds,
    };

    // Accumulate into total stats
    const newTotalStats = { ...avatarComp.totalStats };
    accumulateStats(newTotalStats, finalSessionStats);

    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      state: newState,
      boundAgentId: null,
      sessionStats: createEmptySessionStats(),
      totalStats: newTotalStats,
      appliedSkillBonuses: [],
      lastEmote: null,
      lastEmoteTick: null,
    }));

    (agentEntity as EntityImpl).updateComponent<AvatarRosterComponent>('avatar_roster', (r) => ({
      ...r,
      activeAvatarId: null,
    }));

    this.events.emit('avatar:jack_out', {
      avatarId: avatarComp.avatarId,
      agentId: agentEntity.id,
      mode,
      sessionStats: finalSessionStats,
      tick: world.tick,
    });

    this.events.emit('avatar:state_changed', {
      avatarId: avatarComp.avatarId,
      from: 'bound',
      to: newState,
      tick: world.tick,
    });

    return { success: true, sessionStats: finalSessionStats };
  }

  /**
   * Get the active avatar entity for an agent, or null if not jacked in.
   */
  getActiveAvatar(agentEntity: Entity, world: World): Entity | null {
    const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
    if (!roster || !roster.activeAvatarId) {
      return null;
    }
    return world.getEntity(roster.activeAvatarId) ?? null;
  }

  /**
   * Set the body stance of a bound avatar (spec §Avatar Actions / Body Control).
   * Returns success/failure. Only valid when the avatar is in 'bound' state.
   */
  setStance(
    avatarEntity: Entity,
    stance: AvatarStance
  ): { success: boolean; reason?: string } {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      return { success: false, reason: `Entity ${avatarEntity.id} has no avatar_entity component` };
    }
    if (avatarComp.state !== 'bound') {
      return { success: false, reason: `Avatar ${avatarComp.avatarId} is not bound (state: '${avatarComp.state}')` };
    }

    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      stance,
    }));

    this.events.emit('avatar:stance_changed', {
      avatarId: avatarComp.avatarId,
      agentId: avatarComp.boundAgentId,
      stance,
    });

    return { success: true };
  }

  /**
   * Perform an emote on a bound avatar (spec §Avatar Actions / Emote).
   * Records the emote in the component and emits an event.
   * Only valid when the avatar is in 'bound' state.
   */
  performEmote(
    avatarEntity: Entity,
    emote: AvatarEmoteType,
    world: World
  ): { success: boolean; reason?: string } {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      return { success: false, reason: `Entity ${avatarEntity.id} has no avatar_entity component` };
    }
    if (avatarComp.state !== 'bound') {
      return { success: false, reason: `Avatar ${avatarComp.avatarId} is not bound (state: '${avatarComp.state}')` };
    }

    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      lastEmote: emote,
      lastEmoteTick: world.tick,
    }));

    this.events.emit('avatar:emote', {
      avatarId: avatarComp.avatarId,
      agentId: avatarComp.boundAgentId,
      emote,
      tick: world.tick,
    });

    return { success: true };
  }

  /**
   * Inspect the status of a bound avatar (spec §Avatar Actions / Self-Inspection).
   * Returns avatar status info. Only valid when the avatar is in 'bound' state.
   */
  inspectSelf(
    avatarEntity: Entity,
    world: World
  ): { success: boolean; reason?: string; status?: AvatarSelfInspection } {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      return { success: false, reason: `Entity ${avatarEntity.id} has no avatar_entity component` };
    }
    if (avatarComp.state !== 'bound') {
      return { success: false, reason: 'Avatar is not bound' };
    }

    const healthComp = avatarEntity.getComponent<{ type: string; version: number; current: number; max: number }>('health');
    const posComp = avatarEntity.getComponent<{ type: string; version: number; x: number; y: number }>('position');

    const status: AvatarSelfInspection = {
      avatarId: avatarComp.avatarId,
      name: avatarComp.name,
      state: avatarComp.state,
      stance: avatarComp.stance,
      health: healthComp ? { current: healthComp.current, max: healthComp.max } : null,
      position: posComp ? { x: posComp.x, y: posComp.y } : null,
      deathCount: avatarComp.deathCount,
      appliedSkillBonuses: avatarComp.appliedSkillBonuses,
      lastEmote: avatarComp.lastEmote,
      totalPlaytimeSeconds: avatarComp.totalStats.playtimeSeconds,
    };

    this.events.emit('avatar:inspect_self', {
      avatarId: avatarComp.avatarId,
      agentId: avatarComp.boundAgentId,
      tick: world.tick,
    });

    return { success: true, status };
  }

  /**
   * Check the inventory of a bound avatar (spec §Avatar Actions / Self-Inspection).
   * Returns carried items. Only valid when the avatar is in 'bound' state.
   */
  checkInventory(
    avatarEntity: Entity,
    world: World
  ): { success: boolean; reason?: string; items?: Array<{ id: string; name: string; quantity: number }> } {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      return { success: false, reason: `Entity ${avatarEntity.id} has no avatar_entity component` };
    }
    if (avatarComp.state !== 'bound') {
      return { success: false, reason: 'Avatar is not bound' };
    }

    const inventoryComp = avatarEntity.getComponent<{
      type: string;
      version: number;
      slots: Array<{ itemId: string; name: string; quantity: number }>;
    }>('inventory');

    const items = inventoryComp
      ? inventoryComp.slots.map((slot) => ({ id: slot.itemId, name: slot.name, quantity: slot.quantity }))
      : [];

    this.events.emit('avatar:check_inventory', {
      avatarId: avatarComp.avatarId,
      agentId: avatarComp.boundAgentId,
      tick: world.tick,
    });

    return { success: true, items };
  }

  /**
   * Compute skill bonuses to apply when an agent jacks in.
   * Reads the agent's SkillsComponent and maps skill levels to avatar stat bonuses.
   *
   * Current mappings (can be extended per-game):
   *  - combat >= 2: weapon_damage multiplier (+15% per level above 1)
   *  - exploration >= 1: vision_range multiplier (+10% per level)
   *  - crafting >= 3: item_durability multiplier (+5% per level above 2)
   */
  private _computeSkillBonuses(agentEntity: Entity): AvatarSkillBonus[] {
    const skillsComp = agentEntity.getComponent<SkillsComponent>('skills');
    if (!skillsComp) return [];

    const bonuses: AvatarSkillBonus[] = [];
    const levels = skillsComp.levels;

    const combatLevel = levels['combat'] ?? 0;
    if (combatLevel >= 2) {
      bonuses.push({
        skill: 'combat',
        level: combatLevel,
        stat: 'weapon_damage',
        multiplier: 1 + (combatLevel - 1) * 0.15,
      });
    }

    const explorationLevel = levels['exploration'] ?? 0;
    if (explorationLevel >= 1) {
      bonuses.push({
        skill: 'exploration',
        level: explorationLevel,
        stat: 'vision_range',
        multiplier: 1 + explorationLevel * 0.10,
      });
    }

    const craftingLevel = levels['crafting'] ?? 0;
    if (craftingLevel >= 3) {
      bonuses.push({
        skill: 'crafting',
        level: craftingLevel,
        stat: 'item_durability',
        multiplier: 1 + (craftingLevel - 2) * 0.05,
      });
    }

    return bonuses;
  }
}
