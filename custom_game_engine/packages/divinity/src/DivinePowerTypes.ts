/**
 * DivinePowerTypes - Divine powers, actions, and their costs
 *
 * Gods spend belief to act in the world. Powers are constrained by belief
 * thresholds and domain alignment. Off-domain actions cost more and risk
 * identity conflicts.
 */

import type { DivineDomain } from './DeityTypes.js';

// ============================================================================
// Power Tiers
// ============================================================================

/** Tiers of divine power based on belief thresholds */
export type PowerTier =
  | 'dormant'       // Cannot act (< 10 belief)
  | 'minor'         // Basic miracles (10-99 belief)
  | 'moderate'      // Standard divine actions (100-499 belief)
  | 'major'         // Significant miracles (500-1999 belief)
  | 'supreme'       // Angel creation, avatars (2000-4999 belief)
  | 'world_shaping'; // Reality-altering powers (5000+ belief)

/** Belief thresholds for each tier */
export const POWER_TIER_THRESHOLDS: Record<PowerTier, number> = {
  dormant: 0,
  minor: 10,
  moderate: 100,
  major: 500,
  supreme: 2000,
  world_shaping: 5000,
};

// ============================================================================
// Power Categories
// ============================================================================

/** Categories of divine powers */
export type PowerCategory =
  | 'miracle'       // Physical world effects
  | 'vision'        // Communication to mortals
  | 'blessing'      // Positive enchantment on target
  | 'curse'         // Negative enchantment on target
  | 'manifestation' // Deity appearing/acting directly
  | 'creation'      // Creating entities (angels, artifacts)
  | 'destruction'   // Removing/destroying things
  | 'transformation'// Changing nature of things
  | 'knowledge'     // Revealing hidden information
  | 'emotion'       // Affecting feelings
  | 'weather'       // Controlling weather
  | 'temporal';     // Time-related effects

// ============================================================================
// Specific Power Types
// ============================================================================

/** All available divine powers */
export type DivinePowerType =
  // ========================================
  // Minor Powers (10+ belief)
  // ========================================
  | 'whisper'               // Send vague feeling to one mortal
  | 'subtle_sign'           // Small omen (bird flight, cloud shape)
  | 'dream_hint'            // Vague dream imagery
  | 'minor_luck'            // Small fortune/misfortune
  | 'sense_prayer'          // Perceive prayers directed at you
  | 'observe_faithful'      // Watch a believer

  // ========================================
  // Moderate Powers (100+ belief)
  // ========================================
  | 'clear_vision'          // Send clear dream/vision
  | 'voice_of_god'          // Speak audible words to one mortal
  | 'minor_miracle'         // Small physical effect (light rain, warmth)
  | 'bless_individual'      // Grant minor blessing
  | 'curse_individual'      // Inflict minor curse
  | 'heal_wound'            // Heal injury (not fatal)
  | 'reveal_truth'          // Show hidden information
  | 'inspire_emotion'       // Cause strong feeling
  | 'guide_path'            // Lead someone somewhere
  | 'sacred_mark'           // Mark person/place as holy
  | 'prophetic_dream'       // Meaningful dream with future hints

  // ========================================
  // Major Powers (500+ belief)
  // ========================================
  | 'mass_vision'           // Vision to many people
  | 'major_miracle'         // Significant physical effect
  | 'heal_mortal_wound'     // Save from death
  | 'resurrect_recent'      // Return recently dead (minutes)
  | 'storm_calling'         // Summon/dispel storms
  | 'bless_harvest'         // Ensure good crop yield
  | 'curse_land'            // Blight an area
  | 'smite'                 // Strike down an individual
  | 'sanctify_site'         // Create holy ground
  | 'create_relic'          // Imbue object with power
  | 'mass_blessing'         // Bless a group
  | 'mass_curse'            // Curse a group
  | 'divine_protection'     // Shield from harm
  | 'compel_truth'          // Force honesty
  | 'divine_judgment'       // Judge and punish/reward

  // ========================================
  // Supreme Powers (2000+ belief)
  // ========================================
  | 'create_angel'          // Create divine servant
  | 'manifest_avatar'       // Take physical form
  | 'resurrect_old'         // Return long-dead
  | 'terraform_local'       // Reshape local geography
  | 'mass_miracle'          // Miracle affecting region
  | 'divine_champion'       // Empower mortal with abilities
  | 'holy_artifact'         // Create powerful artifact
  | 'establish_domain'      // Claim territory as sacred
  | 'divine_edict'          // Compel behavior in area
  | 'banish_spirit'         // Remove supernatural entity
  | 'grant_magic'           // Give mortal magical ability

  // ========================================
  // World-Shaping Powers (5000+ belief)
  // ========================================
  | 'terraform_region'      // Reshape large geography
  | 'create_species'        // Birth new creature type
  | 'divine_cataclysm'      // Flood, earthquake, etc.
  | 'ascend_mortal'         // Elevate mortal to divinity
  | 'devour_deity'          // Absorb another god
  | 'reality_warp'          // Alter local natural laws
  | 'planar_bridge'         // Connect to other realms
  | 'eternal_blessing'      // Permanent enchantment on bloodline
  | 'eternal_curse';        // Permanent curse on bloodline

// ============================================================================
// Power Definition
// ============================================================================

/** Complete definition of a divine power */
export interface DivinePower {
  /** Power type identifier */
  type: DivinePowerType;

  /** Human-readable name */
  name: string;

  /** Description of the effect */
  description: string;

  /** Power category */
  category: PowerCategory;

  /** Minimum tier required */
  requiredTier: PowerTier;

  /** Base belief cost */
  baseCost: number;

  /** Which domains this power is native to */
  nativeDomains: DivineDomain[];

  /** Cost multiplier for off-domain use */
  offDomainMultiplier: number;

  /** Does using this power create identity risk if off-domain? */
  createsIdentityRisk: boolean;

  /** Can this power be used on believers only, anyone, or self? */
  targetType: 'self' | 'believer' | 'anyone' | 'location' | 'object' | 'group';

  /** Maximum targets (for multi-target powers) */
  maxTargets?: number;

  /** Range in tiles (0 = unlimited) */
  range: number;

  /** Duration of effect in game hours (0 = instant, -1 = permanent) */
  duration: number;

  /** Cooldown before reuse in game hours */
  cooldown: number;

  /** Does this power require avatar form? */
  requiresAvatar: boolean;

  /** Visibility to mortals */
  visibility: PowerVisibility;

  /** Can create myths when used */
  mythogenic: boolean;

  /** Traits this power suggests about the deity */
  suggestedTraits: string[];
}

/** How visible a divine action is */
export type PowerVisibility =
  | 'invisible'     // No one perceives it as divine
  | 'subtle'        // Observant may notice something strange
  | 'clear'         // Witnesses know something supernatural happened
  | 'spectacular'   // Unmistakably divine, creates stories
  | 'world_visible'; // Everyone in region knows

// ============================================================================
// Power Execution
// ============================================================================

/** Request to use a divine power */
export interface PowerUseRequest {
  /** Which power to use */
  powerType: DivinePowerType;

  /** Deity using the power */
  deityId: string;

  /** Target(s) of the power */
  targets: PowerTarget[];

  /** Optional intensity modifier (0.5 = half, 2.0 = double) */
  intensity?: number;

  /** Optional flavor/style (affects myth generation) */
  style?: PowerStyle;

  /** Additional parameters for specific powers */
  parameters?: Record<string, unknown>;
}

/** Target of a divine power */
export interface PowerTarget {
  /** Type of target */
  type: 'agent' | 'location' | 'building' | 'object' | 'region' | 'deity';

  /** ID of the target */
  id: string;

  /** Optional specific aspect to target */
  aspect?: string;
}

/** Style of power execution (affects myth generation) */
export type PowerStyle =
  | 'subtle'        // Barely noticeable
  | 'gentle'        // Kind and soft
  | 'stern'         // Firm and commanding
  | 'wrathful'      // Angry and punishing
  | 'mysterious'    // Strange and cryptic
  | 'glorious'      // Magnificent and impressive
  | 'terrifying'    // Fear-inducing
  | 'nurturing'     // Caring and supportive
  | 'playful'       // Light and whimsical
  | 'solemn';       // Serious and formal

/** Result of using a divine power */
export interface PowerUseResult {
  /** Did the power succeed? */
  success: boolean;

  /** Actual belief spent */
  beliefSpent: number;

  /** Effects that occurred */
  effects: PowerEffect[];

  /** Was this witnessed? */
  witnessed: boolean;

  /** Who witnessed it */
  witnessIds: string[];

  /** Did this create a myth-worthy event? */
  mythWorthy: boolean;

  /** Generated myth ID (if mythogenic) */
  generatedMythId?: string;

  /** Identity implications */
  identityImplications: IdentityImplication[];

  /** Cooldown until power can be used again */
  cooldownUntil: number;

  /** Failure reason if unsuccessful */
  failureReason?: PowerFailureReason;
}

/** Individual effect from a power */
export interface PowerEffect {
  /** Type of effect */
  type: string;

  /** Target affected */
  targetId: string;

  /** Magnitude of effect */
  magnitude: number;

  /** Duration remaining */
  durationRemaining: number;

  /** Description of effect */
  description: string;
}

/** Why a power might fail */
export type PowerFailureReason =
  | 'insufficient_belief'
  | 'tier_too_low'
  | 'on_cooldown'
  | 'invalid_target'
  | 'target_protected'
  | 'domain_blocked'
  | 'avatar_required'
  | 'target_out_of_range'
  | 'opposing_deity_blocked'
  | 'natural_law_prevents';

// ============================================================================
// Identity Implications
// ============================================================================

/** How a power use affects deity identity */
export interface IdentityImplication {
  /** Which trait is affected */
  trait: string;

  /** Direction of implication */
  direction: 'reinforces' | 'contradicts';

  /** Strength of implication */
  strength: number;

  /** Narrative description */
  description: string;
}

/** Identity risk assessment before using a power */
export interface IdentityRiskAssessment {
  /** Power being assessed */
  powerType: DivinePowerType;

  /** Is this in the deity's domain? */
  inDomain: boolean;

  /** Traits this aligns with */
  alignedTraits: string[];

  /** Traits this contradicts */
  contradictedTraits: string[];

  /** Overall risk level */
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'extreme';

  /** Potential myth interpretations */
  possibleInterpretations: string[];

  /** Cost multiplier from domain mismatch */
  costMultiplier: number;
}

// ============================================================================
// Domain-Power Mapping
// ============================================================================

/** Domain affinity for a power type */
export interface DomainPowerAffinity {
  domain: DivineDomain;
  powerType: DivinePowerType;
  affinity: 'native' | 'aligned' | 'neutral' | 'opposed';
  costModifier: number; // 0.5 = half cost, 2.0 = double cost
  identityRisk: number; // 0-1, higher = more risk to identity
}

/** Get the base domain-power affinities */
export const DOMAIN_POWER_AFFINITIES: Partial<Record<DivineDomain, DivinePowerType[]>> = {
  harvest: ['bless_harvest', 'minor_luck', 'minor_miracle', 'mass_blessing'],
  war: ['smite', 'divine_champion', 'divine_protection', 'inspire_emotion'],
  wisdom: ['reveal_truth', 'prophetic_dream', 'clear_vision', 'guide_path'],
  healing: ['heal_wound', 'heal_mortal_wound', 'resurrect_recent', 'mass_blessing'],
  death: ['resurrect_recent', 'resurrect_old', 'sense_prayer', 'banish_spirit'],
  nature: ['terraform_local', 'create_species', 'bless_harvest', 'storm_calling'],
  storm: ['storm_calling', 'smite', 'divine_cataclysm', 'major_miracle'],
  protection: ['divine_protection', 'sanctify_site', 'bless_individual', 'sacred_mark'],
  chaos: ['reality_warp', 'curse_individual', 'minor_luck', 'inspire_emotion'],
  order: ['divine_edict', 'compel_truth', 'divine_judgment', 'establish_domain'],
  mystery: ['reveal_truth', 'prophetic_dream', 'reality_warp', 'clear_vision'],
  fire: ['smite', 'divine_cataclysm', 'terraform_local', 'curse_land'],
  water: ['storm_calling', 'bless_harvest', 'heal_wound', 'divine_cataclysm'],
  dreams: ['prophetic_dream', 'clear_vision', 'dream_hint', 'inspire_emotion'],
  trickery: ['minor_luck', 'curse_individual', 'inspire_emotion', 'reveal_truth'],
};

// ============================================================================
// Prayers and Responses
// ============================================================================

/** A prayer from a mortal to a deity */
export interface Prayer {
  id: string;

  /** Who is praying */
  prayerId: string;

  /** Which deity they're praying to */
  deityId: string;

  /** Content/request of the prayer */
  content: string;

  /** Type of prayer */
  type: PrayerType;

  /** Urgency level */
  urgency: 'casual' | 'earnest' | 'desperate';

  /** Emotional state of the prayer */
  emotion: PrayerEmotion;

  /** What they're asking for (if request) */
  request?: PrayerRequest;

  /** When the prayer was made */
  timestamp: number;

  /** Has it been acknowledged? */
  acknowledged: boolean;

  /** Response (if any) */
  response?: PrayerResponse;

  /** Belief generated by this prayer */
  beliefGenerated: number;
}

/** Types of prayers */
export type PrayerType =
  | 'praise'        // Just worshipping
  | 'thanks'        // Gratitude
  | 'request'       // Asking for something
  | 'confession'    // Admitting wrongdoing
  | 'question'      // Seeking guidance
  | 'bargain'       // Offering something in exchange
  | 'complaint'     // Expressing dissatisfaction
  | 'dedication';   // Committing to something

/** Emotional content of prayer */
export type PrayerEmotion =
  | 'reverent'
  | 'fearful'
  | 'hopeful'
  | 'desperate'
  | 'grateful'
  | 'angry'
  | 'sorrowful'
  | 'joyful'
  | 'humble'
  | 'demanding';

/** Specific request in a prayer */
export interface PrayerRequest {
  /** What category of help */
  category: 'health' | 'wealth' | 'protection' | 'guidance' | 'revenge' | 'love' | 'weather' | 'fertility' | 'knowledge' | 'other';

  /** Specific target of request */
  target?: string;

  /** What they're offering in return */
  offering?: string;

  /** How urgent is the need */
  timeframe: 'immediate' | 'soon' | 'eventual' | 'unspecified';
}

/** Deity response to a prayer */
export interface PrayerResponse {
  /** Type of response */
  type: 'answered' | 'denied' | 'partial' | 'delayed' | 'cryptic' | 'ignored';

  /** Power used to respond (if any) */
  powerUsed?: DivinePowerType;

  /** Visible sign given */
  signGiven?: string;

  /** Message communicated (if any) */
  message?: string;

  /** Belief cost of response */
  beliefCost: number;

  /** When response was given */
  timestamp: number;
}

// ============================================================================
// Visions
// ============================================================================

/** A vision sent from deity to mortal */
export interface DivineVision {
  id: string;

  /** Sending deity */
  deityId: string;

  /** Receiving mortal */
  recipientId: string;

  /** Vision content */
  content: VisionContent;

  /** Clarity of the vision */
  clarity: 'fragmentary' | 'hazy' | 'clear' | 'vivid' | 'overwhelming';

  /** Type of delivery */
  deliveryType: 'dream' | 'waking_vision' | 'trance' | 'possession' | 'omen';

  /** Interpretation difficulty */
  interpretationDifficulty: 'obvious' | 'clear' | 'symbolic' | 'cryptic' | 'incomprehensible';

  /** When sent */
  timestamp: number;

  /** Belief cost */
  beliefCost: number;

  /** Was it understood correctly? */
  correctlyInterpreted?: boolean;

  /** Recipient's interpretation */
  recipientInterpretation?: string;
}

/** Content of a divine vision */
export interface VisionContent {
  /** Main imagery */
  imagery: string[];

  /** Symbolic elements */
  symbols: string[];

  /** Emotional tone */
  emotionalTone: 'peaceful' | 'warning' | 'commanding' | 'comforting' | 'terrifying' | 'awe_inspiring';

  /** Spoken words (if any) */
  spokenWords?: string;

  /** Hidden meaning */
  trueMessage: string;

  /** Prophetic element (if future-related) */
  prophecy?: {
    subject: string;
    timeframe: string;
    likelihood: number;
  };
}

// ============================================================================
// Active Blessings and Curses
// ============================================================================

/** An active blessing on a target */
export interface ActiveBlessing {
  id: string;

  /** Source deity */
  deityId: string;

  /** Target entity */
  targetId: string;
  targetType: 'agent' | 'location' | 'building' | 'object' | 'bloodline';

  /** Type of blessing */
  blessingType: BlessingType;

  /** Magnitude (affects strength) */
  magnitude: number;

  /** When it was granted */
  grantedAt: number;

  /** When it expires (-1 for permanent) */
  expiresAt: number;

  /** Is it visible to the blessed? */
  visible: boolean;

  /** Can it be removed? */
  removable: boolean;

  /** Maintenance cost per game hour */
  maintenanceCost: number;
}

/** Types of blessings */
export type BlessingType =
  | 'health'        // Improved health/healing
  | 'luck'          // Good fortune
  | 'strength'      // Physical power
  | 'wisdom'        // Better decisions
  | 'protection'    // Reduced harm
  | 'fertility'     // More children/crops
  | 'prosperity'    // Better trades/yields
  | 'charisma'      // More persuasive
  | 'skill'         // Better at specific skill
  | 'insight'       // Can sense things
  | 'longevity'     // Slower aging
  | 'favor';        // General divine favor

/** An active curse on a target */
export interface ActiveCurse {
  id: string;

  /** Source deity */
  deityId: string;

  /** Target entity */
  targetId: string;
  targetType: 'agent' | 'location' | 'building' | 'object' | 'bloodline';

  /** Type of curse */
  curseType: CurseType;

  /** Magnitude (affects severity) */
  magnitude: number;

  /** When it was cast */
  castAt: number;

  /** When it expires (-1 for permanent) */
  expiresAt: number;

  /** Is it known to the cursed? */
  known: boolean;

  /** How can it be lifted? */
  liftCondition?: CurseLiftCondition;

  /** Maintenance cost per game hour */
  maintenanceCost: number;
}

/** Types of curses */
export type CurseType =
  | 'misfortune'    // Bad luck
  | 'illness'       // Health problems
  | 'weakness'      // Reduced strength
  | 'confusion'     // Poor decisions
  | 'vulnerability' // More easily harmed
  | 'barrenness'    // No children/crops fail
  | 'poverty'       // Economic problems
  | 'isolation'     // Others avoid them
  | 'nightmares'    // Disturbed sleep
  | 'pain'          // Chronic suffering
  | 'transformation'// Physical change
  | 'doom';         // Fated bad end

/** Conditions to lift a curse */
export interface CurseLiftCondition {
  type: 'time' | 'action' | 'sacrifice' | 'forgiveness' | 'quest' | 'impossible';
  description: string;
  parameters?: Record<string, unknown>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Get the tier for a belief amount */
export function getTierForBelief(belief: number): PowerTier {
  if (belief >= POWER_TIER_THRESHOLDS.world_shaping) return 'world_shaping';
  if (belief >= POWER_TIER_THRESHOLDS.supreme) return 'supreme';
  if (belief >= POWER_TIER_THRESHOLDS.major) return 'major';
  if (belief >= POWER_TIER_THRESHOLDS.moderate) return 'moderate';
  if (belief >= POWER_TIER_THRESHOLDS.minor) return 'minor';
  return 'dormant';
}

/** Check if a deity can use a power */
export function canUsePower(
  powerTier: PowerTier,
  deityBelief: number,
  powerCost: number
): { canUse: boolean; reason?: PowerFailureReason } {
  const deityTier = getTierForBelief(deityBelief);
  const tierOrder: PowerTier[] = ['dormant', 'minor', 'moderate', 'major', 'supreme', 'world_shaping'];

  if (tierOrder.indexOf(deityTier) < tierOrder.indexOf(powerTier)) {
    return { canUse: false, reason: 'tier_too_low' };
  }

  if (deityBelief < powerCost) {
    return { canUse: false, reason: 'insufficient_belief' };
  }

  return { canUse: true };
}

/** Calculate cost modifier for domain alignment */
export function getDomainCostModifier(
  powerDomains: DivineDomain[],
  deityDomain: DivineDomain,
  deitySecondaryDomains: DivineDomain[]
): number {
  // Native domain: 1.0x (no modifier)
  if (powerDomains.includes(deityDomain)) {
    return 1.0;
  }

  // Secondary domain: 1.25x
  if (deitySecondaryDomains.some(d => powerDomains.includes(d))) {
    return 1.25;
  }

  // Neutral: 1.5x
  // Opposed domains would be higher, but that requires relationship mapping
  return 1.5;
}

/** Create a prayer request */
export function createPrayer(
  prayerId: string,
  deityId: string,
  content: string,
  type: PrayerType,
  emotion: PrayerEmotion = 'reverent'
): Prayer {
  return {
    id: `prayer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    prayerId,
    deityId,
    content,
    type,
    urgency: 'earnest',
    emotion,
    timestamp: Date.now(),
    acknowledged: false,
    beliefGenerated: 0,
  };
}
