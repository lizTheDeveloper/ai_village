/**
 * Stable Animal Sprite Variant Assignment
 * Uses entity ID to deterministically assign a sprite variant
 */

export interface AnimalVariant {
  id: string;
  variant: string;
  description: string;
}

// Animal variant registry
const ANIMAL_VARIANTS: Record<string, AnimalVariant[]> = {
  "chicken": [
    {
      "id": "chicken_white",
      "variant": "white",
      "description": "white feathered chicken"
    },
    {
      "id": "chicken_brown",
      "variant": "brown",
      "description": "brown feathered chicken"
    },
    {
      "id": "chicken_black",
      "variant": "black",
      "description": "black feathered chicken"
    }
  ],
  "cow": [
    {
      "id": "cow_black_white",
      "variant": "black_white",
      "description": "black and white spotted cow"
    },
    {
      "id": "cow_brown",
      "variant": "brown",
      "description": "brown cow"
    },
    {
      "id": "cow_brown_white",
      "variant": "brown_white",
      "description": "brown and white spotted cow"
    }
  ],
  "sheep": [
    {
      "id": "sheep_white",
      "variant": "white",
      "description": "white woolly sheep"
    },
    {
      "id": "sheep_black",
      "variant": "black",
      "description": "black sheep"
    },
    {
      "id": "sheep_grey",
      "variant": "grey",
      "description": "grey woolly sheep"
    }
  ],
  "horse": [
    {
      "id": "horse_brown",
      "variant": "brown",
      "description": "brown horse"
    },
    {
      "id": "horse_black",
      "variant": "black",
      "description": "black horse"
    },
    {
      "id": "horse_white",
      "variant": "white",
      "description": "white horse"
    },
    {
      "id": "horse_chestnut",
      "variant": "chestnut",
      "description": "chestnut brown horse"
    }
  ],
  "dog": [
    {
      "id": "dog_brown",
      "variant": "brown",
      "description": "brown dog"
    },
    {
      "id": "dog_black",
      "variant": "black",
      "description": "black dog"
    },
    {
      "id": "dog_white",
      "variant": "white",
      "description": "white dog"
    },
    {
      "id": "dog_spotted",
      "variant": "spotted",
      "description": "spotted dog"
    }
  ],
  "cat": [
    {
      "id": "cat_orange",
      "variant": "orange_tabby",
      "description": "orange tabby cat"
    },
    {
      "id": "cat_grey",
      "variant": "grey_tabby",
      "description": "grey tabby cat"
    },
    {
      "id": "cat_black",
      "variant": "black",
      "description": "black cat"
    },
    {
      "id": "cat_white",
      "variant": "white",
      "description": "white cat"
    }
  ],
  "rabbit": [
    {
      "id": "rabbit_white",
      "variant": "white",
      "description": "white rabbit"
    },
    {
      "id": "rabbit_brown",
      "variant": "brown",
      "description": "brown rabbit"
    },
    {
      "id": "rabbit_grey",
      "variant": "grey",
      "description": "grey rabbit"
    }
  ],
  "deer": [
    {
      "id": "deer_brown",
      "variant": "brown",
      "description": "brown deer"
    },
    {
      "id": "deer_spotted",
      "variant": "spotted",
      "description": "spotted fawn"
    }
  ],
  "pig": [
    {
      "id": "pig_pink",
      "variant": "pink",
      "description": "pink pig"
    },
    {
      "id": "pig_black",
      "variant": "black",
      "description": "black pig"
    }
  ],
  "goat": [
    {
      "id": "goat_white",
      "variant": "white",
      "description": "white goat"
    },
    {
      "id": "goat_brown",
      "variant": "brown",
      "description": "brown goat"
    },
    {
      "id": "goat_black",
      "variant": "black",
      "description": "black goat"
    }
  ]
};

/**
 * Get a stable sprite variant for an animal entity
 * @param entityId - The entity's unique ID
 * @param speciesId - The animal species ID (e.g., 'chicken', 'dog')
 * @returns The variant ID to use for this entity
 */
export function getAnimalSpriteVariant(entityId: string, speciesId: string): string {
  const variants = ANIMAL_VARIANTS[speciesId];
  if (!variants || variants.length === 0) {
    return speciesId; // Fallback to base species
  }

  // Use entity ID hash to deterministically select variant
  const hash = hashString(entityId);
  const index = hash % variants.length;
  const selectedVariant = variants[index];
  return selectedVariant ? selectedVariant.id : speciesId;
}

/**
 * Simple string hash function for deterministic variant selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get all variants for a species
 */
export function getSpeciesVariants(speciesId: string): AnimalVariant[] {
  return ANIMAL_VARIANTS[speciesId] || [];
}
