/**
 * Sprite Description Builder
 *
 * Builds rich, detailed descriptions for PixelLab sprite generation
 * that incorporate art styles, biomes, and species characteristics.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Art style configurations (subset from artStyles.ts)
export const ART_STYLE_PROMPTS: Record<string, {
  era: string;
  prompt: string;
  colorPalette: string;
  shadingStyle: 'flat shading' | 'basic shading' | 'medium shading' | 'detailed shading';
  outlineStyle: 'single color outline' | 'selective outline' | 'lineless';
  size: number;
}> = {
  nes: {
    era: '8-bit NES (1985-1990)',
    prompt: 'chunky pixels, limited color palette, simple shading like Super Mario Bros, classic NES aesthetic',
    colorPalette: '56 colors maximum',
    shadingStyle: 'flat shading',
    outlineStyle: 'single color outline',
    size: 32,
  },
  snes: {
    era: '16-bit SNES (1991-1996)',
    prompt: 'detailed pixels, rich 256-color palette, smooth gradient shading like Chrono Trigger or Secret of Mana',
    colorPalette: '256 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    size: 48,
  },
  genesis: {
    era: 'Sega Genesis (1988-1997)',
    prompt: 'bold vibrant colors, dithered gradients, detailed sprites like Sonic the Hedgehog, Sega Genesis style',
    colorPalette: '512 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    size: 48,
  },
  gba: {
    era: 'Game Boy Advance (2001-2008)',
    prompt: 'bright vibrant colors, clean outlines, polished sprites like Golden Sun or Fire Emblem GBA',
    colorPalette: '32,768 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'single color outline',
    size: 48,
  },
  gameboy: {
    era: 'Game Boy Classic (1989-1998)',
    prompt: 'monochrome 4-shade green tint palette, simple sprites like Pokemon Red/Blue, Game Boy aesthetic',
    colorPalette: '4 shades of green',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    size: 32,
  },
  ps1: {
    era: '32-bit PS1 (1995-2000)',
    prompt: 'pre-rendered 3D sprites, dithered shading, high detail like Final Fantasy Tactics',
    colorPalette: 'thousands of colors',
    shadingStyle: 'detailed shading',
    outlineStyle: 'selective outline',
    size: 64,
  },
  neogeo: {
    era: 'Neo Geo Arcade (1990-2004)',
    prompt: 'massive detailed sprites, hand-drawn quality, bold colors like Metal Slug',
    colorPalette: '65,536 colors',
    shadingStyle: 'detailed shading',
    outlineStyle: 'selective outline',
    size: 64,
  },
  stardew: {
    era: 'Modern Indie (2016)',
    prompt: 'cozy farming game aesthetic, soft warm colors, charming detailed sprites like Stardew Valley',
    colorPalette: 'true color',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    size: 48,
  },
  undertale: {
    era: 'Modern Indie (2015)',
    prompt: 'minimalist expressive sprites, limited color palette, indie charm like Undertale',
    colorPalette: 'limited palette',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    size: 32,
  },
  celeste: {
    era: 'Modern Indie (2018)',
    prompt: 'modern pixel art, smooth animations, rich detail and vibrant colors like Celeste',
    colorPalette: 'true color',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    size: 48,
  },
};

// Biome visual descriptors
export const BIOME_VISUALS: Record<string, string> = {
  plains: 'earthy brown and golden tones, grass-stained',
  grassland: 'earthy brown and golden tones, grass-stained',
  forest: 'woodland earth tones, dappled sunlight, leaf-covered',
  temperate_forest: 'rich autumn colors, woodland creature',
  desert: 'sandy beige and tan colors, sun-bleached, dusty',
  tundra: 'frosty white and pale blue tones, thick fur, winter-adapted',
  arctic: 'pristine white and icy blue, thick fluffy coat, cold-resistant',
  jungle: 'vibrant tropical colors, lush green accents, jungle creature',
  tropical_forest: 'vibrant tropical colors, exotic patterns',
  swamp: 'murky green and brown tones, damp, mossy',
  wetland: 'waterside colors, sleek wet fur or feathers',
  mountain: 'rocky grey and brown tones, rugged, mountain-dwelling',
  alpine: 'high altitude adapted, thick coat, mountain colors',
  savanna: 'golden grass tones, sun-baked, savanna creature',
  taiga: 'conifer forest colors, pine-scented, northern forest',
  cave: 'pale or dark colors, adapted to darkness, cave-dwelling',
  ocean: 'blue and silver tones, aquatic, ocean creature',
  coastal: 'sea spray colors, sandy, coastal creature',
  farmland: 'domestic farm colors, well-fed, pastoral',
  urban: 'city-adapted colors, urban creature',
};

// Animal category visual hints
export const CATEGORY_VISUALS: Record<string, string> = {
  livestock: 'domesticated farm animal, healthy well-fed appearance',
  wild: 'wild untamed creature, alert natural posture',
  pets: 'friendly companion animal, bright eyes, approachable',
  predator: 'powerful hunting animal, sharp features, alert predator stance',
  prey: 'alert vigilant creature, ready to flee, natural prey animal',
  bird: 'feathered bird, distinct plumage, avian creature',
  fish: 'aquatic scaled fish, streamlined body, fish',
  insect: 'segmented insect body, compound eyes, bug',
  reptile: 'scaly reptilian skin, cold-blooded, reptile',
  amphibian: 'smooth moist skin, amphibious creature',
  mammal: 'furry warm-blooded mammal',
};

// Species-specific visual details for common animals
export const SPECIES_DETAILS: Record<string, string> = {
  // Farm animals
  cow: 'large bovine with spotted or solid coat, sturdy build, gentle eyes',
  pig: 'round pink pig with curly tail, floppy ears, snout',
  sheep: 'woolly sheep with fluffy white coat, gentle face',
  goat: 'agile goat with beard, rectangular pupils, curved horns',
  chicken: 'plump hen with red comb, feathered body, scratching feet',
  rooster: 'proud rooster with tall red comb, colorful tail feathers',
  horse: 'majestic horse with flowing mane, muscular build',
  donkey: 'sturdy donkey with long ears, grey coat',

  // Pets
  dog: 'loyal canine companion, wagging tail, friendly expression',
  cat: 'graceful feline with whiskers, pointed ears, swishing tail',
  rabbit: 'fluffy bunny with long ears, cotton tail, twitching nose',
  hamster: 'tiny round hamster with stuffed cheeks, small paws',

  // Wild animals
  deer: 'graceful deer with slender legs, alert ears, doe eyes',
  wolf: 'powerful wolf with thick fur, sharp eyes, pack hunter',
  fox: 'clever fox with bushy tail, pointed snout, orange coat',
  bear: 'massive bear with thick fur, powerful build, strong claws',
  boar: 'wild boar with tusks, bristly fur, compact muscular build',

  // Small creatures
  mouse: 'tiny mouse with round ears, long thin tail, beady eyes',
  rat: 'clever rat with long tail, pointed snout, quick movements',
  squirrel: 'bushy-tailed squirrel, fluffy tail, acorn-loving',

  // Birds
  eagle: 'majestic eagle with hooked beak, sharp talons, powerful wings',
  owl: 'wise owl with large round eyes, rotating head, silent flight',
  crow: 'intelligent crow with glossy black feathers, sharp beak',
  sparrow: 'small sparrow with brown plumage, chirping bird',
  duck: 'waddling duck with webbed feet, flat bill, waterproof feathers',
  goose: 'honking goose with long neck, webbed feet, loud bird',

  // Reptiles
  snake: 'slithering snake with scales, forked tongue, coiled body',
  lizard: 'quick lizard with scaly skin, long tail, darting movements',
  turtle: 'slow turtle with hard shell, wrinkled skin, patient creature',
  frog: 'hopping frog with bulging eyes, webbed feet, smooth skin',
};

export interface SpriteDescriptionOptions {
  /** The basic species/animal name (e.g., "rabbit", "cow") */
  species: string;
  /** Color or variant (e.g., "white", "brown spotted") */
  variant?: string;
  /** Art style key (e.g., "snes", "genesis") - applied at generation time, not stored */
  artStyle?: string;
  /** Biome where this creature lives */
  biome?: string;
  /** Category (livestock, wild, pets, etc.) */
  category?: string;
  /** Additional custom descriptors */
  customDetails?: string;
  /** Whether this is a plant (changes description structure) */
  isPlant?: boolean;
  /** View perspective */
  view?: 'high top-down' | 'low top-down' | 'side';
}

/**
 * Build a BASE description with species/visual details only (NO art style).
 * This is what gets stored in metadata.json.
 * Art style is applied separately at generation time based on planet.
 */
export function buildBaseDescription(options: Omit<SpriteDescriptionOptions, 'artStyle'>): string {
  const {
    species,
    variant,
    biome,
    category,
    customDetails,
  } = options;

  const parts: string[] = [];

  // 1. Start with species and variant
  if (variant) {
    parts.push(`${variant} ${species}`);
  } else {
    parts.push(species);
  }

  // 2. Add species-specific visual details
  const speciesKey = species.toLowerCase().replace(/\s+/g, '_');
  if (SPECIES_DETAILS[speciesKey]) {
    parts.push(SPECIES_DETAILS[speciesKey]);
  }

  // 3. Add category context
  if (category && CATEGORY_VISUALS[category.toLowerCase()]) {
    parts.push(CATEGORY_VISUALS[category.toLowerCase()]);
  }

  // 4. Add biome visual context
  if (biome) {
    const biomeKey = biome.toLowerCase().replace(/\s+/g, '_');
    if (BIOME_VISUALS[biomeKey]) {
      parts.push(BIOME_VISUALS[biomeKey]);
    }
  }

  // 5. Add custom details
  if (customDetails) {
    parts.push(customDetails);
  }

  return parts.join(', ');
}

/**
 * Build a FULL description for PixelLab generation by combining base description + art style.
 * Use this at generation time, NOT for storage.
 */
export function buildSpriteDescription(options: SpriteDescriptionOptions): string {
  const {
    artStyle = 'snes',
    view = 'high top-down',
  } = options;

  // Get base description (species, category, biome details)
  const baseDescription = buildBaseDescription(options);

  const parts: string[] = [baseDescription];

  // Add art style prompt (planet-specific)
  const styleConfig = ART_STYLE_PROMPTS[artStyle] || ART_STYLE_PROMPTS['snes'];
  parts.push(styleConfig.prompt);

  // Add technical specifications
  parts.push(`${view} perspective`);
  parts.push('transparent background');
  parts.push('pixel art');

  return parts.join(', ');
}

/**
 * Get recommended API parameters for an art style
 */
export function getArtStyleParams(artStyle: string): {
  size: number;
  shading: string;
  outline: string;
  detail: string;
} {
  const config = ART_STYLE_PROMPTS[artStyle] || ART_STYLE_PROMPTS['snes'];

  // Map shading style to detail level
  const detailMap: Record<string, string> = {
    'flat shading': 'low detail',
    'basic shading': 'low detail',
    'medium shading': 'medium detail',
    'detailed shading': 'high detail',
  };

  return {
    size: config.size,
    shading: config.shadingStyle,
    outline: config.outlineStyle,
    detail: detailMap[config.shadingStyle] || 'medium detail',
  };
}

/**
 * Load animal species data from the game's data files
 */
export function loadAnimalSpeciesData(): Record<string, {
  biomes: string[];
  category: string;
  diet?: string;
}> {
  const dataPath = path.join(__dirname, '../packages/core/data/animal-species.json');

  if (!fs.existsSync(dataPath)) {
    console.warn('Animal species data not found at:', dataPath);
    return {};
  }

  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const result: Record<string, { biomes: string[]; category: string; diet?: string }> = {};

    // Handle object format: { species: { chicken: {...}, cow: {...} } }
    if (data.species && typeof data.species === 'object' && !Array.isArray(data.species)) {
      for (const [key, sp] of Object.entries(data.species)) {
        const speciesData = sp as Record<string, unknown>;
        result[key.toLowerCase()] = {
          biomes: (speciesData.spawnBiomes as string[]) || (speciesData.biomes as string[]) || [],
          category: (speciesData.category as string) || 'wild',
          diet: speciesData.diet as string | undefined,
        };
      }
      return result;
    }

    // Handle array format: { species: [{id: 'chicken', ...}, ...] }
    const species = Array.isArray(data.species) ? data.species : (Array.isArray(data) ? data : []);

    for (const sp of species) {
      if (sp.id || sp.name) {
        const key = (sp.id || sp.name).toLowerCase();
        result[key] = {
          biomes: sp.spawnBiomes || sp.biomes || sp.habitats || [],
          category: sp.category || 'wild',
          diet: sp.diet,
        };
      }
    }

    return result;
  } catch (err) {
    console.error('Failed to load animal species data:', err);
    return {};
  }
}

/**
 * Get the best biome for a species from the data
 */
export function getBiomeForSpecies(species: string, animalData?: Record<string, { biomes: string[] }>): string | undefined {
  const data = animalData || loadAnimalSpeciesData();
  const speciesKey = species.toLowerCase().replace(/\s+/g, '_');

  const entry = data[speciesKey];
  if (entry && entry.biomes && entry.biomes.length > 0) {
    // Return first biome as primary
    return entry.biomes[0];
  }

  return undefined;
}

/**
 * Parse a sprite folder ID to extract species and variant info
 * e.g., "rabbit_white" -> { species: "rabbit", variant: "white" }
 * e.g., "cow_brown_spotted" -> { species: "cow", variant: "brown spotted" }
 */
export function parseSpriteId(folderId: string): { species: string; variant?: string } {
  // Remove version suffix if present
  const cleanId = folderId.replace(/_v\d+$/, '');

  // Known species that might have multi-word variants
  const knownSpecies = Object.keys(SPECIES_DETAILS);

  const parts = cleanId.split('_');

  // Try to match known species
  for (const known of knownSpecies) {
    if (parts[0] === known) {
      const variant = parts.slice(1).join(' ');
      return {
        species: known,
        variant: variant || undefined,
      };
    }
  }

  // Default: first part is species, rest is variant
  return {
    species: parts[0],
    variant: parts.slice(1).join(' ') || undefined,
  };
}

/**
 * Build a complete sprite generation request with all enriched data.
 * Returns both:
 * - baseDescription: species/visual details only (for storage in metadata)
 * - generationDescription: full description with art style (for PixelLab API)
 */
export function buildEnrichedSpriteRequest(
  folderId: string,
  artStyle: string = 'snes',
  overrides?: Partial<SpriteDescriptionOptions>
): {
  description: string;           // Full description WITH art style (for generation)
  baseDescription: string;       // Base description WITHOUT art style (for storage)
  traits: {
    category?: string;
    size: number;
    species: string;
    legs: number;
    generationMode: string;
    apiParams: {
      view: string;
      detail: string;
      outline: string;
      shading: string;
    };
  };
} {
  // Parse the sprite ID
  const { species, variant } = parseSpriteId(folderId);

  // Load animal data for biome info
  const animalData = loadAnimalSpeciesData();
  const speciesKey = species.toLowerCase();
  const animalInfo = animalData[speciesKey];

  // Get biome from animal data
  const biome = overrides?.biome || animalInfo?.biomes?.[0];
  const category = overrides?.category || animalInfo?.category;

  const descriptionOptions = {
    species,
    variant,
    biome,
    category,
    ...overrides,
  };

  // Build base description (NO art style - for storage)
  const baseDescription = buildBaseDescription(descriptionOptions);

  // Build full description (WITH art style - for generation)
  const description = buildSpriteDescription({
    ...descriptionOptions,
    artStyle,
  });

  // Get art style parameters
  const styleParams = getArtStyleParams(artStyle);

  // Determine leg count for generation mode
  const quadrupeds = ['cow', 'pig', 'sheep', 'goat', 'horse', 'donkey', 'dog', 'cat', 'rabbit',
                      'deer', 'wolf', 'fox', 'bear', 'boar', 'mouse', 'rat', 'squirrel'];
  const isQuadruped = quadrupeds.includes(speciesKey);

  return {
    description,
    baseDescription,
    traits: {
      category: category || 'animals',
      size: styleParams.size,
      species,
      legs: isQuadruped ? 4 : 2,
      generationMode: isQuadruped ? 'quadruped' : 'auto',
      apiParams: {
        view: 'high top-down',
        detail: styleParams.detail,
        outline: styleParams.outline,
        shading: styleParams.shading,
      },
    },
  };
}

// Export for use in other modules
export default {
  buildBaseDescription,
  buildSpriteDescription,
  getArtStyleParams,
  loadAnimalSpeciesData,
  getBiomeForSpecies,
  parseSpriteId,
  buildEnrichedSpriteRequest,
  ART_STYLE_PROMPTS,
  BIOME_VISUALS,
  CATEGORY_VISUALS,
  SPECIES_DETAILS,
};
