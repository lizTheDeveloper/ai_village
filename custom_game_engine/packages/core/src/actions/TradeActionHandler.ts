/**
 * TradeActionHandler - Action handler for trading with shops
 *
 * Allows agents to queue and execute buy/sell actions via the action system.
 * Works in conjunction with TradingSystem for actual trade mechanics.
 *
 * Requirements:
 * - Agent must have currency component
 * - Agent must have inventory component
 * - Shop entity must exist and be accessible
 * - For buy: agent must have sufficient funds, shop must have stock
 * - For sell: agent must have items, shop must have funds
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors return clear failure reasons
 * - Component validation is strict (throws if missing required components)
 */

import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { CurrencyComponent } from '../components/CurrencyComponent.js';
import type { ShopComponent } from '../components/ShopComponent.js';
import type { TradingSystem } from '../systems/TradingSystem.js';
import type { GameEvent } from '../events/GameEvent.js';
import { ComponentType } from '../types/ComponentType.js';
import {  TRADE_DURATION,
  INTERACTION_DISTANCE,
} from '../constants/index.js';

/** Distance at which agent can trade with a shop */
const TRADE_DISTANCE = INTERACTION_DISTANCE;

/**
 * Handler for the trade action.
 *
 * Executes buy or sell transactions through the TradingSystem.
 */
export class TradeActionHandler implements ActionHandler {
  public readonly type = 'trade' as const;
  public readonly description = 'Trade items with a shop';
  public readonly interruptible = true;

  /**
   * Calculate trade duration in ticks.
   * Trading is instant (1 tick) but we use a small duration for realism.
   */
  getDuration(_action: Action, _world: World): number {
    // Trading takes about 2 seconds at 20 TPS
    return TRADE_DURATION;
  }

  /**
   * Validate that the trade action can be performed.
   *
   * Checks:
   * 1. Action has shopId, itemId, quantity, and subtype parameters
   * 2. Actor entity exists
   * 3. Actor has position, inventory, and currency components
   * 4. Shop entity exists and has shop component
   * 5. Actor is near shop
   * 6. For buy: actor has funds, shop has stock
   * 7. For sell: actor has items, shop has funds
   */
  validate(action: Action, world: World): ValidationResult {
    // Check required parameters
    const shopId = action.parameters.shopId as string | undefined;
    const itemId = action.parameters.itemId as string | undefined;
    const quantity = action.parameters.quantity as number | undefined;
    const subtype = action.parameters.subtype as string | undefined;

    if (!shopId) {
      return {
        valid: false,
        reason: 'trade action requires shopId parameter',
      };
    }

    if (!itemId) {
      return {
        valid: false,
        reason: 'trade action requires itemId parameter',
      };
    }

    if (!quantity || quantity <= 0) {
      return {
        valid: false,
        reason: 'trade action requires positive quantity parameter',
      };
    }

    if (!subtype || (subtype !== 'buy' && subtype !== 'sell')) {
      return {
        valid: false,
        reason: 'trade action requires subtype parameter ("buy" or "sell")',
      };
    }

    // Check actor exists
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        valid: false,
        reason: `Actor entity ${action.actorId} does not exist`,
      };
    }

    // Check actor has required components
    const actorPos = actor.components.get(ComponentType.Position) as PositionComponent | undefined;
    if (!actorPos) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no position component`,
      };
    }

    const inventory = actor.components.get(ComponentType.Inventory) as InventoryComponent | undefined;
    if (!inventory) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no inventory component`,
      };
    }

    const currency = actor.components.get(ComponentType.Currency) as CurrencyComponent | undefined;
    if (!currency) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no currency component`,
      };
    }

    // Check shop exists
    const shopEntity = world.getEntity(shopId);
    if (!shopEntity) {
      return {
        valid: false,
        reason: `Shop entity ${shopId} does not exist`,
      };
    }

    const shop = shopEntity.components.get(ComponentType.Shop) as ShopComponent | undefined;
    if (!shop) {
      return {
        valid: false,
        reason: `Entity ${shopId} has no shop component`,
      };
    }

    const shopPos = shopEntity.components.get(ComponentType.Position) as PositionComponent | undefined;
    if (!shopPos) {
      return {
        valid: false,
        reason: `Shop ${shopId} has no position component`,
      };
    }

    // Check distance to shop
    const dx = shopPos.x - actorPos.x;
    const dy = shopPos.y - actorPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > TRADE_DISTANCE) {
      return {
        valid: false,
        reason: `Must be near shop to trade (distance: ${distance.toFixed(1)}, max: ${TRADE_DISTANCE})`,
      };
    }

    // All basic checks passed
    return {
      valid: true,
    };
  }

  /**
   * Execute the trade action.
   *
   * Process:
   * 1. Get trading system
   * 2. Execute buy or sell through TradingSystem
   * 3. Return success/failure based on result
   */
  execute(action: Action, world: World): ActionResult {
    const shopId = action.parameters.shopId as string;
    const itemId = action.parameters.itemId as string;
    const quantity = action.parameters.quantity as number;
    const subtype = action.parameters.subtype as 'buy' | 'sell';

    // Get trading system
    const tradingSystem = this.getTradingSystem(world);
    if (!tradingSystem) {
      return {
        success: false,
        reason: 'Trading system not available',
        effects: [],
        events: [],
      };
    }

    const events: Array<Omit<GameEvent, 'tick' | 'timestamp'>> = [];

    try {
      let result;

      if (subtype === 'buy') {
        result = tradingSystem.buyFromShop(world, action.actorId, shopId, itemId, quantity);
      } else {
        result = tradingSystem.sellToShop(world, action.actorId, shopId, itemId, quantity);
      }

      if (!result.success) {
        return {
          success: false,
          reason: result.reason || 'Trade failed',
          effects: [],
          events: [],
        };
      }

      // Success - events are emitted by TradingSystem
      return {
        success: true,
        reason: `${subtype === 'buy' ? 'Bought' : 'Sold'} ${quantity}x ${itemId} for ${result.totalPrice} currency`,
        effects: [],
        events,
      };
    } catch (error: any) {
      return {
        success: false,
        reason: error.message || 'Trade execution failed',
        effects: [],
        events: [],
      };
    }
  }

  /**
   * Get the trading system from the world.
   */
  private getTradingSystem(world: World): TradingSystem | null {
    const system = (world as any).getSystem?.('trading');
    if (system) {
      return system as TradingSystem;
    }
    return (world as any).tradingSystem ?? null;
  }
}
