/**
 * Social Gradient Component Schema
 *
 * Stores directional resource hints from other agents.
 * Gradients are blended with trust weighting to create composite directions.
 *
 * Phase 4+, Tier 11 - Economic/Governance Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Social gradient component type
 */
export interface SocialGradientComponent extends Component {
  type: 'social_gradient';
  version: 1;

  gradients: Array<{
    id: string;
    resourceType: string;
    bearing: number;
    distance: number;
    confidence: number;
    sourceAgentId: string;
    tick: number;
    strength: number;
    claimPosition?: { x: number; y: number };
  }>;
}

/**
 * Social gradient component schema
 */
export const SocialGradientSchema = autoRegister(
  defineComponent<SocialGradientComponent>({
    type: 'social_gradient',
    version: 1,
    category: 'social',

    fields: {
      gradients: {
        type: 'array',
        required: true,
        default: [],
        description: 'Directional resource hints from other agents',
        displayName: 'Resource Gradients',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'navigation',
          order: 1,
          icon: '🧭',
        },
        mutable: true,
        itemType: 'object',
      },
    },

    ui: {
      icon: '🧭',
      color: '#FF6B6B',
      priority: 11,
    },

    llm: {
      promptSection: 'navigation',
      priority: 11,
      summarize: (data) => {
        if (!data.gradients || data.gradients.length === 0) {
          return 'No resource hints from other agents';
        }

        const resourceTypes = new Set(data.gradients.map(g => g.resourceType));
        const highConfidence = data.gradients.filter(g => g.confidence > 0.7).length;

        return `Has ${data.gradients.length} resource ${data.gradients.length === 1 ? 'hint' : 'hints'} (${resourceTypes.size} types, ${highConfidence} high confidence)`;
      },
    },

    validate: (data): data is SocialGradientComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const sg = data as any;

      return (
        sg.type === 'social_gradient' &&
        Array.isArray(sg.gradients)
      );
    },

    createDefault: () => ({
      type: 'social_gradient',
      version: 1,
      gradients: [],
    }),
  })
);
