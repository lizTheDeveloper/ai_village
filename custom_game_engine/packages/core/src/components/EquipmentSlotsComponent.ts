/**
 * EquipmentSlotsComponent - Tracks equipped items on an agent
 *
 * Forward-compatibility component for future combat/armor systems.
 * Defines equipment slots that can hold item IDs.
 *
 * Part of Forward-Compatibility Phase
 */

import type { Component } from '../ecs/Component.js';

/** Equipment slot identifiers */
export type EquipmentSlotId =
  | 'head'       // Helmet, hat, crown
  | 'neck'       // Amulet, necklace, scarf
  | 'torso'      // Armor, shirt, robe
  | 'back'       // Backpack, quiver, cape
  | 'hands'      // Gloves, gauntlets
  | 'waist'      // Belt
  | 'legs'       // Pants, leg armor
  | 'feet'       // Boots, shoes
  | 'main_hand'  // Primary weapon or tool
  | 'off_hand'   // Shield, torch, secondary weapon
  | 'ring_left'  // Left ring finger
  | 'ring_right'; // Right ring finger

/**
 * Information about an equipped item.
 */
export interface EquippedItem {
  /** Item instance ID (from inventory) */
  itemId: string;
  /** Item definition ID */
  definitionId: string;
  /** Current durability (0-1) */
  durability: number;
  /** When the item was equipped (game tick) */
  equippedAt: number;
}

/**
 * EquipmentSlotsComponent tracks what items an agent has equipped.
 *
 * Future use cases:
 * - Combat: Weapons in main_hand/off_hand affect damage
 * - Defense: Armor in torso/head/etc. reduces incoming damage
 * - Tools: Equipped tools provide gathering bonuses
 * - Status effects: Some equipment provides buffs/debuffs
 */
export interface EquipmentSlotsComponent extends Component {
  type: 'equipment_slots';

  /** Equipment slots - null means nothing equipped */
  slots: Partial<Record<EquipmentSlotId, EquippedItem | null>>;

  /** Whether this agent can dual-wield (use both main_hand and off_hand for weapons) */
  canDualWield: boolean;

  /** Whether equipment is currently locked (cannot be changed) */
  locked: boolean;

  /** Reason for lock (if locked) */
  lockReason?: string;
}

/**
 * Create a new EquipmentSlotsComponent with empty slots.
 */
export function createEquipmentSlotsComponent(): EquipmentSlotsComponent {
  return {
    type: 'equipment_slots',
    version: 1,
    slots: {},
    canDualWield: false,
    locked: false,
  };
}

/**
 * Equip an item to a slot.
 * @throws Error if slot is locked or invalid
 */
export function equipItem(
  component: EquipmentSlotsComponent,
  slot: EquipmentSlotId,
  item: EquippedItem
): EquipmentSlotsComponent {
  if (component.locked) {
    throw new Error(`Cannot equip item: equipment is locked (${component.lockReason})`);
  }

  return {
    ...component,
    slots: {
      ...component.slots,
      [slot]: item,
    },
  };
}

/**
 * Unequip an item from a slot.
 * @returns The unequipped item, or null if slot was empty
 */
export function unequipItem(
  component: EquipmentSlotsComponent,
  slot: EquipmentSlotId
): { component: EquipmentSlotsComponent; item: EquippedItem | null } {
  if (component.locked) {
    throw new Error(`Cannot unequip item: equipment is locked (${component.lockReason})`);
  }

  const item = component.slots[slot] ?? null;
  const newSlots = { ...component.slots };
  delete newSlots[slot];

  return {
    component: {
      ...component,
      slots: newSlots,
    },
    item,
  };
}

/**
 * Get the item in a specific slot.
 */
export function getEquippedItem(
  component: EquipmentSlotsComponent,
  slot: EquipmentSlotId
): EquippedItem | null {
  return component.slots[slot] ?? null;
}

/**
 * Check if a slot is occupied.
 */
export function isSlotOccupied(
  component: EquipmentSlotsComponent,
  slot: EquipmentSlotId
): boolean {
  return component.slots[slot] != null;
}

/**
 * Get all equipped items.
 */
export function getAllEquippedItems(
  component: EquipmentSlotsComponent
): Array<{ slot: EquipmentSlotId; item: EquippedItem }> {
  const result: Array<{ slot: EquipmentSlotId; item: EquippedItem }> = [];

  for (const [slot, item] of Object.entries(component.slots)) {
    if (item) {
      result.push({ slot: slot as EquipmentSlotId, item });
    }
  }

  return result;
}

/**
 * Calculate total armor value from equipped items.
 * Future: Will be used by combat system.
 * Currently returns 0 as armor trait integration is pending.
 */
export function calculateTotalArmor(_component: EquipmentSlotsComponent): number {
  // TODO: Integrate with ArmorTrait when combat system is implemented
  return 0;
}
