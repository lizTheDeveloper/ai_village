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
      const x = data as Record<string, unknown>;

      // Validate type field
      if (!('type' in x) || x.type !== 'social_gradient') return false;

      // Validate gradients array
      if (!('gradients' in x) || !Array.isArray(x.gradients)) return false;

      // Validate each gradient object
      for (const gradient of x.gradients) {
        if (typeof gradient !== 'object' || gradient === null) return false;
        const g = gradient as Record<string, unknown>;

        // Required fields
        if (!('id' in g) || typeof g.id !== 'string') return false;
        if (!('resourceType' in g) || typeof g.resourceType !== 'string') return false;
        if (!('bearing' in g) || typeof g.bearing !== 'number') return false;
        if (!('distance' in g) || typeof g.distance !== 'number') return false;
        if (!('confidence' in g) || typeof g.confidence !== 'number') return false;
        if (!('sourceAgentId' in g) || typeof g.sourceAgentId !== 'string') return false;
        if (!('tick' in g) || typeof g.tick !== 'number') return false;
        if (!('strength' in g) || typeof g.strength !== 'number') return false;

        // Optional claimPosition field
        if ('claimPosition' in g && g.claimPosition !== undefined) {
          if (typeof g.claimPosition !== 'object' || g.claimPosition === null) return false;
          const pos = g.claimPosition as Record<string, unknown>;
          if (!('x' in pos) || typeof pos.x !== 'number') return false;
          if (!('y' in pos) || typeof pos.y !== 'number') return false;
        }
      }

      return true;
    },

    createDefault: () => ({
      type: 'social_gradient',
      version: 1,
      gradients: [],
    }),
  })
);
