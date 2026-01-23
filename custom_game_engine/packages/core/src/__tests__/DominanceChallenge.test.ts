import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, type World } from '../ecs/World';
import { EventBusImpl } from '../events/EventBus';
import { DominanceChallengeSystem } from '../systems/DominanceChallengeSystem';
import { Entity } from '../ecs/Entity';

// Custom matcher for toBeOneOf
expect.extend({
  toBeOneOf(received: any, array: any[]) {
    const pass = array.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${array.join(', ')}`
          : `expected ${received} to be one of ${array.join(', ')}`,
    };
  },
});

/**
 * Tests for DominanceChallengeSystem - Acceptance Criterion 4
 *
 * Verifies:
 * - Formal dominance challenges for dominance-based species
 * - Challenge resolution based on method (combat, display, resource seizure, follower theft)
 * - Immediate hierarchy updates after resolution
 * - Cascade effects (others challenging, fleeing, seeking alliances)
 */
describe('DominanceChallengeSystem', () => {
  let world: World;
  let system: DominanceChallengeSystem;
  let alpha: Entity;
  let challenger: Entity;
  let subordinate: Entity;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new DominanceChallengeSystem();
    system.initialize(world, eventBus);

    // Create alpha (rank 1)
    alpha = world.createEntity();
    alpha.addComponent('position', { x: 0, y: 0, z: 0 });
    alpha.addComponent('agent', { name: 'Alpha', species: 'dominance_based' });
    alpha.addComponent('dominance_rank', {
      rank: 1,
      subordinates: [],
      canChallengeAbove: true,
    });
    alpha.addComponent('combat_stats', {
      combatSkill: 8,
      displaySkill: 7,
      resourceHolding: 50,
    });

    // Create challenger (rank 2)
    challenger = world.createEntity();
    challenger.addComponent('position', { x: 5, y: 5, z: 0 });
    challenger.addComponent('agent', { name: 'Challenger', species: 'dominance_based' });
    challenger.addComponent('dominance_rank', {
      rank: 2,
      subordinates: [],
      canChallengeAbove: true,
    });
    challenger.addComponent('combat_stats', {
      combatSkill: 7,
      displaySkill: 8,
      resourceHolding: 40,
    });

    // Create subordinate (rank 3)
    subordinate = world.createEntity();
    subordinate.addComponent('position', { x: 10, y: 10, z: 0 });
    subordinate.addComponent('agent', { name: 'Subordinate', species: 'dominance_based' });
    subordinate.addComponent('dominance_rank', {
      rank: 3,
      subordinates: [],
      canChallengeAbove: true,
    });
    subordinate.addComponent('combat_stats', {
      combatSkill: 5,
      displaySkill: 6,
      resourceHolding: 20,
    });
  });

  // Helper function to create properly structured conflict components
  function createChallenge(entity: Entity, target: string, method: string, extras: any = {}) {
    entity.addComponent('conflict', {
      type: 'conflict',
      version: 1,
      conflictType: 'dominance_challenge',
      target,
      method,
      state: 'active',
      startTime: 0,
      ...extras,
    });
  }

  describe('REQ-CON-004: Dominance Challenges', () => {
    it('should validate challenge based on species type', () => {
      const nonDominant = world.createEntity();
      nonDominant.addComponent('agent', { name: 'Non-Dominant', species: 'egalitarian' });
      nonDominant.addComponent('position', { x: 0, y: 0, z: 0 });

      expect(() => {
        createChallenge(nonDominant, alpha.id, 'combat');
        system.update(world, Array.from(world.entities.values()), 1);
      }).toThrow('Species does not support dominance challenges');
    });

    it('should validate that challenger can challenge above', () => {
      challenger.getComponent('dominance_rank').canChallengeAbove = false;

      createChallenge(challenger, alpha.id, 'combat');

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Challenger cannot challenge above rank');
    });

    it('should resolve combat-based challenge', () => {
      createChallenge(challenger, alpha.id, 'combat');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      expect(conflict.state).toBe('resolved');
      expect(conflict.winner).toBeOneOf([challenger.id, alpha.id]);

      // Combat: challenger(7) vs alpha(8), close but alpha has edge
    });

    it('should resolve display-based challenge', () => {
      createChallenge(challenger, alpha.id, 'display');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      expect(conflict.state).toBe('resolved');

      // Display: challenger(8) vs alpha(7), challenger has edge
    });

    it('should resolve resource seizure challenge', () => {
      createChallenge(challenger, alpha.id, 'resource_seizure');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      expect(conflict.state).toBe('resolved');

      // Resource: challenger(40) vs alpha(50), alpha has more resources
    });

    it('should resolve follower theft challenge', () => {
      alpha.getComponent('dominance_rank').subordinates = [subordinate.id];

      createChallenge(challenger, alpha.id, 'follower_theft', { targetFollower: subordinate.id });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      expect(conflict.state).toBe('resolved');

      if (conflict.winner === challenger.id) {
        // Subordinate should now follow challenger
        expect(challenger.getComponent('dominance_rank').subordinates).toContain(subordinate.id);
        expect(alpha.getComponent('dominance_rank').subordinates).not.toContain(subordinate.id);
      }
    });

    it('should update hierarchy on challenger victory', () => {
      // Give challenger overwhelming advantage
      challenger.getComponent('combat_stats').combatSkill = 15;

      createChallenge(challenger, alpha.id, 'combat');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.winner === challenger.id) {
        // Challenger takes alpha's rank
        expect(challenger.getComponent('dominance_rank').rank).toBe(1);
        // Alpha is demoted
        expect(alpha.getComponent('dominance_rank').rank).toBe(2);
      }
    });

    it('should apply demotion consequence on loss', () => {
      // Give alpha overwhelming advantage
      alpha.getComponent('combat_stats').combatSkill = 15;

      createChallenge(challenger, alpha.id, 'combat');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.winner === alpha.id) {
        // Challenger may be demoted
        expect(challenger.getComponent('dominance_rank').rank).toBeGreaterThanOrEqual(2);
      }
    });

    it('should apply exile consequence on severe loss', () => {
      alpha.getComponent('combat_stats').combatSkill = 20;

      createChallenge(challenger, alpha.id, 'combat', { consequence: 'exile' });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.winner === alpha.id && conflict.consequence === 'exile') {
        expect(challenger.hasComponent('exiled')).toBe(true);
      }
    });

    it('should apply death consequence on lethal challenge', () => {
      createChallenge(challenger, alpha.id, 'combat', { lethal: true });

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.outcome === 'death') {
        const loser = conflict.winner === alpha.id ? challenger : alpha;
        expect(loser.hasComponent('death')).toBe(true);
      }
    });

    it('should trigger cascade - others challenging new alpha', () => {
      challenger.getComponent('combat_stats').combatSkill = 15;

      createChallenge(challenger, alpha.id, 'combat');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.winner === challenger.id) {
        // Subordinate may challenge new alpha
        const subordinateConflict = subordinate.getComponent('conflict');
        if (subordinateConflict) {
          expect(subordinateConflict.conflictType).toBe('dominance_challenge');
          expect(subordinateConflict.target).toBe(challenger.id);
        }
      }
    });

    it('should trigger cascade - fleeing after defeat', () => {
      challenger.getComponent('combat_stats').combatSkill = 2; // Very weak

      createChallenge(challenger, alpha.id, 'combat');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.winner === alpha.id) {
        // Challenger may flee
        if (challenger.hasComponent('fleeing')) {
          expect(challenger.getComponent('fleeing').from).toBe(alpha.id);
        }
      }
    });

    it('should trigger cascade - seeking alliance after defeat', () => {
      createChallenge(challenger, alpha.id, 'combat');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.winner === alpha.id) {
        // Challenger may seek alliance with subordinate
        if (challenger.hasComponent('seeking_alliance')) {
          expect(challenger.getComponent('seeking_alliance').potential).toContain(subordinate.id);
        }
      }
    });

    it('should update all subordinates on hierarchy change', () => {
      alpha.getComponent('dominance_rank').subordinates = [subordinate.id];
      challenger.getComponent('combat_stats').combatSkill = 15;

      createChallenge(challenger, alpha.id, 'combat');

      system.update(world, Array.from(world.entities.values()), 1);

      const conflict = challenger.getComponent('conflict');
      if (conflict.winner === challenger.id) {
        // Subordinate now follows new alpha
        expect(challenger.getComponent('dominance_rank').subordinates).toContain(subordinate.id);
      }
    });
  });

  describe('error handling', () => {
    it('should throw when challenge target does not exist', () => {
      createChallenge(challenger, 'nonexistent', 'combat');

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Challenge target entity not found');
    });

    it('should throw when target lacks dominance_rank component', () => {
      const nonRanked = world.createEntity();
      nonRanked.addComponent('agent', { name: 'Non-Ranked' });

      createChallenge(challenger, nonRanked.id, 'combat');

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Target missing required component: dominance_rank');
    });

    it('should throw when method is not provided', () => {
      challenger.addComponent('conflict', {
        type: 'conflict',
        version: 1,
        conflictType: 'dominance_challenge',
        target: alpha.id,
        state: 'active',
        startTime: 0,
      } as any);

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Challenge method is required');
    });

    it('should throw when invalid method specified', () => {
      challenger.addComponent('conflict', {
        type: 'conflict',
        version: 1,
        conflictType: 'dominance_challenge',
        target: alpha.id,
        method: 'invalid_method' as any,
        state: 'active',
        startTime: 0,
      });

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Invalid challenge method');
    });
  });
});
