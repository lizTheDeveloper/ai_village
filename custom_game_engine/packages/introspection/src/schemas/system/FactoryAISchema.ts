/**
 * FactoryAI Component Schema
 *
 * Autonomous AI that manages factory cities to keep production running.
 * Tier 15: Automation/Manufacturing.
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Factory AI component type
 */
export interface FactoryAIComponent extends Component {
  type: 'factory_ai';
  version: 1;

  name: string;
  primaryOutputs: string[];
  goal: 'maximize_output' | 'efficiency' | 'stockpile' | 'research' | 'emergency' | 'shutdown';
  targetProductionRate: number;
  allowExpansion: boolean;
  allowLogisticsRequests: boolean;
  health: 'optimal' | 'good' | 'degraded' | 'critical' | 'offline';
  lastDecisionTick: number;
  decisionInterval: number;
  stats: {
    totalMachines: number;
    activeMachines: number;
    idleMachines: number;
    totalInputsPerMinute: number;
    totalOutputsPerMinute: number;
    efficiency: number;
    powerGeneration: number;
    powerConsumption: number;
    powerEfficiency: number;
    beltUtilization: number;
    logisticsBottlenecks: number;
    inputStockpileDays: number;
    outputStorageUtilization: number;
  };
  bottlenecks: Array<{
    type: 'power' | 'input' | 'output' | 'machine' | 'transport';
    severity: number;
    affectedItem?: string;
    location: string;
    suggestion: string;
    detectedAt: number;
  }>;
  recentDecisions: Array<{
    timestamp: number;
    action: string;
    reasoning: string;
    parameters: Record<string, any>;
    expectedOutcome: string;
    priority: number;
  }>;
  resourceRequests: Array<{
    itemId: string;
    quantityNeeded: number;
    urgency: 'low' | 'normal' | 'high' | 'critical';
    reason: string;
    requestedAt: number;
    fulfilled: boolean;
  }>;
  minPowerEfficiency: number;
  minStockpileDays: number;
  maxOutputStorage: number;
  intelligenceLevel: number;
}

/**
 * Factory AI component schema
 */
export const FactoryAISchema = autoRegister(
  defineComponent<FactoryAIComponent>({
    type: 'factory_ai',
    version: 1,
    category: 'system',
    description: 'Autonomous AI for managing factory production',

    fields: {
      name: {
        type: 'string',
        required: true,
        default: 'Factory AI',
        description: 'Factory name',
        displayName: 'Factory Name',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'identity', order: 1, icon: '🏭' },
        mutable: true,
      },

      primaryOutputs: {
        type: 'array',
        required: true,
        default: [],
        description: 'What this factory produces',
        displayName: 'Primary Outputs',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'identity', order: 2 },
        mutable: true,
        itemType: 'string',
      },

      goal: {
        type: 'string',
        required: true,
        default: 'maximize_output',
        description: 'Current factory goal',
        displayName: 'Goal',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: { widget: 'dropdown', group: 'strategy', order: 1 },
        mutable: true,
      },

      health: {
        type: 'string',
        required: true,
        default: 'good',
        description: 'Overall factory health',
        displayName: 'Health Status',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'status', order: 1, icon: '❤️' },
        mutable: true,
      },

      stats: {
        type: 'object',
        required: true,
        default: {
          totalMachines: 0,
          activeMachines: 0,
          idleMachines: 0,
          totalInputsPerMinute: 0,
          totalOutputsPerMinute: 0,
          efficiency: 1.0,
          powerGeneration: 0,
          powerConsumption: 0,
          powerEfficiency: 1.0,
          beltUtilization: 0,
          logisticsBottlenecks: 0,
          inputStockpileDays: 7,
          outputStorageUtilization: 0,
        },
        description: 'Factory statistics',
        displayName: 'Statistics',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'metrics', order: 1 },
        mutable: true,
      },

      bottlenecks: {
        type: 'array',
        required: true,
        default: [],
        description: 'Detected bottlenecks',
        displayName: 'Bottlenecks',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'monitoring', order: 1, icon: '⚠️' },
        mutable: true,
        itemType: 'object',
      },

      recentDecisions: {
        type: 'array',
        required: true,
        default: [],
        description: 'Recent AI decisions',
        displayName: 'Recent Decisions',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'monitoring', order: 2 },
        mutable: true,
        itemType: 'object',
      },

      intelligenceLevel: {
        type: 'number',
        required: true,
        default: 5,
        description: 'AI intelligence level (1-10, affects decision quality)',
        displayName: 'Intelligence Level',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'config', order: 1, min: 1, max: 10, step: 1 },
        mutable: true,
      },
    },

    ui: {
      icon: '🤖',
      color: '#4682B4',
      priority: 7,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'environment',
      priority: 6,
      summarize: (data) => {
        const healthIcons = {
          optimal: '✓',
          good: '◐',
          degraded: '⚠',
          critical: '✗',
          offline: '⊗',
        };
        const icon = healthIcons[data.health];
        const eff = (data.stats.efficiency * 100).toFixed(0);
        const bottleneckStr = data.bottlenecks.length > 0 ? ` (${data.bottlenecks.length} bottlenecks)` : '';
        return `Factory AI "${data.name}" [${data.goal}]: ${icon} ${eff}% efficient${bottleneckStr}`;
      },
    },

    validate: (data): data is FactoryAIComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const f = data as any;

      return (
        f.type === 'factory_ai' &&
        typeof f.name === 'string' &&
        Array.isArray(f.primaryOutputs) &&
        typeof f.health === 'string' &&
        typeof f.stats === 'object'
      );
    },

    createDefault: () => ({
      type: 'factory_ai',
      version: 1,
      name: 'Factory AI',
      primaryOutputs: [],
      goal: 'maximize_output',
      targetProductionRate: 100,
      allowExpansion: false,
      allowLogisticsRequests: true,
      health: 'good',
      lastDecisionTick: 0,
      decisionInterval: 100,
      stats: {
        totalMachines: 0,
        activeMachines: 0,
        idleMachines: 0,
        totalInputsPerMinute: 0,
        totalOutputsPerMinute: 0,
        efficiency: 1.0,
        powerGeneration: 0,
        powerConsumption: 0,
        powerEfficiency: 1.0,
        beltUtilization: 0,
        logisticsBottlenecks: 0,
        inputStockpileDays: 7,
        outputStorageUtilization: 0,
      },
      bottlenecks: [],
      recentDecisions: [],
      resourceRequests: [],
      minPowerEfficiency: 0.8,
      minStockpileDays: 2,
      maxOutputStorage: 0.9,
      intelligenceLevel: 5,
    }),
  })
);
