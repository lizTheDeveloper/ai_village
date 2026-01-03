import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsAPIClient } from '@/utils/apiClient';
import {
  mockNetworkData,
  mockTimelineData,
  mockSpatialData,
  mockInequalityData,
  mockCulturalData,
  mockTimeSeriesData,
} from '../mockData';

describe('MetricsAPI Integration', () => {
  let client: MetricsAPIClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    client = new MetricsAPIClient('http://localhost:8766');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API connection', () => {
    it('should connect to metrics server on http://localhost:8766', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      await client.healthCheck();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/health');
    });

    it('should throw when server is unreachable', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(client.healthCheck()).rejects.toThrow('Network error');
    });

    it('should throw when server returns non-200 status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await expect(client.healthCheck()).rejects.toThrow('503');
    });
  });

  describe('fetching all data types', () => {
    it('should fetch network data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      const result = await client.fetchNetworkData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/network');
      expect(result).toEqual(mockNetworkData);
    });

    it('should fetch timeline data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockTimelineData,
      });

      const result = await client.fetchTimelineData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/timeline');
      expect(result).toEqual(mockTimelineData);
    });

    it('should fetch spatial data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockSpatialData,
      });

      const result = await client.fetchSpatialData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/spatial');
      expect(result).toEqual(mockSpatialData);
    });

    it('should fetch inequality data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockInequalityData,
      });

      const result = await client.fetchInequalityData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/inequality');
      expect(result).toEqual(mockInequalityData);
    });

    it('should fetch cultural diffusion data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockCulturalData,
      });

      const result = await client.fetchCulturalData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/cultural');
      expect(result).toEqual(mockCulturalData);
    });

    it('should fetch time series data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockTimeSeriesData,
      });

      const result = await client.fetchTimeSeriesData(['average_mood', 'gini']);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8766/api/metrics/timeseries?metrics=average_mood,gini'
      );
      expect(result).toEqual(mockTimeSeriesData);
    });
  });

  describe('data validation', () => {
    it('should validate network data structure', async () => {
      const invalidData = { nodes: [], communities: [] }; // Missing edges

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => invalidData,
      });

      await expect(client.fetchNetworkData()).rejects.toThrow('edges');
    });

    it('should validate timeline data structure', async () => {
      const invalidData = { innovations: [] }; // Missing behaviors

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => invalidData,
      });

      await expect(client.fetchTimelineData()).rejects.toThrow('behaviors');
    });

    it('should validate spatial data structure', async () => {
      const invalidData = { trails: [], territories: [] }; // Missing density

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => invalidData,
      });

      await expect(client.fetchSpatialData()).rejects.toThrow('density');
    });

    it('should validate inequality data structure', async () => {
      const invalidData = { giniTrend: [], quartiles: {} }; // Missing lorenzCurve

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => invalidData,
      });

      await expect(client.fetchInequalityData()).rejects.toThrow('lorenzCurve');
    });

    it('should validate cultural data structure', async () => {
      const invalidData = { cascadeTrees: [], adoptionCurves: {} }; // Missing sankeyData

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => invalidData,
      });

      await expect(client.fetchCulturalData()).rejects.toThrow('sankeyData');
    });
  });

  describe('query parameters', () => {
    it('should pass time range parameters for timeline', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockTimelineData,
      });

      await client.fetchTimelineData({ start: 1000, end: 3000 });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8766/api/metrics/timeline?start=1000&end=3000'
      );
    });

    it('should pass metric names for time series', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockTimeSeriesData,
      });

      await client.fetchTimeSeriesData(['average_mood', 'resource_inequality']);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8766/api/metrics/timeseries?metrics=average_mood,resource_inequality'
      );
    });

    it('should URL-encode query parameters', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockTimeSeriesData,
      });

      await client.fetchTimeSeriesData(['metric with spaces']);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8766/api/metrics/timeseries?metrics=metric%20with%20spaces'
      );
    });
  });

  describe('error responses', () => {
    it('should handle 404 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(client.fetchNetworkData()).rejects.toThrow('404');
    });

    it('should handle 500 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.fetchNetworkData()).rejects.toThrow('500');
    });

    it('should include error message from server', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid time range' }),
      });

      await expect(client.fetchTimelineData()).rejects.toThrow('Invalid time range');
    });
  });

  describe('caching behavior', () => {
    it('should cache responses by default', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      await client.fetchNetworkData();
      await client.fetchNetworkData();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      const shortCacheClient = new MetricsAPIClient('http://localhost:8766', {
        cacheTTL: 100, // 100ms
      });

      await shortCacheClient.fetchNetworkData();

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      await shortCacheClient.fetchNetworkData();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should bypass cache with force option', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      await client.fetchNetworkData();
      await client.fetchNetworkData({ force: true });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on demand', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      await client.fetchNetworkData();
      client.clearCache();
      await client.fetchNetworkData();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('network')) {
          return Promise.resolve({ ok: true, json: async () => mockNetworkData });
        }
        if (url.includes('timeline')) {
          return Promise.resolve({ ok: true, json: async () => mockTimelineData });
        }
        if (url.includes('spatial')) {
          return Promise.resolve({ ok: true, json: async () => mockSpatialData });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const results = await Promise.all([
        client.fetchNetworkData(),
        client.fetchTimelineData(),
        client.fetchSpatialData(),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockNetworkData);
      expect(results[1]).toEqual(mockTimelineData);
      expect(results[2]).toEqual(mockSpatialData);
    });

    it('should not cache identical concurrent requests separately', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      await Promise.all([
        client.fetchNetworkData(),
        client.fetchNetworkData(),
        client.fetchNetworkData(),
      ]);

      // Should only fetch once due to deduplication
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long requests', async () => {
      fetchMock.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, json: async () => mockNetworkData });
          }, 10000); // 10 seconds
        });
      });

      const timeoutClient = new MetricsAPIClient('http://localhost:8766', {
        timeout: 100, // 100ms timeout
      });

      await expect(timeoutClient.fetchNetworkData()).rejects.toThrow('timeout');
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests', async () => {
      let attempts = 0;

      fetchMock.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, json: async () => mockNetworkData });
      });

      const retryClient = new MetricsAPIClient('http://localhost:8766', {
        maxRetries: 3,
        retryDelay: 10,
      });

      const result = await retryClient.fetchNetworkData();

      expect(attempts).toBe(3);
      expect(result).toEqual(mockNetworkData);
    });

    it('should not retry on client errors (4xx)', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const retryClient = new MetricsAPIClient('http://localhost:8766', {
        maxRetries: 3,
      });

      await expect(retryClient.fetchNetworkData()).rejects.toThrow('400');
      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries for 4xx
    });

    it('should retry on server errors (5xx)', async () => {
      let attempts = 0;

      fetchMock.mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true, json: async () => mockNetworkData });
      });

      const retryClient = new MetricsAPIClient('http://localhost:8766', {
        maxRetries: 3,
        retryDelay: 10,
      });

      await retryClient.fetchNetworkData();

      expect(attempts).toBe(2);
    });
  });
});
