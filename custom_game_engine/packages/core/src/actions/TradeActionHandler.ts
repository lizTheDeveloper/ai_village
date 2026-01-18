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
    // Check required parameters with type guards
    if (typeof action.parameters.shopId !== 'string') {
      return {
        valid: false,
        reason: 'trade action requires shopId parameter (string)',
      };
    }
    const shopId = action.parameters.shopId;

    if (typeof action.parameters.itemId !== 'string') {
      return {
        valid: false,
        reason: 'trade action requires itemId parameter (string)',
      };
    }
    const itemId = action.parameters.itemId;

    if (typeof action.parameters.quantity !== 'number' || action.parameters.quantity <= 0) {
      return {
        valid: false,
        reason: 'trade action requires positive quantity parameter (number)',
      };
    }
    const quantity = action.parameters.quantity;

    if (
      typeof action.parameters.subtype !== 'string' ||
      (action.parameters.subtype !== 'buy' && action.parameters.subtype !== 'sell')
    ) {
      return {
        valid: false,
        reason: 'trade action requires subtype parameter ("buy" or "sell")',
      };
    }
    const subtype = action.parameters.subtype;

    // Check actor exists
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        valid: false,
        reason: `Actor entity ${action.actorId} does not exist`,
      };
    }

    // Check actor has required components
    const actorPos = actor.getComponent<PositionComponent>(ComponentType.Position);
    if (!actorPos) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no position component`,
      };
    }

    const inventory = actor.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no inventory component`,
      };
    }

    const currency = actor.getComponent<CurrencyComponent>(ComponentType.Currency);
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

    const shop = shopEntity.getComponent<ShopComponent>(ComponentType.Shop);
    if (!shop) {
      return {
        valid: false,
        reason: `Entity ${shopId} has no shop component`,
      };
    }

    const shopPos = shopEntity.getComponent<PositionComponent>(ComponentType.Position);
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
    // Validate parameters with type guards (already validated in validate(), but checked again for safety)
    if (
      typeof action.parameters.shopId !== 'string' ||
      typeof action.parameters.itemId !== 'string' ||
      typeof action.parameters.quantity !== 'number' ||
      (action.parameters.subtype !== 'buy' && action.parameters.subtype !== 'sell')
    ) {
      return {
        success: false,
        reason: 'Invalid parameters for trade action',
        effects: [],
        events: [],
      };
    }

    const shopId = action.parameters.shopId;
    const itemId = action.parameters.itemId;
    const quantity = action.parameters.quantity;
    const subtype = action.parameters.subtype;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Trade execution failed';
      return {
        success: false,
        reason: errorMessage,
        effects: [],
        events: [],
      };
    }
  }

  /**
   * Get the trading system from the world.
   *
   * Uses World.getSystem() which is the standard way to access systems.
   * Type guard ensures we get the correct system type.
   */
  private getTradingSystem(world: World): TradingSystem | null {
    const system = world.getSystem('trading');

    // Type guard: TradingSystem must have buyFromShop and sellToShop methods
    if (
      system &&
      'buyFromShop' in system &&
      typeof system.buyFromShop === 'function' &&
      'sellToShop' in system &&
      typeof system.sellToShop === 'function'
    ) {
      return system as TradingSystem;
    }

    return null;
  }
}
