/**
 * EquipmentComponent - Dynamic body-based equipment system
 *
 * **BODY-BASED DESIGN:**
 * Equipment slots are generated dynamically from BodyComponent.parts at runtime.
 * Supports multi-species equipment (humanoids, angels, aliens, insectoids, etc.)
 *
 * Part of Phase 36: Equipment System
 */

import type { Component } from '../ecs/Component.js';
import { itemRegistry } from '../items/index.js';
import type { ItemDefinition } from '../items/ItemDefinition.js';

/**
 * Simple equipment slot - stores item ID reference
 */
export interface EquipmentSlot {
  /** Item definition ID (e.g., 'iron_helmet', 'wing_guard') */
  itemId: string;
  /** Optional instance ID for unique items with durability/quality */
  instanceId?: string;
}

/**
 * Equipment Component - tracks equipped items per body part.
 *
 * **Dynamic Slots:**
 * - `equipped`: Maps body part IDs to equipped item IDs
 * - Slots are NOT fixed - they adapt to the entity's body structure
 * - Angels have wing slots, tentacled aliens have tentacle slots, etc.
 *
 * **Weight Tracking:**
 * - Flying creatures have strict weight limits
 * - `canFly` becomes false if weight exceeds threshold
 */
export interface EquipmentComponent extends Component {
  readonly type: 'equipment';

  /**
   * DYNAMIC: Maps body part IDs to equipped items.
   * Key = body part ID (e.g., "left_wing_1", "tentacle_3", "head_1")
   * Value = item ID
   */
  equipped: Record<string, EquipmentSlot>;

  /**
   * Weapons (not body-part-specific)
   */
  weapons: {
    mainHand?: EquipmentSlot;
    offHand?: EquipmentSlot;
  };

  /**
   * Accessories (rings, trinkets, etc.)
   */
  accessories: {
    rings: EquipmentSlot[];     // Max 2
    trinkets: EquipmentSlot[];  // Max 1
  };

  /**
   * Quick-swap loadouts (stores item IDs)
   */
  loadouts?: {
    combat?: Record<string, string>;   // bodyPartId -> itemId
    formal?: Record<string, string>;
    work?: Record<string, string>;
  };

  /**
   * Auto-equip preferences
   */
  autoEquip: {
    weapons: boolean;
    armor: boolean;
    clothing: boolean;
  };

  /**
   * Weight tracking (important for flying creatures)
   */
  totalWeight: number;  // kg

  /**
   * Can this entity fly? (false if weight > flight threshold)
   */
  canFly: boolean;

  /**
   * Cached defense stats (performance optimization)
   */
  cached?: {
    totalDefense: number;
    resistances: Record<string, number>;  // damageType -> resistance
    movementPenalty: number;
    /** Skill modifiers from all equipped items (Phase 36: Combat Integration) */
    skillModifiers: Record<string, number>;  // skillName -> total bonus
    /** Stat modifiers from all equipped items (optional future expansion) */
    statModifiers?: Record<string, number>;  // statName -> total bonus
    lastUpdateTick: number;
  };
}

/**
 * Create a new EquipmentComponent with default values.
 */
export function createEquipmentComponent(): EquipmentComponent {
  return {
    type: 'equipment',
    version: 1,
    equipped: {},
    weapons: {},
    accessories: {
      rings: [],
      trinkets: [],
    },
    autoEquip: {
      weapons: true,
      armor: true,
      clothing: true,
    },
    totalWeight: 0,
    canFly: false,
  };
}

/**
 * Check if a body part slot has equipment.
 */
export function hasEquipmentOn(
  equipment: EquipmentComponent,
  bodyPartId: string
): boolean {
  return equipment.equipped[bodyPartId] !== undefined;
}

/**
 * Get equipped item ID for a body part.
 */
export function getEquippedItemId(
  equipment: EquipmentComponent,
  bodyPartId: string
): string | null {
  return equipment.equipped[bodyPartId]?.itemId ?? null;
}

/**
 * Get equipped item definition for a body part.
 */
export function getEquippedItem(
  equipment: EquipmentComponent,
  bodyPartId: string
): ItemDefinition | null {
  const slot = equipment.equipped[bodyPartId];
  if (!slot) return null;
  return itemRegistry.tryGet(slot.itemId) ?? null;
}

/**
 * Get all equipped item definitions as an array.
 */
export function getAllEquippedItems(equipment: EquipmentComponent): ItemDefinition[] {
  const items: ItemDefinition[] = [];

  // Body armor
  for (const slot of Object.values(equipment.equipped)) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item) items.push(item);
  }

  // Weapons
  if (equipment.weapons.mainHand) {
    const item = itemRegistry.tryGet(equipment.weapons.mainHand.itemId);
    if (item) items.push(item);
  }
  if (equipment.weapons.offHand) {
    const item = itemRegistry.tryGet(equipment.weapons.offHand.itemId);
    if (item) items.push(item);
  }

  // Accessories
  for (const slot of equipment.accessories.rings) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item) items.push(item);
  }
  for (const slot of equipment.accessories.trinkets) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item) items.push(item);
  }

  return items;
}

/**
 * Get total armor defense from all equipped items.
 */
export function getTotalDefense(equipment: EquipmentComponent): number {
  let total = 0;

  for (const slot of Object.values(equipment.equipped)) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item?.traits?.armor) {
      total += item.traits.armor.defense;
    }
  }

  return total;
}

/**
 * Get resistance to a specific damage type.
 */
export function getDamageResistance(
  equipment: EquipmentComponent,
  damageType: string
): number {
  let totalResistance = 0;

  for (const slot of Object.values(equipment.equipped)) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item?.traits?.armor?.resistances) {
      const resistances = item.traits.armor.resistances;
      const resistance = resistances ? resistances[damageType as keyof typeof resistances] : undefined;
      totalResistance += resistance ?? 0;
    }
  }

  // Cap at 0.9 (90% max resistance)
  return Math.min(0.9, totalResistance);
}

/**
 * Get total movement penalty from equipped armor.
 */
export function getMovementPenalty(equipment: EquipmentComponent): number {
  let totalPenalty = 0;

  for (const slot of Object.values(equipment.equipped)) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item?.traits?.armor) {
      totalPenalty += item.traits.armor.movementPenalty ?? 0;
    }
  }

  // Cap at 0.9 (90% max penalty)
  return Math.min(0.9, totalPenalty);
}

/**
 * Calculate total weight of all equipped items.
 */
export function calculateTotalWeight(equipment: EquipmentComponent): number {
  let totalWeight = 0;

  // Body armor
  for (const slot of Object.values(equipment.equipped)) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item?.traits?.armor) {
      totalWeight += item.traits.armor.weight ?? 0;
    }
  }

  // Weapons
  if (equipment.weapons.mainHand) {
    const item = itemRegistry.tryGet(equipment.weapons.mainHand.itemId);
    if (item?.traits?.weapon) {
      totalWeight += item.weight;
    }
  }
  if (equipment.weapons.offHand) {
    const item = itemRegistry.tryGet(equipment.weapons.offHand.itemId);
    if (item?.traits?.weapon) {
      totalWeight += item.weight;
    }
  }

  return totalWeight;
}

/**
 * Check if equipment set provides set bonus.
 * Returns true if wearing 3+ pieces of same material and armor class.
 */
export function hasSetBonus(equipment: EquipmentComponent): boolean {
  const materials = new Set<string>();
  const classes = new Set<string>();
  let count = 0;

  for (const slot of Object.values(equipment.equipped)) {
    const item = itemRegistry.tryGet(slot.itemId);
    if (item?.traits?.armor) {
      if (item.baseMaterial) materials.add(item.baseMaterial);
      classes.add(item.traits.armor.armorClass);
      count++;
    }
  }

  // Set bonus requires single material AND single class AND 3+ pieces
  return materials.size === 1 && classes.size === 1 && count >= 3;
}
