/**
 * Integration tests for Phase 4: Emergent Gods
 *
 * Tests the full emergence pipeline:
 * 1. Agents develop shared beliefs
 * 2. System detects emergence threshold
 * 3. Deity is created with synthesized identity
 * 4. AI god pursues goals
 * 5. Gods form relationships
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { DeityEmergenceSystem } from '../DeityEmergenceSystem.js';
import { AIGodBehaviorSystem } from '../AIGodBehaviorSystem.js';
import { DeityComponent } from '../../components/DeityComponent.js';
import { createSpiritualComponent } from '../../components/SpiritualComponent.js';
import { AgentComponent } from '../../components/AgentComponent.js';
import { PositionComponent } from '../../components/PositionComponent.js';
import {
  calculateInitialRelationship,
  calculateDomainSynergy,
} from '../../divinity/DeityRelations.js';
import type { DivineDomain } from '../../divinity/DeityTypes.js';

describe('Phase 4: Deity Emergence Integration', () => {
  let world: World;
  let emergenceSystem: DeityEmergenceSystem;

  beforeEach(() => {
    world = new World();
    emergenceSystem = new DeityEmergenceSystem({
      minBelievers: 3,
      minAverageStrength: 0.6,
      minCohesion: 0.5,
      minBeliefPoints: 50,
      checkInterval: 100,
    });
  });

  describe('Emergence Detection', () => {
    it('should detect when enough agents share belief pattern', () => {
      // Create agents with shared belief pattern
      for (let i = 0; i < 5; i++) {
        const entity = world.createEntity();

        const agent = new AgentComponent(
          `Agent ${i}`,
          'human',
          { x: 0, y: 0 },
          {
            openness: 0.7,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.7,
            neuroticism: 0.4,
          }
        );

        const spiritual = createSpiritualComponent(0.8); // High faith
        spiritual.prayers.push({
          id: `prayer_${i}`,
          type: 'help',
          urgency: 'earnest',
          content: 'Please bless our harvest and bring rain',
          timestamp: world.currentTick,
          answered: false,
        });

        (entity as any).addComponent(agent);
        (entity as any).addComponent(spiritual);
        (entity as any).addComponent(new PositionComponent(0, 0));
      }

      // Run emergence detection
      const deityCountBefore = Array.from(world.entities.values()).filter(e =>
        e.hasComponent('deity')
      ).length;

      // Advance time past check interval
      world.currentTick = 150;
      emergenceSystem.update(world);

      const deityCountAfter = Array.from(world.entities.values()).filter(e =>
        e.hasComponent('deity')
      ).length;

      // Should have created a deity
      expect(deityCountAfter).toBeGreaterThan(deityCountBefore);
    });

    it('should not emerge with insufficient believers', () => {
      // Create only 2 agents (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        const entity = world.createEntity();

        const agent = new AgentComponent(`Agent ${i}`, 'human', { x: 0, y: 0 });
        const spiritual = createSpiritualComponent(0.9);
        spiritual.prayers.push({
          id: `prayer_${i}`,
          type: 'help',
          urgency: 'earnest',
          content: 'Please heal the sick',
          timestamp: world.currentTick,
          answered: false,
        });

        (entity as any).addComponent(agent);
        (entity as any).addComponent(spiritual);
        (entity as any).addComponent(new PositionComponent(0, 0));
      }

      world.currentTick = 150;
      emergenceSystem.update(world);

      const deityCount = Array.from(world.entities.values()).filter(e =>
        e.hasComponent('deity')
      ).length;

      expect(deityCount).toBe(0);
    });

    it('should assign believers to newly emerged deity', () => {
      // Create agents
      const agentIds: string[] = [];
      for (let i = 0; i < 4; i++) {
        const entity = world.createEntity();
        agentIds.push(entity.id);

        const agent = new AgentComponent(`Agent ${i}`, 'human', { x: 0, y: 0 });
        const spiritual = createSpiritualComponent(0.7);
        spiritual.prayers.push({
          id: `prayer_${i}`,
          type: 'help',
          urgency: 'earnest',
          content: 'Protect us from danger',
          timestamp: world.currentTick,
          answered: false,
        });

        (entity as any).addComponent(agent);
        (entity as any).addComponent(spiritual);
        (entity as any).addComponent(new PositionComponent(0, 0));
      }

      world.currentTick = 150;
      emergenceSystem.update(world);

      // Find the deity
      const deityEntity = Array.from(world.entities.values()).find(e =>
        e.hasComponent('deity')
      );

      expect(deityEntity).toBeDefined();

      if (deityEntity) {
        const deity = deityEntity.getComponent('deity') as DeityComponent;
        expect(deity.believers.size).toBe(4);

        // Check that agents now believe in this deity
        for (const agentId of agentIds) {
          const agentEntity = world.getEntity(agentId);
          expect(agentEntity).toBeDefined();

          if (agentEntity) {
            const spiritual = agentEntity.getComponent('spiritual');
            expect(spiritual?.believedDeity).toBe(deityEntity.id);
          }
        }
      }
    });
  });

  describe('AI God Behavior', () => {
    it('should answer prayers when deity has enough belief', () => {
      // Create a deity
      const deityEntity = world.createEntity();
      const deity = new DeityComponent('The Test God', 'ai');
      deity.belief.currentBelief = 200; // Enough for multiple prayers
      deityEntity.addComponent(deity);

      // Create believer with prayer
      const believerEntity = world.createEntity();
      const agent = new AgentComponent('Believer', 'human', { x: 0, y: 0 });
      const spiritual = createSpiritualComponent(0.8, deityEntity.id);

      believerEntity.addComponent(agent);
      believerEntity.addComponent(spiritual);
      believerEntity.addComponent(new PositionComponent(0, 0));

      deity.addBeliever(believerEntity.id);
      deity.addPrayer(believerEntity.id, 'prayer_1', world.currentTick);

      // Run AI behavior system
      const behaviorSystem = new AIGodBehaviorSystem();
      world.currentTick = 2500; // Past decision interval
      behaviorSystem.update(world);

      // Prayer should be answered
      expect(deity.prayerQueue.length).toBe(0);
      expect(deity.belief.totalBeliefSpent).toBeGreaterThan(0);
    });

    it('should not act when belief is too low', () => {
      const deityEntity = world.createEntity();
      const deity = new DeityComponent('Poor God', 'ai');
      deity.belief.currentBelief = 10; // Too low
      deityEntity.addComponent(deity);

      const initialBelief = deity.belief.currentBelief;

      const behaviorSystem = new AIGodBehaviorSystem();
      world.currentTick = 2500;
      behaviorSystem.update(world);

      // Should not have spent any belief
      expect(deity.belief.currentBelief).toBe(initialBelief);
    });
  });

  describe('Deity Relationships', () => {
    it('should create hostile relationship when domains overlap', () => {
      const deity1 = {
        id: 'god1',
        domain: 'harvest' as DivineDomain,
        secondaryDomains: ['nature' as DivineDomain],
        personality: {
          benevolence: 0.7,
          interventionism: 0.5,
          wrathfulness: 0.3,
        },
      };

      const deity2 = {
        id: 'god2',
        domain: 'harvest' as DivineDomain, // Same domain!
        secondaryDomains: [],
        personality: {
          benevolence: 0.6,
          interventionism: 0.4,
          wrathfulness: 0.4,
        },
      };

      const relation = calculateInitialRelationship(deity1, deity2);

      expect(relation.sentiment).toBeLessThan(0);
      expect(relation.status).toMatch(/competitive|hostile/);
    });

    it('should create friendly relationship when domains are synergistic', () => {
      const deity1 = {
        id: 'god1',
        domain: 'harvest' as DivineDomain,
        secondaryDomains: [],
        personality: {
          benevolence: 0.7,
          interventionism: 0.5,
          wrathfulness: 0.3,
        },
      };

      const deity2 = {
        id: 'god2',
        domain: 'nature' as DivineDomain, // Synergistic with harvest
        secondaryDomains: [],
        personality: {
          benevolence: 0.8, // Similar personality
          interventionism: 0.6,
          wrathfulness: 0.2,
        },
      };

      const relation = calculateInitialRelationship(deity1, deity2);

      expect(relation.sentiment).toBeGreaterThan(0);
      expect(relation.status).toMatch(/friendly|allied/);
    });

    it('should calculate domain synergy correctly', () => {
      // Harvest and nature should be synergistic
      const synergy1 = calculateDomainSynergy('harvest', 'nature');
      expect(synergy1).toBeGreaterThan(0.5);

      // War and harvest should not be synergistic
      const synergy2 = calculateDomainSynergy('war', 'harvest');
      expect(synergy2).toBeLessThan(0.5);

      // War and death should be synergistic
      const synergy3 = calculateDomainSynergy('war', 'death');
      expect(synergy3).toBeGreaterThan(0.5);
    });
  });

  describe('Complete Emergence Flow', () => {
    it('should go from shared beliefs -> emergence -> AI behavior -> relationships', () => {
      // Step 1: Create agents with shared beliefs
      for (let i = 0; i < 4; i++) {
        const entity = world.createEntity();
        const agent = new AgentComponent(`Agent ${i}`, 'human', { x: 0, y: 0 });
        const spiritual = createSpiritualComponent(0.75);

        spiritual.prayers.push({
          id: `prayer_${i}`,
          type: 'help',
          urgency: 'earnest',
          content: 'Bless the crops with rain',
          timestamp: world.currentTick,
          answered: false,
        });

        (entity as any).addComponent(agent);
        (entity as any).addComponent(spiritual);
        (entity as any).addComponent(new PositionComponent(0, 0));
      }

      // Step 2: Trigger emergence
      world.currentTick = 150;
      emergenceSystem.update(world);

      const deities = Array.from(world.entities.values()).filter(e =>
        e.hasComponent('deity')
      );
      expect(deities.length).toBe(1);

      const deity1Entity = deities[0];
      const deity1 = deity1Entity.getComponent('deity') as DeityComponent;

      // Step 3: Create second deity manually (to test relationships)
      const deity2Entity = world.createEntity();
      const deity2 = new DeityComponent('The Rival', 'ai');
      deity2.identity.domain = 'nature'; // Synergistic with likely harvest domain
      deity2Entity.addComponent(deity2);

      // Step 4: Calculate relationship
      const relation = calculateInitialRelationship(
        {
          id: deity1Entity.id,
          domain: deity1.identity.domain!,
          secondaryDomains: deity1.identity.secondaryDomains,
          personality: deity1.identity.perceivedPersonality,
        },
        {
          id: deity2Entity.id,
          domain: deity2.identity.domain!,
          secondaryDomains: deity2.identity.secondaryDomains,
          personality: deity2.identity.perceivedPersonality,
        }
      );

      // Should have some relationship
      expect(relation).toBeDefined();
      expect(relation.otherDeityId).toBe(deity2Entity.id);

      // Step 5: Run AI behavior
      const behaviorSystem = new AIGodBehaviorSystem();
      deity1.belief.currentBelief = 200;
      world.currentTick = 2500;
      behaviorSystem.update(world);

      // Deity should have acted (answered prayers or expanded worship)
      expect(deity1.belief.totalBeliefSpent).toBeGreaterThan(0);
    });
  });
});
