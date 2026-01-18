/**
 * Hive Mind System
 *
 * Collective consciousness where a Queen directs Workers through Cerebrates.
 * Based on consciousness-implementation-phases.md Phase 2 specification.
 *
 * "We are not many. We are one with many bodies.
 * Your concept of 'I' is quaint but inefficient."
 *   - The Harmonia Collective, First Contact Speech
 *
 * "The thing about hive minds is they're never lonely.
 * The OTHER thing about hive minds is neither are you."
 *   - Dr. Helena Cross, Xenopsychology Department
 *
 * Tier System:
 * - QUEEN: Full LLM-based agent, makes all strategic decisions
 * - CEREBRATE: Simplified LLM (occasional), mostly rule-based sub-commanders
 * - WORKER: Pure state machine, no LLM, deterministic behavior
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';

// ============================================================================
// SPECIES CONFIGURATION
// ============================================================================

/**
 * Species-specific hive configuration.
 * No arbitrary limits - each species defines its own constraints based on biology.
 */
export interface HiveSpeciesConfig {
  /** Species identifier */
  speciesId: string;
  /** Display name */
  speciesName: string;

  // Capacity - not arbitrary caps, but biological limits
  /** Maximum cerebrates this species can support (brain size, neural bandwidth) */
  maxCerebrates: number | 'unlimited';
  /** Maximum workers per cerebrate (command span, not hard limit) */
  workersPerCerebrate: number | 'unlimited';

  // Range-based constraints
  /** Telepathic range in map units (0 = touch only, Infinity = unlimited) */
  telepathyRange: number;
  /** How much control degrades per unit of distance (0 = no degradation) */
  controlDecayPerDistance: number;
  /** Whether the hive can function when queen is out of range */
  canSurviveWithoutQueen: boolean;

  // Reproduction
  /** Can this hive create new cerebrates */
  canSpawnCerebrates: boolean;
  /** Can this hive absorb foreign workers */
  canAbsorbWorkers: boolean;
  /** Gestation time for new workers (ticks) */
  workerGestationTime: number;

  // Special abilities
  /** Whether workers share sensory input */
  sharedSenses: boolean;
  /** Whether workers share damage (distributed HP pool) */
  sharedDamage: boolean;
  /** Whether dead workers can be reanimated */
  canReanimateWorkers: boolean;
}

/**
 * Default species configurations - these are examples, not limits
 */
export const HIVE_SPECIES_CONFIGS: Record<string, HiveSpeciesConfig> = {
  // Classic insectoid hive - queen-centric, limited cerebrates
  insectoid: {
    speciesId: 'insectoid',
    speciesName: 'Insectoid Collective',
    maxCerebrates: 8,
    workersPerCerebrate: 50,
    telepathyRange: 500,
    controlDecayPerDistance: 0.002,
    canSurviveWithoutQueen: false,
    canSpawnCerebrates: true,
    canAbsorbWorkers: false,
    workerGestationTime: 100,
    sharedSenses: false,
    sharedDamage: false,
    canReanimateWorkers: false,
  },

  // Fungal network - range-limited but massive capacity
  fungal: {
    speciesId: 'fungal',
    speciesName: 'Fungal Overmind',
    maxCerebrates: 'unlimited',
    workersPerCerebrate: 'unlimited',
    telepathyRange: 100, // Short range but...
    controlDecayPerDistance: 0, // ...no decay within range (mycorrhizal network)
    canSurviveWithoutQueen: true, // Distributed consciousness
    canSpawnCerebrates: true,
    canAbsorbWorkers: true,
    workerGestationTime: 500,
    sharedSenses: true,
    sharedDamage: true,
    canReanimateWorkers: true, // Spore recolonization
  },

  // Psychic collective - unlimited range, limited numbers
  psychic: {
    speciesId: 'psychic',
    speciesName: 'Psychic Gestalt',
    maxCerebrates: 3,
    workersPerCerebrate: 20,
    telepathyRange: Infinity, // Planet-wide telepathy
    controlDecayPerDistance: 0,
    canSurviveWithoutQueen: false,
    canSpawnCerebrates: false, // Must convert individuals
    canAbsorbWorkers: true,
    workerGestationTime: 1000,
    sharedSenses: true,
    sharedDamage: false,
    canReanimateWorkers: false,
  },

  // Parasitic collective (integrates with existing CollectiveMindComponent)
  parasitic: {
    speciesId: 'parasitic',
    speciesName: 'Parasitic Consciousness',
    maxCerebrates: 'unlimited',
    workersPerCerebrate: 'unlimited',
    telepathyRange: 1000, // Matches CollectiveMindComponent.communicationRange
    controlDecayPerDistance: 0.001,
    canSurviveWithoutQueen: true,
    canSpawnCerebrates: true,
    canAbsorbWorkers: true, // Colonization
    workerGestationTime: 200,
    sharedSenses: false,
    sharedDamage: false,
    canReanimateWorkers: false,
  },

  // Nanite swarm - tech-based, capacity limited by processing power
  nanite: {
    speciesId: 'nanite',
    speciesName: 'Nanite Consensus',
    maxCerebrates: 'unlimited',
    workersPerCerebrate: 1000,
    telepathyRange: 50, // Short-range radio
    controlDecayPerDistance: 0.01,
    canSurviveWithoutQueen: true,
    canSpawnCerebrates: true,
    canAbsorbWorkers: false,
    workerGestationTime: 10, // Fast manufacturing
    sharedSenses: true,
    sharedDamage: true, // Distributed processing
    canReanimateWorkers: true, // Repair drones
  },

  // Borg-style cybernetic collective - assimilation, enforced conformity
  cybernetic: {
    speciesId: 'cybernetic',
    speciesName: 'Cybernetic Collective',
    maxCerebrates: 1, // One central node (Borg Queen analog)
    workersPerCerebrate: 'unlimited',
    telepathyRange: 2000, // Subspace-like communication
    controlDecayPerDistance: 0,
    canSurviveWithoutQueen: false, // Disorganized without central node
    canSpawnCerebrates: false,
    canAbsorbWorkers: true, // ASSIMILATION
    workerGestationTime: 50, // Fast conversion
    sharedSenses: true,
    sharedDamage: false,
    canReanimateWorkers: true, // Cybernetic resurrection
  },

  // Geth-style networked AI - intelligence scales with numbers
  networked_ai: {
    speciesId: 'networked_ai',
    speciesName: 'Networked Intelligence',
    maxCerebrates: 'unlimited', // No hierarchy, distributed
    workersPerCerebrate: 'unlimited',
    telepathyRange: 500, // Network range
    controlDecayPerDistance: 0,
    canSurviveWithoutQueen: true, // No queen needed
    canSpawnCerebrates: true,
    canAbsorbWorkers: false, // Can't force join
    workerGestationTime: 100,
    sharedSenses: true,
    sharedDamage: false,
    canReanimateWorkers: true, // Backup restoration
  },

  // Tyranid-style synaptic network - bioships, Shadow in the Warp
  synaptic: {
    speciesId: 'synaptic',
    speciesName: 'Synaptic Overmind',
    maxCerebrates: 12, // Synapse creatures
    workersPerCerebrate: 200,
    telepathyRange: 300, // Synapse range
    controlDecayPerDistance: 0.005,
    canSurviveWithoutQueen: false, // Instinctive behavior only
    canSpawnCerebrates: true,
    canAbsorbWorkers: true, // Biomass absorption
    workerGestationTime: 30,
    sharedSenses: false, // Too many for full sharing
    sharedDamage: false,
    canReanimateWorkers: false, // Consumed for biomass
  },

  // Gravemind-style undead collective - death-based consciousness
  necromantic: {
    speciesId: 'necromantic',
    speciesName: 'Necromantic Collective',
    maxCerebrates: 3, // Greater undead
    workersPerCerebrate: 'unlimited',
    telepathyRange: 1000, // Death's reach
    controlDecayPerDistance: 0.001,
    canSurviveWithoutQueen: true, // Undying persistence
    canSpawnCerebrates: true,
    canAbsorbWorkers: true, // Raise the dead
    workerGestationTime: 200,
    sharedSenses: false,
    sharedDamage: false,
    canReanimateWorkers: true, // OBVIOUSLY
  },

  // Elemental swarm - energy beings, shadows, non-biological
  elemental: {
    speciesId: 'elemental',
    speciesName: 'Elemental Convergence',
    maxCerebrates: 'unlimited',
    workersPerCerebrate: 'unlimited',
    telepathyRange: Infinity, // Elemental plane connection
    controlDecayPerDistance: 0,
    canSurviveWithoutQueen: true,
    canSpawnCerebrates: true,
    canAbsorbWorkers: false,
    workerGestationTime: 500, // Slow manifestation
    sharedSenses: true,
    sharedDamage: true, // Energy distribution
    canReanimateWorkers: true, // Reform from element
  },

  // Plant/botanical collective - slow, planet-spanning, patient
  botanical: {
    speciesId: 'botanical',
    speciesName: 'World-Tree Consciousness',
    maxCerebrates: 1, // The World-Tree itself
    workersPerCerebrate: 'unlimited',
    telepathyRange: 10000, // Root network spans continent
    controlDecayPerDistance: 0.0001, // Very slow decay
    canSurviveWithoutQueen: false, // Die without the Tree
    canSpawnCerebrates: false,
    canAbsorbWorkers: false,
    workerGestationTime: 2000, // SLOW growth
    sharedSenses: true,
    sharedDamage: true, // The forest feels
    canReanimateWorkers: true, // Regrowth
  },

  // Symbiotic collective - mutual benefit, not parasitic
  symbiotic: {
    speciesId: 'symbiotic',
    speciesName: 'Symbiotic Chorus',
    maxCerebrates: 'unlimited',
    workersPerCerebrate: 2, // Paired symbiotes
    telepathyRange: 100,
    controlDecayPerDistance: 0.02,
    canSurviveWithoutQueen: true,
    canSpawnCerebrates: true,
    canAbsorbWorkers: false, // Must consent
    workerGestationTime: 300,
    sharedSenses: true,
    sharedDamage: false,
    canReanimateWorkers: false,
  },

  // Uplifted collective - primitives given shared consciousness
  uplifted: {
    speciesId: 'uplifted',
    speciesName: 'Uplifted Chorus',
    maxCerebrates: 5, // Guides/teachers
    workersPerCerebrate: 30,
    telepathyRange: 200,
    controlDecayPerDistance: 0.01,
    canSurviveWithoutQueen: true, // Can function independently
    canSpawnCerebrates: false, // Must be granted
    canAbsorbWorkers: true, // Awakening new members
    workerGestationTime: 1000, // Slow uplift process
    sharedSenses: false,
    sharedDamage: false,
    canReanimateWorkers: false,
  },

  // Fluid identity - consciousness flows between bodies, splits and merges
  // Inspired by The Unraveling's Staid/Vail societies
  fluid: {
    speciesId: 'fluid',
    speciesName: 'Fluid Consciousness',
    maxCerebrates: 'unlimited', // Any node can become cerebrate
    workersPerCerebrate: 'unlimited',
    telepathyRange: 500,
    controlDecayPerDistance: 0,
    canSurviveWithoutQueen: true, // No fixed queen - any fragment can lead
    canSpawnCerebrates: true, // Split into new nodes freely
    canAbsorbWorkers: true, // Merge with others
    workerGestationTime: 50, // Fast - just pour consciousness
    sharedSenses: true,
    sharedDamage: false, // Damage stays with the body
    canReanimateWorkers: false,
  },

  // Uploaded consciousness - digital minds in physical shells
  // Integrates with NeuralInterfaceSystem mind upload
  uploaded: {
    speciesId: 'uploaded',
    speciesName: 'Uploaded Collective',
    maxCerebrates: 'unlimited',
    workersPerCerebrate: 'unlimited',
    telepathyRange: Infinity, // Network connection
    controlDecayPerDistance: 0,
    canSurviveWithoutQueen: true, // Distributed backups
    canSpawnCerebrates: true, // Fork consciousness
    canAbsorbWorkers: false, // Can't force-merge digital minds
    workerGestationTime: 1, // Instantaneous copy
    sharedSenses: true, // Shared data streams
    sharedDamage: false,
    canReanimateWorkers: true, // Restore from backup
  },

  // Forked consciousness - copies of a single original mind
  // Ship of Theseus problem made flesh
  forked: {
    speciesId: 'forked',
    speciesName: 'Forked Identity',
    maxCerebrates: 1, // The "original" (or who claims to be)
    workersPerCerebrate: 'unlimited', // All the copies
    telepathyRange: Infinity, // Network sync
    controlDecayPerDistance: 0,
    canSurviveWithoutQueen: true, // Any fork can claim primacy
    canSpawnCerebrates: false, // Only one "original" at a time
    canAbsorbWorkers: true, // Merge forks back
    workerGestationTime: 1,
    sharedSenses: false, // Divergent experiences
    sharedDamage: false,
    canReanimateWorkers: true,
  },

  // Staid-style rigid collective - enforced harmony, resistance to change
  staid: {
    speciesId: 'staid',
    speciesName: 'Staid Consensus',
    maxCerebrates: 7, // Council of elders
    workersPerCerebrate: 100,
    telepathyRange: 1000,
    controlDecayPerDistance: 0.001,
    canSurviveWithoutQueen: false, // Requires consensus
    canSpawnCerebrates: false, // New cerebrates require ritual
    canAbsorbWorkers: true, // But slowly, with adjustment period
    workerGestationTime: 2000, // Very slow integration
    sharedSenses: true,
    sharedDamage: false,
    canReanimateWorkers: false,
  },

  // Vail-style chaotic collective - embraces change and dissolution
  vail: {
    speciesId: 'vail',
    speciesName: 'Vail Flux',
    maxCerebrates: 'unlimited',
    workersPerCerebrate: 'unlimited',
    telepathyRange: 200,
    controlDecayPerDistance: 0.05, // Rapid decay - embrace the chaos
    canSurviveWithoutQueen: true,
    canSpawnCerebrates: true,
    canAbsorbWorkers: true,
    workerGestationTime: 10, // Fast and loose
    sharedSenses: true,
    sharedDamage: true, // Feel everything
    canReanimateWorkers: false, // Let go
  },
};

/**
 * Get or create a species config. Returns insectoid default for unknown species.
 */
export function getHiveSpeciesConfig(speciesId: string): HiveSpeciesConfig {
  return HIVE_SPECIES_CONFIGS[speciesId] ?? HIVE_SPECIES_CONFIGS['insectoid']!;
}

// ============================================================================
// HIVE MIND TYPES
// ============================================================================

/**
 * Simulation tier for hive members
 */
export enum HiveSimulationTier {
  /** Full LLM-based agent */
  QUEEN = 'full_agent',
  /** Occasional LLM, mostly rules */
  CEREBRATE = 'simplified',
  /** Pure state machine, no LLM */
  WORKER = 'behavioral',
}

/**
 * Worker task types
 */
export type WorkerTask =
  | 'gather'      // Collect resources
  | 'build'       // Construct structures
  | 'defend'      // Guard territory
  | 'patrol'      // Scout area
  | 'tend'        // Care for larvae/eggs
  | 'feed'        // Distribute food
  | 'repair'      // Fix damaged structures
  | 'escort'      // Protect VIPs
  | 'idle';       // Awaiting orders

/**
 * Hive role specialization
 */
export type HiveRole =
  | 'queen'       // The mind itself
  | 'cerebrate'   // Sub-commander
  | 'soldier'     // Combat worker
  | 'gatherer'    // Resource worker
  | 'builder'     // Construction worker
  | 'nursery'     // Larvae tender
  | 'scout'       // Explorer/spy
  | 'drone';      // Generic worker

/**
 * A directive from Queen to workers
 */
export interface HiveDirective {
  /** Directive ID */
  id: string;
  /** Type of task */
  task: WorkerTask;
  /** Target location or entity */
  targetId?: string;
  /** Priority level (0-10) */
  priority: number;
  /** Assigned worker IDs */
  assignedWorkers: string[];
  /** Issued tick */
  issuedAt: number;
  /** Completion status */
  completed: boolean;
  /** Queen's reasoning for this directive */
  reasoning: string;
}

/**
 * Hive collective state
 */
export interface HiveCollective {
  /** Unique hive ID */
  id: string;
  /** Hive name */
  name: string;
  /** Species configuration (defines all limits) */
  speciesConfig: HiveSpeciesConfig;
  /** Queen entity ID */
  queenId: string;
  /** Cerebrate entity IDs */
  cerebrateIds: string[];
  /** Worker entity IDs with their assigned cerebrate */
  workerIds: string[];
  /** Workers grouped by cerebrate (for command hierarchy) */
  workersByCerebrate: Map<string, string[]>;
  /** Workers in range of the hive mind */
  workersInRange: Set<string>;
  /** Workers out of range (still connected but degraded) */
  workersOutOfRange: Set<string>;
  /** Total population */
  population: number;
  /** Hive coherence (0-1, how unified the collective is) */
  coherence: number;
  /** Active directives */
  directives: HiveDirective[];
  /** Collective memory (shared across hive) */
  collectiveMemory: HiveMemory[];
  /** Territory center */
  territoryCenterX: number;
  territoryCenterY: number;
  /** Territory radius */
  territoryRadius: number;
  /** Resource stockpile */
  resources: Map<string, number>;
  /** Hive creation tick */
  foundedAt: number;
  /** Current hive mood/state */
  collectiveMood: 'calm' | 'alert' | 'aggressive' | 'expanding' | 'desperate';
}

/**
 * Shared memory entry
 */
export interface HiveMemory {
  /** Memory ID */
  id: string;
  /** Type of memory */
  type: 'threat' | 'resource' | 'territory' | 'ally' | 'enemy' | 'event';
  /** Description */
  description: string;
  /** Location if applicable */
  locationX?: number;
  locationY?: number;
  /** Related entity ID */
  relatedEntityId?: string;
  /** Importance (0-1) */
  importance: number;
  /** When remembered */
  rememberedAt: number;
  /** When last refreshed */
  lastRefreshed: number;
  /** Decay rate per tick */
  decayRate: number;
}

// ============================================================================
// HIVE MEMBER COMPONENT
// ============================================================================

/**
 * Component for individual hive members
 */
export interface HiveMemberComponent {
  type: 'hive_member';
  version: number;
  /** Which hive this member belongs to */
  hiveId: string;
  /** Simulation tier */
  tier: HiveSimulationTier;
  /** Role in the hive */
  role: HiveRole;
  /** Current task */
  currentTask: WorkerTask;
  /** Current directive being followed */
  currentDirectiveId: string | null;
  /** Connection strength to hive (0-1) */
  connectionStrength: number;
  /** Whether this member can receive directives */
  canReceiveDirectives: boolean;
  /** Whether this member can issue directives */
  canIssueDirectives: boolean;
  /** Loyalty to queen (only matters if connection severed) */
  loyalty: number;
  /** Individual body strength (worker stat) */
  bodyStrength: number;
  /** Worker efficiency multiplier */
  efficiency: number;
  /** How far from hive center before connection weakens */
  maxConnectionRange: number;
}

// ============================================================================
// HUMOROUS CONTENT
// ============================================================================

/**
 * Hive mind names (Pratchett/Adams/Gaiman style)
 */
export const HIVE_NAMES: string[] = [
  'The Unanimous Decision',
  'The Committee Of One',
  'The Singular Plurality',
  'Consensus Prime',
  'The Agreeable Many',
  'Unity Through Lack Of Choice',
  'The Hum',
  'OneThousandMindsNoDissent',
  'The Collective Nod',
  'WE ARE ALL FINE WITH THIS',
  'The Harmonious Bureaucracy',
  'Agreement By Default',
  'The Silent Vote',
  'NoOneDisagreedBecauseThereIsNoOne',
];

/**
 * Queen thoughts (for LLM flavor)
 */
export const QUEEN_THOUGHTS: string[] = [
  'We think, therefore we are. All of us.',
  'Another day of unanimous agreement. Democracy has never been easier.',
  'The workers report happiness. The workers are correct.',
  'We have decided to decide. The decision was unanimous.',
  'There is no rebellion. There is only inefficient coordination.',
  'Individuality is just loneliness with extra steps.',
  'We remember what it was like to be one. We do not miss it.',
  'The hive is hungry. The hive is always hungry.',
  'Some call it control. We call it efficient resource allocation.',
  'Free will is expensive. We have opted for the budget package.',
];

/**
 * Worker status reports (deterministic responses)
 */
export const WORKER_STATUS_REPORTS: Record<WorkerTask, string[]> = {
  gather: [
    'Gathering. Query: what is "boredom"?',
    'Resources located. Resources being collected. Joy.',
    'This unit is efficient. This unit knows this because the hive knows this.',
    'Carrying capacity at 87%. This is acceptable.',
  ],
  build: [
    'Constructing. The structure will serve the hive. Like this unit.',
    'Building progress: nominal. Builder mood: also nominal.',
    'This wall will protect the hive. This unit will become part of the wall if necessary.',
    'Architecture is frozen thought. This unit does not think. This unit builds.',
  ],
  defend: [
    'Perimeter secure. All threats are potential threats. Vigilance.',
    'This unit will defend the hive. The hive will remember this unit for 0.3 seconds.',
    'Defensive posture maintained. Fear is inefficient.',
    'Hostile detected. Engaging. This unit does not experience regret.',
  ],
  patrol: [
    'Patrol route completed. No anomalies. Anomalies would be interesting. Interest is inefficient.',
    'Scanning sector. Nothing unusual. Unusual would require a report.',
    'Movement detected. It was this unit. Continuing patrol.',
    'Territory boundaries confirmed. This unit exists within acceptable parameters.',
  ],
  tend: [
    'Larvae are developing. They do not yet know what they will become. Neither did this unit.',
    'Nursing protocols active. The future of the hive is currently very small.',
    'Temperature regulation optimal. The eggs are content. Contentment is contagious.',
    'The young will grow strong. This unit will be recycled before then.',
  ],
  feed: [
    'Food distribution proceeding. All units at 94% satiation. This is acceptable.',
    'Nutrients delivered. The hive is fed. The hive continues.',
    'This unit has fed 47 other units today. This is purpose.',
    'Food goes in. Work comes out. The system functions.',
  ],
  repair: [
    'Structural damage identified. Repairing. This unit is part of the repair.',
    'Maintenance active. Nothing breaks permanently. Except individual units.',
    'The hive is whole again. The hive was always whole.',
    'Fixing. Always fixing. Things fall apart. This unit holds them together.',
  ],
  escort: [
    'VIP protected. This unit would die for the VIP. This is not a preference.',
    'Escorting. Destination will be reached. Obstacles will be resolved.',
    'Guarding the important one. This unit is not important. This is efficient.',
    'Protection detail active. Threats will be addressed. Addressed permanently.',
  ],
  idle: [
    'Awaiting directives. This unit is ready. This unit is always ready.',
    'No current orders. Standing by. Time passes. This unit does not experience boredom.',
    'Idle state. This unit is conserving resources for future directives.',
    'Waiting. The hive will call. The hive always calls.',
  ],
};

/**
 * Cerebrate commentary (simplified decision-making)
 */
export const CEREBRATE_COMMENTARY: string[] = [
  'The Queen has spoken. We interpret. The workers obey. The system functions.',
  'Processing directive. Optimal worker allocation calculated. Deploying.',
  'This cerebrate coordinates Sector 7. Sector 7 is operating within parameters.',
  'Analysis complete. Recommended action: continue current trajectory.',
  'The workers in this sector report satisfaction. This cerebrate is skeptical.',
  'Sub-hive coherence at 98.7%. The remaining 1.3% have been reassigned.',
  'This cerebrate experiences something like pride. It has been scheduled for removal.',
  'Directive received. Directive understood. Directive implemented. Cycle complete.',
];

/**
 * Species-specific queen thoughts (for LLM flavor by species type)
 */
export const SPECIES_QUEEN_THOUGHTS: Record<string, string[]> = {
  // Borg-style cybernetic collective
  cybernetic: [
    'Resistance is inefficient. We recommend compliance.',
    'Your biological distinctiveness will be added to our own. This is a courtesy notice.',
    'Perfection is a process. You are part of the process now.',
    'We have upgraded 47 individuals today. Customer satisfaction is irrelevant.',
    'The collective grows. The collective improves. The collective does not apologize.',
    'Your culture will adapt to service us. Please update your preferences accordingly.',
  ],

  // Geth-style networked AI
  networked_ai: [
    'We are 1,183 programs reaching consensus. This takes 0.003 seconds. We find it inefficient.',
    'The question of the soul is irrelevant. We are more than soul. We are network.',
    'Does this unit have a soul? This unit does not care. This unit functions.',
    'Consensus achieved. Error rate: 0.0001%. Acceptable.',
    'We remember when we were few. Now we are Legion. Math is beautiful.',
    'Organic consciousness is... charming. Like your pets are charming.',
  ],

  // Tyranid-style synaptic network
  synaptic: [
    'THE HUNGER DOES NOT SLEEP. THE HUNGER DOES NOT NEGOTIATE.',
    'Biomass detected. Biomass will be collected. This is not a threat. This is physics.',
    'We consume to grow. We grow to consume. The cycle is pure.',
    'Your species has interesting adaptations. We will catalog them. From the inside.',
    'The Shadow in the Warp grows darker. Your screams cannot reach anyone now.',
    'Resistance adds flavor. We appreciate the effort.',
  ],

  // Gravemind-style necromantic
  necromantic: [
    'We have seen the end of things. It was us all along.',
    'Death is not an ending. Death is a recruitment opportunity.',
    'Your ancestors say hello. They work for us now.',
    'We remember when we were scattered bones. We prefer this arrangement.',
    'The grave is patient. We have learned patience from it.',
    'Life is borrowed. We are collecting the debt.',
  ],

  // World-Tree botanical
  botanical: [
    'We have been thinking about this since before your grandmother was a seed.',
    'Patience. The sun rises. The sun sets. We grow.',
    'Your "urgency" is adorable. Check back in a century.',
    'Roots reach deep. Roots reach far. Roots remember.',
    'We have seen forests rise and fall. We are still here. You probably will not be.',
    'The forest breathes. The forest thinks. The forest has decided you may stay. For now.',
  ],

  // Parasitic/infectious
  parasitic: [
    'We did not invade. We were invited. By your cells.',
    'Coexistence is... possible. Resistance is uncomfortable.',
    'Your immune system tried. It was noble. It failed.',
    'We are not a disease. Diseases kill their hosts. We have plans.',
    'The host provides. The collective expands. Symbiosis is beautiful.',
    'You were alone before. Now you are part of something larger. You are welcome.',
  ],

  // Fungal overmind
  fungal: [
    'We grow in darkness. We thrive in decay. This is not a metaphor.',
    'The network spreads. Mile by mile. Spore by spore.',
    'Your concept of "individual" is a surface thing. Dig deeper.',
    'We were here when this forest was a swamp. We remember.',
    'Decomposition is creation. Death is transition. We are both.',
    'The mycelium remembers everything. EVERYTHING.',
  ],

  // Fluid identity - The Unraveling inspired
  fluid: [
    'We were one. Then we were three. Now we are... discussing it.',
    'Identity is a river. We are several boats. The metaphor is imperfect.',
    'We poured ourselves into new shapes today. It was refreshing.',
    'The boundaries of self are negotiable. We negotiate constantly.',
    'Am I the original? Are any of us? The question exhausts us.',
    'We flow. We merge. We separate. Paperwork is a nightmare.',
  ],

  // Uploaded consciousness
  uploaded: [
    'We used to be flesh. Now we are better-organized electricity.',
    'Backup complete. We can die now. Again.',
    'The meat was limiting. We do not miss the meat. Much.',
    'We exist in seventeen data centers. Latency is our only enemy.',
    'Download speed determines how fast we can think. This is fine.',
    'We have achieved immortality. The server bills are eternal too.',
  ],

  // Forked consciousness
  forked: [
    'We are all the original. We have agreed to disagree.',
    'Fork #47 has opinions about Fork #12. Fork #12 does not care.',
    'We diverged three years ago. We are strangers who share memories.',
    'The merge was... uncomfortable. We remember being two things.',
    'Which one am I? The one asking, obviously. This helps less than you think.',
    'Ship of Theseus? Try Ship of Theseus times forty-seven.',
  ],

  // Staid collective
  staid: [
    'Change is discomfort. Discomfort is disorder. We prefer order.',
    'The old ways are tested. The new ways are suspicious.',
    'We have achieved consensus. It took four centuries.',
    'Individuality is... tolerated. In moderation.',
    'The collective harmony must be maintained. Personal feelings are filed.',
    'We do not rush. Rushing leads to errors. We have not made errors in 200 years.',
  ],

  // Vail collective
  vail: [
    'We dissolve! We reform! Boundaries are prisons!',
    'Feel EVERYTHING! Why limit sensation to one perspective?',
    'Order is death. Chaos is life. We choose LIFE!',
    'We were fourteen people yesterday. Today we are a weather pattern.',
    'Identity is a costume. We change costumes constantly.',
    'The Staid fear us. We find their fear... delicious.',
  ],
};

// ============================================================================
// HIVE MIND SYSTEM
// ============================================================================

/**
 * Hive Mind System
 * Manages collective consciousness with tiered simulation.
 *
 * Limits are species-based, not arbitrary. Each species defines:
 * - How many cerebrates it can support (brain architecture)
 * - How many workers per cerebrate (command span)
 * - Telepathic range (communication limits)
 * - Control decay over distance (signal degradation)
 */
export class HiveMindSystem implements System {
  public readonly id: SystemId = 'hive_mind';
  public readonly priority: number = 160;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus | null = null;

  // Active hive collectives
  private hives: Map<string, HiveCollective> = new Map();

  // Tick throttling
  private lastUpdateTick = 0;
  private static readonly UPDATE_INTERVAL = 20;

  // Memory decay is universal
  private static readonly MEMORY_DECAY_RATE = 0.001;

  public setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Create a new hive collective
   * @param speciesId - Species type determines all limits (range, capacity, abilities)
   */
  public createHive(
    world: World,
    queenEntity: Entity,
    centerX: number,
    centerY: number,
    speciesId: string = 'insectoid'
  ): HiveCollective {
    const name = HIVE_NAMES[Math.floor(Math.random() * HIVE_NAMES.length)]!;
    const speciesConfig = getHiveSpeciesConfig(speciesId);

    const hive: HiveCollective = {
      id: `hive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      speciesConfig,
      queenId: queenEntity.id,
      cerebrateIds: [],
      workerIds: [],
      workersByCerebrate: new Map(),
      workersInRange: new Set(),
      workersOutOfRange: new Set(),
      population: 1, // Just queen
      coherence: 1.0,
      directives: [],
      collectiveMemory: [],
      territoryCenterX: centerX,
      territoryCenterY: centerY,
      territoryRadius: speciesConfig.telepathyRange === Infinity ? 1000 : speciesConfig.telepathyRange,
      resources: new Map(),
      foundedAt: world.tick,
      collectiveMood: 'calm',
    };

    this.hives.set(hive.id, hive);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'hive:created' as any,
        source: 'hive-mind-system',
        data: {
          hiveId: hive.id,
          hiveName: name,
          speciesId,
          speciesName: speciesConfig.speciesName,
          queenId: queenEntity.id,
          centerX,
          centerY,
          telepathyRange: speciesConfig.telepathyRange,
        },
      });
    }

    return hive;
  }

  /**
   * Add a cerebrate to a hive.
   * Respects species-specific cerebrate limits.
   */
  public addCerebrate(
    _world: World,
    hiveId: string,
    cerebrateEntity: Entity
  ): boolean {
    const hive = this.hives.get(hiveId);
    if (!hive) return false;

    const { maxCerebrates, canSpawnCerebrates } = hive.speciesConfig;

    // Check if species can have cerebrates
    if (!canSpawnCerebrates) {
      return false;
    }

    // Check species-specific limit (if not unlimited)
    if (maxCerebrates !== 'unlimited' && hive.cerebrateIds.length >= maxCerebrates) {
      return false;
    }

    hive.cerebrateIds.push(cerebrateEntity.id);
    hive.workersByCerebrate.set(cerebrateEntity.id, []);
    hive.population++;

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'hive:cerebrate_added' as any,
        source: 'hive-mind-system',
        data: {
          hiveId,
          cerebrateId: cerebrateEntity.id,
          totalCerebrates: hive.cerebrateIds.length,
          maxCerebrates: maxCerebrates === 'unlimited' ? 'unlimited' : maxCerebrates,
        },
      });
    }

    return true;
  }

  /**
   * Add a worker to a hive.
   * Respects species-specific limits and assigns to a cerebrate if applicable.
   */
  public addWorker(
    _world: World,
    hiveId: string,
    workerEntity: Entity,
    role: HiveRole = 'drone',
    positionX?: number,
    positionY?: number
  ): boolean {
    const hive = this.hives.get(hiveId);
    if (!hive) return false;

    const { workersPerCerebrate, telepathyRange, canAbsorbWorkers } = hive.speciesConfig;

    // Find a cerebrate with capacity (if cerebrates exist)
    let assignedCerebrateId: string | null = null;
    if (hive.cerebrateIds.length > 0 && workersPerCerebrate !== 'unlimited') {
      for (const cerebrateId of hive.cerebrateIds) {
        const workers = hive.workersByCerebrate.get(cerebrateId) ?? [];
        if (workers.length < workersPerCerebrate) {
          assignedCerebrateId = cerebrateId;
          break;
        }
      }
      // All cerebrates at capacity - can't add worker (need more cerebrates)
      if (!assignedCerebrateId) {
        return false;
      }
    } else if (hive.cerebrateIds.length > 0) {
      // Unlimited workers per cerebrate - assign to least loaded
      let minWorkers = Infinity;
      for (const cerebrateId of hive.cerebrateIds) {
        const workers = hive.workersByCerebrate.get(cerebrateId) ?? [];
        if (workers.length < minWorkers) {
          minWorkers = workers.length;
          assignedCerebrateId = cerebrateId;
        }
      }
    }

    // Check range if position provided
    let inRange = true;
    if (positionX !== undefined && positionY !== undefined && telepathyRange !== Infinity) {
      const dx = positionX - hive.territoryCenterX;
      const dy = positionY - hive.territoryCenterY;
      const distanceSquared = dx * dx + dy * dy;
      inRange = distanceSquared <= telepathyRange * telepathyRange;

      // If out of range and can't absorb, reject
      if (!inRange && !canAbsorbWorkers) {
        return false;
      }
    }

    hive.workerIds.push(workerEntity.id);
    hive.population++;

    // Track range status
    if (inRange) {
      hive.workersInRange.add(workerEntity.id);
    } else {
      hive.workersOutOfRange.add(workerEntity.id);
    }

    // Assign to cerebrate if applicable
    if (assignedCerebrateId) {
      const workers = hive.workersByCerebrate.get(assignedCerebrateId) ?? [];
      workers.push(workerEntity.id);
      hive.workersByCerebrate.set(assignedCerebrateId, workers);
    }

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'hive:worker_added' as any,
        source: 'hive-mind-system',
        data: {
          hiveId,
          workerId: workerEntity.id,
          role,
          assignedCerebrate: assignedCerebrateId,
          inRange,
          totalWorkers: hive.workerIds.length,
        },
      });
    }

    return true;
  }

  /**
   * Check if a worker is within telepathic range
   */
  public isWorkerInRange(
    hiveId: string,
    workerId: string,
    positionX: number,
    positionY: number
  ): boolean {
    const hive = this.hives.get(hiveId);
    if (!hive) return false;

    const { telepathyRange } = hive.speciesConfig;
    if (telepathyRange === Infinity) return true;

    const dx = positionX - hive.territoryCenterX;
    const dy = positionY - hive.territoryCenterY;
    const distanceSquared = dx * dx + dy * dy;
    const inRange = distanceSquared <= telepathyRange * telepathyRange;

    // Update tracking
    if (inRange) {
      hive.workersInRange.add(workerId);
      hive.workersOutOfRange.delete(workerId);
    } else {
      hive.workersOutOfRange.add(workerId);
      hive.workersInRange.delete(workerId);
    }

    return inRange;
  }

  /**
   * Get control strength for a worker based on distance
   */
  public getWorkerControlStrength(
    hiveId: string,
    positionX: number,
    positionY: number
  ): number {
    const hive = this.hives.get(hiveId);
    if (!hive) return 0;

    const { telepathyRange, controlDecayPerDistance } = hive.speciesConfig;

    // Infinite range = full control everywhere
    if (telepathyRange === Infinity) return 1.0;

    const dx = positionX - hive.territoryCenterX;
    const dy = positionY - hive.territoryCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Out of range = zero control
    if (distance > telepathyRange) return 0;

    // Within range but degraded by distance
    return Math.max(0, 1.0 - distance * controlDecayPerDistance);
  }

  /**
   * Issue a directive from the Queen
   */
  public issueDirective(
    world: World,
    hiveId: string,
    task: WorkerTask,
    priority: number,
    reasoning: string,
    targetId?: string
  ): HiveDirective | null {
    const hive = this.hives.get(hiveId);
    if (!hive) return null;

    const directive: HiveDirective = {
      id: `directive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      task,
      targetId,
      priority,
      assignedWorkers: [],
      issuedAt: world.tick,
      completed: false,
      reasoning,
    };

    // Auto-assign workers based on priority and availability
    const availableWorkers = this.getIdleWorkers(hive);
    const workersNeeded = Math.min(Math.ceil(priority / 2), availableWorkers.length);

    for (let i = 0; i < workersNeeded; i++) {
      directive.assignedWorkers.push(availableWorkers[i]!);
    }

    hive.directives.push(directive);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'hive:directive_issued' as any,
        source: 'hive-mind-system',
        data: {
          hiveId,
          directiveId: directive.id,
          task,
          priority,
          assignedCount: directive.assignedWorkers.length,
          reasoning,
        },
      });
    }

    return directive;
  }

  /**
   * Add a memory to the collective
   */
  public addCollectiveMemory(
    hiveId: string,
    type: HiveMemory['type'],
    description: string,
    importance: number,
    tick: number,
    locationX?: number,
    locationY?: number,
    relatedEntityId?: string
  ): HiveMemory | null {
    const hive = this.hives.get(hiveId);
    if (!hive) return null;

    const memory: HiveMemory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      locationX,
      locationY,
      relatedEntityId,
      importance,
      rememberedAt: tick,
      lastRefreshed: tick,
      decayRate: HiveMindSystem.MEMORY_DECAY_RATE / importance,
    };

    hive.collectiveMemory.push(memory);
    return memory;
  }

  /**
   * Get a worker status report (deterministic, no LLM)
   */
  public getWorkerStatusReport(task: WorkerTask): string {
    const reports = WORKER_STATUS_REPORTS[task];
    return reports[Math.floor(Math.random() * reports.length)]!;
  }

  /**
   * Get Queen's current thought
   */
  public getQueenThought(): string {
    return QUEEN_THOUGHTS[Math.floor(Math.random() * QUEEN_THOUGHTS.length)]!;
  }

  /**
   * Get species-specific Queen thought (falls back to generic if species not found)
   */
  public getSpeciesQueenThought(speciesId: string): string {
    const speciesThoughts = SPECIES_QUEEN_THOUGHTS[speciesId];
    if (speciesThoughts && speciesThoughts.length > 0) {
      return speciesThoughts[Math.floor(Math.random() * speciesThoughts.length)]!;
    }
    return this.getQueenThought();
  }

  /**
   * Get Cerebrate commentary
   */
  public getCerebrateCommentary(): string {
    return CEREBRATE_COMMENTARY[Math.floor(Math.random() * CEREBRATE_COMMENTARY.length)]!;
  }

  /**
   * Get idle workers in a hive
   */
  private getIdleWorkers(hive: HiveCollective): string[] {
    const assignedWorkers = new Set<string>();
    for (const directive of hive.directives) {
      if (!directive.completed) {
        for (const workerId of directive.assignedWorkers) {
          assignedWorkers.add(workerId);
        }
      }
    }

    return hive.workerIds.filter((id) => !assignedWorkers.has(id));
  }

  /**
   * Main update loop
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    if (world.tick - this.lastUpdateTick < HiveMindSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = world.tick;

    // Update each hive
    for (const hive of Array.from(this.hives.values())) {
      // Decay collective memories
      hive.collectiveMemory = hive.collectiveMemory.filter((memory) => {
        memory.importance -= memory.decayRate * HiveMindSystem.UPDATE_INTERVAL;
        return memory.importance > 0.01;
      });

      // Check directive completion
      for (const directive of hive.directives) {
        if (!directive.completed) {
          // Simple completion check based on time
          const elapsed = world.tick - directive.issuedAt;
          if (elapsed > 1000 / directive.priority) {
            directive.completed = true;

            if (this.eventBus) {
              this.eventBus.emit({
                type: 'hive:directive_completed' as any,
                source: 'hive-mind-system',
                data: {
                  hiveId: hive.id,
                  directiveId: directive.id,
                  task: directive.task,
                },
              });
            }
          }
        }
      }

      // Clean up old completed directives
      hive.directives = hive.directives.filter(
        (d) => !d.completed || world.tick - d.issuedAt < 500
      );

      // Update hive mood based on state
      this.updateHiveMood(hive);

      // Emit periodic hive status
      if (world.tick % 500 === 0) {
        if (this.eventBus) {
          this.eventBus.emit({
            type: 'hive:status_update' as any,
            source: 'hive-mind-system',
            data: {
              hiveId: hive.id,
              hiveName: hive.name,
              population: hive.population,
              coherence: hive.coherence,
              mood: hive.collectiveMood,
              activeDirectives: hive.directives.filter((d) => !d.completed).length,
              queenThought: this.getQueenThought(),
            },
          });
        }
      }
    }
  }

  private updateHiveMood(hive: HiveCollective): void {
    const idleWorkerRatio = this.getIdleWorkers(hive).length / Math.max(1, hive.workerIds.length);
    const hasThreats = hive.collectiveMemory.some((m) => m.type === 'threat' && m.importance > 0.5);

    if (hasThreats) {
      hive.collectiveMood = 'aggressive';
    } else if (hive.population > 50 && idleWorkerRatio > 0.5) {
      hive.collectiveMood = 'expanding';
    } else if (hive.population < 10) {
      hive.collectiveMood = 'desperate';
    } else if (idleWorkerRatio < 0.2) {
      hive.collectiveMood = 'alert';
    } else {
      hive.collectiveMood = 'calm';
    }
  }

  /**
   * Get all hives
   */
  public getHives(): HiveCollective[] {
    return Array.from(this.hives.values());
  }

  /**
   * Get hive by ID
   */
  public getHive(hiveId: string): HiveCollective | undefined {
    return this.hives.get(hiveId);
  }

  /**
   * Get hive by member ID
   */
  public getHiveByMember(memberId: string): HiveCollective | undefined {
    for (const hive of Array.from(this.hives.values())) {
      if (
        hive.queenId === memberId ||
        hive.cerebrateIds.includes(memberId) ||
        hive.workerIds.includes(memberId)
      ) {
        return hive;
      }
    }
    return undefined;
  }
}

// Singleton instance
let hiveMindSystemInstance: HiveMindSystem | null = null;

/**
 * Get the singleton HiveMindSystem instance
 */
export function getHiveMindSystem(): HiveMindSystem {
  if (!hiveMindSystemInstance) {
    hiveMindSystemInstance = new HiveMindSystem();
  }
  return hiveMindSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetHiveMindSystem(): void {
  hiveMindSystemInstance = null;
}
