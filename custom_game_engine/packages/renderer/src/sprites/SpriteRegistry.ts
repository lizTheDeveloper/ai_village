/**
 * SpriteRegistry - Maps game entity traits to PixelLab sprite folders
 *
 * This registry allows the game to automatically select the appropriate
 * sprite based on an entity's species, gender, hair color, skin tone, and clothing.
 *
 * When an exact match (including clothing) isn't available, returns the closest
 * match while flagging that a better sprite should be generated.
 */

import spriteRegistryData from '../../data/sprite-registry.json' assert { type: 'json' };

export type BodyType = 'humanoid' | 'quadruped' | 'avian' | 'serpentine' | 'insectoid';
export type ClothingType = 'peasant' | 'common' | 'merchant' | 'noble' | 'royal';

export interface SpriteTraits {
  species: string;
  gender?: 'male' | 'female' | 'nonbinary';
  hairColor?: string;
  skinTone?: string;
  clothingType?: ClothingType;
  bodyType?: BodyType;
  features?: string; // Additional features for aliens/creatures (e.g., "crystalline scales, bioluminescent eyes")
}

export interface SpriteMapping {
  folderId: string;
  species: string;
  gender?: string;
  hairColor?: string;
  skinTone?: string;
  clothingType?: ClothingType;
  priority: number; // Higher priority = more specific match
}

export interface SpriteLookupResult {
  folderId: string;
  exactMatch: boolean;           // True if all traits matched including clothing
  idealFolderId?: string;        // The folder ID that would match all traits (for generation queue)
  missingTraits: string[];       // List of traits that didn't match
}

/**
 * Load sprite registry data from JSON
 */
interface SpriteRegistryData {
  spriteMappings: SpriteMapping[];
  hairColorNormalization: Record<string, string>;
  skinToneNormalization: Record<string, string>;
}

let SPRITE_MAPPINGS: SpriteMapping[] = [];
let hairColorMap: Record<string, string> = {};
let skinToneMap: Record<string, string> = {};

/**
 * Load sprite registry data from JSON file
 */
async function loadSpriteRegistry(): Promise<void> {
  try {
    const data = spriteRegistryData as unknown as SpriteRegistryData;
    SPRITE_MAPPINGS = data.spriteMappings;
    hairColorMap = data.hairColorNormalization;
    skinToneMap = data.skinToneNormalization;
  } catch (error) {
    console.error('[SpriteRegistry] Failed to load sprite registry data:', error);
    // Use fallback data
    SPRITE_MAPPINGS = [
      { folderId: 'villager', species: 'human', priority: 10 },
    ];
    hairColorMap = { brown: 'brown' };
    skinToneMap = { medium: 'medium' };
  }
}

// Initialize on module load
const registryPromise = loadSpriteRegistry();

/**
 * Ensure sprite registry is loaded before use
 */
export async function ensureSpriteRegistryLoaded(): Promise<void> {
  await registryPromise;
}

/**
 * Find the best matching sprite for given traits (simple version, backwards compatible)
 */
export function findSprite(traits: SpriteTraits): string {
  const result = findSpriteWithFallback(traits);
  return result.folderId;
}

/**
 * Find the best matching sprite with fallback logic
 * Returns both the best available sprite AND the ideal sprite ID for generation
 */
export function findSpriteWithFallback(traits: SpriteTraits): SpriteLookupResult {
  let bestMatch: SpriteMapping | null = null;
  let bestScore = -1;
  const missingTraits: string[] = [];

  // Find the best matching sprite (including clothing consideration)
  for (const mapping of SPRITE_MAPPINGS) {
    // Must match species
    if (mapping.species !== traits.species) continue;

    let score = mapping.priority;

    // Gender match
    if (mapping.gender) {
      if (mapping.gender === traits.gender) {
        score += 20;
      } else {
        continue; // Gender mismatch, skip
      }
    }

    // Hair color match
    if (mapping.hairColor && traits.hairColor) {
      if (mapping.hairColor === traits.hairColor) {
        score += 15;
      } else {
        continue; // Hair color mismatch, skip if sprite specifies one
      }
    }

    // Skin tone match
    if (mapping.skinTone && traits.skinTone) {
      if (mapping.skinTone === traits.skinTone) {
        score += 15;
      } else {
        continue; // Skin tone mismatch, skip if sprite specifies one
      }
    }

    // Clothing type match (new!)
    if (mapping.clothingType && traits.clothingType) {
      if (mapping.clothingType === traits.clothingType) {
        score += 25; // Higher weight for clothing since it's visually prominent
      } else {
        // Don't skip - allow fallback to different clothing
        score -= 10; // Penalty for clothing mismatch
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = mapping;
    }
  }

  const folderId = bestMatch?.folderId || 'villager';

  // Build the ideal folder ID for generation if not an exact match
  const idealFolderId = buildIdealFolderId(traits);

  // Determine what traits are missing
  if (bestMatch) {
    if (traits.clothingType && bestMatch.clothingType !== traits.clothingType) {
      missingTraits.push('clothingType');
    }
    if (traits.gender && bestMatch.gender !== traits.gender) {
      missingTraits.push('gender');
    }
    if (traits.hairColor && bestMatch.hairColor !== traits.hairColor) {
      missingTraits.push('hairColor');
    }
    if (traits.skinTone && bestMatch.skinTone !== traits.skinTone) {
      missingTraits.push('skinTone');
    }
  }

  const exactMatch = missingTraits.length === 0 && folderId !== 'villager';

  return {
    folderId,
    exactMatch,
    idealFolderId: exactMatch ? undefined : idealFolderId,
    missingTraits,
  };
}

/**
 * Build the ideal folder ID for a set of traits (used for generation queue)
 */
function buildIdealFolderId(traits: SpriteTraits): string {
  const parts: string[] = [traits.species];

  if (traits.gender) {
    parts.push(traits.gender);
  }

  if (traits.hairColor) {
    parts.push(traits.hairColor);
  }

  if (traits.skinTone) {
    parts.push(traits.skinTone);
  }

  if (traits.clothingType) {
    parts.push(traits.clothingType);
  }

  return parts.join('_');
}

/**
 * Get all available sprite folder IDs
 */
export function getAvailableSprites(): string[] {
  const uniqueFolders = new Set(SPRITE_MAPPINGS.map((m) => m.folderId));
  return Array.from(uniqueFolders);
}

/**
 * Get sprites for a specific species
 */
export function getSpritesForSpecies(species: string): string[] {
  const folders = SPRITE_MAPPINGS.filter((m) => m.species === species).map((m) => m.folderId);
  return Array.from(new Set(folders));
}

/**
 * Normalize hair color names to match sprite naming
 */
export function normalizeHairColor(color: string): string {
  return hairColorMap[color.toLowerCase()] || 'brown';
}

/**
 * Normalize skin tone names to match sprite naming
 */
export function normalizeSkinTone(tone: string): string {
  return skinToneMap[tone.toLowerCase()] || 'medium';
}

/**
 * Build traits from game entity components
 */
export function buildTraitsFromEntity(entity: {
  species?: string;
  gender?: string;
  genetics?: {
    hair_color?: string;
    skin_tone?: string;
  };
  clothingType?: ClothingType;
}): SpriteTraits {
  return {
    species: entity.species || 'human',
    gender: (entity.gender as 'male' | 'female' | 'nonbinary') || undefined,
    hairColor: entity.genetics?.hair_color
      ? normalizeHairColor(entity.genetics.hair_color)
      : undefined,
    skinTone: entity.genetics?.skin_tone
      ? normalizeSkinTone(entity.genetics.skin_tone)
      : undefined,
    clothingType: entity.clothingType,
  };
}
