/**
 * DimensionalParadigms - Magic systems dealing with spatial dimensions
 *
 * Inspired by:
 * - Gravity Falls (portals, Bill Cipher, Weirdmageddon, the Nightmare Realm)
 * - The Dark Forest (dimension flattening strikes, 2D collapse attacks)
 * - HyperRogue (hyperbolic geometry, dimensional navigation)
 * - Flatland (dimensional perception, 2D/3D/4D perspective)
 * - Interstellar (tesseracts, higher dimensional manipulation)
 *
 * Key concepts:
 * - Beings perceive their "native" dimension count (Flatland Law)
 * - Higher dimensions project onto lower as "shadows" (Projection Law)
 * - Dimensional rifts attract each other (Weirdness Magnetism)
 * - Dimension reduction is a weapon (Dark Forest Deterrence)
 * - 4D/5D universes can exist, rendered as scrollable 3D slices
 *
 * ==========================================================================
 * IMPLEMENTATION NOTES: LMI and Rendering
 * ==========================================================================
 *
 * LLM Agent Handling (LMI):
 * - LLMs don't need to "see" higher dimensions - they're told via prompt context
 * - Prompt should include: "You are in a 4D universe. Spatial relationships feel strange."
 * - Agents with dimensional perception get: "You sense hidden directions others cannot."
 * - Agents without it get: "This place feels wrong. Navigation is disorienting."
 * - The LMI injects dimensional context based on:
 *   1. Universe's dimension count
 *   2. Agent's native dimension count
 *   3. Agent's dimensional perception skill level
 *
 * Rendering (HyperRogue approach):
 * - 4D universes render as 3D slices
 * - Scroll/slider moves through W-axis, revealing different "layers"
 * - Entities exist at specific W-coordinates; may be visible in multiple slices
 * - Portals connect non-adjacent W-slices (shortcuts through 4D space)
 *
 * Navigation:
 * - Pathfinding extends to include W-coordinate
 * - "Distance" in 4D is sqrt(x² + y² + z² + w²)
 * - Agents can only navigate to W-slices they can perceive
 * - Hidden paths exist in W-directions that normal agents can't see
 *
 * Agent Behavior Modifiers:
 * - 3D agent in 4D universe: -20% navigation efficiency, "disoriented" mood
 * - 4D agent in 3D universe: +20% perception, "cramped" mood, can't use 4D abilities
 * - Dimensional perception skill: removes navigation penalty, reveals hidden paths
 */

import type { MagicParadigm } from './MagicParadigm.js';

// ============================================================================
// Dimensional Perception Types
// ============================================================================

/**
 * The number of spatial dimensions a being or universe operates in.
 *
 * Dimension Hierarchy:
 * - 2D: Flatland beings, shadows, paintings that are alive
 * - 3D: Normal universe - standard reality, most game entities
 * - 4D: Universe with extra spatial dimension - scrolling reveals W-axis slices
 *       Think of it as a "thicker" universe where every 3D location is a slice
 * - 5D: Multiverse level - the dimension connecting different 4D universes
 *       Moving in the 5th dimension means moving between universes entirely
 *
 * Universe vs Multiverse:
 * - A 3D or 4D space is a UNIVERSE (single reality)
 * - The 5D space containing multiple universes is the MULTIVERSE
 * - Dimensional magic within a universe = perceiving/traveling in W-axis
 * - Dimensional magic at multiverse level = crossing between universes
 *
 * Rendering implications:
 * - 3D universe: Normal perspective rendering
 * - 4D universe: 3D slices, scroll to move through W-axis
 * - 5D multiverse: Universe selector, each universe is a 4D "slice"
 */
export type DimensionCount = 2 | 3 | 4 | 5;

/**
 * How well a being can perceive dimensions beyond their native count.
 *
 * - native: Can only see their birth dimension count
 * - glimpse: Occasional flashes of extra dimensions
 * - partial: Can perceive one extra dimension with effort
 * - full: Complete perception of one extra dimension
 * - transcendent: Can perceive multiple extra dimensions
 */
export type DimensionalPerception = 'native' | 'glimpse' | 'partial' | 'full' | 'transcendent';

/**
 * States a being can be in relative to dimensional existence.
 *
 * - stable: Fully anchored in native dimensions
 * - phasing: Partially shifting between dimension counts
 * - between: In the space between dimensions (dangerous)
 * - flattened: Forcibly reduced to lower dimensions
 * - unfolded: Expanded to perceive more dimensions than native
 */
export type DimensionalState = 'stable' | 'phasing' | 'between' | 'flattened' | 'unfolded';

/**
 * A dimensional rift - a tear or portal between dimensional states.
 */
export interface DimensionalRift {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** World position (in native dimension coordinates) */
  position: { x: number; y: number; z?: number; w?: number };

  /** The dimension count on the source side */
  sourceDimensions: DimensionCount;

  /** The dimension count on the destination side */
  targetDimensions: DimensionCount;

  /** How stable is this rift? 0-1, where 1 is permanent */
  stability: number;

  /** Size/radius of the rift */
  radius: number;

  /** Is this rift visible to normal perception? */
  visible: boolean;

  /** Does this rift attract other rifts? (Weirdness Magnetism) */
  magnetic: boolean;

  /** Entities that have passed through */
  throughput: string[];

  /** Who/what created this rift */
  creator?: string;

  /** When this rift will collapse (game time) */
  expiresAt?: number;
}

/**
 * A dimensional collapse zone - area undergoing dimension reduction.
 *
 * Inspired by Dark Forest dimension strikes. Once started, these spread
 * outward, reducing everything to a lower dimension count permanently.
 */
export interface DimensionalCollapse {
  /** Unique identifier */
  id: string;

  /** Center point of the collapse */
  epicenter: { x: number; y: number; z?: number };

  /** Current radius of the collapse zone */
  currentRadius: number;

  /** Rate of expansion (units per tick) */
  expansionRate: number;

  /** Target dimension count (usually 2 for a "flattening") */
  targetDimensions: DimensionCount;

  /** Can this collapse be stopped? */
  stoppable: boolean;

  /** What triggered the collapse */
  cause: 'strike' | 'rift_failure' | 'paradox' | 'natural' | 'entity';

  /** Entities that have been flattened */
  victims: string[];

  /** Game time when collapse began */
  startedAt: number;
}

/**
 * Position in 4D space with optional W-extent for multi-slice entities.
 */
export interface Position4D {
  x: number;
  y: number;
  z: number;
  w: number;

  /**
   * Half-width in W dimension. Entity is visible from w - wExtent to w + wExtent.
   * A 4D creature with wExtent: 2 centered at w: 5 is visible in W-slices 3-7.
   * At center (w=5): full cross-section. At edges (w=3, w=7): minimal cross-section.
   */
  wExtent?: number;
}

/**
 * Cross-section calculation result for multi-W-slice entities.
 */
export interface WCrossSection {
  /** Is the entity visible at this W-slice? */
  visible: boolean;
  /** Scale of cross-section (1.0 at center, 0.0 at edge, based on sphere formula) */
  scale?: number;
  /** Is this an edge slice (smaller cross-section)? */
  isEdge?: boolean;
}

/**
 * An entity from a different dimension count than the local universe.
 *
 * Like Bill Cipher (exists in dimensions humans can't fully perceive)
 * or Flatland beings (2D creatures visiting 3D).
 */
export interface ExtradimensionalEntity {
  /** Entity ID */
  entityId: string;

  /** Native dimension count */
  nativeDimensions: DimensionCount;

  /** Current dimension count they're manifesting in */
  manifestingIn: DimensionCount;

  /** How much of their true form is visible here */
  manifestationPercent: number;

  /** Can they survive if dimension-flattened? */
  flatResistant: boolean;

  /** Are they hostile like Bill Cipher? */
  hostile: boolean;

  /** What do they want? */
  motivation?: 'conquest' | 'escape' | 'observation' | 'trade' | 'unknown';

  /** Special abilities from dimensional nature */
  abilities: ExtradimensionalAbility[];

  /** Position in 4D space (if applicable) */
  position4D?: Position4D;

  /**
   * Eyes facing extra-dimensional directions.
   * When flattened, these become vestigial.
   */
  extraDimensionalEyes?: {
    facingW: number;  // +1 for +W direction, -1 for -W direction
    vestigialAppearance?: 'scar' | 'closed_slit' | 'mark' | 'none';
  }[];
}

/**
 * Special abilities derived from existing in different dimensions.
 */
export interface ExtradimensionalAbility {
  id: string;
  name: string;
  description: string;
  /** Which dimensions this ability requires */
  requiresDimensions: DimensionCount;
  /** Effect type */
  type: 'perception' | 'movement' | 'attack' | 'defense' | 'manipulation';
}

// ============================================================================
// Dimensional Powers
// ============================================================================

/**
 * Powers that can be granted through dimensional magic.
 */
export interface DimensionalPower {
  id: string;
  name: string;
  description: string;

  /** Minimum skill tier required */
  tier: 'novice' | 'apprentice' | 'journeyman' | 'master' | 'grandmaster';

  /** Mana/sanity cost to use */
  cost: {
    mana?: number;
    sanity?: number;
    stamina?: number;
    realityStability?: number;
  };

  /** Duration of effect (ticks, 0 = instant) */
  duration: number;

  /** Cooldown before reuse (ticks) */
  cooldown: number;

  /** Category of power */
  category: 'perception' | 'movement' | 'combat' | 'utility' | 'forbidden';

  /** Does this power attract eldritch attention? */
  attractsAttention: boolean;

  /** Flavor text */
  lore?: string;
}

/**
 * Pre-defined dimensional powers.
 */
export const DIMENSIONAL_POWERS: DimensionalPower[] = [
  // =========================================================================
  // Perception Powers
  // =========================================================================
  {
    id: 'dimensional_sight',
    name: 'Dimensional Sight',
    description: 'See into an additional spatial dimension, revealing hidden objects and spaces',
    tier: 'novice',
    cost: { mana: 15, sanity: 5 },
    duration: 200, // 10 seconds
    cooldown: 100,
    category: 'perception',
    attractsAttention: false,
    lore: 'The first lesson: reality has more corners than you can see.',
  },
  {
    id: 'hypersight',
    name: 'Hypersight',
    description: 'See all sides of an object simultaneously (4D perspective on 3D objects)',
    tier: 'journeyman',
    cost: { mana: 30, sanity: 15 },
    duration: 100,
    cooldown: 200,
    category: 'perception',
    attractsAttention: false,
    lore: 'The cube has no hidden faces. Neither does the mind observing it.',
  },
  {
    id: 'between_glimpse',
    name: 'Between-Glimpse',
    description: 'Briefly perceive the space between dimensions, seeing what lurks there',
    tier: 'master',
    cost: { mana: 50, sanity: 30 },
    duration: 40, // 2 seconds
    cooldown: 600,
    category: 'perception',
    attractsAttention: true,
    lore: 'The Between looks back. Always.',
  },

  // =========================================================================
  // Movement Powers
  // =========================================================================
  {
    id: 'phase_shift',
    name: 'Phase Shift',
    description: 'Briefly shift partially into another dimension to pass through barriers',
    tier: 'apprentice',
    cost: { mana: 25, stamina: 20 },
    duration: 0, // Instant
    cooldown: 150,
    category: 'movement',
    attractsAttention: false,
  },
  {
    id: 'fold_step',
    name: 'Fold Step',
    description: 'Fold space to teleport a short distance by stepping through the 4th dimension',
    tier: 'journeyman',
    cost: { mana: 40, sanity: 10 },
    duration: 0,
    cooldown: 100,
    category: 'movement',
    attractsAttention: false,
    lore: 'The shortest distance between two points is a fold.',
  },
  {
    id: 'portal_creation',
    name: 'Portal Creation',
    description: 'Create a stable portal between two locations by connecting them through higher dimensions',
    tier: 'master',
    cost: { mana: 100, sanity: 20, realityStability: 10 },
    duration: 600, // 30 seconds
    cooldown: 1200,
    category: 'movement',
    attractsAttention: true,
    lore: 'A door is a hole in a wall. A portal is a hole in reality.',
  },
  {
    id: 'between_walk',
    name: 'Between-Walk',
    description: 'Enter the space between dimensions and walk to any visible location',
    tier: 'grandmaster',
    cost: { mana: 150, sanity: 50, realityStability: 25 },
    duration: 0,
    cooldown: 2400,
    category: 'movement',
    attractsAttention: true,
    lore: 'Time does not pass in the Between. Nothing does, except you.',
  },

  // =========================================================================
  // Combat Powers
  // =========================================================================
  {
    id: 'dimensional_shunt',
    name: 'Dimensional Shunt',
    description: 'Briefly push a target partially out of phase, making them intangible and disoriented',
    tier: 'apprentice',
    cost: { mana: 35 },
    duration: 60, // 3 seconds
    cooldown: 200,
    category: 'combat',
    attractsAttention: false,
  },
  {
    id: 'flatten_strike',
    name: 'Flatten Strike',
    description: 'Temporarily compress a target to 2D, dealing massive damage and immobilizing them',
    tier: 'master',
    cost: { mana: 80, sanity: 25, realityStability: 15 },
    duration: 40, // 2 seconds
    cooldown: 600,
    category: 'combat',
    attractsAttention: true,
    lore: 'A sphere becomes a circle. A person becomes a silhouette.',
  },
  {
    id: 'dimensional_collapse',
    name: 'Dimensional Collapse',
    description: 'Begin a localized dimension reduction. EXTREMELY DANGEROUS - may spread.',
    tier: 'grandmaster',
    cost: { mana: 200, sanity: 100, realityStability: 50 },
    duration: 0, // Permanent until stopped
    cooldown: 0, // Cannot be used again (too dangerous)
    category: 'forbidden',
    attractsAttention: true,
    lore: 'The Dark Forest has one law: reduce or be reduced.',
  },

  // =========================================================================
  // Utility Powers
  // =========================================================================
  {
    id: 'flat_adaptation',
    name: 'Flat Adaptation',
    description: 'Temporarily become able to survive as a 2D being if flattened',
    tier: 'journeyman',
    cost: { mana: 45, stamina: 30 },
    duration: 400, // 20 seconds
    cooldown: 800,
    category: 'utility',
    attractsAttention: false,
    lore: 'Learn to live sideways, and you can survive the collapse.',
  },
  {
    id: 'anchor_reality',
    name: 'Anchor Reality',
    description: 'Stabilize local dimensions, preventing unwanted shifts or collapses',
    tier: 'master',
    cost: { mana: 60, realityStability: -20 }, // Negative = restores
    duration: 600,
    cooldown: 300,
    category: 'utility',
    attractsAttention: false,
  },
  {
    id: 'summon_from_between',
    name: 'Summon from Between',
    description: 'Pull an object or entity from the space between dimensions',
    tier: 'grandmaster',
    cost: { mana: 120, sanity: 40, realityStability: 30 },
    duration: 0,
    cooldown: 2000,
    category: 'utility',
    attractsAttention: true,
    lore: 'Something always answers. Make sure you want to meet it.',
  },
];

// ============================================================================
// The Dimension Paradigm
// ============================================================================

/**
 * DIMENSION PARADIGM
 *
 * Magic dealing with spatial dimensions beyond the normal three.
 * Portals, dimensional perception, flattening attacks, and entities
 * from higher/lower dimensional spaces.
 *
 * Inspired by Gravity Falls + Dark Forest + Flatland + HyperRogue
 */
export const DIMENSION_PARADIGM: MagicParadigm = {
  id: 'dimension',
  name: 'Dimensional Magic',
  description: 'Manipulate spatial dimensions - perceive, fold, flatten, and tear reality itself',
  universeIds: ['gravity_falls', 'dark_forest', 'flatland', 'tesseract_realm', 'nightmare_realm'],

  lore: `Reality is a shadow of higher truths. What you see as a solid cube, a 4D being
sees as a mere slice. Dimensional mages learn to perceive beyond their native
dimensions, fold space for travel, and - if desperate - reduce dimensions entirely.

**Building Summoning**: Advanced mages can conjure shelters (Tier 1), towers (Tier 2),
tesseracts (Tier 3), penteracts (Tier 4), and hexeracts (Tier 5). Realm pockets create
spaces bigger on the inside. These structures are folded from geometry itself.

The Nightmare Realm exists in the spaces between. Entities like the Triangle
(DO NOT SUMMON) wait for moments when the barrier thins. Every portal is a door
that swings both ways.

The ultimate weapon is dimensional collapse - reducing a region from 3D to 2D
permanently. The Dark Forest silence exists because everyone fears this deterrent.
Use it, and you may win the battle. But the collapse spreads. Always.`,

  // =========================================================================
  // Sources
  // =========================================================================
  sources: [
    {
      id: 'hyperspatial_energy',
      name: 'Hyperspatial Energy',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: 0.02,
      storable: true,
      transferable: true,
      stealable: false,
      detectability: 'subtle',
      description: 'Energy from the dimensions beyond normal perception',
    },
    {
      id: 'rift_proximity',
      name: 'Rift Proximity',
      type: 'ambient',
      regeneration: 'none',
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'obvious',
      description: 'Power drawn from nearby dimensional rifts',
    },
    {
      id: 'between_touch',
      name: 'Between-Touch',
      type: 'void',
      regeneration: 'none',
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'beacon',
      description: 'Direct connection to the space between dimensions',
    },
    {
      id: 'weirdness',
      name: 'Weirdness',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: 0.05,
      storable: true,
      transferable: true,
      stealable: true,
      detectability: 'obvious',
      description: 'The anomalous energy of places where dimensions thin',
    },
  ],

  // =========================================================================
  // Costs
  // =========================================================================
  costs: [
    {
      type: 'mana',
      canBeTerminal: false,
      cumulative: false,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'hidden',
    },
    {
      type: 'sanity',
      canBeTerminal: true,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'time',
      visibility: 'subtle',
    },
    {
      type: 'corruption', // Using corruption as "reality instability"
      canBeTerminal: true,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'ritual',
      visibility: 'obvious',
    },
  ],

  // =========================================================================
  // Channels
  // =========================================================================
  channels: [
    {
      type: 'focus',
      requirement: 'required',
      canBeMastered: true,
      blockEffect: 'reduces_power',
      description: 'Geometric focus objects - tesseracts, Klein bottles, impossible shapes',
    },
    {
      type: 'meditation',
      requirement: 'enhancing',
      canBeMastered: true,
      blockEffect: 'no_effect',
      description: 'Mental focus to perceive beyond native dimensions',
    },
    {
      type: 'glyph',
      requirement: 'optional',
      canBeMastered: true,
      blockEffect: 'no_effect',
      description: 'Portal circles, dimensional runes, Cipher wheels',
    },
    {
      type: 'material',
      requirement: 'optional',
      canBeMastered: false,
      blockEffect: 'no_effect',
      description: 'Objects from other dimensions serve as anchors',
    },
  ],

  // =========================================================================
  // Laws
  // =========================================================================
  laws: [
    {
      id: 'flatland_law',
      name: 'Flatland Law',
      type: 'threshold',
      strictness: 'absolute',
      canBeCircumvented: true,
      circumventionCostMultiplier: 3.0,
      description: 'Beings can only naturally perceive their native dimension count. Seeing more requires magic or mutation.',
    },
    {
      id: 'projection_law',
      name: 'Projection Law',
      type: 'similarity',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Higher dimensions project onto lower as shadows. A 4D cube casts a 3D shadow; a 3D sphere casts a 2D shadow.',
    },
    {
      id: 'weirdness_magnetism',
      name: 'Weirdness Magnetism',
      type: 'resonance',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 2.0,
      description: 'Dimensional anomalies attract each other. Rifts cluster. Entities find rifts.',
    },
    {
      id: 'conservation_of_dimensionality',
      name: 'Conservation of Dimensionality',
      type: 'conservation',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 5.0,
      description: 'Total dimensions are conserved. Reducing one area increases instability elsewhere.',
    },
    {
      id: 'collapse_cascade',
      name: 'Collapse Cascade',
      type: 'entropy',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Once begun, dimensional collapse spreads. It can be slowed, never stopped.',
    },
    {
      id: 'between_hungers',
      name: 'The Between Hungers',
      type: 'witness',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'The space between dimensions is aware. It notices those who touch it.',
    },
  ],

  // =========================================================================
  // Risks
  // =========================================================================
  risks: [
    {
      trigger: 'overuse',
      consequence: 'corruption_gain',
      severity: 'moderate',
      probability: 0.3,
      mitigatable: true,
      description: 'Perception of higher dimensions destabilizes your sense of reality',
    },
    {
      trigger: 'failure',
      consequence: 'trapped',
      severity: 'severe',
      probability: 0.2,
      mitigatable: true,
      description: 'Failed dimensional shift leaves you partially in the Between',
    },
    {
      trigger: 'critical_failure',
      consequence: 'wild_surge',
      severity: 'catastrophic',
      probability: 0.1,
      mitigatable: false,
      description: 'Critical failure tears a rift that attracts Between-entities',
    },
    {
      trigger: 'attention',
      consequence: 'attention_gained',
      severity: 'severe',
      probability: 0.4,
      mitigatable: false,
      description: 'The Triangle and its kind notice dimensional disturbances',
    },
    {
      trigger: 'paradox',
      consequence: 'bleed_through',
      severity: 'catastrophic',
      probability: 0.15,
      mitigatable: false,
      description: 'Reality bleeds between dimensions, causing localized Weirdmageddon',
    },
    {
      trigger: 'exhaustion',
      consequence: 'coma',
      severity: 'severe',
      probability: 0.25,
      mitigatable: true,
      description: 'Dimensional sight overload shuts down consciousness',
    },
    {
      trigger: 'overreach',
      consequence: 'mutation',
      severity: 'catastrophic',
      probability: 0.2,
      mitigatable: false,
      description: 'Exposure to too many dimensions causes permanent perception changes',
    },
  ],

  // =========================================================================
  // Acquisition Methods
  // =========================================================================
  acquisitionMethods: [
    {
      method: 'study',
      rarity: 'rare',
      voluntary: true,
      prerequisites: ['advanced_mathematics', 'topology_understanding'],
      grantsAccess: ['hyperspatial_energy'],
      startingProficiency: 10,
      description: 'Academic study of hyperdimensional mathematics',
    },
    {
      method: 'awakening',
      rarity: 'rare',
      voluntary: false,
      prerequisites: ['near_rift_exposure'],
      grantsAccess: ['hyperspatial_energy', 'weirdness'],
      startingProficiency: 20,
      description: 'Accidental exposure to a dimensional rift',
    },
    {
      method: 'contract',
      rarity: 'legendary',
      voluntary: true,
      prerequisites: ['contacted_between_entity'],
      grantsAccess: ['hyperspatial_energy', 'between_touch'],
      startingProficiency: 40,
      description: 'Deal with an entity from the Between (EXTREMELY DANGEROUS)',
    },
    {
      method: 'artifact',
      rarity: 'rare',
      voluntary: true,
      prerequisites: ['dimensional_artifact_bonded'],
      grantsAccess: ['hyperspatial_energy', 'rift_proximity'],
      startingProficiency: 25,
      description: 'Bond with an object from another dimension count',
    },
    {
      method: 'bloodline',
      rarity: 'legendary',
      voluntary: false,
      grantsAccess: ['hyperspatial_energy', 'weirdness'],
      startingProficiency: 50,
      description: 'Descended from an extradimensional being',
    },
  ],

  // =========================================================================
  // Available Techniques and Forms
  // =========================================================================
  availableTechniques: ['perceive', 'control', 'destroy', 'summon', 'protect', 'transform'],
  availableForms: ['space', 'void', 'mind', 'body', 'image'],

  forbiddenCombinations: [
    {
      technique: 'destroy',
      form: 'space',
      reason: 'Destroying space itself is the Dimensional Collapse - forbidden except in extremis',
      consequence: 'Initiates dimensional collapse cascade',
    },
  ],

  resonantCombinations: [
    {
      technique: 'perceive',
      form: 'space',
      bonusEffect: 'Dimensional Sight - see into higher dimensions',
      powerMultiplier: 1.8,
    },
    {
      technique: 'control',
      form: 'space',
      bonusEffect: 'Portal Creation - fold space for travel',
      powerMultiplier: 2.0,
    },
    {
      technique: 'summon',
      form: 'void',
      bonusEffect: 'Between-Summoning - call entities from the Between',
      powerMultiplier: 2.5,
    },
    {
      technique: 'protect',
      form: 'space',
      bonusEffect: 'Reality Anchor - stabilize local dimensions',
      powerMultiplier: 1.5,
    },
    {
      technique: 'transform',
      form: 'body',
      bonusEffect: 'Flat Adaptation - become able to survive as 2D',
      powerMultiplier: 1.6,
    },
  ],

  // =========================================================================
  // Scaling and Limits
  // =========================================================================
  powerScaling: 'exponential',
  powerCeiling: 250,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true,
  persistsAfterDeath: true, // Portals persist, collapses persist
  allowsTeaching: true,
  allowsScrolls: true,
  foreignMagicPolicy: 'transforms',
  compatibleParadigms: ['paradox', 'void', 'dream_magic'],
  conflictingParadigms: ['divine', 'nature'],
};

// ============================================================================
// Escalation Paradigm (Regular Show inspired)
// ============================================================================

/**
 * ESCALATION PARADIGM
 *
 * Mundane actions spiral into cosmic consequences.
 * The more normal the starting point, the more insane the result.
 *
 * Inspired by Regular Show where arm wrestling summons demons
 * and video game competitions destroy reality.
 */
export const ESCALATION_PARADIGM: MagicParadigm = {
  id: 'escalation',
  name: 'Escalation Magic',
  description: 'Mundane actions spiral into cosmic consequences; the boring becomes apocalyptic',
  universeIds: ['regular_show', 'mundane_madness'],

  lore: `It started with a bet about who could eat more hot dogs. It ended with a
demon king from the Hot Dog Dimension and the park on fire. Again.

In escalation realities, the universe has a sick sense of humor. Every mundane
action - every video game, every arm wrestling match, every food contest - has
a small but real chance of spiraling into cosmic conflict.

The more boring and pointless the activity, the higher the escalation potential.
Taxes are genuinely terrifying. Board games are banned in some towns.`,

  sources: [
    {
      id: 'mundanity',
      name: 'Mundane Energy',
      type: 'ambient',
      regeneration: 'passive',
      regenRate: 0.1,
      storable: false,
      transferable: false,
      stealable: false,
      detectability: 'undetectable',
      description: 'The boring background radiation of everyday life',
    },
    {
      id: 'escalation_momentum',
      name: 'Escalation Momentum',
      type: 'emotional',
      regeneration: 'none',
      storable: false,
      transferable: true,
      stealable: false,
      detectability: 'obvious',
      description: 'Once things start spiraling, this power builds',
    },
  ],

  costs: [
    {
      type: 'stamina',
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'rest',
      visibility: 'obvious',
    },
    {
      type: 'sanity',
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'time',
      visibility: 'subtle',
    },
    {
      type: 'attention',
      canBeTerminal: false,
      cumulative: true,
      recoverable: true,
      recoveryMethod: 'time',
      visibility: 'hidden',
    },
  ],

  channels: [
    {
      type: 'verbal',
      requirement: 'enhancing',
      canBeMastered: false,
      blockEffect: 'no_effect',
      description: 'Bets, challenges, and trash talk accelerate escalation',
    },
    {
      type: 'emotion',
      requirement: 'required',
      canBeMastered: false,
      blockEffect: 'prevents_casting',
      description: 'Competitive spirit, boredom, or frustration fuel escalation',
    },
  ],

  laws: [
    {
      id: 'mundane_multiplier',
      name: 'Mundane Multiplier',
      type: 'paradox',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'The more boring the starting activity, the more likely cosmic escalation',
    },
    {
      id: 'stakes_inflation',
      name: 'Stakes Inflation',
      type: 'entropy',
      strictness: 'strong',
      canBeCircumvented: false,
      description: 'Once escalation begins, stakes can only increase, never decrease',
    },
    {
      id: 'resolution_requirement',
      name: 'Resolution Requirement',
      type: 'narrative',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Escalated situations MUST be resolved through the original mundane activity',
    },
  ],

  risks: [
    {
      trigger: 'emotional',
      consequence: 'wild_surge',
      severity: 'moderate',
      probability: 0.4,
      mitigatable: false,
      description: 'Getting too competitive triggers escalation',
    },
    {
      trigger: 'overreach',
      consequence: 'attention_gained',
      severity: 'severe',
      probability: 0.3,
      mitigatable: false,
      description: 'Cosmic entities notice and join the competition',
    },
    {
      trigger: 'critical_failure',
      consequence: 'bleed_through',
      severity: 'catastrophic',
      probability: 0.2,
      mitigatable: false,
      description: 'Alternate dimension versions of the conflict merge together',
    },
  ],

  acquisitionMethods: [
    {
      method: 'born',
      rarity: 'common',
      voluntary: false,
      grantsAccess: ['mundanity', 'escalation_momentum'],
      startingProficiency: 0, // Everyone triggers this involuntarily
      description: 'Living in an escalation reality',
    },
    {
      method: 'awakening',
      rarity: 'uncommon',
      voluntary: false,
      prerequisites: ['survived_escalation_event'],
      grantsAccess: ['mundanity', 'escalation_momentum'],
      startingProficiency: 20,
      description: 'Survived a major escalation event and learned to see the pattern',
    },
  ],

  availableTechniques: ['create', 'enhance', 'summon', 'control'],
  availableForms: ['body', 'mind', 'image', 'fire', 'void'],

  resonantCombinations: [
    {
      technique: 'summon',
      form: 'void',
      bonusEffect: 'Summon dimensional champion for mundane contest',
      powerMultiplier: 3.0,
    },
    {
      technique: 'enhance',
      form: 'body',
      bonusEffect: 'Supernatural competitive performance',
      powerMultiplier: 2.0,
    },
  ],

  powerScaling: 'exponential', // Escalation grows exponentially
  powerCeiling: undefined, // No limit - that's the problem
  allowsGroupCasting: true,
  groupCastingMultiplier: 3.0, // Team competitions escalate faster
  allowsEnchantment: false,
  persistsAfterDeath: false,
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'absorbs',
  compatibleParadigms: ['wild', 'game_magic', 'narrative'],
  conflictingParadigms: ['silence', 'bureaucratic_magic'],
};

// ============================================================================
// Corruption Paradigm (Adventure Time Ice Crown inspired)
// ============================================================================

/**
 * CORRUPTION PARADIGM
 *
 * Power that corrupts the wielder's mind and identity.
 * The more you use it, the more you become someone else.
 *
 * Inspired by the Ice Crown (Simon → Ice King),
 * the Lich's influence, and similar curse-based power.
 */
export const CORRUPTION_PARADIGM: MagicParadigm = {
  id: 'corruption_crown',
  name: 'Corruption Magic',
  description: 'Power that corrupts the wielder - strength scales with lost sanity and identity',
  universeIds: ['adventure_time', 'crown_realms', 'cursed_artifacts'],

  lore: `The crown whispered promises of protection. Simon put it on to save
Betty from the mushroom bombs. That was 1000 years ago. Simon hasn't existed
for centuries.

Corruption magic offers power in exchange for self. The artifacts that channel
it consume their wielders' memories, relationships, even names. At full power,
you are something else entirely - powerful beyond measure, remembering nothing
of who you were.

Some say the crown's previous owners are all still in there, screaming.`,

  sources: [
    {
      id: 'corruption_wellspring',
      name: 'Corruption',
      type: 'void',
      regeneration: 'passive',
      regenRate: 0.05,
      storable: true,
      transferable: false,
      stealable: false,
      detectability: 'subtle',
      description: 'Dark power that grows as the wielder deteriorates',
    },
    {
      id: 'memories_consumed',
      name: 'Consumed Memories',
      type: 'internal',
      regeneration: 'none', // Once consumed, gone forever
      storable: true,
      transferable: false,
      stealable: true,
      detectability: 'subtle',
      description: 'Power drawn from erased memories and identity',
    },
  ],

  costs: [
    {
      type: 'memory',
      canBeTerminal: true, // Can lose yourself entirely
      cumulative: true,
      recoverable: false, // Memories don't come back
      visibility: 'hidden',
    },
    {
      type: 'sanity',
      canBeTerminal: true,
      cumulative: true,
      recoverable: false, // Madness is permanent
      visibility: 'subtle',
    },
  ],

  channels: [
    {
      type: 'focus',
      requirement: 'required',
      canBeMastered: false,
      blockEffect: 'prevents_casting',
      description: 'The crown, artifact, or cursed object must be worn/held',
    },
    {
      type: 'emotion',
      requirement: 'enhancing',
      canBeMastered: false,
      blockEffect: 'reduces_power',
      description: 'Strong emotions accelerate corruption',
    },
  ],

  laws: [
    {
      id: 'power_from_loss',
      name: 'Power from Loss',
      type: 'equivalent_exchange',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Every power gain costs a piece of self. No exceptions.',
    },
    {
      id: 'progressive_consumption',
      name: 'Progressive Consumption',
      type: 'entropy',
      strictness: 'absolute',
      canBeCircumvented: false,
      description: 'Corruption never reverses. You can only slow it.',
    },
    {
      id: 'identity_replacement',
      name: 'Identity Replacement',
      type: 'entropy',
      strictness: 'strong',
      canBeCircumvented: true,
      circumventionCostMultiplier: 10.0,
      description: 'At full corruption, the artifact\'s persona replaces your own',
    },
  ],

  risks: [
    {
      trigger: 'overuse',
      consequence: 'memory_loss',
      severity: 'severe',
      probability: 0.5,
      mitigatable: false,
      description: 'Using power erases specific memories',
    },
    {
      trigger: 'emotional',
      consequence: 'corruption_gain',
      severity: 'moderate',
      probability: 0.6,
      mitigatable: false,
      description: 'Strong emotions accelerate the corruption',
    },
    {
      trigger: 'critical_failure',
      consequence: 'possession',
      severity: 'catastrophic',
      probability: 0.15,
      mitigatable: false,
      description: 'The artifact\'s persona temporarily takes over',
    },
    {
      trigger: 'addiction',
      consequence: 'addiction_worsens',
      severity: 'severe',
      probability: 0.4,
      mitigatable: true,
      description: 'Using the power becomes compulsive',
    },
  ],

  acquisitionMethods: [
    {
      method: 'artifact',
      rarity: 'legendary',
      voluntary: true,
      prerequisites: ['found_corrupted_artifact'],
      grantsAccess: ['corruption_wellspring', 'memories_consumed'],
      startingProficiency: 30,
      description: 'Put on the crown. There is no other way.',
    },
    {
      method: 'infection',
      rarity: 'rare',
      voluntary: false,
      prerequisites: ['exposed_to_corrupted_wielder'],
      grantsAccess: ['corruption_wellspring'],
      startingProficiency: 10,
      description: 'Corruption can spread from wielder to susceptible victims',
    },
  ],

  availableTechniques: ['create', 'destroy', 'control', 'transform', 'protect'],
  availableForms: ['water', 'mind', 'body', 'image'], // water includes ice

  forbiddenCombinations: [],
  resonantCombinations: [
    {
      technique: 'create',
      form: 'water',
      bonusEffect: 'Ice King powers - ice constructs, snow storms (cold water magic)',
      powerMultiplier: 2.5,
    },
    {
      technique: 'control',
      form: 'mind',
      bonusEffect: 'Dominate weaker minds (at cost of your own)',
      powerMultiplier: 2.0,
    },
    {
      technique: 'transform',
      form: 'body',
      bonusEffect: 'Physical transformation toward artifact\'s ideal form',
      powerMultiplier: 1.8,
    },
  ],

  powerScaling: 'exponential', // Power grows with corruption level
  powerCeiling: 400, // Extremely powerful at full corruption
  allowsGroupCasting: false,
  allowsEnchantment: false, // The artifact IS the enchantment
  persistsAfterDeath: true, // Crown passes to next victim
  allowsTeaching: false,
  allowsScrolls: false,
  foreignMagicPolicy: 'absorbs',
  compatibleParadigms: ['void', 'blood_magic'],
  conflictingParadigms: ['divine', 'emotional'],
};

// ============================================================================
// Registry and Helpers
// ============================================================================

export const DIMENSIONAL_PARADIGM_REGISTRY: Record<string, MagicParadigm> = {
  dimension: DIMENSION_PARADIGM,
  escalation: ESCALATION_PARADIGM,
  corruption_crown: CORRUPTION_PARADIGM,
};

/**
 * Get a dimensional paradigm by ID.
 */
export function getDimensionalParadigm(id: string): MagicParadigm | undefined {
  return DIMENSIONAL_PARADIGM_REGISTRY[id];
}

/**
 * Check if a being can perceive a given dimension count.
 */
export function canPerceiveDimension(
  nativeDimensions: DimensionCount,
  targetDimensions: DimensionCount,
  perception: DimensionalPerception
): boolean {
  const diff = targetDimensions - nativeDimensions;

  if (diff <= 0) {
    // Can always perceive lower or equal dimensions
    return true;
  }

  switch (perception) {
    case 'native':
      return false;
    case 'glimpse':
      return diff === 1 && Math.random() < 0.1; // 10% chance for +1
    case 'partial':
      return diff === 1;
    case 'full':
      return diff <= 1;
    case 'transcendent':
      return diff <= 2;
  }
}

/**
 * Calculate sanity cost for perceiving higher dimensions.
 */
export function calculateDimensionalSanityCost(
  nativeDimensions: DimensionCount,
  perceivedDimensions: DimensionCount,
  duration: number // in ticks
): number {
  const diff = perceivedDimensions - nativeDimensions;
  if (diff <= 0) return 0;

  // Exponential cost for each dimension above native
  const baseCost = Math.pow(3, diff);
  return Math.floor(baseCost * (duration / 100));
}

/**
 * Calculate escalation probability for a mundane activity.
 */
export function calculateEscalationProbability(
  mundanityLevel: number, // 0-100, higher = more boring
  participantCount: number,
  competitiveIntensity: number // 0-100
): number {
  // More boring + more competitive = higher escalation chance
  const baseProb = (mundanityLevel / 100) * 0.05;
  const competitiveBonus = (competitiveIntensity / 100) * 0.1;
  const participantMultiplier = 1 + (participantCount - 1) * 0.2;

  return Math.min(0.95, (baseProb + competitiveBonus) * participantMultiplier);
}

/**
 * Calculate corruption level from consumed memories and sanity.
 */
export function calculateCorruptionLevel(
  memoriesLost: number, // 0-100 percent
  sanityRemaining: number, // 0-100 percent
  timeWorn: number // ticks the artifact has been worn
): number {
  const memoryCorruption = memoriesLost * 0.4;
  const sanityCorruption = (100 - sanityRemaining) * 0.4;
  const timeCorruption = Math.min(20, Math.log10(timeWorn + 1) * 5);

  return Math.min(100, memoryCorruption + sanityCorruption + timeCorruption);
}

/**
 * Get power multiplier based on corruption level.
 * Higher corruption = more power (the tragic trade-off).
 */
export function getCorruptionPowerMultiplier(corruptionLevel: number): number {
  // Exponential power growth with corruption
  return 1 + Math.pow(corruptionLevel / 100, 2) * 3; // Max 4x at 100% corruption
}

// ============================================================================
// Multi-W-Slice Entity Helpers
// ============================================================================

/**
 * Calculate the cross-section of a multi-W-slice entity at a given camera W position.
 *
 * Uses sphere cross-section formula: for a sphere of radius R,
 * cross-section at distance d from center has radius sqrt(R² - d²)
 */
export function getEntityWCrossSection(
  entityW: number,
  entityWExtent: number | undefined,
  cameraW: number
): WCrossSection {
  const wExtent = entityWExtent ?? 0;
  const wDistance = Math.abs(cameraW - entityW);

  // No W-extent means point entity - only visible at exact W
  if (wExtent === 0) {
    return {
      visible: wDistance < 0.5, // Tolerance for point entities
      scale: wDistance < 0.5 ? 1.0 : 0,
      isEdge: false,
    };
  }

  // Outside the entity's W-range
  if (wDistance > wExtent) {
    return { visible: false };
  }

  // Calculate cross-section using sphere formula
  // At center (wDistance=0): scale = 1.0
  // At edge (wDistance=wExtent): scale = 0.0
  const crossSectionRatio = Math.sqrt(1 - (wDistance / wExtent) ** 2);

  return {
    visible: true,
    scale: crossSectionRatio,
    isEdge: wDistance > wExtent * 0.8,
  };
}

// ============================================================================
// Hyperbolic Geometry Helpers (for 4D+ universes)
// ============================================================================

/**
 * Calculate hyperbolic distance in the Poincaré disk model.
 * Points must be in the unit disk (norm < 1).
 *
 * 4D+ universes use hyperbolic geometry because it allows
 * finite-mass planets to exist (unlike Euclidean 4D+).
 */
export function hyperbolicDistance(
  a: { x: number; y: number; w?: number },
  b: { x: number; y: number; w?: number }
): number {
  const ax = a.x, ay = a.y, aw = a.w ?? 0;
  const bx = b.x, by = b.y, bw = b.w ?? 0;

  const diffSquared = (ax - bx) ** 2 + (ay - by) ** 2 + (aw - bw) ** 2;
  const aNormSquared = ax ** 2 + ay ** 2 + aw ** 2;
  const bNormSquared = bx ** 2 + by ** 2 + bw ** 2;

  // Clamp to prevent edge cases at disk boundary
  const aNormClamped = Math.min(aNormSquared, 0.9999);
  const bNormClamped = Math.min(bNormSquared, 0.9999);

  // Hyperbolic distance formula (Poincaré disk)
  const delta = 2 * diffSquared / ((1 - aNormClamped) * (1 - bNormClamped));
  return Math.acosh(1 + delta);
}

/**
 * Calculate Euclidean distance in 4D space.
 */
export function euclideanDistance4D(
  a: Position4D,
  b: Position4D
): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2 +
    (a.w - b.w) ** 2
  );
}

/**
 * Check if a position is valid in hyperbolic space (inside the Poincaré disk).
 */
export function isValidHyperbolicPosition(pos: { x: number; y: number; w?: number }): boolean {
  const normSquared = pos.x ** 2 + pos.y ** 2 + (pos.w ?? 0) ** 2;
  return normSquared < 1.0; // Must be strictly inside unit disk
}

/**
 * Project a point towards the disk center if it's outside the boundary.
 * Useful for clamping positions to valid hyperbolic space.
 */
export function clampToHyperbolicDisk(
  pos: { x: number; y: number; w?: number },
  maxNorm: number = 0.99
): { x: number; y: number; w: number } {
  const w = pos.w ?? 0;
  const norm = Math.sqrt(pos.x ** 2 + pos.y ** 2 + w ** 2);

  if (norm <= maxNorm) {
    return { x: pos.x, y: pos.y, w };
  }

  // Scale towards center
  const scale = maxNorm / norm;
  return {
    x: pos.x * scale,
    y: pos.y * scale,
    w: w * scale,
  };
}

// ============================================================================
// LMI Integration - Prompt Context Generation
// ============================================================================

/**
 * Context about dimensional state for LLM prompts.
 */
export interface DimensionalContext {
  /** Text to inject into agent's situation awareness */
  situationText: string;

  /** Text about what the agent can perceive */
  perceptionText: string;

  /** Navigation modifier description */
  navigationText: string;

  /** Mood/feeling modifier */
  moodModifier: string;

  /** Numeric modifiers for systems */
  modifiers: {
    navigationEfficiency: number; // 0.0 to 1.5
    perceptionBonus: number; // -20 to +40
    sanityDrain: number; // per tick
  };
}

/**
 * Generate LMI prompt context for an agent in a dimensional situation.
 *
 * Used by the PromptBuilder to inject dimensional awareness into agent prompts.
 *
 * @param universeDimensions - The dimension count of the current universe
 * @param agentNativeDimensions - The agent's native dimension count
 * @param dimensionalPerception - Agent's dimensional perception skill level
 * @param hasBeenFlattened - Whether the agent has been dimension-reduced
 */
export function generateDimensionalContext(
  universeDimensions: DimensionCount,
  agentNativeDimensions: DimensionCount,
  dimensionalPerception: DimensionalPerception = 'native',
  hasBeenFlattened: boolean = false
): DimensionalContext {
  const dimensionDiff = universeDimensions - agentNativeDimensions;

  // Handle flattened state first (takes priority)
  if (hasBeenFlattened) {
    return {
      situationText: 'You have been FLATTENED to a lower dimension. Everything feels compressed. You exist as a shadow of yourself.',
      perceptionText: 'The world appears as thin slices. Depth is gone. You can only see and move in limited directions.',
      navigationText: 'Movement is restricted to fewer directions than you remember.',
      moodModifier: 'terrified',
      modifiers: {
        navigationEfficiency: 0.3,
        perceptionBonus: -30,
        sanityDrain: 0.5,
      },
    };
  }

  // Agent in same-dimension universe
  if (dimensionDiff === 0) {
    return {
      situationText: '',
      perceptionText: '',
      navigationText: '',
      moodModifier: '',
      modifiers: {
        navigationEfficiency: 1.0,
        perceptionBonus: 0,
        sanityDrain: 0,
      },
    };
  }

  // 3D agent in higher-dimension universe (most common case)
  if (dimensionDiff > 0) {
    const canPerceive = dimensionalPerception !== 'native';

    if (!canPerceive) {
      // No dimensional perception - everything is confusing
      return {
        situationText: `You are in a ${universeDimensions}D universe. Reality feels WRONG. There are directions you cannot see, spaces that shouldn't exist. Things appear and disappear without warning.`,
        perceptionText: 'You sense there is MORE to this place than you can perceive. Hidden paths, invisible walls, objects that exist in directions you cannot look.',
        navigationText: 'Navigation is disorienting. Paths that should connect don\'t. Distances are wrong. You often find yourself somewhere unexpected.',
        moodModifier: 'disoriented',
        modifiers: {
          navigationEfficiency: 0.8 - (dimensionDiff * 0.1),
          perceptionBonus: -10 * dimensionDiff,
          sanityDrain: 0.1 * dimensionDiff,
        },
      };
    }

    // Has dimensional perception
    const perceptionLevel = {
      glimpse: 'occasionally glimpse',
      partial: 'can perceive with effort',
      full: 'clearly perceive',
      transcendent: 'fully comprehend',
    }[dimensionalPerception] ?? 'cannot see';

    return {
      situationText: `You are in a ${universeDimensions}D universe. You ${perceptionLevel} the extra dimensions.`,
      perceptionText: dimensionalPerception === 'transcendent'
        ? 'You see in ALL directions. Hidden spaces are revealed. The full geometry of this reality is clear to you.'
        : `You can sense directions that others cannot. Hidden paths reveal themselves. Objects have sides that 3D beings never see.`,
      navigationText: dimensionalPerception === 'full' || dimensionalPerception === 'transcendent'
        ? 'You navigate freely through all available dimensions.'
        : 'Navigation requires focus, but you can find hidden paths others miss.',
      moodModifier: dimensionalPerception === 'transcendent' ? 'enlightened' : 'aware',
      modifiers: {
        navigationEfficiency: dimensionalPerception === 'transcendent' ? 1.2 : 1.0,
        perceptionBonus: dimensionalPerception === 'transcendent' ? 40 : 20,
        sanityDrain: dimensionalPerception === 'transcendent' ? 0.05 : 0,
      },
    };
  }

  // Higher-dimension agent in lower-dimension universe (4D being in 3D world)
  return {
    situationText: `You are in a ${universeDimensions}D universe. This reality feels CRAMPED. Directions you know exist are simply... gone. You are a shadow of your true self here.`,
    perceptionText: 'You perceive more than others here, but cannot act on what you see. It\'s like having a hand tied behind your back - a direction tied behind your existence.',
    navigationText: 'You can move freely in the available dimensions, but your full range of motion is impossible.',
    moodModifier: 'cramped',
    modifiers: {
      navigationEfficiency: 1.1, // Still efficient in limited dimensions
      perceptionBonus: 20, // Can see more than locals
      sanityDrain: 0.02, // Mildly frustrating
    },
  };
}

/**
 * Get a short description of a dimension count for use in prompts.
 */
export function getDimensionDescription(dimensions: DimensionCount): string {
  switch (dimensions) {
    case 2:
      return 'a flat, 2D world where everything exists on a plane';
    case 3:
      return 'a normal 3D universe with length, width, and height';
    case 4:
      return 'a 4D universe with an extra spatial dimension - spaces are larger than they appear, and hidden directions exist';
    case 5:
      return 'a 5D multiverse space - this is the realm between universes, where different realities are visible as nearby "slices"';
  }
}

/**
 * Get navigation instructions for an agent in a higher-dimensional space.
 */
export function getHighDimensionalNavigationHints(
  universeDimensions: DimensionCount,
  perception: DimensionalPerception
): string[] {
  const hints: string[] = [];

  if (universeDimensions >= 4) {
    if (perception === 'native' || perception === 'glimpse') {
      hints.push('If you get lost, retrace your steps. Paths work differently here.');
      hints.push('Things that seem far may be close in directions you cannot see.');
      hints.push('Listen for sounds from "impossible" directions - they may guide you.');
    } else {
      hints.push('Use your dimensional perception to find hidden shortcuts.');
      hints.push('Objects blocking your path in 3D may be passable via the 4th dimension.');
      hints.push('When navigating, consider the W-coordinate as well as X, Y, Z.');
    }
  }

  if (universeDimensions >= 5) {
    hints.push('Nearby universe-slices may have different rules. Be cautious when crossing.');
    hints.push('The same location may have different properties in different universe-slices.');
  }

  return hints;
}
