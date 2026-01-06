/**
 * Magic System - Multiverse-aware magic paradigms
 *
 * This module provides a generalized magic framework that can express
 * fundamentally different magical paradigms based on universe rules.
 *
 * Key concepts:
 * - MagicParadigm: Universe-level magic rule definitions
 * - MagicLawEnforcer: Validates spells against paradigm laws
 * - CoreParadigms: Foundational paradigms (academic, pact, names, etc.)
 *
 * See: openspec/specs/magic-system/paradigm-spec.md
 */

// ============================================================================
// Re-exports from Core (for convenience)
// ============================================================================

export type {
  MagicTechnique,
  MagicForm,
  World,
  Entity,
  MagicComponent,
} from '@ai-village/core';

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Source types
  MagicSourceType,
  RegenerationType,
  Detectability,
  MagicSource,

  // Cost types
  MagicCostType,
  CostRecoveryMethod,
  CostVisibility,
  MagicCost,

  // Channel types
  MagicChannelType,
  ChannelRequirement,
  BlockEffect,
  MagicChannel,

  // Law types
  MagicLawType,
  LawStrictness,
  MagicLaw,

  // Risk types
  MagicRiskTrigger,
  MagicRiskConsequence,
  RiskSeverity,
  MagicRisk,

  // Acquisition types
  AcquisitionMethod,
  AcquisitionRarity,
  AcquisitionDefinition,

  // Combination types
  ForbiddenCombination,
  ResonantCombination,

  // Cross-universe types
  ForeignMagicPolicy,
  ForeignMagicEffect,
  ForeignMagicConfig,
  PowerScaling,
  ParadigmInteraction,
  ParadigmAdaptation,
  CrossUniverseMage,

  // The paradigm itself
  MagicParadigm,
} from './MagicParadigm.js';

// ============================================================================
// Factory Functions
// ============================================================================

export {
  createEmptyParadigm,
  createManaSource,
  createManaCost,
  createStandardChannels,
  createConservationLaw,
  createStudyAcquisition,
  validateParadigm,
} from './MagicParadigm.js';

// ============================================================================
// Core Paradigms
// ============================================================================

export {
  ACADEMIC_PARADIGM,
  PACT_PARADIGM,
  NAME_PARADIGM,
  BREATH_PARADIGM,
  DIVINE_PARADIGM,
  BLOOD_PARADIGM,
  EMOTIONAL_PARADIGM,
  CORE_PARADIGM_REGISTRY,
  getCoreParadigm,
  getCoreParadigmIds,
  getCoreParadigmsForUniverse,
} from './CoreParadigms.js';

// ============================================================================
// Law Enforcement
// ============================================================================

export type {
  SpellValidationResult,
  SpellCost,
  EvaluatedRisk,
  SpellBonus,
  LawCheckResult,
  CrossParadigmResult,
} from './MagicLawEnforcer.js';

export {
  MagicLawEnforcer,
  createLawEnforcer,
} from './MagicLawEnforcer.js';

// ============================================================================
// Artifact Creation
// ============================================================================

export type {
  EnchantmentMethod,
  EnchantableCategory,
  EnchantmentPermanence,
  ArtifactSentience,
  EnchantmentCost,
  EnchantmentRequirement,
  MaterialRequirement,
  EnchantmentRisk,
  EnchantmentLimits,
  EnchantmentSystem,
} from './ArtifactCreation.js';

export {
  ACADEMIC_ENCHANTMENT,
  BREATH_ENCHANTMENT,
  PACT_ENCHANTMENT,
  NAME_ENCHANTMENT,
  DIVINE_ENCHANTMENT,
  BLOOD_ENCHANTMENT,
  EMOTIONAL_ENCHANTMENT,
  ENCHANTMENT_REGISTRY,
  getEnchantmentSystem,
  canEnchant,
  getSentienceCapableParadigms,
} from './ArtifactCreation.js';

// ============================================================================
// Paradigm Composition (Multi-Paradigm Magic)
// ============================================================================

export type {
  ParadigmRelationship,
  ParadigmLayerConfig,
  ParadigmRelationshipMap,
  ParadigmRelationshipConfig,
  ParadigmMastery,
  MultiParadigmCaster,
  HybridAbility,
  ParadigmInstability,
  HybridParadigm,
  ParadigmInheritance,
  InheritedElements,
  EmergentProperty,
  MultiParadigmArtifact,
  ArtifactEnchantment,
} from './ParadigmComposition.js';

export {
  PARADIGM_RELATIONSHIPS,
  getParadigmRelationship,
  THEURGY_PARADIGM,
  HEMOMANCY_PARADIGM,
  NAMEBREATH_PARADIGM,
  HYBRID_PARADIGM_REGISTRY,
  getHybridParadigm,
  getAvailableHybrids,
  calculateMultiParadigmPower,
  isParadigmCombinationStable,
} from './ParadigmComposition.js';

// ============================================================================
// Unusual/Whimsical Paradigms & LLM Generation
// ============================================================================

export type {
  TalentMagic,
  NarrativeRule,
  PunMagic,
  ProceduralMagicRequest,
  GeneratedSpell,
  GeneratedParadigm,
} from './WhimsicalParadigms.js';

export {
  TALENT_PARADIGM,
  NARRATIVE_PARADIGM,
  PUN_PARADIGM,
  WILD_PARADIGM,
  WHIMSICAL_PARADIGM_REGISTRY,
  generateSpellPrompt,
  generateParadigmPrompt,
  generateTalentPrompt,
  parseGeneratedSpell,
  parseGeneratedParadigm,
} from './WhimsicalParadigms.js';

// ============================================================================
// Null/Anti-Magic Paradigms
// ============================================================================

export {
  NULL_PARADIGM,
  DEAD_PARADIGM,
  ANTI_PARADIGM,
  INVERTED_PARADIGM,
  TECH_SUPREMACY_PARADIGM,
  RATIONAL_PARADIGM,
  SEALED_PARADIGM,
  DIVINE_PROHIBITION_PARADIGM,
  DIVINE_MONOPOLY_PARADIGM,
  NULL_PARADIGM_REGISTRY,
  isNullParadigm,
  canMagicFunction,
} from './NullParadigms.js';

// ============================================================================
// Animist/Spirit-Based Paradigms
// ============================================================================

export type {
  KamiType,
  Kami,
  PurityState,
  PollutionSource,
  SympatheticLink,
  AllomanticMetal,
  Daemon,
} from './AnimistParadigms.js';

export {
  // Paradigms
  SHINTO_PARADIGM,
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  DAEMON_PARADIGM,

  // Registry
  ANIMIST_PARADIGM_REGISTRY,
  getAnimistParadigm,

  // Shinto helpers
  EXAMPLE_KAMI,
  getKamiTypes,
  getKamiByType,

  // Allomancy helpers
  ALLOMANTIC_METALS,
  getAllomanticMetals,
  getMetalsByType,
} from './AnimistParadigms.js';

// ============================================================================
// Magic Skill Trees
// ============================================================================

export type {
  // Unlock conditions
  UnlockConditionType,
  UnlockConditionParams,
  UnlockCondition,

  // Skill nodes
  MagicSkillCategory,
  MagicSkillEffectType,
  MagicSkillEffect,
  MagicSkillNode,

  // Skill tree
  MagicXPSource,
  MagicTreeRules,
  MagicSkillTree,

  // Progress tracking
  MagicDiscoveries,
  MagicSkillProgress,
} from './MagicSkillTree.js';

export {
  // Factory functions
  createMagicSkillProgress,
  createUnlockCondition,
  createSkillNode,
  createSkillEffect,
  createDefaultTreeRules,
  createSkillTree,

  // Utility functions
  getNodeById,
  getNodesByTier,
  getNodesByCategory,
  getNodeLevelCost,
  getEffectValue,
  hasNodeUnlocked,
  getNodeLevel,
  countUnlockedNodes,
  calculateSpentXp,
} from './MagicSkillTree.js';

// ============================================================================
// Skill Tree Evaluation
// ============================================================================

export type {
  ConditionResult,
  NodeEvaluationResult,
  EvaluationContext,
} from './MagicSkillTreeEvaluator.js';

export {
  evaluateCondition,
  evaluateNode,
  evaluateTree,
  getPurchasableNodes,
  getVisibleNodes,
  canAccessTree,
} from './MagicSkillTreeEvaluator.js';

// ============================================================================
// Skill Tree Registry
// ============================================================================

export type {
  TreeValidationError,
  TreeValidationResult,
} from './MagicSkillTreeRegistry.js';

export {
  MagicSkillTreeRegistry,
  getSkillTreeRegistry,
  registerSkillTree,
  getSkillTree,
  hasSkillTree,
} from './MagicSkillTreeRegistry.js';

// ============================================================================
// Paradigm-Specific Skill Trees
// ============================================================================

// Allomancy (Mistborn-inspired)
export {
  ALLOMANCY_SKILL_TREE,
  getMistingMetals,
  isMetalAvailable,
} from './skillTrees/AllomancySkillTree.js';

// Shinto (Kami relationships)
export {
  SHINTO_SKILL_TREE,
  getAvailableKamiTypes,
  isPuritySufficient,
} from './skillTrees/ShintoSkillTree.js';

// Sympathy (Name of the Wind inspired)
export {
  SYMPATHY_SKILL_TREE,
  LINK_TYPES,
  BINDING_PRINCIPLES,
  calculateLinkEfficiency,
  getMaxBindings,
  calculateSlippage,
} from './skillTrees/SympathySkillTree.js';

// Daemon (His Dark Materials inspired)
export {
  DAEMON_SKILL_TREE,
  DAEMON_FORM_CATEGORIES,
  DUST_INTERACTIONS,
  getFormBonuses,
  isFormInCategory,
  getFormCategory,
  getSeparationDistance,
  canSeparate,
  hasSettled,
} from './skillTrees/DaemonSkillTree.js';

// Dream (Lucid dreaming, oneiromancy)
export {
  DREAM_SKILL_TREE,
  DREAM_REALMS,
  SLEEP_STAGES,
  NIGHTMARE_TYPES,
  getAvailableRealms,
  getTimeDilationFactor,
  getMaxSharedDreamers,
  getNightmareResistance,
  canAccessRealm,
} from './skillTrees/DreamSkillTree.js';

// Song (Musical magic, bardic traditions)
export {
  SONG_SKILL_TREE,
  SONG_TYPES,
  MUSICAL_ELEMENTS,
  INSTRUMENT_TYPES,
  getAvailableSongTypes,
  getHarmonyBonus,
  getMaxChoirSize,
  getInstrumentProficiency,
  hasPowerWords,
} from './skillTrees/SongSkillTree.js';

// Name (Earthsea-inspired true names)
export {
  NAME_SKILL_TREE,
  NAME_CATEGORIES,
  NAME_MASTERY_LEVELS,
  NAME_EFFECTS,
  getAvailableCategories,
  getSpeakingPowerBonus,
  getNameProtection,
  canLearnCategory,
  hasMasterNaming,
} from './skillTrees/NameSkillTree.js';

// Breath (Warbreaker-inspired Awakening)
export {
  BREATH_SKILL_TREE,
  HEIGHTENINGS,
  AWAKENING_TYPES,
  COMMAND_CATEGORIES,
  BREATH_SOURCES,
  getCurrentHeightening,
  getHeighteningAbilities,
  calculateAwakeningCost,
  canPerformAwakening,
  getMaxCommandComplexity,
  getColorDrainEfficiency,
} from './skillTrees/BreathSkillTree.js';

// Pact (Contract magic with entities)
export {
  PACT_SKILL_TREE,
  PATRON_TYPES,
  PACT_COSTS,
  PACT_BENEFITS,
  BREACH_CONSEQUENCES,
  calculatePactPower,
  getAvailablePatrons,
  getMaxConcurrentPacts,
  getBreachSeverity,
  canSafelyPactWith,
  getNegotiationBonus,
} from './skillTrees/PactSkillTree.js';

// Blood (Hemomancy and vitality magic)
export {
  BLOOD_SKILL_TREE,
  BLOOD_SOURCES,
  BLOODLINES,
  BLOOD_TECHNIQUES,
  SACRIFICE_SCALES,
  calculateSacrificePower,
  getBloodlinePowers,
  calculateHealthCost,
  canSacrifice,
  getBloodBondStrength,
  getRegenerationRate,
  getMaxBloodBonds,
} from './skillTrees/BloodSkillTree.js';

// Emotional (Emotion-based magic)
export {
  EMOTIONAL_SKILL_TREE,
  EMOTIONS,
  EMOTION_CATEGORIES,
  EMOTIONAL_TECHNIQUES,
  STORAGE_METHODS,
  calculateEmotionPower,
  getEmotionCategory,
  areEmotionsCompatible,
  getEmotionStorageCapacity,
  getMaxEmotionChannels,
  getEmpathyRange,
  getEmotionalResistance,
} from './skillTrees/EmotionalSkillTree.js';

// Rune (Runecarving and inscription)
export {
  RUNE_SKILL_TREE,
  RUNE_CATEGORIES,
  CARVING_MATERIALS,
  RUNE_TIERS,
  ACTIVATION_METHODS,
  calculateRunePower,
  getCarvingDifficulty,
  canCarveOn,
  getMaxSequenceLength,
  getRuneDuration,
  getKnownRunes,
} from './skillTrees/RuneSkillTree.js';

// Divine (Worship and miracles)
export {
  DIVINE_SKILL_TREE,
  DIVINE_DOMAINS,
  CLERICAL_RANKS,
  MIRACLE_TYPES,
  PRAYER_TYPES,
  calculateMiraclePower,
  getAvailableDomains,
  calculateFavorCost,
  getClericalRank,
  canPerformMiracle,
  getPrayerEffectiveness,
} from './skillTrees/DivineSkillTree.js';

// Academic (Formal magical education)
export {
  ACADEMIC_SKILL_TREE,
  MAGIC_SCHOOLS,
  ACADEMIC_RANKS,
  METAMAGIC,
  SPELL_COMPONENTS,
  calculateSpellPower,
  calculateManaCost,
  getKnownSchools,
  getAcademicRank,
  getMaxPreparedSpells,
  getSpellbookCapacity,
  getResearchTime,
} from './skillTrees/AcademicSkillTree.js';

// Bureaucratic (Paperwork and stamps)
export {
  BUREAUCRATIC_SKILL_TREE,
  FORM_TYPES,
  STAMP_TYPES,
  BUREAUCRATIC_RANKS,
  getAvailableFormTypes,
  getAvailableStampTypes,
  getBureaucraticRank,
  isBusinessHours,
  getProcessingTimeMultiplier,
} from './skillTrees/BureaucraticSkillTree.js';

// Debt (Fae-style favors and obligations)
export {
  DEBT_SKILL_TREE,
  DEBT_TYPES,
  DEBT_CREATION,
  INTEREST_RATES,
  calculateDebtPower,
  canDissolveDebt,
  getInterestRate,
  getDebtTradingEfficiency,
} from './skillTrees/DebtSkillTree.js';

// Luck (Probability manipulation)
export {
  LUCK_SKILL_TREE,
  LUCK_TYPES,
  PROBABILITY_TIERS,
  KARMA_LEVELS,
  getKarmaLevel,
  getProbabilityAdjustment,
  getBorrowingCapacity,
  getKarmaInterestRate,
  getCharmCapacity,
} from './skillTrees/LuckSkillTree.js';

// Paradox (Logical contradictions)
export {
  PARADOX_SKILL_TREE,
  PARADOX_TYPES,
  REALITY_STABILITY,
  SANITY_COSTS,
  calculateSanityCost,
  getRealityStability,
  canSafelyInvoke,
  getAvailableParadoxes,
} from './skillTrees/ParadoxSkillTree.js';

// Game (Wagers and challenges)
export {
  GAME_SKILL_TREE,
  GAME_TYPES,
  STAKE_TYPES,
  VICTORY_MULTIPLIERS,
  calculateStakePower,
  getVictoryMultiplier,
  canDeclineChallenge,
  getAvailableGameTypes,
  getStreakBonus,
} from './skillTrees/GameSkillTree.js';

// Echo (Memories and past events)
export {
  ECHO_SKILL_TREE,
  ECHO_TYPES,
  TIME_DEPTHS,
  ECHO_CLARITY,
  getEchoClarity,
  getAccessibleTimeDepth,
  calculateMemoryCost,
  getAvailableEchoTypes,
} from './skillTrees/EchoSkillTree.js';

// Threshold (Boundaries and liminal spaces)
export {
  THRESHOLD_SKILL_TREE,
  THRESHOLD_TYPES,
  LIMINAL_STATES,
  INVITATION_LEVELS,
  isLiminalTime,
  getLiminalBonus,
  getRequiredInvitationLevel,
  getGatewayRange,
} from './skillTrees/ThresholdSkillTree.js';

// Belief (Faith and reality consensus)
export {
  BELIEF_SKILL_TREE,
  BELIEF_TYPES,
  BELIEF_INTENSITY,
  BELIEF_ENTITIES,
  calculateBeliefPower,
  getManifestationDifficulty,
  getEntityComplexity,
  hasSufficientFaith,
} from './skillTrees/BeliefSkillTree.js';

// Commerce (Trade and contracts)
export {
  COMMERCE_SKILL_TREE,
  TRADE_TYPES,
  CURRENCY_TYPES,
  CONTRACT_LEVELS,
  calculateTradePower,
  getContractStrength,
  getCurrencyConversionRate,
  getGuildBonus,
} from './skillTrees/CommerceSkillTree.js';

// Feng Shui (Spatial harmony magic)
export {
  FENG_SHUI_SKILL_TREE,
  FENG_SHUI_ELEMENTS,
  CHI_FLOW_STATES,
  HARMONY_LEVELS,
  COMMANDING_POSITIONS,
  getHarmonyLevel,
  getChiPerceptionRange,
  getMostNeededElement,
  isCommandingPosition,
  getGeneratingElement,
  getControllingElement,
  calculateSpaceEffect,
  hasGoldenProportions,
} from './skillTrees/FengShuiSkillTree.js';

// Architecture (Building design and construction)
export {
  ARCHITECTURE_SKILL_TREE,
  BUILDING_TIERS,
  BUILDING_CATEGORIES,
  DESIGN_PRINCIPLES,
  MATERIAL_PROPERTIES,
  getBuildingTierForSkillLevel,
  canBuildTier,
  getConstructionSpeedMultiplier,
  getMaterialEfficiency,
  getArchitectureQualityBonus,
  getUnlockedCategories,
  getMaxBuildingSize,
  hasUnlockedBuildingDesigner,
  // Spatial Harmony (Feng Shui for architects)
  canAnalyzeHarmony,
  hasSpatialHarmonyMastery,
  getDesignHarmonyBonus,
} from './skillTrees/ArchitectureSkillTree.js';

// ============================================================================
// Magic Source Generation
// ============================================================================

export type {
  MagicResourcePool,
  MagicSourceGenerationConfig,
} from './MagicSourceGenerator.js';

export {
  // Pool size and regen calculation
  calculateBasePoolSize,
  calculateRegenRate,

  // Source and pool generation
  generateMagicSource,
  generateResourcePool,
  generateParadigmSource,

  // Paradigm-specific generators - Example paradigms
  generateAcademicSource,
  generateDivineSource,
  generateBloodSource,
  generateBreathSource,
  generateEmotionalSource,
  generatePactSource,
  generateNameSource,
  generateRuneSource,

  // Paradigm-specific generators - Animist paradigms
  generateAllomancySource,
  generateShintoSource,
  generateSympathySource,
  generateDaemonSource,
  generateDreamSource,
  generateSongSource,

  // Paradigm-specific generators - Whimsical paradigms
  generateTalentSource,
  generateNarrativeSource,
  generatePunSource,
  generateWildSource,

  // Paradigm-specific generators - Null/Anti-magic paradigms
  generateNullSource,
  generateDeadSource,
  generateAntiSource,
  generateInvertedSource,
  generateTechSupremacySource,
  generateRationalSource,
  generateSealedSource,
  generateDivineProhibitionSource,
  generateDivineMonopolySource,

  // Paradigm-specific generators - Hybrid paradigms
  generateTheurgySource,
  generateHemomancySource,
  generateNamebreathSource,

  // Paradigm-specific generators - Dimensional paradigms
  generateDimensionSource,
  generateEscalationSource,
  generateCorruptionSource,

  // Pool management helpers
  spendFromPool,
  restoreToPool,
  regeneratePool,
  increasePoolMaximum,
  getPoolPercentage,
} from './MagicSourceGenerator.js';

// ============================================================================
// Magic System State Management
// ============================================================================

export type {
  ParadigmState,
  ParadigmRuntimeState,
  ParadigmStateChangeEvent,
  ParadigmStateChangeListener,
  MagicSystemStateSerialized,
} from './MagicSystemState.js';

export {
  MagicSystemStateManager,
  getMagicSystemState,
  registerParadigmState,
  getParadigmState,
  isParadigmEnabled,
  isParadigmActive,
} from './MagicSystemState.js';

// ============================================================================
// Spell Registry
// ============================================================================

export type {
  SpellDefinition,
  PlayerSpellState,
  SpellRegistryListener,
  SpellRegistryEvent,
} from './SpellRegistry.js';

export {
  SpellRegistry,
  getSpellRegistry,
  registerSpell,
  getSpell,
  EXAMPLE_SPELLS,
} from './SpellRegistry.js';

// ============================================================================
// Dimensional Paradigms (Gravity Falls, Dark Forest, Adventure Time)
// ============================================================================

export type {
  // Dimension types
  DimensionCount,
  DimensionalPerception,
  DimensionalState,

  // Dimensional structures
  DimensionalRift,
  DimensionalCollapse,
  ExtradimensionalEntity,
  ExtradimensionalAbility,

  // 4D position and cross-sections
  Position4D,
  WCrossSection,

  // Powers
  DimensionalPower,

  // LMI Integration
  DimensionalContext,
} from './DimensionalParadigms.js';

export {
  // Paradigms
  DIMENSION_PARADIGM,
  ESCALATION_PARADIGM,
  CORRUPTION_PARADIGM,

  // Registry
  DIMENSIONAL_PARADIGM_REGISTRY,
  getDimensionalParadigm,

  // Pre-defined powers
  DIMENSIONAL_POWERS,

  // Helper functions
  canPerceiveDimension,
  calculateDimensionalSanityCost,
  calculateEscalationProbability,
  calculateCorruptionLevel,
  getCorruptionPowerMultiplier,

  // Multi-W-slice entity helpers
  getEntityWCrossSection,

  // Hyperbolic geometry (for 4D+ universes)
  hyperbolicDistance,
  euclideanDistance4D,
  isValidHyperbolicPosition,
  clampToHyperbolicDisk,

  // LMI Integration - prompt context generation
  generateDimensionalContext,
  getDimensionDescription,
  getHighDimensionalNavigationHints,
} from './DimensionalParadigms.js';

// ============================================================================
// Terminal Effect Handling
// ============================================================================

export type {
  TerminalEffectEvent,
  TerminalEffectResult,
} from './TerminalEffectHandler.js';

export {
  TerminalEffectHandler,
  createTerminalEffectHandler,
} from './TerminalEffectHandler.js';

// ============================================================================
// Magic System Initialization
// ============================================================================

export {
  initializeMagicSystem,
} from './InitializeMagicSystem.js';

// ============================================================================
// Spell Effects System
// ============================================================================

export * from './SpellEffect.js';
export * from './SpellEffectExecutor.js';
export * from './SpellEffectRegistry.js';
export * from './EffectAppliers.js';

// ============================================================================
// Spell Casting Service
// ============================================================================

export * from './SpellCastingService.js';

// ============================================================================
// Combo System
// ============================================================================

export * from './ComboDetector.js';

// ============================================================================
// Expanded Spells & Entities
// ============================================================================

export * from './ExpandedSpells.js';
export * from './MaterialCreationSpells.js';
export * from './TileConstructionSpells.js';
export * from './SummonableEntities.js';

// ============================================================================
// Magic Detection
// ============================================================================

export * from './MagicDetectionSystem.js';

// ============================================================================
// Organized Submodules (additional groupings and metadata)
// ============================================================================

// Paradigm organization - categories, combined lists
export {
  DIMENSIONAL_PARADIGMS,
  CREATIVE_PARADIGMS,
  ANIMIST_PARADIGMS,
  ALL_PARADIGMS,
  ALL_PARADIGM_REGISTRIES,
  PARADIGM_CATEGORIES,
  type ParadigmCategory,
} from './paradigms/index.js';

// Spell organization - schools, combined lists
export {
  ALL_EXPANDED_SPELLS,
  SPELL_SCHOOLS,
  type SpellSchool,
} from './spells/index.js';

// Note: summoning/index.ts provides organizational views but is intentionally not
// exported here to avoid duplicates with SummonableEntities.js

// ============================================================================
// Magic Academies (Multi-Paradigm Institutions)
// ============================================================================

export type {
  AcademyType,
  TeachingMethod,
  AcademyAdmissionRequirement,
  AcademyRank,
  TutoringRelationship,
  TutoringSession,
  TutoringResult,
  MagicAcademy,
  AcademySkillNode,
  AcademyMembership,
} from './MagicAcademy.js';

export {
  // Pre-defined academies
  ACADEMY_OF_FORMAL_ARTS,
  CONSERVATORY_OF_EXPRESSION,
  TEMPLE_OF_RELATIONSHIPS,
  GUILD_OF_VITALITY,
  CIRCLE_OF_DREAMS,

  // Registry
  MAGIC_ACADEMY_REGISTRY,
  getAcademy,
  getAcademiesForParadigm,
  getAcademiesForParadigmCombination,

  // Tutoring functions
  calculateTutoringMultiplier,
  conductTutoringSession,
  createTutoringRelationship,
  createAcademyMembership,
} from './MagicAcademy.js';

// ============================================================================
// Literary Surrealism (Poetic Magic, Word Physics, Metaphor Literalization)
// ============================================================================

export type {
  WordPhysics,
  Metaphor,
  MetaphorEffect,
  MagicalPunctuation,
  EmotionalEntity,
  ConceptBeing,
} from './LiterarySurrealismParadigm.js';

export {
  // Word Physics
  WORD_MASS_CATEGORIES,
  EXAMPLE_WORD_MASSES,
  calculateWordMass,

  // Metaphor Literalization
  COMMON_METAPHORS,

  // Punctuation Magic
  PUNCTUATION_MAGIC,

  // Poetic Meter and Rhyme
  RHYME_SCHEME_POWER,
  POETIC_METERS,

  // The Poetic Paradigm
  POETIC_PARADIGM,
  POETIC_SKILL_TREE,

  // Living Abstractions
  EMOTIONAL_ENTITIES,
  CONCEPT_BEINGS,
} from './LiterarySurrealismParadigm.js';

// ============================================================================
// Paradigm Spectrum (Universe Magic Configuration)
// ============================================================================

export type {
  MagicalIntensity,
  MagicSourceOrigin,
  MagicFormality,
  AnimismLevel,
  MagicSpectrumConfig,
  SpectrumEffects,
} from './ParadigmSpectrum.js';

export {
  // Presets
  SPECTRUM_PRESETS,
  getPreset,
  getPresetNames,

  // Resolution
  resolveSpectrum,

  // Configuration questions for UI
  CONFIGURATION_QUESTIONS,
} from './ParadigmSpectrum.js';

// ============================================================================
// LLM Effect Generator (Magic Discovery)
// ============================================================================

export type {
  EffectLLMProvider,
  MagicExperimentContext,
  MagicExperimentResult,
} from './LLMEffectGenerator.js';

export {
  llmEffectGenerator,
  getEffectGenerator,
} from './LLMEffectGenerator.js';

// ============================================================================
// Magic Cost System
// ============================================================================
export {
  // Types (SpellCost already exported from MagicLawEnforcer)
  type ParadigmCostCalculator,
  type CastingContext,
  type AffordabilityResult,
  type DeductionResult,
  type TerminalEffect,
  type ResourceInitOptions,

  // Base classes
  BaseCostCalculator,
  createDefaultContext,

  // Registry
  CostCalculatorRegistry,
  costCalculatorRegistry,

  // Recovery
  CostRecoveryManager,
  costRecoveryManager,

  // Paradigm-specific calculators
  AcademicCostCalculator,
  PactCostCalculator,
  NameCostCalculator,
  BreathCostCalculator,
  DivineCostCalculator,
  BloodCostCalculator,
  EmotionalCostCalculator,
  DivineCastingCalculator,

  // Registration
  registerAllCostCalculators,
} from './costs/index.js';
