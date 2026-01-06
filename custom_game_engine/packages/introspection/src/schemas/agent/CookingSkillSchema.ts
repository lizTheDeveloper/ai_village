/**
 * Cooking Skill Component Schema
 *
 * Cooking-specific abilities and recipe familiarity
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Recipe complexity type
 */
export type RecipeComplexity = 'simple' | 'intermediate' | 'advanced' | 'masterwork';

/**
 * Cooking skill component type
 * Matches: packages/core/src/components/CookingSkillComponent.ts
 */
export interface CookingSkillComponent extends Component {
  type: 'cooking_skill';
  version: 1;
  level: number;
  totalXp: number;
  experience: {
    simple: number;
    intermediate: number;
    advanced: number;
    masterwork: number;
  };
  specializations: {
    baking: number;
    grilling: number;
    stewing: number;
    preservation: number;
  };
  knownRecipes: string[];
  recipeExperience: Record<string, {
    timesMade: number;
    qualityBonus: number;
    bestQuality: number;
    lastMade: number;
  }>;
  dishesCooked: number;
  signatureDish?: string;
}

/**
 * Cooking skill component schema
 */
export const CookingSkillSchema = autoRegister(
  defineComponent<CookingSkillComponent>({
    type: 'cooking_skill',
    version: 1,
    category: 'agent',

    fields: {
      level: {
        type: 'number',
        required: true,
        default: 1,
        range: [1, 100] as const,
        description: 'Overall cooking skill level (deprecated - use SkillsComponent)',
        displayName: 'Level',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'skill',
          order: 1,
          icon: '👨‍🍳',
        },
        mutable: true,
      },

      totalXp: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        description: 'Total cooking XP accumulated',
        displayName: 'Total XP',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'skill',
          order: 2,
        },
        mutable: true,
      },

      specializations: {
        type: 'object',
        required: true,
        default: { baking: 0, grilling: 0, stewing: 0, preservation: 0 },
        description: 'Specialization levels for cooking methods',
        displayName: 'Specializations',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'specializations',
          order: 10,
          icon: '🍳',
        },
        mutable: true,
      },

      knownRecipes: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        maxLength: 1000,
        description: 'Recipe IDs the agent knows',
        displayName: 'Known Recipes',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'recipes',
          order: 20,
          icon: '📜',
        },
        mutable: true,
      },

      recipeExperience: {
        type: 'object',
        required: true,
        default: {},
        description: 'Experience with specific recipes',
        displayName: 'Recipe Experience',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'recipes',
          order: 21,
        },
        mutable: true,
      },

      dishesCooked: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        description: 'Total number of dishes cooked',
        displayName: 'Dishes Cooked',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'skill',
          order: 3,
          icon: '🍽️',
        },
        mutable: true,
      },

      signatureDish: {
        type: 'string',
        required: false,
        description: 'Recipe with highest quality bonus',
        displayName: 'Signature Dish',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'skill',
          order: 4,
          icon: '⭐',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '👨‍🍳',
      color: '#FF9800',
      priority: 6,
    },

    llm: {
      promptSection: 'skills',
      summarize: (data) => {
        const levelDesc =
          data.level >= 80 ? 'master chef' :
          data.level >= 60 ? 'skilled cook' :
          data.level >= 40 ? 'competent cook' :
          data.level >= 20 ? 'novice cook' : 'beginner cook';

        const parts: string[] = [levelDesc];

        // Add dish count
        if (data.dishesCooked > 0) {
          parts.push(`${data.dishesCooked} dishes cooked`);
        }

        // Add signature dish
        if (data.signatureDish) {
          parts.push(`signature: ${data.signatureDish}`);
        }

        // Add top specialization
        const specs = Object.entries(data.specializations) as [keyof typeof data.specializations, number][];
        const topSpec = specs.reduce((best, current) => current[1] > best[1] ? current : best, ['baking', 0]);
        if (topSpec[1] >= 20) {
          parts.push(`specializes in ${topSpec[0]}`);
        }

        return parts.join(', ');
      },
      priority: 7,
    },

    validate: (data): data is CookingSkillComponent => {
      const d = data as any;

      if (!d || d.type !== 'cooking_skill') return false;
      if (typeof d.level !== 'number' || d.level < 1 || d.level > 100) {
        throw new RangeError(`Invalid level: ${d.level} (must be 1-100)`);
      }
      if (typeof d.totalXp !== 'number' || d.totalXp < 0) {
        throw new RangeError(`Invalid totalXp: ${d.totalXp} (must be >= 0)`);
      }
      if (typeof d.experience !== 'object' || d.experience === null) return false;
      if (typeof d.specializations !== 'object' || d.specializations === null) return false;
      if (!Array.isArray(d.knownRecipes)) return false;
      if (typeof d.recipeExperience !== 'object' || d.recipeExperience === null) return false;
      if (typeof d.dishesCooked !== 'number' || d.dishesCooked < 0) {
        throw new RangeError(`Invalid dishesCooked: ${d.dishesCooked} (must be >= 0)`);
      }

      return true;
    },

    createDefault: () => ({
      type: 'cooking_skill',
      version: 1,
      level: 1,
      totalXp: 0,
      experience: {
        simple: 0,
        intermediate: 0,
        advanced: 0,
        masterwork: 0,
      },
      specializations: {
        baking: 0,
        grilling: 0,
        stewing: 0,
        preservation: 0,
      },
      knownRecipes: [],
      recipeExperience: {},
      dishesCooked: 0,
    }),
  })
);
