import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, type World } from '../ecs/World.js';
import { DeathTransitionSystem } from '../systems/DeathTransitionSystem.js';
import type { Entity } from '../ecs/Entity.js';
import { EventBusImpl, type EventBus } from '../events/EventBus.js';

/**
 * Tests for Death Handling - Acceptance Criterion 6
 *
 * Verifies:
 * - Death is permanent (agent marked dead, not deleted)
 * - Inventory dropped at location
 * - All agents with relationship notified
 * - Mourning applied to close relations
 * - Knowledge loss checked (unique memories die, shared survive)
 * - Power vacuum checked if agent held position
 * - Death memory created for witnesses
 * - Pack mind coherence recalculated
 * - Hive collapse triggered if queen dies
 */
describe('DeathHandling', () => {
  let world: World;
  let system: DeathTransitionSystem;
  let eventBus: EventBus;

  // Helper to run the system (advance tick past throttle interval first)
  function runSystem() {
    world.setTick(world.tick + 101); // Past throttleInterval of 100
    const entities = world.query().with('needs').executeEntities();
    system.update(world, entities, 0.05);
    eventBus.flush(); // Dispatch queued events to handlers
  }

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new DeathTransitionSystem();
    await system.initialize(world, eventBus);
  });

  describe('REQ-CON-009: Death is Permanent', () => {
    it('should mark agent as dead, not delete', () => {
      // Create deceased agent with all required components
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0, // Dead
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });

      runSystem();

      // Entity should still exist
      expect(world.getEntity(deceased.id)).toBeDefined();
      // Check if realm_location was marked with dead transformation
      const realmLocation = deceased.getComponent('realm_location');
      expect(realmLocation?.transformations).toContain('dead');
    });

    it('should drop inventory at death location', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'inventory',
        items: [
          { type: 'sword', quantity: 1 },
          { type: 'gold', quantity: 50 },
        ],
      });

      runSystem();

      // Check for dropped items using query
      const allEntities = world.query().with('item').executeEntities();
      const droppedAtLocation = allEntities.filter((e) => {
        const pos = e.getComponent('position');
        return pos && pos.x === 10 && pos.y === 10;
      });

      expect(droppedAtLocation.length).toBeGreaterThan(0);
      expect(droppedAtLocation.some((i) => i.getComponent('item').itemType === 'sword')).toBe(true);
      expect(droppedAtLocation.some((i) => i.getComponent('item').itemType === 'gold')).toBe(true);
    });

    it('should notify all agents with relationship', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });

      const friend = world.createEntity();
      friend.addComponent({ type: 'position', version: 1, x: 20, y: 20, z: 0 });
      friend.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      friend.addComponent({ type: 'identity', version: 1, name: 'Friend' });
      friend.addComponent({
        type: 'relationship',
        version: 1,
        relationships: new Map([[deceased.id, { affinity: 80, trust: 90, familiarity: 80 }]]),
      });

      const notificationHandler = vi.fn();
      eventBus.on('death:notification', notificationHandler);

      runSystem();

      expect(notificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'death:notification',
          data: expect.objectContaining({
            deceasedId: deceased.id,
            notifiedAgents: expect.arrayContaining([friend.id]),
          }),
        })
      );
    });

    it('should apply mourning to close relations', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });

      const friend = world.createEntity();
      friend.addComponent({ type: 'position', version: 1, x: 20, y: 20, z: 0 });
      friend.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      friend.addComponent({ type: 'identity', version: 1, name: 'Friend' });
      friend.addComponent({
        type: 'relationship',
        version: 1,
        relationships: new Map([[deceased.id, { affinity: 80, trust: 90, familiarity: 80 }]]),
      });

      runSystem();

      const mood = friend.getComponent('mood');

      expect(mood).toBeDefined();
      expect(mood.grief).toBeGreaterThan(0);
      expect(mood.mourning).toBe(true);
    });

    it('should mark unique memories as lost', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'episodic_memory',
        memories: [
          { id: 'unique1', shared: false, content: 'secret location' },
          { id: 'shared1', shared: true, content: 'village festival' },
        ],
      });

      runSystem();

      // Query for knowledge_loss singleton entity
      const knowledgeLossEntities = world.query().with('knowledge_loss').executeEntities();
      expect(knowledgeLossEntities.length).toBeGreaterThan(0);
      const knowledgeLoss = knowledgeLossEntities[0].getComponent('knowledge_loss');

      expect(knowledgeLoss.lostMemories).toContainEqual(
        expect.objectContaining({ id: 'unique1', content: 'secret location' })
      );
    });

    it('should not mark shared memories as lost', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'episodic_memory',
        memories: [
          { id: 'unique1', shared: false, content: 'secret location' },
          { id: 'shared1', shared: true, content: 'village festival' },
        ],
      });

      runSystem();

      // Query for knowledge_loss singleton entity
      const knowledgeLossEntities = world.query().with('knowledge_loss').executeEntities();
      expect(knowledgeLossEntities.length).toBeGreaterThan(0);
      const knowledgeLoss = knowledgeLossEntities[0].getComponent('knowledge_loss');

      const sharedLost = knowledgeLoss.lostMemories.some((m: any) => m.id === 'shared1');
      expect(sharedLost).toBe(false);
    });

    it('should check for power vacuum if deceased held position', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'position_holder',
        version: 1,
        position: 'chief',
        authority: 10,
      });

      runSystem();

      // Query for power_vacuum singleton entity
      const powerVacuumEntities = world.query().with('power_vacuum').executeEntities();
      expect(powerVacuumEntities.length).toBeGreaterThan(0);
      const powerVacuum = powerVacuumEntities[0].getComponent('power_vacuum');

      expect(powerVacuum).toBeDefined();
      expect(powerVacuum.position).toBe('chief');
      expect(powerVacuum.candidates).toBeDefined();
    });

    it('should create death memory for witnesses', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });

      const witness = world.createEntity();
      witness.addComponent({ type: 'position', version: 1, x: 12, y: 12, z: 0 });
      witness.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      witness.addComponent({ type: 'identity', version: 1, name: 'Witness' });
      witness.addComponent({
        type: 'episodic_memory',
        memories: []
      });

      runSystem();

      const witnessMemory = witness.getComponent('episodic_memory');

      expect(witnessMemory.memories).toContainEqual(
        expect.objectContaining({
          type: 'death_witnessed',
          deceased: deceased.id,
        })
      );
    });

    it('should emit agent:died event', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });

      const deathHandler = vi.fn();
      eventBus.on('agent:died', deathHandler);

      runSystem();

      expect(deathHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent:died',
          data: expect.objectContaining({
            entityId: deceased.id,
            destinationRealm: 'none',
            routingReason: 'no_soul',
          }),
        })
      );
    });
  });

  describe('pack mind death handling', () => {
    it('should recalculate coherence on body death', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'pack_member',
        version: 1,
        packId: 'pack1',
      });

      const packMind = world.createEntity();
      packMind.addComponent({
        type: 'pack_combat',
        version: 1,
        packId: 'pack1',
        bodiesInPack: [deceased.id, 'body2', 'body3'],
        coherence: 0.8,
      });

      runSystem();

      const packCombat = packMind.getComponent('pack_combat');

      expect(packCombat.bodiesInPack).not.toContain(deceased.id);
      expect(packCombat.coherence).toBeLessThan(0.8);
    });

    it('should trigger pack dissolution on low coherence', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'pack_member',
        version: 1,
        packId: 'pack1',
      });

      const packMind = world.createEntity();
      packMind.addComponent({
        type: 'pack_combat',
        version: 1,
        packId: 'pack1',
        bodiesInPack: [deceased.id, 'body2'],
        coherence: 0.3, // Already low
      });

      runSystem();

      const packCombat = packMind.getComponent('pack_combat');

      // Pack should dissolve
      expect(packCombat.dissolved).toBe(true);
    });
  });

  describe('hive death handling', () => {
    it('should trigger collapse on queen death', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'hive_queen',
        version: 1,
        hiveId: 'hive1',
      });

      const hive = world.createEntity();
      hive.addComponent({
        type: 'hive_combat',
        version: 1,
        hiveId: 'hive1',
        queen: deceased.id,
        workers: ['worker1', 'worker2', 'worker3'],
      });

      runSystem();

      const hiveCombat = hive.getComponent('hive_combat');

      expect(hiveCombat.queenDead).toBe(true);
      expect(hiveCombat.collapseTriggered).toBe(true);
    });

    it('should handle worker death without collapse', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });
      deceased.addComponent({
        type: 'hive_worker',
        version: 1,
        hiveId: 'hive1',
      });

      const hive = world.createEntity();
      hive.addComponent({
        type: 'hive_combat',
        version: 1,
        hiveId: 'hive1',
        queen: 'queen1',
        workers: [deceased.id, 'worker2', 'worker3'],
      });

      runSystem();

      const hiveCombat = hive.getComponent('hive_combat');

      expect(hiveCombat.workers).not.toContain(deceased.id);
      expect(hiveCombat.collapseTriggered).toBeFalsy();
    });
  });

  describe('error handling', () => {
    it('should handle entities without needs component gracefully', () => {
      const entityWithoutNeeds = world.createEntity();
      entityWithoutNeeds.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });

      // Should not throw
      expect(() => runSystem()).not.toThrow();
    });

    it('should not process death twice', () => {
      const deceased = world.createEntity();
      deceased.addComponent({ type: 'position', version: 1, x: 10, y: 10, z: 0 });
      deceased.addComponent({ type: 'agent', version: 1, tier: 'autonomic' });
      deceased.addComponent({ type: 'identity', version: 1, name: 'Deceased' });
      deceased.addComponent({
        type: 'needs',
        version: 1,
        health: 0,
        hunger: 100,
        energy: 100,
        temperature: 37,
        lastUpdate: 0
      });

      runSystem();
      expect(system.hasProcessedDeath(deceased.id)).toBe(true);

      // Second update should not reprocess
      runSystem();
      // Still processed, not processed twice
      expect(system.hasProcessedDeath(deceased.id)).toBe(true);
    });
  });
});
