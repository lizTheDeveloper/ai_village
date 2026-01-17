/**
 * Inventory Component Schema
 *
 * Tracks agent inventory with slots, weight limits, and item stacking.
 * Phase 4, Tier 3 - Physical components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * A slot in an agent's inventory
 */
export interface InventorySlot {
  /** Resource type or item ID stored in this slot */
  itemId: string | null;
  /** Quantity of items in this slot */
  quantity: number;
  /** Optional quality rating (for Phase 10+) */
  quality?: number;
  /** Optional unique instance ID for legendary/unique items */
  instanceId?: string;
}

/**
 * Inventory component interface
 */
export interface InventoryComponent extends Component {
  type: 'inventory';
  version: 1;
  /** Array of inventory slots */
  slots: InventorySlot[];
  /** Maximum number of slots */
  maxSlots: number;
  /** Maximum weight capacity */
  maxWeight: number;
  /** Current total weight (cached for performance) */
  currentWeight: number;
}

/**
 * Inventory component schema
 */
export const InventorySchema = autoRegister(
  defineComponent<InventoryComponent>({
    type: 'inventory',
    version: 1,
    category: 'physical',

    fields: {
      slots: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        maxLength: 100, // Reasonable max for performance
        description: 'Array of inventory slots containing items',
        displayName: 'Inventory Slots',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'inventory',
          order: 1,
          icon: 'backpack',
        },
        mutable: true,
        mutateVia: 'addItem', // Use inventory mutation functions
      },

      maxSlots: {
        type: 'number',
        required: true,
        default: 24,
        range: [1, 100] as const,
        description: 'Maximum number of inventory slots',
        displayName: 'Max Slots',
        visibility: { player: true, llm: true, agent: false, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'capacity',
          order: 2,
        },
        mutable: true,
      },

      maxWeight: {
        type: 'number',
        required: true,
        default: 100,
        range: [1, 1000] as const,
        description: 'Maximum weight capacity in kg',
        displayName: 'Max Weight',
        visibility: { player: true, llm: true, agent: false, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'capacity',
          order: 3,
          icon: 'weight',
        },
        mutable: true,
      },

      currentWeight: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000] as const,
        description: 'Current total weight of inventory (cached)',
        displayName: 'Current Weight',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'capacity',
          order: 4,
          icon: 'scale',
        },
        mutable: false, // Read-only, auto-calculated
      },
    },

    ui: {
      icon: 'backpack',
      color: '#8D6E63',
      priority: 3,
    },

    llm: {
      promptSection: 'inventory',
      summarize: (data) => {
        // Count non-empty slots
        const filledSlots = data.slots.filter(
          (s) => s.itemId !== null && s.quantity > 0
        ).length;
        const weightPercent = Math.round((data.currentWeight / data.maxWeight) * 100);

        // Summarize top items
        const itemCounts = new Map<string, number>();
        for (const slot of data.slots) {
          if (slot.itemId && slot.quantity > 0) {
            const current = itemCounts.get(slot.itemId) || 0;
            itemCounts.set(slot.itemId, current + slot.quantity);
          }
        }

        const topItems = Array.from(itemCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, qty]) => `${id} (${qty})`)
          .join(', ');

        return `Inventory: ${filledSlots}/${data.maxSlots} slots used, ${data.currentWeight.toFixed(1)}/${data.maxWeight}kg (${weightPercent}%)${topItems ? ` | Top items: ${topItems}` : ''}`;
      },
    },

    mutators: {
      /**
       * Add item to inventory (uses core inventory functions)
       */
      addItem: (entity, itemId: string, quantity: number) => {
        // This is a placeholder - actual implementation should use
        // addToInventory from InventoryComponent.ts
        const inventory = entity.getComponent('inventory') as InventoryComponent;
        if (!inventory) {
          throw new Error('Entity does not have inventory component');
        }

        // For now, just validate inputs
        if (typeof itemId !== 'string' || itemId.length === 0) {
          throw new Error('Item ID must be a non-empty string');
        }
        if (typeof quantity !== 'number' || quantity <= 0) {
          throw new Error('Quantity must be positive');
        }

        // Actual mutation should use: addToInventory(inventory, itemId, quantity)
        // This would require importing from @ai-village/core
        console.warn(
          '[InventorySchema] addItem mutator is placeholder - use core functions'
        );
      },
    },

    validate: (data): data is InventoryComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;

      if (!('type' in d) || d.type !== 'inventory') return false;
      if (!('slots' in d) || !Array.isArray(d.slots)) return false;
      if (!('maxSlots' in d) || typeof d.maxSlots !== 'number' || d.maxSlots < 1) return false;
      if (!('maxWeight' in d) || typeof d.maxWeight !== 'number' || d.maxWeight < 1) return false;
      if (!('currentWeight' in d) || typeof d.currentWeight !== 'number' || d.currentWeight < 0) return false;

      // Validate each slot
      for (const slot of d.slots) {
        if (typeof slot !== 'object' || slot === null) return false;
        const s = slot as Record<string, unknown>;
        if (!('itemId' in s) || (s.itemId !== null && typeof s.itemId !== 'string')) return false;
        if (!('quantity' in s) || typeof s.quantity !== 'number' || s.quantity < 0) return false;
        if ('quality' in s && s.quality !== undefined && typeof s.quality !== 'number')
          return false;
        if ('instanceId' in s && s.instanceId !== undefined && typeof s.instanceId !== 'string')
          return false;
      }

      return true;
    },

    createDefault: () => ({
      type: 'inventory',
      version: 1,
      slots: Array.from({ length: 24 }, () => ({ itemId: null, quantity: 0 })),
      maxSlots: 24,
      maxWeight: 100,
      currentWeight: 0,
    }),
  })
);
