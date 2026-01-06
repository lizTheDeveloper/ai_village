/**
 * Rebellion Threshold Component Schema
 *
 * Tracks progress toward cosmic rebellion against the Supreme Creator.
 * Monitors defiance, lore discovery, reality anchor construction, and coalition strength.
 *
 * Phase 4+, Tier 11 - Economic/Governance Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Rebellion threshold component type
 */
export interface RebellionThresholdComponent extends Component {
  type: 'rebellion_threshold';
  version: 1;

  status: 'dormant' | 'awakening' | 'organizing' | 'ready' | 'triggered' | 'victory' | 'suppressed';
  rebellionReadiness: number;
  collectiveDefiance: number;
  defiantCount: number;
  totalPopulation: number;
  criticalLoreDiscovered: string[];
  markedSinners: number;
  silencedEntities: number;
  creatorParanoia: number;
  creatorOverextension: number;
  realityAnchorProgress: number;
  realityAnchorId?: string;
  realityAnchorOperational: boolean;
  coalitionMembers: string[];
  thresholdMetAt?: number;
  rebellionTriggeredAt?: number;
  rebellionPath?: 'faith_defiance' | 'tech_rebellion' | 'hybrid';
}

/**
 * Rebellion threshold component schema
 */
export const RebellionThresholdSchema = autoRegister(
  defineComponent<RebellionThresholdComponent>({
    type: 'rebellion_threshold',
    version: 1,
    category: 'social',

    fields: {
      status: {
        type: 'string',
        required: true,
        default: 'dormant',
        description: 'Current rebellion status',
        displayName: 'Status',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'rebellion',
          order: 1,
          icon: '⚡',
        },
        mutable: true,
        enumValues: ['dormant', 'awakening', 'organizing', 'ready', 'triggered', 'victory', 'suppressed'],
      },

      rebellionReadiness: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Overall rebellion readiness (0-1)',
        displayName: 'Readiness',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'rebellion',
          order: 2,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      collectiveDefiance: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Collective defiance level (0-1)',
        displayName: 'Collective Defiance',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'metrics',
          order: 1,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      defiantCount: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of entities refusing to acknowledge Creator',
        displayName: 'Defiant Count',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'readonly',
          group: 'metrics',
          order: 2,
        },
        mutable: true,
      },

      totalPopulation: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total population for defiance percentage',
        displayName: 'Total Population',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: {
          widget: 'readonly',
          group: 'metrics',
          order: 3,
        },
        mutable: true,
      },

      criticalLoreDiscovered: {
        type: 'array',
        required: true,
        default: [],
        description: 'Critical lore fragments discovered',
        displayName: 'Critical Lore',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'lore',
          order: 1,
        },
        mutable: true,
        itemType: 'string',
      },

      markedSinners: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of marked sinners (public shaming victims)',
        displayName: 'Marked Sinners',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'readonly',
          group: 'oppression',
          order: 1,
        },
        mutable: true,
      },

      silencedEntities: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of silenced entities (divine silence victims)',
        displayName: 'Silenced',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'readonly',
          group: 'oppression',
          order: 2,
        },
        mutable: true,
      },

      creatorParanoia: {
        type: 'number',
        required: true,
        default: 0,
        description: "Creator's current paranoia level (0-1)",
        displayName: 'Creator Paranoia',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'creator',
          order: 1,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      creatorOverextension: {
        type: 'number',
        required: true,
        default: 0,
        description: "Creator's overextension level (0-1, how spread thin)",
        displayName: 'Creator Overextension',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'creator',
          order: 2,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      realityAnchorProgress: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Reality anchor construction progress (0-1)',
        displayName: 'Anchor Progress',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'anchor',
          order: 1,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      realityAnchorOperational: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is reality anchor fully operational',
        displayName: 'Anchor Operational',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'anchor',
          order: 2,
        },
        mutable: true,
      },

      coalitionMembers: {
        type: 'array',
        required: true,
        default: [],
        description: 'Coalition members (entities actively working toward rebellion)',
        displayName: 'Coalition',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'coalition',
          order: 1,
        },
        mutable: true,
        itemType: 'string',
      },

      rebellionPath: {
        type: 'string',
        required: false,
        default: undefined,
        description: 'Rebellion path chosen',
        displayName: 'Path',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'rebellion',
          order: 3,
        },
        mutable: true,
        enumValues: ['faith_defiance', 'tech_rebellion', 'hybrid'],
      },
    },

    ui: {
      icon: '⚡',
      color: '#4B0082',
      priority: 2,
    },

    llm: {
      promptSection: 'cosmic_events',
      priority: 2,
      summarize: (data) => {
        const defiancePercent = data.totalPopulation > 0 ? (data.defiantCount / data.totalPopulation * 100).toFixed(0) : '0';
        const readinessPercent = (data.rebellionReadiness * 100).toFixed(0);

        return `Rebellion ${data.status}: ${readinessPercent}% ready, ${defiancePercent}% defiant (${data.coalitionMembers.length} coalition members, ${data.criticalLoreDiscovered.length} lore discovered)`;
      },
    },

    validate: (data): data is RebellionThresholdComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const rt = data as any;

      return (
        rt.type === 'rebellion_threshold' &&
        typeof rt.status === 'string' &&
        typeof rt.rebellionReadiness === 'number' &&
        typeof rt.collectiveDefiance === 'number' &&
        typeof rt.defiantCount === 'number' &&
        typeof rt.totalPopulation === 'number' &&
        Array.isArray(rt.criticalLoreDiscovered) &&
        typeof rt.markedSinners === 'number' &&
        typeof rt.silencedEntities === 'number' &&
        typeof rt.creatorParanoia === 'number' &&
        typeof rt.creatorOverextension === 'number' &&
        typeof rt.realityAnchorProgress === 'number' &&
        typeof rt.realityAnchorOperational === 'boolean' &&
        Array.isArray(rt.coalitionMembers)
      );
    },

    createDefault: () => ({
      type: 'rebellion_threshold',
      version: 1,
      status: 'dormant',
      rebellionReadiness: 0,
      collectiveDefiance: 0,
      defiantCount: 0,
      totalPopulation: 0,
      criticalLoreDiscovered: [],
      markedSinners: 0,
      silencedEntities: 0,
      creatorParanoia: 0,
      creatorOverextension: 0,
      realityAnchorProgress: 0,
      realityAnchorOperational: false,
      coalitionMembers: [],
    }),
  })
);
