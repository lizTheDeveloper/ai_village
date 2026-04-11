/**
 * FolkforkSpeciesTranslator - Cross-game species translation layer
 *
 * Supports:
 * - Legacy `species_exchange_v1` payloads (backward compatibility)
 * - Canonical `species_lineage_v1` payloads (MUL-4696)
 *
 * The translator maps payloads into MVEE's SpeciesTemplate and persists imported
 * species in SPECIES_REGISTRY with migration metadata/state tracking.
 */

import type {
  SpeciesBehaviorProfile,
  SpeciesInterspeciesRelation,
  SpeciesUniqueBehavior,
  CulturalProtocolComponent,
  EcologyProfileComponent,
  MigrationStatus,
  MigrationStatusTransition,
  SpeciesLineageSnapshot,
  SpeciesLoreDepth,
  SpeciesMigrationMetadata,
  SpeciesTemplate,
  SpeciesVisualIdentity,
} from './SpeciesRegistry.js';
import { SPECIES_REGISTRY } from './SpeciesRegistry.js';
import type { SpeciesTrait } from '../components/SpeciesComponent.js';

// ============================================================================
// Legacy species_exchange_v1 types (backward compatibility)
// ============================================================================

type ArchetypeSeed =
  | 'social_generalist'
  | 'territorial_predator'
  | 'collector_engineer'
  | 'knowledge_keeper'
  | 'environmental_adapter'
  | 'trickster'
  | 'guardian'
  | 'parasite_symbiont'
  | 'honor_bound_predator';

interface MinViableGene {
  traitId: string;
  category: string;
  value: number;
  heritability: number;
}

interface PersonalityExchange {
  curiosity: [number, number];
  empathy: [number, number];
  aggression: [number, number];
  playfulness: [number, number];
  stubbornness: [number, number];
  creativity: [number, number];
  sociability: [number, number];
  courage: [number, number];
}

interface CultureExchange {
  learningRate: [number, number];
  teachingDrive: [number, number];
  traditionAffinity: [number, number];
  innovationRate: [number, number];
}

interface IntelligenceExchange {
  cognitiveCapacity: [number, number];
  learningRate: [number, number];
  abstractionAffinity: [number, number];
  memoryDepth: [number, number];
}

type SizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

interface LoreExchange {
  epithet: string;
  creationMyth?: string;
  culturalPractices: string[];
  languagePattern?: string;
  folkloreTradition?: string;
}

interface SensitivityFlags {
  livingTradition: boolean;
  sourceAttribution: string;
  sensitivityNotes?: string;
  consultationStatus?: string;
}

interface SpeciesProvenance {
  sourceGame: string;
  sourceGameVersion: string;
  exportedAt: string;
  exporterVersion: string;
  waveUnlocked: number;
  checksum: string;
}

export interface SpeciesExchangeV1 {
  formatVersion: '1.0.0' | '0.1.0';
  speciesId: string;
  speciesName: string;
  commonName?: string;
  archetypeSeed: ArchetypeSeed;
  ecologicalRole: string;
  dietType: 'herbivore' | 'carnivore' | 'omnivore';
  homeBiome: string;
  minViableGenes: MinViableGene[];
  personalityRanges: PersonalityExchange;
  cultureRanges: CultureExchange;
  intelligenceRanges: IntelligenceExchange;
  mutationRate?: number;
  compatibleSpecies?: string[];
  visualTokens: { sizeClass: SizeClass; bodyPlan: string; [key: string]: unknown };
  lore: LoreExchange;
  sensitivity: SensitivityFlags;
  provenance: SpeciesProvenance;
}

// ============================================================================
// Canonical species_lineage_v1 contract types
// ============================================================================

type SourceGame = 'precursors' | 'mvee' | 'nel' | 'cotb';

type EcologicalRoleV1 =
  | 'keystone'
  | 'secondary_consumer'
  | 'primary_consumer'
  | 'decomposer'
  | 'parasite'
  | 'mutualist'
  | 'apex_predator';

type DietV1 = 'herbivore' | 'carnivore' | 'omnivore' | 'parasitic' | 'chemosynthetic' | 'photosynthetic';

type SocialStructureV1 =
  | 'solitary'
  | 'pair_bonding'
  | 'pack'
  | 'herd'
  | 'colony'
  | 'hive'
  | 'fission_fusion';

type ActivityPatternV1 = 'diurnal' | 'nocturnal' | 'crepuscular' | 'cathemeral';

type PopulationDensityV1 = 'rare' | 'uncommon' | 'common' | 'abundant';

type InterspeciesDispositionV1 =
  | 'predatory'
  | 'parasitic'
  | 'symbiotic'
  | 'competitive'
  | 'neutral'
  | 'fearful'
  | 'protective';

interface CulturalProtocolV1 {
  livingTradition?: boolean;
  respectNotes?: string;
  avoidances?: string[];
}

interface FolkloreTraditionV1 {
  primaryTradition: string;
  culturalOrigin: string;
  secondaryTraditions?: string[];
  sourceAttribution: string;
  culturalProtocol?: CulturalProtocolV1;
  earthContactRecord?: string;
  protoLanguageRoot?: string;
}

interface EcologicalProfileV1 {
  ecologicalRole: EcologicalRoleV1;
  diet: DietV1;
  biomePreferences: string[];
  sizeClass: SizeClass;
  bodyPlan: string;
  socialStructure?: SocialStructureV1;
  activityPattern?: ActivityPatternV1;
  populationDensity?: PopulationDensityV1;
}

interface PersonalityBaselineV1 {
  curiosity?: number;
  aggression?: number;
  sociability?: number;
  fearfulness?: number;
  playfulness?: number;
  empathy?: number;
  stubbornness?: number;
  creativity?: number;
}

interface UniqueBehaviorV1 {
  behaviorId: string;
  description: string;
  triggerHint: string;
}

interface InterspeciesRelationV1 {
  targetSpeciesId: string;
  disposition: InterspeciesDispositionV1;
  description?: string;
}

interface BehavioralArchetypeV1 {
  archetypeSeed: ArchetypeSeed;
  cognitiveCeiling: number;
  personalityBaseline?: PersonalityBaselineV1;
  uniqueBehaviors?: UniqueBehaviorV1[];
  interspeciesRelations?: InterspeciesRelationV1[];
}

interface VisualIdentityV1 {
  primaryHueRange: [number, number];
  secondaryHueRange: [number, number];
  bioluminescent?: boolean;
  distinctiveFeatures?: string[];
  spriteSheetRef?: string;
}

interface PatronCreditsV1 {
  proposalId?: string | null;
  patrons?: Array<{
    playerId: string;
    displayName?: string;
    contribution: string;
    pointsPledged?: number;
  }>;
  totalPointsPooled?: number;
  originalSubmitter?: string | null;
}

interface LoreDepthV1 {
  hasCanonicalFolklore: boolean;
  hasCultureDoc: boolean;
  hasSongCorpus: boolean;
  hasLanguageDoc: boolean;
  mythCount: number;
  waveNumber: number;
  akashicRecordsPath: string;
}

interface MigrationMetadataV1 {
  migrationStatus: MigrationStatus;
  sourceGameVersion: string;
  exportedAt?: string;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  scheherazadeSignoff?: boolean;
  sylviaSignoff?: boolean;
  targetGameAdaptations?: Record<string, string>;
}

export interface SpeciesLineageV1 {
  formatVersion: '1.0.0';
  speciesId: string;
  canonicalName: string;
  folkloreTradition: FolkloreTraditionV1;
  ecologicalProfile: EcologicalProfileV1;
  behavioralArchetype: BehavioralArchetypeV1;
  visualIdentity: VisualIdentityV1;
  migrationMetadata: MigrationMetadataV1;
  sourceGame: SourceGame;
  patronCredits?: PatronCreditsV1;
  loreDepth?: LoreDepthV1;
}

export type FolkforkSpeciesPayload = SpeciesExchangeV1 | SpeciesLineageV1;

// ============================================================================
// Internal normalized model
// ============================================================================

interface NormalizedExchange {
  speciesId: string;
  speciesName: string;
  commonName?: string;
  archetypeSeed: ArchetypeSeed;
  ecologicalRole: string;
  dietType: string;
  homeBiome: string;
  personalityRanges: PersonalityExchange;
  cultureRanges: CultureExchange;
  intelligenceRanges: IntelligenceExchange;
  mutationRate?: number;
  compatibleSpecies?: string[];
  visualTokens: { sizeClass: SizeClass; bodyPlan: string; [key: string]: unknown };
  lore: LoreExchange;
  sourceGame: SourceGame;
  lineageV1?: SpeciesLineageV1;
}

// ============================================================================
// Constants
// ============================================================================

const SOURCE_GAMES: readonly SourceGame[] = ['precursors', 'mvee', 'nel', 'cotb'];

const MIGRATION_STATUS_FLOW: readonly MigrationStatus[] = [
  'candidate',
  'reviewed',
  'approved',
  'migrated',
  'active_in_target',
];

const SPECIES_HEIGHT_SCALE: Record<SizeClass, number> = {
  tiny: 30,
  small: 80,
  medium: 160,
  large: 250,
  huge: 500,
};

const BODY_PLAN_DENSITY: Record<string, number> = {
  bipedal: 0.45,
  quadruped: 0.55,
  serpentine: 0.35,
  avian: 0.25,
  amorphous: 0.4,
  insectoid: 0.3,
  aquatic: 0.5,
};

const GESTATION_BY_SIZE: Record<SizeClass, number> = {
  tiny: 5,
  small: 10,
  medium: 20,
  large: 30,
  huge: 60,
};

const BASE_LIFESPAN_BY_SIZE: Record<SizeClass, number> = {
  tiny: 20,
  small: 40,
  medium: 80,
  large: 150,
  huge: 300,
};

const BODY_PLAN_ID_MAP: Record<string, string> = {
  bipedal: 'humanoid_standard',
  quadruped: 'quadruped_standard',
  serpentine: 'serpentine_standard',
  avian: 'avian_standard',
  amorphous: 'amorphous_standard',
  insectoid: 'insectoid_4arm',
  aquatic: 'aquatic_tentacled',
};

const SOCIAL_STRUCTURE_MAP_V1: Record<SocialStructureV1, string> = {
  solitary: 'solitary_territorial',
  pair_bonding: 'pair_bonded',
  pack: 'pack_hierarchy',
  herd: 'herd_safety',
  colony: 'eusocial_colony',
  hive: 'eusocial_colony',
  fission_fusion: 'fission_fusion_network',
};

// ============================================================================
// Generic helpers
// ============================================================================

function midpoint(range: [number, number]): number {
  return (range[0] + range[1]) / 2;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toRange(center: number, spread = 0.1): [number, number] {
  return [clamp01(center - spread), clamp01(center + spread)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isSourceGame(value: string): value is SourceGame {
  return (SOURCE_GAMES as readonly string[]).includes(value);
}

function normalizeSourceGame(value: string | undefined): SourceGame {
  if (typeof value === 'string' && isSourceGame(value)) {
    return value;
  }
  return 'precursors';
}

function readString(obj: Record<string, unknown>, key: string, context: string): string {
  const value = obj[key];
  assert(typeof value === 'string' && value.trim().length > 0, `${context}.${key} must be a non-empty string`);
  return value;
}

function readNumber(obj: Record<string, unknown>, key: string, context: string): number {
  const value = obj[key];
  assert(typeof value === 'number' && Number.isFinite(value), `${context}.${key} must be a finite number`);
  return value;
}

function readBoolean(obj: Record<string, unknown>, key: string, context: string): boolean {
  const value = obj[key];
  assert(typeof value === 'boolean', `${context}.${key} must be a boolean`);
  return value;
}

function readStringArray(obj: Record<string, unknown>, key: string, context: string): string[] {
  const value = obj[key];
  assert(Array.isArray(value), `${context}.${key} must be an array`);
  for (const entry of value) {
    assert(typeof entry === 'string', `${context}.${key} entries must be strings`);
  }
  return value as string[];
}

function readNumberTuple(
  obj: Record<string, unknown>,
  key: string,
  context: string,
): [number, number] {
  const value = obj[key];
  assert(Array.isArray(value) && value.length === 2, `${context}.${key} must be a 2-item array`);
  const [a, b] = value;
  assert(typeof a === 'number' && typeof b === 'number', `${context}.${key} entries must be numbers`);
  return [a, b];
}

function toStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === 'string'),
  ) as Record<string, string>;
}

function migrationIndex(status: MigrationStatus): number {
  return MIGRATION_STATUS_FLOW.indexOf(status);
}

function normalizeMigrationMetadata(metadata: MigrationMetadataV1): SpeciesMigrationMetadata {
  return {
    migrationStatus: metadata.migrationStatus,
    sourceGameVersion: metadata.sourceGameVersion,
    exportedAt: metadata.exportedAt,
    reviewedBy: metadata.reviewedBy,
    reviewNotes: metadata.reviewNotes,
    scheherazadeSignoff: Boolean(metadata.scheherazadeSignoff),
    sylviaSignoff: Boolean(metadata.sylviaSignoff),
    targetGameAdaptations: metadata.targetGameAdaptations,
  };
}

function enforceSignoffGate(metadata: SpeciesMigrationMetadata): void {
  const idx = migrationIndex(metadata.migrationStatus);
  const approvedIdx = migrationIndex('approved');
  if (idx >= approvedIdx && (!metadata.scheherazadeSignoff || !metadata.sylviaSignoff)) {
    throw new Error(
      `migrationStatus '${metadata.migrationStatus}' requires both scheherazadeSignoff and sylviaSignoff`,
    );
  }
}

function buildTransitionHistory(
  existingHistory: MigrationStatusTransition[],
  fromStatus: MigrationStatus,
  toStatus: MigrationStatus,
  changedAt: string,
): MigrationStatusTransition[] {
  const fromIndex = migrationIndex(fromStatus);
  const toIndex = migrationIndex(toStatus);

  assert(fromIndex >= 0 && toIndex >= 0, 'unknown migration status encountered');
  assert(toIndex >= fromIndex, `migration status cannot move backwards: ${fromStatus} -> ${toStatus}`);

  if (toIndex === fromIndex) {
    return existingHistory;
  }

  const nextHistory = [...existingHistory];
  for (let i = fromIndex + 1; i <= toIndex; i += 1) {
    const from = MIGRATION_STATUS_FLOW[i - 1];
    const to = MIGRATION_STATUS_FLOW[i];
    if (from && to) {
      nextHistory.push({ from, to, changedAt });
    }
  }

  return nextHistory;
}

// ============================================================================
// Contract validation + parsing (species_lineage_v1)
// ============================================================================

function parsePersonalityBaseline(value: unknown): PersonalityBaselineV1 | undefined {
  if (!isRecord(value)) return undefined;

  const result: PersonalityBaselineV1 = {};
  const keys: Array<keyof PersonalityBaselineV1> = [
    'curiosity',
    'aggression',
    'sociability',
    'fearfulness',
    'playfulness',
    'empathy',
    'stubbornness',
    'creativity',
  ];

  for (const key of keys) {
    const maybe = value[key];
    if (typeof maybe === 'number') {
      result[key] = clamp01(maybe);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function parseLoreDepth(value: unknown): LoreDepthV1 | undefined {
  if (!isRecord(value)) return undefined;

  return {
    hasCanonicalFolklore: readBoolean(value, 'hasCanonicalFolklore', 'loreDepth'),
    hasCultureDoc: readBoolean(value, 'hasCultureDoc', 'loreDepth'),
    hasSongCorpus: readBoolean(value, 'hasSongCorpus', 'loreDepth'),
    hasLanguageDoc: readBoolean(value, 'hasLanguageDoc', 'loreDepth'),
    mythCount: Math.max(0, Math.floor(readNumber(value, 'mythCount', 'loreDepth'))),
    waveNumber: Math.max(0, Math.floor(readNumber(value, 'waveNumber', 'loreDepth'))),
    akashicRecordsPath: readString(value, 'akashicRecordsPath', 'loreDepth'),
  };
}

/**
 * Parse and validate canonical species_lineage_v1 payloads.
 */
export function parseSpeciesLineageV1(payload: unknown): SpeciesLineageV1 {
  assert(isRecord(payload), 'species_lineage_v1 payload must be an object');

  const formatVersion = readString(payload, 'formatVersion', 'root');
  assert(formatVersion === '1.0.0', 'root.formatVersion must be 1.0.0');

  const speciesId = readString(payload, 'speciesId', 'root');
  const canonicalName = readString(payload, 'canonicalName', 'root');

  const sourceGameRaw = readString(payload, 'sourceGame', 'root');
  assert(isSourceGame(sourceGameRaw), 'root.sourceGame must be one of precursors|mvee|nel|cotb');

  const folkloreObj = payload['folkloreTradition'];
  assert(isRecord(folkloreObj), 'root.folkloreTradition must be an object');

  const culturalProtocolObj = folkloreObj['culturalProtocol'];
  const culturalProtocol: CulturalProtocolV1 | undefined = isRecord(culturalProtocolObj)
    ? {
        livingTradition:
          typeof culturalProtocolObj['livingTradition'] === 'boolean'
            ? culturalProtocolObj['livingTradition']
            : undefined,
        respectNotes:
          typeof culturalProtocolObj['respectNotes'] === 'string'
            ? culturalProtocolObj['respectNotes']
            : undefined,
        avoidances: Array.isArray(culturalProtocolObj['avoidances'])
          ? (culturalProtocolObj['avoidances'].filter((item): item is string => typeof item === 'string'))
          : undefined,
      }
    : undefined;

  const folkloreTradition: FolkloreTraditionV1 = {
    primaryTradition: readString(folkloreObj, 'primaryTradition', 'folkloreTradition'),
    culturalOrigin: readString(folkloreObj, 'culturalOrigin', 'folkloreTradition'),
    sourceAttribution: readString(folkloreObj, 'sourceAttribution', 'folkloreTradition'),
    secondaryTraditions: Array.isArray(folkloreObj['secondaryTraditions'])
      ? (folkloreObj['secondaryTraditions'].filter((item): item is string => typeof item === 'string'))
      : undefined,
    culturalProtocol,
    earthContactRecord:
      typeof folkloreObj['earthContactRecord'] === 'string' ? folkloreObj['earthContactRecord'] : undefined,
    protoLanguageRoot:
      typeof folkloreObj['protoLanguageRoot'] === 'string' ? folkloreObj['protoLanguageRoot'] : undefined,
  };

  if (folkloreTradition.culturalProtocol?.livingTradition === true) {
    const notes = folkloreTradition.culturalProtocol.respectNotes;
    assert(typeof notes === 'string' && notes.trim().length > 0, 'culturalProtocol.respectNotes is required when livingTradition=true');
  }

  const ecologicalObj = payload['ecologicalProfile'];
  assert(isRecord(ecologicalObj), 'root.ecologicalProfile must be an object');

  const ecologicalProfile: EcologicalProfileV1 = {
    ecologicalRole: readString(ecologicalObj, 'ecologicalRole', 'ecologicalProfile') as EcologicalRoleV1,
    diet: readString(ecologicalObj, 'diet', 'ecologicalProfile') as DietV1,
    biomePreferences: readStringArray(ecologicalObj, 'biomePreferences', 'ecologicalProfile'),
    sizeClass: readString(ecologicalObj, 'sizeClass', 'ecologicalProfile') as SizeClass,
    bodyPlan: readString(ecologicalObj, 'bodyPlan', 'ecologicalProfile'),
    socialStructure:
      typeof ecologicalObj['socialStructure'] === 'string'
        ? (ecologicalObj['socialStructure'] as SocialStructureV1)
        : undefined,
    activityPattern:
      typeof ecologicalObj['activityPattern'] === 'string'
        ? (ecologicalObj['activityPattern'] as ActivityPatternV1)
        : undefined,
    populationDensity:
      typeof ecologicalObj['populationDensity'] === 'string'
        ? (ecologicalObj['populationDensity'] as PopulationDensityV1)
        : undefined,
  };

  const behaviorObj = payload['behavioralArchetype'];
  assert(isRecord(behaviorObj), 'root.behavioralArchetype must be an object');

  const behavioralArchetype: BehavioralArchetypeV1 = {
    archetypeSeed: readString(behaviorObj, 'archetypeSeed', 'behavioralArchetype') as ArchetypeSeed,
    cognitiveCeiling: clamp01(readNumber(behaviorObj, 'cognitiveCeiling', 'behavioralArchetype')),
    personalityBaseline: parsePersonalityBaseline(behaviorObj['personalityBaseline']),
    uniqueBehaviors: Array.isArray(behaviorObj['uniqueBehaviors'])
      ? behaviorObj['uniqueBehaviors']
          .filter((entry): entry is Record<string, unknown> => isRecord(entry))
          .map((entry) => ({
            behaviorId: readString(entry, 'behaviorId', 'behavioralArchetype.uniqueBehaviors[]'),
            description: readString(entry, 'description', 'behavioralArchetype.uniqueBehaviors[]'),
            triggerHint: readString(entry, 'triggerHint', 'behavioralArchetype.uniqueBehaviors[]'),
          }))
      : undefined,
    interspeciesRelations: Array.isArray(behaviorObj['interspeciesRelations'])
      ? behaviorObj['interspeciesRelations']
          .filter((entry): entry is Record<string, unknown> => isRecord(entry))
          .map((entry) => ({
            targetSpeciesId: readString(entry, 'targetSpeciesId', 'behavioralArchetype.interspeciesRelations[]'),
            disposition: readString(entry, 'disposition', 'behavioralArchetype.interspeciesRelations[]') as InterspeciesDispositionV1,
            description: typeof entry['description'] === 'string' ? entry['description'] : undefined,
          }))
      : undefined,
  };

  const visualObj = payload['visualIdentity'];
  assert(isRecord(visualObj), 'root.visualIdentity must be an object');

  const visualIdentity: VisualIdentityV1 = {
    primaryHueRange: readNumberTuple(visualObj, 'primaryHueRange', 'visualIdentity'),
    secondaryHueRange: readNumberTuple(visualObj, 'secondaryHueRange', 'visualIdentity'),
    bioluminescent:
      typeof visualObj['bioluminescent'] === 'boolean' ? visualObj['bioluminescent'] : undefined,
    distinctiveFeatures: Array.isArray(visualObj['distinctiveFeatures'])
      ? (visualObj['distinctiveFeatures'].filter((item): item is string => typeof item === 'string'))
      : undefined,
    spriteSheetRef:
      typeof visualObj['spriteSheetRef'] === 'string' ? visualObj['spriteSheetRef'] : undefined,
  };

  const migrationObj = payload['migrationMetadata'];
  assert(isRecord(migrationObj), 'root.migrationMetadata must be an object');

  const migrationStatus = readString(migrationObj, 'migrationStatus', 'migrationMetadata') as MigrationStatus;
  assert(migrationIndex(migrationStatus) >= 0, 'migrationMetadata.migrationStatus is invalid');

  const migrationMetadata: MigrationMetadataV1 = {
    migrationStatus,
    sourceGameVersion: readString(migrationObj, 'sourceGameVersion', 'migrationMetadata'),
    exportedAt: typeof migrationObj['exportedAt'] === 'string' ? migrationObj['exportedAt'] : undefined,
    reviewedBy:
      typeof migrationObj['reviewedBy'] === 'string' || migrationObj['reviewedBy'] === null
        ? (migrationObj['reviewedBy'] as string | null)
        : undefined,
    reviewNotes:
      typeof migrationObj['reviewNotes'] === 'string' || migrationObj['reviewNotes'] === null
        ? (migrationObj['reviewNotes'] as string | null)
        : undefined,
    scheherazadeSignoff:
      typeof migrationObj['scheherazadeSignoff'] === 'boolean'
        ? migrationObj['scheherazadeSignoff']
        : undefined,
    sylviaSignoff:
      typeof migrationObj['sylviaSignoff'] === 'boolean' ? migrationObj['sylviaSignoff'] : undefined,
    targetGameAdaptations: toStringRecord(migrationObj['targetGameAdaptations']),
  };

  const normalizedMigration = normalizeMigrationMetadata(migrationMetadata);
  enforceSignoffGate(normalizedMigration);

  const lineage: SpeciesLineageV1 = {
    formatVersion: '1.0.0',
    speciesId,
    canonicalName,
    folkloreTradition,
    ecologicalProfile,
    behavioralArchetype,
    visualIdentity,
    migrationMetadata,
    sourceGame: sourceGameRaw,
    patronCredits: isRecord(payload['patronCredits']) ? (payload['patronCredits'] as PatronCreditsV1) : undefined,
    loreDepth: parseLoreDepth(payload['loreDepth']),
  };

  return lineage;
}

function isLineagePayload(payload: unknown): payload is SpeciesLineageV1 {
  return (
    isRecord(payload) &&
    typeof payload['canonicalName'] === 'string' &&
    isRecord(payload['ecologicalProfile']) &&
    isRecord(payload['behavioralArchetype'])
  );
}

// ============================================================================
// Derivation helpers (legacy + normalized lineage)
// ============================================================================

function deriveLifespanType(lifespan: number): 'mortal' | 'long_lived' | 'ageless' | 'immortal' {
  if (lifespan < 200) return 'mortal';
  if (lifespan < 1000) return 'long_lived';
  if (lifespan < 10000) return 'ageless';
  return 'immortal';
}

function deriveInnateTraits(
  personality: PersonalityExchange,
  intelligence: IntelligenceExchange,
): SpeciesTrait[] {
  const traits: SpeciesTrait[] = [];

  if (midpoint(personality.aggression) > 0.7) {
    traits.push({
      id: 'aggressive',
      name: 'Aggressive',
      description: 'Naturally combative',
      category: 'social',
      skillBonus: { combat: 0.2 },
    });
  }

  if (midpoint(personality.curiosity) > 0.7) {
    traits.push({
      id: 'curious',
      name: 'Curious',
      description: 'Driven to explore',
      category: 'social',
      skillBonus: { research: 0.2 },
    });
  }

  if (midpoint(personality.empathy) > 0.7) {
    traits.push({
      id: 'empathic',
      name: 'Empathic',
      description: 'Deeply attuned to others',
      category: 'social',
      skillBonus: { diplomacy: 0.2 },
    });
  }

  if (midpoint(personality.sociability) > 0.7) {
    traits.push({
      id: 'gregarious',
      name: 'Gregarious',
      description: 'Thrives in groups',
      category: 'social',
      needsModifier: { loneliness: 1.5 },
    });
  }

  if (midpoint(personality.courage) > 0.7) {
    traits.push({
      id: 'brave',
      name: 'Brave',
      description: 'Fearless in danger',
      category: 'social',
      skillBonus: { exploration: 0.15 },
    });
  }

  if (midpoint(personality.creativity) > 0.7) {
    traits.push({
      id: 'creative',
      name: 'Creative',
      description: 'Inventive and artistic',
      category: 'social',
      skillBonus: { crafting: 0.15 },
    });
  }

  if (midpoint(intelligence.abstractionAffinity) > 0.7) {
    traits.push({
      id: 'spirit_sight',
      name: 'Spirit Sight',
      description: 'Can perceive spiritual realm',
      category: 'spiritual',
      abilitiesGranted: ['spirit_sight'],
    });
  }

  if (midpoint(intelligence.memoryDepth) > 0.7) {
    traits.push({
      id: 'ancestral_memory',
      name: 'Ancestral Memory',
      description: 'Carries memories of ancestors',
      category: 'spiritual',
      abilitiesGranted: ['ancestral_memory'],
    });
  }

  return traits;
}

function deriveSocialStructure(culture: CultureExchange): string {
  const scores: Record<string, number> = {
    traditionAffinity: midpoint(culture.traditionAffinity),
    innovationRate: midpoint(culture.innovationRate),
    teachingDrive: midpoint(culture.teachingDrive),
    learningRate: midpoint(culture.learningRate),
  };

  const keys = Object.keys(scores);
  const sorted = keys.slice().sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const highest = sorted[0] ?? 'traditionAffinity';
  const secondHighest = sorted[1] ?? highest;

  const dominantGap = (scores[highest] ?? 0) - (scores[secondHighest] ?? 0);
  if (dominantGap <= 0.15) return 'communal_balanced';

  switch (highest) {
    case 'traditionAffinity': return 'hierarchical_traditional';
    case 'innovationRate': return 'egalitarian_innovative';
    case 'teachingDrive': return 'mentor_apprentice';
    case 'learningRate': return 'adaptive_nomadic';
    default: return 'communal_balanced';
  }
}

function deriveTerritoryFocus(archetypeSeed: ArchetypeSeed): [number, number] {
  switch (archetypeSeed) {
    case 'territorial_predator':
    case 'guardian':
    case 'honor_bound_predator':
      return [0.6, 0.9];
    case 'social_generalist':
    case 'environmental_adapter':
      return [0.1, 0.4];
    default:
      return [0.3, 0.6];
  }
}

function deriveGenomeFlags(
  personality: PersonalityExchange,
  culture: CultureExchange,
  archetypeSeed: ArchetypeSeed,
): Record<string, [number, number]> {
  const social_orientation: [number, number] = [
    clamp01((personality.sociability[0] + personality.empathy[0]) / 2),
    clamp01((personality.sociability[1] + personality.empathy[1]) / 2),
  ];

  const combat_readiness: [number, number] = [
    clamp01((personality.aggression[0] + personality.courage[0]) / 2),
    clamp01((personality.aggression[1] + personality.courage[1]) / 2),
  ];

  const craft_focus: [number, number] = [
    clamp01((personality.creativity[0] + culture.innovationRate[0]) / 2),
    clamp01((personality.creativity[1] + culture.innovationRate[1]) / 2),
  ];

  const patience: [number, number] = [
    clamp01(1 - (personality.playfulness[1] + personality.stubbornness[1]) / 2),
    clamp01(1 - (personality.playfulness[0] + personality.stubbornness[0]) / 2),
  ];

  const curiosity: [number, number] = [personality.curiosity[0], personality.curiosity[1]];

  const territory_focus = deriveTerritoryFocus(archetypeSeed);

  const independence: [number, number] = [
    clamp01(1 - (personality.sociability[1] + culture.traditionAffinity[1]) / 2),
    clamp01(1 - (personality.sociability[0] + culture.traditionAffinity[0]) / 2),
  ];

  return {
    social_orientation,
    combat_readiness,
    craft_focus,
    patience,
    curiosity,
    territory_focus,
    independence,
  };
}

function derivePersonalityRangesFromLineage(lineage: SpeciesLineageV1): PersonalityExchange {
  const baseline = lineage.behavioralArchetype.personalityBaseline ?? {};

  const curiosity = baseline.curiosity ?? 0.5;
  const empathy = baseline.empathy ?? 0.5;
  const aggression = baseline.aggression ?? 0.5;
  const playfulness = baseline.playfulness ?? 0.5;
  const stubbornness = baseline.stubbornness ?? 0.5;
  const creativity = baseline.creativity ?? 0.5;
  const sociability = baseline.sociability ?? 0.5;
  const courage = baseline.fearfulness !== undefined ? clamp01(1 - baseline.fearfulness) : 0.5;

  return {
    curiosity: toRange(curiosity),
    empathy: toRange(empathy),
    aggression: toRange(aggression),
    playfulness: toRange(playfulness),
    stubbornness: toRange(stubbornness),
    creativity: toRange(creativity),
    sociability: toRange(sociability),
    courage: toRange(courage),
  };
}

function deriveCultureRangesFromLineage(lineage: SpeciesLineageV1): CultureExchange {
  const cognition = clamp01(lineage.behavioralArchetype.cognitiveCeiling);
  const social = lineage.ecologicalProfile.socialStructure;
  const livingTradition = lineage.folkloreTradition.culturalProtocol?.livingTradition ?? false;

  const teachingCenter =
    social === 'pack' ||
    social === 'herd' ||
    social === 'pair_bonding' ||
    social === 'colony' ||
    social === 'hive'
      ? 0.65
      : 0.4;

  const traditionCenter = livingTradition
    ? 0.8
    : social === 'hive' || social === 'colony'
      ? 0.7
      : 0.55;

  const innovationCenter = lineage.behavioralArchetype.archetypeSeed === 'trickster' ? 0.75 : 0.45;
  const learningCenter = clamp01(0.35 + cognition * 0.5);

  return {
    learningRate: toRange(learningCenter, 0.15),
    teachingDrive: toRange(teachingCenter, 0.15),
    traditionAffinity: toRange(traditionCenter, 0.15),
    innovationRate: toRange(innovationCenter, 0.15),
  };
}

function deriveIntelligenceRangesFromLineage(lineage: SpeciesLineageV1): IntelligenceExchange {
  const cognitive = clamp01(lineage.behavioralArchetype.cognitiveCeiling);
  const mythWeight = clamp01((lineage.loreDepth?.mythCount ?? 0) / 10);

  const learning = clamp01(0.3 + cognitive * 0.5);
  const abstraction = clamp01(cognitive * 0.8 + mythWeight * 0.1);
  const memory = clamp01(cognitive * 0.7 + mythWeight * 0.2);

  return {
    cognitiveCapacity: toRange(cognitive),
    learningRate: toRange(learning),
    abstractionAffinity: toRange(abstraction),
    memoryDepth: toRange(memory),
  };
}

function buildLoreFromLineage(lineage: SpeciesLineageV1): LoreExchange {
  const practices: string[] = [];

  if (lineage.folkloreTradition.culturalProtocol?.respectNotes) {
    practices.push(lineage.folkloreTradition.culturalProtocol.respectNotes);
  }

  if (lineage.folkloreTradition.earthContactRecord) {
    practices.push(lineage.folkloreTradition.earthContactRecord);
  }

  return {
    epithet: `${lineage.canonicalName} of ${lineage.folkloreTradition.primaryTradition}`,
    creationMyth: lineage.folkloreTradition.earthContactRecord,
    culturalPractices: practices.length > 0 ? practices : [`Origins in ${lineage.folkloreTradition.primaryTradition}`],
    languagePattern: lineage.folkloreTradition.protoLanguageRoot,
    folkloreTradition: lineage.folkloreTradition.primaryTradition,
  };
}

function deriveCompatibleSpeciesFromLineage(lineage: SpeciesLineageV1): string[] {
  const relations = lineage.behavioralArchetype.interspeciesRelations;
  if (!relations || relations.length === 0) {
    return [];
  }

  const compatible = relations
    .filter((relation) => relation.disposition === 'symbiotic' || relation.disposition === 'protective')
    .map((relation) => `folkfork_${relation.targetSpeciesId}`);

  return [...new Set(compatible)];
}

function mapSocialStructureFromContract(value: SocialStructureV1 | undefined): string | undefined {
  if (!value) return undefined;
  return SOCIAL_STRUCTURE_MAP_V1[value];
}

function toCulturalProtocolComponent(lineage: SpeciesLineageV1): CulturalProtocolComponent {
  const protocol = lineage.folkloreTradition.culturalProtocol;
  return {
    livingTradition: Boolean(protocol?.livingTradition),
    respectNotes: protocol?.respectNotes,
    avoidances: protocol?.avoidances ?? [],
  };
}

function toEcologyProfileComponent(lineage: SpeciesLineageV1): EcologyProfileComponent {
  return {
    ecologicalRole: lineage.ecologicalProfile.ecologicalRole,
    diet: lineage.ecologicalProfile.diet,
    biomePreferences: lineage.ecologicalProfile.biomePreferences,
    socialStructure: lineage.ecologicalProfile.socialStructure,
    activityPattern: lineage.ecologicalProfile.activityPattern,
    populationDensity: lineage.ecologicalProfile.populationDensity,
  };
}

function toVisualIdentityComponent(lineage: SpeciesLineageV1): SpeciesVisualIdentity {
  return {
    primaryHueRange: lineage.visualIdentity.primaryHueRange,
    secondaryHueRange: lineage.visualIdentity.secondaryHueRange,
    bioluminescent: Boolean(lineage.visualIdentity.bioluminescent),
    distinctiveFeatures: lineage.visualIdentity.distinctiveFeatures,
    spriteSheetRef: lineage.visualIdentity.spriteSheetRef,
  };
}

function toLoreDepthComponent(lineage: SpeciesLineageV1): SpeciesLoreDepth | undefined {
  const loreDepth = lineage.loreDepth;
  if (!loreDepth) return undefined;

  return {
    hasCanonicalFolklore: loreDepth.hasCanonicalFolklore,
    hasCultureDoc: loreDepth.hasCultureDoc,
    hasSongCorpus: loreDepth.hasSongCorpus,
    hasLanguageDoc: loreDepth.hasLanguageDoc,
    mythCount: loreDepth.mythCount,
    waveNumber: loreDepth.waveNumber,
    akashicRecordsPath: loreDepth.akashicRecordsPath,
  };
}

function toLineageSnapshot(
  lineage: SpeciesLineageV1,
  migrationMetadata: SpeciesMigrationMetadata,
  loreDepth: SpeciesLoreDepth | undefined,
): SpeciesLineageSnapshot {
  return {
    formatVersion: lineage.formatVersion,
    speciesId: lineage.speciesId,
    canonicalName: lineage.canonicalName,
    sourceGame: lineage.sourceGame,
    folkloreTradition: lineage.folkloreTradition as unknown as Record<string, unknown>,
    ecologicalProfile: lineage.ecologicalProfile as unknown as Record<string, unknown>,
    behavioralArchetype: lineage.behavioralArchetype as unknown as Record<string, unknown>,
    visualIdentity: lineage.visualIdentity as unknown as Record<string, unknown>,
    migrationMetadata,
    patronCredits: lineage.patronCredits as Record<string, unknown> | undefined,
    loreDepth,
  };
}

function toSpeciesBehaviorProfile(lineage: SpeciesLineageV1): SpeciesBehaviorProfile {
  const personalityBaseline = lineage.behavioralArchetype.personalityBaseline
    ? { ...lineage.behavioralArchetype.personalityBaseline }
    : undefined;

  const uniqueBehaviors: SpeciesUniqueBehavior[] = (lineage.behavioralArchetype.uniqueBehaviors ?? []).map(
    (behavior) => ({
      behaviorId: behavior.behaviorId,
      description: behavior.description,
      triggerHint: behavior.triggerHint,
    }),
  );

  const interspeciesRelations: SpeciesInterspeciesRelation[] = (
    lineage.behavioralArchetype.interspeciesRelations ?? []
  ).map((relation) => ({
    targetSpeciesId: relation.targetSpeciesId,
    disposition: relation.disposition,
    description: relation.description ?? '',
  }));

  return {
    cognitiveCeiling: clamp01(lineage.behavioralArchetype.cognitiveCeiling),
    personalityBaseline,
    uniqueBehaviors,
    interspeciesRelations,
  };
}

function normalizeExchange(payload: FolkforkSpeciesPayload): NormalizedExchange {
  if (isLineagePayload(payload)) {
    const lineage = parseSpeciesLineageV1(payload);
    const personalityRanges = derivePersonalityRangesFromLineage(lineage);
    const cultureRanges = deriveCultureRangesFromLineage(lineage);
    const intelligenceRanges = deriveIntelligenceRangesFromLineage(lineage);

    return {
      speciesId: lineage.speciesId,
      speciesName: lineage.canonicalName,
      commonName: lineage.canonicalName,
      archetypeSeed: lineage.behavioralArchetype.archetypeSeed,
      ecologicalRole: lineage.ecologicalProfile.ecologicalRole,
      dietType: lineage.ecologicalProfile.diet,
      homeBiome: lineage.ecologicalProfile.biomePreferences[0] ?? 'unknown_biome',
      personalityRanges,
      cultureRanges,
      intelligenceRanges,
      mutationRate: undefined,
      compatibleSpecies: deriveCompatibleSpeciesFromLineage(lineage),
      visualTokens: {
        sizeClass: lineage.ecologicalProfile.sizeClass,
        bodyPlan: lineage.ecologicalProfile.bodyPlan,
      },
      lore: buildLoreFromLineage(lineage),
      sourceGame: lineage.sourceGame,
      lineageV1: lineage,
    };
  }

  return {
    speciesId: payload.speciesId,
    speciesName: payload.speciesName,
    commonName: payload.commonName,
    archetypeSeed: payload.archetypeSeed,
    ecologicalRole: payload.ecologicalRole,
    dietType: payload.dietType,
    homeBiome: payload.homeBiome,
    personalityRanges: payload.personalityRanges,
    cultureRanges: payload.cultureRanges,
    intelligenceRanges: payload.intelligenceRanges,
    mutationRate: payload.mutationRate,
    compatibleSpecies: payload.compatibleSpecies,
    visualTokens: payload.visualTokens,
    lore: payload.lore,
    sourceGame: normalizeSourceGame(payload.provenance?.sourceGame),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Pure function: translate a species payload into an MVEE SpeciesTemplate.
 */
export function translateToSpeciesTemplate(payload: FolkforkSpeciesPayload): SpeciesTemplate {
  const normalized = normalizeExchange(payload);
  const { visualTokens, personalityRanges, cultureRanges, intelligenceRanges, lore } = normalized;

  const sizeClass = visualTokens.sizeClass;
  const bodyPlan = visualTokens.bodyPlan;

  const averageHeight = SPECIES_HEIGHT_SCALE[sizeClass];
  const density = BODY_PLAN_DENSITY[bodyPlan] ?? 0.45;
  const averageWeight = averageHeight * density;
  const gestationPeriod = GESTATION_BY_SIZE[sizeClass];

  const lifespan = BASE_LIFESPAN_BY_SIZE[sizeClass];
  const lifespanType = deriveLifespanType(lifespan);
  const maturityAge = lifespan * 0.15 * (1 + midpoint(intelligenceRanges.cognitiveCapacity));

  const bodyPlanId = BODY_PLAN_ID_MAP[bodyPlan] ?? 'humanoid_standard';
  const innateTraits = deriveInnateTraits(personalityRanges, intelligenceRanges);

  const socialStructure =
    normalized.lineageV1?.ecologicalProfile.socialStructure
      ? (mapSocialStructureFromContract(normalized.lineageV1.ecologicalProfile.socialStructure) ?? deriveSocialStructure(cultureRanges))
      : deriveSocialStructure(cultureRanges);

  const sapient = midpoint(intelligenceRanges.cognitiveCapacity) > 0.6;
  const mutationRate = normalized.mutationRate ?? 0.01;
  const compatibleSpecies = normalized.compatibleSpecies ?? [];

  const genome_flags = deriveGenomeFlags(personalityRanges, cultureRanges, normalized.archetypeSeed);

  if (normalized.lineageV1?.visualIdentity.bioluminescent) {
    genome_flags['bioluminescent'] = [1, 1];
  }

  const migrationMetadata = normalized.lineageV1
    ? normalizeMigrationMetadata(normalized.lineageV1.migrationMetadata)
    : undefined;

  if (migrationMetadata) {
    enforceSignoffGate(migrationMetadata);
  }

  const loreDepth = normalized.lineageV1 ? toLoreDepthComponent(normalized.lineageV1) : undefined;

  const template: SpeciesTemplate = {
    speciesId: `folkfork_${normalized.speciesId}`,
    speciesName: normalized.speciesName,
    commonName: normalized.commonName ?? normalized.speciesName,
    description: `${lore.epithet}. Arrived via Folkfork from ${normalized.sourceGame.charAt(0).toUpperCase() + normalized.sourceGame.slice(1)}.`,
    bodyPlanId,

    innateTraits,

    compatibleSpecies,
    mutationRate,

    averageHeight,
    averageWeight,
    sizeCategory: sizeClass,

    lifespan,
    lifespanType,
    maturityAge,
    gestationPeriod,

    sapient,
    socialStructure,

    cross_game_compatible: true,
    native_game: normalized.sourceGame,
    traveler_epithet: lore.epithet,
    genome_flags,

    precursors_lineage: {
      precursors_species_id: normalized.speciesId,
      emergence_band: 'mid_rim',
      sapience_date: 'folkfork_imported',
      chorus_connection: lore.folkloreTradition ?? 'unknown',
    },

    culturalProtocol: normalized.lineageV1 ? toCulturalProtocolComponent(normalized.lineageV1) : undefined,
    ecologyProfile: normalized.lineageV1 ? toEcologyProfileComponent(normalized.lineageV1) : undefined,
    visualIdentity: normalized.lineageV1 ? toVisualIdentityComponent(normalized.lineageV1) : undefined,
    loreDepth,
    migrationMetadata,
    speciesBehaviorProfile: normalized.lineageV1 ? toSpeciesBehaviorProfile(normalized.lineageV1) : undefined,
    lineageContractV1:
      normalized.lineageV1 && migrationMetadata
        ? toLineageSnapshot(normalized.lineageV1, migrationMetadata, loreDepth)
        : undefined,
  };

  return template;
}

/**
 * Translate and register a Folkfork species into SPECIES_REGISTRY.
 * Applies migration state-machine validation/persistence for lineage v1 payloads.
 */
export function registerFolkforkSpecies(payload: FolkforkSpeciesPayload): SpeciesTemplate {
  const template = translateToSpeciesTemplate(payload);
  const existing = SPECIES_REGISTRY[template.speciesId];

  if (template.migrationMetadata) {
    const previousStatus: MigrationStatus = existing?.migrationMetadata?.migrationStatus ?? 'candidate';

    const mergedMigration: SpeciesMigrationMetadata = {
      ...template.migrationMetadata,
      scheherazadeSignoff:
        template.migrationMetadata.scheherazadeSignoff || existing?.migrationMetadata?.scheherazadeSignoff || false,
      sylviaSignoff:
        template.migrationMetadata.sylviaSignoff || existing?.migrationMetadata?.sylviaSignoff || false,
      targetGameAdaptations: {
        ...(existing?.migrationMetadata?.targetGameAdaptations ?? {}),
        ...(template.migrationMetadata.targetGameAdaptations ?? {}),
      },
    };

    enforceSignoffGate(mergedMigration);

    const changedAt = mergedMigration.exportedAt ?? new Date().toISOString();
    template.migrationMetadata = mergedMigration;
    template.migrationStatusHistory = buildTransitionHistory(
      existing?.migrationStatusHistory ?? [],
      previousStatus,
      mergedMigration.migrationStatus,
      changedAt,
    );

    if (template.lineageContractV1) {
      template.lineageContractV1 = {
        ...template.lineageContractV1,
        migrationMetadata: mergedMigration,
      };
    }
  } else if (existing?.migrationStatusHistory) {
    template.migrationStatusHistory = existing.migrationStatusHistory;
  }

  SPECIES_REGISTRY[template.speciesId] = template;
  return template;
}

/**
 * Check whether a species (by source speciesId) has been imported.
 */
export function isSpeciesImported(speciesId: string): boolean {
  return `folkfork_${speciesId}` in SPECIES_REGISTRY;
}

/**
 * Return tracked migration status for an imported Folkfork species.
 */
export function getSpeciesMigrationStatus(speciesId: string): MigrationStatus | undefined {
  const template = SPECIES_REGISTRY[`folkfork_${speciesId}`];
  return template?.migrationMetadata?.migrationStatus;
}
