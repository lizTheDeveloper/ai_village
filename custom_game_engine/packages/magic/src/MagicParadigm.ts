/**
 * MagicParadigm - Universe-level magic rule definitions
 *
 * Magic works differently across universes. This module defines the meta-framework
 * that can express fundamentally different magical paradigms. Each universe declares
 * its MagicParadigm, which defines the sources, costs, channels, laws, and risks
 * of magic within that reality.
 *
 * See: openspec/specs/magic-system/paradigm-spec.md
 */

import type { MagicTechnique, MagicForm } from '@ai-village/core';

// ============================================================================
// Magic Source - Where power comes from
// ============================================================================

/** Categories of magical power sources */
export type MagicSourceType =
  | 'internal'      // Within the caster (mana pool, chi, life force)
  | 'ambient'       // Environmental (ley lines, weather, seasons)
  | 'divine'        // From gods, patrons, or higher powers
  | 'material'      // From reagents, components, sacrifices
  | 'emotional'     // From feelings (passion, rage, love)
  | 'social'        // From believers, worshippers, collective faith
  | 'knowledge'     // From knowing secrets, true names
  | 'temporal'      // From time itself (past/future energy)
  | 'void'          // From emptiness, entropy, anti-reality
  | 'ancestral'     // From spirits of the dead
  | 'bloodline';    // Inherited through genetic/spiritual lineage

/** How power regenerates (if at all) */
export type RegenerationType =
  | 'passive'       // Regenerates automatically over time
  | 'rest'          // Regenerates during rest/sleep
  | 'ritual'        // Requires specific rituals
  | 'consumption'   // Must consume something
  | 'prayer'        // Through devotion and worship
  | 'sleep'         // Regenerates specifically during sleep (not just rest)
  | 'none';         // Does not regenerate

/** How detectable magic use is */
export type Detectability =
  | 'undetectable'  // Cannot be sensed by any means
  | 'subtle'        // Only detectable by trained mages
  | 'obvious'       // Visible effects during casting
  | 'beacon';       // Draws attention from far away

/** Definition of a magical power source */
export interface MagicSource {
  id: string;
  name: string;
  type: MagicSourceType;

  /** How power regenerates (if at all) */
  regeneration: RegenerationType;

  /** Base regeneration rate (units per tick, if passive) */
  regenRate?: number;

  /** Can power be stored in vessels/objects? */
  storable: boolean;

  /** Can power be transferred between beings? */
  transferable: boolean;

  /** Can power be stolen/drained? */
  stealable: boolean;

  /** Does using this source attract attention? */
  detectability: Detectability;

  /** Flavor description */
  description?: string;
}

// ============================================================================
// Magic Cost - What is exchanged for effects
// ============================================================================

/** Types of costs magic can require */
export type MagicCostType =
  | 'mana'           // Abstract energy pool
  | 'health'         // Life force, HP
  | 'stamina'        // Physical exhaustion
  | 'lifespan'       // Years of remaining life
  | 'sanity'         // Mental stability
  | 'memory'         // Specific or random memories
  | 'emotion'        // Capacity to feel
  | 'material'       // Physical components consumed
  | 'time'           // Casting duration, ritual time
  | 'favor'          // Relationship with patron/god
  | 'karma'          // Moral standing, cosmic balance
  | 'gold'           // Economic cost
  | 'soul_fragment'  // Piece of one's essence
  | 'corruption'     // Gradual dark transformation
  | 'attention'      // Draws notice of entities
  | 'oath'           // Binding promise
  | 'blood'          // Literal blood (health subset)
  | 'beauty'         // Physical appearance
  | 'luck'           // Fortune/probability
  | 'offering'       // Physical offerings to spirits/entities
  | 'taboo'          // Accepting behavioral restrictions
  | 'breath'         // Breathing/singing capacity
  | 'sleep'          // Rest/sleep time or quality
  | 'separation_pain' // Pain from daemon/soul separation
  | 'belief'         // Divine power from mortal belief (gods only)
  // Shinto/Animist costs
  | 'purity'         // Ritual cleanliness (Shinto)
  | 'respect'        // Standing with kami/spirits
  // Dream magic costs
  | 'lucidity'       // Dream awareness/control
  | 'fatigue'        // Dream exhaustion (cumulative)
  // Song/Bardic costs
  | 'voice'          // Vocal capacity for singing magic
  // Rune magic costs
  | 'runic_power'    // Power stored in runes
  | 'materials'      // Physical materials for inscribing
  | 'inscription_time' // Time to carve/inscribe runes
  // Sympathy magic costs (Kingkiller Chronicle)
  | 'alar'           // Mental focus/will for bindings
  | 'slippage'       // Heat/energy lost in sympathetic transfer
  | 'link_material'  // Physical link material quality
  // Allomancy costs (Mistborn)
  | 'metal_iron'     // Iron reserves
  | 'metal_steel'    // Steel reserves
  | 'metal_tin'      // Tin reserves
  | 'metal_pewter'   // Pewter reserves
  | 'metal_brass'    // Brass reserves
  | 'metal_zinc'     // Zinc reserves
  | 'metal_copper'   // Copper reserves
  | 'metal_bronze'   // Bronze reserves
  | 'metal_gold'     // Gold reserves
  | 'metal_electrum' // Electrum reserves
  | 'metal_chromium' // Chromium reserves
  | 'metal_nicrosil' // Nicrosil reserves
  | 'metal_cadmium'  // Cadmium reserves
  | 'metal_bendalloy' // Bendalloy reserves
  | 'metal_aluminum' // Aluminum reserves
  | 'metal_duralumin' // Duralumin reserves
  | 'metal_atium'    // Atium reserves (god metal)
  | 'metal_lerasium' // Lerasium reserves (god metal)
  | 'metal_malatium' // Malatium reserves
  // Daemon costs (His Dark Materials)
  | 'daemon_bond'    // Connection to external soul
  | 'separation_trauma' // Pain from daemon separation
  | 'dust'
  // Physical/strain costs
  | 'strain'         // Physical strain from intense magic use
  | 'metal';         // Generic metal cost for allomancy

/** How a cost can be recovered */
export type CostRecoveryMethod =
  | 'rest'           // Through sleep/relaxation
  | 'ritual'         // Through specific rituals
  | 'time'           // Naturally over time
  | 'sacrifice'      // By sacrificing something
  | 'quest'          // By completing a task
  | 'reunion';       // Reuniting with separated part (daemon, etc.)

/** How visible a cost is to observers */
export type CostVisibility =
  | 'hidden'         // Cannot be observed
  | 'subtle'         // Only noticeable to those who know what to look for
  | 'obvious';       // Clearly visible to anyone

/** Definition of a magical cost */
export interface MagicCost {
  type: MagicCostType;

  /** Can this cost be fatal or cause permanent loss? */
  canBeTerminal: boolean;

  /** Does this accumulate over time? */
  cumulative: boolean;

  /** Can this cost be recovered? */
  recoverable: boolean;

  /** Recovery method (if recoverable) */
  recoveryMethod?: CostRecoveryMethod;

  /** How visible is this cost to others? */
  visibility: CostVisibility;
}

// ============================================================================
// Magic Channel - How power is shaped and directed
// ============================================================================

/** Types of magical channeling methods */
export type MagicChannelType =
  | 'verbal'         // Words, incantations, power words
  | 'somatic'        // Gestures, hand movements, poses
  | 'material'       // Components, reagents, catalysts
  | 'focus'          // Wand, staff, crystal, implement
  | 'glyph'          // Written symbols, runes, circles
  | 'musical'        // Song, instruments, rhythm
  | 'dance'          // Ritual movement, katas
  | 'will'           // Pure mental intention
  | 'true_name'      // Speaking the name of things
  | 'prayer'         // Religious invocation
  | 'blood'          // Self-harm, blood drawing
  | 'emotion'        // Intense feeling
  | 'meditation'     // Focused thought, trance
  | 'dream'          // Dreaming or lucid states
  | 'consumption'    // Eating/drinking magical substances
  | 'touch'          // Physical contact with target
  | 'link'           // Sympathetic connection (hair, photo)
  | 'tattoo'         // Body markings, brands
  | 'breath'         // Breathing patterns, spoken breath
  | 'ritual'         // Formal ritual procedures
  | 'offering'       // Physical offerings to spirits
  | 'purity'         // State of ritual cleanliness
  | 'binding'        // Mental act of creating links
  | 'rhythm'         // Musical rhythm/beat structure
  | 'instrument'     // Musical instruments
  | 'daemon'         // External soul connection
  | 'symbols'        // Reading/interpreting symbols
  | 'sleep';         // Sleep/dream state as channel

/** How required a channel is in the paradigm */
export type ChannelRequirement =
  | 'required'       // Must use this channel
  | 'optional'       // Can use but not required
  | 'enhancing'      // Provides bonus if used
  | 'forbidden';     // Cannot use this channel

/** What happens when a channel is blocked */
export type BlockEffect =
  | 'prevents_casting'  // Cannot cast at all
  | 'reduces_power'     // Spell is weaker
  | 'increases_cost'    // Spell costs more
  | 'no_effect';        // Channel wasn't needed anyway

/** Definition of a magical channel */
export interface MagicChannel {
  type: MagicChannelType;

  /** How required is this channel in the paradigm? */
  requirement: ChannelRequirement;

  /** Can masters cast without this channel? */
  canBeMastered: boolean;

  /** Skill bonus when using this channel */
  proficiencyBonus?: number;

  /** What happens if channel is blocked? (hands bound, silenced) */
  blockEffect: BlockEffect;

  /** Flavor description of this channel */
  description?: string;
}

// ============================================================================
// Magic Law - Fundamental rules that constrain magic
// ============================================================================

/** Types of magical laws */
export type MagicLawType =
  | 'conservation'         // Energy in = energy out
  | 'similarity'           // Like affects like
  | 'contagion'            // Once connected, always connected
  | 'true_names'           // Names have power over things
  | 'belief'               // Collective faith makes real
  | 'equivalent_exchange'  // Must give equal value to receive
  | 'sympathy'             // Linked things share fate
  | 'paradox'              // Reality fights impossible changes
  | 'iron_vulnerability'   // Magic weakened by cold iron
  | 'threshold'            // Permission/invitation required
  | 'oath_binding'         // Spoken vows create magical bonds
  | 'balance'              // Universe seeks equilibrium
  | 'entropy'              // Magic accelerates decay
  | 'narrative'            // Story logic has power
  | 'witness'              // Observed magic behaves differently
  | 'cycles'               // Power tied to time/season/moon
  | 'consent'              // Cannot affect the unwilling
  | 'sacrifice'            // Greater effects require greater sacrifice
  | 'resonance'            // Similar magics amplify/interfere
  | 'secrecy'              // Known magic loses power
  | 'territory'            // Magic tied to specific places/domains
  | 'bloodline'            // Power inherited through lineage
  | 'material';            // Specific materials required/forbidden

/** How strictly a law is enforced */
export type LawStrictness =
  | 'absolute'    // Cannot be broken under any circumstances
  | 'strong'      // Very difficult to break, severe consequences
  | 'weak'        // Can be bent with enough power
  | 'optional';   // More of a guideline

/** Definition of a magical law */
export interface MagicLaw {
  id: string;
  name: string;
  type: MagicLawType;

  /** How strictly is this law enforced? */
  strictness: LawStrictness;

  /** What happens when the law is violated? */
  violationConsequence?: string;

  /** Can this law be circumvented with enough power/skill? */
  canBeCircumvented: boolean;

  /** Cost multiplier for attempting to break this law */
  circumventionCostMultiplier?: number;

  /** Flavor description */
  description?: string;
}

// ============================================================================
// Magic Risk - Dangers and consequences of magic use
// ============================================================================

/** What triggers a magical risk */
export type MagicRiskTrigger =
  | 'failure'          // Spell fails its roll
  | 'critical_failure' // Catastrophic failure
  | 'overuse'          // Cast too much in short period
  | 'exhaustion'       // Depleted mana/resources
  | 'corruption'       // Used forbidden magic
  | 'paradox'          // Violated laws of magic
  | 'wild_magic'       // Random chance on any casting
  | 'divine_anger'     // Patron/god displeased
  | 'attention'        // Drew notice of entities
  | 'addiction'        // Used power too frequently
  | 'debt'             // Owe something to entity
  | 'overreach'        // Attempted beyond skill level
  | 'emotional'        // Cast while emotionally unstable
  | 'interrupted'      // Casting was disrupted
  | 'interruption'     // Spell was interrupted (alt form)
  | 'taboo_broken'     // Violated a sacred prohibition
  | 'pollution'        // Accumulated spiritual pollution
  | 'disrespect'       // Showed disrespect to spirits/entities
  | 'wrong_kami'       // Appealed to wrong spirit
  | 'slippage'         // Energy lost in sympathetic transfer
  | 'split_alar'       // Split mental focus too many ways
  | 'impure_metal'     // Used impure/wrong metal
  | 'burnout'          // Burned too much power at once
  | 'flare'            // Flared power beyond safe limits
  | 'duralumin'        // Massive power burst (Mistborn)
  | 'discord'          // Musical dissonance/wrong notes
  | 'nightmare'        // Encountered nightmare in dreams
  | 'lost'             // Got lost (in dreams, spirit world)
  | 'entity_encounter' // Encountered powerful entity
  | 'death'            // Died (in dream, etc.)
  | 'separation'       // Separated from daemon/soul
  | 'subtle_knife'     // Used the subtle knife
  | 'severance'        // Daemon/soul bond was severed
  | 'imprecision'      // Carved runes imprecisely
  | 'bindrune_failure' // Complex bindrune failed
  | 'wrong_material';  // Used wrong material for magic

/** Consequences of magical risks */
export type MagicRiskConsequence =
  | 'mishap'              // Spell goes wrong in minor way
  | 'backlash'            // Damage to caster
  | 'corruption_gain'     // Physical/mental corruption
  | 'mutation'            // Permanent transformation
  | 'possession'          // Entity takes temporary control
  | 'silence'             // Lose magic temporarily
  | 'burnout'             // Lose magic permanently
  | 'debt_called'         // Must immediately pay what's owed
  | 'attention_gained'    // Powerful entity notices you
  | 'paradox_spirit'      // Reality sends enforcers
  | 'addiction_worsens'   // Dependency deepens
  | 'memory_loss'         // Forget something
  | 'aging'               // Instantly age
  | 'wild_surge'          // Random magical effect
  | 'target_swap'         // Effect hits wrong target
  | 'delayed_effect'      // Spell triggers later randomly
  | 'permanent_mark'      // Visible sign of magic use
  | 'echo'                // Spell repeats uncontrollably
  | 'bleed_through'       // Effect leaks into nearby reality
  | 'curse'               // Cursed by spirit/entity
  | 'sickness'            // Physical illness
  | 'exhaustion'          // Severe fatigue/depletion
  | 'trapped'             // Trapped in alternate realm
  | 'coma'                // Fall into coma
  | 'spectre_creation'    // Create dangerous entity
  | 'pain'                // Intense pain
  | 'death';              // Fatal consequence

/** Severity of a risk consequence */
export type RiskSeverity =
  | 'trivial'      // Minor inconvenience
  | 'minor'        // Annoying but manageable
  | 'moderate'     // Significant problem
  | 'severe'       // Major threat
  | 'catastrophic'; // Life-changing or fatal

/** Definition of a magical risk */
export interface MagicRisk {
  trigger: MagicRiskTrigger;
  consequence: MagicRiskConsequence;
  severity: RiskSeverity;

  /** Probability when trigger occurs (0-1) */
  probability: number;

  /** Can this be mitigated with skill/preparation? */
  mitigatable: boolean;

  /** Skill check to avoid (if mitigatable) */
  mitigationSkill?: string;

  /** Description of what happens */
  description?: string;
}

// ============================================================================
// Acquisition Method - How beings gain magical ability
// ============================================================================

/** Ways to gain magical ability */
export type AcquisitionMethod =
  | 'study'          // Academic learning over time
  | 'apprenticeship' // Learning from a master
  | 'gift'           // Granted by powerful entity
  | 'bloodline'      // Inherited genetic/spiritual trait
  | 'awakening'      // Triggered by trauma/event
  | 'contract'       // Signed pact with entity
  | 'consumption'    // Ate/absorbed magical substance
  | 'infection'      // Magical disease or curse
  | 'artifact'       // Bonded to magical item
  | 'prayer'         // Devotion and faith
  | 'meditation'     // Spiritual practice
  | 'death'          // Died and returned
  | 'stolen'         // Took power from another
  | 'born'           // Natural from birth
  | 'ascension'      // Achieved higher state
  | 'random'         // Spontaneous wild magic
  | 'training'       // Formal training/practice
  | 'chosen'         // Chosen by entity/spirit
  | 'witch_clan'     // Born into witch clan
  | 'revelation';    // Revealed through ordeal/vision

/** How rare an acquisition path is */
export type AcquisitionRarity =
  | 'common'     // Many can achieve this
  | 'uncommon'   // Requires some effort/luck
  | 'rare'       // Few achieve this
  | 'legendary'; // Almost unheard of

/** Definition of an acquisition method */
export interface AcquisitionDefinition {
  method: AcquisitionMethod;

  /** How common is this path? */
  rarity: AcquisitionRarity;

  /** Can this be chosen or is it fate? */
  voluntary: boolean;

  /** Requirements to begin this path */
  prerequisites?: string[];

  /** What sources become available via this path */
  grantsAccess: string[];  // Source IDs

  /** Starting proficiency level */
  startingProficiency: number;

  /** Flavor description */
  description?: string;
}

// ============================================================================
// Spell Combinations
// ============================================================================

/** A forbidden technique + form combination */
export interface ForbiddenCombination {
  technique: MagicTechnique;
  form: MagicForm;
  reason: string;
  /** What happens if attempted anyway */
  consequence?: string;
}

/** A technique + form combination with special synergy */
export interface ResonantCombination {
  technique: MagicTechnique;
  form: MagicForm;
  bonusEffect: string;
  powerMultiplier?: number;
}

// ============================================================================
// Cross-Universe Magic Interaction
// ============================================================================

/** How a paradigm treats foreign magic */
export type ForeignMagicPolicy =
  | 'compatible'    // Works with other paradigms
  | 'incompatible'  // Does not mix
  | 'hostile'       // Actively opposes
  | 'absorbs'       // Incorporates foreign magic
  | 'transforms'    // Changes foreign magic to local type
  | 'isolated'      // Magic operates independently, no interaction
  | 'neutral'       // No special interaction
  | 'tolerant'      // Accepts foreign magic
  | 'predatory'     // Consumes foreign magic
  | 'requires_permit' // Needs authorization
  | 'gateway'       // Acts as portal for foreign magic
  | 'annihilates'   // Destroys foreign magic
  | 'trades_with';  // Exchange of magical effects

/** How foreign magic behaves in this paradigm's universe */
export type ForeignMagicEffect =
  | 'works_normally'     // No change
  | 'weakened'           // Reduced power
  | 'fails'              // Does not work
  | 'transforms'         // Becomes local magic type
  | 'backfires'          // Turns against caster
  | 'attracts_attention'; // Draws notice of local entities

/** Configuration for how foreign magic is handled */
export interface ForeignMagicConfig {
  effect: ForeignMagicEffect;
  powerModifier?: number;
  transformsInto?: string;  // Paradigm ID
  description?: string;     // Flavor text describing what happens
}

/** How power scales with skill in this paradigm */
export type PowerScaling =
  | 'linear'       // Power increases proportionally with skill
  | 'exponential'  // Power grows faster at higher skill
  | 'logarithmic'  // Diminishing returns at higher skill
  | 'step'         // Power increases in discrete thresholds
  | 'threshold';   // Certain skills unlock entirely new abilities

// ============================================================================
// The Magic Paradigm (Complete Definition)
// ============================================================================

/**
 * Complete definition of how magic works in a universe.
 *
 * A MagicParadigm is essentially a configuration object that parameterizes
 * the magic system for a universe. The same underlying engine can simulate
 * wildly different magical traditions by swapping paradigms.
 */
export interface MagicParadigm {
  id: string;
  name: string;
  description: string;

  /** Which universes use this paradigm */
  universeIds: string[];

  /** Flavor/lore about this magical tradition */
  lore?: string;

  // =========================================================================
  // Core Definitions
  // =========================================================================

  /** Available power sources in this paradigm */
  sources: MagicSource[];

  /** What magic costs */
  costs: MagicCost[];

  /** How magic is channeled */
  channels: MagicChannel[];

  /** Fundamental laws */
  laws: MagicLaw[];

  /** Risks of magic use */
  risks: MagicRisk[];

  /** How one becomes a magic user */
  acquisitionMethods: AcquisitionDefinition[];

  // =========================================================================
  // Effect Space (What magic CAN do)
  // =========================================================================

  /** Available techniques (verbs) - subset of all possible techniques */
  availableTechniques: MagicTechnique[];

  /** Available forms (nouns) - subset of all possible forms */
  availableForms: MagicForm[];

  /** Combinations that don't work in this paradigm */
  forbiddenCombinations?: ForbiddenCombination[];

  /** Combinations with special synergy */
  resonantCombinations?: ResonantCombination[];

  // =========================================================================
  // Scaling & Limits
  // =========================================================================

  /** How power scales with skill */
  powerScaling: PowerScaling;

  /** Maximum power level achievable by mortals */
  powerCeiling?: number;

  /** Whether multiple casters can combine power */
  allowsGroupCasting: boolean;

  /** Group casting bonus multiplier */
  groupCastingMultiplier?: number;

  /** Whether magic can be permanently bound to objects */
  allowsEnchantment: boolean;

  /** Whether spells persist after caster dies */
  persistsAfterDeath: boolean;

  /** Whether magic can be taught/shared */
  allowsTeaching: boolean;

  /** Whether spells can be written down and used by others */
  allowsScrolls: boolean;

  // =========================================================================
  // Interaction with Other Paradigms
  // =========================================================================

  /** How this paradigm treats foreign magic */
  foreignMagicPolicy: ForeignMagicPolicy;

  /** Paradigms this one can coexist with */
  compatibleParadigms?: string[];

  /** Paradigms that conflict with this one */
  conflictingParadigms?: string[];

  /** What happens to foreign magic entering this paradigm's universe */
  foreignMagicEffect?: ForeignMagicConfig;
}

// ============================================================================
// Cross-Universe Interaction
// ============================================================================

/** Describes how magic interacts between two paradigms */
export interface ParadigmInteraction {
  fromParadigm: string;
  toParadigm: string;

  /** Does magic still work? */
  functionality: 'full' | 'partial' | 'none' | 'inverted';

  /** Power level modification */
  powerModifier: number;  // 0.0 to 2.0

  /** Additional costs in the new paradigm */
  additionalCosts?: MagicCostType[];

  /** New risks that apply */
  additionalRisks?: MagicRiskTrigger[];

  /** Does the magic transform into the new paradigm's type? */
  transforms: boolean;

  /** Description of what happens */
  description: string;
}

/** How a mage has adapted to a foreign paradigm */
export interface ParadigmAdaptation {
  /** Which of their abilities */
  spellId: string;

  /** How it's been adapted */
  adaptationType: 'translated' | 'hybrid' | 'suppressed' | 'enhanced';

  /** New costs/channels/risks in this paradigm */
  modifications: {
    costModifier?: number;
    additionalChannels?: MagicChannelType[];
    additionalRisks?: MagicRisk[];
  };
}

/** Tracks a mage's cross-universe magical experience */
export interface CrossUniverseMage {
  /** Primary paradigm they learned */
  homeParadigmId: string;

  /** Paradigms they've learned to use */
  learnedParadigmIds: string[];

  /** Current universe paradigm */
  activeParadigmId: string;

  /** Active adaptations */
  adaptations: ParadigmAdaptation[];
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty paradigm template.
 */
export function createEmptyParadigm(id: string, name: string): MagicParadigm {
  return {
    id,
    name,
    description: '',
    universeIds: [],
    sources: [],
    costs: [],
    channels: [],
    laws: [],
    risks: [],
    acquisitionMethods: [],
    availableTechniques: [],
    availableForms: [],
    powerScaling: 'linear',
    allowsGroupCasting: false,
    allowsEnchantment: false,
    persistsAfterDeath: false,
    allowsTeaching: false,
    allowsScrolls: false,
    foreignMagicPolicy: 'compatible',
  };
}

/**
 * Create a basic mana-based source.
 */
export function createManaSource(regenRate: number = 0.01): MagicSource {
  return {
    id: 'mana',
    name: 'Mana',
    type: 'internal',
    regeneration: 'rest',
    regenRate,
    storable: true,
    transferable: true,
    stealable: false,
    detectability: 'subtle',
    description: 'Internal pool of magical energy',
  };
}

/**
 * Create a basic mana cost.
 */
export function createManaCost(): MagicCost {
  return {
    type: 'mana',
    canBeTerminal: false,
    cumulative: false,
    recoverable: true,
    recoveryMethod: 'rest',
    visibility: 'hidden',
  };
}

/**
 * Create standard verbal + somatic channels.
 */
export function createStandardChannels(): MagicChannel[] {
  return [
    {
      type: 'verbal',
      requirement: 'required',
      canBeMastered: true,
      blockEffect: 'prevents_casting',
    },
    {
      type: 'somatic',
      requirement: 'required',
      canBeMastered: true,
      blockEffect: 'reduces_power',
    },
  ];
}

/**
 * Create a conservation law.
 */
export function createConservationLaw(): MagicLaw {
  return {
    id: 'conservation',
    name: 'Conservation of Thaumic Energy',
    type: 'conservation',
    strictness: 'strong',
    canBeCircumvented: false,
    description: 'Energy cannot be created or destroyed, only transformed',
  };
}

/**
 * Create a basic study acquisition method.
 */
export function createStudyAcquisition(
  sourceIds: string[] = ['mana'],
  proficiency: number = 5
): AcquisitionDefinition {
  return {
    method: 'study',
    rarity: 'common',
    voluntary: true,
    prerequisites: ['literacy'],
    grantsAccess: sourceIds,
    startingProficiency: proficiency,
    description: 'Learn magic through academic study',
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a paradigm is well-formed.
 */
export function validateParadigm(paradigm: MagicParadigm): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!paradigm.id) {
    errors.push('Paradigm must have an id');
  }

  if (!paradigm.name) {
    errors.push('Paradigm must have a name');
  }

  if (paradigm.sources.length === 0) {
    errors.push('Paradigm must have at least one source');
  }

  if (paradigm.costs.length === 0) {
    errors.push('Paradigm must have at least one cost type');
  }

  if (paradigm.acquisitionMethods.length === 0) {
    errors.push('Paradigm must have at least one acquisition method');
  }

  // Check that acquisition methods reference valid sources
  const sourceIds = new Set(paradigm.sources.map(s => s.id));
  for (const acq of paradigm.acquisitionMethods) {
    for (const grantedSource of acq.grantsAccess) {
      if (!sourceIds.has(grantedSource)) {
        errors.push(`Acquisition method '${acq.method}' grants access to unknown source '${grantedSource}'`);
      }
    }
  }

  // Check forbidden combinations reference valid techniques/forms
  if (paradigm.forbiddenCombinations) {
    for (const combo of paradigm.forbiddenCombinations) {
      if (!paradigm.availableTechniques.includes(combo.technique)) {
        errors.push(`Forbidden combination references unavailable technique '${combo.technique}'`);
      }
      if (!paradigm.availableForms.includes(combo.form)) {
        errors.push(`Forbidden combination references unavailable form '${combo.form}'`);
      }
    }
  }

  // Check resonant combinations reference valid techniques/forms
  if (paradigm.resonantCombinations) {
    for (const combo of paradigm.resonantCombinations) {
      if (!paradigm.availableTechniques.includes(combo.technique)) {
        errors.push(`Resonant combination references unavailable technique '${combo.technique}'`);
      }
      if (!paradigm.availableForms.includes(combo.form)) {
        errors.push(`Resonant combination references unavailable form '${combo.form}'`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
