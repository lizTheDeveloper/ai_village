/**
 * Creative Magic Paradigms
 *
 * Unique and unconventional magic systems from fiction and creative concepts.
 * Each paradigm has distinct mechanics, costs, and thematic coherence.
 *
 * Categories:
 * - Fiction-inspired: Sympathy, Allomancy, Dream, Song, Rune
 * - Conceptually weird: Debt, Bureaucratic, Luck, Threshold, Belief, Consumption,
 *                      Silence, Paradox, Echo, Game, Craft, Commerce
 * - Seasonal/Cyclical: Lunar, Seasonal, Age
 * - Spiritual: Shinto
 */

import type { MagicParadigm } from './MagicParadigm.js';

// ============================================================================
// FICTION-INSPIRED PARADIGMS
// ============================================================================

/**
 * SYMPATHY PARADIGM (Kingkiller Chronicle)
 *
 * Magic based on creating connections between similar objects.
 * What affects one affects the other through sympathetic links.
 *
 * Core Mechanic: Similarity creates linkage strength
 * Cost: Mental energy, binding strain
 * Danger: Link backlash, feedback loops
 */
export const SYMPATHY_PARADIGM: MagicParadigm = {
  id: 'sympathy',
  name: 'Sympathy',
  description: 'Create connections between similar objects; what affects one affects the other',
  universeIds: ['kingkiller'],
  lore: 'The art of creating sympathetic links between objects based on similarity. The more similar two things are, the stronger the connection. Hair and blood create the strongest links to their owners.',

  sources: [
    {
      id: 'sympathy_alar',
      name: 'Alar',
      type: 'internal',
      regeneration: 'rest',
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
      description: 'Mental focus and willpower for maintaining sympathetic links',
    },
  ],

  costs: [
    { type: 'stamina', canBeTerminal: false, cumulative: true, recoverable: true, recoveryMethod: 'rest', visibility: 'subtle' },
    { type: 'sanity', canBeTerminal: false, cumulative: true, recoverable: true, recoveryMethod: 'rest', visibility: 'subtle' },
  ],

  channels: [
    { type: 'will', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting', description: 'Mental focus (Alar)' },
    { type: 'focus', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting', description: 'Concentration on the binding' },
    { type: 'material', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting', description: 'Link objects needed' },
  ],

  laws: [
    { id: 'similarity', name: 'Law of Similarity', type: 'similarity', strictness: 'absolute', canBeCircumvented: false, description: 'Link strength depends on similarity' },
    { id: 'conservation', name: 'Conservation of Energy', type: 'conservation', strictness: 'absolute', canBeCircumvented: false, description: 'Energy cannot be created' },
    { id: 'contagion', name: 'Law of Contagion', type: 'contagion', strictness: 'strong', canBeCircumvented: false, description: 'Things that touched remain connected' },
  ],

  risks: [
    { trigger: 'overuse', consequence: 'backlash', severity: 'severe', probability: 0.3, mitigatable: true, mitigationSkill: 'alar_mastery', description: 'Binder\'s chills from overextension' },
    { trigger: 'overuse', consequence: 'burnout', severity: 'moderate', probability: 0.2, mitigatable: true, description: 'Mental exhaustion from maintaining multiple bindings' },
    { trigger: 'split_alar', consequence: 'feedback_loop', severity: 'catastrophic', probability: 0.1, mitigatable: false, description: 'Split focus causes catastrophic feedback' },
  ],

  acquisitionMethods: [
    { method: 'study', rarity: 'uncommon', voluntary: true, prerequisites: ['university_access'], grantsAccess: ['sympathy_alar'], startingProficiency: 15, description: 'University training in sympathy' },
    { method: 'training', rarity: 'common', voluntary: true, prerequisites: ['strong_alar'], grantsAccess: ['sympathy_alar'], startingProficiency: 10, description: 'Apprenticeship with a sympathist' },
  ],

  availableTechniques: ['create', 'destroy', 'transform', 'control'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind'],

  forbiddenCombinations: [
    { technique: 'create', form: 'spirit', reason: 'Cannot create sympathy with souls', consequence: 'Soul damage to both parties' },
  ],

  resonantCombinations: [
    { technique: 'control', form: 'fire', bonusEffect: 'Heat transfer through links', powerMultiplier: 1.5 },
  ],

  powerScaling: 'logarithmic',
  powerCeiling: 100,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['academic'],
  conflictingParadigms: ['pact', 'divine'],
};

/**
 * ALLOMANCY PARADIGM (Mistborn)
 *
 * Magic from swallowing and "burning" specific metals for powers.
 * Each metal grants a unique, specific ability.
 *
 * Core Mechanic: Metal consumption = power source
 * Cost: Metal reserves, genetic compatibility
 * Danger: Metal toxicity, flaring exhaustion
 */
export const ALLOMANCY_PARADIGM: MagicParadigm = {
  id: 'allomancy',
  name: 'Allomancy',
  description: 'Swallow metals and burn them internally for specific powers',
  universeIds: ['scadrial'],
  lore: 'The Metallic Arts. Mistings burn a single metal; Mistborn burn all sixteen. Iron Pulls, Steel Pushes, Tin enhances senses, Pewter grants strength. Flaring intensifies effects but depletes reserves.',

  sources: [
    {
      type: 'material',
      regeneration: 'consumption',
      detectability: 'undetectable',
      storable: true, // Metal vials
      transferable: true, // Can share metals
      stealable: false, // Must ingest
    },
  ] as any[],

  costs: [
    { type: 'material', baseAmount: 1, powerMultiplier: 3.0 }, // Metal consumed
    { type: 'stamina', baseAmount: 5, powerMultiplier: 1.5 }, // Flaring cost
  ] as any[],

  channels: [
    { name: 'consumption', requirement: 'required' }, // Must swallow metal
    { name: 'will', requirement: 'required' }, // Must mentally "burn"
  ] as any[],

  laws: [
    { type: 'equivalent_exchange', strength: 'absolute', circumventable: false },
    { type: 'conservation', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'exhaustion', severity: 'moderate', probability: 0.4, mitigatable: true },
    { trigger: 'corruption', consequence: 'metal_poisoning', severity: 'severe', probability: 0.2, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'bloodline', rarity: 'rare' },
    { method: 'gift', rarity: 'very_rare' }, // From Preservation/Harmony
  ] as any[],

  availableTechniques: ['create', 'destroy', 'control', 'enhance', 'perceive'],
  availableForms: ['body', 'mind', 'void'], // Simplified - each metal is specific

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'enhance', form: 'body', bonusEffect: 'Pewter strength', powerMultiplier: 2.0 },
    { technique: 'perceive', form: 'mind', bonusEffect: 'Tin senses', powerMultiplier: 2.0 },
  ] as any[],

  powerScaling: 'step', // Each metal is distinct power level
  powerCeiling: 200, // Mistborn are extremely powerful
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false, // Must be born with it
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: [],
  conflictingParadigms: [],
  foreignMagicEffect: 'coexistent' as any,
};

/**
 * DREAM MAGIC PARADIGM
 *
 * Magic that operates in the dream realm.
 * Enter, manipulate, and steal from dreams.
 *
 * Core Mechanic: Dreams are real, malleable spaces
 * Cost: Sleep debt, sanity, reality confusion
 * Danger: Lost in dreams, nightmares, sleep paralysis
 */
export const DREAM_PARADIGM: MagicParadigm = {
  id: 'dream_magic',
  name: 'Dream Magic',
  description: 'Enter, manipulate, and steal from the dreams of others',
  universeIds: ['dreamlands'],
  lore: 'The Dreaming is a realm as real as waking. Dream walkers navigate sleeping minds, steal ideas, plant suggestions, and fight nightmares. Too long in dreams and you may never wake.',

  sources: [
    {
      type: 'emotional',
      regeneration: 'rest',
      detectability: 'undetectable',
      storable: false,
      transferable: false,
      stealable: true, // Can steal dream energy
    },
  ] as any[],

  costs: [
    { type: 'sanity', baseAmount: 10, powerMultiplier: 2.0 },
    { type: 'memory', baseAmount: 5, powerMultiplier: 1.5 },
    { type: 'time', baseAmount: 8, powerMultiplier: 1.0 }, // Hours asleep
  ] as any[],

  channels: [
    { name: 'dream', requirement: 'required' },
    { name: 'meditation', requirement: 'enhancing' },
    { name: 'emotion', requirement: 'enhancing' },
  ] as any[],

  laws: [
    { type: 'belief', strength: 'strong', circumventable: true },
    { type: 'narrative', strength: 'strong', circumventable: false },
    { type: 'witness', strength: 'weak', circumventable: true },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'cannot_wake', severity: 'catastrophic', probability: 0.15, mitigatable: true },
    { trigger: 'failure', consequence: 'nightmare_intrusion', severity: 'severe', probability: 0.3, mitigatable: false },
    { trigger: 'exhaustion', consequence: 'reality_confusion', severity: 'moderate', probability: 0.4, mitigatable: true },
  ] as any[],

  acquisitionMethods: [
    { method: 'meditation', rarity: 'uncommon' },
    { method: 'awakening', rarity: 'rare' },
    { method: 'contract', rarity: 'rare' }, // Deal with dream entities
  ] as any[],

  availableTechniques: ['create', 'transform', 'perceive', 'control'],
  availableForms: ['mind', 'image', 'spirit'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'Cannot permanently destroy dream selves' },
  ] as any[],

  resonantCombinations: [
    { technique: 'create', form: 'image', bonusEffect: 'Vivid dream constructs', powerMultiplier: 1.8 },
  ] as any[],

  powerScaling: 'exponential',
  powerCeiling: 150,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0, // Shared dreams are powerful
  allowsEnchantment: false,
  persistsAfterDeath: true, // Dreams persist
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['emotional'],
  conflictingParadigms: ['academic'],
  foreignMagicEffect: 'weakened' as any,
};

/**
 * SONG MAGIC PARADIGM
 *
 * Magic through melodies, rhythms, and harmonies.
 * Music shapes reality directly.
 *
 * Core Mechanic: Specific songs = specific effects
 * Cost: Voice strain, performance time
 * Danger: Discordance, broken voices, cacophony
 */
export const SONG_PARADIGM: MagicParadigm = {
  id: 'song_magic',
  name: 'Song Magic',
  description: 'Melodies and rhythms shape reality through musical performance',
  universeIds: ['melodia'],
  lore: 'The First Song still echoes through creation. Those who learn its fragments can reshape reality through music. Each note matters; a single wrong pitch can shatter the spell.',

  sources: [
    {
      type: 'knowledge',
      regeneration: 'rest',
      detectability: 'obvious', // Music is heard
      storable: true, // Song sheets
      transferable: true, // Can teach songs
      stealable: true, // Can memorize songs
    },
  ] as any[],

  costs: [
    { type: 'stamina', baseAmount: 15, powerMultiplier: 2.0 }, // Vocal strain
    { type: 'time', baseAmount: 3, powerMultiplier: 1.5 }, // Performance duration
  ] as any[],

  channels: [
    { name: 'musical', requirement: 'required' },
    { name: 'verbal', requirement: 'required' },
    { name: 'emotion', requirement: 'enhancing' },
  ] as any[],

  laws: [
    { type: 'resonance', strength: 'absolute', circumventable: false },
    { type: 'narrative', strength: 'strong', circumventable: false },
    { type: 'witness', strength: 'weak', circumventable: true },
  ] as any[],

  risks: [
    { trigger: 'failure', consequence: 'discordance', severity: 'moderate', probability: 0.3, mitigatable: true },
    { trigger: 'overuse', consequence: 'voice_loss', severity: 'severe', probability: 0.2, mitigatable: true },
    { trigger: 'critical_failure', consequence: 'cacophony_wave', severity: 'catastrophic', probability: 0.1, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'study', rarity: 'common' },
    { method: 'apprenticeship', rarity: 'common' },
    { method: 'gift', rarity: 'rare' }, // Natural talent
  ] as any[],

  availableTechniques: ['create', 'transform', 'enhance', 'protect', 'control'],
  availableForms: ['mind', 'body', 'image', 'air', 'water'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'enhance', form: 'mind', bonusEffect: 'Inspiring anthem', powerMultiplier: 1.6 },
    { technique: 'control', form: 'air', bonusEffect: 'Wind symphony', powerMultiplier: 1.4 },
  ] as any[],

  powerScaling: 'logarithmic',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.5, // Choirs are very powerful
  allowsEnchantment: true, // Musical instruments
  persistsAfterDeath: true, // Songs outlive singers
  allowsTeaching: true,
  allowsScrolls: true, // Sheet music
  foreignMagicPolicy: 'tolerant',
  compatibleParadigms: ['emotional', 'academic'],
  conflictingParadigms: ['silence'],
  foreignMagicEffect: 'complementary' as any,
};

/**
 * RUNE MAGIC PARADIGM
 *
 * Magic through carving or drawing specific symbols.
 * Each rune has precise meaning and power.
 *
 * Core Mechanic: Symbols encode magical instructions
 * Cost: Precision, materials, time
 * Danger: Misdrawn runes, explosive failures
 */
export const RUNE_PARADIGM: MagicParadigm = {
  id: 'rune_magic',
  name: 'Rune Magic',
  description: 'Carve or draw specific symbols to activate magical effects',
  universeIds: ['runeheim'],
  lore: 'The Old Runes predate written language. Each symbol is a word of power, a fragment of the First Language. Carve them wrong and they explode. Carve them right and reshape the world.',

  sources: [
    {
      type: 'knowledge',
      regeneration: 'none', // Runes are permanent once made
      detectability: 'obvious',
      storable: true,
      transferable: true,
      stealable: true, // Can copy runes
    },
  ] as any[],

  costs: [
    { type: 'material', baseAmount: 5, powerMultiplier: 2.0 }, // Carving materials
    { type: 'time', baseAmount: 10, powerMultiplier: 2.5 }, // Precise work
  ] as any[],

  channels: [
    { name: 'glyph', requirement: 'required' },
    { name: 'material', requirement: 'required' },
    { name: 'focus', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'true_names', strength: 'absolute', circumventable: false },
    { type: 'conservation', strength: 'strong', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'failure', consequence: 'rune_explosion', severity: 'severe', probability: 0.4, mitigatable: true },
    { trigger: 'paradox', consequence: 'wild_magic', severity: 'catastrophic', probability: 0.15, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'study', rarity: 'common' },
    { method: 'awakening', rarity: 'rare' },
  ] as any[],

  availableTechniques: ['create', 'destroy', 'protect', 'enhance'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'protect', form: 'body', bonusEffect: 'Warding runes', powerMultiplier: 1.7 },
  ] as any[],

  powerScaling: 'step',
  powerCeiling: 100,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true, // Runic items
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['academic'],
  conflictingParadigms: [],
  foreignMagicEffect: 'coexistent' as any,
};

// ============================================================================
// CONCEPTUALLY WEIRD PARADIGMS
// ============================================================================

/**
 * DEBT MAGIC PARADIGM (Fae-style)
 *
 * Being owed creates power; debts are magical currency.
 * The greater the debt, the greater the power.
 *
 * Core Mechanic: Favors and obligations = power source
 * Cost: Social capital, binding oaths
 * Danger: Debt collectors, oath violations, bankruptcy
 */
export const DEBT_PARADIGM: MagicParadigm = {
  id: 'debt_magic',
  name: 'Debt Magic',
  description: 'Being owed creates power; debts are currency and fuel for magic',
  universeIds: ['fae_courts'],
  lore: 'Among the Fae, all debts are real. Owe a favor and they own a piece of your power. Be owed and you can spend that debt like coin. The greatest lords are those owed the most.',

  sources: [
    {
      type: 'social',
      regeneration: 'none', // Must create new debts
      detectability: 'subtle',
      storable: true, // Debts persist
      transferable: true, // Can trade debts
      stealable: false, // Debts are binding
    },
  ] as any[],

  costs: [
    { type: 'favor', baseAmount: 1, powerMultiplier: 3.0 },
    { type: 'oath', baseAmount: 1, powerMultiplier: 2.0 },
  ] as any[],

  channels: [
    { name: 'verbal', requirement: 'required' }, // Spoken agreements
    { name: 'will', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'oath_binding', strength: 'absolute', circumventable: false },
    { type: 'equivalent_exchange', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'debt', consequence: 'debt_called', severity: 'catastrophic', probability: 0.3, mitigatable: false },
    { trigger: 'overuse', consequence: 'social_ruin', severity: 'severe', probability: 0.2, mitigatable: true },
  ] as any[],

  acquisitionMethods: [
    { method: 'contract', rarity: 'common' },
    { method: 'bloodline', rarity: 'uncommon' }, // Fae heritage
  ] as any[],

  availableTechniques: ['create', 'transform', 'control', 'perceive'],
  availableForms: ['mind', 'body', 'spirit'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'Cannot destroy souls owed to you' },
  ] as any[],

  resonantCombinations: [
    { technique: 'control', form: 'mind', bonusEffect: 'Debt compulsion', powerMultiplier: 2.0 },
  ] as any[],

  powerScaling: 'exponential',
  powerCeiling: 200,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: true, // Debts outlive
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'predatory',
  compatibleParadigms: ['pact'],
  conflictingParadigms: ['divine'],
  foreignMagicEffect: 'consumes' as any,
};

/**
 * BUREAUCRATIC MAGIC PARADIGM
 *
 * Paperwork, forms, stamps, and red tape have literal magical power.
 * Proper filing can alter reality.
 *
 * Core Mechanic: Correct forms = reality changes
 * Cost: Time, ink, patience, sanity
 * Danger: Lost in paperwork, form errors, audit failures
 */
export const BUREAUCRATIC_PARADIGM: MagicParadigm = {
  id: 'bureaucratic_magic',
  name: 'Bureaucratic Magic',
  description: 'Paperwork, forms, and official stamps have literal magical power',
  universeIds: ['paperpushers'],
  lore: 'Form 27-B in triplicate. Stamp here, initial there, submit to Department of Reality Alteration. Processing takes 3-5 business days. Magic through proper channels only.',

  sources: [
    {
      type: 'knowledge',
      regeneration: 'none',
      detectability: 'obvious',
      storable: true,
      transferable: true,
      stealable: true,
    },
  ] as any[],

  costs: [
    { type: 'time', baseAmount: 20, powerMultiplier: 3.0 }, // Bureaucracy is SLOW
    { type: 'material', baseAmount: 10, powerMultiplier: 1.5 }, // Ink, paper, stamps
    { type: 'sanity', baseAmount: 5, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'glyph', requirement: 'required' }, // Written forms
    { name: 'material', requirement: 'required' }, // Official paper
    { name: 'focus', requirement: 'required' }, // Attention to detail
  ] as any[],

  laws: [
    { type: 'true_names', strength: 'absolute', circumventable: false }, // Correct names on forms
    { type: 'equivalent_exchange', strength: 'strong', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'failure', consequence: 'form_rejection', severity: 'minor', probability: 0.6, mitigatable: true },
    { trigger: 'paradox', consequence: 'audit', severity: 'catastrophic', probability: 0.1, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'study', rarity: 'common' },
    { method: 'apprenticeship', rarity: 'common' }, // Clerks teaching clerks
  ] as any[],

  availableTechniques: ['create', 'transform', 'perceive'],
  availableForms: ['body', 'mind', 'image'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'No form exists for soul destruction' },
  ] as any[],

  resonantCombinations: [],

  powerScaling: 'logarithmic',
  powerCeiling: 80, // Not very powerful, but very reliable
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.2, // Committees
  allowsEnchantment: true,
  persistsAfterDeath: true, // Files are forever
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'requires_permit',
  compatibleParadigms: ['academic'],
  conflictingParadigms: ['chaos', 'wild'],
  foreignMagicEffect: 'regulated' as any,
};

/**
 * LUCK MAGIC PARADIGM
 *
 * Borrow luck from your future self.
 * Eventually it runs out catastrophically.
 *
 * Core Mechanic: Temporal luck redistribution
 * Cost: Future misfortune, karma debt
 * Danger: Catastrophic bad luck, fate backlash
 */
export const LUCK_PARADIGM: MagicParadigm = {
  id: 'luck_magic',
  name: 'Luck Magic',
  description: 'Borrow luck from your future self; eventually pays back catastrophically',
  universeIds: ['fortune_realms'],
  lore: 'Luck is a finite resource distributed across your timeline. Borrow from tomorrow to succeed today. But tomorrow always comes, and the debt compounds with interest.',

  sources: [
    {
      type: 'temporal',
      regeneration: 'passive', // Luck regenerates over time
      detectability: 'subtle',
      storable: false,
      transferable: true, // Can give luck away
      stealable: true, // Can steal luck
    },
  ] as any[],

  costs: [
    { type: 'luck', baseAmount: 10, powerMultiplier: 2.0 },
    { type: 'karma', baseAmount: 5, powerMultiplier: 3.0 }, // Future debt
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'equivalent_exchange', strength: 'absolute', circumventable: false },
    { type: 'balance', strength: 'absolute', circumventable: false },
    { type: 'entropy', strength: 'strong', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'catastrophic_misfortune', severity: 'catastrophic', probability: 0.5, mitigatable: false },
    { trigger: 'debt', consequence: 'fate_backlash', severity: 'severe', probability: 0.4, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'rare' },
    { method: 'contract', rarity: 'uncommon' }, // Deal with fate entities
  ] as any[],

  availableTechniques: ['enhance', 'perceive', 'protect'],
  availableForms: ['mind', 'body'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'enhance', form: 'body', bonusEffect: 'Improbable dodges', powerMultiplier: 1.8 },
  ] as any[],

  powerScaling: 'exponential',
  powerCeiling: 150,
  allowsGroupCasting: false, // Luck is personal
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true, // Lucky charms
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: [],
  conflictingParadigms: ['fate', 'divine'],
  foreignMagicEffect: 'interferes' as any,
};

/**
 * THRESHOLD MAGIC PARADIGM
 *
 * Doorways, crossroads, and boundaries are sources of power.
 * Liminal spaces hold magic.
 *
 * Core Mechanic: Power in transitions and boundaries
 * Cost: Must be at thresholds, requires passage
 * Danger: Stuck between, lost in transition
 */
export const THRESHOLD_PARADIGM: MagicParadigm = {
  id: 'threshold_magic',
  name: 'Threshold Magic',
  description: 'Doorways, crossroads, and boundaries are sources of magical power',
  universeIds: ['liminal_realms'],
  lore: 'Between day and night, between worlds, between life and death - the in-between places hold power. Stand at a threshold and you stand everywhere. Cross it wrong and you may never cross back.',

  sources: [
    {
      type: 'ambient',
      regeneration: 'none', // Must find new thresholds
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ] as any[],

  costs: [
    { type: 'mana', baseAmount: 15, powerMultiplier: 2.0 },
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
    { name: 'material', requirement: 'required' }, // Must touch threshold
  ] as any[],

  laws: [
    { type: 'threshold', strength: 'absolute', circumventable: false },
    { type: 'consent', strength: 'strong', circumventable: true }, // Invitation matters
  ] as any[],

  risks: [
    { trigger: 'failure', consequence: 'stuck_between', severity: 'severe', probability: 0.3, mitigatable: true },
    { trigger: 'critical_failure', consequence: 'lost_in_transition', severity: 'catastrophic', probability: 0.15, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'uncommon' },
    { method: 'study', rarity: 'rare' },
  ] as any[],

  availableTechniques: ['create', 'control', 'perceive', 'summon'],
  availableForms: ['space', 'spirit', 'void'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'summon', form: 'spirit', bonusEffect: 'Gateway summoning', powerMultiplier: 2.0 },
    { technique: 'control', form: 'space', bonusEffect: 'Portal creation', powerMultiplier: 1.8 },
  ] as any[],

  powerScaling: 'step',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true, // Enchanted doors
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'gateway',
  compatibleParadigms: ['spatial'],
  conflictingParadigms: [],
  foreignMagicEffect: 'filters_through' as any,
};

/**
 * BELIEF MAGIC PARADIGM
 *
 * If enough people believe something, it becomes true.
 * Collective faith shapes reality.
 *
 * Core Mechanic: Believers = power source
 * Cost: Requires followers, faith management
 * Danger: Loss of belief, heresy, disillusionment
 */
export const BELIEF_PARADIGM: MagicParadigm = {
  id: 'belief_magic',
  name: 'Belief Magic',
  description: 'If enough people believe something, it becomes true',
  universeIds: ['thoughtforms'],
  lore: 'Reality is consensus. Gods exist because people believe in them. Myths become real when enough people tell the story. Lose your believers and you fade from existence.',

  sources: [
    {
      type: 'social',
      regeneration: 'prayer', // Believers sustain you
      detectability: 'obvious',
      storable: false,
      transferable: false,
      stealable: true, // Can convert believers
    },
  ] as any[],

  costs: [
    { type: 'faith', baseAmount: 10, powerMultiplier: 2.0 },
    { type: 'attention', baseAmount: 5, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
    { name: 'prayer', requirement: 'enhancing' },
  ] as any[],

  laws: [
    { type: 'belief', strength: 'absolute', circumventable: false },
    { type: 'narrative', strength: 'strong', circumventable: false },
    { type: 'witness', strength: 'strong', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'faith_crisis', severity: 'severe', probability: 0.3, mitigatable: true },
    { trigger: 'attention', consequence: 'heresy_movement', severity: 'catastrophic', probability: 0.2, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'prayer', rarity: 'common' },
    { method: 'awakening', rarity: 'rare' },
  ] as any[],

  availableTechniques: ['create', 'transform', 'enhance'],
  availableForms: ['mind', 'spirit', 'image', 'body'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'create', form: 'spirit', bonusEffect: 'Tulpa creation', powerMultiplier: 2.0 },
  ] as any[],

  powerScaling: 'exponential',
  powerCeiling: 300, // Extremely powerful with many believers
  allowsGroupCasting: true,
  groupCastingMultiplier: 3.0, // Mass belief is very powerful
  allowsEnchantment: true,
  persistsAfterDeath: true, // Ideas outlive originators
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'absorbs',
  compatibleParadigms: ['divine'],
  conflictingParadigms: ['academic'],
  foreignMagicEffect: 'adapts_to_belief' as any,
};

/**
 * CONSUMPTION MAGIC PARADIGM
 *
 * Eat something to temporarily gain its properties.
 * You are what you eat, literally.
 *
 * Core Mechanic: Ingestion = temporary transformation
 * Cost: Digestion, transformation strain
 * Danger: Incomplete digestion, permanent changes
 */
export const CONSUMPTION_PARADIGM: MagicParadigm = {
  id: 'consumption_magic',
  name: 'Consumption Magic',
  description: 'Eat something to gain its properties temporarily',
  universeIds: ['gourmands'],
  lore: 'Eat a bear, gain its strength. Eat fire, breathe flame. Eat a memory, know the past. But digest slowly, or the transformation becomes permanent. You are what you eat.',

  sources: [
    {
      type: 'material',
      regeneration: 'consumption',
      detectability: 'obvious',
      storable: false,
      transferable: true, // Can share food
      stealable: true,
    },
  ] as any[],

  costs: [
    { type: 'material', baseAmount: 5, powerMultiplier: 2.0 },
    { type: 'stamina', baseAmount: 10, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'consumption', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'contagion', strength: 'absolute', circumventable: false },
    { type: 'equivalent_exchange', strength: 'strong', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'permanent_transformation', severity: 'severe', probability: 0.3, mitigatable: true },
    { trigger: 'corruption', consequence: 'digestion_failure', severity: 'catastrophic', probability: 0.2, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'uncommon' },
    { method: 'bloodline', rarity: 'rare' },
  ] as any[],

  availableTechniques: ['transform', 'enhance', 'perceive'],
  availableForms: ['body', 'animal', 'plant', 'fire', 'water', 'earth', 'air'],

  forbiddenCombinations: [
    { technique: 'transform', form: 'spirit', reason: 'Cannot digest souls' },
  ] as any[],

  resonantCombinations: [
    { technique: 'enhance', form: 'body', bonusEffect: 'Predator strength', powerMultiplier: 1.8 },
  ] as any[],

  powerScaling: 'linear',
  powerCeiling: 100,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['nature', 'blood_magic'],
  conflictingParadigms: [],
  foreignMagicEffect: 'coexistent' as any,
};

/**
 * SILENCE MAGIC PARADIGM
 *
 * Power in the absence of sound.
 * The louder the environment, the weaker the magic.
 *
 * Core Mechanic: Silence = power source
 * Cost: Requires quiet, forbids speech
 * Danger: Deafness, eternal silence, sound sickness
 */
export const SILENCE_PARADIGM: MagicParadigm = {
  id: 'silence_magic',
  name: 'Silence Magic',
  description: 'Power in the absence of sound; louder environments weaken magic',
  universeIds: ['quiet_places'],
  lore: 'Before the first word was spoken, there was Silence. It remembers. In perfect quiet, reality listens. Speak and the power fades. Shout and it vanishes entirely.',

  sources: [
    {
      type: 'ambient',
      regeneration: 'passive',
      detectability: 'undetectable', // Silent by nature
      storable: false,
      transferable: false,
      stealable: false,
    },
  ] as any[],

  costs: [
    { type: 'mana', baseAmount: 10, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
    { name: 'meditation', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'secrecy', strength: 'absolute', circumventable: false }, // Cannot speak of it
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'permanent_silence', severity: 'severe', probability: 0.3, mitigatable: false },
    { trigger: 'failure', consequence: 'deafness', severity: 'moderate', probability: 0.2, mitigatable: true },
  ] as any[],

  acquisitionMethods: [
    { method: 'meditation', rarity: 'uncommon' },
    { method: 'gift', rarity: 'rare' },
  ] as any[],

  availableTechniques: ['destroy', 'protect', 'perceive', 'control'],
  availableForms: ['mind', 'air', 'void'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'destroy', form: 'air', bonusEffect: 'Sound nullification', powerMultiplier: 2.0 },
  ] as any[],

  powerScaling: 'logarithmic',
  powerCeiling: 100,
  allowsGroupCasting: false, // Silence is solitary
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: false, // Cannot speak to teach
  allowsScrolls: false, // Cannot write about it
  foreignMagicPolicy: 'hostile',
  compatibleParadigms: [],
  conflictingParadigms: ['song_magic', 'verbal'],
  foreignMagicEffect: 'mutes' as any,
};

/**
 * PARADOX MAGIC PARADIGM
 *
 * Exploit logical contradictions to break reality.
 * Dangerous and unpredictable.
 *
 * Core Mechanic: Contradictions = power source
 * Cost: Sanity, reality stability
 * Danger: Paradox collapse, reality tears, madness
 */
export const PARADOX_PARADIGM: MagicParadigm = {
  id: 'paradox_magic',
  name: 'Paradox Magic',
  description: 'Exploit logical contradictions to break reality temporarily',
  universeIds: ['contradiction_realms'],
  lore: 'This statement is false. A barber shaves all who do not shave themselves. What happens when reality encounters a paradox? It breaks. Briefly. Use that crack.',

  sources: [
    {
      type: 'void',
      regeneration: 'none',
      detectability: 'beacon',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ] as any[],

  costs: [
    { type: 'sanity', baseAmount: 20, powerMultiplier: 3.0 },
    { type: 'corruption', baseAmount: 10, powerMultiplier: 2.0 },
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'paradox', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'paradox', consequence: 'reality_tear', severity: 'catastrophic', probability: 0.5, mitigatable: false },
    { trigger: 'failure', consequence: 'madness', severity: 'severe', probability: 0.4, mitigatable: false },
    { trigger: 'critical_failure', consequence: 'paradox_spirit', severity: 'catastrophic', probability: 0.2, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'very_rare' },
    { method: 'stolen', rarity: 'very_rare' },
  ] as any[],

  availableTechniques: ['create', 'destroy', 'transform'],
  availableForms: ['void', 'time', 'space'],

  forbiddenCombinations: [],
  resonantCombinations: [],

  powerScaling: 'exponential',
  powerCeiling: 500, // Extremely powerful but extremely dangerous
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false, // Too dangerous
  allowsScrolls: false,
  foreignMagicPolicy: 'annihilates',
  compatibleParadigms: [],
  conflictingParadigms: ['all'],
  foreignMagicEffect: 'destroys' as any,
};

/**
 * ECHO MAGIC PARADIGM
 *
 * Use memories and residual impressions of past events.
 * History echoes and can be replayed.
 *
 * Core Mechanic: Past events leave magical imprints
 * Cost: Memory loss, temporal confusion
 * Danger: Lost in the past, echo loops
 */
export const ECHO_PARADIGM: MagicParadigm = {
  id: 'echo_magic',
  name: 'Echo Magic',
  description: 'Use memories and residual impressions of past events as power',
  universeIds: ['memory_realms'],
  lore: 'Every action leaves an echo. Every word spoken still vibrates somewhere. Echo mages hear the past and can replay it, reshape it, even step into it. But the past pulls at you.',

  sources: [
    {
      type: 'temporal',
      regeneration: 'none', // Past is finite
      detectability: 'subtle',
      storable: true,
      transferable: true,
      stealable: true,
    },
  ] as any[],

  costs: [
    { type: 'memory', baseAmount: 10, powerMultiplier: 2.0 },
    { type: 'time', baseAmount: 5, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
    { name: 'meditation', requirement: 'enhancing' },
  ] as any[],

  laws: [
    { type: 'contagion', strength: 'strong', circumventable: false },
    { type: 'cycles', strength: 'strong', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'lost_in_past', severity: 'severe', probability: 0.3, mitigatable: true },
    { trigger: 'failure', consequence: 'echo_loop', severity: 'moderate', probability: 0.2, mitigatable: true },
  ] as any[],

  acquisitionMethods: [
    { method: 'meditation', rarity: 'uncommon' },
    { method: 'awakening', rarity: 'rare' },
  ] as any[],

  availableTechniques: ['perceive', 'create', 'transform'],
  availableForms: ['mind', 'image', 'time'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'time', reason: 'Cannot erase the past' },
  ] as any[],

  resonantCombinations: [
    { technique: 'perceive', form: 'time', bonusEffect: 'Perfect recall', powerMultiplier: 1.8 },
  ] as any[],

  powerScaling: 'linear',
  powerCeiling: 100,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5, // Shared memories
  allowsEnchantment: true,
  persistsAfterDeath: true, // Memories persist
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['temporal'],
  conflictingParadigms: [],
  foreignMagicEffect: 'coexistent' as any,
};

/**
 * GAME MAGIC PARADIGM
 *
 * Challenges and wagers have binding magical power.
 * Win the game, win the power.
 *
 * Core Mechanic: Stakes and rules create binding contracts
 * Cost: Must honor bets, must play fair
 * Danger: Cheaters destroyed, eternal games, losing everything
 */
export const GAME_PARADIGM: MagicParadigm = {
  id: 'game_magic',
  name: 'Game Magic',
  description: 'Challenges and wagers have binding magical power',
  universeIds: ['game_realms'],
  lore: 'Agree to the rules and reality enforces them. Bet your soul in a card game and you will lose it if you lose. Cheat and the game itself will punish you. But win fairly and claim your prize.',

  sources: [
    {
      type: 'social',
      regeneration: 'none',
      detectability: 'obvious',
      storable: false,
      transferable: true, // Can bet stakes
      stealable: false, // Must win fairly
    },
  ] as any[],

  costs: [
    { type: 'oath', baseAmount: 10, powerMultiplier: 2.0 },
  ] as any[],

  channels: [
    { name: 'verbal', requirement: 'required' }, // Must agree to rules
    { name: 'will', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'oath_binding', strength: 'absolute', circumventable: false },
    { type: 'consent', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'failure', consequence: 'lose_stakes', severity: 'catastrophic', probability: 0.5, mitigatable: false },
    { trigger: 'overreach', consequence: 'eternal_game', severity: 'catastrophic', probability: 0.2, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'uncommon' },
    { method: 'contract', rarity: 'common' },
  ] as any[],

  availableTechniques: ['create', 'control', 'perceive'],
  availableForms: ['mind', 'spirit'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'perceive', form: 'mind', bonusEffect: 'Read opponent', powerMultiplier: 1.6 },
  ] as any[],

  powerScaling: 'step',
  powerCeiling: 200,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0, // Team games
  allowsEnchantment: true, // Game pieces
  persistsAfterDeath: true, // Games outlive players
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['debt_magic', 'fae'],
  conflictingParadigms: [],
  foreignMagicEffect: 'coexistent' as any,
};

/**
 * CRAFT MAGIC PARADIGM
 *
 * The act of making things imbues them with intent and power.
 * Creation is inherently magical.
 *
 * Core Mechanic: Crafting process = enchantment
 * Cost: Time, materials, skill
 * Danger: Flawed creations, cursed items, obsession
 */
export const CRAFT_PARADIGM: MagicParadigm = {
  id: 'craft_magic',
  name: 'Craft Magic',
  description: 'The act of making things imbues them with intent and magical power',
  universeIds: ['artisan_realms'],
  lore: 'Every hammer strike is a prayer. Every woven thread a spell. Make something with intent and it becomes more than material. Master craftsmen create artifacts without knowing they practice magic.',

  sources: [
    {
      type: 'knowledge',
      regeneration: 'none',
      detectability: 'subtle',
      storable: true, // In finished items
      transferable: true,
      stealable: false, // Must craft yourself
    },
  ] as any[],

  costs: [
    { type: 'material', baseAmount: 15, powerMultiplier: 2.0 },
    { type: 'time', baseAmount: 20, powerMultiplier: 2.5 },
    { type: 'stamina', baseAmount: 10, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'material', requirement: 'required' },
    { name: 'focus', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'equivalent_exchange', strength: 'strong', circumventable: false },
    { type: 'resonance', strength: 'strong', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'failure', consequence: 'cursed_item', severity: 'moderate', probability: 0.2, mitigatable: true },
    { trigger: 'overuse', consequence: 'craft_obsession', severity: 'severe', probability: 0.15, mitigatable: true },
  ] as any[],

  acquisitionMethods: [
    { method: 'apprenticeship', rarity: 'common' },
    { method: 'study', rarity: 'common' },
  ] as any[],

  availableTechniques: ['create', 'enhance', 'protect'],
  availableForms: ['body', 'fire', 'water', 'earth', 'air'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'create', form: 'earth', bonusEffect: 'Dwarven metalwork', powerMultiplier: 1.8 },
    { technique: 'enhance', form: 'body', bonusEffect: 'Masterwork weapons', powerMultiplier: 1.6 },
  ] as any[],

  powerScaling: 'linear',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5, // Workshops
  allowsEnchantment: true,
  persistsAfterDeath: true, // Artifacts outlive makers
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['academic', 'rune'],
  conflictingParadigms: [],
  foreignMagicEffect: 'coexistent' as any,
};

/**
 * COMMERCE MAGIC PARADIGM
 *
 * Fair trade, haggling, and currency have magical power.
 * Economics is literally magic.
 *
 * Core Mechanic: Trade agreements create power
 * Cost: Must honor deals, market forces
 * Danger: Market crash, unfair trades, bankruptcy
 */
export const COMMERCE_PARADIGM: MagicParadigm = {
  id: 'commerce_magic',
  name: 'Commerce Magic',
  description: 'Fair trade, haggling, and currency have literal magical power',
  universeIds: ['merchant_realms'],
  lore: 'A deal is a deal. Shake hands and reality enforces the contract. The invisible hand of the market is actually invisible hands enforcing trades. Supply and demand shape the world.',

  sources: [
    {
      type: 'social',
      regeneration: 'none',
      detectability: 'subtle',
      storable: true, // In currency
      transferable: true,
      stealable: false, // Must trade fairly
    },
  ] as any[],

  costs: [
    { type: 'gold', baseAmount: 10, powerMultiplier: 2.0 },
    { type: 'oath', baseAmount: 5, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'verbal', requirement: 'required' }, // Negotiation
    { name: 'material', requirement: 'required' }, // Currency
  ] as any[],

  laws: [
    { type: 'equivalent_exchange', strength: 'absolute', circumventable: false },
    { type: 'consent', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'failure', consequence: 'market_crash', severity: 'severe', probability: 0.3, mitigatable: true },
    { trigger: 'overreach', consequence: 'bankruptcy', severity: 'catastrophic', probability: 0.2, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'apprenticeship', rarity: 'common' },
    { method: 'study', rarity: 'common' },
  ] as any[],

  availableTechniques: ['create', 'transform', 'perceive'],
  availableForms: ['mind', 'body', 'image'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'perceive', form: 'mind', bonusEffect: 'Read market', powerMultiplier: 1.5 },
  ] as any[],

  powerScaling: 'exponential',
  powerCeiling: 150,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0, // Merchant guilds
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'trades_with',
  compatibleParadigms: ['debt_magic'],
  conflictingParadigms: [],
  foreignMagicEffect: 'trade_for' as any,
};

// ============================================================================
// SEASONAL/CYCLICAL PARADIGMS
// ============================================================================

/**
 * LUNAR MAGIC PARADIGM
 *
 * Power waxes and wanes with the moon phases.
 * New moon = weakest, full moon = strongest.
 *
 * Core Mechanic: Moon phase determines power
 * Cost: Cyclical availability
 * Danger: Moon madness, werewolf transformation
 */
export const LUNAR_PARADIGM: MagicParadigm = {
  id: 'lunar_magic',
  name: 'Lunar Magic',
  description: 'Power waxes and wanes with moon phases; strongest at full moon',
  universeIds: ['moon_realms'],
  lore: 'The Moon pulls at more than tides. Full moon grants terrible power. New moon leaves you empty. Some say the Moon is alive and chooses who to favor.',

  sources: [
    {
      type: 'ambient',
      regeneration: 'passive',
      detectability: 'obvious',
      storable: true, // Moonlight can be bottled
      transferable: false,
      stealable: false,
    },
  ] as any[],

  costs: [
    { type: 'mana', baseAmount: 10, powerMultiplier: 1.5 },
    { type: 'sanity', baseAmount: 5, powerMultiplier: 2.0 }, // Moon madness
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
    { name: 'meditation', requirement: 'enhancing' },
  ] as any[],

  laws: [
    { type: 'cycles', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'moon_madness', severity: 'severe', probability: 0.3, mitigatable: true },
    { trigger: 'emotional', consequence: 'transformation', severity: 'catastrophic', probability: 0.1, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'uncommon' },
    { method: 'bloodline', rarity: 'rare' }, // Lycanthropy
  ] as any[],

  availableTechniques: ['create', 'transform', 'enhance', 'control'],
  availableForms: ['water', 'mind', 'body', 'animal'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'transform', form: 'body', bonusEffect: 'Lycanthropy', powerMultiplier: 2.5 },
    { technique: 'control', form: 'water', bonusEffect: 'Tide manipulation', powerMultiplier: 1.8 },
  ] as any[],

  powerScaling: 'step',
  powerCeiling: 200, // At full moon
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['nature', 'cycles'],
  conflictingParadigms: ['solar'],
  foreignMagicEffect: 'coexistent' as any,
};

/**
 * SEASONAL MAGIC PARADIGM
 *
 * Different abilities in different seasons.
 * Spring, Summer, Fall, Winter each grant unique powers.
 *
 * Core Mechanic: Season determines available magic
 * Cost: Cyclical limitations
 * Danger: Seasonal lock, eternal winter
 */
export const SEASONAL_PARADIGM: MagicParadigm = {
  id: 'seasonal_magic',
  name: 'Seasonal Magic',
  description: 'Different magical abilities in different seasons',
  universeIds: ['seasonal_realms'],
  lore: 'Spring brings growth, Summer fire, Autumn harvest, Winter death. Seasonal mages shift with the year, powerful in their season, weak outside it. Some get trapped in one season forever.',

  sources: [
    {
      type: 'ambient',
      regeneration: 'passive',
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ] as any[],

  costs: [
    { type: 'mana', baseAmount: 10, powerMultiplier: 1.5 },
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'cycles', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'seasonal_lock', severity: 'catastrophic', probability: 0.2, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'uncommon' },
    { method: 'bloodline', rarity: 'rare' }, // Fae heritage
  ] as any[],

  availableTechniques: ['create', 'destroy', 'transform', 'enhance'],
  availableForms: ['plant', 'fire', 'water', 'earth', 'air', 'body'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'create', form: 'plant', bonusEffect: 'Spring growth', powerMultiplier: 2.0 },
    { technique: 'create', form: 'fire', bonusEffect: 'Summer heat', powerMultiplier: 1.8 },
    { technique: 'destroy', form: 'plant', bonusEffect: 'Autumn harvest', powerMultiplier: 1.6 },
    { technique: 'destroy', form: 'body', bonusEffect: 'Winter death', powerMultiplier: 1.8 },
  ] as any[],

  powerScaling: 'step',
  powerCeiling: 150,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.8,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['nature', 'fae'],
  conflictingParadigms: [],
  foreignMagicEffect: 'coexistent' as any,
};

/**
 * AGE MAGIC PARADIGM
 *
 * Youth and age as spendable resources.
 * Trade years of life for power.
 *
 * Core Mechanic: Lifespan is currency
 * Cost: Aging, shortened life
 * Danger: Rapid aging, death, eternal youth curse
 */
export const AGE_PARADIGM: MagicParadigm = {
  id: 'age_magic',
  name: 'Age Magic',
  description: 'Youth and age as spendable resources; trade years for power',
  universeIds: ['temporal_realms'],
  lore: 'Years are currency. Spend a decade to cast a great spell. Steal years from others to extend your life. But spend too freely and you crumble to dust.',

  sources: [
    {
      type: 'temporal',
      regeneration: 'none', // Cannot regain lost years
      detectability: 'obvious',
      storable: false,
      transferable: true, // Can steal/give years
      stealable: true,
    },
  ] as any[],

  costs: [
    { type: 'lifespan', baseAmount: 1, powerMultiplier: 5.0 }, // Years of life
  ] as any[],

  channels: [
    { name: 'will', requirement: 'required' },
  ] as any[],

  laws: [
    { type: 'equivalent_exchange', strength: 'absolute', circumventable: false },
    { type: 'balance', strength: 'absolute', circumventable: false },
  ] as any[],

  risks: [
    { trigger: 'overuse', consequence: 'rapid_aging', severity: 'catastrophic', probability: 0.4, mitigatable: false },
    { trigger: 'failure', consequence: 'death', severity: 'catastrophic', probability: 0.3, mitigatable: false },
  ] as any[],

  acquisitionMethods: [
    { method: 'awakening', rarity: 'rare' },
    { method: 'contract', rarity: 'very_rare' },
  ] as any[],

  availableTechniques: ['create', 'destroy', 'transform', 'enhance'],
  availableForms: ['time', 'body', 'mind'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'transform', form: 'body', bonusEffect: 'Age reversal', powerMultiplier: 3.0 },
  ] as any[],

  powerScaling: 'exponential',
  powerCeiling: 300, // Extremely powerful
  allowsGroupCasting: false, // Cannot share lifespan easily
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: false, // Too dangerous
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: [],
  conflictingParadigms: ['divine', 'nature'],
  foreignMagicEffect: 'temporal_interference' as any,
};

// ============================================================================
// SPIRITUAL PARADIGM - SHINTO
// ============================================================================

/**
 * SHINTO PARADIGM
 *
 * World filled with kami (spirits) in everything.
 * Magic through honoring and appeasing spirits.
 *
 * Core Mechanic: Respect and offerings to kami
 * Cost: Offerings, rituals, purity
 * Danger: Offending kami, spiritual pollution, curse
 */
export const SHINTO_PARADIGM: MagicParadigm = {
  id: 'shinto',
  name: 'Shinto Magic',
  description: 'World filled with endless spirits (kami); magic through honoring them',
  universeIds: ['yaoyorozu'],
  lore: 'Eight million kami. Spirits in rivers, trees, stones, tools, ancestors. Honor them with offerings and rituals. Offend them and face their wrath. The world is alive and watching.',

  sources: [
    {
      type: 'ancestral',
      regeneration: 'ritual',
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ] as any[],

  costs: [
    { type: 'favor', baseAmount: 5, powerMultiplier: 1.5 },
    { type: 'material', baseAmount: 10, powerMultiplier: 2.0 }, // Offerings
  ] as any[],

  channels: [
    { name: 'prayer', requirement: 'required' },
    { name: 'material', requirement: 'required' }, // Offerings
    { name: 'glyph', requirement: 'enhancing' }, // Talismans
  ] as any[],

  laws: [
    { type: 'consent', strength: 'absolute', circumventable: false }, // Kami must agree
    { type: 'sacrifice', strength: 'strong', circumventable: false },
    { type: 'threshold', strength: 'strong', circumventable: false }, // Torii gates
  ] as any[],

  risks: [
    { trigger: 'divine_anger', consequence: 'curse', severity: 'severe', probability: 0.3, mitigatable: true },
    { trigger: 'failure', consequence: 'spiritual_pollution', severity: 'moderate', probability: 0.2, mitigatable: true },
  ] as any[],

  acquisitionMethods: [
    { method: 'study', rarity: 'common' },
    { method: 'apprenticeship', rarity: 'common' }, // Shrine maidens, priests
    { method: 'bloodline', rarity: 'uncommon' }, // Descended from kami
  ] as any[],

  availableTechniques: ['create', 'protect', 'perceive', 'enhance', 'summon'],
  availableForms: ['water', 'earth', 'plant', 'animal', 'spirit', 'body'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'Cannot destroy kami' },
  ] as any[],

  resonantCombinations: [
    { technique: 'protect', form: 'body', bonusEffect: 'Omamori charm', powerMultiplier: 1.6 },
    { technique: 'summon', form: 'spirit', bonusEffect: 'Kami invocation', powerMultiplier: 2.0 },
    { technique: 'perceive', form: 'spirit', bonusEffect: 'See kami', powerMultiplier: 1.5 },
  ] as any[],

  powerScaling: 'logarithmic',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.8, // Festival rituals
  allowsEnchantment: true, // Talismans, blessed items
  persistsAfterDeath: true, // Become kami yourself
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'tolerant',
  compatibleParadigms: ['ancestral', 'nature', 'threshold'],
  conflictingParadigms: ['void', 'blood_magic'],
  foreignMagicEffect: 'spirit_mediates' as any,
};

// ============================================================================
// EXPORTS
// ============================================================================

export const ALL_CREATIVE_PARADIGMS = [
  // Fiction
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  // Conceptually Weird
  DEBT_PARADIGM,
  BUREAUCRATIC_PARADIGM,
  LUCK_PARADIGM,
  THRESHOLD_PARADIGM,
  BELIEF_PARADIGM,
  CONSUMPTION_PARADIGM,
  SILENCE_PARADIGM,
  PARADOX_PARADIGM,
  ECHO_PARADIGM,
  GAME_PARADIGM,
  CRAFT_PARADIGM,
  COMMERCE_PARADIGM,
  // Seasonal/Cyclical
  LUNAR_PARADIGM,
  SEASONAL_PARADIGM,
  AGE_PARADIGM,
  // Spiritual
  SHINTO_PARADIGM,
];
