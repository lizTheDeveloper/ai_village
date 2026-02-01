/**
 * Metrics interfaces shared between packages.
 * Used by introspection and metrics packages.
 */

/**
 * Performance statistics for the game loop.
 * Updated by GameLoop every tick.
 */
export interface PerformanceStats {
  /** Current ticks per second (calculated from avgTickTime) */
  readonly tps: number;
  /** Average tick time in milliseconds (exponential moving average) */
  readonly avgTickTimeMs: number;
  /** Maximum tick time in milliseconds (decays over time) */
  readonly maxTickTimeMs: number;
  /** Total number of ticks executed */
  readonly tickCount: number;
}

/**
 * MetricsStreamClient interface for real-time metrics streaming.
 */
export interface IMetricsStreamClient {
  on?(event: string, handler: (data: unknown) => void): void;
  emit?(event: string, data: unknown): void;
}

/**
 * MetricsAPI interface for tracking events.
 */
export interface IMetricsAPI {
  trackEvent?(eventName: string, data: Record<string, unknown>): void;
}

/**
 * LiveEntityAPI interface for real-time entity updates.
 */
export interface ILiveEntityAPI {
  attach?(client: IMetricsStreamClient): void;
}
