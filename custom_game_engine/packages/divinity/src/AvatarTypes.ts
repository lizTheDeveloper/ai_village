/**
 * AvatarTypes - Avatar manifestation and divine physical presence
 *
 * Gods can manifest avatars to walk among mortals. This is expensive,
 * revealing, and mythogenic. Avatars have limited power but can interact
 * directly with the physical world.
 */

import type { DivineDomain, DescribedForm } from './DeityTypes.js';

// ============================================================================
// Avatar Configuration
// ============================================================================

/** Configuration for avatar system */
export interface AvatarConfig {
  /** Minimum belief to create avatar */
  creationThreshold: number;

  /** Belief cost to create avatar */
  creationCost: number;

  /** Ongoing belief cost per game hour */
  maintenanceCostPerHour: number;

  /** How much belief drains when avatar takes damage */
  damageDrainMultiplier: number;

  /** Cooldown between avatar deaths and recreation (game hours) */
  deathCooldown: number;

  /** Maximum simultaneous avatars (usually 1) */
  maxSimultaneousAvatars: number;

  /** Does avatar creation alert other gods? */
  creationAlertsOtherGods: boolean;
}

/** Default avatar configuration */
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  creationThreshold: 5000,
  creationCost: 1000,
  maintenanceCostPerHour: 10,
  damageDrainMultiplier: 50,
  deathCooldown: 168, // 1 week game time
  maxSimultaneousAvatars: 1,
  creationAlertsOtherGods: true,
};

// ============================================================================
// Avatar Entity
// ============================================================================

/** An avatar - physical manifestation of a deity */
export interface Avatar {
  id: string;

  /** Which deity this avatar belongs to */
  deityId: string;

  /** Entity ID in the world (agent-like) */
  entityId: string;

  /** Avatar's current form */
  form: AvatarForm;

  /** Current stats */
  stats: AvatarStats;

  /** Current state */
  state: AvatarState;

  /** Abilities available in this form */
  abilities: AvatarAbility[];

  /** Equipment/items carried */
  inventory: AvatarInventoryItem[];

  /** When manifested */
  manifestedAt: number;

  /** Total time active (game hours) */
  totalActiveTime: number;

  /** Total belief spent on this avatar */
  totalBeliefSpent: number;

  /** Is identity known to mortals? */
  identityRevealed: boolean;

  /** Mortals who know the avatar's true identity */
  knownToAgentIds: string[];

  /** Memories formed while in avatar */
  avatarMemoryIds: string[];

  /** Myths generated while in avatar */
  generatedMythIds: string[];
}

/** Physical form of an avatar */
export interface AvatarForm {
  /** Form type */
  type: AvatarFormType;

  /** Visual description */
  description: string;

  /** Name used when interacting with mortals */
  mortalName: string;

  /** Physical appearance details */
  appearance: DescribedForm;

  /** Size category */
  size: AvatarSize;

  /** Movement capability */
  movement: MovementType[];

  /** Supernatural tells (things that reveal divinity) */
  tells: DivineTell[];

  /** Can this form speak? */
  canSpeak: boolean;

  /** Can this form use tools? */
  canUseTools: boolean;

  /** Special form abilities */
  formAbilities: string[];
}

/** Types of avatar forms */
export type AvatarFormType =
  | 'human'           // Standard human appearance
  | 'idealized_human' // Perfect/beautiful human
  | 'aged_mortal'     // Elderly/wise appearance
  | 'child'           // Child form
  | 'animal'          // Animal form
  | 'mythical_beast'  // Dragon, phoenix, etc.
  | 'elemental'       // Made of fire, water, etc.
  | 'abstract'        // Strange/impossible form
  | 'object'          // Possessed object
  | 'swarm'           // Many small creatures
  | 'giant'           // Massive humanoid
  | 'hybrid'          // Human-animal mix
  | 'formless';       // Cloud, mist, presence

/** Size of avatar */
export type AvatarSize =
  | 'tiny'        // Insect-sized
  | 'small'       // Cat-sized
  | 'medium'      // Human-sized
  | 'large'       // Horse-sized
  | 'huge'        // Elephant-sized
  | 'colossal';   // Building-sized

/** Movement capabilities */
export type MovementType =
  | 'walk'
  | 'run'
  | 'fly'
  | 'swim'
  | 'burrow'
  | 'climb'
  | 'teleport'
  | 'phase'     // Through walls
  | 'float';

/** Things that reveal divine nature */
export interface DivineTell {
  /** What the tell is */
  type: DivineTellType;

  /** Description */
  description: string;

  /** How obvious is it? (0-1) */
  obviousness: number;

  /** Can it be suppressed? */
  suppressible: boolean;

  /** Belief cost to suppress per hour */
  suppressionCost?: number;
}

/** Types of divine tells */
export type DivineTellType =
  | 'glowing_eyes'
  | 'unnatural_beauty'
  | 'plants_react'       // Plants bloom/wilt near them
  | 'animals_react'      // Animals bow/flee
  | 'weather_follows'    // Weather changes around them
  | 'shadow_wrong'       // Shadow doesn't match form
  | 'no_footprints'
  | 'voice_echoes'
  | 'temperature_aura'   // Area is warmer/colder
  | 'divine_scent'       // Smells like their domain
  | 'wounds_dont_bleed'
  | 'knows_too_much'     // Knows things they shouldn't
  | 'ageless'            // Doesn't age
  | 'flawless';          // No imperfections

// ============================================================================
// Avatar Stats
// ============================================================================

/** Stats of an avatar */
export interface AvatarStats {
  /** Current health */
  health: number;

  /** Maximum health */
  maxHealth: number;

  /** Physical strength modifier */
  strength: number;

  /** Speed modifier */
  speed: number;

  /** Perception modifier */
  perception: number;

  /** Charisma modifier */
  charisma: number;

  /** Wisdom modifier */
  wisdom: number;

  /** Resistance to damage */
  resistance: number;

  /** Power level for divine abilities */
  divinePower: number;

  /** Stealth (ability to hide divinity) */
  stealth: number;
}

/** Default avatar stats */
export const DEFAULT_AVATAR_STATS: AvatarStats = {
  health: 100,
  maxHealth: 100,
  strength: 1.5,
  speed: 1.2,
  perception: 2.0,
  charisma: 2.0,
  wisdom: 2.0,
  resistance: 0.5,
  divinePower: 1.0,
  stealth: 0.5,
};

// ============================================================================
// Avatar State
// ============================================================================

/** Current state of an avatar */
export interface AvatarState {
  /** Is avatar currently active? */
  active: boolean;

  /** Current position in world */
  position: { x: number; y: number };

  /** Current behavior/activity */
  currentActivity: AvatarActivity;

  /** Is in combat? */
  inCombat: boolean;

  /** Is identity revealed? */
  revealed: boolean;

  /** Is avatar suppressing tells? */
  suppressingTells: boolean;

  /** Belief drain rate (per hour) */
  currentDrainRate: number;

  /** Status effects on avatar */
  statusEffects: AvatarStatusEffect[];

  /** Mortals currently interacting with */
  interactingWithIds: string[];

  /** Current disguise (if using one) */
  currentDisguise?: AvatarDisguise;
}

/** What avatar is currently doing */
export type AvatarActivity =
  | 'idle'
  | 'walking'
  | 'observing'
  | 'speaking'
  | 'performing_miracle'
  | 'fighting'
  | 'healing'
  | 'blessing'
  | 'cursing'
  | 'fleeing'
  | 'sleeping'     // Avatars can choose to "rest"
  | 'working'      // Doing mortal labor
  | 'teaching'
  | 'judging'
  | 'celebrating'
  | 'mourning'
  | 'meditating';

/** Status effect on an avatar */
export interface AvatarStatusEffect {
  type: string;
  source: string;
  duration: number;
  magnitude: number;
}

/** Disguise used by avatar */
export interface AvatarDisguise {
  /** Fake identity */
  name: string;

  /** Claimed profession */
  profession: string;

  /** Claimed origin */
  origin: string;

  /** Believability (0-1) */
  believability: number;

  /** Who has seen through it */
  seenThroughByIds: string[];
}

// ============================================================================
// Avatar Abilities
// ============================================================================

/** An ability available to an avatar */
export interface AvatarAbility {
  id: string;

  /** Ability name */
  name: string;

  /** Description */
  description: string;

  /** Type of ability */
  type: AvatarAbilityType;

  /** Belief cost to use */
  beliefCost: number;

  /** Cooldown (game hours) */
  cooldown: number;

  /** Last used timestamp */
  lastUsedAt?: number;

  /** Does using this reveal divinity? */
  revealsIdentity: boolean;

  /** Domain alignment */
  domainAlignment?: DivineDomain;

  /** Effect magnitude */
  magnitude: number;

  /** Range in tiles */
  range: number;

  /** Duration of effect (hours, 0 = instant) */
  duration: number;
}

/** Types of avatar abilities */
export type AvatarAbilityType =
  | 'combat'        // Offensive ability
  | 'healing'       // Restore health
  | 'blessing'      // Grant positive effect
  | 'curse'         // Grant negative effect
  | 'perception'    // Enhanced sensing
  | 'movement'      // Enhanced travel
  | 'transformation'// Change form
  | 'illusion'      // Create false perception
  | 'communication' // Enhanced speech/understanding
  | 'creation'      // Make something
  | 'destruction'   // Unmake something
  | 'control';      // Command entities

// ============================================================================
// Avatar Inventory
// ============================================================================

/** An item in avatar's possession */
export interface AvatarInventoryItem {
  /** Item ID from item system */
  itemId: string;

  /** Is this a divine artifact? */
  isDivineArtifact: boolean;

  /** Special properties for divine items */
  divineProperties?: {
    powers: string[];
    beliefMaintenance: number;
    canBeStolen: boolean;
    destroyedOnAvatarDeath: boolean;
  };
}

// ============================================================================
// Avatar Events
// ============================================================================

/** Events related to avatars */
export interface AvatarEvent {
  type: AvatarEventType;
  avatarId: string;
  deityId: string;
  timestamp: number;
  location: { x: number; y: number };
  witnesses: string[];
  details: Record<string, unknown>;
}

/** Types of avatar events */
export type AvatarEventType =
  | 'manifested'
  | 'withdrawn'
  | 'revealed'
  | 'attacked'
  | 'damaged'
  | 'healed'
  | 'killed'
  | 'performed_miracle'
  | 'blessed_mortal'
  | 'cursed_mortal'
  | 'spoke_to_mortal'
  | 'entered_building'
  | 'formed_relationship'
  | 'witnessed_event'
  | 'changed_form'
  | 'created_artifact'
  | 'combat_victory'
  | 'combat_defeat'
  | 'met_another_avatar';

// ============================================================================
// Avatar Control (Player Interface)
// ============================================================================

/** Player's available avatar actions */
export interface AvatarPlayerActions {
  /** Can player currently control avatar? */
  canControl: boolean;

  /** Available movement directions */
  availableMovement: string[];

  /** Available abilities */
  availableAbilities: AvatarAbility[];

  /** Available interactions with nearby entities */
  availableInteractions: AvatarInteraction[];

  /** Can withdraw avatar? */
  canWithdraw: boolean;

  /** Can change form? */
  canChangeForm: boolean;

  /** Available forms to change to */
  availableForms: AvatarFormType[];

  /** Current belief drain rate */
  currentDrainRate: number;

  /** Estimated time until forced withdrawal (hours) */
  estimatedTimeRemaining: number;
}

/** An available interaction for avatar */
export interface AvatarInteraction {
  targetId: string;
  targetType: 'agent' | 'building' | 'object' | 'location';
  targetName: string;
  availableActions: AvatarInteractionAction[];
}

/** Types of avatar interaction actions */
export type AvatarInteractionAction =
  | 'speak'
  | 'bless'
  | 'curse'
  | 'heal'
  | 'attack'
  | 'observe'
  | 'reveal_identity'
  | 'grant_vision'
  | 'demand'
  | 'gift'
  | 'judge'
  | 'touch'        // Physical contact
  | 'enter'        // Enter building
  | 'sanctify'
  | 'desecrate'
  | 'possess';     // Take control

// ============================================================================
// Avatar Manifestation Request
// ============================================================================

/** Request to manifest an avatar */
export interface ManifestAvatarRequest {
  deityId: string;
  formType: AvatarFormType;
  location: { x: number; y: number };
  mortalName?: string;
  initiallyRevealed: boolean;
  customAppearance?: Partial<DescribedForm>;
}

/** Result of avatar manifestation */
export interface ManifestAvatarResult {
  success: boolean;
  avatarId?: string;
  entityId?: string;
  failureReason?: AvatarManifestFailure;
  beliefSpent: number;
  witnessIds: string[];
  generatedMythId?: string;
}

/** Why avatar manifestation might fail */
export type AvatarManifestFailure =
  | 'insufficient_belief'
  | 'on_cooldown'
  | 'max_avatars_active'
  | 'invalid_location'
  | 'blocked_by_deity'
  | 'domain_conflict';

// ============================================================================
// Factory Functions
// ============================================================================

/** Create default avatar stats modified by domain */
export function createAvatarStats(
  domain: DivineDomain,
  beliefLevel: number
): AvatarStats {
  const base = { ...DEFAULT_AVATAR_STATS };

  // Modify based on domain
  switch (domain) {
    case 'war':
      base.strength *= 1.5;
      base.resistance *= 1.3;
      break;
    case 'wisdom':
      base.wisdom *= 1.5;
      base.perception *= 1.3;
      break;
    case 'love':
    case 'beauty':
      base.charisma *= 1.5;
      break;
    case 'hunt':
      base.speed *= 1.5;
      base.perception *= 1.3;
      break;
    case 'death':
      base.resistance *= 1.5;
      base.stealth *= 1.3;
      break;
    case 'trickery':
      base.stealth *= 1.5;
      base.charisma *= 1.2;
      break;
    case 'healing':
      base.wisdom *= 1.3;
      break;
    case 'nature':
      base.perception *= 1.4;
      break;
    case 'storm':
    case 'fire':
      base.divinePower *= 1.3;
      break;
  }

  // Scale by belief level
  const beliefMultiplier = Math.min(2.0, 1.0 + beliefLevel / 10000);
  base.divinePower *= beliefMultiplier;
  base.maxHealth *= beliefMultiplier;
  base.health = base.maxHealth;

  return base;
}

/** Create avatar form based on deity's described form */
export function createAvatarForm(
  _deityId: string,
  formType: AvatarFormType,
  mortalName: string,
  describedForm: DescribedForm
): AvatarForm {
  return {
    type: formType,
    description: describedForm.description || 'A mysterious figure',
    mortalName,
    appearance: describedForm,
    size: formType === 'giant' ? 'huge' : formType === 'animal' ? 'medium' : 'medium',
    movement: formType === 'elemental' ? ['float', 'fly'] : ['walk', 'run'],
    tells: [
      {
        type: 'unnatural_beauty',
        description: 'An otherworldly perfection',
        obviousness: 0.3,
        suppressible: true,
        suppressionCost: 1,
      },
    ],
    canSpeak: formType !== 'object' && formType !== 'swarm',
    canUseTools: formType === 'human' || formType === 'idealized_human' || formType === 'hybrid',
    formAbilities: [],
  };
}

/** Calculate avatar maintenance cost */
export function calculateAvatarMaintenance(
  avatar: Avatar,
  config: AvatarConfig = DEFAULT_AVATAR_CONFIG
): number {
  let cost = config.maintenanceCostPerHour;

  // Suppressing tells costs extra
  if (avatar.state.suppressingTells) {
    cost += avatar.form.tells
      .filter(t => t.suppressible)
      .reduce((sum, t) => sum + (t.suppressionCost || 0), 0);
  }

  // Combat increases drain
  if (avatar.state.inCombat) {
    cost *= 2;
  }

  // Using abilities increases drain
  if (avatar.state.currentActivity === 'performing_miracle') {
    cost *= 3;
  }

  return cost;
}

/** Check if avatar should be forced to withdraw */
export function shouldForceWithdraw(
  avatar: Avatar,
  currentBelief: number,
  config: AvatarConfig = DEFAULT_AVATAR_CONFIG
): { shouldWithdraw: boolean; reason?: string } {
  // Health depleted
  if (avatar.stats.health <= 0) {
    return { shouldWithdraw: true, reason: 'avatar_killed' };
  }

  // Can't afford maintenance
  const maintenanceCost = calculateAvatarMaintenance(avatar, config);
  if (currentBelief < maintenanceCost) {
    return { shouldWithdraw: true, reason: 'insufficient_belief' };
  }

  return { shouldWithdraw: false };
}
