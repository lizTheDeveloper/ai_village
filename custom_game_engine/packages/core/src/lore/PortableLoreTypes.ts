/**
 * PortableLoreTypes
 *
 * TypeScript interfaces for cross-game lore export via the Akashic Records bridge.
 * These match the JSON schemas at:
 *   akashic-records/lore/cross-game/schemas/portable-myth.schema.json
 *   akashic-records/lore/cross-game/schemas/portable-deity.schema.json
 *   akashic-records/lore/cross-game/schemas/portable-ritual.schema.json
 *
 * Per CLAUDE.md:
 *   - NO silent fallbacks
 *   - NO `as any` escape hatches
 *   - Use .js extensions in imports
 */

// ============================================================================
// Shared types
// ============================================================================

export type SourceGame = 'precursors' | 'mvee' | 'nel' | 'cotb';

export interface DeityPersonalityVector {
  benevolence: number;      // 0-1
  interventionism: number;  // 0-1
  wrathfulness: number;     // 0-1
  mysteriousness: number;   // 0-1
  generosity: number;       // 0-1
  consistency: number;      // 0-1
  seriousness?: number;     // 0-1 — Playful (0) to Stern (1). Optional until DeityComponent.PerceivedPersonality is unified with DeityTypes.PerceivedPersonality.
  compassion?: number;      // 0-1 — Indifferent (0) to Caring deeply (1). Optional until DeityComponent.PerceivedPersonality is unified with DeityTypes.PerceivedPersonality.
}

// ============================================================================
// PortableMyth
// ============================================================================

export type PortableMythCategory =
  | 'creation' | 'flood' | 'trickster' | 'hero_journey' | 'origin'
  | 'apocalypse' | 'transformation' | 'quest' | 'sacrifice' | 'covenant'
  | 'exile' | 'return' | 'founding' | 'betrayal' | 'prophecy'
  | 'divine_war' | 'cosmic_egg' | 'world_tree' | 'underworld_descent'
  | 'sky_marriage' | 'animal_spouse' | 'stolen_fire' | 'drowned_world'
  | 'singing_stones' | 'dream_walk' | 'ancestor_call' | 'mirror_self'
  | 'eighth_child' | 'absent_god' | 'prior_rightful_owner'
  | 'keeper_burden' | 'question_answered' | 'first_memory'
  | 'last_telling';

export type MythTemporalSetting =
  | 'primordial' | 'ancient' | 'historical' | 'contemporary' | 'prophetic' | 'timeless';

export type PortableMythStatus =
  | 'oral' | 'recorded' | 'canonical' | 'disputed' | 'apocryphal' | 'heretical';

export type PortableMythMutationType =
  | 'embellishment' | 'simplification' | 'inversion' | 'localization'
  | 'conflation' | 'fragmentation' | 'moralization' | 'secularization'
  | 'heroification' | 'demonization' | 'naturalization' | 'mystification'
  | 'rationalization' | 'syncretization';

export interface PortableMythMutation {
  fromVersion: number;
  toVersion: number;
  mutationType: PortableMythMutationType;
  description: string;
  sourceGame: SourceGame;
  timestamp: string; // ISO-8601
}

export interface PortableMyth {
  mythId: string;
  sourceGame: SourceGame;
  sourceUniverseId?: string;
  version: number;
  title: string;
  summary: string;
  fullText: string;
  category: PortableMythCategory;
  deityDomains: string[];
  deityPersonality?: DeityPersonalityVector;
  speciesOrigin?: string;
  linguisticMarkers: string[];
  motifs: string[];
  symbols: string[];
  temporalSetting: MythTemporalSetting;
  moral?: string;
  originalEvent?: {
    type: string;
    description: string;
    gameTimestamp: number;
  };
  mutations: PortableMythMutation[];
  canonicityScore: number;
  status: PortableMythStatus;
  exportedAt: string; // ISO-8601
  tellingCount: number;
  believerCount: number;
}

// ============================================================================
// PortableDeity
// ============================================================================

export type DeityAlignment = 'benevolent' | 'malevolent' | 'neutral' | 'dualistic' | 'unknown';

export interface PortableDeity {
  deityId: string;
  sourceGame: SourceGame;
  sourceUniverseId?: string;
  primaryName: string;
  epithets: string[];
  domain: string;
  secondaryDomains: string[];
  personality: DeityPersonalityVector;
  alignment: DeityAlignment;
  believerCount: number;
  mythCount: number;
  canonicalMythIds: string[];
  parentDeityId?: string;
  mergedFromIds?: string[];
  schismCause?: string;
  precursorsSpeciesMapping?: string;
  earthMythologyParallel?: string;
  protoLanguageRoot?: string;
  holyTexts?: Array<{
    textTitle: string;
    mythReferences: string[];
    teachingsSummary?: string;
  }>;
  cotbAnomalyType?: string;
  exportedAt: string; // ISO-8601
}

// ============================================================================
// PortableRitual
// ============================================================================

export type PortableRitualType =
  | 'worship' | 'sacrifice' | 'festival' | 'funeral' | 'naming'
  | 'harvest' | 'solstice' | 'pilgrimage' | 'initiation' | 'purification'
  | 'divination' | 'communion' | 'atonement' | 'coronation' | 'marriage'
  | 'war_preparation' | 'peace_making' | 'ancestor_calling' | 'dream_walking'
  | 'rune_reading';

export type RitualFrequency =
  | 'daily' | 'weekly' | 'seasonal' | 'annual' | 'lifecycle' | 'crisis' | 'one_time';

export type PortableRitualStatus =
  | 'active' | 'declining' | 'dormant' | 'forbidden' | 'transformed' | 'rediscovered';

export type RitualMutationChangeType =
  | 'elaboration' | 'simplification' | 'syncretization' | 'schism'
  | 'secularization' | 'revival' | 'prohibition';

export interface PortableRitualMutation {
  fromVersion: number;
  toVersion: number;
  changeType: RitualMutationChangeType;
  description: string;
  timestamp: string; // ISO-8601
}

export interface PortableRitual {
  ritualId: string;
  sourceGame: SourceGame;
  sourceUniverseId?: string;
  version: number;
  name: string;
  ritualType: PortableRitualType;
  associatedDeityId: string | null;
  associatedMythIds?: string[];
  description: string;
  frequency: RitualFrequency;
  participantRequirements: {
    minimumParticipants?: number;
    requiredRoles?: string[];
    requiredItems?: string[];
    requiredLocation?: string;
  };
  materialCulture?: {
    artifacts?: Array<{
      name: string;
      material?: string;
      function?: string;
      archaeologicalSignature?: string;
    }>;
    architecturalRequirements?: string[];
  };
  linguisticMarkers?: string[];
  speciesOrigin?: string;
  beliefGenerated?: number;
  performanceCount?: number;
  status: PortableRitualStatus;
  mutations?: PortableRitualMutation[];
  exportedAt: string; // ISO-8601
}
