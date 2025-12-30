/**
 * SkillsComponent - Tracks agent expertise levels across domains
 *
 * Skills affect:
 * 1. LLM Context Depth - Higher skill = more detailed domain context in prompts
 * 2. Action Efficiency - Skilled agents perform related actions faster/better
 * 3. Memory Relevance - Skills influence which memories are prioritized
 * 4. Quality Bonuses - Higher skill = better quality crafted items
 *
 * Based on skill-system/spec.md
 */

import type { Component } from '../ecs/Component.js';
import type { PersonalityComponent } from './PersonalityComponent.js';
import type { MagicSkillProgress } from '../magic/MagicSkillTree.js';

/**
 * Skill identifiers for all trainable skills.
 */
export type SkillId =
  | 'building'
  | 'farming'
  | 'gathering'
  | 'cooking'
  | 'crafting'
  | 'social'
  | 'exploration'
  | 'combat'
  | 'animal_handling'
  | 'medicine';

/**
 * Skill levels from untrained to master.
 */
export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Human-readable skill level names.
 */
export const SKILL_LEVEL_NAMES: Record<SkillLevel, string> = {
  0: 'Untrained',
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
};

/**
 * XP required to reach each level.
 */
export const XP_PER_LEVEL: Record<SkillLevel, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 700,
  4: 1500,
  5: 3000,
};

/**
 * All skill IDs for iteration.
 */
export const ALL_SKILL_IDS: readonly SkillId[] = [
  'building',
  'farming',
  'gathering',
  'cooking',
  'crafting',
  'social',
  'exploration',
  'combat',
  'animal_handling',
  'medicine',
] as const;

/**
 * Skill icons for UI display.
 */
export const SKILL_ICONS: Record<SkillId, string> = {
  building: '🏗️',
  farming: '🌾',
  gathering: '🪓',
  cooking: '🍳',
  crafting: '🔨',
  social: '💬',
  exploration: '🧭',
  combat: '⚔️',
  animal_handling: '🐾',
  medicine: '💊',
};

/**
 * Skill display names.
 */
export const SKILL_NAMES: Record<SkillId, string> = {
  building: 'Building',
  farming: 'Farming',
  gathering: 'Gathering',
  cooking: 'Cooking',
  crafting: 'Crafting',
  social: 'Social',
  exploration: 'Exploration',
  combat: 'Combat',
  animal_handling: 'Animal Handling',
  medicine: 'Medicine',
};

/**
 * Skill prerequisite requirements.
 * Named SkillPrerequisite to avoid conflict with Recipe.SkillRequirement.
 */
export interface SkillPrerequisite {
  skill: SkillId;
  level: SkillLevel;
}

/**
 * Prerequisites for each skill (skill tree).
 */
export const SKILL_PREREQUISITES: Record<SkillId, SkillPrerequisite[]> = {
  // Basic skills (no prerequisites)
  gathering: [],
  exploration: [],
  social: [],

  // Tier 1 (require basic skills)
  farming: [{ skill: 'gathering', level: 1 }],
  building: [{ skill: 'gathering', level: 1 }],
  combat: [{ skill: 'exploration', level: 1 }],
  animal_handling: [{ skill: 'exploration', level: 1 }],

  // Tier 2 (require tier 1)
  cooking: [
    { skill: 'gathering', level: 2 },
    { skill: 'farming', level: 1 },
  ],
  crafting: [
    { skill: 'gathering', level: 2 },
    { skill: 'building', level: 1 },
  ],
  medicine: [
    { skill: 'gathering', level: 2 },
    { skill: 'farming', level: 1 },
  ],
};

// ============================================
// TASK FAMILIARITY (generalized recipe experience)
// ============================================

/**
 * Task familiarity tracking for any repeatable task.
 * Used for: cooking recipes, crafting recipes, plant species grown, etc.
 */
export interface TaskFamiliarity {
  /** Number of times this task has been completed */
  timesCompleted: number;
  /** Quality bonus from practice (0-20, increases logarithmically) */
  qualityBonus: number;
  /** Best quality ever achieved */
  bestQuality: number;
  /** Last time this task was performed (tick) */
  lastPerformed: number;
}

/**
 * Specialization within a skill domain.
 * Example: cooking has baking/grilling, crafting has woodworking/smithing
 */
export interface SkillSpecialization {
  /** Specialization name (e.g., 'baking', 'woodworking') */
  name: string;
  /** Experience level 0-100 */
  level: number;
  /** Total XP in this specialization */
  totalXp: number;
}

/**
 * Skill domain data - extended tracking for each skill.
 */
export interface SkillDomainData {
  /** Task familiarity by task ID (recipeId, plantSpeciesId, etc.) */
  familiarity: Record<string, TaskFamiliarity>;
  /** Specializations within this skill */
  specializations: Record<string, SkillSpecialization>;
  /** Best/signature task for this skill (highest quality bonus) */
  signatureTask?: string;
  /** Total tasks completed in this skill domain */
  tasksCompleted: number;
}

/**
 * SkillsComponent tracks an agent's expertise in various domains.
 */
export interface SkillsComponent extends Component {
  type: 'skills';

  /** Current skill levels (0-5) */
  levels: Record<SkillId, SkillLevel>;

  /** Experience points toward next level */
  experience: Record<SkillId, number>;

  /** Total XP earned all-time (for stats) */
  totalExperience: Record<SkillId, number>;

  /** Skill affinities (learning speed multiplier, 0.5-2.0) */
  affinities: Record<SkillId, number>;

  /** Extended domain data (familiarity, specializations) - optional for backward compat */
  domains?: Partial<Record<SkillId, SkillDomainData>>;

  /** Magic skill tree progress by paradigm ID */
  magicProgress?: Record<string, MagicSkillProgress>;
}

/**
 * Create default skill levels (all untrained).
 */
function createDefaultLevels(): Record<SkillId, SkillLevel> {
  return {
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
}

/**
 * Create default experience (all zero).
 */
function createDefaultExperience(): Record<SkillId, number> {
  return {
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
}

/**
 * Create default affinities (all 1.0).
 */
function createDefaultAffinities(): Record<SkillId, number> {
  return {
    building: 1.0,
    farming: 1.0,
    gathering: 1.0,
    cooking: 1.0,
    crafting: 1.0,
    social: 1.0,
    exploration: 1.0,
    combat: 1.0,
    animal_handling: 1.0,
    medicine: 1.0,
  };
}

/**
 * Create a new SkillsComponent with default values.
 */
export function createSkillsComponent(): SkillsComponent {
  return {
    type: 'skills',
    version: 1,
    levels: createDefaultLevels(),
    experience: createDefaultExperience(),
    totalExperience: createDefaultExperience(),
    affinities: createDefaultAffinities(),
  };
}

/**
 * Generate skill affinities based on personality traits.
 * Returns affinities ranging from 0.5 (slow learner) to 2.0 (natural talent).
 */
export function generateAffinitiesFromPersonality(
  personality: PersonalityComponent
): Record<SkillId, number> {
  // Helper to calculate affinity from trait values (0-1)
  // Maps average of traits to 0.5-2.0 range
  const calculateAffinity = (traits: number[]): number => {
    const average = traits.reduce((sum, t) => sum + t, 0) / traits.length;
    // Map 0-1 to 0.5-2.0 range with some variance
    const base = 0.5 + average * 1.5;
    // Add small random variance (-0.1 to +0.1)
    const variance = (Math.random() - 0.5) * 0.2;
    return Math.max(0.5, Math.min(2.0, base + variance));
  };

  // Stability is inverse of neuroticism (both in 0-1 range)
  const stability = 1 - personality.neuroticism;

  return {
    // Building: workEthic + conscientiousness
    building: calculateAffinity([personality.workEthic, personality.conscientiousness]),
    // Farming: conscientiousness + stability
    farming: calculateAffinity([personality.conscientiousness, stability]),
    // Gathering: workEthic
    gathering: calculateAffinity([personality.workEthic]),
    // Cooking: openness + agreeableness
    cooking: calculateAffinity([personality.openness, personality.agreeableness]),
    // Crafting: workEthic + openness
    crafting: calculateAffinity([personality.workEthic, personality.openness]),
    // Social: agreeableness + extraversion
    social: calculateAffinity([personality.agreeableness, personality.extraversion]),
    // Exploration: openness + extraversion
    exploration: calculateAffinity([personality.openness, personality.extraversion]),
    // Combat: workEthic + stability (assertiveness mapped to workEthic)
    combat: calculateAffinity([personality.workEthic, stability]),
    // Animal handling: agreeableness + stability
    animal_handling: calculateAffinity([personality.agreeableness, stability]),
    // Medicine: agreeableness + conscientiousness
    medicine: calculateAffinity([personality.agreeableness, personality.conscientiousness]),
  };
}

/**
 * Create a SkillsComponent with affinities based on personality.
 */
export function createSkillsComponentFromPersonality(
  personality: PersonalityComponent
): SkillsComponent {
  return {
    type: 'skills',
    version: 1,
    levels: createDefaultLevels(),
    experience: createDefaultExperience(),
    totalExperience: createDefaultExperience(),
    affinities: generateAffinitiesFromPersonality(personality),
  };
}

/**
 * Calculate level from total XP.
 */
export function calculateLevelFromXP(totalXP: number): SkillLevel {
  if (totalXP >= XP_PER_LEVEL[5]) return 5;
  if (totalXP >= XP_PER_LEVEL[4]) return 4;
  if (totalXP >= XP_PER_LEVEL[3]) return 3;
  if (totalXP >= XP_PER_LEVEL[2]) return 2;
  if (totalXP >= XP_PER_LEVEL[1]) return 1;
  return 0;
}

/**
 * Get XP progress to next level (0.0 to 1.0).
 */
export function getProgressToNextLevel(currentXP: number, level: SkillLevel): number {
  if (level >= 5) return 1.0; // Already maxed

  const currentLevelXP = XP_PER_LEVEL[level];
  const nextLevelXP = XP_PER_LEVEL[(level + 1) as SkillLevel];
  const xpInLevel = currentXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;

  return Math.min(1.0, xpInLevel / xpNeeded);
}

/**
 * Add XP to a skill and check for level up.
 * Returns updated component and whether level increased.
 */
export function addSkillXP(
  component: SkillsComponent,
  skillId: SkillId,
  baseXP: number
): { component: SkillsComponent; leveledUp: boolean; newLevel: SkillLevel } {
  const affinity = component.affinities[skillId];
  const actualXP = Math.floor(baseXP * affinity);

  const newExperience = component.experience[skillId] + actualXP;
  const newTotalExperience = component.totalExperience[skillId] + actualXP;
  const newLevel = calculateLevelFromXP(newTotalExperience);
  const oldLevel = component.levels[skillId];
  const leveledUp = newLevel > oldLevel;

  return {
    component: {
      ...component,
      levels: {
        ...component.levels,
        [skillId]: newLevel,
      },
      experience: {
        ...component.experience,
        [skillId]: newExperience,
      },
      totalExperience: {
        ...component.totalExperience,
        [skillId]: newTotalExperience,
      },
    },
    leveledUp,
    newLevel,
  };
}

/**
 * Check if prerequisites are met for a skill.
 */
export function checkPrerequisites(
  component: SkillsComponent,
  skillId: SkillId
): { met: boolean; missing: SkillPrerequisite[] } {
  const prereqs = SKILL_PREREQUISITES[skillId];
  const missing: SkillPrerequisite[] = [];

  for (const prereq of prereqs) {
    if (component.levels[prereq.skill] < prereq.level) {
      missing.push(prereq);
    }
  }

  return {
    met: missing.length === 0,
    missing,
  };
}

/**
 * Get a text description of skills for LLM context.
 */
export function getSkillsDescription(component: SkillsComponent): string {
  const parts: string[] = [];

  for (const skillId of ALL_SKILL_IDS) {
    const level = component.levels[skillId];
    if (level > 0) {
      parts.push(`${SKILL_NAMES[skillId]}: ${SKILL_LEVEL_NAMES[level]}`);
    }
  }

  if (parts.length === 0) {
    return 'No trained skills';
  }

  return parts.join(', ');
}

/**
 * Get quality bonus based on skill level.
 * Used for crafting, building, cooking, etc.
 */
export function getQualityBonus(level: SkillLevel): number {
  // 0 = no bonus, 5 = +25% quality
  return level * 5;
}

/**
 * Get efficiency bonus based on skill level.
 * Used for action speed.
 */
export function getEfficiencyBonus(level: SkillLevel): number {
  // 0 = no bonus, 5 = 25% faster
  return level * 5;
}

/**
 * Get quality multiplier for a skill level.
 * Used for crafting/building quality.
 *
 * Level 0: 0.7 (70% quality - poor)
 * Level 1: 0.8 (80% quality - basic)
 * Level 2: 0.9 (90% quality - decent)
 * Level 3: 1.0 (100% quality - standard)
 * Level 4: 1.1 (110% quality - good)
 * Level 5: 1.2 (120% quality - excellent)
 */
export function getQualityMultiplier(level: SkillLevel): number {
  return 0.7 + level * 0.1;
}

// ============================================
// SKILL SYNERGIES
// ============================================

/**
 * Synergy definition for skill chains.
 * When all skills in the chain are at level 1+, the synergy activates.
 */
export interface SkillSynergy {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Skills required for this synergy */
  skills: SkillId[];
  /** Description of the bonus */
  description: string;
  /** Quality bonus multiplier (applied to crafting/building) */
  qualityBonus: number;
  /** XP sharing percentage (XP bleeds to related skills) */
  xpSharing: number;
  /** Speed bonus percentage */
  speedBonus: number;
}

/**
 * All skill synergies in the game.
 */
export const SKILL_SYNERGIES: SkillSynergy[] = [
  // Food production chain
  {
    id: 'farm_to_table',
    name: 'Farm to Table',
    skills: ['gathering', 'farming', 'cooking'],
    description: '+10% quality for food-related actions, 10% XP sharing',
    qualityBonus: 0.1,
    xpSharing: 0.1,
    speedBonus: 0,
  },
  // Construction chain
  {
    id: 'master_builder',
    name: 'Master Builder',
    skills: ['gathering', 'building', 'crafting'],
    description: '+15% build speed, 10% material efficiency',
    qualityBonus: 0,
    xpSharing: 0.1,
    speedBonus: 0.15,
  },
  // Wilderness chain
  {
    id: 'nature_affinity',
    name: 'Nature Affinity',
    skills: ['exploration', 'gathering', 'animal_handling'],
    description: 'Animals less likely to flee, +10% movement speed in wilderness',
    qualityBonus: 0,
    xpSharing: 0.1,
    speedBonus: 0.1,
  },
  // Caretaker chain
  {
    id: 'caretaker',
    name: 'Caretaker',
    skills: ['social', 'cooking', 'medicine'],
    description: '+25% healing effectiveness, meals give mood boost',
    qualityBonus: 0.15,
    xpSharing: 0.1,
    speedBonus: 0,
  },
  // Combat support chain
  {
    id: 'battle_medic',
    name: 'Battle Medic',
    skills: ['combat', 'crafting', 'medicine'],
    description: 'Can craft combat items, +30% self-healing',
    qualityBonus: 0.1,
    xpSharing: 0.1,
    speedBonus: 0,
  },
  // Wanderer chain
  {
    id: 'wandering_healer',
    name: 'Wandering Healer',
    skills: ['exploration', 'social', 'medicine'],
    description: 'Discover remedies while exploring, spread knowledge socially',
    qualityBonus: 0,
    xpSharing: 0.15,
    speedBonus: 0.1,
  },
];

/**
 * Check if a synergy is active for a given skills component.
 * A synergy is active when all required skills are at level 1+.
 */
export function isSynergyActive(skills: SkillsComponent, synergy: SkillSynergy): boolean {
  return synergy.skills.every(skillId => (skills.levels[skillId] ?? 0) >= 1);
}

/**
 * Get all active synergies for a skills component.
 */
export function getActiveSynergies(skills: SkillsComponent): SkillSynergy[] {
  return SKILL_SYNERGIES.filter(synergy => isSynergyActive(skills, synergy));
}

/**
 * Calculate the synergy bonus strength.
 * Bonus scales with the lowest skill level in the chain.
 *
 * @returns Multiplier from 0.1 (all skills at level 1) to 0.35 (all skills at level 5)
 */
export function getSynergyBonusStrength(skills: SkillsComponent, synergy: SkillSynergy): number {
  if (!isSynergyActive(skills, synergy)) {
    return 0;
  }

  const lowestLevel = Math.min(
    ...synergy.skills.map(s => skills.levels[s] ?? 0)
  );

  // 0.1 base + 0.05 per level of lowest skill
  return 0.1 + lowestLevel * 0.05;
}

/**
 * Calculate total quality bonus from all active synergies.
 */
export function getTotalSynergyQualityBonus(skills: SkillsComponent): number {
  let totalBonus = 0;

  for (const synergy of SKILL_SYNERGIES) {
    if (isSynergyActive(skills, synergy)) {
      const strength = getSynergyBonusStrength(skills, synergy);
      totalBonus += synergy.qualityBonus * strength;
    }
  }

  return totalBonus;
}

/**
 * Calculate total speed bonus from all active synergies.
 */
export function getTotalSynergySpeedBonus(skills: SkillsComponent): number {
  let totalBonus = 0;

  for (const synergy of SKILL_SYNERGIES) {
    if (isSynergyActive(skills, synergy)) {
      const strength = getSynergyBonusStrength(skills, synergy);
      totalBonus += synergy.speedBonus * strength;
    }
  }

  return totalBonus;
}

// ============================================
// DOMAIN DATA HELPERS
// ============================================

/**
 * Create empty domain data for a skill.
 */
export function createDomainData(): SkillDomainData {
  return {
    familiarity: {},
    specializations: {},
    signatureTask: undefined,
    tasksCompleted: 0,
  };
}

/**
 * Get domain data for a skill, creating if needed.
 */
export function getDomainData(
  skills: SkillsComponent,
  skillId: SkillId
): SkillDomainData {
  return skills.domains?.[skillId] ?? createDomainData();
}

/**
 * Record task completion and update familiarity.
 * Returns updated SkillsComponent.
 *
 * @param skills - The skills component
 * @param skillId - Which skill domain (cooking, crafting, farming, animal_handling, etc.)
 * @param taskId - Task identifier (recipeId, plantSpeciesId, animalTypeId, etc.)
 * @param quality - Quality achieved (0-100)
 * @param tick - Current game tick
 */
export function recordTaskCompletion(
  skills: SkillsComponent,
  skillId: SkillId,
  taskId: string,
  quality: number,
  tick: number
): SkillsComponent {
  const domain = getDomainData(skills, skillId);
  const existing = domain.familiarity[taskId];

  const timesCompleted = (existing?.timesCompleted ?? 0) + 1;
  // Quality bonus increases logarithmically with practice, caps at 20
  const qualityBonus = Math.min(20, Math.floor(Math.log2(timesCompleted + 1) * 5));
  const bestQuality = Math.max(existing?.bestQuality ?? 0, quality);

  const updatedFamiliarity: TaskFamiliarity = {
    timesCompleted,
    qualityBonus,
    bestQuality,
    lastPerformed: tick,
  };

  // Update signature task if this has highest quality bonus
  let signatureTask = domain.signatureTask;
  const currentSignatureBonus = signatureTask
    ? domain.familiarity[signatureTask]?.qualityBonus ?? 0
    : 0;
  if (qualityBonus > currentSignatureBonus) {
    signatureTask = taskId;
  }

  const updatedDomain: SkillDomainData = {
    ...domain,
    familiarity: {
      ...domain.familiarity,
      [taskId]: updatedFamiliarity,
    },
    signatureTask,
    tasksCompleted: domain.tasksCompleted + 1,
  };

  return {
    ...skills,
    domains: {
      ...skills.domains,
      [skillId]: updatedDomain,
    },
  };
}

/**
 * Get task familiarity bonus (0-20 quality bonus).
 */
export function getTaskFamiliarityBonus(
  skills: SkillsComponent,
  skillId: SkillId,
  taskId: string
): number {
  const domain = getDomainData(skills, skillId);
  return domain.familiarity[taskId]?.qualityBonus ?? 0;
}

/**
 * Get task completion count.
 */
export function getTaskCompletionCount(
  skills: SkillsComponent,
  skillId: SkillId,
  taskId: string
): number {
  const domain = getDomainData(skills, skillId);
  return domain.familiarity[taskId]?.timesCompleted ?? 0;
}

/**
 * Add XP to a specialization within a skill domain.
 * Returns updated SkillsComponent.
 *
 * @param skills - The skills component
 * @param skillId - Which skill domain (cooking, crafting, etc.)
 * @param specName - Specialization name (baking, woodworking, etc.)
 * @param xp - XP to add
 */
export function addSpecializationXP(
  skills: SkillsComponent,
  skillId: SkillId,
  specName: string,
  xp: number
): SkillsComponent {
  const domain = getDomainData(skills, skillId);
  const existing = domain.specializations[specName];

  const newTotalXp = (existing?.totalXp ?? 0) + xp;
  // Level is 0-100 based on XP (10 XP per level)
  const newLevel = Math.min(100, Math.floor(newTotalXp / 10));

  const updatedSpec: SkillSpecialization = {
    name: specName,
    level: newLevel,
    totalXp: newTotalXp,
  };

  const updatedDomain: SkillDomainData = {
    ...domain,
    specializations: {
      ...domain.specializations,
      [specName]: updatedSpec,
    },
  };

  return {
    ...skills,
    domains: {
      ...skills.domains,
      [skillId]: updatedDomain,
    },
  };
}

/**
 * Get specialization level (0-100).
 */
export function getSpecializationLevel(
  skills: SkillsComponent,
  skillId: SkillId,
  specName: string
): number {
  const domain = getDomainData(skills, skillId);
  return domain.specializations[specName]?.level ?? 0;
}

/**
 * Get specialization bonus as a multiplier.
 * Level 0 = 0%, Level 100 = 10% bonus.
 */
export function getSpecializationBonus(
  skills: SkillsComponent,
  skillId: SkillId,
  specName: string
): number {
  const level = getSpecializationLevel(skills, skillId, specName);
  return (level / 100) * 10; // 0-10 bonus
}

/**
 * Default specializations by skill.
 * Each skill can have multiple methods/approaches.
 */
export const SKILL_SPECIALIZATIONS: Record<SkillId, string[]> = {
  cooking: ['baking', 'grilling', 'stewing', 'preservation'],
  crafting: ['woodworking', 'smithing', 'leatherworking', 'weaving'],
  building: ['masonry', 'carpentry', 'thatching', 'plumbing'],
  farming: ['irrigation', 'composting', 'seed_selection', 'greenhouse'],
  gathering: ['foraging', 'mining', 'logging', 'fishing'],
  animal_handling: ['taming', 'training', 'breeding', 'veterinary'],
  medicine: ['herbalism', 'surgery', 'diagnosis', 'first_aid'],
  social: ['negotiation', 'leadership', 'teaching', 'entertainment'],
  exploration: ['navigation', 'survival', 'cartography', 'climbing'],
  combat: ['melee', 'ranged', 'defense', 'tactics'],
};

/**
 * Get signature task (best/most practiced task) for a skill domain.
 */
export function getSignatureTask(
  skills: SkillsComponent,
  skillId: SkillId
): string | undefined {
  const domain = getDomainData(skills, skillId);
  return domain.signatureTask;
}

/**
 * Get total tasks completed in a skill domain.
 */
export function getTotalTasksCompleted(
  skills: SkillsComponent,
  skillId: SkillId
): number {
  const domain = getDomainData(skills, skillId);
  return domain.tasksCompleted;
}

// ============================================
// PROGRESSIVE SKILL REVEAL SYSTEM
// ============================================

/**
 * Generate random starting skills based on personality affinities.
 * Per progressive-skill-reveal-spec.md:
 * - Agents spawn with 1-3 skills at level 1-2
 * - Skills are chosen based on personality affinities
 * - 80%+ of agents should have at least one skill > 0
 *
 * @throws Error if personality is missing
 */
export function generateRandomStartingSkills(
  personality: PersonalityComponent
): SkillsComponent {
  if (!personality) {
    throw new Error('generateRandomStartingSkills requires a valid personality component');
  }

  // Generate affinities from personality
  const affinities = generateAffinitiesFromPersonality(personality);

  // Convert affinities to weighted skill pool
  const skillPool: Array<{ skill: SkillId; weight: number }> = ALL_SKILL_IDS.map(skillId => ({
    skill: skillId,
    weight: affinities[skillId],
  }));

  // Sort by weight (highest affinity first)
  skillPool.sort((a, b) => b.weight - a.weight);

  // Determine number of starting skills (1-3)
  // Higher average affinity = more likely to have multiple skills
  const avgAffinity = Object.values(affinities).reduce((sum, a) => sum + a, 0) / ALL_SKILL_IDS.length;
  let numSkills: number;
  if (avgAffinity > 1.2) {
    numSkills = Math.random() < 0.7 ? 3 : 2; // 70% chance of 3 skills
  } else if (avgAffinity > 0.8) {
    numSkills = Math.random() < 0.6 ? 2 : 1; // 60% chance of 2 skills
  } else {
    numSkills = Math.random() < 0.7 ? 1 : 2; // 70% chance of 1 skill
  }

  // Select skills weighted by affinity
  const selectedSkills: SkillId[] = [];
  const remainingPool = [...skillPool];

  for (let i = 0; i < numSkills && remainingPool.length > 0; i++) {
    // Calculate total weight of remaining skills
    const totalWeight = remainingPool.reduce((sum, s) => sum + s.weight, 0);

    // Random weighted selection
    let random = Math.random() * totalWeight;
    let selected: SkillId | null = null;

    for (let j = 0; j < remainingPool.length; j++) {
      const poolItem = remainingPool[j];
      if (!poolItem) continue;
      random -= poolItem.weight;
      if (random <= 0) {
        selected = poolItem.skill;
        remainingPool.splice(j, 1);
        break;
      }
    }

    if (selected) {
      selectedSkills.push(selected);
    }
  }

  // Create skills component with selected skills at level 1-2
  const levels = createDefaultLevels();
  const experience = createDefaultExperience();
  const totalExperience = createDefaultExperience();

  for (const skillId of selectedSkills) {
    // Randomly assign level 1 or 2 (weighted toward 1)
    const level: SkillLevel = Math.random() < 0.7 ? 1 : 2;
    levels[skillId] = level;

    // Set experience to match level
    const xp = XP_PER_LEVEL[level];
    experience[skillId] = 0; // Progress toward next level
    totalExperience[skillId] = xp;
  }

  return {
    type: 'skills',
    version: 1,
    levels,
    experience,
    totalExperience,
    affinities,
  };
}

/**
 * Get perception radius based on skill level.
 * Per progressive-skill-reveal-spec.md:
 * - Level 0: ~5 tiles (adjacent only)
 * - Level 1: ~15 tiles (nearby)
 * - Level 2: ~30 tiles (local area)
 * - Level 3: ~50 tiles (extended area)
 * - Level 4: ~100 tiles (region-wide)
 * - Level 5: Map-wide (200+ tiles)
 */
export function getPerceptionRadius(level: SkillLevel): number {
  const radii: Record<SkillLevel, number> = {
    0: 5,
    1: 15,
    2: 30,
    3: 50,
    4: 100,
    5: 200,
  };
  return radii[level];
}

/**
 * Entity visibility requirements by type and skill.
 * Maps entity types to required skill level for visibility.
 */
export const ENTITY_SKILL_VISIBILITY: Record<string, { skill: SkillId; level: SkillLevel }[]> = {
  // Everyone can see basic resources (no skill required)
  'berry_bush': [],
  'tree': [],
  'rock': [],

  // Gathering skill visibility
  'hidden_berry_patch': [{ skill: 'gathering', level: 2 }],
  'clay_deposit': [{ skill: 'gathering', level: 2 }],

  // Cooking skill visibility
  'wild_onion': [{ skill: 'cooking', level: 2 }],
  'edible_flower': [{ skill: 'cooking', level: 2 }],
  'honey_source': [{ skill: 'cooking', level: 2 }],
  'truffle': [{ skill: 'cooking', level: 4 }],

  // Building skill visibility
  'iron_ore': [{ skill: 'building', level: 2 }],
  'sand_deposit': [{ skill: 'building', level: 2 }],

  // Farming skill visibility
  'herb_patch': [{ skill: 'farming', level: 2 }],
  'potato_plant': [{ skill: 'farming', level: 2 }],
  'rare_herb': [{ skill: 'farming', level: 4 }],
  'soil_quality_indicator': [{ skill: 'farming', level: 4 }],
  'saffron_plant': [{ skill: 'farming', level: 4 }],
};

/**
 * Check if an entity is visible with given skill.
 * Returns true if the entity can be seen with the specified skill level.
 */
export function isEntityVisibleWithSkill(
  entityType: string,
  skillId: SkillId,
  level: SkillLevel
): boolean {
  const requirements = ENTITY_SKILL_VISIBILITY[entityType];

  // No requirements = always visible
  if (!requirements || requirements.length === 0) {
    return true;
  }

  // Check if any requirement is met
  for (const req of requirements) {
    if (req.skill === skillId && level >= req.level) {
      return true;
    }
  }

  return false;
}

/**
 * Filter visible entities based on agent's skills and perception radius.
 */
export function filterVisibleEntities(
  entities: Array<{ id: string; type: string; position: { x: number; y: number } }>,
  skills: Partial<Record<SkillId, SkillLevel>>,
  agentPosition: { x: number; y: number }
): Array<{ id: string; type: string; position: { x: number; y: number } }> {
  const visible: Array<{ id: string; type: string; position: { x: number; y: number } }> = [];

  for (const entity of entities) {
    // Calculate distance
    const dx = entity.position.x - agentPosition.x;
    const dy = entity.position.y - agentPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check visibility for each skill
    let canSee = false;
    for (const skillId of ALL_SKILL_IDS) {
      const level = skills[skillId] ?? 0;
      const radius = getPerceptionRadius(level);

      // Within perception radius and skill allows visibility
      if (distance <= radius && isEntityVisibleWithSkill(entity.type, skillId, level)) {
        canSee = true;
        break;
      }
    }

    if (canSee) {
      visible.push(entity);
    }
  }

  return visible;
}

/**
 * Get food storage information at specified cooking skill level.
 * Per progressive-skill-reveal-spec.md:
 * - Level 0: "There's food stored"
 * - Level 1: "Storage has 15 berries, 8 meat"
 * - Level 2: "Village consumes ~10 food/day"
 * - Level 3: "2.3 days of food remaining"
 * - Level 4+: "Cooked meals last 3x longer, menu plan..."
 */
export function getFoodStorageInfo(
  storageData: {
    items: Record<string, number>;
    villageSize: number;
    consumptionRate: number;
  },
  cookingLevel: SkillLevel
): string {
  const totalFood = Object.values(storageData.items).reduce((sum, qty) => sum + qty, 0);

  if (cookingLevel === 0) {
    return "There's food stored";
  }

  if (cookingLevel === 1) {
    // Show item counts
    const itemList = Object.entries(storageData.items)
      .map(([item, qty]) => `${qty} ${item}`)
      .join(', ');
    return `Storage has ${itemList}`;
  }

  if (cookingLevel === 2) {
    // Show consumption rate
    const itemList = Object.entries(storageData.items)
      .map(([item, qty]) => `${qty} ${item}`)
      .join(', ');
    return `Storage has ${itemList}. Village consumes ~${storageData.consumptionRate} food/day`;
  }

  if (cookingLevel === 3) {
    // Show days remaining
    const daysRemaining = totalFood / storageData.consumptionRate;
    const itemList = Object.entries(storageData.items)
      .map(([item, qty]) => `${qty} ${item}`)
      .join(', ');
    return `Storage has ${itemList}. Village consumes ~${storageData.consumptionRate} food/day. ${daysRemaining.toFixed(1)} days of food remaining`;
  }

  // Level 4+: Strategic insights
  const daysRemaining = totalFood / storageData.consumptionRate;
  const itemList = Object.entries(storageData.items)
    .map(([item, qty]) => `${qty} ${item}`)
    .join(', ');
  return `Storage has ${itemList}. Village consumes ~${storageData.consumptionRate} food/day. ${daysRemaining.toFixed(1)} days of food remaining. Tip: cook meals to preserve food 3x longer`;
}

/**
 * Get village building information at specified building skill level.
 * Per progressive-skill-reveal-spec.md:
 * - Level 0: "There are some structures nearby"
 * - Level 1: List of building names
 * - Level 2: Building purposes + construction status
 * - Level 3: Material requirements for in-progress buildings
 * - Level 4+: Infrastructure gaps + optimization suggestions
 */
export function getVillageInfo(
  villageData: {
    buildings: Array<{
      id: string;
      name: string;
      status: string;
      purpose?: string;
      materialsNeeded?: Record<string, number>;
    }>;
    gaps?: string[];
  },
  buildingLevel: SkillLevel
): string {
  if (buildingLevel === 0) {
    return "There are some structures nearby";
  }

  if (buildingLevel === 1) {
    // List building names
    const names = villageData.buildings.map(b => b.name).join(', ');
    return `Buildings: ${names}`;
  }

  if (buildingLevel === 2) {
    // Show purposes and status
    const details = villageData.buildings.map(b => {
      const purpose = b.purpose ? ` (${b.purpose})` : '';
      const status = b.status !== 'complete' ? ` [${b.status}]` : '';
      return `${b.name}${purpose}${status}`;
    }).join(', ');
    return `Buildings: ${details}`;
  }

  if (buildingLevel === 3) {
    // Show material requirements
    const details = villageData.buildings.map(b => {
      const purpose = b.purpose ? ` (${b.purpose})` : '';
      const status = b.status !== 'complete' ? ` [${b.status}]` : '';
      let materials = '';
      if (b.materialsNeeded) {
        const matList = Object.entries(b.materialsNeeded)
          .map(([mat, qty]) => `${qty} ${mat}`)
          .join(', ');
        materials = ` - needs: ${matList}`;
      }
      return `${b.name}${purpose}${status}${materials}`;
    }).join('; ');
    return `Buildings: ${details}`;
  }

  // Level 4+: Infrastructure gaps
  const details = villageData.buildings.map(b => {
    const purpose = b.purpose ? ` (${b.purpose})` : '';
    const status = b.status !== 'complete' ? ` [${b.status}]` : '';
    let materials = '';
    if (b.materialsNeeded) {
      const matList = Object.entries(b.materialsNeeded)
        .map(([mat, qty]) => `${qty} ${mat}`)
        .join(', ');
      materials = ` - needs: ${matList}`;
    }
    return `${b.name}${purpose}${status}${materials}`;
  }).join('; ');

  let gapInfo = '';
  if (villageData.gaps && villageData.gaps.length > 0) {
    gapInfo = `\nInfrastructure gaps: ${villageData.gaps.join(', ')}`;
  }

  return `Buildings: ${details}${gapInfo}`;
}

/**
 * Get available actions based on agent's skill levels.
 * Per progressive-skill-reveal-spec.md:
 * - Universal: wander, idle, rest, sleep, eat, drink, talk, follow, gather
 * - Farming 1+: plant, till, harvest
 * - Cooking 1+: cook
 * - Crafting 1+: craft
 * - Building 1+: build (complex)
 * - Animal handling 2+: tame
 * - Medicine 2+: heal
 */
export function getAvailableActions(skills: Partial<Record<SkillId, SkillLevel>>): string[] {
  const actions = [
    // Universal actions - always available regardless of skill
    'wander',
    'idle',
    'rest',
    'sleep',
    'eat',
    'drink',
    'talk',
    'follow',
    'gather'
  ];

  // Farming actions (level 1+)
  if ((skills.farming ?? 0) >= 1) {
    actions.push('plant', 'till', 'harvest');
  }

  // Cooking actions (level 1+)
  if ((skills.cooking ?? 0) >= 1) {
    actions.push('cook');
  }

  // Crafting actions (level 1+)
  if ((skills.crafting ?? 0) >= 1) {
    actions.push('craft');
  }

  // Building actions (level 1+)
  if ((skills.building ?? 0) >= 1) {
    actions.push('build');
  }

  // Animal handling (level 2+)
  if ((skills.animal_handling ?? 0) >= 2) {
    actions.push('tame');
  }

  // Medicine (level 2+)
  if ((skills.medicine ?? 0) >= 2) {
    actions.push('heal');
  }

  return actions;
}

/**
 * Get available buildings based on agent's skill levels.
 * Per progressive-skill-reveal-spec.md:
 * - Tier 0 (building 0): lean-to, campfire, storage-chest, storage-box
 * - Tier 1 (building 1): workbench, tent, bedroll, well, garden_fence
 * - Tier 2 (building 2): bed, forge, farm_shed, market_stall, windmill
 * - Tier 3 (building 3): workshop, barn, library, loom, oven, granary
 * - Tier 4 (building 4): warehouse, monument, trading_post, health_clinic
 * - Tier 5 (building 5): grand_hall, arcane_tower, inventors_hall
 */
export function getAvailableBuildings(
  registry: any,
  skills: Partial<Record<SkillId, SkillLevel>>
): any[] {
  const allBuildings = registry.getAll();
  const buildingLevel = skills.building ?? 0;

  return allBuildings.filter((blueprint: any) => {
    // Must be unlocked (via research or default)
    if (!blueprint.unlocked) {
      return false;
    }

    const required = blueprint.skillRequired;

    // No skill requirement = available to all (still needs to be unlocked)
    if (!required) {
      return true;
    }

    // Check if building skill requirement is met
    if (required.skill === 'building') {
      return buildingLevel >= required.level;
    }

    // Check if any other skill requirement is met
    const requiredSkill = required.skill as SkillId;
    const skillLevel = skills[requiredSkill] ?? 0;
    return skillLevel >= required.level;
  });
}
