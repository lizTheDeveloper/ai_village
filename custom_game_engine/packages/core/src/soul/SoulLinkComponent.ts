/**
 * SoulLinkComponent - Links an agent entity to a soul entity
 *
 * This component lives on the AGENT entity and points to the soul.
 * It tracks the agent-soul binding and how strongly the soul influences
 * the agent's decisions.
 */

import { ComponentType } from '../types/ComponentType.js';

/**
 * Soul Link Component
 *
 * Placed on agent entities to link them to their eternal soul.
 */
export interface SoulLinkComponent {
  type: ComponentType.SoulLink;

  // Reference to soul entity
  soul_id: string;

  // When this link was formed (personal tick of soul)
  link_formed_at: number;

  // Is this the soul's current primary incarnation?
  is_primary_incarnation: boolean;

  // How much the soul influences this agent's decisions (0-1)
  // Higher values = more wisdom-guided behavior
  // Lower values = more free will / learning mode
  soul_influence_strength: number;

  // Incarnation number for this soul (1st life, 2nd life, etc.)
  incarnation_number: number;
}

/**
 * Create a new SoulLinkComponent
 */
export function createSoulLinkComponent(params: {
  soul_id: string;
  link_formed_at: number;
  is_primary_incarnation?: boolean;
  soul_influence_strength?: number;
  incarnation_number?: number;
}): SoulLinkComponent {
  return {
    type: ComponentType.SoulLink,
    soul_id: params.soul_id,
    link_formed_at: params.link_formed_at,
    is_primary_incarnation: params.is_primary_incarnation ?? true,
    soul_influence_strength: params.soul_influence_strength ?? 0.3,
    incarnation_number: params.incarnation_number ?? 1,
  };
}

/**
 * Increase soul influence (as agent matures/gains wisdom)
 */
export function increaseSoulInfluence(
  link: SoulLinkComponent,
  amount: number
): void {
  link.soul_influence_strength = Math.min(1.0, link.soul_influence_strength + amount);
}

/**
 * Decrease soul influence (trauma, corruption, etc.)
 */
export function decreaseSoulInfluence(
  link: SoulLinkComponent,
  amount: number
): void {
  link.soul_influence_strength = Math.max(0.0, link.soul_influence_strength - amount);
}

/**
 * Check if soul should influence a decision based on influence strength
 */
export function shouldSoulInfluence(link: SoulLinkComponent): boolean {
  return Math.random() < link.soul_influence_strength;
}

/**
 * Sever the soul link (on death)
 */
export function severSoulLink(link: SoulLinkComponent): void {
  link.is_primary_incarnation = false;
  link.soul_influence_strength = 0;
}
