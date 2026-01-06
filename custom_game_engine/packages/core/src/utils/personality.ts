/**
 * Personality trait normalization utilities
 *
 * OCEAN traits MUST be in [0, 1] range. These utilities ensure normalization.
 */

import { PersonalityComponent } from '../components/PersonalityComponent.js';

/**
 * Clamp personality trait to [0, 1] range.
 *
 * @param value - Trait value to clamp
 * @param traitName - Trait name (for logging)
 * @returns Clamped value in [0, 1]
 *
 * @throws RangeError if value is outside [0, 1] (fail fast per code quality rules)
 */
export function clampTrait(value: number, traitName?: string): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new TypeError(
      `Personality trait ${traitName || 'unknown'} must be a finite number, got ${value}`
    );
  }

  if (value < 0 || value > 1) {
    throw new RangeError(
      `Personality trait ${traitName || 'unknown'} must be in [0, 1], got ${value}`
    );
  }

  return value;
}

/**
 * Clamp trait with warning instead of error (for save file recovery).
 *
 * Use this ONLY when loading potentially corrupted save files.
 * For runtime validation, use clampTrait() which throws errors.
 *
 * @param value - Trait value to clamp
 * @param traitName - Trait name (for logging)
 * @returns Clamped value in [0, 1]
 */
export function clampTraitWithWarning(value: number, traitName?: string): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    console.error(
      `[Personality] Trait ${traitName || 'unknown'} is not a finite number: ${value}, defaulting to 0.5`
    );
    return 0.5;
  }

  const clamped = Math.max(0, Math.min(1, value));

  if (clamped !== value) {
    console.warn(
      `[Personality] Trait ${traitName || 'unknown'} out of range: ${value} (clamped to ${clamped})`
    );
  }

  return clamped;
}

/**
 * Normalize all OCEAN traits in a personality component.
 *
 * @param personality - Personality component
 * @returns Normalized personality with all traits in [0, 1]
 *
 * @throws RangeError if any trait is outside [0, 1]
 */
export function normalizePersonality(
  personality: PersonalityComponent
): PersonalityComponent {
  return new PersonalityComponent({
    openness: clampTrait(personality.openness, 'openness'),
    conscientiousness: clampTrait(personality.conscientiousness, 'conscientiousness'),
    extraversion: clampTrait(personality.extraversion, 'extraversion'),
    agreeableness: clampTrait(personality.agreeableness, 'agreeableness'),
    neuroticism: clampTrait(personality.neuroticism, 'neuroticism'),
    workEthic: clampTrait(personality.workEthic, 'workEthic'),
    creativity: clampTrait(personality.creativity, 'creativity'),
    generosity: clampTrait(personality.generosity, 'generosity'),
    leadership: clampTrait(personality.leadership, 'leadership'),
    spirituality: clampTrait(personality.spirituality, 'spirituality'),
  });
}

/**
 * Normalize personality with warnings for save file recovery.
 *
 * Use this when loading save files that might have corrupted data.
 *
 * @param personality - Personality component (possibly corrupted)
 * @returns Normalized personality with all traits in [0, 1]
 */
export function normalizePersonalityWithWarnings(
  personality: PersonalityComponent
): PersonalityComponent {
  return new PersonalityComponent({
    openness: clampTraitWithWarning(personality.openness, 'openness'),
    conscientiousness: clampTraitWithWarning(
      personality.conscientiousness,
      'conscientiousness'
    ),
    extraversion: clampTraitWithWarning(personality.extraversion, 'extraversion'),
    agreeableness: clampTraitWithWarning(personality.agreeableness, 'agreeableness'),
    neuroticism: clampTraitWithWarning(personality.neuroticism, 'neuroticism'),
    workEthic: clampTraitWithWarning(personality.workEthic, 'workEthic'),
    creativity: clampTraitWithWarning(personality.creativity, 'creativity'),
    generosity: clampTraitWithWarning(personality.generosity, 'generosity'),
    leadership: clampTraitWithWarning(personality.leadership, 'leadership'),
    spirituality: clampTraitWithWarning(personality.spirituality, 'spirituality'),
  });
}

/**
 * Modify a personality trait with automatic validation.
 *
 * @param personality - Current personality
 * @param trait - Trait to modify
 * @param delta - Change amount (can be negative)
 * @returns New personality with modified trait
 *
 * @throws RangeError if resulting value would be outside [0, 1]
 *
 * @example
 * ```typescript
 * // Trauma reduces agreeableness
 * personality = modifyTrait(personality, 'agreeableness', -0.3);  // Throws if result < 0
 *
 * // Success boosts extraversion
 * personality = modifyTrait(personality, 'extraversion', 0.2);    // Throws if result > 1
 * ```
 */
export function modifyTrait(
  personality: PersonalityComponent,
  trait: keyof Omit<PersonalityComponent, 'type' | 'version' | 'clone'>,
  delta: number
): PersonalityComponent {
  const currentValue = personality[trait] as number;
  const newValue = currentValue + delta;

  // Fail fast if out of range
  clampTrait(newValue, trait as string);

  return new PersonalityComponent({
    openness: trait === 'openness' ? newValue : personality.openness,
    conscientiousness: trait === 'conscientiousness' ? newValue : personality.conscientiousness,
    extraversion: trait === 'extraversion' ? newValue : personality.extraversion,
    agreeableness: trait === 'agreeableness' ? newValue : personality.agreeableness,
    neuroticism: trait === 'neuroticism' ? newValue : personality.neuroticism,
    workEthic: trait === 'workEthic' ? newValue : personality.workEthic,
    creativity: trait === 'creativity' ? newValue : personality.creativity,
    generosity: trait === 'generosity' ? newValue : personality.generosity,
    leadership: trait === 'leadership' ? newValue : personality.leadership,
    spirituality: trait === 'spirituality' ? newValue : personality.spirituality,
  });
}

/**
 * Set a personality trait with validation.
 *
 * @param personality - Current personality
 * @param trait - Trait to set
 * @param value - New value
 * @returns New personality with set trait
 *
 * @throws RangeError if value is outside [0, 1]
 */
export function setTrait(
  personality: PersonalityComponent,
  trait: keyof Omit<PersonalityComponent, 'type' | 'version' | 'clone'>,
  value: number
): PersonalityComponent {
  // Fail fast if out of range
  clampTrait(value, trait as string);

  return new PersonalityComponent({
    openness: trait === 'openness' ? value : personality.openness,
    conscientiousness: trait === 'conscientiousness' ? value : personality.conscientiousness,
    extraversion: trait === 'extraversion' ? value : personality.extraversion,
    agreeableness: trait === 'agreeableness' ? value : personality.agreeableness,
    neuroticism: trait === 'neuroticism' ? value : personality.neuroticism,
    workEthic: trait === 'workEthic' ? value : personality.workEthic,
    creativity: trait === 'creativity' ? value : personality.creativity,
    generosity: trait === 'generosity' ? value : personality.generosity,
    leadership: trait === 'leadership' ? value : personality.leadership,
    spirituality: trait === 'spirituality' ? value : personality.spirituality,
  });
}

/**
 * Validate that all OCEAN traits are in [0, 1] range.
 *
 * @param personality - Personality to validate
 * @returns True if all traits are valid
 *
 * @throws RangeError if any trait is outside [0, 1]
 * @throws TypeError if any trait is not a number
 */
export function validatePersonality(personality: PersonalityComponent): boolean {
  const allTraits = [
    'openness',
    'conscientiousness',
    'extraversion',
    'agreeableness',
    'neuroticism',
    'workEthic',
    'creativity',
    'generosity',
    'leadership',
    'spirituality',
  ] as const;

  for (const trait of allTraits) {
    clampTrait(personality[trait], trait);
  }

  return true;
}
