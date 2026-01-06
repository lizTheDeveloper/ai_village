import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SemanticMemoryComponent } from '@ai-village/core';

/**
 * SemanticMemorySchema - Introspection schema for SemanticMemoryComponent
 *
 * Tier: Cognitive
 * Complexity: Medium (knowledge, beliefs, facts, opinions)
 */
export const SemanticMemorySchema = autoRegister(
  defineComponent<SemanticMemoryComponent>({
    type: 'semantic_memory',
    version: 1,
    category: 'cognitive',

    fields: {
      beliefs: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Beliefs formed from evidence',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'beliefs',
          order: 1,
          icon: '💡',
        },
      },
      knowledge: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Procedural and factual knowledge',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'knowledge',
          order: 1,
          icon: '🧠',
        },
      },
    },

    ui: {
      icon: '🧠',
      color: '#9C27B0',
      priority: 6,
    },

    llm: {
      promptSection: 'Knowledge & Beliefs',
      summarize: (data: SemanticMemoryComponent) => {
        const parts: string[] = [];

        if (data.beliefs.length > 0) {
          const highConfidence = data.beliefs
            .filter(b => b.confidence > 0.7)
            .slice(0, 3);

          if (highConfidence.length > 0) {
            const beliefStr = highConfidence
              .map(b => `${b.category}: ${b.content}`)
              .join('; ');
            parts.push(`Beliefs: ${beliefStr}`);
          } else {
            parts.push(`${data.beliefs.length} beliefs (low confidence)`);
          }
        }

        if (data.knowledge.length > 0) {
          const procedural = data.knowledge.filter(k => k.type === 'procedural').length;
          const factual = data.knowledge.filter(k => k.type === 'factual').length;
          parts.push(`Knowledge: ${procedural} procedural, ${factual} factual`);
        }

        if (parts.length === 0) {
          return 'No significant knowledge or beliefs yet.';
        }

        return parts.join('. ');
      },
    },

    validate: (data: unknown): data is SemanticMemoryComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        Array.isArray(comp.beliefs) &&
        Array.isArray(comp.knowledge)
      );
    },

    createDefault: () => {
      const SemanticMemoryComponent = require('@ai-village/core').SemanticMemoryComponent;
      return new SemanticMemoryComponent() as SemanticMemoryComponent;
    },
  })
);
