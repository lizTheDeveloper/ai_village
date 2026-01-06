import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { MagicComponent } from '@ai-village/core';

/**
 * MagicSchema - Introspection schema for MagicComponent
 *
 * Tier 6: Magic components
 * Complexity: Medium (magic sources, spells, mana pools)
 */
export const MagicSchema = autoRegister(
  defineComponent<MagicComponent>({
    type: 'magic',
    version: 1,
    category: 'magic',

    fields: {
      manaPools: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Mana pools for different magic sources (arcane, divine, void, etc.)',
        visibility: {
          player: true,  // Players should see mana
          llm: true,  // LLM needs mana info for spellcasting decisions
          agent: true,  // Agents know their mana
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'resources',
          order: 1,
          icon: '✨',
          color: '#9C27B0',
        },
      },

      knownSpells: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Spells known by agent with proficiency tracking',
        visibility: {
          player: true,
          llm: true,  // LLM needs to know available spells
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'spells',
          order: 2,
          icon: '📜',
        },
      },

      paradigmAdaptations: {
        type: 'map',
        required: false,
        description: 'Paradigm-specific adaptations (e.g., component requirements)',
        visibility: {
          player: false,  // Too technical
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'advanced',
          order: 3,
        },
      },
    },

    ui: {
      icon: '✨',
      color: '#9C27B0',
      priority: 7,
    },

    llm: {
      promptSection: 'Magic Abilities',
      summarize: (data: MagicComponent) => {
        const pools = data.manaPools || [];
        const spells = data.knownSpells || [];

        if (pools.length === 0 && spells.length === 0) {
          return 'No magical abilities.';
        }

        const parts: string[] = [];

        // Mana summary
        if (pools.length > 0) {
          const manaInfo = pools
            .map(pool => {
              const percent = Math.round((pool.current / pool.maximum) * 100);
              return `${pool.source}: ${pool.current}/${pool.maximum} (${percent}%)`;
            })
            .join(', ');
          parts.push(`Mana: ${manaInfo}`);
        }

        // Spells summary
        if (spells.length > 0) {
          parts.push(`${spells.length} known spells`);
        }

        return parts.join('. ');
      },
    },

    validate: (data: unknown): data is MagicComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return Array.isArray(comp.manaPools) && Array.isArray(comp.knownSpells);
    },

    createDefault: () => ({
      type: 'magic',
      version: 1,
      manaPools: [],
      knownSpells: [],
      paradigmAdaptations: new Map(),
    } as MagicComponent),
  })
);
