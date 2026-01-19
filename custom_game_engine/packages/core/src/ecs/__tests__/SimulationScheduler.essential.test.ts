/**
 * Test for essential entity tracking in SimulationScheduler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationScheduler, SimulationMode } from '../SimulationScheduler.js';
import { WorldImpl } from '../World.js';
import { EntityImpl, createEntityId } from '../Entity.js';
import type { World } from '../World.js';
import type { Entity } from '../Entity.js';
import type { ComponentType } from '../../types/ComponentType.js';

describe('SimulationScheduler - Essential Entity Tracking', () => {
  let world: World;
  let scheduler: SimulationScheduler;

  beforeEach(() => {
    world = new WorldImpl();
    scheduler = new SimulationScheduler();
  });

  describe('Active conversation entities', () => {
    it('should simulate entities in active conversations even when off-screen', () => {
      // Create an agent (for proximity checks)
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent({ type: 'agent', version: 1 });
      agent.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      world.addEntity(agent);

      // Create a wild animal far from the agent
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent({ type: 'animal', version: 1, wild: true, speciesId: 'test', name: 'Test Animal' });
      animal.addComponent({ type: 'position', version: 1, x: 100, y: 100, z: 0 }); // Far away
      animal.addComponent({
        type: 'conversation',
        version: 1,
        isActive: true,
        partnerId: agent.id,
        participantIds: [animal.id, agent.id],
        messages: [],
        maxMessages: 10,
        startedAt: 0,
        lastMessageAt: 0,
        socialFatigue: 0,
        fatigueThreshold: 70
      });
      world.addEntity(animal);

      // Update scheduler with agent positions
      scheduler.updateAgentPositions(world);

      // Filter entities - animal should be included despite being far away due to active conversation
      const entities = [animal];
      const activeEntities = scheduler.filterActiveEntities(entities, 0);

      expect(activeEntities).toContain(animal);
    });

    it('should not simulate entities with inactive conversations when off-screen', () => {
      // Create an agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent({ type: 'agent', version: 1 });
      agent.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      world.addEntity(agent);

      // Create a wild animal far from the agent with inactive conversation
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent({ type: 'animal', version: 1, wild: true, speciesId: 'test', name: 'Test Animal' });
      animal.addComponent({ type: 'position', version: 1, x: 100, y: 100, z: 0 });
      animal.addComponent({
        type: 'conversation',
        version: 1,
        isActive: false, // Not active
        partnerId: null,
        participantIds: [],
        messages: [],
        maxMessages: 10,
        startedAt: 0,
        lastMessageAt: 0,
        socialFatigue: 0,
        fatigueThreshold: 70
      });
      world.addEntity(animal);

      scheduler.updateAgentPositions(world);

      const entities = [animal];
      const activeEntities = scheduler.filterActiveEntities(entities, 0);

      expect(activeEntities).not.toContain(animal);
    });
  });

  describe('Tamed animal entities', () => {
    it('should simulate tamed animals even when off-screen', () => {
      // Create an agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent({ type: 'agent', version: 1 });
      agent.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      world.addEntity(agent);

      // Create a tamed animal far from the agent
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent({ type: 'animal', version: 1, wild: false, speciesId: 'test', name: 'Tamed Animal' }); // wild: false = tamed
      animal.addComponent({ type: 'position', version: 1, x: 100, y: 100, z: 0 });
      world.addEntity(animal);

      scheduler.updateAgentPositions(world);

      const entities = [animal];
      const activeEntities = scheduler.filterActiveEntities(entities, 0);

      expect(activeEntities).toContain(animal);
    });

    it('should simulate animals with owners even when off-screen', () => {
      // Create an agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent({ type: 'agent', version: 1 });
      agent.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      world.addEntity(agent);

      // Create an animal with an owner far from the agent
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent({
        type: 'animal',
        version: 1,
        wild: true, // Still wild but has owner
        ownerId: agent.id,
        speciesId: 'test',
        name: 'Owned Animal'
      });
      animal.addComponent({ type: 'position', version: 1, x: 100, y: 100, z: 0 });
      world.addEntity(animal);

      scheduler.updateAgentPositions(world);

      const entities = [animal];
      const activeEntities = scheduler.filterActiveEntities(entities, 0);

      expect(activeEntities).toContain(animal);
    });

    it('should not simulate wild animals without owners when off-screen', () => {
      // Create an agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent({ type: 'agent', version: 1 });
      agent.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      world.addEntity(agent);

      // Create a wild animal far from the agent
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent({ type: 'animal', version: 1, wild: true, speciesId: 'test', name: 'Wild Animal' });
      animal.addComponent({ type: 'position', version: 1, x: 100, y: 100, z: 0 });
      world.addEntity(animal);

      scheduler.updateAgentPositions(world);

      const entities = [animal];
      const activeEntities = scheduler.filterActiveEntities(entities, 0);

      expect(activeEntities).not.toContain(animal);
    });
  });

  describe('Companion entities', () => {
    it('should always simulate companion entities even when off-screen', () => {
      // Create an agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent({ type: 'agent', version: 1 });
      agent.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      world.addEntity(agent);

      // Create a companion entity far from the agent
      const companion = new EntityImpl(createEntityId(), 0);
      companion.addComponent({ type: 'companion', version: 1 });
      companion.addComponent({ type: 'position', version: 1, x: 100, y: 100, z: 0 });
      world.addEntity(companion);

      scheduler.updateAgentPositions(world);

      const entities = [companion];
      const activeEntities = scheduler.filterActiveEntities(entities, 0);

      expect(activeEntities).toContain(companion);
    });
  });

  describe('Multiple essential criteria', () => {
    it('should handle entities with multiple essential criteria', () => {
      // Create an agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent({ type: 'agent', version: 1 });
      agent.addComponent({ type: 'position', version: 1, x: 0, y: 0, z: 0 });
      world.addEntity(agent);

      // Create a tamed animal in an active conversation far from the agent
      const animal = new EntityImpl(createEntityId(), 0);
      animal.addComponent({ type: 'animal', version: 1, wild: false, ownerId: agent.id, speciesId: 'test', name: 'Tamed Talking Animal' });
      animal.addComponent({ type: 'position', version: 1, x: 100, y: 100, z: 0 });
      animal.addComponent({
        type: 'conversation',
        version: 1,
        isActive: true,
        partnerId: agent.id,
        participantIds: [animal.id, agent.id],
        messages: [],
        maxMessages: 10,
        startedAt: 0,
        lastMessageAt: 0,
        socialFatigue: 0,
        fatigueThreshold: 70
      });
      world.addEntity(animal);

      scheduler.updateAgentPositions(world);

      const entities = [animal];
      const activeEntities = scheduler.filterActiveEntities(entities, 0);

      expect(activeEntities).toContain(animal);
    });
  });
});
