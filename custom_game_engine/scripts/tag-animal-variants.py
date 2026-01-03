#!/usr/bin/env python3
"""
Tag Animal Sprite Variants
Creates variant mappings for animal sprites and assigns stable IDs
"""

import json
import os
import hashlib
from pathlib import Path

SPRITES_DIR = Path(__file__).parent.parent / "packages/renderer/assets/sprites/pixellab"

# Define color/pattern variants for each animal
ANIMAL_VARIANTS = {
    "chicken": [
        {"id": "chicken_white", "variant": "white", "description": "white feathered chicken"},
        {"id": "chicken_brown", "variant": "brown", "description": "brown feathered chicken"},
        {"id": "chicken_black", "variant": "black", "description": "black feathered chicken"},
    ],
    "cow": [
        {"id": "cow_black_white", "variant": "black_white", "description": "black and white spotted cow"},
        {"id": "cow_brown", "variant": "brown", "description": "brown cow"},
        {"id": "cow_brown_white", "variant": "brown_white", "description": "brown and white spotted cow"},
    ],
    "sheep": [
        {"id": "sheep_white", "variant": "white", "description": "white woolly sheep"},
        {"id": "sheep_black", "variant": "black", "description": "black sheep"},
        {"id": "sheep_grey", "variant": "grey", "description": "grey woolly sheep"},
    ],
    "horse": [
        {"id": "horse_brown", "variant": "brown", "description": "brown horse"},
        {"id": "horse_black", "variant": "black", "description": "black horse"},
        {"id": "horse_white", "variant": "white", "description": "white horse"},
        {"id": "horse_chestnut", "variant": "chestnut", "description": "chestnut brown horse"},
    ],
    "dog": [
        {"id": "dog_brown", "variant": "brown", "description": "brown dog"},
        {"id": "dog_black", "variant": "black", "description": "black dog"},
        {"id": "dog_white", "variant": "white", "description": "white dog"},
        {"id": "dog_spotted", "variant": "spotted", "description": "spotted dog"},
    ],
    "cat": [
        {"id": "cat_orange", "variant": "orange_tabby", "description": "orange tabby cat"},
        {"id": "cat_grey", "variant": "grey_tabby", "description": "grey tabby cat"},
        {"id": "cat_black", "variant": "black", "description": "black cat"},
        {"id": "cat_white", "variant": "white", "description": "white cat"},
    ],
    "rabbit": [
        {"id": "rabbit_white", "variant": "white", "description": "white rabbit"},
        {"id": "rabbit_brown", "variant": "brown", "description": "brown rabbit"},
        {"id": "rabbit_grey", "variant": "grey", "description": "grey rabbit"},
    ],
    "deer": [
        {"id": "deer_brown", "variant": "brown", "description": "brown deer"},
        {"id": "deer_spotted", "variant": "spotted", "description": "spotted fawn"},
    ],
    "pig": [
        {"id": "pig_pink", "variant": "pink", "description": "pink pig"},
        {"id": "pig_black", "variant": "black", "description": "black pig"},
    ],
    "goat": [
        {"id": "goat_white", "variant": "white", "description": "white goat"},
        {"id": "goat_brown", "variant": "brown", "description": "brown goat"},
        {"id": "goat_black", "variant": "black", "description": "black goat"},
    ],
}

def tag_existing_sprites():
    """Tag existing animal sprites as the first variant for each species"""

    tagged_sprites = {}

    for animal_id in ANIMAL_VARIANTS.keys():
        animal_dir = SPRITES_DIR / animal_id

        if not animal_dir.exists():
            continue

        # Check if directional sprites exist
        directions = ["south", "southwest", "west", "northwest", "north", "northeast", "east", "southeast"]
        has_directions = all((animal_dir / f"{direction}.png").exists() for direction in directions)

        if has_directions:
            # Tag as first variant
            first_variant = ANIMAL_VARIANTS[animal_id][0]
            tagged_sprites[animal_id] = {
                "base_species": animal_id,
                "current_variant_id": first_variant["id"],
                "variant": first_variant["variant"],
                "has_8_directions": True,
                "directions": directions,
            }

            print(f"✓ Tagged {animal_id} as {first_variant['id']} ({first_variant['variant']})")

    return tagged_sprites

def create_variant_registry():
    """Create a registry of all possible variants"""

    registry = {
        "version": "1.0.0",
        "animals": {},
        "variant_count": 0,
    }

    for animal_id, variants in ANIMAL_VARIANTS.items():
        registry["animals"][animal_id] = {
            "base_id": animal_id,
            "variants": variants,
            "variant_count": len(variants),
        }
        registry["variant_count"] += len(variants)

    return registry

def create_assignment_function():
    """Create a stable sprite assignment function"""

    assignment_code = '''/**
 * Stable Animal Sprite Variant Assignment
 * Uses entity ID to deterministically assign a sprite variant
 */

export interface AnimalVariant {
  baseSpecies: string;
  variantId: string;
  variant: string;
  description: string;
}

// Animal variant registry
const ANIMAL_VARIANTS: Record<string, AnimalVariant[]> = ''' + json.dumps({
        animal_id: variants
        for animal_id, variants in ANIMAL_VARIANTS.items()
    }, indent=2) + ''';

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
  return variants[index].id;
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
'''

    return assignment_code

def main():
    print("🏷️  Tagging Animal Sprite Variants\n")

    # Tag existing sprites
    tagged = tag_existing_sprites()

    # Create registry
    registry = create_variant_registry()

    # Save registry
    registry_path = SPRITES_DIR.parent / "animal-variant-registry.json"
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)
    print(f"\n✓ Saved variant registry to {registry_path}")

    # Save tagging results
    tagged_path = SPRITES_DIR.parent / "tagged-sprites.json"
    with open(tagged_path, 'w') as f:
        json.dump(tagged, f, indent=2)
    print(f"✓ Saved tagged sprites to {tagged_path}")

    # Create TypeScript assignment module
    ts_code = create_assignment_function()
    ts_path = Path(__file__).parent.parent / "packages/renderer/src/sprites/AnimalSpriteVariants.ts"
    with open(ts_path, 'w') as f:
        f.write(ts_code)
    print(f"✓ Created sprite assignment module at {ts_path}")

    print(f"\n📊 Summary:")
    print(f"  Total variants defined: {registry['variant_count']}")
    print(f"  Animals with existing sprites: {len(tagged)}")
    print(f"  Variants per animal:")
    for animal_id, data in registry['animals'].items():
        status = "✓" if animal_id in tagged else "○"
        print(f"    {status} {animal_id}: {data['variant_count']} variants")

if __name__ == "__main__":
    main()
