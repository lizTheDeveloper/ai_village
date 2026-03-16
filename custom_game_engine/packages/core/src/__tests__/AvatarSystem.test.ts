import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { AvatarManagementSystem } from '../systems/AvatarManagementSystem.js';
import { AvatarRespawnSystem } from '../systems/AvatarRespawnSystem.js';
import type { Entity } from '../ecs/Entity.js';
import { EventBusImpl, type EventBus } from '../events/EventBus.js';
import { createAvatarRosterComponent } from '../components/AvatarRosterComponent.js';
import { createAvatarEntityComponent } from '../components/AvatarComponent.js';
import type { AvatarComponent } from '../components/AvatarComponent.js';
import type { AvatarRosterComponent } from '../components/AvatarRosterComponent.js';
import { validateAvatarTransition } from '../types/AvatarTypes.js';

/**
 * Tests for the Player Avatar jack-in/jack-out system.
 *
 * Verifies:
 * - createAvatar creates entity with proper components
 * - jackIn succeeds when avatar is unbound
 * - jackIn fails when avatar is already bound
 * - jackIn fails when avatar is destroyed
 * - jackOut('dormant') sets state to dormant, returns session stats
 * - jackOut('despawn') sets state to destroyed
 * - handleDeath transitions to destroyed, sets respawn options
 * - respawn creates new state and jacks agent back in
 * - State transition validation throws on invalid transitions
 * - createAvatar respects maxAvatars limit
 */
describe('AvatarSystem', () => {
  let world: World;
  let managementSystem: AvatarManagementSystem;
  let respawnSystem: AvatarRespawnSystem;
  let eventBus: EventBus;
  let agentEntity: Entity;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    managementSystem = new AvatarManagementSystem();
    respawnSystem = new AvatarRespawnSystem();
    await managementSystem.initialize(world, eventBus);
    await respawnSystem.initialize(world, eventBus);

    // Create a basic agent entity with avatar_roster
    agentEntity = world.createEntity();
    agentEntity.addComponent({ type: 'position', version: 1, x: 5, y: 5, z: 0 });
    agentEntity.addComponent(createAvatarRosterComponent(agentEntity.id));
  });

  // ============================================================================
  // createAvatar
  // ============================================================================

  describe('createAvatar()', () => {
    it('creates an avatar entity with avatar_entity component', () => {
      const avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 10, y: 10 }
      );

      expect(avatarEntity).toBeDefined();
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp).toBeDefined();
      expect(avatarComp!.name).toBe('TestAvatar');
      expect(avatarComp!.state).toBe('unbound');
      expect(avatarComp!.boundAgentId).toBeNull();
    });

    it('adds the avatar entity ID to the agent roster', () => {
      const avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 0, y: 0 }
      );

      const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
      expect(roster!.avatarIds).toContain(avatarEntity.id);
    });

    it('creates a position component on the avatar entity at the spawn location', () => {
      const avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 42, y: 17 }
      );

      const pos = avatarEntity.getComponent<{ x: number; y: number }>('position');
      expect(pos).toBeDefined();
      expect(pos!.x).toBe(42);
      expect(pos!.y).toBe(17);
    });

    it('auto-creates avatar_roster if agent does not have one', () => {
      const agentWithoutRoster = world.createEntity();
      agentWithoutRoster.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      // No roster component

      const avatarEntity = managementSystem.createAvatar(
        agentWithoutRoster,
        'NewAvatar',
        world,
        { x: 0, y: 0 }
      );

      expect(agentWithoutRoster.hasComponent('avatar_roster')).toBe(true);
      const roster = agentWithoutRoster.getComponent<AvatarRosterComponent>('avatar_roster');
      expect(roster!.avatarIds).toContain(avatarEntity.id);
    });

    it('throws when agent has reached maxAvatars limit', () => {
      // Set maxAvatars to 1
      agentEntity.updateComponent<AvatarRosterComponent>('avatar_roster', (r) => ({
        ...r,
        maxAvatars: 1,
      }));

      // Create first avatar — should succeed
      managementSystem.createAvatar(agentEntity, 'First', world, { x: 0, y: 0 });

      // Create second avatar — should throw
      expect(() => {
        managementSystem.createAvatar(agentEntity, 'Second', world, { x: 0, y: 0 });
      }).toThrow(/max avatars/i);
    });
  });

  // ============================================================================
  // jackIn
  // ============================================================================

  describe('jackIn()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 10, y: 10 }
      );
    });

    it('succeeds when avatar is unbound', () => {
      const result = managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      expect(result.success).toBe(true);
    });

    it('sets avatar state to bound after jack-in', () => {
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('bound');
    });

    it('sets boundAgentId on avatar after jack-in', () => {
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.boundAgentId).toBe(agentEntity.id);
    });

    it('sets activeAvatarId on roster after jack-in', () => {
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
      expect(roster!.activeAvatarId).toBe(avatarEntity.id);
    });

    it('succeeds when avatar is dormant', () => {
      // Jack in, then jack out as dormant
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      managementSystem.jackOut(agentEntity, 'dormant', world);

      // Now jack back in
      const result = managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      expect(result.success).toBe(true);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('bound');
    });

    it('fails when avatar is already bound (to same agent)', () => {
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      // Try again — agent is already jacked in
      const result = managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/already jacked in/i);
    });

    it('fails when avatar is destroyed', () => {
      // Manually set avatar to destroyed
      avatarEntity.updateComponent<AvatarComponent>('avatar_entity', (c) => ({
        ...c,
        state: 'destroyed',
      }));

      const result = managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/destroyed/i);
    });

    it('fails when agent has no avatar_roster', () => {
      const bareAgent = world.createEntity();
      const result = managementSystem.jackIn(bareAgent, avatarEntity.id, world);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/avatar_roster/i);
    });

    it('fails when avatar entity does not exist', () => {
      const result = managementSystem.jackIn(agentEntity, 'nonexistent-entity-id', world);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not found/i);
    });
  });

  // ============================================================================
  // jackOut
  // ============================================================================

  describe('jackOut()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 10, y: 10 }
      );
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
    });

    it("sets avatar state to dormant when mode is 'dormant'", () => {
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('dormant');
    });

    it("sets avatar state to suspended when mode is 'suspended'", () => {
      managementSystem.jackOut(agentEntity, 'suspended', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('suspended');
    });

    it("sets avatar state to destroyed when mode is 'despawn'", () => {
      managementSystem.jackOut(agentEntity, 'despawn', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('destroyed');
    });

    it('clears activeAvatarId from roster after jack-out', () => {
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
      expect(roster!.activeAvatarId).toBeNull();
    });

    it('returns sessionStats on success', () => {
      const result = managementSystem.jackOut(agentEntity, 'dormant', world);
      expect(result.success).toBe(true);
      expect(result.sessionStats).toBeDefined();
      expect(result.sessionStats!.actionsPerformed).toBeGreaterThanOrEqual(0);
    });

    it('accumulates playtime into totalStats', () => {
      world.setTick(100);
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.totalStats.playtimeSeconds).toBeGreaterThan(0);
    });

    it('fails when agent is not jacked in', () => {
      managementSystem.jackOut(agentEntity, 'dormant', world); // First jack-out
      const result = managementSystem.jackOut(agentEntity, 'dormant', world); // Second should fail
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not currently jacked in/i);
    });

    it('fails when agent has no avatar_roster', () => {
      const bareAgent = world.createEntity();
      const result = managementSystem.jackOut(bareAgent, 'dormant', world);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // getActiveAvatar
  // ============================================================================

  describe('getActiveAvatar()', () => {
    it('returns null when agent is not jacked in', () => {
      const result = managementSystem.getActiveAvatar(agentEntity, world);
      expect(result).toBeNull();
    });

    it('returns the avatar entity when agent is jacked in', () => {
      const avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 0, y: 0 }
      );
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      const result = managementSystem.getActiveAvatar(agentEntity, world);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(avatarEntity.id);
    });
  });

  // ============================================================================
  // handleDeath (AvatarRespawnSystem)
  // ============================================================================

  describe('handleDeath()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 20, y: 20 }
      );
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
    });

    it('transitions avatar to destroyed state', () => {
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('destroyed');
    });

    it('clears boundAgentId after death', () => {
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.boundAgentId).toBeNull();
    });

    it('sets pendingRespawnOptions after death', () => {
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.pendingRespawnOptions).not.toBeNull();
      expect(avatarComp!.pendingRespawnOptions!.length).toBeGreaterThan(0);
    });

    it('sets autoRespawnDeadlineTick after death', () => {
      const tickBefore = world.tick;
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.autoRespawnDeadlineTick).not.toBeNull();
      expect(avatarComp!.autoRespawnDeadlineTick!).toBeGreaterThan(tickBefore);
    });

    it('clears roster activeAvatarId after death', () => {
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
      const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
      expect(roster!.activeAvatarId).toBeNull();
    });

    it('increments deathCount', () => {
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.deathCount).toBe(1);
    });

    it('returns a death event with correct cause and location', () => {
      const deathEvent = respawnSystem.handleDeath(avatarEntity, 'drowning', world);
      expect(deathEvent.cause).toBe('drowning');
      expect(deathEvent.location.x).toBe(20);
      expect(deathEvent.location.y).toBe(20);
    });

    it('throws if avatar is already destroyed', () => {
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
      expect(() => {
        respawnSystem.handleDeath(avatarEntity, 'combat', world);
      }).toThrow(/already destroyed/i);
    });

    it('can handle death on a dormant avatar', () => {
      // Jack out first, then kill
      managementSystem.jackOut(agentEntity, 'dormant', world);
      expect(() => {
        respawnSystem.handleDeath(avatarEntity, 'script', world);
      }).not.toThrow();
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('destroyed');
    });
  });

  // ============================================================================
  // respawn (AvatarRespawnSystem)
  // ============================================================================

  describe('respawn()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 20, y: 20 }
      );
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      respawnSystem.handleDeath(avatarEntity, 'combat', world);
    });

    it('succeeds with a valid respawn option', () => {
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      const optionId = avatarComp!.pendingRespawnOptions![0]!.id;
      const result = respawnSystem.respawn(
        avatarEntity,
        optionId,
        agentEntity,
        world,
        managementSystem
      );
      expect(result.success).toBe(true);
    });

    it('jacks agent back in after respawn', () => {
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      const optionId = avatarComp!.pendingRespawnOptions![0]!.id;
      respawnSystem.respawn(avatarEntity, optionId, agentEntity, world, managementSystem);
      const roster = agentEntity.getComponent<AvatarRosterComponent>('avatar_roster');
      expect(roster!.activeAvatarId).toBe(avatarEntity.id);
    });

    it('sets avatar state to bound after respawn', () => {
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      const optionId = avatarComp!.pendingRespawnOptions![0]!.id;
      respawnSystem.respawn(avatarEntity, optionId, agentEntity, world, managementSystem);
      const freshComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(freshComp!.state).toBe('bound');
    });

    it('clears pendingRespawnOptions after respawn', () => {
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      const optionId = avatarComp!.pendingRespawnOptions![0]!.id;
      respawnSystem.respawn(avatarEntity, optionId, agentEntity, world, managementSystem);
      const freshComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(freshComp!.pendingRespawnOptions).toBeNull();
    });

    it('fails with an unknown respawn option ID', () => {
      const result = respawnSystem.respawn(
        avatarEntity,
        'nonexistent-option-id',
        agentEntity,
        world,
        managementSystem
      );
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not found/i);
    });

    it('fails if avatar is not destroyed', () => {
      // First succeed to get back to bound state
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      const optionId = avatarComp!.pendingRespawnOptions![0]!.id;
      respawnSystem.respawn(avatarEntity, optionId, agentEntity, world, managementSystem);

      // Now try again (avatar is bound, not destroyed)
      const result = respawnSystem.respawn(
        avatarEntity,
        optionId,
        agentEntity,
        world,
        managementSystem
      );
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not destroyed/i);
    });
  });

  // ============================================================================
  // Automatic death detection (AvatarRespawnSystem.onUpdate)
  // ============================================================================

  describe('automatic death detection', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(
        agentEntity,
        'TestAvatar',
        world,
        { x: 20, y: 20 }
      );
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      // Add a health component to the avatar
      avatarEntity.addComponent({ type: 'health', version: 1, current: 100, max: 100 });
    });

    it('detects health=0 and triggers death automatically', () => {
      // Reduce health to 0
      avatarEntity.updateComponent('health', (h: { type: string; version: number; current: number; max: number }) => ({
        ...h,
        current: 0,
      }));

      // Run system update — should auto-detect death
      const entities = world.query().with('avatar_entity').executeEntities();
      respawnSystem.update(world, entities, 0);

      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('destroyed');
      expect(avatarComp!.pendingRespawnOptions).not.toBeNull();
      expect(avatarComp!.deathCount).toBe(1);
    });

    it('does not trigger death when health is above 0', () => {
      // Health is still at 100
      const entities = world.query().with('avatar_entity').executeEntities();
      respawnSystem.update(world, entities, 0);

      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.state).toBe('bound');
    });

    it('does not re-trigger death on already destroyed avatar', () => {
      // Kill the avatar
      avatarEntity.updateComponent('health', (h: { type: string; version: number; current: number; max: number }) => ({
        ...h,
        current: 0,
      }));

      const entities = world.query().with('avatar_entity').executeEntities();
      respawnSystem.update(world, entities, 0);

      // Advance tick so system can run again
      world.setTick(world.tick + 1);

      // Should not throw or double-increment deathCount
      respawnSystem.update(world, entities, 0);
      const avatarComp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(avatarComp!.deathCount).toBe(1);
    });
  });

  // ============================================================================
  // State transition validation
  // ============================================================================

  describe('validateAvatarTransition()', () => {
    it('allows unbound → bound', () => {
      expect(() => validateAvatarTransition('unbound', 'bound')).not.toThrow();
    });

    it('allows bound → dormant', () => {
      expect(() => validateAvatarTransition('bound', 'dormant')).not.toThrow();
    });

    it('allows bound → suspended', () => {
      expect(() => validateAvatarTransition('bound', 'suspended')).not.toThrow();
    });

    it('allows bound → destroyed', () => {
      expect(() => validateAvatarTransition('bound', 'destroyed')).not.toThrow();
    });

    it('allows dormant → bound', () => {
      expect(() => validateAvatarTransition('dormant', 'bound')).not.toThrow();
    });

    it('allows suspended → bound', () => {
      expect(() => validateAvatarTransition('suspended', 'bound')).not.toThrow();
    });

    it('allows destroyed → unbound', () => {
      expect(() => validateAvatarTransition('destroyed', 'unbound')).not.toThrow();
    });

    it('throws on unbound → dormant (invalid)', () => {
      expect(() => validateAvatarTransition('unbound', 'dormant')).toThrow();
    });

    it('throws on unbound → suspended (invalid)', () => {
      expect(() => validateAvatarTransition('unbound', 'suspended')).toThrow();
    });

    it('throws on bound → unbound (invalid)', () => {
      expect(() => validateAvatarTransition('bound', 'unbound')).toThrow();
    });

    it('throws on dormant → suspended (invalid)', () => {
      expect(() => validateAvatarTransition('dormant', 'suspended')).toThrow();
    });

    it('throws on destroyed → bound (must go through unbound first)', () => {
      expect(() => validateAvatarTransition('destroyed', 'bound')).toThrow();
    });
  });

  // ============================================================================
  // Avatar Actions: setStance
  // ============================================================================

  describe('setStance()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(agentEntity, 'ActionAvatar', world, { x: 5, y: 5 });
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
    });

    it('sets stance on a bound avatar', () => {
      const result = managementSystem.setStance(avatarEntity, 'crouching');
      expect(result.success).toBe(true);
      const comp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(comp!.stance).toBe('crouching');
    });

    it('defaults to standing on avatar creation', () => {
      const comp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(comp!.stance).toBe('standing');
    });

    it('fails if avatar is not bound', () => {
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const result = managementSystem.setStance(avatarEntity, 'prone');
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not bound/i);
    });

    it('emits avatar:stance_changed event', () => {
      const emitted: unknown[] = [];
      eventBus.subscribe('avatar:stance_changed', (e) => emitted.push(e));
      managementSystem.setStance(avatarEntity, 'sitting');
      (eventBus as EventBusImpl).flush();
      expect(emitted).toHaveLength(1);
    });
  });

  // ============================================================================
  // Avatar Actions: performEmote
  // ============================================================================

  describe('performEmote()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(agentEntity, 'EmoteAvatar', world, { x: 5, y: 5 });
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
    });

    it('records emote on a bound avatar', () => {
      const result = managementSystem.performEmote(avatarEntity, 'wave', world);
      expect(result.success).toBe(true);
      const comp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(comp!.lastEmote).toBe('wave');
      expect(comp!.lastEmoteTick).not.toBeNull();
    });

    it('fails if avatar is not bound', () => {
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const result = managementSystem.performEmote(avatarEntity, 'dance', world);
      expect(result.success).toBe(false);
    });

    it('emits avatar:emote event', () => {
      const emitted: unknown[] = [];
      eventBus.subscribe('avatar:emote', (e) => emitted.push(e));
      managementSystem.performEmote(avatarEntity, 'nod', world);
      (eventBus as EventBusImpl).flush();
      expect(emitted).toHaveLength(1);
    });

    it('clears lastEmote and lastEmoteTick on jack-out', () => {
      managementSystem.performEmote(avatarEntity, 'dance', world);
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const comp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(comp!.lastEmote).toBeNull();
      expect(comp!.lastEmoteTick).toBeNull();
    });
  });

  // ============================================================================
  // Avatar Actions: inspectSelf
  // ============================================================================

  describe('inspectSelf()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(agentEntity, 'InspectAvatar', world, { x: 3, y: 7 });
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
    });

    it('returns status for a bound avatar', () => {
      const result = managementSystem.inspectSelf(avatarEntity, world);
      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.status!.name).toBe('InspectAvatar');
      expect(result.status!.state).toBe('bound');
      expect(result.status!.stance).toBe('standing');
      expect(result.status!.deathCount).toBe(0);
      expect(result.status!.lastEmote).toBeNull();
      expect(result.status!.totalPlaytimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('fails if avatar is not bound', () => {
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const result = managementSystem.inspectSelf(avatarEntity, world);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not bound/i);
    });

    it('returns health info when health component exists', () => {
      avatarEntity.addComponent({ type: 'health', version: 1, current: 75, max: 100 });
      const result = managementSystem.inspectSelf(avatarEntity, world);
      expect(result.success).toBe(true);
      expect(result.status!.health).toEqual({ current: 75, max: 100 });
    });

    it('returns null health when no health component', () => {
      const result = managementSystem.inspectSelf(avatarEntity, world);
      expect(result.success).toBe(true);
      expect(result.status!.health).toBeNull();
    });
  });

  // ============================================================================
  // Avatar Actions: checkInventory
  // ============================================================================

  describe('checkInventory()', () => {
    let avatarEntity: Entity;

    beforeEach(() => {
      avatarEntity = managementSystem.createAvatar(agentEntity, 'InventoryAvatar', world, { x: 1, y: 2 });
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
    });

    it('returns empty items when no inventory component', () => {
      const result = managementSystem.checkInventory(avatarEntity, world);
      expect(result.success).toBe(true);
      expect(result.items).toEqual([]);
    });

    it('fails if avatar is not bound', () => {
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const result = managementSystem.checkInventory(avatarEntity, world);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not bound/i);
    });

    it('returns items from inventory component when present', () => {
      avatarEntity.addComponent({
        type: 'inventory',
        version: 1,
        slots: [
          { itemId: 'item:sword', name: 'Iron Sword', quantity: 1 },
          { itemId: 'item:potion', name: 'Health Potion', quantity: 3 },
        ],
      });
      const result = managementSystem.checkInventory(avatarEntity, world);
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items![0]).toEqual({ id: 'item:sword', name: 'Iron Sword', quantity: 1 });
      expect(result.items![1]).toEqual({ id: 'item:potion', name: 'Health Potion', quantity: 3 });
    });
  });

  // ============================================================================
  // Skill bonuses on jack-in
  // ============================================================================

  describe('skill bonuses on jack-in', () => {
    it('applies no bonuses when agent has no skills component', () => {
      const avatarEntity = managementSystem.createAvatar(agentEntity, 'NoSkillAvatar', world, { x: 0, y: 0 });
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      const comp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(comp!.appliedSkillBonuses).toHaveLength(0);
    });

    it('applies combat bonus when agent has combat skill >= 2', () => {
      agentEntity.addComponent({
        type: 'skills',
        version: 1,
        levels: { combat: 3, exploration: 0, crafting: 0 } as Record<string, number>,
        xp: {},
        affinities: {},
        specializations: {},
        domainData: {},
        taskFamiliarity: {},
      });
      const avatarEntity = managementSystem.createAvatar(agentEntity, 'CombatAvatar', world, { x: 0, y: 0 });
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      const comp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      const combatBonus = comp!.appliedSkillBonuses.find(b => b.skill === 'combat');
      expect(combatBonus).toBeDefined();
      expect(combatBonus!.stat).toBe('weapon_damage');
      expect(combatBonus!.multiplier).toBeGreaterThan(1);
    });

    it('clears appliedSkillBonuses on jack-out', () => {
      agentEntity.addComponent({
        type: 'skills',
        version: 1,
        levels: { combat: 3 } as Record<string, number>,
        xp: {},
        affinities: {},
        specializations: {},
        domainData: {},
        taskFamiliarity: {},
      });
      const avatarEntity = managementSystem.createAvatar(agentEntity, 'BonusAvatar', world, { x: 0, y: 0 });
      managementSystem.jackIn(agentEntity, avatarEntity.id, world);
      managementSystem.jackOut(agentEntity, 'dormant', world);
      const comp = avatarEntity.getComponent<AvatarComponent>('avatar_entity');
      expect(comp!.appliedSkillBonuses).toHaveLength(0);
    });
  });
});
