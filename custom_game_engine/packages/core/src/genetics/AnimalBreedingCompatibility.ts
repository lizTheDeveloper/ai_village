/**
 * AnimalBreedingCompatibility
 *
 * Breeding compatibility matrix for MVEE animal species.
 * Compatibility is determined by:
 *   1. Taxonomy (class, order) — most important factor
 *   2. Biome overlap — shared habitat enables opportunity for crossbreeding
 *   3. Diet compatibility — shared dietary strategies suggest metabolic kinship
 *
 * Known mythological hybrids override the calculated score with lore-defined
 * rarity values. These are rare but always biologically possible.
 *
 * Folklore-first design: all hybrid definitions draw from real mythological
 * chimera traditions (Greek, Norse, medieval European).
 */

// ============================================================================
// Taxonomy
// ============================================================================

export type AnimalTaxonomyGroup =
  | 'mammal_ungulate'   // cow, horse, sheep, goat, deer, pig
  | 'mammal_carnivore'  // wolf, jaguar, cat, dog, river_otter
  | 'mammal_small'      // rabbit
  | 'bird'              // chicken, blue_heron, tropical_parrot
  | 'reptile'           // sea_turtle
  | 'amphibian'         // magma_salamander, tree_frog
  | 'arthropod'         // mud_crab, obsidian_beetle, sulfur_moth, giant_spider
  | 'legendary';        // trogdor — cannot hybridize

/** Taxonomy classification for all species in animal-species.json */
const ANIMAL_TAXONOMY: Record<string, AnimalTaxonomyGroup> = {
  cow:               'mammal_ungulate',
  horse:             'mammal_ungulate',
  sheep:             'mammal_ungulate',
  goat:              'mammal_ungulate',
  deer:              'mammal_ungulate',
  pig:               'mammal_ungulate',
  wolf:              'mammal_carnivore',
  jaguar:            'mammal_carnivore',
  cat:               'mammal_carnivore',
  dog:               'mammal_carnivore',
  river_otter:       'mammal_carnivore',
  rabbit:            'mammal_small',
  chicken:           'bird',
  blue_heron:        'bird',
  tropical_parrot:   'bird',
  sea_turtle:        'reptile',
  magma_salamander:  'amphibian',
  tree_frog:         'amphibian',
  mud_crab:          'arthropod',
  obsidian_beetle:   'arthropod',
  sulfur_moth:       'arthropod',
  giant_spider:      'arthropod',
  trogdor:           'legendary',
};

/** Biome lists for each species (mirrors animal-species.json spawnBiomes) */
const ANIMAL_BIOMES: Record<string, ReadonlyArray<string>> = {
  chicken:          ['plains', 'grassland', 'farmland', 'savanna'],
  cow:              ['plains', 'grassland', 'farmland', 'savanna'],
  sheep:            ['plains', 'grassland', 'hills', 'farmland', 'savanna'],
  horse:            ['grassland', 'plains'],
  dog:              ['forest', 'plains', 'grassland', 'settlement', 'woodland'],
  cat:              ['forest', 'woodland', 'plains'],
  rabbit:           ['plains', 'grassland', 'forest', 'woodland', 'savanna'],
  deer:             ['forest', 'woodland', 'foothills'],
  pig:              ['forest', 'woodland', 'plains'],
  goat:             ['mountains', 'foothills', 'plains', 'grassland'],
  wolf:             ['forest', 'woodland', 'tundra', 'mountains', 'foothills'],
  trogdor:          ['plains', 'savanna', 'grassland'],
  blue_heron:       ['wetland', 'river'],
  river_otter:      ['wetland', 'river'],
  mud_crab:         ['wetland', 'ocean', 'river'],
  sea_turtle:       ['ocean', 'wetland'],
  magma_salamander: ['lava_field', 'caldera'],
  obsidian_beetle:  ['ash_plain', 'obsidian_waste', 'lava_field'],
  sulfur_moth:      ['sulfur_flats', 'ash_plain', 'caldera'],
  jaguar:           ['jungle'],
  tree_frog:        ['jungle', 'wetland'],
  tropical_parrot:  ['jungle'],
  giant_spider:     ['jungle'],
};

/** Diet for each species */
const ANIMAL_DIET: Record<string, 'herbivore' | 'carnivore' | 'omnivore'> = {
  chicken:          'omnivore',
  cow:              'herbivore',
  sheep:            'herbivore',
  horse:            'herbivore',
  dog:              'omnivore',
  cat:              'carnivore',
  rabbit:           'herbivore',
  deer:             'herbivore',
  pig:              'omnivore',
  goat:             'herbivore',
  wolf:             'carnivore',
  trogdor:          'carnivore',
  blue_heron:       'carnivore',
  river_otter:      'carnivore',
  mud_crab:         'omnivore',
  sea_turtle:       'herbivore',
  magma_salamander: 'carnivore',
  obsidian_beetle:  'omnivore',
  sulfur_moth:      'omnivore',
  jaguar:           'carnivore',
  tree_frog:        'carnivore',
  tropical_parrot:  'herbivore',
  giant_spider:     'carnivore',
};

// ============================================================================
// Hybrid Definitions
// ============================================================================

export type HybridRarity = 'uncommon' | 'rare' | 'legendary';

export interface AnimalHybridDefinition {
  readonly id: string;
  readonly name: string;
  readonly parent1: string;
  readonly parent2: string;
  /** Lore flavour text */
  readonly lore: string;
  /** Source mythology or bestiary */
  readonly mythologicalOrigin: string;
  readonly rarity: HybridRarity;
  /**
   * Probability [0, 1] that a breeding attempt between these two species
   * produces a viable hybrid offspring.
   */
  readonly compatibilityScore: number;
  readonly offspringTraits: {
    readonly diet: 'herbivore' | 'carnivore' | 'omnivore';
    readonly baseSize: number;
    readonly baseSpeed: number;
    readonly uniqueAbilities: ReadonlyArray<string>;
    readonly temperament: 'docile' | 'skittish' | 'neutral' | 'friendly' | 'aggressive';
    readonly minComfortTemp: number;
    readonly maxComfortTemp: number;
  };
}

/**
 * The three canonical cross-biome mythological hybrids.
 *
 * Each draws from a distinct tradition and crosses clearly different biomes,
 * making them discoverable through exploration rather than common husbandry.
 */
export const KNOWN_ANIMAL_HYBRIDS: ReadonlyArray<AnimalHybridDefinition> = [
  {
    id: 'peryton',
    name: 'Peryton',
    parent1: 'deer',
    parent2: 'blue_heron',
    lore:
      'A winged stag born of forest and fen, casting the shadow of a man where its own silhouette should fall. ' +
      'The ancients said Perytons originated in sunken Atlantis; their appearance heralds both tragedy and revelation. ' +
      'They dwell at the edges of things — the tree-line above the marsh, the hour between dusk and dark.',
    mythologicalOrigin:
      'Medieval European bestiary; popularised by Borges in The Book of Imaginary Beings (1957), ' +
      'drawing from pseudo-Atlantean traditions. Shadow of a man motif suggests threshold beings.',
    rarity: 'rare',
    compatibilityScore: 0.05,
    offspringTraits: {
      diet: 'herbivore',
      baseSize: 1.7,   // midpoint of deer (2.0) and heron (1.4)
      baseSpeed: 3.5,
      uniqueAbilities: ['flight', 'keen_sight', 'man_shadow', 'threshold_sense'],
      temperament: 'skittish',
      minComfortTemp: 0,   // broader than either parent alone
      maxComfortTemp: 38,
    },
  },
  {
    id: 'hellhound',
    name: 'Hellhound',
    parent1: 'wolf',
    parent2: 'magma_salamander',
    lore:
      'When the wolf-pack ranges too far north toward the volcanic wastes, and a fire-spirit walks the snowline, ' +
      'something neither wholly cold nor wholly flame is sometimes whelped. ' +
      'The Greeks called these Cerberus-kin, guardians of passage; the Norse knew them as the blood of Fenrir mingled with Surtr\'s forge-heat. ' +
      'A Hellhound\'s fur smolders at the tips and its tracks melt snow to steam.',
    mythologicalOrigin:
      'Greek mythology (Cerberus, hounds of Hades) and Norse mythology (Fenrir\'s offspring, Garm). ' +
      'Fire-wolf hybrids appear across Polynesian and Aztec myth as volcano-guardian canines.',
    rarity: 'rare',
    compatibilityScore: 0.03,
    offspringTraits: {
      diet: 'carnivore',
      baseSize: 1.65,  // midpoint of wolf (1.8) and salamander (1.5)
      baseSpeed: 4.0,
      uniqueAbilities: ['fire_breath', 'heat_resistance', 'pack_hunting', 'night_vision', 'ember_trail'],
      temperament: 'aggressive',
      minComfortTemp: -10,  // wolves can handle cold; fire resistance handles heat
      maxComfortTemp: 400,
    },
  },
  {
    id: 'hippocampus',
    name: 'Hippocampus',
    parent1: 'horse',
    parent2: 'sea_turtle',
    lore:
      'Poseidon\'s cavalry rode these creatures across the face of the deep — horse from the shoulder forward, ' +
      'ancient sea-creature behind, breaching like a storm wave. ' +
      'The Hippocampus navigates by ocean current the way a horse navigates by scent, galloping beneath the surface. ' +
      'Coastal communities say a Hippocampus sighting means a great voyage is due.',
    mythologicalOrigin:
      'Greek mythology (Hippokampos: hippos = horse, kampos = sea monster). ' +
      'Ridden by Poseidon, Nereid sea-nymphs, and Triton. Depicted on Phoenician coins and Etruscan bronzes.',
    rarity: 'legendary',
    compatibilityScore: 0.01,
    offspringTraits: {
      diet: 'herbivore',
      baseSize: 2.3,   // large creature, midpoint of horse (2.8) and turtle (1.8)
      baseSpeed: 3.1,
      uniqueAbilities: ['aquatic_movement', 'brine_breathing', 'ocean_navigation', 'powerful_swim', 'tidal_sense'],
      temperament: 'neutral',
      minComfortTemp: 10,
      maxComfortTemp: 35,
    },
  },
];

// ============================================================================
// Scoring Helpers
// ============================================================================

/**
 * Taxonomy compatibility score [0, 1].
 *
 * Two species from the same group are highly compatible.
 * All mammals are distantly related (different groups but same class).
 * Vertebrate–vertebrate pairs get a trace score.
 * Invertebrate–vertebrate pairs are essentially incompatible naturally.
 * Legendary species cannot hybridize.
 */
function getTaxonomyCompatibilityScore(species1Id: string, species2Id: string): number {
  const g1 = ANIMAL_TAXONOMY[species1Id];
  const g2 = ANIMAL_TAXONOMY[species2Id];

  if (!g1 || !g2) return 0;
  if (g1 === 'legendary' || g2 === 'legendary') return 0;
  if (g1 === g2) return 0.8;

  const MAMMAL_GROUPS = new Set<AnimalTaxonomyGroup>([
    'mammal_ungulate',
    'mammal_carnivore',
    'mammal_small',
  ]);
  const VERTEBRATE_GROUPS = new Set<AnimalTaxonomyGroup>([
    'mammal_ungulate',
    'mammal_carnivore',
    'mammal_small',
    'bird',
    'reptile',
    'amphibian',
  ]);

  const bothMammal = MAMMAL_GROUPS.has(g1) && MAMMAL_GROUPS.has(g2);
  if (bothMammal) return 0.15;

  const bothVertebrate = VERTEBRATE_GROUPS.has(g1) && VERTEBRATE_GROUPS.has(g2);
  if (bothVertebrate) return 0.04;

  // One or both are arthropods
  return 0.01;
}

/**
 * Biome overlap score using Jaccard similarity [0, 1].
 * Species that share habitat have more opportunity to meet and crossbreed.
 */
function getBiomeOverlapScore(species1Id: string, species2Id: string): number {
  const biomes1 = ANIMAL_BIOMES[species1Id];
  const biomes2 = ANIMAL_BIOMES[species2Id];

  if (!biomes1 || !biomes2) return 0;

  const set1 = new Set(biomes1);
  const set2 = new Set(biomes2);

  let intersection = 0;
  for (const b of set1) {
    if (set2.has(b)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

/**
 * Diet compatibility score [0, 1].
 * Shared dietary strategy suggests metabolic similarity.
 */
function getDietCompatibilityScore(species1Id: string, species2Id: string): number {
  const d1 = ANIMAL_DIET[species1Id];
  const d2 = ANIMAL_DIET[species2Id];

  if (!d1 || !d2) return 0;
  if (d1 === d2) return 0.8;
  if (d1 === 'omnivore' || d2 === 'omnivore') return 0.5;
  // carnivore + herbivore
  return 0.1;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Find a known mythological hybrid definition by its two parent species.
 * Order of parents does not matter.
 *
 * Returns `undefined` if no known hybrid exists for this pair.
 */
export function findAnimalHybrid(
  species1Id: string,
  species2Id: string
): AnimalHybridDefinition | undefined {
  return KNOWN_ANIMAL_HYBRIDS.find(
    h =>
      (h.parent1 === species1Id && h.parent2 === species2Id) ||
      (h.parent1 === species2Id && h.parent2 === species1Id)
  );
}

/**
 * Get a known hybrid definition by its hybrid id (e.g. 'peryton').
 */
export function getAnimalHybridById(hybridId: string): AnimalHybridDefinition | undefined {
  return KNOWN_ANIMAL_HYBRIDS.find(h => h.id === hybridId);
}

/**
 * Return all known animal hybrid definitions.
 */
export function getAllAnimalHybrids(): ReadonlyArray<AnimalHybridDefinition> {
  return KNOWN_ANIMAL_HYBRIDS;
}

/**
 * Get the taxonomy group for a species.
 * Throws if the species is unknown.
 */
export function getAnimalTaxonomy(speciesId: string): AnimalTaxonomyGroup {
  const group = ANIMAL_TAXONOMY[speciesId];
  if (!group) {
    throw new Error(`Unknown animal species: '${speciesId}'`);
  }
  return group;
}

/**
 * Calculate breeding compatibility between two animal species.
 *
 * Returns a probability [0, 1]:
 *   - 1.0  → same species, always produces offspring
 *   - 0.05 → Peryton (deer × blue_heron, rare mythological hybrid)
 *   - 0.03 → Hellhound (wolf × magma_salamander, rare)
 *   - 0.01 → Hippocampus (horse × sea_turtle, legendary)
 *   - 0    → incompatible (legendary species, invertebrate × vertebrate, etc.)
 *
 * For unknown cross-species pairs, the score is a weighted combination of
 * taxonomy, biome overlap, and diet similarity.
 */
export function calculateBreedingCompatibility(
  species1Id: string,
  species2Id: string
): number {
  if (!species1Id || !species2Id) {
    throw new Error('Both species IDs are required');
  }

  if (species1Id === species2Id) return 1.0;

  // Legendary species (e.g. trogdor) cannot hybridize with anything
  if (
    ANIMAL_TAXONOMY[species1Id] === 'legendary' ||
    ANIMAL_TAXONOMY[species2Id] === 'legendary'
  ) {
    return 0;
  }

  // Known mythological hybrid — use lore-defined score
  const knownHybrid = findAnimalHybrid(species1Id, species2Id);
  if (knownHybrid) return knownHybrid.compatibilityScore;

  const taxonomyScore = getTaxonomyCompatibilityScore(species1Id, species2Id);
  const biomeScore    = getBiomeOverlapScore(species1Id, species2Id);
  const dietScore     = getDietCompatibilityScore(species1Id, species2Id);

  return taxonomyScore * 0.6 + biomeScore * 0.3 + dietScore * 0.1;
}

/**
 * Determine whether two animal species can produce viable offspring at all.
 *
 * Returns `true` when:
 *   - Same species, OR
 *   - A known mythological hybrid pairing exists, OR
 *   - The calculated compatibility score is >= `minScore` (default 0.05)
 *
 * The `minScore` threshold represents the lower bound of natural hybridisation
 * without divine or magical intervention. Known hybrids bypass this threshold
 * because they are defined as mythologically possible regardless of score.
 */
export function canAnimalsBreed(
  species1Id: string,
  species2Id: string,
  minScore = 0.05
): boolean {
  if (species1Id === species2Id) return true;

  const knownHybrid = findAnimalHybrid(species1Id, species2Id);
  if (knownHybrid) return true;

  return calculateBreedingCompatibility(species1Id, species2Id) >= minScore;
}
