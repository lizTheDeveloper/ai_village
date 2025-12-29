/**
 * Constants for the Progressive Skill Reveal System.
 * Per progressive-skill-reveal-spec.md
 */

import type { SkillLevel, SkillId } from './SkillsComponent.js';

/**
 * Perception radius by skill level (in tiles).
 * Higher skill = can perceive skill-relevant entities from farther away.
 *
 * Per progressive-skill-reveal-spec.md:
 * - Level 0: ~5 tiles (adjacent only)
 * - Level 1: ~15 tiles (nearby)
 * - Level 2: ~30 tiles (local area)
 * - Level 3: ~50 tiles (extended area)
 * - Level 4: ~100 tiles (region-wide)
 * - Level 5: Map-wide (200+ tiles)
 */
export const SKILL_PERCEPTION_RADIUS: Record<SkillLevel, number> = {
  0: 5,
  1: 15,
  2: 30,
  3: 50,
  4: 100,
  5: 200,
};

/**
 * Relationship tiers based on familiarity level.
 * Determines what affordances can be accessed through relationships.
 */
export const RELATIONSHIP_TIERS = {
  STRANGER: { minFamiliarity: 0, maxFamiliarity: 10 },
  ACQUAINTANCE: { minFamiliarity: 11, maxFamiliarity: 30 },
  FRIEND: { minFamiliarity: 31, maxFamiliarity: 60 },
  CLOSE_FRIEND: { minFamiliarity: 61, maxFamiliarity: 85 },
  FAMILY: { minFamiliarity: 86, maxFamiliarity: 100 },
} as const;

export type RelationshipTier = 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'family';

/**
 * Get relationship tier from familiarity value.
 */
export function getRelationshipTier(familiarity: number): RelationshipTier {
  if (familiarity >= 86) return 'family';
  if (familiarity >= 61) return 'close_friend';
  if (familiarity >= 31) return 'friend';
  if (familiarity >= 11) return 'acquaintance';
  return 'stranger';
}

/**
 * Affordances available at each relationship tier.
 * Per progressive-skill-reveal-spec.md Section 11.
 */
export const RELATIONSHIP_AFFORDANCES = {
  stranger: {
    canObserve: true,
    canTalk: true,
    canAskHelp: false,
    canBorrowTools: false,
    canDelegateTasks: false,
    canLearnSkills: false,
    canShareStorage: false,
    description: "You don't know them yet",
  },
  acquaintance: {
    canObserve: true,
    canTalk: true,
    canAskHelp: false,
    canBorrowTools: false,
    canDelegateTasks: false,
    canLearnSkills: true, // Can observe their primary skill
    canShareStorage: false,
    description: "You've met before",
  },
  friend: {
    canObserve: true,
    canTalk: true,
    canAskHelp: true,
    canBorrowTools: true,
    canDelegateTasks: false,
    canLearnSkills: true,
    canShareStorage: false,
    description: 'A friend who helps when asked',
  },
  close_friend: {
    canObserve: true,
    canTalk: true,
    canAskHelp: true,
    canBorrowTools: true,
    canDelegateTasks: true,
    canLearnSkills: true,
    canShareStorage: true,
    description: 'A close friend who shares resources',
  },
  family: {
    canObserve: true,
    canTalk: true,
    canAskHelp: true,
    canBorrowTools: true,
    canDelegateTasks: true,
    canLearnSkills: true,
    canShareStorage: true,
    skillBonus: 0.1, // +10% effectiveness when working together
    description: 'Family - automatic cooperation',
  },
} as const;

/**
 * Skill level names for UI display.
 */
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  0: 'Untrained',
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
};

/**
 * Entity visibility requirements by type and skill.
 * Maps entity types to required skill levels for visibility.
 *
 * Per progressive-skill-reveal-spec.md Section 2.
 */
export interface EntityVisibilityRequirement {
  skill: SkillId;
  level: SkillLevel;
}

/**
 * Entity type to visibility requirements mapping.
 * Empty array = visible to everyone (no skill required).
 */
export const ENTITY_VISIBILITY_MAP: Record<string, EntityVisibilityRequirement[]> = {
  // Everyone can see basic resources (no skill required)
  berry_bush: [],
  tree: [],
  rock: [],
  branch: [],
  stone: [],

  // Gathering skill visibility
  hidden_berry_patch: [{ skill: 'gathering', level: 2 }],
  clay_deposit: [{ skill: 'gathering', level: 2 }],
  quality_wood_tree: [{ skill: 'gathering', level: 3 }],
  underground_root: [{ skill: 'gathering', level: 4 }],

  // Cooking skill visibility
  wild_onion: [{ skill: 'cooking', level: 2 }],
  edible_flower: [{ skill: 'cooking', level: 2 }],
  honey_source: [{ skill: 'cooking', level: 2 }],
  medicinal_root: [{ skill: 'cooking', level: 3 }],
  spice_plant: [{ skill: 'cooking', level: 3 }],
  truffle: [{ skill: 'cooking', level: 4 }],
  saffron_plant: [{ skill: 'cooking', level: 4 }],

  // Building skill visibility
  iron_ore: [{ skill: 'building', level: 2 }],
  sand_deposit: [{ skill: 'building', level: 2 }],
  copper_ore: [{ skill: 'building', level: 3 }],
  tin_deposit: [{ skill: 'building', level: 3 }],
  quality_stone: [{ skill: 'building', level: 3 }],
  gold_vein: [{ skill: 'building', level: 4 }],
  gem_deposit: [{ skill: 'building', level: 4 }],

  // Farming skill visibility
  wheat_stalk: [{ skill: 'farming', level: 1 }],
  carrot_plant: [{ skill: 'farming', level: 1 }],
  herb_patch: [{ skill: 'farming', level: 2 }],
  potato_plant: [{ skill: 'farming', level: 2 }],
  medicinal_plant: [{ skill: 'farming', level: 3 }],
  flax: [{ skill: 'farming', level: 3 }],
  rare_herb: [{ skill: 'farming', level: 4 }],
  soil_quality_indicator: [{ skill: 'farming', level: 4 }],
  exotic_vegetable: [{ skill: 'farming', level: 4 }],

  // Exploration skill visibility
  path: [{ skill: 'exploration', level: 1 }],
  clearing: [{ skill: 'exploration', level: 1 }],
  hidden_path: [{ skill: 'exploration', level: 2 }],
  shelter_spot: [{ skill: 'exploration', level: 2 }],
  danger_zone: [{ skill: 'exploration', level: 2 }],
  ancient_ruin: [{ skill: 'exploration', level: 4 }],
  rare_biome: [{ skill: 'exploration', level: 4 }],
  secret_location: [{ skill: 'exploration', level: 5 }],

  // Animal handling skill visibility
  chicken: [{ skill: 'animal_handling', level: 1 }],
  pig: [{ skill: 'animal_handling', level: 1 }],
  sheep: [{ skill: 'animal_handling', level: 1 }],
  wild_tameable: [{ skill: 'animal_handling', level: 2 }],
  nest: [{ skill: 'animal_handling', level: 2 }],
  breeding_compatibility: [{ skill: 'animal_handling', level: 4 }],
  rare_creature: [{ skill: 'animal_handling', level: 5 }],
  hidden_den: [{ skill: 'animal_handling', level: 5 }],

  // Medicine skill visibility
  aloe: [{ skill: 'medicine', level: 1 }],
  healing_flower: [{ skill: 'medicine', level: 2 }],
  medicinal_mushroom: [{ skill: 'medicine', level: 2 }],
  rare_remedy: [{ skill: 'medicine', level: 3 }],
  antidote_source: [{ skill: 'medicine', level: 3 }],
  disease_vector: [{ skill: 'medicine', level: 4 }],
  contamination_source: [{ skill: 'medicine', level: 4 }],
};

/**
 * Check if an entity type is visible with given skill level.
 * Note: This is a helper for ENTITY_VISIBILITY_MAP.
 * The main implementation is in SkillsComponent.ts as isEntityVisibleWithSkill().
 */
export function checkEntityVisibility(
  entityType: string,
  skills: Partial<Record<SkillId, SkillLevel>>
): boolean {
  const requirements = ENTITY_VISIBILITY_MAP[entityType];

  // No requirements = always visible
  if (!requirements || requirements.length === 0) {
    return true;
  }

  // Check if any requirement is met
  for (const req of requirements) {
    const agentLevel = skills[req.skill] ?? 0;
    if (agentLevel >= req.level) {
      return true;
    }
  }

  return false;
}
