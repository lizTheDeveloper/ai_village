/**
 * WhimsicalParadigms - Unusual magic systems and LLM generation support
 *
 * Not all magic is serious! This module covers:
 *
 * 1. Talent Magic (Xanth-style) - Everyone has exactly ONE unique talent
 * 2. Narrative Magic (Discworld) - Story logic has real power
 * 3. Pun Magic - Words and wordplay create effects
 * 4. Wild Magic - Chaotic, unpredictable magic
 * 5. LLM Generation - Prompts and parsers for generating magic content
 */

import type { MagicParadigm } from './MagicParadigm.js';
import type { MagicTechnique, MagicForm } from '@ai-village/core';

// ============================================================================
// Talent Magic (Xanth-style)
// ============================================================================

/**
 * In Talent magic, every person is born with exactly one magical talent.
 * Talents range from trivial (can change the color of their fingernails)
 * to world-shaking (can transform anything into anything else).
 */
export interface TalentMagic {
  /** Unique ID for this talent */
  talentId: string;

  /** Name of the talent */
  name: string;

  /** Description of what the talent does */
  description: string;

  /** How powerful is this talent? */
  tier: 'mundane' | 'minor' | 'moderate' | 'major' | 'magician_class';

  /** What the talent can do */
  effects: TalentEffect[];

  /** Limitations on the talent */
  limitations: string[];

  /** How often can it be used? */
  usageLimit: 'unlimited' | 'once_per_day' | 'once_per_hour' | 'exhausting' | 'one_time';

  /** Is this talent obvious when used? */
  visibility: 'invisible' | 'subtle' | 'obvious' | 'spectacular';

  /** Can this talent be improved with practice? */
  improvable: boolean;

  /** Humorous note about the talent */
  quirk?: string;
}

/** What a talent can actually do */
export interface TalentEffect {
  type: 'transform' | 'create' | 'perceive' | 'control' | 'enhance' | 'protect' | 'other';
  target: string;
  effect: string;
  range?: 'touch' | 'close' | 'medium' | 'far' | 'unlimited';
}

/** Example talents */
export const EXAMPLE_TALENTS: TalentMagic[] = [
  {
    talentId: 'color_change_nails',
    name: 'Chromatic Nails',
    description: 'Can change the color of their fingernails at will',
    tier: 'mundane',
    effects: [{ type: 'transform', target: 'own fingernails', effect: 'change color' }],
    limitations: ['Only affects own nails', 'Cannot create patterns'],
    usageLimit: 'unlimited',
    visibility: 'subtle',
    improvable: false,
    quirk: 'Great at parties, useless in battle',
  },
  {
    talentId: 'spot_remover',
    name: 'Spot Removal',
    description: 'Can remove any stain or spot from any surface',
    tier: 'minor',
    effects: [{ type: 'transform', target: 'stains', effect: 'remove completely' }],
    limitations: ['Only works on stains', 'Cannot remove tattoos or scars'],
    usageLimit: 'unlimited',
    visibility: 'invisible',
    improvable: true,
    quirk: 'Surprisingly useful for crime scene cleanup',
  },
  {
    talentId: 'direction_sense',
    name: 'Perfect Direction',
    description: 'Always knows which way is north and can find any place they have been before',
    tier: 'moderate',
    effects: [
      { type: 'perceive', target: 'directions', effect: 'perfect knowledge of cardinal directions' },
      { type: 'perceive', target: 'locations', effect: 'can navigate to any visited location' },
    ],
    limitations: ['Cannot find places never visited', 'Does not provide maps'],
    usageLimit: 'unlimited',
    visibility: 'invisible',
    improvable: true,
  },
  {
    talentId: 'nightmare_creation',
    name: 'Nightmare Sculptor',
    description: 'Can create and control nightmares, pulling them from dreams into reality',
    tier: 'major',
    effects: [
      { type: 'create', target: 'nightmare creatures', effect: 'manifest nightmares', range: 'medium' },
      { type: 'control', target: 'dream creatures', effect: 'command nightmares' },
    ],
    limitations: ['Creatures fade in daylight', 'Can be overcome by courage'],
    usageLimit: 'exhausting',
    visibility: 'spectacular',
    improvable: true,
    quirk: 'Has terrible insomnia themselves',
  },
  {
    talentId: 'transformation',
    name: 'Universal Transformation',
    description: 'Can transform any object or creature into any other object or creature',
    tier: 'magician_class',
    effects: [
      { type: 'transform', target: 'anything', effect: 'transform into anything else', range: 'touch' },
    ],
    limitations: ['Touch required', 'Unwilling creatures get a resistance roll'],
    usageLimit: 'exhausting',
    visibility: 'spectacular',
    improvable: true,
    quirk: 'Accidentally transformed themselves into a toad once. Got better.',
  },
];

/**
 * Talent Magic Paradigm - Everyone has exactly one talent
 */
export const TALENT_PARADIGM: MagicParadigm = {
  id: 'talent',
  name: 'Talent Magic',
  description: 'Everyone is born with exactly one unique magical talent',
  universeIds: ['xanth', 'talent_realms'],

  lore: `In these realms, magic is personal. Every person is born with exactly one
magical talent, never to be repeated. Some talents are grand, some are humble,
but each is unique. The hierarchy of talents (mundane, minor, moderate, major,
Magician-class) determines much of social standing.`,

  sources: [
    {
      id: 'innate_talent',
      name: 'Innate Talent',
      type: 'internal',
      regeneration: 'passive',
      regenRate: 0,  // Talent is always available
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'subtle',
      description: 'The talent you were born with - unique to you alone',
    },
  ],

  costs: [
    {
      type: 'stamina',
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
  ],

  channels: [
    { type: 'will', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting' },
  ],

  laws: [
    {
      id: 'one_talent',
      name: 'The One Talent Law',
      type: 'conservation',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Each person has exactly one talent. No more, no less. Ever.',
    },
    {
      id: 'uniqueness',
      name: 'Talent Uniqueness',
      type: 'balance',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'No two people in the universe share the same talent',
    },
    {
      id: 'birth_determined',
      name: 'Birth Determination',
      type: 'consent',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Talents are determined at birth and cannot be chosen or changed',
    },
  ],

  risks: [
    { trigger: 'overuse', consequence: 'backlash', severity: 'minor', probability: 0.1, mitigatable: true,
      description: 'Overusing your talent can tire you out' },
  ],

  acquisitionMethods: [
    {
      method: 'born',
      rarity: 'common',  // Everyone has one
      voluntary: false,
      grantsAccess: ['innate_talent'],
      startingProficiency: 30,  // Born with it
      description: 'Born with a unique magical talent',
    },
  ],

  // Talents don't follow the normal technique/form system
  availableTechniques: ['create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image', 'time', 'space'],

  powerScaling: 'step',  // Talents have fixed power tiers
  powerCeiling: 100,  // Magician-class is the cap
  allowsGroupCasting: false,  // Talents are personal
  allowsEnchantment: false,  // Talents can't be put in objects
  persistsAfterDeath: false,
  allowsTeaching: false,  // Can't teach your talent
  allowsScrolls: false,
  foreignMagicPolicy: 'incompatible',  // Other magic systems don't work here
};

// ============================================================================
// Narrative Magic (Discworld-style)
// ============================================================================

/**
 * In Narrative magic, story logic has real power.
 * The million-to-one shot always works. Chosen ones exist.
 * Genre conventions are laws of nature.
 */
export interface NarrativeRule {
  id: string;
  name: string;
  description: string;
  genre: 'fantasy' | 'horror' | 'comedy' | 'romance' | 'tragedy' | 'adventure' | 'any';
  trigger: string;
  effect: string;
  strength: 'suggestion' | 'strong' | 'absolute';
}

export const NARRATIVE_RULES: NarrativeRule[] = [
  {
    id: 'million_to_one',
    name: 'Million-to-One Chance',
    description: 'A million-to-one chance succeeds nine times out of ten',
    genre: 'any',
    trigger: 'Odds explicitly stated as "a million to one"',
    effect: 'Attempt automatically succeeds',
    strength: 'absolute',
  },
  {
    id: 'chosen_one',
    name: 'The Chosen One',
    description: 'Prophecied heroes have narrative protection',
    genre: 'fantasy',
    trigger: 'Being identified as the chosen one by prophecy',
    effect: 'Cannot die until prophecy fulfilled (but can suffer greatly)',
    strength: 'strong',
  },
  {
    id: 'rule_of_three',
    name: 'Rule of Three',
    description: 'Things that happen in threes are magically potent',
    genre: 'any',
    trigger: 'Third attempt at something, third sibling, third wish',
    effect: 'Third instance is most powerful/successful',
    strength: 'strong',
  },
  {
    id: 'dramatic_timing',
    name: 'Dramatic Timing',
    description: 'Important events wait for dramatic moments',
    genre: 'any',
    trigger: 'Narratively significant moment',
    effect: 'Rescues, revelations, and arrivals happen at perfect moments',
    strength: 'suggestion',
  },
  {
    id: 'comedy_physics',
    name: 'Comedy Physics',
    description: 'Physical laws bend for comedic effect',
    genre: 'comedy',
    trigger: 'Situation would be funnier if physics bent',
    effect: 'Cartoon-style physics apply temporarily',
    strength: 'suggestion',
  },
  {
    id: 'horror_rules',
    name: 'Horror Rules',
    description: 'Genre conventions of horror apply',
    genre: 'horror',
    trigger: 'Investigation of mysterious events',
    effect: 'Splitting up is dangerous, lights fail at bad times, etc.',
    strength: 'strong',
  },
  {
    id: 'love_conquers',
    name: 'True Love',
    description: 'True love has magical power',
    genre: 'romance',
    trigger: 'Act of true love',
    effect: 'Can break curses, overcome obstacles, achieve the impossible',
    strength: 'absolute',
  },
  {
    id: 'narrative_causality',
    name: 'Narrative Causality',
    description: 'Stories want to be told a certain way',
    genre: 'any',
    trigger: 'Events align with classic story structure',
    effect: 'Reality bends to follow the story beats',
    strength: 'suggestion',
  },
];

/**
 * Narrative Magic Paradigm - Story logic is real
 */
export const NARRATIVE_PARADIGM: MagicParadigm = {
  id: 'narrative',
  name: 'Narrative Causality',
  description: 'Story logic and genre conventions are laws of nature',
  universeIds: ['discworld', 'story_realms'],

  lore: `On the Disc, stories are things. Narrative causality shapes events to
match the stories that want to be told. The million-to-one chance works
because stories say it should. Heroes survive because the story needs them.
Some rare individuals learn to sense and manipulate these narrative threads.`,

  sources: [
    {
      id: 'narrative_weight',
      name: 'Narrative Weight',
      type: 'social',  // Comes from being in a story
      regeneration: 'none',
      storable: false,
      transferable: true,  // Stories can be passed on
      stealable: false,
      detectability: 'undetectable',  // It's just how reality works
      description: 'The power of being in a story',
    },
  ],

  costs: [
    {
      type: 'karma',  // Going against the narrative has karmic costs
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'time',
      visibility: 'hidden',
    },
  ],

  channels: [
    { type: 'verbal', requirement: 'optional', canBeMastered: true, blockEffect: 'no_effect' },
    { type: 'emotion', requirement: 'enhancing', canBeMastered: false, blockEffect: 'no_effect' },
  ],

  laws: [
    {
      id: 'narrative_imperative',
      name: 'Narrative Imperative',
      type: 'narrative',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 3.0,
      description: 'Stories want to be told certain ways. Fighting the narrative is exhausting.',
    },
    {
      id: 'genre_conventions',
      name: 'Genre Conventions',
      type: 'narrative',
      strictness: 'weak',
      canBeCircumvented: true,
      description: 'Different genres have different rules. Know which story you\'re in.',
    },
    {
      id: 'lampshade_principle',
      name: 'Lampshade Principle',
      type: 'narrative',
      strictness: 'weak',
      canBeCircumvented: true,
      description: 'Acknowledging a narrative convention weakens its power',
    },
  ],

  risks: [
    { trigger: 'paradox', consequence: 'wild_surge', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'Fighting the narrative too hard causes reality glitches' },
    { trigger: 'attention', consequence: 'attention_gained', severity: 'minor', probability: 0.2, mitigatable: true,
      description: 'Being too narratively significant attracts plot complications' },
  ],

  acquisitionMethods: [
    {
      method: 'awakening',
      rarity: 'rare',
      voluntary: false,
      prerequisites: ['narrative_awareness'],
      grantsAccess: ['narrative_weight'],
      startingProficiency: 10,
      description: 'Becoming aware of the story you\'re in',
    },
    {
      method: 'study',
      rarity: 'uncommon',
      voluntary: true,
      prerequisites: ['extensive_reading'],
      grantsAccess: ['narrative_weight'],
      startingProficiency: 20,
      description: 'Studying enough stories to recognize the patterns',
    },
  ],

  availableTechniques: ['perceive', 'control', 'protect'],
  availableForms: ['mind', 'spirit', 'image'],

  powerScaling: 'threshold',  // Power depends on narrative significance
  powerCeiling: undefined,  // Main characters have unlimited narrative power
  allowsGroupCasting: true,  // Group stories are more powerful
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,  // Legendary items have narrative weight
  persistsAfterDeath: true,  // Legends outlive their heroes
  allowsTeaching: true,  // Stories can be taught
  allowsScrolls: true,  // Stories can be written
  foreignMagicPolicy: 'transforms',  // Other magic becomes part of the story
};

// ============================================================================
// Pun Magic (Xanth-style wordplay)
// ============================================================================

/**
 * In Pun magic, words have literal power.
 * A "nightstand" is a stand that only appears at night.
 * A "spelling bee" makes you spell things correctly.
 */
export interface PunMagic {
  pun: string;
  literal_meaning: string;
  magical_effect: string;
  setup: string;  // How the pun is created/activated
}

export const EXAMPLE_PUNS: PunMagic[] = [
  {
    pun: 'Spelling Bee',
    literal_meaning: 'A bee made of letters',
    magical_effect: 'Forces targets to spell correctly',
    setup: 'Exists in nature, can be caught and released',
  },
  {
    pun: 'Night Stand',
    literal_meaning: 'A stand that only exists at night',
    magical_effect: 'Furniture that appears at sunset, vanishes at dawn',
    setup: 'Made from night wood',
  },
  {
    pun: 'Eye Scream',
    literal_meaning: 'Eyes that scream',
    magical_effect: 'Causes horrifying visions and literal screaming',
    setup: 'Created by exposing ice cream to horror',
  },
  {
    pun: 'Tree-son',
    literal_meaning: 'Child of a tree',
    magical_effect: 'A dryad born from betraying another tree',
    setup: 'Spoken accusation between trees',
  },
  {
    pun: 'Bread Winner',
    literal_meaning: 'Bread that wins',
    magical_effect: 'Eating it guarantees victory in the next contest',
    setup: 'Baked by a champion baker',
  },
];

/**
 * Pun Magic Paradigm - Words have literal power
 */
export const PUN_PARADIGM: MagicParadigm = {
  id: 'pun',
  name: 'Pun Magic',
  description: 'Words have literal magical power based on their sounds',
  universeIds: ['xanth', 'pun_realms'],

  lore: `In the land of Xanth, puns are not merely wordplay but fundamental forces
of nature. A "shoe tree" grows shoes. A "door mat" makes doors very formal.
The groaner the pun, the more powerful the magic. Newcomers often groan
at the omnipresent wordplay, but natives have learned to appreciate - or at
least tolerate - the punny nature of their reality.`,

  sources: [
    {
      id: 'punergy',
      name: 'Punergy',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: 0.05,  // Puns are everywhere
      storable: true,  // Can be stored in pun objects
      transferable: true,
      stealable: false,
      detectability: 'obvious',  // Puns are usually obvious (groan)
      description: 'The magical power of wordplay',
    },
  ],

  costs: [
    {
      type: 'sanity',  // Groaning at puns drains sanity
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
  ],

  channels: [
    { type: 'verbal', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
  ],

  laws: [
    {
      id: 'literal_truth',
      name: 'Literal Truth',
      type: 'true_names',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Words mean exactly what they sound like they mean',
    },
    {
      id: 'groan_power',
      name: 'Groan Power',
      type: 'sacrifice',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'The worse the pun, the more powerful the magic',
    },
  ],

  risks: [
    { trigger: 'failure', consequence: 'wild_surge', severity: 'minor', probability: 0.4, mitigatable: false,
      description: 'Bad puns create unpredictable effects' },
    { trigger: 'overuse', consequence: 'mishap', severity: 'minor', probability: 0.3, mitigatable: true,
      description: 'Too many puns cause reality to punish you with worse puns' },
  ],

  acquisitionMethods: [
    {
      method: 'born',
      rarity: 'common',  // Everyone in Xanth can pun
      voluntary: false,
      grantsAccess: ['punergy'],
      startingProficiency: 20,
      description: 'Born in a pun-based reality',
    },
  ],

  availableTechniques: ['create', 'transform', 'perceive'],
  availableForms: ['plant', 'animal', 'body', 'image'],

  powerScaling: 'linear',
  powerCeiling: 80,
  allowsGroupCasting: true,  // Pun wars
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true,  // Pun objects exist naturally
  persistsAfterDeath: true,  // Puns are eternal
  allowsTeaching: true,  // Puns can be taught
  allowsScrolls: true,  // Pun books exist
  foreignMagicPolicy: 'transforms',  // Everything becomes punny
};

// ============================================================================
// Wild Magic
// ============================================================================

/**
 * Wild Magic Paradigm - Chaotic, unpredictable magic
 */
export const WILD_PARADIGM: MagicParadigm = {
  id: 'wild',
  name: 'Wild Magic',
  description: 'Chaotic magic that does unpredictable things',
  universeIds: ['chaos_realms', 'wild_zones'],

  lore: `In places where the fabric of reality is thin, magic runs wild. Spells
don't do what they're supposed to. Random effects cascade. Colors taste
like sounds. Wild mages learn to ride the chaos rather than control it,
surfing the waves of probability and hoping for the best.`,

  sources: [
    {
      id: 'chaos',
      name: 'Chaotic Essence',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: 0.1,  // Chaos is everywhere
      storable: false,  // Cannot contain chaos
      transferable: false,
      stealable: false,
      detectability: 'obvious',  // Wild magic is very obvious
      description: 'The raw stuff of chaos',
    },
  ],

  costs: [
    {
      type: 'luck',
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'time',
      visibility: 'hidden',
    },
    {
      type: 'sanity',
      canBeTerminal: true,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'subtle',
    },
  ],

  channels: [
    { type: 'emotion', requirement: 'enhancing', canBeMastered: false, blockEffect: 'no_effect' },
  ],

  laws: [
    {
      id: 'entropy_rules',
      name: 'Entropy Rules',
      type: 'entropy',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Wild magic always increases chaos',
    },
    {
      id: 'no_control',
      name: 'Uncontrollable',
      type: 'paradox',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 5.0,
      description: 'Attempting precise control invites worse chaos',
    },
  ],

  risks: [
    { trigger: 'wild_magic', consequence: 'wild_surge', severity: 'moderate', probability: 0.8, mitigatable: false,
      description: 'Random magical effects occur constantly' },
    { trigger: 'failure', consequence: 'target_swap', severity: 'minor', probability: 0.5, mitigatable: false,
      description: 'Spells hit random targets' },
    { trigger: 'critical_failure', consequence: 'mutation', severity: 'severe', probability: 0.2, mitigatable: false,
      description: 'Major failures cause permanent random changes' },
  ],

  acquisitionMethods: [
    {
      method: 'awakening',
      rarity: 'uncommon',
      voluntary: false,
      grantsAccess: ['chaos'],
      startingProficiency: 0,  // No real proficiency in chaos
      description: 'Exposure to wild magic zones',
    },
    {
      method: 'infection',
      rarity: 'common',
      voluntary: false,
      grantsAccess: ['chaos'],
      startingProficiency: 10,
      description: 'Caught wild magic like a disease',
    },
  ],

  availableTechniques: ['create', 'destroy', 'transform'],  // Basic only
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image', 'void', 'time', 'space'],  // Any form

  powerScaling: 'exponential',  // Wild magic can be very powerful
  powerCeiling: undefined,  // No limit, but no control either
  allowsGroupCasting: true,  // Makes things MORE chaotic
  groupCastingMultiplier: 0.5,  // But less controlled
  allowsEnchantment: false,  // Cannot control enough to enchant
  persistsAfterDeath: true,  // Chaos lingers
  allowsTeaching: false,  // Cannot teach chaos
  allowsScrolls: false,  // Scrolls would catch fire
  foreignMagicPolicy: 'absorbs',  // Corrupts all magic into wild magic
};

// ============================================================================
// Whimsical Registry
// ============================================================================

export const WHIMSICAL_PARADIGM_REGISTRY: Record<string, MagicParadigm> = {
  talent: TALENT_PARADIGM,
  narrative: NARRATIVE_PARADIGM,
  pun: PUN_PARADIGM,
  wild: WILD_PARADIGM,
};

// ============================================================================
// LLM Generation Support
// ============================================================================

/** Request for LLM to generate magic content */
export interface ProceduralMagicRequest {
  type: 'spell' | 'talent' | 'paradigm' | 'artifact' | 'pun' | 'narrative_rule';
  paradigmContext?: string;  // Which paradigm this is for
  constraints?: string[];     // What rules to follow
  flavor?: string;            // Tone/style hints
  powerLevel?: 'weak' | 'moderate' | 'strong' | 'legendary';
  themes?: string[];          // Themes to incorporate
}

/** LLM-generated spell */
export interface GeneratedSpell {
  name: string;
  description: string;
  technique: MagicTechnique;
  form: MagicForm;
  manaCost: number;
  castTime: number;
  range: number;
  duration?: number;
  effects: string[];
  sideEffects?: string[];
  lore?: string;
}

/** LLM-generated paradigm */
export interface GeneratedParadigm {
  name: string;
  description: string;
  lore: string;
  themes: string[];
  sources: string[];
  costs: string[];
  channels: string[];
  laws: string[];
  risks: string[];
  acquisitionMethods: string[];
  uniqueFeatures: string[];
}

// ============================================================================
// Prompt Templates for LLM Generation
// ============================================================================

/**
 * Generate a prompt for creating a new spell.
 */
export function generateSpellPrompt(request: ProceduralMagicRequest): string {
  return `Generate a magic spell for a fantasy game.

Context:
- Paradigm: ${request.paradigmContext ?? 'general fantasy'}
- Power Level: ${request.powerLevel ?? 'moderate'}
- Themes: ${request.themes?.join(', ') ?? 'none specified'}
- Flavor: ${request.flavor ?? 'standard fantasy'}

Constraints:
${request.constraints?.map(c => `- ${c}`).join('\n') ?? '- None'}

Please respond with a JSON object containing:
{
  "name": "spell name",
  "description": "what the spell does",
  "technique": "create|destroy|transform|perceive|control|protect|enhance|summon",
  "form": "fire|water|earth|air|body|mind|spirit|plant|animal|image|void|time|space",
  "manaCost": number,
  "castTime": number (in ticks, 20 = 1 second),
  "range": number (in tiles),
  "duration": number or null (in ticks),
  "effects": ["effect 1", "effect 2"],
  "sideEffects": ["optional side effect"],
  "lore": "background story for the spell"
}`;
}

/**
 * Generate a prompt for creating a new paradigm.
 */
export function generateParadigmPrompt(request: ProceduralMagicRequest): string {
  return `Create a new magic system/paradigm for a fantasy game multiverse.

Requirements:
- The magic system should feel distinct and internally consistent
- It should have clear costs, limitations, and risks
- It should have interesting lore explaining how it works
- Themes: ${request.themes?.join(', ') ?? 'create something unique'}
- Flavor: ${request.flavor ?? 'standard fantasy'}

Please respond with a JSON object containing:
{
  "name": "paradigm name",
  "description": "brief description",
  "lore": "detailed background (2-3 paragraphs)",
  "themes": ["theme1", "theme2"],
  "sources": ["where magic comes from"],
  "costs": ["what magic costs to use"],
  "channels": ["how magic is shaped/cast"],
  "laws": ["fundamental rules that can't be broken"],
  "risks": ["dangers of using this magic"],
  "acquisitionMethods": ["how one becomes a practitioner"],
  "uniqueFeatures": ["what makes this paradigm special"]
}`;
}

/**
 * Generate a prompt for creating a unique talent (Xanth-style).
 */
export function generateTalentPrompt(request: ProceduralMagicRequest): string {
  return `Create a unique magical talent for a character in a fantasy game.

In this world, every person is born with exactly ONE magical talent, never repeated.
Talents range from mundane (changing fingernail color) to magician-class (reality warping).

Requirements:
- Talent should be UNIQUE - never seen before
- Power Level: ${request.powerLevel ?? 'moderate'}
- Themes: ${request.themes?.join(', ') ?? 'any'}
${request.constraints?.length ? `Constraints:\n${request.constraints.map(c => `- ${c}`).join('\n')}` : ''}

Please respond with a JSON object containing:
{
  "name": "talent name",
  "description": "what the talent does",
  "tier": "mundane|minor|moderate|major|magician_class",
  "effects": [{"type": "transform|create|perceive|control|enhance|protect|other", "target": "what it affects", "effect": "what happens"}],
  "limitations": ["limitation 1", "limitation 2"],
  "usageLimit": "unlimited|once_per_day|once_per_hour|exhausting|one_time",
  "visibility": "invisible|subtle|obvious|spectacular",
  "improvable": true/false,
  "quirk": "optional humorous or ironic note"
}`;
}

// ============================================================================
// Parsers for LLM Output
// ============================================================================

/**
 * Parse a generated spell from LLM output.
 */
export function parseGeneratedSpell(json: unknown): GeneratedSpell {
  const data = json as Record<string, unknown>;

  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Generated spell missing required field: name');
  }
  if (!data.description || typeof data.description !== 'string') {
    throw new Error('Generated spell missing required field: description');
  }
  if (!data.technique || typeof data.technique !== 'string') {
    throw new Error('Generated spell missing required field: technique');
  }
  if (!data.form || typeof data.form !== 'string') {
    throw new Error('Generated spell missing required field: form');
  }

  return {
    name: data.name as string,
    description: data.description as string,
    technique: data.technique as MagicTechnique,
    form: data.form as MagicForm,
    manaCost: typeof data.manaCost === 'number' ? data.manaCost : 10,
    castTime: typeof data.castTime === 'number' ? data.castTime : 20,
    range: typeof data.range === 'number' ? data.range : 5,
    duration: typeof data.duration === 'number' ? data.duration : undefined,
    effects: Array.isArray(data.effects) ? data.effects.map(String) : [],
    sideEffects: Array.isArray(data.sideEffects) ? data.sideEffects.map(String) : undefined,
    lore: typeof data.lore === 'string' ? data.lore : undefined,
  };
}

/**
 * Parse a generated paradigm from LLM output.
 */
export function parseGeneratedParadigm(json: unknown): GeneratedParadigm {
  const data = json as Record<string, unknown>;

  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Generated paradigm missing required field: name');
  }
  if (!data.description || typeof data.description !== 'string') {
    throw new Error('Generated paradigm missing required field: description');
  }

  return {
    name: data.name as string,
    description: data.description as string,
    lore: typeof data.lore === 'string' ? data.lore : '',
    themes: Array.isArray(data.themes) ? data.themes.map(String) : [],
    sources: Array.isArray(data.sources) ? data.sources.map(String) : [],
    costs: Array.isArray(data.costs) ? data.costs.map(String) : [],
    channels: Array.isArray(data.channels) ? data.channels.map(String) : [],
    laws: Array.isArray(data.laws) ? data.laws.map(String) : [],
    risks: Array.isArray(data.risks) ? data.risks.map(String) : [],
    acquisitionMethods: Array.isArray(data.acquisitionMethods) ? data.acquisitionMethods.map(String) : [],
    uniqueFeatures: Array.isArray(data.uniqueFeatures) ? data.uniqueFeatures.map(String) : [],
  };
}
