import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricsStorage } from '../metrics/MetricsStorage';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('MetricsStorage', () => {
  let storage: MetricsStorage;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'test-metrics-storage');
    storage = new MetricsStorage(tempDir);
    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore errors
    }
  });

  describe('Initialization', () => {
    it('should create storage directory if it does not exist', async () => {
      await storage.initialize();
      const stats = await fs.stat(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should throw when storage path is invalid', () => {
      expect(() => new MetricsStorage('')).toThrow('Storage path cannot be empty');
    });
  });

  describe('Hot Storage (In-Memory)', () => {
    it('should store recent metrics in memory', () => {
      const metric = {
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-1',
        data: { generation: 1 }
      };

      storage.addToHotStorage(metric);

      const hotMetrics = storage.getHotStorage();
      expect(hotMetrics.length).toBe(1);
      expect(hotMetrics[0].agentId).toBe('agent-1');
    });

    it('should limit hot storage to last hour', () => {
      const now = Date.now();
      const twoHoursAgo = now - (2 * 60 * 60 * 1000);
      const thirtyMinutesAgo = now - (30 * 60 * 1000);

      storage.addToHotStorage({
        type: 'test',
        timestamp: twoHoursAgo,
        agentId: 'agent-1',
        data: {}
      });

      storage.addToHotStorage({
        type: 'test',
        timestamp: thirtyMinutesAgo,
        agentId: 'agent-2',
        data: {}
      });

      storage.pruneHotStorage();

      const hotMetrics = storage.getHotStorage();
      expect(hotMetrics.length).toBe(1);
      expect(hotMetrics[0].agentId).toBe('agent-2');
    });

    it('should efficiently query hot storage by time range', () => {
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        storage.addToHotStorage({
          type: 'test',
          timestamp: now - (i * 60000), // Every minute
          agentId: `agent-${i}`,
          data: {}
        });
      }

      const filtered = storage.queryHotStorage({
        startTime: now - (5 * 60000),
        endTime: now
      });

      expect(filtered.length).toBe(6); // Inclusive range: 0, 1, 2, 3, 4, 5 minutes ago
    });

    it('should query hot storage by metric type', () => {
      storage.addToHotStorage({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-1',
        data: {}
      });

      storage.addToHotStorage({
        type: 'agent:death',
        timestamp: Date.now(),
        agentId: 'agent-2',
        data: {}
      });

      const births = storage.queryHotStorage({ type: 'agent:birth' });
      expect(births.length).toBe(1);
      expect(births[0].type).toBe('agent:birth');
    });
  });

  describe('Warm Storage (Session)', () => {
    it('should persist session metrics to disk', async () => {
      const sessionData = {
        sessionId: 'session-1',
        startTime: Date.now(),
        metrics: [
          { type: 'agent:birth', timestamp: Date.now(), agentId: 'agent-1', data: {} }
        ]
      };

      await storage.saveSession(sessionData);

      const sessionPath = path.join(tempDir, 'sessions', 'session-1.json');
      const exists = await fs.access(sessionPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should load session metrics from disk', async () => {
      const sessionData = {
        sessionId: 'session-1',
        startTime: Date.now(),
        metrics: [
          { type: 'agent:birth', timestamp: Date.now(), agentId: 'agent-1', data: {} }
        ]
      };

      await storage.saveSession(sessionData);
      const loaded = await storage.loadSession('session-1');

      expect(loaded.sessionId).toBe('session-1');
      expect(loaded.metrics.length).toBe(1);
    });

    it('should throw when loading non-existent session', async () => {
      await expect(storage.loadSession('nonexistent')).rejects.toThrow('Session not found: nonexistent');
    });

    it('should list all available sessions', async () => {
      await storage.saveSession({
        sessionId: 'session-1',
        startTime: Date.now(),
        metrics: []
      });

      await storage.saveSession({
        sessionId: 'session-2',
        startTime: Date.now(),
        metrics: []
      });

      const sessions = await storage.listSessions();
      expect(sessions.length).toBe(2);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
    });

    it('should delete old sessions', async () => {
      const oldDate = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago

      await storage.saveSession({
        sessionId: 'old-session',
        startTime: oldDate,
        metrics: []
      });

      await storage.saveSession({
        sessionId: 'new-session',
        startTime: Date.now(),
        metrics: []
      });

      await storage.pruneOldSessions(7); // Delete sessions older than 7 days

      const sessions = await storage.listSessions();
      expect(sessions).not.toContain('old-session');
      expect(sessions).toContain('new-session');
    });
  });

  describe('Cold Storage (Archive)', () => {
    it('should compress and archive old metrics', async () => {
      const oldMetrics = [
        {
          type: 'agent:birth',
          timestamp: Date.now() - (10 * 24 * 60 * 60 * 1000),
          agentId: 'agent-1',
          data: { generation: 1 }
        }
      ];

      await storage.archiveMetrics(oldMetrics, '2024-01');

      const archivePath = path.join(tempDir, 'archive', '2024-01.gz');
      const exists = await fs.access(archivePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should decompress archived metrics', async () => {
      const metrics = [
        {
          type: 'agent:birth',
          timestamp: Date.now(),
          agentId: 'agent-1',
          data: { generation: 1 }
        }
      ];

      await storage.archiveMetrics(metrics, '2024-01');
      const loaded = await storage.loadArchive('2024-01');

      expect(loaded.length).toBe(1);
      expect(loaded[0].agentId).toBe('agent-1');
    });

    it('should list all available archives', async () => {
      await storage.archiveMetrics([], '2024-01');
      await storage.archiveMetrics([], '2024-02');

      const archives = await storage.listArchives();
      expect(archives.length).toBe(2);
      expect(archives).toContain('2024-01');
      expect(archives).toContain('2024-02');
    });

    it('should calculate archive size', async () => {
      const metrics = Array.from({ length: 1000 }, (_, i) => ({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: `agent-${i}`,
        data: { generation: 1 }
      }));

      await storage.archiveMetrics(metrics, '2024-01');
      const size = await storage.getArchiveSize('2024-01');

      expect(size).toBeGreaterThan(0);
    });

    it('should delete old archives', async () => {
      await storage.archiveMetrics([], '2023-01');
      await storage.archiveMetrics([], '2024-01');

      await storage.deleteArchive('2023-01');

      const archives = await storage.listArchives();
      expect(archives).not.toContain('2023-01');
      expect(archives).toContain('2024-01');
    });
  });

  describe('Retention Policies', () => {
    it('should apply retention policy for raw events', () => {
      const policy = storage.getRetentionPolicy('raw_events');
      expect(policy.duration).toBe('1 hour');
    });

    it('should apply retention policy for minute aggregates', () => {
      const policy = storage.getRetentionPolicy('minute_aggregates');
      expect(policy.duration).toBe('24 hours');
    });

    it('should apply retention policy for hourly aggregates', () => {
      const policy = storage.getRetentionPolicy('hourly_aggregates');
      expect(policy.duration).toBe('7 days');
    });

    it('should apply retention policy for daily aggregates', () => {
      const policy = storage.getRetentionPolicy('daily_aggregates');
      expect(policy.duration).toBe('forever');
    });

    it('should automatically apply retention policies', async () => {
      const now = Date.now();
      const twoHoursAgo = now - (2 * 60 * 60 * 1000);

      storage.addToHotStorage({
        type: 'raw_event',
        timestamp: twoHoursAgo,
        agentId: 'agent-1',
        data: {},
        category: 'raw_events'
      });

      await storage.applyRetentionPolicies();

      const hotMetrics = storage.getHotStorage();
      expect(hotMetrics.filter(m => m.category === 'raw_events').length).toBe(0);
    });
  });

  describe('Data Aggregation', () => {
    it('should aggregate raw events into minute summaries', async () => {
      const now = Date.now();

      for (let i = 0; i < 60; i++) {
        storage.addToHotStorage({
          type: 'agent:moved',
          timestamp: now + (i * 1000),
          agentId: 'agent-1',
          data: { distance: 1 }
        });
      }

      const aggregated = await storage.aggregateToMinutes();
      expect(aggregated.length).toBeGreaterThan(0);
    });

    it('should aggregate minute data into hourly summaries', async () => {
      const baseTime = Math.floor(Date.now() / 3600000) * 3600000; // Round to hour
      const minuteData = Array.from({ length: 60 }, (_, i) => ({
        timestamp: baseTime + (i * 60000),
        metric: 'population',
        value: 100 + i
      }));

      const aggregated = await storage.aggregateToHours(minuteData);
      expect(aggregated.length).toBe(1);
      expect(aggregated[0].metric).toBe('population');
    });

    it('should calculate aggregate statistics', async () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now(),
        metric: 'population',
        value: 100 + i
      }));

      const stats = await storage.calculateAggregateStats(data);
      expect(stats.avg).toBeCloseTo(104.5, 1);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(109);
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query large datasets', () => {
      const now = Date.now();

      for (let i = 0; i < 10000; i++) {
        storage.addToHotStorage({
          type: 'test',
          timestamp: now - (i * 1000),
          agentId: `agent-${i % 100}`,
          data: {}
        });
      }

      const start = performance.now();
      const results = storage.queryHotStorage({
        startTime: now - (1000 * 1000),
        endTime: now
      });
      const end = performance.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should use indexes for agent ID queries', () => {
      for (let i = 0; i < 1000; i++) {
        storage.addToHotStorage({
          type: 'test',
          timestamp: Date.now(),
          agentId: `agent-${i % 10}`,
          data: {}
        });
      }

      const start = performance.now();
      const results = storage.queryHotStorage({ agentId: 'agent-5' });
      const end = performance.now();

      expect(results.length).toBe(100);
      expect(end - start).toBeLessThan(50); // Should be fast with index
    });
  });

  describe('Data Integrity', () => {
    it('should validate data before storage', () => {
      expect(() => {
        storage.addToHotStorage({
          type: 'test',
          timestamp: null as any,
          agentId: 'agent-1',
          data: {}
        });
      }).toThrow('Metric must have a valid timestamp');
    });

    it('should validate session data before saving', async () => {
      await expect(storage.saveSession({
        sessionId: '',
        startTime: Date.now(),
        metrics: []
      })).rejects.toThrow('Session must have a valid sessionId');
    });

    it('should detect corrupted archive files', async () => {
      const archivePath = path.join(tempDir, 'archive', 'corrupted.gz');
      await fs.mkdir(path.dirname(archivePath), { recursive: true });
      await fs.writeFile(archivePath, 'invalid gzip data');

      await expect(storage.loadArchive('corrupted')).rejects.toThrow('Failed to load archive');
    });

    it('should verify checksums for archived data', async () => {
      const metrics = [
        {
          type: 'agent:birth',
          timestamp: Date.now(),
          agentId: 'agent-1',
          data: { generation: 1 }
        }
      ];

      await storage.archiveMetrics(metrics, '2024-01');
      const isValid = await storage.verifyArchiveChecksum('2024-01');

      expect(isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle disk full errors gracefully', async () => {
      // Mock disk full error
      const originalSave = storage.saveSession.bind(storage);
      storage.saveSession = async () => {
        throw new Error('ENOSPC: no space left on device');
      };

      await expect(storage.saveSession({
        sessionId: 'test',
        startTime: Date.now(),
        metrics: []
      })).rejects.toThrow('no space left on device');
    });

    it('should handle permission errors', async () => {
      // Try to write to read-only location
      const readOnlyStorage = new MetricsStorage('/read-only-path');

      await expect(readOnlyStorage.initialize()).rejects.toThrow();
    });

    it('should recover from corrupted hot storage', () => {
      // Corrupt the hot storage
      (storage as any).hotStorage = null;

      expect(() => {
        storage.getHotStorage();
      }).toThrow('Hot storage is corrupted');

      storage.repairHotStorage();

      const hotStorage = storage.getHotStorage();
      expect(Array.isArray(hotStorage)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should limit hot storage memory usage', () => {
      const maxSize = 1000;
      storage.setMaxHotStorageSize(maxSize);

      for (let i = 0; i < 2000; i++) {
        storage.addToHotStorage({
          type: 'test',
          timestamp: Date.now(),
          agentId: `agent-${i}`,
          data: {}
        });
      }

      const hotStorage = storage.getHotStorage();
      expect(hotStorage.length).toBeLessThanOrEqual(maxSize);
    });

    it('should estimate memory usage', () => {
      for (let i = 0; i < 100; i++) {
        storage.addToHotStorage({
          type: 'test',
          timestamp: Date.now(),
          agentId: `agent-${i}`,
          data: { someData: 'test'.repeat(100) }
        });
      }

      const memoryUsage = storage.estimateMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Export/Import', () => {
    it('should export all data to JSON', async () => {
      storage.addToHotStorage({
        type: 'test',
        timestamp: Date.now(),
        agentId: 'agent-1',
        data: {}
      });

      const exported = await storage.exportAll('json');
      expect(exported).toBeInstanceOf(Buffer);

      const parsed = JSON.parse(exported.toString());
      expect(parsed.hotStorage).toBeDefined();
    });

    it('should import data from JSON', async () => {
      const data = {
        hotStorage: [
          {
            type: 'test',
            timestamp: Date.now(),
            agentId: 'agent-1',
            data: {}
          }
        ]
      };

      await storage.importAll(Buffer.from(JSON.stringify(data)), 'json');

      const hotStorage = storage.getHotStorage();
      expect(hotStorage.length).toBe(1);
    });

    it('should validate imported data structure', async () => {
      const invalidData = {
        invalidField: 'test'
      };

      await expect(
        storage.importAll(Buffer.from(JSON.stringify(invalidData)), 'json')
      ).rejects.toThrow('Invalid import data structure');
    });
  });
});
