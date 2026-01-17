import type { Entity, Component } from '@ai-village/core';
import type { World } from '@ai-village/core';
import {
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  type NeedsComponent,
  type VisionComponent,
  type InventoryComponent,
  type InventorySlot,
  type TemperatureComponent,
  type ConversationComponent,
  type PersonalityComponent,
} from '@ai-village/core';
import type { BuildingComponent } from '@ai-village/core';
import { promptCache } from '../PromptCacheManager.js';

/**
 * Builds available actions and skill-aware instructions for agent prompts.
 */
export class ActionBuilder {
  /**
   * Get available actions based on context and skills.
   * Uses ActionDefinitions as the single source of truth.
   *
   * NOTE: Autonomic behaviors (wander, rest, idle, seek_sleep, seek_warmth)
   * are NOT included. These are fallback behaviors handled by AutonomicSystem.
   */
  getAvailableActions(
    vision: VisionComponent | undefined,
    world: World,
    entity?: Entity
  ): string[] {
    const gathering: string[] = [];
    const building: string[] = [];
    const farming: string[] = [];
    const social: string[] = [];
    const exploration: string[] = [];
    const combat: string[] = [];
    const priority: string[] = [];

    const needs = entity?.components.get('needs') as NeedsComponent | undefined;
    const temperature = entity?.components.get('temperature') as TemperatureComponent | undefined;
    const inventory = entity?.components.get('inventory') as InventoryComponent | undefined;
    const skills = entity?.components.get('skills') as SkillsComponent | undefined;

    const skillLevels: Partial<Record<SkillId, SkillLevel>> = {};
    if (skills) {
      for (const skillId of Object.keys(skills.levels)) {
        skillLevels[skillId as SkillId] = skills.levels[skillId as SkillId];
      }
    }

    const isCold = temperature?.state === 'cold' || temperature?.state === 'dangerously_cold';
    const isTired = needs?.energy !== undefined && needs.energy < 0.5;

    const farmingSkill = skillLevels.farming ?? 0;
    const craftingSkill = skillLevels.crafting ?? 0;
    const cookingSkill = skillLevels.cooking ?? 0;
    const animalHandlingSkill = skillLevels.animal_handling ?? 0;
    const medicineSkill = skillLevels.medicine ?? 0;

    // PRIORITY hints - check for existing campfires to avoid building duplicates
    const buildingCounts = promptCache.getBuildingCounts(world);
    const campfireCount = buildingCounts.byType['campfire'] ?? 0;

    // Check if there's a campfire (complete OR in-progress) within 200 tiles
    let nearbyCampfireForPriority = false;
    if (world && entity) {
      const entityPos = entity.components.get('position') as (Component & { x: number; y: number }) | undefined;
      if (entityPos) {
        const buildings = world.query()?.with?.('building')?.executeEntities?.() ?? [];
        const CAMPFIRE_PROXIMITY_THRESHOLD = 200;

        for (const building of buildings) {
          const buildingComp = building.components.get('building') as (Component & { buildingType?: string; isComplete?: boolean }) | undefined;
          const buildingPos = building.components.get('position') as (Component & { x: number; y: number }) | undefined;

          // Check for ANY campfire (complete OR in-progress) within range
          if (buildingComp?.buildingType === 'campfire' && buildingPos) {
            const dx = entityPos.x - buildingPos.x;
            const dy = entityPos.y - buildingPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= CAMPFIRE_PROXIMITY_THRESHOLD) {
              nearbyCampfireForPriority = true;
              break;
            }
          }
        }
      }
    }

    if (isCold && isTired) {
      if (nearbyCampfireForPriority) {
        priority.push(`You need warmth and rest! There's a campfire nearby (within 200 tiles) - use seek_warmth to warm up!`);
      } else {
        priority.push('URGENT! You need shelter - use plan_build for campfire or tent!');
      }
    } else if (isCold) {
      if (nearbyCampfireForPriority) {
        priority.push(`You're cold! There's a campfire nearby (within 200 tiles) - use seek_warmth to find warmth!`);
      } else {
        priority.push('You\'re freezing! Use plan_build for campfire or tent!');
      }
    } else if (isTired) {
      priority.push('You need rest! Use plan_build for bed or bedroll!');
    }

    // GATHERING
    gathering.push('pick - Grab a single item nearby (say "pick wood" or "pick berries")');
    gathering.push('gather - Stockpile resources: collect a specified amount and automatically store in a chest (say "gather 20 wood" or "gather 50 stone")');

    // Check for mature plants for seed gathering
    const hasSeenMaturePlants = vision?.seenPlants && vision.seenPlants.length > 0 && world && vision.seenPlants.some((plantId: string) => {
      const plant = world.getEntity(plantId);
      if (!plant) return false;
      const plantComp = plant.components.get('plant') as (Component & { stage: string; seedsProduced: number }) | undefined;
      if (!plantComp) return false;
      const validStages = ['mature', 'seeding', 'senescence'];
      return validStages.includes(plantComp.stage) && plantComp.seedsProduced > 0;
    });

    if (hasSeenMaturePlants) {
      gathering.push('gather seeds - Mature plants nearby! Collect seeds for farming (say "gather seeds")');
    }

    // Deposit items
    if (inventory && inventory.slots) {
      const hasItems = inventory.slots.some((slot: InventorySlot) => slot.itemId && slot.quantity > 0);
      if (hasItems) {
        gathering.push('deposit_items - Store items in a storage building (chest or box)');
      }
    }

    // FARMING
    const hasSeeds = inventory?.slots?.some((slot: InventorySlot) =>
      slot.itemId && slot.itemId.includes('seed')
    );

    if (farmingSkill >= 1) {
      farming.push('till - Prepare soil for planting (say "till" or "prepare soil")');

      if (hasSeeds) {
        farming.push('plant - Plant seeds in tilled soil (say "plant <seedType>")');
      }
    }

    // SOCIAL
    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      social.push('talk - Have a conversation');
      social.push('follow_agent - Follow someone');
    }

    // BUILDING
    if (nearbyCampfireForPriority) {
      building.push('plan_build - Plan a building project: queues the build and you\'ll automatically gather resources then construct it. Just say what building you want! (Examples: "plan_build storage-chest", "plan_build tent", "plan_build bed") NOTE: There\'s already a campfire nearby - use seek_warmth instead of building another!');
    } else {
      building.push('plan_build - Plan a building project: queues the build and you\'ll automatically gather resources then construct it. Just say what building you want! (Examples: "plan_build storage-chest", "plan_build campfire", "plan_build tent")');
    }

    // NOTE: 'explore' and 'navigate' removed - explore is an autonomic idle-triggered behavior, not LLM-chosen
    // Navigation happens implicitly through other actions (gather, build, follow)

    // Advanced farming
    if ((hasSeeds || (vision?.seenResources && vision.seenResources.length > 0)) && farmingSkill >= 1) {
      farming.push('water - Water plants to help them grow');
      farming.push('fertilize - Fertilize soil to improve growth');
    }

    // Crafting
    if (craftingSkill >= 1) {
      building.push('craft - Craft items at a workbench or crafting station');
    }

    // Cooking
    if (cookingSkill >= 1) {
      gathering.push('cook - Cook food at a campfire or oven');
    }

    // COMBAT & HUNTING (requires combat skill)
    const combatSkill = skillLevels.combat ?? 0;

    if (combatSkill >= 1 && world && entity) {
      const entityPos = entity.components.get('position') as (Component & { x: number; y: number }) | undefined;

      if (entityPos) {
        // Check if there are wild (untamed) animals nearby
        const allAnimals = world.query()?.with?.('animal')?.executeEntities?.() ?? [];
        const hasWildAnimals = allAnimals.some((animal: Entity) => {
          const animalComp = animal.components.get('animal') as (Component & { tamed?: boolean }) | undefined;
          const animalPos = animal.components.get('position') as (Component & { x: number; y: number }) | undefined;

          if (!animalComp || !animalPos || animalComp.tamed) return false;

          // Check if within reasonable distance (20 tiles)
          const dx = animalPos.x - entityPos.x;
          const dy = animalPos.y - entityPos.y;
          const distSq = dx * dx + dy * dy;
          return distSq < 400; // 20 * 20
        });

        if (hasWildAnimals) {
          combat.push('hunt - Hunt a wild animal for meat and resources (requires combat skill)');
        }

        // Check if there are other agents nearby for combat
        if (vision?.seenAgents && vision.seenAgents.length > 0) {
          combat.push('initiate_combat - Challenge another agent to combat (lethal or non-lethal, requires combat skill)');
        }
      }
    }

    // Butchering (requires cooking skill and butchering table)
    if (cookingSkill >= 1 && world && entity) {
      const entityPos = entity.components.get('position') as (Component & { x: number; y: number }) | undefined;

      if (entityPos) {
        // Check if there's a butchering table nearby
        const hasButcheringTable = vision?.seenBuildings?.some((buildingId: string) => {
          const building = world.getEntity(buildingId);
          if (!building) return false;
          const buildingComp = building.components.get('building') as (Component & { buildingType?: string; isComplete?: boolean }) | undefined;
          return buildingComp?.buildingType === 'butchering_table' && buildingComp.isComplete;
        });

        // Check if there are tame animals nearby
        const allAnimals = world.query()?.with?.('animal')?.executeEntities?.() ?? [];
        const hasTameAnimals = allAnimals.some((animal: Entity) => {
          const animalComp = animal.components.get('animal') as (Component & { tamed?: boolean }) | undefined;
          const animalPos = animal.components.get('position') as (Component & { x: number; y: number }) | undefined;

          if (!animalComp || !animalPos || !animalComp.tamed) return false;

          // Check if within reasonable distance (20 tiles)
          const dx = animalPos.x - entityPos.x;
          const dy = animalPos.y - entityPos.y;
          const distSq = dx * dx + dy * dy;
          return distSq < 400; // 20 * 20
        });

        if (hasButcheringTable && hasTameAnimals) {
          gathering.push('butcher - Butcher a tame animal at butchering table for meat, hide, and bones (requires cooking skill)');
        }
      }
    }

    // Animal handling
    if (animalHandlingSkill >= 2) {
      social.push('tame - Tame a wild animal');
      social.push('house - Lead a tamed animal to housing');
    }

    // Medicine
    if (medicineSkill >= 2) {
      social.push('heal - Heal an injured agent');
    }

    // Combine categories
    const actions: string[] = [];

    if (priority.length > 0) {
      actions.push('URGENT:');
      actions.push(...priority.map(a => `  ${a}`));
    }

    if (gathering.length > 0) {
      actions.push('');
      actions.push('GATHERING & RESOURCES:');
      actions.push(...gathering.map(a => `  ${a}`));
    }

    if (farming.length > 0) {
      actions.push('');
      actions.push('FARMING:');
      actions.push(...farming.map(a => `  ${a}`));
    }

    if (building.length > 0) {
      actions.push('');
      actions.push('BUILDING & CRAFTING:');
      actions.push(...building.map(a => `  ${a}`));
    }

    if (social.length > 0) {
      actions.push('');
      actions.push('SOCIAL:');
      actions.push(...social.map(a => `  ${a}`));
    }

    if (exploration.length > 0) {
      actions.push('');
      actions.push('EXPLORATION & NAVIGATION:');
      actions.push(...exploration.map(a => `  ${a}`));
    }

    if (combat.length > 0) {
      actions.push('');
      actions.push('COMBAT & HUNTING:');
      actions.push(...combat.map(a => `  ${a}`));
    }

    return actions;
  }

  /**
   * Build skill-aware instruction based on agent's skills and village state.
   */
  buildSkillAwareInstruction(
    agent: Entity,
    world: World,
    skills: SkillsComponent | undefined,
    _needs: NeedsComponent | undefined,
    _temperature: TemperatureComponent | undefined,
    _inventory: InventoryComponent | undefined,
    _conversation: ConversationComponent | undefined,
    vision: VisionComponent | undefined
  ): string {
    const personality = agent.components.get('personality') as PersonalityComponent | undefined;
    const isLeader = personality?.leadership && personality.leadership > 0.7;

    const buildingSkill = skills?.levels.building ?? 0;
    const cookingSkill = skills?.levels.cooking ?? 0;
    const farmingSkill = skills?.levels.farming ?? 0;
    const socialSkill = skills?.levels.social ?? 0;
    const gatheringSkill = skills?.levels.gathering ?? 0;
    const explorationSkill = skills?.levels.exploration ?? 0;

    const skillLevels = [
      { skill: 'building', level: buildingSkill },
      { skill: 'cooking', level: cookingSkill },
      { skill: 'farming', level: farmingSkill },
      { skill: 'social', level: socialSkill },
      { skill: 'gathering', level: gatheringSkill },
      { skill: 'exploration', level: explorationSkill },
    ];
    skillLevels.sort((a, b) => b.level - a.level);
    const primarySkill = skillLevels[0];

    // Check village state
    const allBuildings = world.query()?.with?.('building')?.executeEntities?.() ?? [];
    const storageBuildings = allBuildings.filter((b: Entity) => {
      const building = b.components.get('building') as BuildingComponent | undefined;
      return building?.buildingType === 'storage-chest' || building?.buildingType === 'storage-box';
    });
    const needsStorage = storageBuildings.length < 2;

    // Check food situation
    const allStorageInventories = allBuildings
      .filter((b: Entity) => {
        const building = b.components.get('building') as BuildingComponent | undefined;
        return building?.isComplete;
      })
      .map((b: Entity) => b.components.get('inventory') as InventoryComponent | undefined)
      .filter((inv: InventoryComponent | undefined): inv is InventoryComponent => inv !== undefined);

    let totalFood = 0;
    for (const inv of allStorageInventories) {
      const foodSlots = inv.slots?.filter((s: InventorySlot) =>
        s.itemId === 'berries' || s.itemId === 'meat' || s.itemId === 'cooked_meat'
      ) ?? [];
      for (const slot of foodSlots) {
        totalFood += slot.quantity ?? 0;
      }
    }

    const agentCount = world.query()?.with?.('agent')?.executeEntities?.()?.length ?? 1;
    const foodPerDay = agentCount * 2.5;
    const daysOfFood = totalFood / foodPerDay;
    const foodLow = daysOfFood < 2;

    let baseInstruction: string;

    // Skill-specific suggestions for level 2+
    if (primarySkill && primarySkill.level >= 2) {
      baseInstruction = this.getSkillSpecificInstruction(
        primarySkill.skill,
        needsStorage,
        foodLow,
        daysOfFood,
        vision
      );
    }
    // Level 1 (novice) guidance
    else if (primarySkill && primarySkill.level === 1) {
      baseInstruction = this.getNoviceInstruction(primarySkill.skill);
    } else {
      // Default for unskilled agents
      baseInstruction = this.getDefaultInstruction(vision, needsStorage);
    }

    if (isLeader) {
      baseInstruction = this.addLeadershipGuidance(baseInstruction, agent, vision);
    }

    return baseInstruction;
  }

  /**
   * Get skill-specific instruction for skilled agents (level 2+).
   */
  private getSkillSpecificInstruction(
    skill: string,
    needsStorage: boolean,
    foodLow: boolean,
    daysOfFood: number,
    vision: VisionComponent | undefined
  ): string {
    switch (skill) {
      case 'building':
        if (needsStorage) {
          return `As the village BUILDER, storage capacity is CRITICALLY needed! You MUST construct storage-chests NOW to organize resources and prevent loss. Use plan_build immediately! What will you build?`;
        }
        return `As the village BUILDER, you are responsible for infrastructure! Check what buildings are missing and construct them NOW. The village depends on your expertise. What will you build?`;

      case 'cooking':
        if (foodLow) {
          return `FOOD EMERGENCY! As the village COOK, supplies are CRITICALLY LOW (${Math.floor(daysOfFood * 10) / 10} days left)! You MUST gather food sources immediately and cook them to prevent starvation. Act NOW!`;
        }
        return `As the village COOK, you MUST maintain food supplies! Gather ingredients and cook meals - cooked food is more nutritious and lasts longer. Keep the village fed!`;

      case 'farming':
        if (foodLow) {
          return `FOOD CRISIS! As the village FARMER, you have only ${Math.floor(daysOfFood * 10) / 10} days of food remaining! You MUST gather food immediately and plant crops for long-term sustainability. The village survival depends on YOU!`;
        }
        return `As the village FARMER, you are responsible for food sustainability! Plant crops, gather seeds, and ensure long-term food production. The village needs your farming expertise NOW!`;

      case 'social':
        if (vision?.seenAgents && vision.seenAgents.length > 0) {
          return `As the village COORDINATOR, you MUST organize efforts! Talk with nearby villagers to understand what they're doing and help direct the village's work. Coordinate NOW!`;
        }
        return `As the village COORDINATOR, you are responsible for organization! Connect with others, understand their needs, and help coordinate village efforts. Communication is key!`;

      case 'gathering':
        return `As the village GATHERER, resources are ESSENTIAL for survival! You MUST collect wood, stone, food, and materials that the village needs. Gather aggressively!`;

      case 'exploration':
        return `As the village EXPLORER, you MUST scout for new resources and map unknown areas! Discovery is critical for village growth. Explore NOW!`;

      default:
        return `Focus on gathering basic resources and meeting your needs. What should you do?`;
    }
  }

  /**
   * Get guidance for novice agents (level 1).
   */
  private getNoviceInstruction(skill: string): string {
    switch (skill) {
      case 'building':
        return `You have some building knowledge. Consider learning by constructing simple structures. What should you do?`;
      case 'cooking':
        return `You know a bit about cooking. Try preparing simple meals to practice your skills. What should you do?`;
      case 'farming':
        return `You have basic farming knowledge. Consider planting crops or gathering seeds. What should you do?`;
      case 'social':
        return `You're naturally friendly. Try talking with others and building relationships. What should you do?`;
      case 'gathering':
        return `You have an eye for resources. Focus on collecting materials for the village. What should you do?`;
      case 'exploration':
        return `You enjoy exploring. Consider scouting nearby areas for resources. What should you do?`;
      default:
        return `Focus on gathering basic resources and meeting your needs. What should you do?`;
    }
  }

  /**
   * Get default instruction for unskilled agents.
   */
  private getDefaultInstruction(vision: VisionComponent | undefined, needsStorage: boolean): string {
    const suggestions: string[] = [];

    if (vision?.seenResources && vision.seenResources.length > 0) {
      suggestions.push('gather wood or stone to help the village');
    }

    if (needsStorage) {
      suggestions.push('help gather materials for storage');
    }

    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      suggestions.push('talk to other villagers to learn what needs doing');
    }

    if (suggestions.length > 0) {
      return `As a new villager, you can: ${suggestions.join(', ')}. What will you do?`;
    }
    return `Focus on gathering basic resources and meeting your needs. What should you do?`;
  }

  /**
   * Add relationship-focused leadership guidance to an instruction.
   */
  addLeadershipGuidance(
    baseInstruction: string,
    agent: Entity,
    vision: VisionComponent | undefined
  ): string {
    const relationships = agent.components.get('relationship') as (Component & { relationships: Map<string, unknown> }) | undefined;

    if (!relationships || relationships.relationships.size === 0) {
      return `${baseInstruction}\n\nAs someone with leadership qualities, also take time to get to know your fellow villagers. Talk to them to learn about their skills and what they enjoy doing.`;
    }

    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      return `${baseInstruction}\n\nWith your leadership qualities, also check in on nearby villagers - see if anyone needs help or if you can connect people to work that suits them.`;
    }

    return `${baseInstruction}\n\nYour leadership qualities mean you naturally notice when the village needs better coordination - help where you can.`;
  }
}
