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

import type {
  MagicParadigm,
  MagicSource,
  MagicCost,
  MagicChannel,
  MagicLaw,
  MagicRisk,
  AcquisitionDefinition,
  ForbiddenCombination,
  ResonantCombination,
  ForeignMagicConfig,
} from './MagicParadigm.js';

// ============================================================================
// HELPER FUNCTIONS FOR CREATING PROPER OBJECTS
// ============================================================================

/**
 * Create a properly-typed MagicCost with sensible defaults.
 */
function createCost(
  type: MagicCost['type'],
  options: {
    canBeTerminal?: boolean;
    cumulative?: boolean;
    recoverable?: boolean;
    recoveryMethod?: MagicCost['recoveryMethod'];
    visibility?: MagicCost['visibility'];
  } = {}
): MagicCost {
  return {
    type,
    canBeTerminal: options.canBeTerminal ?? false,
    cumulative: options.cumulative ?? false,
    recoverable: options.recoverable ?? true,
    recoveryMethod: options.recoveryMethod ?? 'rest',
    visibility: options.visibility ?? 'hidden',
  };
}

/**
 * Create a properly-typed MagicChannel with sensible defaults.
 */
function createChannel(
  type: MagicChannel['type'],
  requirement: MagicChannel['requirement'],
  options: {
    canBeMastered?: boolean;
    proficiencyBonus?: number;
    blockEffect?: MagicChannel['blockEffect'];
    description?: string;
  } = {}
): MagicChannel {
  return {
    type,
    requirement,
    canBeMastered: options.canBeMastered ?? true,
    proficiencyBonus: options.proficiencyBonus,
    blockEffect: options.blockEffect ?? (requirement === 'required' ? 'prevents_casting' : 'no_effect'),
    description: options.description,
  };
}

/**
 * Create a properly-typed MagicLaw with sensible defaults.
 */
function createLaw(
  type: MagicLaw['type'],
  strictness: MagicLaw['strictness'],
  circumventable: boolean,
  options: {
    id?: string;
    name?: string;
    violationConsequence?: string;
    circumventionCostMultiplier?: number;
    description?: string;
  } = {}
): MagicLaw {
  return {
    id: options.id ?? `${type}_law`,
    name: options.name ?? type,
    type,
    strictness,
    canBeCircumvented: circumventable,
    violationConsequence: options.violationConsequence,
    circumventionCostMultiplier: options.circumventionCostMultiplier,
    description: options.description,
  };
}

/**
 * Create a properly-typed MagicRisk with sensible defaults.
 */
function createRisk(
  trigger: MagicRisk['trigger'],
  consequence: MagicRisk['consequence'],
  severity: MagicRisk['severity'],
  probability: number,
  mitigatable: boolean,
  options: {
    mitigationSkill?: string;
    description?: string;
  } = {}
): MagicRisk {
  return {
    trigger,
    consequence,
    severity,
    probability,
    mitigatable,
    mitigationSkill: options.mitigationSkill,
    description: options.description,
  };
}

/**
 * Create a properly-typed AcquisitionDefinition with sensible defaults.
 */
function createAcquisition(
  method: AcquisitionDefinition['method'],
  rarity: AcquisitionDefinition['rarity'],
  options: {
    voluntary?: boolean;
    prerequisites?: string[];
    grantsAccess?: string[];
    startingProficiency?: number;
    description?: string;
  } = {}
): AcquisitionDefinition {
  return {
    method,
    rarity,
    voluntary: options.voluntary ?? true,
    prerequisites: options.prerequisites,
    grantsAccess: options.grantsAccess ?? [],
    startingProficiency: options.startingProficiency ?? 5,
    description: options.description,
  };
}

/**
 * Create a properly-typed ForeignMagicConfig from a simple effect string.
 */
function createForeignMagicConfig(effect: ForeignMagicConfig['effect']): ForeignMagicConfig {
  return { effect };
}

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
      id: 'sympathy_source',
      name: 'Sympathetic Will',
      type: 'internal',
      regeneration: 'rest',
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ],

  costs: [
    createCost('stamina', { canBeTerminal: false }),
    createCost('sanity', { canBeTerminal: false }),
  ],

  channels: [
    createChannel('will', 'required'),
    createChannel('focus', 'required'),
    createChannel('material', 'required'),
  ],

  laws: [
    createLaw('similarity', 'absolute', false),
    createLaw('conservation', 'absolute', false),
    createLaw('contagion', 'strong', false),
  ],

  risks: [
    createRisk('failure', 'backlash', 'severe', 0.3, true),
    createRisk('overuse', 'burnout', 'moderate', 0.2, true),
    createRisk('paradox', 'bleed_through', 'catastrophic', 0.1, false),
  ],

  acquisitionMethods: [
    createAcquisition('study', 'common', { grantsAccess: ['sympathy_source'] }),
    createAcquisition('apprenticeship', 'common', { grantsAccess: ['sympathy_source'] }),
  ],

  availableTechniques: ['create', 'destroy', 'transform', 'control'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind'],

  forbiddenCombinations: [
    { technique: 'create', form: 'spirit', reason: 'Cannot create sympathy with souls' },
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
  foreignMagicEffect: createForeignMagicConfig('weakened'),
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
      id: 'metal_source',
      name: 'Metal Reserves',
      type: 'material',
      regeneration: 'consumption',
      detectability: 'undetectable',
      storable: true,
      transferable: true,
      stealable: false,
    },
  ],

  costs: [
    createCost('material', { canBeTerminal: false, recoverable: false }),
    createCost('stamina', { canBeTerminal: false }),
  ],

  channels: [
    createChannel('consumption', 'required'),
    createChannel('will', 'required'),
  ],

  laws: [
    createLaw('equivalent_exchange', 'absolute', false),
    createLaw('conservation', 'absolute', false),
  ],

  risks: [
    createRisk('overuse', 'exhaustion', 'moderate', 0.4, true),
    createRisk('corruption', 'sickness', 'severe', 0.2, false),
  ],

  acquisitionMethods: [
    createAcquisition('bloodline', 'rare', { voluntary: false, grantsAccess: ['metal_source'] }),
    createAcquisition('gift', 'legendary', { voluntary: false, grantsAccess: ['metal_source'] }),
  ],

  availableTechniques: ['create', 'destroy', 'control', 'enhance', 'perceive'],
  availableForms: ['body', 'mind', 'void'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'enhance', form: 'body', bonusEffect: 'Pewter strength', powerMultiplier: 2.0 },
    { technique: 'perceive', form: 'mind', bonusEffect: 'Tin senses', powerMultiplier: 2.0 },
  ],

  powerScaling: 'step',
  powerCeiling: 200,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: [],
  conflictingParadigms: [],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'dream_source',
      name: 'Dream Energy',
      type: 'emotional',
      regeneration: 'rest',
      detectability: 'undetectable',
      storable: false,
      transferable: false,
      stealable: true,
    },
  ],

  costs: [
    createCost('sanity', { canBeTerminal: true, cumulative: true }),
    createCost('memory', { canBeTerminal: false, cumulative: true }),
    createCost('time', { canBeTerminal: false, recoverable: false }),
  ],

  channels: [
    createChannel('dream', 'required'),
    createChannel('meditation', 'enhancing'),
    createChannel('emotion', 'enhancing'),
  ],

  laws: [
    createLaw('belief', 'strong', true),
    createLaw('narrative', 'strong', false),
    createLaw('witness', 'weak', true),
  ],

  risks: [
    createRisk('overuse', 'coma', 'catastrophic', 0.15, true),
    createRisk('failure', 'spectre_creation', 'severe', 0.3, false),
    createRisk('exhaustion', 'memory_loss', 'moderate', 0.4, true),
  ],

  acquisitionMethods: [
    createAcquisition('meditation', 'uncommon', { grantsAccess: ['dream_source'] }),
    createAcquisition('awakening', 'rare', { voluntary: false, grantsAccess: ['dream_source'] }),
    createAcquisition('contract', 'rare', { grantsAccess: ['dream_source'] }),
  ],

  availableTechniques: ['create', 'transform', 'perceive', 'control'],
  availableForms: ['mind', 'image', 'spirit'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'Cannot permanently destroy dream selves' },
  ],

  resonantCombinations: [
    { technique: 'create', form: 'image', bonusEffect: 'Vivid dream constructs', powerMultiplier: 1.8 },
  ],

  powerScaling: 'exponential',
  powerCeiling: 150,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0,
  allowsEnchantment: false,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['emotional'],
  conflictingParadigms: ['academic'],
  foreignMagicEffect: createForeignMagicConfig('weakened'),
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
      id: 'song_source',
      name: 'Musical Knowledge',
      type: 'knowledge',
      regeneration: 'rest',
      detectability: 'obvious',
      storable: true,
      transferable: true,
      stealable: true,
    },
  ],

  costs: [
    createCost('stamina', { canBeTerminal: false }),
    createCost('time', { canBeTerminal: false, recoverable: false }),
  ],

  channels: [
    createChannel('musical', 'required'),
    createChannel('verbal', 'required'),
    createChannel('emotion', 'enhancing'),
  ],

  laws: [
    createLaw('resonance', 'absolute', false),
    createLaw('narrative', 'strong', false),
    createLaw('witness', 'weak', true),
  ],

  risks: [
    createRisk('failure', 'wild_surge', 'moderate', 0.3, true),
    createRisk('overuse', 'silence', 'severe', 0.2, true),
    createRisk('critical_failure', 'bleed_through', 'catastrophic', 0.1, false),
  ],

  acquisitionMethods: [
    createAcquisition('study', 'common', { grantsAccess: ['song_source'] }),
    createAcquisition('apprenticeship', 'common', { grantsAccess: ['song_source'] }),
    createAcquisition('gift', 'rare', { voluntary: false, grantsAccess: ['song_source'] }),
  ],

  availableTechniques: ['create', 'transform', 'enhance', 'protect', 'control'],
  availableForms: ['mind', 'body', 'image', 'air', 'water'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'enhance', form: 'mind', bonusEffect: 'Inspiring anthem', powerMultiplier: 1.6 },
    { technique: 'control', form: 'air', bonusEffect: 'Wind symphony', powerMultiplier: 1.4 },
  ],

  powerScaling: 'logarithmic',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.5,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'tolerant',
  compatibleParadigms: ['emotional', 'academic'],
  conflictingParadigms: ['silence'],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'rune_source',
      name: 'Runic Knowledge',
      type: 'knowledge',
      regeneration: 'none',
      detectability: 'obvious',
      storable: true,
      transferable: true,
      stealable: true,
    },
  ],

  costs: [
    createCost('material', { canBeTerminal: false, recoverable: false }),
    createCost('time', { canBeTerminal: false, recoverable: false }),
  ],

  channels: [
    createChannel('glyph', 'required'),
    createChannel('material', 'required'),
    createChannel('focus', 'required'),
  ],

  laws: [
    createLaw('true_names', 'absolute', false),
    createLaw('conservation', 'strong', false),
  ],

  risks: [
    createRisk('failure', 'backlash', 'severe', 0.4, true),
    createRisk('paradox', 'wild_surge', 'catastrophic', 0.15, false),
  ],

  acquisitionMethods: [
    createAcquisition('study', 'common', { grantsAccess: ['rune_source'] }),
    createAcquisition('awakening', 'rare', { voluntary: false, grantsAccess: ['rune_source'] }),
  ],

  availableTechniques: ['create', 'destroy', 'protect', 'enhance'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'protect', form: 'body', bonusEffect: 'Warding runes', powerMultiplier: 1.7 },
  ],

  powerScaling: 'step',
  powerCeiling: 100,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['academic'],
  conflictingParadigms: [],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'debt_source',
      name: 'Owed Favors',
      type: 'social',
      regeneration: 'none',
      detectability: 'subtle',
      storable: true,
      transferable: true,
      stealable: false,
    },
  ],

  costs: [
    createCost('favor', { canBeTerminal: true, recoverable: false }),
    createCost('oath', { canBeTerminal: true, recoverable: false }),
  ],

  channels: [
    createChannel('verbal', 'required'),
    createChannel('will', 'required'),
  ],

  laws: [
    createLaw('oath_binding', 'absolute', false),
    createLaw('equivalent_exchange', 'absolute', false),
  ],

  risks: [
    createRisk('debt', 'debt_called', 'catastrophic', 0.3, false),
    createRisk('overuse', 'attention_gained', 'severe', 0.2, true),
  ],

  acquisitionMethods: [
    createAcquisition('contract', 'common', { grantsAccess: ['debt_source'] }),
    createAcquisition('bloodline', 'uncommon', { voluntary: false, grantsAccess: ['debt_source'] }),
  ],

  availableTechniques: ['create', 'transform', 'control', 'perceive'],
  availableForms: ['mind', 'body', 'spirit'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'Cannot destroy souls owed to you' },
  ],

  resonantCombinations: [
    { technique: 'control', form: 'mind', bonusEffect: 'Debt compulsion', powerMultiplier: 2.0 },
  ],

  powerScaling: 'exponential',
  powerCeiling: 200,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'predatory',
  compatibleParadigms: ['pact'],
  conflictingParadigms: ['divine'],
  foreignMagicEffect: createForeignMagicConfig('weakened'),
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
      id: 'bureaucratic_source',
      name: 'Official Authority',
      type: 'knowledge',
      regeneration: 'none',
      detectability: 'obvious',
      storable: true,
      transferable: true,
      stealable: true,
    },
  ],

  costs: [
    createCost('time', { canBeTerminal: false, recoverable: false }),
    createCost('material', { canBeTerminal: false, recoverable: false }),
    createCost('sanity', { canBeTerminal: false, cumulative: true }),
  ],

  channels: [
    createChannel('glyph', 'required'),
    createChannel('material', 'required'),
    createChannel('focus', 'required'),
  ],

  laws: [
    createLaw('true_names', 'absolute', false),
    createLaw('equivalent_exchange', 'strong', false),
  ],

  risks: [
    createRisk('failure', 'mishap', 'minor', 0.6, true),
    createRisk('paradox', 'attention_gained', 'catastrophic', 0.1, false),
  ],

  acquisitionMethods: [
    createAcquisition('study', 'common', { grantsAccess: ['bureaucratic_source'] }),
    createAcquisition('apprenticeship', 'common', { grantsAccess: ['bureaucratic_source'] }),
  ],

  availableTechniques: ['create', 'transform', 'perceive'],
  availableForms: ['body', 'mind', 'image'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'No form exists for soul destruction' },
  ],

  resonantCombinations: [],

  powerScaling: 'logarithmic',
  powerCeiling: 80,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.2,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'requires_permit',
  compatibleParadigms: ['academic'],
  conflictingParadigms: ['chaos', 'wild'],
  foreignMagicEffect: createForeignMagicConfig('weakened'),
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
      id: 'luck_source',
      name: 'Fortune',
      type: 'temporal',
      regeneration: 'passive',
      detectability: 'subtle',
      storable: false,
      transferable: true,
      stealable: true,
    },
  ],

  costs: [
    createCost('luck', { canBeTerminal: false, cumulative: true }),
    createCost('karma', { canBeTerminal: true, cumulative: true, recoverable: false }),
  ],

  channels: [
    createChannel('will', 'required'),
  ],

  laws: [
    createLaw('equivalent_exchange', 'absolute', false),
    createLaw('balance', 'absolute', false),
    createLaw('entropy', 'strong', false),
  ],

  risks: [
    createRisk('overuse', 'death', 'catastrophic', 0.5, false),
    createRisk('debt', 'backlash', 'severe', 0.4, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'rare', { voluntary: false, grantsAccess: ['luck_source'] }),
    createAcquisition('contract', 'uncommon', { grantsAccess: ['luck_source'] }),
  ],

  availableTechniques: ['enhance', 'perceive', 'protect'],
  availableForms: ['mind', 'body'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'enhance', form: 'body', bonusEffect: 'Improbable dodges', powerMultiplier: 1.8 },
  ],

  powerScaling: 'exponential',
  powerCeiling: 150,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: [],
  conflictingParadigms: ['fate', 'divine'],
  foreignMagicEffect: createForeignMagicConfig('backfires'),
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
      id: 'threshold_source',
      name: 'Liminal Energy',
      type: 'ambient',
      regeneration: 'none',
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ],

  costs: [
    createCost('mana', { canBeTerminal: false }),
  ],

  channels: [
    createChannel('will', 'required'),
    createChannel('material', 'required'),
  ],

  laws: [
    createLaw('threshold', 'absolute', false),
    createLaw('consent', 'strong', true),
  ],

  risks: [
    createRisk('failure', 'trapped', 'severe', 0.3, true),
    createRisk('critical_failure', 'trapped', 'catastrophic', 0.15, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'uncommon', { voluntary: false, grantsAccess: ['threshold_source'] }),
    createAcquisition('study', 'rare', { grantsAccess: ['threshold_source'] }),
  ],

  availableTechniques: ['create', 'control', 'perceive', 'summon'],
  availableForms: ['space', 'spirit', 'void'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'summon', form: 'spirit', bonusEffect: 'Gateway summoning', powerMultiplier: 2.0 },
    { technique: 'control', form: 'space', bonusEffect: 'Portal creation', powerMultiplier: 1.8 },
  ],

  powerScaling: 'step',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: false,
  foreignMagicPolicy: 'gateway',
  compatibleParadigms: ['spatial'],
  conflictingParadigms: [],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'belief_source',
      name: 'Collective Faith',
      type: 'social',
      regeneration: 'prayer',
      detectability: 'obvious',
      storable: false,
      transferable: false,
      stealable: true,
    },
  ],

  costs: [
    createCost('belief', { canBeTerminal: true, cumulative: true, recoverable: false }),
    createCost('attention', { canBeTerminal: false, cumulative: true }),
  ],

  channels: [
    createChannel('will', 'required'),
    createChannel('prayer', 'enhancing'),
  ],

  laws: [
    createLaw('belief', 'absolute', false),
    createLaw('narrative', 'strong', false),
    createLaw('witness', 'strong', false),
  ],

  risks: [
    createRisk('overuse', 'attention_gained', 'severe', 0.3, true),
    createRisk('attention', 'possession', 'catastrophic', 0.2, false),
  ],

  acquisitionMethods: [
    createAcquisition('prayer', 'common', { grantsAccess: ['belief_source'] }),
    createAcquisition('awakening', 'rare', { voluntary: false, grantsAccess: ['belief_source'] }),
  ],

  availableTechniques: ['create', 'transform', 'enhance'],
  availableForms: ['mind', 'spirit', 'image', 'body'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'create', form: 'spirit', bonusEffect: 'Tulpa creation', powerMultiplier: 2.0 },
  ],

  powerScaling: 'exponential',
  powerCeiling: 300,
  allowsGroupCasting: true,
  groupCastingMultiplier: 3.0,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'absorbs',
  compatibleParadigms: ['divine'],
  conflictingParadigms: ['academic'],
  foreignMagicEffect: createForeignMagicConfig('transforms'),
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
      id: 'consumption_source',
      name: 'Consumed Essence',
      type: 'material',
      regeneration: 'consumption',
      detectability: 'obvious',
      storable: false,
      transferable: true,
      stealable: true,
    },
  ],

  costs: [
    createCost('material', { canBeTerminal: false, recoverable: false }),
    createCost('stamina', { canBeTerminal: false }),
  ],

  channels: [
    createChannel('consumption', 'required'),
  ],

  laws: [
    createLaw('contagion', 'absolute', false),
    createLaw('equivalent_exchange', 'strong', false),
  ],

  risks: [
    createRisk('overuse', 'mutation', 'severe', 0.3, true),
    createRisk('corruption', 'sickness', 'catastrophic', 0.2, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'uncommon', { voluntary: false, grantsAccess: ['consumption_source'] }),
    createAcquisition('bloodline', 'rare', { voluntary: false, grantsAccess: ['consumption_source'] }),
  ],

  availableTechniques: ['transform', 'enhance', 'perceive'],
  availableForms: ['body', 'animal', 'plant', 'fire', 'water', 'earth', 'air'],

  forbiddenCombinations: [
    { technique: 'transform', form: 'spirit', reason: 'Cannot digest souls' },
  ],

  resonantCombinations: [
    { technique: 'enhance', form: 'body', bonusEffect: 'Predator strength', powerMultiplier: 1.8 },
  ],

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
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'silence_source',
      name: 'Silence',
      type: 'ambient',
      regeneration: 'passive',
      detectability: 'undetectable',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ],

  costs: [
    createCost('mana', { canBeTerminal: false }),
  ],

  channels: [
    createChannel('will', 'required'),
    createChannel('meditation', 'required'),
  ],

  laws: [
    createLaw('secrecy', 'absolute', false),
  ],

  risks: [
    createRisk('overuse', 'silence', 'severe', 0.3, false),
    createRisk('failure', 'sickness', 'moderate', 0.2, true),
  ],

  acquisitionMethods: [
    createAcquisition('meditation', 'uncommon', { grantsAccess: ['silence_source'] }),
    createAcquisition('gift', 'rare', { voluntary: false, grantsAccess: ['silence_source'] }),
  ],

  availableTechniques: ['destroy', 'protect', 'perceive', 'control'],
  availableForms: ['mind', 'air', 'void'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'destroy', form: 'air', bonusEffect: 'Sound nullification', powerMultiplier: 2.0 },
  ],

  powerScaling: 'logarithmic',
  powerCeiling: 100,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'hostile',
  compatibleParadigms: [],
  conflictingParadigms: ['song_magic', 'verbal'],
  foreignMagicEffect: createForeignMagicConfig('fails'),
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
      id: 'paradox_source',
      name: 'Void',
      type: 'void',
      regeneration: 'none',
      detectability: 'beacon',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ],

  costs: [
    createCost('sanity', { canBeTerminal: true, cumulative: true, recoverable: false }),
    createCost('corruption', { canBeTerminal: true, cumulative: true, recoverable: false }),
  ],

  channels: [
    createChannel('will', 'required'),
  ],

  laws: [
    createLaw('paradox', 'absolute', false),
  ],

  risks: [
    createRisk('paradox', 'bleed_through', 'catastrophic', 0.5, false),
    createRisk('failure', 'death', 'severe', 0.4, false),
    createRisk('critical_failure', 'paradox_spirit', 'catastrophic', 0.2, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'legendary', { voluntary: false, grantsAccess: ['paradox_source'] }),
    createAcquisition('stolen', 'legendary', { grantsAccess: ['paradox_source'] }),
  ],

  availableTechniques: ['create', 'destroy', 'transform'],
  availableForms: ['void', 'time', 'space'],

  forbiddenCombinations: [],
  resonantCombinations: [],

  powerScaling: 'exponential',
  powerCeiling: 500,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'annihilates',
  compatibleParadigms: [],
  conflictingParadigms: ['all'],
  foreignMagicEffect: createForeignMagicConfig('fails'),
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
      id: 'echo_source',
      name: 'Temporal Echoes',
      type: 'temporal',
      regeneration: 'none',
      detectability: 'subtle',
      storable: true,
      transferable: true,
      stealable: true,
    },
  ],

  costs: [
    createCost('memory', { canBeTerminal: false, cumulative: true }),
    createCost('time', { canBeTerminal: false, recoverable: false }),
  ],

  channels: [
    createChannel('will', 'required'),
    createChannel('meditation', 'enhancing'),
  ],

  laws: [
    createLaw('contagion', 'strong', false),
    createLaw('cycles', 'strong', false),
  ],

  risks: [
    createRisk('overuse', 'trapped', 'severe', 0.3, true),
    createRisk('failure', 'echo', 'moderate', 0.2, true),
  ],

  acquisitionMethods: [
    createAcquisition('meditation', 'uncommon', { grantsAccess: ['echo_source'] }),
    createAcquisition('awakening', 'rare', { voluntary: false, grantsAccess: ['echo_source'] }),
  ],

  availableTechniques: ['perceive', 'create', 'transform'],
  availableForms: ['mind', 'image', 'time'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'time', reason: 'Cannot erase the past' },
  ],

  resonantCombinations: [
    { technique: 'perceive', form: 'time', bonusEffect: 'Perfect recall', powerMultiplier: 1.8 },
  ],

  powerScaling: 'linear',
  powerCeiling: 100,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['temporal'],
  conflictingParadigms: [],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'game_source',
      name: 'Wagers',
      type: 'social',
      regeneration: 'none',
      detectability: 'obvious',
      storable: false,
      transferable: true,
      stealable: false,
    },
  ],

  costs: [
    createCost('oath', { canBeTerminal: true, recoverable: false }),
  ],

  channels: [
    createChannel('verbal', 'required'),
    createChannel('will', 'required'),
  ],

  laws: [
    createLaw('oath_binding', 'absolute', false),
    createLaw('consent', 'absolute', false),
  ],

  risks: [
    createRisk('failure', 'debt_called', 'catastrophic', 0.5, false),
    createRisk('overreach', 'trapped', 'catastrophic', 0.2, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'uncommon', { voluntary: false, grantsAccess: ['game_source'] }),
    createAcquisition('contract', 'common', { grantsAccess: ['game_source'] }),
  ],

  availableTechniques: ['create', 'control', 'perceive'],
  availableForms: ['mind', 'spirit'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'perceive', form: 'mind', bonusEffect: 'Read opponent', powerMultiplier: 1.6 },
  ],

  powerScaling: 'step',
  powerCeiling: 200,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['debt_magic', 'fae'],
  conflictingParadigms: [],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'craft_source',
      name: 'Creative Intent',
      type: 'knowledge',
      regeneration: 'none',
      detectability: 'subtle',
      storable: true,
      transferable: true,
      stealable: false,
    },
  ],

  costs: [
    createCost('material', { canBeTerminal: false, recoverable: false }),
    createCost('time', { canBeTerminal: false, recoverable: false }),
    createCost('stamina', { canBeTerminal: false }),
  ],

  channels: [
    createChannel('material', 'required'),
    createChannel('focus', 'required'),
  ],

  laws: [
    createLaw('equivalent_exchange', 'strong', false),
    createLaw('resonance', 'strong', false),
  ],

  risks: [
    createRisk('failure', 'curse', 'moderate', 0.2, true),
    createRisk('overuse', 'addiction_worsens', 'severe', 0.15, true),
  ],

  acquisitionMethods: [
    createAcquisition('apprenticeship', 'common', { grantsAccess: ['craft_source'] }),
    createAcquisition('study', 'common', { grantsAccess: ['craft_source'] }),
  ],

  availableTechniques: ['create', 'enhance', 'protect'],
  availableForms: ['body', 'fire', 'water', 'earth', 'air'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'create', form: 'earth', bonusEffect: 'Dwarven metalwork', powerMultiplier: 1.8 },
    { technique: 'enhance', form: 'body', bonusEffect: 'Masterwork weapons', powerMultiplier: 1.6 },
  ],

  powerScaling: 'linear',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['academic', 'rune'],
  conflictingParadigms: [],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'commerce_source',
      name: 'Trade Agreements',
      type: 'social',
      regeneration: 'none',
      detectability: 'subtle',
      storable: true,
      transferable: true,
      stealable: false,
    },
  ],

  costs: [
    createCost('gold', { canBeTerminal: false, recoverable: false }),
    createCost('oath', { canBeTerminal: true, recoverable: false }),
  ],

  channels: [
    createChannel('verbal', 'required'),
    createChannel('material', 'required'),
  ],

  laws: [
    createLaw('equivalent_exchange', 'absolute', false),
    createLaw('consent', 'absolute', false),
  ],

  risks: [
    createRisk('failure', 'backlash', 'severe', 0.3, true),
    createRisk('overreach', 'debt_called', 'catastrophic', 0.2, false),
  ],

  acquisitionMethods: [
    createAcquisition('apprenticeship', 'common', { grantsAccess: ['commerce_source'] }),
    createAcquisition('study', 'common', { grantsAccess: ['commerce_source'] }),
  ],

  availableTechniques: ['create', 'transform', 'perceive'],
  availableForms: ['mind', 'body', 'image'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'perceive', form: 'mind', bonusEffect: 'Read market', powerMultiplier: 1.5 },
  ],

  powerScaling: 'exponential',
  powerCeiling: 150,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'trades_with',
  compatibleParadigms: ['debt_magic'],
  conflictingParadigms: [],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'lunar_source',
      name: 'Moonlight',
      type: 'ambient',
      regeneration: 'passive',
      detectability: 'obvious',
      storable: true,
      transferable: false,
      stealable: false,
    },
  ],

  costs: [
    createCost('mana', { canBeTerminal: false }),
    createCost('sanity', { canBeTerminal: false, cumulative: true }),
  ],

  channels: [
    createChannel('will', 'required'),
    createChannel('meditation', 'enhancing'),
  ],

  laws: [
    createLaw('cycles', 'absolute', false),
  ],

  risks: [
    createRisk('overuse', 'mutation', 'severe', 0.3, true),
    createRisk('emotional', 'mutation', 'catastrophic', 0.1, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'uncommon', { voluntary: false, grantsAccess: ['lunar_source'] }),
    createAcquisition('bloodline', 'rare', { voluntary: false, grantsAccess: ['lunar_source'] }),
  ],

  availableTechniques: ['create', 'transform', 'enhance', 'control'],
  availableForms: ['water', 'mind', 'body', 'animal'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'transform', form: 'body', bonusEffect: 'Lycanthropy', powerMultiplier: 2.5 },
    { technique: 'control', form: 'water', bonusEffect: 'Tide manipulation', powerMultiplier: 1.8 },
  ],

  powerScaling: 'step',
  powerCeiling: 200,
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: ['nature', 'cycles'],
  conflictingParadigms: ['solar'],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'seasonal_source',
      name: 'Seasonal Energy',
      type: 'ambient',
      regeneration: 'passive',
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ],

  costs: [
    createCost('mana', { canBeTerminal: false }),
  ],

  channels: [
    createChannel('will', 'required'),
  ],

  laws: [
    createLaw('cycles', 'absolute', false),
  ],

  risks: [
    createRisk('overuse', 'trapped', 'catastrophic', 0.2, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'uncommon', { voluntary: false, grantsAccess: ['seasonal_source'] }),
    createAcquisition('bloodline', 'rare', { voluntary: false, grantsAccess: ['seasonal_source'] }),
  ],

  availableTechniques: ['create', 'destroy', 'transform', 'enhance'],
  availableForms: ['plant', 'fire', 'water', 'earth', 'air', 'body'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'create', form: 'plant', bonusEffect: 'Spring growth', powerMultiplier: 2.0 },
    { technique: 'create', form: 'fire', bonusEffect: 'Summer heat', powerMultiplier: 1.8 },
    { technique: 'destroy', form: 'plant', bonusEffect: 'Autumn harvest', powerMultiplier: 1.6 },
    { technique: 'destroy', form: 'body', bonusEffect: 'Winter death', powerMultiplier: 1.8 },
  ],

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
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
      id: 'age_source',
      name: 'Lifespan',
      type: 'temporal',
      regeneration: 'none',
      detectability: 'obvious',
      storable: false,
      transferable: true,
      stealable: true,
    },
  ],

  costs: [
    createCost('lifespan', { canBeTerminal: true, cumulative: true, recoverable: false }),
  ],

  channels: [
    createChannel('will', 'required'),
  ],

  laws: [
    createLaw('equivalent_exchange', 'absolute', false),
    createLaw('balance', 'absolute', false),
  ],

  risks: [
    createRisk('overuse', 'aging', 'catastrophic', 0.4, false),
    createRisk('failure', 'death', 'catastrophic', 0.3, false),
  ],

  acquisitionMethods: [
    createAcquisition('awakening', 'rare', { voluntary: false, grantsAccess: ['age_source'] }),
    createAcquisition('contract', 'legendary', { grantsAccess: ['age_source'] }),
  ],

  availableTechniques: ['create', 'destroy', 'transform', 'enhance'],
  availableForms: ['time', 'body', 'mind'],

  forbiddenCombinations: [],
  resonantCombinations: [
    { technique: 'transform', form: 'body', bonusEffect: 'Age reversal', powerMultiplier: 3.0 },
  ],

  powerScaling: 'exponential',
  powerCeiling: 300,
  allowsGroupCasting: false,
  groupCastingMultiplier: 1.0,
  allowsEnchantment: true,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'neutral',
  compatibleParadigms: [],
  conflictingParadigms: ['divine', 'nature'],
  foreignMagicEffect: createForeignMagicConfig('backfires'),
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
      id: 'shinto_source',
      name: 'Kami Favor',
      type: 'ancestral',
      regeneration: 'ritual',
      detectability: 'subtle',
      storable: false,
      transferable: false,
      stealable: false,
    },
  ],

  costs: [
    createCost('favor', { canBeTerminal: false }),
    createCost('material', { canBeTerminal: false, recoverable: false }),
  ],

  channels: [
    createChannel('prayer', 'required'),
    createChannel('material', 'required'),
    createChannel('glyph', 'enhancing'),
  ],

  laws: [
    createLaw('consent', 'absolute', false),
    createLaw('sacrifice', 'strong', false),
    createLaw('threshold', 'strong', false),
  ],

  risks: [
    createRisk('divine_anger', 'curse', 'severe', 0.3, true),
    createRisk('failure', 'sickness', 'moderate', 0.2, true),
  ],

  acquisitionMethods: [
    createAcquisition('study', 'common', { grantsAccess: ['shinto_source'] }),
    createAcquisition('apprenticeship', 'common', { grantsAccess: ['shinto_source'] }),
    createAcquisition('bloodline', 'uncommon', { voluntary: false, grantsAccess: ['shinto_source'] }),
  ],

  availableTechniques: ['create', 'protect', 'perceive', 'enhance', 'summon'],
  availableForms: ['water', 'earth', 'plant', 'animal', 'spirit', 'body'],

  forbiddenCombinations: [
    { technique: 'destroy', form: 'spirit', reason: 'Cannot destroy kami' },
  ],

  resonantCombinations: [
    { technique: 'protect', form: 'body', bonusEffect: 'Omamori charm', powerMultiplier: 1.6 },
    { technique: 'summon', form: 'spirit', bonusEffect: 'Kami invocation', powerMultiplier: 2.0 },
    { technique: 'perceive', form: 'spirit', bonusEffect: 'See kami', powerMultiplier: 1.5 },
  ],

  powerScaling: 'logarithmic',
  powerCeiling: 120,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.8,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'tolerant',
  compatibleParadigms: ['ancestral', 'nature', 'threshold'],
  conflictingParadigms: ['void', 'blood_magic'],
  foreignMagicEffect: createForeignMagicConfig('works_normally'),
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
