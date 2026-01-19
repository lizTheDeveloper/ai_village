/**
 * Machine Connection Component Schema
 *
 * Input/output slots for machines.
 * Machines can connect directly to adjacent machines without belts.
 *
 * Phase 4+, Tier 12 - Buildings/Infrastructure Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Machine connection component type
 */
export interface MachineConnectionComponent extends Component {
  type: 'machine_connection';
  version: 1;

  inputs: Array<{
    offset: { x: number; y: number };
    filter?: string[];
    items: Array<{
      instanceId: string;
      definitionId: string;
      quantity: number;
    }>;
    capacity: number;
  }>;
  outputs: Array<{
    offset: { x: number; y: number };
    items: Array<{
      instanceId: string;
      definitionId: string;
      quantity: number;
    }>;
    capacity: number;
  }>;
}

/**
 * Machine connection component schema
 */
export const MachineConnectionSchema = autoRegister(
  defineComponent<MachineConnectionComponent>({
    type: 'machine_connection',
    version: 1,
    category: 'world',

    fields: {
      inputs: {
        type: 'array',
        required: true,
        default: [],
        description: 'Input slots - accept items from adjacent outputs',
        displayName: 'Inputs',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'slots',
          order: 1,
          icon: '⬅️',
        },
        mutable: true,
        itemType: 'object',
      },

      outputs: {
        type: 'array',
        required: true,
        default: [],
        description: 'Output slots - send items to adjacent inputs',
        displayName: 'Outputs',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'slots',
          order: 2,
          icon: '➡️',
        },
        mutable: true,
        itemType: 'object',
      },
    },

    ui: {
      icon: '🔌',
      color: '#FFD700',
      priority: 12,
    },

    llm: {
      promptSection: 'machines',
      priority: 12,
      summarize: (data) => {
        const totalInputItems = data.inputs.reduce((sum, slot) => sum + slot.items.length, 0);
        const totalOutputItems = data.outputs.reduce((sum, slot) => sum + slot.items.length, 0);

        return `${data.inputs.length} ${data.inputs.length === 1 ? 'input' : 'inputs'} (${totalInputItems} items), ${data.outputs.length} ${data.outputs.length === 1 ? 'output' : 'outputs'} (${totalOutputItems} items)`;
      },
    },

    validate: (data): data is MachineConnectionComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const mc = data as Record<string, unknown>;

      return (
        mc.type === 'machine_connection' &&
        Array.isArray(mc.inputs) &&
        Array.isArray(mc.outputs)
      );
    },

    createDefault: () => ({
      type: 'machine_connection',
      version: 1,
      inputs: [],
      outputs: [],
    }),
  })
);
