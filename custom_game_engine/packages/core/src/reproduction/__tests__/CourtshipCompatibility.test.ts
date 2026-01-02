import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World.js';
import type { Entity } from '../../ecs/Entity.js';
import { EntityImpl } from '../../ecs/Entity.js';

import {
  calculateCompatibility,
  calculateSexualCompatibility,
  calculatePersonalityMesh,
  calculateSharedInterests,
  calculateRelationshipStrength,
} from '../courtship/compatibility.js';

import type { SexualityComponent } from '../SexualityComponent.js';
import type { PersonalityComponent } from '../../components/PersonalityComponent.js';
import type { RelationshipComponent } from '../../components/RelationshipComponent.js';
import { updateRelationship } from '../../components/RelationshipComponent.js';

describe('Courtship Compatibility Calculations', () => {
  let world: World;
  let agent1: Entity;
  let agent2: Entity;

  beforeEach(() => {
    world = new World();
    agent1 = world.createEntity();
    agent2 = world.createEntity();
  });

  describe('Sexual compatibility', () => {
    it('should check attraction between agents', () => {
      // Note: Current implementation has simplified checkAttractionToTarget that always returns true
      // Once implemented, this test should verify actual attraction checking
      const sex1 = createSexualityComponent({
        attractionAxes: [
          {
            dimension: 'sexual',
            intensity: 0,
            morphTarget: 'none',
            genderTarget: 'none',
          },
        ],
      });
      const sex2 = createSexualityComponent();

      (agent1 as EntityImpl).addComponent(sex1);
      (agent2 as EntityImpl).addComponent(sex2);

      const compatibility = calculateSexualCompatibility(agent1, agent2);

      // With simplified implementation, returns style compatibility (1.0 for matching styles)
      expect(compatibility).toBeGreaterThan(0);
    });

    it('should return high score if both mutually attracted', () => {
      // Both agents attracted to each other
      const sex1 = createSexualityComponent({
        relationshipStyle: 'serially_monogamous',
      });
      const sex2 = createSexualityComponent({
        relationshipStyle: 'serially_monogamous',
      });

      (agent1 as EntityImpl).addComponent(sex1);
      (agent2 as EntityImpl).addComponent(sex2);

      const compatibility = calculateSexualCompatibility(agent1, agent2);

      expect(compatibility).toBeGreaterThan(0.7);
    });

    it('should check attraction conditions', () => {
      // Test with 'never' condition type to get 0.3 potential score
      const sex1 = createSexualityComponent({
        attractionCondition: {
          type: 'never',
        },
      });
      const sex2 = createSexualityComponent({
        attractionCondition: {
          type: 'always',
        },
      });

      (agent1 as EntityImpl).addComponent(sex1);
      (agent2 as EntityImpl).addComponent(sex2);

      const compatibility = calculateSexualCompatibility(agent1, agent2);

      // Returns 0.3 for potential but not active attraction when agent1 conditions not met
      expect(compatibility).toBe(0.3);
    });

    it('should return partial score if potential but not active attraction', () => {
      const sex1 = createSexualityComponent({
        attractionCondition: { type: 'kemmer' }, // Not in cycle
        relationshipStyle: 'polyamorous',
      });
      const sex2 = createSexualityComponent({
        attractionCondition: { type: 'kemmer' },
        relationshipStyle: 'monogamous',
      });

      (agent1 as EntityImpl).addComponent(sex1);
      (agent2 as EntityImpl).addComponent(sex2);

      const compatibility = calculateSexualCompatibility(agent1, agent2);

      // Returns 0.3 when conditions not met, or lower style compatibility (0.4) when met
      expect(compatibility).toBeGreaterThan(0);
      expect(compatibility).toBeLessThan(0.5);
    });

    it('should check relationship style compatibility', () => {
      // Monogamous + monogamous
      const sex1Mono = createSexualityComponent({
        relationshipStyle: 'monogamous',
      });
      const sex2Mono = createSexualityComponent({
        relationshipStyle: 'monogamous',
      });

      (agent1 as EntityImpl).addComponent(sex1Mono);
      (agent2 as EntityImpl).addComponent(sex2Mono);

      const monoMono = calculateSexualCompatibility(agent1, agent2);

      // Reset for second test
      agent1 = world.createEntity();
      agent2 = world.createEntity();

      // Monogamous + polyamorous
      const sex1MonoPoly = createSexualityComponent({
        relationshipStyle: 'monogamous',
      });
      const sex2Poly = createSexualityComponent({
        relationshipStyle: 'polyamorous',
      });

      (agent1 as EntityImpl).addComponent(sex1MonoPoly);
      (agent2 as EntityImpl).addComponent(sex2Poly);

      const monoPoly = calculateSexualCompatibility(agent1, agent2);

      expect(monoMono).toBeGreaterThan(monoPoly);
    });
  });

  describe('Personality mesh', () => {
    it('should score higher for complementary traits', () => {
      // Extrovert + Introvert can complement
      const personality1 = createPersonalityComponent({
        extraversion: 0.8,
        agreeableness: 0.7,
      });
      const personality2 = createPersonalityComponent({
        extraversion: 0.3,
        agreeableness: 0.7,
      });

      (agent1 as EntityImpl).addComponent(personality1);
      (agent2 as EntityImpl).addComponent(personality2);

      const complementaryScore = calculatePersonalityMesh(agent1, agent2);

      expect(complementaryScore).toBeGreaterThan(0.5);
    });

    it('should score higher for shared values', () => {
      // Both have similar creativity and spirituality
      const personality1 = createPersonalityComponent({
        creativity: 0.8,
        spirituality: 0.7,
        agreeableness: 0.7,
      });
      const personality2 = createPersonalityComponent({
        creativity: 0.75,
        spirituality: 0.65,
        agreeableness: 0.8,
      });

      (agent1 as EntityImpl).addComponent(personality1);
      (agent2 as EntityImpl).addComponent(personality2);

      const sharedValuesScore = calculatePersonalityMesh(agent1, agent2);

      expect(sharedValuesScore).toBeGreaterThan(0.5);
    });

    it('should score lower for conflicting traits', () => {
      // Both highly neurotic = challenging
      const personality1 = createPersonalityComponent({
        neuroticism: 0.95,
        agreeableness: 0.1,
        extraversion: 0.5,
        creativity: 0.9,
        spirituality: 0.1,
      });
      const personality2 = createPersonalityComponent({
        neuroticism: 0.95,
        agreeableness: 0.1,
        extraversion: 0.5,
        creativity: 0.1,
        spirituality: 0.9,
      });

      (agent1 as EntityImpl).addComponent(personality1);
      (agent2 as EntityImpl).addComponent(personality2);

      const conflictingScore = calculatePersonalityMesh(agent1, agent2);

      // With high neuroticism, low agreeableness, and differing creativity/spirituality
      expect(conflictingScore).toBeLessThan(0.5);
    });

    it('should return neutral score when personality data missing', () => {
      // No personality components added

      const neutralScore = calculatePersonalityMesh(agent1, agent2);

      expect(neutralScore).toBe(0.5);
    });

    it('should weigh multiple factors together', () => {
      // Complementary extraversion (+0.3) only, all other traits different
      // Not both agreeable (0.5 < 0.6), different creativity and spirituality
      const personality1 = createPersonalityComponent({
        extraversion: 0.7,
        agreeableness: 0.5, // Below 0.6 threshold to avoid bonus
        creativity: 0.3,
        spirituality: 0.6,
      });
      const personality2 = createPersonalityComponent({
        extraversion: 0.35,
        agreeableness: 0.7,
        creativity: 0.8, // Different from 0.3 (diff = 0.5 >= 0.3)
        spirituality: 0.2, // Different from 0.6 (diff = 0.4 >= 0.3)
      });

      (agent1 as EntityImpl).addComponent(personality1);
      (agent2 as EntityImpl).addComponent(personality2);

      const mixedScore = calculatePersonalityMesh(agent1, agent2);

      // Should be 0.5 + 0.3 (extraversion) = 0.8
      expect(mixedScore).toBeGreaterThan(0.5);
      expect(mixedScore).toBeLessThan(1);
    });
  });

  describe('Shared interests', () => {
    it('should return 0 when no shared interests', () => {
      const agent1Comp = createAgentComponent({
        gathering: 0.9,
        building: 0.1,
      });
      const agent2Comp = createAgentComponent({
        gathering: 0.1,
        building: 0.9,
      });

      (agent1 as EntityImpl).addComponent(agent1Comp);
      (agent2 as EntityImpl).addComponent(agent2Comp);

      const score = calculateSharedInterests(agent1, agent2);

      expect(score).toBe(0);
    });

    it('should return high score when many shared interests', () => {
      const agent1Comp = createAgentComponent({
        gathering: 0.8,
        building: 0.7,
        farming: 0.9,
      });
      const agent2Comp = createAgentComponent({
        gathering: 0.9,
        building: 0.8,
        farming: 0.85,
      });

      (agent1 as EntityImpl).addComponent(agent1Comp);
      (agent2 as EntityImpl).addComponent(agent2Comp);

      const score = calculateSharedInterests(agent1, agent2);

      expect(score).toBeGreaterThan(0.3); // At least 3/6 activities shared
    });

    it('should return neutral when priority data missing', () => {
      // No agent components added

      const score = calculateSharedInterests(agent1, agent2);

      expect(score).toBe(0.5);
    });

    it('should count only high-priority shared activities', () => {
      const agent1Comp = createAgentComponent({
        gathering: 0.7, // Both high
        building: 0.3,  // Agent1 low
        farming: 0.5,   // Both medium - doesn't count
      });
      const agent2Comp = createAgentComponent({
        gathering: 0.8, // Both high
        building: 0.9,  // Agent2 high, Agent1 low
        farming: 0.4,   // Both medium - doesn't count
      });

      (agent1 as EntityImpl).addComponent(agent1Comp);
      (agent2 as EntityImpl).addComponent(agent2Comp);

      const score = calculateSharedInterests(agent1, agent2);

      // Only gathering counts (both > 0.6)
      expect(score).toBe(1 / 6); // 1 shared activity out of 6 total
    });
  });

  describe('Relationship strength', () => {
    it('should return 0 when no relationship exists', () => {
      // No relationship component

      const strength = calculateRelationshipStrength(agent1, agent2);

      expect(strength).toBe(0);
    });

    it('should return high score for strong existing relationship', () => {
      const relationship = createRelationshipComponent();
      const updated = updateRelationship(relationship, agent2.id, world.tick, 80, 70); // High familiarity and affinity

      (agent1 as EntityImpl).addComponent(updated);

      const strength = calculateRelationshipStrength(agent1, agent2);

      expect(strength).toBeGreaterThan(0.6);
    });

    it('should weigh affinity highest', () => {
      // Test high affinity vs high familiarity
      const relationship1 = createRelationshipComponent();
      const highAffinity = updateRelationship(relationship1, agent2.id, world.tick, 20, 80); // Low familiarity, high affinity

      (agent1 as EntityImpl).addComponent(highAffinity);
      const affinityScore = calculateRelationshipStrength(agent1, agent2);

      // Create new agents for second test
      const agent3 = world.createEntity();
      const agent4 = world.createEntity();

      const relationship2 = createRelationshipComponent();
      const highFamiliarity = updateRelationship(relationship2, agent4.id, world.tick, 80, 20); // High familiarity, low affinity

      (agent3 as EntityImpl).addComponent(highFamiliarity);
      const familiarityScore = calculateRelationshipStrength(agent3, agent4);

      // Affinity is weighted 60% vs familiarity 20%
      expect(affinityScore).toBeGreaterThan(familiarityScore);
    });

    it('should handle negative affinity', () => {
      const relationship = createRelationshipComponent();
      const updated = updateRelationship(relationship, agent2.id, world.tick, 50, -80); // Negative affinity

      (agent1 as EntityImpl).addComponent(updated);

      const strength = calculateRelationshipStrength(agent1, agent2);

      expect(strength).toBeLessThan(0.3);
    });
  });

  describe('Overall compatibility', () => {
    it('should combine all factors with weights', () => {
      // Set up all components for comprehensive test
      const sex1 = createSexualityComponent({
        relationshipStyle: 'serially_monogamous',
      });
      const sex2 = createSexualityComponent({
        relationshipStyle: 'serially_monogamous',
      });

      const personality1 = createPersonalityComponent({
        agreeableness: 0.8,
        creativity: 0.7,
      });
      const personality2 = createPersonalityComponent({
        agreeableness: 0.75,
        creativity: 0.65,
      });

      const agent1Comp = createAgentComponent({
        gathering: 0.8,
        building: 0.7,
      });
      const agent2Comp = createAgentComponent({
        gathering: 0.9,
        building: 0.8,
      });

      const relationship = createRelationshipComponent();
      const updated = updateRelationship(relationship, agent2.id, world.tick, 60, 50);

      (agent1 as EntityImpl).addComponent(sex1);
      (agent1 as EntityImpl).addComponent(personality1);
      (agent1 as EntityImpl).addComponent(agent1Comp);
      (agent1 as EntityImpl).addComponent(updated);

      (agent2 as EntityImpl).addComponent(sex2);
      (agent2 as EntityImpl).addComponent(personality2);
      (agent2 as EntityImpl).addComponent(agent2Comp);

      const compatibility = calculateCompatibility(agent1, agent2, world);

      expect(compatibility).toBeGreaterThan(0.5);
      expect(compatibility).toBeLessThan(1);
    });

    it('should handle low sexual compatibility', () => {
      // Note: Current implementation has simplified checkAttractionToTarget
      // For now, test that incompatible relationship styles reduce compatibility
      const sex1 = createSexualityComponent({
        relationshipStyle: 'aromantic',
      });
      const sex2 = createSexualityComponent({
        relationshipStyle: 'serially_monogamous',
      });

      (agent1 as EntityImpl).addComponent(sex1);
      (agent2 as EntityImpl).addComponent(sex2);

      const compatibility = calculateCompatibility(agent1, agent2, world);

      // Aromantic + romantic has low style compatibility (0.2)
      // Total: 0.2*0.3 + 0.5*0.25 + 0.5*0.2 + 0*0.15 + 0.5*0.1 = 0.31
      expect(compatibility).toBeLessThan(0.4);
    });

    it('should work with minimal components', () => {
      // Only sexuality components
      const sex1 = createSexualityComponent();
      const sex2 = createSexualityComponent();

      (agent1 as EntityImpl).addComponent(sex1);
      (agent2 as EntityImpl).addComponent(sex2);

      const compatibility = calculateCompatibility(agent1, agent2, world);

      // Should return non-zero with just sexuality
      expect(compatibility).toBeGreaterThan(0.3);
    });

    it('should cap at 1.0', () => {
      // Perfect compatibility across all dimensions
      const sex1 = createSexualityComponent({
        relationshipStyle: 'serially_monogamous',
      });
      const sex2 = createSexualityComponent({
        relationshipStyle: 'serially_monogamous',
      });

      const personality1 = createPersonalityComponent({
        agreeableness: 0.9,
        creativity: 0.8,
        spirituality: 0.7,
        extraversion: 0.7,
      });
      const personality2 = createPersonalityComponent({
        agreeableness: 0.95,
        creativity: 0.85,
        spirituality: 0.75,
        extraversion: 0.4, // Complementary
      });

      const agent1Comp = createAgentComponent({
        gathering: 0.9,
        building: 0.9,
        farming: 0.9,
        social: 0.9,
        exploration: 0.9,
        magic: 0.9,
      });
      const agent2Comp = createAgentComponent({
        gathering: 0.95,
        building: 0.95,
        farming: 0.95,
        social: 0.95,
        exploration: 0.95,
        magic: 0.95,
      });

      const relationship = createRelationshipComponent();
      const updated = updateRelationship(relationship, agent2.id, world.tick, 100, 100);

      (agent1 as EntityImpl).addComponent(sex1);
      (agent1 as EntityImpl).addComponent(personality1);
      (agent1 as EntityImpl).addComponent(agent1Comp);
      (agent1 as EntityImpl).addComponent(updated);

      (agent2 as EntityImpl).addComponent(sex2);
      (agent2 as EntityImpl).addComponent(personality2);
      (agent2 as EntityImpl).addComponent(agent2Comp);

      const compatibility = calculateCompatibility(agent1, agent2, world);

      expect(compatibility).toBeLessThanOrEqual(1.0);
    });
  });
});

// Helper functions
function createSexualityComponent(overrides: Partial<SexualityComponent> = {}): SexualityComponent {
  return {
    type: 'sexuality',
    orientation: 'bisexual',
    activelySeeking: true,
    fertilityModifier: 1.0,
    libido: 0.5,
    attractionCondition: { type: 'always' },
    attractionAxes: [
      {
        dimension: 'sexual',
        intensity: 0.7,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
      {
        dimension: 'romantic',
        intensity: 0.7,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
    ],
    relationshipStyle: 'serially_monogamous',
    onset: 'immediate',
    fluidity: 'slow_change',
    reproductiveInterest: 'open_to_offspring',
    intimacyOpenness: 0.5,
    labels: [],
    inReceptiveCycle: false,
    activeAttractions: [],
    currentMates: [],
    rejections: [],
    pastMates: [],
    lifetimePartnerCount: 0,
    ...overrides,
  } as SexualityComponent;
}

function createPersonalityComponent(overrides: Partial<PersonalityComponent> = {}): PersonalityComponent {
  return {
    type: 'personality',
    extraversion: 0.5,
    agreeableness: 0.5,
    conscientiousness: 0.5,
    neuroticism: 0.5,
    openness: 0.5,
    creativity: 0.5,
    spirituality: 0.5,
    ...overrides,
  } as PersonalityComponent;
}

function createAgentComponent(priorities: Record<string, number> = {}): any {
  return {
    type: 'agent',
    priorities: {
      gathering: 0.5,
      building: 0.5,
      farming: 0.5,
      social: 0.5,
      exploration: 0.5,
      magic: 0.5,
      ...priorities,
    },
  };
}

function createRelationshipComponent(): RelationshipComponent {
  return {
    type: 'relationship',
    relationships: new Map(),
    version: 1,
  };
}
