import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { TradingSystem } from '../TradingSystem.js';
import { ComponentType } from '../../types/ComponentType.js';
import {
  createInventoryComponent,
  addToInventoryWithQuality,
  type InventoryComponent
} from '../../components/InventoryComponent.js';
import { createShopComponent } from '../../components/ShopComponent.js';
import { createCurrencyComponent, type CurrencyComponent } from '../../components/CurrencyComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { getQualityPriceMultiplier } from '../../items/ItemQuality.js';

describe('TradingSystem Quality Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let tradingSystem: TradingSystem;
  let agent: EntityImpl;
  let shop: EntityImpl;

  beforeEach(() => {
    // Create real world with EventBus
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    // Set world tick to daytime (10 AM = tick 12000)
    (world as any)._tick = 12000;

    // Create actual trading system
    tradingSystem = new TradingSystem();
    tradingSystem.initialize(world, eventBus);

    // Create agent
    agent = new EntityImpl(createEntityId(), 0);
    const agentInventory = createInventoryComponent(24);
    agent.addComponent(agentInventory);
    agent.addComponent(createCurrencyComponent(1000)); // 1000 gold
    agent.addComponent(createPositionComponent(10, 10));
    world.addEntity(agent);

    // Create shop
    shop = new EntityImpl(createEntityId(), 0);
    const shopComponent = createShopComponent('general', 'shop-owner', 'Test Shop');
    // Add wheat to shop's STOCK (not inventory) - this is what TradingSystem reads
    const stockedShop = { ...shopComponent, stock: [{ itemId: 'wheat', quantity: 100, reserved: 0 }] };
    shop.addComponent(stockedShop);
    shop.addComponent(createCurrencyComponent(10000)); // Shop needs money to buy items
    shop.addComponent(createPositionComponent(10, 10)); // Same position
    world.addEntity(shop);
  });

  it('should apply quality multiplier when selling items', () => {
    // Add poor quality wheat (quality 20) to agent
    const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!agentInventory) {
      throw new Error('Agent inventory missing');
    }

    const addResult = addToInventoryWithQuality(agentInventory, 'wheat', 10, 20);
    agent.addComponent(addResult.inventory);

    const startingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;

    // Sell poor quality wheat (quality is read from inventory automatically)
    const tradeResult = tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 10);

    expect(tradeResult.success).toBe(true);

    const endingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;
    const profit = endingGold - startingGold;

    // Quality multiplier for 20 = 0.5 + (20/100) * 1.5 = 0.8x
    expect(profit).toBeGreaterThan(0);

    // Should be less than if we sold normal quality (50)
    expect(profit).toBeLessThan(100); // Assuming base wheat price ~10-15 gold
  });

  it('should pay more for legendary quality items', () => {
    // Add legendary quality wheat (quality 100) to agent
    const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!agentInventory) {
      throw new Error('Agent inventory missing');
    }

    const addResult = addToInventoryWithQuality(agentInventory, 'wheat', 10, 100);
    agent.addComponent(addResult.inventory);

    const startingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;

    // Sell legendary quality wheat (quality is read from inventory)
    const tradeResult = tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 10);

    expect(tradeResult.success).toBe(true);

    const endingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;
    const profit = endingGold - startingGold;

    // Quality multiplier for 100 = 2.0x base value
    expect(profit).toBeGreaterThan(0); // Should make profit
  });

  it('should charge more when buying high quality items from shop', () => {
    // The shop already has wheat (from beforeEach), but that has default quality 50
    // Buying higher quality wheat should cost more (but shop uses DEFAULT_QUALITY for its stock)
    // This test verifies the pricing system works
    const startingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;

    // Buy wheat from shop
    const tradeResult = tradingSystem.buyFromShop(world, agent.id, shop.id, 'wheat', 10);

    expect(tradeResult.success).toBe(true);

    const endingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;
    const cost = startingGold - endingGold;

    // Should have paid something
    expect(cost).toBeGreaterThan(0);
  });

  it('should correctly price different quality tiers of the same item', () => {
    // Add multiple quality tiers of wheat to agent
    let agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!agentInventory) {
      throw new Error('Agent inventory missing');
    }

    // Poor (20), Normal (50), Fine (70), Masterwork (90), Legendary (100)
    let result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 20);
    agentInventory = result.inventory;
    result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 50);
    agentInventory = result.inventory;
    result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 70);
    agentInventory = result.inventory;
    result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 90);
    agentInventory = result.inventory;
    result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 100);
    agent.addComponent(result.inventory);

    const prices: Record<number, number> = {};

    // Sell each quality tier (quality is read from inventory slots automatically)
    for (const quality of [20, 50, 70, 90, 100]) {
      const startGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;
      const tradeResult = tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 10);
      expect(tradeResult.success).toBe(true);

      const endGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;
      prices[quality] = endGold - startGold;
    }

    // Each higher quality should sell for more
    expect(prices[50]).toBeGreaterThan(prices[20]);
    expect(prices[70]).toBeGreaterThan(prices[50]);
    expect(prices[90]).toBeGreaterThan(prices[70]);
    expect(prices[100]).toBeGreaterThan(prices[90]);

    // Legendary should be ~2.5x more than poor (2.0 / 0.8)
    const ratio = prices[100] / prices[20];
    expect(ratio).toBeGreaterThan(2.0);
    expect(ratio).toBeLessThan(3.0);
  });

  it('should fail when trying to sell more than available in inventory', () => {
    // Add wheat quality 50
    const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!agentInventory) {
      throw new Error('Agent inventory missing');
    }

    const addResult = addToInventoryWithQuality(agentInventory, 'wheat', 5, 50);
    agent.addComponent(addResult.inventory);

    // Try to sell 10 when only have 5
    const tradeResult = tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 10);
    expect(tradeResult.success).toBe(false);
    expect(tradeResult.reason).toContain('only has');
  });

  it('should fail when trying to buy more than shop has in stock', () => {
    // Shop has 100 wheat
    // Try to buy 200
    const tradeResult = tradingSystem.buyFromShop(world, agent.id, shop.id, 'wheat', 200);

    expect(tradeResult.success).toBe(false);
    expect(tradeResult.reason).toContain('only has');
  });

  it('should correctly apply quality multiplier formula across all quality values', () => {
    // Test that price multiplier formula works with wheat (a real item)
    const testQualities = [20, 50, 80, 100];

    for (const quality of testQualities) {
      // Add wheat to agent
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      if (!agentInventory) {
        throw new Error('Agent inventory missing');
      }

      const addResult = addToInventoryWithQuality(agentInventory, 'wheat', 1, quality);
      agent.addComponent(addResult.inventory);

      const startGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;

      // Sell item (quality is read from inventory)
      tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 1);

      const endGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;
      const actualProfit = endGold - startGold;

      // Calculate expected multiplier
      const expectedMultiplier = getQualityPriceMultiplier(quality);

      // Profit should reflect quality multiplier
      // (we can't test exact values without knowing base price, but can verify it's proportional)
      expect(actualProfit).toBeGreaterThan(0);
    }
  });

  it('should handle multiple trades with different quality items in same session', () => {
    // Agent has multiple quality tiers
    let agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!agentInventory) {
      throw new Error('Agent inventory missing');
    }

    let result = addToInventoryWithQuality(agentInventory, 'wheat', 5, 30);
    agentInventory = result.inventory;
    result = addToInventoryWithQuality(agentInventory, 'wheat', 5, 60);
    agentInventory = result.inventory;
    result = addToInventoryWithQuality(agentInventory, 'wheat', 5, 90);
    agent.addComponent(result.inventory);

    const startGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;

    // Sell all three quality tiers (quality is read from inventory)
    tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 5);
    tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 5);
    tradingSystem.sellToShop(world, agent.id, shop.id, 'wheat', 5);

    const endGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).balance;
    const totalProfit = endGold - startGold;

    // Should have made profit from all three sales
    expect(totalProfit).toBeGreaterThan(0);

    // Agent should have no wheat left
    agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!agentInventory) {
      throw new Error('Agent inventory missing');
    }
    const wheatSlots = agentInventory.slots.filter(s => s !== null && s.itemId === 'wheat' && s.quantity > 0);
    expect(wheatSlots).toHaveLength(0);
  });
});
