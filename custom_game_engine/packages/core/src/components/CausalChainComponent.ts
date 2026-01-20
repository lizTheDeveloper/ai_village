/**
 * CausalChainComponent - Tracks entity causality for paradox detection
 *
 * This component maintains the causal chain of an entity:
 * - Where did it originate (universe, timestamp)?
 * - What caused it to exist (parent entities, creation events)?
 * - Has it traveled through time/universes?
 *
 * Used by ParadoxDetectionSystem to detect temporal paradoxes:
 * - Grandfather paradox: entity kills its causal parent
 * - Bootstrap paradox: information/items with no origin
 * - Ontological paradox: entity exists with no creation event
 */

import type { Component } from '../ecs/Component.js';

/**
 * Types of causal events that can create an entity
 */
export type CausalEventType =
  | 'birth'          // Born naturally
  | 'creation'       // Created by craftsperson/builder
  | 'time_travel'    // Arrived from future/past
  | 'universe_fork'  // Spawned by universe fork
  | 'divine'         // Created by deity
  | 'emerged'        // Emerged from simulation (plants, wildlife)
  | 'manufactured'   // Factory/automation produced
  | 'imported'       // Arrived from another universe
  | 'unknown';       // Origin unclear (legacy entities)

/**
 * Record of a causal event in entity's history
 */
export interface CausalEvent {
  /** Type of event */
  eventType: CausalEventType;

  /** Universe where event occurred */
  universeId: string;

  /** Tick when event occurred (local universe time) */
  timestamp: number;

  /** Entities that caused this event (parents, creators, etc.) */
  causalAgents: string[];

  /** Additional context */
  metadata?: Record<string, unknown>;
}

/**
 * CausalChainComponent
 *
 * Tracks the complete causal history of an entity for paradox detection.
 */
export interface CausalChainComponent extends Component {
  type: 'causal_chain';
  version: 1;

  // Origin tracking
  /** Universe where entity originated */
  originUniverseId: string;

  /** Tick when entity was created in origin universe */
  originTimestamp: number;

  /** Type of creation event */
  creationType: CausalEventType;

  // Causal parents (what caused this entity to exist)
  /** Entity IDs that directly caused this entity's existence */
  causalParents: string[];

  /** For agents: biological parents (subset of causalParents) */
  biologicalParents?: string[];

  /** For items/buildings: creator entity ID */
  creatorId?: string;

  // Time travel tracking
  /** Has entity traveled through time? */
  hasTimeTraveled: boolean;

  /** Universes visited (in chronological order) */
  universesVisited: string[];

  /** Timeline of causal events */
  causalHistory: CausalEvent[];

  // Paradox detection flags
  /** Is entity part of a causal loop? */
  inCausalLoop: boolean;

  /** Entity has no verifiable origin (bootstrap/ontological paradox) */
  hasNoOrigin: boolean;

  /** Entity's existence depends on its own future actions */
  selfCausedExistence: boolean;

  /** Paradoxes detected involving this entity */
  paradoxes: Array<{
    type: 'grandfather' | 'bootstrap' | 'predestination' | 'ontological';
    detectedAt: number;
    description: string;
    resolved: boolean;
    resolutionMethod?: 'fork' | 'collapse' | 'retrocausal';
  }>;

  // Metadata
  /** Last update tick */
  lastUpdatedTick: number;
}

/**
 * Create a new CausalChainComponent for an entity at birth/creation
 */
export function createCausalChainComponent(
  originUniverseId: string,
  originTimestamp: number,
  creationType: CausalEventType,
  causalParents: string[],
  currentTick: number
): CausalChainComponent {
  const initialEvent: CausalEvent = {
    eventType: creationType,
    universeId: originUniverseId,
    timestamp: originTimestamp,
    causalAgents: causalParents,
  };

  return {
    type: 'causal_chain',
    version: 1,
    originUniverseId,
    originTimestamp,
    creationType,
    causalParents,
    hasTimeTraveled: false,
    universesVisited: [originUniverseId],
    causalHistory: [initialEvent],
    inCausalLoop: false,
    hasNoOrigin: false,
    selfCausedExistence: false,
    paradoxes: [],
    lastUpdatedTick: currentTick,
  };
}

/**
 * Record a universe traversal
 */
export function recordUniverseTraversal(
  chain: CausalChainComponent,
  targetUniverseId: string,
  timestamp: number,
  passageId: string
): CausalChainComponent {
  const traversalEvent: CausalEvent = {
    eventType: 'imported',
    universeId: targetUniverseId,
    timestamp,
    causalAgents: [],
    metadata: { passageId },
  };

  return {
    ...chain,
    hasTimeTraveled: true,
    universesVisited: [...chain.universesVisited, targetUniverseId],
    causalHistory: [...chain.causalHistory, traversalEvent],
    lastUpdatedTick: timestamp,
  };
}

/**
 * Record a causal event in entity's history
 */
export function recordCausalEvent(
  chain: CausalChainComponent,
  event: CausalEvent
): CausalChainComponent {
  return {
    ...chain,
    causalHistory: [...chain.causalHistory, event],
    lastUpdatedTick: event.timestamp,
  };
}

/**
 * Mark entity as part of causal loop
 */
export function markCausalLoop(
  chain: CausalChainComponent,
  currentTick: number
): CausalChainComponent {
  return {
    ...chain,
    inCausalLoop: true,
    lastUpdatedTick: currentTick,
  };
}

/**
 * Record a detected paradox
 */
export function recordParadox(
  chain: CausalChainComponent,
  paradoxType: 'grandfather' | 'bootstrap' | 'predestination' | 'ontological',
  description: string,
  currentTick: number
): CausalChainComponent {
  return {
    ...chain,
    paradoxes: [
      ...chain.paradoxes,
      {
        type: paradoxType,
        detectedAt: currentTick,
        description,
        resolved: false,
      },
    ],
    lastUpdatedTick: currentTick,
  };
}

/**
 * Mark paradox as resolved
 */
export function resolveParadox(
  chain: CausalChainComponent,
  paradoxIndex: number,
  resolutionMethod: 'fork' | 'collapse' | 'retrocausal',
  currentTick: number
): CausalChainComponent {
  const updatedParadoxes = [...chain.paradoxes];
  const paradox = updatedParadoxes[paradoxIndex];
  if (paradox) {
    updatedParadoxes[paradoxIndex] = {
      ...paradox,
      resolved: true,
      resolutionMethod,
    };
  }

  return {
    ...chain,
    paradoxes: updatedParadoxes,
    lastUpdatedTick: currentTick,
  };
}
