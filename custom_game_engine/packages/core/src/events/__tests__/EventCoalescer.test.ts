/**
 * Tests for EventCoalescer - event deduplication and coalescing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventCoalescer } from '../EventCoalescer.js';
import type { GameEvent } from '../GameEvent.js';

describe('EventCoalescer', () => {
  let coalescer: EventCoalescer;

  beforeEach(() => {
    coalescer = new EventCoalescer();
  });

  describe('Deduplication Strategy', () => {
    it('removes exact duplicate events', () => {
      const events: GameEvent[] = [
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1' },
        },
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1' },
        },
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1' },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('agent:idle');
      expect(result[0].source).toBe('agent1');
    });

    it('keeps events with different sources', () => {
      const events: GameEvent[] = [
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1' },
        },
        {
          type: 'agent:idle',
          source: 'agent2',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent2' },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(2);
    });

    it('keeps events with different data', () => {
      const events: GameEvent[] = [
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', location: { x: 0, y: 0 } },
        },
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', location: { x: 10, y: 10 } },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(2);
    });
  });

  describe('Last-Value Strategy', () => {
    it('keeps only the last event per source', () => {
      const events: GameEvent[] = [
        {
          type: 'behavior:change',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', from: 'idle', to: 'gathering' },
        },
        {
          type: 'behavior:change',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { agentId: 'agent1', from: 'gathering', to: 'building' },
        },
        {
          type: 'behavior:change',
          source: 'agent1',
          tick: 102,
          timestamp: Date.now(),
          data: { agentId: 'agent1', from: 'building', to: 'resting' },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(1);
      expect(result[0].data).toEqual({
        agentId: 'agent1',
        from: 'building',
        to: 'resting',
      });
    });

    it('keeps last event per unique source', () => {
      const events: GameEvent[] = [
        {
          type: 'behavior:change',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', from: 'idle', to: 'gathering' },
        },
        {
          type: 'behavior:change',
          source: 'agent2',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent2', from: 'idle', to: 'building' },
        },
        {
          type: 'behavior:change',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { agentId: 'agent1', from: 'gathering', to: 'resting' },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(2);
      const agent1Event = result.find((e) => e.source === 'agent1');
      const agent2Event = result.find((e) => e.source === 'agent2');

      expect(agent1Event?.data).toEqual({
        agentId: 'agent1',
        from: 'gathering',
        to: 'resting',
      });
      expect(agent2Event?.data).toEqual({
        agentId: 'agent2',
        from: 'idle',
        to: 'building',
      });
    });
  });

  describe('Accumulate Strategy', () => {
    it('sums field values across events', () => {
      const events: GameEvent[] = [
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 10 },
        },
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 15 },
        },
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 102,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 20 },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(1);
      expect(result[0].data).toMatchObject({
        agentId: 'agent1',
        skill: 'farming',
        xp: 45, // 10 + 15 + 20
      });
    });

    it('accumulates per source separately', () => {
      const events: GameEvent[] = [
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 10 },
        },
        {
          type: 'agent:xp_gained',
          source: 'agent2',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent2', skill: 'farming', xp: 5 },
        },
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 15 },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(2);
      const agent1Event = result.find((e) => e.source === 'agent1');
      const agent2Event = result.find((e) => e.source === 'agent2');

      expect(agent1Event?.data).toMatchObject({ xp: 25 }); // 10 + 15
      expect(agent2Event?.data).toMatchObject({ xp: 5 });
    });

    it('does not mutate original events', () => {
      const events: GameEvent[] = [
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 10 },
        },
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 15 },
        },
      ];

      const originalXp = (events[0].data as { xp: number }).xp;
      coalescer.coalesce(events);

      expect((events[0].data as { xp: number }).xp).toBe(originalXp);
    });
  });

  describe('None Strategy (default)', () => {
    it('keeps all events for unknown types', () => {
      const events: GameEvent[] = [
        {
          type: 'agent:action:started',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { actionId: '1', actionType: 'till' },
        },
        {
          type: 'agent:action:started',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { actionId: '2', actionType: 'plant' },
        },
        {
          type: 'agent:action:started',
          source: 'agent1',
          tick: 102,
          timestamp: Date.now(),
          data: { actionId: '3', actionType: 'harvest' },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(3);
    });
  });

  describe('Mixed Strategies', () => {
    it('applies different strategies to different event types', () => {
      const events: GameEvent[] = [
        // Deduplicate (agent:idle)
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1' },
        },
        {
          type: 'agent:idle',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1' },
        },
        // Last-value (behavior:change)
        {
          type: 'behavior:change',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', from: 'idle', to: 'gathering' },
        },
        {
          type: 'behavior:change',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { agentId: 'agent1', from: 'gathering', to: 'resting' },
        },
        // Accumulate (agent:xp_gained)
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 10 },
        },
        {
          type: 'agent:xp_gained',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { agentId: 'agent1', skill: 'farming', xp: 15 },
        },
        // None (agent:action:started)
        {
          type: 'agent:action:started',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { actionId: '1', actionType: 'till' },
        },
        {
          type: 'agent:action:started',
          source: 'agent1',
          tick: 101,
          timestamp: Date.now(),
          data: { actionId: '2', actionType: 'plant' },
        },
      ];

      const result = coalescer.coalesce(events);

      // 1 idle, 1 behavior:change (last), 1 xp_gained (accumulated), 2 action:started
      expect(result).toHaveLength(5);

      const idleEvents = result.filter((e) => e.type === 'agent:idle');
      const behaviorEvents = result.filter((e) => e.type === 'behavior:change');
      const xpEvents = result.filter((e) => e.type === 'agent:xp_gained');
      const actionEvents = result.filter((e) => e.type === 'agent:action:started');

      expect(idleEvents).toHaveLength(1);
      expect(behaviorEvents).toHaveLength(1);
      expect(behaviorEvents[0].data).toMatchObject({ to: 'resting' });
      expect(xpEvents).toHaveLength(1);
      expect(xpEvents[0].data).toMatchObject({ xp: 25 });
      expect(actionEvents).toHaveLength(2);
    });
  });

  describe('Custom Strategies', () => {
    it('allows setting custom strategies', () => {
      // Set custom strategy for a type that normally has 'none'
      coalescer.setStrategy('agent:action:started', { type: 'deduplicate' });

      const events: GameEvent[] = [
        {
          type: 'agent:action:started',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { actionId: '1', actionType: 'till' },
        },
        {
          type: 'agent:action:started',
          source: 'agent1',
          tick: 100,
          timestamp: Date.now(),
          data: { actionId: '1', actionType: 'till' },
        },
      ];

      const result = coalescer.coalesce(events);

      expect(result).toHaveLength(1);
    });
  });

  describe('Performance', () => {
    it('handles 1000 events in under 100ms', () => {
      const events: GameEvent[] = [];

      // Generate 1000 events
      for (let i = 0; i < 1000; i++) {
        events.push({
          type: 'behavior:change',
          source: `agent${i % 100}`, // 100 unique agents
          tick: 100 + i,
          timestamp: Date.now(),
          data: { agentId: `agent${i % 100}`, from: 'idle', to: 'gathering' },
        });
      }

      const start = performance.now();
      const result = coalescer.coalesce(events);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(result.length).toBeLessThan(events.length); // Should coalesce
      expect(result.length).toBe(100); // One per agent
    });
  });

  describe('getStats', () => {
    it('calculates reduction statistics correctly', () => {
      const stats = coalescer.getStats(100, 60);

      expect(stats).toEqual({
        eventsIn: 100,
        eventsOut: 60,
        eventsSkipped: 40,
        reductionPercent: 40,
      });
    });

    it('handles zero events', () => {
      const stats = coalescer.getStats(0, 0);

      expect(stats.reductionPercent).toBe(0);
    });

    it('handles no reduction', () => {
      const stats = coalescer.getStats(100, 100);

      expect(stats.reductionPercent).toBe(0);
    });
  });

  describe('Empty Input', () => {
    it('handles empty event array', () => {
      const result = coalescer.coalesce([]);

      expect(result).toEqual([]);
    });
  });
});
