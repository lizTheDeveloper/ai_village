import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsAPIClient } from '@/utils/apiClient';
import { mockNetworkData, mockTimelineData } from '../mockData';

describe('MetricsAPIClient', () => {
  let client: MetricsAPIClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    client = new MetricsAPIClient('http://localhost:8766');
  });

  describe('constructor', () => {
    it('should create client with base URL', () => {
      expect(client).toBeDefined();
      expect(client.baseURL).toBe('http://localhost:8766');
    });

    it('should throw when base URL is empty', () => {
      expect(() => {
        new MetricsAPIClient('');
      }).toThrow('base URL');
    });

    it('should throw when base URL is invalid', () => {
      expect(() => {
        new MetricsAPIClient('not-a-url');
      }).toThrow('Invalid URL');
    });
  });

  describe('fetchNetworkData', () => {
    it('should fetch network data from API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      const result = await client.fetchNetworkData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/network');
      expect(result).toEqual(mockNetworkData);
    });

    it('should throw when API returns error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.fetchNetworkData()).rejects.toThrow('500');
    });

    it('should throw when response is not JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client.fetchNetworkData()).rejects.toThrow('Invalid JSON');
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(client.fetchNetworkData()).rejects.toThrow('Network error');
    });
  });

  describe('fetchTimelineData', () => {
    it('should fetch timeline data with time range', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockTimelineData,
      });

      const result = await client.fetchTimelineData({ start: 1000, end: 3000 });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8766/api/metrics/timeline?start=1000&end=3000'
      );
      expect(result).toEqual(mockTimelineData);
    });

    it('should fetch timeline data without time range', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockTimelineData,
      });

      await client.fetchTimelineData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/timeline');
    });

    it('should throw when start is after end', async () => {
      await expect(
        client.fetchTimelineData({ start: 3000, end: 1000 })
      ).rejects.toThrow('start time must be before end time');
    });
  });

  describe('fetchSpatialData', () => {
    it('should fetch spatial data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ density: [], trails: [], territories: [] }),
      });

      await client.fetchSpatialData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/spatial');
    });
  });

  describe('fetchInequalityData', () => {
    it('should fetch inequality data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ lorenzCurve: [], giniTrend: [], quartiles: {} }),
      });

      await client.fetchInequalityData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/inequality');
    });
  });

  describe('fetchCulturalData', () => {
    it('should fetch cultural diffusion data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ sankeyData: { nodes: [], links: [] } }),
      });

      await client.fetchCulturalData();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8766/api/metrics/cultural');
    });
  });

  describe('fetchTimeSeriesData', () => {
    it('should fetch time series data for metrics', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ metrics: [], correlations: [] }),
      });

      await client.fetchTimeSeriesData(['average_mood', 'gini']);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8766/api/metrics/timeseries?metrics=average_mood,gini'
      );
    });

    it('should throw when metrics array is empty', async () => {
      await expect(client.fetchTimeSeriesData([])).rejects.toThrow('at least one metric');
    });
  });

  describe('fetchAgentDetails', () => {
    it('should fetch agent details by ID', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'agent-001', name: 'Alice' }),
      });

      await client.fetchAgentDetails('agent-001');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8766/api/metrics/agent/agent-001'
      );
    });

    it('should throw when agent ID is empty', async () => {
      await expect(client.fetchAgentDetails('')).rejects.toThrow('agent ID');
    });
  });

  describe('caching', () => {
    it('should cache responses by default', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      await client.fetchNetworkData();
      await client.fetchNetworkData();

      // Should only fetch once due to caching
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when force=true', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      await client.fetchNetworkData();
      await client.fetchNetworkData({ force: true });

      // Should fetch twice
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockNetworkData,
      });

      await client.fetchNetworkData();
      client.clearCache();
      await client.fetchNetworkData();

      // Should fetch twice after clearing cache
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should throw descriptive error for 404', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(client.fetchNetworkData()).rejects.toThrow('404');
    });

    it('should throw descriptive error for 500', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.fetchNetworkData()).rejects.toThrow('500');
    });

    it('should throw when response body is malformed', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      await expect(client.fetchNetworkData()).rejects.toThrow();
    });
  });
});
