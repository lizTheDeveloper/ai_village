/**
 * ChunkProductionState Component Schema
 *
 * Tracks production state for off-screen chunks.
 * Performance optimization to avoid simulating every tick.
 * Tier 15: Automation/Manufacturing.
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Chunk production state component type
 */
export interface ChunkProductionStateComponent extends Component {
  type: 'chunk_production_state';
  version: 1;

  lastSimulatedTick: number;
  productionRates: Array<{
    itemId: string;
    ratePerHour: number;
    inputRequirements: Array<{
      itemId: string;
      ratePerHour: number;
    }>;
    powerRequired: number;
  }>;
  totalPowerGeneration: number;
  totalPowerConsumption: number;
  isPowered: boolean;
  inputStockpiles: Map<string, number>;
  outputBuffers: Map<string, number>;
  isOnScreen: boolean;
}

/**
 * Chunk production state component schema
 */
export const ChunkProductionStateSchema = autoRegister(
  defineComponent<ChunkProductionStateComponent>({
    type: 'chunk_production_state',
    version: 1,
    category: 'world',
    description: 'Tracks production state for off-screen chunks',

    fields: {
      lastSimulatedTick: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Last tick this chunk was fully simulated',
        displayName: 'Last Simulated Tick',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'readonly', group: 'simulation', order: 1 },
        mutable: true,
      },

      productionRates: {
        type: 'array',
        required: true,
        default: [],
        description: 'Production rates for all factories in this chunk',
        displayName: 'Production Rates',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'production', order: 1 },
        mutable: true,
        itemType: 'object',
      },

      totalPowerGeneration: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total power generation in this chunk (kW)',
        displayName: 'Power Generation',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'power', order: 1, icon: '⚡' },
        mutable: true,
      },

      totalPowerConsumption: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total power consumption in this chunk (kW)',
        displayName: 'Power Consumption',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'power', order: 2 },
        mutable: true,
      },

      isPowered: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Is power sufficient for full production?',
        displayName: 'Powered',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'power', order: 3 },
        mutable: true,
      },

      isOnScreen: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Is this chunk currently on-screen?',
        displayName: 'On Screen',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'checkbox', group: 'simulation', order: 2 },
        mutable: true,
      },
    },

    ui: {
      icon: '🗺️',
      color: '#8B4513',
      priority: 3,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'environment',
      priority: 2,
      summarize: (data) => {
        if (!data.isPowered) {
          return 'Chunk (UNPOWERED - production halted)';
        }
        const itemCount = data.productionRates.length;
        return itemCount > 0 ? `Chunk producing ${itemCount} items` : '';
      },
    },

    validate: (data): data is ChunkProductionStateComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const c = data as any;

      return (
        c.type === 'chunk_production_state' &&
        typeof c.lastSimulatedTick === 'number' &&
        Array.isArray(c.productionRates) &&
        typeof c.totalPowerGeneration === 'number' &&
        typeof c.totalPowerConsumption === 'number' &&
        typeof c.isPowered === 'boolean'
      );
    },

    createDefault: () => ({
      type: 'chunk_production_state',
      version: 1,
      lastSimulatedTick: 0,
      productionRates: [],
      totalPowerGeneration: 0,
      totalPowerConsumption: 0,
      isPowered: true,
      inputStockpiles: new Map(),
      outputBuffers: new Map(),
      isOnScreen: true,
    }),
  })
);
