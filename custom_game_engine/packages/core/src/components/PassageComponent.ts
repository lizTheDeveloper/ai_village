/**
 * PassageComponent - Marks an entity as a passage between universes
 */

import type { Component } from '../ecs/Component.js';

export type PassageType = 'thread' | 'bridge' | 'gate' | 'confluence';

export type PassageState = 'dormant' | 'active' | 'unstable' | 'collapsing';

/**
 * Component for passage entities that enable cross-universe travel.
 */
export interface PassageComponent extends Component {
  type: 'passage';

  /** Unique passage ID */
  passageId: string;

  /** Source universe ID */
  sourceUniverseId: string;

  /** Target universe ID */
  targetUniverseId: string;

  /** Passage type determines behavior and requirements */
  passageType: PassageType;

  /** Current state of the passage */
  state: PassageState;

  /** Whether the passage is currently traversable */
  active: boolean;

  /** Target position in destination universe (x, y, z) */
  targetPosition?: { x: number; y: number; z: number };

  /** Cooldown before next traversal (ticks) */
  cooldown: number;

  /** Entities currently in transit */
  entitiesInTransit: Set<string>;

  /** Total entities that have traversed */
  traversalCount: number;

  /** Last traversal tick */
  lastTraversal: number;
}

/**
 * Create a new passage component.
 */
export function createPassageComponent(
  passageId: string,
  sourceUniverseId: string,
  targetUniverseId: string,
  passageType: PassageType,
  targetPosition?: { x: number; y: number; z: number }
): PassageComponent {
  return {
    type: 'passage',
    version: 1,
    passageId,
    sourceUniverseId,
    targetUniverseId,
    passageType,
    state: 'dormant',
    active: true,
    targetPosition,
    cooldown: 0,
    entitiesInTransit: new Set(),
    traversalCount: 0,
    lastTraversal: 0,
  };
}

/**
 * Check if a passage is ready for traversal.
 */
export function canTraverse(passage: PassageComponent, tick: number): boolean {
  return (
    passage.active &&
    passage.state === 'active' &&
    passage.cooldown === 0 &&
    tick - passage.lastTraversal > 0
  );
}

/**
 * Get passage traversal cost based on type.
 */
export function getTraversalCost(passageType: PassageType): number {
  switch (passageType) {
    case 'thread':
      return 100; // High cost - rare, expensive
    case 'bridge':
      return 50; // Medium cost - stable connection
    case 'gate':
      return 20; // Low cost - constructed passage
    case 'confluence':
      return 10; // Very low cost - natural meeting point
  }
}

/**
 * Get passage cooldown duration based on type.
 */
export function getPassageCooldown(passageType: PassageType): number {
  switch (passageType) {
    case 'thread':
      return 200; // Long cooldown
    case 'bridge':
      return 100; // Medium cooldown
    case 'gate':
      return 50; // Short cooldown
    case 'confluence':
      return 20; // Very short cooldown
  }
}
