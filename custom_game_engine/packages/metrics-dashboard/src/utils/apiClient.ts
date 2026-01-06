const API_BASE_URL = 'http://localhost:8766';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class MetricsAPIClient {
  constructor(private baseURL: string = API_BASE_URL) {}

  private async fetchJSON<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new APIError(`Failed to connect to metrics API: ${error}`);
    }

    if (!response.ok) {
      throw new APIError(
        `API request failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();

    if (!data) {
      throw new APIError('API returned empty response');
    }

    return data;
  }

  async healthCheck() {
    return this.fetchJSON<{ status: string }>('/api/health');
  }

  async getNetworkMetrics() {
    return this.fetchJSON('/api/metrics/network');
  }

  async getTimelineMetrics() {
    return this.fetchJSON('/api/metrics/timeline');
  }

  async getSpatialMetrics() {
    return this.fetchJSON('/api/metrics/spatial');
  }

  async getInequalityMetrics() {
    return this.fetchJSON('/api/metrics/inequality');
  }

  async getCulturalMetrics() {
    return this.fetchJSON('/api/metrics/cultural');
  }

  async getTimeSeriesMetrics() {
    return this.fetchJSON('/api/metrics/timeseries');
  }

  async getAgentDetails(agentId: string) {
    return this.fetchJSON(`/api/agents/${agentId}`);
  }

  // Aliases for test compatibility
  async fetchNetworkData(options?: { force?: boolean }) {
    return this.getNetworkMetrics();
  }

  async fetchTimelineData(options?: { start?: number; end?: number }) {
    let endpoint = '/api/metrics/timeline';
    if (options) {
      const params = new URLSearchParams();
      if (options.start !== undefined) params.append('start', options.start.toString());
      if (options.end !== undefined) params.append('end', options.end.toString());
      const query = params.toString();
      if (query) endpoint += `?${query}`;
    }
    return this.fetchJSON(endpoint);
  }

  async fetchSpatialData() {
    return this.getSpatialMetrics();
  }

  async fetchInequalityData() {
    return this.getInequalityMetrics();
  }

  async fetchCulturalData() {
    return this.getCulturalMetrics();
  }

  async fetchTimeSeriesData(metrics: string[]) {
    const encodedMetrics = metrics.map(m => encodeURIComponent(m)).join(',');
    return this.fetchJSON(`/api/metrics/timeseries?metrics=${encodedMetrics}`);
  }
}

// Default instance for backward compatibility
export const apiClient = new MetricsAPIClient();
