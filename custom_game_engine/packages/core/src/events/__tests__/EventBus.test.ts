import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBusImpl } from '../EventBus.js';

describe('EventBus', () => {
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    eventBus.setCurrentTick(0);
  });

  it('should subscribe to events', () => {
    const handler = vi.fn();
    eventBus.subscribe('test:event', handler);

    eventBus.emit({
      type: 'test:event',
      source: 'world',
      data: {},
    });

    eventBus.flush();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should subscribe to multiple event types', () => {
    const handler = vi.fn();
    eventBus.subscribe(['test:event1', 'test:event2'], handler);

    eventBus.emit({ type: 'test:event1', source: 'world', data: {} });
    eventBus.emit({ type: 'test:event2', source: 'world', data: {} });
    eventBus.flush();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.subscribe('test:event', handler);

    unsubscribe();

    eventBus.emit({ type: 'test:event', source: 'world', data: {} });
    eventBus.flush();

    expect(handler).not.toHaveBeenCalled();
  });

  it('should emit events with correct tick', () => {
    const handler = vi.fn();
    eventBus.setCurrentTick(42);
    eventBus.subscribe('test:event', handler);

    eventBus.emit({ type: 'test:event', source: 'world', data: {} });
    eventBus.flush();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ tick: 42 })
    );
  });

  it('should emit events immediately', () => {
    const handler = vi.fn();
    eventBus.subscribe('test:event', handler);

    eventBus.emitImmediate({ type: 'test:event', source: 'world', data: {} });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should respect event priority', () => {
    const calls: string[] = [];

    eventBus.subscribe(
      'test:event',
      () => calls.push('high'),
      'high'
    );
    eventBus.subscribe(
      'test:event',
      () => calls.push('low'),
      'low'
    );
    eventBus.subscribe(
      'test:event',
      () => calls.push('normal'),
      'normal'
    );

    eventBus.emit({ type: 'test:event', source: 'world', data: {} });
    eventBus.flush();

    expect(calls).toEqual(['high', 'normal', 'low']);
  });

  it('should store event history', () => {
    eventBus.emit({ type: 'test:event1', source: 'world', data: {} });
    eventBus.emit({ type: 'test:event2', source: 'world', data: {} });
    eventBus.flush();

    const history = eventBus.getHistory();
    expect(history.length).toBe(2);
    expect(history[0]?.type).toBe('test:event1');
    expect(history[1]?.type).toBe('test:event2');
  });

  it('should get history since tick', () => {
    eventBus.setCurrentTick(0);
    eventBus.emit({ type: 'test:event1', source: 'world', data: {} });
    eventBus.flush();

    eventBus.setCurrentTick(10);
    eventBus.emit({ type: 'test:event2', source: 'world', data: {} });
    eventBus.flush();

    const history = eventBus.getHistory(10);
    expect(history.length).toBe(1);
    expect(history[0]?.type).toBe('test:event2');
  });

  it('should prune old history', () => {
    eventBus.setCurrentTick(0);
    eventBus.emit({ type: 'test:event1', source: 'world', data: {} });
    eventBus.flush();

    eventBus.setCurrentTick(10);
    eventBus.emit({ type: 'test:event2', source: 'world', data: {} });
    eventBus.flush();

    eventBus.pruneHistory(10);

    const history = eventBus.getHistory();
    expect(history.length).toBe(1);
    expect(history[0]?.type).toBe('test:event2');
  });

  it('should handle handler errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const goodHandler = vi.fn();

    eventBus.subscribe('test:event', () => {
      throw new Error('Handler error');
    });
    eventBus.subscribe('test:event', goodHandler);

    eventBus.emit({ type: 'test:event', source: 'world', data: {} });
    eventBus.flush();

    expect(goodHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
