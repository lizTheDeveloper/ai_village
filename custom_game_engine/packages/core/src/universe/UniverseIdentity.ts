/**
 * UniverseIdentity - Tracks origin and provenance for multiverse support
 *
 * Forward-compatibility module for:
 * - Phase 31: Persistence Layer
 * - Phase 32: Universe Forking
 * - Phase 34: Cross-Universe Sharing
 *
 * Enables items, effects, and entities to track their origin universe
 * for proper attribution and trust verification.
 *
 * Part of Forward-Compatibility Phase
 */

// ============================================================================
// Universe Identity
// ============================================================================

/**
 * Unique identifier for a universe instance.
 * Every world/save has a unique universe ID generated on creation.
 */
export interface UniverseId {
  /** UUID for this specific universe instance */
  id: string;

  /** Human-readable name */
  name: string;

  /** When this universe was created */
  createdAt: number;

  /** Schema version of this universe */
  schemaVersion: number;

  /** Parent universe (if forked) */
  parentId?: string;

  /** Fork point tick (if forked) */
  forkedAtTick?: number;
}

/**
 * Creator identity for provenance tracking.
 * Used to attribute items, effects, and content to their creators.
 */
export interface CreatorIdentity {
  /** Type of creator */
  type: 'player' | 'agent' | 'system' | 'llm' | 'imported';

  /** Entity ID (if agent) */
  entityId?: string;

  /** Player/user name (if player) */
  playerName?: string;

  /** Universe where creation occurred */
  universeId: string;

  /** Game tick when created */
  createdAtTick: number;

  /** Real-world timestamp */
  createdAtTimestamp: number;
}

/**
 * Provenance chain for items/effects that have moved between universes.
 */
export interface ProvenanceEntry {
  /** Universe where this transition occurred */
  universeId: string;

  /** Universe name for display */
  universeName: string;

  /** Tick in that universe */
  tick: number;

  /** What happened (created, modified, imported, blessed) */
  action: 'created' | 'modified' | 'imported' | 'blessed' | 'cursed' | 'forked';

  /** Who did it */
  actor: CreatorIdentity;

  /** Additional context */
  notes?: string;
}

/**
 * Full provenance tracking for cross-universe content.
 */
export interface Provenance {
  /** Original creator */
  originalCreator: CreatorIdentity;

  /** Chain of custody through universes */
  history: ProvenanceEntry[];

  /** Whether this content has been "blessed" (approved for sharing) */
  blessed: boolean;

  /** Who blessed it (if blessed) */
  blessedBy?: CreatorIdentity;

  /** Trust level for imported content */
  trustLevel: 'untrusted' | 'verified' | 'blessed' | 'official';
}

// ============================================================================
// Entity Origin Tracking
// ============================================================================

/**
 * Origin tracking interface - can be added to any component.
 * Entities from other universes carry this to track where they came from.
 */
export interface EntityOrigin {
  /** Home universe */
  homeUniverseId: string;

  /** Home universe name */
  homeUniverseName: string;

  /** Original entity ID in home universe */
  originalEntityId: string;

  /** When entity was imported to current universe */
  importedAt?: number;

  /** Whether entity is "native" to current universe */
  isNative: boolean;
}

// ============================================================================
// Effect Package for Cross-Universe Sharing
// ============================================================================

/**
 * A packaged effect that can be shared between universes.
 * Self-contained with all metadata needed for validation and attribution.
 */
export interface EffectPackage {
  /** Unique ID for this package */
  packageId: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description: string;

  /** Version of this package */
  version: string;

  /** The effect expression (bytecode) */
  effectExpression: unknown; // Will be EffectExpression when magic system is implemented

  /** Full provenance chain */
  provenance: Provenance;

  /** Power level estimate (for balance checking) */
  powerLevel: number;

  /** Tags for categorization */
  tags: string[];

  /** Dependencies on other packages */
  dependencies?: string[];

  /** Whether this passed automated testing */
  testedSuccessfully: boolean;

  /** Test results summary */
  testResults?: {
    crashTests: boolean;
    balanceTests: boolean;
    exploitTests: boolean;
    universesTested: number;
  };

  /** Lore/narrative for this effect */
  lore?: EffectLore;
}

/**
 * Narrative history of an effect for flavor/worldbuilding.
 */
export interface EffectLore {
  /** How the effect was discovered/created */
  originStory: string;

  /** Notable uses of this effect */
  notableEvents: string[];

  /** Names the effect has been known by */
  aliases: string[];

  /** Legendary wielders */
  famousUsers?: string[];
}

// ============================================================================
// Trust Policy for Imports
// ============================================================================

/**
 * Policy for handling imported content from other universes.
 */
export interface TrustPolicy {
  /** Auto-accept content from these universe IDs */
  trustedUniverses: string[];

  /** Auto-reject content from these universe IDs */
  blockedUniverses: string[];

  /** Auto-accept content from these creators */
  trustedCreators: string[];

  /** Minimum trust level to auto-accept */
  minimumTrustLevel: 'untrusted' | 'verified' | 'blessed' | 'official';

  /** Whether to run validation on import even for trusted sources */
  alwaysValidate: boolean;

  /** Maximum power level to auto-accept */
  maxPowerLevel: number;

  /** Require human review for effects above this power level */
  reviewThreshold: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a new universe ID.
 */
export function createUniverseId(name: string): UniverseId {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    schemaVersion: 1,
  };
}

/**
 * Create a forked universe ID from a parent.
 */
export function forkUniverseId(
  parent: UniverseId,
  name: string,
  forkTick: number
): UniverseId {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    schemaVersion: parent.schemaVersion,
    parentId: parent.id,
    forkedAtTick: forkTick,
  };
}

/**
 * Create a system creator identity.
 */
export function createSystemCreator(universeId: string, tick: number): CreatorIdentity {
  return {
    type: 'system',
    universeId,
    createdAtTick: tick,
    createdAtTimestamp: Date.now(),
  };
}

/**
 * Create an agent creator identity.
 */
export function createAgentCreator(
  entityId: string,
  universeId: string,
  tick: number
): CreatorIdentity {
  return {
    type: 'agent',
    entityId,
    universeId,
    createdAtTick: tick,
    createdAtTimestamp: Date.now(),
  };
}

/**
 * Create initial provenance for new content.
 */
export function createProvenance(creator: CreatorIdentity): Provenance {
  return {
    originalCreator: creator,
    history: [{
      universeId: creator.universeId,
      universeName: 'Current Universe', // Will be filled by world
      tick: creator.createdAtTick,
      action: 'created',
      actor: creator,
    }],
    blessed: false,
    trustLevel: creator.type === 'system' ? 'official' : 'untrusted',
  };
}

/**
 * Create a default trust policy (conservative).
 */
export function createDefaultTrustPolicy(): TrustPolicy {
  return {
    trustedUniverses: [],
    blockedUniverses: [],
    trustedCreators: [],
    minimumTrustLevel: 'blessed',
    alwaysValidate: true,
    maxPowerLevel: 50,
    reviewThreshold: 30,
  };
}
