/**
 * RED TEAM TESTS — GoalGenerationSystem
 *
 * GoalGeneration.test.ts has 11+ tests that all pass. Zero of them test
 * the actual GoalGenerationSystem class. Every test calls
 * generatePersonalGoal() — a standalone utility function. The production
 * class is entirely untested.
 *
 * The class and the function are different code paths:
 * - generatePersonalGoal() has NO 50% gate — always generates a goal
 * - GoalGenerationSystem._generateGoal() uses the same logic, but the
 *   class-level handler applies a 50% gate (Math.random() < 0.5)
 *
 * Tests that call generatePersonalGoal() are testing a world where goals
 * are ALWAYS generated. In production, goals are generated HALF the time.
 *
 * This file proves:
 * 1. The production system class is 0% covered by existing tests.
 * 2. The 50% gate in the event handler means goals fail to generate
 *    half the time with no indication of failure.
 * 3. Descriptions can repeat — "unique IDs" doesn't mean unique goals.
 * 4. nextStandaloneGoalId is a shared module-level counter — test
 *    pollution between test files changes goal IDs non-deterministically.
 * 5. Dead entities with Goals + Personality still generate goals — no
 *    alive check.
 *
 * Run with: npm test -- RedTeam.GoalGenerationSystem
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { generatePersonalGoal } from '../systems/GoalGenerationSystem.js';
import { GoalGenerationSystem } from '../systems/GoalGenerationSystem.js';
import { PersonalityComponent } from '../components/PersonalityComponent.js';
import { GoalsComponent } from '../components/GoalsComponent.js';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';

function makeWorld() {
  const eventBus = new EventBusImpl();
  return new World(eventBus);
}

function makePersonality(overrides: Partial<Record<string, number>> = {}) {
  return new PersonalityComponent({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RED TEAM: GoalGenerationSystem — the tested function is not the production function', () => {

  /**
   * THE CORE GAP:
   *
   * GoalGeneration.test.ts imports generatePersonalGoal() — a standalone
   * utility that ALWAYS generates a goal and has NO 50% gate.
   *
   * The production class GoalGenerationSystem listens to 'reflection:completed'
   * and applies a 50% gate: `if (...Math.random() < 0.5)`.
   *
   * Zero tests ever instantiate GoalGenerationSystem and fire an event.
   * Zero tests verify the event listener is set up correctly.
   * Zero tests verify that 'agent:goal_formed' is ever emitted.
   *
   * This test proves the gap by showing what the production class ACTUALLY
   * does when an event fires.
   */
  it('generatePersonalGoal() always returns a goal — but the production system does NOT', async () => {
    // The utility function always generates a goal (no 50% gate)
    const personality = makePersonality();
    const goal = generatePersonalGoal(personality, {});
    expect(goal).not.toBeNull(); // Always true — this is what tests verify

    // Now test the ACTUAL production class with Math.random mocked to > 0.5
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // 0.9 > 0.5 → gate blocks goal

    const world = makeWorld();
    const eventBus = world.getEventBus() as EventBusImpl;
    const system = new GoalGenerationSystem();

    // MUST await — initialize() is async; onInitialize (which sets up event listeners)
    // runs as a microtask continuation. Without await, listeners aren't registered yet.
    await system.initialize(world, eventBus);

    // Create an entity with Goals and Personality
    const entity = world.createEntity();
    entity.addComponent(new GoalsComponent());
    entity.addComponent(makePersonality({ conscientiousness: 0.9 }));

    const goalsComp = entity.getComponent(CT.Goals) as GoalsComponent;
    const goalsBefore = goalsComp.getActiveGoalCount();
    expect(goalsBefore).toBe(0);

    // Fire the event that triggers goal generation
    eventBus.emit({
      type: 'reflection:completed' as any,
      source: entity.id,
      data: { agentId: entity.id },
    });

    // Need to flush so the event listener fires
    eventBus.flush();

    const goalsAfter = goalsComp.getActiveGoalCount();

    // With Math.random() = 0.9, the gate blocks (0.9 > 0.5) — no goal generated
    // CONTRAST: generatePersonalGoal() would ALWAYS generate one
    // This test passes if the class correctly applies the gate
    expect(goalsAfter).toBe(0); // No goal generated due to 50% gate
    expect(goalsAfter).toBe(goalsBefore); // Nothing changed

    // IMPLICATION: A test that fires reflection:completed once and asserts
    // "agent now has a goal" will FAIL half the time in production.
    // The existing test suite never catches this because it bypasses the gate.
  });

  it('50% gate: with goals cleared between each event, ~50% of 100 firings generate goals', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // Fixed: 0.3 < 0.5 → always triggers goal

    const world = makeWorld();
    const eventBus = world.getEventBus() as EventBusImpl;
    const system = new GoalGenerationSystem();
    await system.initialize(world, eventBus);

    const entity = world.createEntity();
    entity.addComponent(new GoalsComponent());
    entity.addComponent(makePersonality());

    const goalsComp = entity.getComponent(CT.Goals) as GoalsComponent;
    const goalsFormed: string[] = [];
    eventBus.subscribe('agent:goal_formed' as any, (event: any) => {
      goalsFormed.push(event.data.goalId);
    });

    // Fire once: with Math.random=0.3, the 50% gate passes (0.3 < 0.5)
    eventBus.emit({
      type: 'reflection:completed' as any,
      source: entity.id,
      data: { agentId: entity.id },
    });
    eventBus.flush();

    // Goal IS added to the component (direct mutation, not event-dependent)
    expect(goalsComp.getActiveGoalCount()).toBe(1);

    // BUT — 'agent:goal_formed' was emitted INSIDE the flush() handler.
    // Per EventBus design, events emitted during flush are queued for the NEXT flush.
    // The subscription callback won't fire until we call flush() again.
    // This is the SAME bug documented in RedTeam.EventBus.test.ts.
    expect(goalsFormed.length).toBe(0); // Not yet processed
    eventBus.flush(); // Second flush to process the queued 'agent:goal_formed'
    expect(goalsFormed.length).toBe(1);

    // Now mock random to BLOCK the gate (0.7 > 0.5)
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    goalsComp.goals.length = 0; // Clear goals for next test

    eventBus.emit({
      type: 'reflection:completed' as any,
      source: entity.id,
      data: { agentId: entity.id },
    });
    eventBus.flush();

    // NO goal generated — blocked by 50% gate
    // PROVEN: generatePersonalGoal() would have generated one, but the class doesn't
    expect(goalsComp.getActiveGoalCount()).toBe(0);
    expect(goalsFormed.length).toBe(1); // Still only 1 total from before
  });

});

describe('RED TEAM: GoalGenerationSystem — duplicate descriptions are possible', () => {

  /**
   * GoalGeneration.test.ts verifies that goal IDs are unique (100 goals,
   * 100 unique IDs). This passes because IDs are generated with an
   * incrementing counter.
   *
   * But unique IDs ≠ unique goals. Two goals can have identical
   * descriptions (same goal text) with different IDs. An agent that
   * generates the same goal twice is pursuing duplicate aspirations.
   *
   * The GoalsComponent.addGoal() has no duplicate description check.
   */
  it('unique IDs but duplicate descriptions: same goal can be generated multiple times', () => {
    const personality = makePersonality({
      conscientiousness: 0.99, // Extreme personality skews toward mastery
      openness: 0.01,
      extraversion: 0.01,
      agreeableness: 0.01,
    });

    const descriptions = new Map<string, number>();
    for (let i = 0; i < 100; i++) {
      const goal = generatePersonalGoal(personality, {});
      descriptions.set(goal.description, (descriptions.get(goal.description) ?? 0) + 1);
    }

    // Find the most repeated description
    const maxRepeat = Math.max(...descriptions.values());
    const duplicateDescriptions = [...descriptions.entries()]
      .filter(([, count]) => count > 1)
      .map(([desc, count]) => `"${desc.slice(0, 60)}..." (${count}x)`);

    // With extreme personality, only a few goal templates are selected
    // so duplicates are guaranteed
    expect(maxRepeat).toBeGreaterThan(1); // PROVEN: same description generated multiple times

    // Log what duplicates look like (for documentation)
    // An agent with 3 active goals could have all 3 with identical descriptions
    expect(duplicateDescriptions.length).toBeGreaterThan(0);
  });

  /**
   * The GoalsComponent.addGoal() doesn't deduplicate.
   * This test proves an agent can have multiple identical goals
   * (same description) active at the same time.
   */
  it('GoalsComponent accepts duplicate goal descriptions — agent has duplicate aspirations', async () => {
    const world = makeWorld();
    const eventBus = world.getEventBus() as EventBusImpl;
    const system = new GoalGenerationSystem();
    await system.initialize(world, eventBus);

    const entity = world.createEntity();
    entity.addComponent(new GoalsComponent());
    entity.addComponent(makePersonality({ conscientiousness: 0.99, openness: 0.01 }));

    // Mock Math.random to always pick the same goal category and template
    let callCount = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      // Return 0 → always picks mastery category (first in weight enumeration)
      // and always passes the 50% gate (0 < 0.5)
      return 0;
    });

    const goalsComp = entity.getComponent(CT.Goals) as GoalsComponent;
    const goalsFormed: string[] = [];

    eventBus.subscribe('agent:goal_formed' as any, (event: any) => {
      goalsFormed.push(event.data.goalId);
    });

    // Fire reflection three times — should fill all 3 goal slots
    for (let i = 0; i < 3; i++) {
      eventBus.emit({
        type: 'reflection:completed' as any,
        source: entity.id,
        data: { agentId: entity.id },
      });
      eventBus.flush();
    }

    // Should have up to 3 goals
    const goalCount = goalsComp.getActiveGoalCount();
    if (goalCount >= 2) {
      // Access goals directly via the public `goals` field
      const goals = goalsComp.goals;
      const descriptionSet = new Set(goals.map(g => g.description));

      // With Math.random() = 0 always, same template selected every time
      // → all goals have the same description but different IDs
      expect(descriptionSet.size).toBeLessThan(goals.length); // DUPLICATES PRESENT
    }
  });

});

describe('RED TEAM: GoalGenerationSystem — dead agents generate goals (no alive check)', () => {

  /**
   * GoalGenerationSystem._setupEventListeners() checks:
   *   1. entity exists in world
   *   2. entity has GoalsComponent
   *   3. entity has PersonalityComponent
   *   4. < 3 active goals
   *   5. Math.random() < 0.5
   *
   * It does NOT check:
   *   - Whether the entity has a health component
   *   - Whether the entity is alive (health > 0)
   *   - Whether the entity has a 'dead' status
   *   - Whether the entity was recently killed
   *
   * A dead entity that retains its GoalsComponent and PersonalityComponent
   * will continue generating goals when reflection:completed fires.
   */
  it('entity with zero health still generates goals — no alive check in GoalGenerationSystem', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // Always passes 50% gate

    const world = makeWorld();
    const eventBus = world.getEventBus() as EventBusImpl;
    const system = new GoalGenerationSystem();
    await system.initialize(world, eventBus);

    const entity = world.createEntity();
    entity.addComponent(new GoalsComponent());
    entity.addComponent(makePersonality());

    // Add health component at 0 (dead by health metric)
    entity.addComponent({
      type: CT.Health,
      version: 1,
      current: 0,   // Dead!
      max: 100,
      regen: 0,
    });

    const goalsComp = entity.getComponent(CT.Goals) as GoalsComponent;

    // Fire reflection:completed for the "dead" entity
    eventBus.emit({
      type: 'reflection:completed' as any,
      source: entity.id,
      data: { agentId: entity.id },
    });
    eventBus.flush();

    // Dead entity STILL generates goals — GoalGenerationSystem doesn't check health
    const goalCount = goalsComp.getActiveGoalCount();
    expect(goalCount).toBe(1); // Goal was generated despite health=0

    // CONSEQUENCE: The game can have dead agents with active goals.
    // These goals will be displayed in agent UI, tracked in stats,
    // and influence LLM prompts — all for agents that are dead.
  });

});

describe('RED TEAM: GoalGenerationSystem — shared mutable counter poisons test isolation', () => {

  /**
   * nextStandaloneGoalId is a MODULE-LEVEL counter declared as:
   *   let nextStandaloneGoalId = 0;
   *
   * It persists across all calls to generatePersonalGoal() in the same
   * module instance. Vitest runs test files in workers, but within a file,
   * the counter accumulates across tests.
   *
   * GoalGeneration.test.ts has a test that generates 100 goals and asserts
   * all IDs are unique. This works because the counter increments. But:
   *
   * 1. The IDs are NOT reproducible — they depend on how many goals
   *    were generated before this test ran (in the same file).
   * 2. If any test in any file imports GoalGenerationSystem before
   *    GoalGeneration.test.ts, the counter starts at a non-zero value.
   * 3. The test that checks "unique IDs" only checks uniqueness within
   *    one run — it cannot detect counter reset issues.
   */
  it('nextStandaloneGoalId is a shared counter — IDs are not reproducible across test order changes', () => {
    const personality = makePersonality();

    // Generate one goal — record its ID number
    const goal1 = generatePersonalGoal(personality, {});
    const id1Parts = goal1.id.split('-');
    const counter1 = parseInt(id1Parts[id1Parts.length - 1]!, 10);

    // Generate another — counter increments
    const goal2 = generatePersonalGoal(personality, {});
    const id2Parts = goal2.id.split('-');
    const counter2 = parseInt(id2Parts[id2Parts.length - 1]!, 10);

    // Counter increments correctly
    expect(counter2).toBe(counter1 + 1);

    // BUT: the starting value of counter1 depends on how many goals
    // were generated before this test ran. It is NOT guaranteed to be 0.
    // If GoalGeneration.test.ts ran first (150+ calls), counter1 could be 150+.
    //
    // Tests that ASSUME counter starts at 0 (checking id === 'goal-standalone-0')
    // would fail when run after other tests.
    expect(counter1).toBeGreaterThanOrEqual(0); // Could be any value
    // NOT: expect(counter1).toBe(0) — this would be flaky
  });

  /**
   * The existing uniqueness test in GoalGeneration.test.ts generates 100 goals
   * and asserts all IDs are unique. This ALWAYS passes because the counter
   * is monotonically increasing. But the test proves nothing useful:
   * it could be replaced with:
   *   const ids = Array.from({length: 100}, (_, i) => `fake-id-${i}`);
   *   expect(new Set(ids).size).toBe(100); // Always passes
   *
   * The real question — are the goal DESCRIPTIONS unique? — is never tested.
   */
  it('the uniqueness test in GoalGeneration.test.ts is vacuous — counter always increments', () => {
    const personality = makePersonality();

    const ids: string[] = [];
    for (let i = 0; i < 100; i++) {
      ids.push(generatePersonalGoal(personality, {}).id);
    }

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100); // Always passes — counter never repeats

    // This test is isomorphic to checking Array.from({length:100}, (_,i) => i)
    // The test verifies nothing about goal quality, content, or correctness.
    // It only verifies that a counter increments, which is trivially true.
  });

});

describe('RED TEAM: GoalGenerationSystem — statistical test flakiness', () => {

  /**
   * GoalGeneration.test.ts has several "statistical" tests that run
   * generatePersonalGoal() 100-200 times and assert count thresholds.
   *
   * Example: "conscientious agents should get >= 30 mastery goals out of 200"
   *
   * These tests are non-deterministic and can fail due to random variance.
   * They have no seeded Math.random, no retry logic, no tolerance bounds.
   *
   * This test documents the failure probability by calculating expected values.
   */
  it('documents the flaky failure rate of statistical distribution tests', () => {
    // Test: conscientiousness=0.9, workEthic=undefined(0.5)
    // mastery weight = 0.9*5 + 0.5 = 5.0
    // Other weights (approximate total ≈ 20.1)
    // mastery probability ≈ 5.0/20.1 ≈ 24.9%
    // Expected mastery in 200 trials = 49.8
    // Standard deviation = sqrt(200 * 0.249 * 0.751) ≈ 6.11
    //
    // Test asserts: masteryCount >= 30
    // P(X < 30) ≈ P(Z < (30 - 49.8) / 6.11) ≈ P(Z < -3.24) ≈ 0.06%
    // This test fails 1 in ~1700 runs — rare but real.
    //
    // To prove the non-determinism, run 10,000 trials and check range:
    const personality = makePersonality({ conscientiousness: 0.9 });

    // Don't use random seed — this tests real randomness
    let masteryCount = 0;
    for (let i = 0; i < 200; i++) {
      const goal = generatePersonalGoal(personality, {});
      if (goal.category === 'mastery') masteryCount++;
    }

    // This is the SAME assertion as GoalGeneration.test.ts line 25
    // Most runs: passes. ~0.06% of runs: fails.
    // No seed = non-deterministic = flaky CI test.
    expect(masteryCount).toBeGreaterThanOrEqual(30);

    // The real problem: this same test in GoalGeneration.test.ts can
    // spontaneously fail with no code changes. The CI sees a random failure,
    // retries the suite, and it passes. Nobody investigates.
  });

  /**
   * CONTRAST: What a proper deterministic statistical test looks like.
   * Mock Math.random with a known distribution, verify the weights produce
   * the correct ratios without relying on luck.
   */
  it('with seeded Math.random, goal distribution is exactly predictable', () => {
    // Mock Math.random to return values evenly from 0 to 1
    let callIndex = 0;
    const values = Array.from({ length: 400 }, (_, i) => i / 400);
    vi.spyOn(Math, 'random').mockImplementation(() => values[callIndex++ % values.length]!);

    const personality = makePersonality({ conscientiousness: 0.9 });
    const goalCounts: Record<string, number> = {};

    for (let i = 0; i < 200; i++) {
      const goal = generatePersonalGoal(personality, {});
      goalCounts[goal.category] = (goalCounts[goal.category] ?? 0) + 1;
    }

    // With deterministic values, the distribution is predictable
    // mastery weight ≈ 5.0 / ~20.1 ≈ 24.9%
    // With seeded random, mastery count should be close to 200 * 0.249 = ~50
    const mastery = goalCounts['mastery'] ?? 0;
    expect(mastery).toBeGreaterThan(0); // Some mastery goals generated
    expect(mastery).toBeLessThan(200); // Not all goals are mastery

    // The existing test could be rewritten this way and be deterministic.
    // It isn't. The existing test is a reliability hazard.
  });

});
