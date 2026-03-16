/**
 * LLMResponseCache - Caches LLM responses by prompt hash to avoid redundant calls.
 *
 * Uses a fast sync djb2 string hash as cache key. Configurable TTL per decision layer.
 * Every cache miss is a training example for future NN distillation (Phase 4).
 */

export interface ResponseCacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number; // hits / (hits + misses)
}

export interface ResponseCacheConfig {
  enabled: boolean;
  maxSize: number;
  ttlMs: Record<string, number>; // per-layer TTL
}

interface CachedResponse {
  response: string;
  timestamp: number;
  layer: string;
  hitCount: number;
  lastAccessed: number;
}

const DEFAULT_CONFIG: ResponseCacheConfig = {
  enabled: true,
  maxSize: 500,
  ttlMs: {
    autonomic: 5000,
    talker: 30000,
    executor: 60000,
    default: 10000,
  },
};

export class LLMResponseCache {
  private static instance: LLMResponseCache | null = null;

  private cache: Map<string, CachedResponse> = new Map();
  private config: ResponseCacheConfig;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  private constructor(config: ResponseCacheConfig = DEFAULT_CONFIG) {
    this.config = { ...config };
  }

  static getInstance(): LLMResponseCache {
    if (!LLMResponseCache.instance) {
      LLMResponseCache.instance = new LLMResponseCache();
    }
    return LLMResponseCache.instance;
  }

  /**
   * Fast sync djb2 x 33 hash — returns an 8-char hex string.
   * Works in both browser and Node without async crypto.
   */
  hashPrompt(prompt: string): string {
    let hash = 5381;
    for (let i = 0; i < prompt.length; i++) {
      hash = ((hash << 5) + hash) ^ prompt.charCodeAt(i);
      hash = hash >>> 0; // keep as unsigned 32-bit
    }
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Retrieve a cached response. Returns null on miss or expiry.
   */
  get(promptHash: string): string | null {
    if (!this.config.enabled) {
      this.misses++;
      return null;
    }

    const entry = this.cache.get(promptHash);
    if (!entry) {
      this.misses++;
      return null;
    }

    const ttl = this.config.ttlMs[entry.layer] ?? this.config.ttlMs['default'] ?? 10000;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(promptHash);
      this.evictions++;
      this.misses++;
      return null;
    }

    entry.hitCount++;
    entry.lastAccessed = Date.now();
    this.hits++;
    return entry.response;
  }

  /**
   * Store a response with layer-specific TTL.
   */
  set(promptHash: string, response: string, layer: string): void {
    if (!this.config.enabled) return;

    if (this.cache.size >= this.config.maxSize) {
      this.evictExpired();
      if (this.cache.size >= this.config.maxSize) {
        this.evictLRU();
      }
    }

    this.cache.set(promptHash, {
      response,
      timestamp: Date.now(),
      layer,
      hitCount: 0,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Remove all expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const ttl = this.config.ttlMs[entry.layer] ?? this.config.ttlMs['default'] ?? 10000;
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
        this.evictions++;
      }
    }
  }

  /**
   * Remove the least recently accessed entry (LRU eviction).
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey !== null) {
      this.cache.delete(lruKey);
      this.evictions++;
    }
  }

  getMetrics(): ResponseCacheMetrics {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

export const responseCache = LLMResponseCache.getInstance();
