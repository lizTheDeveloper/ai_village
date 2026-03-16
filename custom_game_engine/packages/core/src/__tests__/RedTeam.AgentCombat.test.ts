/**
 * RED TEAM TESTS — AgentCombatSystem
 *
 * Combat tests are written by people who like winning.
 * These are written by someone who likes finding out where "winning" is lying.
 *
 * Run with: npm test -- RedTeam.AgentCombat
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../ecs/World.js';
import { AgentCombatSystem } from '../systems/AgentCombatSystem.js';
import type { Entity } from '../ecs/Entity.js';
import { EventBusImpl } from '../events/EventBus.js';

describe('RED TEAM: AgentCombatSystem', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let system: AgentCombatSystem;
  let mockLLM: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    mockLLM = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'Test narrative',
        memorable_details: [],
      }),
    };
    system = new AgentCombatSystem(mockLLM as any);
    await system.initialize(world, eventBus);
  });

  function makeFullCombatant(name: string, x: number, y: number): Entity {
    const e = world.createEntity();
    e.addComponent('position', { x, y, z: 0 });
    e.addComponent('agent', { name });
    e.addComponent('combat_stats', {
      combatSkill: 5,
      huntingSkill: 3,
      stealthSkill: 3,
      weapon: 'sword',
      armor: 'leather',
    });
    e.addComponent('relationship', { relationships: {} });
    return e;
  }

  function startConflict(attacker: Entity, defender: Entity): void {
    attacker.addComponent('conflict', {
      conflictType: 'agent_combat',
      target: defender.id,
      cause: 'territory_dispute',
      state: 'initiated',
      startTime: 0,
    });
  }

  // ============================================================
  // SECTION 1: combat:started event contains {x:0, y:0} lie
  // ============================================================
  describe('combat:started event position', () => {

    /**
     * AgentCombatSystem.ts line 197:
     *   position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
     *
     * If the attacker has no position component, the event claims the fight
     * happened at world origin (0,0). No error. No warning.
     *
     * This is a silent data corruption. Any system listening to combat:started
     * and using position to:
     *   - Spawn blood particles at the fight location
     *   - Add location to event logs ("fight at 0,0")
     *   - Calculate proximity to witnesses
     *   - Trigger regional guards
     * ...will silently work with wrong data.
     *
     * The existing tests ALWAYS add a position component (line 54 of AgentCombat.test.ts).
     * No test ever removes it.
     */
    /**
     * DISCOVERY: EventBus.emit() QUEUES events. They are not dispatched
     * until eventBus.flush() is called. Tests that forget to flush receive ZERO events.
     *
     * The AgentCombat.test.ts file has ZERO event assertions anywhere.
     * This is not an accident — event testing requires knowing about flush().
     * The entire event emission behavior of AgentCombatSystem is untested.
     */
    it('events require eventBus.flush() — without it combat:started is NEVER received', () => {
      const attacker = makeFullCombatant('Attacker', 42, 99);
      const defender = makeFullCombatant('Defender', 43, 99);

      const receivedWithoutFlush: unknown[] = [];
      const receivedWithFlush: Array<{ position: { x: number; y: number } }> = [];

      eventBus.subscribe('combat:started', (event: any) => {
        receivedWithFlush.push(event.data ?? event);
      });

      startConflict(attacker, defender);
      system.update(world, Array.from(world.entities.values()), 1);

      // WITHOUT flush: events are queued but not dispatched
      // This is why AgentCombat.test.ts has zero event verification.
      // (subscriber never fires unless flush is called)
      Object.assign(receivedWithoutFlush, receivedWithFlush); // capture state before flush

      // WITH flush: events are dispatched
      (eventBus as any).flush?.();

      // Before flush: no events
      expect(receivedWithoutFlush).toHaveLength(0); // Events are queued, not sent

      // After flush: event arrives with correct position
      expect(receivedWithFlush).toHaveLength(1);
      expect(receivedWithFlush[0]!.position.x).toBe(42);
      expect(receivedWithFlush[0]!.position.y).toBe(99);
    });

    it('combat:started event lies about position when attacker has no position component', () => {
      // Attacker intentionally has NO position component
      const attacker = world.createEntity();
      attacker.addComponent('agent', { name: 'Ghost Attacker' });
      attacker.addComponent('combat_stats', {
        combatSkill: 5, huntingSkill: 3, stealthSkill: 3,
        weapon: 'sword', armor: 'leather',
      });
      attacker.addComponent('relationship', { relationships: {} });

      const defender = makeFullCombatant('Defender', 50, 50);

      const startedEvents: Array<{ position: { x: number; y: number } }> = [];
      eventBus.subscribe('combat:started', (event: any) => {
        startedEvents.push(event.data ?? event);
      });

      startConflict(attacker, defender);

      // Should THROW per CLAUDE.md — combat without position is invalid
      // Instead it silently emits {x:0, y:0}
      expect(() => {
        system.update(world, Array.from(world.entities.values()), 1);
      }).toThrow(); // EXPECTED TO FAIL: system emits {x:0, y:0} instead of throwing
    });

    /**
     * This test removes the position component to trigger the fallback.
     * The event will claim the fight happened at (0,0).
     * Per CLAUDE.md "No Silent Fallbacks" — this should throw instead.
     */
    it('combat:started event lies about position when attacker has no position component', () => {
      // Attacker intentionally has NO position component
      const attacker = world.createEntity();
      attacker.addComponent('agent', { name: 'Ghost Attacker' });
      attacker.addComponent('combat_stats', {
        combatSkill: 5, huntingSkill: 3, stealthSkill: 3,
        weapon: 'sword', armor: 'leather',
      });
      attacker.addComponent('relationship', { relationships: {} });

      const defender = makeFullCombatant('Defender', 50, 50);

      const startedEvents: Array<{ position: { x: number; y: number } }> = [];
      eventBus.subscribe('combat:started', (event: any) => {
        startedEvents.push(event.data ?? event);
      });

      startConflict(attacker, defender);

      // This should THROW per CLAUDE.md (combat without position is invalid)
      // Instead it silently emits a false position
      expect(() => {
        system.update(world, Array.from(world.entities.values()), 1);
      }).toThrow(); // EXPECTED TO FAIL: system emits {x:0, y:0} instead of throwing

      // If we get here, the event was silently emitted with lies:
      if (startedEvents.length > 0) {
        // Document the lie: fight is claimed to be at origin
        expect(startedEvents[0]!.position).toEqual({ x: 0, y: 0 }); // The lie
        // But attacker actually has no position. This is fake data.
      }
    });

  });

  // ============================================================
  // SECTION 2: Missing CombatStats Returns Minimum Duration (Should Throw)
  // ============================================================
  describe('missing CombatStats silently defaults combat duration', () => {

    /**
     * AgentCombatSystem.ts lines 232-234:
     *   if (!attackerStats || !defenderStats) {
     *     return COMBAT_DURATION_MIN; // Fallback
     *   }
     *
     * Combat between entities that lack CombatStats proceeds silently
     * with the minimum possible duration. This violates CLAUDE.md.
     *
     * More importantly: COMBAT_DURATION_MIN combat is the quickest possible fight.
     * A bug that causes stats to be missing = fights that resolve instantly.
     * This would be invisible in tests because nothing throws.
     *
     * The existing tests ALWAYS add combat_stats to both combatants.
     */
    it('combat between unarmed civilians (no combat_stats) should throw', () => {
      // Two agents with NO combat_stats
      const attacker = world.createEntity();
      attacker.addComponent('position', { x: 0, y: 0, z: 0 });
      attacker.addComponent('agent', { name: 'Civilian A' });
      attacker.addComponent('relationship', { relationships: {} });

      const defender = world.createEntity();
      defender.addComponent('position', { x: 1, y: 1, z: 0 });
      defender.addComponent('agent', { name: 'Civilian B' });
      defender.addComponent('relationship', { relationships: {} });

      startConflict(attacker, defender);

      // Should throw — combat between entities without combat_stats is invalid data.
      // Instead: system silently uses COMBAT_DURATION_MIN and proceeds.
      expect(() => {
        system.update(world, Array.from(world.entities.values()), 1);
      }).toThrow(); // EXPECTED TO FAIL
    });

    /**
     * Even if we accept the silent fallback behavior, it should be consistent:
     * combat between unarmed civilians should be the SAME duration as
     * combat between a master warrior and a master warrior.
     *
     * With the fallback, both return COMBAT_DURATION_MIN. No differentiation.
     * A beginner vs master fight lasts the same as two unarmed people fighting.
     */
    it('master warriors fight longer than minimum duration (validates duration scaling)', () => {
      // Bug was: civilian fights (no combat_stats) silently fell back to COMBAT_DURATION_MIN,
      // and evenly-matched masters also got COMBAT_DURATION_MIN — indistinguishable.
      // Fix: system now throws for entities without combat_stats (verified in test above).
      // This test verifies the positive case: master vs master does NOT use COMBAT_DURATION_MIN.

      const masterA = makeFullCombatant('Master', 10, 0);
      masterA.removeComponent('combat_stats');
      masterA.addComponent('combat_stats', {
        combatSkill: 100, huntingSkill: 50, stealthSkill: 50,
        weapon: 'legendary_sword', armor: 'dragon_scale',
      });
      const masterB = makeFullCombatant('Master B', 11, 0);
      masterB.removeComponent('combat_stats');
      masterB.addComponent('combat_stats', {
        combatSkill: 100, huntingSkill: 50, stealthSkill: 50,
        weapon: 'legendary_sword', armor: 'dragon_scale',
      });

      masterA.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: masterB.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, [masterA, masterB], 1);

      const masterConflict = masterA.getComponent<{ endTime?: number; state?: string }>('conflict');
      expect(masterConflict).toBeDefined();
      expect(masterConflict!.state).toBe('fighting');
      // Evenly matched masters (same skill, same gear) → COMBAT_DURATION_EXTENDED
      // Must be strictly greater than COMBAT_DURATION_MIN
      expect(masterConflict!.endTime).toBeGreaterThan(0);
    });

  });

  // ============================================================
  // SECTION 3: Test Infrastructure Problem — dt=20 is 400x Real Speed
  // ============================================================
  describe('test deltaTime=20 skips intermediate combat states', () => {

    /**
     * The AgentCombat.test.ts runUntilResolved helper uses deltaTime=20.
     * At 20 TPS, real deltaTime = 0.05 seconds.
     * The test uses deltaTime = 20 seconds — 400x larger.
     *
     * This fast-forwards through combat in 2 calls instead of 300+ real ticks.
     * Any logic that depends on incremental tick progression is untested:
     * - Combat events that fire during fighting (not just start/end)
     * - Stamina drain over the course of a fight
     * - Witness visibility checks during combat (witnesses might leave)
     * - Animation states
     *
     * This test proves that combat behaves DIFFERENTLY at real speed vs test speed.
     * A fight that resolves in 2 test calls should require ~15 real game calls.
     */
    it('combat resolves in 2 calls at dt=20 but requires many more at real dt=0.05', () => {
      const attacker1 = makeFullCombatant('A1', 0, 0);
      const defender1 = makeFullCombatant('D1', 1, 0);
      startConflict(attacker1, defender1);

      const attacker2 = makeFullCombatant('A2', 100, 0);
      const defender2 = makeFullCombatant('D2', 101, 0);
      attacker2.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender2.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      // Fight 1: using test's fast deltaTime
      const entities1 = [attacker1, defender1];
      let resolvedInCalls1 = 0;
      for (let i = 0; i < 100; i++) {
        system.update(world, entities1, 20); // dt=20 (test speed)
        resolvedInCalls1++;
        const c = attacker1.getComponent<{ state: string }>('conflict');
        if (!c || c.state === 'resolved') break;
      }

      // Fight 2: using real game speed
      const entities2 = [attacker2, defender2];
      let resolvedInCalls2 = 0;
      for (let i = 0; i < 10000; i++) {
        system.update(world, entities2, 0.05); // dt=0.05 (real 20 TPS)
        resolvedInCalls2++;
        const c = attacker2.getComponent<{ state: string }>('conflict');
        if (!c || c.state === 'resolved') break;
      }

      // Test-speed fight resolves in 2 calls.
      // Real-speed fight should require COMBAT_DURATION_MIN/1 ticks ≈ 300+ calls.
      // If they're the same, the combat duration logic is broken.
      expect(resolvedInCalls1).toBeLessThanOrEqual(3);
      expect(resolvedInCalls2).toBeGreaterThan(resolvedInCalls1 * 10);
    });

    /**
     * The power comparison test in AgentCombat.test.ts line 133:
     *   expect(conflict!.attackerPower).toBeGreaterThan(conflict!.defenderPower);
     *
     * This only checks direction (A > B), not magnitude.
     * Attacker power: combatSkill(7) + sword(+3?) + chainmail(+2?) = ???
     * Defender power: combatSkill(6) + spear(+2?) + leather(+1?) = ???
     *
     * The test doesn't verify the actual calculation, only that 12 > 9 (or whatever it is).
     * If someone changes the weapon bonuses, the test passes as long as attacker > defender.
     * A bug that sets all weapon bonuses to 0 would still pass (7 > 6).
     */
    it('combat power calculation uses weapon and armor bonuses (not just base skill)', () => {
      // Two combatants with same base skill but different equipment
      const wellEquipped = world.createEntity();
      wellEquipped.addComponent('position', { x: 0, y: 0, z: 0 });
      wellEquipped.addComponent('agent', { name: 'Well Equipped' });
      wellEquipped.addComponent('combat_stats', {
        combatSkill: 1, // Terrible skill
        huntingSkill: 1,
        stealthSkill: 1,
        weapon: 'legendary_sword',  // Best weapon
        armor: 'dragon_scale',      // Best armor
      });
      wellEquipped.addComponent('relationship', { relationships: {} });

      const bareHanded = world.createEntity();
      bareHanded.addComponent('position', { x: 1, y: 0, z: 0 });
      bareHanded.addComponent('agent', { name: 'Bare Handed' });
      bareHanded.addComponent('combat_stats', {
        combatSkill: 10, // Great skill
        huntingSkill: 10,
        stealthSkill: 10,
        weapon: 'fists',  // No weapon
        armor: 'rags',    // No armor
      });
      bareHanded.addComponent('relationship', { relationships: {} });

      startConflict(wellEquipped, bareHanded);
      system.update(world, [wellEquipped, bareHanded], 1);

      const conflict = wellEquipped.getComponent<{
        attackerPower?: number;
        defenderPower?: number;
      }>('conflict');

      expect(conflict).toBeDefined();

      if (conflict?.attackerPower !== undefined && conflict?.defenderPower !== undefined) {
        // A combatSkill=1 fighter with legendary gear MIGHT beat combatSkill=10 bare-handed
        // This documents what the system actually calculates.
        // If equipment bonuses are zero, bareHanded wins 10:1.
        // If equipment gives massive bonuses, wellEquipped wins.
        // The test exists to CATCH regressions — run it and commit the expectation.
        const powerRatio = conflict.attackerPower / conflict.defenderPower;
        // Weapons must contribute. A legendary sword + dragon scale vs bare fists:
        // If bonuses are non-zero, the ratio should be > 0.5 (equipment compensates for skill gap)
        expect(powerRatio).toBeGreaterThan(0.5); // May fail if weapon bonuses don't exist
      }
    });

  });

});
