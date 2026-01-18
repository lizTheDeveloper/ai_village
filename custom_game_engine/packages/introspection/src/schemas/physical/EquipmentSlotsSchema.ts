/**
 * EquipmentSlots Component Schema
 *
 * Tracks equipped items on an agent.
 * Forward-compatibility for future combat/armor systems.
 * Tier 16: Miscellaneous (physical/items).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Equipment slots component type
 */
export interface EquipmentSlotsComponent extends Component {
  type: 'equipment_slots';
  version: 1;

  slots: Partial<Record<
    'head' | 'neck' | 'torso' | 'back' | 'hands' | 'waist' | 'legs' | 'feet' |
    'main_hand' | 'off_hand' | 'ring_left' | 'ring_right',
    {
      itemId: string;
      definitionId: string;
      durability: number;
      equippedAt: number;
    } | null
  >>;
  canDualWield: boolean;
  locked: boolean;
  lockReason?: string;
}

/**
 * Equipment slots component schema
 */
export const EquipmentSlotsSchema = autoRegister(
  defineComponent<EquipmentSlotsComponent>({
    type: 'equipment_slots',
    version: 1,
    category: 'physical',
    description: 'Tracks equipped items on an agent',

    fields: {
      slots: {
        type: 'object',
        required: true,
        default: {},
        description: 'Equipment slots - null means nothing equipped',
        displayName: 'Equipment Slots',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'json', group: 'equipment', order: 1, icon: '⚔️' },
        mutable: true,
      },

      canDualWield: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether this agent can dual-wield (use both main_hand and off_hand for weapons)',
        displayName: 'Can Dual Wield',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'abilities', order: 1 },
        mutable: true,
      },

      locked: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether equipment is currently locked (cannot be changed)',
        displayName: 'Locked',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'status', order: 1, icon: '🔒' },
        mutable: true,
      },

      lockReason: {
        type: 'string',
        required: false,
        description: 'Reason for lock (if locked)',
        displayName: 'Lock Reason',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'status', order: 2 },
        mutable: true,
      },
    },

    ui: {
      icon: '⚔️',
      color: '#C0C0C0',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'equipment',
      priority: 5,
      summarize: (data) => {
        const equipped = Object.entries(data.slots)
          .filter(([_, item]) => item !== null && item !== undefined)
          .map(([slot, _]) => slot);
        if (equipped.length === 0) return '';
        return `Equipment: ${equipped.join(', ')}`;
      },
    },

    validate: (data): data is EquipmentSlotsComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const e = data as Record<string, unknown>;

      if (!('type' in e) || e.type !== 'equipment_slots') return false;
      if (!('slots' in e) || typeof e.slots !== 'object' || e.slots === null) return false;
      if (!('canDualWield' in e) || typeof e.canDualWield !== 'boolean') return false;
      if (!('locked' in e) || typeof e.locked !== 'boolean') return false;
      if ('lockReason' in e && e.lockReason !== undefined && typeof e.lockReason !== 'string') return false;

      return true;
    },

    createDefault: () => ({
      type: 'equipment_slots',
      version: 1,
      slots: {},
      canDualWield: false,
      locked: false,
      lockReason: undefined,
    }),
  })
);
