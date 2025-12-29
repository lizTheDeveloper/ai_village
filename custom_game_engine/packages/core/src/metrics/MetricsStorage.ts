/**
 * MetricsStorage - Persistent storage for metrics with tiered retention
 *
 * Hot storage: In-memory, last hour
 * Warm storage: On-disk, current session
 * Cold storage: Compressed archives, historical data
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Stored metric event
 */
export interface StoredMetric {
  type: string;
  timestamp: number;
  agentId?: string;
  data: Record<string, unknown>;
  category?: string;
}

/**
 * Session data
 */
export interface SessionData {
  sessionId: string;
  startTime: number;
  metrics: StoredMetric[];
}

/**
 * Query options
 */
export interface QueryOptions {
  startTime?: number;
  endTime?: number;
  type?: string;
  agentId?: string;
}

/**
 * Aggregate data point
 */
export interface AggregateDataPoint {
  timestamp: number;
  metric: string;
  value: number;
}

/**
 * Aggregate statistics
 */
export interface AggregateStats {
  avg: number;
  min: number;
  max: number;
  sum: number;
  count: number;
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
  name: string;
  duration: string;
  durationMs: number;
}

const RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  raw_events: {
    name: 'raw_events',
    duration: '1 hour',
    durationMs: 60 * 60 * 1000,
  },
  minute_aggregates: {
    name: 'minute_aggregates',
    duration: '24 hours',
    durationMs: 24 * 60 * 60 * 1000,
  },
  hourly_aggregates: {
    name: 'hourly_aggregates',
    duration: '7 days',
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  daily_aggregates: {
    name: 'daily_aggregates',
    duration: 'forever',
    durationMs: Infinity,
  },
};

export class MetricsStorage {
  private storagePath: string;
  private hotStorage: StoredMetric[] = [];
  private maxHotStorageSize: number = 10000;

  // Indexes for fast queries
  private timestampIndex: Map<number, StoredMetric[]> = new Map();
  private agentIndex: Map<string, StoredMetric[]> = new Map();
  private typeIndex: Map<string, StoredMetric[]> = new Map();

  constructor(storagePath: string) {
    if (!storagePath || storagePath.length === 0) {
      throw new Error('Storage path cannot be empty');
    }
    this.storagePath = storagePath;
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'sessions'), { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'archive'), { recursive: true });
  }

  /**
   * Add metric to hot storage
   */
  addToHotStorage(metric: StoredMetric): void {
    if (!metric.timestamp || typeof metric.timestamp !== 'number') {
      throw new Error('Metric must have a valid timestamp');
    }

    this.hotStorage.push(metric);

    // Update indexes
    const timestampKey = Math.floor(metric.timestamp / 60000) * 60000; // Round to minute
    if (!this.timestampIndex.has(timestampKey)) {
      this.timestampIndex.set(timestampKey, []);
    }
    this.timestampIndex.get(timestampKey)!.push(metric);

    if (metric.agentId) {
      if (!this.agentIndex.has(metric.agentId)) {
        this.agentIndex.set(metric.agentId, []);
      }
      this.agentIndex.get(metric.agentId)!.push(metric);
    }

    if (!this.typeIndex.has(metric.type)) {
      this.typeIndex.set(metric.type, []);
    }
    this.typeIndex.get(metric.type)!.push(metric);

    // Enforce size limit
    if (this.hotStorage.length > this.maxHotStorageSize) {
      this.hotStorage.shift();
    }
  }

  /**
   * Get hot storage
   */
  getHotStorage(): StoredMetric[] {
    if (!this.hotStorage || !Array.isArray(this.hotStorage)) {
      throw new Error('Hot storage is corrupted');
    }
    return [...this.hotStorage];
  }

  /**
   * Query hot storage
   */
  queryHotStorage(options: QueryOptions = {}): StoredMetric[] {
    let results = this.hotStorage;

    // Filter by agent ID using index
    if (options.agentId) {
      results = this.agentIndex.get(options.agentId) || [];
    }

    // Filter by type using index
    if (options.type) {
      const typeResults = this.typeIndex.get(options.type) || [];
      results = results.filter(m => typeResults.includes(m));
    }

    // Filter by time range
    if (options.startTime !== undefined && options.endTime !== undefined) {
      results = results.filter(
        m => m.timestamp >= options.startTime! && m.timestamp <= options.endTime!
      );
    }

    return results;
  }

  /**
   * Prune old metrics from hot storage
   */
  pruneHotStorage(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    this.hotStorage = this.hotStorage.filter(m => m.timestamp >= oneHourAgo);

    // Rebuild indexes
    this.rebuildIndexes();
  }

  /**
   * Rebuild indexes after pruning
   */
  private rebuildIndexes(): void {
    this.timestampIndex.clear();
    this.agentIndex.clear();
    this.typeIndex.clear();

    for (const metric of this.hotStorage) {
      const timestampKey = Math.floor(metric.timestamp / 60000) * 60000;
      if (!this.timestampIndex.has(timestampKey)) {
        this.timestampIndex.set(timestampKey, []);
      }
      this.timestampIndex.get(timestampKey)!.push(metric);

      if (metric.agentId) {
        if (!this.agentIndex.has(metric.agentId)) {
          this.agentIndex.set(metric.agentId, []);
        }
        this.agentIndex.get(metric.agentId)!.push(metric);
      }

      if (!this.typeIndex.has(metric.type)) {
        this.typeIndex.set(metric.type, []);
      }
      this.typeIndex.get(metric.type)!.push(metric);
    }
  }

  /**
   * Save session to disk
   */
  async saveSession(sessionData: SessionData): Promise<void> {
    if (!sessionData.sessionId || sessionData.sessionId.length === 0) {
      throw new Error('Session must have a valid sessionId');
    }

    const sessionPath = path.join(this.storagePath, 'sessions', `${sessionData.sessionId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
  }

  /**
   * Load session from disk
   */
  async loadSession(sessionId: string): Promise<SessionData> {
    const sessionPath = path.join(this.storagePath, 'sessions', `${sessionId}.json`);

    try {
      const data = await fs.readFile(sessionPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Session not found: ${sessionId}`);
    }
  }

  /**
   * List all available sessions
   */
  async listSessions(): Promise<string[]> {
    const sessionsDir = path.join(this.storagePath, 'sessions');

    try {
      const files = await fs.readdir(sessionsDir);
      return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Prune old sessions
   */
  async pruneOldSessions(maxAgeDays: number): Promise<void> {
    const sessions = await this.listSessions();
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const sessionId of sessions) {
      const sessionData = await this.loadSession(sessionId);
      if (now - sessionData.startTime > maxAgeMs) {
        const sessionPath = path.join(this.storagePath, 'sessions', `${sessionId}.json`);
        await fs.unlink(sessionPath);
      }
    }
  }

  /**
   * Archive metrics to compressed storage
   */
  async archiveMetrics(metrics: StoredMetric[], archiveName: string): Promise<void> {
    const archivePath = path.join(this.storagePath, 'archive', `${archiveName}.gz`);
    const data = JSON.stringify(metrics);
    const compressed = await gzip(Buffer.from(data));
    await fs.writeFile(archivePath, compressed);
  }

  /**
   * Load archived metrics
   */
  async loadArchive(archiveName: string): Promise<StoredMetric[]> {
    const archivePath = path.join(this.storagePath, 'archive', `${archiveName}.gz`);

    try {
      const compressed = await fs.readFile(archivePath);
      const decompressed = await gunzip(compressed);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      throw new Error(`Failed to load archive: ${archiveName}`);
    }
  }

  /**
   * List all available archives
   */
  async listArchives(): Promise<string[]> {
    const archiveDir = path.join(this.storagePath, 'archive');

    try {
      const files = await fs.readdir(archiveDir);
      return files.filter(f => f.endsWith('.gz')).map(f => f.replace('.gz', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get archive size in bytes
   */
  async getArchiveSize(archiveName: string): Promise<number> {
    const archivePath = path.join(this.storagePath, 'archive', `${archiveName}.gz`);

    try {
      const stats = await fs.stat(archivePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Delete an archive
   */
  async deleteArchive(archiveName: string): Promise<void> {
    const archivePath = path.join(this.storagePath, 'archive', `${archiveName}.gz`);
    await fs.unlink(archivePath);
  }

  /**
   * Get retention policy
   */
  getRetentionPolicy(category: string): RetentionPolicy {
    if (!RETENTION_POLICIES[category]) {
      throw new Error(`Unknown retention policy category: ${category}`);
    }
    return RETENTION_POLICIES[category];
  }

  /**
   * Apply retention policies
   */
  async applyRetentionPolicies(): Promise<void> {
    const now = Date.now();

    // Apply raw events retention (1 hour)
    const rawEventsPolicy = RETENTION_POLICIES['raw_events'];
    if (rawEventsPolicy) {
      this.hotStorage = this.hotStorage.filter(m => {
        if (m.category === 'raw_events') {
          return now - m.timestamp <= rawEventsPolicy.durationMs;
        }
        return true;
      });

      this.rebuildIndexes();
    }
  }

  /**
   * Aggregate raw events into minute summaries
   */
  async aggregateToMinutes(): Promise<AggregateDataPoint[]> {
    const minuteMap = new Map<number, Map<string, number[]>>();

    for (const metric of this.hotStorage) {
      const minuteKey = Math.floor(metric.timestamp / 60000) * 60000;

      if (!minuteMap.has(minuteKey)) {
        minuteMap.set(minuteKey, new Map());
      }

      const metricMap = minuteMap.get(minuteKey)!;
      const metricType = metric.type;

      if (!metricMap.has(metricType)) {
        metricMap.set(metricType, []);
      }

      // Extract numeric values from data
      for (const value of Object.values(metric.data)) {
        if (typeof value === 'number') {
          metricMap.get(metricType)!.push(value);
        }
      }
    }

    const result: AggregateDataPoint[] = [];

    for (const [timestamp, metricMap] of minuteMap) {
      for (const [metric, values] of metricMap) {
        if (values.length > 0) {
          const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
          result.push({ timestamp, metric, value: avg });
        }
      }
    }

    return result;
  }

  /**
   * Aggregate minute data into hourly summaries
   */
  async aggregateToHours(minuteData: AggregateDataPoint[]): Promise<AggregateDataPoint[]> {
    const hourMap = new Map<number, Map<string, number[]>>();

    for (const point of minuteData) {
      const hourKey = Math.floor(point.timestamp / 3600000) * 3600000;

      if (!hourMap.has(hourKey)) {
        hourMap.set(hourKey, new Map());
      }

      const metricMap = hourMap.get(hourKey)!;

      if (!metricMap.has(point.metric)) {
        metricMap.set(point.metric, []);
      }

      metricMap.get(point.metric)!.push(point.value);
    }

    const result: AggregateDataPoint[] = [];

    for (const [timestamp, metricMap] of hourMap) {
      for (const [metric, values] of metricMap) {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        result.push({ timestamp, metric, value: avg });
      }
    }

    return result;
  }

  /**
   * Calculate aggregate statistics
   */
  async calculateAggregateStats(data: AggregateDataPoint[]): Promise<AggregateStats> {
    if (data.length === 0) {
      return { avg: 0, min: 0, max: 0, sum: 0, count: 0 };
    }

    const values = data.map(d => d.value);
    const sum = values.reduce((s, v) => s + v, 0);

    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      sum,
      count: values.length,
    };
  }

  /**
   * Set maximum hot storage size
   */
  setMaxHotStorageSize(size: number): void {
    this.maxHotStorageSize = size;
  }

  /**
   * Estimate memory usage of hot storage
   */
  estimateMemoryUsage(): number {
    const jsonSize = JSON.stringify(this.hotStorage).length;
    return jsonSize * 2; // Rough estimate: 2 bytes per character
  }

  /**
   * Export all data
   */
  async exportAll(_format: 'json'): Promise<Buffer> {
    const data = {
      hotStorage: this.hotStorage,
    };

    return Buffer.from(JSON.stringify(data, null, 2));
  }

  /**
   * Import data
   */
  async importAll(data: Buffer, _format: 'json'): Promise<void> {
    const parsed = JSON.parse(data.toString());

    if (!parsed.hotStorage || !Array.isArray(parsed.hotStorage)) {
      throw new Error('Invalid import data structure');
    }

    this.hotStorage = parsed.hotStorage;
    this.rebuildIndexes();
  }

  /**
   * Verify archive checksum
   */
  async verifyArchiveChecksum(archiveName: string): Promise<boolean> {
    try {
      await this.loadArchive(archiveName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Repair hot storage if corrupted
   */
  repairHotStorage(): void {
    this.hotStorage = [];
    this.rebuildIndexes();
  }
}
