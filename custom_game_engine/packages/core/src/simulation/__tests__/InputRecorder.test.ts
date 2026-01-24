import { describe, it, expect, beforeEach } from 'vitest';
import { InputRecorder, type GameInput } from '../InputRecorder.js';

describe('InputRecorder', () => {
  let recorder: InputRecorder;

  beforeEach(() => {
    recorder = new InputRecorder();
  });

  describe('record', () => {
    it('should record input', () => {
      const input: GameInput = {
        tick: 10,
        playerId: 'player1',
        type: 'move',
        data: { x: 5, y: 10 },
      };
      recorder.record(input);
      expect(recorder.getInputCount()).toBe(1);
    });

    it('should record multiple inputs', () => {
      recorder.record({ tick: 10, playerId: 'p1', type: 'move', data: {} });
      recorder.record({ tick: 20, playerId: 'p2', type: 'action', data: {} });
      recorder.record({ tick: 30, playerId: 'p3', type: 'build', data: {} });
      expect(recorder.getInputCount()).toBe(3);
    });
  });

  describe('getInputsForTick', () => {
    it('should return inputs for specific tick', () => {
      recorder.record({ tick: 10, playerId: 'p1', type: 'move', data: {} });
      recorder.record({ tick: 10, playerId: 'p2', type: 'action', data: {} });
      recorder.record({ tick: 20, playerId: 'p1', type: 'move', data: {} });

      const tick10Inputs = recorder.getInputsForTick(10);
      expect(tick10Inputs).toHaveLength(2);
      expect(tick10Inputs.every(i => i.tick === 10)).toBe(true);
    });

    it('should return empty array for tick with no inputs', () => {
      expect(recorder.getInputsForTick(999)).toHaveLength(0);
    });

    it('should filter inputs correctly by tick', () => {
      recorder.record({ tick: 5, playerId: 'p1', type: 'move', data: {} });
      recorder.record({ tick: 10, playerId: 'p1', type: 'action', data: {} });
      recorder.record({ tick: 15, playerId: 'p1', type: 'build', data: {} });

      const tick10 = recorder.getInputsForTick(10);
      expect(tick10).toHaveLength(1);
      expect(tick10[0].type).toBe('action');
    });
  });

  describe('getInputsInRange', () => {
    beforeEach(() => {
      recorder.record({ tick: 5, playerId: 'p1', type: 'move', data: {} });
      recorder.record({ tick: 10, playerId: 'p2', type: 'action', data: {} });
      recorder.record({ tick: 15, playerId: 'p3', type: 'build', data: {} });
      recorder.record({ tick: 20, playerId: 'p4', type: 'command', data: {} });
      recorder.record({ tick: 25, playerId: 'p5', type: 'select', data: {} });
    });

    it('should return inputs in range (inclusive)', () => {
      const range = recorder.getInputsInRange(10, 20);
      expect(range).toHaveLength(3);
      expect(range.map(i => i.tick)).toEqual([10, 15, 20]);
    });

    it('should return empty array for range with no inputs', () => {
      const range = recorder.getInputsInRange(100, 200);
      expect(range).toHaveLength(0);
    });

    it('should include boundary ticks', () => {
      const range = recorder.getInputsInRange(5, 25);
      expect(range).toHaveLength(5);
    });

    it('should work with single tick range', () => {
      const range = recorder.getInputsInRange(15, 15);
      expect(range).toHaveLength(1);
      expect(range[0].tick).toBe(15);
    });
  });

  describe('checkpoints', () => {
    it('should store and retrieve checkpoint', () => {
      const state = { tick: 100, entities: [], worldData: 'test' };
      recorder.checkpoint(100, state);
      expect(recorder.getCheckpoint(100)).toEqual(state);
      expect(recorder.getCheckpointCount()).toBe(1);
    });

    it('should handle multiple checkpoints', () => {
      recorder.checkpoint(50, { tick: 50 });
      recorder.checkpoint(100, { tick: 100 });
      recorder.checkpoint(200, { tick: 200 });

      expect(recorder.getCheckpointCount()).toBe(3);
      expect(recorder.getCheckpoint(100)).toEqual({ tick: 100 });
    });

    it('should return null for non-existent checkpoint', () => {
      expect(recorder.getCheckpoint(999)).toBeNull();
    });

    it('should overwrite checkpoint at same tick', () => {
      recorder.checkpoint(100, { data: 'first' });
      recorder.checkpoint(100, { data: 'second' });

      expect(recorder.getCheckpointCount()).toBe(1);
      expect(recorder.getCheckpoint(100)).toEqual({ data: 'second' });
    });

    it('should find nearest checkpoint before target', () => {
      recorder.checkpoint(50, { tick: 50 });
      recorder.checkpoint(100, { tick: 100 });
      recorder.checkpoint(200, { tick: 200 });

      expect(recorder.findNearestCheckpoint(150)).toBe(100);
      expect(recorder.findNearestCheckpoint(250)).toBe(200);
      expect(recorder.findNearestCheckpoint(75)).toBe(50);
    });

    it('should return 0 when no checkpoint exists before target', () => {
      recorder.checkpoint(100, { tick: 100 });
      expect(recorder.findNearestCheckpoint(50)).toBe(0);
    });

    it('should return checkpoint tick when exact match exists', () => {
      recorder.checkpoint(50, { tick: 50 });
      recorder.checkpoint(100, { tick: 100 });

      expect(recorder.findNearestCheckpoint(100)).toBe(100);
    });

    it('should return 0 for empty checkpoints', () => {
      expect(recorder.findNearestCheckpoint(100)).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      recorder.record({ tick: 10, playerId: 'p1', type: 'move', data: {} });
      recorder.record({ tick: 20, playerId: 'p2', type: 'action', data: {} });
      recorder.checkpoint(10, { data: 'test' });
      recorder.checkpoint(20, { data: 'test2' });

      recorder.clear();

      expect(recorder.getInputCount()).toBe(0);
      expect(recorder.getCheckpointCount()).toBe(0);
      expect(recorder.getInputsForTick(10)).toHaveLength(0);
      expect(recorder.getCheckpoint(10)).toBeNull();
    });
  });

  describe('serialize', () => {
    it('should serialize inputs and checkpoint ticks', () => {
      recorder.record({ tick: 10, playerId: 'p1', type: 'move', data: { x: 1 } });
      recorder.record({ tick: 20, playerId: 'p2', type: 'action', data: { y: 2 } });
      recorder.checkpoint(10, { data: 'test' });
      recorder.checkpoint(20, { data: 'test2' });

      const serialized = recorder.serialize();

      expect(serialized.inputs).toHaveLength(2);
      expect(serialized.inputs[0]).toEqual({ tick: 10, playerId: 'p1', type: 'move', data: { x: 1 } });
      expect(serialized.checkpointTicks).toHaveLength(2);
      expect(serialized.checkpointTicks).toContain(10);
      expect(serialized.checkpointTicks).toContain(20);
    });

    it('should return empty arrays when no data', () => {
      const serialized = recorder.serialize();
      expect(serialized.inputs).toHaveLength(0);
      expect(serialized.checkpointTicks).toHaveLength(0);
    });

    it('should create independent copy of inputs', () => {
      const input = { tick: 10, playerId: 'p1', type: 'move' as const, data: {} };
      recorder.record(input);

      const serialized = recorder.serialize();
      serialized.inputs[0].tick = 999;

      // Original should not be affected
      expect(recorder.getInputsForTick(10)[0].tick).toBe(10);
    });
  });

  describe('input types', () => {
    it('should support all input types', () => {
      const types: Array<GameInput['type']> = ['move', 'action', 'build', 'command', 'select'];

      types.forEach((type, index) => {
        recorder.record({ tick: index, playerId: 'p1', type, data: {} });
      });

      expect(recorder.getInputCount()).toBe(5);
      types.forEach((type, index) => {
        const inputs = recorder.getInputsForTick(index);
        expect(inputs[0].type).toBe(type);
      });
    });

    it('should preserve input data', () => {
      const complexData = {
        position: { x: 100, y: 200 },
        target: 'entity_123',
        action: 'attack',
        modifiers: ['shift', 'ctrl'],
      };

      recorder.record({ tick: 10, playerId: 'p1', type: 'command', data: complexData });

      const retrieved = recorder.getInputsForTick(10)[0];
      expect(retrieved.data).toEqual(complexData);
    });
  });

  describe('deterministic replay scenarios', () => {
    it('should support replay from checkpoint', () => {
      // Simulate game progression with checkpoints
      recorder.record({ tick: 10, playerId: 'p1', type: 'move', data: { x: 1, y: 1 } });
      recorder.checkpoint(10, { playerPos: { x: 1, y: 1 } });

      recorder.record({ tick: 20, playerId: 'p1', type: 'move', data: { x: 2, y: 2 } });
      recorder.checkpoint(20, { playerPos: { x: 2, y: 2 } });

      recorder.record({ tick: 30, playerId: 'p1', type: 'action', data: { action: 'attack' } });
      recorder.checkpoint(30, { playerPos: { x: 2, y: 2 }, combat: true });

      // Replay from checkpoint 20 to 30
      const checkpointTick = recorder.findNearestCheckpoint(25);
      expect(checkpointTick).toBe(20);

      const state = recorder.getCheckpoint(checkpointTick);
      expect(state).toEqual({ playerPos: { x: 2, y: 2 } });

      const replayInputs = recorder.getInputsInRange(20, 30);
      expect(replayInputs).toHaveLength(2);
    });

    it('should support time travel scenarios', () => {
      // Record a sequence of inputs
      for (let tick = 0; tick < 100; tick += 10) {
        recorder.record({ tick, playerId: 'p1', type: 'move', data: { tick } });
        recorder.checkpoint(tick, { tick });
      }

      // Jump back to tick 50
      const nearestCheckpoint = recorder.findNearestCheckpoint(50);
      expect(nearestCheckpoint).toBe(50);

      // Get inputs from 50 to 70 for replay
      const inputs = recorder.getInputsInRange(50, 70);
      expect(inputs).toHaveLength(3);
      expect(inputs.map(i => i.tick)).toEqual([50, 60, 70]);
    });

    it('should handle multiplayer input synchronization', () => {
      // Multiple players acting on same tick
      recorder.record({ tick: 10, playerId: 'p1', type: 'move', data: { x: 1 } });
      recorder.record({ tick: 10, playerId: 'p2', type: 'move', data: { x: 2 } });
      recorder.record({ tick: 10, playerId: 'p3', type: 'action', data: { action: 'build' } });

      const tick10Inputs = recorder.getInputsForTick(10);
      expect(tick10Inputs).toHaveLength(3);

      const playerIds = tick10Inputs.map(i => i.playerId);
      expect(playerIds).toEqual(['p1', 'p2', 'p3']);
    });
  });
});
