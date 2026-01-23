import { ComponentType } from '../../../types/ComponentType.js';
/**
 * Tests for TradeBehavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../../ecs/World.js';
import { EntityImpl } from '../../../ecs/Entity.js';
import { EventBusImpl } from '../../../events/EventBus.js';
import { TradeBehavior } from '../TradeBehavior.js';
import type { AgentComponent } from '../../../components/AgentComponent.js';
import type { PositionComponent } from '../../../components/PositionComponent.js';
import type { ShopComponent } from '../../../components/ShopComponent.js';
import type { InventoryComponent } from '../../../components/InventoryComponent.js';
import type { CurrencyComponent } from '../../../components/CurrencyComponent.js';

describe('TradeBehavior', () => {
  let world: World;
  let agent: EntityImpl;
  let shop: EntityImpl;
  let behavior: TradeBehavior;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);
    behavior = new TradeBehavior();

    // Create agent entity
    agent = new EntityImpl('agent-1');
    agent.addComponent<PositionComponent>({
      type: ComponentType.Position,
      x: 0,
      y: 0,
    });
    agent.addComponent<AgentComponent>({
      type: ComponentType.Agent,
      name: 'Test Agent',
      behavior: 'trade',
      behaviorState: {},
      useLLM: false,
      llmCooldown: 0,
      thinkInterval: 60,
      lastThinkTime: 0,
      behaviorCompleted: false,
    });
    agent.addComponent<InventoryComponent>({
      type: ComponentType.Inventory,
      slots: [],
      maxSlots: 10,
      maxWeight: 100,
      currentWeight: 0,
    });
    agent.addComponent<CurrencyComponent>({
      type: ComponentType.Currency,
      balance: 1000,
      transactions: [],
    });
    agent.addComponent({
      type: ComponentType.Movement,
      speed: 1.0,
      velocityX: 0,
      velocityY: 0,
      targetX: 0,
      targetY: 0,
      hasTarget: false,
    });

    // Create shop entity
    shop = new EntityImpl('shop-1');
    shop.addComponent<PositionComponent>({
      type: ComponentType.Position,
      x: 5,
      y: 5,
    });
    shop.addComponent<ShopComponent>({
      type: ComponentType.Shop,
      shopType: 'general',
      ownerId: 'npc-1',
      name: 'Test Shop',
      stock: [
        { itemId: 'wood', quantity: 100, price: 10 },
      ],
      currencyReserve: 0,
      buyMarkup: 1.2,
      sellMarkdown: 0.8,
      haggleEnabled: false,
      openHours: { start: 0, end: 24 },
      daysOpen: [0, 1, 2, 3, 4, 5, 6],
      totalSales: 0,
      totalPurchases: 0,
    });
    shop.addComponent<CurrencyComponent>({
      type: ComponentType.Currency,
      balance: 5000,
      transactions: [],
    });

    world.addEntity(agent);
    world.addEntity(shop);
  });

  describe('validation', () => {
    it('should fail if itemId is missing', () => {
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          quantity: 10,
          tradeType: 'buy',
        },
      }));

      const result = behavior.execute(agent, world);
      expect(result?.complete).toBe(true);
      expect(result?.reason).toContain('No itemId');
    });

    it('should fail if quantity is invalid', () => {
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          itemId: 'wood',
          quantity: 0,
          tradeType: 'buy',
        },
      }));

      const result = behavior.execute(agent, world);
      expect(result?.complete).toBe(true);
      expect(result?.reason).toContain('Invalid quantity');
    });

    it('should fail if tradeType is invalid', () => {
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          itemId: 'wood',
          quantity: 10,
          tradeType: 'invalid',
        },
      }));

      const result = behavior.execute(agent, world);
      expect(result?.complete).toBe(true);
      expect(result?.reason).toContain('Invalid tradeType');
    });
  });

  describe('phase execution', () => {
    it('should start in find_shop phase by default', () => {
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          itemId: 'wood',
          quantity: 10,
          tradeType: 'buy',
        },
      }));

      behavior.execute(agent, world);

      // Should find shop and move to move_to_shop phase
      const agentComp = agent.getComponent(ComponentType.Agent);
      expect(agentComp?.behaviorState?.shopId).toBe('shop-1');
      expect(agentComp?.behaviorState?.phase).toBe('move_to_shop');
    });

    it('should move to shop when in move_to_shop phase', () => {
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          itemId: 'wood',
          quantity: 10,
          tradeType: 'buy',
          shopId: 'shop-1',
          phase: 'move_to_shop',
        },
      }));

      // Far from shop, should still be moving
      behavior.execute(agent, world);

      const agentComp = agent.getComponent(ComponentType.Agent);
      // Should still be in move_to_shop phase until close enough
      expect(agentComp?.behaviorState?.phase).toBe('move_to_shop');
    });

    it('should transition to trading phase when near shop', () => {
      // Move agent next to shop (within TRADE_DISTANCE = 2.0)
      agent.updateComponent<PositionComponent>('position', () => ({
        type: ComponentType.Position,
        x: 5.0,
        y: 6.5,  // Distance = 1.5, which is < 2.0
      }));

      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          itemId: 'wood',
          quantity: 10,
          tradeType: 'buy',
          shopId: 'shop-1',
          phase: 'move_to_shop',
        },
      }));

      behavior.execute(agent, world);

      const agentComp = agent.getComponent(ComponentType.Agent);
      expect(agentComp?.behaviorState?.phase).toBe('trading');
    });
  });

  describe('shop finding', () => {
    it('should find nearest shop for buying', () => {
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          itemId: 'wood',
          quantity: 10,
          tradeType: 'buy',
        },
      }));

      behavior.execute(agent, world);

      const agentComp = agent.getComponent(ComponentType.Agent);
      expect(agentComp?.behaviorState?.shopId).toBe('shop-1');
    });

    it('should fail if no shop has required stock', () => {
      agent.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          itemId: 'stone',  // Shop doesn't have this
          quantity: 10,
          tradeType: 'buy',
        },
      }));

      const result = behavior.execute(agent, world);
      expect(result?.complete).toBe(true);
      expect(result?.reason).toContain('No shop found');
    });
  });

  it('should have correct behavior name', () => {
    expect(behavior.name).toBe('trade');
  });
});
