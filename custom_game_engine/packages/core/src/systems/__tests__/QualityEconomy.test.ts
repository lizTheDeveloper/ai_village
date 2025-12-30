import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, type Entity } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { TradingSystem } from '../TradingSystem';
import { ComponentType } from '../../types/ComponentType.js';
import {
  createInventoryComponent,
  addToInventoryWithQuality,
  addToInventory,
  type InventoryComponent
} from '../../components/InventoryComponent';
import { createShopComponent, type ShopComponent } from '../../components/ShopComponent';
import { createCurrencyComponent, type CurrencyComponent } from '../../components/CurrencyComponent';
import { createPositionComponent } from '../../components/PositionComponent';

describe.skip('Quality Economy Integration', () => {
  let world: WorldImpl;
  let tradingSystem: TradingSystem;
  let agent: Entity;
  let shop: Entity;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    tradingSystem = new TradingSystem();

    // Create agent with inventory and currency
    agent = world.createEntity();
    const agentInventory = createInventoryComponent(24);
    agent.addComponent(agentInventory);
    agent.addComponent(createCurrencyComponent(1000)); // 1000 gold starting
    agent.addComponent(createPositionComponent(10, 10));

    // Create shop
    shop = world.createEntity();
    const shopComponent = createShopComponent();
    shop.addComponent(shopComponent);
    shop.addComponent(createPositionComponent(10, 10)); // Same position as agent

    // Stock shop with base items
    const shopInventory = createInventoryComponent(100);
    const addResult = addToInventoryWithQuality(shopInventory, 'wheat', 50, 50); // Normal quality
    shop.addComponent(addResult.inventory);
  });

  describe('Criterion 3: Quality Affects Economic Value', () => {
    it('should calculate 0.5x price multiplier for quality 0', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 0);
      agent.addComponent(result.inventory);

      // Base value for wheat: assume 10 gold
      const baseValue = 10;
      const expectedPrice = baseValue * 0.5; // 0.5x multiplier

      // Sell to shop
      const tradeResult = tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 0);

      expect(tradeResult.success).toBe(true);

      // Check agent received correct payment
      const currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
      expect(currency.gold).toBe(1000 + expectedPrice * 10); // 1000 starting + (5 * 10 wheat)
    });

    it('should calculate 0.8x price multiplier for quality 20 (poor)', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 20);
      agent.addComponent(result.inventory);

      const baseValue = 10;
      const expectedMultiplier = 0.5 + (20 / 100) * 1.5; // 0.8x
      const expectedPrice = baseValue * expectedMultiplier;

      const tradeResult = tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 20);

      expect(tradeResult.success).toBe(true);

      const currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
      expect(currency.gold).toBeCloseTo(1000 + expectedPrice * 10, 1);
    });

    it('should calculate 1.0x price multiplier for quality 33 (normal)', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 33);
      agent.addComponent(result.inventory);

      const baseValue = 10;
      const expectedMultiplier = 0.5 + (33 / 100) * 1.5; // ~1.0x
      const expectedPrice = baseValue * expectedMultiplier;

      const tradeResult = tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 33);

      expect(tradeResult.success).toBe(true);

      const currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
      expect(currency.gold).toBeCloseTo(1000 + expectedPrice * 10, 1);
    });

    it('should calculate 2.0x price multiplier for quality 100 (legendary)', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 100);
      agent.addComponent(result.inventory);

      const baseValue = 10;
      const expectedMultiplier = 0.5 + (100 / 100) * 1.5; // 2.0x
      const expectedPrice = baseValue * expectedMultiplier;

      const tradeResult = tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 100);

      expect(tradeResult.success).toBe(true);

      const currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
      expect(currency.gold).toBe(1000 + expectedPrice * 10);
    });

    it('should apply quality multiplier when buying from shop', () => {
      const shopInventory = shop.getComponent(ComponentType.Inventory) as InventoryComponent;

      // Stock shop with high quality item
      const result = addToInventoryWithQuality(shopInventory, 'sword', 1, 90); // Masterwork sword
      shop.addComponent(result.inventory);

      const baseValue = 100;
      const expectedMultiplier = 0.5 + (90 / 100) * 1.5; // 1.85x
      const expectedPrice = baseValue * expectedMultiplier;

      const tradeResult = tradingSystem.buyItem(world, agent.id, shop.id, 'sword', 1, 90);

      expect(tradeResult.success).toBe(true);

      const currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
      expect(currency.gold).toBeCloseTo(1000 - expectedPrice, 1);
    });

    it('should combine quality multiplier with rarity and demand', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;

      // Assume rare item with high demand
      const result = addToInventoryWithQuality(agentInventory, 'diamond', 1, 85);
      agent.addComponent(result.inventory);

      // Base value: 500
      // Quality multiplier: 0.5 + (85/100) * 1.5 = 1.775x
      // Rarity multiplier: 3x (rare)
      // Demand multiplier: 1.5x (high demand)
      // Supply multiplier: 1.2x (low supply)
      // Final: 500 * 1.775 * 3 * 1.5 * 1.2

      const tradeResult = tradingSystem.sellItem(world, agent.id, shop.id, 'diamond', 1, 85);

      expect(tradeResult.success).toBe(true);

      // Verify price was calculated with quality multiplier
      const currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
      expect(currency.gold).toBeGreaterThan(1000); // Should have gained money
    });

    it('should handle quality differences when trading same item type', () => {
      let agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;

      // Add poor and legendary wheat
      let result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 20); // Poor
      agentInventory = result.inventory;
      result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 100); // Legendary
      agent.addComponent(result.inventory);

      // Sell poor quality
      const result1 = tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 20);
      const goldAfterPoor = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).gold;

      // Sell legendary quality
      const result2 = tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 100);
      const goldAfterLegendary = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).gold;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Legendary should sell for 2.5x more than poor (2.0 / 0.8)
      const poorProfit = goldAfterPoor - 1000;
      const legendaryProfit = goldAfterLegendary - goldAfterPoor;

      expect(legendaryProfit).toBeGreaterThan(poorProfit * 2);
    });
  });

  describe('Edge Cases - Quality Economy', () => {
    it('should throw when trying to sell item without quality specified', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 50);
      agent.addComponent(result.inventory);

      // Try to sell without specifying quality
      expect(() => {
        tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, undefined as any);
      }).toThrow('Quality must be specified for trading');
    });

    it('should throw when trying to sell item with quality not in inventory', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 50);
      agent.addComponent(result.inventory);

      // Try to sell different quality
      expect(() => {
        tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 80);
      }).toThrow('Item with specified quality not found in inventory');
    });

    it('should handle insufficient funds when buying high quality items', () => {
      // Set agent to low gold
      let currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
      currency = { ...currency, gold: 10 };
      agent.addComponent(currency);

      const shopInventory = shop.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(shopInventory, 'diamond', 1, 100);
      shop.addComponent(result.inventory);

      const tradeResult = tradingSystem.buyItem(world, agent.id, shop.id, 'diamond', 1, 100);

      expect(tradeResult.success).toBe(false);
      expect(tradeResult.reason).toContain('insufficient funds');
    });

    it('should handle shop not having item with specified quality', () => {
      const shopInventory = shop.getComponent(ComponentType.Inventory) as InventoryComponent;
      const result = addToInventoryWithQuality(shopInventory, 'wheat', 10, 50);
      shop.addComponent(result.inventory);

      // Try to buy quality not in shop
      const tradeResult = tradingSystem.buyItem(world, agent.id, shop.id, 'wheat', 10, 80);

      expect(tradeResult.success).toBe(false);
      expect(tradeResult.reason).toContain('Shop does not have item with specified quality');
    });

    it('should handle legacy items with undefined quality as default', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      if (!agentInventory) {
        throw new Error('Agent inventory is undefined - test setup failed');
      }

      // Add item without quality (legacy)
      const result = addToInventory(agentInventory, 'wheat', 10);
      agent.addComponent(result.inventory);

      // Should treat as default quality (50) when selling
      const tradeResult = tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 50);

      expect(tradeResult.success).toBe(true);
    });
  });

  describe('Performance - Quality Economy', () => {
    it('should calculate quality price multiplier quickly', () => {
      const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      if (!agentInventory) {
        throw new Error('Agent inventory is undefined - test setup failed');
      }
      const result = addToInventoryWithQuality(agentInventory, 'wheat', 100, 75);
      agent.addComponent(result.inventory);

      const startTime = performance.now();

      tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 100, 75);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 5ms
      expect(duration).toBeLessThan(5);
    });

    it('should handle bulk transactions with quality efficiently', () => {
      let agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      if (!agentInventory) {
        throw new Error('Agent inventory is undefined - test setup failed');
      }

      // Add 20 different quality stacks
      for (let i = 0; i < 20; i++) {
        const result = addToInventoryWithQuality(agentInventory, 'wheat', 10, 40 + i);
        agentInventory = result.inventory;
      }
      agent.addComponent(agentInventory);

      const startTime = performance.now();

      // Sell all stacks
      for (let i = 0; i < 20; i++) {
        tradingSystem.sellItem(world, agent.id, shop.id, 'wheat', 10, 40 + i);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 20ms
      expect(duration).toBeLessThan(20);
    });
  });

  describe('Price Calculation Verification', () => {
    it('should match exact quality multiplier formula', () => {
      // Test various quality levels
      const testCases = [
        { quality: 0, expectedMultiplier: 0.5 },
        { quality: 10, expectedMultiplier: 0.65 },
        { quality: 25, expectedMultiplier: 0.875 },
        { quality: 33, expectedMultiplier: 0.995 },
        { quality: 50, expectedMultiplier: 1.25 },
        { quality: 67, expectedMultiplier: 1.505 },
        { quality: 75, expectedMultiplier: 1.625 },
        { quality: 85, expectedMultiplier: 1.775 },
        { quality: 90, expectedMultiplier: 1.85 },
        { quality: 95, expectedMultiplier: 1.925 },
        { quality: 100, expectedMultiplier: 2.0 },
      ];

      for (const testCase of testCases) {
        const agentInventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
        if (!agentInventory) {
          throw new Error('Agent inventory is undefined - test setup failed');
        }
        const result = addToInventoryWithQuality(agentInventory, 'test_item', 1, testCase.quality);
        agent.addComponent(result.inventory);

        const startingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).gold;

        tradingSystem.sellItem(world, agent.id, shop.id, 'test_item', 1, testCase.quality);

        const endingGold = (agent.getComponent(ComponentType.Currency) as CurrencyComponent).gold;
        const actualMultiplier = (endingGold - startingGold) / 10; // Assuming base value is 10

        expect(actualMultiplier).toBeCloseTo(testCase.expectedMultiplier, 2);

        // Reset for next test
        let currency = agent.getComponent(ComponentType.Currency) as CurrencyComponent;
        currency = { ...currency, gold: 1000 };
        agent.addComponent(currency);
      }
    });
  });
});
