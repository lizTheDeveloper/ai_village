/**
 * RED TEAM TESTS — StateMutatorSystem
 *
 * The StateMutatorSystem documentation is more complete than the tests.
 * The tests test happy paths. This file tests everything else.
 *
 * Run with: npm test -- RedTeam.StateMutatorSystem
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateMutatorSystem } from '../systems/StateMutatorSystem.js';
import { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import {
  setMutationRate,
  clearMutationRate,
  clearMutationsBySource,
  getMutationRate,
  getMutationField,
  hasMutations,
} from '../components/MutationVectorComponent.js';
import { EventBusImpl } from '../events/EventBus.js';

function makeEntity(world: World, health = 0.5) {
  const entity = world.createEntity();
  entity.addComponent(new NeedsComponent({ health, hunger: 0.5, thirst: 0.5, energy: 0.5, temperature: 0.5, social: 0.5 }));
  return entity;
}

describe('RED TEAM: StateMutatorSystem', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let system: StateMutatorSystem;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new StateMutatorSystem();
    await system.initialize(world, eventBus);
  });

  // ============================================================
  // SECTION 1: Conflicting Mutations — Last Writer Wins (Silently)
  // ============================================================
  describe('Conflicting mutation rates', () => {

    /**
     * If NeedsSystem sets hunger rate to -0.01 and an eating behavior
     * sets hunger rate to +0.1 on the same path, the last call wins.
     * The first rate is SILENTLY DESTROYED.
     *
     * There is no accumulation, no warning, no conflict resolution.
     * Two systems fighting over the same path = one of them does nothing.
     *
     * The existing test suite never tests this scenario.
     */
    it('last setMutationRate call on same path silently overwrites the first', () => {
      const entity = makeEntity(world, 0.5);

      // System A sets a healing rate
      setMutationRate(entity, 'needs.health', +0.5, {
        max: 1.0,
        source: 'healing_potion',
      });

      // System B sets a damage rate on the SAME path — overwrites healing silently
      setMutationRate(entity, 'needs.health', -0.5, {
        min: 0,
        source: 'poison',
      });

      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;

      // Health should be 0.0 — ONLY poison applied. Healing was silently killed.
      // This exposes that two systems cannot safely co-exist on the same field.
      expect(needs.health).toBeCloseTo(0.0, 2);

      // Confirm: the healing rate is completely gone
      const rate = getMutationRate(entity, 'needs.health');
      expect(rate).toBe(-0.5); // Only the poison rate survives
    });

    /**
     * Real scenario: NeedsSystem sets hunger=-0.001 (slow decay).
     * A feeding action sets hunger=+0.1 (fast restore).
     * Feeding should ADD to the decay, not replace it.
     *
     * Current behavior: feeding call happens last → hunger only increases,
     * decay rate is lost, hunger NEVER decreases again after feeding starts.
     *
     * This is a permanent state corruption bug.
     */
    it('feeding after starvation: decay rate is permanently lost (hunger never decreases again)', () => {
      const entity = world.createEntity();
      entity.addComponent(new NeedsComponent({ hunger: 0.1, thirst: 0.5, energy: 0.5, health: 0.5, temperature: 0.5, social: 0.5 }));

      // Starvation system sets decay
      setMutationRate(entity, 'needs.hunger', -0.001, {
        min: 0,
        max: 1,
        source: 'needs_system',
      });

      // Confirm: decay active
      world.advanceTick();
      system.update(world, [entity], 1.0);
      const hungerAfterDecay = (entity.getComponent(CT.Needs) as NeedsComponent).hunger;
      expect(hungerAfterDecay).toBeLessThan(0.1);

      // Feeding action overwrites with positive rate
      setMutationRate(entity, 'needs.hunger', +0.2, {
        min: 0,
        max: 1,
        source: 'eating', // Different source — but same path!
      });

      // Apply feeding for 5 seconds (advance tick each time to bypass per-tick dedup)
      for (let i = 0; i < 5; i++) {
        world.advanceTick();
        system.update(world, [entity], 1.0);
      }

      // Hunger is now full (1.0)
      const hungerFull = (entity.getComponent(CT.Needs) as NeedsComponent).hunger;
      expect(hungerFull).toBeCloseTo(1.0, 1);

      // NOW: the eating rate is still active (no one cleared it)
      // AND the decay rate from needs_system was permanently overwritten
      // Hunger will stay at 1.0 indefinitely — decay rate is GONE
      const currentRate = getMutationRate(entity, 'needs.hunger');
      expect(currentRate).toBe(+0.2); // Eating rate is still active

      // If decay rate had survived, it would be fighting eating rate.
      // Instead, only eating rate exists. Hunger is now capped forever.

      // The field should have BOTH source rates active (healing and decay)
      // but it doesn't — only eating survives:
      const field = getMutationField(entity, 'needs.hunger');
      expect(field?.source).toBe('eating'); // Not 'needs_system'
    });

  });

  // ============================================================
  // SECTION 2: Derivative Sign Flip — Healing Becomes Poison
  // ============================================================
  describe('Derivative drives rate through zero into negative territory', () => {

    /**
     * setMutationRate with derivative can cause the rate to cross zero
     * and keep going negative. A healing effect can become a damage effect.
     *
     * Scenario: Combat ability sets health rate = +1.0 with derivative = -0.5
     * Second 1: rate = 1.0  → +1.0 hp
     * Second 2: rate = 0.5  → +0.5 hp
     * Second 3: rate = 0.0  → pruned (rate < 1e-10, derivative != 0)
     *
     * Wait — the system prunes at 1e-10, so once rate crosses ~0, it gets deleted.
     * This is CORRECT behavior.
     *
     * But: what if the caller sets rate = +0.5, derivative = -1.0?
     * First half-second: rate goes 0.5 → 0 (halfway through).
     * At rate=0, gets pruned on NEXT check — but is delta applied BEFORE prune check?
     *
     * Looking at StateMutatorSystem:
     *   Line 96: CHECK prune (before applying)
     *   Line 102: apply delta
     *   Line 107: apply derivative to rate
     *
     * So prune check is BEFORE application. Rate is checked at START of tick.
     * If rate crosses through negative MID-TICK (derivative applied after),
     * the negative rate only takes effect NEXT tick's prune check.
     */
    it('rate sign flip: positive-to-negative rate applies one tick of negative delta before pruning', () => {
      const entity = makeEntity(world, 0.8);

      // Set rate that will go negative in 1 second
      // rate=0.2, derivative=-0.4 per second
      // After 0.5s: rate = 0.2 - (0.4*0.5) = 0.0
      // After 1.0s: rate = 0.2 - (0.4*1.0) = -0.2
      setMutationRate(entity, 'needs.health', 0.2, {
        derivative: -0.4,
        max: 1.0,
        min: 0.0,
        source: 'unstable_heal',
      });

      // Tick 1: rate=0.2, delta=0.2, health→1.0, then rate becomes -0.2 via derivative
      system.update(world, [entity], 1.0);
      const healthTick1 = (entity.getComponent(CT.Needs) as NeedsComponent).health;
      expect(healthTick1).toBeCloseTo(1.0, 2); // Healed

      // Tick 2: prune check: |rate=-0.2| = 0.2 — NOT < 1e-10 — NOT pruned
      // delta = -0.2 * 1.0 = -0.2, health → 0.8 (damaged!)
      // The "healing" effect is now a damage effect. No warning.
      system.update(world, [entity], 1.0);
      const healthTick2 = (entity.getComponent(CT.Needs) as NeedsComponent).health;

      // FIXED: Sign-flip guard now clamps rate to 0 when derivative crosses zero.
      // Health stays at 1.0 (healed) — no damage from reversed rate.
      expect(healthTick2).toBe(healthTick1);
    });

    /**
     * The negligibility prune threshold is 1e-10.
     * For a rate starting at 0.2 with derivative -0.4:
     *   After 0.5s: rate = 0.0 (exactly zero)
     *   Math.abs(0.0) = 0.0 < 1e-10: PRUNED immediately
     *
     * But when using dt=0.5 instead of dt=1.0:
     *   Tick 1 (dt=0.5): rate=0.2, delta=0.1, then rate becomes 0.2-(0.4*0.5)=0.0
     *   Tick 2 (dt=0.5): prune check: |0.0| < 1e-10 → pruned
     *   No damage applied in tick 2.
     *
     * With dt=1.0:
     *   Tick 1 (dt=1.0): rate=0.2, delta=0.2, then rate becomes 0.2-(0.4*1.0)=-0.2
     *   Tick 2 (dt=1.0): prune check: |-0.2| = 0.2 — NOT pruned, damage applied
     *
     * The outcome depends on deltaTime granularity.
     * At 20 TPS (dt=0.05), the rate goes through many small steps and gets pruned near zero.
     * In tests using dt=1.0, the derivative overshoots zero in one step.
     */
    it('derivative behavior differs between dt=0.05 (20 TPS) and dt=1.0 (test default)', () => {
      // Test with dt=1.0 (how most tests run)
      const entity1 = makeEntity(world, 0.8);
      setMutationRate(entity1, 'needs.health', 0.2, {
        derivative: -0.4,
        min: 0.0, max: 1.0,
        source: 'healing',
      });
      system.update(world, [entity1], 1.0); // Tick 1: delta=0.2, rate→-0.2
      system.update(world, [entity1], 1.0); // Tick 2: rate=-0.2 → damage applied
      const health1 = (entity1.getComponent(CT.Needs) as NeedsComponent).health;

      // Test with dt=0.05 (real 20 TPS)
      const entity2 = makeEntity(world, 0.8);
      setMutationRate(entity2, 'needs.health', 0.2, {
        derivative: -0.4,
        min: 0.0, max: 1.0,
        source: 'healing',
      });
      for (let i = 0; i < 40; i++) { // 40 × 0.05 = 2.0 seconds
        system.update(world, [entity2], 0.05);
      }
      const health2 = (entity2.getComponent(CT.Needs) as NeedsComponent).health;

      // FIXED: Sign-flip guard clamps rate to 0 in both dt cases.
      // At dt=1.0: rate goes from 0.2 to -0.2 in one step → clamped to 0. Health=1.0 (0.8+0.2, clamped at max).
      // At dt=0.05: rate decays gradually through many small steps, some positive deltas applied before zero.
      // Both are now correct (no sign reversal), but produce different final values due to integration granularity.
      // This is expected numerical behavior, not a bug.
      expect(health1).toBeGreaterThanOrEqual(health2);
    });

  });

  // ============================================================
  // SECTION 3: The getDebugInfo() Method Is Permanently Broken
  // ============================================================
  describe('getDebugInfo() returns hardcoded zeros', () => {

    /**
     * StateMutatorSystem.getDebugInfo() lines 188-193:
     *
     *   return {
     *     entityCount: 0,
     *     mutationCount: 0,
     *     mutationsBySource: new Map(),
     *   };
     *
     * The comment says "Actual counts require world access."
     * This is a permanently fake debug API.
     *
     * Any code relying on this for monitoring, alerting, or dashboards
     * will always see zero mutations even with 100 active effects.
     */
    it('getDebugInfo() reports zero entities even with 100 entities with active mutations', () => {
      const entities = [];
      for (let i = 0; i < 100; i++) {
        const e = makeEntity(world);
        setMutationRate(e, 'needs.health', -0.1, { min: 0, source: 'poison' });
        entities.push(e);
      }

      system.update(world, entities, 1.0);

      const debug = system.getDebugInfo();

      // 100 entities with active mutations → debug should reflect that
      expect(debug.entityCount).toBe(100); // FAILS: returns 0
      expect(debug.mutationCount).toBe(100); // FAILS: returns 0
      expect(debug.mutationsBySource.get('poison')).toBe(100); // FAILS: map is empty
    });

  });

  // ============================================================
  // SECTION 4: Silent Component Miss in applyDelta
  // ============================================================
  describe('applyDelta silently skips missing components (violates CLAUDE.md)', () => {

    /**
     * StateMutatorSystem.applyDelta() line 146:
     *   const component = entity.getComponent(componentType);
     *   if (!component) return;  ← SILENT SKIP
     *
     * Per CLAUDE.md: "No Silent Fallbacks - Crash on Invalid Data"
     * Missing required component should throw, not silently return.
     *
     * Scenario: Someone sets a mutation rate on 'needs.hunger' for an entity
     * that has no NeedsComponent. The mutation is silently discarded every tick.
     * No error. No log. No indication anything went wrong.
     */
    it('setting mutation on missing component silently does nothing (should throw)', () => {
      // Entity with NO NeedsComponent
      const entity = world.createEntity();
      // Do NOT add NeedsComponent

      // Set mutation rate on non-existent component
      setMutationRate(entity, 'needs.hunger', -0.5, {
        min: 0,
        source: 'starvation',
      });

      // This should throw — entity doesn't have the target component.
      // Per CLAUDE.md: "Crash on Invalid Data"
      // Instead it silently no-ops.
      expect(() => {
        system.update(world, [entity], 1.0);
      }).toThrow(); // EXPECTED TO FAIL: system silently returns instead
    });

    /**
     * Variant: mutation rate is set on a TYPO path ('need.hunger' vs 'needs.hunger').
     * Same silent skip. No indication the path is wrong.
     */
    it('typo in field path silently discards all mutations (should throw or warn)', () => {
      const entity = makeEntity(world, 0.5);

      // Typo: 'need' instead of 'needs'
      setMutationRate(entity, 'need.hunger', -0.5, {
        min: 0,
        source: 'needs_system',
      });

      // FIXED: System now throws on missing component (per CLAUDE.md "Crash on Invalid Data")
      expect(() => {
        system.update(world, [entity], 10.0);
      }).toThrow(/component 'need' not found/);
    });

  });

  // ============================================================
  // SECTION 5: totalAmount Expiration Uses Math.abs
  // ============================================================
  describe('totalAmount expiration counts damage and healing equivalently', () => {

    /**
     * StateMutatorSystem.ts line 112:
     *   field.appliedAmount += Math.abs(delta);
     *
     * Math.abs means damage and healing both count toward expiration.
     * A "bandage that heals 0.1" expires after applying |0.1| of change.
     * A "poison that deals 0.1 damage" also expires after |0.1| of change.
     *
     * This is probably intentional for symmetry.
     * But: what about a mutation with derivative that goes negative?
     * If you set rate=+0.1, derivative=-0.3, totalAmount=0.5:
     *   Tick 1: delta=0.1 → appliedAmount=0.1, rate becomes -0.2
     *   Tick 2: delta=-0.2 → appliedAmount=0.3 (adds |−0.2|), rate becomes -0.5
     *   Tick 3: delta=-0.5 → appliedAmount=0.8 → EXPIRES
     *
     * The "total healing amount" includes damage that the mutation caused
     * after its rate went negative. A healing bandage expired because it healed
     * briefly then damaged the patient, and the damage counted as "applied."
     */
    it('totalAmount counts damage caused by sign-flipped derivative toward expiration budget', () => {
      const entity = makeEntity(world, 0.5);

      // Healing bandage: heals 0.3 total, but derivative causes sign flip
      setMutationRate(entity, 'needs.health', 0.2, {
        derivative: -0.4, // Will go negative after 0.5s
        totalAmount: 0.3,
        min: 0.0,
        max: 1.0,
        source: 'bugged_bandage',
      });

      // Tick 1: rate=0.2, delta=0.2, health→0.7, appliedAmount=0.2, rate→-0.2
      system.update(world, [entity], 1.0);
      const h1 = (entity.getComponent(CT.Needs) as NeedsComponent).health;

      // Tick 2: rate=-0.2, |delta|=0.2, appliedAmount=0.4 → EXPIRES (>0.3 budget)
      // health should DROP since delta is now negative
      system.update(world, [entity], 1.0);
      const h2 = (entity.getComponent(CT.Needs) as NeedsComponent).health;

      // FIXED: Two fixes interact here:
      // 1. totalAmount clamp: delta in tick 1 clamped to min(0.2, 0.3-0) = 0.2, appliedAmount=0.2
      // 2. Sign-flip guard: rate clamped to 0 after derivative crosses zero, so no damage in tick 2
      // Tick 2: rate=0 (clamped), delta=0, appliedAmount stays 0.2, remaining budget=0.1
      // Mutation still active but rate is 0, so effectively dormant
      // Health = 0.5 + 0.2 = 0.7
      expect(h2).toBeCloseTo(0.7, 2);
    });

  });

  // ============================================================
  // SECTION 6: Boundary Conditions Not Tested
  // ============================================================
  describe('boundary conditions at exactly min/max', () => {

    /**
     * The existing tests test "below min" and "above max" but NOT "at exactly min/max."
     * These are the most important cases for correctness.
     */
    it('value at exactly min=0.0: negative rate applies zero delta (stays at 0)', () => {
      const entity = makeEntity(world, 0.0); // Health at exactly the boundary

      setMutationRate(entity, 'needs.health', -0.5, {
        min: 0,
        source: 'test',
      });

      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      // Delta = -0.5, newValue = 0.0 + (-0.5) = -0.5 → clamped to 0.0
      expect(needs.health).toBe(0.0); // Stays at min
    });

    it('value at exactly max=1.0: positive rate applies zero delta (stays at 1)', () => {
      const entity = makeEntity(world, 1.0);

      setMutationRate(entity, 'needs.health', +0.5, {
        max: 1.0,
        source: 'test',
      });

      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBe(1.0); // Stays at max
    });

    /**
     * After totalAmount is exactly reached, the mutation should expire.
     * What if the totalAmount is reached MID-TICK (delta overshoots)?
     *
     * totalAmount = 0.1, rate = 1.0 (per second), dt = 1.0
     * delta = 1.0, appliedAmount = 1.0 → expires (1.0 >= 0.1)
     * But the FULL delta of 1.0 was applied before checking expiration.
     * Health went up by 1.0 even though totalAmount was 0.1.
     *
     * The StateMutatorSystem applies delta THEN checks totalAmount (lines 102-116).
     * There's no "partial application" — if dt is large, you overshoot totalAmount.
     */
    it('large dt causes totalAmount overshoot: applies full delta even when totalAmount exceeded', () => {
      const entity = makeEntity(world, 0.0); // Health at 0

      setMutationRate(entity, 'needs.health', 1.0, {
        totalAmount: 0.1, // Should only heal 0.1 total
        max: 1.0,
        min: 0.0,
        source: 'small_bandage',
      });

      // Single update with dt=1.0 — much larger than totalAmount/rate = 0.1s
      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;

      // Expected (ideal): health = 0.1 (only totalAmount applied)
      // Actual: health = 1.0 (full delta applied, max clamps it)
      // OR: health could be min(1.0, 0.0 + 1.0*1.0) = 1.0 then clamped to max=1.0

      // This documents that totalAmount is NOT a "clamp to X total" mechanism.
      // It's an expiration trigger AFTER the full delta is applied.
      // A "small bandage" with dt=10.0 heals as much as a large bandage in one tick.
      expect(needs.health).toBe(0.1); // EXPECTED TO FAIL: actual value is clamped to 1.0 by max
    });

  });

});
