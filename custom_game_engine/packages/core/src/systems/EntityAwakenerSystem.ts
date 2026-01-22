import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { SleepComponent } from '../components/SleepComponent.js';

/**
 * Entity Awakener System - Event-driven entity activation.
 *
 * Inspired by Factorio's sleeping inserters - most entities spend most time doing nothing.
 * Wake them only when:
 * 1. Scheduled time arrives (plants grow once per day)
 * 2. Subscribed event fires (inventory changed, damaged)
 * 3. Entity is always-active (agents without sleep component)
 *
 * **Performance impact:**
 * - Before: 1000 plants + 100 agents + 50 buildings = ~250 active entities/tick
 * - After: ~10-30 active entities/tick (90% reduction)
 *
 * **Priority:** 5 (very early) - runs before other systems to filter entities.
 *
 * **Integration:**
 * Systems check `awakener.isActive(entityId)` before processing entities with sleep components.
 *
 * See: /openspec/specs/EVENT_DRIVEN_ENTITIES.md
 */
export class EntityAwakenerSystem implements System {
  readonly id = 'EntityAwakenerSystem';
  readonly priority = 5; // Very early - before other systems
  readonly requiredComponents = []; // Processes all entities

  readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Event-driven entity activation - wakes entities on schedule or events',
    readsComponents: ['sleep' as const],
    writesComponents: ['sleep' as const],
  };

  /**
   * Wake queue: entity ID -> wake tick.
   * Sorted by wake tick (earliest first).
   */
  private wakeQueue = new Map<string, number>();

  /**
   * Event subscriptions: event type -> entity IDs.
   */
  private eventSubscriptions = new Map<string, Set<string>>();

  /**
   * Entities active this tick (passed to other systems).
   */
  private activeThisTick = new Set<string>();

  /**
   * Event bus for listening to game events.
   */
  private eventBus?: EventBus;

  initialize(world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, entities: ReadonlyArray<Entity>): void {
    this.activeThisTick.clear();

    // 1. Wake scheduled entities
    this.processWakeQueue(world);

    // 2. Process any fired events from last tick
    // Note: World.eventBus doesn't expose getEventsLastTick() - we'll use event listeners instead
    // For now, events trigger wakeEntity() directly via subscribeToEvent callbacks

    // 3. Mark always-active entities (entities without sleep component)
    for (const entity of entities) {
      const sleep = entity.getComponent<SleepComponent>('sleep');
      if (!sleep) {
        // No sleep component = always active
        this.activeThisTick.add(entity.id);
      } else if (sleep.state === 'active') {
        // Explicit active state
        this.activeThisTick.add(entity.id);
      }
    }
  }

  /**
   * Process wake queue - wake entities whose wake_tick has arrived.
   */
  private processWakeQueue(world: World): void {
    const currentTick = world.tick;
    const toWake: string[] = [];

    // Find entities ready to wake
    this.wakeQueue.forEach((wakeTick, entityId) => {
      if (wakeTick <= currentTick) {
        toWake.push(entityId);
      }
    });

    // Wake entities and remove from queue
    for (const entityId of toWake) {
      this.wakeEntity(world, entityId, 'scheduled');
      this.wakeQueue.delete(entityId);
    }
  }

  /**
   * Wake an entity and mark it active this tick.
   */
  private wakeEntity(world: World, entityId: string, reason: 'scheduled' | 'event'): void {
    const entity = world.getEntity(entityId);
    if (!entity) return;

    const sleep = entity.getComponent<SleepComponent>('sleep');
    if (sleep) {
      sleep.accumulated_delta = world.tick - sleep.last_processed_tick;
      sleep.state = 'active';
    }

    this.activeThisTick.add(entityId);
  }

  /**
   * Schedule entity to wake at future tick.
   * Internal method - use sleepUntil() to put entity to sleep.
   */
  scheduleWake(entityId: string, wakeTick: number): void {
    this.wakeQueue.set(entityId, wakeTick);
  }

  /**
   * Subscribe entity to wake on event.
   * Internal method - use sleepUntilEvent() to put entity to sleep.
   */
  subscribeToEvent(entityId: string, eventType: string): void {
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }
    this.eventSubscriptions.get(eventType)!.add(entityId);

    // Subscribe to event bus if available
    if (this.eventBus) {
      // Note: EventBus.on() requires a callback - we'll wake entities when events fire
      // This would require extending EventBus to support wildcard event listeners
      // For now, systems must call wakeOnEvent() directly when emitting events
    }
  }

  /**
   * Wake entities subscribed to an event.
   * Call this when emitting events that should wake sleeping entities.
   */
  wakeOnEvent(world: World, eventType: string): void {
    const subscribers = this.eventSubscriptions.get(eventType);
    if (subscribers) {
      for (const entityId of subscribers) {
        this.wakeEntity(world, entityId, 'event');
      }
    }
  }

  /**
   * Put entity to sleep until scheduled time.
   * Entity will wake at wakeTick and be marked active.
   */
  sleepUntil(world: World, entityId: string, wakeTick: number): void {
    const entity = world.getEntity(entityId);
    const sleep = entity?.getComponent<SleepComponent>('sleep');
    if (sleep) {
      sleep.state = 'scheduled';
      sleep.wake_tick = wakeTick;
      sleep.last_processed_tick = world.tick;
      this.scheduleWake(entityId, wakeTick);
    }
  }

  /**
   * Put entity to sleep until event.
   * Entity will wake when any of the specified events fire.
   */
  sleepUntilEvent(world: World, entityId: string, events: string[]): void {
    const entity = world.getEntity(entityId);
    const sleep = entity?.getComponent<SleepComponent>('sleep');
    if (sleep) {
      sleep.state = 'waiting';
      sleep.wake_events = events;
      sleep.last_processed_tick = world.tick;
      events.forEach(e => this.subscribeToEvent(entityId, e));
    }
  }

  /**
   * Check if entity is active this tick.
   * Systems should check this before processing entities with sleep components.
   */
  isActive(entityId: string): boolean {
    return this.activeThisTick.has(entityId);
  }

  cleanup(): void {
    this.wakeQueue.clear();
    this.eventSubscriptions.clear();
    this.activeThisTick.clear();
  }
}
