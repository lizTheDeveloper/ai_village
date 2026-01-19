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
import { loadExampleKami, loadAllomanticMetals, loadAnimistParadigms } from './data-loader.js';

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

// Load all paradigms from JSON
const _loadedParadigms = loadAnimistParadigms();

/**
 * Shinto Magic Paradigm - Negotiating with the spirits of all things
 */
export const SHINTO_PARADIGM: MagicParadigm = _loadedParadigms.shinto;

/**
 * Example kami for a spirit-saturated world
 */
export const EXAMPLE_KAMI: Kami[] = loadExampleKami();

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

export const ALLOMANTIC_METALS: AllomanticMetal[] = loadAllomanticMetals();

/**
 * Allomancy Paradigm - Burn metals for power
 */
export const ALLOMANCY_PARADIGM: MagicParadigm = _loadedParadigms.allomancy;

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
export const SONG_PARADIGM: MagicParadigm = _loadedParadigms.song;

// ============================================================================
// Rune Magic
// ============================================================================

/**
 * Rune Magic Paradigm - Symbols have inherent power
 */
export const RUNE_PARADIGM: MagicParadigm = _loadedParadigms.rune;

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
