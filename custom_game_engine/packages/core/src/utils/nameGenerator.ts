/**
 * Name Generator Utility
 *
 * Simple phonetically-pleasing random name generator for entities.
 * Local implementation to avoid circular dependencies with @ai-village/language.
 */

// Soft consonants (nasals, liquids, fricatives - more pleasant sounds)
const SOFT_CONSONANTS = ['m', 'n', 'l', 'r', 's', 'f', 'v', 'w', 'y', 'h'];

// Common vowels
const VOWELS = ['a', 'e', 'i', 'o', 'u'];

/**
 * Generate a random phonetically-pleasing name
 * Uses CV (consonant-vowel) syllable pattern for pleasant-sounding names
 *
 * @param syllableCount Number of syllables (default: 2)
 * @returns A random name like "nela", "rivo", "misu"
 *
 * @example
 * ```typescript
 * const name = generateRandomName(); // "nela", "rivo", "misu"
 * const longerName = generateRandomName(3); // "nelakon"
 * ```
 */
export function generateRandomName(syllableCount: number = 2): string {
  const syllables: string[] = [];

  for (let i = 0; i < syllableCount; i++) {
    const consonant = SOFT_CONSONANTS[Math.floor(Math.random() * SOFT_CONSONANTS.length)]!;
    const vowel = VOWELS[Math.floor(Math.random() * VOWELS.length)]!;
    syllables.push(consonant + vowel);
  }

  return syllables.join('');
}

/**
 * Generate a capitalized random name
 *
 * @param syllableCount Number of syllables (default: 2)
 * @returns A capitalized random name like "Nela", "Rivo"
 */
export function generateCapitalizedName(syllableCount: number = 2): string {
  const name = generateRandomName(syllableCount);
  return name.charAt(0).toUpperCase() + name.slice(1);
}
