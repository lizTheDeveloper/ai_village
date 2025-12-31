import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../World';
import { AgentCombatSystem } from '../systems/AgentCombatSystem';
import type { Entity } from '../ecs/Entity';

/**
 * Tests for AgentCombatSystem - Acceptance Criterion 3
 *
 * Verifies:
 * - Agent vs agent combat with various causes
 * - Combat skill and equipment comparison
 * - Modifiers (surprise, terrain, injuries)
 * - Outcome rolling with skill-weighted probability
 * - Injury severity determination
 * - LLM fight narrative generation
 * - Social consequences (witness opinions, relationships, reputation)
 * - Legal consequences if laws exist
 */
describe('AgentCombatSystem', () => {
  let world: World;
  let system: AgentCombatSystem;
  let attacker: Entity;
  let defender: Entity;
  let witness: Entity;
  let mockLLM: any;

  beforeEach(() => {
    world = new World();
    mockLLM = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'The two fighters clashed. After a brief struggle, one emerged victorious.',
        memorable_details: ['clashed', 'brief struggle', 'victorious'],
      }),
    };
    system = new AgentCombatSystem(mockLLM, world.eventBus);

    // Create attacker
    attacker = world.createEntity();
    attacker.addComponent('position', { x: 0, y: 0, z: 0 });
    attacker.addComponent('agent', { name: 'Attacker' });
    attacker.addComponent('combat_stats', {
      combatSkill: 7,
      huntingSkill: 5,
      stealthSkill: 6,
      weapon: 'sword',
      armor: 'chainmail',
    });
    attacker.addComponent('relationship', { relationships: {} });

    // Create defender
    defender = world.createEntity();
    defender.addComponent('position', { x: 1, y: 1, z: 0 });
    defender.addComponent('agent', { name: 'Defender' });
    defender.addComponent('combat_stats', {
      combatSkill: 6,
      huntingSkill: 4,
      stealthSkill: 5,
      weapon: 'spear',
      armor: 'leather',
    });
    defender.addComponent('relationship', { relationships: {} });

    // Create witness
    witness = world.createEntity();
    witness.addComponent('position', { x: 5, y: 5, z: 0 });
    witness.addComponent('agent', { name: 'Witness' });
    witness.addComponent('relationship', { relationships: {} });
  });

  describe('REQ-CON-003: Agent Combat', () => {
    it('should support various combat causes', async () => {
      const causes = [
        'territory_dispute',
        'resource_conflict',
        'dominance_challenge',
        'revenge',
        'defense',
        'robbery',
        'honor_duel',
      ];

      for (const cause of causes) {
        attacker.addComponent('conflict', {
          conflictType: 'agent_combat',
          target: defender.id,
          cause: cause,
          state: 'initiated',
          startTime: 0,
        });

        await system.update(world, Array.from(world.entities.values()), 1);

        const conflict = attacker.getComponent('conflict');
        expect(conflict.cause).toBe(cause);

        attacker.removeComponent('conflict');
      }
    });

    it('should compare combat skills and equipment', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = world.getComponent(attacker.id, 'conflict');
      expect(conflict).toBeDefined();
      expect(conflict!.attackerPower).toBeDefined();
      expect(conflict!.defenderPower).toBeDefined();

      // Attacker: combatSkill(7) + weapon(sword=+3) + armor(chainmail+2) = 12
      // Defender: combatSkill(6) + weapon(spear=+2) + armor(leather=+1) = 9
      expect(conflict!.attackerPower).toBeGreaterThan(conflict!.defenderPower);
    });

    it('should apply surprise modifier', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'robbery',
        state: 'initiated',
        surprise: true,
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = attacker.getComponent('conflict');
      expect(conflict.modifiers).toContainEqual(
        expect.objectContaining({ type: 'surprise', value: expect.any(Number) })
      );
    });

    it('should apply terrain modifier', () => {
      const env = world.createEntity();
      env.addComponent('environment', {
        terrain: 'forest',
      });

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = attacker.getComponent('conflict');
      expect(conflict.modifiers).toContainEqual(
        expect.objectContaining({ type: 'terrain' })
      );
    });

    it('should apply injury modifier to injured combatant', () => {
      attacker.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'arms',
        skillPenalties: { combat: -2 },
      });

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = attacker.getComponent('conflict');
      expect(conflict.attackerPower).toBeLessThan(
        7 + 3 + 2 // Base would be 12, should be reduced by injury
      );
    });

    it('should roll outcome with skill-weighted probability', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = attacker.getComponent('conflict');
      expect([
        'attacker_victory',
        'defender_victory',
        'mutual_injury',
        'stalemate',
      ]).toContain(conflict.outcome);

      // With attacker having higher power, should favor attacker victory
      // But outcome is probabilistic, not deterministic
    });

    it('should determine injury severity based on power difference', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const defenderInjury = defender.getComponent('injury');

      if (defenderInjury) {
        expect(['minor', 'major', 'critical']).toContain(defenderInjury.severity);

        // Large power difference should increase injury severity
        const conflict = attacker.getComponent('conflict');
        if (conflict.attackerPower - conflict.defenderPower > 5) {
          expect(['major', 'critical']).toContain(defenderInjury.severity);
        }
      }
    });

    it('should call LLM to generate fight narrative', async () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'honor_duel',
        state: 'initiated',
        startTime: 0,
      });

      await system.update(world, Array.from(world.entities.values()), 1);

      expect(mockLLM.generateNarrative).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent_combat',
          attacker: expect.any(Object),
          defender: expect.any(Object),
          cause: 'honor_duel',
          outcome: expect.any(String),
        })
      );
    });

    it('should include witnesses in narrative context', async () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      await system.update(world, Array.from(world.entities.values()), 1);

      expect(mockLLM.generateNarrative).toHaveBeenCalledWith(
        expect.objectContaining({
          witnesses: expect.arrayContaining([expect.objectContaining({ id: witness.id })]),
        })
      );
    });

    it('should apply social consequences - witness opinions', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'robbery', // Unjust cause
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const witnessRel = witness.getComponent('relationship');
      expect(witnessRel).toBeDefined();
      const witnessRelationships = witnessRel!.relationships;

      // Witness should have negative opinion of attacker for unjust attack
      expect(witnessRelationships[attacker.id]).toBeDefined();
      expect(witnessRelationships[attacker.id].opinion).toBeLessThan(0);
    });

    it('should apply social consequences - relationship changes', () => {
      attacker.getComponent('relationship').relationships[defender.id] = {
        opinion: 50,
        trust: 50,
      };

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const attackerRelationships = attacker.getComponent('relationship').relationships;

      // Combat should worsen relationship
      expect(attackerRelationships[defender.id].opinion).toBeLessThan(50);
      expect(attackerRelationships[defender.id].trust).toBeLessThan(50);
    });

    it('should apply social consequences - reputation', () => {
      attacker.addComponent('reputation', {
        honor: 50,
        violence: 10,
      });

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'honor_duel',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const reputation = attacker.getComponent('reputation');

      // Honor duel victory should increase honor
      const conflict = attacker.getComponent('conflict');
      if (conflict.outcome === 'attacker_victory') {
        expect(reputation.honor).toBeGreaterThan(50);
      }

      // Combat increases violence reputation
      expect(reputation.violence).toBeGreaterThan(10);
    });

    it('should check for legal consequences if laws exist', () => {
      const laws = world.createEntity();
      laws.addComponent('laws', {
        murderIllegal: true,
        assaultIllegal: true,
        selfDefenseLegal: true,
      });

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'robbery', // Illegal
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const legalConsequence = attacker.getComponent('legal_status');
      expect(legalConsequence).toBeDefined();
      expect(legalConsequence.crime).toBe('assault');
      expect(legalConsequence.wanted).toBe(true);
    });

    it('should skip legal consequences for self-defense', () => {
      const laws = world.createEntity();
      laws.addComponent('laws', {
        murderIllegal: true,
        assaultIllegal: true,
        selfDefenseLegal: true,
      });

      defender.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: attacker.id,
        cause: 'defense',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const legalConsequence = defender.getComponent('legal_status');
      expect(legalConsequence).toBeUndefined();
    });

    it('should handle mutual injury outcome', () => {
      // Even match - both get injured
      attacker.getComponent('combat_stats').combatSkill = 5;
      defender.getComponent('combat_stats').combatSkill = 5;
      attacker.getComponent('combat_stats').weapon = 'club';
      defender.getComponent('combat_stats').weapon = 'club';

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = attacker.getComponent('conflict');
      if (conflict.outcome === 'mutual_injury') {
        expect(attacker.hasComponent('injury')).toBe(true);
        expect(defender.hasComponent('injury')).toBe(true);
      }
    });

    it('should handle stalemate outcome', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = attacker.getComponent('conflict');
      if (conflict.outcome === 'stalemate') {
        // No injuries on stalemate
        expect(attacker.hasComponent('injury')).toBe(false);
        expect(defender.hasComponent('injury')).toBe(false);
      }
    });
  });

  describe('error handling', () => {
    it('should throw when combat target does not exist', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: 'nonexistent',
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Combat target entity not found');
    });

    it('should throw when combat target is not an agent', () => {
      const notAgent = world.createEntity();
      notAgent.addComponent('position', { x: 5, y: 5, z: 0 });

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: notAgent.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Combat target is not an agent');
    });

    it('should throw when attacker lacks required combat_stats component', () => {
      attacker.removeComponent('combat_stats');

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow(
        'Attacker missing required component: combat_stats'
      );
    });

    it('should throw when defender lacks required combat_stats component', () => {
      defender.removeComponent('combat_stats');

      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow(
        'Defender missing required component: combat_stats'
      );
    });

    it('should throw when cause is not provided', () => {
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        state: 'initiated',
        startTime: 0,
      } as any);

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Combat cause is required');
    });
  });
});
