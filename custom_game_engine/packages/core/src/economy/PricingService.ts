import type { ItemDefinition, ItemRarity } from '../items/ItemDefinition.js';
import type { MarketStateComponent } from '../components/MarketStateComponent.js';
import type { MarketEventSystem } from '../systems/MarketEventSystem.js';
import { getDemandMultiplier, getSupplyPenalty } from '../components/MarketStateComponent.js';

/**
 * Rarity multipliers for item pricing
 */
export const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.5,
  epic: 5.0,
  legendary: 10.0,
};

/**
 * Breakdown of price calculation for transparency
 */
export interface PriceBreakdown {
  baseValue: number;
  qualityMultiplier: number;
  rarityMultiplier: number;
  demandMultiplier: number;
  supplyPenalty: number;
  eventModifier: number;
  finalPrice: number;
}

/**
 * Calculate the market price for an item
 * Formula: baseValue * quality * rarity * demand * supply * eventModifier
 * Quality range: 0.5 - 2.0 (based on 0-100 quality rating)
 */
export function calculateItemPrice(
  item: { definition: ItemDefinition; quality?: number },
  marketState: MarketStateComponent | undefined,
  marketEventSystem?: MarketEventSystem
): PriceBreakdown {
  const base = item.definition.baseValue;
  if (base === undefined) {
    throw new Error(`Item ${item.definition.id} missing baseValue - cannot calculate price`);
  }

  // Quality: 0 = 0.5x, 50 = 1.0x, 100 = 2.0x
  const quality = 0.5 + ((item.quality ?? 50) / 100) * 1.5;
  const rarity = RARITY_MULTIPLIERS[item.definition.rarity] ?? 1.0;

  let demand = 1.0;
  let supply = 1.0;

  if (marketState) {
    const stats = marketState.itemStats.get(item.definition.id);
    if (stats) {
      demand = getDemandMultiplier(stats);
      supply = getSupplyPenalty(stats);
    }
  }

  // Apply market event modifiers (Phase 12.8)
  let eventModifier = 1.0;
  if (marketEventSystem) {
    eventModifier = marketEventSystem.getPriceModifier(
      item.definition.id,
      item.definition.category
    );
  }

  const final = Math.floor(base * quality * rarity * demand * supply * eventModifier);

  return {
    baseValue: base,
    qualityMultiplier: quality,
    rarityMultiplier: rarity,
    demandMultiplier: demand,
    supplyPenalty: supply,
    eventModifier,
    finalPrice: Math.max(1, final),
  };
}

/**
 * Calculate buy price (what player pays to shop)
 * Applies shop's buyMarkup on top of market price
 */
export function calculateBuyPrice(
  item: { definition: ItemDefinition; quality?: number },
  shop: { buyMarkup: number },
  marketState: MarketStateComponent | undefined,
  marketEventSystem?: MarketEventSystem
): number {
  const { finalPrice } = calculateItemPrice(item, marketState, marketEventSystem);
  return Math.ceil(finalPrice * shop.buyMarkup);
}

/**
 * Calculate sell price (what player receives from shop)
 * Applies shop's sellMarkdown on top of market price
 */
export function calculateSellPrice(
  item: { definition: ItemDefinition; quality?: number },
  shop: { sellMarkdown: number },
  marketState: MarketStateComponent | undefined,
  marketEventSystem?: MarketEventSystem
): number {
  const { finalPrice } = calculateItemPrice(item, marketState, marketEventSystem);
  return Math.floor(finalPrice * shop.sellMarkdown);
}
