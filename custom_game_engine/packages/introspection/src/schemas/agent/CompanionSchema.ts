import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';

// Import type from component file directly since not exported from package
type CompanionComponent = any; // Will be typed at runtime

/**
 * CompanionSchema - Introspection schema for CompanionComponent
 *
 * Tier: Agent (Special - Ophanim companion)
 * Complexity: Large (evolution, emotions, memories, needs)
 */
export const CompanionSchema = autoRegister(
  defineComponent<CompanionComponent>({
    type: 'companion',
    version: 1,
    category: 'agent',

    fields: {
      evolutionTier: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Companion evolution tier (0-5)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'evolution',
          order: 1,
          icon: '⭐',
        },
      },
      currentEmotion: {
        type: 'string',
        required: true,
        default: 'alert',
        description: 'Current emotional state (sprite key)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'emotion',
          order: 1,
          icon: '😊',
        },
      },
      trustScore: {
        type: 'number',
        required: true,
        default: 0.0,
        description: 'Trust with player (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'relationship',
          order: 1,
          icon: '🤝',
        },
      },
      needs: {
        type: 'object',
        required: true,
        default: {},
        description: 'Companion needs (connection, purpose, rest, etc.)',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'needs',
          order: 1,
          icon: '💚',
        },
      },
      playerMemories: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Memories about player actions and preferences',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'memory',
          order: 1,
          icon: '💭',
        },
      },
      companionMemories: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: "Companion's self-memories",
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'memory',
          order: 2,
          icon: '🧠',
        },
      },
      sessionCount: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of play sessions',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'stats',
          order: 1,
          icon: '🎮',
        },
      },
      positiveInteractions: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Count of positive interactions',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'stats',
          order: 2,
          icon: '✨',
        },
      },
    },

    ui: {
      icon: '👁️',
      color: '#9C27B0',
      priority: 9,
    },

    llm: {
      promptSection: 'Companion',
      summarize: (data: CompanionComponent) => {
        const parts: string[] = [];

        parts.push(`Tier ${data.evolutionTier}`);
        parts.push(`feeling ${data.currentEmotion}`);
        parts.push(`trust ${Math.floor(data.trustScore * 100)}%`);

        // Summarize needs
        const lowNeeds = Object.entries(data.needs)
          .filter(([_, value]) => typeof value === 'number' && value < 0.3)
          .map(([key, _]) => key);

        if (lowNeeds.length > 0) {
          parts.push(`needs: ${lowNeeds.join(', ')}`);
        }

        return parts.join(', ');
      },
    },

    validate: (data: unknown): data is CompanionComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        typeof comp.evolutionTier === 'number' &&
        typeof comp.currentEmotion === 'string' &&
        typeof comp.trustScore === 'number' &&
        typeof comp.needs === 'object' &&
        Array.isArray(comp.playerMemories) &&
        Array.isArray(comp.companionMemories)
      );
    },

    createDefault: () => {
      const CompanionComponent = require('@ai-village/core').CompanionComponent;
      return new CompanionComponent() as CompanionComponent;
    },
  })
);
