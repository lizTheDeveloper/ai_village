import { describe, it, expect, beforeEach } from 'vitest';
import { CityManager } from '../CityManager.js';
import { World } from '../../ecs/WorldImpl.js';
import { EventBusImpl } from '../../events/EventBusImpl.js';

describe('CityManager', () => {
  let cityManager: CityManager;
  let world: World;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    cityManager = new CityManager({
      decisionInterval: 14400,
      statsUpdateInterval: 200,
      allowManualOverride: true,
    });

    eventBus = new EventBusImpl();
    world = new World(eventBus);

    // Initialize event subscriptions
    cityManager.initialize(eventBus);
  });

  describe('Death Tracking', () => {
    it('should track recent deaths from agent:died events', () => {
      // Initially no deaths
      expect(cityManager.getRecentDeaths()).toHaveLength(0);

      // Emit a death event
      eventBus.emit({
        type: 'agent:died',
        source: 'test-agent-1',
        data: {
          entityId: 'test-agent-1',
          name: 'Test Agent',
          causeOfDeath: 'starvation',
          destinationRealm: 'afterlife',
          routingReason: 'no_deity',
        },
      });

      // Should have 1 death tracked
      const deaths = cityManager.getRecentDeaths();
      expect(deaths).toHaveLength(1);
      expect(deaths[0].entityId).toBe('test-agent-1');
      expect(deaths[0].causeOfDeath).toBe('starvation');
    });

    it('should track multiple deaths', () => {
      // Emit multiple death events
      for (let i = 1; i <= 3; i++) {
        eventBus.emit({
          type: 'agent:died',
          source: `test-agent-${i}`,
          data: {
            entityId: `test-agent-${i}`,
            name: `Test Agent ${i}`,
            causeOfDeath: 'combat',
            destinationRealm: 'afterlife',
            routingReason: 'no_deity',
          },
        });
      }

      expect(cityManager.getRecentDeaths()).toHaveLength(3);
    });

    it('should clean up old deaths after 24 in-game hours', () => {
      // Emit a death event at tick 0
      eventBus.emit({
        type: 'agent:died',
        source: 'test-agent-old',
        data: {
          entityId: 'test-agent-old',
          name: 'Old Agent',
          causeOfDeath: 'old_age',
          destinationRealm: 'afterlife',
          routingReason: 'no_deity',
        },
      });

      expect(cityManager.getRecentDeaths()).toHaveLength(1);

      // Advance time by 24 in-game hours + 1 tick (1,728,001 ticks)
      // The cleanup happens in analyzeCity -> countRecentDeaths
      for (let i = 0; i < 1_728_001; i++) {
        world.tick++;
      }

      // Analyze city to trigger cleanup
      const stats = cityManager.analyzeCity(world);

      // Old death should be cleaned up
      expect(stats.recentDeaths).toBe(0);
      expect(cityManager.getRecentDeaths()).toHaveLength(0);
    });

    it('should include recent deaths in city stats', () => {
      // Emit some death events
      for (let i = 1; i <= 5; i++) {
        eventBus.emit({
          type: 'agent:died',
          source: `test-agent-${i}`,
          data: {
            entityId: `test-agent-${i}`,
            name: `Test Agent ${i}`,
            causeOfDeath: 'disease',
            destinationRealm: 'afterlife',
            routingReason: 'no_deity',
          },
        });
      }

      // Analyze city
      const stats = cityManager.analyzeCity(world);

      // Should count all recent deaths
      expect(stats.recentDeaths).toBe(5);
    });

    it('should affect city focus when deaths occur', () => {
      // Create a city with some population but recent deaths
      // (Would need to add agents to world for full test, but we can verify the stats)

      // Emit death events
      for (let i = 1; i <= 2; i++) {
        eventBus.emit({
          type: 'agent:died',
          source: `test-agent-${i}`,
          data: {
            entityId: `test-agent-${i}`,
            name: `Test Agent ${i}`,
            causeOfDeath: 'predator_attack',
            destinationRealm: 'afterlife',
            routingReason: 'no_deity',
          },
        });
      }

      const stats = cityManager.analyzeCity(world);
      expect(stats.recentDeaths).toBe(2);

      // With deaths and no threats, city should be in security mode
      // (This is based on CityManager.inferFocus logic at line 368)
      const decision = cityManager.makeDecision(stats, world.tick);
      expect(decision.reasoning.focus).toBe('security');
    });
  });
});
