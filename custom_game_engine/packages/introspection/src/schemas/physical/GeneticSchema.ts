import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { GeneticComponent } from '@ai-village/core';

/**
 * GeneticSchema - Introspection schema for GeneticComponent
 *
 * Tier: Physical/Biological
 * Complexity: Large (heredity, mutations, genetic modifications)
 */
export const GeneticSchema = autoRegister(
  defineComponent<GeneticComponent>({
    type: 'genetic',
    version: 1,
    category: 'physical',

    fields: {
      genome: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Genetic alleles (dominant/recessive traits)',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'genetics',
          order: 1,
          icon: '🧬',
        },
      },
      hereditaryModifications: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Hereditary body modifications (divine wings, etc.)',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'modifications',
          order: 1,
          icon: '🦋',
        },
      },
      mutationRate: {
        type: 'number',
        required: true,
        default: 0.01,
        description: 'Mutation rate for offspring (0-1)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'genetics',
          order: 2,
          icon: '🔬',
        },
      },
      geneticHealth: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Genetic health/diversity (0-1)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'health',
          order: 1,
          icon: '❤️',
        },
      },
      inbreedingCoefficient: {
        type: 'number',
        required: true,
        default: 0.0,
        description: 'Inbreeding coefficient (0-1, higher = more inbred)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'health',
          order: 2,
          icon: '⚠️',
        },
      },
      generation: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Generation number from first ancestor',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'lineage',
          order: 1,
          icon: '🌳',
        },
      },
    },

    ui: {
      icon: '🧬',
      color: '#4CAF50',
      priority: 6,
    },

    llm: {
      promptSection: 'Genetics',
      summarize: (data: GeneticComponent) => {
        const parts: string[] = [];

        if (data.generation > 0) {
          parts.push(`Generation ${data.generation}`);
        }

        if (data.hereditaryModifications.length > 0) {
          const mods = data.hereditaryModifications
            .map(m => m.type)
            .join(', ');
          parts.push(`Hereditary: ${mods}`);
        }

        if (data.genome.length > 0) {
          const expressed = data.genome
            .filter(a => a.expressedAllele !== 'recessive')
            .slice(0, 3)
            .map(a => `${a.traitId}: ${a.dominantAllele}`)
            .join(', ');
          if (expressed) {
            parts.push(`Traits: ${expressed}`);
          }
        }

        if (parts.length === 0) {
          return 'Default genetics';
        }

        return parts.join('; ');
      },
    },

    validate: (data: unknown): data is GeneticComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      if (!('type' in comp) || comp.type !== 'genetic') return false;
      if (!('genome' in comp) || !Array.isArray(comp.genome)) return false;
      if (!('hereditaryModifications' in comp) || !Array.isArray(comp.hereditaryModifications)) return false;
      if (!('mutationRate' in comp) || typeof comp.mutationRate !== 'number') return false;
      if (!('geneticHealth' in comp) || typeof comp.geneticHealth !== 'number') return false;
      if (!('inbreedingCoefficient' in comp) || typeof comp.inbreedingCoefficient !== 'number') return false;
      if (!('generation' in comp) || typeof comp.generation !== 'number') return false;

      return true;
    },

    createDefault: () => {
      const GeneticComponent = require('@ai-village/core').GeneticComponent;
      return new GeneticComponent() as GeneticComponent;
    },
  })
);
