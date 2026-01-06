/**
 * AssemblyMachine Component Schema
 *
 * Automated crafting machine for factory automation.
 * Part of automation system (Tier 15: Automation/Manufacturing).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Assembly machine component type
 */
export interface AssemblyMachineComponent extends Component {
  type: 'assembly_machine';
  version: 1;

  machineType: string;
  currentRecipe?: string;
  progress: number;
  speed: number;
  ingredientSlots: number;
  moduleSlots: number;
  modules: Array<{
    moduleType: 'speed' | 'efficiency' | 'productivity';
    level: 1 | 2 | 3;
    bonus: number;
  }>;
}

/**
 * Assembly machine component schema
 */
export const AssemblyMachineSchema = autoRegister(
  defineComponent<AssemblyMachineComponent>({
    type: 'assembly_machine',
    version: 1,
    category: 'system',
    description: 'Automated crafting machine for factory automation',

    fields: {
      machineType: {
        type: 'string',
        required: true,
        default: 'assembler_mk1',
        description: 'Machine type identifier',
        displayName: 'Machine Type',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'machine', order: 1 },
        mutable: false,
      },

      currentRecipe: {
        type: 'string',
        required: false,
        description: 'Current recipe being crafted (undefined = idle)',
        displayName: 'Current Recipe',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'machine', order: 2 },
        mutable: true,
      },

      progress: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Crafting progress (0-100)',
        displayName: 'Progress',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'machine', order: 3, min: 0, max: 100 },
        mutable: true,
      },

      speed: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Speed multiplier (base 1.0)',
        displayName: 'Speed',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'machine', order: 4, min: 0.1, max: 5.0, step: 0.1 },
        mutable: true,
      },

      ingredientSlots: {
        type: 'number',
        required: true,
        default: 4,
        description: 'Max ingredient slots',
        displayName: 'Ingredient Slots',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'machine', order: 5 },
        mutable: false,
      },

      moduleSlots: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Max module slots',
        displayName: 'Module Slots',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'machine', order: 6 },
        mutable: false,
      },

      modules: {
        type: 'array',
        required: true,
        default: [],
        description: 'Modules installed',
        displayName: 'Installed Modules',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'machine', order: 7 },
        mutable: true,
        itemType: 'object',
      },
    },

    ui: {
      icon: '🏭',
      color: '#708090',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'environment',
      priority: 5,
      summarize: (data) => {
        const status = data.currentRecipe
          ? `crafting ${data.currentRecipe} (${data.progress.toFixed(0)}% complete)`
          : 'idle';
        const modules = data.modules.length > 0
          ? ` with ${data.modules.length} module${data.modules.length > 1 ? 's' : ''}`
          : '';
        return `Assembly Machine (${data.machineType}): ${status}${modules}`;
      },
    },

    validate: (data): data is AssemblyMachineComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const m = data as any;

      return (
        m.type === 'assembly_machine' &&
        typeof m.machineType === 'string' &&
        typeof m.progress === 'number' &&
        typeof m.speed === 'number' &&
        typeof m.ingredientSlots === 'number' &&
        typeof m.moduleSlots === 'number' &&
        Array.isArray(m.modules)
      );
    },

    createDefault: () => ({
      type: 'assembly_machine',
      version: 1,
      machineType: 'assembler_mk1',
      currentRecipe: undefined,
      progress: 0,
      speed: 1.0,
      ingredientSlots: 4,
      moduleSlots: 0,
      modules: [],
    }),
  })
);
