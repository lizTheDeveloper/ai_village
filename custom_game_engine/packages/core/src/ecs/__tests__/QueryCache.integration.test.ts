import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World.js';
import { EventBusImpl } from '../../events/EventBus.js';

function createTestWorld(): World {
  const eventBus = new EventBusImpl();
  return new World(eventBus);
}

describe('QueryCache Integration', () => {
  let world: World;

  beforeEach(() => {
    world = createTestWorld();
  });

  describe('query caching with world mutations', () => {
    it('should cache component-only queries', () => {
      // Create entities - use world.addComponent for proper versioning
      const agent1 = world.createEntity();
      world.addComponent(agent1.id, { type: 'agent', version: 1, name: 'Alice' });

      const agent2 = world.createEntity();
      world.addComponent(agent2.id, { type: 'agent', version: 1, name: 'Bob' });

      // Query 1: Cache miss
      const results1 = world.query().with('agent').executeEntities();
      expect(results1).toHaveLength(2);

      const stats1 = world.queryCache.getStats();
      expect(stats1.misses).toBe(1);
      expect(stats1.hits).toBe(0);

      // Query 2: Same query, cache hit
      const results2 = world.query().with('agent').executeEntities();
      expect(results2).toHaveLength(2);

      const stats2 = world.queryCache.getStats();
      expect(stats2.hits).toBe(1);
      expect(stats2.misses).toBe(1);
    });

    it('should invalidate cache when entity is added', () => {
      const agent1 = world.createEntity();
      world.addComponent(agent1.id, { type: 'agent', version: 1, name: 'Alice' });

      // Query 1: Cache miss
      const results1 = world.query().with('agent').executeEntities();
      expect(results1).toHaveLength(1);

      // Add entity: Version increments
      const agent2 = world.createEntity();
      world.addComponent(agent2.id, { type: 'agent', version: 1, name: 'Bob' });

      // Query 2: Cache invalidated, cache miss
      const results2 = world.query().with('agent').executeEntities();
      expect(results2).toHaveLength(2);

      const stats = world.queryCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
      expect(stats.invalidations).toBe(1); // First query was cached, then invalidated
    });

    it('should invalidate cache when component is added', () => {
      const entity = world.createEntity();

      // Query agents: Empty
      const results1 = world.query().with('agent').executeEntities();
      expect(results1).toHaveLength(0);

      // Add agent component via world API: Version increments
      world.addComponent(entity.id, { type: 'agent', version: 1, name: 'Alice' });

      // Query again: Should find new agent
      const results2 = world.query().with('agent').executeEntities();
      expect(results2).toHaveLength(1);

      const stats = world.queryCache.getStats();
      expect(stats.misses).toBe(2); // Both queries miss (first empty, second invalidated)
    });

    it('should invalidate cache when component is removed', () => {
      const agent = world.createEntity();
      world.addComponent(agent.id, { type: 'agent', version: 1, name: 'Alice' });

      // Query 1: Find agent
      const results1 = world.query().with('agent').executeEntities();
      expect(results1).toHaveLength(1);

      // Remove component via world API: Version increments
      world.removeComponent(agent.id, 'agent');

      // Query 2: Agent gone
      const results2 = world.query().with('agent').executeEntities();
      expect(results2).toHaveLength(0);

      const stats = world.queryCache.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should invalidate cache when entity is destroyed', () => {
      const agent1 = world.createEntity();
      world.addComponent(agent1.id, { type: 'agent', version: 1, name: 'Alice' });

      const agent2 = world.createEntity();
      world.addComponent(agent2.id, { type: 'agent', version: 1, name: 'Bob' });

      // Query 1: Find 2 agents
      const results1 = world.query().with('agent').executeEntities();
      expect(results1).toHaveLength(2);

      // Destroy entity: Version increments
      world.destroyEntity(agent1.id, 'test');

      // Query 2: Only 1 agent remains
      const results2 = world.query().with('agent').executeEntities();
      expect(results2).toHaveLength(1);

      const stats = world.queryCache.getStats();
      expect(stats.misses).toBe(2);
    });
  });

  describe('cache hit patterns', () => {
    it('should achieve high hit rate for repeated queries', () => {
      const agent = world.createEntity();
      world.addComponent(agent.id, { type: 'agent', version: 1, name: 'Alice' });

      // 1 miss, then 9 hits
      for (let i = 0; i < 10; i++) {
        world.query().with('agent').executeEntities();
      }

      const stats = world.queryCache.getStats();
      expect(stats.hits).toBe(9);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.9); // 90% hit rate
    });

    it('should cache different queries independently', () => {
      const agent = world.createEntity();
      world.addComponent(agent.id, { type: 'agent', version: 1, name: 'Alice' });
      world.addComponent(agent.id, { type: 'position', version: 1, x: 0, y: 0, chunkX: 0, chunkY: 0 });

      const building = world.createEntity();
      world.addComponent(building.id, { type: 'building', version: 1, buildingType: 'house' });

      // Query agents: Miss
      world.query().with('agent').executeEntities();

      // Query buildings: Miss
      world.query().with('building').executeEntities();

      // Query agents with position: Miss
      world.query().with('agent').with('position').executeEntities();

      // Repeat all queries: 3 hits
      world.query().with('agent').executeEntities();
      world.query().with('building').executeEntities();
      world.query().with('agent').with('position').executeEntities();

      const stats = world.queryCache.getStats();
      expect(stats.size).toBe(3); // 3 different queries cached
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(3);
    });

    it('should handle without filters correctly', () => {
      const agent = world.createEntity();
      world.addComponent(agent.id, { type: 'agent', version: 1, name: 'Alice' });

      const deadAgent = world.createEntity();
      world.addComponent(deadAgent.id, { type: 'agent', version: 1, name: 'Bob' });
      world.addComponent(deadAgent.id, { type: 'dead', version: 1, cause: 'test' });

      // Query living agents: Miss
      const results1 = world
        .query()
        .with('agent')
        .without('dead')
        .executeEntities();
      expect(results1).toHaveLength(1);

      // Repeat: Hit
      const results2 = world
        .query()
        .with('agent')
        .without('dead')
        .executeEntities();
      expect(results2).toHaveLength(1);

      const stats = world.queryCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('non-cacheable queries', () => {
    it('should not cache spatial queries', () => {
      const entity = world.createEntity();
      world.addComponent(entity.id, { type: 'position', version: 1, x: 5, y: 5, chunkX: 0, chunkY: 0 });

      // Spatial queries should bypass cache
      world.query().inRect(0, 0, 10, 10).executeEntities();
      world.query().inRect(0, 0, 10, 10).executeEntities();

      const stats = world.queryCache.getStats();
      expect(stats.hits).toBe(0); // No caching for spatial queries
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0); // Nothing cached
    });

    it('should not cache tag queries', () => {
      const entity = world.createEntity();
      world.addComponent(entity.id, { type: 'tags', version: 1, tags: ['test'] });

      // Tag queries should bypass cache
      world.query().withTags('test').executeEntities();
      world.query().withTags('test').executeEntities();

      const stats = world.queryCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should not cache proximity queries', () => {
      const entity1 = world.createEntity();
      world.addComponent(entity1.id, { type: 'position', version: 1, x: 0, y: 0, chunkX: 0, chunkY: 0 });

      const entity2 = world.createEntity();
      world.addComponent(entity2.id, { type: 'position', version: 1, x: 5, y: 5, chunkX: 0, chunkY: 0 });

      // Proximity queries should bypass cache
      world.query().near(entity1.id, 10).executeEntities();
      world.query().near(entity1.id, 10).executeEntities();

      const stats = world.queryCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('version tracking', () => {
    it('should increment version on entity creation', () => {
      const v1 = world.archetypeVersion;

      world.createEntity();

      const v2 = world.archetypeVersion;
      expect(v2).toBe(v1 + 1);
    });

    it('should increment version on component addition', () => {
      const entity = world.createEntity();
      const v1 = world.archetypeVersion;

      world.addComponent(entity.id, { type: 'agent', version: 1, name: 'Alice' });

      const v2 = world.archetypeVersion;
      expect(v2).toBe(v1 + 1);
    });

    it('should increment version on component removal', () => {
      const entity = world.createEntity();
      world.addComponent(entity.id, { type: 'agent', version: 1, name: 'Alice' });

      const v1 = world.archetypeVersion;

      world.removeComponent(entity.id, 'agent');

      const v2 = world.archetypeVersion;
      expect(v2).toBe(v1 + 1);
    });

    it('should increment version on entity destruction', () => {
      const entity = world.createEntity();
      const v1 = world.archetypeVersion;

      world.destroyEntity(entity.id, 'test');

      const v2 = world.archetypeVersion;
      expect(v2).toBe(v1 + 1);
    });
  });
});
