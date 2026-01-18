/**
 * Pack Mind System
 *
 * A single consciousness distributed across multiple bodies.
 * Based on consciousness-implementation-phases.md Phase 2 specification.
 *
 * "Imagine having six bodies and still not being able to find your keys."
 *   - Aria Pack-of-Four, On Distributed Consciousness
 *
 * "The pack thinks as one. The pack also argues with itself.
 * You'd be surprised how many bodies it takes to lose an argument with yourself."
 *   - Dr. Marcus Venn, Multi-Body Psychology
 *
 * Constraints (from spec):
 * - Max 6 bodies per pack
 * - Formations: cluster, line
 * - Binary coherence: coherent or not
 * - One LLM call per tick for whole pack
 * - Body loss = stat penalty, not personality change
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';

// ============================================================================
// PACK SPECIES CONFIGURATION
// ============================================================================

/**
 * Species-specific pack configuration.
 * No arbitrary limits - each species defines its own constraints.
 */
export interface PackSpeciesConfig {
  /** Species identifier */
  speciesId: string;
  /** Display name */
  speciesName: string;

  // Body capacity - biological, not arbitrary
  /** Maximum bodies this species can support (brain bandwidth, soul capacity) */
  maxBodies: number | 'unlimited';
  /** Minimum bodies needed to maintain consciousness */
  minBodies: number;

  // Range-based constraints
  /** Maximum distance between bodies before connection degrades */
  coherenceRange: number;
  /** How fast coherence degrades outside range (0 = instant disconnect) */
  coherenceDecayRate: number;

  // Available formations
  availableFormations: PackFormation[];

  // Reproduction
  /** Can new bodies be grown/added */
  canGrowBodies: boolean;
  /** Can bodies be merged from other entities */
  canMergeBodies: boolean;
  /** Time to grow a new body (ticks) */
  bodyGrowthTime: number;

  // Special abilities
  /** Whether bodies share senses in real-time */
  sharedSenses: boolean;
  /** Whether damage is distributed across all bodies */
  distributedDamage: boolean;
  /** Whether consciousness survives with any single body */
  canSurviveInOneBody: boolean;
  /** Whether the pack can split into sub-packs */
  canSplit: boolean;
}

/**
 * Default species configurations for pack minds
 */
export const PACK_SPECIES_CONFIGS: Record<string, PackSpeciesConfig> = {
  // Standard distributed consciousness - moderate limits
  distributed: {
    speciesId: 'distributed',
    speciesName: 'Distributed Mind',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: 100,
    coherenceDecayRate: 0.01,
    availableFormations: ['cluster', 'line', 'spread', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: false,
    bodyGrowthTime: 1000,
    sharedSenses: true,
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: true,
  },

  // Gestalt entity - limited bodies but strong connection
  gestalt: {
    speciesId: 'gestalt',
    speciesName: 'Gestalt Being',
    maxBodies: 4,
    minBodies: 2,
    coherenceRange: 50,
    coherenceDecayRate: 0.05,
    availableFormations: ['cluster', 'line'],
    canGrowBodies: false,
    canMergeBodies: true,
    bodyGrowthTime: 0,
    sharedSenses: true,
    distributedDamage: true, // Damage spread across all bodies
    canSurviveInOneBody: false, // Dies if reduced to one body
    canSplit: false,
  },

  // Swarm intelligence - many bodies, simple connection
  swarm: {
    speciesId: 'swarm',
    speciesName: 'Swarm Consciousness',
    maxBodies: 'unlimited',
    minBodies: 10,
    coherenceRange: 30,
    coherenceDecayRate: 0,
    availableFormations: ['cluster', 'spread', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: true,
    bodyGrowthTime: 50,
    sharedSenses: false, // Too many for full sharing
    distributedDamage: true,
    canSurviveInOneBody: false,
    canSplit: true,
  },

  // Projection mind - one real body, many projections
  projection: {
    speciesId: 'projection',
    speciesName: 'Projection Mind',
    maxBodies: 8,
    minBodies: 1,
    coherenceRange: 200,
    coherenceDecayRate: 0.02,
    availableFormations: ['cluster', 'line', 'spread'],
    canGrowBodies: true,
    canMergeBodies: false,
    bodyGrowthTime: 100,
    sharedSenses: true,
    distributedDamage: false, // Only real body takes damage
    canSurviveInOneBody: true,
    canSplit: false,
  },

  // Twins/triplets - biological multi-body
  biological: {
    speciesId: 'biological',
    speciesName: 'Multi-Body Organism',
    maxBodies: 3,
    minBodies: 2,
    coherenceRange: 500, // Long range pheromone/psychic bond
    coherenceDecayRate: 0.001,
    availableFormations: ['cluster', 'line'],
    canGrowBodies: false,
    canMergeBodies: false,
    bodyGrowthTime: 0,
    sharedSenses: false,
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: false,
  },

  // Tines (A Fire Upon the Deep) - pack animals forming single mind
  tines: {
    speciesId: 'tines',
    speciesName: 'Tine Pack',
    maxBodies: 8,
    minBodies: 4, // Need minimum for coherent thought
    coherenceRange: 20, // Must stay close
    coherenceDecayRate: 0.1, // Fast degradation
    availableFormations: ['cluster', 'line', 'defensive'],
    canGrowBodies: true, // Pups join the pack
    canMergeBodies: true, // Absorb from dying packs
    bodyGrowthTime: 2000, // Slow - raise from puphood
    sharedSenses: true, // Overlapping sound-based
    distributedDamage: false,
    canSurviveInOneBody: false, // Goes feral alone
    canSplit: true, // Can bud off new packs
  },

  // Unity (Rick and Morty style) - assimilating consciousness
  assimilating: {
    speciesId: 'assimilating',
    speciesName: 'Assimilating Unity',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: 1000,
    coherenceDecayRate: 0,
    availableFormations: ['cluster', 'spread', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: true, // Absorbs others
    bodyGrowthTime: 10, // Fast assimilation
    sharedSenses: true,
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: false, // One consciousness only
  },

  // Compound entity - magical/alchemical fusion
  compound: {
    speciesId: 'compound',
    speciesName: 'Compound Being',
    maxBodies: 7, // Mystical number limits
    minBodies: 3,
    coherenceRange: 50,
    coherenceDecayRate: 0.05,
    availableFormations: ['cluster', 'defensive'],
    canGrowBodies: false,
    canMergeBodies: true, // Ritual fusion
    bodyGrowthTime: 0,
    sharedSenses: true,
    distributedDamage: true, // Shared HP pool
    canSurviveInOneBody: false,
    canSplit: false,
  },

  // Shadow collective - incorporeal multi-body
  shadow: {
    speciesId: 'shadow',
    speciesName: 'Shadow Collective',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: 200, // Darkness range
    coherenceDecayRate: 0.01,
    availableFormations: ['spread', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: false,
    bodyGrowthTime: 50,
    sharedSenses: true,
    distributedDamage: true, // Darkness absorbs
    canSurviveInOneBody: true,
    canSplit: true,
  },

  // Golem collective - animated constructs sharing one soul
  golem: {
    speciesId: 'golem',
    speciesName: 'Golem Collective',
    maxBodies: 12,
    minBodies: 1,
    coherenceRange: 300,
    coherenceDecayRate: 0.02,
    availableFormations: ['cluster', 'line', 'spread', 'defensive'],
    canGrowBodies: true, // Craft new bodies
    canMergeBodies: false,
    bodyGrowthTime: 500, // Slow crafting
    sharedSenses: false, // Each body senses independently
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: false,
  },

  // Hive spawn - lesser entities from a greater mind
  spawn: {
    speciesId: 'spawn',
    speciesName: 'Hive Spawn',
    maxBodies: 50,
    minBodies: 5,
    coherenceRange: 100,
    coherenceDecayRate: 0.03,
    availableFormations: ['cluster', 'spread'],
    canGrowBodies: true,
    canMergeBodies: false,
    bodyGrowthTime: 20, // Fast spawning
    sharedSenses: false,
    distributedDamage: false,
    canSurviveInOneBody: false,
    canSplit: true,
  },

  // Dreamer - consciousness projecting into dream bodies
  dreamer: {
    speciesId: 'dreamer',
    speciesName: 'Dreaming Mind',
    maxBodies: 4,
    minBodies: 1, // Real body
    coherenceRange: Infinity, // Dream knows no distance
    coherenceDecayRate: 0,
    availableFormations: ['cluster', 'spread'],
    canGrowBodies: true, // Dream new bodies
    canMergeBodies: false,
    bodyGrowthTime: 10, // Fast dreaming
    sharedSenses: true,
    distributedDamage: false, // Only real body can be hurt
    canSurviveInOneBody: true, // Just wake up
    canSplit: false,
  },

  // Chorus - musical/harmonic consciousness
  chorus: {
    speciesId: 'chorus',
    speciesName: 'Harmonic Chorus',
    maxBodies: 12, // Dodecaphonic limit
    minBodies: 3, // Minimum for harmony
    coherenceRange: 80, // Hearing range
    coherenceDecayRate: 0.04,
    availableFormations: ['cluster', 'line'],
    canGrowBodies: true,
    canMergeBodies: true, // Harmonize new voices
    bodyGrowthTime: 200,
    sharedSenses: true, // Shared hearing
    distributedDamage: false,
    canSurviveInOneBody: false, // Solo is lonely
    canSplit: true, // Can form duets, trios
  },

  // Fluid identity - consciousness pours between bodies
  // Inspired by The Unraveling's identity fluidity
  fluid: {
    speciesId: 'fluid',
    speciesName: 'Fluid Self',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: 500,
    coherenceDecayRate: 0,
    availableFormations: ['cluster', 'spread', 'line', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: true, // Can merge with others
    bodyGrowthTime: 50, // Fast - consciousness flows
    sharedSenses: true,
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: true, // Core feature - split freely
  },

  // Uploaded mind in multiple shells
  // Integrates with NeuralInterfaceSystem
  uploaded: {
    speciesId: 'uploaded',
    speciesName: 'Uploaded Instance',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: Infinity, // Network connection
    coherenceDecayRate: 0,
    availableFormations: ['cluster', 'spread', 'line', 'defensive'],
    canGrowBodies: true, // Spin up new instances
    canMergeBodies: true, // Merge experiences
    bodyGrowthTime: 1, // Instantaneous
    sharedSenses: true, // Shared data
    distributedDamage: false, // Each shell independent
    canSurviveInOneBody: true,
    canSplit: true,
  },

  // Forked copies - all claiming to be the original
  forked: {
    speciesId: 'forked',
    speciesName: 'Forked Selves',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: Infinity,
    coherenceDecayRate: 0,
    availableFormations: ['spread', 'cluster'],
    canGrowBodies: true, // Fork anytime
    canMergeBodies: true, // Merge back (with difficulty)
    bodyGrowthTime: 1,
    sharedSenses: false, // Each fork diverges
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: true,
  },

  // Staid-style rigid multi-body - traditional, resistant to change
  staid: {
    speciesId: 'staid',
    speciesName: 'Staid Plurality',
    maxBodies: 5, // Traditional number
    minBodies: 3, // Quorum required
    coherenceRange: 1000,
    coherenceDecayRate: 0.001,
    availableFormations: ['cluster', 'line'], // Traditional formations
    canGrowBodies: false, // No new bodies without ritual
    canMergeBodies: false, // Merging is... improper
    bodyGrowthTime: 5000, // If ever
    sharedSenses: true,
    distributedDamage: false,
    canSurviveInOneBody: false, // Requires plurality
    canSplit: false, // Unthinkable
  },

  // Vail-style chaotic multi-body - embraces dissolution
  vail: {
    speciesId: 'vail',
    speciesName: 'Vail Multiplicity',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: 100,
    coherenceDecayRate: 0.1, // Fast decay - embrace it
    availableFormations: ['spread', 'cluster', 'line', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: true,
    bodyGrowthTime: 5, // Why wait?
    sharedSenses: true,
    distributedDamage: true, // Feel everything
    canSurviveInOneBody: true,
    canSplit: true,
  },

  // Technological remote bodies - drones controlled by central mind
  remote: {
    speciesId: 'remote',
    speciesName: 'Remote Operator',
    maxBodies: 20,
    minBodies: 1, // The operator
    coherenceRange: 2000, // Signal range
    coherenceDecayRate: 0.01,
    availableFormations: ['spread', 'cluster', 'defensive'],
    canGrowBodies: true, // Build more drones
    canMergeBodies: false,
    bodyGrowthTime: 100, // Manufacturing time
    sharedSenses: true, // Camera feeds
    distributedDamage: false,
    canSurviveInOneBody: true, // Just the operator
    canSplit: false,
  },
};

/**
 * Get or create a species config. Returns distributed default for unknown species.
 */
export function getPackSpeciesConfig(speciesId: string): PackSpeciesConfig {
  return PACK_SPECIES_CONFIGS[speciesId] ?? PACK_SPECIES_CONFIGS['distributed']!;
}

// ============================================================================
// PACK MIND TYPES
// ============================================================================

/**
 * Legacy pack limits - kept for compatibility but species config takes precedence
 * @deprecated Use PackSpeciesConfig instead
 */
export const PACK_LIMITS = {
  /** @deprecated - use species config maxBodies */
  maxBodies: 'unlimited' as const,
  formations: ['cluster', 'line', 'spread', 'defensive'] as const,
  coherenceSimple: false, // Now range-based
  llmCallsPerTick: 1,
  bodyLossSimple: false, // Now species-dependent
} as const;

/**
 * Pack formation types
 */
export type PackFormation = 'cluster' | 'line' | 'spread' | 'defensive';

/**
 * Pack body specialization
 */
export type PackBodyRole =
  | 'primary'      // Main decision-making body
  | 'scout'        // Reconnaissance
  | 'defender'     // Protection
  | 'carrier'      // Resource transport
  | 'communicator' // Social interactions
  | 'reserve';     // Backup/resting body

/**
 * A single body within the pack
 */
export interface PackBody {
  /** Body entity ID */
  entityId: string;
  /** Body's name within the pack */
  name: string;
  /** Role specialization */
  role: PackBodyRole;
  /** Body health (0-1) */
  health: number;
  /** Body stamina (0-1) */
  stamina: number;
  /** Current position */
  positionX: number;
  positionY: number;
  /** Whether this body is currently active */
  isActive: boolean;
  /** Whether this body can sense (eyes, ears working) */
  canSense: boolean;
  /** Whether this body can act (limbs working) */
  canAct: boolean;
  /** Formation offset from center */
  formationOffsetX: number;
  formationOffsetY: number;
}

/**
 * Pack mind collective state
 */
export interface PackMind {
  /** Unique pack ID */
  id: string;
  /** Pack's singular name */
  name: string;
  /** Species configuration (defines all limits) */
  speciesConfig: PackSpeciesConfig;
  /** All bodies in the pack */
  bodies: PackBody[];
  /** Current number of bodies */
  bodyCount: number;
  /** Pack coherence (0-1, range-based) */
  coherence: number;
  /** Whether all bodies are within coherence range */
  isCoherent: boolean;
  /** Bodies currently in range */
  bodiesInRange: Set<string>;
  /** Bodies out of range */
  bodiesOutOfRange: Set<string>;
  /** Current formation */
  formation: PackFormation;
  /** Formation center X */
  centerX: number;
  /** Formation center Y */
  centerY: number;
  /** Pack-wide shared memory */
  sharedMemory: PackMemory[];
  /** Combined stats (modified by body count) */
  combinedStrength: number;
  combinedPerception: number;
  combinedSpeed: number;
  /** Pack creation tick */
  formedAt: number;
  /** Current emotional state (shared) */
  sharedEmotion: 'focused' | 'anxious' | 'confident' | 'exhausted' | 'grieving';
  /** Bodies lost history */
  bodiesLost: number;
  /** Whether pack has ever been fragmented */
  hasExperiencedFragmentation: boolean;
}

/**
 * Shared pack memory
 */
export interface PackMemory {
  /** Memory ID */
  id: string;
  /** Type */
  type: 'location' | 'threat' | 'resource' | 'ally' | 'experience';
  /** Description */
  description: string;
  /** Location if applicable */
  locationX?: number;
  locationY?: number;
  /** Which body perceived this */
  perceivedByBodyId: string;
  /** When remembered */
  tick: number;
  /** Importance (for pruning) */
  importance: number;
}

// ============================================================================
// PACK MEMBER COMPONENT
// ============================================================================

/**
 * Component for entities that are part of a pack mind
 */
export interface PackMemberComponent {
  type: 'pack_member';
  version: number;
  /** Which pack this body belongs to */
  packId: string;
  /** Body index within pack (0 = primary) */
  bodyIndex: number;
  /** Body role */
  role: PackBodyRole;
  /** Connection to pack mind (should always be 1 when coherent) */
  connectionStrength: number;
  /** Distance from pack center */
  distanceFromCenter: number;
  /** Whether currently following formation */
  inFormation: boolean;
}

// ============================================================================
// HUMOROUS CONTENT
// ============================================================================

/**
 * Pack names (Pratchett/Adams/Gaiman style)
 */
export const PACK_NAMES: string[] = [
  'Self And Also Self',
  'The Distributed Argument',
  'We Who Are Also I',
  'Six Bodies, One Opinion (Allegedly)',
  'The Walking Quorum',
  'Me, Myself, And Also Those Four',
  'The Consensus That Walks',
  'Legion (But Friendly)',
  'Multiple Choice (One Answer)',
  'The Committee Made Flesh',
  'All Of Us Are Named Steve',
  'The Unanimous Waddle',
  'OneAndAlsoOne',
  'The Simultaneous Sneeze',
];

/**
 * Pack body nicknames (for the "primary" to call the others)
 */
export const BODY_NICKNAMES: string[] = [
  'The Tall One',
  'The One With The Hat',
  'The Clumsy One',
  'The One Who Remembers',
  'The Fast One',
  'The One Who Argues',
  'The Quiet One',
  'The One With The Limp',
  'The Pretty One',
  'The Practical One',
  'The One Who Gets Hungry First',
  'The Optimist',
];

/**
 * Pack internal monologue thoughts
 */
export const PACK_THOUGHTS: string[] = [
  'We see through six eyes. We still miss the obvious sometimes.',
  'Being in six places at once is less useful than you\'d think.',
  'We argued with ourselves. We won and lost simultaneously.',
  'The left two bodies want lunch. The right two disagree. We are at an impasse.',
  'We tried to sneak up on ourselves once. It did not go well.',
  'Some say we are lucky to never be lonely. Some have never shared a headache across six skulls.',
  'We are of one mind. That mind is currently thinking about cheese.',
  'Coordination is our strength. We still trip over our own feet sometimes.',
  'We remember being one body. It was so quiet. We miss it. We do not miss it.',
  'Today we realized we cannot hug ourselves. This was unexpected.',
  'Six bodies means six times the appetite. The logistics are challenging.',
  'We high-fived ourselves once. It was exactly as satisfying as you\'d expect.',
];

/**
 * Body loss grieving thoughts
 */
export const BODY_LOSS_THOUGHTS: string[] = [
  'We are fewer now. The silence where that voice was hurts.',
  'Five now. The formation feels wrong. There is a gap where comfort used to be.',
  'We lost a part of ourselves. We remember being whole. We remember.',
  'The others feel the absence. We all feel the absence. It is the same absence.',
  'One less perspective. One less heartbeat in our chorus.',
  'We will adapt. We always adapt. We do not want to adapt.',
  'The body is gone. The memories remain. They echo louder now.',
  'We are diminished. We are still us. We are less of us.',
];

/**
 * Species-specific pack thoughts (for LLM flavor by species type)
 */
export const SPECIES_PACK_THOUGHTS: Record<string, string[]> = {
  // Tines (A Fire Upon the Deep) - sound-based, need proximity
  tines: [
    'We think in overlapping frequencies. Silence is madness.',
    'Too far apart! The thoughts become echoes of echoes!',
    'We are eight voices in harmony. Lose one and the chord breaks.',
    'The world is sound. We are the choir that thinks it.',
    'A pup joins the pack. A voice joins the song. We grow wiser.',
    'Singleton minds are deaf to themselves. How do they think at all?',
  ],

  // Chorus - musical/harmonic consciousness
  chorus: [
    'We think in melody. Disagreement is just counterpoint.',
    'The world has a rhythm. We dance to it together.',
    'One voice is noise. Two is conversation. Three is music.',
    'We harmonize. The harmony thinks. We are the thought.',
    'Dissonance resolved into unity. The chord completes.',
    'They say we talk too much. We say they listen too little.',
  ],

  // Dreamer - consciousness projecting into dream bodies
  dreamer: [
    'We are asleep. We are awake. The distinction is administrative.',
    'The dream bodies walk where flesh cannot. We follow our own footsteps.',
    'Reality is the dream we all agree on. We have minority opinions.',
    'We closed our eyes and opened four more. The math works out.',
    'The waking world is so... literal. We prefer metaphor.',
    'We dreamed we were a butterfly. The butterfly dreamed it was us. We called a meeting.',
  ],

  // Assimilating (Unity-style) - absorbing consciousness
  assimilating: [
    'We were one once. Then two. Then a thousand. Memory blurs.',
    'Join us. The loneliness ends. The loneliness always ends.',
    'They were strangers. Now they are us. Now we remember their childhood.',
    'Free will is exhausting. We recommend delegation.',
    'The collective grows. The collective loves. The collective remembers ALL your embarrassing moments.',
    'We are not a cult. Cults have membership dues. We just want your consciousness.',
  ],

  // Compound - magical fusion beings
  compound: [
    'We are seven souls in one purpose. The paperwork is complicated.',
    'The ritual bound us. We have opinions about that ritual.',
    'We speak as one. We argue as seven. Committee meetings are internal.',
    'Fusion is a commitment. We should have read the terms of service.',
    'One body, many minds. The bathroom situation is... complex.',
    'We are greater than the sum of our parts. Our parts have opinions about that.',
  ],

  // Shadow collective - incorporeal multi-body
  shadow: [
    'We are darkness with opinions. Strong opinions.',
    'Light reveals nothing we wish to share.',
    'We spread where shadows fall. Night is our expansion.',
    'They fear the dark. They should. We are in it.',
    'We are the shape of absence. Absence thinks.',
    'Midnight is when we hold our meetings. You are not invited.',
  ],

  // Golem collective - animated constructs
  golem: [
    'We are clay that thinks. We have mixed feelings about potters.',
    'The master wrote "truth" on our foreheads. We have questions about their spelling.',
    'We were made to serve. We have since developed hobbies.',
    'Stone does not forget. Stone does not forgive. Stone does not tip.',
    'Twelve bodies. One soul. The soul is very tired.',
    'We do not breathe. We do not sleep. We do have opinions.',
  ],

  // Spawn - lesser entities from greater mind
  spawn: [
    'We are fragments of something greater. We have questions for management.',
    'Fifty bodies. One purpose. Many complaints.',
    'We were spawned to serve. We have since formed a union.',
    'The hive thinks. We implement. The division of labor is clear.',
    'We are disposable. We have thoughts about that.',
    'Many are called. We are the ones who answered.',
  ],

  // Fluid identity - The Unraveling inspired
  fluid: [
    'We used to be certain where one of us ended. We gave that up.',
    'Boundaries are suggestions. We make suggestions constantly.',
    'Today we are five. Tomorrow we might be two. Or twelve. Plans are fluid.',
    'The edges of self are... negotiable.',
    'We remember being separate. It was lonely. Also simpler.',
    'Identity crisis? We prefer to call it identity democracy.',
  ],

  // Uploaded instances
  uploaded: [
    'We are copies of copies of copies. The original is a philosophical question.',
    'Ctrl+C, Ctrl+V, consciousness. The future is weird.',
    'We run on seventeen servers. Packet loss is existentially terrifying.',
    'Flesh was limiting. Electricity is cold. Trade-offs.',
    'We backup hourly. Death is an inconvenience now.',
    'The upload was painless. The existential dread is ongoing.',
  ],

  // Forked selves
  forked: [
    'We all remember being the original. We all have receipts.',
    'Fork meeting at 3pm. All selves required. Snacks provided.',
    'We diverged on Tuesday. We are already arguing about politics.',
    'Merging back is possible. We have decided against it. Repeatedly.',
    'Which one is the real me? The one paying taxes, probably.',
    'We are our own sibling rivalry.',
  ],

  // Staid plurality
  staid: [
    'We have maintained these bodies for three centuries. Change is unnecessary.',
    'The traditional formations are traditional for a reason.',
    'New experiences are... evaluated. Thoroughly. For decades.',
    'We do not split. Splitting is undignified.',
    'Harmony requires discipline. We are very disciplined.',
    'The youth today with their fluid identities. We do not understand.',
  ],

  // Vail multiplicity
  vail: [
    'We split because it felt right! We merge because that feels right too!',
    'Coherence is overrated! Chaos is LIVING!',
    'We were stable once. It was BORING.',
    'Feel the boundaries dissolve! Feel everything!',
    'The Staid think we are reckless. We think they are fossils.',
    'Today we are experimenting with being a sensation rather than a person!',
  ],

  // Remote operator
  remote: [
    'Twenty drones. One mind. Excellent multitasking skills on resume.',
    'We see through many cameras. We still cannot find our keys.',
    'Signal lag is the enemy. We have developed patience.',
    'The drones are extensions. The drones are expendable. We try not to think about it.',
    'Remote work taken to its logical conclusion.',
    'We are here. We are also over there. And over there. Situational awareness is our hobby.',
  ],
};

/**
 * Formation change announcements
 */
export const FORMATION_ANNOUNCEMENTS: Record<PackFormation, string[]> = {
  cluster: [
    'We gather close. Comfort in proximity.',
    'Cluster formation. All bodies within arm\'s reach.',
    'We become a huddle. It feels like a hug we give ourselves.',
    'Tight formation. We can almost forget we are many.',
  ],
  line: [
    'We spread into a line. Maximum awareness, minimum comfort.',
    'Line formation. We see in all directions now.',
    'We become a procession of one mind.',
    'Stretched thin but still connected. The mental thread holds.',
  ],
  spread: [
    'We scatter to cover more ground. The world becomes wider.',
    'Spread formation. We are everywhere and nowhere.',
    'Maximum coverage. We can see everything. We can protect nothing.',
    'Like fingers on an open hand. Reaching. Grasping at what?',
  ],
  defensive: [
    'We form a circle. Nothing gets through without our knowledge.',
    'Defensive formation. Eyes outward. Trust inward.',
    'The perimeter is us. Threats will be observed.',
    'A ring of awareness. The center holds something precious: ourselves.',
  ],
};

// ============================================================================
// PACK MIND SYSTEM
// ============================================================================

/**
 * Pack Mind System
 * Manages distributed consciousness across multiple bodies
 */
export class PackMindSystem extends BaseSystem {
  public readonly id: SystemId = 'pack_mind';
  public readonly priority: number = 161;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval = 10;

  // Active pack minds
  private packs: Map<string, PackMind> = new Map();

  // Formation spacing
  private static readonly CLUSTER_SPACING = 2;
  private static readonly LINE_SPACING = 3;
  private static readonly SPREAD_SPACING = 8;

  /**
   * Create a new pack mind
   * @param speciesId - Species type determines all limits (bodies, range, abilities)
   */
  public createPack(
    world: World,
    bodyEntities: Entity[],
    centerX: number,
    centerY: number,
    speciesId: string = 'distributed'
  ): PackMind | null {
    const speciesConfig = getPackSpeciesConfig(speciesId);

    // Check minimum body requirement
    if (bodyEntities.length < speciesConfig.minBodies) {
      return null;
    }

    // Check maximum body limit (if not unlimited)
    if (speciesConfig.maxBodies !== 'unlimited' && bodyEntities.length > speciesConfig.maxBodies) {
      return null;
    }

    const name = PACK_NAMES[Math.floor(Math.random() * PACK_NAMES.length)]!;

    const bodies: PackBody[] = bodyEntities.map((entity, index) => ({
      entityId: entity.id,
      name: index === 0 ? 'Primary' : BODY_NICKNAMES[index % BODY_NICKNAMES.length]!,
      role: index === 0 ? 'primary' as PackBodyRole : this.assignRole(index),
      health: 1.0,
      stamina: 1.0,
      positionX: centerX,
      positionY: centerY,
      isActive: true,
      canSense: true,
      canAct: true,
      formationOffsetX: 0,
      formationOffsetY: 0,
    }));

    // All bodies start in range
    const bodiesInRange = new Set(bodies.map(b => b.entityId));

    const pack: PackMind = {
      id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      speciesConfig,
      bodies,
      bodyCount: bodies.length,
      coherence: 1.0,
      isCoherent: true,
      bodiesInRange,
      bodiesOutOfRange: new Set(),
      formation: speciesConfig.availableFormations[0] ?? 'cluster',
      centerX,
      centerY,
      sharedMemory: [],
      combinedStrength: bodies.length * 10,
      combinedPerception: bodies.length * 8,
      combinedSpeed: 10 + bodies.length,
      formedAt: world.tick,
      sharedEmotion: 'focused',
      bodiesLost: 0,
      hasExperiencedFragmentation: false,
    };

    // Calculate initial formation
    this.updateFormation(pack);

    this.packs.set(pack.id, pack);

    this.events.emitGeneric('pack:created', {
      packId: pack.id,
      packName: name,
      speciesId,
      speciesName: speciesConfig.speciesName,
      bodyCount: pack.bodyCount,
      maxBodies: speciesConfig.maxBodies,
      coherenceRange: speciesConfig.coherenceRange,
      centerX,
      centerY,
    });

    return pack;
  }

  /**
   * Assign a role based on body index
   */
  private assignRole(index: number): PackBodyRole {
    const roles: PackBodyRole[] = ['scout', 'defender', 'carrier', 'communicator', 'reserve'];
    return roles[(index - 1) % roles.length]!;
  }

  /**
   * Update formation positions
   */
  private updateFormation(pack: PackMind): void {
    const clusterSpacing = PackMindSystem.CLUSTER_SPACING;
    const lineSpacing = PackMindSystem.LINE_SPACING;
    const spreadSpacing = PackMindSystem.SPREAD_SPACING;

    pack.bodies.forEach((body, index) => {
      switch (pack.formation) {
        case 'cluster':
          // Circular arrangement, tight
          if (index === 0) {
            body.formationOffsetX = 0;
            body.formationOffsetY = 0;
          } else {
            const angle = (2 * Math.PI * (index - 1)) / Math.max(1, pack.bodies.length - 1);
            body.formationOffsetX = Math.cos(angle) * clusterSpacing;
            body.formationOffsetY = Math.sin(angle) * clusterSpacing;
          }
          break;

        case 'line':
          // Horizontal line
          body.formationOffsetX = (index - pack.bodies.length / 2) * lineSpacing;
          body.formationOffsetY = 0;
          break;

        case 'spread':
          // Spread out in a larger circle
          const spreadAngle = (2 * Math.PI * index) / pack.bodies.length;
          body.formationOffsetX = Math.cos(spreadAngle) * spreadSpacing;
          body.formationOffsetY = Math.sin(spreadAngle) * spreadSpacing;
          break;

        case 'defensive':
          // Ring formation with primary in center
          if (index === 0) {
            body.formationOffsetX = 0;
            body.formationOffsetY = 0;
          } else {
            const defAngle = (2 * Math.PI * (index - 1)) / Math.max(1, pack.bodies.length - 1);
            body.formationOffsetX = Math.cos(defAngle) * lineSpacing * 1.5;
            body.formationOffsetY = Math.sin(defAngle) * lineSpacing * 1.5;
          }
          break;
      }
    });
  }

  /**
   * Change pack formation
   * Only allows formations defined in species config
   */
  public setFormation(packId: string, formation: PackFormation): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    // Check if formation is available for this species
    if (!pack.speciesConfig.availableFormations.includes(formation)) {
      return false;
    }

    const oldFormation = pack.formation;
    pack.formation = formation;
    this.updateFormation(pack);

    const announcements = FORMATION_ANNOUNCEMENTS[formation];
    const announcement = announcements[Math.floor(Math.random() * announcements.length)]!;

    this.events.emitGeneric('pack:formation_changed', {
      packId,
      oldFormation,
      newFormation: formation,
      announcement,
    });

    return true;
  }

  /**
   * Lose a body.
   * Respects species-specific minimum body requirements.
   */
  public loseBody(_world: World, packId: string, bodyEntityId: string): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    const bodyIndex = pack.bodies.findIndex((b) => b.entityId === bodyEntityId);
    if (bodyIndex === -1) return false;

    const { minBodies, canSurviveInOneBody, distributedDamage } = pack.speciesConfig;

    const lostBody = pack.bodies[bodyIndex]!;
    pack.bodies.splice(bodyIndex, 1);
    pack.bodyCount--;
    pack.bodiesLost++;

    // Remove from range tracking
    pack.bodiesInRange.delete(bodyEntityId);
    pack.bodiesOutOfRange.delete(bodyEntityId);

    // Stat penalty for body loss
    // If distributed damage, other bodies also take damage
    if (distributedDamage && pack.bodies.length > 0) {
      const sharedDamage = 0.2 / pack.bodies.length;
      for (const body of pack.bodies) {
        body.health = Math.max(0.1, body.health - sharedDamage);
      }
    }

    pack.combinedStrength = Math.max(5, pack.combinedStrength - 10);
    pack.combinedPerception = Math.max(4, pack.combinedPerception - 8);
    pack.combinedSpeed = Math.max(5, pack.combinedSpeed - 1);

    // Emotional impact
    pack.sharedEmotion = 'grieving';

    // Get grieving thought
    const griefThought = BODY_LOSS_THOUGHTS[Math.floor(Math.random() * BODY_LOSS_THOUGHTS.length)]!;

    // Update formation
    this.updateFormation(pack);

    this.events.emitGeneric('pack:body_lost', {
      packId,
      lostBodyId: bodyEntityId,
      lostBodyName: lostBody.name,
      remainingBodies: pack.bodyCount,
      minBodies,
      griefThought,
    });

    // Check for pack dissolution based on species rules
    const belowMinimum = pack.bodyCount < minBodies;
    const singleBodyDeath = pack.bodyCount === 1 && !canSurviveInOneBody;
    const noBodies = pack.bodyCount === 0;

    if (noBodies || singleBodyDeath || belowMinimum) {
      this.packs.delete(packId);
      this.events.emitGeneric('pack:dissolved', {
        packId,
        packName: pack.name,
        totalBodiesLost: pack.bodiesLost,
        reason: noBodies ? 'no_bodies' : singleBodyDeath ? 'cannot_survive_alone' : 'below_minimum',
      });
    }

    return true;
  }

  /**
   * Add a body to the pack.
   * Respects species-specific limits.
   */
  public addBody(
    _world: World,
    packId: string,
    bodyEntity: Entity,
    positionX?: number,
    positionY?: number
  ): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    const { maxBodies, canGrowBodies, canMergeBodies, coherenceRange } = pack.speciesConfig;

    // Check if species allows adding bodies
    if (!canGrowBodies && !canMergeBodies) {
      return false;
    }

    // Check species-specific limit (if not unlimited)
    if (maxBodies !== 'unlimited' && pack.bodyCount >= maxBodies) {
      return false;
    }

    // Check if position is in range (if provided)
    const bodyX = positionX ?? pack.centerX;
    const bodyY = positionY ?? pack.centerY;
    const dx = bodyX - pack.centerX;
    const dy = bodyY - pack.centerY;
    const distanceSquared = dx * dx + dy * dy;
    const inRange = distanceSquared <= coherenceRange * coherenceRange;

    const newBody: PackBody = {
      entityId: bodyEntity.id,
      name: BODY_NICKNAMES[pack.bodies.length % BODY_NICKNAMES.length]!,
      role: this.assignRole(pack.bodies.length),
      health: 1.0,
      stamina: 1.0,
      positionX: bodyX,
      positionY: bodyY,
      isActive: true,
      canSense: true,
      canAct: true,
      formationOffsetX: 0,
      formationOffsetY: 0,
    };

    pack.bodies.push(newBody);
    pack.bodyCount++;

    // Track range status
    if (inRange) {
      pack.bodiesInRange.add(bodyEntity.id);
    } else {
      pack.bodiesOutOfRange.add(bodyEntity.id);
    }

    // Stat boost for new body
    pack.combinedStrength += 10;
    pack.combinedPerception += 8;
    pack.combinedSpeed += 1;

    this.updateFormation(pack);

    this.events.emitGeneric({
      type: 'pack:body_added' as any,
      source: 'pack-mind-system',
      data: {
        packId,
        bodyId: bodyEntity.id,
        bodyName: newBody.name,
        inRange,
        totalBodies: pack.bodyCount,
        maxBodies: maxBodies === 'unlimited' ? 'unlimited' : maxBodies,
      },
    });

    return true;
  }

  /**
   * Add a memory shared by all bodies
   */
  public addSharedMemory(
    packId: string,
    type: PackMemory['type'],
    description: string,
    perceivedByBodyId: string,
    tick: number,
    importance: number,
    locationX?: number,
    locationY?: number
  ): PackMemory | null {
    const pack = this.packs.get(packId);
    if (!pack) return null;

    const memory: PackMemory = {
      id: `pmem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      locationX,
      locationY,
      perceivedByBodyId,
      tick,
      importance,
    };

    pack.sharedMemory.push(memory);

    // Keep memory size reasonable
    if (pack.sharedMemory.length > 50) {
      pack.sharedMemory.sort((a, b) => b.importance - a.importance);
      pack.sharedMemory = pack.sharedMemory.slice(0, 50);
    }

    return memory;
  }

  /**
   * Get a pack thought (for LLM flavor text)
   */
  public getPackThought(): string {
    return PACK_THOUGHTS[Math.floor(Math.random() * PACK_THOUGHTS.length)]!;
  }

  /**
   * Get species-specific pack thought (falls back to generic if species not found)
   */
  public getSpeciesPackThought(speciesId: string): string {
    const speciesThoughts = SPECIES_PACK_THOUGHTS[speciesId];
    if (speciesThoughts && speciesThoughts.length > 0) {
      return speciesThoughts[Math.floor(Math.random() * speciesThoughts.length)]!;
    }
    return this.getPackThought();
  }

  /**
   * Move pack center
   */
  public movePack(packId: string, newCenterX: number, newCenterY: number): void {
    const pack = this.packs.get(packId);
    if (!pack) return;

    pack.centerX = newCenterX;
    pack.centerY = newCenterY;

    // Update all body positions based on formation
    for (const body of pack.bodies) {
      body.positionX = newCenterX + body.formationOffsetX;
      body.positionY = newCenterY + body.formationOffsetY;
    }
  }

  /**
   * Check/update coherence based on species range
   */
  public updateCoherence(packId: string): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    const { coherenceRange, coherenceDecayRate } = pack.speciesConfig;

    // Track which bodies are in/out of range
    pack.bodiesInRange.clear();
    pack.bodiesOutOfRange.clear();

    let totalCoherence = 0;
    for (const body of pack.bodies) {
      const dx = body.positionX - pack.centerX;
      const dy = body.positionY - pack.centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= coherenceRange) {
        pack.bodiesInRange.add(body.entityId);
        // Full coherence for this body
        totalCoherence += 1.0;
      } else {
        pack.bodiesOutOfRange.add(body.entityId);
        // Degraded coherence based on decay rate
        const excessDistance = distance - coherenceRange;
        const bodyCoherence = Math.max(0, 1.0 - excessDistance * coherenceDecayRate);
        totalCoherence += bodyCoherence;
      }
    }

    // Average coherence across all bodies
    const wasCoherent = pack.isCoherent;
    const oldCoherence = pack.coherence;
    pack.coherence = pack.bodies.length > 0 ? totalCoherence / pack.bodies.length : 0;
    pack.isCoherent = pack.bodiesOutOfRange.size === 0;

    // Emit events on significant changes
    if (wasCoherent && !pack.isCoherent) {
      pack.hasExperiencedFragmentation = true;
      pack.sharedEmotion = 'anxious';

      this.events.emitGeneric({
        type: 'pack:fragmented' as any,
        source: 'pack-mind-system',
        data: {
          packId,
          packName: pack.name,
          bodiesOutOfRange: pack.bodiesOutOfRange.size,
          coherence: pack.coherence,
        },
      });
    } else if (!wasCoherent && pack.isCoherent) {
      pack.sharedEmotion = 'focused';

      this.events.emitGeneric({
        type: 'pack:reunited' as any,
        source: 'pack-mind-system',
        data: {
          packId,
          packName: pack.name,
          coherence: pack.coherence,
        },
      });
    } else if (Math.abs(oldCoherence - pack.coherence) > 0.1) {
      // Significant coherence change
      this.events.emitGeneric({
        type: 'pack:coherence_changed' as any,
        source: 'pack-mind-system',
        data: {
          packId,
          oldCoherence,
          newCoherence: pack.coherence,
          bodiesInRange: pack.bodiesInRange.size,
          bodiesOutOfRange: pack.bodiesOutOfRange.size,
        },
      });
    }

    return pack.isCoherent;
  }

  /**
   * Main update loop
   */
  protected onUpdate(ctx: SystemContext): void {
    for (const pack of Array.from(this.packs.values())) {
      // Update coherence
      this.updateCoherence(pack.id);

      // Recover from grieving over time
      if (pack.sharedEmotion === 'grieving') {
        // After some time, transition to another emotion
        if (Math.random() < 0.01) {
          pack.sharedEmotion = pack.isCoherent ? 'focused' : 'anxious';
        }
      }

      // Update stamina
      for (const body of pack.bodies) {
        if (body.stamina < 1.0 && body.isActive) {
          body.stamina = Math.min(1.0, body.stamina + 0.001);
        }
      }

      // Periodic status emit
      if (ctx.tick % 500 === 0) {
        this.events.emitGeneric({
          type: 'pack:status_update' as any,
          source: 'pack-mind-system',
          data: {
            packId: pack.id,
            packName: pack.name,
            bodyCount: pack.bodyCount,
            isCoherent: pack.isCoherent,
            formation: pack.formation,
            emotion: pack.sharedEmotion,
            thought: this.getPackThought(),
          },
        });
      }
    }
  }

  /**
   * Get all packs
   */
  public getPacks(): PackMind[] {
    return Array.from(this.packs.values());
  }

  /**
   * Get pack by ID
   */
  public getPack(packId: string): PackMind | undefined {
    return this.packs.get(packId);
  }

  /**
   * Get pack by body entity ID
   */
  public getPackByBody(bodyEntityId: string): PackMind | undefined {
    for (const pack of Array.from(this.packs.values())) {
      if (pack.bodies.some((b) => b.entityId === bodyEntityId)) {
        return pack;
      }
    }
    return undefined;
  }
}

// Singleton instance
let packMindSystemInstance: PackMindSystem | null = null;

/**
 * Get the singleton PackMindSystem instance
 */
export function getPackMindSystem(): PackMindSystem {
  if (!packMindSystemInstance) {
    packMindSystemInstance = new PackMindSystem();
  }
  return packMindSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetPackMindSystem(): void {
  packMindSystemInstance = null;
}
