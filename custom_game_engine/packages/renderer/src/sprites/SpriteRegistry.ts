/**
 * SpriteRegistry - Maps game entity traits to PixelLab sprite folders
 *
 * This registry allows the game to automatically select the appropriate
 * sprite based on an entity's species, gender, hair color, skin tone, and clothing.
 *
 * When an exact match (including clothing) isn't available, returns the closest
 * match while flagging that a better sprite should be generated.
 */

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
 * Available sprite mappings based on downloaded PixelLab sprites
 */
const SPRITE_MAPPINGS: SpriteMapping[] = [
  // Human Males - Skin tone variants with black hair
  {
    folderId: 'human_male_black_light',
    species: 'human',
    gender: 'male',
    hairColor: 'black',
    skinTone: 'light',
    priority: 100,
  },
  {
    folderId: 'human_male_black_medium',
    species: 'human',
    gender: 'male',
    hairColor: 'black',
    skinTone: 'medium',
    priority: 100,
  },
  {
    folderId: 'human_male_black_dark',
    species: 'human',
    gender: 'male',
    hairColor: 'black',
    skinTone: 'dark',
    priority: 100,
  },

  // Human Males - Hair color variants (default skin)
  {
    folderId: 'human_male_black',
    species: 'human',
    gender: 'male',
    hairColor: 'black',
    priority: 80,
  },
  {
    folderId: 'human_male_brown',
    species: 'human',
    gender: 'male',
    hairColor: 'brown',
    priority: 80,
  },
  {
    folderId: 'human_male_blonde',
    species: 'human',
    gender: 'male',
    hairColor: 'blonde',
    priority: 80,
  },
  {
    folderId: 'human_male_blonde_light',
    species: 'human',
    gender: 'male',
    hairColor: 'blonde',
    skinTone: 'light',
    priority: 100,
  },

  // Human Females - Skin tone variants with black hair
  {
    folderId: 'human_female_black_light',
    species: 'human',
    gender: 'female',
    hairColor: 'black',
    skinTone: 'light',
    priority: 100,
  },
  {
    folderId: 'human_female_black_medium',
    species: 'human',
    gender: 'female',
    hairColor: 'black',
    skinTone: 'medium',
    priority: 100,
  },
  {
    folderId: 'human_female_black_dark',
    species: 'human',
    gender: 'female',
    hairColor: 'black',
    skinTone: 'dark',
    priority: 100,
  },

  // Human Nonbinary
  {
    folderId: 'human_nonbinary_black',
    species: 'human',
    gender: 'nonbinary',
    hairColor: 'black',
    priority: 80,
  },

  // Fallbacks - Generic human by gender
  { folderId: 'human_male_brown', species: 'human', gender: 'male', priority: 50 },
  { folderId: 'human_female_black_medium', species: 'human', gender: 'female', priority: 50 },
  { folderId: 'human_nonbinary_black', species: 'human', gender: 'nonbinary', priority: 50 },

  // Animals - Chickens
  { folderId: 'chicken_white', species: 'chicken', priority: 100 },
  { folderId: 'chicken_brown', species: 'chicken', priority: 100 },
  { folderId: 'chicken_black', species: 'chicken', priority: 100 },

  // Animals - Cats
  { folderId: 'cat_orange', species: 'cat', priority: 100 },
  { folderId: 'cat_grey', species: 'cat', priority: 100 },
  { folderId: 'cat_black', species: 'cat', priority: 100 },
  { folderId: 'cat_white', species: 'cat', priority: 100 },

  // Animals - Sheep
  { folderId: 'sheep_white', species: 'sheep', priority: 100 },
  { folderId: 'sheep_black', species: 'sheep', priority: 100 },
  { folderId: 'sheep_grey', species: 'sheep', priority: 100 },

  // Animals - Rabbits
  { folderId: 'rabbit_white', species: 'rabbit', priority: 100 },
  { folderId: 'rabbit_brown', species: 'rabbit', priority: 100 },
  { folderId: 'rabbit_grey', species: 'rabbit', priority: 100 },

  // Animals - Cows
  { folderId: 'cow_black_white', species: 'cow', priority: 100 },
  { folderId: 'cow_brown', species: 'cow', priority: 100 },
  { folderId: 'cow_brown_white', species: 'cow', priority: 100 },

  // Animals - Sheep
  { folderId: 'sheep', species: 'sheep', priority: 100 },

  // Animals - Horses
  { folderId: 'horse_white', species: 'horse', priority: 100 },
  { folderId: 'horse_brown', species: 'horse', priority: 100 },
  { folderId: 'horse_black', species: 'horse', priority: 100 },
  { folderId: 'horse_chestnut', species: 'horse', priority: 100 },

  // Animals - Dogs
  { folderId: 'dog_white', species: 'dog', priority: 100 },
  { folderId: 'dog_brown', species: 'dog', priority: 100 },
  { folderId: 'dog_black', species: 'dog', priority: 100 },
  { folderId: 'dog_spotted', species: 'dog', priority: 100 },

  // Animals - Deer
  { folderId: 'deer', species: 'deer', priority: 100 },
  { folderId: 'deer_brown', species: 'deer', priority: 100 },
  { folderId: 'deer_spotted', species: 'deer', priority: 100 },

  // Animals - Pigs
  { folderId: 'pig_pink', species: 'pig', priority: 100 },
  { folderId: 'pig_black', species: 'pig', priority: 100 },

  // Animals - Goats
  { folderId: 'goat_white', species: 'goat', priority: 100 },
  { folderId: 'goat_brown', species: 'goat', priority: 100 },
  { folderId: 'goat_black', species: 'goat', priority: 100 },

  // Ultimate fallback - villager for any species
  { folderId: 'villager', species: 'human', priority: 10 },
  { folderId: 'villager', species: 'elf', priority: 5 },
  { folderId: 'villager', species: 'dwarf', priority: 5 },
  { folderId: 'villager', species: 'orc', priority: 5 },
  { folderId: 'villager', species: 'celestial', priority: 5 },
  { folderId: 'villager', species: 'demon', priority: 5 },
  { folderId: 'villager', species: 'thrakeen', priority: 5 },
  { folderId: 'villager', species: 'aquatic', priority: 5 },
];

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
  const colorMap: Record<string, string> = {
    black: 'black',
    dark: 'black',
    ebony: 'black',
    brown: 'brown',
    chestnut: 'brown',
    auburn: 'brown',
    blonde: 'blonde',
    blond: 'blonde',
    golden: 'blonde',
    yellow: 'blonde',
    red: 'red',
    ginger: 'red',
    copper: 'red',
    white: 'white',
    silver: 'white',
    gray: 'white',
    grey: 'white',
  };
  return colorMap[color.toLowerCase()] || 'brown';
}

/**
 * Normalize skin tone names to match sprite naming
 */
export function normalizeSkinTone(tone: string): string {
  const toneMap: Record<string, string> = {
    light: 'light',
    pale: 'light',
    fair: 'light',
    medium: 'medium',
    tan: 'medium',
    olive: 'medium',
    dark: 'dark',
    brown: 'dark',
    deep: 'dark',
  };
  return toneMap[tone.toLowerCase()] || 'medium';
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
