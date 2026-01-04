/**
 * Verify Item Sources
 *
 * Ensures EVERY item in the game has a source:
 * - Either craftable (has recipe)
 * - Or gatherable (can be found in world)
 * - Or purchasable (can be bought from shops)
 *
 * Per user requirement: "all items in the entire game should be in theory craftable and have a source"
 */

import { itemRegistry } from '../items/ItemRegistry.js';
import type { RecipeRegistry } from './RecipeRegistry.js';
import type { ItemDefinition } from '../items/ItemDefinition.js';

export interface ItemSourceVerification {
  itemId: string;
  name: string;
  sources: string[];
  hasSource: boolean;
  recommendations: string[];
}

export interface VerificationReport {
  totalItems: number;
  itemsWithSources: number;
  itemsWithoutSources: number;
  details: ItemSourceVerification[];
  summary: string;
}

/**
 * Check if an item can be gathered from the world
 */
function isGatherable(item: ItemDefinition): boolean {
  return item.isGatherable === true;
}

/**
 * Check if an item has a crafting recipe
 */
function hasCraftingRecipe(item: ItemDefinition, registry: RecipeRegistry): boolean {
  try {
    registry.getRecipe(item.id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an item can be purchased from shops
 */
function isPurchasable(item: ItemDefinition): boolean {
  // Items with baseValue can typically be sold/bought
  return item.baseValue !== undefined && item.baseValue > 0;
}

/**
 * Check if an item is produced by animals/farming
 */
function isProduced(item: ItemDefinition): boolean {
  const producedItems = ['egg', 'milk', 'raw_meat', 'leather', 'wool'];
  return producedItems.includes(item.id);
}

/**
 * Recommend how to add a source for an item
 */
function recommendSource(item: ItemDefinition): string[] {
  const recommendations: string[] = [];

  // Check if it has crafting data but no recipe
  if (item.craftedFrom && item.craftedFrom.length > 0) {
    recommendations.push('✓ Has craftedFrom data - auto-generator should create recipe');
  } else {
    // Suggest what source to add
    if (item.category === 'resource' || item.category === 'material') {
      recommendations.push('⚠ Add isGatherable: true or craftedFrom field');
    } else if (item.category === 'food') {
      recommendations.push('⚠ Add isGatherable: true (farming) or craftedFrom (cooking)');
    } else if (item.category === 'equipment' || item.category === 'tool') {
      recommendations.push('⚠ Add craftedFrom field with ingredients');
    } else {
      recommendations.push('⚠ Add either isGatherable: true or craftedFrom field');
    }
  }

  return recommendations;
}

/**
 * Verify all items have a source
 */
export function verifyAllItemSources(registry: RecipeRegistry): VerificationReport {
  const allItems = itemRegistry.getAll();
  const details: ItemSourceVerification[] = [];

  for (const item of allItems) {
    const sources: string[] = [];

    if (isGatherable(item)) {
      sources.push('gatherable');
    }

    if (hasCraftingRecipe(item, registry)) {
      sources.push('craftable');
    }

    if (isPurchasable(item)) {
      sources.push('purchasable');
    }

    if (isProduced(item)) {
      sources.push('produced');
    }

    const hasSource = sources.length > 0;
    const recommendations = hasSource ? [] : recommendSource(item);

    details.push({
      itemId: item.id,
      name: item.displayName,
      sources,
      hasSource,
      recommendations,
    });
  }

  const itemsWithSources = details.filter(d => d.hasSource).length;
  const itemsWithoutSources = details.filter(d => !d.hasSource).length;

  let summary = `✅ ${itemsWithSources}/${allItems.length} items have sources\n`;

  if (itemsWithoutSources > 0) {
    summary += `⚠️  ${itemsWithoutSources} items missing sources:\n`;
    details.filter(d => !d.hasSource).forEach(d => {
      summary += `   • ${d.name} (${d.itemId})\n`;
      d.recommendations.forEach(rec => {
        summary += `     ${rec}\n`;
      });
    });
  } else {
    summary += `🎉 All items have at least one source!`;
  }

  return {
    totalItems: allItems.length,
    itemsWithSources,
    itemsWithoutSources,
    details,
    summary,
  };
}

/**
 * Print verification report to console
 */
export function printVerificationReport(registry: RecipeRegistry): void {
  const report = verifyAllItemSources(registry);


  // Detailed breakdown
  const sourceTypes = new Map<string, number>();

  for (const detail of report.details) {
    for (const source of detail.sources) {
      sourceTypes.set(source, (sourceTypes.get(source) || 0) + 1);
    }
  }

  for (const [_source, _count] of sourceTypes.entries()) {
  }

}
