import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Body Plan Registry Component
 *
 * Singleton component that tracks all body plans (templates for alien/creature bodies).
 * Includes both predefined plans and AI-generated alien plans.
 */
export interface BodyPlanRegistryComponent extends Component {
  type: 'body_plan_registry';
  version: 1;

  /** Predefined static body plans (humanoid, insectoid, avian, etc.) */
  staticPlans: string[];

  /** AI-generated alien body plans */
  generatedPlans: Array<{
    id: string;
    name: string;
    baseType: string;
    symmetry: 'bilateral' | 'radial' | 'asymmetric' | 'none';
    generationPrompt?: string;
    generatedBy?: 'alien_generator' | 'mutation' | 'evolution' | 'player_design';
    generatedAt: number;
    tags: string[];
  }>;

  /** Registry of all available plans (static + generated) */
  allPlanIds: string[];

  /** Track which species use which plans */
  planUsage: Record<string, string[]>; // planId -> [speciesId, speciesId, ...]

  /** Experimental/unstable plans (not yet validated) */
  experimentalPlans: string[];

  /** Failed generation attempts (for debugging/recovery) */
  failedGenerations: Array<{
    prompt: string;
    error: string;
    timestamp: number;
    preservedData?: any;
  }>;
}

export const BodyPlanRegistrySchema = autoRegister(
  defineComponent<BodyPlanRegistryComponent>({
    type: 'body_plan_registry',
    version: 1,
    category: 'system',
    description: 'Singleton registry tracking all body plan templates (static and AI-generated aliens)',

    fields: {
      staticPlans: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'IDs of predefined static body plans',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'registry',
          order: 1,
        },
      },

      generatedPlans: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'AI-generated alien body plans with metadata',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'generated',
          order: 2,
        },
      },

      allPlanIds: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Complete list of all available body plan IDs',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'registry',
          order: 3,
        },
      },

      planUsage: {
        type: 'object',
        required: true,
        default: {},
        description: 'Mapping of body plan IDs to species that use them',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'analytics',
          order: 4,
        },
      },

      experimentalPlans: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Experimental/unstable plans not yet validated',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'experimental',
          order: 5,
        },
      },

      failedGenerations: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Failed alien generation attempts (preserved for debugging)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'debugging',
          order: 6,
        },
      },
    },

    ui: {
      icon: '🧬',
      color: '#00CED1',
      priority: 7,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Body Plan Registry',
      summarize: (data: BodyPlanRegistryComponent) => {
        const staticCount = data.staticPlans.length;
        const generatedCount = data.generatedPlans.length;
        const total = data.allPlanIds.length;

        if (total === 0) return 'No body plans available.';

        const summary = [
          `${total} body plans available (${staticCount} static, ${generatedCount} generated)`,
        ];

        if (generatedCount > 0) {
          const recentGen = data.generatedPlans
            .sort((a, b) => b.generatedAt - a.generatedAt)
            .slice(0, 3)
            .map(p => p.name);
          summary.push(`Recent aliens: ${recentGen.join(', ')}`);
        }

        if (data.experimentalPlans.length > 0) {
          summary.push(`${data.experimentalPlans.length} experimental plans`);
        }

        return summary.join('. ');
      },
    },

    createDefault: (): BodyPlanRegistryComponent => ({
      type: 'body_plan_registry',
      version: 1,
      staticPlans: [
        'humanoid_standard',
        'insectoid_4arm',
        'insectoid_6leg',
        'avian_winged',
        'aquatic_tentacled',
        'aquatic_finned',
        'celestial_winged',
        'demonic_horned',
        'reptilian_standard',
      ],
      generatedPlans: [],
      allPlanIds: [
        'humanoid_standard',
        'insectoid_4arm',
        'insectoid_6leg',
        'avian_winged',
        'aquatic_tentacled',
        'aquatic_finned',
        'celestial_winged',
        'demonic_horned',
        'reptilian_standard',
      ],
      planUsage: {},
      experimentalPlans: [],
      failedGenerations: [],
    }),
  })
);
