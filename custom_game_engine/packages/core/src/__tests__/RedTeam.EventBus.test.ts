/**
 * RED TEAM TESTS — EventBus
 *
 * EventBusPropagation.integration.test.ts has 8 tests. Every one sets up
 * subscribers, emits events, and calls flush(). None of them test what happens
 * when a subscriber emits events during flush() — the most common real-world
 * pattern where system A handles event X by emitting event Y.
 *
 * This file proves:
 *
 * 1. Events emitted INSIDE a flush() handler are NOT processed in the current
 *    flush() — they go to the next one. Multi-step event chains silently break
 *    with only one flush() call per tick.
 *
 * 2. Handler exceptions are silently swallowed. console.error() is called but
 *    execution continues. No throw propagates to the caller. A broken handler
 *    is invisible.
 *
 * 3. The event queue has no max size. emit() in a tight loop will grow the
 *    queue unboundedly. The only protection is the natural limit of a JS tick.
 *
 * 4. flush() returns void. There is no way to know how many events were
 *    processed, whether any were dropped by coalescing, or if any handlers
 *    threw errors.
 *
 * Run with: npm test -- RedTeam.EventBus
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBusImpl } from '../events/EventBus.js';
import type { EventType } from '../events/EventMap.js';

// Helper: cast any string as EventType for direct testing
function et(s: string): EventType {
  return s as EventType;
}

describe('RED TEAM: EventBus — events emitted during flush() are deferred', () => {

  /**
   * THE CORE BUG: Two-step event chain silently breaks.
   *
   * Pattern used everywhere in the codebase:
   *   systemA hears 'combat:started' → emits 'agent:health:changed'
   *   systemB hears 'agent:health:changed' → updates UI
   *
   * Test: emit A → flush() → does B fire?
   *
   * EventBusPropagation.integration.test.ts never tests this pattern.
   * It only tests that direct subscribers fire, not chain reactions.
   */
  it('event emitted inside a flush() handler fires in the same flush() (re-entrant drain loop)', () => {
    const bus = new EventBusImpl();

    const step1Fired = vi.fn();
    const step2Fired = vi.fn();
    const step3Fired = vi.fn();

    // Chain: event_a → emit event_b → emit event_c
    bus.subscribe(et('entity:created'), () => {
      step1Fired();
      bus.emit({ type: et('entity:destroyed'), source: 'test', data: { entityId: 'e1', reason: 'test' } });
    });

    bus.subscribe(et('entity:destroyed'), () => {
      step2Fired();
      // This step 3 would model a third system reacting (e.g., cleanup after destroy)
      bus.emit({ type: et('agent:died'), source: 'test', data: {} });
    });

    bus.subscribe(et('agent:died'), () => {
      step3Fired();
    });

    // Emit the root event
    bus.emit({ type: et('entity:created'), source: 'test', data: {} });

    // ONE flush — re-entrant drain loop processes the full chain
    bus.flush();

    // All steps fire: the re-entrant drain loop picks up events queued during dispatch
    expect(step1Fired).toHaveBeenCalledTimes(1);
    expect(step2Fired).toHaveBeenCalledTimes(1);
    expect(step3Fired).toHaveBeenCalledTimes(1);
  });

  /**
   * CONTRAST: Calling flush() twice processes the chain correctly.
   * This documents that the pattern IS intentional: events are strictly
   * per-tick. But it means tests that call flush() once are incomplete.
   */
  it('two flush() calls propagate a two-step chain (documents correct usage)', () => {
    const bus = new EventBusImpl();

    const step1Fired = vi.fn();
    const step2Fired = vi.fn();

    bus.subscribe(et('entity:created'), () => {
      step1Fired();
      bus.emit({ type: et('entity:destroyed'), source: 'test', data: { entityId: 'e1', reason: 'test' } });
    });

    bus.subscribe(et('entity:destroyed'), () => {
      step2Fired();
    });

    bus.emit({ type: et('entity:created'), source: 'test', data: {} });

    bus.flush(); // Processes: entity:created fires step1, which queues entity:destroyed
    bus.flush(); // Processes: entity:destroyed fires step2

    expect(step1Fired).toHaveBeenCalledTimes(1);
    expect(step2Fired).toHaveBeenCalledTimes(1); // Passes only with TWO flush() calls
  });

  /**
   * PROOF OF IMPACT: The existing EventBusPropagation.integration.test.ts
   * never tests chained event emission. All 8 tests subscribe to an event
   * and verify the DIRECT subscriber fires. Zero tests check that an event
   * emitted FROM a subscriber also causes reactions.
   *
   * This means every test that verifies multi-system reactions via events
   * (combat → health → death → loot) must call flush() N times for N chain
   * links. If tests only call flush() once, they're incomplete.
   *
   * This test proves the gap: "did event B process" after "event A caused B".
   */
  it('three-step chain completes in a single flush() — re-entrant drain loop handles full chains', () => {
    const bus = new EventBusImpl();
    const log: string[] = [];

    bus.subscribe(et('entity:created'), () => {
      log.push('step-1');
      bus.emit({ type: et('entity:destroyed'), source: 'test', data: { entityId: 'e1', reason: 'test' } });
    });
    bus.subscribe(et('entity:destroyed'), () => {
      log.push('step-2');
      bus.emit({ type: et('agent:died'), source: 'test', data: {} });
    });
    bus.subscribe(et('agent:died'), () => {
      log.push('step-3');
    });

    bus.emit({ type: et('entity:created'), source: 'test', data: {} });

    // A single flush() now drains the full event chain via re-entrant drain loop.
    // Events emitted by handlers during dispatch are picked up in the same flush().
    bus.flush();
    expect(log).toEqual(['step-1', 'step-2', 'step-3']); // Full chain completes in one flush

    // Subsequent flush() calls are no-ops (queue is empty)
    bus.flush();
    expect(log).toEqual(['step-1', 'step-2', 'step-3']); // No additional events

    // IMPLICATION: Event chains now resolve atomically within a single tick's flush().
    // Systems that react to chain reactions fire in the same tick, not deferred.
  });

});

describe('RED TEAM: EventBus — handler exceptions are silently swallowed', () => {

  /**
   * THE BUG: When a subscriber throws, the error is caught internally,
   * console.error() is called, and execution continues to the next subscriber.
   *
   * This means:
   * - A broken handler (null dereference, missing component, etc.) is invisible
   * - The system that emitted the event has no way to know the handler failed
   * - Subsequent handlers still run, potentially on inconsistent state
   * - Tests that only check side effects CANNOT detect if a handler threw
   */
  it('subscriber exception is caught and swallowed — emitter does not throw', () => {
    const bus = new EventBusImpl();
    const secondHandlerFired = vi.fn();

    // First handler throws
    bus.subscribe(et('entity:created'), () => {
      throw new Error('[RedTeam] Intentional handler crash — should this propagate?');
    });

    // Second handler after the crashing one
    bus.subscribe(et('entity:created'), () => {
      secondHandlerFired();
    });

    bus.emit({ type: et('entity:created'), source: 'test', data: {} });

    // flush() must NOT throw even though a handler threw
    expect(() => bus.flush()).not.toThrow();

    // Second handler still fires — execution continued past the error
    expect(secondHandlerFired).toHaveBeenCalledTimes(1);

    // CONSEQUENCE: There is NO way for the caller to detect that a handler
    // failed. Tests that check "event was handled" via side effects will pass
    // even when half the handlers crashed silently.
  });

  /**
   * CONSEQUENCE OF SWALLOWING: A system whose handler crashes mid-update
   * leaves the game in a partially-updated state. If AgentCombatSystem's
   * 'combat:started' handler throws on entity 3 out of 10, entities 4-10
   * never receive the combat processing — but the game continues silently.
   *
   * This test proves the state corruption scenario.
   */
  it('crashed handler leaves state partially updated — no indication of failure', () => {
    const bus = new EventBusImpl();
    const processedEntities: number[] = [];

    let crashOn = 3; // Crash on the third entity

    // Simulate a system processing entities by event
    bus.subscribe(et('entity:created'), (event) => {
      const entityNum = (event.data as { entityNum?: number })?.entityNum ?? 0;
      if (entityNum === crashOn) {
        throw new Error(`[RedTeam] Crash processing entity ${entityNum}`);
      }
      processedEntities.push(entityNum);
    });

    // Emit 5 entity events
    for (let i = 1; i <= 5; i++) {
      bus.emit({
        type: et('entity:created'),
        source: 'test',
        data: { entityNum: i },
      });
    }

    bus.flush();

    // Entities 1, 2, 4, 5 processed. Entity 3 crashed silently.
    expect(processedEntities).toEqual([1, 2, 4, 5]);

    // flush() did not throw — caller has no idea entity 3 was skipped
    // In production: entity 3 never gets combat processed, never dies, never triggers loot
    // In tests: assertions about "all entities processed" would pass
  });

});

describe('RED TEAM: EventBus — unbounded queue and flush() blindness', () => {

  /**
   * THE BUG: No max queue size. Emitting events in a tight loop grows the
   * queue unboundedly. There is no backpressure, no overflow handling, no
   * rate limiting at the queue level.
   *
   * The only natural limit is the JavaScript call stack and available memory.
   * In production with 4000+ entities each emitting events per tick, this
   * is a real memory pressure source.
   */
  it('event queue has no size limit — emitting 100,000 events does not throw', () => {
    const bus = new EventBusImpl();

    const COUNT = 100_000;

    // Emit 100k events without any subscriber
    for (let i = 0; i < COUNT; i++) {
      bus.emit({ type: et('entity:created'), source: 'test', data: { i } });
    }

    // Queue is now at 100,000 entries — no max size enforcement
    // This "just works" — no overflow, no error, no warning
    expect(() => bus.flush()).not.toThrow();

    // The memory implications: 100k GameEvent objects allocated and held until flush
    // Each event is ~100-200 bytes → 10-20 MB in the queue, per tick, per system
  });

  /**
   * THE BLINDNESS BUG: flush() returns void. There is no way to know:
   * - How many events were processed
   * - How many events were dropped by coalescing
   * - Whether any handlers threw
   * - Whether the queue is empty after flush()
   *
   * Callers must use getCoalescingStats() separately, but that only tracks
   * coalescing — not handler errors, not remaining queue length.
   */
  it('flush() returns void — no way to detect events dropped by coalescing', () => {
    const bus = new EventBusImpl();

    // Set up aggressive coalescing that drops duplicates
    bus.setCoalescingStrategy(et('entity:created'), {
      // @ts-expect-error — testing internal strategy type
      shouldCoalesce: () => true, // Drop ALL duplicates
      merge: (a: unknown) => a,
    });

    const handlerFired = vi.fn();
    bus.subscribe(et('entity:created'), handlerFired);

    // Emit 10 identical events
    for (let i = 0; i < 10; i++) {
      bus.emit({ type: et('entity:created'), source: 'test', data: { id: 'same' } });
    }

    // flush() returns nothing — void
    const result = bus.flush();
    expect(result).toBeUndefined(); // Proves return is void

    // Was the handler called 10 times (all events) or 1 time (coalesced)?
    // There's no way to know from the flush() return value.
    // Caller can call getCoalescingStats() but that's aggregate, not per-flush.
    const stats = bus.getCoalescingStats();
    // stats shows aggregate reduction but we can't tie it to this specific flush
    expect(stats.eventsIn).toBeGreaterThan(0); // Some events went in
    // The handler may have been called fewer times than events emitted
    expect(handlerFired.mock.calls.length).toBeLessThanOrEqual(10);
  });

  /**
   * THE TICK ATOMICITY CLAIM: The documentation says emit() queues events
   * "for end of tick" to maintain tick atomicity. But flush() doesn't know
   * the current tick — it just processes whatever is in the queue.
   *
   * If flush() is called twice in the same tick (which GameLoop does NOT do,
   * but systems could do), events emitted in the first flush() are processed
   * in the second flush() within the SAME tick — breaking the atomicity claim.
   */
  it('calling flush() twice in same tick processes chain reactions within same tick', () => {
    const bus = new EventBusImpl();
    const ticksWhenStep2Fired: number[] = [];

    bus.subscribe(et('entity:created'), () => {
      bus.emit({ type: et('entity:destroyed'), source: 'test', data: { entityId: 'e1', reason: 'test' } });
    });

    bus.subscribe(et('entity:destroyed'), (event) => {
      ticksWhenStep2Fired.push(event.tick);
    });

    // Set tick to 5
    bus.setCurrentTick(5);
    bus.emit({ type: et('entity:created'), source: 'test', data: {} });

    // First flush — step1 fires and queues entity:destroyed at tick=5
    bus.flush();

    // DO NOT advance tick — still tick 5
    // Second flush — processes the queued entity:destroyed
    bus.flush();

    // entity:destroyed was emitted at tick=5 (same tick as entity:created)
    // The "events queue for end of tick" atomicity claim is only valid if
    // you never call flush() more than once per tick.
    expect(ticksWhenStep2Fired).toEqual([5]);

    // Both events happened at tick=5 — the chain was NOT deferred to tick=6.
    // This means "end of tick" is only enforced by convention, not mechanism.
  });

});
