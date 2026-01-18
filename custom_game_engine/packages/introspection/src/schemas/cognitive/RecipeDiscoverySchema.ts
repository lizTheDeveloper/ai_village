/**
 * RecipeDiscovery Component Schema
 *
 * Tracks agent's recipe experimentation and discoveries.
 * Tier 15: Automation/Manufacturing (cognitive aspect).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Recipe discovery component type
 */
export interface RecipeDiscoveryComponent extends Component {
  type: 'recipe_discovery';
  version: 1;

  totalExperiments: number;
  successfulDiscoveries: number;
  totalCreativityScore: number;
  discoveries: Array<{
    recipeId: string;
    name: string;
    discoveredAt: number;
    recipeType: 'food' | 'clothing' | 'art' | 'potion' | 'tool' | 'decoration';
    timesCrafted: number;
  }>;
  recentExperiments: Array<{
    tick: number;
    recipeType: 'food' | 'clothing' | 'art' | 'potion' | 'tool' | 'decoration';
    ingredients: Array<{ itemId: string; quantity: number }>;
    success: boolean;
    recipeId?: string;
    creativityScore: number;
  }>;
  failedCombinations: Set<string>;
  experimentCooldown: number;
  specializations: Record<'food' | 'clothing' | 'art' | 'potion' | 'tool' | 'decoration', number>;
}

/**
 * Recipe discovery component schema
 */
export const RecipeDiscoverySchema = autoRegister(
  defineComponent<RecipeDiscoveryComponent>({
    type: 'recipe_discovery',
    version: 1,
    category: 'cognitive',
    description: 'Tracks agent\'s recipe experimentation and discoveries',

    fields: {
      totalExperiments: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total experiments attempted',
        displayName: 'Total Experiments',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'readonly', group: 'statistics', order: 1, icon: '🧪' },
        mutable: true,
      },

      successfulDiscoveries: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Successful discoveries',
        displayName: 'Discoveries',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'readonly', group: 'statistics', order: 2, icon: '✨' },
        mutable: true,
      },

      totalCreativityScore: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Cumulative creativity score',
        displayName: 'Creativity Score',
        visibility: { player: true, llm: false, agent: true, user: true, dev: true },
        ui: { widget: 'readonly', group: 'statistics', order: 3 },
        mutable: true,
      },

      discoveries: {
        type: 'array',
        required: true,
        default: [],
        description: 'List of all discovered recipes',
        displayName: 'Discovered Recipes',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'json', group: 'discoveries', order: 1 },
        mutable: true,
        itemType: 'object',
      },

      recentExperiments: {
        type: 'array',
        required: true,
        default: [],
        description: 'Recent experiment history (last 20)',
        displayName: 'Recent Experiments',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'history', order: 1 },
        mutable: true,
        itemType: 'object',
      },

      failedCombinations: {
        type: 'object',
        required: true,
        default: new Set(),
        description: 'Failed ingredient combinations (hashed) to avoid repeating',
        displayName: 'Failed Combinations',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'json', group: 'history', order: 2 },
        mutable: true,
      },

      experimentCooldown: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Cooldown - ticks until next experiment allowed',
        displayName: 'Experiment Cooldown',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'status', order: 1 },
        mutable: true,
      },

      specializations: {
        type: 'object',
        required: true,
        default: {
          food: 0,
          clothing: 0,
          art: 0,
          potion: 0,
          tool: 0,
          decoration: 0,
        },
        description: 'Experiment specializations (bonus success chance per type)',
        displayName: 'Specializations',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'json', group: 'skills', order: 1 },
        mutable: true,
      },
    },

    ui: {
      icon: '🧪',
      color: '#9370DB',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'skills',
      priority: 6,
      summarize: (data) => {
        if (data.successfulDiscoveries === 0) {
          return '';
        }
        const successRate = data.totalExperiments > 0
          ? ((data.successfulDiscoveries / data.totalExperiments) * 100).toFixed(0)
          : '0';
        const topSpec = Object.entries(data.specializations)
          .reduce((max, [type, level]) => (level > max[1] ? [type, level] : max), ['none', 0]);
        const specStr = topSpec[1] > 20 ? `, specializes in ${topSpec[0]}` : '';
        return `Recipe Experimenter: ${data.successfulDiscoveries} discoveries (${successRate}% success)${specStr}`;
      },
    },

    validate: (data): data is RecipeDiscoveryComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const r = data as Record<string, unknown>;

      if (!('type' in r) || r.type !== 'recipe_discovery') return false;
      if (!('totalExperiments' in r) || typeof r.totalExperiments !== 'number') return false;
      if (!('successfulDiscoveries' in r) || typeof r.successfulDiscoveries !== 'number') return false;
      if (!('totalCreativityScore' in r) || typeof r.totalCreativityScore !== 'number') return false;
      if (!('discoveries' in r) || !Array.isArray(r.discoveries)) return false;
      if (!('recentExperiments' in r) || !Array.isArray(r.recentExperiments)) return false;
      if (!('failedCombinations' in r)) return false;
      if (!('experimentCooldown' in r) || typeof r.experimentCooldown !== 'number') return false;
      if (!('specializations' in r) || typeof r.specializations !== 'object' || r.specializations === null) return false;

      return true;
    },

    createDefault: () => ({
      type: 'recipe_discovery',
      version: 1,
      totalExperiments: 0,
      successfulDiscoveries: 0,
      totalCreativityScore: 0,
      discoveries: [],
      recentExperiments: [],
      failedCombinations: new Set(),
      experimentCooldown: 0,
      specializations: {
        food: 0,
        clothing: 0,
        art: 0,
        potion: 0,
        tool: 0,
        decoration: 0,
      },
    }),
  })
);
