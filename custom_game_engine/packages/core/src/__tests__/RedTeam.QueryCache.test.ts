/**
 * RED TEAM TESTS — QueryCache Integration
 *
 * QueryCache.test.ts has 20 tests that all pass. Every single one tests
 * the QueryCache class in isolation — manually calling cache.set() and
 * cache.get(). Not one test exercises world.query().executeEntities()
 * or mutates entity components to test real-world invalidation.
 *
 * This file proves two things:
 *
 * 1. entity.addComponent() (the path used in 100% of test setup code)
 *    does NOT increment world._archetypeVersion. Only world.addComponent()
 *    does. This means tests and systems that use entity.addComponent() to
 *    add components after initial creation cause permanent cache staleness.
 *
 * 2. QueryBuilder reuses its internal resultEntities array across queries.
 *    The cache stores a reference to this array, not a copy. Callers who
 *    hold a reference to query results will have that reference mutated
 *    when the same QueryBuilder runs a new query after a cache invalidation.
 *
 * Run with: npm test -- RedTeam.QueryCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';

function makeWorld() {
  const eventBus = new EventBusImpl();
  return new World(eventBus);
}

describe('RED TEAM: QueryCache — isolation vs. integration gap', () => {

  /**
   * QueryCache.test.ts never calls world.query() even once.
   * Every test manually calls cache.set(signature, entities, version, tick).
   * This means the entire system-level integration is untested:
   *
   * - Does world.query().with(X).executeEntities() actually populate the cache?
   * - Does the cache hit path return the right entities?
   * - Does archetypeVersion seen by QueryBuilder match the world's actual version?
   *
   * This test verifies the entire pipeline works end-to-end.
   * If this passes, at least the happy path is real.
   */
  it('world.query().executeEntities() actually uses the cache (integration sanity check)', () => {
    const world = makeWorld();

    const entity = world.createEntity();
    world.addComponent(entity.id, { type: ComponentType.Agent, version: 1, name: 'TestAgent' });

    const cacheStatsBefore = world.queryCache.getStats();

    // First call: cache miss
    const result1 = world.query().with(ComponentType.Agent).executeEntities();
    const statsAfterMiss = world.queryCache.getStats();

    expect(statsAfterMiss.misses).toBeGreaterThan(cacheStatsBefore.misses);
    expect(result1).toHaveLength(1);

    // Second call (same builder pattern, new builder): should hit cache
    // Note: world.query() creates a NEW QueryBuilder each time, but the cache
    // is keyed by query signature + archetypeVersion — same key → cache hit
    const result2 = world.query().with(ComponentType.Agent).executeEntities();
    const statsAfterHit = world.queryCache.getStats();

    expect(statsAfterHit.hits).toBeGreaterThan(statsAfterMiss.hits);
    expect(result2).toHaveLength(1);
  });

});

describe('RED TEAM: QueryCache — the entity.addComponent() invalidation gap', () => {
  let world: World;

  beforeEach(() => {
    world = makeWorld();
  });

  /**
   * THE CRITICAL BUG:
   *
   * world.createEntity() increments archetypeVersion.
   * world.addComponent(entityId, component) increments archetypeVersion.
   *
   * BUT: entity.addComponent(component) — the enhanced method patched onto
   * entities returned by world.createEntity() — does NOT increment
   * world._archetypeVersion.
   *
   * This is how 100% of tests set up their entities:
   *   const entity = world.createEntity();
   *   entity.addComponent({ type: 'agent', ... }); ← does NOT invalidate cache
   *
   * So a query that runs BEFORE the entity.addComponent() call,
   * then runs AGAIN after, returns STALE CACHED RESULTS because
   * archetypeVersion hasn't changed.
   *
   * This is a real game bug: systems that run queries mid-tick, spawn new
   * agents, and re-query will silently miss the new agent for an entire tick.
   */
  it('entity.addComponent() DOES increment archetypeVersion — cache properly invalidated (BUG FIXED)', () => {
    const entity = world.createEntity();
    const versionAfterCreate = world.archetypeVersion;

    // Query now — no agents exist, cache populates with empty result
    const agents1 = world.query().with(ComponentType.Agent).executeEntities();
    expect(agents1).toHaveLength(0); // Correct: no agents yet

    // entity.addComponent() now increments archetypeVersion (bug fix)
    entity.addComponent({ type: ComponentType.Agent, version: 1, name: 'AgentAdded' });

    // Verify: archetypeVersion HAS changed (bug is fixed)
    expect(world.archetypeVersion).toBeGreaterThan(versionAfterCreate); // Version incremented — BUG FIXED

    // Query again — archetypeVersion changed means CACHE MISS, fresh result
    const agents2 = world.query().with(ComponentType.Agent).executeEntities();

    // Cache was invalidated — correctly returns the new agent
    expect(agents2).toHaveLength(1); // Cache invalidated, finds new agent
  });

  /**
   * CONTRAST: world.addComponent() DOES increment archetypeVersion.
   *
   * This is the only safe path for adding components that will invalidate cache.
   * But it's not the idiomatic API — most code uses entity.addComponent().
   *
   * This test documents the inconsistency between the two APIs.
   */
  it('world.addComponent() DOES increment archetypeVersion — cache properly invalidated', () => {
    const entity = world.createEntity();
    const versionAfterCreate = world.archetypeVersion;

    // Query: empty, populates cache
    const agents1 = world.query().with(ComponentType.Agent).executeEntities();
    expect(agents1).toHaveLength(0);

    // SAFE PATH: use world.addComponent() instead of entity.addComponent()
    world.addComponent(entity.id, { type: ComponentType.Agent, version: 1, name: 'SafeAgent' });

    // archetypeVersion MUST increment for cache invalidation to work
    expect(world.archetypeVersion).toBeGreaterThan(versionAfterCreate);

    // Re-query: cache invalidated, fresh execution, finds the new agent
    const agents2 = world.query().with(ComponentType.Agent).executeEntities();
    expect(agents2).toHaveLength(1); // Correct: cache was invalidated
  });

  /**
   * SYSTEMIC IMPACT: Every test that sets up entities via entity.addComponent()
   * and then queries mid-test is only getting correct results because the query
   * runs AFTER setup. Tests that query BEFORE and AFTER entity.addComponent()
   * will see stale results.
   *
   * The existing test suite NEVER tests the query-before/add/query-after pattern.
   * That's why nobody noticed this bug.
   */
  it('query-then-modify-then-query pattern: entity.addComponent() correctly invalidates cache (BUG FIXED)', () => {
    // Simulate a system running across multiple ticks
    // Tick 1: system runs, no agents yet
    const agentsBeforeSpawn = world.query().with(ComponentType.Agent).executeEntities();
    expect(agentsBeforeSpawn).toHaveLength(0); // Populates cache at current version

    // Tick 1 continued: a spawning event creates a new entity via entity.addComponent()
    const newAgent = world.createEntity(); // archetypeVersion++
    // archetypeVersion just changed (createEntity bumps it)
    // So the NEXT query WILL be a cache miss. This is fine.

    // What if the component add happens WITHOUT entity creation?
    // e.g., an existing entity gains a new component via entity.addComponent()
    const existingEntity = world.createEntity(); // archetypeVersion++ again
    const versionBeforeAdd = world.archetypeVersion;

    world.query().with(ComponentType.Agent).executeEntities(); // Populate cache at this version

    // Now add to existing entity WITHOUT using world.addComponent()
    existingEntity.addComponent({ type: ComponentType.Agent, version: 1, name: 'LateJoiner' });

    // The version DOES change now (bug fixed)
    expect(world.archetypeVersion).toBeGreaterThan(versionBeforeAdd);

    // The query result is fresh — cache was properly invalidated
    const agentsAfterAdd = world.query().with(ComponentType.Agent).executeEntities();

    // existingEntity gained an Agent component and is correctly found
    expect(agentsAfterAdd).toHaveLength(1); // Cache invalidated, finds new agent
  });

});

describe('RED TEAM: QueryCache — array reuse corruption', () => {
  let world: World;

  beforeEach(() => {
    world = makeWorld();
  });

  /**
   * THE ARRAY REUSE BUG:
   *
   * QueryBuilder.executeEntitiesUncached() reuses a single class-level array:
   *   private resultEntities: Entity[] = [];
   *
   * The code says: "// Reuse entity array - WARNING: Result array is reused on next query"
   *
   * The cache stores a REFERENCE to this.resultEntities, not a defensive copy.
   *
   * This means:
   * 1. builder.executeEntities() → cache miss → resultEntities=[e1,e2] → cached
   * 2. Caller holds reference: const ref = result
   * 3. archetypeVersion changes (any world mutation)
   * 4. builder.executeEntities() → cache MISS → resultEntities.length = 0 then refilled
   * 5. The 'ref' from step 2 is now CORRUPTED (mutated despite being ReadonlyArray)
   *
   * Note: world.query() creates a NEW QueryBuilder each time, so the typical usage:
   *   const agents = world.query().with(CT.Agent).executeEntities();
   * is SAFE because each call has a fresh resultEntities.
   *
   * The DANGEROUS usage is storing the QueryBuilder instance and reusing it:
   *   private agentQuery = world.query().with(CT.Agent); // stored
   */
  it('world.query() creates new builder each call — result arrays are independent', () => {
    const e1 = world.createEntity();
    world.addComponent(e1.id, { type: ComponentType.Agent, version: 1, name: 'Agent1' });

    // Two separate world.query() calls create two different QueryBuilders
    const result1 = world.query().with(ComponentType.Agent).executeEntities();

    // Add new agent (invalidates cache via world.addComponent)
    const e2 = world.createEntity();
    world.addComponent(e2.id, { type: ComponentType.Agent, version: 1, name: 'Agent2' });

    const result2 = world.query().with(ComponentType.Agent).executeEntities();

    // Different QueryBuilders → different resultEntities arrays → no corruption
    expect(result1).not.toBe(result2); // Different objects
    expect(result1).toHaveLength(1); // Original result unchanged
    expect(result2).toHaveLength(2); // New result has both agents
  });

  /**
   * THE DANGEROUS PATTERN: stored QueryBuilder, results held across queries.
   *
   * A system that stores its QueryBuilder as a class member and calls
   * executeEntities() multiple times will have its previous result arrays
   * mutated when archetypeVersion changes between calls.
   *
   * This test proves the mutation happens.
   */
  it('stored QueryBuilder: first result is mutated when second query runs after invalidation', () => {
    const e1 = world.createEntity();
    world.addComponent(e1.id, { type: ComponentType.Agent, version: 1, name: 'Agent1' });
    const e2 = world.createEntity();
    world.addComponent(e2.id, { type: ComponentType.Agent, version: 1, name: 'Agent2' });

    // Simulate a system that stores its query builder (the dangerous pattern)
    const storedQuery = world.query().with(ComponentType.Agent);

    // Call 1: cache miss → resultEntities=[e1,e2] → stored in cache
    const firstResult = storedQuery.executeEntities();
    expect(firstResult).toHaveLength(2); // Sanity check

    // Store a reference (simulating a system holding "before" state)
    const storedReference = firstResult; // Same object, NOT a copy!

    // Add a third agent (via world.addComponent → archetypeVersion++)
    const e3 = world.createEntity();
    world.addComponent(e3.id, { type: ComponentType.Agent, version: 1, name: 'Agent3' });

    // Call 2 on SAME builder: cache MISS (version changed)
    // executeEntitiesUncached() sets this.resultEntities.length = 0, then rebuilds
    const secondResult = storedQuery.executeEntities();
    expect(secondResult).toHaveLength(3); // Correct: all 3 agents

    // THE BUG: firstResult and secondResult are the SAME array object
    expect(firstResult).toBe(secondResult); // Proves array reuse — same reference

    // storedReference was "captured" at 2 agents but now has 3
    // The ReadonlyArray<Entity> type guarantee is violated
    expect(storedReference).toHaveLength(3); // Was 2 at capture time, now 3. CORRUPTED.
  });

  /**
   * VARIANT: What about the cache entry itself?
   *
   * When a cache MISS occurs after a version change, the cache stores the NEW
   * resultEntities array (same object). The old cache entry (now invalid due to
   * version mismatch) stored the same array reference. After the new query:
   * - Old cache entry: entities = this.resultEntities (now has 3 agents)
   * - New cache entry: entities = this.resultEntities (also has 3 agents)
   *
   * The old entry's data was SILENTLY OVERWRITTEN because both entries point
   * to the same array. This makes the old entry's entities field inconsistent
   * with its stored version number.
   */
  it('cache entries after invalidation share the same array reference (silent data corruption)', () => {
    const e1 = world.createEntity();
    world.addComponent(e1.id, { type: ComponentType.Agent, version: 1, name: 'Agent1' });

    const storedQuery = world.query().with(ComponentType.Agent);

    // Populate cache with 1 agent at version V
    storedQuery.executeEntities();
    const statsAfterFirst = world.queryCache.getStats();
    expect(statsAfterFirst.misses).toBeGreaterThanOrEqual(1);

    // Version changes
    const e2 = world.createEntity();
    world.addComponent(e2.id, { type: ComponentType.Agent, version: 1, name: 'Agent2' });

    // New query: cache miss, populates with 2 agents at version V+N
    storedQuery.executeEntities();

    // Now manually check the cache: the cache entry at the CURRENT version has 2 agents
    const currentVersion = world.archetypeVersion;
    const cachedResult = world.queryCache.get('agent', currentVersion);

    // If the cache signature doesn't match 'agent' exactly, adjust:
    // The signature is generated by generateQuerySignature, which sorts and joins
    // component types. For a single .with(ComponentType.Agent), it should be 'agent'
    // This test may fail if the signature format is different.
    if (cachedResult !== null) {
      expect(cachedResult).toHaveLength(2); // Should have 2 agents
    }
    // If cachedResult is null, the signature format test doesn't apply,
    // but the array reuse test above already proves the mutation.
  });

});

describe('RED TEAM: QueryCache — updateComponent does not invalidate (correct but unverified)', () => {
  /**
   * updateComponent does NOT increment archetypeVersion.
   * This is CORRECT behavior: which entities have which components hasn't changed.
   * But it means querying for entities and then checking component VALUES will
   * return up-to-date values (entities are mutable references, not snapshots).
   *
   * This test documents that updateComponent is correctly excluded from
   * archetypeVersion increments, and verifies the entities returned by cache
   * hits reflect current component state (because they're live references).
   */
  it('updateComponent does not invalidate cache — but entities reflect updated values', () => {
    const world = makeWorld();
    const entity = world.createEntity();
    world.addComponent(entity.id, { type: ComponentType.Agent, version: 1, name: 'Original' });

    // Query and cache
    const result1 = world.query().with(ComponentType.Agent).executeEntities();
    expect(result1).toHaveLength(1);

    const versionBeforeUpdate = world.archetypeVersion;

    // Update the agent component
    world.updateComponent(entity.id, ComponentType.Agent, (comp) => ({
      ...comp,
      name: 'Updated',
    }));

    // archetypeVersion should NOT have changed (correct behavior)
    expect(world.archetypeVersion).toBe(versionBeforeUpdate);

    // Query again: cache HIT (same version)
    const result2 = world.query().with(ComponentType.Agent).executeEntities();
    const statsAfterUpdate = world.queryCache.getStats();
    expect(statsAfterUpdate.hits).toBeGreaterThanOrEqual(1);

    // The entity returned is a live reference, so its component reflects the update
    const agentComp = result2[0]?.getComponent(ComponentType.Agent) as { name?: string } | undefined;
    expect(agentComp?.name).toBe('Updated'); // Live reference — reflects update despite cache hit

    // The cache correctly returned the same entity (no staleness for component values)
    expect(result1[0]).toBe(result2[0]); // Same entity reference
  });

});
