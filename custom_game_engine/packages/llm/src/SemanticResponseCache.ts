/**
 * SemanticResponseCache - Embedding-based similarity caching for LLM responses.
 *
 * Extends Phase 1 exact-match caching with semantic similarity matching.
 * When an exact cache miss occurs, computes an embedding and searches for
 * semantically similar past prompts above a configurable threshold.
 *
 * Gracefully degrades if the embedding service is unavailable.
 */

import type { EmbeddingProvider } from './EmbeddingProvider.js';

export interface SemanticCacheConfig {
  enabled: boolean;
  maxSize: number;
  /** Cosine similarity threshold per layer. Range [0, 1]. Higher = stricter matching. */
  thresholds: Record<string, number>;
  /** TTL in ms per layer — should match LLMResponseCache TTLs */
  ttlMs: Record<string, number>;
  /** Max chars of prompt text to embed (truncated for efficiency) */
  maxEmbedChars: number;
}

export interface SemanticCacheEntry {
  promptHash: string;
  response: string;
  embedding: Float32Array;
  timestamp: number;
  layer: string;
  lastAccessed: number;
}

export interface SemanticCacheMetrics {
  semanticHits: number;
  misses: number;
  errors: number; // embedding service errors
  size: number;
  semanticHitRate: number; // semanticHits / (semanticHits + misses)
  embeddingServiceAvailable: boolean;
}

const DEFAULT_SEMANTIC_CONFIG: SemanticCacheConfig = {
  enabled: true,
  maxSize: 200,
  thresholds: {
    autonomic: 0.92,
    talker: 0.95,
    executor: 0.97,
    default: 0.95,
  },
  ttlMs: {
    autonomic: 5000,
    talker: 30000,
    executor: 60000,
    default: 10000,
  },
  maxEmbedChars: 2000,
};

export class SemanticResponseCache {
  private static instance: SemanticResponseCache | null = null;

  private entries: SemanticCacheEntry[] = [];
  private config: SemanticCacheConfig;
  private embeddingProvider: EmbeddingProvider | null = null;
  private semanticHits = 0;
  private misses = 0;
  private errors = 0;

  private constructor(config: SemanticCacheConfig = DEFAULT_SEMANTIC_CONFIG) {
    this.config = { ...config, thresholds: { ...config.thresholds }, ttlMs: { ...config.ttlMs } };
  }

  static getInstance(): SemanticResponseCache {
    if (!SemanticResponseCache.instance) {
      SemanticResponseCache.instance = new SemanticResponseCache();
    }
    return SemanticResponseCache.instance;
  }

  /**
   * Set the embedding provider. Must be called before semantic caching is active.
   * Pass null to remove the provider and disable semantic caching.
   */
  setEmbeddingProvider(provider: EmbeddingProvider | null): void {
    this.embeddingProvider = provider;
  }

  /**
   * Compute cosine similarity between two vectors.
   * Returns value in [-1, 1]; 1 = identical direction.
   */
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    // must be same length
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dot += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Try to find a semantically similar cached response.
   * Returns null on miss, degradation (no provider), or error.
   */
  async findSimilar(prompt: string, layer: string): Promise<string | null> {
    if (!this.config.enabled || !this.embeddingProvider) {
      this.misses++;
      return null;
    }

    let queryEmbedding: Float32Array;
    try {
      const truncated = prompt.length > this.config.maxEmbedChars
        ? prompt.slice(0, this.config.maxEmbedChars)
        : prompt;
      queryEmbedding = await this.embeddingProvider.embed(truncated);
    } catch {
      this.errors++;
      this.misses++;
      return null; // graceful degradation
    }

    const threshold = this.config.thresholds[layer] ?? this.config.thresholds['default'] ?? 0.95;
    const ttl = this.config.ttlMs[layer] ?? this.config.ttlMs['default'] ?? 10000;
    const now = Date.now();

    let bestSimilarity = -1;
    let bestEntry: SemanticCacheEntry | null = null;

    for (const entry of this.entries) {
      // Skip expired entries
      if (now - entry.timestamp > ttl) continue;
      // Only match same layer (different layers may have very different decision styles)
      if (entry.layer !== layer) continue;

      const sim = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestEntry = entry;
      }
    }

    if (bestEntry !== null && bestSimilarity >= threshold) {
      bestEntry.lastAccessed = Date.now();
      this.semanticHits++;
      return bestEntry.response;
    }

    this.misses++;
    return null;
  }

  /**
   * Store a response with its embedding.
   * Call this after a successful LLM response (cache miss path).
   */
  async store(promptHash: string, prompt: string, response: string, layer: string): Promise<void> {
    if (!this.config.enabled || !this.embeddingProvider) return;

    let embedding: Float32Array;
    try {
      const truncated = prompt.length > this.config.maxEmbedChars
        ? prompt.slice(0, this.config.maxEmbedChars)
        : prompt;
      embedding = await this.embeddingProvider.embed(truncated);
    } catch {
      this.errors++;
      return; // graceful degradation — don't store if embedding fails
    }

    if (this.entries.length >= this.config.maxSize) {
      this.evict(layer);
    }

    this.entries.push({
      promptHash,
      response,
      embedding,
      timestamp: Date.now(),
      layer,
      lastAccessed: Date.now(),
    });
  }

  private evict(layer: string): void {
    const now = Date.now();
    // First remove expired entries from any layer
    this.entries = this.entries.filter(e => {
      const ttl = this.config.ttlMs[e.layer] ?? this.config.ttlMs['default'] ?? 10000;
      return now - e.timestamp <= ttl;
    });

    // If still at capacity, LRU evict
    if (this.entries.length >= this.config.maxSize) {
      let lruIdx = 0;
      let lruTime = Infinity;
      for (let i = 0; i < this.entries.length; i++) {
        const entry = this.entries[i];
        if (entry && entry.lastAccessed < lruTime) {
          lruTime = entry.lastAccessed;
          lruIdx = i;
        }
      }
      this.entries.splice(lruIdx, 1);
    }
  }

  getMetrics(): SemanticCacheMetrics {
    const total = this.semanticHits + this.misses;
    return {
      semanticHits: this.semanticHits,
      misses: this.misses,
      errors: this.errors,
      size: this.entries.length,
      semanticHitRate: total > 0 ? this.semanticHits / total : 0,
      embeddingServiceAvailable: this.embeddingProvider?.isAvailable() ?? false,
    };
  }

  clear(): void {
    this.entries = [];
    this.semanticHits = 0;
    this.misses = 0;
    this.errors = 0;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setThreshold(layer: string, threshold: number): void {
    this.config.thresholds[layer] = threshold;
  }
}

export const semanticCache = SemanticResponseCache.getInstance();
