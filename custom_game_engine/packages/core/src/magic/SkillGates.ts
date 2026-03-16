/**
 * SkillGates - Technique and Form access gated by magic skill level
 *
 * Magic skill level is 0-5 (SkillLevel type in SkillsComponent):
 *   0-1 (Novice):     Basic techniques and elemental forms
 *   2-3 (Apprentice): Cognitive and control techniques; mind/body forms
 *   4   (Adept):      Destructive/protective techniques; void/nature forms
 *   5   (Master):     All techniques and forms unlocked
 *
 * Part of Phase 30: Magic System Paradigm Implementation
 */

import type { MagicTechnique, MagicForm } from '../components/MagicComponent.js';

// ============================================================================
// Skill-Gated Technique Access
// ============================================================================

/** Techniques available at each minimum skill level */
const TECHNIQUE_MINIMUM_SKILL: Record<MagicTechnique, number> = {
  create:    0,
  perceive:  0,
  control:   2,
  transform: 2,
  destroy:   4,
  protect:   4,
  enhance:   5,
  summon:    5,
};

/** Forms available at each minimum skill level */
const FORM_MINIMUM_SKILL: Record<MagicForm, number> = {
  fire:   0,
  water:  0,
  air:    0,
  earth:  0,
  mind:   2,
  body:   2,
  plant:  4,
  animal: 4,
  void:   4,
  spirit: 5,
  image:  5,
  time:   5,
  space:  5,
  metal:  5,
  sound:  3,
  text:   3,
  emotion: 3,
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns true if an agent with the given magic skill level can use a technique.
 *
 * @param technique - The technique to check
 * @param magicSkillLevel - Agent's magic skill level (0-5)
 */
export function isTechniqueUnlocked(
  technique: MagicTechnique,
  magicSkillLevel: number
): boolean {
  return magicSkillLevel >= TECHNIQUE_MINIMUM_SKILL[technique];
}

/**
 * Returns true if an agent with the given magic skill level can use a form.
 *
 * @param form - The form to check
 * @param magicSkillLevel - Agent's magic skill level (0-5)
 */
export function isFormUnlocked(
  form: MagicForm,
  magicSkillLevel: number
): boolean {
  return magicSkillLevel >= FORM_MINIMUM_SKILL[form];
}

/**
 * Returns true if an agent can cast a spell with the given technique and form.
 * Both must be unlocked.
 *
 * @param technique - The spell's technique
 * @param form - The spell's form
 * @param magicSkillLevel - Agent's magic skill level (0-5)
 */
export function isSpellAccessible(
  technique: MagicTechnique,
  form: MagicForm,
  magicSkillLevel: number
): boolean {
  return isTechniqueUnlocked(technique, magicSkillLevel) &&
         isFormUnlocked(form, magicSkillLevel);
}

/**
 * Returns all techniques unlocked at the given skill level.
 */
export function getUnlockedTechniques(magicSkillLevel: number): MagicTechnique[] {
  return (Object.keys(TECHNIQUE_MINIMUM_SKILL) as MagicTechnique[]).filter(
    t => magicSkillLevel >= TECHNIQUE_MINIMUM_SKILL[t]
  );
}

/**
 * Returns all forms unlocked at the given skill level.
 */
export function getUnlockedForms(magicSkillLevel: number): MagicForm[] {
  return (Object.keys(FORM_MINIMUM_SKILL) as MagicForm[]).filter(
    f => magicSkillLevel >= FORM_MINIMUM_SKILL[f]
  );
}

/**
 * Returns the minimum skill level required to access a technique.
 */
export function getRequiredSkillForTechnique(technique: MagicTechnique): number {
  return TECHNIQUE_MINIMUM_SKILL[technique];
}

/**
 * Returns the minimum skill level required to access a form.
 */
export function getRequiredSkillForForm(form: MagicForm): number {
  return FORM_MINIMUM_SKILL[form];
}

/**
 * Returns a human-readable reason why a spell is inaccessible, or null if accessible.
 */
export function getAccessBlockReason(
  technique: MagicTechnique,
  form: MagicForm,
  magicSkillLevel: number
): string | null {
  const techniqueMin = TECHNIQUE_MINIMUM_SKILL[technique];
  const formMin = FORM_MINIMUM_SKILL[form];

  if (magicSkillLevel < techniqueMin && magicSkillLevel < formMin) {
    return `Requires magic skill ${Math.max(techniqueMin, formMin)} (have ${magicSkillLevel}): both technique '${technique}' and form '${form}' are locked`;
  }
  if (magicSkillLevel < techniqueMin) {
    return `Requires magic skill ${techniqueMin} (have ${magicSkillLevel}): technique '${technique}' is locked`;
  }
  if (magicSkillLevel < formMin) {
    return `Requires magic skill ${formMin} (have ${magicSkillLevel}): form '${form}' is locked`;
  }

  return null;
}
