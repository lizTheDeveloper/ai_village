/**
 * Progressive Skill Reveal System - Integration Tests
 *
 * These tests verify that the skill system actually runs correctly
 * with real World, EventBus, and System instances.
 *
 * Per CLAUDE.md guidelines:
 * - Use real WorldImpl with EventBusImpl (not mocks)
 * - Actually run systems with update() calls
 * - Verify state changes, not just calculations
 * - Test behavior over simulated time
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import { EventBusImpl } from '../events/EventBus.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import {
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  generateRandomStartingSkills,
  getPerceptionRadius,
  isEntityVisibleWithSkill,
  filterVisibleEntities,
  getAvailableActions,
  getAvailableBuildings,
  createSkillsComponent,
  addSkillXP,
} from '../components/SkillsComponent.js';
import { PersonalityComponent } from '../components/PersonalityComponent.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';

describe('ProgressiveSkillReveal Integration Tests', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let skillSystem: SkillSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    skillSystem = new SkillSystem();
    skillSystem.initialize(world, eventBus);
  });

  // ============================================
  // ACCEPTANCE CRITERION 1: Random Starting Skills
  // ============================================

  describe('Random Starting Skills Generation', () => {
    it('should generate 1-3 starting skills for agents with personality', () => {
      const personality = new PersonalityComponent({
        workEthic: 0.8,
        conscientiousness: 0.75,
        openness: 0.6,
        agreeableness: 0.5,
        extraversion: 0.4,
        neuroticism: 0.3,
      });

      const skills = generateRandomStartingSkills(personality);

      // Count skills with level > 0
      const skilledCount = Object.values(skills.levels).filter(level => level > 0).length;

      expect(skilledCount).toBeGreaterThanOrEqual(1);
      expect(skilledCount).toBeLessThanOrEqual(3);
    });

    it('should create agents with diverse starting skills', () => {
      const skillDistribution: Record<SkillId, number> = {
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

      // Generate 50 agents and track skill distribution
      for (let i = 0; i < 50; i++) {
        const personality = new PersonalityComponent({
          workEthic: Math.random(),
          conscientiousness: Math.random(),
          openness: Math.random(),
          agreeableness: Math.random(),
          extraversion: Math.random(),
          neuroticism: Math.random(),
        });

        const skills = generateRandomStartingSkills(personality);

        // Count each skill that's > 0
        for (const [skillId, level] of Object.entries(skills.levels)) {
          if (level > 0) {
            skillDistribution[skillId as SkillId]++;
          }
        }
      }

      // At least 4 different skills should appear across all agents
      const skillsUsed = Object.values(skillDistribution).filter(count => count > 0).length;
      expect(skillsUsed).toBeGreaterThanOrEqual(4);
    });
  });

  // ============================================
  // ACCEPTANCE CRITERION 2: Skill-Based XP Gain
  // ============================================

  describe('XP Gain Integration', () => {
    it('should award building XP when building:complete event fires', () => {
      // Create agent with skills
      const agent = new EntityImpl(createEntityId(), 0);
      const skills = createSkillsComponent();
      // Building requires gathering level 1 - set it manually for this test
      skills.levels.gathering = 1;
      skills.totalExperience.gathering = 100;
      agent.addComponent(skills);
      world.addEntity(agent);

      // Fire building complete event
      eventBus.emit({
        type: 'building:complete',
        source: 'test',
        data: {
          entityId: agent.id,
          buildingId: 'test-building',
        },
      });

      // Process queued events
      eventBus.flush();

      // Check that building skill gained XP
      const updatedSkills = agent.getComponent<SkillsComponent>('skills');
      expect(updatedSkills).toBeDefined();
      expect(updatedSkills!.totalExperience.building).toBeGreaterThan(0);
    });

    it('should level up skill when sufficient XP is earned', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      const skills = createSkillsComponent();
      agent.addComponent(skills);
      world.addEntity(agent);

      // Track level-up event
      let leveledUp = false;
      eventBus.subscribe('skill:level_up', (event) => {
        if (event.data.agentId === agent.id && event.data.skillId === 'gathering') {
          leveledUp = true;
        }
      });

      // Award enough XP to level up (gathering requires 100 XP for level 1)
      // Each event with amount=5 gives 4 XP (2 + floor(5/2)), so need 25 events
      for (let i = 0; i < 25; i++) {
        eventBus.emit({
          type: 'resource:gathered',
          source: 'test',
          data: {
            agentId: agent.id,
            itemId: 'wood',
            amount: 5,
          },
        });
      }

      // Process queued events
      eventBus.flush();

      const updatedSkills = agent.getComponent<SkillsComponent>('skills');
      expect(leveledUp).toBe(true);
      expect(updatedSkills!.levels.gathering).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // ACCEPTANCE CRITERION 3: Perception Radius Scaling
  // ============================================

  describe('Perception Radius Scaling', () => {
    it('should return increasing radius for each skill level', () => {
      expect(getPerceptionRadius(0)).toBe(5);
      expect(getPerceptionRadius(1)).toBe(15);
      expect(getPerceptionRadius(2)).toBe(30);
      expect(getPerceptionRadius(3)).toBe(50);
      expect(getPerceptionRadius(4)).toBe(100);
      expect(getPerceptionRadius(5)).toBeGreaterThanOrEqual(200);
    });
  });

  // ============================================
  // ACCEPTANCE CRITERION 4: Entity Visibility
  // ============================================

  describe('Entity Visibility Filtering', () => {
    it('should filter entities based on skill level and distance', () => {
      const entities = [
        {
          id: createEntityId(),
          type: 'berry_bush',
          position: { x: 10, y: 0 },
        },
        {
          id: createEntityId(),
          type: 'hidden_berry_patch',
          position: { x: 20, y: 0 },
        },
        {
          id: createEntityId(),
          type: 'clay_deposit',
          position: { x: 40, y: 0 },
        },
      ];

      const agentPos = { x: 0, y: 0 };

      // Level 0 gathering - can only see basic berry bushes within 5 tiles
      const skillsLow: Partial<Record<SkillId, SkillLevel>> = {
        gathering: 0,
      };
      const visibleLow = filterVisibleEntities(entities as any, skillsLow, agentPos);
      expect(visibleLow).toHaveLength(0); // Berry bush at 10 tiles is beyond 5 tile radius

      // Level 2 gathering - can see hidden patches and has 30 tile radius
      const skillsMed: Partial<Record<SkillId, SkillLevel>> = {
        gathering: 2,
      };
      const visibleMed = filterVisibleEntities(entities as any, skillsMed, agentPos);
      expect(visibleMed.length).toBeGreaterThan(0); // Should see berry bush and hidden patch

      // Level 3 gathering - can see clay and has 50 tile radius
      const skillsHigh: Partial<Record<SkillId, SkillLevel>> = {
        gathering: 3,
      };
      const visibleHigh = filterVisibleEntities(entities as any, skillsHigh, agentPos);
      expect(visibleHigh).toHaveLength(3); // All entities visible
    });

    it('should gate special entity types by skill level', () => {
      // Berry bushes - everyone can see
      expect(isEntityVisibleWithSkill('berry_bush', 'gathering', 0)).toBe(true);

      // Hidden berry patches - gathering 2+
      expect(isEntityVisibleWithSkill('hidden_berry_patch', 'gathering', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('hidden_berry_patch', 'gathering', 2)).toBe(true);

      // Clay deposits - gathering 2+
      expect(isEntityVisibleWithSkill('clay_deposit', 'gathering', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('clay_deposit', 'gathering', 2)).toBe(true);

      // Wild onions - cooking 2+
      expect(isEntityVisibleWithSkill('wild_onion', 'cooking', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('wild_onion', 'cooking', 2)).toBe(true);

      // Rare ingredients - cooking 4+
      expect(isEntityVisibleWithSkill('truffle', 'cooking', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('truffle', 'cooking', 3)).toBe(false);
      expect(isEntityVisibleWithSkill('truffle', 'cooking', 4)).toBe(true);

      // Iron ore - building 2+
      expect(isEntityVisibleWithSkill('iron_ore', 'building', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('iron_ore', 'building', 2)).toBe(true);
    });
  });

  // ============================================
  // ACCEPTANCE CRITERION 5: Action Filtering
  // ============================================

  describe('Action Availability Filtering', () => {
    it('should always include universal actions regardless of skill', () => {
      const skills: Partial<Record<SkillId, SkillLevel>> = {
        // All skills at 0
      };

      const actions = getAvailableActions(skills);

      // Universal actions that should always be available
      const universal = ['wander', 'idle', 'rest', 'sleep', 'eat', 'drink', 'talk', 'follow', 'gather'];

      for (const action of universal) {
        expect(actions).toContain(action);
      }
    });

    it('should gate farming actions to farming 1+', () => {
      const skillsLow: Partial<Record<SkillId, SkillLevel>> = {
        farming: 0,
      };

      const skillsHigh: Partial<Record<SkillId, SkillLevel>> = {
        farming: 1,
      };

      const actionsLow = getAvailableActions(skillsLow);
      const actionsHigh = getAvailableActions(skillsHigh);

      expect(actionsLow).not.toContain('plant');
      expect(actionsLow).not.toContain('till');

      expect(actionsHigh).toContain('plant');
      expect(actionsHigh).toContain('till');
    });

    it('should gate taming to animal_handling 2+', () => {
      const skillsLow: Partial<Record<SkillId, SkillLevel>> = {
        animal_handling: 1,
      };

      const skillsHigh: Partial<Record<SkillId, SkillLevel>> = {
        animal_handling: 2,
      };

      const actionsLow = getAvailableActions(skillsLow);
      const actionsHigh = getAvailableActions(skillsHigh);

      expect(actionsLow).not.toContain('tame');
      expect(actionsHigh).toContain('tame');
    });
  });

  // ============================================
  // ACCEPTANCE CRITERION 6: Building Tier System
  // ============================================

  describe('Tiered Building Availability', () => {
    it('should filter buildings based on building skill level', () => {
      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      // Level 0 builder - should only see tier 0 buildings
      const skillsLow: Partial<Record<SkillId, SkillLevel>> = {
        building: 0,
      };

      const availableLow = getAvailableBuildings(registry, skillsLow);

      // All tier 0 buildings should be available
      for (const building of availableLow) {
        const required = building.skillRequired?.level ?? 0;
        expect(required).toBeLessThanOrEqual(0);
      }

      // Level 2 builder - should see tier 0, 1, and 2
      const skillsMed: Partial<Record<SkillId, SkillLevel>> = {
        building: 2,
      };

      const availableMed = getAvailableBuildings(registry, skillsMed);

      for (const building of availableMed) {
        const required = building.skillRequired?.level ?? 0;
        expect(required).toBeLessThanOrEqual(2);
      }

      // Should have more buildings available at higher skill
      expect(availableMed.length).toBeGreaterThan(availableLow.length);
    });

    it('should include basic structures for level 0 builders', () => {
      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      const skills: Partial<Record<SkillId, SkillLevel>> = {
        building: 0,
      };

      const available = getAvailableBuildings(registry, skills);

      // Basic structures that should be available
      const basicIds = ['lean-to', 'campfire', 'storage-chest', 'storage-box'];

      for (const basicId of basicIds) {
        const found = available.find(b => b.id === basicId);
        // If the building exists in registry, it should be available
        if (registry.tryGet(basicId)) {
          expect(found).toBeDefined();
        }
      }
    });
  });

  // ============================================
  // ACCEPTANCE CRITERION 7: Skill Progression Flow
  // ============================================

  describe('Full Skill Progression Flow', () => {
    it('should progress from novice to apprentice through XP gain', () => {
      const agent = new EntityImpl(createEntityId(), 0);

      // Start with a skill component at level 0
      let skills = createSkillsComponent();
      agent.addComponent(skills);
      world.addEntity(agent);

      // Verify starting state
      expect(skills.levels.gathering).toBe(0);

      // Award enough XP to reach level 1 (100 XP)
      // Each event with amount=5 gives 4 XP, so need 25 events
      for (let i = 0; i < 25; i++) {
        eventBus.emit({
          type: 'resource:gathered',
          source: 'test',
          data: {
            agentId: agent.id,
            itemId: 'wood',
            amount: 5,
          },
        });
      }

      // Process queued events
      eventBus.flush();

      // Check level increased
      skills = agent.getComponent<SkillsComponent>('skills')!;
      expect(skills.levels.gathering).toBeGreaterThanOrEqual(1);
      expect(skills.totalExperience.gathering).toBeGreaterThanOrEqual(100);

      // Award more XP to reach level 2 (300 total XP = 200 more XP)
      // Need 50 more events (50 × 4 = 200 XP)
      for (let i = 0; i < 50; i++) {
        eventBus.emit({
          type: 'resource:gathered',
          source: 'test',
          data: {
            agentId: agent.id,
            itemId: 'stone',
            amount: 5,
          },
        });
      }

      // Process queued events
      eventBus.flush();

      // Check level increased again
      skills = agent.getComponent<SkillsComponent>('skills')!;
      expect(skills.levels.gathering).toBeGreaterThanOrEqual(2);
      expect(skills.totalExperience.gathering).toBeGreaterThanOrEqual(300);
    });

    it('should unlock new actions as skills increase', () => {
      // Start with no skills
      let skills: Partial<Record<SkillId, SkillLevel>> = {
        farming: 0,
      };

      let actions = getAvailableActions(skills);
      expect(actions).not.toContain('plant');
      expect(actions).not.toContain('till');

      // Level up to farming 1
      skills = {
        farming: 1,
      };

      actions = getAvailableActions(skills);
      expect(actions).toContain('plant');
      expect(actions).toContain('till');
    });
  });

  // ============================================
  // ACCEPTANCE CRITERION 8: Multi-Agent Skill Distribution
  // ============================================

  describe('Multi-Agent Skill Distribution', () => {
    it('should create diverse skill sets across multiple agents', () => {
      const agents: EntityImpl[] = [];
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

      // Create 20 agents with random personalities
      for (let i = 0; i < 20; i++) {
        const agent = new EntityImpl(createEntityId(), 0);

        const personality = new PersonalityComponent({
          workEthic: Math.random(),
          conscientiousness: Math.random(),
          openness: Math.random(),
          agreeableness: Math.random(),
          extraversion: Math.random(),
          neuroticism: Math.random(),
        });

        const skills = generateRandomStartingSkills(personality);
        agent.addComponent(skills);

        // Count which skills each agent has
        for (const [skillId, level] of Object.entries(skills.levels)) {
          if (level > 0) {
            skillCounts[skillId as SkillId]++;
          }
        }

        agents.push(agent);
      }

      // At least 80% of agents should have at least one skill > 0
      const agentsWithSkills = agents.filter(agent => {
        const skills = agent.getComponent<SkillsComponent>('skills')!;
        return Object.values(skills.levels).some(level => level > 0);
      });

      expect(agentsWithSkills.length).toBeGreaterThanOrEqual(16); // 80% of 20

      // Should have reasonable distribution across skills
      const skillsUsed = Object.values(skillCounts).filter(count => count > 0).length;
      expect(skillsUsed).toBeGreaterThanOrEqual(4); // At least 4 different skills used
    });
  });
});
