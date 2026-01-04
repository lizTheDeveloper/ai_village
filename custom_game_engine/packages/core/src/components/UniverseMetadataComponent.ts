/**
 * Universe Metadata Component
 *
 * Tracks universe-level metadata for proto-realities, corrupted universes,
 * and other universe states as per Conservation of Game Matter principle.
 *
 * This component is added to the world entity (singleton) to tag the entire universe.
 */

export type UniverseEra =
  | 'before_time'        // Proto-realities from development phase when time was being invented
  | 'primordial'         // Early unstable universes
  | 'classical'          // Stable, production universes
  | 'divergent'          // Forked timelines
  | 'collapsed'          // Universes that failed but weren't deleted
  | 'experimental';      // Test universes

export interface ProtoRealityComponent {
  type: 'proto_reality';
  version: number;

  /** Era this universe belongs to */
  era: UniverseEra;

  /** When this universe was generated (real-world timestamp) */
  generationTimestamp: number;

  /** Development phase identifier (e.g., "alpha-0.1.0", "dev-2026-01-03") */
  developmentPhase: string;

  /** Stability rating (0-100, where 100 is fully stable) */
  stability: number;

  /** Generation errors that occurred (if any) */
  generationErrors: string[];

  /** Lore description of this proto-reality */
  lore: string;

  /** Whether this proto-reality contains primordial artifacts */
  containsPrimordialArtifacts: boolean;

  /** Special access requirements (for corrupted/unstable universes) */
  accessRequirements?: string[];

  /** Whether physics/time/causality work differently here */
  alteredPhysics?: {
    timeFlowModified: boolean;
    causalityNegotiable: boolean;
    spatialDistortions: boolean;
    magicUnstable: boolean;
  };
}

export interface CorruptedUniverseComponent {
  type: 'corrupted_universe';
  version: number;

  /** What caused the corruption */
  corruptionReason: string;

  /** Generation error details */
  generationError: string;

  /** Stability (0-100, lower = more dangerous) */
  stability: number;

  /** How to access this corrupted universe */
  accessibleVia: string[];

  /** Whether valuable artifacts exist in this corrupted space */
  containsTreasures: boolean;

  /** Danger level (0-10) */
  dangerLevel: number;

  /** When corruption occurred */
  corruptionTimestamp: number;
}

/**
 * Create a proto-reality component for development-phase universes
 */
export function createProtoRealityComponent(
  developmentPhase: string,
  options?: {
    era?: UniverseEra;
    stability?: number;
    lore?: string;
    generationErrors?: string[];
    containsPrimordialArtifacts?: boolean;
  }
): ProtoRealityComponent {
  return {
    type: 'proto_reality',
    version: 1,
    era: options?.era || 'before_time',
    generationTimestamp: Date.now(),
    developmentPhase,
    stability: options?.stability ?? 12, // Low stability for proto-realities
    generationErrors: options?.generationErrors || [],
    lore: options?.lore ||
      'A universe from the chaotic period when time itself was still being defined. ' +
      'Physics work differently here. Causality is... negotiable.',
    containsPrimordialArtifacts: options?.containsPrimordialArtifacts ?? true,
    accessRequirements: ['dimensional_perception', 'timeline_navigation'],
    alteredPhysics: {
      timeFlowModified: true,
      causalityNegotiable: true,
      spatialDistortions: true,
      magicUnstable: true,
    },
  };
}

/**
 * Create a corrupted universe component for generation failures
 */
export function createCorruptedUniverseComponent(
  corruptionReason: string,
  generationError: string,
  options?: {
    stability?: number;
    containsTreasures?: boolean;
    dangerLevel?: number;
  }
): CorruptedUniverseComponent {
  return {
    type: 'corrupted_universe',
    version: 1,
    corruptionReason,
    generationError,
    stability: options?.stability ?? 20,
    accessibleVia: ['dimensional_shard', 'reality_fixer_spell'],
    containsTreasures: options?.containsTreasures ?? true,
    dangerLevel: options?.dangerLevel ?? 7,
    corruptionTimestamp: Date.now(),
  };
}
