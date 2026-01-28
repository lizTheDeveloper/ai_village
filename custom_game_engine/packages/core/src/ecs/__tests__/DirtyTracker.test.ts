/**
 * Tests for DirtyTracker - Minecraft-style entity change tracking
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DirtyTracker } from '../DirtyTracker.js';

describe('DirtyTracker', () => {
  let tracker: DirtyTracker;

  beforeEach(() => {
    tracker = new DirtyTracker();
  });

  describe('basic dirty tracking', () => {
    it('should mark entities as dirty', () => {
      tracker.markDirty('entity1', 'position');
      expect(tracker.isDirty('entity1')).toBe(true);
      expect(tracker.isDirty('entity2')).toBe(false);
    });

    it('should track dirty entities by component type', () => {
      tracker.markDirty('entity1', 'position');
      tracker.markDirty('entity2', 'health');
      tracker.markDirty('entity3', 'position');

      const positionDirty = tracker.getDirtyByComponent('position');
      expect(positionDirty.has('entity1')).toBe(true);
      expect(positionDirty.has('entity3')).toBe(true);
      expect(positionDirty.has('entity2')).toBe(false);

      const healthDirty = tracker.getDirtyByComponent('health');
      expect(healthDirty.has('entity2')).toBe(true);
    });

    it('should check component-level dirty status', () => {
      tracker.markDirty('entity1', 'position');

      expect(tracker.isComponentDirty('entity1', 'position')).toBe(true);
      expect(tracker.isComponentDirty('entity1', 'health')).toBe(false);
      expect(tracker.isComponentDirty('entity2', 'position')).toBe(false);
    });

    it('should return all dirty entities', () => {
      tracker.markDirty('entity1', 'position');
      tracker.markDirty('entity2', 'health');

      const dirty = tracker.getDirtyEntities();
      expect(dirty.has('entity1')).toBe(true);
      expect(dirty.has('entity2')).toBe(true);
      expect(dirty.size).toBe(2);
    });
  });

  describe('entity lifecycle', () => {
    it('should track added entities', () => {
      tracker.markEntityAdded('entity1');

      expect(tracker.getAddedEntities().has('entity1')).toBe(true);
      expect(tracker.isDirty('entity1')).toBe(true);
    });

    it('should track removed entities', () => {
      tracker.markDirty('entity1', 'position');
      tracker.markEntityRemoved('entity1');

      expect(tracker.getRemovedEntities().has('entity1')).toBe(true);
      expect(tracker.isDirty('entity1')).toBe(false); // Removed from dirty set
    });
  });

  describe('tick management', () => {
    it('should clear dirty state on clearTick', () => {
      tracker.markDirty('entity1', 'position');
      tracker.markDirty('entity2', 'health');
      tracker.markEntityAdded('entity3');

      tracker.clearTick();

      expect(tracker.getDirtyEntities().size).toBe(0);
      expect(tracker.getAddedEntities().size).toBe(0);
      expect(tracker.getRemovedEntities().size).toBe(0);
    });

    it('should increment tick on clearTick', () => {
      expect(tracker.getTick()).toBe(0);
      tracker.clearTick();
      expect(tracker.getTick()).toBe(1);
      tracker.clearTick();
      expect(tracker.getTick()).toBe(2);
    });
  });

  describe('history tracking', () => {
    it('should record change history', () => {
      tracker.markDirty('entity1', 'position', 'update');
      tracker.markDirty('entity2', 'health', 'add');

      const history = tracker.getHistoryForTick(0);
      expect(history.length).toBe(2);
      expect(history[0].entityId).toBe('entity1');
      expect(history[0].componentType).toBe('position');
      expect(history[0].changeType).toBe('update');
    });

    it('should prune old history', () => {
      // Default historyTicks is 5
      tracker.markDirty('entity1', 'position');

      for (let i = 0; i < 10; i++) {
        tracker.clearTick();
      }

      // Tick 0 should be pruned
      expect(tracker.getHistoryForTick(0).length).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should track marking statistics', () => {
      tracker.markDirty('entity1', 'position');
      tracker.markDirty('entity1', 'health');
      tracker.markDirty('entity2', 'position');

      const stats = tracker.getStats();
      expect(stats.totalMarks).toBe(3);
      expect(stats.marksThisTick).toBe(3);
      expect(stats.entitiesMarkedThisTick).toBe(2);
    });
  });

  describe('reset', () => {
    it('should fully reset state', () => {
      tracker.markDirty('entity1', 'position');
      tracker.clearTick();
      tracker.markDirty('entity2', 'health');

      tracker.reset();

      expect(tracker.getDirtyEntities().size).toBe(0);
      expect(tracker.getTick()).toBe(0);
      expect(tracker.getStats().totalMarks).toBe(0);
    });
  });
});
