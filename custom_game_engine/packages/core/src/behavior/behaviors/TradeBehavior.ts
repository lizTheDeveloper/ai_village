/**
 * TradeBehavior - Agent trading at shops
 *
 * Agent navigates to a shop and executes buy/sell transactions.
 * Handles:
 * - Finding appropriate shop (nearest one that has the item or accepts it)
 * - Navigating to shop
 * - Executing the trade
 * - Completing the behavior
 *
 * Part of Phase 12.5: Trade Behavior implementation.
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { ShopComponent } from '../../components/ShopComponent.js';
import type { TradingSystem } from '../../systems/TradingSystem.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getStockQuantity } from '../../components/ShopComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/** Distance at which agent can trade with a shop */
const TRADE_DISTANCE = 2.0;

/** Maximum distance to search for shops */
const MAX_SHOP_SEARCH_DISTANCE = 50;

/**
 * State stored in agent.behaviorState for trading
 */
interface TradeBehaviorState {
  /** Shop entity ID to trade with */
  shopId?: string;
  /** Item ID to buy or sell */
  itemId?: string;
  /** Quantity to trade */
  quantity?: number;
  /** Trade type: 'buy' or 'sell' */
  tradeType?: 'buy' | 'sell';
  /** Current phase */
  phase?: 'find_shop' | 'move_to_shop' | 'trading' | 'complete';
}

/**
 * TradeBehavior - Navigate to shop and execute trade
 */
export class TradeBehavior extends BaseBehavior {
  readonly name = 'trade' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    if (!position || !agent) {
      return { complete: true, reason: 'Missing required components' };
    }

    // Disable steering so behavior controls movement
    this.disableSteering(entity);

    const state = agent.behaviorState as TradeBehaviorState;

    // Validate required state
    if (!state.itemId) {
      return { complete: true, reason: 'No itemId specified in behaviorState' };
    }

    if (!state.quantity || state.quantity <= 0) {
      return { complete: true, reason: 'Invalid quantity in behaviorState' };
    }

    if (!state.tradeType || (state.tradeType !== 'buy' && state.tradeType !== 'sell')) {
      return { complete: true, reason: 'Invalid tradeType in behaviorState (must be "buy" or "sell")' };
    }

    const phase = state.phase ?? 'find_shop';

    // Execute phase
    switch (phase) {
      case 'find_shop':
        return this.findShop(entity, world, state);

      case 'move_to_shop':
        return this.moveToShop(entity, world, state);

      case 'trading':
        return this.executeTrade(entity, world, state);

      case 'complete':
        this.switchTo(entity, 'idle', {});
        return { complete: true, reason: 'Trade complete' };
    }
  }

  /**
   * Find an appropriate shop for the trade.
   */
  private findShop(
    entity: EntityImpl,
    world: World,
    state: TradeBehaviorState
  ): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;

    // If shopId already specified, validate it and move to next phase
    if (state.shopId) {
      const shop = world.getEntity(state.shopId);
      if (shop && shop.components.has(ComponentType.Shop)) {
        this.updateState(entity, { phase: 'move_to_shop' });
        return;
      }
      // Shop no longer valid, need to find a new one
      this.updateState(entity, { shopId: undefined });
    }

    // Find nearest shop
    const shop = this.findNearestShop(world, position, state);

    if (!shop) {
      // No shop found
      return {
        complete: true,
        reason: `No shop found for ${state.tradeType} ${state.itemId}`
      };
    }

    // Found shop, move to it
    this.updateState(entity, {
      shopId: shop.entityId,
      phase: 'move_to_shop'
    });
  }

  /**
   * Move to the target shop.
   */
  private moveToShop(
    entity: EntityImpl,
    world: World,
    state: TradeBehaviorState
  ): BehaviorResult | void {
    const shopId = state.shopId;
    if (!shopId) {
      // Lost target, restart
      this.updateState(entity, { phase: 'find_shop' });
      return;
    }

    const shopEntity = world.getEntity(shopId);
    if (!shopEntity) {
      // Shop no longer exists
      this.updateState(entity, { phase: 'find_shop', shopId: undefined });
      return;
    }

    const shopPos = shopEntity.components.get(ComponentType.Position) as PositionComponent | undefined;
    if (!shopPos) {
      this.updateState(entity, { phase: 'find_shop', shopId: undefined });
      return;
    }

    // Move toward shop
    const distance = this.moveToward(entity, { x: shopPos.x, y: shopPos.y }, {
      arrivalDistance: TRADE_DISTANCE
    });

    // Check if we've arrived
    if (distance <= TRADE_DISTANCE) {
      this.stopAllMovement(entity);
      this.updateState(entity, { phase: 'trading' });
    }
  }

  /**
   * Execute the trade.
   */
  private executeTrade(
    entity: EntityImpl,
    world: World,
    state: TradeBehaviorState
  ): BehaviorResult | void {
    this.stopAllMovement(entity);

    if (!state.shopId || !state.itemId || !state.quantity || !state.tradeType) {
      return { complete: true, reason: 'Missing trade parameters' };
    }

    // Get trading system
    const tradingSystem = this.getTradingSystem(world);
    if (!tradingSystem) {
      return { complete: true, reason: 'Trading system not available' };
    }

    // Execute trade
    try {
      let result;

      if (state.tradeType === 'buy') {
        result = tradingSystem.buyFromShop(
          world,
          entity.id,
          state.shopId,
          state.itemId,
          state.quantity
        );
      } else {
        result = tradingSystem.sellToShop(
          world,
          entity.id,
          state.shopId,
          state.itemId,
          state.quantity
        );
      }

      if (!result.success) {
        // Trade failed
        return {
          complete: true,
          reason: `Trade failed: ${result.reason || 'Unknown error'}`
        };
      }

      // Trade successful
      this.updateState(entity, { phase: 'complete' });
      return {
        complete: true,
        reason: `Successfully ${state.tradeType === 'buy' ? 'bought' : 'sold'} ${state.quantity}x ${state.itemId}`
      };
    } catch (error) {
      return {
        complete: true,
        reason: `Trade error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Find the nearest shop that can handle this trade.
   * For buy: shop must have stock
   * For sell: shop must accept the item type
   */
  private findNearestShop(
    world: World,
    position: PositionComponent,
    state: TradeBehaviorState
  ): { entityId: string; position: PositionComponent } | null {
    const shops = world
      .query()
      .with(ComponentType.Shop)
      .with(ComponentType.Position)
      .executeEntities();

    let nearest: { entityId: string; position: PositionComponent } | null = null;
    let nearestDistance = Infinity;

    for (const shopEntity of shops) {
      const shopImpl = shopEntity as EntityImpl;
      const shop = shopImpl.getComponent<ShopComponent>(ComponentType.Shop);
      const shopPos = shopImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!shop || !shopPos) continue;

      // Check if shop is suitable for this trade
      if (state.tradeType === 'buy') {
        // For buying, shop must have stock
        const stockQuantity = getStockQuantity(shop, state.itemId!);
        if (stockQuantity < (state.quantity || 1)) {
          continue; // Not enough stock
        }
      }
      // For selling, we assume all shops accept all items (shop will check funds)

      // Calculate distance
      const dx = shopPos.x - position.x;
      const dy = shopPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > MAX_SHOP_SEARCH_DISTANCE) continue;

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { entityId: shopEntity.id, position: shopPos };
      }
    }

    return nearest;
  }

  /**
   * Get the trading system from the world.
   */
  private getTradingSystem(world: World): TradingSystem | null {
    // The trading system should be accessible via world property
    const system = (world as any).getSystem?.('trading');
    if (system) {
      return system as TradingSystem;
    }
    return (world as any).tradingSystem ?? null;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function tradeBehavior(entity: EntityImpl, world: World): void {
  const behavior = new TradeBehavior();
  behavior.execute(entity, world);
}
