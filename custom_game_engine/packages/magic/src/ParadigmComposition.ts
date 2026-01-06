/**
 * ParadigmComposition - Multi-paradigm magic and hybrid systems
 *
 * IMPORTANT DISTINCTION:
 * - Paradigm RELATIONSHIPS describe how paradigms interact when a SINGLE
 *   PRACTITIONER tries to use both (e.g., you can't serve both a god AND
 *   a demon - that's the Divine+Pact 'exclusive' relationship)
 * - Multiple paradigms can COEXIST in the same UNIVERSE (a Cleric and a
 *   Warlock can be in the same party, they just can't be the same person)
 *
 * This module handles:
 *
 * 1. Multi-paradigm practitioners - mages who know multiple systems
 * 2. Paradigm layering - universes with multiple active paradigms
 * 3. Hybrid paradigms - merged traditions creating new magic
 * 4. Paradigm interference - when systems conflict or resonate
 * 5. Cross-paradigm artifacts - items enchanted with multiple traditions
 */

import type {
  MagicParadigm,
  MagicCostType,
  MagicChannelType,
} from './MagicParadigm.js';
import type { MagicTechnique, MagicForm } from '@ai-village/core';

// ============================================================================
// Universe Paradigm Configuration
// ============================================================================

/** How paradigms interact in a universe */
export type ParadigmRelationship =
  | 'isolated'       // Paradigms don't interact at all
  | 'coexistent'     // Both work independently
  | 'synergistic'    // Enhance each other
  | 'competitive'    // Weaken each other
  | 'exclusive'      // Using one blocks the other
  | 'parasitic'      // One feeds on the other
  | 'symbiotic'      // Both benefit from combination
  | 'merged';        // Have become a hybrid paradigm

/** Rules for how paradigms combine in a universe */
export interface ParadigmLayerConfig {
  /** Paradigms active in this universe */
  activeParadigms: string[];

  /** Primary/dominant paradigm (if any) */
  primaryParadigm?: string;

  /** Relationships between paradigm pairs */
  relationships: ParadigmRelationshipMap;

  /** Can practitioners learn multiple paradigms? */
  allowsMultiClass: boolean;

  /** Maximum paradigms a single practitioner can know */
  maxParadigmsPerPractitioner: number;

  /** How power combines when using multiple paradigms */
  powerCombination: 'additive' | 'multiplicative' | 'highest' | 'average';

  /** Do paradigms share cooldowns/resources? */
  sharedResources: boolean;

  /** Can spells be cast using multiple paradigms simultaneously? */
  allowsSimultaneousCasting: boolean;

  /** Hybrid paradigms that have emerged */
  hybridParadigms?: HybridParadigm[];
}

/** Map of paradigm pair relationships */
export type ParadigmRelationshipMap = Record<string, Record<string, ParadigmRelationshipConfig>>;

/** Configuration for a specific paradigm pair relationship */
export interface ParadigmRelationshipConfig {
  relationship: ParadigmRelationship;

  /** Power modifier when both are used (1.0 = normal) */
  powerModifier: number;

  /** Cost modifier when switching between them */
  switchingCost: number;

  /** Risk increase when mixing */
  riskModifier: number;

  /** Specific interactions or effects */
  specialEffects?: string[];

  /** Lore explanation */
  lore?: string;
}

// ============================================================================
// Multi-Paradigm Practitioners
// ============================================================================

/** A practitioner's relationship with a paradigm */
export interface ParadigmMastery {
  paradigmId: string;

  /** Overall mastery level (0-100) */
  masteryLevel: number;

  /** When this paradigm was learned */
  learnedAt: number;

  /** How was it acquired */
  acquisitionMethod: string;

  /** Primary paradigm of this practitioner */
  isPrimary: boolean;

  /** Restrictions on this paradigm's use */
  restrictions?: string[];

  /** Paradigm-specific achievements/unlocks */
  milestones?: string[];
}

/** Rules for multi-paradigm casting */
export interface MultiParadigmCaster {
  /** Paradigms known */
  masteries: ParadigmMastery[];

  /** Current active paradigm (for switching costs) */
  activeParadigmId: string;

  /** Cooldown for paradigm switching (ticks) */
  switchingCooldown: number;

  /** Last time paradigm was switched */
  lastSwitchTick?: number;

  /** Hybrid abilities unlocked by knowing multiple paradigms */
  hybridAbilities: HybridAbility[];

  /** Conflicts/instabilities from mixing paradigms */
  instabilities?: ParadigmInstability[];
}

/** An ability that only exists from combining paradigms */
export interface HybridAbility {
  id: string;
  name: string;
  description: string;

  /** Paradigms required to unlock this ability */
  requiredParadigms: string[];

  /** Minimum mastery in each paradigm */
  minimumMastery: number;

  /** What techniques this enables */
  enablesTechniques?: MagicTechnique[];

  /** What forms this enables */
  enablesForms?: MagicForm[];

  /** Unique effects only possible through combination */
  uniqueEffects?: string[];
}

/** Instability from incompatible paradigms */
export interface ParadigmInstability {
  /** Which paradigms conflict */
  paradigms: [string, string];

  /** Severity of the instability */
  severity: 'minor' | 'moderate' | 'severe';

  /** How it manifests */
  manifestation: string;

  /** Trigger conditions */
  triggers?: string[];

  /** Consequences */
  consequences?: string[];
}

// ============================================================================
// Hybrid Paradigms
// ============================================================================

/**
 * A hybrid paradigm created by merging two or more traditions.
 */
export interface HybridParadigm extends MagicParadigm {
  /** This is a hybrid */
  isHybrid: true;

  /** Source paradigms this was created from */
  sourceParadigms: string[];

  /** How the paradigms merged */
  mergeType: 'fusion' | 'overlay' | 'alternating' | 'selective';

  /** Which elements were taken from each source */
  inheritance: ParadigmInheritance;

  /** Unique elements that only exist in the hybrid */
  emergentProperties: EmergentProperty[];

  /** Stability of the hybrid (can it persist?) */
  stability: 'stable' | 'unstable' | 'volatile';

  /** Requirements to practice this hybrid */
  prerequisites?: string[];

  /** History of how this paradigm emerged */
  originLore?: string;
}

/** What was inherited from source paradigms */
export interface ParadigmInheritance {
  /** Source ID -> what was inherited */
  inherited: Record<string, InheritedElements>;
}

/** Elements inherited from a source paradigm */
export interface InheritedElements {
  sources: string[];      // Source IDs
  costs: MagicCostType[];
  channels: MagicChannelType[];
  laws: string[];         // Law IDs
  techniques: MagicTechnique[];
  forms: MagicForm[];
}

/** Properties that emerge only in the hybrid */
export interface EmergentProperty {
  name: string;
  description: string;
  type: 'source' | 'cost' | 'channel' | 'law' | 'technique' | 'form' | 'effect';
  definition: unknown;  // Depends on type
}

// ============================================================================
// Cross-Paradigm Artifacts
// ============================================================================

/** An artifact created with multiple paradigm influences */
export interface MultiParadigmArtifact {
  /** Base item ID */
  itemId: string;

  /** Enchantments from each paradigm */
  enchantments: ArtifactEnchantment[];

  /** How the enchantments interact */
  enchantmentInteraction: 'layered' | 'merged' | 'alternating' | 'conflicting';

  /** Combined power level */
  totalPower: number;

  /** Stability of the combination */
  stability: number;  // 0-100, below 50 is unstable

  /** Special properties from the combination */
  combinedEffects?: string[];

  /** Risks from the combination */
  combinedRisks?: string[];

  /** Which paradigm's rules dominate */
  dominantParadigm?: string;
}

/** A single paradigm's contribution to an artifact */
export interface ArtifactEnchantment {
  paradigmId: string;
  enchantmentType: string;
  powerLevel: number;
  effects: string[];

  /** Does this enchantment conflict with others? */
  conflicts?: string[];

  /** Does this enchantment synergize with others? */
  synergies?: string[];
}

// ============================================================================
// Pre-defined Paradigm Relationships
// ============================================================================

/** Common relationship configurations */
export const PARADIGM_RELATIONSHIPS: Record<string, ParadigmRelationshipConfig> = {
  // Academic + Names = highly compatible, scholarly traditions
  'academic_names': {
    relationship: 'synergistic',
    powerModifier: 1.2,
    switchingCost: 0,
    riskModifier: 0.9,
    lore: 'True names and academic theory complement each other perfectly',
  },

  // Academic + Divine = coexistent, different domains
  'academic_divine': {
    relationship: 'coexistent',
    powerModifier: 1.0,
    switchingCost: 0.2,
    riskModifier: 1.0,
    lore: 'Wizards and priests have coexisted for millennia',
  },

  // Academic + Pact = competitive, fundamentally opposed philosophies
  'academic_pact': {
    relationship: 'competitive',
    powerModifier: 0.7,
    switchingCost: 0.5,
    riskModifier: 1.5,
    lore: 'Academic magic sees pact magic as dangerous shortcuts',
  },

  // Academic + Blood = exclusive, fundamentally incompatible
  'academic_blood': {
    relationship: 'exclusive',
    powerModifier: 0.5,
    switchingCost: 1.0,
    riskModifier: 2.0,
    lore: 'Blood magic corrupts the precise structures of academic magic',
  },

  // Divine + Pact = exclusive, sworn enemies
  'divine_pact': {
    relationship: 'exclusive',
    powerModifier: 0.0,  // Cannot use both
    switchingCost: Infinity,
    riskModifier: 3.0,
    specialEffects: ['deity_anger', 'patron_jealousy'],
    lore: 'No deity tolerates traffic with demons',
  },

  // Divine + Blood = competitive
  'divine_blood': {
    relationship: 'competitive',
    powerModifier: 0.6,
    switchingCost: 0.8,
    riskModifier: 1.8,
    lore: 'Blood magic offends most deities',
  },

  // Pact + Blood = symbiotic, dark alliance
  'pact_blood': {
    relationship: 'symbiotic',
    powerModifier: 1.5,
    switchingCost: 0,
    riskModifier: 1.3,
    specialEffects: ['corruption_accelerated', 'power_amplified'],
    lore: 'Blood and pact magic feed the same dark hungers',
  },

  // Names + Emotional = isolated, unrelated systems
  'names_emotional': {
    relationship: 'isolated',
    powerModifier: 1.0,
    switchingCost: 0.3,
    riskModifier: 1.0,
    lore: 'True names and emotional magic operate on different principles entirely',
  },

  // Breath + Emotional = synergistic, both life-based
  'breath_emotional': {
    relationship: 'synergistic',
    powerModifier: 1.3,
    switchingCost: 0.1,
    riskModifier: 0.8,
    lore: 'Breath and emotion both spring from the essence of life',
  },

  // Breath + Blood = parasitic, blood drains breath
  'breath_blood': {
    relationship: 'parasitic',
    powerModifier: 0.8,  // Blood diminishes breath
    switchingCost: 0.5,
    riskModifier: 1.6,
    specialEffects: ['breath_drain_accelerated'],
    lore: 'Blood magic hungers for the life force that breath magic embodies',
  },
};

/**
 * Get the relationship between two paradigms.
 */
export function getParadigmRelationship(
  paradigmA: string,
  paradigmB: string
): ParadigmRelationshipConfig {
  // Check both orderings
  const key1 = `${paradigmA}_${paradigmB}`;
  const key2 = `${paradigmB}_${paradigmA}`;

  if (PARADIGM_RELATIONSHIPS[key1]) {
    return PARADIGM_RELATIONSHIPS[key1];
  }
  if (PARADIGM_RELATIONSHIPS[key2]) {
    return PARADIGM_RELATIONSHIPS[key2];
  }

  // Default: isolated relationship
  return {
    relationship: 'isolated',
    powerModifier: 1.0,
    switchingCost: 0.3,
    riskModifier: 1.0,
  };
}

// ============================================================================
// Pre-defined Hybrid Paradigms
// ============================================================================

/**
 * Theurgy - Divine + Academic merger
 * Scholarly approach to divine magic, treating prayer as precise formulas
 */
export const THEURGY_PARADIGM: HybridParadigm = {
  id: 'theurgy',
  name: 'Theurgy',
  description: 'Scholarly divine magic - prayer as precise formula',
  universeIds: ['hybrid_realms'],
  isHybrid: true,
  sourceParadigms: ['divine', 'academic'],
  mergeType: 'fusion',

  lore: `When academic mages began studying divine miracles, they discovered that
prayers follow patterns as precise as any spell formula. Theurgy treats
divine favor as a force to be understood, not merely petitioned.`,

  inheritance: {
    inherited: {
      divine: {
        sources: ['divine_grace'],
        costs: ['favor'],
        channels: ['prayer'],
        laws: ['divine_will'],
        techniques: ['protect', 'enhance'],
        forms: ['body', 'spirit'],
      },
      academic: {
        sources: ['mana'],
        costs: ['mana'],
        channels: ['verbal', 'somatic', 'glyph'],
        laws: ['conservation'],
        techniques: ['perceive', 'control'],
        forms: ['mind', 'image'],
      },
    },
  },

  emergentProperties: [
    {
      name: 'Divine Formulae',
      description: 'Spells that combine mana and divine favor for reliable miracles',
      type: 'effect',
      definition: { reliabilityBonus: 0.2, divinePowerBonus: 0.1 },
    },
    {
      name: 'Theological Analysis',
      description: 'Can analyze and understand divine magic academically',
      type: 'technique',
      definition: 'perceive_divine',
    },
  ],

  stability: 'stable',
  prerequisites: ['academic:30', 'divine:30'],
  originLore: 'Developed in the Grand Seminary where mages and priests studied together',

  // Standard paradigm fields
  sources: [
    {
      id: 'theurgic_power',
      name: 'Theurgic Power',
      type: 'divine',
      regeneration: 'prayer',
      regenRate: 0.015,
      storable: true,
      transferable: false,
      stealable: false,
      detectability: 'subtle',
      description: 'Divine power channeled through academic understanding',
    },
  ],

  costs: [
    { type: 'mana', canBeTerminal: false, cumulative: false, recoverable: true, recoveryMethod: 'rest', visibility: 'hidden' },
    { type: 'favor', canBeTerminal: true, cumulative: true, recoverable: true, recoveryMethod: 'ritual', visibility: 'hidden' },
  ],

  channels: [
    { type: 'prayer', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
    { type: 'verbal', requirement: 'required', canBeMastered: true, blockEffect: 'reduces_power' },
    { type: 'glyph', requirement: 'optional', canBeMastered: false, blockEffect: 'no_effect', proficiencyBonus: 10 },
  ],

  laws: [
    { id: 'divine_formula', name: 'Divine Formulae', type: 'conservation', strictness: 'strong', canBeCircumvented: false,
      description: 'Divine power follows mathematical laws when properly understood' },
    { id: 'theological_limits', name: 'Theological Limits', type: 'consent', strictness: 'strong', canBeCircumvented: false,
      description: 'Cannot cast against deity\'s nature, but can optimize within it' },
  ],

  risks: [
    { trigger: 'failure', consequence: 'mishap', severity: 'minor', probability: 0.15, mitigatable: true },
    { trigger: 'divine_anger', consequence: 'silence', severity: 'moderate', probability: 0.3, mitigatable: false,
      description: 'Deity dislikes being treated as a formula' },
  ],

  acquisitionMethods: [
    { method: 'study', rarity: 'rare', voluntary: true, prerequisites: ['divine:30', 'academic:30'],
      grantsAccess: ['theurgic_power'], startingProficiency: 20 },
  ],

  availableTechniques: ['create', 'perceive', 'control', 'protect', 'enhance'],
  availableForms: ['body', 'mind', 'spirit', 'image', 'fire', 'water'],

  powerScaling: 'logarithmic',
  powerCeiling: 90,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.3,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'compatible',
};

/**
 * Hemomancy - Blood + Pact merger
 * Blood magic empowered by demonic pacts
 */
export const HEMOMANCY_PARADIGM: HybridParadigm = {
  id: 'hemomancy',
  name: 'Hemomancy',
  description: 'Blood magic empowered by demonic pacts - the darkest art',
  universeIds: ['dark_realms'],
  isHybrid: true,
  sourceParadigms: ['blood', 'pact'],
  mergeType: 'fusion',

  lore: `Those who traffic with demons and practice blood magic discover that the
two arts feed each other. Demons hunger for blood, and blood magic grows
stronger with demonic backing. Hemomancers are feared and hunted everywhere.`,

  inheritance: {
    inherited: {
      blood: {
        sources: ['blood'],
        costs: ['blood', 'corruption', 'lifespan'],
        channels: ['blood'],
        laws: ['sacrifice'],
        techniques: ['destroy', 'control'],
        forms: ['body', 'mind'],
      },
      pact: {
        sources: ['patron'],
        costs: ['favor', 'soul_fragment'],
        channels: ['will'],
        laws: ['oath_binding'],
        techniques: ['summon'],
        forms: ['spirit', 'void'],
      },
    },
  },

  emergentProperties: [
    {
      name: 'Blood Pact',
      description: 'Pact sealed in blood is unbreakable and more powerful',
      type: 'law',
      definition: { name: 'Blood Oath', strictness: 'absolute' },
    },
    {
      name: 'Demonic Hunger',
      description: 'Patron feeds on blood sacrifices, granting more power',
      type: 'effect',
      definition: { sacrificePowerMultiplier: 2.0 },
    },
    {
      name: 'Soul Drain',
      description: 'Can drain souls through blood to feed patron',
      type: 'technique',
      definition: 'drain_soul',
    },
  ],

  stability: 'volatile',
  prerequisites: ['blood:40', 'pact:40'],
  originLore: 'Forbidden knowledge passed between demons and their most devoted servants',

  sources: [
    {
      id: 'hemomantic_power',
      name: 'Hemomantic Power',
      type: 'void',
      regeneration: 'consumption',
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'beacon',
      description: 'Power that hungers for blood and soul',
    },
  ],

  costs: [
    { type: 'blood', canBeTerminal: true, cumulative: true, recoverable: true, recoveryMethod: 'rest', visibility: 'obvious' },
    { type: 'soul_fragment', canBeTerminal: true, cumulative: true, recoverable: false, visibility: 'hidden' },
    { type: 'corruption', canBeTerminal: true, cumulative: true, recoverable: false, visibility: 'subtle' },
  ],

  channels: [
    { type: 'blood', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
    { type: 'will', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
  ],

  laws: [
    { id: 'blood_oath', name: 'Blood Oath', type: 'oath_binding', strictness: 'absolute', canBeCircumvented: false,
      violationConsequence: 'Soul immediately forfeit', description: 'Blood pacts cannot be broken' },
    { id: 'eternal_hunger', name: 'Eternal Hunger', type: 'sacrifice', strictness: 'absolute', canBeCircumvented: false,
      description: 'The power always demands more blood' },
  ],

  risks: [
    { trigger: 'overuse', consequence: 'addiction_worsens', severity: 'severe', probability: 0.5, mitigatable: false },
    { trigger: 'exhaustion', consequence: 'possession', severity: 'catastrophic', probability: 0.3, mitigatable: false },
    { trigger: 'debt', consequence: 'debt_called', severity: 'catastrophic', probability: 1.0, mitigatable: false },
  ],

  acquisitionMethods: [
    { method: 'contract', rarity: 'legendary', voluntary: true, prerequisites: ['blood:40', 'pact:40', 'demon_contact'],
      grantsAccess: ['hemomantic_power'], startingProficiency: 40, description: 'Seal a blood pact with a demon lord' },
  ],

  availableTechniques: ['destroy', 'control', 'transform', 'summon'],
  availableForms: ['body', 'mind', 'spirit', 'void', 'animal'],

  powerScaling: 'exponential',
  powerCeiling: 250,  // Extremely powerful but dangerous
  allowsGroupCasting: true,
  groupCastingMultiplier: 4.0,  // Rituals with multiple practitioners are devastating
  allowsEnchantment: true,
  persistsAfterDeath: true,  // The hunger lives on
  allowsTeaching: false,  // Cannot be taught, must be chosen
  allowsScrolls: false,
  foreignMagicPolicy: 'hostile',
  conflictingParadigms: ['divine', 'academic'],
};

/**
 * Namebreath - Names + Breath merger
 * Speaking true names while investing breath for permanent effects
 */
export const NAMEBREATH_PARADIGM: HybridParadigm = {
  id: 'namebreath',
  name: 'Namebreath',
  description: 'True names spoken with invested breath create living words',
  universeIds: ['word_realms'],
  isHybrid: true,
  sourceParadigms: ['names', 'breath'],
  mergeType: 'overlay',

  lore: `In the Word Realms, some discovered that true names spoken with invested
Breath don't just command - they create. A name spoken with Breath becomes
a living thing, a word with will. The Namebreathers can speak beings into
existence, name-sculpting reality itself.`,

  inheritance: {
    inherited: {
      names: {
        sources: ['knowledge'],
        costs: ['sanity'],
        channels: ['true_name', 'verbal'],
        laws: ['true_names'],
        techniques: ['control', 'perceive'],
        forms: ['fire', 'water', 'earth', 'air'],
      },
      breath: {
        sources: ['breath'],
        costs: ['health'],
        channels: ['will', 'touch'],
        laws: ['awakening_cost'],
        techniques: ['create', 'enhance'],
        forms: ['body', 'image'],
      },
    },
  },

  emergentProperties: [
    {
      name: 'Living Words',
      description: 'Names spoken with Breath become semi-sentient servitors',
      type: 'effect',
      definition: { createsSentientWord: true, breathCost: 10, duration: 'until_dismissed' },
    },
    {
      name: 'Name Sculpting',
      description: 'Can permanently modify true names by investing Breath',
      type: 'technique',
      definition: 'sculpt_name',
    },
    {
      name: 'Word of Creation',
      description: 'At sufficient mastery, can speak new things into existence',
      type: 'technique',
      definition: 'create_from_name',
    },
  ],

  stability: 'stable',
  prerequisites: ['names:30', 'breath:30'],
  originLore: 'The Poets of the First Age discovered that names are alive',

  sources: [
    {
      id: 'living_word',
      name: 'Living Word',
      type: 'knowledge',
      regeneration: 'none',
      storable: true,
      transferable: true,
      stealable: false,
      detectability: 'subtle',
      description: 'Words that breathe and have will',
    },
  ],

  costs: [
    { type: 'health', canBeTerminal: true, cumulative: true, recoverable: false, visibility: 'obvious' },  // Breaths
    { type: 'sanity', canBeTerminal: false, cumulative: true, recoverable: true, recoveryMethod: 'rest', visibility: 'subtle' },
  ],

  channels: [
    { type: 'true_name', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
    { type: 'verbal', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
    { type: 'will', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
  ],

  laws: [
    { id: 'living_words', name: 'Living Words', type: 'true_names', strictness: 'absolute', canBeCircumvented: false,
      description: 'Words spoken with Breath have their own will and may not obey perfectly' },
    { id: 'name_permanence', name: 'Name Permanence', type: 'balance', strictness: 'strong', canBeCircumvented: false,
      description: 'Changes to true names ripple through reality' },
  ],

  risks: [
    { trigger: 'failure', consequence: 'wild_surge', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'Misspoken names with Breath create chaotic word-creatures' },
    { trigger: 'overuse', consequence: 'echo', severity: 'severe', probability: 0.2, mitigatable: false,
      description: 'Too many living words and they start speaking on their own' },
  ],

  acquisitionMethods: [
    { method: 'meditation', rarity: 'rare', voluntary: true, prerequisites: ['names:30', 'breath:30'],
      grantsAccess: ['living_word'], startingProficiency: 25 },
  ],

  availableTechniques: ['create', 'control', 'perceive', 'enhance', 'transform'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'image', 'plant', 'animal'],

  powerScaling: 'exponential',
  powerCeiling: undefined,  // No limit, but Breath supply limits you
  allowsGroupCasting: true,
  groupCastingMultiplier: 2.5,
  allowsEnchantment: true,  // Words can be inscribed with Breath
  persistsAfterDeath: true,  // Living words outlive their creator
  allowsTeaching: true,
  allowsScrolls: true,  // Scrolls that breathe
  foreignMagicPolicy: 'absorbs',
};

// ============================================================================
// Hybrid Registry
// ============================================================================

export const HYBRID_PARADIGM_REGISTRY: Record<string, HybridParadigm> = {
  theurgy: THEURGY_PARADIGM,
  hemomancy: HEMOMANCY_PARADIGM,
  namebreath: NAMEBREATH_PARADIGM,
};

/**
 * Get a hybrid paradigm by ID.
 */
export function getHybridParadigm(id: string): HybridParadigm | undefined {
  return HYBRID_PARADIGM_REGISTRY[id];
}

/**
 * Find hybrid paradigms that could be learned given known paradigms.
 */
export function getAvailableHybrids(knownParadigms: string[]): HybridParadigm[] {
  return Object.values(HYBRID_PARADIGM_REGISTRY).filter(hybrid => {
    // Check if all source paradigms are known
    return hybrid.sourceParadigms.every(source =>
      knownParadigms.some(known => known.startsWith(source))
    );
  });
}

/**
 * Calculate the combined power modifier for multiple paradigms.
 */
export function calculateMultiParadigmPower(
  paradigmIds: string[],
  powerCombination: 'additive' | 'multiplicative' | 'highest' | 'average' = 'average'
): number {
  if (paradigmIds.length <= 1) return 1.0;

  // Get all pairwise relationships
  let totalModifier = 1.0;
  const modifiers: number[] = [];

  for (let i = 0; i < paradigmIds.length; i++) {
    for (let j = i + 1; j < paradigmIds.length; j++) {
      const rel = getParadigmRelationship(paradigmIds[i]!, paradigmIds[j]!);
      modifiers.push(rel.powerModifier);
    }
  }

  switch (powerCombination) {
    case 'additive':
      totalModifier = modifiers.reduce((a, b) => a + b, 0) / modifiers.length;
      break;
    case 'multiplicative':
      totalModifier = modifiers.reduce((a, b) => a * b, 1.0);
      break;
    case 'highest':
      totalModifier = Math.max(...modifiers);
      break;
    case 'average':
    default:
      totalModifier = modifiers.reduce((a, b) => a + b, 0) / modifiers.length;
      break;
  }

  return totalModifier;
}

/**
 * Check if paradigm combination is stable.
 */
export function isParadigmCombinationStable(paradigmIds: string[]): {
  stable: boolean;
  conflicts: Array<{ paradigms: [string, string]; relationship: ParadigmRelationship }>;
} {
  const conflicts: Array<{ paradigms: [string, string]; relationship: ParadigmRelationship }> = [];

  for (let i = 0; i < paradigmIds.length; i++) {
    for (let j = i + 1; j < paradigmIds.length; j++) {
      const rel = getParadigmRelationship(paradigmIds[i]!, paradigmIds[j]!);
      if (rel.relationship === 'exclusive' || rel.relationship === 'parasitic') {
        conflicts.push({
          paradigms: [paradigmIds[i]!, paradigmIds[j]!],
          relationship: rel.relationship,
        });
      }
    }
  }

  return {
    stable: conflicts.length === 0,
    conflicts,
  };
}
