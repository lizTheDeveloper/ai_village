import { describe, it, expect, beforeEach } from 'vitest';
import { RingBuffer } from '../RingBuffer.js';

describe('RingBuffer', () => {
  describe('constructor', () => {
    it('creates a buffer with the specified capacity', () => {
      const buffer = new RingBuffer<number>(10);
      expect(buffer.getCapacity()).toBe(10);
      expect(buffer.size()).toBe(0);
    });

    it('throws error for capacity less than 1', () => {
      expect(() => new RingBuffer<number>(0)).toThrow('RingBuffer capacity must be at least 1');
      expect(() => new RingBuffer<number>(-1)).toThrow('RingBuffer capacity must be at least 1');
    });
  });

  describe('push', () => {
    it('adds items to the buffer', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.size()).toBe(3);
      expect(buffer.getAll()).toEqual([1, 2, 3]);
    });

    it('overwrites oldest items when capacity is exceeded', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.size()).toBe(3);
      expect(buffer.getAll()).toEqual([3, 4, 5]);
    });

    it('handles single-item capacity', () => {
      const buffer = new RingBuffer<string>(1);
      buffer.push('a');
      expect(buffer.getAll()).toEqual(['a']);
      buffer.push('b');
      expect(buffer.getAll()).toEqual(['b']);
    });
  });

  describe('getRecent', () => {
    let buffer: RingBuffer<number>;

    beforeEach(() => {
      buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
    });

    it('returns the most recent N items in chronological order', () => {
      expect(buffer.getRecent(3)).toEqual([3, 4, 5]);
      expect(buffer.getRecent(1)).toEqual([5]);
      expect(buffer.getRecent(5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns all items if count exceeds buffer size', () => {
      expect(buffer.getRecent(10)).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns empty array for count of 0', () => {
      expect(buffer.getRecent(0)).toEqual([]);
    });

    it('returns empty array for empty buffer', () => {
      const emptyBuffer = new RingBuffer<number>(5);
      expect(emptyBuffer.getRecent(3)).toEqual([]);
    });

    it('handles wrapped buffer correctly', () => {
      // Buffer has wrapped around
      buffer.push(6);
      buffer.push(7);
      expect(buffer.getRecent(3)).toEqual([5, 6, 7]);
      expect(buffer.getRecent(5)).toEqual([3, 4, 5, 6, 7]);
    });
  });

  describe('getAll', () => {
    it('returns all items in chronological order', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.getAll()).toEqual([1, 2, 3]);
    });

    it('returns empty array for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.getAll()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('removes all items from the buffer', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.clear();
      expect(buffer.size()).toBe(0);
      expect(buffer.getAll()).toEqual([]);
      expect(buffer.isEmpty()).toBe(true);
    });

    it('allows adding items after clear', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.clear();
      buffer.push(10);
      buffer.push(20);
      expect(buffer.getAll()).toEqual([10, 20]);
    });
  });

  describe('size', () => {
    it('returns 0 for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.size()).toBe(0);
    });

    it('returns correct count as items are added', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.size()).toBe(0);
      buffer.push(1);
      expect(buffer.size()).toBe(1);
      buffer.push(2);
      expect(buffer.size()).toBe(2);
    });

    it('does not exceed capacity', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.size()).toBe(3);
    });
  });

  describe('isEmpty and isFull', () => {
    it('isEmpty returns true for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.isEmpty()).toBe(true);
    });

    it('isEmpty returns false after adding items', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      expect(buffer.isEmpty()).toBe(false);
    });

    it('isFull returns false for non-full buffer', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      expect(buffer.isFull()).toBe(false);
    });

    it('isFull returns true when buffer reaches capacity', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.isFull()).toBe(true);
    });
  });

  describe('peek', () => {
    it('returns undefined for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.peek()).toBeUndefined();
    });

    it('returns the most recently added item', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.peek()).toBe(3);
    });

    it('does not remove the item', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      expect(buffer.peek()).toBe(1);
      expect(buffer.peek()).toBe(1);
      expect(buffer.size()).toBe(1);
    });
  });

  describe('peekOldest', () => {
    it('returns undefined for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.peekOldest()).toBeUndefined();
    });

    it('returns the oldest item', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.peekOldest()).toBe(1);
    });

    it('returns correct oldest after wrapping', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      expect(buffer.peekOldest()).toBe(2);
    });
  });

  describe('forEach', () => {
    it('iterates over all items in order', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      const results: number[] = [];
      buffer.forEach((item) => results.push(item));
      expect(results).toEqual([1, 2, 3]);
    });

    it('provides correct indices', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      const indices: number[] = [];
      buffer.forEach((_, index) => indices.push(index));
      expect(indices).toEqual([0, 1, 2]);
    });
  });

  describe('filter', () => {
    it('returns items matching the predicate', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.filter((n) => n > 3)).toEqual([4, 5]);
      expect(buffer.filter((n) => n % 2 === 0)).toEqual([2, 4]);
    });

    it('returns empty array if no items match', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      expect(buffer.filter((n) => n > 10)).toEqual([]);
    });
  });

  describe('findRecent', () => {
    it('finds the most recent matching item', () => {
      const buffer = new RingBuffer<{ id: number; value: string }>(5);
      buffer.push({ id: 1, value: 'a' });
      buffer.push({ id: 2, value: 'b' });
      buffer.push({ id: 3, value: 'a' });
      buffer.push({ id: 4, value: 'c' });

      const result = buffer.findRecent((item) => item.value === 'a');
      expect(result).toEqual({ id: 3, value: 'a' });
    });

    it('returns undefined if no match found', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.findRecent((n) => n > 10)).toBeUndefined();
    });

    it('returns undefined for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.findRecent((n) => n > 0)).toBeUndefined();
    });
  });

  describe('generic type support', () => {
    it('works with objects', () => {
      interface Event {
        type: string;
        timestamp: number;
      }
      const buffer = new RingBuffer<Event>(3);
      buffer.push({ type: 'click', timestamp: 100 });
      buffer.push({ type: 'scroll', timestamp: 200 });
      expect(buffer.getAll()).toEqual([
        { type: 'click', timestamp: 100 },
        { type: 'scroll', timestamp: 200 },
      ]);
    });

    it('works with strings', () => {
      const buffer = new RingBuffer<string>(3);
      buffer.push('hello');
      buffer.push('world');
      expect(buffer.getRecent(1)).toEqual(['world']);
    });
  });
});
