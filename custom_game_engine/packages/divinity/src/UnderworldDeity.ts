/**
 * UnderworldDeity - Pre-defined deity template for the Lord of the Dead
 *
 * This deity rules the Underworld realm and oversees:
 * - Soul transition and judgment
 * - Ancestor kami transformations
 * - The balance between restless dead and peaceful passing
 * - Communication between living and dead
 *
 * Unlike emergent deities, the Underworld Lord exists as a primordial force,
 * though their specific identity can still be shaped by mortal belief.
 */

import type { Deity, DeityIdentity, PerceivedPersonality, DescribedForm } from './DeityTypes.js';
import { createInitialBeliefState, BELIEF_THRESHOLDS } from './BeliefTypes.js';

// ============================================================================
// Underworld Deity Personality
// ============================================================================

/** The personality of the Underworld Lord - impartial, patient, inevitable */
export const UNDERWORLD_PERSONALITY: PerceivedPersonality = {
  benevolence: 0,         // Neither cruel nor kind - death is impartial
  interventionism: -0.3,  // Rarely intervenes in mortal affairs
  wrathfulness: 0.2,      // Slow to anger, but punishes those who cheat death
  mysteriousness: 0.9,    // Very inscrutable, few understand death
  generosity: 0.1,        // Rarely gives, but fair in judgment
  consistency: 0.95,      // Extremely reliable - death comes for all
  seriousness: 0.9,       // Very serious, rarely playful
  compassion: 0.3,        // Shows some compassion to the grieving
};

// ============================================================================
// Underworld Deity Forms
// ============================================================================

/** Physical form descriptions for the Underworld Lord */
export const UNDERWORLD_FORMS: DescribedForm[] = [
  {
    description: 'A tall figure in flowing dark robes, face hidden in shadow beneath a hood. Their presence brings an unnatural stillness.',
    height: 'tall',
    solidity: 'solid',
    luminosity: 'none',
    distinctiveFeatures: ['hooded face', 'flowing robes', 'bone-white hands'],
    auraColor: 'deep purple',
    animalAspects: ['raven', 'owl', 'serpent'],
    plantAspects: ['cypress', 'yew', 'asphodel'],
    elementalAspects: ['shadow', 'earth'],
  },
  {
    description: 'A skeletal figure wreathed in pale flames, wearing a crown of tarnished silver. Ancient eyes burn with cold light in hollow sockets.',
    height: 'tall',
    solidity: 'solid',
    luminosity: 'subtle',
    distinctiveFeatures: ['skeletal form', 'crown', 'burning eyes'],
    auraColor: 'pale blue',
    animalAspects: ['raven', 'black dog', 'moth'],
    plantAspects: ['belladonna', 'hemlock', 'ghost orchid'],
    elementalAspects: ['fire', 'earth'],
  },
  {
    description: 'A solemn figure of indeterminate gender, half in shadow and half in dim light. One side shows a face of peaceful serenity, the other a stern judge.',
    height: 'human',
    solidity: 'translucent',
    luminosity: 'subtle',
    distinctiveFeatures: ['dual face', 'scales in one hand', 'lantern in other'],
    auraColor: 'gray',
    animalAspects: ['psychopomp hound', 'raven'],
    plantAspects: ['white poppy', 'willow'],
    elementalAspects: ['shadow', 'water'],
  },
];

// ============================================================================
// Sacred Associations
// ============================================================================

/** Animals sacred to the Underworld Lord */
export const UNDERWORLD_SACRED_ANIMALS = [
  'raven',        // Soul guide
  'owl',          // Wisdom in darkness
  'black dog',    // Guardian of the dead
  'serpent',      // Rebirth and transformation
  'moth',         // Attracted to the light beyond
  'vulture',      // Transformation of flesh
];

/** Plants sacred to the Underworld Lord */
export const UNDERWORLD_SACRED_PLANTS = [
  'cypress',      // Cemetery tree
  'yew',          // Longevity and death
  'asphodel',     // Flower of the Underworld
  'white poppy',  // Sleep and death
  'belladonna',   // Beautiful death
  'willow',       // Mourning and water's edge
];

/** Sacred symbols of the Underworld Lord */
export const UNDERWORLD_SYMBOLS = [
  'scales',           // Fair judgment of souls
  'lantern',          // Light for wandering souls
  'key',              // Opens gates between realms
  'hourglass',        // Time runs out for all
  'pomegranate',      // Ties to the Underworld
  'black gate',       // Entrance to the realm
  'skull',            // Universal symbol of mortality
  'scythe',           // Harvester of souls
];

/** Colors associated with the Underworld */
export const UNDERWORLD_COLORS = [
  'black',        // Darkness of death
  'deep purple',  // Royalty of death
  'bone white',   // Remains
  'pale blue',    // Cold flame of souls
  'ash gray',     // Funeral ashes
];

/** Types of places sacred to the Underworld Lord */
export const UNDERWORLD_SACRED_PLACES = [
  'cemetery',
  'burial mound',
  'cave entrance',
  'crossroads',
  'river crossing',
  'ancient tomb',
  'ancestor shrine',
];

// ============================================================================
// Epithets and Names
// ============================================================================

/** Epithets for the Underworld Lord */
export const UNDERWORLD_EPITHETS = [
  'Lord of the Dead',
  'The Silent Judge',
  'Keeper of Souls',
  'Master of the Black Gate',
  'The Inevitable One',
  'Guardian of Ancestors',
  'He Who Waits Below',
  'The Final Arbiter',
  'Shepherd of Shades',
  'The Pale Sovereign',
  'Lord of the Quiet Dark',
  'Weigher of Hearts',
];

/** Possible primary names for the Underworld deity */
export const UNDERWORLD_NAMES = [
  'Morrigos',     // Inspired by Celtic death associations
  'Thanathos',    // Greek-style death deity
  'Yama',         // Hindu/Buddhist lord of death
  'Osirak',       // Egyptian-inspired
  'Hel',          // Norse-inspired (gender neutral)
  'Ereshki',      // Mesopotamian-inspired
  'Ankou',        // Celtic death personification
  'Shinigal',     // Japanese-inspired
];

// ============================================================================
// Domain Powers
// ============================================================================

/** Powers the Underworld Lord grants to faithful servants */
export const UNDERWORLD_BLESSINGS = [
  'ancestral_communion',     // Speak with ancestor spirits
  'peaceful_death',          // Ensures painless passing
  'shade_ward',              // Protection from restless dead
  'soul_guide',              // Guide lost souls to rest
  'death_sense',             // Know when death approaches
  'ancestor_favor',          // Ancestors watch over you
  'memory_preservation',     // Your deeds remembered after death
  'quiet_rest',              // Sleep undisturbed by nightmares
];

/** Curses the Underworld Lord inflicts on transgressors */
export const UNDERWORLD_CURSES = [
  'restless_ancestors',      // Haunted by angry dead
  'forgotten',               // Others forget you exist
  'death_mark',              // Death follows your steps
  'shade_sight',             // See the dead everywhere
  'cold_touch',              // Chills others when touched
  'grave_dreams',            // Only dream of death
  'hollow_voice',            // Words sound empty
  'final_notice',            // Know the hour of your death
];

/** Taboos that anger the Underworld Lord */
export const UNDERWORLD_TABOOS = [
  'desecrating_graves',
  'cheating_death_unnaturally',
  'forgetting_ancestors',
  'denying_burial_rites',
  'mocking_the_dead',
  'binding_souls_unwillingly',
  'hoarding_corpses',
  'preventing_peaceful_passing',
];

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create the default identity for an Underworld deity
 */
export function createUnderworldIdentity(
  name?: string
): DeityIdentity {
  // Select a random name if not provided
  const selectedName = name ?? UNDERWORLD_NAMES[Math.floor(Math.random() * UNDERWORLD_NAMES.length)] ?? 'Morrigos';

  // Select a random form (always use first as fallback)
  const formIndex = Math.floor(Math.random() * UNDERWORLD_FORMS.length);
  const form = UNDERWORLD_FORMS[formIndex] ?? UNDERWORLD_FORMS[0]!;

  return {
    primaryName: selectedName,
    epithets: UNDERWORLD_EPITHETS.slice(0, 3),  // Start with a few
    domain: 'death',
    secondaryDomains: ['justice', 'mystery', 'earth'],
    perceivedPersonality: { ...UNDERWORLD_PERSONALITY },
    perceivedAlignment: 'neutral',
    describedForm: {
      description: form.description,
      height: form.height,
      solidity: form.solidity,
      luminosity: form.luminosity,
      distinctiveFeatures: [...form.distinctiveFeatures],
      auraColor: form.auraColor,
      animalAspects: form.animalAspects ? [...form.animalAspects] : undefined,
      plantAspects: form.plantAspects ? [...form.plantAspects] : undefined,
      elementalAspects: form.elementalAspects ? [...form.elementalAspects] : undefined,
    },
    symbols: UNDERWORLD_SYMBOLS.slice(0, 4),
    colors: UNDERWORLD_COLORS.slice(0, 3),
    sacredAnimals: UNDERWORLD_SACRED_ANIMALS.slice(0, 3),
    sacredPlants: UNDERWORLD_SACRED_PLANTS.slice(0, 3),
    sacredPlaceTypes: UNDERWORLD_SACRED_PLACES.slice(0, 3),
    traitConfidence: new Map([
      ['domain', 1.0],
      ['alignment', 0.8],
      ['personality', 0.7],
    ]),
    initiallyBlank: false,
  };
}

/**
 * Create the full Underworld deity entity
 *
 * @param id - Unique identifier for the deity
 * @param name - Primary name (randomly selected if not provided)
 * @param initialBelief - Starting belief power (defaults to moderate)
 */
export function createUnderworldDeity(
  id: string = 'underworld_lord',
  name?: string,
  initialBelief: number = BELIEF_THRESHOLDS.moderate_powers
): Deity {
  return {
    id,
    entityType: 'deity',

    // Identity
    identity: createUnderworldIdentity(name),

    // Origin - primordial, not emergent
    origin: 'natural_phenomenon',
    originDetails: 'Existed since the first mortal drew breath, for where there is life, death follows',
    crystallizedAt: 0,  // Always existed
    emergedFrom: [],

    // Belief & Power
    belief: createInitialBeliefState(initialBelief),

    // Believers - starts empty, souls will worship
    believerIds: [],
    believerCount: 0,
    priestIds: [],
    prophetIds: [],

    // Divine Agents
    angelIds: [],

    // Sacred Sites - Underworld itself is the primary temple
    templeIds: [],
    sacredSiteIds: [],

    // Ruled Realms - the Underworld is their domain
    ruledRealmIds: ['underworld'],

    // Mythology
    mythIds: [],
    canonicalTextIds: [],

    // Avatar - primordial deities can manifest more easily
    avatarActive: false,

    // Relationships
    pantheonId: undefined,  // May join a pantheon later
    relationshipIds: [],

    // Control - AI controlled
    controller: 'ai',

    // State
    isActive: true,
    isFading: false,
    isDormant: false,
  };
}

/**
 * Get appropriate offerings for the Underworld Lord
 */
export function getUnderworldOfferings(): string[] {
  return [
    'incense',           // Common offering
    'wine',              // Libation for the dead
    'bread',             // Sustenance for souls
    'honey',             // Sweetness to please
    'pomegranate',       // Sacred fruit
    'white flowers',     // Funeral flowers
    'coins',             // Payment for passage
    'written prayers',   // Messages to ancestors
  ];
}

/**
 * Get prayer types appropriate for the Underworld Lord
 */
export function getUnderworldPrayerTypes(): string[] {
  return [
    'mourning',          // Grieving the dead
    'remembrance',       // Honoring ancestors
    'guidance',          // Help for wandering souls
    'protection',        // Ward against restless dead
    'judgment',          // Fair treatment in afterlife
    'peaceful_passing',  // Easy death for the dying
    'communion',         // Speaking with the dead
  ];
}

/**
 * Check if an action would anger the Underworld Lord
 */
export function isUnderworldTaboo(action: string): boolean {
  return UNDERWORLD_TABOOS.some(taboo =>
    action.toLowerCase().includes(taboo.replace(/_/g, ' '))
  );
}

/**
 * Get the appropriate epithet based on context
 */
export function getContextualEpithet(context: 'judgment' | 'passage' | 'mourning' | 'ancestor'): string {
  switch (context) {
    case 'judgment':
      return 'The Silent Judge';
    case 'passage':
      return 'Master of the Black Gate';
    case 'mourning':
      return 'Shepherd of Shades';
    case 'ancestor':
      return 'Guardian of Ancestors';
    default:
      return 'Lord of the Dead';
  }
}
