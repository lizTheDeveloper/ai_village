/**
 * AngelTypes - Divine agents, messengers, and servants
 *
 * Angels are created beings that serve deities. They can deliver messages,
 * perform miracles on behalf of their deity, guard sacred places, and
 * fight in divine conflicts. They require ongoing belief to maintain.
 */

import type { DivineDomain } from './DeityTypes.js';

// ============================================================================
// Angel Configuration
// ============================================================================

/** Configuration for angel system */
export interface AngelConfig {
  /** Minimum belief to create an angel */
  creationThreshold: number;

  /** Belief cost to create */
  creationCost: number;

  /** Maintenance cost per game hour */
  maintenanceCostPerHour: number;

  /** Maximum angels per deity */
  maxAngelsPerDeity: number;

  /** Can angels be permanently killed? */
  permanentDeath: boolean;

  /** Respawn cooldown if not permanent death (hours) */
  respawnCooldown: number;
}

/** Default angel configuration */
export const DEFAULT_ANGEL_CONFIG: AngelConfig = {
  creationThreshold: 2000,
  creationCost: 500,
  maintenanceCostPerHour: 2,
  maxAngelsPerDeity: 5,
  permanentDeath: false,
  respawnCooldown: 48,
};

// ============================================================================
// Angel Entity
// ============================================================================

/** An angel - divine servant of a deity */
export interface Angel {
  id: string;

  /** Which deity created/owns this angel */
  creatorDeityId: string;

  /** Entity ID in the world */
  entityId: string;

  /** Angel's name */
  name: string;

  /** Angel's title/epithet */
  title?: string;

  /** Angel type */
  type: AngelType;

  /** Angel's rank in divine hierarchy */
  rank: AngelRank;

  /** Physical form */
  form: AngelForm;

  /** Angel's stats */
  stats: AngelStats;

  /** Current state */
  state: AngelState;

  /** Angel's personality (simplified) */
  personality: AngelPersonality;

  /** Abilities */
  abilities: AngelAbility[];

  /** Current orders from deity */
  currentOrders?: AngelOrders;

  /** Domains this angel is aligned with */
  alignedDomains: DivineDomain[];

  /** When created */
  createdAt: number;

  /** Total service time (hours) */
  totalServiceTime: number;

  /** Notable deeds performed */
  notableDeedIds: string[];

  /** Myths about this angel */
  mythIds: string[];

  /** Mortals who know of this angel */
  knownToAgentIds: string[];
}

/** Types of angels */
export type AngelType =
  | 'messenger'     // Delivers visions and messages
  | 'guardian'      // Protects places and people
  | 'warrior'       // Fights in divine conflicts
  | 'healer'        // Heals and blesses
  | 'judge'         // Enforces divine law
  | 'shepherd'      // Guides and protects believers
  | 'punisher'      // Executes divine wrath
  | 'recorder'      // Records deeds and prayers
  | 'harvester'     // Collects souls/belief
  | 'herald'        // Announces divine will
  | 'watcher'       // Observes and reports
  | 'artisan';      // Creates sacred objects

/** Rank of angel in hierarchy */
export type AngelRank =
  | 'lesser'        // Basic angel, limited power
  | 'common'        // Standard angel
  | 'greater'       // Powerful angel
  | 'arch'          // Leader of angels
  | 'supreme';      // Unique, most powerful (limited to 1)

// ============================================================================
// Angel Form
// ============================================================================

/** Physical form of an angel */
export interface AngelForm {
  /** Base appearance type */
  baseAppearance: AngelAppearance;

  /** Description */
  description: string;

  /** Height category */
  height: 'small' | 'human' | 'tall' | 'giant';

  /** Has wings? */
  winged: boolean;

  /** Number of wings */
  wingCount?: number;

  /** Wing appearance */
  wingAppearance?: string;

  /** Luminosity */
  luminosity: 'none' | 'faint' | 'bright' | 'blinding';

  /** Aura color */
  auraColor?: string;

  /** Number of faces/heads */
  faceCount: number;

  /** Number of arms */
  armCount: number;

  /** Animal features (if any) */
  animalFeatures?: string[];

  /** Carries weapon/item? */
  wielding?: string;

  /** Voice description */
  voiceDescription: string;

  /** Can change form? */
  shapeshifter: boolean;

  /** Alternate forms if shapeshifter */
  alternateForms?: string[];
}

/** Base appearance types for angels */
export type AngelAppearance =
  | 'humanoid'          // Human-like
  | 'radiant_humanoid'  // Glowing human
  | 'armored'           // Warrior appearance
  | 'robed'             // Flowing garments
  | 'animal'            // Animal form
  | 'hybrid'            // Human-animal mix
  | 'geometric'         // Abstract shapes
  | 'wheel'             // Biblical wheel of eyes
  | 'seraph'            // Six-winged
  | 'child'             // Childlike/cherub
  | 'flame'             // Made of fire
  | 'light'             // Pure light
  | 'shadow'            // Dark angel
  | 'monstrous';        // Terrifying form

// ============================================================================
// Angel Stats
// ============================================================================

/** Stats of an angel */
export interface AngelStats {
  /** Health */
  health: number;
  maxHealth: number;

  /** Combat power */
  combatPower: number;

  /** Speed */
  speed: number;

  /** Perception */
  perception: number;

  /** Influence on mortals */
  influence: number;

  /** Divine power for abilities */
  divinePower: number;

  /** Resistance to damage */
  resistance: number;

  /** Stealth/subtlety */
  stealth: number;
}

/** Default angel stats by rank */
export const ANGEL_STATS_BY_RANK: Record<AngelRank, AngelStats> = {
  lesser: {
    health: 50, maxHealth: 50,
    combatPower: 10, speed: 1.2, perception: 1.5,
    influence: 0.5, divinePower: 0.3, resistance: 0.2, stealth: 0.5,
  },
  common: {
    health: 100, maxHealth: 100,
    combatPower: 25, speed: 1.5, perception: 2.0,
    influence: 1.0, divinePower: 0.5, resistance: 0.3, stealth: 0.4,
  },
  greater: {
    health: 200, maxHealth: 200,
    combatPower: 50, speed: 2.0, perception: 3.0,
    influence: 1.5, divinePower: 0.8, resistance: 0.5, stealth: 0.3,
  },
  arch: {
    health: 500, maxHealth: 500,
    combatPower: 100, speed: 3.0, perception: 5.0,
    influence: 2.0, divinePower: 1.0, resistance: 0.7, stealth: 0.2,
  },
  supreme: {
    health: 1000, maxHealth: 1000,
    combatPower: 200, speed: 5.0, perception: 10.0,
    influence: 3.0, divinePower: 1.5, resistance: 0.9, stealth: 0.1,
  },
};

// ============================================================================
// Angel State
// ============================================================================

/** Current state of an angel */
export interface AngelState {
  /** Is angel active? */
  active: boolean;

  /** Current location */
  position: { x: number; y: number };

  /** What angel is doing */
  currentActivity: AngelActivity;

  /** Is in combat? */
  inCombat: boolean;

  /** Is visible to mortals? */
  visible: boolean;

  /** Is currently in the mortal realm? */
  inMortalRealm: boolean;

  /** Current belief drain rate */
  currentDrainRate: number;

  /** Status effects */
  statusEffects: AngelStatusEffect[];

  /** If guarding, what */
  guardingTargetId?: string;

  /** If pursuing, what */
  pursuingTargetId?: string;

  /** Time until respawn (if dead) */
  respawnAt?: number;
}

/** What angel is doing */
export type AngelActivity =
  | 'idle'
  | 'patrolling'
  | 'guarding'
  | 'delivering_message'
  | 'observing'
  | 'fighting'
  | 'healing'
  | 'blessing'
  | 'punishing'
  | 'escorting'
  | 'searching'
  | 'waiting'
  | 'returning_to_deity'
  | 'meditating'
  | 'appearing_to_mortal'
  | 'collecting_belief'
  | 'recording';

/** Status effect on angel */
export interface AngelStatusEffect {
  type: string;
  source: string;
  duration: number;
  magnitude: number;
}

// ============================================================================
// Angel Personality
// ============================================================================

/** Simplified personality for angels */
export interface AngelPersonality {
  /** How they approach orders */
  obedience: 'absolute' | 'faithful' | 'questioning' | 'independent';

  /** Attitude toward mortals */
  mortalAttitude: 'loving' | 'protective' | 'neutral' | 'disdainful' | 'hostile';

  /** Combat disposition */
  combatDisposition: 'pacifist' | 'defensive' | 'balanced' | 'aggressive' | 'wrathful';

  /** Communication style */
  communicationStyle: 'silent' | 'cryptic' | 'formal' | 'kind' | 'dramatic';

  /** How they view their role */
  selfView: 'humble_servant' | 'proud_warrior' | 'sacred_duty' | 'burden_bearer';
}

// ============================================================================
// Angel Abilities
// ============================================================================

/** An ability an angel possesses */
export interface AngelAbility {
  id: string;

  /** Name */
  name: string;

  /** Description */
  description: string;

  /** Type */
  type: AngelAbilityType;

  /** Power cost (draws from deity's belief) */
  beliefCost: number;

  /** Cooldown (hours) */
  cooldown: number;

  /** Last used */
  lastUsedAt?: number;

  /** Range */
  range: number;

  /** Duration of effect */
  duration: number;

  /** Magnitude */
  magnitude: number;

  /** Does it reveal the angel? */
  revealsPresence: boolean;
}

/** Types of angel abilities */
export type AngelAbilityType =
  | 'message_delivery'  // Send vision/words
  | 'healing'           // Restore health
  | 'blessing'          // Grant buff
  | 'protection'        // Shield target
  | 'smiting'           // Attack target
  | 'banishment'        // Remove entity
  | 'revelation'        // Reveal truth
  | 'concealment'       // Hide something
  | 'transportation'    // Move target
  | 'creation'          // Make something
  | 'destruction'       // Destroy something
  | 'judgment'          // Assess worth
  | 'guidance'          // Lead somewhere
  | 'resurrection'      // Restore life
  | 'transformation';   // Change something

// ============================================================================
// Angel Orders
// ============================================================================

/** Orders given to an angel by their deity */
export interface AngelOrders {
  id: string;

  /** Type of order */
  type: AngelOrderType;

  /** When order was given */
  givenAt: number;

  /** Priority */
  priority: 'low' | 'normal' | 'high' | 'critical';

  /** Specific target */
  targetId?: string;
  targetType?: 'agent' | 'location' | 'building' | 'deity';

  /** Parameters */
  parameters: Record<string, unknown>;

  /** Order status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

  /** Completion report */
  report?: AngelReport;
}

/** Types of orders angels can receive */
export type AngelOrderType =
  | 'deliver_message'   // Bring message to mortal
  | 'guard_location'    // Protect a place
  | 'guard_person'      // Protect a mortal
  | 'smite_target'      // Attack someone
  | 'bless_target'      // Bless someone
  | 'heal_target'       // Heal someone
  | 'observe_area'      // Watch and report
  | 'collect_prayers'   // Gather prayers from area
  | 'escort_soul'       // Guide dead to afterlife
  | 'punish_sinner'     // Punish wrongdoer
  | 'appear_to_mortal'  // Show yourself to someone
  | 'fetch_item'        // Retrieve something
  | 'create_sign'       // Make an omen
  | 'scout_location'    // Investigate area
  | 'battle_entity'     // Fight another angel/creature
  | 'return_to_deity';  // Come back

/** Report from angel on completed order */
export interface AngelReport {
  orderId: string;
  completedAt: number;
  success: boolean;
  description: string;
  witnessIds: string[];
  mythGenerated: boolean;
  beliefImpact: number;
}

// ============================================================================
// Angel Events
// ============================================================================

/** Events involving angels */
export interface AngelEvent {
  type: AngelEventType;
  angelId: string;
  deityId: string;
  timestamp: number;
  location: { x: number; y: number };
  witnesses: string[];
  details: Record<string, unknown>;
}

/** Types of angel events */
export type AngelEventType =
  | 'created'
  | 'destroyed'
  | 'appeared'
  | 'vanished'
  | 'delivered_message'
  | 'performed_miracle'
  | 'engaged_combat'
  | 'won_combat'
  | 'lost_combat'
  | 'blessed_mortal'
  | 'punished_mortal'
  | 'guarding_started'
  | 'guarding_ended'
  | 'order_received'
  | 'order_completed'
  | 'order_failed'
  | 'witnessed_sin'
  | 'witnessed_virtue'
  | 'met_another_angel'
  | 'respawned';

// ============================================================================
// Angel Creation
// ============================================================================

/** Request to create an angel */
export interface CreateAngelRequest {
  deityId: string;
  name: string;
  title?: string;
  type: AngelType;
  rank: AngelRank;
  form: Partial<AngelForm>;
  personality?: Partial<AngelPersonality>;
  initialLocation?: { x: number; y: number };
  initialOrders?: Partial<AngelOrders>;
}

/** Result of angel creation */
export interface CreateAngelResult {
  success: boolean;
  angelId?: string;
  entityId?: string;
  failureReason?: AngelCreationFailure;
  beliefSpent: number;
}

/** Why angel creation might fail */
export type AngelCreationFailure =
  | 'insufficient_belief'
  | 'max_angels_reached'
  | 'rank_too_high'
  | 'invalid_type'
  | 'name_taken';

// ============================================================================
// Factory Functions
// ============================================================================

/** Create default angel stats modified by type */
export function createAngelStats(
  rank: AngelRank,
  type: AngelType
): AngelStats {
  const base = { ...ANGEL_STATS_BY_RANK[rank] };

  // Modify based on type
  switch (type) {
    case 'warrior':
      base.combatPower *= 1.5;
      base.resistance *= 1.3;
      break;
    case 'messenger':
      base.speed *= 1.5;
      base.stealth *= 1.3;
      break;
    case 'guardian':
      base.resistance *= 1.5;
      base.perception *= 1.2;
      break;
    case 'healer':
      base.divinePower *= 1.3;
      base.influence *= 1.2;
      break;
    case 'judge':
      base.perception *= 1.5;
      base.influence *= 1.3;
      break;
    case 'punisher':
      base.combatPower *= 1.4;
      base.divinePower *= 1.2;
      break;
    case 'watcher':
      base.perception *= 2.0;
      base.stealth *= 1.5;
      break;
  }

  return base;
}

/** Create default angel form */
export function createAngelForm(
  type: AngelType,
  rank: AngelRank,
  _domain: DivineDomain
): AngelForm {
  let baseAppearance: AngelAppearance = 'humanoid';
  let winged = true;
  let wingCount = 2;
  let luminosity: AngelForm['luminosity'] = 'faint';

  // Higher ranks are more impressive
  if (rank === 'arch' || rank === 'supreme') {
    wingCount = 6;
    luminosity = 'bright';
    baseAppearance = 'seraph';
  } else if (rank === 'greater') {
    wingCount = 4;
    luminosity = 'bright';
    baseAppearance = 'radiant_humanoid';
  }

  // Type-specific appearances
  if (type === 'warrior') {
    baseAppearance = 'armored';
  } else if (type === 'punisher') {
    baseAppearance = 'flame';
    luminosity = 'blinding';
  } else if (type === 'watcher') {
    baseAppearance = 'wheel';
  }

  return {
    baseAppearance,
    description: `A ${rank} ${type} angel`,
    height: rank === 'supreme' ? 'giant' : 'tall',
    winged,
    wingCount,
    wingAppearance: 'feathered, glowing',
    luminosity,
    faceCount: rank === 'supreme' ? 4 : 1,
    armCount: 2,
    voiceDescription: 'melodious and resonant',
    shapeshifter: rank === 'arch' || rank === 'supreme',
  };
}

/** Create angel personality based on type */
export function createAngelPersonality(type: AngelType): AngelPersonality {
  switch (type) {
    case 'warrior':
      return {
        obedience: 'faithful',
        mortalAttitude: 'protective',
        combatDisposition: 'aggressive',
        communicationStyle: 'formal',
        selfView: 'proud_warrior',
      };
    case 'messenger':
      return {
        obedience: 'absolute',
        mortalAttitude: 'neutral',
        combatDisposition: 'pacifist',
        communicationStyle: 'cryptic',
        selfView: 'humble_servant',
      };
    case 'guardian':
      return {
        obedience: 'faithful',
        mortalAttitude: 'protective',
        combatDisposition: 'defensive',
        communicationStyle: 'silent',
        selfView: 'sacred_duty',
      };
    case 'healer':
      return {
        obedience: 'questioning',
        mortalAttitude: 'loving',
        combatDisposition: 'pacifist',
        communicationStyle: 'kind',
        selfView: 'burden_bearer',
      };
    case 'punisher':
      return {
        obedience: 'absolute',
        mortalAttitude: 'hostile',
        combatDisposition: 'wrathful',
        communicationStyle: 'dramatic',
        selfView: 'proud_warrior',
      };
    default:
      return {
        obedience: 'faithful',
        mortalAttitude: 'neutral',
        combatDisposition: 'balanced',
        communicationStyle: 'formal',
        selfView: 'sacred_duty',
      };
  }
}

/** Calculate angel maintenance cost */
export function calculateAngelMaintenance(
  angel: Angel,
  config: AngelConfig = DEFAULT_ANGEL_CONFIG
): number {
  let cost = config.maintenanceCostPerHour;

  // Rank multipliers
  const rankMultiplier: Record<AngelRank, number> = {
    lesser: 0.5,
    common: 1.0,
    greater: 2.0,
    arch: 4.0,
    supreme: 8.0,
  };
  cost *= rankMultiplier[angel.rank];

  // Combat increases drain
  if (angel.state.inCombat) {
    cost *= 2;
  }

  // Visibility increases drain
  if (angel.state.visible) {
    cost *= 1.5;
  }

  return cost;
}
