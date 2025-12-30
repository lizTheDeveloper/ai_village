/**
 * CraftingView - Crafting interface
 *
 * Shows available recipes, ingredients, and crafting queue.
 * Accessibility-first: describes crafting options in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { createProgressBar } from '../theme.js';

/**
 * An ingredient requirement
 */
interface IngredientRequirement {
  itemId: string;
  itemName: string;
  required: number;
  available: number;
}

/**
 * A crafting recipe
 */
interface CraftingRecipe {
  id: string;
  name: string;
  category: string;
  description: string;
  ingredients: IngredientRequirement[];
  craftTime: number;
  skillRequired: string | null;
  skillLevel: number;
  playerSkillLevel: number;
  outputQuantity: number;
  isCraftable: boolean;
  reasonNotCraftable: string | null;
}

/**
 * A queued crafting job
 */
interface CraftingJob {
  recipeId: string;
  recipeName: string;
  progress: number;
  timeRemaining: number;
  status: 'waiting' | 'crafting' | 'paused';
}

/**
 * Data returned by the Crafting view
 */
export interface CraftingViewData extends ViewData {
  /** Currently selected crafting station */
  stationName: string | null;
  /** Station type (workbench, forge, etc) */
  stationType: string | null;
  /** Available recipe categories */
  categories: string[];
  /** Available recipes */
  recipes: CraftingRecipe[];
  /** Current crafting queue */
  queue: CraftingJob[];
  /** Max queue size */
  maxQueueSize: number;
}

/**
 * Crafting View Definition
 */
export const CraftingView: DashboardView<CraftingViewData> = {
  id: 'crafting',
  title: 'Crafting',
  category: 'economy',
  keyboardShortcut: 'C',
  description: 'Create items from raw materials at crafting stations',

  defaultSize: {
    width: 420,
    height: 600,
    minWidth: 380,
    minHeight: 500,
  },

  getData(context: ViewContext): CraftingViewData {
    const { world } = context;

    const emptyData: CraftingViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No crafting station selected',
      stationName: null,
      stationType: null,
      categories: [],
      recipes: [],
      queue: [],
      maxQueueSize: 3,
    };

    if (!world) {
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      // In real implementation, query crafting system state
      return emptyData;
    } catch (error) {
      return {
        ...emptyData,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: CraftingViewData): string {
    const lines: string[] = [
      'CRAFTING',
      '='.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Crafting unavailable');
      lines.push('');
      lines.push('To start crafting:');
      lines.push('  - Build a crafting station (workbench, forge, etc.)');
      lines.push('  - Click on the station to open crafting');
      lines.push('  - Ensure you have the required materials');
      return lines.join('\n');
    }

    // Station info
    lines.push(`${data.stationName || 'Crafting Station'}`);
    lines.push('-'.repeat(50));

    const stationDescriptions: Record<string, string> = {
      workbench: 'A sturdy workbench for general crafting',
      forge: 'A hot forge for metalworking',
      anvil: 'An anvil for smithing weapons and armor',
      loom: 'A loom for weaving cloth and textiles',
      kitchen: 'A kitchen for preparing food',
      alchemy_table: 'An alchemy table for brewing potions',
      enchanting_table: 'A table infused with magic for enchanting items',
    };

    lines.push(stationDescriptions[data.stationType || ''] || 'A crafting station for creating items');
    lines.push('');

    // Current queue
    lines.push('CRAFTING QUEUE');
    lines.push('-'.repeat(50));

    if (data.queue.length === 0) {
      lines.push('The queue is empty. Select a recipe below to start crafting.');
    } else {
      for (const [i, job] of data.queue.entries()) {
        const statusIcon = job.status === 'crafting' ? '[CRAFTING]' :
          job.status === 'paused' ? '[PAUSED]' : '[WAITING]';

        lines.push(`  ${i + 1}. ${job.recipeName} ${statusIcon}`);

        if (job.status === 'crafting') {
          lines.push(`     Progress: ${Math.round(job.progress * 100)}%`);
          lines.push(`     ${createProgressBar(job.progress * 100, 25)}`);
          lines.push(`     Time remaining: ${job.timeRemaining.toFixed(1)}s`);
        }
      }
      lines.push(`Queue: ${data.queue.length}/${data.maxQueueSize}`);
    }
    lines.push('');

    // Available recipes
    lines.push('AVAILABLE RECIPES');
    lines.push('-'.repeat(50));

    if (data.recipes.length === 0) {
      lines.push('No recipes available at this station.');
      lines.push('Learn new recipes through research or discovery.');
    } else {
      // Group by category
      const byCategory = new Map<string, CraftingRecipe[]>();
      for (const recipe of data.recipes) {
        if (!byCategory.has(recipe.category)) {
          byCategory.set(recipe.category, []);
        }
        byCategory.get(recipe.category)!.push(recipe);
      }

      for (const [category, categoryRecipes] of byCategory) {
        lines.push(`  ${category.toUpperCase()}`);

        for (const recipe of categoryRecipes) {
          const craftableStatus = recipe.isCraftable ? '' :
            ` (${recipe.reasonNotCraftable || 'cannot craft'})`;
          const quantityNote = recipe.outputQuantity > 1 ? ` x${recipe.outputQuantity}` : '';

          lines.push(`    ${recipe.name}${quantityNote}${craftableStatus}`);
          lines.push(`      ${recipe.description}`);

          // Ingredients
          lines.push('      Requires:');
          for (const ing of recipe.ingredients) {
            const hasEnough = ing.available >= ing.required;
            const status = hasEnough ? 'OK' : 'NEED';
            lines.push(`        - ${ing.itemName}: ${ing.available}/${ing.required} [${status}]`);
          }

          // Skill requirement
          if (recipe.skillRequired) {
            const meetsSkill = recipe.playerSkillLevel >= recipe.skillLevel;
            const skillStatus = meetsSkill ? 'OK' : 'TOO LOW';
            lines.push(`      Skill: ${recipe.skillRequired} ${recipe.playerSkillLevel}/${recipe.skillLevel} [${skillStatus}]`);
          }

          // Time
          lines.push(`      Craft time: ${recipe.craftTime.toFixed(1)}s`);
          lines.push('');
        }
      }
    }

    // Tips
    lines.push('CRAFTING TIPS');
    lines.push('-'.repeat(50));
    lines.push('- Higher skill levels unlock better recipes');
    lines.push('- Quality ingredients produce better results');
    lines.push('- Some recipes require specific stations');
    lines.push('- Queued items craft automatically');

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: CraftingViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No crafting station selected', x + padding, currentY);
      ctx.fillText('Click on a station to craft', x + padding, currentY + lineHeight);
      return;
    }

    // Station name
    ctx.fillStyle = '#FFA500';
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.stationName || 'Crafting Station', x + padding, currentY);
    currentY += lineHeight + 5;

    // Current crafting
    const activeCraft = data.queue.find(j => j.status === 'crafting');
    if (activeCraft) {
      ctx.font = theme.fonts.normal;
      ctx.fillStyle = theme.colors.text;
      ctx.fillText(`Crafting: ${activeCraft.recipeName}`, x + padding, currentY);
      currentY += lineHeight;

      // Progress bar
      const barWidth = width - padding * 2 - 60;
      const barHeight = 12;

      ctx.fillStyle = theme.colors.border;
      ctx.fillRect(x + padding, currentY, barWidth, barHeight);

      ctx.fillStyle = '#FFA500';
      ctx.fillRect(x + padding, currentY, barWidth * activeCraft.progress, barHeight);

      ctx.fillStyle = theme.colors.text;
      ctx.font = '10px monospace';
      ctx.fillText(`${Math.round(activeCraft.progress * 100)}%`, x + padding + barWidth + 5, currentY + 1);

      currentY += barHeight + 10;
    }

    // Queue status
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText(`Queue: ${data.queue.length}/${data.maxQueueSize}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Recipe list
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Recipes', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const craftableRecipes = data.recipes.filter(r => r.isCraftable);
    const uncraftableRecipes = data.recipes.filter(r => !r.isCraftable);

    if (craftableRecipes.length === 0 && uncraftableRecipes.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No recipes available', x + padding, currentY);
    } else {
      // Show craftable first
      for (const recipe of craftableRecipes.slice(0, 4)) {
        ctx.fillStyle = '#90EE90';
        ctx.fillText(`* ${recipe.name}`, x + padding, currentY);
        currentY += lineHeight;
      }

      // Then uncraftable
      for (const recipe of uncraftableRecipes.slice(0, 4 - craftableRecipes.length)) {
        ctx.fillStyle = theme.colors.textMuted;
        ctx.fillText(`  ${recipe.name}`, x + padding, currentY);
        currentY += lineHeight;
      }

      const total = data.recipes.length;
      const shown = Math.min(4, craftableRecipes.length) + Math.min(4 - craftableRecipes.length, uncraftableRecipes.length);
      if (total > shown) {
        ctx.fillStyle = theme.colors.textMuted;
        ctx.fillText(`... ${total - shown} more recipes`, x + padding, currentY);
      }
    }
  },
};
