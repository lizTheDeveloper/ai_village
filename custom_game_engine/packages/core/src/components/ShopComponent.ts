import type { Component } from '../ecs/Component.js';

/**
 * Types of shops that can exist in the village
 */
export type ShopType =
  | 'general'
  | 'farm_supply'
  | 'blacksmith'
  | 'tavern'
  | 'apothecary'
  | 'clothier'
  | 'curiosity'
  | 'player_shop';

/**
 * Individual item stock in a shop
 */
export interface ShopStock {
  itemId: string;
  quantity: number;
  customPrice?: number;
  reserved: number;
}

/**
 * Component for entities that function as shops
 */
export interface ShopComponent extends Component {
  type: 'shop';
  shopType: ShopType;
  ownerId: string;
  name: string;

  // Inventory
  stock: ShopStock[];
  currencyReserve: number;

  // Pricing
  buyMarkup: number;      // 1.2 = 20% above base value (player pays more)
  sellMarkdown: number;   // 0.8 = 80% of base value (player gets less)
  haggleEnabled: boolean;

  // Hours
  openHours: { start: number; end: number }; // 0-24
  daysOpen: number[]; // 0-6 for days of week

  // Stats
  totalSales: number;
  totalPurchases: number;
}

/**
 * Create a new ShopComponent with default values
 */
export function createShopComponent(
  shopType: ShopType,
  ownerId: string,
  name: string
): ShopComponent {
  return {
    type: 'shop',
    version: 1,
    shopType,
    ownerId,
    name,
    stock: [],
    currencyReserve: 500,
    buyMarkup: 1.2,
    sellMarkdown: 0.8,
    haggleEnabled: true,
    openHours: { start: 8, end: 18 },
    daysOpen: [1, 2, 3, 4, 5, 6], // Mon-Sat
    totalSales: 0,
    totalPurchases: 0,
  };
}

/**
 * Add stock to a shop
 */
export function addStock(
  component: ShopComponent,
  itemId: string,
  quantity: number,
  customPrice?: number
): ShopComponent {
  if (quantity <= 0) {
    throw new Error(`Cannot add non-positive quantity: ${quantity}`);
  }

  const existingStockIndex = component.stock.findIndex(s => s.itemId === itemId);

  let newStock: ShopStock[];
  if (existingStockIndex >= 0) {
    // Update existing stock
    newStock = [...component.stock];
    const existingStock = newStock[existingStockIndex];
    if (!existingStock) {
      throw new Error(`Stock entry not found at index ${existingStockIndex}`);
    }
    newStock[existingStockIndex] = {
      itemId: existingStock.itemId,
      quantity: existingStock.quantity + quantity,
      customPrice: customPrice ?? existingStock.customPrice,
      reserved: existingStock.reserved,
    };
  } else {
    // Add new stock
    newStock = [
      ...component.stock,
      {
        itemId,
        quantity,
        customPrice,
        reserved: 0,
      },
    ];
  }

  return {
    ...component,
    stock: newStock,
  };
}

/**
 * Remove stock from a shop
 */
export function removeStock(
  component: ShopComponent,
  itemId: string,
  quantity: number
): ShopComponent {
  if (quantity <= 0) {
    throw new Error(`Cannot remove non-positive quantity: ${quantity}`);
  }

  const stockIndex = component.stock.findIndex(s => s.itemId === itemId);
  if (stockIndex === -1) {
    throw new Error(`Item ${itemId} not in shop stock`);
  }

  const stock = component.stock[stockIndex];
  if (!stock) {
    throw new Error(`Stock entry not found at index ${stockIndex}`);
  }
  if (stock.quantity < quantity) {
    throw new Error(`Not enough ${itemId} in stock. Have ${stock.quantity}, need ${quantity}`);
  }

  const newStock = [...component.stock];
  newStock[stockIndex] = {
    itemId: stock.itemId,
    quantity: stock.quantity - quantity,
    customPrice: stock.customPrice,
    reserved: stock.reserved,
  };

  return {
    ...component,
    stock: newStock,
  };
}

/**
 * Get the quantity of a specific item in stock
 */
export function getStockQuantity(component: ShopComponent, itemId: string): number {
  const stock = component.stock.find(s => s.itemId === itemId);
  return stock ? stock.quantity : 0;
}
