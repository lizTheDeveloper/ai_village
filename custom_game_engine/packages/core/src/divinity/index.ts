/**
 * Divinity System - Core types for the divine gameplay system
 *
 * This module provides the complete type system for the divinity mechanics:
 * - Belief: The resource that powers gods
 * - Deities: Emergent divine entities shaped by worshippers
 * - Myths: Stories that define deity identity
 * - Powers: Divine actions and their costs
 * - Pantheons: Relationships between gods
 * - Chat: Divine communication system
 * - Avatars: Physical manifestations of deities
 * - Angels: Divine servants and agents
 * - Religion: Temples, priests, and holy texts
 */

// ============================================================================
// Belief System
// ============================================================================
export {
  // Types
  type BeliefActivity,
  type BeliefGeneration,
  type BeliefCalculation,
  type DeityBeliefState,
  type BeliefDecayConfig,
  type BeliefAllocation,
  type BeliefRelationshipType,
  type BeliefTransfer,
  type BeliefTransferReason,
  type BeliefEvent,
  type BeliefEventType,

  // Constants
  BELIEF_GENERATION_RATES,
  BELIEF_THRESHOLDS,
  DEFAULT_BELIEF_DECAY,

  // Functions
  createInitialBeliefState,
  calculateBeliefGeneration,
} from './BeliefTypes.js';

// ============================================================================
// Deity System
// ============================================================================
export {
  // Types
  type DivineDomain,
  type PerceivedPersonality,
  type MoralAlignment,
  type DescribedForm,
  type DeityIdentity,
  type DeityController,
  type DeityOrigin,
  type EmergencePhase,
  type Deity,
  type PlayerGodState,
  type BelieverRelation,

  // Functions
  createDefaultPersonality,
  createBlankIdentity,
  createEmergentIdentity,
} from './DeityTypes.js';

// ============================================================================
// Myth System
// ============================================================================
export {
  // Types
  type MythCategory,
  type MythStatus,
  type DisputeLevel,
  type TraitImplication,
  type NarrativeStructure,
  type MythElements,
  type MythCharacter,
  type MythTime,
  type Myth,
  type MutationType,
  type MythMutation,
  type StoryTelling,
  type TellingContext,
  type AudienceReaction,
  type MythConflict,
  type MythConflictType,
  type MythGenerationRequest,
  type MythTrigger,

  // Functions
  createMythTemplate,
  calculateMythInfluence,
} from './MythTypes.js';

// ============================================================================
// Divine Power System
// ============================================================================
export {
  // Types
  type PowerTier,
  type PowerCategory,
  type DivinePowerType,
  type DivinePower,
  type PowerVisibility,
  type PowerUseRequest,
  type PowerTarget,
  type PowerStyle,
  type PowerUseResult,
  type PowerEffect,
  type PowerFailureReason,
  type IdentityImplication,
  type IdentityRiskAssessment,
  type DomainPowerAffinity,
  type Prayer,
  type PrayerType,
  type PrayerEmotion,
  type PrayerRequest,
  type PrayerResponse,
  type DivineVision,
  type VisionContent,
  type ActiveBlessing,
  type BlessingType,
  type ActiveCurse,
  type CurseType,
  type CurseLiftCondition,

  // Constants
  POWER_TIER_THRESHOLDS,
  DOMAIN_POWER_AFFINITIES,

  // Functions
  getTierForBelief,
  canUsePower,
  getDomainCostModifier,
  createPrayer,
} from './DivinePowerTypes.js';

// ============================================================================
// Pantheon System
// ============================================================================
export {
  // Types
  type PantheonStructure,
  type Pantheon,
  type PantheonPolitics,
  type PantheonFaction,
  type PantheonRelation,
  type DivineRelationship,
  type DivineRelationshipType,
  type DivineFeeling,
  type DivineFormalStatus,
  type RelationshipOrigin,
  type DivineMatter,
  type DivineMatterType,
  type DivineMatterOption,
  type DivineVote,
  type DiplomaticAction,
  type DiplomaticActionType,
  type DiplomaticTerms,
  type DiplomaticOffer,
  type DivineTreaty,
  type TreatyType,
  type TreatyTerm,
  type DivineConflict,
  type ConflictType,
  type ConflictSide,
  type ConflictPhase,
  type MortalImpact,
  type ConflictResolution,
  type DivineMeeting,
  type MeetingOutcome,
  type DivineChatMessage,

  // Functions
  createRelationship,
  createPantheon,
  calculateRelationshipStrength,
  getRelationshipSummary,
} from './PantheonTypes.js';

// ============================================================================
// Divine Chat System
// ============================================================================
export {
  // Types
  type DivineChatConfig,
  type DivineChatRoom,
  type TypingIndicator,
  type ChatMessageType,
  type MessageTone,
  type ChatStyle,
  type ChatQuirk,
  type MessageReaction,
  type ReactionType,
  type ChatNotification,
  type ChatNotificationType,
  type PrivateDMConversation,
  type PrivateDMMessage,
  type SendDMRequest,
  type ChatResponseRequest,
  type ChatResponseResult,
  type ChatEvent,
  type ChatEventType,
  type PlayerChatActions,
  type ChatStateSummary,

  // Constants
  DEFAULT_CHAT_CONFIG,

  // Functions
  createChatRoom,
  createEntryNotification,
  createChatMessage,
  getChatStyleFromPersonality,
  shouldChatBeActive,
  areDMsAvailable,
  formatNotification,
} from './DivineChatTypes.js';

export {
  // Component
  type DivineChatComponent,
  createDivineChatComponent,
} from '../components/DivineChatComponent.js';

export {
  // System
  DivineChatSystem,
} from '../systems/DivineChatSystem.js';

// ============================================================================
// Avatar System
// ============================================================================
export {
  // Types
  type AvatarConfig,
  type Avatar,
  type AvatarForm,
  type AvatarFormType,
  type AvatarSize,
  type MovementType,
  type DivineTell,
  type DivineTellType,
  type AvatarStats,
  type AvatarState,
  type AvatarActivity,
  type AvatarStatusEffect,
  type AvatarDisguise,
  type AvatarAbility,
  type AvatarAbilityType,
  type AvatarInventoryItem,
  type AvatarEvent,
  type AvatarEventType,
  type AvatarPlayerActions,
  type AvatarInteraction,
  type AvatarInteractionAction,
  type ManifestAvatarRequest,
  type ManifestAvatarResult,
  type AvatarManifestFailure,

  // Constants
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_AVATAR_STATS,

  // Functions
  createAvatarStats,
  createAvatarForm,
  calculateAvatarMaintenance,
  shouldForceWithdraw,
} from './AvatarTypes.js';

// ============================================================================
// Angel System
// ============================================================================
export {
  // Types
  type AngelConfig,
  type Angel,
  type AngelType,
  type AngelRank,
  type AngelForm,
  type AngelAppearance,
  type AngelStats,
  type AngelState,
  type AngelActivity,
  type AngelStatusEffect,
  type AngelPersonality,
  type AngelAbility,
  type AngelAbilityType,
  type AngelOrders,
  type AngelOrderType,
  type AngelReport,
  type AngelEvent,
  type AngelEventType,
  type CreateAngelRequest,
  type CreateAngelResult,
  type AngelCreationFailure,

  // Constants
  DEFAULT_ANGEL_CONFIG,
  ANGEL_STATS_BY_RANK,

  // Functions
  createAngelStats,
  createAngelForm,
  createAngelPersonality,
  calculateAngelMaintenance,
} from './AngelTypes.js';

// ============================================================================
// Religion System
// ============================================================================
export {
  // Types
  type Temple,
  type TempleType,
  type TempleSize,
  type TempleFeature,
  type SacredObject,
  type ScheduledRitual,
  type Priest,
  type PriestRank,
  type PriestRole,
  type TheologicalPosition,
  type Ritual,
  type RitualType,
  type RitualFrequency,
  type RitualLocation,
  type RitualItem,
  type RitualEffect,
  type RitualStep,
  type HolyText,
  type HolyTextType,
  type HolyTextStatus,
  type ReligiousMovement,
  type ReligiousMovementType,
  type Schism,
  type SchismCause,
  type Syncretism,
  type SyncreticElement,
  type Conversion,
  type ConversionTrigger,

  // Functions
  createShrine,
  createRitual,
  calculateTempleBeliefBonus,
  calculatePriestEffectiveness,
} from './ReligionTypes.js';

// ============================================================================
// Universe Configuration
// ============================================================================
export {
  // Types
  type UniverseDivineConfig,
  type CoreDivineParams,
  type BeliefEconomyConfig,
  type PowerConfig,
  type PowerVisibilityConfig,
  type PrayerConfig,
  type VisionConfig,
  type BlessingConfig,
  type CurseConfig,
  type AvatarConfig as UniverseAvatarConfig,
  type AngelConfig as UniverseAngelConfig,
  type PantheonConfig,
  type ReligionConfig,
  type EmergenceConfig,
  type ChatConfig,
  type DomainModifier,
  type RestrictionConfig,
  type DivinityFeature,
  type UniversePreset,

  // Functions
  getPresetConfig,
  getDefaultConfig,
  calculateEffectivePowerCost,
  calculateEffectiveRange,
  calculateEffectiveDuration,
  isPowerAvailable,
  isFeatureAvailable,
  mergeConfigs,
  createUniverseConfig,
} from './UniverseConfig.js';

// ============================================================================
// Divine Servant System (Emergent Hierarchies)
// ============================================================================
export {
  // Types
  type ServantTemplate,
  type ServantFormTemplate,
  type ServantFormCategory,
  type ServantComposition,
  type ServantMovement,
  type ServantAppendage,
  type ServantCommunication,
  type ServantPersonalityTemplate,
  type ServantMortalAttitude,
  type ServantAbilityTemplate,
  type ServantAbilityCategory,
  type ServantStats,
  type DivineServant,
  type ServantPersonalityInstance,
  type ServantState,
  type ServantStatusEffect,
  type ServantOrders,
  type EvolvedTrait,
  type DivineHierarchy,
  type GenerateServantTemplateRequest,
  type GenerateServantTemplateResult,
  type PlayerServantDesign,

  // Power Granting Types
  type ServantPowerGrant,
  type GrantedPower,
  type PowerManifestation,
  type PowerRestriction,
  type GrantPowerRequest,
  type GrantPowerResult,
  type GrantPowerFailure,

  // Constants
  POWER_BUDGET_BY_RANK,

  // Functions
  playerDesignToTemplate,
  createDivineHierarchy,
  createServantFromTemplate,
  calculateHierarchyMaintenance,
  calculatePowerBudgetCost,
  getPowerBudgetForRank,
  createServantPowerGrant,
  createPowerManifestation,

  // Example hierarchies
  EXAMPLE_WAR_GOD_HIERARCHY,
  EXAMPLE_NATURE_DEITY_HIERARCHY,
  EXAMPLE_COSMIC_HORROR_HIERARCHY,
} from './DivineServantTypes.js';

// ============================================================================
// AI God Personality (Phase 4)
// ============================================================================
export {
  // Types
  type DeityGoalType,
  type DeityGoal,
  type PersonalityGenerationContext,
  type GeneratedPersonality,
  type VoiceCharacter,

  // Functions
  generatePersonalityPrompt,
  parsePersonalityResponse,
  generateArchetypePersonality,
} from './AIGodPersonality.js';

// ============================================================================
// Deity Relations (Phase 4)
// ============================================================================
export {
  // Types
  type RelationshipStatus,
  type DeityRelation,
  type RelationshipEvent,
  type RivalryReason,
  type RivalryFactors,
  type AllianceReason,
  type AllianceFactors,

  // Functions
  calculateInitialRelationship,
  calculateDomainSynergy,
  calculateRivalryFactors,
  calculateAllianceFactors,
  updateRelationshipFromEvent,
  createNeutralRelationship,
} from './DeityRelations.js';

// ============================================================================
// Vision Delivery System
// ============================================================================
export {
  // Types
  type VisionDeliveryMethod,
  type VisionClarity,
  type VisionPurpose,
  type VisionContent as VisionSystemContent,
  type DivineVision as VisionDeliveryVision,
  type VisionCostConfig,

  // Constants
  VISION_TEMPLATES,

  // Classes
  VisionDeliverySystem,

  // Functions
  createVisionDeliverySystem,
} from './VisionDeliverySystem.js';

// ============================================================================
// LLM Vision Generation
// ============================================================================
export {
  // Types
  type VisionGenerationRequest,

  // Classes
  LLMVisionGenerator,

  // Functions
  createLLMVisionGenerator,
} from './LLMVisionGenerator.js';

// ============================================================================
// Multiverse Crossing System
// ============================================================================
export {
  // Cost constants
  BASE_CROSSING_COSTS,

  // Types
  type CrossingEntityType,
  type UniverseCompatibility,
  type CompatibilityFactors,
  type PassageType,
  type PassageTypeConfig,
  type MultiversePassage,
  type PassageAccessPolicy,
  type CrossingRecord,
  type CrossingMethod,
  type CrossingMethodConfig,
  type CrossingAttempt,
  type CrossingStatus,
  type TransitHazardType,
  type TransitHazard,
  type CrossingCostCalculation,
  type PassageCreationCost,
  type CrossingResult,
  type PresenceExtensionState,
  type DivineProjection,
  type CollectivePassageContribution,

  // Passage configs
  PASSAGE_CONFIGS,
  CROSSING_METHODS,
  HAZARD_TEMPLATES,
  COMPATIBILITY_PRESETS,

  // Entity type helper
  getEntityTypeForCrossing,

  // Compatibility helpers
  calculateCompatibilityScore,
  getCompatibilityLevel,
  createUniverseCompatibility,

  // Passage functions
  createPassage,
  needsMaintenance,
  applyMaintenanceNeglect,
  maintainPassage,

  // Crossing functions
  getAvailableCrossingMethods,
  calculateCrossingCost,
  calculatePassageCreationCost,
  executeCrossing,
  canAttemptCrossing,
  canCreatePassageType,
  getCrossingOptions,

  // Special methods
  startPresenceExtension,
  createDivineProjection,
  calculateCollectiveContributions,
} from './MultiverseCrossing.js';

// ============================================================================
// Race Templates (Organized by Pantheon)
// ============================================================================
export {
  // Common traits
  COMMON_TRAITS,

  // Greek/Olympian races
  OLYMPIAN_RACE,
  DEMIGOD_RACE,
  NYMPH_RACE,
  SATYR_RACE,

  // Celtic Fey races
  SIDHE_RACE,
  PIXIE_RACE,
  REDCAP_RACE,

  // Underworld races
  SHADE_RACE,
  FURY_RACE,

  // Norse races
  AESIR_RACE,
  VALKYRIE_RACE,
  EINHERJAR_RACE,

  // Celestial races
  SERAPH_RACE,
  ANGEL_RACE,

  // Dream Realm races
  ONEIROI_RACE,
  NIGHTMARE_RACE,

  // Elemental races
  EFREET_RACE,

  // Pantheon groupings
  GREEK_RACES,
  CELTIC_RACES,
  UNDERWORLD_RACES,
  NORSE_RACES,
  CELESTIAL_RACES,
  DREAM_RACES,
  ELEMENTAL_RACES,
  ALL_RACES,

  // Pantheon metadata
  PANTHEONS,
  // Note: type Pantheon conflicts with PantheonTypes.Pantheon - use races/index.js directly if needed
} from './races/index.js';

// ============================================================================
// Afterlife Policy System
// ============================================================================
export {
  // Types
  type AfterlifePolicyType,
  type JudgmentCriteria,
  type JudgmentTier,
  type ReincarnationTarget,
  type MemoryRetention,
  type SpeciesConstraint,
  type ReincarnationConfig,
  type TransformationType,
  type TransformationConfig,
  type DeedCategory,
  type DeedWeight,
  type AfterlifePolicy,

  // Factory Functions
  createJudgmentPolicy,
  createReincarnationPolicy,
  createUnconditionalPolicy,
  createAnnihilationPolicy,
  createTransformationPolicy,

  // Example Policies
  WAR_GOD_POLICY,
  NATURE_DEITY_POLICY,
  MYSTERY_GOD_POLICY,
  COSMIC_HORROR_POLICY,
} from './AfterlifePolicy.js';

// ============================================================================
// Underworld Deity (Death Domain Primordial)
// ============================================================================
export {
  // Constants
  UNDERWORLD_PERSONALITY,
  UNDERWORLD_FORMS,
  UNDERWORLD_SACRED_ANIMALS,
  UNDERWORLD_SACRED_PLANTS,
  UNDERWORLD_SYMBOLS,
  UNDERWORLD_COLORS,
  UNDERWORLD_SACRED_PLACES,
  UNDERWORLD_EPITHETS,
  UNDERWORLD_NAMES,
  UNDERWORLD_BLESSINGS,
  UNDERWORLD_CURSES,
  UNDERWORLD_TABOOS,

  // Functions
  createUnderworldIdentity,
  createUnderworldDeity,
  getUnderworldOfferings,
  getUnderworldPrayerTypes,
  isUnderworldTaboo,
  getContextualEpithet,
} from './UnderworldDeity.js';

// ============================================================================
// Attribution System (Divine Misattribution)
// ============================================================================
export {
  // Types
  type TrueSourceType,
  type TrueSource,
  type ObservableEffect,
  type EffectCategory,
  type EffectCharacteristics,
  type AttributionFactors,
  type AttributionResult,
  type AttributedSource,
  type AttributionReasoning,
  type AttributionReason,
  type AttributableEvent,
  type AttributionStatistics,

  // Constants
  EFFECT_DOMAIN_MAPPING,

  // Functions
  calculateAttribution,
  createAttributableEvent,
  processWitnessAttribution,
  createCreatorInterventionSource,
  createSmiteEffect,
  createAttributionStatistics,
  updateAttributionStatistics,
} from './AttributionSystem.js';

// ============================================================================
// God of Death Entity
// ============================================================================
export {
  // Functions
  createGodOfDeath,
  findGodOfDeath,
  moveGodOfDeath,
  isGodOfDeath,
} from './GodOfDeathEntity.js';

// ============================================================================
// Goddess of Wisdom Entity
// ============================================================================
export {
  // Functions
  createGoddessOfWisdom,
  findGoddessOfWisdom,
  moveGoddessOfWisdom,
  isGoddessOfWisdom,
  getScrutinyStyle,
} from './GoddessOfWisdomEntity.js';

export {
  // Types
  type WisdomGoddessConfig,

  // Constants
  WISDOM_GODDESS_REGISTRY,

  // Functions
  getWisdomGoddessByName,
  getWisdomGoddessByIndex,
  getRandomWisdomGoddess,
  getAllWisdomGoddessNames,
  getWisdomGoddessSpritePath,
} from './WisdomGoddessSpriteRegistry.js';

export {
  // Types
  type ScrutinyStyle,
  type WisdomScrutinyResult,

  // Constants
  // (thresholds are internal)

  // Functions
  heuristicWisdomScrutiny,
  buildWisdomScrutinyPrompt,
  parseWisdomScrutinyResponse,
  getDefaultScrutinyStyle,
} from './WisdomGoddessScrutiny.js';

// ============================================================================
// Riddle Generation System
// ============================================================================
export {
  // Types
  type GeneratedRiddle,
  type HeroContext,

  // Class
  RiddleGenerator,
} from './RiddleGenerator.js';
