/**
 * AvatarRespawnSystem - Handles avatar death and respawn mechanics
 *
 * Responsible for:
 * - Transitioning avatars to 'destroyed' state on death
 * - Generating respawn options
 * - Executing respawn (create new avatar entity, jack agent back in)
 * - Auto-respawn after deadline expires
 *
 * Priority 55: runs after NeedsSystem (which detects death).
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import type { AvatarComponent } from '../components/AvatarComponent.js';
import type { AvatarRosterComponent } from '../components/AvatarRosterComponent.js';
import type {
  AvatarDeathEvent,
  AvatarRespawnOption,
} from '../types/AvatarTypes.js';
import { validateAvatarTransition } from '../types/AvatarTypes.js';
import type { AvatarManagementSystem } from './AvatarManagementSystem.js';

/** Default ticks before auto-respawn fires (1200 ticks = 60 seconds at 20 TPS) */
const AUTO_RESPAWN_TICKS = 1200;

/** Health fraction to spawn with after death */
const RESPAWN_HEALTH_FRACTION = 0.5;

export class AvatarRespawnSystem extends BaseSystem {
  public readonly id = 'AvatarRespawnSystem' as const;
  public readonly priority = 55;
  public readonly requiredComponents: string[] = [] as const;
  public readonly activationComponents = ['avatar_entity'] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world as unknown as World;
    const currentTick = ctx.tick;

    const avatarEntities = world
      .query()
      .with('avatar_entity')
      .executeEntities();

    for (const avatarEntity of avatarEntities) {
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      if (!avatarComp) continue;

      // Detect avatar death: health component present and current <= 0
      if (avatarComp.state !== 'destroyed') {
        const healthComp = avatarEntity.getComponent<{ type: string; readonly version: number; current: number; max: number }>('health');
        if (healthComp && healthComp.current <= 0) {
          this.handleDeath(avatarEntity, 'combat', world);
          continue;
        }
      }

      // Check for avatars whose auto-respawn deadline has expired
      if (avatarComp.state !== 'destroyed') continue;
      if (avatarComp.autoRespawnDeadlineTick === null) continue;
      if (currentTick < avatarComp.autoRespawnDeadlineTick) continue;
      if (!avatarComp.pendingRespawnOptions || avatarComp.pendingRespawnOptions.length === 0) continue;

      // Find the owning agent
      const rosterEntities = world.query().with('avatar_roster').executeEntities();
      for (const rosterEntity of rosterEntities) {
        const roster = rosterEntity.getComponent<AvatarRosterComponent>('avatar_roster');
        if (!roster) continue;
        if (!roster.avatarIds.includes(avatarEntity.id)) continue;

        // Auto-respawn using the first available option
        const firstOption = avatarComp.pendingRespawnOptions[0];
        if (!firstOption) continue;

        // Get AvatarManagementSystem reference from world
        // (Systems are looked up through gameLoop in production; in this system we use a
        //  lazy pattern: rely on the event bus to trigger respawn logic rather than coupling directly)
        // For now we inline the respawn state transition and emit the event
        this._executeAutoRespawn(avatarEntity, firstOption, rosterEntity, world, currentTick);
        break;
      }
    }
  }

  /**
   * Handle avatar death. Call when an avatar's health reaches 0.
   * Returns the AvatarDeathEvent with respawn options.
   */
  handleDeath(
    avatarEntity: Entity,
    cause: AvatarDeathEvent['cause'],
    world: World
  ): AvatarDeathEvent {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      throw new Error(
        `[AvatarRespawnSystem] Entity ${avatarEntity.id} has no avatar_entity component`
      );
    }

    if (avatarComp.state === 'destroyed') {
      throw new Error(
        `[AvatarRespawnSystem] Avatar ${avatarComp.avatarId} is already destroyed`
      );
    }

    // Validate transition to destroyed
    validateAvatarTransition(avatarComp.state, 'destroyed');

    const previousState = avatarComp.state;
    const boundAgentId = avatarComp.boundAgentId;

    // Get current position for death location
    const posComp = avatarEntity.getComponent<{ type: string; version: number; x: number; y: number }>('position');
    const location = posComp
      ? { x: posComp.x, y: posComp.y }
      : { x: 0, y: 0 };

    // Generate respawn options
    const respawnOptions = this.getRespawnOptions(avatarEntity, world);

    const deathEvent: AvatarDeathEvent = {
      avatarId: avatarComp.avatarId,
      agentId: boundAgentId,
      cause,
      location,
      tick: world.tick,
      experienceLost: 0, // Could hook into skills system in future
      respawnOptions,
      autoRespawnTicks: AUTO_RESPAWN_TICKS,
    };

    const autoRespawnDeadlineTick = world.tick + AUTO_RESPAWN_TICKS;

    // Transition to destroyed
    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      state: 'destroyed',
      boundAgentId: null,
      deathCount: c.deathCount + 1,
      pendingRespawnOptions: respawnOptions,
      autoRespawnDeadlineTick,
    }));

    // If agent was jacked in, clear their active avatar
    if (boundAgentId !== null) {
      const agentEntity = world.getEntity(boundAgentId);
      if (agentEntity) {
        (agentEntity as EntityImpl).updateComponent<AvatarRosterComponent>('avatar_roster', (r) => ({
          ...r,
          activeAvatarId: null,
        }));
      }
    }

    this.events.emit('avatar:death', {
      avatarId: avatarComp.avatarId,
      agentId: boundAgentId,
      cause,
      location,
      tick: world.tick,
      autoRespawnDeadlineTick,
    });

    this.events.emit('avatar:state_changed', {
      avatarId: avatarComp.avatarId,
      from: previousState,
      to: 'destroyed',
      tick: world.tick,
    });

    return deathEvent;
  }

  /**
   * Generate respawn options for a dead avatar.
   * Always includes spawn_point. Adds checkpoint if respawnPoint is set.
   */
  getRespawnOptions(avatarEntity: Entity, world: World): AvatarRespawnOption[] {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      throw new Error(
        `[AvatarRespawnSystem] Entity ${avatarEntity.id} has no avatar_entity component`
      );
    }

    const options: AvatarRespawnOption[] = [];

    // Default spawn point — always available
    options.push({
      id: 'spawn_point_default',
      type: 'spawn_point',
      location: { x: 0, y: 0 },
      description: 'Respawn at the world spawn point',
      penalties: ['temporary_debuff'],
    });

    // Checkpoint (saved respawn point)
    if (avatarComp.respawnPoint !== null) {
      options.push({
        id: 'checkpoint_saved',
        type: 'checkpoint',
        location: avatarComp.respawnPoint,
        description: 'Respawn at your last saved checkpoint',
        penalties: [],
      });
    }

    return options;
  }

  /**
   * Execute a respawn for an avatar.
   * Creates a new avatar entity (or resets state) and jacks the agent back in.
   */
  respawn(
    avatarEntity: Entity,
    optionId: string,
    agentEntity: Entity,
    world: World,
    avatarManagement: AvatarManagementSystem
  ): { success: boolean; reason?: string } {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) {
      return {
        success: false,
        reason: `Entity ${avatarEntity.id} has no avatar_entity component`,
      };
    }

    if (avatarComp.state !== 'destroyed') {
      return {
        success: false,
        reason: `Avatar ${avatarComp.avatarId} is not destroyed (state: '${avatarComp.state}')`,
      };
    }

    const options = avatarComp.pendingRespawnOptions;
    if (!options || options.length === 0) {
      return {
        success: false,
        reason: `Avatar ${avatarComp.avatarId} has no pending respawn options`,
      };
    }

    const chosenOption = options.find((o) => o.id === optionId);
    if (!chosenOption) {
      return {
        success: false,
        reason: `Respawn option '${optionId}' not found in avatar's pending options`,
      };
    }

    const spawnLocation = chosenOption.location;

    // Reset the existing avatar entity to 'unbound' state
    // (destroyed → unbound is the conceptual "new life" transition)
    validateAvatarTransition('destroyed', 'unbound');

    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      state: 'unbound',
      boundAgentId: null,
      pendingRespawnOptions: null,
      autoRespawnDeadlineTick: null,
    }));

    // Update the avatar's position to the spawn location
    if (avatarEntity.hasComponent('position')) {
      (avatarEntity as EntityImpl).updateComponent<{ type: string; version: number; x: number; y: number; z: number }>(
        'position',
        (p) => ({ ...p, x: spawnLocation.x, y: spawnLocation.y })
      );
    } else {
      (avatarEntity as EntityImpl).addComponent(createPositionComponent(spawnLocation.x, spawnLocation.y, 0));
    }

    // Apply health penalty: spawn at RESPAWN_HEALTH_FRACTION of max health
    const healthComp = avatarEntity.getComponent<{ type: string; version: number; current: number; max: number }>('health');
    if (healthComp) {
      const respawnHealth = Math.floor(healthComp.max * RESPAWN_HEALTH_FRACTION);
      (avatarEntity as EntityImpl).updateComponent<{ type: string; version: number; current: number; max: number }>(
        'health',
        (h) => ({ ...h, current: respawnHealth })
      );
    }

    // Jack the agent back in
    const jackInResult = avatarManagement.jackIn(agentEntity, avatarEntity.id, world);
    if (!jackInResult.success) {
      return {
        success: false,
        reason: `Failed to jack agent back in after respawn: ${jackInResult.reason}`,
      };
    }

    this.events.emit('avatar:respawn', {
      avatarId: avatarComp.avatarId,
      agentId: agentEntity.id,
      respawnType: chosenOption.type,
      location: spawnLocation,
      tick: world.tick,
    });

    return { success: true };
  }

  /**
   * Internal: auto-respawn an avatar when its deadline has passed.
   * Inlines the state reset so we don't need a reference to AvatarManagementSystem.
   */
  private _executeAutoRespawn(
    avatarEntity: Entity,
    option: AvatarRespawnOption,
    agentEntity: Entity,
    world: World,
    currentTick: number
  ): void {
    const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
    if (!avatarComp) return;

    validateAvatarTransition('destroyed', 'unbound');

    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      state: 'unbound',
      boundAgentId: null,
      pendingRespawnOptions: null,
      autoRespawnDeadlineTick: null,
    }));

    if (avatarEntity.hasComponent('position')) {
      (avatarEntity as EntityImpl).updateComponent<{ type: string; version: number; x: number; y: number; z: number }>(
        'position',
        (p) => ({ ...p, x: option.location.x, y: option.location.y })
      );
    }

    // Re-jack agent in (state is now 'unbound', valid to jack in)
    validateAvatarTransition('unbound', 'bound');

    (avatarEntity as EntityImpl).updateComponent<AvatarComponent>('avatar_entity', (c) => ({
      ...c,
      state: 'bound',
      boundAgentId: agentEntity.id,
      lastActiveTick: currentTick,
    }));

    (agentEntity as EntityImpl).updateComponent<AvatarRosterComponent>('avatar_roster', (r) => ({
      ...r,
      activeAvatarId: avatarEntity.id,
    }));

    this.events.emit('avatar:respawn', {
      avatarId: avatarComp.avatarId,
      agentId: agentEntity.id,
      respawnType: option.type,
      location: option.location,
      tick: currentTick,
    });

    this.events.emit('avatar:state_changed', {
      avatarId: avatarComp.avatarId,
      from: 'destroyed',
      to: 'bound',
      tick: currentTick,
    });
  }
}
