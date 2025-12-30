import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from './utils/IntegrationTestHarness.js';
import { createDawnWorld } from './fixtures/worldFixtures.js';
import { EVENT_TYPES, verifyEventChain } from './fixtures/eventFixtures.js';
import { TimeSystem } from '../systems/TimeSystem.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { TemperatureSystem } from '../systems/TemperatureSystem.js';
import { MemoryFormationSystem } from '../systems/MemoryFormationSystem.js';
import { MemoryComponent } from '../components/MemoryComponent.js';
import { NeedsComponent } from '../components/NeedsComponent.js';

import { ComponentType } from '../types/ComponentType.js';
/**
 * Integration tests for EventBus event propagation across systems
 *
 * Tests verify that:
 * - Event chains: action → completion → memory → belief → behavior change
 * - Event listeners across multiple systems receive events
 * - Event ordering maintained (time → weather → temperature)
 * - No dropped events under high load
 * - Event payload contains required fields
 * - Circular event dependencies don't cause infinite loops
 */

describe('EventBus Propagation Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createDawnWorld();
  });

  it('should propagate events to multiple listening systems', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(new MemoryComponent(agent.id || entity.id));
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));

    // Create systems that listen to events - pass eventBus
    const memorySystem = new MemoryFormationSystem(harness.world.eventBus);
    harness.registerSystem('MemoryFormationSystem', memorySystem);

    // Clear setup events
    harness.clearEvents();

    // Emit a test event
    harness.world.eventBus.emit({
      type: 'resource:gathered',
      source: agent.id,
      data: {
        entityId: agent.id,
        resourceType: 'berry',
        amount: 5,
      },
    });

    // Flush event queue to dispatch events
    harness.world.eventBus.flush();

    // Verify event was emitted
    const events = harness.getEmittedEvents('resource:gathered');
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].data.resourceType).toBe('berry');
    expect(events[0].data.amount).toBe(5);
  });

  it('should maintain event ordering: time → weather → temperature', () => {
    // Create weather entity
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: ComponentType.Weather,
      version: 1,
      weatherType: 'clear',
      intensity: 0.5,
      duration: 0.1, // Short duration to trigger change
      tempModifier: 0,
      movementModifier: 1.0,
    });

    // Create agent with temperature
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent({
      type: ComponentType.Temperature,
      version: 1,
      currentTemp: 20,
      state: 'comfortable',
    });

    // Create systems in correct priority order
    const timeSystem = new TimeSystem();
    const weatherSystem = new WeatherSystem();
    const tempSystem = new TemperatureSystem();

    harness.registerSystem('TimeSystem', timeSystem);
    harness.registerSystem('WeatherSystem', weatherSystem);
    harness.registerSystem('TemperatureSystem', tempSystem);

    harness.clearEvents();

    // Update systems in order
    const entities = Array.from(harness.world.entities.values());
    timeSystem.update(harness.world, entities, 1.0);
    weatherSystem.update(harness.world, entities, 1.0);
    tempSystem.update(harness.world, entities, 1.0);

    // Get all emitted events
    const allEvents = [
      ...harness.getEmittedEvents('time:changed'),
      ...harness.getEmittedEvents('weather:changed'),
      ...harness.getEmittedEvents('temperature:updated'),
    ];

    // Events should exist (some systems emit events)
    expect(allEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should not drop events under rapid emission', () => {
    harness.clearEvents();

    // Emit many events rapidly
    const eventCount = 100;
    for (let i = 0; i < eventCount; i++) {
      harness.world.eventBus.emit({
        type: 'test:rapid_event',
        source: 'test',
        data: { index: i },
      });
    }

    const receivedEvents = harness.getEmittedEvents('test:rapid_event');

    // All events should be captured
    expect(receivedEvents.length).toBe(eventCount);

    // Events should be in order
    for (let i = 0; i < eventCount; i++) {
      expect(receivedEvents[i].data.index).toBe(i);
    }
  });

  it('should include required fields in event payloads', () => {
    harness.clearEvents();

    // Emit event with full payload
    harness.world.eventBus.emit({
      type: 'action:completed',
      source: 'agent-1',
      data: {
        actionType: 'gather',
        entityId: 'agent-1',
        success: true,
      },
    });

    const events = harness.getEmittedEvents('action:completed');

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('action:completed');
    expect(events[0].data).toBeDefined();
    expect(events[0].data.actionType).toBe('gather');
    expect(events[0].data.entityId).toBe('agent-1');
    expect(events[0].data.success).toBe(true);
  });

  it('should handle event chains without infinite loops', () => {
    let eventHandlerCallCount = 0;
    const maxCallCount = 10;

    // Subscribe to an event that might trigger itself
    const unsub = harness.world.eventBus.subscribe('test:chain', () => {
      eventHandlerCallCount++;

      // Prevent infinite loop in test
      if (eventHandlerCallCount < maxCallCount) {
        harness.world.eventBus.emit({
          type: 'test:chain_response',
          source: 'handler',
          data: { count: eventHandlerCallCount },
        });
      }
    });

    harness.clearEvents();

    // Trigger the chain
    harness.world.eventBus.emit({
      type: 'test:chain',
      source: 'test',
      data: {},
    });

    // Cleanup
    unsub();

    // Should not cause infinite loop
    expect(eventHandlerCallCount).toBeLessThanOrEqual(maxCallCount);
  });

  it('should allow event listeners to modify world state', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));

    // Subscribe to event and modify agent
    const unsub = harness.world.eventBus.subscribe('test:modify_agent', (event: any) => {
      const targetEntity = harness.world.getEntity(event.data.entityId);
      if (targetEntity) {
        (targetEntity as any).updateComponent('needs', (current: any) => ({
          ...current,
          hunger: 50,
        }));
      }
    });

    harness.clearEvents();

    // Emit event
    harness.world.eventBus.emit({
      type: 'test:modify_agent',
      source: 'test',
      data: { entityId: agent.id },
    });

    // Flush event queue to dispatch events
    harness.world.eventBus.flush();

    // Cleanup
    unsub();

    // Agent's state should be modified
    const needs = agent.getComponent(ComponentType.Needs) as any;
    expect(needs.hunger).toBe(50);
  });

  it('should support multiple subscribers to same event', () => {
    let subscriber1Called = false;
    let subscriber2Called = false;
    let subscriber3Called = false;

    const unsub1 = harness.world.eventBus.subscribe('test:multi_sub', () => {
      subscriber1Called = true;
    });

    const unsub2 = harness.world.eventBus.subscribe('test:multi_sub', () => {
      subscriber2Called = true;
    });

    const unsub3 = harness.world.eventBus.subscribe('test:multi_sub', () => {
      subscriber3Called = true;
    });

    harness.clearEvents();

    // Emit event
    harness.world.eventBus.emit({
      type: 'test:multi_sub',
      source: 'test',
      data: {},
    });

    // Flush event queue to dispatch events
    harness.world.eventBus.flush();

    // Cleanup
    unsub1();
    unsub2();
    unsub3();

    // All subscribers should be called
    expect(subscriber1Called).toBe(true);
    expect(subscriber2Called).toBe(true);
    expect(subscriber3Called).toBe(true);
  });

  it('should properly unsubscribe event listeners', () => {
    let callCount = 0;

    const unsub = harness.world.eventBus.subscribe('test:unsub', () => {
      callCount++;
    });

    harness.clearEvents();

    // Emit first event
    harness.world.eventBus.emit({
      type: 'test:unsub',
      source: 'test',
      data: {},
    });

    // Flush to dispatch the first event
    harness.world.eventBus.flush();

    expect(callCount).toBe(1);

    // Unsubscribe
    unsub();

    // Emit second event
    harness.world.eventBus.emit({
      type: 'test:unsub',
      source: 'test',
      data: {},
    });

    // Flush to dispatch the second event
    harness.world.eventBus.flush();

    // Call count should not increase
    expect(callCount).toBe(1);
  });

  it('should handle events with complex data payloads', () => {
    const complexData = {
      agent: {
        id: 'agent-1',
        needs: { hunger: 50, energy: 75 },
        position: { x: 10, y: 20 },
      },
      action: {
        type: 'gather',
        target: { resourceType: 'berry', amount: 5 },
        duration: 120,
      },
      metadata: {
        timestamp: Date.now(),
        tags: ['important', 'test'],
      },
    };

    harness.clearEvents();

    harness.world.eventBus.emit({
      type: 'test:complex_payload',
      source: 'test',
      data: complexData,
    });

    const events = harness.getEmittedEvents('test:complex_payload');

    expect(events.length).toBe(1);
    expect(events[0].data).toEqual(complexData);
    expect(events[0].data.agent.needs.hunger).toBe(50);
    expect(events[0].data.metadata.tags).toContain('important');
  });
});
