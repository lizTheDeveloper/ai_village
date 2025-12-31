import type { SkillsComponent } from '@ai-village/core';

/**
 * Task familiarity data for tracking build/craft times.
 */
export interface TaskFamiliarity {
  builds?: Record<string, { lastTime: number; count?: number }>;
  crafts?: Record<string, { lastTime: number; count?: number }>;
}

/**
 * Get build time estimate based on agent's task familiarity.
 * Returns null if never built before, otherwise returns last build time.
 */
export function getBuildTimeEstimate(
  buildingType: string,
  taskFamiliarity: TaskFamiliarity | undefined
): string | null {
  if (!taskFamiliarity || !taskFamiliarity.builds) {
    return null;
  }

  const buildData = taskFamiliarity.builds[buildingType];
  if (!buildData || !buildData.lastTime) {
    return null;
  }

  const seconds = buildData.lastTime;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `(last time: ${hours} hour${hours > 1 ? 's' : ''})`;
  } else if (minutes > 0) {
    return `(last time: ${minutes} min)`;
  } else {
    return `(last time: ${seconds}s)`;
  }
}

/**
 * Get craft time estimate based on agent's task familiarity.
 * Returns null if never crafted before, otherwise returns last craft time.
 */
export function getCraftTimeEstimate(
  recipeId: string,
  taskFamiliarity: TaskFamiliarity | undefined
): string | null {
  if (!taskFamiliarity || !taskFamiliarity.crafts) {
    return null;
  }

  const craftData = taskFamiliarity.crafts[recipeId];
  if (!craftData || !craftData.lastTime) {
    return null;
  }

  const seconds = craftData.lastTime;
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `(last time: ${minutes} min)`;
  } else {
    return `(last time: ${seconds}s)`;
  }
}

/**
 * Build building section with time estimates and skill gates.
 * Crafting is ALWAYS solo (no collaboration suggestions).
 */
export function buildBuildingSection(
  availableBuildings: string[],
  taskFamiliarity: TaskFamiliarity | undefined,
  _skills?: SkillsComponent
): string {
  if (availableBuildings.length === 0) {
    return 'No buildings available';
  }

  const buildingList = availableBuildings.map(buildingId => {
    const estimate = getBuildTimeEstimate(buildingId, taskFamiliarity);
    if (estimate) {
      return `${buildingId} ${estimate}`;
    }
    return buildingId;
  }).join(', ');

  return `Buildings: ${buildingList}`;
}

/**
 * Build crafting section with recipes.
 * Crafting is ALWAYS solo (no collaboration suggestions).
 */
export function buildCraftingSection(
  availableRecipes: string[],
  taskFamiliarity: TaskFamiliarity | undefined,
  _skills?: SkillsComponent
): string {
  if (availableRecipes.length === 0) {
    return 'No recipes available';
  }

  const recipeList = availableRecipes.map(recipeId => {
    const estimate = getCraftTimeEstimate(recipeId, taskFamiliarity);
    if (estimate) {
      return `${recipeId} ${estimate}`;
    }
    return recipeId;
  }).join(', ');

  return `Recipes: ${recipeList}`;
}

/**
 * Get strategic advice for in-progress buildings.
 * Should NOT suggest gathering more materials (materials already committed).
 */
export function getStrategicAdviceForInProgress(building: {
  type: string;
  isComplete: boolean;
  progress: number;
}): string {
  if (building.isComplete) {
    return '';
  }

  return `${building.type} is under construction (${Math.floor(building.progress * 100)}% complete). Materials already committed.`;
}

/**
 * Generate strategic instruction based on agent skills and village state.
 * Only suggest domain actions to skilled agents.
 */
export function generateStrategicInstruction(
  agent: { skills: { levels: Record<string, number> } },
  villageState: { needsStorage?: boolean; foodLow?: boolean }
): string {
  const skills = agent.skills.levels;
  const suggestions: string[] = [];

  // Building suggestions - only for builders (level 2+)
  if ((skills.building ?? 0) >= 2 && villageState.needsStorage) {
    suggestions.push('Village needs more storage capacity');
  }

  // Food suggestions - only for cooks/farmers (level 2+)
  if (((skills.cooking ?? 0) >= 2 || (skills.farming ?? 0) >= 2) && villageState.foodLow) {
    suggestions.push('food supplies are critically low');
  }

  if (suggestions.length === 0) {
    return 'Focus on gathering resources and meeting your basic needs';
  }

  return suggestions.join('. ');
}

/**
 * Get skilled agents formatted as village resources.
 * Skilled agents appear as resources (like buildings).
 */
export function getSkilledAgentsAsResources(
  agents: Array<{
    id: string;
    name: string;
    skills: { levels: Record<string, number> };
  }>
): string {
  const resources: string[] = [];

  for (const agent of agents) {
    const skills = agent.skills.levels;
    const skillList: string[] = [];

    if ((skills.building ?? 0) >= 2) skillList.push('building');
    if ((skills.cooking ?? 0) >= 2) skillList.push('cook');
    if ((skills.farming ?? 0) >= 2) skillList.push('farming');
    if ((skills.crafting ?? 0) >= 2) skillList.push('crafting');

    if (skillList.length > 0) {
      resources.push(`${agent.name} (skilled ${skillList.join(', ')})`);
    }
  }

  return resources.join('\n');
}

/**
 * Get perceived agent skills based on observer's social skill.
 * Social 0: Nothing
 * Social 1: Vague impression
 * Social 2: General skill
 * Social 3: Specific level
 */
export function getPerceivedAgentSkills(
  observer: { skills: { levels: Record<string, number> } },
  target: { name: string; skills: { levels: Record<string, number> } }
): string {
  const socialLevel = observer.skills.levels.social ?? 0;

  if (socialLevel === 0) {
    return '';
  }

  // Find target's highest skill
  const skills = target.skills.levels;
  let highestSkill = '';
  let highestLevel = 0;
  for (const [skillId, level] of Object.entries(skills)) {
    if (level > highestLevel) {
      highestLevel = level;
      highestSkill = skillId;
    }
  }

  if (highestLevel === 0) {
    return '';
  }

  if (socialLevel === 1) {
    if (highestSkill === 'building') return `${target.name} seems handy with tools`;
    if (highestSkill === 'cooking') return `${target.name} seems interested in food`;
    if (highestSkill === 'farming') return `${target.name} seems to like working with plants`;
    return `${target.name} seems skilled at something`;
  }

  if (socialLevel === 2) {
    return `${target.name} is good at ${highestSkill}`;
  }

  // Social 3+: Specific level
  return `${target.name}: skilled ${highestSkill} (level ${highestLevel})`;
}

/**
 * Get affordances available through relationships.
 * Stranger: Nothing
 * Acquaintance: Can ask questions
 * Friend: Can request help
 * Close friend: Can delegate tasks
 */
export function getAffordancesThroughRelationships(
  agent: {
    relationships: Array<{
      targetId: string;
      targetName: string;
      relationshipLevel: string;
    }>;
  },
  otherAgents: Array<{
    id: string;
    name: string;
    skills: { levels: Record<string, number> };
  }>
): string {
  const affordances: string[] = [];

  for (const rel of agent.relationships) {
    if (rel.relationshipLevel === 'stranger') {
      continue;
    }

    const targetAgent = otherAgents.find(a => a.id === rel.targetId);
    if (!targetAgent) continue;

    const skills = targetAgent.skills.levels;
    const skillList: string[] = [];
    const buildingExamples: string[] = [];

    if ((skills.building ?? 0) >= 2) {
      skillList.push('building');
      buildingExamples.push('forge', 'workshop', 'cabin');
    }
    if ((skills.cooking ?? 0) >= 2) {
      skillList.push('cooking');
    }
    if ((skills.farming ?? 0) >= 2) {
      skillList.push('farming');
    }

    if (skillList.length === 0) continue;

    if (rel.relationshipLevel === 'acquaintance') {
      affordances.push(`${rel.targetName} (${skillList.join(', ')}) - can ask questions`);
    } else if (rel.relationshipLevel === 'friend') {
      const examples = buildingExamples.length > 0 ? ` (${buildingExamples.join(', ')})` : '';
      affordances.push(`${rel.targetName} (${skillList.join(', ')}) - can request help with tasks${examples}`);
    } else if (rel.relationshipLevel === 'close_friend') {
      affordances.push(`${rel.targetName} (${skillList.join(', ')}) - can delegate tasks, teach/learn`);
    }
  }

  if (affordances.length === 0) {
    return '';
  }

  return `AVAILABLE THROUGH RELATIONSHIPS:\n${affordances.join('\n')}`;
}

/**
 * Get building access description based on ownership.
 * Communal: Available to all
 * Personal: Owner only
 * Shared: Owner + shared list
 */
export function getBuildingAccessDescription(building: {
  id: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
  accessType: string;
  sharedWith?: string[];
}): string {
  if (building.accessType === 'communal') {
    return `${building.name} (communal)`;
  }

  if (building.accessType === 'personal') {
    return `${building.name} (${building.ownerName}'s)`;
  }

  if (building.accessType === 'shared') {
    return `${building.name} (shared: ${building.ownerName})`;
  }

  return building.name;
}
