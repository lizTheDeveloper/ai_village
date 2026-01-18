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
      const f = data as Record<string, unknown>;

      // Check required primitive fields
      if (!('type' in f && f.type === 'factory_ai')) return false;
      if (!('version' in f && typeof f.version === 'number')) return false;
      if (!('name' in f && typeof f.name === 'string')) return false;
      if (!('goal' in f && typeof f.goal === 'string')) return false;
      if (!('targetProductionRate' in f && typeof f.targetProductionRate === 'number')) return false;
      if (!('allowExpansion' in f && typeof f.allowExpansion === 'boolean')) return false;
      if (!('allowLogisticsRequests' in f && typeof f.allowLogisticsRequests === 'boolean')) return false;
      if (!('health' in f && typeof f.health === 'string')) return false;
      if (!('lastDecisionTick' in f && typeof f.lastDecisionTick === 'number')) return false;
      if (!('decisionInterval' in f && typeof f.decisionInterval === 'number')) return false;
      if (!('minPowerEfficiency' in f && typeof f.minPowerEfficiency === 'number')) return false;
      if (!('minStockpileDays' in f && typeof f.minStockpileDays === 'number')) return false;
      if (!('maxOutputStorage' in f && typeof f.maxOutputStorage === 'number')) return false;
      if (!('intelligenceLevel' in f && typeof f.intelligenceLevel === 'number')) return false;

      // Check primaryOutputs array
      if (!('primaryOutputs' in f && Array.isArray(f.primaryOutputs))) return false;
      if (!f.primaryOutputs.every((item) => typeof item === 'string')) return false;

      // Check stats object
      if (!('stats' in f && typeof f.stats === 'object' && f.stats !== null)) return false;
      const stats = f.stats as Record<string, unknown>;
      if (!('totalMachines' in stats && typeof stats.totalMachines === 'number')) return false;
      if (!('activeMachines' in stats && typeof stats.activeMachines === 'number')) return false;
      if (!('idleMachines' in stats && typeof stats.idleMachines === 'number')) return false;
      if (!('totalInputsPerMinute' in stats && typeof stats.totalInputsPerMinute === 'number')) return false;
      if (!('totalOutputsPerMinute' in stats && typeof stats.totalOutputsPerMinute === 'number')) return false;
      if (!('efficiency' in stats && typeof stats.efficiency === 'number')) return false;
      if (!('powerGeneration' in stats && typeof stats.powerGeneration === 'number')) return false;
      if (!('powerConsumption' in stats && typeof stats.powerConsumption === 'number')) return false;
      if (!('powerEfficiency' in stats && typeof stats.powerEfficiency === 'number')) return false;
      if (!('beltUtilization' in stats && typeof stats.beltUtilization === 'number')) return false;
      if (!('logisticsBottlenecks' in stats && typeof stats.logisticsBottlenecks === 'number')) return false;
      if (!('inputStockpileDays' in stats && typeof stats.inputStockpileDays === 'number')) return false;
      if (!('outputStorageUtilization' in stats && typeof stats.outputStorageUtilization === 'number')) return false;

      // Check bottlenecks array
      if (!('bottlenecks' in f && Array.isArray(f.bottlenecks))) return false;
      for (const bottleneck of f.bottlenecks) {
        if (typeof bottleneck !== 'object' || bottleneck === null) return false;
        const b = bottleneck as Record<string, unknown>;
        if (!('type' in b && typeof b.type === 'string')) return false;
        if (!('severity' in b && typeof b.severity === 'number')) return false;
        if (!('location' in b && typeof b.location === 'string')) return false;
        if (!('suggestion' in b && typeof b.suggestion === 'string')) return false;
        if (!('detectedAt' in b && typeof b.detectedAt === 'number')) return false;
        // Optional affectedItem
        if ('affectedItem' in b && b.affectedItem !== undefined && typeof b.affectedItem !== 'string') return false;
      }

      // Check recentDecisions array
      if (!('recentDecisions' in f && Array.isArray(f.recentDecisions))) return false;
      for (const decision of f.recentDecisions) {
        if (typeof decision !== 'object' || decision === null) return false;
        const d = decision as Record<string, unknown>;
        if (!('timestamp' in d && typeof d.timestamp === 'number')) return false;
        if (!('action' in d && typeof d.action === 'string')) return false;
        if (!('reasoning' in d && typeof d.reasoning === 'string')) return false;
        if (!('parameters' in d && typeof d.parameters === 'object' && d.parameters !== null)) return false;
        if (!('expectedOutcome' in d && typeof d.expectedOutcome === 'string')) return false;
        if (!('priority' in d && typeof d.priority === 'number')) return false;
      }

      // Check resourceRequests array
      if (!('resourceRequests' in f && Array.isArray(f.resourceRequests))) return false;
      for (const request of f.resourceRequests) {
        if (typeof request !== 'object' || request === null) return false;
        const r = request as Record<string, unknown>;
        if (!('itemId' in r && typeof r.itemId === 'string')) return false;
        if (!('quantityNeeded' in r && typeof r.quantityNeeded === 'number')) return false;
        if (!('urgency' in r && typeof r.urgency === 'string')) return false;
        if (!('reason' in r && typeof r.reason === 'string')) return false;
        if (!('requestedAt' in r && typeof r.requestedAt === 'number')) return false;
        if (!('fulfilled' in r && typeof r.fulfilled === 'boolean')) return false;
      }

      return true;
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
