/**
 * ExecutorPromptBuilder - Layer 3 of three-layer LLM architecture
 *
 * Handles strategic planning and task execution for agents.
 * Focuses on goals, priorities, and multi-step action plans.
 *
 * Responsibilities:
 * - Strategic planning (what to build, what to stockpile)
 * - Priority management (set_priorities)
 * - Building planning (plan_build - autonomic gathers and builds)
 * - Resource stockpiling for large projects (gather)
 * - Task queuing and multi-step plans
 * - Skill-based actions (farming, exploration, animals, combat)
 *
 * Does NOT handle:
 * - Building costs (Autonomic knows this)
 * - Tactical resource gathering (Autonomic executes)
 * - Social conversations (Talker handles)
 * - Construction execution (Autonomic builds)
 *
 * Executor is the STRATEGIC PLANNER. Autonomic is the TACTICAL EXECUTOR.
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import {
  type IdentityComponent,
  type PersonalityComponent,
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  type GoalsComponent,
  type NeedsComponent,
  type VisionComponent,
  type InventoryComponent,
  type InventorySlot,
  type AgentComponent,
  formatGoalsForPrompt,
  formatGoalsSectionForPrompt,
  getAvailableBuildings,
  getVillageInfo,
  getFoodStorageInfo,
  ALL_SKILL_IDS,
} from '@ai-village/core';
import { generatePersonalityPrompt } from './PersonalityPromptTemplates.js';
import { promptCache } from './PromptCacheManager.js';
import { PromptRenderer } from '@ai-village/introspection';

/**
 * Executor prompt structure - focused on strategic planning
 */
export interface ExecutorPrompt {
  systemPrompt: string;          // Personality and identity
  schemaPrompt?: string;          // Auto-generated schema-driven component info
  skills?: string;                // Skill levels (what you're good at)
  priorities?: string;            // Current strategic priorities
  goals?: string;                 // Personal and strategic goals (legacy format)
  goalsSection?: string | null;   // Dedicated goals section with completion percentages
  villageStatus?: string;         // Village coordination context
  environment?: string;           // Detailed environmental data (resources, plants with counts)
  buildings: string;              // Available buildings to plan
  availableActions: string[];     // Executor-specific actions
  instruction: string;            // What to decide
}

/**
 * ExecutorPromptBuilder - Builds prompts for strategic decision-making
 *
 * Follows StructuredPromptBuilder pattern but focused on planning/execution.
 */
export class ExecutorPromptBuilder {
  /**
   * Build a complete Executor prompt for an agent.
   * Focuses on strategic planning and task execution.
   */
  buildPrompt(agent: Entity, world: World): string {
    // Initialize frame-level cache
    promptCache.startFrame(world.tick);

    const identity = agent.components.get('identity') as IdentityComponent | undefined;
    const personality = agent.components.get('personality') as PersonalityComponent | undefined;
    const skills = agent.components.get('skills') as SkillsComponent | undefined;
    const needs = agent.components.get('needs') as NeedsComponent | undefined;
    const vision = agent.components.get('vision') as VisionComponent | undefined;
    const inventory = agent.components.get('inventory') as InventoryComponent | undefined;
    const agentComp = agent.components.get('agent') as AgentComponent | undefined;

    // Schema-driven component rendering
    const schemaPrompt = this.buildSchemaPrompt(agent, world);

    // System Prompt: Who you are (personality, identity)
    const systemPrompt = this.buildSystemPrompt(identity?.name || 'Agent', personality, agent.id);

    // Skills: What you're good at
    const skillsText = this.buildSkillsSection(skills);

    // Priorities: What you're focusing on
    const prioritiesText = this.buildPrioritiesSection(agentComp);

    // Goals: What you want to achieve
    const goals = agent.components.get('goals') as GoalsComponent | undefined;
    const goalsText = goals ? formatGoalsForPrompt(goals) : undefined;
    const goalsSectionText = goals ? formatGoalsSectionForPrompt(goals) : null;

    // Village Status: Coordination context
    const villageStatus = this.buildVillageStatus(world, agent.id);

    // Buildings: What you can plan/build
    const buildingsText = this.buildBuildingsKnowledge(world, inventory, skills);

    // Available Actions: Executor-specific tools
    const actions = this.getAvailableExecutorActions(skills, vision, needs, inventory, world);

    // Environment: Detailed resource/plant data for task planning
    const environment = this.buildEnvironmentContext(vision, needs, world);

    // Instruction: What to decide
    const instruction = this.buildExecutorInstruction(agentComp, needs, skills, inventory, world);

    // Combine into single prompt
    return this.formatPrompt({
      systemPrompt,
      schemaPrompt,
      skills: skillsText,
      priorities: prioritiesText,
      goals: goalsText,
      goalsSection: goalsSectionText,
      villageStatus,
      environment,
      buildings: buildingsText,
      availableActions: actions,
      instruction,
    });
  }

  /**
   * Build system prompt with personality.
   * Uses enhanced personality templates.
   */
  private buildSystemPrompt(name: string, personality: PersonalityComponent | undefined, entityId?: string): string {
    if (!personality) {
      return `You are ${name}, a villager in a forest village.\n\n`;
    }

    return generatePersonalityPrompt({ name, personality, entityId });
  }

  /**
   * Build schema-driven prompt sections.
   * Auto-generates prompts for all schema'd components.
   */
  private buildSchemaPrompt(agent: Entity, world: World): string {
    const schemaPrompt = PromptRenderer.renderEntity(agent as any, world);

    if (!schemaPrompt) {
      return '';
    }

    return `--- Schema-Driven Component Info ---\n${schemaPrompt}`;
  }

  /**
   * Build skills section showing agent's capabilities.
   * Important for Executor to know what they can do well.
   */
  private buildSkillsSection(skills: SkillsComponent | undefined): string {
    if (!skills) {
      return '';
    }

    const skillEntries = Object.entries(skills.levels)
      .filter(([_, level]) => (level as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5); // Show top 5 skills

    if (skillEntries.length === 0) {
      return '';
    }

    let text = 'Your Skills:\n';
    for (const [skillId, level] of skillEntries) {
      const skillName = skillId.replace(/_/g, ' ');
      const levelNum = level as number;
      const levelDesc = levelNum >= 5 ? 'master' :
                       levelNum >= 4 ? 'expert' :
                       levelNum >= 3 ? 'advanced' :
                       levelNum >= 2 ? 'competent' :
                       'beginner';
      text += `- ${skillName}: ${levelDesc} (level ${levelNum.toFixed(1)})\n`;
    }

    return text;
  }

  /**
   * Build priorities section showing agent's current strategic focus.
   * Critical for Executor to know what to prioritize.
   */
  private buildPrioritiesSection(agentComp: AgentComponent | undefined): string {
    if (!agentComp?.priorities) {
      return '';
    }

    const priorities = agentComp.priorities;
    const sortedPriorities = Object.entries(priorities)
      .filter(([_, value]) => (value as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3); // Show top 3 priorities

    if (sortedPriorities.length === 0) {
      return '';
    }

    const priorityDescriptions = sortedPriorities.map(([category, value]) => {
      const percentage = Math.round((value as number) * 100);
      return `${category} (${percentage}%)`;
    });

    return `Your Current Priorities:\nYou're focusing on ${priorityDescriptions.join(', ')} right now.\n`;
  }

  /**
   * Build village status: what others are doing, village needs.
   * Helps Executor coordinate with others.
   */
  private buildVillageStatus(world: World, agentId: string): string {
    // Get agent's building skill for skill-gated village info
    const agent = world.getEntity(agentId);
    if (!agent) {
      return '';
    }

    const skills = agent.components.get('skills') as SkillsComponent | undefined;
    const buildingSkill: SkillLevel = skills?.levels.building ?? 0;

    // Query all buildings in the world
    const buildings = world.query().with('building').executeEntities();
    const buildingData = buildings.map(b => {
      const buildingComp = b.components.get('building') as any;
      const identity = b.components.get('identity') as any;
      return {
        id: b.id,
        name: buildingComp?.buildingType || 'Unknown Building',
        status: buildingComp?.isComplete ? 'complete' : 'in-progress',
        purpose: identity?.name,
      };
    });

    // Use skill-gated village info
    const villageInfo = getVillageInfo({ buildings: buildingData }, buildingSkill);

    let status = '--- Village Status ---\n';
    status += villageInfo;

    // Food storage info (important for planning) - skill-gated by cooking level
    const cookingSkill: SkillLevel = skills?.levels.cooking ?? 0;

    // Query all agents to get village size
    const agents = world.query().with('agent').executeEntities();
    const agentCount = agents.length;

    // Estimate consumption rate (agents need food)
    const consumptionRate = agentCount * 2.5; // 2.5 food per agent per day

    // For minimal test world, provide empty storage data
    // In real game, this would query storage buildings
    const storageData = {
      items: {} as Record<string, number>, // Empty for test
      villageSize: agentCount,
      consumptionRate,
    };

    const foodStorageInfo = getFoodStorageInfo(storageData, cookingSkill);
    if (foodStorageInfo) {
      status += '\n' + foodStorageInfo;
    }

    return status;
  }

  /**
   * Build environment context: detailed resources and plants for task planning.
   * Executor needs exact counts and types to plan multi-step tasks like
   * "gather 50 berries" or "plant 20 berry bushes in rows".
   */
  private buildEnvironmentContext(
    vision: VisionComponent | undefined,
    needs: NeedsComponent | undefined,
    world: World
  ): string {
    let context = '--- Environment (Detailed) ---\n';

    // Needs (how you feel)
    if (needs) {
      const needsDesc: string[] = [];

      if (needs.hunger !== undefined && needs.hunger < 0.3) {
        needsDesc.push('hungry');
      }
      if (needs.energy !== undefined && needs.energy < 0.3) {
        needsDesc.push('tired');
      }

      if (needsDesc.length > 0) {
        context += `Physical State: ${needsDesc.join(', ')}\n`;
      }
    }

    // Vision: Detailed resource/plant data with COUNTS
    if (vision) {
      const resourceCounts = new Map<string, number>();
      const plantCounts = new Map<string, number>();

      // Resources in view - count by type
      if (vision.seenResources && vision.seenResources.length > 0) {
        for (const resourceId of vision.seenResources) {
          const resource = world.getEntity(resourceId);
          if (!resource) continue;

          const resourceComp = resource.components.get('resource') as any;
          if (resourceComp?.resourceType) {
            const currentCount = resourceCounts.get(resourceComp.resourceType) || 0;
            resourceCounts.set(resourceComp.resourceType, currentCount + 1);
          }
        }
      }

      // Plants in view - count by species
      if (vision.seenPlants && vision.seenPlants.length > 0) {
        for (const plantId of vision.seenPlants) {
          const plant = world.getEntity(plantId);
          if (!plant) continue;

          const plantComp = plant.components.get('plant') as any;
          if (plantComp?.species) {
            const speciesName = plantComp.species.replace(/-/g, ' ');
            const currentCount = plantCounts.get(speciesName) || 0;
            plantCounts.set(speciesName, currentCount + 1);
          }
        }
      }

      // Detailed resource counts (for planning gather/build tasks)
      if (resourceCounts.size > 0) {
        context += 'Resources Available:\n';
        for (const [type, count] of Array.from(resourceCounts.entries()).sort((a, b) => b[1] - a[1])) {
          context += `- ${type}: ${count} available\n`;
        }
      }

      // Detailed plant counts (for planning farming tasks)
      if (plantCounts.size > 0) {
        context += 'Plants Visible:\n';
        for (const [species, count] of Array.from(plantCounts.entries()).sort((a, b) => b[1] - a[1])) {
          context += `- ${species}: ${count} visible\n`;
        }
      }

      // Terrain description
      if (vision.terrainDescription &&
          vision.terrainDescription.trim() &&
          !vision.terrainDescription.toLowerCase().includes('unremarkable')) {
        context += `Terrain: ${vision.terrainDescription}\n`;
      }
    }

    return context;
  }

  /**
   * Build buildings knowledge: what can be planned/built.
   * Core of Executor's planning capability.
   */
  private buildBuildingsKnowledge(
    world: World,
    inventory: InventoryComponent | undefined,
    skills: SkillsComponent | undefined
  ): string {
    // Check for buildingRegistry (extended World interface)
    // Use any cast to avoid intersection type issues with private properties
    const worldAny = world as any;
    if (!worldAny.buildingRegistry) {
      return '';
    }

    const registry = worldAny.buildingRegistry;

    // Filter buildings based on skill levels if skills provided
    let buildings: any[];
    if (skills) {
      const skillLevels: Partial<Record<SkillId, SkillLevel>> = {};
      for (const skillId of Object.keys(skills.levels) as SkillId[]) {
        skillLevels[skillId] = skills.levels[skillId];
      }
      buildings = getAvailableBuildings(registry, skillLevels);
    } else {
      // Fallback: show all unlocked buildings if no skills component
      buildings = registry.getUnlocked();
    }

    if (!buildings || buildings.length === 0) {
      return '';
    }

    // Format buildings for prompt
    let text = '--- Buildings You Can Plan ---\n';
    for (const blueprint of buildings) {
      text += `- ${blueprint.name}: ${blueprint.description}\n`;
      if (blueprint.resourceCost && blueprint.resourceCost.length > 0) {
        const costs = blueprint.resourceCost.map((rc: any) => `${rc.amountRequired} ${rc.resourceId}`).join(', ');
        text += `  Cost: ${costs}\n`;
      }
    }

    return text;
  }

  /**
   * Get available Executor actions.
   * Strategic tools: set_priorities, plan_build, build, gather, pick, farming, exploration, animals, combat
   */
  private getAvailableExecutorActions(
    skills: SkillsComponent | undefined,
    vision: VisionComponent | undefined,
    needs: NeedsComponent | undefined,
    inventory: InventoryComponent | undefined,
    world: World
  ): string[] {
    const actions: string[] = [];

    // Get skill levels
    const skillLevels: Partial<Record<SkillId, SkillLevel>> = {};
    if (skills) {
      for (const skillId of Object.keys(skills.levels)) {
        skillLevels[skillId as SkillId] = skills.levels[skillId as SkillId];
      }
    }

    const farmingSkill = skillLevels.farming ?? 0;
    const buildingSkill = skillLevels.building ?? 0;
    const animalHandlingSkill = skillLevels.animal_handling ?? 0;
    const combatSkill = skillLevels.combat ?? 0;
    const researchSkill = skillLevels.research ?? 0;
    const cookingSkill = skillLevels.cooking ?? 0;

    // PRIORITY MANAGEMENT (always available)
    actions.push('set_priorities - Set task priorities (gathering, building, farming, social)');

    // BUILDING (plan_build is beginner-friendly, build requires skill)
    actions.push('plan_build - Plan and queue a building project (auto-gathers resources)');
    if (buildingSkill >= 1) {
      actions.push('build - Construct a building directly (requires building skill level 1)');
    }

    // GATHERING
    actions.push('pick - Grab a single item nearby (say "pick wood" or "pick berries")');
    actions.push('gather - Stockpile resources - gather a specified amount and store in chest');

    // FARMING (requires farming skill)
    if (farmingSkill >= 1) {
      actions.push('till - Prepare soil for planting (requires farming skill level 1)');
      actions.push('farm - Work on farming tasks (requires farming skill level 1)');
      actions.push('plant - Plant seeds in tilled soil (requires farming skill level 1)');
    }

    // EXPLORATION
    actions.push('explore - Systematically explore unknown areas to find new resources');

    // RESEARCH (requires research skill)
    if (researchSkill >= 1) {
      actions.push('research - Conduct research at a research building to unlock new technologies (requires research skill level 1)');
    }

    // ANIMAL HUSBANDRY (requires animal_handling skill)
    if (animalHandlingSkill >= 2) {
      actions.push('tame_animal - Approach and tame a wild animal (requires animal_handling skill level 2)');
      actions.push('house_animal - Lead a tamed animal to its housing (requires animal_handling skill level 2)');
    }

    // HUNTING & BUTCHERING
    if (combatSkill >= 1) {
      actions.push('hunt - Hunt a wild animal for meat and resources (requires combat skill level 1)');
    }
    if (cookingSkill >= 1) {
      actions.push('butcher - Butcher a tame animal at butchering table (requires cooking level 1)');
    }

    // COMBAT (requires combat skill)
    if (combatSkill >= 1) {
      actions.push('initiate_combat - Challenge another agent to combat (lethal or non-lethal, requires combat skill level 1)');
    }

    // FALLBACK
    actions.push('wander - Explore your surroundings casually');
    actions.push('idle - Take a moment to think and rest');

    return actions;
  }

  /**
   * Build instruction for Executor.
   * Context-aware based on task completion, needs, and skills.
   */
  private buildExecutorInstruction(
    agentComp: AgentComponent | undefined,
    needs: NeedsComponent | undefined,
    skills: SkillsComponent | undefined,
    inventory: InventoryComponent | undefined,
    world: World
  ): string {
    // PRIORITY 1: Task completion (what to do next?)
    if (agentComp?.behaviorCompleted) {
      return 'You just completed a task. What should you do next? Consider your goals, priorities, and village needs.';
    }

    // PRIORITY 2: Idle (no active task)
    if (!agentComp?.behavior || agentComp.behavior === 'idle' || agentComp.behavior === 'wander') {
      // Check for critical needs that require building
      const isCold = needs?.temperature !== undefined && needs.temperature < 0.3;
      const isTired = needs?.energy !== undefined && needs.energy < 0.3;

      if (isCold && isTired) {
        return 'You are cold and tired. Consider using plan_build to create a campfire (warmth) or tent/bed (rest). What will you plan?';
      } else if (isCold) {
        return 'You are cold. Consider using plan_build to create a campfire or tent for warmth. What will you plan?';
      } else if (isTired) {
        return 'You are tired. Consider using plan_build to create a bed or bedroll for rest. What will you plan?';
      }

      // No critical needs - general planning
      return 'You have no active task. What should you work on? Consider your goals, priorities, and village needs.';
    }

    // PRIORITY 3: Active task (continue or switch?)
    return `You are currently ${agentComp?.behavior}. Should you continue this task, or switch to something more important? Consider your goals and priorities.`;
  }

  /**
   * Format prompt sections into single string.
   * Follows StructuredPromptBuilder pattern.
   */
  private formatPrompt(prompt: ExecutorPrompt): string {
    const sections: string[] = [prompt.systemPrompt];

    // Character guidelines - roleplay directive
    const characterGuidelines = `--- YOUR ROLE: THE TASK PLANNER & EXECUTOR LAYER ---

You are the STRATEGIC PLANNER and TASK EXECUTOR for this character. Your job is to:
- CREATE MULTI-STEP PLANS (break down goals into specific actions)
- EXECUTE TASKS using tools (plan_build, gather, farm, pick, etc.)
- TRACK RESOURCES (you see exact counts: "berry: 15 available")
- MAKE DETAILED DECISIONS (which resources to gather, where to build, how many to collect)

You are NOT responsible for:
- Social conversations (Talker handles that)
- Setting high-level goals (Talker decides WHAT and WHY)
- Expressing emotions verbally (Talker does the speaking)

COORDINATION WITH TALKER:
- TALKER sets goals: "Gather at least 50 berries for winter storage"
- YOU read the goal and execute: find 50 berries → gather them → store in chest
- TALKER sets goals: "Plant a berry farm with 20 berry bushes in rows"
- YOU execute: gather berry bush seeds → till soil in rows → plant 20 bushes

When responding:
- Focus on HOW to achieve the goal, not WHAT or WHY
- Use available tools: plan_build, gather, pick, farm, till, plant, etc.
- Plan multi-step tasks: "First gather 10 wood, then gather 5 stone, then plan_build tent"
- Think in numbers: "I need 50 berries, I see 15 available, need to find 35 more"
- Use your detailed environment data to make informed decisions

Remember: Talker dreams it, you do it. You're the hands and planner, they're the voice and vision-setter.`;

    sections.push(characterGuidelines);

    // YOUR CURRENT GOALS - Prominent display early in prompt
    if (prompt.goalsSection) {
      sections.push(`--- YOUR CURRENT GOALS ---\n${prompt.goalsSection}`);
    }

    // Schema-driven component info
    if (prompt.schemaPrompt && prompt.schemaPrompt.trim()) {
      sections.push(prompt.schemaPrompt);
    }

    // Skills (what you're good at)
    if (prompt.skills && prompt.skills.trim()) {
      sections.push(prompt.skills);
    }

    // Priorities (what you're focusing on)
    if (prompt.priorities && prompt.priorities.trim()) {
      sections.push(prompt.priorities);
    }

    // Goals (legacy format - kept for backward compatibility but less prominent)
    if (prompt.goals && prompt.goals.trim()) {
      sections.push('Your Goals:\n' + prompt.goals);
    }

    // Village status (coordination context)
    if (prompt.villageStatus && prompt.villageStatus.trim()) {
      sections.push(prompt.villageStatus);
    }

    // Environment (detailed resources/plants for task planning)
    if (prompt.environment && prompt.environment.trim()) {
      sections.push(prompt.environment);
    }

    // Buildings (what you can plan/build)
    if (prompt.buildings && prompt.buildings.trim()) {
      sections.push(prompt.buildings);
    }

    // Available actions
    if (prompt.availableActions && prompt.availableActions.length > 0) {
      sections.push('What You Can Do:\n' + prompt.availableActions.map(a => `- ${a}`).join('\n'));
    }

    // Instruction
    sections.push(prompt.instruction);

    // Response format
    const responseFormat = `RESPOND IN JSON ONLY. Use this exact format:
{
  "thinking": "your strategic reasoning about what to do (optional)",
  "action": {
    "type": "action_name",
    "target": "optional target like 'wood' or building type",
    "amount": optional_number,
    "building": "building type for plan_build"
  },
  "priorities": {
    "gathering": 0.0-1.0,
    "building": 0.0-1.0,
    "farming": 0.0-1.0,
    "social": 0.0-1.0
  } (optional - only if setting priorities)
}`;

    sections.push(responseFormat);

    return sections.join('\n\n');
  }
}
