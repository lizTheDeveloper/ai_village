import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { BeliefComponent } from '@ai-village/core';

/**
 * BeliefSchema - Introspection schema for BeliefComponent
 *
 * Tier 5: Cognitive components
 * Complexity: Large (belief formation from evidence tracking)
 */
export const BeliefSchema = autoRegister(
  defineComponent<BeliefComponent>({
    type: 'belief',
    version: 1,
    category: 'cognitive',

    fields: {
      allBeliefs: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Beliefs formed from observations (character, world, social)',
        visibility: {
          player: false,  // Too detailed
          llm: 'summarized',  // Summarize for context
          agent: true,  // Agents know their beliefs
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'beliefs',
          order: 1,
          icon: '💭',
        },
      },
    },

    ui: {
      icon: '💭',
      color: '#3F51B5',
      priority: 6,
    },

    llm: {
      promptSection: 'Beliefs',
      summarize: (data: BeliefComponent) => {
        const beliefs = data.allBeliefs;

        // Defensive: Handle missing or undefined allBeliefs
        if (!beliefs || beliefs.length === 0) {
          return 'No strong beliefs formed yet.';
        }

        // Group by type
        const character = beliefs.filter(b => b.type === 'character');
        const world = beliefs.filter(b => b.type === 'world');
        const social = beliefs.filter(b => b.type === 'social');

        const parts: string[] = [];

        if (character.length > 0) {
          const highConfidence = character
            .filter(b => b.confidence > 0.7)
            .map(b => b.description)
            .slice(0, 2);
          if (highConfidence.length > 0) {
            parts.push(`Believes: ${highConfidence.join('; ')}`);
          }
        }

        if (world.length > 0) {
          parts.push(`${world.length} world beliefs`);
        }

        if (social.length > 0) {
          parts.push(`${social.length} social beliefs`);
        }

        return parts.join('. ');
      },
    },

    validate: (data: unknown): data is BeliefComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return Array.isArray(comp.allBeliefs);
    },

    createDefault: () => ({
      type: 'belief',
      version: 1,
      allBeliefs: [],
      recordEvidence: () => {},
      getBeliefs: () => [],
      getBeliefAbout: () => undefined,
      clearBeliefs: () => {},
    } as unknown as BeliefComponent),
  })
);
