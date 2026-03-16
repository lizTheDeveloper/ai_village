/**
 * EpisodeLogger - Collects (prompt_hash, layer, action, outcome) episodes
 * for training distilled micro-NNs (Phase 4).
 *
 * Episodes are stored in-memory in a ring buffer. Can be exported as JSONL
 * for offline training pipelines.
 */

export interface Episode {
  id: string;           // sequential episode number
  timestamp: number;
  agentId: string;
  agentName?: string;
  layer: string;        // 'autonomic' | 'talker' | 'executor'
  promptHash: string;   // Links to response cache
  promptLength: number; // Token estimate (chars/4)
  actionType: string;   // Parsed action type
  action: unknown;      // Full parsed action
  thinking?: string;    // LLM reasoning (truncated to 200 chars)
  speaking?: string;    // LLM speech output
  durationMs: number;   // LLM call duration
  cacheHit: boolean;    // Whether this was served from cache
  provider?: string;    // Which LLM provider was used
}

export interface EpisodeLoggerMetrics {
  totalEpisodes: number;
  episodesByLayer: Record<string, number>;
  episodesByCacheHit: { hit: number; miss: number };
  averageDurationMs: number;
  actionDistribution: Record<string, number>;
}

const MAX_BUFFER_SIZE = 5000;

export class EpisodeLogger {
  private static instance: EpisodeLogger | null = null;

  private buffer: Episode[] = [];
  private counter: number = 0;
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): EpisodeLogger {
    if (!EpisodeLogger.instance) {
      EpisodeLogger.instance = new EpisodeLogger();
    }
    return EpisodeLogger.instance;
  }

  /**
   * Add an episode to the ring buffer.
   */
  log(episode: Omit<Episode, 'id' | 'timestamp'>): void {
    if (!this.enabled) return;

    this.counter++;
    const entry: Episode = {
      ...episode,
      id: String(this.counter),
      timestamp: Date.now(),
      thinking: episode.thinking?.substring(0, 200),
    };

    this.buffer.push(entry);

    // Ring buffer: evict oldest when over capacity
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  /**
   * Get the most recent episodes.
   */
  getEpisodes(limit?: number): Episode[] {
    if (limit === undefined) {
      return [...this.buffer];
    }
    return this.buffer.slice(-limit);
  }

  getMetrics(): EpisodeLoggerMetrics {
    const episodesByLayer: Record<string, number> = {};
    const actionDistribution: Record<string, number> = {};
    let cacheHits = 0;
    let cacheMisses = 0;
    let totalDuration = 0;

    for (const ep of this.buffer) {
      episodesByLayer[ep.layer] = (episodesByLayer[ep.layer] || 0) + 1;
      actionDistribution[ep.actionType] = (actionDistribution[ep.actionType] || 0) + 1;
      if (ep.cacheHit) {
        cacheHits++;
      } else {
        cacheMisses++;
      }
      totalDuration += ep.durationMs;
    }

    return {
      totalEpisodes: this.buffer.length,
      episodesByLayer,
      episodesByCacheHit: { hit: cacheHits, miss: cacheMisses },
      averageDurationMs: this.buffer.length > 0 ? totalDuration / this.buffer.length : 0,
      actionDistribution,
    };
  }

  /**
   * Export all buffered episodes as a JSONL string.
   */
  exportJSONL(): string {
    return this.buffer.map(ep => JSON.stringify(ep)).join('\n');
  }

  clear(): void {
    this.buffer = [];
    this.counter = 0;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const episodeLogger = EpisodeLogger.getInstance();
