import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SemanticResponseCache } from '../SemanticResponseCache';
import type { EmbeddingProvider } from '../EmbeddingProvider';

// Helper to create a Float32Array from a plain number array
function vec(...values: number[]): Float32Array {
  return new Float32Array(values);
}

// Create a mock embedding provider
function makeMockProvider(embedFn?: (text: string) => Promise<Float32Array>): EmbeddingProvider {
  return {
    embed: embedFn ?? vi.fn().mockResolvedValue(vec(1, 0, 0)),
    isAvailable: vi.fn().mockReturnValue(true),
  };
}

describe('SemanticResponseCache', () => {
  let cache: SemanticResponseCache;

  beforeEach(() => {
    cache = SemanticResponseCache.getInstance();
    cache.clear();
    cache.setEnabled(true);
    cache.setEmbeddingProvider(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const a = vec(1, 0, 0);
      const sim = cache.cosineSimilarity(a, a);
      expect(sim).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = vec(1, 0, 0);
      const b = vec(0, 1, 0);
      expect(cache.cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('returns -1 for opposite vectors', () => {
      const a = vec(1, 0, 0);
      const b = vec(-1, 0, 0);
      expect(cache.cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
    });

    it('returns 0 for vectors of different lengths', () => {
      const a = vec(1, 0);
      const b = vec(1, 0, 0);
      expect(cache.cosineSimilarity(a, b)).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
      const a = vec(0, 0, 0);
      const b = vec(1, 0, 0);
      expect(cache.cosineSimilarity(a, b)).toBe(0);
    });

    it('computes correct similarity for non-trivial vectors', () => {
      // [1, 1] and [1, 0] have cos sim = 1/sqrt(2) ≈ 0.7071
      const a = vec(1, 1);
      const b = vec(1, 0);
      expect(cache.cosineSimilarity(a, b)).toBeCloseTo(1 / Math.sqrt(2), 5);
    });
  });

  describe('findSimilar — no provider', () => {
    it('returns null and counts a miss when no provider is set', async () => {
      // No provider set
      const result = await cache.findSimilar('some prompt', 'executor');
      expect(result).toBeNull();
      expect(cache.getMetrics().misses).toBe(1);
    });
  });

  describe('findSimilar — embedding error (graceful degradation)', () => {
    it('returns null and increments errors on embedding failure', async () => {
      const provider = makeMockProvider(vi.fn().mockRejectedValue(new Error('Service down')));
      cache.setEmbeddingProvider(provider);

      const result = await cache.findSimilar('prompt', 'executor');
      expect(result).toBeNull();

      const metrics = cache.getMetrics();
      expect(metrics.errors).toBe(1);
      expect(metrics.misses).toBe(1);
    });
  });

  describe('findSimilar — above threshold', () => {
    it('returns cached response when similarity is above threshold', async () => {
      // Both embed and store will use the same vector → similarity = 1.0
      const embedding = vec(1, 0, 0);
      const provider = makeMockProvider(vi.fn().mockResolvedValue(embedding));
      cache.setEmbeddingProvider(provider);

      await cache.store('hash1', 'what should I do', 'gather wood', 'executor');
      const result = await cache.findSimilar('what shall I do', 'executor');

      expect(result).toBe('gather wood');
      expect(cache.getMetrics().semanticHits).toBe(1);
    });
  });

  describe('findSimilar — below threshold', () => {
    it('returns null when best similarity is below threshold', async () => {
      // Store with one vector, query with an orthogonal vector
      const storeEmbed = vi.fn()
        .mockResolvedValueOnce(vec(1, 0, 0))   // store call
        .mockResolvedValueOnce(vec(0, 1, 0));  // query call (orthogonal → sim = 0)

      const provider = makeMockProvider(storeEmbed);
      cache.setEmbeddingProvider(provider);

      await cache.store('hash1', 'prompt A', 'response A', 'executor');

      // executor threshold is 0.97 — cosine(1,0,0, 0,1,0) = 0 < 0.97
      const result = await cache.findSimilar('prompt B', 'executor');

      expect(result).toBeNull();
      expect(cache.getMetrics().misses).toBe(1);
      expect(cache.getMetrics().semanticHits).toBe(0);
    });
  });

  describe('findSimilar — expired entries', () => {
    it('skips expired entries', async () => {
      vi.useFakeTimers();

      const embedding = vec(1, 0, 0);
      const provider = makeMockProvider(vi.fn().mockResolvedValue(embedding));
      cache.setEmbeddingProvider(provider);

      // Store in autonomic layer (TTL = 5000ms)
      await cache.store('hash1', 'prompt', 'response', 'autonomic');

      // Advance past TTL
      vi.advanceTimersByTime(5001);

      const result = await cache.findSimilar('prompt', 'autonomic');
      expect(result).toBeNull();
      expect(cache.getMetrics().misses).toBe(1);
    });
  });

  describe('findSimilar — layer isolation', () => {
    it('does not match entries from a different layer', async () => {
      const embedding = vec(1, 0, 0);
      const provider = makeMockProvider(vi.fn().mockResolvedValue(embedding));
      cache.setEmbeddingProvider(provider);

      // Store in 'executor' layer
      await cache.store('hash1', 'prompt', 'executor response', 'executor');

      // Query from 'talker' layer — should not match
      const result = await cache.findSimilar('prompt', 'talker');
      expect(result).toBeNull();
    });
  });

  describe('store — no provider', () => {
    it('does nothing when no provider is set', async () => {
      // No provider
      await cache.store('hash1', 'prompt', 'response', 'executor');
      expect(cache.getMetrics().size).toBe(0);
    });
  });

  describe('metrics tracking', () => {
    it('tracks semanticHits, misses, and errors', async () => {
      const errorProvider = makeMockProvider(vi.fn().mockRejectedValue(new Error('fail')));
      cache.setEmbeddingProvider(errorProvider);

      // Embedding error during findSimilar → error + miss
      await cache.findSimilar('prompt', 'executor');

      const m = cache.getMetrics();
      expect(m.errors).toBe(1);
      expect(m.misses).toBe(1);
      expect(m.semanticHits).toBe(0);
    });

    it('calculates semanticHitRate correctly', async () => {
      const embedding = vec(1, 0, 0);
      const provider = makeMockProvider(vi.fn().mockResolvedValue(embedding));
      cache.setEmbeddingProvider(provider);

      await cache.store('hash1', 'prompt', 'response', 'talker');

      // Hit
      await cache.findSimilar('similar prompt', 'talker');
      // Miss (no provider → set to null provider temporarily)
      cache.setEnabled(false);
      await cache.findSimilar('another prompt', 'talker');
      cache.setEnabled(true);

      const m = cache.getMetrics();
      expect(m.semanticHits).toBe(1);
      // semanticHitRate = 1 / (1 + 1) = 0.5
      expect(m.semanticHitRate).toBeCloseTo(0.5, 5);
    });

    it('reports embeddingServiceAvailable from provider', async () => {
      const provider: EmbeddingProvider = {
        embed: vi.fn().mockResolvedValue(vec(1, 0, 0)),
        isAvailable: vi.fn().mockReturnValue(false),
      };
      cache.setEmbeddingProvider(provider);

      expect(cache.getMetrics().embeddingServiceAvailable).toBe(false);
    });

    it('reports size correctly', async () => {
      const embedding = vec(1, 0, 0);
      const provider = makeMockProvider(vi.fn().mockResolvedValue(embedding));
      cache.setEmbeddingProvider(provider);

      await cache.store('hash1', 'prompt1', 'response1', 'executor');
      await cache.store('hash2', 'prompt2', 'response2', 'talker');

      expect(cache.getMetrics().size).toBe(2);
    });
  });

  describe('setEnabled(false)', () => {
    it('disables findSimilar — counts miss without embedding', async () => {
      const embedFn = vi.fn().mockResolvedValue(vec(1, 0, 0));
      const provider = makeMockProvider(embedFn);
      cache.setEmbeddingProvider(provider);
      cache.setEnabled(false);

      const result = await cache.findSimilar('prompt', 'executor');
      expect(result).toBeNull();
      // embed should NOT have been called
      expect(embedFn).not.toHaveBeenCalled();
      expect(cache.getMetrics().misses).toBe(1);
    });

    it('disables store — nothing is stored', async () => {
      const provider = makeMockProvider(vi.fn().mockResolvedValue(vec(1, 0, 0)));
      cache.setEmbeddingProvider(provider);
      cache.setEnabled(false);

      await cache.store('hash1', 'prompt', 'response', 'executor');
      expect(cache.getMetrics().size).toBe(0);
    });
  });

  describe('clear', () => {
    it('removes all entries and resets metrics', async () => {
      const provider = makeMockProvider(vi.fn().mockResolvedValue(vec(1, 0, 0)));
      cache.setEmbeddingProvider(provider);

      await cache.store('hash1', 'prompt', 'response', 'executor');
      await cache.findSimilar('similar', 'executor');

      cache.clear();

      const m = cache.getMetrics();
      expect(m.size).toBe(0);
      expect(m.semanticHits).toBe(0);
      expect(m.misses).toBe(0);
      expect(m.errors).toBe(0);
    });
  });

  describe('setThreshold', () => {
    it('respects a custom threshold', async () => {
      // Set executor threshold very high (1.0) so even identical vectors just barely pass
      cache.setThreshold('executor', 1.0);

      const embedding = vec(1, 0, 0);
      const provider = makeMockProvider(vi.fn().mockResolvedValue(embedding));
      cache.setEmbeddingProvider(provider);

      await cache.store('hash1', 'prompt', 'response', 'executor');

      // Cosine of identical vectors = 1.0, which equals the threshold → should match
      const result = await cache.findSimilar('prompt', 'executor');
      expect(result).toBe('response');
    });
  });
});
