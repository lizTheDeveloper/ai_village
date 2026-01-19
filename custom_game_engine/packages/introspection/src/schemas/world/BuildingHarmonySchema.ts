/**
 * Building Harmony Component Schema
 *
 * Stores Feng Shui analysis results for buildings.
 * Contains harmony score and detailed breakdown of spatial factors.
 *
 * Phase 4+, Tier 12 - Buildings/Infrastructure Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Building harmony component type
 */
export interface BuildingHarmonyComponent extends Component {
  type: 'building_harmony';
  version: 1;

  harmonyScore: number;
  harmonyLevel: 'discordant' | 'disharmonious' | 'neutral' | 'harmonious' | 'sublime';
  chiFlow: {
    hasGoodFlow: boolean;
    stagnantAreas: Array<{ x: number; y: number }>;
    hasShaQi: boolean;
    shaQiLines?: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }>;
  };
  proportions: {
    areBalanced: boolean;
    unbalancedRooms: string[];
    bestProportionedRoom?: string;
  };
  commandingPositions: {
    wellPlaced: boolean;
    violations: Array<{
      furniture: string;
      issue: string;
      location: { x: number; y: number };
    }>;
  };
  elementBalance: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  deficientElement?: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  excessiveElement?: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  issues: Array<{
    principle: 'chi_flow' | 'proportions' | 'commanding_position' | 'element_balance' | 'sha_qi';
    issue: string;
    suggestion: string;
    location?: { x: number; y: number };
  }>;
  lastAnalyzedTick: number;
  wasOptimized: boolean;
  analyzedBy?: string;
}

/**
 * Building harmony component schema
 */
export const BuildingHarmonySchema = autoRegister(
  defineComponent<BuildingHarmonyComponent>({
    type: 'building_harmony',
    version: 1,
    category: 'world',

    fields: {
      harmonyScore: {
        type: 'number',
        required: true,
        default: 50,
        description: 'Overall harmony score (0-100)',
        displayName: 'Harmony Score',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'harmony',
          order: 1,
          icon: '☯️',
        },
        mutable: true,
        min: 0,
        max: 100,
      },

      harmonyLevel: {
        type: 'string',
        required: true,
        default: 'neutral',
        description: 'Harmony level category',
        displayName: 'Harmony Level',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'harmony',
          order: 2,
        },
        mutable: true,
        enumValues: ['discordant', 'disharmonious', 'neutral', 'harmonious', 'sublime'],
      },

      chiFlow: {
        type: 'object',
        required: true,
        default: {
          hasGoodFlow: true,
          stagnantAreas: [],
          hasShaQi: false,
        },
        description: 'Chi flow analysis',
        displayName: 'Chi Flow',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'analysis',
          order: 1,
        },
        mutable: true,
      },

      proportions: {
        type: 'object',
        required: true,
        default: {
          areBalanced: true,
          unbalancedRooms: [],
        },
        description: 'Room proportion analysis',
        displayName: 'Proportions',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'analysis',
          order: 2,
        },
        mutable: true,
      },

      commandingPositions: {
        type: 'object',
        required: true,
        default: {
          wellPlaced: true,
          violations: [],
        },
        description: 'Furniture commanding position analysis',
        displayName: 'Commanding Positions',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'analysis',
          order: 3,
        },
        mutable: true,
      },

      elementBalance: {
        type: 'object',
        required: true,
        default: {
          wood: 20,
          fire: 20,
          earth: 20,
          metal: 20,
          water: 20,
        },
        description: 'Five element balance counts',
        displayName: 'Element Balance',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'elements',
          order: 1,
          icon: '🌿',
        },
        mutable: true,
      },

      deficientElement: {
        type: 'string',
        required: false,
        default: undefined,
        description: 'Most deficient element',
        displayName: 'Deficient Element',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'elements',
          order: 2,
        },
        mutable: true,
        enumValues: ['wood', 'fire', 'earth', 'metal', 'water'],
      },

      excessiveElement: {
        type: 'string',
        required: false,
        default: undefined,
        description: 'Most excessive element',
        displayName: 'Excessive Element',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'elements',
          order: 3,
        },
        mutable: true,
        enumValues: ['wood', 'fire', 'earth', 'metal', 'water'],
      },

      issues: {
        type: 'array',
        required: true,
        default: [],
        description: 'Specific issues found',
        displayName: 'Issues',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'issues',
          order: 1,
        },
        mutable: true,
        itemType: 'object',
      },

      lastAnalyzedTick: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Game tick when last analyzed',
        displayName: 'Last Analyzed',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 1,
        },
        mutable: true,
      },

      wasOptimized: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether this building has been optimized by an architect',
        displayName: 'Optimized',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'metadata',
          order: 2,
        },
        mutable: true,
      },

      analyzedBy: {
        type: 'string',
        required: false,
        default: undefined,
        description: 'Entity ID of architect who analyzed/optimized',
        displayName: 'Analyzed By',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: {
          widget: 'text',
          group: 'metadata',
          order: 3,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '☯️',
      color: '#8B4513',
      priority: 12,
    },

    llm: {
      promptSection: 'buildings',
      priority: 12,
      summarize: (data) => {
        const issueCount = data.issues.length;
        const elements = [data.deficientElement, data.excessiveElement].filter(Boolean);

        return `${data.harmonyLevel} (${data.harmonyScore}/100)${issueCount > 0 ? `, ${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}` : ''}${elements.length > 0 ? `, imbalanced: ${elements.join(', ')}` : ''}`;
      },
    },

    validate: (data): data is BuildingHarmonyComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const bh = data as Record<string, unknown>;

      return (
        bh.type === 'building_harmony' &&
        typeof bh.harmonyScore === 'number' &&
        typeof bh.harmonyLevel === 'string' &&
        typeof bh.chiFlow === 'object' &&
        typeof bh.proportions === 'object' &&
        typeof bh.commandingPositions === 'object' &&
        typeof bh.elementBalance === 'object' &&
        Array.isArray(bh.issues) &&
        typeof bh.lastAnalyzedTick === 'number' &&
        typeof bh.wasOptimized === 'boolean'
      );
    },

    createDefault: () => ({
      type: 'building_harmony',
      version: 1,
      harmonyScore: 50,
      harmonyLevel: 'neutral',
      chiFlow: {
        hasGoodFlow: true,
        stagnantAreas: [],
        hasShaQi: false,
      },
      proportions: {
        areBalanced: true,
        unbalancedRooms: [],
      },
      commandingPositions: {
        wellPlaced: true,
        violations: [],
      },
      elementBalance: {
        wood: 20,
        fire: 20,
        earth: 20,
        metal: 20,
        water: 20,
      },
      issues: [],
      lastAnalyzedTick: 0,
      wasOptimized: false,
    }),
  })
);
