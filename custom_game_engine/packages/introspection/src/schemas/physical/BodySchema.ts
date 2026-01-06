import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { BodyComponent } from '@ai-village/core';

/**
 * BodySchema - Introspection schema for BodyComponent
 *
 * Tier: Physical
 * Complexity: Large (extensible body parts, injuries, modifications)
 */
export const BodySchema = autoRegister(
  defineComponent<BodyComponent>({
    type: 'body',
    version: 1,
    category: 'physical',

    fields: {
      bodyPlanId: {
        type: 'string',
        required: true,
        description: 'Body plan ID (humanoid_standard, insectoid_4arm, etc.)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'anatomy',
          order: 1,
          icon: '🧬',
        },
      },
      parts: {
        type: 'object',
        required: true,
        default: {},
        description: 'Body parts (ID -> BodyPart)',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'anatomy',
          order: 2,
          icon: '🦴',
        },
      },
      overallHealth: {
        type: 'number',
        required: true,
        default: 100,
        description: 'Overall health aggregate (0-100)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'health',
          order: 1,
          icon: '❤️',
        },
      },
      totalPain: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total pain from all injuries (0-100)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'health',
          order: 2,
          icon: '🤕',
        },
      },
      bloodLoss: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Blood loss (0-100)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'health',
          order: 3,
          icon: '🩸',
        },
      },
      consciousness: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Awake or unconscious',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 1,
          icon: '👁️',
        },
      },
      size: {
        type: 'string',
        required: true,
        description: 'Size category (tiny, small, medium, large, huge, colossal)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'physical',
          order: 1,
          icon: '📏',
        },
      },
      modifications: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Global body modifications (magic, genetic, cybernetic)',
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
          icon: '🔬',
        },
      },
    },

    ui: {
      icon: '🦴',
      color: '#FF5722',
      priority: 7,
    },

    llm: {
      promptSection: 'Body',
      summarize: (data: BodyComponent) => {
        const parts: string[] = [];

        parts.push(`${Math.floor(data.overallHealth)}% health`);

        if (data.totalPain > 20) {
          parts.push(`${Math.floor(data.totalPain)} pain`);
        }

        if (data.bloodLoss > 10) {
          parts.push(`${Math.floor(data.bloodLoss)}% blood loss`);
        }

        if (!data.consciousness) {
          parts.push('unconscious');
        }

        const partCount = Object.keys(data.parts).length;
        parts.push(`${partCount} body parts`);

        if (data.modifications.length > 0) {
          const modTypes = data.modifications
            .map(m => m.name)
            .slice(0, 2)
            .join(', ');
          parts.push(`modified: ${modTypes}`);
        }

        return parts.join(', ');
      },
    },

    validate: (data: unknown): data is BodyComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        typeof comp.bodyPlanId === 'string' &&
        typeof comp.parts === 'object' &&
        typeof comp.overallHealth === 'number' &&
        typeof comp.totalPain === 'number' &&
        typeof comp.consciousness === 'boolean' &&
        Array.isArray(comp.modifications)
      );
    },

    createDefault: () => ({
      type: 'body',
      version: 1,
      bodyPlanId: 'humanoid_standard',
      parts: {},
      overallHealth: 100,
      totalPain: 0,
      bloodLoss: 0,
      consciousness: true,
      size: 'medium',
      modifications: [],
    } as BodyComponent),
  })
);
