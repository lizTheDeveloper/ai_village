/**
 * SpriteRegistry - Maps game entity traits to PixelLab sprite folders
 *
 * This registry allows the game to automatically select the appropriate
 * sprite based on an entity's species, gender, hair color, and skin tone.
 */

export type BodyType = 'humanoid' | 'quadruped' | 'avian' | 'serpentine' | 'insectoid';

export interface SpriteTraits {
  species: string;
  gender?: 'male' | 'female' | 'nonbinary';
  hairColor?: string;
  skinTone?: string;
  bodyType?: BodyType;
  features?: string; // Additional features for aliens/creatures (e.g., "crystalline scales, bioluminescent eyes")
}

export interface SpriteMapping {
  folderId: string;
  species: string;
  gender?: string;
  hairColor?: string;
  skinTone?: string;
  priority: number; // Higher priority = more specific match
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
 * Find the best matching sprite for given traits
 */
export function findSprite(traits: SpriteTraits): string {
  let bestMatch: SpriteMapping | null = null;
  let bestScore = -1;

  for (const mapping of SPRITE_MAPPINGS) {
    // Must match species
    if (mapping.species !== traits.species) continue;

    let score = mapping.priority;

    // Gender match bonus
    if (mapping.gender) {
      if (mapping.gender === traits.gender) {
        score += 20;
      } else {
        continue; // Gender mismatch, skip
      }
    }

    // Hair color match bonus
    if (mapping.hairColor && traits.hairColor) {
      if (mapping.hairColor === traits.hairColor) {
        score += 15;
      } else if (mapping.hairColor) {
        continue; // Hair color mismatch, skip if sprite specifies one
      }
    }

    // Skin tone match bonus
    if (mapping.skinTone && traits.skinTone) {
      if (mapping.skinTone === traits.skinTone) {
        score += 15;
      } else if (mapping.skinTone) {
        continue; // Skin tone mismatch, skip if sprite specifies one
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = mapping;
    }
  }

  return bestMatch?.folderId || 'villager';
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
  };
}
