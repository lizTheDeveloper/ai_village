/**
 * SkillContextTemplates - Provides skill-level-appropriate context for LLM prompts
 *
 * Higher skill levels receive more detailed, expert-level knowledge.
 * Based on skill-system/spec.md Phase 2.
 */

import type { SkillId, SkillLevel } from '@ai-village/core';
import skillContextsData from '../data/skill-contexts.json';

/**
 * Context templates for each skill at each level.
 * Level 0 = no context, Level 5 = master-level knowledge.
 */
type SkillContextMap = Record<SkillId, Record<SkillLevel, string | null>>;

/**
 * Skill context templates providing domain knowledge.
 * Loaded from ../data/skill-contexts.json
 */
export const SKILL_CONTEXTS: SkillContextMap = skillContextsData.skills as SkillContextMap;
