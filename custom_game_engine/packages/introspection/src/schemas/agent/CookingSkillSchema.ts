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
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;

      if (!('type' in d) || d.type !== 'cooking_skill') return false;
      if (!('version' in d) || typeof d.version !== 'number') return false;

      if (!('level' in d) || typeof d.level !== 'number' || d.level < 1 || d.level > 100) {
        throw new RangeError(`Invalid level: ${('level' in d) ? d.level : 'undefined'} (must be 1-100)`);
      }
      if (!('totalXp' in d) || typeof d.totalXp !== 'number' || d.totalXp < 0) {
        throw new RangeError(`Invalid totalXp: ${('totalXp' in d) ? d.totalXp : 'undefined'} (must be >= 0)`);
      }

      if (!('experience' in d) || typeof d.experience !== 'object' || d.experience === null) return false;
      const exp = d.experience as Record<string, unknown>;
      if (!('simple' in exp) || typeof exp.simple !== 'number') return false;
      if (!('intermediate' in exp) || typeof exp.intermediate !== 'number') return false;
      if (!('advanced' in exp) || typeof exp.advanced !== 'number') return false;
      if (!('masterwork' in exp) || typeof exp.masterwork !== 'number') return false;

      if (!('specializations' in d) || typeof d.specializations !== 'object' || d.specializations === null) return false;
      const specs = d.specializations as Record<string, unknown>;
      if (!('baking' in specs) || typeof specs.baking !== 'number') return false;
      if (!('grilling' in specs) || typeof specs.grilling !== 'number') return false;
      if (!('stewing' in specs) || typeof specs.stewing !== 'number') return false;
      if (!('preservation' in specs) || typeof specs.preservation !== 'number') return false;

      if (!('knownRecipes' in d) || !Array.isArray(d.knownRecipes)) return false;
      if (!d.knownRecipes.every((item) => typeof item === 'string')) return false;

      if (!('recipeExperience' in d) || typeof d.recipeExperience !== 'object' || d.recipeExperience === null) return false;
      const recExp = d.recipeExperience as Record<string, unknown>;
      for (const key in recExp) {
        const entry = recExp[key];
        if (typeof entry !== 'object' || entry === null) return false;
        const entryObj = entry as Record<string, unknown>;
        if (!('timesMade' in entryObj) || typeof entryObj.timesMade !== 'number') return false;
        if (!('qualityBonus' in entryObj) || typeof entryObj.qualityBonus !== 'number') return false;
        if (!('bestQuality' in entryObj) || typeof entryObj.bestQuality !== 'number') return false;
        if (!('lastMade' in entryObj) || typeof entryObj.lastMade !== 'number') return false;
      }

      if (!('dishesCooked' in d) || typeof d.dishesCooked !== 'number' || d.dishesCooked < 0) {
        throw new RangeError(`Invalid dishesCooked: ${('dishesCooked' in d) ? d.dishesCooked : 'undefined'} (must be >= 0)`);
      }

      // Optional field
      if ('signatureDish' in d && d.signatureDish !== undefined && typeof d.signatureDish !== 'string') return false;

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
