import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';

/**
 * CurrentLifeMemorySchema - Placeholder schema for current life memories
 *
 * Batch 5: Soul & Realms
 * Category: Cognitive/Memory
 *
 * Note: This is used to distinguish between current-life memories
 * and past-life/afterlife memories in the reincarnation system.
 * The actual memory data is stored in other memory components
 * (EpisodicMemory, SemanticMemory, etc.)
 */
export const CurrentLifeMemorySchema = autoRegister(
  defineComponent<{ type: 'current_life_memory'; version: 1 }>({
    type: 'current_life_memory',
    version: 1,
    category: 'cognitive',
    description: 'Marker component for current incarnation memories',

    fields: {},

    ui: {
      icon: '📝',
      color: '#87CEEB',
      priority: 5,
      devToolsPanel: false,
    },

    llm: {
      promptSection: 'Current Life',
      summarize: () => {
        return 'Current incarnation memories (see Memory, EpisodicMemory, etc.)';
      },
    },

    createDefault: () => ({
      type: 'current_life_memory',
      version: 1,
    }),
  })
);
