/**
 * ArtifactCreation - How magical items are created within each paradigm
 *
 * Different paradigms have fundamentally different approaches to imbuing
 * objects with magical power. This module defines the rules and processes
 * for artifact creation per paradigm.
 */

import type { MagicCostType, MagicChannelType, MagicRiskTrigger, MagicRiskConsequence } from './MagicParadigm.js';
import type { MagicTechnique, MagicForm } from '../components/MagicComponent.js';

// ============================================================================
// Enchantment Method Types
// ============================================================================

/** How magic is bound to objects in this paradigm */
export type EnchantmentMethod =
  | 'ritual_binding'     // Academic - careful ritual to bind spell into object
  | 'awakening'          // Breath - invest life force to grant sentience
  | 'inscription'        // Names - write true names to grant properties
  | 'entity_binding'     // Pact - trap a spirit/demon inside the object
  | 'blood_feeding'      // Blood - feed the object blood until it awakens
  | 'consecration'       // Divine - bless and dedicate to a deity
  | 'emotional_imprint'  // Emotional - intense emotion leaves a mark
  | 'natural_accretion'  // Wild - magic accumulates naturally over time
  | 'forging'            // Craft - imbue during creation process
  | 'sacrifice'          // Sacrifice - kill something to power the enchantment
  | 'dreaming'           // Dream - enchant while in dream state
  | 'singing'            // Musical - sing the magic into being
  | 'forbidden';         // Some paradigms forbid artifact creation

/** What kinds of objects can be enchanted */
export type EnchantableCategory =
  | 'weapons'            // Swords, bows, etc.
  | 'armor'              // Protective gear
  | 'jewelry'            // Rings, amulets, etc.
  | 'tools'              // Crafting implements
  | 'containers'         // Bags, boxes, etc.
  | 'clothing'           // Robes, cloaks, etc.
  | 'structures'         // Buildings, doors, etc.
  | 'natural_objects'    // Stones, trees, etc.
  | 'corpses'            // Undead creation
  | 'art'                // Paintings, sculptures
  | 'books'              // Scrolls, tomes
  | 'consumables'        // Potions, food
  | 'any';               // No restrictions

/** How permanent is the enchantment */
export type EnchantmentPermanence =
  | 'permanent'          // Lasts forever
  | 'semi_permanent'     // Lasts until specific condition
  | 'charged'            // Has limited uses
  | 'sustained'          // Requires ongoing power
  | 'decaying'           // Slowly loses power over time
  | 'conditional';       // Only active under certain conditions

/** Can the artifact think/act on its own */
export type ArtifactSentience =
  | 'none'               // Just an enchanted object
  | 'reactive'           // Responds to triggers
  | 'semi_sentient'      // Has basic awareness/preferences
  | 'sentient'           // Fully conscious
  | 'possessed';         // Contains an entity

// ============================================================================
// Enchantment Process Definition
// ============================================================================

/** Cost specific to enchantment (may differ from casting costs) */
export interface EnchantmentCost {
  type: MagicCostType;

  /** Base amount for simplest enchantment */
  baseAmount: number;

  /** Multiplier per power level */
  powerMultiplier: number;

  /** Is this cost permanent (not just spent but lost forever)? */
  permanent: boolean;

  /** Description of why this cost applies */
  reason?: string;
}

/** Requirements for enchantment */
export interface EnchantmentRequirement {
  /** Minimum proficiency in a technique */
  techniqueProficiency?: Partial<Record<MagicTechnique, number>>;

  /** Minimum proficiency in a form */
  formProficiency?: Partial<Record<MagicForm, number>>;

  /** Required materials/components */
  materials?: MaterialRequirement[];

  /** Required location type */
  location?: 'anywhere' | 'sacred_space' | 'ley_line' | 'temple' | 'workshop' | 'natural_place';

  /** Required time (in game ticks) */
  minimumTime?: number;

  /** Required moon phase, season, etc. */
  celestialCondition?: string;

  /** Must have assistant(s) */
  requiredAssistants?: number;

  /** Patron must approve (for pact magic) */
  patronApproval?: boolean;

  /** Deity must approve (for divine magic) */
  deityApproval?: boolean;
}

/** Material needed for enchantment */
export interface MaterialRequirement {
  /** Item ID or category */
  itemIdOrCategory: string;

  /** Quantity needed */
  quantity: number;

  /** Is it consumed in the process? */
  consumed: boolean;

  /** Quality requirement */
  minQuality?: number;

  /** Why this material is needed */
  purpose?: string;
}

/** Risk specific to enchantment */
export interface EnchantmentRisk {
  trigger: MagicRiskTrigger | 'enchantment_failure' | 'incompatible_vessel' | 'power_overflow';
  consequence: MagicRiskConsequence | 'cursed_item' | 'explosion' | 'entity_escape' | 'bond_to_item';
  severity: 'trivial' | 'minor' | 'moderate' | 'severe' | 'catastrophic';
  probability: number;
  description: string;
}

/** Limitations on what the enchantment can do */
export interface EnchantmentLimits {
  /** Maximum power level for a single enchantment */
  maxPowerPerEnchantment?: number;

  /** Maximum enchantments per object */
  maxEnchantmentsPerObject?: number;

  /** Maximum total power in one object */
  maxTotalPower?: number;

  /** Some effect types are forbidden */
  forbiddenEffects?: string[];

  /** Some technique+form combos can't be enchanted */
  forbiddenCombinations?: Array<{ technique: MagicTechnique; form: MagicForm }>;

  /** Object size constraints */
  sizeConstraints?: {
    minSize?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
    maxSize?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  };
}

// ============================================================================
// The Enchantment System (Per Paradigm)
// ============================================================================

/**
 * Complete definition of how enchantment works in a paradigm.
 */
export interface EnchantmentSystem {
  /** Paradigm this system belongs to */
  paradigmId: string;

  /** Is enchantment possible at all? */
  enabled: boolean;

  /** Why enchantment is forbidden (if disabled) */
  disabledReason?: string;

  /** Primary method of enchantment */
  primaryMethod: EnchantmentMethod;

  /** Alternative methods available */
  alternativeMethods?: EnchantmentMethod[];

  // === What Can Be Enchanted ===

  /** Categories of objects that can be enchanted */
  enchantableCategories: EnchantableCategory[];

  /** Specific items that cannot be enchanted even if category allows */
  forbiddenItems?: string[];

  /** Materials that enhance enchantment */
  enhancingMaterials?: string[];

  /** Materials that resist/block enchantment */
  resistantMaterials?: string[];

  // === The Process ===

  /** Required channels for enchantment */
  requiredChannels: MagicChannelType[];

  /** Base costs for any enchantment */
  baseCosts: EnchantmentCost[];

  /** General requirements */
  requirements: EnchantmentRequirement;

  /** How long base enchantment takes (ticks) */
  baseTime: number;

  /** Time multiplier per power level */
  timePerPowerLevel: number;

  // === Results ===

  /** Default permanence of enchantments */
  defaultPermanence: EnchantmentPermanence;

  /** Can create sentient items? */
  allowsSentience: boolean;

  /** Maximum sentience level achievable */
  maxSentience: ArtifactSentience;

  /** Sentience cost (if allowed) */
  sentienceCost?: EnchantmentCost;

  // === Risks ===

  /** Risks of enchantment */
  risks: EnchantmentRisk[];

  /** Limits on enchantment power */
  limits: EnchantmentLimits;

  // === Special Rules ===

  /** Can enchantments be removed? */
  removalPossible: boolean;

  /** How to remove enchantments */
  removalMethod?: string;

  /** Can enchantments be transferred between objects? */
  transferPossible: boolean;

  /** Can enchanted items be combined/merged? */
  mergingPossible: boolean;

  /** Do enchantments stack or conflict? */
  stackingBehavior: 'stack' | 'conflict' | 'replace' | 'merge';

  /** Special notes about this enchantment system */
  notes?: string;
}

// ============================================================================
// Example Enchantment Systems
// ============================================================================

/**
 * Academic/Wizard enchantment - careful ritual binding
 */
export const ACADEMIC_ENCHANTMENT: EnchantmentSystem = {
  paradigmId: 'academic',
  enabled: true,
  primaryMethod: 'ritual_binding',
  alternativeMethods: ['forging', 'inscription'],

  enchantableCategories: ['weapons', 'armor', 'jewelry', 'tools', 'clothing', 'books', 'containers'],
  enhancingMaterials: ['mithril', 'dragon_bone', 'phoenix_feather', 'moonstone'],
  resistantMaterials: ['cold_iron', 'lead'],

  requiredChannels: ['verbal', 'somatic', 'glyph'],

  baseCosts: [
    { type: 'mana', baseAmount: 50, powerMultiplier: 1.5, permanent: false },
    { type: 'material', baseAmount: 1, powerMultiplier: 1, permanent: true, reason: 'Binding reagents consumed' },
    { type: 'time', baseAmount: 100, powerMultiplier: 2, permanent: false },
  ],

  requirements: {
    techniqueProficiency: { enhance: 30 },
    location: 'workshop',
    minimumTime: 1000,  // Long ritual
  },

  baseTime: 2000,
  timePerPowerLevel: 500,

  defaultPermanence: 'permanent',
  allowsSentience: false,  // Academic magic can't create sentient items
  maxSentience: 'reactive',

  risks: [
    { trigger: 'failure', consequence: 'cursed_item', severity: 'moderate', probability: 0.1,
      description: 'Failed enchantment creates a cursed item instead' },
    { trigger: 'power_overflow', consequence: 'explosion', severity: 'severe', probability: 0.05,
      description: 'Too much power causes the object to explode' },
  ],

  limits: {
    maxPowerPerEnchantment: 50,
    maxEnchantmentsPerObject: 3,
    maxTotalPower: 100,
    forbiddenEffects: ['create_life', 'true_resurrection'],
  },

  removalPossible: true,
  removalMethod: 'Dispel ritual or careful unbinding',
  transferPossible: false,
  mergingPossible: false,
  stackingBehavior: 'conflict',

  notes: 'Academic enchantment is safe but limited. Multiple enchantments may interfere.',
};

/**
 * Breath/Awakening - investing life force into objects
 */
export const BREATH_ENCHANTMENT: EnchantmentSystem = {
  paradigmId: 'breath',
  enabled: true,
  primaryMethod: 'awakening',

  enchantableCategories: ['any'],  // Anything can be Awakened
  enhancingMaterials: ['organic_materials', 'dyed_cloth', 'colored_objects'],
  resistantMaterials: ['grey_objects', 'drab_materials'],  // Color-drained items resist

  requiredChannels: ['verbal', 'will', 'touch'],

  baseCosts: [
    { type: 'health', baseAmount: 1, powerMultiplier: 10, permanent: true,
      reason: 'Breaths permanently invested in the object' },
  ],

  requirements: {
    location: 'anywhere',
    minimumTime: 10,  // Fast but costly
  },

  baseTime: 50,
  timePerPowerLevel: 10,

  defaultPermanence: 'permanent',
  allowsSentience: true,  // Core mechanic - Awakened objects ARE sentient
  maxSentience: 'sentient',
  sentienceCost: { type: 'health', baseAmount: 50, powerMultiplier: 2, permanent: true,
    reason: 'Creating true sentience requires significant Breath investment' },

  risks: [
    { trigger: 'exhaustion', consequence: 'bond_to_item', severity: 'severe', probability: 0.2,
      description: 'Investing too many Breaths bonds you to the object' },
    { trigger: 'enchantment_failure', consequence: 'corruption_gain', severity: 'moderate', probability: 0.1,
      description: 'Failed Awakening drains your color' },
  ],

  limits: {
    maxPowerPerEnchantment: undefined,  // Limited only by Breaths available
    maxEnchantmentsPerObject: 1,  // One Awakening per object
  },

  removalPossible: true,
  removalMethod: 'The Awakened object can choose to return the Breaths',
  transferPossible: true,  // Breaths can flow between objects
  mergingPossible: false,
  stackingBehavior: 'replace',

  notes: 'Awakening creates living objects that can think and act. They drain color from surroundings when active. Commands must be specific and well-phrased.',
};

/**
 * Pact/Entity Binding - trapping spirits in objects
 */
export const PACT_ENCHANTMENT: EnchantmentSystem = {
  paradigmId: 'pact',
  enabled: true,
  primaryMethod: 'entity_binding',
  alternativeMethods: ['sacrifice'],

  enchantableCategories: ['weapons', 'jewelry', 'containers', 'corpses'],
  enhancingMaterials: ['obsidian', 'blood_silver', 'void_crystal'],
  resistantMaterials: ['holy_water', 'blessed_materials', 'sunlight_touched'],

  requiredChannels: ['will', 'blood', 'glyph'],

  baseCosts: [
    { type: 'favor', baseAmount: 10, powerMultiplier: 2, permanent: true,
      reason: 'Patron must approve the binding' },
    { type: 'corruption', baseAmount: 5, powerMultiplier: 1, permanent: true,
      reason: 'Binding entities stains the soul' },
    { type: 'blood', baseAmount: 20, powerMultiplier: 1.5, permanent: false,
      reason: 'Blood seals the binding' },
  ],

  requirements: {
    patronApproval: true,
    location: 'sacred_space',  // Must be a place of power
    minimumTime: 500,
    materials: [
      { itemIdOrCategory: 'binding_circle_materials', quantity: 1, consumed: true, purpose: 'Contains the entity' },
    ],
  },

  baseTime: 1000,
  timePerPowerLevel: 200,

  defaultPermanence: 'conditional',  // Lasts until entity escapes or is freed
  allowsSentience: true,  // The entity IS sentient
  maxSentience: 'possessed',

  risks: [
    { trigger: 'enchantment_failure', consequence: 'entity_escape', severity: 'catastrophic', probability: 0.2,
      description: 'The entity escapes the binding and is very angry' },
    { trigger: 'overreach', consequence: 'possession', severity: 'severe', probability: 0.15,
      description: 'The entity turns the binding around and possesses you instead' },
    { trigger: 'attention', consequence: 'attention_gained', severity: 'moderate', probability: 0.3,
      description: 'Other entities notice your binding' },
  ],

  limits: {
    maxEnchantmentsPerObject: 1,  // One entity per vessel
    forbiddenEffects: ['healing', 'protection_from_patron'],  // Patron wouldn't allow these
  },

  removalPossible: true,
  removalMethod: 'Break the binding circle or destroy the vessel (releases entity)',
  transferPossible: false,  // Entity is bound to specific vessel
  mergingPossible: false,
  stackingBehavior: 'conflict',

  notes: 'Bound entities resent their imprisonment and will twist commands if possible. Patron may have opinions about which entities you bind.',
};

/**
 * True Name enchantment - inscribing names to grant properties
 */
export const NAME_ENCHANTMENT: EnchantmentSystem = {
  paradigmId: 'names',
  enabled: true,
  primaryMethod: 'inscription',

  enchantableCategories: ['any'],  // Anything has a name that can be modified
  enhancingMaterials: ['true_ink', 'naming_stone', 'memory_metal'],
  resistantMaterials: [],  // Nothing resists names

  requiredChannels: ['true_name', 'glyph'],

  baseCosts: [
    { type: 'sanity', baseAmount: 5, powerMultiplier: 1, permanent: false,
      reason: 'Inscribing names requires deep concentration' },
    { type: 'time', baseAmount: 200, powerMultiplier: 3, permanent: false,
      reason: 'Names must be written perfectly' },
  ],

  requirements: {
    location: 'anywhere',
    minimumTime: 300,
  },

  baseTime: 500,
  timePerPowerLevel: 100,

  defaultPermanence: 'permanent',  // Names don't fade
  allowsSentience: false,  // Names grant properties, not consciousness
  maxSentience: 'none',

  risks: [
    { trigger: 'failure', consequence: 'backlash', severity: 'severe', probability: 0.3,
      description: 'Misspelled name grants the opposite property' },
    { trigger: 'overreach', consequence: 'echo', severity: 'moderate', probability: 0.2,
      description: 'The name keeps writing itself on nearby objects' },
  ],

  limits: {
    maxEnchantmentsPerObject: undefined,  // Can inscribe many names
    maxTotalPower: 200,  // But total power is limited
    forbiddenCombinations: [
      { technique: 'create', form: 'spirit' },  // Can't name souls into existence
    ],
  },

  removalPossible: true,
  removalMethod: 'Erase or speak the unbinding name',
  transferPossible: true,  // Names can be copied
  mergingPossible: true,  // Names compound
  stackingBehavior: 'stack',

  notes: 'Named objects are extremely reliable but you must know the relevant names. Compound names create hybrid properties.',
};

/**
 * Divine enchantment - consecration and blessing
 */
export const DIVINE_ENCHANTMENT: EnchantmentSystem = {
  paradigmId: 'divine',
  enabled: true,
  primaryMethod: 'consecration',

  enchantableCategories: ['weapons', 'armor', 'jewelry', 'structures', 'natural_objects', 'art'],
  enhancingMaterials: ['silver', 'holy_water', 'blessed_incense'],
  resistantMaterials: ['profane_materials', 'demon_touched'],

  requiredChannels: ['prayer', 'verbal'],

  baseCosts: [
    { type: 'favor', baseAmount: 20, powerMultiplier: 2, permanent: true,
      reason: 'Deity must bestow their blessing' },
    { type: 'karma', baseAmount: 5, powerMultiplier: 0.5, permanent: false,
      reason: 'Must be worthy to request blessing' },
  ],

  requirements: {
    deityApproval: true,
    location: 'temple',
    minimumTime: 500,
  },

  baseTime: 1000,
  timePerPowerLevel: 300,

  defaultPermanence: 'conditional',  // Lasts while you remain in deity's favor
  allowsSentience: false,
  maxSentience: 'reactive',  // Items can react to enemies of the faith

  risks: [
    { trigger: 'divine_anger', consequence: 'cursed_item', severity: 'moderate', probability: 0.1,
      description: 'Deity is displeased and curses the item instead' },
    { trigger: 'overreach', consequence: 'silence', severity: 'severe', probability: 0.2,
      description: 'Requesting too much blessing temporarily cuts you off' },
  ],

  limits: {
    maxPowerPerEnchantment: 80,
    maxEnchantmentsPerObject: 1,  // One deity's blessing per item
    forbiddenEffects: ['necromancy', 'demon_summoning', 'curse'],
  },

  removalPossible: true,
  removalMethod: 'Deity withdraws blessing, or item is profaned',
  transferPossible: false,
  mergingPossible: false,
  stackingBehavior: 'replace',

  notes: 'Divine items are powerful against enemies of the faith but useless or harmful to those who oppose the deity. Losing favor may cause all blessed items to fail.',
};

/**
 * Blood enchantment - feeding objects blood until they awaken
 */
export const BLOOD_ENCHANTMENT: EnchantmentSystem = {
  paradigmId: 'blood',
  enabled: true,
  primaryMethod: 'blood_feeding',
  alternativeMethods: ['sacrifice', 'forging'],

  enchantableCategories: ['weapons', 'armor', 'jewelry', 'containers', 'corpses'],
  enhancingMaterials: ['blood_iron', 'bone', 'preserved_organs'],
  resistantMaterials: ['purified_materials', 'blessed_materials'],

  requiredChannels: ['blood', 'will'],

  baseCosts: [
    { type: 'blood', baseAmount: 30, powerMultiplier: 2, permanent: false,
      reason: 'Blood awakens the object\'s hunger' },
    { type: 'corruption', baseAmount: 10, powerMultiplier: 1.5, permanent: true,
      reason: 'Blood magic stains everything it touches' },
    { type: 'lifespan', baseAmount: 1, powerMultiplier: 0.5, permanent: true,
      reason: 'Part of your life goes into the creation' },
  ],

  requirements: {
    location: 'anywhere',  // Blood magic doesn't need special places
    minimumTime: 100,  // But requires repeated feedings
    materials: [
      { itemIdOrCategory: 'blood', quantity: 10, consumed: true, purpose: 'Feed the awakening hunger' },
    ],
  },

  baseTime: 500,
  timePerPowerLevel: 50,

  defaultPermanence: 'sustained',  // Must keep feeding it
  allowsSentience: true,
  maxSentience: 'semi_sentient',  // Aware enough to hunger
  sentienceCost: { type: 'lifespan', baseAmount: 5, powerMultiplier: 1, permanent: true },

  risks: [
    { trigger: 'enchantment_failure', consequence: 'cursed_item', severity: 'severe', probability: 0.2,
      description: 'The hunger becomes uncontrollable' },
    { trigger: 'overuse', consequence: 'bond_to_item', severity: 'moderate', probability: 0.3,
      description: 'Your blood binds you to the object' },
    { trigger: 'exhaustion', consequence: 'aging', severity: 'severe', probability: 0.2,
      description: 'The object drains too much life' },
  ],

  limits: {
    maxEnchantmentsPerObject: 1,
    forbiddenEffects: ['healing', 'purification'],  // Blood magic creates, not heals
  },

  removalPossible: true,
  removalMethod: 'Starve the item of blood until it dies, or destroy it',
  transferPossible: false,
  mergingPossible: true,  // Blood items can be combined in dark rituals
  stackingBehavior: 'merge',

  notes: 'Blood items hunger and must be fed regularly or they feed on their wielder. More powerful items hunger more. Ancient blood artifacts have fed on generations.',
};

/**
 * Emotional enchantment - imprinting intense emotions
 */
export const EMOTIONAL_ENCHANTMENT: EnchantmentSystem = {
  paradigmId: 'emotional',
  enabled: true,
  primaryMethod: 'emotional_imprint',

  enchantableCategories: ['jewelry', 'clothing', 'art', 'weapons', 'natural_objects'],
  enhancingMaterials: ['memory_crystal', 'tear_gems', 'heart_stone'],
  resistantMaterials: ['cold_materials', 'emotionless_materials'],

  requiredChannels: ['emotion'],

  baseCosts: [
    { type: 'emotion', baseAmount: 30, powerMultiplier: 2, permanent: true,
      reason: 'Emotional capacity is permanently invested' },
    { type: 'sanity', baseAmount: 10, powerMultiplier: 1, permanent: false,
      reason: 'Intense emotion is destabilizing' },
  ],

  requirements: {
    location: 'anywhere',
    minimumTime: 10,  // Can happen instantly in moments of intense emotion
  },

  baseTime: 100,
  timePerPowerLevel: 20,

  defaultPermanence: 'permanent',  // Emotions leave lasting marks
  allowsSentience: false,  // Items feel, but don't think
  maxSentience: 'reactive',  // Respond to emotional stimuli

  risks: [
    { trigger: 'emotional', consequence: 'wild_surge', severity: 'moderate', probability: 0.4,
      description: 'Uncontrolled emotion creates unpredictable effects' },
    { trigger: 'enchantment_failure', consequence: 'corruption_gain', severity: 'moderate', probability: 0.2,
      description: 'Failed imprint leaves emotional scars' },
  ],

  limits: {
    maxPowerPerEnchantment: 70,
    maxEnchantmentsPerObject: 1,  // One dominant emotion per item
    forbiddenEffects: ['emotionless_effects'],
  },

  removalPossible: false,  // Emotional imprints are permanent
  removalMethod: undefined,
  transferPossible: false,
  mergingPossible: false,
  stackingBehavior: 'replace',  // New intense emotion can override

  notes: 'Emotional items resonate with matching emotions. A rage-forged sword grows stronger when the wielder is angry. Items created in grief may bring sorrow to those nearby.',
};

// ============================================================================
// Enchantment System Registry
// ============================================================================

/** All pre-defined enchantment systems */
export const ENCHANTMENT_REGISTRY: Record<string, EnchantmentSystem> = {
  academic: ACADEMIC_ENCHANTMENT,
  breath: BREATH_ENCHANTMENT,
  pact: PACT_ENCHANTMENT,
  names: NAME_ENCHANTMENT,
  divine: DIVINE_ENCHANTMENT,
  blood: BLOOD_ENCHANTMENT,
  emotional: EMOTIONAL_ENCHANTMENT,
};

/**
 * Get an enchantment system by paradigm ID.
 */
export function getEnchantmentSystem(paradigmId: string): EnchantmentSystem | undefined {
  return ENCHANTMENT_REGISTRY[paradigmId];
}

/**
 * Check if a paradigm allows enchantment.
 */
export function canEnchant(paradigmId: string): boolean {
  const system = ENCHANTMENT_REGISTRY[paradigmId];
  return system?.enabled ?? false;
}

/**
 * Get enchantment systems that allow sentient items.
 */
export function getSentienceCapableParadigms(): string[] {
  return Object.entries(ENCHANTMENT_REGISTRY)
    .filter(([_, system]) => system.allowsSentience)
    .map(([id, _]) => id);
}
