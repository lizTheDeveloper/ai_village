/**
 * MatingParadigm - Species-level mating rule definitions
 *
 * Mating works differently across species. This module defines the meta-framework
 * that can express fundamentally different reproductive paradigms. Each species declares
 * its MatingParadigm, which defines the pair bonding type, courtship structure,
 * reproductive mechanism, and social dynamics around reproduction.
 *
 * Inspired by: Ursula K. Le Guin, Clive Barker's Imajica, and real biology.
 */

// ============================================================================
// Pair Bonding Types
// ============================================================================

/** Types of pair bonding patterns */
export type PairBondingType =
  | 'none'              // No emotional attachment to mates
  | 'serial_monogamy'   // One partner at a time, can change
  | 'lifelong_monogamy' // One partner forever
  | 'polygyny'          // One male, multiple females
  | 'polyandry'         // One female, multiple males
  | 'polygynandry'      // Multiple of each, group bonding
  | 'hive_exclusive'    // Only queen/king reproduce
  | 'pair_for_season'   // Bond only during mating period
  | 'tournament'        // Compete each mating, winner mates
  | 'lek'               // Display-based selection
  | 'communal'          // Whole community raises offspring
  | 'parasitic'         // Use hosts/victims for reproduction
  | 'opportunistic'     // Mate when possible, no bonding
  | 'emergent'          // Bonding emerges from swarm behavior
  | 'quantum_entangled' // Mates linked across spacetime
  | 'temporal_fixed'    // Mate predetermined by timeline
  | 'soul_bound';       // Metaphysical permanent bonding

/** How flexible is pair bonding in this species? */
export type BondingFlexibility =
  | 'rigid'        // Cannot change bond type
  | 'cultural'     // Social pressure but flexible
  | 'individual'   // Each individual chooses
  | 'situational'  // Changes based on circumstances
  | 'quantum';     // All possibilities until observed

/** Effects that pair bonds can have */
export interface BondEffect {
  effectType: 'health_link' | 'mood_sync' | 'telepathy' | 'fertility_sync' |
              'death_follows' | 'power_sharing' | 'location_sense';
  intensity: number; // 0-1
  requiresProximity: boolean;
}

/** Definition of pair bonding in a species */
export interface PairBondingConfig {
  type: PairBondingType;
  flexibility: BondingFlexibility;
  bondsBreakable: boolean;
  breakageTrauma: number; // 0-1, emotional impact
  bondEffects?: BondEffect[];
  description?: string;
}

// ============================================================================
// Courtship Types
// ============================================================================

/** Types of courtship patterns */
export type CourtshipType =
  | 'none'               // No courtship - immediate mating
  | 'display'            // Visual/auditory displays
  | 'gift_giving'        // Resources/objects presented
  | 'combat'             // Fight rivals for mating rights
  | 'dance'              // Ritualized movement patterns
  | 'pheromone'          // Chemical signaling
  | 'construction'       // Build structures to attract
  | 'song'               // Vocal performances
  | 'pursuit'            // Chase/be chased
  | 'gradual_proximity'  // Slowly approach over time
  | 'mind_merge'         // Share consciousness to evaluate
  | 'dream_meeting'      // Meet in shared dreams
  | 'timeline_search'    // Search timelines for compatible mate
  | 'resonance'          // Match vibrational frequencies
  | 'arranged'           // Others choose mates
  | 'lottery'            // Random assignment
  | 'pheromone_trail'    // Follow chemical trails
  | 'collective_decision' // Hive/group decides
  | 'consumption_based'; // Mate whoever you can catch

/** Who initiates courtship? */
export type CourtshipInitiator =
  | 'any'           // Either party can initiate
  | 'dominant_morph' // Specific morph initiates
  | 'submissive_morph' // Non-dominant initiates
  | 'elder'         // Older individual initiates
  | 'mutual'        // Must be simultaneous
  | 'third_party'   // Others arrange it
  | 'circumstance'; // Environmental triggers

/** How long does courtship last? */
export type CourtshipDuration =
  | 'instant'    // No delay
  | 'hours'      // Very brief
  | 'days'       // Short courtship
  | 'weeks'      // Moderate courtship
  | 'months'     // Extended courtship
  | 'years'      // Long-term courtship
  | 'lifetime'   // Courtship never ends
  | 'variable';  // Depends on circumstances

/** A stage in the courtship process */
export interface CourtshipStage {
  name: string;
  duration: string;
  requirements: string[];
  canFail: boolean;
  failureConsequence?: string;
}

/** Definition of courtship in a species */
export interface CourtshipConfig {
  type: CourtshipType;
  initiator: CourtshipInitiator;
  duration: CourtshipDuration;
  rejectionPossible: boolean;
  rejectionConsequence?: 'none' | 'mild_hurt' | 'severe_hurt' | 'violence' | 'death';
  competitive: boolean;
  multipleCourtships: boolean;
  stages?: CourtshipStage[];
  description?: string;
}

// ============================================================================
// Reproductive Mechanism Types
// ============================================================================

/** Physical mechanisms of reproduction */
export type ReproductiveMechanism =
  // Binary sexual
  | 'copulation'
  | 'external_fertilization'
  // Asexual
  | 'budding'
  | 'fission'
  | 'fragmentation'
  | 'parthenogenesis'
  // Hive/Colonial
  | 'queen_spawning'
  | 'collective_spawning'
  // Parasitic
  | 'host_implantation'
  | 'conversion'
  // Exotic
  | 'spore_release'
  | 'egg_laying'
  | 'live_birth'
  | 'pouch'
  // Cosmic/Magical
  | 'dream_manifestation'
  | 'emotional_conception'
  | 'thought_birth'
  | 'energy_condensation'
  | 'crystal_growth'
  | 'temporal_loop'
  | 'quantum_collapse'
  | 'dimensional_seeding'
  | 'death_release'
  | 'resonance_fusion'
  | 'void_emergence'
  | 'memory_transfer'
  | 'symbiotic_merge'
  | 'union_magic';

/** How many participants required? */
export type ParticipantRequirement =
  | 'one'        // Self only
  | 'two'        // Exactly two
  | 'two_plus'   // Two or more
  | 'colony'     // Entire colony
  | 'variable'   // Depends on circumstances
  | 'zero';      // Spontaneous

/** Triggers for reproduction */
export type ReproductionTrigger =
  | 'mate_availability'
  | 'hormonal_cycle'
  | 'environmental_cue'
  | 'population_low'
  | 'death_of_queen'
  | 'emotional_peak'
  | 'dream_convergence'
  | 'resonance_alignment'
  | 'temporal_nexus'
  | 'quantum_observation'
  | 'sufficient_resources'
  | 'ritual_completion'
  | 'predator_pressure'
  | 'crowding'
  | 'aging_threshold'
  | 'consent_given'
  // Extended triggers for diverse paradigms
  | 'probability_collapse'
  | 'genetic_diversity_needed'
  | 'expansion_planned'
  | 'suitable_host_available'
  | 'triad_sync';

/** Gestation configuration */
export interface GestationConfig {
  durationDays: number;
  location: 'internal' | 'external_egg' | 'nest' | 'host' | 'communal' |
            'dimensional' | 'dream' | 'crystal' | 'none';
  careRequired: 'none' | 'minimal' | 'moderate' | 'intensive';
  risks?: string[];
}

/** Offspring count configuration */
export interface OffspringCountConfig {
  min: number;
  max: number;
  typical: number;
  modifiers?: Array<{ condition: string; countModifier: number }>;
}

/** Definition of reproductive mechanism */
export interface ReproductiveMechanismConfig {
  mechanism: ReproductiveMechanism;
  participantsRequired: ParticipantRequirement;
  frequency: 'continuous' | 'seasonal' | 'once_lifetime' | 'triggered' | 'cyclical';
  triggers?: ReproductionTrigger[];
  gestationPeriod?: GestationConfig;
  offspringCount: OffspringCountConfig;
  geneticVariation: 'none' | 'low' | 'moderate' | 'high' | 'extreme';
  requirements?: string[];
  description?: string;
}

// ============================================================================
// Parental Care Types
// ============================================================================

/** Types of parental care */
export type ParentalCareType =
  | 'none'
  | 'egg_guarding'
  | 'feeding'
  | 'teaching'
  | 'protection'
  | 'full_nurturing'
  | 'communal_care'
  | 'hive_integration'
  | 'abandonment_survival'
  | 'memory_inheritance'
  | 'sacrifice'
  | 'consumption_risk';

/** Who provides parental care? */
export type CareProvider =
  | 'mother'
  | 'father'
  | 'both_parents'
  | 'extended_family'
  | 'community'
  | 'hive'
  | 'older_siblings'
  | 'none';

/** Definition of parental care */
export interface ParentalCareConfig {
  type: ParentalCareType;
  provider: CareProvider;
  duration: 'none' | 'days' | 'weeks' | 'months' | 'years' | 'lifetime';
  bondContinuesAfter: boolean;
  recognizesOffspring: boolean;
  description?: string;
}

// ============================================================================
// Mate Selection Types
// ============================================================================

/** What drives mate selection */
export type SelectionCriterion =
  // Physical
  | 'size'
  | 'strength'
  | 'health'
  | 'symmetry'
  | 'coloration'
  | 'ornamentation'
  | 'scent'
  // Resource-based
  | 'territory'
  | 'resources'
  | 'nest_quality'
  | 'food_provision'
  // Behavioral
  | 'dance_quality'
  | 'song_quality'
  | 'parenting_skill'
  | 'social_status'
  // Cognitive
  | 'intelligence'
  | 'creativity'
  | 'compatibility'
  // Exotic
  | 'resonance_match'
  | 'timeline_alignment'
  | 'psychic_compatibility'
  | 'genetic_diversity'
  | 'soul_harmony'
  | 'void_affinity'
  // Practical
  | 'availability'
  | 'proximity'
  | 'random'
  // Extended for diverse paradigms
  | 'schedule_availability'
  | 'metamour_approval'
  | 'shared_interests'
  | 'communication_skills'
  | 'triad_chemistry'
  | 'host_health'
  | 'strategic_value'
  | 'camouflage_value'
  | 'no_previous_host_connection'
  | 'emotional_maturity';

/** Definition of mate selection */
export interface MateSelectionConfig {
  primaryCriteria: SelectionCriterion[];
  secondaryCriteria?: SelectionCriterion[];
  selector: 'female' | 'male' | 'both' | 'dominant' | 'submissive' |
            'elder' | 'collective' | 'fate' | 'random';
  choiceLevel: 'none' | 'limited' | 'moderate' | 'high' | 'total';
  preferencesFixed: boolean;
  description?: string;
}

// ============================================================================
// Sex/Gender System Types
// ============================================================================

/** Types of biological sex systems */
export type BiologicalSexSystem =
  | 'binary_static'        // Two sexes, fixed at birth
  | 'binary_sequential'    // Can change between two sexes
  | 'multi_sex'            // More than two biological sexes
  | 'hermaphroditic'       // All individuals both
  | 'parthenogenic'        // Only one sex, self-reproducing
  | 'mating_type'          // Multiple compatibility types
  | 'hive_caste'           // Caste determines reproductive role
  | 'environmental'        // Sex determined by environment
  | 'quantum'              // Sex undefined until reproduction
  | 'temporal'             // Sex varies across timeline
  | 'asexual'              // No biological sex
  | 'kemmer'               // Ambisexual, sex emerges cyclically
  | 'fluid';               // Continuous change

/** Definition of a biological sex */
export interface SexDefinition {
  id: string;
  name: string;
  reproductiveRole: 'spawner' | 'fertilizer' | 'both' | 'neither' | 'variable' | 'carrier';
  prevalence: number; // 0-1
  characteristics?: string[];
}

/** Configuration of biological sex system */
export interface BiologicalSexConfig {
  system: BiologicalSexSystem;
  sexes: SexDefinition[];
  determination: 'genetic' | 'environmental' | 'social' | 'random' |
                 'magical' | 'temporal' | 'quantum';
  canChange: boolean;
  changeConditions?: string[];
}

/** Types of gender systems */
export type GenderSystem =
  | 'binary_aligned'     // Two genders matching two sexes
  | 'binary_independent' // Two genders, not tied to sex
  | 'multi_gender'       // Multiple gender categories
  | 'genderless'         // No gender concept
  | 'caste_gender'       // Gender = social role
  | 'fluid_cultural'     // Gender changes by situation
  | 'individual_choice'  // Each chooses own gender
  | 'age_based'          // Gender changes with age
  | 'quantum_gender';    // Multiple simultaneous

/** Definition of a gender */
export interface GenderDefinition {
  id: string;
  name: string;
  socialRoles?: string[];
  canChangeTo: boolean;
}

/** Configuration of gender system */
export interface GenderConfig {
  system: GenderSystem;
  genders: GenderDefinition[];
  separateFromSex: boolean;
  socialSignificance: 'none' | 'low' | 'moderate' | 'high' | 'defining';
}

// ============================================================================
// Attraction Types
// ============================================================================

/** When does attraction emerge? */
export type AttractionOnset =
  | 'immediate'
  | 'familiarity'
  | 'emotional_bond'
  | 'cyclical'
  | 'environmental'
  | 'never'
  | 'resonance';

/** How fluid is attraction? */
export type AttractionFluidity =
  | 'fixed'
  | 'slow_change'
  | 'rapid_change'
  | 'quantum';

/** Dimensions of attraction */
export interface AttractionDimension {
  name: string; // 'sexual', 'romantic', 'aesthetic', 'sensual', etc.
  exists: boolean;
  intensityRange: [number, number];
}

/** Orientation definition */
export interface AttractionOrientation {
  id: string;
  name: string;
  attractedTo: string[]; // Sex/gender IDs
  description?: string;
}

/** Configuration of attraction */
export interface AttractionConfig {
  onset: AttractionOnset;
  fluidity: AttractionFluidity;
  dimensions: AttractionDimension[];
  orientations?: AttractionOrientation[];
  description?: string;
}

// ============================================================================
// Emotional Dynamics Types
// ============================================================================

/** Configuration of emotional mating dynamics */
export interface EmotionalMatingConfig {
  rejectionHurts: boolean;
  rejectionIntensity: number; // 0-1
  rejectionDecay: 'fast' | 'slow' | 'permanent';

  matingBondsEmotionally: boolean;
  bondFormationRate: 'instant' | 'gradual' | 'never';

  mateLossGrief: boolean;
  griefIntensity: number; // 0-1
  griefDuration: 'brief' | 'extended' | 'permanent';

  heartbreakPossible: boolean;
  heartbreakTriggers?: string[];
  heartbreakEffects?: string[];
}

// ============================================================================
// Social Regulation Types
// ============================================================================

/** Types of social regulation of mating */
export type SocialRegulationType =
  | 'monogamy_enforced'
  | 'arranged_marriage'
  | 'caste_restrictions'
  | 'age_restrictions'
  | 'status_matching'
  | 'ritual_required'
  | 'approval_needed'
  | 'breeding_rights'
  // Extended for diverse paradigms
  | 'triad_registration'
  | 'collective_approval_needed';

/** Configuration of social mating regulation */
export interface SocialMatingRegulation {
  regulated: boolean;
  regulations?: SocialRegulationType[];
  violationConsequences?: string[];
}

// ============================================================================
// Hybridization Types
// ============================================================================

/** What enables hybridization */
export type HybridizationEnabler =
  | 'genetic_compatibility'
  | 'magical_intervention'
  | 'divine_blessing'
  | 'quantum_possibility'
  | 'emotional_transcendence'
  | 'ritual'
  | 'union_magic'
  | 'host_compatibility';

/** Configuration of hybridization */
export interface HybridizationConfig {
  possible: boolean;
  enablers?: HybridizationEnabler[];
  compatibleSpecies?: string[];
  offspringViability: 'always' | 'reduced' | 'sterile' | 'variable' | 'enhanced';
}

// ============================================================================
// Life Stage Types
// ============================================================================

/** Life stage affecting reproduction */
export interface LifeStageConfig {
  name: string;
  canReproduce: boolean;
  sexExpression?: string; // Which sex if kemmer-like
  duration: string;
  transitionTrigger?: string;
}

// ============================================================================
// The Complete Mating Paradigm
// ============================================================================

/**
 * Complete definition of how mating/reproduction works for a species.
 *
 * A MatingParadigm parameterizes the reproductive system for a species.
 * The same engine can simulate dolphins, hive insects, temporal beings,
 * and humans by swapping paradigms.
 */
export interface MatingParadigm {
  id: string;
  name: string;
  description: string;

  /** Species that use this paradigm */
  speciesIds: string[];

  /** Flavor/lore text */
  lore?: string;

  // =========================================================================
  // Core Systems
  // =========================================================================

  /** How biological sex works */
  biologicalSex: BiologicalSexConfig;

  /** How gender works (social) */
  gender: GenderConfig;

  /** How pair bonding works */
  pairBonding: PairBondingConfig;

  /** How courtship works */
  courtship: CourtshipConfig;

  /** How reproduction physically happens */
  reproduction: ReproductiveMechanismConfig;

  /** How offspring are cared for */
  parentalCare: ParentalCareConfig;

  /** What makes a desirable mate */
  mateSelection: MateSelectionConfig;

  // =========================================================================
  // Life Cycle Integration
  // =========================================================================

  /** When does sexual maturity occur? */
  maturityAge?: {
    min: number;
    max: number;
    determinedBy: 'age' | 'size' | 'social' | 'environmental' | 'random';
  };

  /** Reproductive lifespan */
  reproductiveWindow?: {
    startAge: number;
    endAge: number | 'never';
    canRestart: boolean;
  };

  /** Life cycle stages affecting reproduction */
  lifeStages?: LifeStageConfig[];

  // =========================================================================
  // Emotional/Social Dynamics
  // =========================================================================

  /** How attraction works */
  attraction: AttractionConfig;

  /** Emotional consequences of mating events */
  emotionalDynamics: EmotionalMatingConfig;

  /** Social regulation of mating */
  socialRegulation?: SocialMatingRegulation;

  // =========================================================================
  // Compatibility & Hybrids
  // =========================================================================

  /** Can this species hybridize with others? */
  hybridization: HybridizationConfig;

  /** Compatibility with other mating paradigms */
  paradigmCompatibility: 'isolated' | 'compatible' | 'absorbs' | 'transforms' | 'predatory';
}
