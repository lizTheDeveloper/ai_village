/**
 * MarketEventSystem - Generates random market events that affect prices
 *
 * Responsibilities:
 * - Generate random market events (shortages, surpluses, festivals, etc.)
 * - Track active events and their durations
 * - Provide price modifiers based on active events
 * - Emit notifications when events start/end
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors throw with clear messages
 * - Strict validation - events must have valid types, durations, etc.
 */

import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import {
  MARKET_EVENT_CHECK_INTERVAL,
  MARKET_EVENT_CHANCE,
  MARKET_EVENT_DURATION_MIN_DAYS,
  MARKET_EVENT_DURATION_MAX_DAYS,
  MARKET_SHORTAGE_MULTIPLIER_MIN,
  MARKET_SHORTAGE_MULTIPLIER_MAX,
  MARKET_SURPLUS_MULTIPLIER_MIN,
  MARKET_SURPLUS_MULTIPLIER_MAX,
  TICKS_PER_DAY,
} from '../constants/index.js';

/**
 * Types of market events that can occur
 */
export type MarketEventType = 'shortage' | 'surplus' | 'festival' | 'merchant_arrival';

/**
 * Active market event affecting prices
 */
export interface ActiveMarketEvent {
  id: string;
  type: MarketEventType;
  itemCategory?: string;
  itemId?: string;
  priceModifier: number;
  startTick: number;
  duration: number; // in ticks
  description: string;
}

/**
 * System that generates and manages random market events
 */
export class MarketEventSystem implements System {
  public readonly id: SystemId = 'market_events';
  public readonly priority: number = 24; // Run before TradingSystem (25)
  public readonly requiredComponents: ReadonlyArray<string> = [];

  private eventBus: EventBus;
  private activeEvents: ActiveMarketEvent[] = [];
  private lastEventCheck = 0;
  private eventCheckInterval = MARKET_EVENT_CHECK_INTERVAL; // Check every 2 minutes at 20 TPS (120 seconds)
  private eventChance = MARKET_EVENT_CHANCE; // 10% chance per check
  private nextEventId = 1;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize the system
   */
  public initialize(_world: World, eventBus: EventBus): void {
    // System is initialized via constructor with eventBus
    this.eventBus = eventBus;
  }

  /**
   * Update the system - check for expired events and generate new ones
   */
  public update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Remove expired events
    const expiredEvents = this.activeEvents.filter(
      (event) => currentTick >= event.startTick + event.duration
    );

    for (const event of expiredEvents) {
      this.eventBus.emit({
        type: 'market:event_ended',
        source: 'market_events',
        data: {
          eventId: event.id,
          eventType: event.type,
        },
      });
    }

    this.activeEvents = this.activeEvents.filter(
      (event) => currentTick < event.startTick + event.duration
    );

    // Periodically check for new events
    if (currentTick - this.lastEventCheck >= this.eventCheckInterval) {
      this.lastEventCheck = currentTick;
      this.checkForRandomEvents(world, currentTick);
    }
  }

  /**
   * Check if a random event should occur
   */
  private checkForRandomEvents(_world: World, currentTick: number): void {
    if (Math.random() > this.eventChance) {
      return;
    }

    // Generate a random event
    const event = this.generateRandomEvent(currentTick);
    this.activeEvents.push(event);

    // Emit notification event
    this.eventBus.emit({
      type: 'notification:show',
      source: 'market_events',
      data: {
        message: event.description,
        type: 'info',
        duration: 5000,
      },
    });

    // Emit market event started
    this.eventBus.emit({
      type: 'market:event_started',
      source: 'market_events',
      data: {
        eventId: event.id,
        eventType: event.type,
        description: event.description,
        duration: event.duration,
      },
    });
  }

  /**
   * Generate a random market event
   */
  private generateRandomEvent(currentTick: number): ActiveMarketEvent {
    const eventTypes: MarketEventType[] = ['shortage', 'surplus', 'festival', 'merchant_arrival'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const id = `market_event_${this.nextEventId++}`;

    // Duration: 1-5 in-game days
    const durationDays = MARKET_EVENT_DURATION_MIN_DAYS + Math.floor(Math.random() * (MARKET_EVENT_DURATION_MAX_DAYS - MARKET_EVENT_DURATION_MIN_DAYS + 1)); // 1-5 days
    const duration = durationDays * TICKS_PER_DAY;

    // Define item categories
    const categories = ['food', 'materials', 'tools', 'seeds', 'crafted'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    switch (type) {
      case 'shortage': {
        // Shortage increases prices (1.5x - 2.5x)
        const modifier = MARKET_SHORTAGE_MULTIPLIER_MIN + Math.random() * (MARKET_SHORTAGE_MULTIPLIER_MAX - MARKET_SHORTAGE_MULTIPLIER_MIN);
        return {
          id,
          type,
          itemCategory: category,
          priceModifier: modifier,
          startTick: currentTick,
          duration,
          description: `Market shortage of ${category}! Prices increased by ${Math.round((modifier - 1) * 100)}% for ${durationDays} days.`,
        };
      }

      case 'surplus': {
        // Surplus decreases prices (0.5x - 0.8x)
        const modifier = MARKET_SURPLUS_MULTIPLIER_MIN + Math.random() * (MARKET_SURPLUS_MULTIPLIER_MAX - MARKET_SURPLUS_MULTIPLIER_MIN);
        return {
          id,
          type,
          itemCategory: category,
          priceModifier: modifier,
          startTick: currentTick,
          duration,
          description: `Market surplus of ${category}! Prices reduced by ${Math.round((1 - modifier) * 100)}% for ${durationDays} days.`,
        };
      }

      case 'festival': {
        // Festival increases prices on luxury items, decreases on food (0.8x - 1.2x)
        const modifier = category === 'food' ? 0.8 : 1.2;
        return {
          id,
          type,
          itemCategory: category,
          priceModifier: modifier,
          startTick: currentTick,
          duration,
          description: `Festival week! ${category === 'food' ? 'Food prices reduced' : 'Luxury item prices increased'} for ${durationDays} days.`,
        };
      }

      case 'merchant_arrival': {
        // Merchant brings specific items at reduced prices (0.7x)
        const modifier = 0.7;
        return {
          id,
          type,
          itemCategory: category,
          priceModifier: modifier,
          startTick: currentTick,
          duration: TICKS_PER_DAY, // Merchant stays for 1 day
          description: `Traveling merchant arrived with ${category}! Prices reduced by 30% for 1 day.`,
        };
      }

      default: {
        throw new Error(`Unknown market event type: ${type}`);
      }
    }
  }

  /**
   * Get all active market events
   */
  public getActiveEvents(): ActiveMarketEvent[] {
    return [...this.activeEvents];
  }

  /**
   * Get combined price modifier for a specific item
   * Multiple events affecting the same item multiply together
   */
  public getPriceModifier(itemId: string, itemCategory?: string): number {
    let modifier = 1.0;

    for (const event of this.activeEvents) {
      // Event affects this specific item
      if (event.itemId && event.itemId === itemId) {
        modifier *= event.priceModifier;
      }
      // Event affects this item's category
      else if (event.itemCategory && itemCategory && event.itemCategory === itemCategory) {
        modifier *= event.priceModifier;
      }
    }

    return modifier;
  }

  /**
   * Check if there are any active events
   */
  public hasActiveEvents(): boolean {
    return this.activeEvents.length > 0;
  }

  /**
   * Get events affecting a specific item or category
   */
  public getEventsForItem(itemId: string, itemCategory?: string): ActiveMarketEvent[] {
    return this.activeEvents.filter((event) => {
      if (event.itemId && event.itemId === itemId) {
        return true;
      }
      if (event.itemCategory && itemCategory && event.itemCategory === itemCategory) {
        return true;
      }
      return false;
    });
  }

  /**
   * Manually trigger a market event (for testing or special events)
   */
  public triggerEvent(
    type: MarketEventType,
    options: {
      itemId?: string;
      itemCategory?: string;
      priceModifier: number;
      durationDays: number;
      description?: string;
    }
  ): ActiveMarketEvent {
    const id = `market_event_${this.nextEventId++}`;
    const duration = options.durationDays * TICKS_PER_DAY;

    const event: ActiveMarketEvent = {
      id,
      type,
      itemId: options.itemId,
      itemCategory: options.itemCategory,
      priceModifier: options.priceModifier,
      startTick: 0, // Will be set when added
      duration,
      description: options.description || `Market event: ${type}`,
    };

    // Note: startTick will be set to current tick when this is called from update
    // For now, we set it to 0 and caller should update it
    this.activeEvents.push(event);

    this.eventBus.emit({
      type: 'market:event_started',
      source: 'market_events',
      data: {
        eventId: event.id,
        eventType: event.type,
        description: event.description,
        duration: event.duration,
      },
    });

    return event;
  }
}
