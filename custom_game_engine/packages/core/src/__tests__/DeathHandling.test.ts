import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../ecs/World';
import { DeathTransitionSystem } from '../systems/DeathTransitionSystem';
import { Entity } from '../ecs/Entity';
import { EventBus } from '../events/EventBus';

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
  let deceased: Entity;
  let friend: Entity;
  let witness: Entity;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    system = new DeathTransitionSystem(eventBus);

    // Create deceased agent
    deceased = world.createEntity();
    deceased.addComponent('position', { x: 10, y: 10, z: 0 });
    deceased.addComponent('agent', { name: 'Deceased' });
    deceased.addComponent('inventory', {
      items: [
        { type: 'sword', quantity: 1 },
        { type: 'gold', quantity: 50 },
      ],
    });
    deceased.addComponent('relationship', { relationships: {} });
    deceased.addComponent('episodic_memory', {
      memories: [
        { id: 'unique1', shared: false, content: 'secret location' },
        { id: 'shared1', shared: true, content: 'village festival' },
      ],
    });

    // Create friend
    friend = world.createEntity();
    friend.addComponent('position', { x: 20, y: 20, z: 0 });
    friend.addComponent('agent', { name: 'Friend' });
    friend.addComponent('relationship', {
      relationships: {
        [deceased.id]: { opinion: 80, trust: 90, closeness: 'close' },
      },
    });

    // Create witness
    witness = world.createEntity();
    witness.addComponent('position', { x: 12, y: 12, z: 0 });
    witness.addComponent('agent', { name: 'Witness' });
    witness.addComponent('episodic_memory', { memories: [] });
  });

  describe('REQ-CON-009: Death is Permanent', () => {
    it('should mark agent as dead, not delete', () => {
      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      // Entity should still exist
      expect(world.getEntity(deceased.id)).toBeDefined();
      // But should be marked dead
      expect(deceased.hasComponent('dead')).toBe(true);
    });

    it('should drop inventory at death location', () => {
      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      // Check for dropped items at location
      const droppedItems = world.getEntitiesAt(10, 10, 0);
      const items = droppedItems.filter((e) => e.hasComponent('item'));

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((i) => i.getComponent('item').type === 'sword')).toBe(true);
      expect(items.some((i) => i.getComponent('item').type === 'gold')).toBe(true);
    });

    it('should notify all agents with relationship', () => {
      const notificationHandler = vi.fn();
      eventBus.on('death:notification', notificationHandler);

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      expect(notificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          deceasedId: deceased.id,
          notifiedAgents: expect.arrayContaining([friend.id]),
        })
      );
    });

    it('should apply mourning to close relations', () => {
      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const mood = friend.getComponent('mood');

      expect(mood).toBeDefined();
      expect(mood.grief).toBeGreaterThan(0);
      expect(mood.mourning).toBe(true);
    });

    it('should not apply mourning to distant relations', () => {
      const acquaintance = world.createEntity();
      acquaintance.addComponent('agent', { name: 'Acquaintance' });
      acquaintance.addComponent('relationship', {
        relationships: {
          [deceased.id]: { opinion: 30, trust: 20, closeness: 'distant' },
        },
      });

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const mood = acquaintance.getComponent('mood');

      if (mood) {
        expect(mood.mourning).toBeFalsy();
      }
    });

    it('should mark unique memories as lost', () => {
      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const knowledgeLoss = world.getComponent('knowledge_loss');

      expect(knowledgeLoss.lostMemories).toContainEqual(
        expect.objectContaining({ id: 'unique1', content: 'secret location' })
      );
    });

    it('should not mark shared memories as lost', () => {
      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const knowledgeLoss = world.getComponent('knowledge_loss');

      const sharedLost = knowledgeLoss.lostMemories.some((m: any) => m.id === 'shared1');
      expect(sharedLost).toBe(false);
    });

    it('should check for power vacuum if deceased held position', () => {
      deceased.addComponent('position_holder', {
        position: 'chief',
        authority: 10,
      });

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const powerVacuum = world.getComponent('power_vacuum');

      expect(powerVacuum).toBeDefined();
      expect(powerVacuum.position).toBe('chief');
      expect(powerVacuum.candidates).toBeDefined();
    });

    it('should create death memory for witnesses', () => {
      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const witnessMemory = witness.getComponent('episodic_memory');

      expect(witnessMemory.memories).toContainEqual(
        expect.objectContaining({
          type: 'death_witnessed',
          deceased: deceased.id,
        })
      );
    });

    it('should emit death:occurred event', () => {
      const deathHandler = vi.fn();
      eventBus.on('death:occurred', deathHandler);

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      expect(deathHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          deceasedId: deceased.id,
          cause: 'combat',
        })
      );
    });

    it('should handle death from various causes', () => {
      const causes = ['combat', 'starvation', 'disease', 'predator', 'old_age', 'accident'];

      causes.forEach((cause) => {
        const testAgent = world.createEntity();
        testAgent.addComponent('agent', { name: 'Test' });
        testAgent.addComponent('dead', {
          cause: cause,
          time: 1000,
        });

        system.update(world, 1);

        expect(testAgent.getComponent('dead').cause).toBe(cause);
      });
    });
  });

  describe('pack mind death handling', () => {
    it('should recalculate coherence on body death', () => {
      const packMind = world.createEntity();
      packMind.addComponent('pack_combat', {
        packId: 'pack1',
        bodiesInPack: [deceased.id, 'body2', 'body3'],
        coherence: 0.8,
      });

      deceased.addComponent('pack_member', {
        packId: 'pack1',
      });

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const packCombat = packMind.getComponent('pack_combat');

      expect(packCombat.bodiesInPack).not.toContain(deceased.id);
      expect(packCombat.coherence).toBeLessThan(0.8);
    });

    it('should trigger pack dissolution on low coherence', () => {
      const packMind = world.createEntity();
      packMind.addComponent('pack_combat', {
        packId: 'pack1',
        bodiesInPack: [deceased.id, 'body2'],
        coherence: 0.3, // Already low
      });

      deceased.addComponent('pack_member', {
        packId: 'pack1',
      });

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const packCombat = packMind.getComponent('pack_combat');

      // Pack should dissolve
      expect(packCombat.dissolved).toBe(true);
    });
  });

  describe('hive death handling', () => {
    it('should trigger collapse on queen death', () => {
      const hive = world.createEntity();
      hive.addComponent('hive_combat', {
        hiveId: 'hive1',
        queen: deceased.id,
        workers: ['worker1', 'worker2', 'worker3'],
      });

      deceased.addComponent('hive_queen', {
        hiveId: 'hive1',
      });

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const hiveCombat = hive.getComponent('hive_combat');

      expect(hiveCombat.queenDead).toBe(true);
      expect(hiveCombat.collapseTriggered).toBe(true);
    });

    it('should handle worker death without collapse', () => {
      const hive = world.createEntity();
      hive.addComponent('hive_combat', {
        hiveId: 'hive1',
        queen: 'queen1',
        workers: [deceased.id, 'worker2', 'worker3'],
      });

      deceased.addComponent('hive_worker', {
        hiveId: 'hive1',
      });

      deceased.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      system.update(world, 1);

      const hiveCombat = hive.getComponent('hive_combat');

      expect(hiveCombat.workers).not.toContain(deceased.id);
      expect(hiveCombat.collapseTriggered).toBeFalsy();
    });
  });

  describe('error handling', () => {
    it('should throw when death cause is not provided', () => {
      deceased.addComponent('dead', {
        time: 1000,
      } as any);

      expect(() => system.update(world, 1)).toThrow('Death cause is required');
    });

    it('should throw when death time is not provided', () => {
      deceased.addComponent('dead', {
        cause: 'combat',
      } as any);

      expect(() => system.update(world, 1)).toThrow('Death time is required');
    });
  });
});
