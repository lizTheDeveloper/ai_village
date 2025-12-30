/**
 * MythComponent - Stores mythology about deities
 *
 * Phase 3: Myth Generation
 * Stories emerge from divine events and shape deity identity.
 */

import type { Component } from '../ecs/Component.js';
import type { DivineDomain } from './DeityComponent.js';

/**
 * Theological status of a myth
 */
export type MythStatus =
  | 'oral'           // Only spoken, not written
  | 'recorded'       // Written but not official
  | 'canonical'      // Widely accepted as true
  | 'disputed'       // Actively debated
  | 'apocryphal'     // Rejected by mainstream
  | 'heretical';     // Forbidden/suppressed

/**
 * How a myth influences deity identity
 */
export interface TraitImplication {
  /** Which aspect of deity identity (e.g., 'benevolence', 'wrathfulness') */
  trait: string;

  /** Does this story suggest the deity has this trait or lacks it? */
  direction: 'positive' | 'negative';

  /** How strongly this story suggests the trait (0-1) */
  strength: number;

  /** Quote from the story that supports this interpretation */
  extractedFrom: string;
}

/**
 * A myth - a story about a deity
 *
 * Myths shape deity identity and spread through communities.
 */
export interface Myth {
  /** Unique identifier */
  id: string;

  /** Story title (short, memorable) */
  title: string;

  // ============================================================================
  // Content
  // ============================================================================

  /** Full narrative text (LLM-generated) */
  fullText: string;

  /** Brief summary (1-2 sentences) */
  summary: string;

  // ============================================================================
  // Origin
  // ============================================================================

  /** Event that inspired this myth (if any) */
  originalEvent?: string;

  /** Agent who first told/interpreted this story */
  originalWitness?: string;

  /** How many times this story has been retold/modified */
  currentVersion: number;

  // ============================================================================
  // Spread & Knowledge
  // ============================================================================

  /** Agent IDs who know this story */
  knownBy: string[];

  /** Book item IDs where this is written */
  writtenIn: string[];

  /** Building IDs where this is carved/displayed */
  carvedAt: string[];

  // ============================================================================
  // Impact on Deity Identity
  // ============================================================================

  /** How this myth affects deity traits */
  traitImplications: TraitImplication[];

  /** How relevant to each domain (0-1 scores) */
  domainRelevance: Map<DivineDomain, number>;

  // ============================================================================
  // Metadata
  // ============================================================================

  /** When this myth was first created (tick) */
  creationTime: number;

  /** Last time someone told this story (tick) */
  lastToldTime: number;

  /** Total times this story has been told */
  tellingCount: number;

  /** Theological/canonical status */
  status: MythStatus;

  /** Agent IDs who dispute this story */
  contestedBy: string[];

  /** Deity this myth is about */
  deityId: string;
}

/**
 * MythologyComponent - Collection of myths about a deity
 *
 * Attached to deity entities to track their mythology.
 */
export interface MythologyComponent extends Component {
  type: 'mythology';

  /** All myths about this deity */
  myths: Myth[];

  /** Most widely-known myths (IDs) */
  canonicalMyths: string[];

  /** Myths that define core identity traits */
  foundingMyths: string[];

  /** Total number of myths ever created */
  totalMythsCreated: number;
}

/**
 * Create a default mythology component
 */
export function createMythologyComponent(): MythologyComponent {
  return {
    type: 'mythology',
    version: 1,
    myths: [],
    canonicalMyths: [],
    foundingMyths: [],
    totalMythsCreated: 0,
  };
}

/**
 * Add a myth to the mythology
 */
export function addMyth(
  component: MythologyComponent,
  myth: Myth
): MythologyComponent {
  return {
    ...component,
    myths: [...component.myths, myth],
    totalMythsCreated: component.totalMythsCreated + 1,
  };
}

/**
 * Mark a myth as canonical (widely accepted)
 */
export function canonizeMyth(
  component: MythologyComponent,
  mythId: string
): MythologyComponent {
  const myths = component.myths.map(m =>
    m.id === mythId ? { ...m, status: 'canonical' as MythStatus } : m
  );

  const canonicalMyths = [...component.canonicalMyths];
  if (!canonicalMyths.includes(mythId)) {
    canonicalMyths.push(mythId);
  }

  return {
    ...component,
    myths,
    canonicalMyths,
  };
}

/**
 * Get all myths known by a specific agent
 */
export function getMythsKnownBy(
  component: MythologyComponent,
  agentId: string
): Myth[] {
  return component.myths.filter(m => m.knownBy.includes(agentId));
}

/**
 * Record a myth being told (spreads knowledge)
 */
export function tellMyth(
  component: MythologyComponent,
  mythId: string,
  listener: string,
  currentTick: number
): MythologyComponent {
  const myths = component.myths.map(m => {
    if (m.id !== mythId) return m;

    // Add listener to knownBy if not already there
    const knownBy = m.knownBy.includes(listener)
      ? m.knownBy
      : [...m.knownBy, listener];

    return {
      ...m,
      knownBy,
      lastToldTime: currentTick,
      tellingCount: m.tellingCount + 1,
    };
  });

  return {
    ...component,
    myths,
  };
}

/**
 * Get the aggregate trait implications from all canonical myths
 */
export function getCanonicalTraits(
  component: MythologyComponent
): Map<string, number> {
  const traitScores = new Map<string, number>();

  // Only consider canonical myths
  const canonicalMythObjects = component.myths.filter(m =>
    component.canonicalMyths.includes(m.id)
  );

  for (const myth of canonicalMythObjects) {
    for (const implication of myth.traitImplications) {
      const currentScore = traitScores.get(implication.trait) || 0;
      const change = implication.direction === 'positive'
        ? implication.strength
        : -implication.strength;

      traitScores.set(implication.trait, currentScore + change);
    }
  }

  return traitScores;
}
