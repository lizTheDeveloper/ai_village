/**
 * Tests for UpdatePropagation - Minecraft Redstone-style update propagation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UpdatePropagation, UPDATE_TYPES } from '../UpdatePropagation.js';

describe('UpdatePropagation', () => {
  let propagation: UpdatePropagation;

  beforeEach(() => {
    propagation = new UpdatePropagation({
      updatesPerTick: 10,
      maxQueueSize: 100,
    });
  });

  describe('update queuing', () => {
    it('should queue updates', () => {
      const queued = propagation.queueUpdate('entity1', 'signal:changed', 5);
      expect(queued).toBe(true);
      expect(propagation.getQueueLength()).toBe(1);
    });

    it('should deduplicate same entity+type updates', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5);
      propagation.queueUpdate('entity1', 'signal:changed', 10); // Should be deduped

      expect(propagation.getQueueLength()).toBe(1);
      expect(propagation.getStats().dedupedUpdates).toBe(1);
    });

    it('should allow different types for same entity', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5);
      propagation.queueUpdate('entity1', 'block:changed', 5);

      expect(propagation.getQueueLength()).toBe(2);
    });

    it('should order by priority (higher first)', () => {
      propagation.queueUpdate('entity1', 'low', 1);
      propagation.queueUpdate('entity2', 'high', 10);
      propagation.queueUpdate('entity3', 'med', 5);

      const processed = propagation.processUpdates();

      expect(processed[0].entityId).toBe('entity2');
      expect(processed[1].entityId).toBe('entity3');
      expect(processed[2].entityId).toBe('entity1');
    });
  });

  describe('update processing', () => {
    it('should process updates up to budget', () => {
      for (let i = 0; i < 15; i++) {
        propagation.queueUpdate(`entity${i}`, 'update', 5);
      }

      const processed = propagation.processUpdates();
      expect(processed.length).toBe(10); // updatesPerTick = 10
      expect(propagation.getQueueLength()).toBe(5);
    });

    it('should remove processed updates from dedupe set', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5);
      propagation.processUpdates();

      // Should be able to queue again
      const queued = propagation.queueUpdate('entity1', 'signal:changed', 5);
      expect(queued).toBe(true);
    });

    it('should track source entity', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5, 'lever1');

      const processed = propagation.processUpdates();
      expect(processed[0].sourceId).toBe('lever1');
    });

    it('should include optional data', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5, undefined, { power: 15 });

      const processed = propagation.processUpdates();
      expect(processed[0].data).toEqual({ power: 15 });
    });
  });

  describe('neighbor propagation', () => {
    it('should propagate to neighbors when lookup is set', () => {
      propagation.setNeighborLookup((entityId, _radius) => {
        // Simulate finding 3 neighbors
        return ['neighbor1', 'neighbor2', 'neighbor3'];
      });

      const count = propagation.propagateToNeighbors('source', 5, 'signal:changed', 10);

      expect(count).toBe(3);
      expect(propagation.getQueueLength()).toBe(3);
      expect(propagation.hasPendingUpdate('neighbor1', 'signal:changed')).toBe(true);
    });

    it('should not propagate to source entity', () => {
      propagation.setNeighborLookup((_entityId, _radius) => {
        // Include source in neighbors
        return ['source', 'neighbor1', 'neighbor2'];
      });

      const count = propagation.propagateToNeighbors('source', 5, 'signal:changed');

      expect(count).toBe(2); // source excluded
    });

    it('should decay priority for neighbors', () => {
      propagation.setNeighborLookup(() => ['neighbor1']);
      propagation.propagateToNeighbors('source', 5, 'signal:changed', 10);

      const processed = propagation.processUpdates();
      expect(processed[0].priority).toBeLessThan(10);
    });
  });

  describe('propagation rules', () => {
    it('should apply propagation rules on processing', () => {
      propagation.setNeighborLookup(() => ['neighbor1', 'neighbor2']);

      propagation.registerRule({
        triggerType: 'signal:on',
        propagateType: 'signal:changed',
        maxRadius: 5,
        priorityDecay: 1,
        maxHops: 10,
      });

      propagation.queueUpdate('lever', 'signal:on', 10);
      propagation.processUpdates();

      // Should have queued updates for neighbors
      expect(propagation.hasPendingUpdate('neighbor1', 'signal:changed')).toBe(true);
      expect(propagation.hasPendingUpdate('neighbor2', 'signal:changed')).toBe(true);
    });

    it('should respect propagation rule filter', () => {
      propagation.setNeighborLookup(() => ['wire1', 'block1', 'wire2']);

      propagation.registerRule({
        triggerType: 'signal:on',
        propagateType: 'signal:changed',
        maxRadius: 5,
        priorityDecay: 1,
        maxHops: 10,
        filter: (entityId) => entityId.startsWith('wire'),
      });

      propagation.queueUpdate('lever', 'signal:on', 10);
      propagation.processUpdates();

      expect(propagation.hasPendingUpdate('wire1', 'signal:changed')).toBe(true);
      expect(propagation.hasPendingUpdate('wire2', 'signal:changed')).toBe(true);
      expect(propagation.hasPendingUpdate('block1', 'signal:changed')).toBe(false);
    });
  });

  describe('pending update checks', () => {
    it('should check pending by type', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5);

      expect(propagation.hasPendingUpdate('entity1', 'signal:changed')).toBe(true);
      expect(propagation.hasPendingUpdate('entity1', 'block:changed')).toBe(false);
    });

    it('should check pending any type', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5);

      expect(propagation.hasPendingUpdate('entity1')).toBe(true);
      expect(propagation.hasPendingUpdate('entity2')).toBe(false);
    });
  });

  describe('queue management', () => {
    it('should drop lowest priority when queue is full', () => {
      const smallQueue = new UpdatePropagation({ maxQueueSize: 3, dedupeUpdates: false });

      smallQueue.queueUpdate('entity1', 'type1', 5);
      smallQueue.queueUpdate('entity2', 'type2', 10);
      smallQueue.queueUpdate('entity3', 'type3', 7);
      smallQueue.queueUpdate('entity4', 'type4', 15); // Should push out priority 5

      const stats = smallQueue.getStats();
      expect(stats.droppedDueToCap).toBe(1);
    });

    it('should clear queue', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5);
      propagation.queueUpdate('entity2', 'block:changed', 5);

      propagation.clear();

      expect(propagation.getQueueLength()).toBe(0);
    });
  });

  describe('standard update types', () => {
    it('should define standard update types', () => {
      expect(UPDATE_TYPES.SIGNAL_CHANGED).toBe('signal:changed');
      expect(UPDATE_TYPES.BLOCK_PLACED).toBe('block:placed');
      expect(UPDATE_TYPES.ENTITY_MOVED).toBe('entity:moved');
      expect(UPDATE_TYPES.FIRE_SPREAD).toBe('fire:spread');
    });
  });

  describe('reset', () => {
    it('should fully reset state', () => {
      propagation.queueUpdate('entity1', 'signal:changed', 5);
      propagation.registerRule({
        triggerType: 'test',
        propagateType: 'test',
        maxRadius: 5,
        priorityDecay: 1,
        maxHops: 5,
      });
      propagation.processUpdates();

      propagation.reset();

      expect(propagation.getQueueLength()).toBe(0);
      expect(propagation.getStats().totalQueued).toBe(0);
    });
  });
});
