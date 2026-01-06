import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';

// Import type from component file directly since not exported from package
type BiographyComponent = any; // Will be typed at runtime

/**
 * BiographySchema - Introspection schema for BiographyComponent
 *
 * Tier: Agent (Career/Achievement system)
 * Complexity: Medium (documented achievements, career blueprints)
 */
export const BiographySchema = autoRegister(
  defineComponent<BiographyComponent>({
    type: 'biography',
    version: 1,
    category: 'agent',

    fields: {
      title: {
        type: 'string',
        required: true,
        description: 'Biography book title',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
          icon: '📖',
        },
      },
      subjectName: {
        type: 'string',
        required: true,
        description: "Subject's name",
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 2,
          icon: '👤',
        },
      },
      field: {
        type: 'string',
        required: true,
        description: 'Primary career field',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'career',
          order: 1,
          icon: '💼',
        },
      },
      peakSkill: {
        type: 'number',
        required: true,
        description: 'Peak skill level achieved',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'career',
          order: 2,
          icon: '⭐',
        },
      },
      achievements: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Major achievements documented',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'achievements',
          order: 1,
          icon: '🏆',
        },
      },
      readersCount: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of agents who have read this biography',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'publication',
          order: 1,
          icon: '📚',
        },
      },
      inspirationBonus: {
        type: 'number',
        required: true,
        default: 1.5,
        description: 'Inspiration multiplier for readers',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'effects',
          order: 1,
          icon: '✨',
        },
      },
      careerPath: {
        type: 'object',
        required: true,
        description: 'Career blueprint with milestones',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'career',
          order: 3,
          icon: '🗺️',
        },
      },
      summary: {
        type: 'string',
        required: true,
        default: '',
        description: 'Life story summary',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'content',
          order: 1,
          icon: '📝',
        },
      },
    },

    ui: {
      icon: '📖',
      color: '#795548',
      priority: 5,
    },

    llm: {
      promptSection: 'Biography',
      summarize: (data: BiographyComponent) => {
        const parts: string[] = [];

        parts.push(`"${data.title}"`);
        parts.push(`about ${data.subjectName}`);
        parts.push(`${data.field} specialist (skill ${data.peakSkill})`);

        if (data.achievements.length > 0) {
          parts.push(`${data.achievements.length} achievements`);
        }

        if (data.readersCount > 0) {
          parts.push(`read by ${data.readersCount} agents`);
        }

        return parts.join(', ');
      },
    },

    validate: (data: unknown): data is BiographyComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        typeof comp.title === 'string' &&
        typeof comp.subjectName === 'string' &&
        typeof comp.field === 'string' &&
        typeof comp.peakSkill === 'number' &&
        Array.isArray(comp.achievements) &&
        typeof comp.careerPath === 'object'
      );
    },

    createDefault: () => {
      const { createBiographyComponent } = require('@ai-village/core');
      return createBiographyComponent(
        'bio_001',
        'Untitled Biography',
        'subject_001',
        'Unknown Subject',
        'agriculture',
        0,
        'author_001',
        'publisher_001',
        0
      ) as BiographyComponent;
    },
  })
);
