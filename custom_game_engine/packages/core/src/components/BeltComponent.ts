import type { Component } from '../ecs/Component.js';

/**
 * Direction for belt movement
 */
export type BeltDirection = 'north' | 'south' | 'east' | 'west';

/**
 * Belt tier (affects speed)
 * Tier 1: Wooden belt (0.05 tiles/tick)
 * Tier 2: Electric belt (0.15 tiles/tick)
 * Tier 3: Advanced belt (0.30 tiles/tick)
 */
export type BeltTier = 1 | 2 | 3;

/**
 * BeltComponent - Conveyor belt that moves items
 *
 * Simplified for performance: Belts track item COUNT, not individual positions.
 * Each belt segment holds a single resource type. Items propagate to adjacent
 * belts based on tier speed.
 *
 * This is "factorio-ish not full factorio" - abstracted for performance.
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 3)
 */
export interface BeltComponent extends Component {
  readonly type: 'belt';

  /** Direction belt moves items */
  direction: BeltDirection;

  /** Belt tier (affects speed) */
  tier: BeltTier;

  /** Item type currently on this belt (null if empty) */
  itemId: string | null;

  /** Number of items on this belt segment */
  count: number;

  /** Maximum items per belt segment */
  capacity: number;

  /** Accumulated transfer progress (0.0 - 1.0) */
  transferProgress: number;
}

/**
 * Belt speed by tier (tiles per tick)
 */
export const BELT_SPEEDS: Record<BeltTier, number> = {
  1: 0.05,   // Wooden belt
  2: 0.15,   // Electric belt (3x faster)
  3: 0.30,   // Advanced belt (6x faster)
};

/**
 * Factory function to create BeltComponent
 */
export function createBeltComponent(
  direction: BeltDirection,
  tier: BeltTier = 1,
  capacity: number = 8
): BeltComponent {
  return {
    type: 'belt',
    version: 1,
    direction,
    tier,
    itemId: null,
    count: 0,
    capacity,
    transferProgress: 0.0,
  };
}

/**
 * Add items to belt (returns number actually added)
 * Belt can only hold one resource type at a time
 */
export function addItemsToBelt(
  belt: BeltComponent,
  itemId: string,
  amount: number
): number {
  // Belt must be empty or have same item type
  if (belt.itemId !== null && belt.itemId !== itemId) {
    return 0; // Cannot mix resource types
  }

  const space = belt.capacity - belt.count;
  const toAdd = Math.min(amount, space);

  if (toAdd > 0) {
    belt.itemId = itemId;
    belt.count += toAdd;
  }

  return toAdd;
}

/**
 * Remove items from belt (returns number actually removed)
 */
export function removeItemsFromBelt(
  belt: BeltComponent,
  amount: number
): number {
  const toRemove = Math.min(amount, belt.count);

  belt.count -= toRemove;

  // Clear itemId if belt is now empty
  if (belt.count === 0) {
    belt.itemId = null;
    belt.transferProgress = 0.0;
  }

  return toRemove;
}

/**
 * Check if belt can accept items
 */
export function canAcceptItems(
  belt: BeltComponent,
  itemId: string,
  amount: number
): boolean {
  if (belt.itemId !== null && belt.itemId !== itemId) {
    return false; // Wrong resource type
  }

  return (belt.count + amount) <= belt.capacity;
}
