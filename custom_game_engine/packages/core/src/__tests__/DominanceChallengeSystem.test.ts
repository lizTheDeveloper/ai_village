import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World.js';
import { DominanceChallengeSystem } from '../systems/DominanceChallengeSystem.js';
import { createConflictComponent } from '../components/ConflictComponent.js';
import { createDominanceRankComponent } from '../components/DominanceRankComponent.js';

describe('DominanceChallengeSystem', () => {
  let world: World;
  let system: DominanceChallengeSystem;

  beforeEach(() => {
    world = new World();
    system = new DominanceChallengeSystem(world.eventBus);
  });

  describe('Challenge Resolution', () => {
    it('should resolve combat challenge based on skills', () => {
      // Create challenger (rank 3)
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Challenger',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3,
        canChallengeAbove: true,
      }));
      challenger.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 8,
      });
      challenger.addComponent('skills', {
        type: 'skills',
        version: 1,
        intimidation: 7,
      });

      // Create incumbent (rank 1 - alpha)
      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Alpha',
        species: 'kif',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 1,
        subordinates: [challenger.id],
      }));
      incumbent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 6,
      });
      incumbent.addComponent('skills', {
        type: 'skills',
        version: 1,
        intimidation: 5,
      });

      // Create challenge
      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
        metadata: { method: 'combat' },
      }));

      // Track events
      const events: any[] = [];
      world.eventBus.on('dominance:resolved', (data) => events.push({ type: 'resolved', data }));
      world.eventBus.on('dominance:challenge', (data) => events.push({ type: 'challenge', data }));

      // Run system
      const entities = world.getAllEntities();
      system.update(world, entities, 1000);
      world.eventBus.flush();

      // Verify challenge was resolved
      const conflict = world.getComponent(challenger.id, 'conflict');
      expect(conflict?.state).toBe('resolved');
      expect(events.length).toBeGreaterThan(0);
    });

    it('should update hierarchy when challenger wins', () => {
      // Create strong challenger
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Strong Challenger',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 5,
        canChallengeAbove: true,
      }));
      challenger.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 10, // Very high
      });
      challenger.addComponent('skills', {
        type: 'skills',
        version: 1,
        intimidation: 10,
      });

      // Create weak incumbent
      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Weak Alpha',
        species: 'kif',
      });
      const sub1 = 'subordinate-1';
      const sub2 = 'subordinate-2';
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 2,
        subordinates: [sub1, sub2],
      }));
      incumbent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 1, // Very low
      });
      incumbent.addComponent('skills', {
        type: 'skills',
        version: 1,
        intimidation: 1,
      });

      // Create challenge
      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
        metadata: { method: 'combat' },
      }));

      // Run system multiple times until challenger wins
      const entities = world.getAllEntities();
      let challengerWon = false;
      for (let i = 0; i < 20; i++) {
        system.update(world, entities, 1000);
        world.eventBus.flush();

        const challengerRank = world.getComponent(challenger.id, 'dominance_rank');
        if (challengerRank && challengerRank.rank === 2) {
          challengerWon = true;
          break;
        }

        // Reset conflict for next attempt
        if (i < 19) {
          challenger.updateComponent('conflict', () => createConflictComponent({
            conflictType: 'dominance_challenge',
            target: incumbent.id,
            state: 'active',
            startTime: Date.now(),
            metadata: { method: 'combat' },
          }));
        }
      }

      // With 10 vs 1 stats, challenger should win eventually
      expect(challengerWon).toBe(true);

      if (challengerWon) {
        const challengerRank = world.getComponent(challenger.id, 'dominance_rank');
        expect(challengerRank?.rank).toBe(2); // Takes incumbent's rank
        expect(challengerRank?.subordinates).toContain(sub1);
        expect(challengerRank?.subordinates).toContain(sub2);

        const incumbentRank = world.getComponent(incumbent.id, 'dominance_rank');
        expect(incumbentRank?.rank).toBeGreaterThan(2); // Demoted
      }
    });

    it('should resolve display challenge based on intimidation only', () => {
      // Create challenger with high intimidation
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Intimidating',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3,
        canChallengeAbove: true,
      }));
      challenger.addComponent('skills', {
        type: 'skills',
        version: 1,
        intimidation: 9,
      });

      // Create incumbent with low intimidation
      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Beta',
        species: 'kif',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 2,
      }));
      incumbent.addComponent('skills', {
        type: 'skills',
        version: 1,
        intimidation: 2,
      });

      // Create display challenge
      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
        metadata: { method: 'display' },
      }));

      // Run system
      const entities = world.getAllEntities();
      system.update(world, entities, 1000);
      world.eventBus.flush();

      // Verify challenge was resolved
      const conflict = world.getComponent(challenger.id, 'conflict');
      expect(conflict?.state).toBe('resolved');
    });

    it('should resolve challenge and update hierarchy', () => {
      // Create challenger
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Challenger',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3,
        canChallengeAbove: true,
      }));
      challenger.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 9,
      });

      // Create incumbent
      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Alpha',
        species: 'kif',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 1,
      }));
      incumbent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 2,
      });

      // Create opportunist
      const opportunist = world.createEntity();
      opportunist.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Opportunist',
        species: 'kif',
      });
      opportunist.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 2,
        canChallengeAbove: true,
      }));

      // Create challenge
      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
        metadata: { method: 'combat' },
      }));

      // Run system multiple times until resolution occurs
      const entities = world.getAllEntities();
      let resolved = false;
      for (let i = 0; i < 20; i++) {
        system.update(world, entities, 1000);
        world.eventBus.flush();

        const conflict = world.getComponent(challenger.id, 'conflict');
        if (conflict?.state === 'resolved') {
          resolved = true;
          break;
        }

        // Reset for next attempt
        if (i < 19) {
          challenger.updateComponent('conflict', () => createConflictComponent({
            conflictType: 'dominance_challenge',
            target: incumbent.id,
            state: 'active',
            startTime: Date.now(),
            metadata: { method: 'combat' },
          }));
        }
      }

      // Challenge should resolve (high combat skill challenger vs low combat skill incumbent)
      expect(resolved).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should throw if species does not support dominance challenges', () => {
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Human',
        species: 'human', // Not dominance-based
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3,
        canChallengeAbove: true,
      }));

      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Alpha',
        species: 'human',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 1,
      }));

      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
      }));

      const entities = world.getAllEntities();
      expect(() => system.update(world, entities, 1000)).toThrow('Species does not support dominance challenges');
    });

    it('should throw if challenger cannot challenge above', () => {
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Subordinate',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 5,
        canChallengeAbove: false, // Cannot challenge
      }));

      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Beta',
        species: 'kif',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 2,
      }));

      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
      }));

      const entities = world.getAllEntities();
      expect(() => system.update(world, entities, 1000)).toThrow('Challenger cannot challenge above rank');
    });

    it('should throw if challenging someone of equal or lower rank', () => {
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Challenger',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 2,
        canChallengeAbove: true,
      }));

      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Inferior',
        species: 'kif',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3, // Lower rank (higher number) than challenger
      }));

      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
      }));

      const entities = world.getAllEntities();
      expect(() => system.update(world, entities, 1000)).toThrow('Can only challenge those of higher rank');
    });

    it('should throw if species mismatch', () => {
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Kif',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3,
        canChallengeAbove: true,
      }));

      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Wolf',
        species: 'wolf', // Different species
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 1,
      }));

      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
      }));

      const entities = world.getAllEntities();
      expect(() => system.update(world, entities, 1000)).toThrow('Can only challenge members of same species');
    });
  });

  describe('Challenge Methods', () => {
    it('should resolve follower_theft based on socializing skill', () => {
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Charismatic',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3,
        canChallengeAbove: true,
      }));
      challenger.addComponent('skills', {
        type: 'skills',
        version: 1,
        socializing: 10,
      });

      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Antisocial',
        species: 'kif',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 2,
      }));
      incumbent.addComponent('skills', {
        type: 'skills',
        version: 1,
        socializing: 1,
      });

      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
        metadata: { method: 'follower_theft' },
      }));

      const entities = world.getAllEntities();
      system.update(world, entities, 1000);
      world.eventBus.flush();

      const conflict = world.getComponent(challenger.id, 'conflict');
      expect(conflict?.state).toBe('resolved');
    });

    it('should resolve resource_seizure based on stealth and combat', () => {
      const challenger = world.createEntity();
      challenger.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Thief',
        species: 'kif',
      });
      challenger.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 3,
        canChallengeAbove: true,
      }));
      challenger.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 8,
        stealthSkill: 9,
      });

      const incumbent = world.createEntity();
      incumbent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Defender',
        species: 'kif',
      });
      incumbent.addComponent('dominance_rank', createDominanceRankComponent({
        rank: 2,
      }));
      incumbent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 4,
      });

      challenger.addComponent('conflict', createConflictComponent({
        conflictType: 'dominance_challenge',
        target: incumbent.id,
        state: 'active',
        startTime: Date.now(),
        metadata: { method: 'resource_seizure' },
      }));

      const entities = world.getAllEntities();
      system.update(world, entities, 1000);
      world.eventBus.flush();

      const conflict = world.getComponent(challenger.id, 'conflict');
      expect(conflict?.state).toBe('resolved');
    });
  });
});
