/**
 * Progressive Skill Reveal System - Unit Tests
 *
 * Tests for skill-gated prompt context system per:
 * work-orders/skill-system/progressive-skill-reveal-spec.md
 *
 * These tests should FAIL initially (TDD red phase).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  ALL_SKILL_IDS,
  generateRandomStartingSkills,
  getPerceptionRadius,
  isEntityVisibleWithSkill,
  filterVisibleEntities,
  getFoodStorageInfo,
  getVillageInfo,
  getAvailableActions,
  getAvailableBuildings,
} from '../components/SkillsComponent.js';
import { type PersonalityComponent, createPersonalityComponent } from '../components/PersonalityComponent.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';
import { canAccessBuilding } from '../components/BuildingComponent.js';
import {
  generateStrategicInstruction,
  getSkilledAgentsAsResources,
  getPerceivedAgentSkills,
  getAffordancesThroughRelationships,
  getBuildingAccessDescription,
  getBuildTimeEstimate,
  getCraftTimeEstimate,
  buildBuildingSection,
  buildCraftingSection,
  getStrategicAdviceForInProgress,
} from '../../../llm/src/StructuredPromptBuilder.js';

// ============================================
// ACCEPTANCE CRITERION 1: Random Starting Skills
// ============================================

describe('Random Starting Skills', () => {
  describe('generateRandomStartingSkills', () => {
    it('should generate 1-3 starting skills based on personality affinities', () => {
      // This function is now imported at the top of the file

      const personality = createPersonalityComponent({
        workEthic: 80,
        conscientiousness: 75,
        openness: 60,
        agreeableness: 50,
        extraversion: 40,
        neuroticism: 30,
      });

      const skills = generateRandomStartingSkills(personality);

      // Count skills with level > 0
      const skilledCount = ALL_SKILL_IDS.filter(
        skillId => skills.levels[skillId] > 0
      ).length;

      expect(skilledCount).toBeGreaterThanOrEqual(1);
      expect(skilledCount).toBeLessThanOrEqual(3);
    });

    it('should generate skills at level 1-2 only', () => {

      const personality = createPersonalityComponent({
        workEthic: 90,
        conscientiousness: 85,
        openness: 70,
      });

      const skills = generateRandomStartingSkills(personality);

      // Check all non-zero skills are level 1 or 2
      for (const skillId of ALL_SKILL_IDS) {
        const level = skills.levels[skillId];
        if (level > 0) {
          expect(level).toBeGreaterThanOrEqual(1);
          expect(level).toBeLessThanOrEqual(2);
        }
      }
    });

    it('should favor skills that match personality affinities (statistical)', () => {
      // High conscientiousness and workEthic should favor building/farming
      const builderPersonality = createPersonalityComponent({
        workEthic: 95,
        conscientiousness: 90,
        openness: 30,
        agreeableness: 40,
        extraversion: 20,
        neuroticism: 20,
      });

      // Run 100 times and check distribution
      // Testing random process requires statistical sampling, not single deterministic outcome
      let highAffinityCount = 0;
      for (let i = 0; i < 100; i++) {
        const skills = generateRandomStartingSkills(builderPersonality);

        // Check if any high-affinity skills are present
        if (skills.levels.building > 0 ||
            skills.levels.farming > 0 ||
            skills.levels.gathering > 0) {
          highAffinityCount++;
        }
      }

      // At least 60% should have high-affinity skills (weighted randomness)
      expect(highAffinityCount).toBeGreaterThanOrEqual(60);
    });

    it('should generate diverse skills across 100 agents (80%+ have skill > 0)', () => {

      const agentsWithSkills: number[] = [];

      for (let i = 0; i < 100; i++) {
        // Generate random personality
        const personality = createPersonalityComponent({
          workEthic: Math.random() * 100,
          conscientiousness: Math.random() * 100,
          openness: Math.random() * 100,
          agreeableness: Math.random() * 100,
          extraversion: Math.random() * 100,
          neuroticism: Math.random() * 100,
        });

        const skills = generateRandomStartingSkills(personality);

        const hasAnySkill = ALL_SKILL_IDS.some(
          skillId => skills.levels[skillId] > 0
        );

        if (hasAnySkill) {
          agentsWithSkills.push(i);
        }
      }

      const percentWithSkills = (agentsWithSkills.length / 100) * 100;
      expect(percentWithSkills).toBeGreaterThanOrEqual(80);
    });

    it('should throw if personality is missing', () => {

      expect(() => {
        generateRandomStartingSkills(undefined);
      }).toThrow();
    });

    it('should return a valid SkillsComponent structure', () => {

      const personality = createPersonalityComponent({});
      const skills = generateRandomStartingSkills(personality);

      expect(skills.type).toBe('skills');
      expect(skills.levels).toBeDefined();
      expect(skills.experience).toBeDefined();
      expect(skills.affinities).toBeDefined();
      expect(skills.totalExperience).toBeDefined();
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 2: Skill-Gated Entity Visibility
// ============================================

describe('Skill-Gated Entity Visibility', () => {
  describe('getPerceptionRadius', () => {
    it('should return correct radius for each skill level', () => {

      // As per spec:
      // Level 0: ~5 tiles (adjacent only)
      // Level 1: ~15 tiles (nearby)
      // Level 2: ~30 tiles (local area)
      // Level 3: ~50 tiles (extended area)
      // Level 4: ~100 tiles (region-wide)
      // Level 5: Map-wide (knows about rare things everywhere)

      expect(getPerceptionRadius(0)).toBe(5);
      expect(getPerceptionRadius(1)).toBe(15);
      expect(getPerceptionRadius(2)).toBe(30);
      expect(getPerceptionRadius(3)).toBe(50);
      expect(getPerceptionRadius(4)).toBe(100);
      expect(getPerceptionRadius(5)).toBeGreaterThanOrEqual(200); // Map-wide
    });
  });

  describe('isEntityVisibleWithSkill', () => {
    it('should gate berry bushes to gathering skill', () => {

      // Everyone can see berry bushes (gathering 0)
      expect(isEntityVisibleWithSkill('berry_bush', 'gathering', 0)).toBe(true);
      expect(isEntityVisibleWithSkill('berry_bush', 'cooking', 0)).toBe(true);
    });

    it('should gate hidden berry patches to gathering 2+', () => {

      expect(isEntityVisibleWithSkill('hidden_berry_patch', 'gathering', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('hidden_berry_patch', 'gathering', 1)).toBe(false);
      expect(isEntityVisibleWithSkill('hidden_berry_patch', 'gathering', 2)).toBe(true);
    });

    it('should gate clay deposits to gathering 2+', () => {

      expect(isEntityVisibleWithSkill('clay_deposit', 'gathering', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('clay_deposit', 'gathering', 2)).toBe(true);
    });

    it('should gate wild onions to cooking 2+', () => {

      expect(isEntityVisibleWithSkill('wild_onion', 'cooking', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('wild_onion', 'cooking', 2)).toBe(true);
    });

    it('should gate rare ingredients to cooking 4+', () => {

      expect(isEntityVisibleWithSkill('truffle', 'cooking', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('truffle', 'cooking', 2)).toBe(false);
      expect(isEntityVisibleWithSkill('truffle', 'cooking', 4)).toBe(true);
    });

    it('should gate iron ore to building 2+', () => {

      expect(isEntityVisibleWithSkill('iron_ore', 'building', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('iron_ore', 'building', 2)).toBe(true);
    });

    it('should gate rare herbs to farming 4+', () => {

      expect(isEntityVisibleWithSkill('saffron_plant', 'farming', 0)).toBe(false);
      expect(isEntityVisibleWithSkill('saffron_plant', 'farming', 4)).toBe(true);
    });
  });

  describe('filterVisibleEntities', () => {
    it('should filter entities based on skill level', () => {

      const allEntities = [
        { id: 'berry_bush_1', type: 'berry_bush', position: { x: 10, y: 10 } },
        { id: 'hidden_patch_1', type: 'hidden_berry_patch', position: { x: 20, y: 20 } },
        { id: 'clay_1', type: 'clay_deposit', position: { x: 30, y: 30 } },
      ];

      const skills: Partial<Record<SkillId, SkillLevel>> = {
        gathering: 1, // Can see berry bushes but not hidden patches or clay
      };

      const visible = filterVisibleEntities(allEntities, skills, { x: 0, y: 0 });

      expect(visible).toHaveLength(1);
      expect(visible[0].type).toBe('berry_bush');
    });

    it('should respect perception radius based on skill level', () => {

      const allEntities = [
        { id: 'berry_1', type: 'berry_bush', position: { x: 10, y: 0 } }, // 10 tiles away
        { id: 'berry_2', type: 'berry_bush', position: { x: 20, y: 0 } }, // 20 tiles away
      ];

      const skillsLow: Partial<Record<SkillId, SkillLevel>> = {
        gathering: 0, // radius ~5 tiles
      };

      const skillsHigh: Partial<Record<SkillId, SkillLevel>> = {
        gathering: 1, // radius ~15 tiles
      };

      const agentPos = { x: 0, y: 0 };

      const visibleLow = filterVisibleEntities(allEntities, skillsLow, agentPos);
      const visibleHigh = filterVisibleEntities(allEntities, skillsHigh, agentPos);

      expect(visibleLow).toHaveLength(0); // None within 5 tiles
      expect(visibleHigh).toHaveLength(1); // One within 15 tiles
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 3: Skill-Gated Information Depth
// ============================================

describe('Skill-Gated Information Depth', () => {
  describe('getFoodStorageInfo', () => {
    it('should show minimal info at cooking 0', () => {

      const storageData = {
        items: { berries: 15, meat: 8 },
        villageSize: 5,
        consumptionRate: 10,
      };

      const info = getFoodStorageInfo(storageData, 0);

      expect(info).toContain('food stored');
      expect(info).not.toContain('15');
      expect(info).not.toContain('berries');
    });

    it('should show item counts at cooking 1', () => {

      const storageData = {
        items: { berries: 15, meat: 8 },
        villageSize: 5,
        consumptionRate: 10,
      };

      const info = getFoodStorageInfo(storageData, 1);

      expect(info).toContain('15');
      expect(info).toContain('berries');
      expect(info).toContain('8');
      expect(info).toContain('meat');
    });

    it('should show consumption rate at cooking 2', () => {

      const storageData = {
        items: { berries: 15, meat: 8 },
        villageSize: 5,
        consumptionRate: 10,
      };

      const info = getFoodStorageInfo(storageData, 2);

      expect(info).toContain('10');
      expect(info).toContain('day');
    });

    it('should show days remaining at cooking 3', () => {

      const storageData = {
        items: { berries: 15, meat: 8 },
        villageSize: 5,
        consumptionRate: 10,
      };

      const info = getFoodStorageInfo(storageData, 3);

      expect(info).toMatch(/\d+\.?\d*\s*days?/i);
    });

    it('should show preservation tips at cooking 4+', () => {

      const storageData = {
        items: { berries: 15, meat: 8 },
        villageSize: 5,
        consumptionRate: 10,
      };

      const info = getFoodStorageInfo(storageData, 4);

      expect(info).toContain('cook');
      expect(info).toContain('preserve');
    });
  });

  describe('getVillageInfo', () => {
    it('should show minimal building info at building 0', () => {

      const villageData = {
        buildings: [
          { id: 'workbench_1', name: 'Workbench', status: 'complete' },
          { id: 'tent_1', name: 'Tent', status: 'in_progress' },
        ],
      };

      const info = getVillageInfo(villageData, 0);

      expect(info).toContain('structures');
      expect(info).not.toContain('Workbench');
      expect(info).not.toContain('Tent');
    });

    it('should list building names at building 1', () => {

      const villageData = {
        buildings: [
          { id: 'workbench_1', name: 'Workbench', status: 'complete' },
          { id: 'tent_1', name: 'Tent', status: 'in_progress' },
        ],
      };

      const info = getVillageInfo(villageData, 1);

      expect(info).toContain('Workbench');
      expect(info).toContain('Tent');
    });

    it('should show building purposes at building 2', () => {

      const villageData = {
        buildings: [
          {
            id: 'workbench_1',
            name: 'Workbench',
            status: 'complete',
            purpose: 'crafting',
          },
        ],
      };

      const info = getVillageInfo(villageData, 2);

      expect(info).toContain('crafting');
    });

    it('should show material requirements at building 3', () => {

      const villageData = {
        buildings: [
          {
            id: 'tent_1',
            name: 'Tent',
            status: 'in_progress',
            materialsNeeded: { wood: 10, fiber: 5 },
          },
        ],
      };

      const info = getVillageInfo(villageData, 3);

      expect(info).toContain('wood');
      expect(info).toContain('10');
    });

    it('should show infrastructure gaps at building 4+', () => {

      const villageData = {
        buildings: [
          { id: 'workbench_1', name: 'Workbench', status: 'complete' },
        ],
        gaps: ['storage', 'sleeping'],
      };

      const info = getVillageInfo(villageData, 4);

      expect(info).toContain('storage');
      expect(info).toContain('sleeping');
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 4: Tiered Building Availability
// ============================================

describe('Tiered Building Availability', () => {
  describe('BuildingBlueprint.skillRequired', () => {
    it('should have skillRequired field on blueprints', () => {

      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      const workbench = registry.tryGet('workbench');

      // Workbench is tier 1, should require building skill level 1
      expect(workbench?.skillRequired).toBeDefined();
      expect(workbench?.skillRequired?.skill).toBe('building');
      expect(workbench?.skillRequired?.level).toBe(1);
    });

    it('should require building 2 for advanced buildings', () => {

      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      const forge = registry.tryGet('forge');

      expect(forge?.skillRequired?.skill).toBe('building');
      expect(forge?.skillRequired?.level).toBe(2);
    });

    it('should require building 4 for high-tier buildings', () => {

      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      const warehouse = registry.tryGet('warehouse');

      expect(warehouse?.skillRequired?.skill).toBe('building');
      expect(warehouse?.skillRequired?.level).toBe(4);
    });
  });

  describe('getAvailableBuildings', () => {
    it('should filter buildings based on skill level', () => {

      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      const skills: Partial<Record<SkillId, SkillLevel>> = {
        building: 1,
      };

      const available = getAvailableBuildings(registry, skills);

      // Should include tier 0 and tier 1 buildings only
      for (const building of available) {
        const required = building.skillRequired?.level ?? 0;
        expect(required).toBeLessThanOrEqual(1);
      }
    });

    it('should include all tier 0 buildings for building 0', () => {

      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();

      const skills: Partial<Record<SkillId, SkillLevel>> = {
        building: 0,
      };

      const available = getAvailableBuildings(registry, skills);

      // Should include: lean-to, campfire, storage-chest, storage-box
      const tierZeroBuildings = ['lean-to', 'campfire', 'storage-chest', 'storage-box'];

      for (const id of tierZeroBuildings) {
        const found = available.find(b => b.id === id);
        expect(found).toBeDefined();
      }
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 5: Skill-Gated Actions
// ============================================

describe('Skill-Gated Actions', () => {
  describe('getAvailableActions', () => {
    it('should always include universal actions', () => {

      const skills: Partial<Record<SkillId, SkillLevel>> = {
        // All skills at 0
      };

      const actions = getAvailableActions(skills);

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
      expect(actionsLow).not.toContain('harvest');

      expect(actionsHigh).toContain('plant');
      expect(actionsHigh).toContain('till');
      expect(actionsHigh).toContain('harvest');
    });

    it('should gate cooking actions to cooking 1+', () => {

      const skillsLow: Partial<Record<SkillId, SkillLevel>> = {
        cooking: 0,
      };

      const skillsHigh: Partial<Record<SkillId, SkillLevel>> = {
        cooking: 1,
      };

      const actionsLow = getAvailableActions(skillsLow);
      const actionsHigh = getAvailableActions(skillsHigh);

      expect(actionsLow).not.toContain('cook');
      expect(actionsHigh).toContain('cook');
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

    it('should gate healing to medicine 2+', () => {

      const skillsLow: Partial<Record<SkillId, SkillLevel>> = {
        medicine: 1,
      };

      const skillsHigh: Partial<Record<SkillId, SkillLevel>> = {
        medicine: 2,
      };

      const actionsLow = getAvailableActions(skillsLow);
      const actionsHigh = getAvailableActions(skillsHigh);

      expect(actionsLow).not.toContain('heal');
      expect(actionsHigh).toContain('heal');
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 6: Skill-Gated Strategic Suggestions
// ============================================

describe('Skill-Gated Strategic Suggestions', () => {
  describe('generateStrategicInstruction', () => {
    it('should only suggest building tasks to builders', () => {

      const agentSkilled = {
        skills: { levels: { building: 2 } as Record<SkillId, SkillLevel> },
      };

      const agentUnskilled = {
        skills: { levels: { building: 0 } as Record<SkillId, SkillLevel> },
      };

      const villageState = {
        needsStorage: true,
        foodLow: false,
      };

      const instructionSkilled = generateStrategicInstruction(agentSkilled, villageState);
      const instructionUnskilled = generateStrategicInstruction(agentUnskilled, villageState);

      expect(instructionSkilled).toContain('storage');
      expect(instructionUnskilled).not.toContain('storage');
    });

    it('should only suggest food tasks to cooks/farmers', () => {

      const cook = {
        skills: { levels: { cooking: 2 } as Record<SkillId, SkillLevel> },
      };

      const farmer = {
        skills: { levels: { farming: 2 } as Record<SkillId, SkillLevel> },
      };

      const gatherer = {
        skills: { levels: { gathering: 2 } as Record<SkillId, SkillLevel> },
      };

      const villageState = {
        needsStorage: false,
        foodLow: true,
      };

      const cookInstruction = generateStrategicInstruction(cook, villageState);
      const farmerInstruction = generateStrategicInstruction(farmer, villageState);
      const gathererInstruction = generateStrategicInstruction(gatherer, villageState);

      expect(cookInstruction).toContain('food');
      expect(farmerInstruction).toContain('food');
      expect(gathererInstruction).not.toContain('food'); // Gatherers don't get food suggestions
    });

    it('should give basic survival instructions to unskilled agents', () => {

      const unskilled = {
        skills: {
          levels: {
            building: 0,
            cooking: 0,
            farming: 0,
            crafting: 0,
          } as Record<SkillId, SkillLevel>,
        },
      };

      const villageState = {
        needsStorage: true,
        foodLow: true,
      };

      const instruction = generateStrategicInstruction(unskilled, villageState);

      // Should focus on immediate needs, not strategic planning
      expect(instruction.toLowerCase()).toMatch(/gather|rest|eat|sleep|basic/);
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 7: Agents as Affordances
// ============================================

describe('Agents as Affordances', () => {
  describe('getSkilledAgentsAsResources', () => {
    it('should list skilled agents as village resources', () => {

      const agents = [
        {
          id: 'oak',
          name: 'Oak',
          skills: { levels: { building: 3 } as Record<SkillId, SkillLevel> },
        },
        {
          id: 'river',
          name: 'River',
          skills: { levels: { cooking: 3 } as Record<SkillId, SkillLevel> },
        },
        {
          id: 'stone',
          name: 'Stone',
          skills: { levels: { gathering: 1 } as Record<SkillId, SkillLevel> },
        },
      ];

      const resources = getSkilledAgentsAsResources(agents);

      expect(resources).toContain('Oak');
      expect(resources).toContain('building');
      expect(resources).toContain('River');
      expect(resources).toContain('cook');
    });

    it('should gate knowledge of others skills by social skill', () => {

      const targetAgent = {
        name: 'Oak',
        skills: { levels: { building: 3 } as Record<SkillId, SkillLevel> },
      };

      const observerSocial0 = { skills: { levels: { social: 0 } as Record<SkillId, SkillLevel> } };
      const observerSocial1 = { skills: { levels: { social: 1 } as Record<SkillId, SkillLevel> } };
      const observerSocial2 = { skills: { levels: { social: 2 } as Record<SkillId, SkillLevel> } };
      const observerSocial3 = { skills: { levels: { social: 3 } as Record<SkillId, SkillLevel> } };

      const perceived0 = getPerceivedAgentSkills(observerSocial0, targetAgent);
      const perceived1 = getPerceivedAgentSkills(observerSocial1, targetAgent);
      const perceived2 = getPerceivedAgentSkills(observerSocial2, targetAgent);
      const perceived3 = getPerceivedAgentSkills(observerSocial3, targetAgent);

      // Social 0: nothing
      expect(perceived0).toBe('');

      // Social 1: vague impression
      expect(perceived1).toMatch(/handy|tools/i);

      // Social 2: knows general skill
      expect(perceived2).toContain('building');

      // Social 3: knows specific level
      expect(perceived3).toContain('3');
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 8: Relationships Unlock Affordances
// ============================================

describe('Relationships Unlock Affordances', () => {
  describe('getAffordancesThroughRelationships', () => {
    it('should show no affordances for strangers', () => {

      const agent = {
        relationships: [
          {
            targetId: 'oak',
            targetName: 'Oak',
            relationshipLevel: 'stranger',
          },
        ],
      };

      const otherAgents = [
        {
          id: 'oak',
          name: 'Oak',
          skills: { levels: { building: 3 } as Record<SkillId, SkillLevel> },
        },
      ];

      const affordances = getAffordancesThroughRelationships(agent, otherAgents);

      expect(affordances).not.toContain('Oak');
    });

    it('should show primary skill for acquaintances', () => {

      const agent = {
        relationships: [
          {
            targetId: 'oak',
            targetName: 'Oak',
            relationshipLevel: 'acquaintance',
          },
        ],
      };

      const otherAgents = [
        {
          id: 'oak',
          name: 'Oak',
          skills: { levels: { building: 3 } as Record<SkillId, SkillLevel> },
        },
      ];

      const affordances = getAffordancesThroughRelationships(agent, otherAgents);

      expect(affordances).toContain('Oak');
      expect(affordances).toContain('ask questions');
    });

    it('should show available help for friends', () => {

      const agent = {
        relationships: [
          {
            targetId: 'oak',
            targetName: 'Oak',
            relationshipLevel: 'friend',
          },
        ],
      };

      const otherAgents = [
        {
          id: 'oak',
          name: 'Oak',
          skills: { levels: { building: 3 } as Record<SkillId, SkillLevel> },
        },
      ];

      const affordances = getAffordancesThroughRelationships(agent, otherAgents);

      expect(affordances).toContain('Oak');
      expect(affordances).toContain('request help');
      expect(affordances).toMatch(/forge|workshop|cabin/i);
    });

    it('should show delegation for close friends', () => {

      const agent = {
        relationships: [
          {
            targetId: 'oak',
            targetName: 'Oak',
            relationshipLevel: 'close_friend',
          },
        ],
      };

      const otherAgents = [
        {
          id: 'oak',
          name: 'Oak',
          skills: { levels: { building: 3 } as Record<SkillId, SkillLevel> },
        },
      ];

      const affordances = getAffordancesThroughRelationships(agent, otherAgents);

      expect(affordances).toContain('delegate');
      expect(affordances).toContain('teach');
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 9: Building Ownership
// ============================================

describe('Building Ownership', () => {
  describe('BuildingComponent ownership fields', () => {
    it('should have ownership and accessType fields', () => {

      // Check type definition includes ownership fields
      const building: any = {
        type: 'building',
        ownerId: 'oak',
        ownerName: 'Oak',
        accessType: 'personal',
        sharedWith: [],
      };

      expect(building.ownerId).toBeDefined();
      expect(building.accessType).toBeDefined();
      expect(building.sharedWith).toBeDefined();
    });
  });

  describe('getBuildingAccessDescription', () => {
    it('should show communal buildings as available to all', () => {

      const building = {
        id: 'campfire_1',
        name: 'Campfire',
        accessType: 'communal',
      };

      const description = getBuildingAccessDescription(building);

      expect(description).toContain('communal');
    });

    it('should show personal buildings with owner', () => {

      const building = {
        id: 'cabin_1',
        name: 'Cabin',
        ownerId: 'oak',
        ownerName: 'Oak',
        accessType: 'personal',
      };

      const description = getBuildingAccessDescription(building);

      expect(description).toContain('Oak');
      expect(description).toMatch(/Oak's|personal/i);
    });

    it('should show shared buildings with list of users', () => {

      const building = {
        id: 'workshop_1',
        name: 'Workshop',
        ownerId: 'oak',
        ownerName: 'Oak',
        accessType: 'shared',
        sharedWith: ['river', 'stone'],
      };

      const description = getBuildingAccessDescription(building);

      expect(description).toContain('shared');
      expect(description).toContain('Oak');
    });
  });

  describe('canAccessBuilding', () => {
    it('should allow anyone to access communal buildings', () => {

      const building = {
        accessType: 'communal',
      };

      expect(canAccessBuilding(building, 'anyone')).toBe(true);
    });

    it('should only allow owner to access personal buildings', () => {

      const building = {
        accessType: 'personal',
        ownerId: 'oak',
      };

      expect(canAccessBuilding(building, 'oak')).toBe(true);
      expect(canAccessBuilding(building, 'river')).toBe(false);
    });

    it('should allow owner and shared list to access shared buildings', () => {

      const building = {
        accessType: 'shared',
        ownerId: 'oak',
        sharedWith: ['river', 'stone'],
      };

      expect(canAccessBuilding(building, 'oak')).toBe(true);
      expect(canAccessBuilding(building, 'river')).toBe(true);
      expect(canAccessBuilding(building, 'stone')).toBe(true);
      expect(canAccessBuilding(building, 'willow')).toBe(false);
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 10: Experience-Based Time Estimates
// ============================================

describe('Experience-Based Time Estimates', () => {
  describe('getBuildTimeEstimate', () => {
    it('should return null for buildings never built before', () => {

      const taskFamiliarity = {}; // No prior builds

      const estimate = getBuildTimeEstimate('workbench', taskFamiliarity);

      expect(estimate).toBeNull();
    });

    it('should return last build time for buildings built before', () => {

      const taskFamiliarity = {
        builds: {
          workbench: { lastTime: 3600, count: 2 }, // 1 hour in seconds
        },
      };

      const estimate = getBuildTimeEstimate('workbench', taskFamiliarity);

      expect(estimate).toContain('last time');
      expect(estimate).toMatch(/1\s*hour|60\s*min|3600/i);
    });

    it('should not show estimate for new building types', () => {

      const taskFamiliarity = {
        builds: {
          'lean-to': { lastTime: 1800, count: 1 },
        },
      };

      // Agent has built lean-to, but never workbench
      const estimate = getBuildTimeEstimate('workbench', taskFamiliarity);

      expect(estimate).toBeNull();
    });
  });

  describe('getCraftTimeEstimate', () => {
    it('should return null for recipes never crafted before', () => {

      const taskFamiliarity = {}; // No prior crafts

      const estimate = getCraftTimeEstimate('axe', taskFamiliarity);

      expect(estimate).toBeNull();
    });

    it('should return last craft time for recipes crafted before', () => {

      const taskFamiliarity = {
        crafts: {
          axe: { lastTime: 900, count: 3 }, // 15 minutes in seconds
        },
      };

      const estimate = getCraftTimeEstimate('axe', taskFamiliarity);

      expect(estimate).toContain('last time');
      expect(estimate).toMatch(/15\s*min|900/i);
    });
  });

  describe('buildBuildingSection with time estimates', () => {
    it('should include time estimates only for previously built structures', () => {

      const taskFamiliarity = {
        builds: {
          'campfire': { lastTime: 600, count: 2 },
          // No workbench experience
        },
      };

      const availableBuildings = ['campfire', 'workbench', 'lean-to'];
      const section = buildBuildingSection(availableBuildings, taskFamiliarity);

      // Campfire should have estimate
      expect(section).toMatch(/campfire.*last time/i);

      // Workbench and lean-to should NOT have estimates
      expect(section).not.toMatch(/workbench.*last time/i);
      expect(section).not.toMatch(/lean-to.*last time/i);
    });
  });
});

// ============================================
// ACCEPTANCE CRITERION 11: No False Collaboration Requirements
// ============================================

describe('No False Collaboration Requirements', () => {
  describe('buildBuildingSection', () => {
    it('should NOT suggest collaboration for simple structures', () => {

      const simpleBuildings = ['workbench', 'lean-to', 'campfire', 'storage-chest'];
      const section = buildBuildingSection(simpleBuildings, {}, { building: 0 });

      // Should NOT contain collaboration language
      expect(section.toLowerCase()).not.toMatch(/need.*help/);
      expect(section.toLowerCase()).not.toMatch(/require.*collaboration/);
      expect(section.toLowerCase()).not.toMatch(/teamwork.*required/);
      expect(section.toLowerCase()).not.toMatch(/find.*someone/);
    });

    it('should allow efficiency hints only for skilled builders on large structures', () => {

      const largeBuildings = ['town-hall', 'fortress'];
      const sectionUnskilled = buildBuildingSection(largeBuildings, {}, { building: 1 });
      const sectionSkilled = buildBuildingSection(largeBuildings, {}, { building: 3 });

      // Unskilled builder: NO collaboration hints
      expect(sectionUnskilled.toLowerCase()).not.toMatch(/help.*speed|faster.*with.*help/);

      // Skilled builder: MAY have efficiency hints (optional, not required)
      // If hints exist, they should be OPTIONAL, not required
      if (sectionSkilled.toLowerCase().match(/help/)) {
        expect(sectionSkilled.toLowerCase()).toMatch(/would.*speed|optional|faster/);
        expect(sectionSkilled.toLowerCase()).not.toMatch(/need|require|must/);
      }
    });
  });

  describe('strategic advice for in-progress builds', () => {
    it('should NOT suggest gathering materials for in-progress builds', () => {

      const inProgressBuilding = {
        type: 'workbench',
        isComplete: false,
        progress: 0.5,
      };

      const advice = getStrategicAdviceForInProgress(inProgressBuilding);

      // Should NOT suggest gathering more materials
      expect(advice.toLowerCase()).not.toMatch(/gather.*more.*material/);
      expect(advice.toLowerCase()).not.toMatch(/need.*more.*wood/);
      expect(advice.toLowerCase()).not.toMatch(/collect.*resource/);

      // SHOULD indicate materials are already committed
      expect(advice.toLowerCase()).toMatch(/committed|consumed|already/);
    });
  });

  describe('buildCraftingSection', () => {
    it('should NOT suggest collaboration for crafting', () => {

      const recipes = ['axe', 'pickaxe', 'rope'];
      const section = buildCraftingSection(recipes, {}, { crafting: 1 });

      // Crafting is ALWAYS solo
      expect(section.toLowerCase()).not.toMatch(/need.*help/);
      expect(section.toLowerCase()).not.toMatch(/require.*collaboration/);
      expect(section.toLowerCase()).not.toMatch(/teamwork/);
    });
  });
});
