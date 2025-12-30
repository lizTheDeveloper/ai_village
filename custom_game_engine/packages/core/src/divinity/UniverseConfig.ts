/**
 * UniverseConfig - Universe-specific divinity configuration
 *
 * Different universes have vastly different divine dynamics. A grimdark world
 * might have expensive, unreliable powers while a high fantasy world has
 * cheap, abundant divine intervention. This configures all divine mechanics.
 */

import type { DivineDomain } from './DeityTypes.js';
import type { PowerTier, DivinePowerType, BlessingType, CurseType } from './DivinePowerTypes.js';
import type { AngelRank, AngelType } from './AngelTypes.js';
import type { AvatarFormType } from './AvatarTypes.js';
import type { BeliefActivity } from './BeliefTypes.js';

// ============================================================================
// Universe Divine Profile
// ============================================================================

/** Complete divine configuration for a universe */
export interface UniverseDivineConfig {
  /** Universe identifier */
  universeId: string;

  /** Human-readable name */
  name: string;

  /** Description of divine nature in this universe */
  description: string;

  /** Core divine parameters */
  coreParams: CoreDivineParams;

  /** Belief economy configuration */
  beliefEconomy: BeliefEconomyConfig;

  /** Power configuration */
  powers: PowerConfig;

  /** Avatar configuration */
  avatars: AvatarConfig;

  /** Angel configuration */
  angels: AngelConfig;

  /** Pantheon configuration */
  pantheons: PantheonConfig;

  /** Religion configuration */
  religion: ReligionConfig;

  /** Emergence configuration (how new gods form) */
  emergence: EmergenceConfig;

  /** Chat configuration */
  chat: ChatConfig;

  /** Domain-specific modifiers */
  domainModifiers: Map<DivineDomain, DomainModifier>;

  /** Restricted/unavailable features */
  restrictions: RestrictionConfig;
}

// ============================================================================
// Core Divine Parameters
// ============================================================================

/** Fundamental divine constants for a universe */
export interface CoreDivineParams {
  /** How "present" are the gods? (0 = distant, 1 = omnipresent) */
  divinePresence: number;

  /** How reliable are divine actions? (0 = chaotic, 1 = consistent) */
  divineReliability: number;

  /** How much do mortals matter to gods? (0 = indifferent, 1 = invested) */
  mortalSignificance: number;

  /** How quickly does faith spread/decay? */
  faithVolatility: number;

  /** Can gods die permanently? */
  permanentDivineDeathPossible: boolean;

  /** Can gods be created by mortals intentionally? */
  intentionalDeityCreation: boolean;

  /** Maximum number of active deities */
  maxActiveDeities: number;

  /** Does the player god have advantages? */
  playerGodAdvantage: number; // 1.0 = none, 2.0 = double power

  /** Time scale multiplier for divine actions */
  divineTimeScale: number;
}

// ============================================================================
// Belief Economy Configuration
// ============================================================================

/** How belief works in this universe */
export interface BeliefEconomyConfig {
  /** Multiplier for all belief generation */
  generationMultiplier: number;

  /** Per-activity generation multipliers */
  activityMultipliers: Partial<Record<BeliefActivity, number>>;

  /** Decay rate multiplier */
  decayMultiplier: number;

  /** Minimum belief to sustain existence */
  existenceThreshold: number;

  /** Belief threshold multipliers for power tiers */
  tierThresholdMultipliers: Record<PowerTier, number>;

  /** Maximum belief a deity can store */
  maxBeliefStorage: number;

  /** Belief transfer efficiency (lost in transfer) */
  transferEfficiency: number;

  /** Sacred site bonus multiplier */
  sacredSiteBonusMultiplier: number;

  /** Communal worship bonus multiplier */
  communalBonusMultiplier: number;

  /** Crisis/fervor multiplier cap */
  maxFervorMultiplier: number;

  /** How quickly does belief become "stale" without activity? */
  beliefStalenessRate: number;

  /** Can belief be stolen between gods? */
  beliefTheftAllowed: boolean;

  /** Theft efficiency if allowed */
  beliefTheftEfficiency: number;
}

// ============================================================================
// Power Configuration
// ============================================================================

/** How divine powers work */
export interface PowerConfig {
  /** Global cost multiplier for all powers */
  globalCostMultiplier: number;

  /** Per-power cost multipliers */
  powerCostMultipliers: Partial<Record<DivinePowerType, number>>;

  /** Disabled powers (unavailable in this universe) */
  disabledPowers: DivinePowerType[];

  /** Global range multiplier */
  globalRangeMultiplier: number;

  /** Per-power range multipliers */
  powerRangeMultipliers: Partial<Record<DivinePowerType, number>>;

  /** Global duration multiplier */
  globalDurationMultiplier: number;

  /** Per-power duration multipliers */
  powerDurationMultipliers: Partial<Record<DivinePowerType, number>>;

  /** Global cooldown multiplier */
  globalCooldownMultiplier: number;

  /** Per-power cooldown multipliers */
  powerCooldownMultipliers: Partial<Record<DivinePowerType, number>>;

  /** Success rate for powers (0-1, 1 = always works) */
  basePowerSuccessRate: number;

  /** Does off-domain use have chance of failure? */
  offDomainFailureChance: number;

  /** Off-domain cost multiplier */
  offDomainCostMultiplier: number;

  /** Identity risk multiplier for off-domain */
  identityRiskMultiplier: number;

  /** Can powers be resisted by targets? */
  powerResistanceAllowed: boolean;

  /** Base resistance chance for targets */
  baseResistanceChance: number;

  /** Do powers create visible effects? */
  powerVisibility: PowerVisibilityConfig;

  /** Prayer configuration */
  prayers: PrayerConfig;

  /** Vision configuration */
  visions: VisionConfig;

  /** Blessing configuration */
  blessings: BlessingConfig;

  /** Curse configuration */
  curses: CurseConfig;
}

/** How visible are divine actions? */
export interface PowerVisibilityConfig {
  /** Multiplier for visibility (0 = all invisible, 2 = very obvious) */
  visibilityMultiplier: number;

  /** Minimum tier for visible miracles */
  minimumVisibleTier: PowerTier;

  /** Can gods act invisibly if they choose? */
  stealthActionsAllowed: boolean;

  /** Cost multiplier for stealth actions */
  stealthCostMultiplier: number;
}

/** Prayer handling configuration */
export interface PrayerConfig {
  /** Can gods hear all prayers or only from believers? */
  hearNonBelieverPrayers: boolean;

  /** Prayer queue maximum */
  maxPendingPrayers: number;

  /** Prayer expiry time (game hours) */
  prayerExpiryTime: number;

  /** Belief generated per prayer */
  beliefPerPrayer: number;

  /** Answered prayer faith boost */
  answeredPrayerFaithBoost: number;

  /** Ignored prayer faith penalty */
  ignoredPrayerFaithPenalty: number;
}

/** Vision sending configuration */
export interface VisionConfig {
  /** Base cost multiplier for visions */
  costMultiplier: number;

  /** Can visions be misinterpreted? */
  misinterpretationPossible: boolean;

  /** Base misinterpretation chance */
  baseMisinterpretationChance: number;

  /** Vision clarity range (min, max) */
  clarityRange: [number, number];

  /** Maximum concurrent visions */
  maxConcurrentVisions: number;
}

/** Blessing configuration */
export interface BlessingConfig {
  /** Blessing cost multiplier */
  costMultiplier: number;

  /** Blessing duration multiplier */
  durationMultiplier: number;

  /** Maximum active blessings per deity */
  maxActiveBlessings: number;

  /** Disabled blessing types */
  disabledBlessingTypes: BlessingType[];

  /** Blessing strength multiplier */
  strengthMultiplier: number;

  /** Can blessings be removed by other gods? */
  removalByOtherGodsAllowed: boolean;

  /** Removal cost multiplier */
  removalCostMultiplier: number;
}

/** Curse configuration */
export interface CurseConfig {
  /** Curse cost multiplier */
  costMultiplier: number;

  /** Curse duration multiplier */
  durationMultiplier: number;

  /** Maximum active curses per deity */
  maxActiveCurses: number;

  /** Disabled curse types */
  disabledCurseTypes: CurseType[];

  /** Curse strength multiplier */
  strengthMultiplier: number;

  /** Can curses be lifted by the target's prayers? */
  liftableByPrayer: boolean;

  /** Prayer lift difficulty */
  prayerLiftDifficulty: number;

  /** Curse backlash chance (curse rebounds) */
  backlashChance: number;
}

// ============================================================================
// Avatar Configuration
// ============================================================================

/** Avatar mechanics for this universe */
export interface AvatarConfig {
  /** Are avatars allowed? */
  avatarsAllowed: boolean;

  /** Belief threshold to manifest */
  manifestationThreshold: number;

  /** Manifestation cost */
  manifestationCost: number;

  /** Maintenance cost multiplier */
  maintenanceCostMultiplier: number;

  /** Maximum simultaneous avatars */
  maxSimultaneousAvatars: number;

  /** Allowed form types */
  allowedFormTypes: AvatarFormType[];

  /** Disabled form types */
  disabledFormTypes: AvatarFormType[];

  /** Avatar power level multiplier */
  powerLevelMultiplier: number;

  /** Avatar stat multipliers */
  statMultipliers: {
    health: number;
    strength: number;
    speed: number;
    perception: number;
    charisma: number;
    wisdom: number;
    resistance: number;
    divinePower: number;
  };

  /** Death cooldown (game hours) */
  deathCooldown: number;

  /** Is avatar death permanent? */
  permanentDeath: boolean;

  /** Tell suppression allowed? */
  tellSuppressionAllowed: boolean;

  /** Tell suppression cost multiplier */
  tellSuppressionCostMultiplier: number;

  /** Avatar ability cost multiplier */
  abilityCostMultiplier: number;

  /** Do avatars alert other gods? */
  manifestationAlertsOtherGods: boolean;
}

// ============================================================================
// Angel Configuration
// ============================================================================

/** Angel mechanics for this universe */
export interface AngelConfig {
  /** Are angels allowed? */
  angelsAllowed: boolean;

  /** Creation threshold */
  creationThreshold: number;

  /** Creation cost multiplier */
  creationCostMultiplier: number;

  /** Maintenance cost multiplier */
  maintenanceCostMultiplier: number;

  /** Maximum angels per deity by rank */
  maxAngelsByRank: Record<AngelRank, number>;

  /** Allowed angel types */
  allowedAngelTypes: AngelType[];

  /** Maximum angel rank available */
  maxAvailableRank: AngelRank;

  /** Angel power multiplier */
  powerMultiplier: number;

  /** Is angel death permanent? */
  permanentDeath: boolean;

  /** Respawn cooldown if not permanent */
  respawnCooldown: number;

  /** Angel ability cost multiplier */
  abilityCostMultiplier: number;

  /** Can angels disobey? */
  disobediencePossible: boolean;

  /** Base disobedience chance */
  baseDisobedienceChance: number;

  /** Can angels be corrupted by other gods? */
  corruptionPossible: boolean;
}

// ============================================================================
// Pantheon Configuration
// ============================================================================

/** Pantheon mechanics */
export interface PantheonConfig {
  /** Maximum gods in a pantheon */
  maxPantheonSize: number;

  /** Minimum gods for formal pantheon */
  minPantheonSize: number;

  /** Can pantheons war? */
  pantheonWarAllowed: boolean;

  /** Can gods switch pantheons? */
  pantheonSwitchingAllowed: boolean;

  /** Switching cost (belief) */
  switchingCost: number;

  /** Divine relationship change rate */
  relationshipChangeRate: number;

  /** Can gods form permanent enmities? */
  permanentEnmityPossible: boolean;

  /** Treaty enforcement level */
  treatyEnforcementLevel: 'none' | 'weak' | 'moderate' | 'strong' | 'absolute';

  /** Divine council voting power distribution */
  votingPowerDistribution: 'equal' | 'belief_weighted' | 'seniority_weighted';
}

// ============================================================================
// Religion Configuration
// ============================================================================

/** Religious institution mechanics */
export interface ReligionConfig {
  /** Temple belief bonus multiplier */
  templeBonusMultiplier: number;

  /** Maximum temples per deity */
  maxTemplesPerDeity: number;

  /** Priest effectiveness multiplier */
  priestEffectivenessMultiplier: number;

  /** Maximum priests per temple */
  maxPriestsPerTemple: number;

  /** Ritual belief generation multiplier */
  ritualBeliefMultiplier: number;

  /** Holy text influence multiplier */
  holyTextInfluenceMultiplier: number;

  /** Schism likelihood multiplier */
  schismLikelihoodMultiplier: number;

  /** Conversion difficulty */
  conversionDifficulty: number;

  /** Can religions have inquisitions? */
  inquisitionsAllowed: boolean;

  /** Heresy detection rate */
  heresyDetectionRate: number;
}

// ============================================================================
// Emergence Configuration
// ============================================================================

/** How new gods emerge */
export interface EmergenceConfig {
  /** Can new gods emerge naturally? */
  naturalEmergenceAllowed: boolean;

  /** Minimum believers for emergence */
  emergenceThreshold: number;

  /** Time required for crystallization (game hours) */
  crystallizationTime: number;

  /** Can emergence be prevented by existing gods? */
  emergenceBlockingAllowed: boolean;

  /** Blocking cost multiplier */
  blockingCostMultiplier: number;

  /** New god starting belief */
  startingBelief: number;

  /** New god grace period (no decay, game hours) */
  gracePeriod: number;

  /** Emergence notification radius */
  emergenceNotificationRadius: number;

  /** Emergence types allowed */
  allowedEmergenceTypes: string[];
}

// ============================================================================
// Chat Configuration
// ============================================================================

/** Divine chat mechanics */
export interface ChatConfig {
  /** Is divine chat enabled? */
  chatEnabled: boolean;

  /** Minimum gods for chat */
  minimumGodsForChat: number;

  /** Minimum gods for DMs */
  minimumGodsForDM: number;

  /** Response round cooldown (ms) */
  responseRoundCooldown: number;

  /** Can gods lie in chat? */
  deceptionAllowed: boolean;

  /** Chat message maximum length */
  maxMessageLength: number;

  /** Can gods block other gods? */
  blockingAllowed: boolean;

  /** Anonymous messaging allowed? */
  anonymousMessagesAllowed: boolean;
}

// ============================================================================
// Domain Modifiers
// ============================================================================

/** Per-domain adjustments */
export interface DomainModifier {
  domain: DivineDomain;

  /** Is this domain available in this universe? */
  available: boolean;

  /** Power cost modifier for this domain */
  powerCostModifier: number;

  /** Belief generation modifier */
  beliefGenerationModifier: number;

  /** Domain emergence likelihood */
  emergenceLikelihood: number;

  /** Competing domains (increased cost when multiple exist) */
  competingDomains: DivineDomain[];

  /** Synergistic domains (reduced cost when allied) */
  synergisticDomains: DivineDomain[];

  /** Domain-specific restrictions */
  restrictedPowers: DivinePowerType[];

  /** Domain-specific bonuses */
  bonusPowers: DivinePowerType[];
}

// ============================================================================
// Restrictions
// ============================================================================

/** What's not allowed in this universe */
export interface RestrictionConfig {
  /** Disabled features entirely */
  disabledFeatures: DivinityFeature[];

  /** Level caps */
  levelCaps: {
    maxPowerTier: PowerTier;
    maxAngelRank: AngelRank;
    maxBelief: number;
    maxBelievers: number;
  };

  /** Interaction restrictions */
  interactions: {
    godsCanKillGods: boolean;
    godsCanMergeDomains: boolean;
    godsCanStealDomains: boolean;
    godsCanCreateMortals: boolean;
    godsCanDestroyWorld: boolean;
  };

  /** Player restrictions */
  playerRestrictions: {
    canBeKilled: boolean;
    canLoseDomain: boolean;
    canBeForced: boolean;
    minimumBelief: number;
  };
}

/** Features that can be disabled */
export type DivinityFeature =
  | 'avatars'
  | 'angels'
  | 'divine_chat'
  | 'pantheons'
  | 'schisms'
  | 'syncretism'
  | 'divine_war'
  | 'temples'
  | 'holy_texts'
  | 'prophecy'
  | 'resurrection'
  | 'world_shaping'
  | 'deity_death'
  | 'natural_emergence';

// ============================================================================
// Universe Presets
// ============================================================================

/** Pre-built universe configurations */
export type UniversePreset =
  | 'high_fantasy'      // Gods are powerful and active
  | 'low_fantasy'       // Gods are distant and weak
  | 'grimdark'          // Gods are cruel and unreliable
  | 'mythic'            // Gods are legendary but present
  | 'monotheistic'      // One true god, others are pretenders
  | 'animistic'         // Many small spirits, no great gods
  | 'deistic'           // Gods created world but don't intervene
  | 'chaotic'           // Divine power is wild and unpredictable
  | 'dying_gods'        // Gods are fading, powers expensive
  | 'ascendant'         // Gods are gaining power, cheap miracles
  | 'balanced';         // Standard balanced gameplay

// ============================================================================
// Preset Definitions
// ============================================================================

/** Get preset configuration */
export function getPresetConfig(preset: UniversePreset): Partial<UniverseDivineConfig> {
  switch (preset) {
    case 'high_fantasy':
      return {
        coreParams: {
          divinePresence: 0.8,
          divineReliability: 0.9,
          mortalSignificance: 0.7,
          faithVolatility: 0.3,
          permanentDivineDeathPossible: false,
          intentionalDeityCreation: true,
          maxActiveDeities: 50,
          playerGodAdvantage: 1.2,
          divineTimeScale: 1.0,
        },
        beliefEconomy: {
          generationMultiplier: 1.5,
          activityMultipliers: {},
          decayMultiplier: 0.5,
          existenceThreshold: 5,
          tierThresholdMultipliers: {
            dormant: 1.0, minor: 0.5, moderate: 0.5,
            major: 0.7, supreme: 0.8, world_shaping: 0.9,
          },
          maxBeliefStorage: 100000,
          transferEfficiency: 0.9,
          sacredSiteBonusMultiplier: 1.5,
          communalBonusMultiplier: 1.5,
          maxFervorMultiplier: 5.0,
          beliefStalenessRate: 0.001,
          beliefTheftAllowed: true,
          beliefTheftEfficiency: 0.5,
        },
        powers: {
          globalCostMultiplier: 0.7,
          powerCostMultipliers: {},
          disabledPowers: [],
          globalRangeMultiplier: 1.5,
          powerRangeMultipliers: {},
          globalDurationMultiplier: 1.5,
          powerDurationMultipliers: {},
          globalCooldownMultiplier: 0.7,
          powerCooldownMultipliers: {},
          basePowerSuccessRate: 0.95,
          offDomainFailureChance: 0.1,
          offDomainCostMultiplier: 1.3,
          identityRiskMultiplier: 0.5,
          powerResistanceAllowed: false,
          baseResistanceChance: 0,
          powerVisibility: {
            visibilityMultiplier: 1.5,
            minimumVisibleTier: 'minor',
            stealthActionsAllowed: true,
            stealthCostMultiplier: 1.2,
          },
          prayers: {
            hearNonBelieverPrayers: true,
            maxPendingPrayers: 100,
            prayerExpiryTime: 168,
            beliefPerPrayer: 0.15,
            answeredPrayerFaithBoost: 0.2,
            ignoredPrayerFaithPenalty: 0.02,
          },
          visions: {
            costMultiplier: 0.8,
            misinterpretationPossible: false,
            baseMisinterpretationChance: 0,
            clarityRange: [0.7, 1.0],
            maxConcurrentVisions: 10,
          },
          blessings: {
            costMultiplier: 0.8,
            durationMultiplier: 1.5,
            maxActiveBlessings: 50,
            disabledBlessingTypes: [],
            strengthMultiplier: 1.3,
            removalByOtherGodsAllowed: false,
            removalCostMultiplier: 2.0,
          },
          curses: {
            costMultiplier: 0.8,
            durationMultiplier: 1.0,
            maxActiveCurses: 30,
            disabledCurseTypes: [],
            strengthMultiplier: 1.0,
            liftableByPrayer: true,
            prayerLiftDifficulty: 0.3,
            backlashChance: 0.05,
          },
        },
      };

    case 'grimdark':
      return {
        coreParams: {
          divinePresence: 0.4,
          divineReliability: 0.5,
          mortalSignificance: 0.2,
          faithVolatility: 0.8,
          permanentDivineDeathPossible: true,
          intentionalDeityCreation: false,
          maxActiveDeities: 20,
          playerGodAdvantage: 1.0,
          divineTimeScale: 2.0,
        },
        beliefEconomy: {
          generationMultiplier: 0.6,
          activityMultipliers: {
            sacrifice: 2.0, // Sacrifice is rewarded
            miracle_witness: 3.0,
          },
          decayMultiplier: 2.0,
          existenceThreshold: 50,
          tierThresholdMultipliers: {
            dormant: 1.0, minor: 1.5, moderate: 2.0,
            major: 2.5, supreme: 3.0, world_shaping: 4.0,
          },
          maxBeliefStorage: 20000,
          transferEfficiency: 0.5,
          sacredSiteBonusMultiplier: 0.8,
          communalBonusMultiplier: 0.5,
          maxFervorMultiplier: 10.0,
          beliefStalenessRate: 0.01,
          beliefTheftAllowed: true,
          beliefTheftEfficiency: 0.8,
        },
        powers: {
          globalCostMultiplier: 2.0,
          powerCostMultipliers: {
            heal_wound: 3.0,
            heal_mortal_wound: 5.0,
            resurrect_recent: 10.0,
          },
          disabledPowers: ['resurrect_old', 'mass_blessing'],
          globalRangeMultiplier: 0.7,
          powerRangeMultipliers: {},
          globalDurationMultiplier: 0.5,
          powerDurationMultipliers: {},
          globalCooldownMultiplier: 2.0,
          powerCooldownMultipliers: {},
          basePowerSuccessRate: 0.7,
          offDomainFailureChance: 0.4,
          offDomainCostMultiplier: 2.5,
          identityRiskMultiplier: 2.0,
          powerResistanceAllowed: true,
          baseResistanceChance: 0.2,
          powerVisibility: {
            visibilityMultiplier: 0.5,
            minimumVisibleTier: 'major',
            stealthActionsAllowed: true,
            stealthCostMultiplier: 1.0,
          },
          prayers: {
            hearNonBelieverPrayers: false,
            maxPendingPrayers: 20,
            prayerExpiryTime: 24,
            beliefPerPrayer: 0.05,
            answeredPrayerFaithBoost: 0.1,
            ignoredPrayerFaithPenalty: 0.1,
          },
          visions: {
            costMultiplier: 1.5,
            misinterpretationPossible: true,
            baseMisinterpretationChance: 0.4,
            clarityRange: [0.2, 0.7],
            maxConcurrentVisions: 3,
          },
          blessings: {
            costMultiplier: 2.0,
            durationMultiplier: 0.5,
            maxActiveBlessings: 10,
            disabledBlessingTypes: ['longevity'],
            strengthMultiplier: 0.8,
            removalByOtherGodsAllowed: true,
            removalCostMultiplier: 0.5,
          },
          curses: {
            costMultiplier: 0.8,
            durationMultiplier: 2.0,
            maxActiveCurses: 50,
            disabledCurseTypes: [],
            strengthMultiplier: 1.5,
            liftableByPrayer: false,
            prayerLiftDifficulty: 0.9,
            backlashChance: 0.02,
          },
        },
        restrictions: {
          disabledFeatures: ['resurrection'],
          levelCaps: {
            maxPowerTier: 'supreme',
            maxAngelRank: 'greater',
            maxBelief: 20000,
            maxBelievers: 5000,
          },
          interactions: {
            godsCanKillGods: true,
            godsCanMergeDomains: false,
            godsCanStealDomains: true,
            godsCanCreateMortals: false,
            godsCanDestroyWorld: false,
          },
          playerRestrictions: {
            canBeKilled: true,
            canLoseDomain: true,
            canBeForced: false,
            minimumBelief: 10,
          },
        },
      };

    case 'deistic':
      return {
        coreParams: {
          divinePresence: 0.1,
          divineReliability: 1.0,
          mortalSignificance: 0.1,
          faithVolatility: 0.1,
          permanentDivineDeathPossible: false,
          intentionalDeityCreation: false,
          maxActiveDeities: 5,
          playerGodAdvantage: 1.0,
          divineTimeScale: 10.0,
        },
        beliefEconomy: {
          generationMultiplier: 0.3,
          activityMultipliers: {
            meditation: 2.0,
            creation: 3.0,
          },
          decayMultiplier: 0.1,
          existenceThreshold: 1,
          tierThresholdMultipliers: {
            dormant: 1.0, minor: 5.0, moderate: 10.0,
            major: 20.0, supreme: 50.0, world_shaping: 100.0,
          },
          maxBeliefStorage: 1000000,
          transferEfficiency: 1.0,
          sacredSiteBonusMultiplier: 0.5,
          communalBonusMultiplier: 0.2,
          maxFervorMultiplier: 1.5,
          beliefStalenessRate: 0.0001,
          beliefTheftAllowed: false,
          beliefTheftEfficiency: 0,
        },
        powers: {
          globalCostMultiplier: 5.0,
          powerCostMultipliers: {},
          disabledPowers: [
            'whisper', 'subtle_sign', 'voice_of_god',
            'clear_vision', 'minor_miracle',
          ],
          globalRangeMultiplier: 10.0,
          powerRangeMultipliers: {},
          globalDurationMultiplier: 10.0,
          powerDurationMultipliers: {},
          globalCooldownMultiplier: 10.0,
          powerCooldownMultipliers: {},
          basePowerSuccessRate: 1.0,
          offDomainFailureChance: 0,
          offDomainCostMultiplier: 1.5,
          identityRiskMultiplier: 0,
          powerResistanceAllowed: false,
          baseResistanceChance: 0,
          powerVisibility: {
            visibilityMultiplier: 0.1,
            minimumVisibleTier: 'world_shaping',
            stealthActionsAllowed: true,
            stealthCostMultiplier: 1.0,
          },
          prayers: {
            hearNonBelieverPrayers: false,
            maxPendingPrayers: 1000,
            prayerExpiryTime: 8760, // 1 year
            beliefPerPrayer: 0.01,
            answeredPrayerFaithBoost: 0.5,
            ignoredPrayerFaithPenalty: 0.001,
          },
          visions: {
            costMultiplier: 10.0,
            misinterpretationPossible: true,
            baseMisinterpretationChance: 0.8,
            clarityRange: [0.1, 0.4],
            maxConcurrentVisions: 1,
          },
          blessings: {
            costMultiplier: 5.0,
            durationMultiplier: 100.0,
            maxActiveBlessings: 5,
            disabledBlessingTypes: [],
            strengthMultiplier: 2.0,
            removalByOtherGodsAllowed: false,
            removalCostMultiplier: 10.0,
          },
          curses: {
            costMultiplier: 5.0,
            durationMultiplier: 100.0,
            maxActiveCurses: 5,
            disabledCurseTypes: [],
            strengthMultiplier: 2.0,
            liftableByPrayer: false,
            prayerLiftDifficulty: 1.0,
            backlashChance: 0,
          },
        },
        avatars: {
          avatarsAllowed: false,
          manifestationThreshold: 999999,
          manifestationCost: 999999,
          maintenanceCostMultiplier: 100,
          maxSimultaneousAvatars: 0,
          allowedFormTypes: [],
          disabledFormTypes: [],
          powerLevelMultiplier: 0,
          statMultipliers: {
            health: 0, strength: 0, speed: 0, perception: 0,
            charisma: 0, wisdom: 0, resistance: 0, divinePower: 0,
          },
          deathCooldown: 999999,
          permanentDeath: true,
          tellSuppressionAllowed: false,
          tellSuppressionCostMultiplier: 100,
          abilityCostMultiplier: 100,
          manifestationAlertsOtherGods: true,
        },
        angels: {
          angelsAllowed: false,
          creationThreshold: 999999,
          creationCostMultiplier: 100,
          maintenanceCostMultiplier: 100,
          maxAngelsByRank: {
            lesser: 0, common: 0, greater: 0, arch: 0, supreme: 0,
          },
          allowedAngelTypes: [],
          maxAvailableRank: 'lesser',
          powerMultiplier: 0,
          permanentDeath: true,
          respawnCooldown: 999999,
          abilityCostMultiplier: 100,
          disobediencePossible: false,
          baseDisobedienceChance: 0,
          corruptionPossible: false,
        },
        restrictions: {
          disabledFeatures: ['avatars', 'angels', 'divine_chat', 'divine_war'],
          levelCaps: {
            maxPowerTier: 'world_shaping',
            maxAngelRank: 'lesser',
            maxBelief: 1000000,
            maxBelievers: 100000,
          },
          interactions: {
            godsCanKillGods: false,
            godsCanMergeDomains: false,
            godsCanStealDomains: false,
            godsCanCreateMortals: true,
            godsCanDestroyWorld: true,
          },
          playerRestrictions: {
            canBeKilled: false,
            canLoseDomain: false,
            canBeForced: false,
            minimumBelief: 0,
          },
        },
      };

    case 'balanced':
    default:
      return getDefaultConfig();
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/** Get default/balanced configuration */
export function getDefaultConfig(): Partial<UniverseDivineConfig> {
  return {
    coreParams: {
      divinePresence: 0.5,
      divineReliability: 0.8,
      mortalSignificance: 0.5,
      faithVolatility: 0.5,
      permanentDivineDeathPossible: false,
      intentionalDeityCreation: false,
      maxActiveDeities: 30,
      playerGodAdvantage: 1.1,
      divineTimeScale: 1.0,
    },
    beliefEconomy: {
      generationMultiplier: 1.0,
      activityMultipliers: {},
      decayMultiplier: 1.0,
      existenceThreshold: 10,
      tierThresholdMultipliers: {
        dormant: 1.0, minor: 1.0, moderate: 1.0,
        major: 1.0, supreme: 1.0, world_shaping: 1.0,
      },
      maxBeliefStorage: 50000,
      transferEfficiency: 0.8,
      sacredSiteBonusMultiplier: 1.0,
      communalBonusMultiplier: 1.0,
      maxFervorMultiplier: 3.0,
      beliefStalenessRate: 0.005,
      beliefTheftAllowed: true,
      beliefTheftEfficiency: 0.3,
    },
    powers: {
      globalCostMultiplier: 1.0,
      powerCostMultipliers: {},
      disabledPowers: [],
      globalRangeMultiplier: 1.0,
      powerRangeMultipliers: {},
      globalDurationMultiplier: 1.0,
      powerDurationMultipliers: {},
      globalCooldownMultiplier: 1.0,
      powerCooldownMultipliers: {},
      basePowerSuccessRate: 0.9,
      offDomainFailureChance: 0.2,
      offDomainCostMultiplier: 1.5,
      identityRiskMultiplier: 1.0,
      powerResistanceAllowed: true,
      baseResistanceChance: 0.1,
      powerVisibility: {
        visibilityMultiplier: 1.0,
        minimumVisibleTier: 'moderate',
        stealthActionsAllowed: true,
        stealthCostMultiplier: 1.5,
      },
      prayers: {
        hearNonBelieverPrayers: true,
        maxPendingPrayers: 50,
        prayerExpiryTime: 72,
        beliefPerPrayer: 0.1,
        answeredPrayerFaithBoost: 0.15,
        ignoredPrayerFaithPenalty: 0.05,
      },
      visions: {
        costMultiplier: 1.0,
        misinterpretationPossible: true,
        baseMisinterpretationChance: 0.2,
        clarityRange: [0.4, 0.9],
        maxConcurrentVisions: 5,
      },
      blessings: {
        costMultiplier: 1.0,
        durationMultiplier: 1.0,
        maxActiveBlessings: 20,
        disabledBlessingTypes: [],
        strengthMultiplier: 1.0,
        removalByOtherGodsAllowed: true,
        removalCostMultiplier: 1.5,
      },
      curses: {
        costMultiplier: 1.0,
        durationMultiplier: 1.0,
        maxActiveCurses: 20,
        disabledCurseTypes: [],
        strengthMultiplier: 1.0,
        liftableByPrayer: true,
        prayerLiftDifficulty: 0.5,
        backlashChance: 0.1,
      },
    },
  };
}

// ============================================================================
// Configuration Utilities
// ============================================================================

/** Calculate effective power cost */
export function calculateEffectivePowerCost(
  baseCost: number,
  powerType: DivinePowerType,
  config: PowerConfig,
  isOffDomain: boolean
): number {
  let cost = baseCost;

  // Apply global multiplier
  cost *= config.globalCostMultiplier;

  // Apply power-specific multiplier
  if (config.powerCostMultipliers[powerType]) {
    cost *= config.powerCostMultipliers[powerType]!;
  }

  // Apply off-domain multiplier
  if (isOffDomain) {
    cost *= config.offDomainCostMultiplier;
  }

  return Math.ceil(cost);
}

/** Calculate effective power range */
export function calculateEffectiveRange(
  baseRange: number,
  powerType: DivinePowerType,
  config: PowerConfig
): number {
  let range = baseRange;

  range *= config.globalRangeMultiplier;

  if (config.powerRangeMultipliers[powerType]) {
    range *= config.powerRangeMultipliers[powerType]!;
  }

  return Math.floor(range);
}

/** Calculate effective duration */
export function calculateEffectiveDuration(
  baseDuration: number,
  powerType: DivinePowerType,
  config: PowerConfig
): number {
  let duration = baseDuration;

  duration *= config.globalDurationMultiplier;

  if (config.powerDurationMultipliers[powerType]) {
    duration *= config.powerDurationMultipliers[powerType]!;
  }

  return Math.floor(duration);
}

/** Check if power is available in universe */
export function isPowerAvailable(
  powerType: DivinePowerType,
  config: PowerConfig
): boolean {
  return !config.disabledPowers.includes(powerType);
}

/** Check if feature is available */
export function isFeatureAvailable(
  feature: DivinityFeature,
  restrictions: RestrictionConfig
): boolean {
  return !restrictions.disabledFeatures.includes(feature);
}

/** Merge configs with overrides */
export function mergeConfigs(
  base: Partial<UniverseDivineConfig>,
  overrides: Partial<UniverseDivineConfig>
): Partial<UniverseDivineConfig> {
  return {
    ...base,
    ...overrides,
    coreParams: { ...base.coreParams, ...overrides.coreParams } as CoreDivineParams,
    beliefEconomy: { ...base.beliefEconomy, ...overrides.beliefEconomy } as BeliefEconomyConfig,
    powers: {
      ...base.powers,
      ...overrides.powers,
      powerVisibility: {
        ...base.powers?.powerVisibility,
        ...overrides.powers?.powerVisibility,
      } as PowerVisibilityConfig,
      prayers: { ...base.powers?.prayers, ...overrides.powers?.prayers } as PrayerConfig,
      visions: { ...base.powers?.visions, ...overrides.powers?.visions } as VisionConfig,
      blessings: { ...base.powers?.blessings, ...overrides.powers?.blessings } as BlessingConfig,
      curses: { ...base.powers?.curses, ...overrides.powers?.curses } as CurseConfig,
    } as PowerConfig,
    avatars: { ...base.avatars, ...overrides.avatars } as AvatarConfig,
    angels: { ...base.angels, ...overrides.angels } as AngelConfig,
    restrictions: { ...base.restrictions, ...overrides.restrictions } as RestrictionConfig,
  };
}

/** Create universe config from preset with custom overrides */
export function createUniverseConfig(
  universeId: string,
  name: string,
  preset: UniversePreset,
  overrides: Partial<UniverseDivineConfig> = {}
): Partial<UniverseDivineConfig> {
  const presetConfig = getPresetConfig(preset);
  return {
    universeId,
    name,
    ...mergeConfigs(presetConfig, overrides),
  };
}
