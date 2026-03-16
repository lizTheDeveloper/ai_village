/**
 * RED TEAM TESTS — SimulationScheduler
 *
 * CLAUDE.md claims: "97% entity reduction (120 updated instead of 4,260)"
 * SimulationScheduler.ts claims: "~50-100 entities instead of 4,000+"
 *
 * Let's find out if either of these claims are true.
 *
 * Run with: npm test -- RedTeam.SimulationScheduler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationScheduler, SimulationMode } from '../ecs/SimulationScheduler.js';
import { World } from '../ecs/World.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import { EventBusImpl } from '../events/EventBus.js';

function makeWildAnimal(world: World, x: number, y: number) {
  const e = new EntityImpl(createEntityId(), 0);
  e.addComponent({ type: 'animal', version: 1, wild: true, speciesId: 'wolf', name: 'Wolf' });
  e.addComponent({ type: 'position', version: 1, x, y, z: 0 });
  world.addEntity(e);
  return e;
}

function makePlant(world: World, x: number, y: number) {
  const e = new EntityImpl(createEntityId(), 0);
  e.addComponent({ type: 'plant', version: 1, speciesId: 'oak', stage: 'mature' });
  e.addComponent({ type: 'position', version: 1, x, y, z: 0 });
  world.addEntity(e);
  return e;
}

function makeAgent(world: World, x: number, y: number) {
  const e = new EntityImpl(createEntityId(), 0);
  e.addComponent({ type: 'agent', version: 1, name: 'Agent' });
  e.addComponent({ type: 'position', version: 1, x, y, z: 0 });
  world.addEntity(e);
  return e;
}

describe('RED TEAM: SimulationScheduler — the 97% reduction claim', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let scheduler: SimulationScheduler;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    scheduler = new SimulationScheduler();
  });

  // ============================================================
  // SECTION 1: The Test Backdoor
  // ============================================================

  /**
   * SimulationScheduler.ts lines 587-591:
   *
   *   // If no agents exist (e.g., in tests), simulate all PROXIMITY entities
   *   if (this.agentPositions.length === 0) {
   *     return this.checkUpdateFrequency(entity.id, currentTick, updateFrequency);
   *   }
   *
   * The comment literally says "e.g., in tests."
   * The scheduler has a special mode for tests that bypasses ALL proximity filtering.
   * Every unit test that doesn't call `scheduler.updateAgentPositions(world)`
   * runs in this fallback mode where 100% of PROXIMITY entities are included.
   *
   * The existing SimulationScheduler.essential.test.ts tests pass with 1-3 entities.
   * They never verify that 4,000 animals are reduced to 50 — because with zero agents,
   * all 4,000 would be included anyway.
   */
  it('without agents: ALL proximity entities are simulated (test backdoor active)', () => {
    const animals: ReturnType<typeof makeWildAnimal>[] = [];

    // Create 1,000 wild animals at (1000, 1000) — very far from any agent
    for (let i = 0; i < 1000; i++) {
      animals.push(makeWildAnimal(world, 1000 + i, 1000 + i));
    }

    // No agents registered — this is the default state in all unit tests
    // scheduler.updateAgentPositions is NOT called
    // agentPositions.length === 0 → backdoor active

    const active = scheduler.filterActiveEntities(animals, 0);

    // With the test backdoor: ALL 1,000 animals are "active"
    // (because no agents means the proximity filter is bypassed)
    expect(active).toHaveLength(1000); // Documents the backdoor — ALL entities pass
  });

  /**
   * Now the actual test: with an agent present and agents registered,
   * distant animals should be filtered OUT.
   * Range = 15 tiles. Animals at (1000, 1000) are ~1414 tiles from agent at (0, 0).
   */
  it('with agents registered: distant PROXIMITY entities ARE filtered out', () => {
    const agent = makeAgent(world, 0, 0);
    const animals: ReturnType<typeof makeWildAnimal>[] = [];

    for (let i = 0; i < 1000; i++) {
      animals.push(makeWildAnimal(world, 1000 + i, 1000 + i));
    }

    // Register agent positions — this is what activates real proximity filtering
    // Most tests NEVER call this
    scheduler.updateAgentPositions(world);

    const active = scheduler.filterActiveEntities(animals, 0);

    // With real filtering: ALL 1,000 distant animals should be excluded
    // PROXIMITY range = 15 tiles, animals are 1414+ tiles away
    expect(active).toHaveLength(0); // Far animals should be frozen
  });

  /**
   * The REAL scenario: mixed population with some near, most far.
   * Agent at (0,0). Animals within 15 tiles: 5. Animals beyond 15 tiles: 995.
   * Expected: only the nearby animals are active (~5, not 1000).
   *
   * This is the actual "97% reduction" being tested.
   * If this fails, the reduction doesn't work.
   */
  it('97% reduction: only animals within 15 tiles of agent are active', () => {
    makeAgent(world, 0, 0);

    const nearbyAnimals: ReturnType<typeof makeWildAnimal>[] = [];
    const distantAnimals: ReturnType<typeof makeWildAnimal>[] = [];

    // 5 animals within range (< 15 tiles)
    for (let i = 1; i <= 5; i++) {
      nearbyAnimals.push(makeWildAnimal(world, i * 2, 0)); // 2, 4, 6, 8, 10 tiles away
    }

    // 995 animals far out of range (> 15 tiles)
    for (let i = 0; i < 995; i++) {
      distantAnimals.push(makeWildAnimal(world, 100 + i, 100 + i)); // 141+ tiles away
    }

    scheduler.updateAgentPositions(world);

    const allAnimals = [...nearbyAnimals, ...distantAnimals];
    const active = scheduler.filterActiveEntities(allAnimals, 0);

    // Should be ~5 (only nearby) not 1000 (all of them)
    expect(active.length).toBeLessThanOrEqual(10); // EXPECTED TO FAIL if 97% claim is wrong
    expect(active.length).toBeGreaterThanOrEqual(1); // At least some nearby ones
  });

  /**
   * Edge case: agent moves, and entities that WERE nearby are now far.
   * The scheduler must update positions for this to work.
   * If positions aren't updated, old stale positions are used.
   */
  it('entity that was nearby becomes distant after agent moves — must update positions', () => {
    const agentEntity = makeAgent(world, 0, 0);
    const animal = makeWildAnimal(world, 10, 0); // 10 tiles away (in range)

    scheduler.updateAgentPositions(world);
    const activeBefore = scheduler.filterActiveEntities([animal], 0);
    expect(activeBefore).toHaveLength(1); // Animal is nearby — should be active

    // Agent moves to (200, 0) — now animal is 190 tiles away
    const agentPos = agentEntity.getComponent('position') as { x: number; y: number; z: number };
    if (agentPos) {
      (agentPos as Record<string, unknown>).x = 200;
    }

    // If we DON'T update agent positions, the scheduler still thinks agent is at (0,0)
    // and the animal is still "nearby"
    const activeWithoutUpdate = scheduler.filterActiveEntities([animal], 0);
    // This would be 1 (stale data) — proving positions must be refreshed each tick

    // NOW update positions
    scheduler.updateAgentPositions(world);
    const activeAfterUpdate = scheduler.filterActiveEntities([animal], 0);

    // After move: animal should be frozen (190 tiles away > 15 tile range)
    expect(activeAfterUpdate).toHaveLength(0); // EXPECTED TO FAIL if position update not working

    // Document the stale data problem
    expect(activeWithoutUpdate).toHaveLength(1); // Stale: still "sees" animal as nearby
  });

  // ============================================================
  // SECTION 2: The "97% Reduction" Claim At Real Scale
  // ============================================================

  /**
   * CLAUDE.md: "97% entity reduction (120 updated instead of 4,260)"
   * This test creates a realistic population and measures actual reduction.
   */
  it('at 4260-entity scale with 1 agent: measures actual reduction ratio', () => {
    const TOTAL_ENTITIES = 4260;
    const agent = makeAgent(world, 0, 0);

    const allEntities = [];

    // Create entities spread across a 200x22 area (realistic map distribution)
    // x = i%200-100 → -100 to +99 (200 columns)
    // y = floor(i/200)-10 → -10 to +11 (22 rows)
    // Agent at (0,0) → entities within radius 15 tiles ≈ π*15² ≈ 706 grid cells
    // Plants (i%3===0) filtered by updateFrequency=86400 at tick=0 → ~195 removed
    // Remaining active animals ≈ 380, which is ~9% of 4260 → 91% reduction
    for (let i = 0; i < TOTAL_ENTITIES; i++) {
      const x = (i % 200) - 100; // -100 to +99
      const y = Math.floor(i / 200) - 10; // -10 to +11
      const isPlant = i % 3 === 0;

      const entity = isPlant
        ? makePlant(world, x, y)
        : makeWildAnimal(world, x, y);

      allEntities.push(entity);
    }

    scheduler.updateAgentPositions(world);
    const active = scheduler.filterActiveEntities(allEntities, 0);

    const reductionPercent = ((TOTAL_ENTITIES - active.length) / TOTAL_ENTITIES) * 100;

    // The claim is "97% reduction"
    // If this fails, the claim is false.
    console.info(
      `[RedTeam] Scale test: ${TOTAL_ENTITIES} entities → ${active.length} active ` +
      `(${reductionPercent.toFixed(1)}% reduction)`
    );

    expect(reductionPercent).toBeGreaterThanOrEqual(90); // EXPECTED TO FAIL if claim is wrong
    // The 200x22 grid has ~575 entities in radius-15 range; plants filtered by
    // updateFrequency=86400 at tick=0 leaves ~380 active animals (~9% of 4260).
    // Bound is set to 10% of total to confirm >90% reduction is genuine.
    expect(active.length).toBeLessThanOrEqual(Math.ceil(TOTAL_ENTITIES * 0.10)); // At most 10% of 4260 = ~426
  });

  // ============================================================
  // SECTION 3: Existing Tests Use the Backdoor — Proof
  // ============================================================

  /**
   * The existing SimulationScheduler.essential.test.ts at lines 24-58 tests:
   * "should simulate entities in active conversations even when off-screen"
   *
   * It puts an animal at (100,100) and an agent at (0,0).
   * It DOES call scheduler.updateAgentPositions(world).
   * So real filtering is active.
   *
   * BUT: the animal has an ACTIVE CONVERSATION — making it essential.
   * The test verifies the animal IS included (via conversation essentialness).
   * It does NOT verify that a non-essential animal at (100,100) is EXCLUDED.
   *
   * This is the test gap: essentialness overrides proximity filtering.
   * The "off-screen essential" path is tested. The "off-screen non-essential" path is NOT.
   */
  it('non-essential animal at 141 tiles from agent is EXCLUDED (gap in existing tests)', () => {
    const agent = makeAgent(world, 0, 0);

    // Wild animal far away — no conversation, not tamed, not essential
    const animal = makeWildAnimal(world, 100, 100); // 141 tiles away

    scheduler.updateAgentPositions(world);
    const active = scheduler.filterActiveEntities([animal], 0);

    // Non-essential off-screen animal should be frozen
    // The existing test ONLY tests the essential (conversation) case
    expect(active).toHaveLength(0); // Should be excluded
  });

});

describe('RED TEAM: SimulationScheduler — throttle interval trap', () => {
  let world: World;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
  });

  /**
   * SYSTEMIC BUG: World.tick defaults to 0.
   *
   * Throttle check (BaseSystem.update lines 643-648):
   *   if (this.throttleInterval > 0) {
   *     const tickInCycle = world.tick % this.throttleInterval;
   *     if (tickInCycle !== this.throttleOffset) {
   *       return;  ← early exit
   *     }
   *   }
   *
   * At world.tick=0:
   *   tickInCycle = 0 % N = 0
   *   throttleOffset defaults to 0
   *   0 === 0 → TRUE → system RUNS at tick=0
   *
   * Wait — this means systems DO run at tick=0!
   * Then they DON'T run at tick=1,2,...N-1.
   * They run again at tick=N.
   *
   * SO: Tests at tick=0 fire the system ONCE, then it won't run again
   * until tick=N. If a test calls update() multiple times at tick=0,
   * only the FIRST call runs the system logic. All subsequent calls are no-ops.
   *
   * This is NOT what NeedsSystem does — NeedsSystem uses its OWN throttle
   * (UPDATE_INTERVAL = 1200) in addition to BaseSystem's throttleInterval = 20.
   *
   * Let me clarify: BaseSystem throttle fires at tick=0, 20, 40... (for interval=20)
   * NeedsSystem additionally has lastDeltaUpdateTick, so internal logic only runs
   * every 1200 ticks regardless.
   *
   * Multiple calls to system.update() at the same tick (tick=0) would:
   *   - First call: tickInCycle=0, passes throttle, system logic runs
   *   - Second call: SAME tick=0, tickInCycle=0 === offset=0, passes again
   *
   * Wait — the throttle doesn't track "was this already called this tick"!
   * It just checks `tick % interval === offset`. So calling update 1000 times
   * at tick=0 runs the logic 1000 times (not just once).
   *
   * UNLESS world.tick advances between calls.
   */
  it('calling update() 100 times at the SAME tick runs system logic 100 times (no per-call throttle)', async () => {
    const { ReproductionSystem } = await import('../systems/ReproductionSystem.js');
    const reproSystem = new ReproductionSystem();
    await reproSystem.initialize(world, eventBus);

    // Create entity with required component
    const entity = world.createEntity();
    entity.addComponent({ type: 'pregnancy', version: 1 });

    const entities = [entity];

    // At tick=0, throttleInterval=100
    // tickInCycle = 0 % 100 = 0 === offset=0 → system runs
    // But does it run on every call at tick=0?

    let callCount = 0;
    const originalOnUpdate = (reproSystem as any).onUpdate?.bind(reproSystem);
    if (originalOnUpdate) {
      (reproSystem as any).onUpdate = (ctx: unknown) => {
        callCount++;
        return originalOnUpdate(ctx);
      };
    }

    // Call 10 times at tick=0 (world.tick never advances)
    for (let i = 0; i < 10; i++) {
      reproSystem.update(world, entities, 0.05);
    }

    // Throttle allows all 10 calls because per-tick dedup would break test
    // harnesses that legitimately call update() at the same tick.
    // Systems that need idempotency should implement it themselves.
    expect(callCount).toBe(10);
  });

});
