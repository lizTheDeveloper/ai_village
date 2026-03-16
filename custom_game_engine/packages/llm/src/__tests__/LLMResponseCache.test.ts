import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LLMResponseCache } from '../LLMResponseCache';

describe('LLMResponseCache', () => {
  let cache: LLMResponseCache;

  beforeEach(() => {
    // Use a fresh instance for each test by accessing the private constructor via getInstance
    // but clearing state each time
    cache = LLMResponseCache.getInstance();
    cache.clear();
    cache.setEnabled(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('hashPrompt', () => {
    it('produces consistent hashes for the same input', () => {
      const hash1 = cache.hashPrompt('hello world');
      const hash2 = cache.hashPrompt('hello world');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = cache.hashPrompt('prompt A');
      const hash2 = cache.hashPrompt('prompt B');
      expect(hash1).not.toBe(hash2);
    });

    it('returns an 8-char hex string', () => {
      const hash = cache.hashPrompt('test');
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('handles empty string', () => {
      const hash = cache.hashPrompt('');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('set and get', () => {
    it('stores and retrieves a response within TTL', () => {
      vi.useFakeTimers();
      const hash = cache.hashPrompt('my prompt');
      cache.set(hash, '{"action":"gather"}', 'executor');

      // Immediately retrieve - should be present
      const result = cache.get(hash);
      expect(result).toBe('{"action":"gather"}');
    });

    it('returns null for unknown keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('returns null after TTL expires', () => {
      vi.useFakeTimers();
      const hash = cache.hashPrompt('expiring prompt');
      cache.set(hash, 'response', 'autonomic'); // autonomic TTL = 5000ms

      vi.advanceTimersByTime(5001);
      expect(cache.get(hash)).toBeNull();
    });

    it('returns value before TTL expires', () => {
      vi.useFakeTimers();
      const hash = cache.hashPrompt('valid prompt');
      cache.set(hash, 'response', 'executor'); // executor TTL = 60000ms

      vi.advanceTimersByTime(59999);
      expect(cache.get(hash)).toBe('response');
    });

    it('uses default TTL for unknown layers', () => {
      vi.useFakeTimers();
      const hash = cache.hashPrompt('unknown layer prompt');
      cache.set(hash, 'response', 'unknown_layer'); // default TTL = 10000ms

      vi.advanceTimersByTime(9999);
      expect(cache.get(hash)).toBe('response');

      vi.advanceTimersByTime(2); // now 10001ms have passed
      expect(cache.get(hash)).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when max size is exceeded', () => {
      // Create a small cache via a fresh instance hack — we'll test via the singleton
      // with many entries
      cache.clear();

      // Fill to max (500) + 1 using unique hashes
      for (let i = 0; i < 501; i++) {
        const hash = `hash_${i.toString().padStart(6, '0')}`;
        cache.set(hash, `response_${i}`, 'executor');
      }

      const metrics = cache.getMetrics();
      expect(metrics.size).toBeLessThanOrEqual(500);
      expect(metrics.evictions).toBeGreaterThan(0);
    });
  });

  describe('metrics tracking', () => {
    it('tracks hits and misses', () => {
      cache.clear();
      const hash = cache.hashPrompt('tracked prompt');

      cache.get('missing_hash'); // miss
      cache.set(hash, 'response', 'talker');
      cache.get(hash); // hit
      cache.get(hash); // hit

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
    });

    it('calculates hit rate correctly', () => {
      cache.clear();
      const hash = cache.hashPrompt('rate test');
      cache.set(hash, 'response', 'talker');

      cache.get(hash);       // hit
      cache.get('nope');     // miss
      cache.get('nope2');    // miss
      cache.get(hash);       // hit

      const metrics = cache.getMetrics();
      expect(metrics.hitRate).toBeCloseTo(0.5, 5);
    });

    it('returns zero hit rate when no calls made', () => {
      cache.clear();
      expect(cache.getMetrics().hitRate).toBe(0);
    });

    it('reports correct size', () => {
      cache.clear();
      const h1 = 'aabbccdd';
      const h2 = '11223344';
      cache.set(h1, 'r1', 'talker');
      cache.set(h2, 'r2', 'executor');
      expect(cache.getMetrics().size).toBe(2);
    });
  });

  describe('enabled/disabled toggle', () => {
    it('returns null when disabled', () => {
      const hash = cache.hashPrompt('test');
      cache.set(hash, 'response', 'executor');
      cache.setEnabled(false);
      expect(cache.get(hash)).toBeNull();
    });

    it('does not store when disabled', () => {
      cache.setEnabled(false);
      const hash = 'deadbeef';
      cache.set(hash, 'response', 'executor');
      cache.setEnabled(true);
      expect(cache.get(hash)).toBeNull();
    });

    it('counts misses even when disabled', () => {
      cache.clear();
      cache.setEnabled(false);
      cache.get('anything');
      const metrics = cache.getMetrics();
      expect(metrics.misses).toBe(1);
    });
  });

  describe('clear', () => {
    it('removes all entries and resets metrics', () => {
      const hash = cache.hashPrompt('to clear');
      cache.set(hash, 'response', 'executor');
      cache.get(hash);
      cache.clear();

      const metrics = cache.getMetrics();
      expect(metrics.size).toBe(0);
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.evictions).toBe(0);
    });
  });
});
