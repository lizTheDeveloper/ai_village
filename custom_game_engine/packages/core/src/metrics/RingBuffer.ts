/**
 * RingBuffer - Fixed-size circular buffer for efficient recent event storage
 *
 * Provides O(1) push and O(n) retrieval of recent items.
 * When capacity is reached, oldest items are overwritten.
 *
 * Part of Phase 22: Sociological Metrics Foundation
 */

/**
 * A generic ring buffer (circular buffer) implementation.
 * Stores the last N items efficiently, automatically overwriting oldest items.
 *
 * @template T The type of items stored in the buffer
 *
 * @example
 * ```typescript
 * const buffer = new RingBuffer<number>(5);
 * buffer.push(1);
 * buffer.push(2);
 * buffer.push(3);
 * buffer.getRecent(2); // [2, 3]
 * buffer.getAll(); // [1, 2, 3]
 * ```
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private readonly capacity: number;
  private writeIndex: number = 0;
  private count: number = 0;

  /**
   * Create a new RingBuffer with the specified capacity.
   *
   * @param capacity Maximum number of items to store
   * @throws Error if capacity is less than 1
   */
  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error('RingBuffer capacity must be at least 1');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add an item to the buffer.
   * If the buffer is full, the oldest item is overwritten.
   *
   * @param item The item to add
   */
  push(item: T): void {
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * Get the most recent N items from the buffer.
   * Items are returned in chronological order (oldest first).
   *
   * @param count Number of recent items to retrieve
   * @returns Array of the most recent items (may be fewer if buffer doesn't have that many)
   */
  getRecent(count: number): T[] {
    const actualCount = Math.min(count, this.count);
    if (actualCount === 0) {
      return [];
    }

    const result: T[] = [];
    // Start from (writeIndex - actualCount) and go to writeIndex - 1
    const startIndex = (this.writeIndex - actualCount + this.capacity) % this.capacity;

    for (let i = 0; i < actualCount; i++) {
      const idx = (startIndex + i) % this.capacity;
      result.push(this.buffer[idx] as T);
    }

    return result;
  }

  /**
   * Get all items currently in the buffer.
   * Items are returned in chronological order (oldest first).
   *
   * @returns Array of all items in the buffer
   */
  getAll(): T[] {
    return this.getRecent(this.count);
  }

  /**
   * Clear all items from the buffer.
   */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.writeIndex = 0;
    this.count = 0;
  }

  /**
   * Get the current number of items in the buffer.
   *
   * @returns Number of items currently stored
   */
  size(): number {
    return this.count;
  }

  /**
   * Get the maximum capacity of the buffer.
   *
   * @returns Maximum number of items the buffer can hold
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Check if the buffer is empty.
   *
   * @returns true if the buffer contains no items
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if the buffer is at full capacity.
   *
   * @returns true if the buffer is full
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Get the most recently added item without removing it.
   *
   * @returns The most recent item, or undefined if buffer is empty
   */
  peek(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    const lastIndex = (this.writeIndex - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIndex];
  }

  /**
   * Get the oldest item in the buffer without removing it.
   *
   * @returns The oldest item, or undefined if buffer is empty
   */
  peekOldest(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    if (this.count < this.capacity) {
      return this.buffer[0];
    }
    return this.buffer[this.writeIndex];
  }

  /**
   * Iterate over all items in chronological order.
   *
   * @param callback Function to call for each item
   */
  forEach(callback: (item: T, index: number) => void): void {
    const items = this.getAll();
    items.forEach(callback);
  }

  /**
   * Filter items in the buffer.
   *
   * @param predicate Function to test each item
   * @returns Array of items that pass the test
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Find the first item matching a predicate (searching from newest to oldest).
   *
   * @param predicate Function to test each item
   * @returns The first matching item, or undefined if none found
   */
  findRecent(predicate: (item: T) => boolean): T | undefined {
    // Search from newest to oldest
    for (let i = this.count - 1; i >= 0; i--) {
      const idx = (this.writeIndex - 1 - (this.count - 1 - i) + this.capacity) % this.capacity;
      const item = this.buffer[idx] as T;
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }
}
