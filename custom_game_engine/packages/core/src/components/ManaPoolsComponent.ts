/**
 * ManaPoolsComponent - Tracks mana and resource pools for magic users
 *
 * Split from MagicComponent Phase 2 - focused component for resource management.
 *
 * Handles:
 * - Mana pools (arcane, divine, void, nature, psionic, blood, ancestral)
 * - Alternative resource pools (favor, breath, corruption, blood_debt, etc.)
 * - Resource regeneration tracking
 * - Locked resources (for sustained spells)
 */

import type { Component } from '../ecs/Component.js';
import type { MagicSourceId } from './MagicComponent.js';

/**
 * Mana pool for a specific magic source
 */
export interface ManaPool {
  source: MagicSourceId;
  current: number;
  maximum: number;
  regenRate: number;    // per tick
  locked: number;       // temporarily unavailable (sustaining spells)
}

/**
 * Generic resource pool for non-mana paradigms
 */
export interface ResourcePool {
  type: string; // MagicCostType
  current: number;
  maximum: number;
  regenRate: number;
  locked: number;
}

/**
 * Tracks mana and resource pools for magic users.
 *
 * Different paradigms use different resources:
 * - Academic: Arcane mana
 * - Divine: Favor points
 * - Allomancy: Metal reserves
 * - Blood Magic: Blood debt / life force
 * - Breath Magic: Breath count
 */
export interface ManaPoolsComponent extends Component {
  type: 'mana_pools';

  /** Mana pools for each magic source this entity can access */
  manaPools: ManaPool[];

  /** Alternative resource pools by cost type (for non-mana paradigms) */
  resourcePools: Partial<Record<string, ResourcePool>>;

  /** Magic source this entity is most attuned to */
  primarySource?: MagicSourceId;
}

/**
 * Create a default ManaPoolsComponent with no pools.
 */
export function createManaPoolsComponent(): ManaPoolsComponent {
  return {
    type: 'mana_pools',
    version: 1,
    manaPools: [],
    resourcePools: {},
  };
}

/**
 * Create a ManaPoolsComponent with a specific mana source.
 */
export function createManaPoolsComponentWithSource(
  source: MagicSourceId,
  maxMana: number = 100
): ManaPoolsComponent {
  return {
    type: 'mana_pools',
    version: 1,
    manaPools: [{
      source,
      current: maxMana,
      maximum: maxMana,
      regenRate: 0.01,  // 1% per tick
      locked: 0,
    }],
    resourcePools: {},
    primarySource: source,
  };
}

/**
 * Get current mana for a specific source.
 */
export function getMana(component: ManaPoolsComponent, source: MagicSourceId): number {
  const pool = component.manaPools.find(p => p.source === source);
  return pool?.current ?? 0;
}

/**
 * Get available mana (current - locked) for a specific source.
 */
export function getAvailableMana(component: ManaPoolsComponent, source: MagicSourceId): number {
  const pool = component.manaPools.find(p => p.source === source);
  if (!pool) return 0;
  return Math.max(0, pool.current - pool.locked);
}
