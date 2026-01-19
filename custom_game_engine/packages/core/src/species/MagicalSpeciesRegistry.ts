/**
 * Magical Species Registry - Sapient Magical Races
 *
 * Defines sapient magical beings as proper civilizations/peoples, drawing from
 * deep folklore traditions. These are NOT animals to be tamed or summoned -
 * they are peoples with agency, societies, and histories.
 *
 * Post-temporal races (Dragons, Fae) exist across multiple dimensions simultaneously.
 */

import { SpeciesComponent, type SpeciesTrait } from '../components/SpeciesComponent.js';
import type { SpeciesTemplate } from './SpeciesRegistry.js';

// ============================================================================
// Magical Traits
// ============================================================================

export const TRAIT_POST_TEMPORAL: SpeciesTrait = {
  id: 'post_temporal',
  name: 'Post-Temporal',
  description: 'Exists across multiple timelines and dimensions simultaneously',
  category: 'magical',
  abilitiesGranted: ['dimension_walk', 'time_sense', 'temporal_awareness'],
};

export const TRAIT_SHAPE_CHANGER: SpeciesTrait = {
  id: 'shape_changer',
  name: 'Shape Changer',
  description: 'Can shift between multiple forms',
  category: 'magical',
  abilitiesGranted: ['polymorph', 'illusion_magic'],
  skillBonus: { deception: 0.3, performance: 0.2 },
};

export const TRAIT_OATH_BOUND: SpeciesTrait = {
  id: 'oath_bound',
  name: 'Oath Bound',
  description: 'Magically bound by promises and contracts',
  category: 'spiritual',
  vulnerabilities: ['broken_oaths', 'cold_iron'],
};

export const TRAIT_ELEMENTAL_AFFINITY: SpeciesTrait = {
  id: 'elemental_affinity',
  name: 'Elemental Affinity',
  description: 'Deep connection to elemental forces',
  category: 'magical',
  abilitiesGranted: ['elemental_magic'],
  skillBonus: { magic: 0.4 },
};

export const TRAIT_NATURAL_MAGIC: SpeciesTrait = {
  id: 'natural_magic',
  name: 'Natural Magic',
  description: 'Innate magical abilities tied to nature',
  category: 'magical',
  abilitiesGranted: ['nature_magic', 'plant_communication'],
  skillBonus: { magic: 0.3 },
};

export const TRAIT_TELEPATHIC: SpeciesTrait = {
  id: 'telepathic',
  name: 'Telepathic',
  description: 'Communicates through thoughts',
  category: 'spiritual',
  abilitiesGranted: ['telepathy', 'mind_link'],
  skillBonus: { social: 0.2 },
};

export const TRAIT_ANCIENT_KNOWLEDGE: SpeciesTrait = {
  id: 'ancient_knowledge',
  name: 'Ancient Knowledge',
  description: 'Holds knowledge from eons past',
  category: 'spiritual',
  skillBonus: { knowledge: 0.5, teaching: 0.3 },
};

export const TRAIT_DRAGON_BREATH: SpeciesTrait = {
  id: 'dragon_breath',
  name: 'Dragon Breath',
  description: 'Can exhale elemental energy as weapon',
  category: 'physical',
  abilitiesGranted: ['breath_weapon'],
};

export const TRAIT_FLIGHT: SpeciesTrait = {
  id: 'flight',
  name: 'Flight',
  description: 'Can fly naturally',
  category: 'physical',
  abilitiesGranted: ['fly'],
  needsModifier: { energy: 1.2 },
};

export const TRAIT_GUARDIAN_SPIRIT: SpeciesTrait = {
  id: 'guardian_spirit',
  name: 'Guardian Spirit',
  description: 'Protector of sacred places and innocents',
  category: 'spiritual',
  abilitiesGranted: ['detect_evil', 'purify'],
};

export const TRAIT_LABYRINTH_MIND: SpeciesTrait = {
  id: 'labyrinth_mind',
  name: 'Labyrinth Mind',
  description: 'Perfect spatial reasoning and memory',
  category: 'mental',
  skillBonus: { navigation: 0.6, architecture: 0.4 },
  abilitiesGranted: ['never_lost'],
};

// ============================================================================
// Dragon - 10D Post-Temporal Civilization
// ============================================================================
// Folklore: Universal across cultures - European fire-breathers, Chinese
// celestial dragons, Mesoamerican feathered serpents. Ancient, wise,
// collectors of knowledge and treasure. Multi-dimensional beings who
// experience time non-linearly.

export const DRAGON_SPECIES: SpeciesTemplate = {
  speciesId: 'dragon',
  speciesName: 'Dragon',
  commonName: 'Dragon',
  description: `Dragons are among the oldest sapient beings, existing across ten dimensions
simultaneously. They perceive past, present, and future as a single tapestry. A dragon speaking
to you is simultaneously having this conversation in a thousand timelines, aware of every
possible outcome.

Across cultures they are known differently: the European dragons guard hoards and speak in
riddles; the Chinese dragons bring rain and wisdom; the Quetzalcoatl taught civilization itself.
But all are the same people, manifesting differently across dimensions and cultures.

Dragon civilization exists outside normal space-time. Their cities float in the spaces between
dimensions, vast libraries containing knowledge from all timelines. They reproduce rarely,
each child a carefully considered addition to their eternal society.

To meet a dragon is to meet a being who knew your ancestors, will know your descendants, and
has already lived this conversation before. Their patience is infinite because they experience
all moments simultaneously. Their knowledge is absolute because they can consult any timeline.`,

  bodyPlanId: 'dragon_quadruped_winged',
  innateTraits: [
    TRAIT_POST_TEMPORAL,
    TRAIT_DRAGON_BREATH,
    TRAIT_FLIGHT,
    TRAIT_ANCIENT_KNOWLEDGE,
    TRAIT_TELEPATHIC,
  ],

  compatibleSpecies: [], // Dragons very rarely hybridize
  mutationRate: 0.0001, // Nearly immune to mutation

  averageHeight: 600, // 6 meters at shoulder
  averageWeight: 5000, // 5 tons
  sizeCategory: 'colossal',

  lifespan: 0, // Effectively immortal
  lifespanType: 'immortal',
  maturityAge: 500, // Centuries to reach adulthood
  gestationPeriod: 365 * 10, // 10 years from egg to hatching

  sapient: true,
  socialStructure: '10d_civilization', // Beyond normal civilization models
};

// ============================================================================
// Fae - 10D Post-Temporal Court Society
// ============================================================================
// Folklore: Celtic sidhe, Norse alfar, Persian peri. The Good Folk, Fair Folk,
// People of the Mounds. Bound by oaths and ancient law, allergic to iron,
// exist in parallel dimension (Faerie/Otherworld) touching ours.

export const FAE_SPECIES: SpeciesTemplate = {
  speciesId: 'fae',
  speciesName: 'Fae',
  commonName: 'Fae',
  description: `The Fae are the People of the Twilight, dwelling in the spaces between worlds.
The Celtic sidhe in their hollow hills, the Norse light elves in Alfheim, the Persian peri
in their gardens - all are the same people, the Fae, appearing differently as they slip between
dimensions.

They are bound by oath and contract in ways mortals cannot fathom. A promise to a Fae is
written into the fabric of reality itself. They cannot lie - but truth spoken by the Fae
can be so twisted as to become more dangerous than any falsehood.

Cold iron burns them, a side effect of their multi-dimensional nature. Iron's density in our
reality makes it anathema to beings who exist partially elsewhere. They are ageless, eternal,
but can be killed - and unlike dragons, they do not experience time non-linearly, merely exist
outside its normal flow.

The Fae Courts (Seelie and Unseelie, Summer and Winter) are complex political entities spanning
dimensions. What appears as a simple forest glade might be the throne room of a Fae queen,
existing in ten places at once. Their cities are dreams made solid, architecture impossible
in three dimensions.`,

  bodyPlanId: 'humanoid_standard', // Appear humanoid, but can shift
  innateTraits: [
    TRAIT_POST_TEMPORAL,
    TRAIT_OATH_BOUND,
    TRAIT_SHAPE_CHANGER,
    TRAIT_NATURAL_MAGIC,
  ],

  compatibleSpecies: ['human'], // Changelings - half-fae children
  mutationRate: 0.0,

  averageHeight: 175,
  averageWeight: 60,
  sizeCategory: 'medium',

  lifespan: 0, // Ageless
  lifespanType: 'ageless',
  maturityAge: 100,
  gestationPeriod: 365, // 1 year

  sapient: true,
  socialStructure: 'fae_courts', // Seelie/Unseelie court system
};

// ============================================================================
// Unicorn - Sapient Guardian Spirits
// ============================================================================
// Folklore: Celtic, Medieval European, Chinese qilin. Pure beings, guardians
// of forests, only approach the innocent. Not horses with horns - ancient
// spirits of wilderness and purity.

export const UNICORN_SPECIES: SpeciesTemplate = {
  speciesId: 'unicorn',
  speciesName: 'Unicorn',
  commonName: 'Unicorn',
  description: `Unicorns are not merely horses with horns, but ancient guardian spirits who
chose this form long ago. In European tradition they protect forests and test the worthy;
as the Chinese qilin they judge the virtuous and appear at births of great sages.

They are telepathic, speaking mind-to-mind with those they deem worthy. Their horns are
foci of healing magic, capable of purifying poison and curing disease. In medieval lore,
a unicorn's horn could detect poison and purify water - this is literal truth.

Unicorn society is loosely organized around sacred groves and ancient forests. They gather
rarely, communicate across vast distances telepathically, and maintain a network of protected
sanctuaries across the world. Each unicorn is bound to a territory they guard for centuries.

They can sense purity of heart - not moral purity, but genuineness of intent. A murderer
being genuinely themselves may approach a unicorn; a saint who feigns humility cannot.
This makes them dangerous judges of character.`,

  bodyPlanId: 'equine_horned',
  innateTraits: [
    TRAIT_GUARDIAN_SPIRIT,
    TRAIT_TELEPATHIC,
    TRAIT_NATURAL_MAGIC,
  ],

  compatibleSpecies: [], // Do not hybridize
  mutationRate: 0.0,

  averageHeight: 160, // At shoulder
  averageWeight: 400,
  sizeCategory: 'large',

  lifespan: 0, // Ageless
  lifespanType: 'ageless',
  maturityAge: 50,
  gestationPeriod: 365,

  sapient: true,
  socialStructure: 'territorial_guardians',
};

// ============================================================================
// Centaur - Philosophical Warrior Society
// ============================================================================
// Folklore: Greek. Originally wild and barbaric (early myths), later wise
// and scholarly (Chiron). Horsemen of the steppes, stargazers, teachers of
// heroes. Represent the duality of civilized mind and wild nature.

export const CENTAUR_SPECIES: SpeciesTemplate = {
  speciesId: 'centaur',
  speciesName: 'Centaur',
  commonName: 'Centaur',
  description: `Centaurs embody the eternal struggle between civilization and wildness. Early
Greek tales painted them as drunk and violent; later traditions remember them as scholars,
stargazers, and teachers of heroes like Achilles and Heracles.

Chiron the Wise, greatest of centaurs, was teacher to gods and heroes alike. This duality
exists within all centaurs - the intellectual rigor of the human mind, the fierce freedom
of the horse's body. Their societies debate philosophy while racing across open plains.

They are master archers and horsemen (an ironic term, but fitting). Their understanding of
the stars is unmatched, having watched the heavens while running beneath them for millennia.
Many great astronomers have been centaurs.

Centaur communities are semi-nomadic, following seasonal patterns across vast territories.
They gather for philosophical symposia that last weeks, debating under the stars. Their
architecture is minimal - they need no permanent structures.`,

  bodyPlanId: 'centaur_standard',
  innateTraits: [
    TRAIT_ANCIENT_KNOWLEDGE,
    {
      id: 'natural_horseman',
      name: 'Natural Horseman',
      description: 'Perfect equestrian capabilities',
      category: 'physical',
      skillBonus: { archery: 0.5, athletics: 0.3 },
      needsModifier: { energy: 1.3 }, // Large body needs more energy
    },
  ],

  compatibleSpecies: [], // Unique body plan prevents hybridization
  mutationRate: 0.01,

  averageHeight: 210, // Human torso + horse body
  averageWeight: 600, // Horse mass
  sizeCategory: 'large',

  lifespan: 250,
  lifespanType: 'long_lived',
  maturityAge: 25,
  gestationPeriod: 330, // Between human and horse

  sapient: true,
  socialStructure: 'semi_nomadic_herds',
};

// ============================================================================
// Naga - Serpent Peoples of Two Realms
// ============================================================================
// Folklore: Hindu/Buddhist nagas are serpent spirits, guardians of treasures
// and waters. Both benevolent and dangerous. Yuan-ti in other traditions.
// Desert and underwater kingdoms.

export const NAGA_SPECIES: SpeciesTemplate = {
  speciesId: 'naga',
  speciesName: 'Naga',
  commonName: 'Naga',
  description: `Nagas are ancient serpent peoples, found in Hindu and Buddhist tradition as
guardians of sacred waters and underground treasures. They are shape-changers, appearing as
fully serpentine, as humans with snake features, or as magnificent cobras with humanlike
intelligence gleaming in their eyes.

Naga society is split between two realms: the underwater kingdoms in deep ocean trenches,
and the desert cities built in hidden oases. Both civilizations trade reluctantly, ancient
rivalry dating to when the nagas first diverged into sea-dwellers and sand-dwellers.

They are keepers of ancient secrets, guardians of treasures both material and knowledge-based.
A naga library might contain scrolls from civilizations that vanished before humans existed.
Many nagas serve as temple guardians, protecting sacred sites for centuries.

In Hindu tradition, nagas can be benevolent (bringing rain, protecting treasures) or
wrathful (bringing drought, guarding forbidden places). This reflects their nature - they
are not good or evil, but territorial and ancient, following codes modern mortals may not
understand.`,

  bodyPlanId: 'serpentine_humanoid',
  innateTraits: [
    TRAIT_SHAPE_CHANGER,
    TRAIT_ANCIENT_KNOWLEDGE,
    {
      id: 'serpent_senses',
      name: 'Serpent Senses',
      description: 'Heat vision and scent tracking',
      category: 'sensory',
      abilitiesGranted: ['heat_sense', 'scent_tracking'],
      skillBonus: { perception: 0.3 },
    },
    {
      id: 'venomous',
      name: 'Venomous',
      description: 'Potent venom in fangs',
      category: 'physical',
      abilitiesGranted: ['venom_bite'],
    },
  ],

  compatibleSpecies: [], // Reptilian biology prevents hybridization with mammals
  mutationRate: 0.008,

  averageHeight: 180, // Upper body height when raised
  averageWeight: 150, // Long serpent body
  sizeCategory: 'large',

  lifespan: 500,
  lifespanType: 'long_lived',
  maturityAge: 50,
  gestationPeriod: 180, // Lay eggs

  sapient: true,
  socialStructure: 'underwater_desert_kingdoms',
};

// ============================================================================
// Sphinx - Ancient Riddle-Keepers
// ============================================================================
// Folklore: Egyptian (male, benevolent guardian), Greek (female, dangerous
// riddler who ate those who failed). Guardians of thresholds and secrets.

export const SPHINX_SPECIES: SpeciesTemplate = {
  speciesId: 'sphinx',
  speciesName: 'Sphinx',
  commonName: 'Sphinx',
  description: `The Sphinx peoples come in many forms: the Egyptian sphinx with human head and
lion body guards temples and tombs, benevolent and wise. The Greek sphinx with woman's head,
lion's body, and eagle's wings poses riddles to travelers - fail, and be devoured.

But both are the same people, merely expressing different cultural roles. Sphinxes are
keepers of thresholds, guardians of boundaries between known and unknown. They test worthiness
through riddles because wisdom is their highest value.

Sphinxes are nearly immortal, each one serving as guardian of a single important place for
millennia. The Great Sphinx of Giza has held its post for over four thousand years, and that
one is young by sphinx standards. Some sphinxes guard not places but concepts - one might
guard the boundary between waking and sleeping, appearing in dreams to pose riddles.

They are philosophers and logicians, delighting in wordplay and lateral thinking. A sphinx's
riddle is never arbitrary - it always tests something relevant to the threshold they guard.
Those who answer correctly are granted passage and often wisdom; those who fail... well, the
Greek sphinxes did not earn their reputation without reason.`,

  bodyPlanId: 'sphinx_leonine',
  innateTraits: [
    TRAIT_ANCIENT_KNOWLEDGE,
    TRAIT_FLIGHT, // Greek sphinxes have wings
    {
      id: 'riddle_magic',
      name: 'Riddle Magic',
      description: 'Words and riddles carry binding power',
      category: 'magical',
      abilitiesGranted: ['geas', 'truth_detection'],
      skillBonus: { persuasion: 0.4 },
    },
  ],

  compatibleSpecies: [], // Unique physiology
  mutationRate: 0.0,

  averageHeight: 200, // At shoulder
  averageWeight: 400,
  sizeCategory: 'large',

  lifespan: 0, // Nearly immortal
  lifespanType: 'ageless',
  maturityAge: 100,
  gestationPeriod: 200,

  sapient: true,
  socialStructure: 'solitary_guardians',
};

// ============================================================================
// Djinn - Elemental Peoples
// ============================================================================
// Folklore: Arabic/Islamic. Beings of smokeless fire, created before humans,
// with free will and civilization. Not genies who grant wishes, but a
// parallel people with their own cultures and cities.

export const DJINN_SPECIES: SpeciesTemplate = {
  speciesId: 'djinn',
  speciesName: 'Djinn',
  commonName: 'Djinn',
  description: `The djinn (singular: djinni) are peoples of smokeless fire, created from the
same smokeless fire as angels but granted free will like humans. This is from the Quran
itself - they are not magical servants but a parallel civilization.

Western "genies" are a corruption of enslaved djinn bound to magical objects - a practice
considered abhorrent by free djinn. The djinn have their own cities, families, cultures,
and kingdoms in the spaces between the elements. They are not evil or good, but possess
the full range of morality humans do.

Djinn can become invisible, fly, and shift shape. Different djinn lineages have different
elemental affinities - Ifrits command flame, Marids control water, Sylphs rule air. But all
are djinn, all are people with agency and desires.

Their cities exist in the boundaries between worlds - a city of djinn might overlap with a
human city, invisible to mortal eyes. They see mortals much as we see them - as alien beings
occasionally encountered, sometimes befriended, sometimes feared. Some djinn marry humans;
their children are half-djinn, inheriting some of their parent's nature.`,

  bodyPlanId: 'djinn_variable', // Can shift between forms
  innateTraits: [
    TRAIT_ELEMENTAL_AFFINITY,
    TRAIT_SHAPE_CHANGER,
    {
      id: 'smokeless_fire',
      name: 'Smokeless Fire',
      description: 'Body of elemental fire, can become invisible',
      category: 'physical',
      abilitiesGranted: ['invisibility', 'intangibility', 'fire_immunity'],
    },
  ],

  compatibleSpecies: ['human'], // Half-djinn exist in folklore
  mutationRate: 0.01,

  averageHeight: 200, // When manifested in human-like form
  averageWeight: 80, // Variable due to elemental nature
  sizeCategory: 'large',

  lifespan: 1000,
  lifespanType: 'long_lived',
  maturityAge: 100,
  gestationPeriod: 365,

  sapient: true,
  socialStructure: 'elemental_kingdoms',
};

// ============================================================================
// Export Registry
// ============================================================================

export const MAGICAL_SPECIES_REGISTRY: Record<string, SpeciesTemplate> = {
  dragon: DRAGON_SPECIES,
  fae: FAE_SPECIES,
  unicorn: UNICORN_SPECIES,
  centaur: CENTAUR_SPECIES,
  naga: NAGA_SPECIES,
  sphinx: SPHINX_SPECIES,
  djinn: DJINN_SPECIES,
};

/**
 * Get all magical species (for integration with main registry)
 */
export function getAllMagicalSpecies(): SpeciesTemplate[] {
  return Object.values(MAGICAL_SPECIES_REGISTRY);
}

/**
 * Check if species is post-temporal (10D being)
 */
export function isPostTemporal(speciesId: string): boolean {
  return speciesId === 'dragon' || speciesId === 'fae';
}
