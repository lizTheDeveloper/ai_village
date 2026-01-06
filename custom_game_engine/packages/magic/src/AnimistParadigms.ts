/**
 * AnimistParadigms - Spirit-based and exotic magic systems
 *
 * These paradigms share a common thread: magic comes from relationship
 * with the world rather than personal power or divine grant.
 *
 * 1. Shinto/Animist Magic - Everything has a spirit (kami)
 * 2. Sympathy Magic - Like affects like, connections between similar things
 * 3. Allomancy - Consuming metals grants specific powers
 * 4. Dream Magic - The dream world is real and manipulable
 * 5. Song Magic - Music shapes reality
 * 6. Rune Magic - Symbols have inherent power
 */

import type { MagicParadigm } from './MagicParadigm.js';

// ============================================================================
// Shinto/Animist Magic - The World of Endless Spirits
// ============================================================================

/**
 * Classification of kami (spirits)
 */
export type KamiType =
  | 'nature'        // Mountains, rivers, trees, rocks, weather
  | 'place'         // Specific locations, crossroads, thresholds
  | 'object'        // Swords, tools, ancient artifacts
  | 'concept'       // Abstract ideas given form - war, love, boundaries
  | 'ancestor'      // Spirits of the deceased
  | 'animal'        // Animal spirits, yokai
  | 'elemental'     // Fire, water, wind, earth spirits
  | 'household'     // Spirits of the home
  | 'craft'         // Spirits of trades and skills
  | 'food';         // Spirits of rice, sake, etc.

/**
 * A kami (spirit) that can be interacted with
 */
export interface Kami {
  id: string;
  name: string;
  type: KamiType;

  /** How powerful/important is this kami? */
  rank: 'minor' | 'local' | 'regional' | 'major' | 'great';

  /** What domain does this kami preside over? */
  domain: string;

  /** What does this kami like as offerings? */
  preferredOfferings: string[];

  /** What offends this kami? */
  taboos: string[];

  /** Current disposition toward the practitioner */
  disposition: 'hostile' | 'wary' | 'neutral' | 'friendly' | 'devoted';

  /** What can this kami grant if pleased? */
  blessings: string[];

  /** What curses if angered? */
  curses: string[];

  /** Does this kami have a physical shrine? */
  shrineLocation?: string;

  /** Seasonal activity - some kami are more active at certain times */
  activeSeasons?: string[];

  /** Description and personality */
  description: string;
  personality?: string;
}

/**
 * Purity state - central to Shinto practice
 */
export interface PurityState {
  /** Current purity level (0-100) */
  level: number;

  /** Sources of pollution (kegare) */
  pollutionSources: PollutionSource[];

  /** Last purification ritual */
  lastPurification?: number;

  /** Days since major pollution */
  pollutionAge: number;
}

export interface PollutionSource {
  type: 'death' | 'blood' | 'illness' | 'childbirth' | 'crime' | 'broken_taboo' | 'spiritual_attack';
  severity: 'minor' | 'moderate' | 'severe';
  cleansable: boolean;
  description: string;
}

/**
 * Shinto Magic Paradigm - Negotiating with the spirits of all things
 */
export const SHINTO_PARADIGM: MagicParadigm = {
  id: 'shinto',
  name: 'The Way of the Kami',
  description: 'Magic through relationship with the spirits that inhabit all things',
  universeIds: ['spirit_world', 'animist_realms', 'kami_realm'],

  lore: `In the beginning, there were no divisions. The kami - spirits of all things -
walked freely among the living. Every stone has a spirit. Every river, every
ancient tree, every crossroads, every sword that has tasted blood. The kami
are not gods in the Western sense - they are neighbors, ancestors, the very
fabric of reality given voice and will.

To practice the Way is not to command, but to negotiate. You do not force
the river-kami to part; you ask, with proper offerings and pure heart. You
do not bind the sword-spirit; you forge a partnership of mutual respect.
Break a taboo, accrue pollution, show disrespect - and the kami will turn
their faces from you. Or worse.

Purity is everything. Not moral purity, but ritual cleanliness. Death pollutes.
Blood pollutes. Broken oaths pollute. The polluted cannot approach the kami,
cannot enter sacred spaces, cannot ask for blessings. First, always, comes
purification.`,

  sources: [
    {
      id: 'kami_favor',
      name: 'Kami Favor',
      type: 'social',  // It's a relationship, not a pool
      regeneration: 'ritual',
      regenRate: 0,  // Favor is built through action, not time
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'subtle',
      description: 'The goodwill of the spirits, earned through offerings and respect',
    },
    {
      id: 'purity',
      name: 'Ritual Purity',
      type: 'internal',
      regeneration: 'ritual',
      regenRate: -0.01,  // Slowly accumulates pollution
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'obvious',  // The pure and polluted are visible to spirits
      description: 'Freedom from spiritual pollution that blocks connection to kami',
    },
    {
      id: 'ancestral_connection',
      name: 'Ancestral Bond',
      type: 'bloodline',
      regeneration: 'none',
      storable: true,  // Maintained through family shrines
      transferable: false,
      stealable: false,
      detectability: 'subtle',
      description: 'Connection to protective ancestor spirits',
    },
  ],

  costs: [
    {
      type: 'offering',
      canBeTerminal: false,
      cumulative: false,
      recoverable: false,  // Offerings are consumed
      visibility: 'obvious',
    },
    {
      type: 'favor',  // Relationship cost - asking too much strains relationships
      canBeTerminal: true,  // Kami can become hostile
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'ritual',
      visibility: 'subtle',
    },
    {
      type: 'time',  // Rituals take time
      canBeTerminal: false,
      cumulative: false,
      recoverable: false,
      visibility: 'obvious',
    },
    {
      type: 'taboo',  // Some requests require accepting restrictions
      canBeTerminal: false,
      cumulative: true,
      recoverable: false,
      visibility: 'hidden',
    },
  ],

  channels: [
    { type: 'ritual', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting',
      description: 'Proper ritual forms for approaching kami' },
    { type: 'offering', requirement: 'required', canBeMastered: false, blockEffect: 'reduces_power',
      description: 'Physical offerings appropriate to the kami' },
    { type: 'verbal', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting',
      description: 'Norito - ritual prayers and invocations' },
    { type: 'purity', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting',
      description: 'Must be in a state of ritual purity' },
  ],

  laws: [
    {
      id: 'reciprocity',
      name: 'Law of Reciprocity',
      type: 'consent',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'The kami are not servants. They must choose to help. Offerings and respect build relationship.',
    },
    {
      id: 'purity_requirement',
      name: 'The Pure May Approach',
      type: 'threshold',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 5.0,
      description: 'Pollution blocks connection to kami. Major pollution prevents all spirit contact.',
    },
    {
      id: 'taboo',
      name: 'Sacred Prohibitions',
      type: 'oath_binding',
      strictness: 'strong',
      canBeCircumvented: false,
      violationConsequence: 'Kami favor lost, possibly cursed',
      description: 'Each kami has taboos. Breaking them severs the relationship.',
    },
    {
      id: 'proper_forms',
      name: 'Ritual Correctness',
      type: 'belief',
      strictness: 'weak',
      canBeCircumvented: true,
      circumventionCostMultiplier: 2.0,
      description: 'Proper ritual form shows respect. Improper ritual may offend.',
    },
    {
      id: 'locality',
      name: 'Spirits of Place',
      type: 'territory',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'Kami are tied to their domains. A mountain kami cannot help you at sea.',
    },
  ],

  risks: [
    { trigger: 'taboo_broken', consequence: 'curse', severity: 'severe', probability: 0.8, mitigatable: false,
      description: 'Breaking a kami\'s taboo brings their curse' },
    { trigger: 'pollution', consequence: 'silence', severity: 'moderate', probability: 0.6, mitigatable: true,
      mitigationSkill: 'purification',
      description: 'Accumulated pollution blocks all kami contact' },
    { trigger: 'overreach', consequence: 'attention_gained', severity: 'moderate', probability: 0.4, mitigatable: true,
      description: 'Asking too much strains the relationship' },
    { trigger: 'disrespect', consequence: 'curse', severity: 'minor', probability: 0.5, mitigatable: true,
      description: 'Improper ritual or insufficient offering may offend' },
    { trigger: 'wrong_kami', consequence: 'wild_surge', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'Asking the wrong kami for help may backfire' },
  ],

  acquisitionMethods: [
    {
      method: 'training',
      rarity: 'uncommon',
      voluntary: true,
      prerequisites: ['shrine_access', 'teacher'],
      grantsAccess: ['kami_favor', 'purity'],
      startingProficiency: 10,
      description: 'Apprenticeship at a shrine, learning ritual forms',
    },
    {
      method: 'bloodline',
      rarity: 'rare',
      voluntary: false,
      prerequisites: ['kannushi_lineage'],
      grantsAccess: ['kami_favor', 'purity', 'ancestral_connection'],
      startingProficiency: 25,
      description: 'Born into a priestly family with inherited connections',
    },
    {
      method: 'chosen',
      rarity: 'legendary',
      voluntary: false,
      grantsAccess: ['kami_favor', 'purity', 'ancestral_connection'],
      startingProficiency: 40,
      description: 'Chosen by a powerful kami for their own purposes',
    },
  ],

  // Techniques are limited - you ask, you don't command
  availableTechniques: ['perceive', 'protect', 'enhance', 'control', 'destroy'],  // destroy is forbidden but technically possible
  availableForms: ['fire', 'water', 'earth', 'air', 'plant', 'animal', 'spirit', 'body'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'One does not destroy kami' },
    { technique: 'control', form: 'spirit', reason: 'Kami cannot be commanded, only asked',
      consequence: 'Kami becomes hostile' },
  ],

  resonantCombinations: [
    { technique: 'perceive', form: 'spirit', bonusEffect: 'Can see and communicate with all local kami', powerMultiplier: 2.0 },
    { technique: 'protect', form: 'spirit', bonusEffect: 'Kami provide active protection', powerMultiplier: 1.8 },
    { technique: 'enhance', form: 'plant', bonusEffect: 'Nature kami bless growth abundantly', powerMultiplier: 1.5 },
  ],

  powerScaling: 'step',  // Power depends on kami relationships, not personal growth
  powerCeiling: undefined,  // Great kami can grant immense power
  allowsGroupCasting: true,  // Community rituals are powerful
  groupCastingMultiplier: 3.0,  // Festivals and community worship are very powerful
  allowsEnchantment: true,  // Ofuda and shide (paper charms)
  persistsAfterDeath: true,  // Become an ancestor spirit
  allowsTeaching: true,
  allowsScrolls: true,  // Ofuda - paper talismans

  foreignMagicPolicy: 'transforms',  // Foreign magic attracts spirit attention
  foreignMagicEffect: {
    effect: 'attracts_attention',
    powerModifier: 0.8,
    description: 'Foreign magic in spirit lands attracts curious or hostile kami',
  },
};

/**
 * Example kami for a spirit-saturated world
 */
export const EXAMPLE_KAMI: Kami[] = [
  {
    id: 'yama_no_kami',
    name: 'The Mountain Father',
    type: 'nature',
    rank: 'major',
    domain: 'The great mountain and all who dwell upon it',
    preferredOfferings: ['sake', 'rice', 'mountain_flowers'],
    taboos: ['cutting_ancient_trees', 'polluting_springs', 'disrespecting_elders'],
    disposition: 'neutral',
    blessings: ['safe_passage', 'hunting_luck', 'mineral_finding', 'weather_warning'],
    curses: ['lost_paths', 'rockslides', 'predator_attention'],
    shrineLocation: 'summit_shrine',
    activeSeasons: ['spring', 'autumn'],
    description: 'Ancient spirit of the mountain, grandfather to lesser spirits of peak and valley',
    personality: 'Stern but fair, respects those who respect the mountain',
  },
  {
    id: 'kawa_no_kami',
    name: 'River-Running-Swift',
    type: 'nature',
    rank: 'regional',
    domain: 'The great river from source to sea',
    preferredOfferings: ['fish_released', 'flowers', 'sake'],
    taboos: ['polluting_water', 'damming_flow', 'taking_too_many_fish'],
    disposition: 'neutral',
    blessings: ['safe_crossing', 'abundant_fish', 'flood_warning', 'water_purification'],
    curses: ['drowning_currents', 'empty_nets', 'flash_floods'],
    shrineLocation: 'river_bend_shrine',
    activeSeasons: ['summer'],
    description: 'Swift and changeable spirit of the river, life-giver and life-taker',
    personality: 'Mercurial, respects those who understand water\'s dual nature',
  },
  {
    id: 'katana_rei',
    name: 'Bitter-Edge',
    type: 'object',
    rank: 'local',
    domain: 'An ancient katana that has tasted many lives',
    preferredOfferings: ['blade_oil', 'respect', 'worthy_opponents'],
    taboos: ['dishonor', 'cowardice', 'striking_unarmed'],
    disposition: 'wary',
    blessings: ['perfect_cuts', 'battle_sense', 'intimidation'],
    curses: ['blade_turns', 'attracts_challengers', 'bloodlust'],
    description: 'Spirit of a blade forged in grief, awakened by bloodshed',
    personality: 'Proud, demands worthy wielder, hungrier than it should be',
  },
  {
    id: 'sofu_rei',
    name: 'Grandfather Who Watches',
    type: 'ancestor',
    rank: 'minor',
    domain: 'The family line and household',
    preferredOfferings: ['incense', 'favorite_foods', 'news_of_descendants'],
    taboos: ['neglecting_family', 'dishonoring_name', 'forgetting_ancestors'],
    disposition: 'friendly',
    blessings: ['family_luck', 'wisdom_dreams', 'protection_from_spirits'],
    curses: ['misfortune', 'guilt_dreams', 'ancestral_disappointment'],
    shrineLocation: 'household_shrine',
    description: 'Spirit of a beloved grandfather, still watching over his line',
    personality: 'Warm but expects proper respect, worries about the younger generation',
  },
  {
    id: 'tsuji_kami',
    name: 'The Crossroads Watcher',
    type: 'place',
    rank: 'local',
    domain: 'The crossroads where four paths meet',
    preferredOfferings: ['coins', 'food_for_travelers', 'prayers'],
    taboos: ['violence_at_crossroads', 'blocking_paths', 'lies'],
    disposition: 'neutral',
    blessings: ['true_direction', 'chance_meetings', 'lost_things_found'],
    curses: ['wrong_turns', 'lost_forever', 'bad_encounters'],
    shrineLocation: 'crossroads_marker',
    description: 'Spirit of the place between, watcher of travelers and choices',
    personality: 'Enigmatic, speaks in riddles, knows all who pass',
  },
  {
    id: 'inari_messenger',
    name: 'White-Tail Swift',
    type: 'animal',
    rank: 'minor',
    domain: 'Messenger of Inari, spirit fox',
    preferredOfferings: ['fried_tofu', 'rice', 'respect'],
    taboos: ['harming_foxes', 'mocking_inari', 'greed'],
    disposition: 'wary',
    blessings: ['merchant_luck', 'crop_growth', 'messages_delivered'],
    curses: ['trickery_returned', 'rice_blight', 'misdirection'],
    description: 'One of many fox spirits serving Inari, trickster and helper',
    personality: 'Playful, tests mortals, rewards the clever and punishes the greedy',
  },
];

// ============================================================================
// Sympathy Magic (Kingkiller Chronicle inspired)
// ============================================================================

/**
 * A sympathetic link between two objects
 */
export interface SympatheticLink {
  /** Source object */
  source: string;

  /** Target object */
  target: string;

  /** Strength of similarity (0-100) */
  similarity: number;

  /** Type of connection */
  linkType: 'identical' | 'similar' | 'part_of' | 'symbolic' | 'named';

  /** Energy loss in transfer (percentage) */
  slippage: number;

  /** Is the link currently active? */
  active: boolean;

  /** How long the link lasts */
  duration?: number;
}

/**
 * Sympathy Magic Paradigm - Like affects like
 */
export const SYMPATHY_PARADIGM: MagicParadigm = {
  id: 'sympathy',
  name: 'Sympathy',
  description: 'Create links between similar things - what affects one affects the other',
  universeIds: ['sympathy_realms', 'kingkiller'],

  lore: `Everything is connected. Not metaphorically - literally. A doll made in your
image is connected to you. A piece of your hair maintains a link to you. Two
coins from the same mint share a bond. The sympathist learns to feel these
connections and, more importantly, to exploit them.

The First Law: Energy cannot be created. Move heat from a fire to a candle
through a link, and energy is lost to slippage - the imperfection of the
connection. The Second Law: The better the link, the less the slippage.
A mother's link to her child is stronger than a stranger's. A piece of
someone is better than a symbol of them.

Sympathy is a science, not an art. It can be taught, measured, calculated.
But it is also dangerous. Create a link to the wrong thing, channel too
much through yourself, and you will burn from the inside out.`,

  sources: [
    {
      id: 'alar',
      name: 'Alar',
      type: 'internal',
      regeneration: 'rest',
      regenRate: 0.02,
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'undetectable',
      description: 'Mental focus and willpower that maintains links - "the riding-loss of belief"',
    },
    {
      id: 'heat_differential',
      name: 'Heat/Energy Source',
      type: 'ambient',
      regeneration: 'none',
      storable: false,
      transferable: true,
      stealable: true,
      detectability: 'obvious',
      description: 'External energy sources - fire, body heat, motion',
    },
  ],

  costs: [
    {
      type: 'stamina',  // Mental exhaustion from maintaining alar
      canBeTerminal: true,  // Binder's chills can kill
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'subtle',
    },
    {
      type: 'health',  // Drawing heat from yourself
      canBeTerminal: true,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
    {
      type: 'material',  // Link objects consumed
      canBeTerminal: false,
      cumulative: false,
      recoverable: false,
      visibility: 'obvious',
    },
  ],

  channels: [
    { type: 'binding', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting',
      description: 'The mental act of creating a sympathetic link' },
    { type: 'verbal', requirement: 'optional', canBeMastered: true, blockEffect: 'no_effect',
      description: 'Spoken bindings help focus but aren\'t required' },
    { type: 'material', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting',
      description: 'Must have link objects or direct contact' },
  ],

  laws: [
    {
      id: 'conservation',
      name: 'Conservation of Energy',
      type: 'conservation',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Energy cannot be created, only moved. Slippage always loses some.',
    },
    {
      id: 'similarity',
      name: 'Law of Similarity',
      type: 'similarity',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'Link strength depends on similarity. Better match = less slippage.',
    },
    {
      id: 'parallel_motion',
      name: 'Parallel Motion',
      type: 'resonance',
      strictness: 'weak',
      canBeCircumvented: true,
      description: 'Linked objects tend to move/change together',
    },
  ],

  risks: [
    { trigger: 'overuse', consequence: 'backlash', severity: 'severe', probability: 0.4, mitigatable: true,
      mitigationSkill: 'alar_training',
      description: 'Binder\'s chills - drawing too much heat from yourself' },
    { trigger: 'slippage', consequence: 'mishap', severity: 'minor', probability: 0.3, mitigatable: true,
      description: 'Energy lost to imperfect links' },
    { trigger: 'split_alar', consequence: 'backlash', severity: 'moderate', probability: 0.5, mitigatable: true,
      description: 'Maintaining multiple bindings splits focus dangerously' },
  ],

  acquisitionMethods: [
    {
      method: 'study',
      rarity: 'uncommon',
      voluntary: true,
      prerequisites: ['university_admission', 'strong_will'],
      grantsAccess: ['alar'],
      startingProficiency: 15,
      description: 'Formal study at a University',
    },
  ],

  availableTechniques: ['control', 'perceive', 'transform'],
  availableForms: ['fire', 'body', 'mind', 'earth', 'water', 'air'],

  resonantCombinations: [
    { technique: 'control', form: 'fire', bonusEffect: 'Heat transfer is instinctive', powerMultiplier: 1.5 },
    { technique: 'perceive', form: 'body', bonusEffect: 'Can sense through link', powerMultiplier: 1.3 },
  ],

  powerScaling: 'linear',
  powerCeiling: 100,
  allowsGroupCasting: false,  // Alar is personal
  allowsEnchantment: false,  // That's artificing/sygaldry, different discipline
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: false,  // Not that kind of magic
  foreignMagicPolicy: 'compatible',
};

// ============================================================================
// Allomancy (Mistborn inspired)
// ============================================================================

/**
 * The metals and their effects
 */
export interface AllomanticMetal {
  id: string;
  name: string;
  type: 'physical' | 'mental' | 'enhancement' | 'temporal';
  direction: 'push' | 'pull';
  effect: string;
  drawback?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const ALLOMANTIC_METALS: AllomanticMetal[] = [
  // Physical - External
  { id: 'steel', name: 'Steel', type: 'physical', direction: 'push',
    effect: 'Push on nearby metals', rarity: 'common' },
  { id: 'iron', name: 'Iron', type: 'physical', direction: 'pull',
    effect: 'Pull on nearby metals', rarity: 'common' },
  // Physical - Internal
  { id: 'pewter', name: 'Pewter', type: 'physical', direction: 'push',
    effect: 'Enhanced strength, speed, durability', drawback: 'Pewter drag after', rarity: 'common' },
  { id: 'tin', name: 'Tin', type: 'physical', direction: 'pull',
    effect: 'Enhanced senses', drawback: 'Sensory overload risk', rarity: 'common' },
  // Mental - External
  { id: 'zinc', name: 'Zinc', type: 'mental', direction: 'push',
    effect: 'Riot - inflame emotions', rarity: 'uncommon' },
  { id: 'brass', name: 'Brass', type: 'mental', direction: 'pull',
    effect: 'Soothe - dampen emotions', rarity: 'uncommon' },
  // Mental - Internal
  { id: 'copper', name: 'Copper', type: 'mental', direction: 'push',
    effect: 'Hide allomantic pulses (Smoker)', rarity: 'uncommon' },
  { id: 'bronze', name: 'Bronze', type: 'mental', direction: 'pull',
    effect: 'Detect allomantic pulses (Seeker)', rarity: 'uncommon' },
  // Enhancement
  { id: 'aluminum', name: 'Aluminum', type: 'enhancement', direction: 'push',
    effect: 'Wipe own metal reserves', rarity: 'rare' },
  { id: 'duralumin', name: 'Duralumin', type: 'enhancement', direction: 'push',
    effect: 'Massively boost next metal burned', drawback: 'Burns all reserves instantly', rarity: 'rare' },
  // Temporal
  { id: 'gold', name: 'Gold', type: 'temporal', direction: 'pull',
    effect: 'See past self (who you could have been)', drawback: 'Psychologically traumatic', rarity: 'rare' },
  { id: 'atium', name: 'Atium', type: 'temporal', direction: 'pull',
    effect: 'See moments into the future', rarity: 'legendary' },
];

/**
 * Allomancy Paradigm - Burn metals for power
 */
export const ALLOMANCY_PARADIGM: MagicParadigm = {
  id: 'allomancy',
  name: 'Allomancy',
  description: 'Swallow metals and "burn" them for specific powers',
  universeIds: ['scadrial', 'metal_realms'],

  lore: `Allomancy is genetic, passed through bloodlines descended from the original
Allomancers. Most Allomancers can burn only one metal - Mistings. Rare
individuals called Mistborn can burn all of them.

The process is simple: swallow a metal (purified and prepared properly),
then burn it internally. The metal is consumed, converted directly into
power. Each metal grants a specific ability - steel lets you Push on
metals, tin enhances senses, brass soothes emotions.

The power is hereditary and cannot be learned. Either your blood carries
the gift, or it doesn't. Snapping - the traumatic event that awakens
Allomantic potential - is required to access the power, even in those
who carry the genes.`,

  sources: [
    {
      id: 'metal_reserves',
      name: 'Metal Reserves',
      type: 'material',
      regeneration: 'consumption',
      storable: true,  // In your stomach
      transferable: false,
      stealable: false,
      detectability: 'subtle',  // Bronze can detect burning
      description: 'Metals consumed and stored in the body, ready to burn',
    },
  ],

  costs: [
    {
      type: 'material',  // Metal consumed
      canBeTerminal: false,
      cumulative: false,
      recoverable: false,
      visibility: 'hidden',
    },
    {
      type: 'stamina',  // Burning takes effort
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'subtle',
    },
  ],

  channels: [
    { type: 'will', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting',
      description: 'Mental command to burn metals' },
    { type: 'material', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting',
      description: 'Must have metals in stomach to burn' },
  ],

  laws: [
    {
      id: 'hereditary',
      name: 'Blood of Allomancy',
      type: 'bloodline',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Allomancy is genetic. You have it or you don\'t.',
    },
    {
      id: 'snapping',
      name: 'Snapping',
      type: 'threshold',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Potential must be awakened by trauma',
    },
    {
      id: 'one_or_all',
      name: 'Misting or Mistborn',
      type: 'balance',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Burn one metal (Misting) or all of them (Mistborn). No in-between.',
    },
    {
      id: 'purity',
      name: 'Metal Purity',
      type: 'material',
      strictness: 'strong',
      canBeCircumvented: false,
      violationConsequence: 'Metal sickness, potential death',
      description: 'Impure metals cause sickness. Alloys must be precise.',
    },
  ],

  risks: [
    { trigger: 'impure_metal', consequence: 'sickness', severity: 'severe', probability: 0.8, mitigatable: false,
      description: 'Impure metals cause violent illness' },
    { trigger: 'burnout', consequence: 'exhaustion', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'Burning too much pewter leads to pewter drag' },
    { trigger: 'flare', consequence: 'burnout', severity: 'minor', probability: 0.2, mitigatable: true,
      description: 'Flaring burns metal faster for more power, but risks running out' },
    { trigger: 'duralumin', consequence: 'exhaustion', severity: 'severe', probability: 1.0, mitigatable: false,
      description: 'Duralumin burns all metal reserves instantly' },
  ],

  acquisitionMethods: [
    {
      method: 'born',
      rarity: 'rare',  // Allomantic lines are rare
      voluntary: false,
      prerequisites: ['allomantic_bloodline'],
      grantsAccess: ['metal_reserves'],
      startingProficiency: 0,  // Must snap first
      description: 'Born with latent Allomantic potential',
    },
    {
      method: 'awakening',
      rarity: 'rare',
      voluntary: false,
      prerequisites: ['allomantic_bloodline', 'traumatic_event'],
      grantsAccess: ['metal_reserves'],
      startingProficiency: 10,
      description: 'Snapping - awakening Allomantic potential through trauma',
    },
  ],

  availableTechniques: ['enhance', 'control', 'perceive'],
  availableForms: ['body', 'mind', 'metal', 'time'],

  powerScaling: 'linear',
  powerCeiling: 100,  // Flaring can exceed temporarily
  allowsGroupCasting: false,
  allowsEnchantment: false,  // That's Feruchemy
  persistsAfterDeath: false,
  allowsTeaching: false,  // Can't teach genetic powers
  allowsScrolls: false,
  foreignMagicPolicy: 'isolated',
};

// ============================================================================
// Dream Magic
// ============================================================================

/**
 * Dream Magic Paradigm - The dream world is real and navigable
 */
export const DREAM_PARADIGM: MagicParadigm = {
  id: 'dream',
  name: 'Oneiromancy',
  description: 'Enter, navigate, and manipulate the world of dreams',
  universeIds: ['dream_realms', 'collective_unconscious'],

  lore: `The dream world is not a metaphor. It exists - a vast, shifting landscape
built from the sleeping minds of all who dream. The skilled oneiromancer
learns to enter this world consciously, to navigate its fluid geography,
to shape its substance with imagination.

But dreams are not harmless. The things that live in the deep dream -
nightmares given form, forgotten gods, the collective fears of humanity -
they are as real as anything in the waking world. And what happens in
dreams can follow you back. Die in a dream, and you may not wake at all.

The greatest power of the dreamer is not what they can do in dreams, but
what they can bring back. Inspiration stolen from sleeping minds, objects
dreamed into reality, healing drawn from restful sleep, or curses planted
in nightmares.`,

  sources: [
    {
      id: 'dream_essence',
      name: 'Dream Essence',
      type: 'ambient',
      regeneration: 'sleep',
      regenRate: 0.05,  // Regenerates only while sleeping
      storable: true,
      transferable: true,
      stealable: true,  // Dream thieves exist
      detectability: 'subtle',
      description: 'The substance of dreams, gathered from sleep',
    },
    {
      id: 'nightmare_power',
      name: 'Nightmare Power',
      type: 'emotional',
      regeneration: 'none',
      storable: true,
      transferable: false,
      stealable: false,
      detectability: 'obvious',
      description: 'Dark power drawn from fear and nightmares',
    },
  ],

  costs: [
    {
      type: 'sleep',  // Must sleep to dream
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
    {
      type: 'sanity',  // Dreams can affect mental state
      canBeTerminal: true,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'subtle',
    },
  ],

  channels: [
    { type: 'will', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting',
      description: 'Lucid consciousness while dreaming' },
    { type: 'sleep', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting',
      description: 'Must be asleep to enter the dream world' },
  ],

  laws: [
    {
      id: 'fluidity',
      name: 'Dreams Are Mutable',
      type: 'entropy',
      strictness: 'weak',
      canBeCircumvented: true,
      description: 'Nothing in dreams is fixed. Reality is shaped by will and imagination.',
    },
    {
      id: 'dreamer_rules',
      name: 'Dreamer\'s Domain',
      type: 'territory',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 3.0,
      description: 'In their own dream, the dreamer has great power. In another\'s, they are a guest.',
    },
    {
      id: 'death_consequence',
      name: 'Dream Death',
      type: 'sacrifice',
      strictness: 'strong',
      canBeCircumvented: false,
      violationConsequence: 'May not wake, or wake damaged',
      description: 'Death in dreams has real consequences',
    },
  ],

  risks: [
    { trigger: 'nightmare', consequence: 'corruption_gain', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'Nightmares can leave lasting trauma' },
    { trigger: 'lost', consequence: 'trapped', severity: 'severe', probability: 0.2, mitigatable: true,
      description: 'Can become lost in the dream world' },
    { trigger: 'entity_encounter', consequence: 'attention_gained', severity: 'moderate', probability: 0.4, mitigatable: false,
      description: 'Dream entities may take interest' },
    { trigger: 'death', consequence: 'coma', severity: 'catastrophic', probability: 0.8, mitigatable: false,
      description: 'Dying in a dream can leave you in a coma' },
  ],

  acquisitionMethods: [
    {
      method: 'awakening',
      rarity: 'uncommon',
      voluntary: false,
      prerequisites: ['lucid_dream_experience'],
      grantsAccess: ['dream_essence'],
      startingProficiency: 10,
      description: 'Spontaneous lucid dreaming leads to discovery',
    },
    {
      method: 'training',
      rarity: 'uncommon',
      voluntary: true,
      prerequisites: ['teacher', 'meditation_practice'],
      grantsAccess: ['dream_essence'],
      startingProficiency: 20,
      description: 'Formal training in dream navigation',
    },
  ],

  availableTechniques: ['create', 'control', 'perceive', 'transform'],
  availableForms: ['mind', 'spirit', 'image', 'body'],

  resonantCombinations: [
    { technique: 'create', form: 'image', bonusEffect: 'Dream creations can be brought to waking world temporarily', powerMultiplier: 2.0 },
    { technique: 'perceive', form: 'mind', bonusEffect: 'Can enter any sleeper\'s dream', powerMultiplier: 1.5 },
  ],

  powerScaling: 'exponential',  // Imagination is the limit
  powerCeiling: undefined,  // No limit in dreams
  allowsGroupCasting: true,  // Shared dreaming
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,  // Dream-touched objects
  persistsAfterDeath: true,  // Ghosts in dreams
  allowsTeaching: true,
  allowsScrolls: false,  // Dreams aren't written
  foreignMagicPolicy: 'transforms',  // All magic becomes dreamlike
};

// ============================================================================
// Song/Music Magic
// ============================================================================

/**
 * Song Magic Paradigm - Music shapes reality
 */
export const SONG_PARADIGM: MagicParadigm = {
  id: 'song',
  name: 'The Singing',
  description: 'Music and rhythm shape reality - melodies are spells, harmonies are power',
  universeIds: ['song_realms', 'musical_spheres'],

  lore: `In the beginning was not the Word - it was the Song. The universe was sung
into being, and its fundamental nature is musical. Every object has a
resonant frequency. Every soul has a melody. The Singer learns to hear
these hidden musics and to add their voice to the cosmic chorus.

Different traditions approach the Singing differently. Some use voice alone,
the purest form. Others channel through instruments - strings that resonate
with fate, drums that beat like the heart of the world, flutes that carry
wind's wisdom. Rhythm provides structure; melody provides effect; harmony
provides power.

A single voice can light a candle. A choir can raise mountains.`,

  sources: [
    {
      id: 'resonance',
      name: 'Harmonic Resonance',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: 0.02,
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'obvious',  // Music is heard
      description: 'The natural music of the world, drawn upon by Singers',
    },
    {
      id: 'voice',
      name: 'Singer\'s Voice',
      type: 'internal',
      regeneration: 'rest',
      regenRate: 0.03,
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'obvious',
      description: 'The Singer\'s trained voice, their primary instrument',
    },
  ],

  costs: [
    {
      type: 'breath',  // Singing requires breath
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
    {
      type: 'stamina',
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
  ],

  channels: [
    { type: 'verbal', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting',
      description: 'Voice is the primary channel - silenced Singers are powerless' },
    { type: 'rhythm', requirement: 'required', canBeMastered: true, blockEffect: 'reduces_power',
      description: 'Rhythm provides structure for the magic' },
    { type: 'instrument', requirement: 'optional', canBeMastered: true, blockEffect: 'no_effect',
      proficiencyBonus: 20, description: 'Instruments amplify and focus the Song' },
  ],

  laws: [
    {
      id: 'resonance',
      name: 'Resonance',
      type: 'similarity',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'Songs must match the resonant frequency of their target',
    },
    {
      id: 'harmony',
      name: 'Harmony Amplifies',
      type: 'resonance',
      strictness: 'weak',
      canBeCircumvented: true,
      description: 'Multiple voices in harmony multiply power',
    },
    {
      id: 'discord',
      name: 'Discord Destroys',
      type: 'entropy',
      strictness: 'strong',
      canBeCircumvented: false,
      violationConsequence: 'Dissonant magic backfires violently',
      description: 'Wrong notes and discord cause magical failure',
    },
  ],

  risks: [
    { trigger: 'discord', consequence: 'backlash', severity: 'moderate', probability: 0.4, mitigatable: true,
      mitigationSkill: 'perfect_pitch',
      description: 'Wrong notes cause the magic to fail violently' },
    { trigger: 'overuse', consequence: 'silence', severity: 'severe', probability: 0.3, mitigatable: true,
      description: 'Strained voice can lose the ability to Sing' },
    { trigger: 'interruption', consequence: 'mishap', severity: 'minor', probability: 0.5, mitigatable: false,
      description: 'Interrupted songs release uncontrolled energy' },
  ],

  acquisitionMethods: [
    {
      method: 'training',
      rarity: 'uncommon',
      voluntary: true,
      prerequisites: ['musical_talent', 'teacher'],
      grantsAccess: ['voice', 'resonance'],
      startingProficiency: 15,
      description: 'Formal training in the Singing',
    },
    {
      method: 'born',
      rarity: 'rare',
      voluntary: false,
      grantsAccess: ['voice', 'resonance'],
      startingProficiency: 30,
      description: 'Born with perfect pitch and natural resonance',
    },
  ],

  availableTechniques: ['create', 'control', 'enhance', 'protect', 'destroy'],
  availableForms: ['air', 'water', 'mind', 'spirit', 'body', 'plant', 'earth'],

  resonantCombinations: [
    { technique: 'control', form: 'air', bonusEffect: 'Voice carries for miles', powerMultiplier: 1.5 },
    { technique: 'enhance', form: 'body', bonusEffect: 'Healing harmonies', powerMultiplier: 1.8 },
    { technique: 'destroy', form: 'earth', bonusEffect: 'Resonance shatters stone', powerMultiplier: 2.0 },
  ],

  powerScaling: 'exponential',  // Choirs are incredibly powerful
  powerCeiling: undefined,
  allowsGroupCasting: true,  // Choirs!
  groupCastingMultiplier: 5.0,  // Harmony is power
  allowsEnchantment: true,  // Music boxes, enchanted instruments
  persistsAfterDeath: true,  // Songs are remembered
  allowsTeaching: true,
  allowsScrolls: true,  // Sheet music
  foreignMagicPolicy: 'transforms',  // All magic becomes musical
};

// ============================================================================
// Rune Magic
// ============================================================================

/**
 * Rune Magic Paradigm - Symbols have inherent power
 */
export const RUNE_PARADIGM: MagicParadigm = {
  id: 'rune',
  name: 'Runecraft',
  description: 'Carving or drawing specific symbols activates magical effects',
  universeIds: ['rune_realms', 'nordic_spheres', 'glyph_worlds'],

  lore: `The First Ones wrote the world into being. Not with words, but with symbols -
the Runes. Each Rune is a concept made manifest, a fundamental truth given
form. To know a Rune is to know a piece of reality's source code.

Runes are not arbitrary. They were discovered, not invented. The Rune of
Fire is not called fire because it represents fire - it IS fire, the concept
made visible. To carve it is to invoke that concept.

Runes must be carved or drawn with precision. A crooked line, an incomplete
curve, and the Rune fails - or worse, does something unintended. Masters
can combine Runes into bindrunes, compound meanings that create complex
effects. But each additional Rune multiplies the risk of error.`,

  sources: [
    {
      id: 'inscription',
      name: 'Inscribed Power',
      type: 'knowledge',
      regeneration: 'none',
      storable: true,  // Runes store power
      transferable: true,
      stealable: true,
      detectability: 'obvious',
      description: 'Power drawn from properly inscribed runes',
    },
    {
      id: 'material_resonance',
      name: 'Material Resonance',
      type: 'material',
      regeneration: 'none',
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'subtle',
      description: 'Different materials resonate with different runes',
    },
  ],

  costs: [
    {
      type: 'time',  // Carving takes time
      canBeTerminal: false,
      cumulative: false,
      recoverable: false,
      visibility: 'obvious',
    },
    {
      type: 'material',  // Surface to carve
      canBeTerminal: false,
      cumulative: false,
      recoverable: false,
      visibility: 'obvious',
    },
    {
      type: 'blood',  // Blood activates
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
  ],

  channels: [
    { type: 'glyph', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting',
      description: 'The rune must be properly inscribed' },
    { type: 'blood', requirement: 'optional', canBeMastered: false, blockEffect: 'reduces_power',
      proficiencyBonus: 30, description: 'Blood activation greatly empowers runes' },
    { type: 'verbal', requirement: 'optional', canBeMastered: true, blockEffect: 'no_effect',
      proficiencyBonus: 10, description: 'Speaking the rune\'s name focuses power' },
  ],

  laws: [
    {
      id: 'precision',
      name: 'Precision Required',
      type: 'true_names',
      strictness: 'strong',
      canBeCircumvented: false,
      violationConsequence: 'Rune fails or backfires',
      description: 'Runes must be carved exactly or they fail',
    },
    {
      id: 'material_affinity',
      name: 'Material Affinity',
      type: 'resonance',
      strictness: 'weak',
      canBeCircumvented: true,
      description: 'Some materials suit some runes better',
    },
    {
      id: 'bindrune_complexity',
      name: 'Bindrune Risk',
      type: 'entropy',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'Each additional rune in a bindrune increases failure risk',
    },
  ],

  risks: [
    { trigger: 'imprecision', consequence: 'mishap', severity: 'moderate', probability: 0.4, mitigatable: true,
      mitigationSkill: 'steady_hand',
      description: 'Imprecise carving causes unpredictable effects' },
    { trigger: 'bindrune_failure', consequence: 'backlash', severity: 'severe', probability: 0.3, mitigatable: true,
      description: 'Failed bindrunes can explode' },
    { trigger: 'wrong_material', consequence: 'mishap', severity: 'minor', probability: 0.2, mitigatable: true,
      description: 'Wrong material weakens or distorts the effect' },
  ],

  acquisitionMethods: [
    {
      method: 'study',
      rarity: 'uncommon',
      voluntary: true,
      prerequisites: ['find_runestones', 'teacher_or_texts'],
      grantsAccess: ['inscription'],
      startingProficiency: 15,
      description: 'Study of ancient runestones and texts',
    },
    {
      method: 'revelation',
      rarity: 'rare',
      voluntary: false,
      prerequisites: ['ordeal'],
      grantsAccess: ['inscription', 'material_resonance'],
      startingProficiency: 30,
      description: 'Rune knowledge revealed through sacrifice (hanging, etc.)',
    },
  ],

  availableTechniques: ['create', 'protect', 'enhance', 'perceive', 'control'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind'],

  resonantCombinations: [
    { technique: 'protect', form: 'body', bonusEffect: 'Warding runes are especially potent', powerMultiplier: 1.5 },
    { technique: 'enhance', form: 'fire', bonusEffect: 'Fire runes blaze brighter', powerMultiplier: 1.3 },
  ],

  powerScaling: 'step',  // Known runes determine capability
  powerCeiling: 150,  // Master bindrunes are very powerful
  allowsGroupCasting: false,  // Carving is personal
  allowsEnchantment: true,  // Runes ARE enchantment
  persistsAfterDeath: true,  // Runes outlast carver
  allowsTeaching: true,
  allowsScrolls: true,  // Runic texts
  foreignMagicPolicy: 'compatible',
};

// ============================================================================
// Daemon/Dust Magic (His Dark Materials inspired)
// ============================================================================

/**
 * A daemon - external soul in animal form
 */
export interface Daemon {
  /** Name of the daemon */
  name: string;

  /** Current animal form */
  form: string;

  /** Has the daemon settled (adult) or still shifting (child)? */
  settled: boolean;

  /** What the settled form suggests about personality */
  formMeaning?: string;

  /** Maximum distance from human before pain */
  separationDistance: 'normal' | 'extended' | 'witch_distance' | 'severed';

  /** Personality traits visible through daemon */
  revealedTraits: string[];
}

/**
 * Daemon/Dust Magic Paradigm - External souls and conscious particles
 */
export const DAEMON_PARADIGM: MagicParadigm = {
  id: 'daemon',
  name: 'The Dust and the Daemon',
  description: 'Magic through external souls (daemons) and conscious particles (Dust)',
  universeIds: ['lyras_world', 'multiverse_realms'],

  lore: `In these worlds, the soul is not hidden within - it walks beside you. Your
daemon is your soul made manifest, your companion from birth to death, your
truest self in animal form. Children's daemons shift freely between forms;
at puberty, they settle into a single shape that reflects who you truly are.

And there is Dust - Sraf, the Shadows, the particles of consciousness that
stream through the universe. Dust is attracted to consciousness, to wisdom,
to experience. The Church calls it Original Sin. The scholars know it as
something far stranger and more beautiful.

Those who learn to work with Dust can read the alethiometer - the golden
compass - asking questions of the universe itself. The subtle knife can
cut through the fabric of reality into other worlds. But every use of
these powers has consequences. The knife creates Spectres. The readers
lose themselves in symbols.`,

  sources: [
    {
      id: 'daemon_bond',
      name: 'Daemon Bond',
      type: 'internal',
      regeneration: 'none',
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'obvious',  // Daemons are visible
      description: 'The bond with your external soul',
    },
    {
      id: 'dust',
      name: 'Dust (Sraf)',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: 0.01,  // Dust accumulates slowly
      storable: true,  // Can be collected
      transferable: true,
      stealable: true,  // Can be severed
      detectability: 'subtle',  // Only visible with special equipment
      description: 'Conscious particles attracted to consciousness and wisdom',
    },
  ],

  costs: [
    {
      type: 'sanity',  // Reading the alethiometer is mentally taxing
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'subtle',
    },
    {
      type: 'separation_pain',  // Using witch-distance hurts
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'reunion',
      visibility: 'obvious',
    },
  ],

  channels: [
    { type: 'daemon', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting',
      description: 'Your daemon is essential to your magic - severed individuals lose most abilities' },
    { type: 'symbols', requirement: 'optional', canBeMastered: true, blockEffect: 'no_effect',
      proficiencyBonus: 30, description: 'Alethiometer reading through symbols' },
    { type: 'focus', requirement: 'enhancing', canBeMastered: true, blockEffect: 'reduces_power',
      description: 'Focus objects like the amber spyglass' },
  ],

  laws: [
    {
      id: 'daemon_taboo',
      name: 'The Daemon Taboo',
      type: 'consent',
      strictness: 'absolute',
      canBeCircumvented: false,
      violationConsequence: 'Touching another\'s daemon is the ultimate violation',
      description: 'No one may touch another\'s daemon without consent. Ever.',
    },
    {
      id: 'settling',
      name: 'The Settling',
      type: 'threshold',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'At puberty, daemons settle into permanent form. This cannot be reversed.',
    },
    {
      id: 'dust_attraction',
      name: 'Dust Seeks Consciousness',
      type: 'resonance',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'Dust is attracted to consciousness, wisdom, and experience',
    },
    {
      id: 'severance_horror',
      name: 'Severance is Death',
      type: 'sacrifice',
      strictness: 'absolute',
      canBeCircumvented: false,
      violationConsequence: 'Severed children become hollow; severed adults die',
      description: 'Cutting the daemon bond destroys the person',
    },
  ],

  risks: [
    { trigger: 'separation', consequence: 'pain', severity: 'moderate', probability: 1.0, mitigatable: true,
      mitigationSkill: 'witch_training',
      description: 'Distance from daemon causes intense pain' },
    { trigger: 'overreach', consequence: 'corruption_gain', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'Too much alethiometer reading can lose you in the symbols' },
    { trigger: 'subtle_knife', consequence: 'spectre_creation', severity: 'catastrophic', probability: 1.0, mitigatable: false,
      description: 'Every cut creates a Spectre somewhere' },
    { trigger: 'severance', consequence: 'death', severity: 'catastrophic', probability: 0.8, mitigatable: false,
      description: 'Having your daemon severed is almost always fatal' },
  ],

  acquisitionMethods: [
    {
      method: 'born',
      rarity: 'common',  // Everyone has a daemon
      voluntary: false,
      grantsAccess: ['daemon_bond'],
      startingProficiency: 0,
      description: 'Everyone is born with a daemon',
    },
    {
      method: 'training',
      rarity: 'rare',
      voluntary: true,
      prerequisites: ['teacher', 'natural_talent'],
      grantsAccess: ['dust'],
      startingProficiency: 20,
      description: 'Training to read the alethiometer or work with Dust',
    },
    {
      method: 'witch_clan',
      rarity: 'rare',
      voluntary: false,  // Born into it
      prerequisites: ['witch_bloodline'],
      grantsAccess: ['daemon_bond', 'dust'],
      startingProficiency: 40,
      description: 'Born into a witch clan, can achieve daemon separation',
    },
  ],

  availableTechniques: ['perceive', 'control', 'transform'],  // Limited - it's subtle magic
  availableForms: ['spirit', 'mind', 'body', 'space'],  // Can perceive truth, affect minds, travel between worlds

  resonantCombinations: [
    { technique: 'perceive', form: 'spirit', bonusEffect: 'Alethiometer reading - can ask any question', powerMultiplier: 2.5 },
    { technique: 'perceive', form: 'mind', bonusEffect: 'Read intentions through daemon-watching', powerMultiplier: 1.5 },
    { technique: 'control', form: 'space', bonusEffect: 'Subtle knife - cut between worlds', powerMultiplier: 3.0 },
  ],

  powerScaling: 'threshold',  // Abilities unlock at certain points
  powerCeiling: 100,
  allowsGroupCasting: false,  // Magic is personal
  allowsEnchantment: true,  // Alethiometers, subtle knives
  persistsAfterDeath: true,  // Ghosts exist, travel to land of the dead
  allowsTeaching: true,  // But rare
  allowsScrolls: false,
  foreignMagicPolicy: 'compatible',
};

// ============================================================================
// Registry
// ============================================================================

export const ANIMIST_PARADIGM_REGISTRY: Record<string, MagicParadigm> = {
  daemon: DAEMON_PARADIGM,
  shinto: SHINTO_PARADIGM,
  sympathy: SYMPATHY_PARADIGM,
  allomancy: ALLOMANCY_PARADIGM,
  dream: DREAM_PARADIGM,
  song: SONG_PARADIGM,
  rune: RUNE_PARADIGM,
};

/**
 * Get an animist paradigm by ID.
 */
export function getAnimistParadigm(id: string): MagicParadigm | undefined {
  return ANIMIST_PARADIGM_REGISTRY[id];
}

/**
 * Get all kami types.
 */
export function getKamiTypes(): KamiType[] {
  return ['nature', 'place', 'object', 'concept', 'ancestor', 'animal', 'elemental', 'household', 'craft', 'food'];
}

/**
 * Get example kami by type.
 */
export function getKamiByType(type: KamiType): Kami[] {
  return EXAMPLE_KAMI.filter(k => k.type === type);
}

/**
 * Get all allomantic metals.
 */
export function getAllomanticMetals(): AllomanticMetal[] {
  return ALLOMANTIC_METALS;
}

/**
 * Get metals by type (physical, mental, etc.)
 */
export function getMetalsByType(type: AllomanticMetal['type']): AllomanticMetal[] {
  return ALLOMANTIC_METALS.filter(m => m.type === type);
}
