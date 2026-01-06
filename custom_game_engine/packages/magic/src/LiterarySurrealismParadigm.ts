/**
 * Literary Surrealism Magic System
 *
 * Where language has physical weight, metaphors become literal,
 * and reality itself is written text that can be edited.
 *
 * Inspired by:
 * - Jorge Luis Borges - The Library of Babel, infinite stories
 * - Italo Calvino - Invisible Cities, impossible architectures
 * - Lewis Carroll - Nonsense that makes perfect sense
 * - China Miéville - Bas-Lag's impossible physics
 * - Terry Pratchett - Narrativium, the element that makes stories real
 * - Walter Moers - Zamonia, where books are alive
 *
 * See: architecture/LITERARY_SURREALISM_SPEC.md
 *
 * NOTE: This file uses extended magic type definitions not yet in MagicParadigm.ts.
 * Types like MagicAcquisition, extended MagicCostType values, and additional
 * MagicForm variants need to be added to the base types.
 */
// @ts-nocheck - awaiting MagicParadigm.ts type extensions

import type { MagicParadigm, MagicSource, MagicCost, MagicChannel, MagicLaw, MagicRisk, AcquisitionDefinition } from './MagicParadigm.js';
import type { MagicSkillTree, MagicSkillNode, MagicXPSource } from './MagicSkillTree.js';
import { createSkillNode, createSkillEffect, createUnlockCondition, createSkillTree, createDefaultTreeRules } from './MagicSkillTree.js';

// ============================================================================
// Word Physics
// ============================================================================

/** How words behave as physical objects */
export interface WordPhysics {
  /** Words have mass based on importance */
  calculateWordMass(word: string, context: 'spoken' | 'written' | 'thought'): number;

  /** Synonyms orbit each other like moons */
  synonymGravity: Map<string, string[]>;

  /** Antonyms repel */
  antonymRepulsion: number;

  /** Alliteration creates resonance */
  alliterativeHarmonic: boolean;
}

/** Base word masses by category */
export const WORD_MASS_CATEGORIES: Record<string, { base: number; description: string }> = {
  article: { base: 0.1, description: 'Light, float easily' },
  preposition: { base: 0.3, description: 'Light connectors' },
  conjunction: { base: 0.2, description: 'Binding words' },
  pronoun: { base: 0.5, description: 'Stand-ins for heavier nouns' },
  adjective: { base: 2.0, description: 'Descriptors have moderate weight' },
  adverb: { base: 1.5, description: 'Modifiers are lighter than what they modify' },
  verb: { base: 5.0, description: 'Actions have heft' },
  noun_common: { base: 3.0, description: 'Regular things' },
  noun_abstract: { base: 15.0, description: 'Ideas are heavier than things' },
  noun_proper: { base: 8.0, description: 'Named things are important' },
  emotion_word: { base: 25.0, description: 'Feeling words are dense' },
  philosophical_concept: { base: 50.0, description: 'Abstract philosophy crushes furniture' },
  borrowed_word: { base: 100.0, description: 'Foreign words are extremely dense' },
};

/** Examples of specific word masses */
export const EXAMPLE_WORD_MASSES: Record<string, number> = {
  'the': 0.1,
  'a': 0.1,
  'and': 0.2,
  'but': 0.25,
  'run': 5.0,
  'walk': 4.5,
  'love': 47.3,
  'hate': 45.8,
  'melancholy': 89.2,
  'serendipity': 72.5,
  'defenestration': 88.0,
  'schadenfreude': 156.4,  // Borrowed, dense
  'zeitgeist': 142.8,      // Borrowed, abstract
  'saudade': 178.9,        // Borrowed, emotional, untranslatable
  'hygge': 65.3,           // Borrowed but warmer
  'death': 99.9,           // Heavy concept
  'infinity': 250.0,       // Almost too heavy to lift
  'nothing': 0.001,        // Almost weightless
  'everything': 999.9,     // Crushingly heavy
};

/** Calculate word mass with modifiers */
export function calculateWordMass(
  word: string,
  context: 'spoken' | 'written' | 'thought',
  options?: {
    emotionalIntensity?: number;
    speakerPoetrySkill?: number;
    isMetaphor?: boolean;
    repetitions?: number;
  }
): number {
  // Base mass from examples or category estimation
  let mass = EXAMPLE_WORD_MASSES[word.toLowerCase()] ?? estimateWordMass(word);

  // Context modifiers
  const contextMultiplier = {
    'spoken': 1.0,   // Standard
    'written': 1.5,  // Written words persist, heavier
    'thought': 0.3,  // Thoughts are light until expressed
  };
  mass *= contextMultiplier[context];

  // Optional modifiers
  if (options?.emotionalIntensity) {
    mass *= (1 + options.emotionalIntensity * 0.5);
  }
  if (options?.speakerPoetrySkill) {
    // Skilled poets can make words heavier or lighter at will
    mass *= (1 + (options.speakerPoetrySkill - 50) * 0.01);
  }
  if (options?.isMetaphor) {
    // Metaphors are heavier because they carry double meaning
    mass *= 2.0;
  }
  if (options?.repetitions && options.repetitions > 1) {
    // Overused words wear thin
    mass *= Math.pow(0.9, options.repetitions - 1);
  }

  return mass;
}

/** Estimate mass for words not in the example list */
function estimateWordMass(word: string): number {
  let mass = 3.0;  // Default noun mass

  // Longer words tend to be heavier
  mass += word.length * 0.5;

  // Words with more syllables are heavier
  const syllables = countSyllables(word);
  mass += syllables * 2;

  // Rare characters suggest borrowed words
  if (/[äöüßñçøæ]/i.test(word)) {
    mass *= 2.5;
  }

  return mass;
}

/** Simple syllable counter */
function countSyllables(word: string): number {
  const vowels = word.toLowerCase().match(/[aeiouy]+/g);
  return vowels ? vowels.length : 1;
}

// ============================================================================
// Metaphor Literalization
// ============================================================================

/** A detected metaphor */
export interface Metaphor {
  /** The original metaphorical phrase */
  phrase: string;

  /** Parsed meaning */
  type: 'simile' | 'metaphor' | 'idiom' | 'personification' | 'hyperbole';

  /** What literally happens when it comes true */
  literalEffect: MetaphorEffect;

  /** How likely this is to literalize (0-1) */
  literalizationProbability: number;

  /** Reversibility */
  reversible: boolean;

  /** Duration if temporary */
  duration?: 'instant' | 'temporary' | 'permanent';
}

/** Effect of a literalized metaphor */
export interface MetaphorEffect {
  /** What happens */
  description: string;

  /** Target of the effect */
  targetType: 'speaker' | 'subject' | 'area' | 'concept';

  /** Mechanical effects */
  effects: Array<{
    type: 'transform' | 'damage' | 'heal' | 'summon' | 'status' | 'environmental';
    value?: number;
    details?: string;
  }>;
}

/** Common metaphors and their literal effects */
export const COMMON_METAPHORS: Metaphor[] = [
  {
    phrase: 'sharp as a tack',
    type: 'simile',
    literalEffect: {
      description: 'Target gains cutting edge, can wound by touch',
      targetType: 'subject',
      effects: [
        { type: 'transform', details: 'Edges become razor-sharp' },
        { type: 'damage', value: 5, details: 'Contact damage' },
      ],
    },
    literalizationProbability: 0.6,
    reversible: true,
    duration: 'temporary',
  },
  {
    phrase: 'heart of stone',
    type: 'metaphor',
    literalEffect: {
      description: 'Chest becomes literal granite, heavy and cold',
      targetType: 'subject',
      effects: [
        { type: 'transform', details: 'Heart becomes granite' },
        { type: 'status', details: 'Immunity to emotional effects' },
        { type: 'status', details: 'Movement speed reduced 50%' },
      ],
    },
    literalizationProbability: 0.7,
    reversible: true,
    duration: 'temporary',
  },
  {
    phrase: 'time flies',
    type: 'personification',
    literalEffect: {
      description: 'Temporal entity with wings appears, steals hours',
      targetType: 'area',
      effects: [
        { type: 'summon', details: 'Time Fly entity' },
        { type: 'environmental', details: 'Time passes faster in area' },
      ],
    },
    literalizationProbability: 0.5,
    reversible: false,
    duration: 'temporary',
  },
  {
    phrase: 'drowning in paperwork',
    type: 'hyperbole',
    literalEffect: {
      description: 'Documents become liquid, actually drown you',
      targetType: 'subject',
      effects: [
        { type: 'transform', details: 'Nearby papers become liquid' },
        { type: 'damage', value: 10, details: 'Drowning damage per tick' },
      ],
    },
    literalizationProbability: 0.4,
    reversible: true,
    duration: 'temporary',
  },
  {
    phrase: 'food for thought',
    type: 'metaphor',
    literalEffect: {
      description: 'Ideas become edible, nutritious, have flavors',
      targetType: 'concept',
      effects: [
        { type: 'transform', details: 'Abstract ideas become edible' },
        { type: 'heal', value: 5, details: 'Nourishment from consuming ideas' },
      ],
    },
    literalizationProbability: 0.8,
    reversible: false,
    duration: 'permanent',
  },
  {
    phrase: 'burning with anger',
    type: 'metaphor',
    literalEffect: {
      description: 'Literal flames emerge from emotional state',
      targetType: 'speaker',
      effects: [
        { type: 'summon', details: 'Fire manifestation' },
        { type: 'damage', value: 8, details: 'Fire damage to nearby' },
      ],
    },
    literalizationProbability: 0.75,
    reversible: true,
    duration: 'temporary',
  },
  {
    phrase: 'walking on eggshells',
    type: 'idiom',
    literalEffect: {
      description: 'Floor becomes covered in eggshells that crack loudly',
      targetType: 'area',
      effects: [
        { type: 'environmental', details: 'All movement makes noise' },
        { type: 'status', details: 'Stealth impossible in area' },
      ],
    },
    literalizationProbability: 0.5,
    reversible: true,
    duration: 'temporary',
  },
  {
    phrase: 'butterflies in my stomach',
    type: 'idiom',
    literalEffect: {
      description: 'Actual butterflies manifest inside, trying to escape',
      targetType: 'speaker',
      effects: [
        { type: 'summon', details: 'Internal butterfly swarm' },
        { type: 'damage', value: 3, details: 'Mild discomfort' },
        { type: 'status', details: 'Cannot speak clearly' },
      ],
    },
    literalizationProbability: 0.65,
    reversible: true,
    duration: 'temporary',
  },
  {
    phrase: 'raining cats and dogs',
    type: 'hyperbole',
    literalEffect: {
      description: 'Actual cats and dogs fall from the sky',
      targetType: 'area',
      effects: [
        { type: 'summon', details: 'Falling animal rain' },
        { type: 'damage', value: 15, details: 'Blunt impact damage' },
        { type: 'environmental', details: 'Area becomes chaotic with animals' },
      ],
    },
    literalizationProbability: 0.3,
    reversible: false,
    duration: 'instant',
  },
  {
    phrase: 'break a leg',
    type: 'idiom',
    literalEffect: {
      description: 'Paradox: Said for good luck, but literally breaks leg',
      targetType: 'subject',
      effects: [
        { type: 'status', details: 'Broken leg' },
        { type: 'status', details: '+50% luck for the performance' },
      ],
    },
    literalizationProbability: 0.2,  // Low because commonly said
    reversible: true,
    duration: 'temporary',
  },
];

// ============================================================================
// Punctuation Magic
// ============================================================================

/** A magical punctuation mark */
export interface MagicalPunctuation {
  symbol: string;
  name: string;
  effect: string;
  danger: string;

  /** Casting requirements */
  requirements: {
    calligraphySkill: number;  // Minimum skill to draw it correctly
    inkType?: string;  // Special ink required?
    surface?: string;  // What it must be drawn on
  };

  /** Power scaling */
  powerScaling: {
    basePower: number;
    perCalligraphyPoint: number;
    maxPower: number;
  };

  /** Backlash if drawn incorrectly */
  failureEffect: string;
}

/** The punctuation marks and their magical properties */
export const PUNCTUATION_MAGIC: Record<string, MagicalPunctuation> = {
  period: {
    symbol: '.',
    name: 'Full Stop',
    effect: 'Terminates ongoing effects. Ends conversations immediately.',
    danger: 'Can end lives if misapplied',
    requirements: {
      calligraphySkill: 10,
    },
    powerScaling: {
      basePower: 10,
      perCalligraphyPoint: 0.5,
      maxPower: 50,
    },
    failureEffect: 'Effect continues with added chaos',
  },

  comma: {
    symbol: ',',
    name: 'Brief Pause',
    effect: 'Temporary suspension of time, very brief',
    danger: 'Overuse creates stuttering reality',
    requirements: {
      calligraphySkill: 15,
    },
    powerScaling: {
      basePower: 5,
      perCalligraphyPoint: 0.3,
      maxPower: 30,
    },
    failureEffect: 'Reality hiccups, causing disorientation',
  },

  exclamation: {
    symbol: '!',
    name: 'Emphasis',
    effect: 'Amplifies whatever it follows by 3x',
    danger: '!!! can be weaponized, extremely loud',
    requirements: {
      calligraphySkill: 20,
    },
    powerScaling: {
      basePower: 3.0,  // Multiplier
      perCalligraphyPoint: 0.05,
      maxPower: 10.0,
    },
    failureEffect: 'Amplifies the wrong thing, possibly caster\'s fear',
  },

  question_mark: {
    symbol: '?',
    name: 'Interrogative',
    effect: 'Forces truth-telling, compels answers',
    danger: 'Too many questions unravel certainty',
    requirements: {
      calligraphySkill: 25,
      surface: 'door or container',
    },
    powerScaling: {
      basePower: 20,
      perCalligraphyPoint: 1.0,
      maxPower: 100,
    },
    failureEffect: 'Everything becomes uncertain, reality becomes probabilistic',
  },

  semicolon: {
    symbol: ';',
    name: 'Conjunction Junction',
    effect: 'Joins two separate things into one entity',
    danger: 'Improper use creates chimeras',
    requirements: {
      calligraphySkill: 40,
      inkType: 'binding ink',
    },
    powerScaling: {
      basePower: 30,
      perCalligraphyPoint: 1.5,
      maxPower: 150,
    },
    failureEffect: 'Partial fusion, unstable chimera that may attack',
  },

  ellipsis: {
    symbol: '...',
    name: 'Trailing Off',
    effect: 'Creates uncertainty, fades things from existence',
    danger: 'Overuse leads to existential dissolution...',
    requirements: {
      calligraphySkill: 35,
    },
    powerScaling: {
      basePower: 15,
      perCalligraphyPoint: 0.8,
      maxPower: 80,
    },
    failureEffect: 'Caster begins to fade...',
  },

  em_dash: {
    symbol: '—',
    name: 'Interruption',
    effect: '— cuts through anything —',
    danger: 'Literal cutting tool when written',
    requirements: {
      calligraphySkill: 45,
      inkType: 'iron gall',
    },
    powerScaling: {
      basePower: 40,
      perCalligraphyPoint: 2.0,
      maxPower: 200,
    },
    failureEffect: 'Cuts something unintended, possibly caster',
  },

  parentheses: {
    symbol: '()',
    name: 'Aside',
    effect: 'Creates pocket dimension, hides things from main reality',
    danger: 'Things can be lost in parenthetical spaces forever',
    requirements: {
      calligraphySkill: 50,
      surface: 'matching pair on parallel surfaces',
    },
    powerScaling: {
      basePower: 50,
      perCalligraphyPoint: 2.5,
      maxPower: 250,
    },
    failureEffect: 'Dimension opens but cannot close',
  },

  quotation_marks: {
    symbol: '""',
    name: 'Quotation',
    effect: 'Makes spoken words into physical objects that can be picked up',
    danger: 'Words become too literal, lose meaning',
    requirements: {
      calligraphySkill: 30,
    },
    powerScaling: {
      basePower: 25,
      perCalligraphyPoint: 1.2,
      maxPower: 100,
    },
    failureEffect: 'Words scatter as meaningless symbols',
  },

  colon: {
    symbol: ':',
    name: 'Definition',
    effect: 'Forces reality to match a stated definition',
    danger: 'Redefining fundamental concepts is catastrophic',
    requirements: {
      calligraphySkill: 55,
      inkType: 'authority ink',
    },
    powerScaling: {
      basePower: 60,
      perCalligraphyPoint: 3.0,
      maxPower: 300,
    },
    failureEffect: 'Definition applies to wrong target',
  },

  asterisk: {
    symbol: '*',
    name: 'Footnote',
    effect: 'Adds conditions or exceptions to reality',
    danger: 'Too many asterisks create loopholes in causality',
    requirements: {
      calligraphySkill: 35,
    },
    powerScaling: {
      basePower: 20,
      perCalligraphyPoint: 1.0,
      maxPower: 80,
    },
    failureEffect: 'Condition applies universally instead of locally',
  },
};

// ============================================================================
// Poetic Paradigm Definition
// ============================================================================

/** Rhyme scheme power multipliers */
export const RHYME_SCHEME_POWER: Record<string, number> = {
  'couplet': 2.0,        // AA
  'alternate': 2.5,      // ABAB
  'enclosed': 3.0,       // ABBA
  'chain': 3.5,          // ABA BCB CDC...
  'shakespearean': 12.0, // ABAB CDCD EFEF GG
  'petrarchan': 14.0,    // ABBAABBA CDECDE
  'villanelle': 19.0,    // Complex repetition
  'ghazal': 7.0,         // AA BA CA DA...
  'limerick': 5.0,       // AABBA
  'haiku': 3.0,          // No rhyme, but syllable structure
  'free_verse': 1.0,     // Base power, no multiplier
};

/** Meter types and their properties */
export const POETIC_METERS: Record<string, { stability: number; power: number; description: string }> = {
  'iambic_pentameter': {
    stability: 1.0,
    power: 1.0,
    description: 'Standard, stable, reliable (da-DUM x5)',
  },
  'trochaic': {
    stability: 0.9,
    power: 1.1,
    description: 'Forceful, commanding (DUM-da)',
  },
  'anapestic': {
    stability: 0.8,
    power: 1.2,
    description: 'Building momentum (da-da-DUM)',
  },
  'dactylic': {
    stability: 0.6,
    power: 1.4,
    description: 'Unstable but powerful (DUM-da-da)',
  },
  'spondaic': {
    stability: 1.1,
    power: 0.8,
    description: 'Heavy, slow, deliberate (DUM-DUM)',
  },
  'pyrrhic': {
    stability: 0.5,
    power: 0.6,
    description: 'Light, fleeting, weak (da-da)',
  },
  'mixed': {
    stability: 0.7,
    power: 1.0,
    description: 'Variable, depends on composition',
  },
};

const POETIC_SOURCES: MagicSource[] = [
  {
    id: 'poetic_power',
    name: 'Poetic Power',
    type: 'knowledge',
    regeneration: 'passive',  // Accumulates as you craft verse
    regenRate: 0.02,
    storable: true,
    transferable: true,
    stealable: false,
    detectability: 'subtle',
    description: 'Power accumulates through the crafting and speaking of verse',
  },
  {
    id: 'word_weight',
    name: 'Word Weight',
    type: 'ambient',
    regeneration: 'passive',
    regenRate: 0.01,
    storable: true,
    transferable: true,
    stealable: true,
    detectability: 'obvious',
    description: 'The accumulated mass of significant words',
  },
];

const POETIC_COSTS: MagicCost[] = [
  { type: 'stamina', canBeTerminal: false, cumulative: true, recoverable: true, recoveryMethod: 'rest', visibility: 'obvious' },  // Voice strain
  { type: 'mana', canBeTerminal: false, cumulative: true, recoverable: true, recoveryMethod: 'time', visibility: 'hidden' },  // Creative energy
  { type: 'sanity', canBeTerminal: true, cumulative: true, recoverable: true, recoveryMethod: 'rest', visibility: 'subtle' },
];

const POETIC_CHANNELS: MagicChannel[] = [
  { type: 'verbal', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting' },
  { type: 'glyph', requirement: 'optional', canBeMastered: true, blockEffect: 'reduces_power', proficiencyBonus: 15 },
  { type: 'rhythm', requirement: 'required', canBeMastered: true, blockEffect: 'reduces_power' },
  { type: 'emotion', requirement: 'optional', canBeMastered: false, blockEffect: 'no_effect', proficiencyBonus: 10 },
];

const POETIC_LAWS: MagicLaw[] = [
  {
    id: 'meter_matters',
    name: 'Meter Matters',
    type: 'balance',
    strictness: 'absolute',
    canBeCircumvented: false,
    violationConsequence: 'Broken meter causes magical backlash proportional to intended power',
    description: 'The rhythm of words must be maintained or the spell fails catastrophically',
  },
  {
    id: 'sincerity_requirement',
    name: 'Sincerity Requirement',
    type: 'truth_costs',
    strictness: 'strong',
    canBeCircumvented: false,
    description: 'Insincere poetry has no power. Forced rhymes fail.',
  },
  {
    id: 'metaphor_reality',
    name: 'Metaphor Reality',
    type: 'similarity',
    strictness: 'strong',
    canBeCircumvented: true,
    circumventionCost: 'High creativity',
    description: 'Metaphors have a chance to become literally true',
  },
  {
    id: 'word_physics',
    name: 'Word Physics',
    type: 'conservation',
    strictness: 'absolute',
    canBeCircumvented: false,
    description: 'Words have physical mass. Heavy words sink, light words float.',
  },
];

const POETIC_RISKS: MagicRisk[] = [
  {
    trigger: 'failure',
    consequence: 'backlash',
    severity: 'moderate',
    probability: 0.4,
    mitigatable: true,
    mitigation: 'Perfect meter reduces risk',
    description: 'Broken verse causes the magic to rebound',
  },
  {
    trigger: 'overuse',
    consequence: 'silence',
    severity: 'severe',
    probability: 0.2,
    mitigatable: true,
    mitigation: 'Rest and listen to others\' poetry',
    description: 'Voice gives out from overuse',
  },
  {
    trigger: 'paradox',
    consequence: 'wild_surge',
    severity: 'moderate',
    probability: 0.3,
    mitigatable: false,
    description: 'Contradictory metaphors cause reality glitches',
  },
  {
    trigger: 'corruption',
    consequence: 'mutation',
    severity: 'minor',
    probability: 0.15,
    mitigatable: true,
    mitigation: 'Maintain artistic integrity',
    description: 'Lazy or derivative poetry warps the caster',
  },
];

const POETIC_ACQUISITION: MagicAcquisition[] = [
  {
    method: 'study',
    rarity: 'common',
    voluntary: true,
    prerequisites: ['literacy', 'musical_ear'],
    grantsAccess: ['poetic_power'],
    startingProficiency: 10,
    description: 'Study poetry and develop a sense of rhythm',
  },
  {
    method: 'gift',
    rarity: 'rare',
    voluntary: false,
    grantsAccess: ['poetic_power', 'word_weight'],
    startingProficiency: 30,
    description: 'Some are born with the poet\'s tongue',
  },
  {
    method: 'apprenticeship',
    rarity: 'uncommon',
    voluntary: true,
    prerequisites: ['find_poet_master'],
    grantsAccess: ['poetic_power'],
    startingProficiency: 20,
    description: 'Learn from a master poet',
  },
];

/**
 * The Poetic Paradigm - Literary Surrealism magic system
 */
export const POETIC_PARADIGM: MagicParadigm = {
  id: 'poetic',
  name: 'Poetic Magic',
  description: 'Magic cast through perfect verse, where language shapes reality',
  universeIds: ['literary_surrealism', 'word_realms', 'standard'],

  lore: `In the beginning was the Word, and the Word had weight.

The poets discovered that language is not merely description—it is architecture.
Words are not symbols pointing at reality; they ARE reality, in a more fundamental
form. The world is a story being told, and those who master verse can edit the text.

Rhyme schemes amplify power because they create resonance in the fabric of reality.
Meter matters because the universe has rhythm, and magic that matches that rhythm
flows more easily. Metaphors become literal because, at the deepest level, there is
no difference between a thing and its perfect description.

The great poets do not describe the world. They rewrite it.`,

  sources: POETIC_SOURCES,
  costs: POETIC_COSTS,
  channels: POETIC_CHANNELS,
  laws: POETIC_LAWS,
  risks: POETIC_RISKS,
  acquisitionMethods: POETIC_ACQUISITION,

  availableTechniques: ['create', 'transform', 'control', 'perceive', 'enhance', 'destroy'],
  availableForms: ['mind', 'image', 'sound', 'text', 'emotion', 'time', 'space'],

  powerScaling: 'exponential',  // Perfect poetry is extremely powerful
  powerCeiling: undefined,  // Theoretically unlimited for perfect verse

  allowsGroupCasting: true,
  groupCastingMultiplier: 3.0,  // Choirs and choruses are powerful

  allowsEnchantment: true,  // Written poetry retains power
  persistsAfterDeath: true,  // Poetry outlives the poet

  allowsTeaching: true,
  allowsScrolls: true,  // Poems are scrolls

  foreignMagicPolicy: 'absorbs',  // Can poetically describe other magic

  conflictingParadigms: [],  // Poetry encompasses all
};

// ============================================================================
// Poetic Skill Tree
// ============================================================================

const POETIC_SKILL_NODES: MagicSkillNode[] = [
  // Foundation
  createSkillNode('rhythm_basics', 'Basic Rhythm', 'poetic', 'foundation', 0, 25, [
    createSkillEffect('paradigm_proficiency', 5, { perLevelValue: 3 }),
  ], {
    description: 'Learn to hear and produce basic poetic meter',
    maxLevel: 5,
    prerequisites: [],
  }),

  createSkillNode('rhyme_recognition', 'Rhyme Recognition', 'poetic', 'foundation', 0, 25, [
    createSkillEffect('paradigm_proficiency', 5, { perLevelValue: 3 }),
  ], {
    description: 'Recognize and create rhyme schemes',
    maxLevel: 5,
    prerequisites: [],
  }),

  createSkillNode('word_weight_sense', 'Word Weight Sense', 'poetic', 'foundation', 1, 50, [
    createSkillEffect('perception', 10, { perLevelValue: 5, description: 'Sense the weight of words' }),
  ], {
    description: 'Develop the ability to feel the mass of words',
    maxLevel: 3,
    prerequisites: ['rhythm_basics'],
    unlockConditions: [
      createUnlockCondition('skill_level', { skillId: 'rhythm_basics', skillLevel: 2 }, 'Reach level 2 in Basic Rhythm'),
    ],
  }),

  // Technique
  createSkillNode('metaphor_craft', 'Metaphor Craft', 'poetic', 'technique', 1, 75, [
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'literal_metaphor' } }),
  ], {
    description: 'Learn to craft metaphors that have a chance to become literal',
    maxLevel: 5,
    prerequisites: ['rhyme_recognition'],
    lore: 'Call something "sharp as a tack" and watch it cut',
  }),

  createSkillNode('punctuation_basics', 'Basic Punctuation Magic', 'poetic', 'technique', 2, 100, [
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'punctuation_period' } }),
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'punctuation_comma' } }),
  ], {
    description: 'Master the magical properties of basic punctuation',
    maxLevel: 3,
    prerequisites: ['word_weight_sense'],
    unlockConditions: [
      createUnlockCondition('skill_level', { skillId: 'calligraphy', skillLevel: 10 }, 'Calligraphy skill 10+'),
    ],
  }),

  createSkillNode('punctuation_advanced', 'Advanced Punctuation', 'poetic', 'technique', 3, 200, [
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'punctuation_question' } }),
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'punctuation_exclamation' } }),
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'punctuation_semicolon' } }),
  ], {
    description: 'Wield the more dangerous punctuation marks',
    maxLevel: 3,
    prerequisites: ['punctuation_basics'],
    unlockConditions: [
      createUnlockCondition('skill_level', { skillId: 'calligraphy', skillLevel: 30 }, 'Calligraphy skill 30+'),
    ],
  }),

  // Specialization - Rhyme Schemes
  createSkillNode('couplet_mastery', 'Couplet Mastery', 'poetic', 'specialization', 2, 80, [
    createSkillEffect('paradigm_proficiency', 15, { perLevelValue: 5 }),
  ], {
    description: 'Master the power of rhyming couplets (2x power multiplier)',
    maxLevel: 3,
    prerequisites: ['rhyme_recognition'],
  }),

  createSkillNode('sonnet_form', 'Sonnet Form', 'poetic', 'specialization', 3, 200, [
    createSkillEffect('paradigm_proficiency', 50, { perLevelValue: 20 }),
  ], {
    description: 'Master the sonnet form for maximum power (up to 14x multiplier)',
    maxLevel: 3,
    prerequisites: ['couplet_mastery'],
    unlockConditions: [
      createUnlockCondition('xp_accumulated', { xpRequired: 500 }, 'Accumulate 500 poetic XP'),
    ],
  }),

  // Meter mastery
  createSkillNode('iambic_mastery', 'Iambic Mastery', 'poetic', 'specialization', 2, 100, [
    createSkillEffect('paradigm_proficiency', 20, { perLevelValue: 10 }),
  ], {
    description: 'Perfect the standard iambic pentameter',
    maxLevel: 5,
    prerequisites: ['rhythm_basics'],
  }),

  createSkillNode('exotic_meters', 'Exotic Meters', 'poetic', 'specialization', 3, 150, [
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'dactylic_casting' } }),
    createSkillEffect('paradigm_proficiency', 25, { perLevelValue: 10 }),
  ], {
    description: 'Master unstable but powerful exotic meters',
    maxLevel: 3,
    prerequisites: ['iambic_mastery'],
    lore: 'Dactylic meter is unstable but powerful',
  }),

  // Mastery
  createSkillNode('enjambment', 'Enjambment', 'poetic', 'mastery', 3, 175, [
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'linked_spells' } }),
  ], {
    description: 'Link spells across lines using enjambment',
    maxLevel: 3,
    prerequisites: ['couplet_mastery', 'iambic_mastery'],
  }),

  createSkillNode('word_smithing', 'Word Smithing', 'poetic', 'mastery', 4, 300, [
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'create_words' } }),
  ], {
    description: 'Create new words with specific magical properties',
    maxLevel: 1,
    prerequisites: ['word_weight_sense', 'metaphor_craft'],
    unlockConditions: [
      createUnlockCondition('xp_accumulated', { xpRequired: 1000 }, 'Accumulate 1000 poetic XP'),
    ],
  }),

  createSkillNode('reality_revision', 'Reality Revision', 'poetic', 'mastery', 5, 500, [
    createSkillEffect('unlock_ability', 1, { target: { abilityId: 'rewrite_reality' } }),
  ], {
    description: 'The ultimate art: edit the text of reality itself',
    maxLevel: 1,
    prerequisites: ['sonnet_form', 'word_smithing', 'enjambment'],
    unlockConditions: [
      createUnlockCondition('magic_proficiency', { proficiencyLevel: 80 }, 'Reach proficiency 80 in poetic paradigm'),
    ],
    lore: 'The world is a story. You are its author.',
  }),
];

const POETIC_XP_SOURCES: MagicXPSource[] = [
  { eventType: 'poem_completed', xpAmount: 25, description: 'Complete a poem' },
  { eventType: 'rhyme_achieved', xpAmount: 5, description: 'Create a successful rhyme' },
  { eventType: 'metaphor_literalized', xpAmount: 50, description: 'Literalize a metaphor' },
  { eventType: 'punctuation_cast', xpAmount: 30, description: 'Successfully cast punctuation magic' },
  { eventType: 'audience_moved', xpAmount: 40, description: 'Move an audience with poetry' },
  { eventType: 'meter_maintained', xpAmount: 10, description: 'Maintain perfect meter through a spell' },
  { eventType: 'sonnet_completed', xpAmount: 100, description: 'Complete a full sonnet spell' },
];

export const POETIC_SKILL_TREE: MagicSkillTree = createSkillTree(
  'poetic_tree',
  'poetic',
  'Path of the Poet',
  'The skill tree for mastering poetic magic',
  POETIC_SKILL_NODES,
  POETIC_XP_SOURCES,
  {
    lore: 'Words are not symbols. Words are architecture.',
    rules: {
      ...createDefaultTreeRules(false),
      allowRespec: true,
      respecPenalty: 0.1,  // Poets can reimagine themselves
    },
  }
);

// ============================================================================
// Living Abstractions (Entities from Literary Surrealism)
// ============================================================================

/** A tangible emotion that can be encountered as an entity */
export interface EmotionalEntity {
  emotionType: 'joy' | 'sorrow' | 'rage' | 'fear' | 'regret' | 'schadenfreude' | 'ennui' | 'nostalgia' | 'hope';

  /** How they manifest */
  appearance: string;
  behaviors: string[];

  /** Effects on nearby beings */
  aura: {
    effect: string;
    range: number | 'personal' | 'area';
    resistible: boolean;
    resistStat?: string;
  };

  /** Can be captured, bottled, traded */
  tradeable: boolean;
  value: number;  // Negative = people pay to remove it
}

/** Predefined emotional entities */
export const EMOTIONAL_ENTITIES: Record<string, EmotionalEntity> = {
  regret: {
    emotionType: 'regret',
    appearance: 'Gray mist that follows you, whispering past mistakes',
    behaviors: [
      'Clings to beings who made poor choices',
      'Grows heavier with age',
      'Can be shed through atonement or acceptance',
    ],
    aura: {
      effect: 'Replay past decisions in mind',
      range: 'personal',
      resistible: true,
      resistStat: 'willpower',
    },
    tradeable: true,
    value: -20,
  },

  schadenfreude: {
    emotionType: 'schadenfreude',
    appearance: 'Imp-like creature with a malicious grin',
    behaviors: [
      'Appears when witnessing others\' misfortune',
      'Feeds on embarrassment',
      'Multiplies in presence of social disasters',
    ],
    aura: {
      effect: 'Makes others\' failures seem hilarious',
      range: 10,
      resistible: false,
    },
    tradeable: true,
    value: 15,
  },

  joy: {
    emotionType: 'joy',
    appearance: 'Bright floating orb of warm golden light',
    behaviors: [
      'Drawn to celebrations and achievements',
      'Bounces between happy people',
      'Fades in prolonged sadness',
    ],
    aura: {
      effect: 'Enhances positive emotions, suppresses negative',
      range: 15,
      resistible: false,
    },
    tradeable: true,
    value: 50,
  },

  ennui: {
    emotionType: 'ennui',
    appearance: 'Translucent figure that makes everything look gray',
    behaviors: [
      'Settles over the comfortable and privileged',
      'Drains motivation and interest',
      'Cannot be fought directly—only outlasted',
    ],
    aura: {
      effect: 'Nothing seems worth doing',
      range: 'area',
      resistible: true,
      resistStat: 'purpose',
    },
    tradeable: true,
    value: -30,
  },

  nostalgia: {
    emotionType: 'nostalgia',
    appearance: 'Sepia-toned ghost that shows scenes from the past',
    behaviors: [
      'Visits places where memories were made',
      'Stronger on anniversaries',
      'Can be comforting or painful',
    ],
    aura: {
      effect: 'Vivid memories of the past overlay present',
      range: 'personal',
      resistible: true,
      resistStat: 'presence',
    },
    tradeable: true,
    value: 25,
  },

  hope: {
    emotionType: 'hope',
    appearance: 'Tiny bird made of dawn light',
    behaviors: [
      'Appears at lowest points',
      'Fragile but persistent',
      'Cannot be killed, only temporarily dimmed',
    ],
    aura: {
      effect: 'Belief that things can improve',
      range: 'personal',
      resistible: false,
    },
    tradeable: false,  // Hope cannot be bought or sold
    value: 0,
  },
};

/** A concept given physical form */
export interface ConceptBeing {
  concept: string;
  howItManifests: string;
  behaviors: string[];
  interactionEffects: {
    touch?: string;
    speak_to?: string;
    ignore?: string;
  };
}

/** Example concept beings */
export const CONCEPT_BEINGS: Record<string, ConceptBeing> = {
  tuesday: {
    concept: 'the abstract idea of Tuesday',
    howItManifests: 'Bland humanoid in business casual, perpetually tired',
    behaviors: [
      'Wanders aimlessly between Monday and Wednesday',
      'Makes everything slightly tedious',
      'Forgotten immediately after passing',
    ],
    interactionEffects: {
      touch: 'It\'s Tuesday now, regardless of actual day',
      speak_to: 'Discusses mundane work topics',
      ignore: 'Ideal—Tuesday prefers being forgettable',
    },
  },

  seven: {
    concept: 'the number seven',
    howItManifests: 'Heptagonal crystal that chimes in perfect fifths',
    behaviors: [
      'Appears in groups of seven',
      'Creates lucky coincidences',
      'Associated with completeness',
    ],
    interactionEffects: {
      touch: 'Gain seven of something (random)',
      speak_to: 'Answers in seven-word sentences',
      ignore: 'Mild bad luck',
    },
  },

  disappointment_blue: {
    concept: 'the specific shade of blue that represents disappointment',
    howItManifests: 'Washed-out blue-gray figure, always slightly transparent',
    behaviors: [
      'Appears when hopes are dashed',
      'Paints things in its own hue',
      'Fades gradually as you move on',
    ],
    interactionEffects: {
      touch: 'Everything you touch becomes that color for a while',
      speak_to: 'It shares disappointing news in a flat monotone',
      ignore: 'It intensifies, becomes more saturated',
    },
  },

  silence: {
    concept: 'absolute silence',
    howItManifests: 'Empty space in the shape of a person, absorbing all sound',
    behaviors: [
      'Follows loud noises to consume them',
      'Grows in quiet places',
      'Flees from music',
    ],
    interactionEffects: {
      touch: 'Cannot speak for one hour',
      speak_to: 'Impossible—sound is absorbed',
      ignore: 'Silence spreads slowly',
    },
  },
};

// ============================================================================
// Exports
// ============================================================================

// All exports are inline above (export const ...)
