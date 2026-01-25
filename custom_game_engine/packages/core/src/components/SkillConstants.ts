/**
 * Constants for the Progressive Skill Reveal System.
 * Per progressive-skill-reveal-spec.md
 */

import type { SkillLevel, SkillId } from './SkillsComponent.js';
import constantsData from '../data/constants.json';
import skillsData from '../data/skills.json';

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
  0: skillsData.skillPerceptionRadius['0'],
  1: skillsData.skillPerceptionRadius['1'],
  2: skillsData.skillPerceptionRadius['2'],
  3: skillsData.skillPerceptionRadius['3'],
  4: skillsData.skillPerceptionRadius['4'],
  5: skillsData.skillPerceptionRadius['5'],
};

/**
 * Relationship tiers based on familiarity level.
 * Determines what affordances can be accessed through relationships.
 */
export const RELATIONSHIP_TIERS = {
  STRANGER: constantsData.relationships.tiers.stranger,
  ACQUAINTANCE: constantsData.relationships.tiers.acquaintance,
  FRIEND: constantsData.relationships.tiers.friend,
  CLOSE_FRIEND: constantsData.relationships.tiers.closeFriend,
  FAMILY: constantsData.relationships.tiers.family,
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
  stranger: constantsData.relationships.affordances.stranger,
  acquaintance: constantsData.relationships.affordances.acquaintance,
  friend: constantsData.relationships.affordances.friend,
  close_friend: constantsData.relationships.affordances.closeFriend,
  family: constantsData.relationships.affordances.family,
} as const;

/**
 * Skill level names for UI display.
 */
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  0: skillsData.skillLevelLabels['0'],
  1: skillsData.skillLevelLabels['1'],
  2: skillsData.skillLevelLabels['2'],
  3: skillsData.skillLevelLabels['3'],
  4: skillsData.skillLevelLabels['4'],
  5: skillsData.skillLevelLabels['5'],
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
export const ENTITY_VISIBILITY_MAP: Record<string, EntityVisibilityRequirement[]> = ((): Record<string, EntityVisibilityRequirement[]> => {
  // Type guard: validate that skillsData.entityVisibilityMap is an object
  if (typeof skillsData.entityVisibilityMap !== 'object' || skillsData.entityVisibilityMap === null) {
    throw new Error('skillsData.entityVisibilityMap must be an object');
  }
  return skillsData.entityVisibilityMap as Record<string, EntityVisibilityRequirement[]>;
})();

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
