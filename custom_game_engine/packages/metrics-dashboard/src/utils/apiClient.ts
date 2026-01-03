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

async function fetchJSON<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

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

export const apiClient = {
  async getNetworkMetrics() {
    return fetchJSON('/api/metrics/network');
  },

  async getTimelineMetrics() {
    return fetchJSON('/api/metrics/timeline');
  },

  async getSpatialMetrics() {
    return fetchJSON('/api/metrics/spatial');
  },

  async getInequalityMetrics() {
    return fetchJSON('/api/metrics/inequality');
  },

  async getCulturalMetrics() {
    return fetchJSON('/api/metrics/cultural');
  },

  async getTimeSeriesMetrics() {
    return fetchJSON('/api/metrics/timeseries');
  },

  async getAgentDetails(agentId: string) {
    return fetchJSON(`/api/agents/${agentId}`);
  },
};
