/**
 * TradingSystem - Handles economic transactions between entities
 *
 * Responsibilities:
 * - Buy/sell items at shops
 * - Transfer currency between entities
 * - Transfer items between inventories
 * - Update market statistics
 * - Emit trade events
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors throw with clear messages
 * - Strict validation - shops must be open, have stock, etc.
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { ShopComponent } from '../components/ShopComponent.js';
import type { CurrencyComponent } from '../components/CurrencyComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { MarketStateComponent } from '../components/MarketStateComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { addCurrency } from '../components/CurrencyComponent.js';
import { addStock, removeStock, getStockQuantity } from '../components/ShopComponent.js';
import { updateItemStats } from '../components/MarketStateComponent.js';
import { addToInventory, removeFromInventory } from '../components/InventoryComponent.js';
import { calculateBuyPrice, calculateSellPrice } from '../economy/PricingService.js';
import { itemRegistry } from '../items/index.js';
import { DEFAULT_QUALITY } from '../items/ItemQuality.js';

/**
 * Result of a trade operation
 */
export interface TradeResult {
  success: boolean;
  reason?: string;
  totalPrice?: number;
  unitPrice?: number;
}

/**
 * System that handles economic transactions between entities
 */
export class TradingSystem implements System {
  public readonly id: SystemId = 'trading';
  public readonly priority: number = 25; // Run after most other systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private isInitialized = false;

  /**
   * Initialize the system
   */
  public initialize(_world: World, _eventBus: EventBus): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
  }

  /**
   * Update is currently not used - all trading is event-driven
   */
  public update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Trading is handled through direct method calls, not in update loop
  }

  /**
   * Buy items from a shop
   *
   * Process:
   * 1. Validate shop exists and is open
   * 2. Validate buyer has currency component
   * 3. Check shop has sufficient stock
   * 4. Calculate price
   * 5. Validate buyer has sufficient funds
   * 6. Transfer currency from buyer to shop
   * 7. Transfer items from shop to buyer inventory
   * 8. Update market statistics
   * 9. Emit trade:buy event
   *
   * @param world The world instance
   * @param buyerId Entity ID of the buyer
   * @param shopEntityId Entity ID of the shop
   * @param itemId Item to purchase
   * @param quantity Number of items to purchase
   * @returns Trade result with success status and details
   */
  public buyFromShop(
    world: World,
    buyerId: EntityId,
    shopEntityId: EntityId,
    itemId: string,
    quantity: number
  ): TradeResult {
    if (quantity <= 0) {
      throw new Error(`Cannot buy non-positive quantity: ${quantity}`);
    }

    // Get entities
    const buyer = world.getEntity(buyerId);
    if (!buyer) {
      throw new Error(`Buyer entity ${buyerId} does not exist`);
    }

    const shopEntity = world.getEntity(shopEntityId);
    if (!shopEntity) {
      throw new Error(`Shop entity ${shopEntityId} does not exist`);
    }

    // Get components
    const buyerImpl = buyer as EntityImpl;
    const shopImpl = shopEntity as EntityImpl;

    const buyerCurrency = buyerImpl.getComponent<CurrencyComponent>('currency');
    if (!buyerCurrency) {
      throw new Error(`Buyer ${buyerId} has no currency component`);
    }

    const buyerInventory = buyerImpl.getComponent<InventoryComponent>('inventory');
    if (!buyerInventory) {
      throw new Error(`Buyer ${buyerId} has no inventory component`);
    }

    const shop = shopImpl.getComponent<ShopComponent>('shop');
    if (!shop) {
      throw new Error(`Shop entity ${shopEntityId} has no shop component`);
    }

    const shopCurrency = shopImpl.getComponent<CurrencyComponent>('currency');
    if (!shopCurrency) {
      throw new Error(`Shop ${shopEntityId} has no currency component`);
    }

    // Validate shop is open
    const currentHour = Math.floor((world.tick / 1200) % 24); // 20 TPS, 1200 ticks = 1 hour
    if (currentHour < shop.openHours.start || currentHour >= shop.openHours.end) {
      return {
        success: false,
        reason: `Shop is closed. Opens at ${shop.openHours.start}:00, closes at ${shop.openHours.end}:00`,
      };
    }

    // Check stock
    const availableStock = getStockQuantity(shop, itemId);
    if (availableStock < quantity) {
      return {
        success: false,
        reason: `Shop only has ${availableStock} ${itemId}, you requested ${quantity}`,
      };
    }

    // Get item definition for price calculation
    const itemDef = itemRegistry.get(itemId);
    if (!itemDef) {
      throw new Error(`Item ${itemId} not found in registry - cannot calculate price`);
    }

    // Calculate price (shops sell items at default quality)
    const marketState = this.getMarketState(world);
    const marketEventSystem = this.getMarketEventSystem(world);
    const unitPrice = calculateBuyPrice(
      { definition: itemDef, quality: DEFAULT_QUALITY },
      shop,
      marketState,
      marketEventSystem
    );
    const totalPrice = unitPrice * quantity;

    // Check buyer funds
    if (buyerCurrency.balance < totalPrice) {
      return {
        success: false,
        reason: `Insufficient funds. Need ${totalPrice} currency, have ${buyerCurrency.balance}`,
      };
    }

    // Execute transaction
    try {
      // Transfer currency: buyer -> shop
      const newBuyerCurrency = addCurrency(buyerCurrency, -totalPrice, {
        type: 'buy',
        amount: -totalPrice,
        otherPartyId: shopEntityId,
        itemId,
        quantity,
        tick: world.tick,
        timestamp: Date.now(),
      });

      const newShopCurrency = addCurrency(shopCurrency, totalPrice, {
        type: 'sell',
        amount: totalPrice,
        otherPartyId: buyerId,
        itemId,
        quantity,
        tick: world.tick,
        timestamp: Date.now(),
      });

      // Transfer items: shop -> buyer
      const newShop = removeStock(shop, itemId, quantity);
      const { inventory: newBuyerInventory } = addToInventory(buyerInventory, itemId, quantity);

      // Update components
      buyerImpl.updateComponent('currency', () => newBuyerCurrency);
      shopImpl.updateComponent('currency', () => newShopCurrency);
      shopImpl.updateComponent('shop', () => ({
        ...newShop,
        totalSales: newShop.totalSales + totalPrice,
      }));
      buyerImpl.updateComponent('inventory', () => newBuyerInventory);

      // Update market statistics
      if (marketState) {
        this.updateMarketStats(world, marketState, itemId, 'buy', quantity, unitPrice);
      }

      // Emit trade event
      world.eventBus.emit({
        type: 'trade:buy',
        source: buyerId,
        data: {
          buyerId,
          sellerId: shop.ownerId,
          shopId: shopEntityId,
          itemId,
          quantity,
          totalPrice,
          unitPrice,
        },
      });

      return {
        success: true,
        totalPrice,
        unitPrice,
      };
    } catch (error: any) {
      return {
        success: false,
        reason: error.message || 'Transaction failed',
      };
    }
  }

  /**
   * Sell items to a shop
   *
   * Process:
   * 1. Validate shop exists and is open
   * 2. Validate seller has inventory component
   * 3. Check seller has items to sell
   * 4. Calculate price
   * 5. Validate shop has sufficient funds
   * 6. Transfer currency from shop to seller
   * 7. Transfer items from seller to shop inventory
   * 8. Update market statistics
   * 9. Emit trade:sell event
   *
   * @param world The world instance
   * @param sellerId Entity ID of the seller
   * @param shopEntityId Entity ID of the shop
   * @param itemId Item to sell
   * @param quantity Number of items to sell
   * @returns Trade result with success status and details
   */
  public sellToShop(
    world: World,
    sellerId: EntityId,
    shopEntityId: EntityId,
    itemId: string,
    quantity: number
  ): TradeResult {
    if (quantity <= 0) {
      throw new Error(`Cannot sell non-positive quantity: ${quantity}`);
    }

    // Get entities
    const seller = world.getEntity(sellerId);
    if (!seller) {
      throw new Error(`Seller entity ${sellerId} does not exist`);
    }

    const shopEntity = world.getEntity(shopEntityId);
    if (!shopEntity) {
      throw new Error(`Shop entity ${shopEntityId} does not exist`);
    }

    // Get components
    const sellerImpl = seller as EntityImpl;
    const shopImpl = shopEntity as EntityImpl;

    const sellerCurrency = sellerImpl.getComponent<CurrencyComponent>('currency');
    if (!sellerCurrency) {
      throw new Error(`Seller ${sellerId} has no currency component`);
    }

    const sellerInventory = sellerImpl.getComponent<InventoryComponent>('inventory');
    if (!sellerInventory) {
      throw new Error(`Seller ${sellerId} has no inventory component`);
    }

    const shop = shopImpl.getComponent<ShopComponent>('shop');
    if (!shop) {
      throw new Error(`Shop entity ${shopEntityId} has no shop component`);
    }

    const shopCurrency = shopImpl.getComponent<CurrencyComponent>('currency');
    if (!shopCurrency) {
      throw new Error(`Shop ${shopEntityId} has no currency component`);
    }

    // Validate shop is open
    const currentHour = Math.floor((world.tick / 1200) % 24);
    if (currentHour < shop.openHours.start || currentHour >= shop.openHours.end) {
      return {
        success: false,
        reason: `Shop is closed. Opens at ${shop.openHours.start}:00, closes at ${shop.openHours.end}:00`,
      };
    }

    // Check seller has items and extract quality from first matching slot
    let sellerHasItems = false;
    let itemQuality = DEFAULT_QUALITY; // Default if no quality specified
    for (const slot of sellerInventory.slots) {
      if (slot.itemId === itemId) {
        // Extract quality from first slot (items with different quality are in separate slots)
        itemQuality = slot.quality ?? DEFAULT_QUALITY;
        if (slot.quantity >= quantity) {
          sellerHasItems = true;
          break;
        }
      }
    }

    // Count total quantity across all slots
    let totalSellerQuantity = 0;
    for (const slot of sellerInventory.slots) {
      if (slot.itemId === itemId) {
        totalSellerQuantity += slot.quantity;
      }
    }

    if (!sellerHasItems && totalSellerQuantity < quantity) {
      return {
        success: false,
        reason: `Seller only has ${totalSellerQuantity} ${itemId}, trying to sell ${quantity}`,
      };
    }

    // Get item definition for price calculation
    const itemDef = itemRegistry.get(itemId);
    if (!itemDef) {
      throw new Error(`Item ${itemId} not found in registry - cannot calculate price`);
    }

    // Calculate price using item quality from inventory
    const marketState = this.getMarketState(world);
    const marketEventSystem = this.getMarketEventSystem(world);
    const unitPrice = calculateSellPrice(
      { definition: itemDef, quality: itemQuality },
      shop,
      marketState,
      marketEventSystem
    );
    const totalPrice = unitPrice * quantity;

    // Check shop funds
    if (shopCurrency.balance < totalPrice) {
      return {
        success: false,
        reason: `Shop has insufficient funds. Need ${totalPrice} currency, have ${shopCurrency.balance}`,
      };
    }

    // Execute transaction
    try {
      // Transfer currency: shop -> seller
      const newShopCurrency = addCurrency(shopCurrency, -totalPrice, {
        type: 'buy',
        amount: -totalPrice,
        otherPartyId: sellerId,
        itemId,
        quantity,
        tick: world.tick,
        timestamp: Date.now(),
      });

      const newSellerCurrency = addCurrency(sellerCurrency, totalPrice, {
        type: 'sell',
        amount: totalPrice,
        otherPartyId: shopEntityId,
        itemId,
        quantity,
        tick: world.tick,
        timestamp: Date.now(),
      });

      // Transfer items: seller -> shop
      const { inventory: newSellerInventory } = removeFromInventory(sellerInventory, itemId, quantity);
      const newShop = addStock(shop, itemId, quantity);

      // Update components
      sellerImpl.updateComponent('currency', () => newSellerCurrency);
      shopImpl.updateComponent('currency', () => newShopCurrency);
      sellerImpl.updateComponent('inventory', () => newSellerInventory);
      shopImpl.updateComponent('shop', () => ({
        ...newShop,
        totalPurchases: newShop.totalPurchases + totalPrice,
      }));

      // Update market statistics
      if (marketState) {
        this.updateMarketStats(world, marketState, itemId, 'sell', quantity, unitPrice);
      }

      // Emit trade event
      world.eventBus.emit({
        type: 'trade:sell',
        source: sellerId,
        data: {
          sellerId,
          buyerId: shop.ownerId,
          shopId: shopEntityId,
          itemId,
          quantity,
          totalPrice,
          unitPrice,
        },
      });

      return {
        success: true,
        totalPrice,
        unitPrice,
      };
    } catch (error: any) {
      return {
        success: false,
        reason: error.message || 'Transaction failed',
      };
    }
  }

  /**
   * Get the market state component from the world
   */
  private getMarketState(world: World): MarketStateComponent | undefined {
    // Market state is a singleton component on a special entity
    const marketEntities = world.query().with('market_state').executeEntities();
    if (marketEntities.length === 0) {
      return undefined;
    }

    const marketEntity = marketEntities[0];
    if (!marketEntity) {
      return undefined;
    }

    return marketEntity.components.get('market_state') as MarketStateComponent | undefined;
  }

  /**
   * Get the market event system from the world
   * MarketEventSystem is attached to world in main.ts
   */
  private getMarketEventSystem(world: World): any | undefined {
    return (world as any).marketEventSystem;
  }

  /**
   * Update market statistics after a trade
   */
  private updateMarketStats(
    world: World,
    marketState: MarketStateComponent,
    itemId: string,
    tradeType: 'buy' | 'sell',
    quantity: number,
    price: number
  ): void {
    const stats = marketState.itemStats.get(itemId);
    const currentStats = stats || {
      itemId,
      totalSupply: 0,
      recentSales: 0,
      recentPurchases: 0,
      averagePrice: price,
      priceHistory: [],
      lastUpdated: world.tick,
    };

    const newStats = {
      ...currentStats,
      recentSales: tradeType === 'buy' ? currentStats.recentSales + quantity : currentStats.recentSales,
      recentPurchases: tradeType === 'sell' ? currentStats.recentPurchases + quantity : currentStats.recentPurchases,
      averagePrice: (currentStats.averagePrice * 0.9 + price * 0.1), // Weighted average
      priceHistory: [...currentStats.priceHistory, price].slice(-30), // Keep last 30 prices
      lastUpdated: world.tick,
    };

    // Find market entity and update its component
    const marketEntities = world.query().with('market_state').executeEntities();
    if (marketEntities.length > 0 && marketEntities[0]) {
      const marketEntity = marketEntities[0] as EntityImpl;
      const updatedMarketState = updateItemStats(marketState, itemId, newStats);
      marketEntity.updateComponent('market_state', () => updatedMarketState);
    }
  }

  /**
   * Find the nearest shop to a given position
   */
  public findNearestShop(world: World, position: PositionComponent): EntityId | null {
    const shops = world.query().with('shop').with('position').executeEntities();

    let nearestShop: EntityId | null = null;
    let nearestDistance = Infinity;

    for (const shop of shops) {
      const shopPos = shop.components.get('position') as PositionComponent | undefined;
      if (!shopPos) continue;

      const dx = shopPos.x - position.x;
      const dy = shopPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestShop = shop.id;
      }
    }

    return nearestShop;
  }
}
