/**
 * SoulLinkComponent - Links an Agent (body) to its Soul entity
 *
 * This component lives on AGENT entities and points to their soul.
 * The soul is a separate entity that persists across incarnations.
 *
 * Benefits of soul-body separation:
 * - Soul persists through death
 * - Dream communication (soul talks to conscious mind)
 * - Astral projection (soul temporarily leaves)
 * - Concurrent incarnations (same soul, multiple bodies)
 * - Lich mechanics (soul bound to phylactery)
 */

import type { Component } from '../ecs/Component.js';

export interface SoulLinkComponent extends Component {
  type: 'soul_link';

  /**
   * Entity ID of the soul controlling this body
   */
  soulEntityId: string;

  /**
   * Strength of soul-body connection (0-1)
   * - 1.0: Perfect connection (normal state)
   * - 0.8-0.9: Slightly weakened (fatigue, illness)
   * - 0.5-0.7: Severely weakened (near death, possession resistance)
   * - 0.3-0.4: Tenuous (astral projection, soul leaving)
   * - < 0.3: Breaking (death imminent)
   */
  linkStrength: number;

  /**
   * Is this the soul's primary incarnation?
   * - true: Main body, conscious control
   * - false: Secondary incarnation (concurrent, less control)
   */
  isPrimaryIncarnation: boolean;

  /**
   * Can this link be severed without death?
   * - true: Astral projection, temporary possession
   * - false: Death required to separate soul from body
   */
  canSeverWithoutDeath: boolean;

  /**
   * When this soul-body link was formed
   */
  linkFormedTick: number;

  /**
   * Soul influence on body's decisions (0-1)
   * - Low: Body's personality dominates
   * - High: Soul's purpose/interests guide decisions
   * - During dreams: Soul can communicate directly
   */
  soulInfluence: number;

  /**
   * How much the soul remembers from this body
   * - 1.0: Perfect memory transfer
   * - 0.5: Fragmentary memories
   * - 0.0: Soul doesn't retain this life's memories
   */
  memoryTransferRate: number;

  /**
   * Is soul currently in astral projection?
   * When true, body is vulnerable, soul can travel
   */
  isAstralProjecting: boolean;

  /**
   * Phylactery entity ID if this body is a lich
   * When body dies, soul returns to phylactery
   */
  phylacteryId?: string;
}

/**
 * Create soul link for a newly incarnated soul
 */
export function createSoulLinkComponent(
  soulEntityId: string,
  currentTick: number,
  isPrimary: boolean = true
): SoulLinkComponent {
  return {
    type: 'soul_link',
    version: 1,
    soulEntityId,
    linkStrength: 1.0,
    isPrimaryIncarnation: isPrimary,
    canSeverWithoutDeath: false,
    linkFormedTick: currentTick,
    soulInfluence: 0.5, // Balanced influence
    memoryTransferRate: 1.0, // Full memory transfer on death
    isAstralProjecting: false,
  };
}

/**
 * Weaken soul-body link (damage, near-death, exorcism)
 */
export function weakenSoulLink(
  component: SoulLinkComponent,
  amount: number
): SoulLinkComponent {
  const newStrength = Math.max(0, component.linkStrength - amount);

  return {
    ...component,
    linkStrength: newStrength,
  };
}

/**
 * Strengthen soul-body link (healing, meditation, rest)
 */
export function strengthenSoulLink(
  component: SoulLinkComponent,
  amount: number
): SoulLinkComponent {
  const newStrength = Math.min(1.0, component.linkStrength + amount);

  return {
    ...component,
    linkStrength: newStrength,
  };
}

/**
 * Begin astral projection (soul leaves body temporarily)
 */
export function beginAstralProjection(component: SoulLinkComponent): SoulLinkComponent {
  if (!component.canSeverWithoutDeath) {
    throw new Error('This soul-body link cannot be severed without death');
  }

  return {
    ...component,
    isAstralProjecting: true,
    linkStrength: 0.3, // Tenuous connection while projecting
  };
}

/**
 * End astral projection (soul returns to body)
 */
export function endAstralProjection(component: SoulLinkComponent): SoulLinkComponent {
  return {
    ...component,
    isAstralProjecting: false,
    linkStrength: 1.0, // Full connection restored
  };
}

/**
 * Enable astral projection capability (through training/magic)
 */
export function enableAstralProjection(component: SoulLinkComponent): SoulLinkComponent {
  return {
    ...component,
    canSeverWithoutDeath: true,
  };
}

/**
 * Bind soul to phylactery (become a lich)
 */
export function bindToPhylactery(
  component: SoulLinkComponent,
  phylacteryId: string
): SoulLinkComponent {
  return {
    ...component,
    phylacteryId,
    memoryTransferRate: 1.0, // Liches retain all memories
  };
}

/**
 * Check if soul-body link is about to break (death imminent)
 */
export function isLinkBreaking(component: SoulLinkComponent): boolean {
  return component.linkStrength < 0.3 && !component.isAstralProjecting;
}

/**
 * Get soul influence description
 */
export function getSoulInfluenceDescription(component: SoulLinkComponent): string {
  const { soulInfluence } = component;

  if (soulInfluence >= 0.8) {
    return 'Soul guides strongly - purpose and destiny felt clearly';
  } else if (soulInfluence >= 0.6) {
    return 'Soul whispers guidance - interests and purpose influence decisions';
  } else if (soulInfluence >= 0.4) {
    return 'Soul and body balanced - both influence equally';
  } else if (soulInfluence >= 0.2) {
    return 'Body dominates - soul\'s purpose felt as vague urges';
  } else {
    return 'Soul connection weak - living by body\'s impulses alone';
  }
}
