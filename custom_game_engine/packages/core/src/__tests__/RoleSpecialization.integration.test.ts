import { ComponentType } from '../types/ComponentType.js';
/**
 * Role Specialization - Integration Tests
 *
 * Tests that the Progressive Skill Reveal system creates emergent role specialization
 * where skilled agents focus on their domain.
 *
 * Per work order: builders do 60%+ of construction, cooks manage food, etc.
 *
 * These tests should FAIL initially (TDD red phase).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../World.js';
import type { Entity } from '../ecs/Entity.js';
import type { SkillId, SkillLevel } from '../components/SkillsComponent.js';

describe('Role Specialization Integration', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  // ============================================
  // SUCCESS METRIC 1: Skill Diversity at Spawn
  // ============================================

  describe('Skill Diversity at Spawn (80%+ have skill > 0)', () => {
    it('should spawn agents with diverse starting skills', () => {
      const { generateRandomStartingSkills } = require('../components/SkillsComponent.js');
      const { createPersonalityComponent } = require('../components/PersonalityComponent.js');

      const agentsWithSkills: number[] = [];

      // Spawn 100 agents with random personalities
      for (let i = 0; i < 100; i++) {
        const personality = new PersonalityComponent({
          workEthic: Math.random(),
          conscientiousness: Math.random(),
          openness: Math.random(),
          agreeableness: Math.random(),
          extraversion: Math.random(),
          neuroticism: Math.random(),
        });

        const skills = generateRandomStartingSkills(personality);

        // Check if agent has at least one skill > 0
        const hasSkill = Object.values(skills.levels).some((level: number) => level > 0);
        if (hasSkill) {
          agentsWithSkills.push(i);
        }
      }

      const percentWithSkills = (agentsWithSkills.length / 100) * 100;

      expect(percentWithSkills).toBeGreaterThanOrEqual(80);
    });

    it('should distribute skills across multiple domains', () => {
      const { generateRandomStartingSkills } = require('../components/SkillsComponent.js');
      const { createPersonalityComponent } = require('../components/PersonalityComponent.js');

      const skillCounts: Record<SkillId, number> = {
        building: 0,
        farming: 0,
        gathering: 0,
        cooking: 0,
        crafting: 0,
        social: 0,
        exploration: 0,
        combat: 0,
        animal_handling: 0,
        medicine: 0,
      };

      // Spawn 100 agents
      for (let i = 0; i < 100; i++) {
        const personality = new PersonalityComponent({
          workEthic: Math.random(),
          conscientiousness: Math.random(),
          openness: Math.random(),
          agreeableness: Math.random(),
          extraversion: Math.random(),
          neuroticism: Math.random(),
        });

        const skills = generateRandomStartingSkills(personality);

        // Count which skills are present
        for (const skillId of Object.keys(skills.levels) as SkillId[]) {
          if (skills.levels[skillId] > 0) {
            skillCounts[skillId]++;
          }
        }
      }

      
      // At least 5 different skills should be represented
      const skillsRepresented = Object.values(skillCounts).filter(count => count > 0).length;
      expect(skillsRepresented).toBeGreaterThanOrEqual(5);

      // No single skill should dominate (max 50% of agents)
      const maxCount = Math.max(...Object.values(skillCounts));
      expect(maxCount).toBeLessThanOrEqual(50);
    });
  });

  // ============================================
  // SUCCESS METRIC 2: Role Specialization
  // ============================================

  describe('Builders do 60%+ of construction', () => {
    it('should route building tasks to skilled builders', () => {
      // Create 10 agents: 2 builders (building 3), 8 others (building 0)
      const agents: Entity[] = [];

      for (let i = 0; i < 10; i++) {
        const entity = world.createEntity();
        const isBuilder = i < 2;

        (entity as any).addComponent('skills', {
          type: ComponentType.Skills,
          version: 1,
          levels: {
            building: isBuilder ? 3 : 0,
            farming: 0,
            gathering: 0,
            cooking: 0,
            crafting: 0,
            social: 0,
            exploration: 0,
            combat: 0,
            animal_handling: 0,
            medicine: 0,
          } as Record<SkillId, SkillLevel>,
          experience: {},
          totalExperience: {},
          affinities: {},
        });

        (entity as any).addComponent('identity', {
          type: ComponentType.Identity,
          version: 1,
          name: isBuilder ? `Builder${i}` : `Agent${i}`,
        });

        agents.push(entity);
      }

      // Simulate: village needs a building
      // Check which agents receive "build" suggestions in their prompts

      const { generateStrategicInstruction } = require('../llm/StructuredPromptBuilder.js');

      const villageState = {
        needsStorage: true,
        foodLow: false,
      };

      const buildSuggestionsReceived: string[] = [];

      for (const agent of agents) {
        const skills = agent.getComponent(ComponentType.Skills);
        const identity = agent.getComponent(ComponentType.Identity);

        const instruction = generateStrategicInstruction(
          { skills },
          villageState
        );

        if (instruction.toLowerCase().includes('storage') || instruction.toLowerCase().includes('build')) {
          buildSuggestionsReceived.push(identity.name);
        }
      }

      
      // At least 60% should be builders
      const builderSuggestions = buildSuggestionsReceived.filter(name =>
        name.startsWith('Builder')
      ).length;

      const percentBuilders = (builderSuggestions / buildSuggestionsReceived.length) * 100;

      expect(percentBuilders).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Cooks manage food supplies', () => {
    it('should route food tasks to cooks and farmers', () => {
      // Create 10 agents: 2 cooks, 2 farmers, 6 others
      const agents: Entity[] = [];

      for (let i = 0; i < 10; i++) {
        const entity = world.createEntity();
        const role = i < 2 ? 'cook' : i < 4 ? 'farmer' : 'other';

        (entity as any).addComponent('skills', {
          type: ComponentType.Skills,
          version: 1,
          levels: {
            building: 0,
            farming: role === 'farmer' ? 2 : 0,
            gathering: 0,
            cooking: role === 'cook' ? 2 : 0,
            crafting: 0,
            social: 0,
            exploration: 0,
            combat: 0,
            animal_handling: 0,
            medicine: 0,
          } as Record<SkillId, SkillLevel>,
          experience: {},
          totalExperience: {},
          affinities: {},
        });

        (entity as any).addComponent('identity', {
          type: ComponentType.Identity,
          version: 1,
          name: `${role}${i}`,
        });

        agents.push(entity);
      }

      const { generateStrategicInstruction } = require('../llm/StructuredPromptBuilder.js');

      const villageState = {
        needsStorage: false,
        foodLow: true,
      };

      const foodSuggestionsReceived: string[] = [];

      for (const agent of agents) {
        const skills = agent.getComponent(ComponentType.Skills);
        const identity = agent.getComponent(ComponentType.Identity);

        const instruction = generateStrategicInstruction(
          { skills },
          villageState
        );

        if (instruction.toLowerCase().includes('food')) {
          foodSuggestionsReceived.push(identity.name);
        }
      }

      
      // All food suggestions should go to cooks or farmers
      const foodSpecialistSuggestions = foodSuggestionsReceived.filter(name =>
        name.startsWith('cook') || name.startsWith('farmer')
      ).length;

      expect(foodSpecialistSuggestions).toBe(foodSuggestionsReceived.length);
    });
  });

  // ============================================
  // SUCCESS METRIC 3: Reduced Duplicates
  // ============================================

  describe('Reduced building duplicates (<10% overlapping starts)', () => {
    it('should prevent unskilled agents from seeing complex buildings', () => {
      const { getAvailableBuildings } = require('../components/SkillsComponent.js');
      const { BuildingBlueprintRegistry } = require('../buildings/BuildingBlueprintRegistry.js');

      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      // Unskilled agent
      const unskilled = {
        building: 0,
      } as Partial<Record<SkillId, SkillLevel>>;

      // Skilled agent
      const skilled = {
        building: 3,
      } as Partial<Record<SkillId, SkillLevel>>;

      const availableUnskilled = getAvailableBuildings(registry, unskilled);
      const availableSkilled = getAvailableBuildings(registry, skilled);

      // Unskilled should see far fewer buildings
      expect(availableUnskilled.length).toBeLessThan(availableSkilled.length);

      // Unskilled should not see advanced buildings like forge, workshop, warehouse
      const unskilledIds = availableUnskilled.map((b: any) => b.id);
      expect(unskilledIds).not.toContain('forge');
      expect(unskilledIds).not.toContain('workshop');
      expect(unskilledIds).not.toContain('warehouse');
    });
  });

  // ============================================
  // SUCCESS METRIC 4: Appropriate Suggestions
  // ============================================

  describe('Appropriate suggestions (90% go to skilled agents)', () => {
    it('should send strategic suggestions to skilled agents', () => {
      // Create mixed population
      const agents: Entity[] = [];

      for (let i = 0; i < 10; i++) {
        const entity = world.createEntity();
        const isSkilled = i < 3; // 3 skilled, 7 unskilled

        (entity as any).addComponent('skills', {
          type: ComponentType.Skills,
          version: 1,
          levels: {
            building: isSkilled ? 3 : 0,
            farming: 0,
            gathering: 0,
            cooking: 0,
            crafting: 0,
            social: 0,
            exploration: 0,
            combat: 0,
            animal_handling: 0,
            medicine: 0,
          } as Record<SkillId, SkillLevel>,
          experience: {},
          totalExperience: {},
          affinities: {},
        });

        (entity as any).addComponent('identity', {
          type: ComponentType.Identity,
          version: 1,
          name: isSkilled ? `Skilled${i}` : `Unskilled${i}`,
        });

        agents.push(entity);
      }

      const { generateStrategicInstruction } = require('../llm/StructuredPromptBuilder.js');

      const villageState = {
        needsStorage: true,
        foodLow: false,
      };

      const strategicSuggestionsReceived: string[] = [];

      for (const agent of agents) {
        const skills = agent.getComponent(ComponentType.Skills);
        const identity = agent.getComponent(ComponentType.Identity);

        const instruction = generateStrategicInstruction(
          { skills },
          villageState
        );

        // Strategic suggestions contain specific tasks, not basic survival
        const isStrategic = !instruction.toLowerCase().match(/gather|rest|eat|sleep|basic/);

        if (isStrategic) {
          strategicSuggestionsReceived.push(identity.name);
        }
      }

      
      // At least 90% should go to skilled agents
      const skilledSuggestions = strategicSuggestionsReceived.filter(name =>
        name.startsWith('Skilled')
      ).length;

      const percentSkilled = (skilledSuggestions / strategicSuggestionsReceived.length) * 100;

      expect(percentSkilled).toBeGreaterThanOrEqual(90);
    });
  });

  // ============================================
  // ADDITIONAL INTEGRATION TESTS
  // ============================================

  describe('Entity visibility based on skill and distance', () => {
    it('should only show entities within perception radius', () => {
      const { filterVisibleEntities } = require('../components/SkillsComponent.js');

      const entities = [
        { id: '1', type: 'berry_bush', position: { x: 3, y: 0 } },   // 3 tiles away
        { id: '2', type: 'berry_bush', position: { x: 10, y: 0 } },  // 10 tiles away
        { id: '3', type: 'berry_bush', position: { x: 20, y: 0 } },  // 20 tiles away
      ];

      const agentPos = { x: 0, y: 0 };

      // Low skill (radius ~5)
      const visibleLow = filterVisibleEntities(
        entities,
        { gathering: 0 } as Partial<Record<SkillId, SkillLevel>>,
        agentPos
      );

      // Medium skill (radius ~15)
      const visibleMed = filterVisibleEntities(
        entities,
        { gathering: 1 } as Partial<Record<SkillId, SkillLevel>>,
        agentPos
      );

      // High skill (radius ~30)
      const visibleHigh = filterVisibleEntities(
        entities,
        { gathering: 2 } as Partial<Record<SkillId, SkillLevel>>,
        agentPos
      );

      expect(visibleLow.length).toBe(1);  // Only berry at 3 tiles
      expect(visibleMed.length).toBe(2);  // Berry at 3 and 10 tiles
      expect(visibleHigh.length).toBe(3); // All three berries
    });

    it('should filter rare entities by skill level', () => {
      const { filterVisibleEntities } = require('../components/SkillsComponent.js');

      const entities = [
        { id: '1', type: 'berry_bush', position: { x: 5, y: 0 } },
        { id: '2', type: 'truffle', position: { x: 5, y: 5 } },
      ];

      const agentPos = { x: 0, y: 0 };

      // Low cooking skill - can't see truffles
      const visibleLow = filterVisibleEntities(
        entities,
        { cooking: 1 } as Partial<Record<SkillId, SkillLevel>>,
        agentPos
      );

      // High cooking skill - can see truffles
      const visibleHigh = filterVisibleEntities(
        entities,
        { cooking: 4 } as Partial<Record<SkillId, SkillLevel>>,
        agentPos
      );

      expect(visibleLow.map((e: any) => e.type)).not.toContain('truffle');
      expect(visibleHigh.map((e: any) => e.type)).toContain('truffle');
    });
  });

  describe('Information depth scales with skill', () => {
    it('should provide increasingly detailed food information', () => {
      const { getFoodStorageInfo } = require('../components/SkillsComponent.js');

      const storage = {
        items: { berries: 23, meat: 12 },
        villageSize: 5,
        consumptionRate: 10,
      };

      const info0 = getFoodStorageInfo(storage, 0);
      const info1 = getFoodStorageInfo(storage, 1);
      const info2 = getFoodStorageInfo(storage, 2);
      const info3 = getFoodStorageInfo(storage, 3);
      const info4 = getFoodStorageInfo(storage, 4);

      // Level 0: vague
      expect(info0.length).toBeLessThan(info1.length);

      // Level 1: specific counts
      expect(info1).toContain('23');

      // Level 2: consumption rate
      expect(info2).toContain('10');

      // Level 3: days remaining
      expect(info3).toMatch(/\d+\.?\d*\s*day/i);

      // Level 4: strategic advice
      expect(info4).toMatch(/cook|preserve/i);
    });
  });

  describe('Social skill gates perception of other agents', () => {
    it('should reveal more about others as social skill increases', () => {
      const { getPerceivedAgentSkills } = require('../llm/StructuredPromptBuilder.js');

      const target = {
        name: 'Oak',
        skills: {
          levels: { building: 4 } as Record<SkillId, SkillLevel>,
        },
      };

      const observer0 = { skills: { levels: { social: 0 } as Record<SkillId, SkillLevel> } };
      const observer1 = { skills: { levels: { social: 1 } as Record<SkillId, SkillLevel> } };
      const observer2 = { skills: { levels: { social: 2 } as Record<SkillId, SkillLevel> } };
      const observer3 = { skills: { levels: { social: 3 } as Record<SkillId, SkillLevel> } };

      const perceived0 = getPerceivedAgentSkills(observer0, target);
      const perceived1 = getPerceivedAgentSkills(observer1, target);
      const perceived2 = getPerceivedAgentSkills(observer2, target);
      const perceived3 = getPerceivedAgentSkills(observer3, target);

      // Social 0: knows nothing
      expect(perceived0.length).toBe(0);

      // Social 1: vague impression
      expect(perceived1.length).toBeGreaterThan(0);
      expect(perceived1).not.toContain('4');

      // Social 2: knows skill type
      expect(perceived2).toContain('building');

      // Social 3: knows exact level
      expect(perceived3).toContain('4');
    });
  });

  describe('Relationships unlock affordances', () => {
    it('should show different affordances based on relationship level', () => {
      const { getAffordancesThroughRelationships } = require('../llm/StructuredPromptBuilder.js');

      const otherAgents = [
        {
          id: 'oak',
          name: 'Oak',
          skills: {
            levels: { building: 3 } as Record<SkillId, SkillLevel>,
          },
        },
      ];

      const stranger = {
        relationships: [
          { targetId: 'oak', targetName: 'Oak', relationshipLevel: 'stranger' },
        ],
      };

      const acquaintance = {
        relationships: [
          { targetId: 'oak', targetName: 'Oak', relationshipLevel: 'acquaintance' },
        ],
      };

      const friend = {
        relationships: [
          { targetId: 'oak', targetName: 'Oak', relationshipLevel: 'friend' },
        ],
      };

      const closeFriend = {
        relationships: [
          { targetId: 'oak', targetName: 'Oak', relationshipLevel: 'close_friend' },
        ],
      };

      const affordancesStranger = getAffordancesThroughRelationships(stranger, otherAgents);
      const affordancesAcquaintance = getAffordancesThroughRelationships(acquaintance, otherAgents);
      const affordancesFriend = getAffordancesThroughRelationships(friend, otherAgents);
      const affordancesCloseFriend = getAffordancesThroughRelationships(closeFriend, otherAgents);

      // Stranger: no affordances
      expect(affordancesStranger).not.toContain('Oak');

      // Acquaintance: can ask questions
      expect(affordancesAcquaintance).toContain('ask');

      // Friend: can request help
      expect(affordancesFriend).toContain('help');

      // Close friend: can delegate
      expect(affordancesCloseFriend).toContain('delegate');
    });
  });
});
