/**
 * Reproduction System Module
 *
 * A comprehensive system for simulating diverse mating paradigms,
 * from human-style romance to kemmer cycles to hive reproduction
 * to union magic.
 */

// Core types
export * from './MatingParadigm.js';
export type {
  PairBondingType,
  BondingFlexibility,
  BondEffect,
  PairBondingConfig,
  CourtshipType,
  CourtshipInitiator,
  CourtshipDuration,
  CourtshipStage,
  CourtshipConfig,
  ReproductiveMechanism,
  ParticipantRequirement,
  ReproductionTrigger,
  GestationConfig,
  OffspringCountConfig,
  ReproductiveMechanismConfig,
  ParentalCareType,
  CareProvider,
  ParentalCareConfig,
  SelectionCriterion,
  MateSelectionConfig,
  BiologicalSexSystem,
  SexDefinition,
  BiologicalSexConfig,
  GenderSystem,
  GenderDefinition,
  GenderConfig,
  AttractionOnset,
  AttractionFluidity,
  AttractionDimension,
  AttractionOrientation,
  AttractionConfig,
  EmotionalMatingConfig,
  SocialRegulationType,
  SocialMatingRegulation,
  HybridizationEnabler,
  HybridizationConfig,
  LifeStageConfig,
  MatingParadigm,
} from './MatingParadigm.js';

// Sexuality component
export * from './SexualityComponent.js';
export {
  SexualityComponent,
  createSexualityComponent,
  createAsexualAromantic,
  createDemisexual,
  createKemmerSexuality,
  createHiveSexuality,
  createMystifSexuality,
} from './SexualityComponent.js';
export type {
  SexualTarget,
  GenderTarget,
  AttractionAxis,
  AttractionCondition,
  ActiveAttraction,
  CurrentMate,
  SexualityOptions,
} from './SexualityComponent.js';

// Reproductive morph component
export * from './ReproductiveMorphComponent.js';
export {
  ReproductiveMorphComponent,
  createReproductiveMorphComponent,
  createFemaleMorph,
  createMaleMorph,
  createHermaphroditicMorph,
  createKemmerMorph,
  createSequentialMorph,
  createMultiSexMorph,
  createHiveCasteMorph,
  createAsexualMorph,
} from './ReproductiveMorphComponent.js';
export type {
  ReproductiveMorph,
  MorphDetermination,
  MorphTransition,
  FertilityState,
  GestationState,
  ReproductiveHistory,
  ReproductiveMorphOptions,
} from './ReproductiveMorphComponent.js';

// Paradigm registry
export * from './MatingParadigmRegistry.js';
export {
  HUMAN_PARADIGM,
  KEMMER_PARADIGM,
  HIVE_PARADIGM,
  HIVEMIND_PARADIGM,
  PARASITIC_HIVEMIND_PARADIGM,
  SYMBIOTIC_PARADIGM,
  POLYAMOROUS_PARADIGM,
  THREE_SEX_PARADIGM,
  OPPORTUNISTIC_PARADIGM,
  MYSTIF_PARADIGM,
  QUANTUM_PARADIGM,
  TEMPORAL_PARADIGM,
  ASEXUAL_PARADIGM,
  MATING_PARADIGMS,
  getMatingParadigm,
  getParadigmForSpecies,
  canSpeciesMate,
  registerMatingParadigm,
} from './MatingParadigmRegistry.js';

// Parasitic Hive Mind subsystem
export * from './parasitic/index.js';
export {
  // Components
  ParasiticColonizationComponent,
  createPotentialHost,
  createColonizedHost,
  createResistantHost,
  createPreviouslyColonizedHost,
  CollectiveMindComponent,
  createCollective,
  createExpansionistCollective,
  createInfiltratorCollective,
  createEugenicsCollective,
  // Systems
  ParasiticReproductionSystem,
  ColonizationSystem,
  DEFAULT_PARASITIC_REPRODUCTION_CONFIG,
  DEFAULT_COLONIZATION_CONFIG,
} from './parasitic/index.js';

export type {
  // Colonization types
  ControlLevel,
  HostPersonalityState,
  ColonizationMethod,
  IntegrationProgress,
  ParasiteInfo,
  HostHistory,
  // Collective types
  CollectiveStrategy,
  ColonizedHostRecord,
  BreedingAssignment,
  ExpansionTarget,
  ParasiteLineage,
  // Config types
  ParasiticReproductionConfig,
  ColonizationConfig,
  // Event types
  BreedingAssignedEvent,
  HostOffspringBornEvent,
  ColonizationScheduledEvent,
  ColonizationAttemptEvent,
  IntegrationProgressEvent,
  ResistanceAttemptEvent,
  DecolonizationEvent,
  DetectionEvent,
} from './parasitic/index.js';

// Midwifery subsystem
export * from './midwifery/index.js';
export {
  // Components
  PregnancyComponent,
  createPregnancyComponent,
  LaborComponent,
  createLaborComponent,
  PostpartumComponent,
  createPostpartumComponent,
  InfantComponent,
  createInfantComponent,
  NursingComponent,
  createNursingComponent,
  // System
  MidwiferySystem,
  DEFAULT_MIDWIFERY_CONFIG,
} from './midwifery/index.js';

export type {
  // Pregnancy types
  Trimester,
  FetalPosition,
  PregnancySymptoms,
  PregnancyRiskFactor,
  PrenatalCheckup,
  // Labor types
  LaborStage,
  ComplicationSeverity,
  BirthComplication,
  ActiveComplication,
  DeliveryMethod,
  // Postpartum types
  PostpartumComplication,
  PostpartumMood,
  // Infant types
  BirthWeight,
  InfantVulnerability,
  DevelopmentalMilestones,
  // Config types
  MidwiferyConfig,
} from './midwifery/index.js';

// Parenting subsystem
export { ParentingComponent, createParentingComponent } from '@ai-village/core';
export type { ParentingResponsibility, ParentingDriveLevel, ParentingReputation } from '@ai-village/core';
export { getParentingActionsForCareType, getParentingActionsForAgent, isActionValidForCareType } from './ParentingActions.js';
export type { ParentingAction } from './ParentingActions.js';

// Courtship subsystem
export * from './courtship/index.js';
export {
  // Component
  CourtshipComponent,
  createCourtshipComponent,
  ensureCourtshipComponent,
  // Tactics
  UNIVERSAL_TACTICS,
  DWARF_TACTICS,
  BIRD_FOLK_TACTICS,
  MYSTIF_TACTICS,
  NEGATIVE_TACTICS,
  ALL_TACTICS,
  TACTICS_BY_ID,
  getTactic,
  getTacticsByCategory,
  getTacticsForSpecies,
  // Paradigms
  HUMAN_COURTSHIP_PARADIGM,
  DWARF_COURTSHIP_PARADIGM,
  BIRD_FOLK_COURTSHIP_PARADIGM,
  MYSTIF_COURTSHIP_PARADIGM,
  ELF_COURTSHIP_PARADIGM,
  DEFAULT_COURTSHIP_PARADIGM,
  PARADIGMS_BY_SPECIES,
  getCourtshipParadigm,
  createCourtshipParadigmForSpecies,
  // Compatibility
  calculateSexualCompatibility,
  calculatePersonalityMesh,
  calculateSharedInterests,
  calculateRelationshipStrength,
  calculateCompatibility,
  calculateConceptionProbability,
  calculateBondStrength,
  attemptConception,
  // State Machine
  CourtshipStateMachine,
} from './courtship/index.js';

export type {
  // Courtship types
  CourtshipParadigm,
  CourtshipState,
  CourtshipStyle,
  CourtshipTactic,
  TacticCategory,
  LocationRequirement,
  MatingBehavior,
  ActiveCourtship,
  ReceivedCourtship,
  PastCourtship,
} from './courtship/index.js';
