/**
 * Core Vocabulary - Essential words pre-generated for each language
 *
 * These words are used in:
 * - Agent names
 * - Place names
 * - Item/artifact names
 * - Cultural concepts
 *
 * Pre-generating ensures consistency and enables procedural naming.
 */

/**
 * Core vocabulary categories
 */
export const CORE_VOCABULARY = {
  // Natural Features (planet-dependent)
  nature: [
    'fire', 'water', 'earth', 'air', 'stone', 'metal',
    'lava', 'ash', 'smoke', 'steam', 'ice', 'snow',
    'mountain', 'valley', 'river', 'ocean', 'lake', 'desert',
    'forest', 'cave', 'cliff', 'island', 'plains', 'jungle',
  ],

  // Celestial & Weather
  sky: [
    'sun', 'moon', 'star', 'sky', 'cloud', 'storm',
    'lightning', 'thunder', 'rain', 'wind', 'dawn', 'dusk',
    'night', 'day', 'darkness', 'light',
  ],

  // Life Forms
  life: [
    'tree', 'flower', 'grass', 'moss', 'vine', 'root',
    'bird', 'fish', 'insect', 'beast', 'predator', 'prey',
    'seed', 'leaf', 'branch', 'petal',
  ],

  // Physical Qualities
  qualities: [
    'strong', 'weak', 'fast', 'slow', 'sharp', 'dull',
    'hot', 'cold', 'bright', 'dark', 'hard', 'soft',
    'big', 'small', 'heavy', 'light', 'long', 'short',
  ],

  // Colors
  colors: [
    'red', 'blue', 'green', 'yellow', 'black', 'white',
    'gray', 'brown', 'orange', 'purple', 'gold', 'silver',
  ],

  // Actions
  actions: [
    'walk', 'run', 'fly', 'swim', 'climb', 'dig',
    'hunt', 'gather', 'build', 'craft', 'fight', 'heal',
    'speak', 'listen', 'see', 'hear', 'smell', 'taste',
  ],

  // Social & Cultural
  culture: [
    'clan', 'tribe', 'family', 'home', 'village', 'city',
    'chief', 'elder', 'warrior', 'hunter', 'healer', 'crafter',
    'honor', 'strength', 'wisdom', 'courage', 'loyalty', 'peace',
    'war', 'friend', 'enemy', 'stranger', 'kin',
  ],

  // Directions
  directions: [
    'north', 'south', 'east', 'west',
    'up', 'down', 'left', 'right',
    'forward', 'backward', 'center', 'edge',
  ],

  // Numbers (1-10)
  numbers: [
    'one', 'two', 'three', 'four', 'five',
    'six', 'seven', 'eight', 'nine', 'ten',
  ],

  // Time
  time: [
    'year', 'season', 'month', 'day', 'hour',
    'past', 'present', 'future', 'old', 'new',
    'birth', 'death', 'life', 'cycle',
  ],

  // Body Parts (species-dependent)
  body: [
    'head', 'eye', 'ear', 'mouth', 'hand',
    'arm', 'leg', 'wing', 'tail', 'claw',
    'horn', 'fang', 'scale', 'fur', 'feather',
  ],
};

/**
 * Get all core concepts as flat array
 */
export function getAllCoreConcepts(): string[] {
  const concepts: string[] = [];
  for (const category of Object.values(CORE_VOCABULARY)) {
    concepts.push(...category);
  }
  return concepts;
}

/**
 * Get planet-appropriate vocabulary
 *
 * Filters vocabulary based on planet type to ensure cultural fit.
 *
 * @param planetType - Planet type
 * @returns Filtered concepts relevant to planet
 */
export function getPlanetVocabulary(planetType: string): string[] {
  const base = getAllCoreConcepts();

  // Planet-specific additions
  const planetSpecific: Record<string, string[]> = {
    volcanic: ['lava', 'ash', 'smoke', 'fire', 'stone', 'heat', 'burn', 'ember', 'magma'],
    ocean: ['water', 'wave', 'tide', 'current', 'reef', 'depth', 'surface', 'salt', 'foam'],
    desert: ['sand', 'dune', 'oasis', 'heat', 'mirage', 'stone', 'dry', 'thirst', 'scorpion'],
    forest: ['tree', 'leaf', 'moss', 'vine', 'root', 'canopy', 'undergrowth', 'branch', 'grove'],
    arctic: ['ice', 'snow', 'frost', 'cold', 'glacier', 'freeze', 'tundra', 'aurora', 'blizzard'],
    mountain: ['peak', 'summit', 'cliff', 'valley', 'altitude', 'stone', 'climb', 'ridge', 'pass'],
  };

  return [...base, ...(planetSpecific[planetType] || [])];
}

/**
 * Get body-plan-appropriate vocabulary
 *
 * Filters vocabulary based on species body plan.
 *
 * @param bodyPlanType - Body plan type
 * @returns Filtered concepts relevant to body plan
 */
export function getBodyPlanVocabulary(bodyPlanType: string): string[] {
  const bodySpecific: Record<string, string[]> = {
    insectoid: ['hive', 'swarm', 'mandible', 'chitin', 'antenna', 'carapace', 'colony', 'queen'],
    avian: ['sky', 'wing', 'feather', 'nest', 'flock', 'soar', 'flight', 'talon', 'beak'],
    aquatic: ['water', 'swim', 'fin', 'gill', 'school', 'depth', 'current', 'scale', 'tide'],
    reptilian: ['scale', 'claw', 'cold-blood', 'bask', 'shed', 'venom', 'serpent', 'coil'],
    multi_throated: ['voice', 'harmony', 'resonance', 'echo', 'choir', 'throat', 'chord'],
    crystalline: ['crystal', 'facet', 'refract', 'resonate', 'vibrate', 'prism', 'shard', 'lattice'],
    humanoid: ['hand', 'tool', 'craft', 'build', 'speak', 'think', 'create'],
  };

  return bodySpecific[bodyPlanType] || [];
}

/**
 * Get essential vocabulary for language initialization
 *
 * Combines base + planet + body plan concepts.
 *
 * @param planetType - Planet type
 * @param bodyPlanType - Body plan type
 * @returns Combined vocabulary list
 */
export function getEssentialVocabulary(
  planetType: string,
  bodyPlanType: string
): string[] {
  const planet = getPlanetVocabulary(planetType);
  const bodyPlan = getBodyPlanVocabulary(bodyPlanType);

  // Combine and deduplicate
  return [...new Set([...planet, ...bodyPlan])];
}

/**
 * Naming patterns using vocabulary
 */
export interface NamingPattern {
  pattern: string;              // e.g., "{quality}-{nature}-{action}er"
  categories: string[];         // Categories to draw from
  example: string;              // Example output
}

export const NAMING_PATTERNS: NamingPattern[] = [
  // Agent Names
  { pattern: '{quality}-{nature}', categories: ['qualities', 'nature'], example: 'Swift-River' },
  { pattern: '{nature}-{action}er', categories: ['nature', 'actions'], example: 'Stone-Walker' },
  { pattern: '{color}-{life}', categories: ['colors', 'life'], example: 'Red-Wing' },
  { pattern: '{culture}-{quality}', categories: ['culture', 'qualities'], example: 'Warrior-Strong' },

  // Place Names
  { pattern: '{quality}-{nature}', categories: ['qualities', 'nature'], example: 'Dark-Forest' },
  { pattern: '{nature}-{direction}', categories: ['nature', 'directions'], example: 'Mountain-North' },
  { pattern: '{life}-{nature}', categories: ['life', 'nature'], example: 'Tree-Valley' },

  // Item/Artifact Names
  { pattern: '{nature}-{body}', categories: ['nature', 'body'], example: 'Stone-Claw' },
  { pattern: '{quality}-{action}', categories: ['qualities', 'actions'], example: 'Sharp-Strike' },
  { pattern: '{color}-{nature}', categories: ['colors', 'nature'], example: 'Blue-Fire' },
];

/**
 * Generate a name using a pattern and translated vocabulary
 *
 * @param pattern - Naming pattern
 * @param vocabulary - Map of concept → alien word
 * @param rng - Random number generator
 * @returns Generated alien name
 */
export function generateNameFromPattern(
  pattern: NamingPattern,
  vocabulary: Map<string, string>,
  rng: () => number = Math.random
): string {
  // Get words from each category
  const words: string[] = [];

  for (const category of pattern.categories) {
    const concepts = CORE_VOCABULARY[category as keyof typeof CORE_VOCABULARY];
    if (!concepts) continue;

    // Pick random concept from category
    const concept = concepts[Math.floor(rng() * concepts.length)]!;

    // Get alien translation
    const alienWord = vocabulary.get(concept);
    if (alienWord) {
      words.push(alienWord);
    }
  }

  // Join with hyphens (or language-specific separator)
  return words.join('-');
}
