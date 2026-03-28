/**
 * Type declarations for @multiverse-studios/folkfork-bridge
 *
 * This file stubs the external package for CI environments where the
 * file: dependency cannot be resolved. Types are derived from the real
 * source at akashic-records/tools/folkfork-bridge/src/types.ts and
 * validator.ts.
 */

declare module '@multiverse-studios/folkfork-bridge' {
  // ─── Primitive enums ────────────────────────────────────────────────

  export type TraitCategory =
    | 'morphological'
    | 'behavioral'
    | 'metabolic'
    | 'cognitive'
    | 'social'
    | 'sensory';

  export type TransferFidelity =
    | 'lossless'
    | 'low_loss'
    | 'medium_loss'
    | 'lossy';

  export type MappingType = 'direct' | 'derived' | 'approximate' | 'no_analog';

  export type SwarmTendency =
    | 'independent'
    | 'conformist'
    | 'leader'
    | 'outlier'
    | 'unknown';

  export type LLMPortability =
    | 'portable'
    | 'retraining_required'
    | 'incompatible';

  export type SizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

  export type BodyPlan =
    | 'bipedal'
    | 'quadruped'
    | 'serpentine'
    | 'avian'
    | 'amorphous'
    | 'insectoid'
    | 'aquatic';

  export type VisualPattern = 'plain' | 'spotted' | 'striped' | 'mottled' | 'banded';

  export type SourceGame = 'precursors' | 'mvee';

  export type Severity = 'error' | 'warning' | 'info';

  // ─── Identity ───────────────────────────────────────────────────────

  export interface Identity {
    creature_id: string;
    name: string;
    species_id: string;
    species_name: string;
    generation: number;
    lineage_id: string;
    parent_ids: [string, string] | null;
  }

  // ─── Core Traits ────────────────────────────────────────────────────

  export interface CoreTrait {
    trait_id: string;
    category: TraitCategory;
    value: number;
    heritability: number;
    variance_range: [number, number] | null;
    transfer_fidelity: TransferFidelity;
    source_game: SourceGame;
    notes: string | null;
  }

  // ─── Drive Mapping ──────────────────────────────────────────────────

  export interface DriveMapping {
    source_drive: string;
    target_drive: string | null;
    mapping_type: MappingType;
    source_value: number;
    confidence: number;
    notes: string | null;
  }

  // ─── D_cc Compatibility ─────────────────────────────────────────────

  export interface DccProfile {
    dcc_baseline: number;
    behavioral_drift_vector: number[];
    drift_vector_labels: string[];
    measurement_tick: number;
    species_mean_drift: number[];
    interpretation: string | null;
  }

  // ─── Swarm History ───────────────────────────────────────────────────

  export interface CoordinationPrimitives {
    proximity_memory: boolean;
    outcome_broadcasting: boolean;
    behavioral_observation: boolean;
  }

  export interface SwarmHistory {
    swarm_dcc: number | null;
    cluster_membership: string | null;
    cluster_behavioral_centroid: number[] | null;
    swarm_tendency: SwarmTendency;
    coordination_primitives_active: CoordinationPrimitives;
    swarm_narrative: string | null;
  }

  // ─── Living LLMs ─────────────────────────────────────────────────────

  export interface LivingLLM {
    has_living_llm: boolean;
    model_id: string | null;
    base_model: string | null;
    training_data_ref: string | null;
    training_data_checksum: string | null;
    dcc_threshold_at_training: number | null;
    fine_tune_epochs: number | null;
    behavioral_traces_count: number | null;
    species_conditioning_prompt: string | null;
    portability: LLMPortability;
    portability_notes: string | null;
  }

  // ─── Visual Tokens ────────────────────────────────────────────────────

  export interface VisualTokens {
    base_hue: number;
    accent_hue: number;
    saturation: number;
    lightness: number;
    size_class: SizeClass;
    body_plan: BodyPlan;
    pattern: VisualPattern | null;
    marking_intensity: number | null;
    notable_features: string[] | null;
  }

  // ─── Game-Specific Extensions ─────────────────────────────────────────

  export interface LimbicWeightsRaw {
    hunger: number | null;
    thirst: number | null;
    pain: number | null;
    fatigue: number | null;
    fear: number | null;
    anger: number | null;
    loneliness: number | null;
    boredom: number | null;
    curiosity: number | null;
    escape: number | null;
    social: number | null;
    rest: number | null;
    limbic_influence: number | null;
  }

  export interface PrecursorsExtension {
    iq_tier: number | null;
    imprint_vector: number[] | null;
    chemical_snapshot: {
      chemicals: Record<string, number> | null;
    };
    invented_items: string[] | null;
    chronicle_highlights: string[] | null;
    offspring_count: number | null;
    limbic_weights_raw: LimbicWeightsRaw;
  }

  export interface MveeAllelePair {
    trait_id: string;
    allele1: number;
    allele2: number;
    expression: number;
  }

  export interface MveePersonality {
    fearfulness: number;
    aggressiveness: number;
    curiosity: number;
    sociability: number;
  }

  export interface MveeMutation {
    trait_id: string;
    effect: number;
    inherit_chance: number;
    beneficial: boolean;
  }

  export interface MveeNeedsSnapshot {
    hunger: number | null;
    energy: number | null;
    health: number | null;
    thirst: number | null;
    stress: number | null;
    mood: number | null;
  }

  export interface MveeTamingState {
    wild: boolean | null;
    bond_level: number | null;
    trust_level: number | null;
  }

  export interface MveeExtension {
    allele_pairs: MveeAllelePair[];
    personality: MveePersonality;
    mutations: MveeMutation[];
    needs_snapshot: MveeNeedsSnapshot;
    taming_state: MveeTamingState;
  }

  // ─── Provenance ───────────────────────────────────────────────────────

  export interface MigrationHistoryEntry {
    from_game: string;
    to_game: string;
    crossed_at: string;
    gdi_at_crossing: number;
    schema_version_used: string;
  }

  export interface Provenance {
    source_game: SourceGame;
    source_game_version: string;
    exported_at: string;
    exporter_version: string;
    migration_history: MigrationHistoryEntry[];
    folkfork_capsule_id: string | null;
    checksum: string;
  }

  // ─── Top-Level Genome ─────────────────────────────────────────────────

  export interface GenomeMigrationV1 {
    schema_version: string;
    identity: Identity;
    core_traits: CoreTrait[];
    drive_mapping: DriveMapping[];
    dcc_profile: DccProfile;
    swarm_history: SwarmHistory;
    living_llm: LivingLLM;
    visual_tokens: VisualTokens;
    precursors_extension: PrecursorsExtension | null;
    mvee_extension: MveeExtension | null;
    provenance: Provenance;
  }

  // ─── Validation ───────────────────────────────────────────────────────

  export interface ValidationFinding {
    field: string;
    message: string;
    severity: Severity;
  }

  export interface ValidationResult {
    valid: boolean;
    findings: ValidationFinding[];
    genome: GenomeMigrationV1 | null;
  }

  // ─── Migration Results ────────────────────────────────────────────────

  export interface FieldMigrationReport {
    trait_id: string;
    fidelity: TransferFidelity;
    source_value: number;
    target_value: number;
    notes: string | null;
  }

  export interface MigrationResult {
    success: boolean;
    source_game: SourceGame;
    target_game: SourceGame;
    field_reports: FieldMigrationReport[];
    lossless_count: number;
    low_loss_count: number;
    medium_loss_count: number;
    lossy_count: number;
    target_genome: GenomeMigrationV1;
  }

  // ─── Species Exchange v1 ──────────────────────────────────────────────

  export type ArchetypeSeed =
    | 'social_generalist' | 'territorial_predator' | 'collector_engineer'
    | 'knowledge_keeper' | 'environmental_adapter' | 'trickster'
    | 'guardian' | 'parasite_symbiont';

  export type EcologicalRole =
    | 'producer' | 'primary_consumer' | 'secondary_consumer'
    | 'keystone' | 'mutualist' | 'parasite' | 'decomposer';

  export interface MinViableGene {
    traitId: string;
    category: 'morphological' | 'behavioral' | 'metabolic' | 'cognitive' | 'social' | 'sensory';
    value: number;
    heritability: number;
    notes?: string;
  }

  export interface PersonalityExchange {
    curiosity: [number, number];
    empathy: [number, number];
    aggression: [number, number];
    playfulness: [number, number];
    stubbornness: [number, number];
    creativity: [number, number];
    sociability: [number, number];
    courage: [number, number];
  }

  export interface CultureExchange {
    learningRate: [number, number];
    teachingDrive: [number, number];
    traditionAffinity: [number, number];
    innovationRate: [number, number];
  }

  export interface IntelligenceExchange {
    cognitiveCapacity: [number, number];
    learningRate: [number, number];
    abstractionAffinity: [number, number];
    memoryDepth: [number, number];
  }

  export interface SpeciesVisualTokens {
    baseHue: number;
    accentHue: number;
    saturation: number;
    lightness: number;
    sizeClass: SizeClass;
    bodyPlan: BodyPlan;
    pattern: string | null;
    markingIntensity: number | null;
    notableFeatures: string[] | null;
  }

  export interface CrossGameAnchor {
    game: 'mvee' | 'cotb' | 'nel';
    surface: string;
    keywords: string[];
  }

  export interface LoreExchange {
    epithet: string;
    creationMyth?: string;
    culturalPractices: string[];
    languagePattern?: string;
    languageSeedWords?: string[];
    ancientLineage?: string;
    culturalTaboos?: string[];
    deathRitual?: string;
    folkloreTradition?: string;
    crossGameAnchors?: CrossGameAnchor[];
  }

  export interface SensitivityFlags {
    livingTradition: boolean;
    sourceAttribution: string;
    sensitivityNotes?: string;
    consultationStatus?: 'pending' | 'approved' | 'flagged';
  }

  export interface SpeciesProvenance {
    sourceGame: 'precursors';
    sourceGameVersion: string;
    exportedAt: string;
    exporterVersion: string;
    waveUnlocked: number;
    populationAtExport?: number;
    generationsObserved?: number;
    checksum: string;
  }

  export interface SpeciesExchangeV1 {
    formatVersion: '1.0.0';
    speciesId: string;
    speciesName: string;
    commonName?: string;
    archetypeSeed: ArchetypeSeed;
    ecologicalRole: EcologicalRole;
    dietType: 'herbivore' | 'carnivore' | 'omnivore';
    homeBiome: string;
    minViableGenes: MinViableGene[];
    personalityRanges: PersonalityExchange;
    cultureRanges: CultureExchange;
    intelligenceRanges: IntelligenceExchange;
    mutationRate?: number;
    compatibleSpecies?: string[];
    visualTokens: SpeciesVisualTokens;
    lore: LoreExchange;
    sensitivity: SensitivityFlags;
    provenance: SpeciesProvenance;
  }

  export interface ManifestEntry {
    id: string;
    name: string;
    checksum: string;
    exportedAt: string;
  }

  export interface SpeciesManifest {
    species: ManifestEntry[];
  }

  export interface SpeciesValidationFinding {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }

  export interface SpeciesValidationResult {
    valid: boolean;
    findings: SpeciesValidationFinding[];
    species: SpeciesExchangeV1 | null;
  }

  // ─── Runtime exports ─────────────────────────────────────────────────

  export function validateGenome(data: unknown): ValidationResult;
  export function migrateGenome(genome: GenomeMigrationV1): MigrationResult;
  export function validateSpeciesExchange(data: unknown): SpeciesValidationResult;
}
