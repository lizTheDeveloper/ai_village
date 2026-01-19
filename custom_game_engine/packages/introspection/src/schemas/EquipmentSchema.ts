/**
 * Equipment Component Schema
 *
 * Tracks equipped items on body parts, weapons, and accessories.
 * Dynamic slot system that adapts to entity body structure.
 * Phase 4, Tier 3 - Physical components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

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
 * Equipment component interface
 */
export interface EquipmentComponent extends Component {
  type: 'equipment';
  version: 1;
  /** Maps body part IDs to equipped items */
  equipped: Record<string, EquipmentSlot>;
  /** Weapons (not body-part-specific) */
  weapons: {
    mainHand?: EquipmentSlot;
    offHand?: EquipmentSlot;
  };
  /** Accessories (rings, trinkets) */
  accessories: {
    rings: EquipmentSlot[];
    trinkets: EquipmentSlot[];
  };
  /** Auto-equip preferences */
  autoEquip: {
    weapons: boolean;
    armor: boolean;
    clothing: boolean;
  };
  /** Total weight of equipped items */
  totalWeight: number;
  /** Can this entity fly? (false if weight > flight threshold) */
  canFly: boolean;
}

/**
 * Equipment component schema
 */
export const EquipmentSchema = autoRegister(
  defineComponent<EquipmentComponent>({
    type: 'equipment',
    version: 1,
    category: 'physical',

    fields: {
      equipped: {
        type: 'map',
        itemType: 'object',
        required: true,
        default: {},
        description: 'Body part equipment mapping (dynamic based on entity body)',
        displayName: 'Equipped Armor',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'armor',
          order: 1,
          icon: 'shield',
        },
        mutable: true,
        mutateVia: 'equipItem',
      },

      weapons: {
        type: 'object',
        required: true,
        default: {},
        description: 'Equipped weapons (main hand and off hand)',
        displayName: 'Weapons',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'combat',
          order: 2,
          icon: 'sword',
        },
        mutable: true,
        mutateVia: 'equipWeapon',
      },

      accessories: {
        type: 'object',
        required: true,
        default: { rings: [], trinkets: [] },
        description: 'Equipped accessories (rings, trinkets)',
        displayName: 'Accessories',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'accessories',
          order: 3,
          icon: 'ring',
        },
        mutable: true,
      },

      autoEquip: {
        type: 'object',
        required: true,
        default: { weapons: true, armor: true, clothing: true },
        description: 'Auto-equip preferences for different item types',
        displayName: 'Auto-Equip',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'settings',
          order: 4,
        },
        mutable: true,
      },

      totalWeight: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 500] as const,
        description: 'Total weight of all equipped items in kg',
        displayName: 'Equipment Weight',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'stats',
          order: 5,
          icon: 'weight',
        },
        mutable: false, // Auto-calculated
      },

      canFly: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether entity can fly (affected by equipment weight)',
        displayName: 'Can Fly',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'stats',
          order: 6,
          icon: 'wings',
        },
        mutable: false, // Auto-calculated based on weight
      },
    },

    ui: {
      icon: 'shield',
      color: '#616161',
      priority: 4,
    },

    llm: {
      promptSection: 'equipment',
      summarize: (data) => {
        // Count equipped items
        const armorPieces = Object.keys(data.equipped).length;
        const weaponCount =
          (data.weapons.mainHand ? 1 : 0) + (data.weapons.offHand ? 1 : 0);
        const accessoryCount =
          data.accessories.rings.length + data.accessories.trinkets.length;

        const parts: string[] = [];

        if (armorPieces > 0) {
          parts.push(`${armorPieces} armor piece${armorPieces !== 1 ? 's' : ''}`);
        }

        if (weaponCount > 0) {
          const weaponDesc =
            weaponCount === 2
              ? 'dual-wielding'
              : data.weapons.mainHand
              ? 'wielding weapon'
              : 'off-hand weapon';
          parts.push(weaponDesc);
        }

        if (accessoryCount > 0) {
          parts.push(`${accessoryCount} accessor${accessoryCount !== 1 ? 'ies' : 'y'}`);
        }

        const summary = parts.length > 0 ? parts.join(', ') : 'no equipment';
        const weightInfo = `${data.totalWeight.toFixed(1)}kg`;
        const flyStatus = data.canFly ? 'flight-capable' : 'grounded';

        return `Equipment: ${summary} (${weightInfo}, ${flyStatus})`;
      },
    },

    mutators: {
      /**
       * Equip an item to a body part
       */
      equipItem: (entity, bodyPartId: string, itemId: string, instanceId?: string) => {
        const equipment = entity.getComponent('equipment') as EquipmentComponent;
        if (!equipment) {
          throw new Error('Entity does not have equipment component');
        }

        if (typeof bodyPartId !== 'string' || bodyPartId.length === 0) {
          throw new Error('Body part ID must be a non-empty string');
        }
        if (typeof itemId !== 'string' || itemId.length === 0) {
          throw new Error('Item ID must be a non-empty string');
        }

        // Placeholder - actual implementation should validate item compatibility
        console.warn(
          '[EquipmentSchema] equipItem mutator is placeholder - use core functions'
        );
      },

      /**
       * Equip a weapon to main hand or off hand
       */
      equipWeapon: (
        entity,
        hand: 'mainHand' | 'offHand',
        itemId: string,
        instanceId?: string
      ) => {
        const equipment = entity.getComponent('equipment') as EquipmentComponent;
        if (!equipment) {
          throw new Error('Entity does not have equipment component');
        }

        if (hand !== 'mainHand' && hand !== 'offHand') {
          throw new Error('Hand must be "mainHand" or "offHand"');
        }
        if (typeof itemId !== 'string' || itemId.length === 0) {
          throw new Error('Item ID must be a non-empty string');
        }

        console.warn(
          '[EquipmentSchema] equipWeapon mutator is placeholder - use core functions'
        );
      },
    },

    validate: (data): data is EquipmentComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;

      if (d.type !== 'equipment') return false;

      // Validate equipped (Record<string, EquipmentSlot>)
      if (typeof d.equipped !== 'object' || d.equipped === null) return false;
      for (const [key, slot] of Object.entries(d.equipped)) {
        if (typeof key !== 'string') return false;
        if (typeof slot !== 'object' || slot === null) return false;
        const s = slot as Record<string, unknown>;
        if (typeof s.itemId !== 'string') return false;
        if (s.instanceId !== undefined && typeof s.instanceId !== 'string')
          return false;
      }

      // Validate weapons
      if (typeof d.weapons !== 'object' || d.weapons === null) return false;
      const weapons = d.weapons as Record<string, unknown>;
      if (weapons.mainHand !== undefined) {
        const mh = weapons.mainHand as Record<string, unknown>;
        if (typeof mh !== 'object' || typeof mh.itemId !== 'string') return false;
      }
      if (weapons.offHand !== undefined) {
        const oh = weapons.offHand as Record<string, unknown>;
        if (typeof oh !== 'object' || typeof oh.itemId !== 'string') return false;
      }

      // Validate accessories
      if (typeof d.accessories !== 'object' || d.accessories === null) return false;
      const accessories = d.accessories as Record<string, unknown>;
      if (!Array.isArray(accessories.rings)) return false;
      if (!Array.isArray(accessories.trinkets)) return false;

      // Validate autoEquip
      if (typeof d.autoEquip !== 'object' || d.autoEquip === null) return false;
      const autoEquip = d.autoEquip as Record<string, unknown>;
      if (typeof autoEquip.weapons !== 'boolean') return false;
      if (typeof autoEquip.armor !== 'boolean') return false;
      if (typeof autoEquip.clothing !== 'boolean') return false;

      // Validate stats
      if (typeof d.totalWeight !== 'number' || d.totalWeight < 0) return false;
      if (typeof d.canFly !== 'boolean') return false;

      return true;
    },

    createDefault: () => ({
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
    }),
  })
);
