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

interface ClientOptions {
  cacheTTL?: number;  // ms
  timeout?: number;   // ms
  maxRetries?: number;
  retryDelay?: number; // ms
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

export class MetricsAPIClient {
  public readonly baseURL: string;
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<unknown>>();
  private cacheTTL: number;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(baseURL: string = API_BASE_URL, options: ClientOptions = {}) {
    if (!baseURL) {
      throw new Error('MetricsAPIClient requires a non-empty base URL');
    }
    try {
      new URL(baseURL);
    } catch {
      throw new Error(`Invalid URL: "${baseURL}" is not a valid URL`);
    }
    this.baseURL = baseURL;
    this.cacheTTL = options.cacheTTL ?? 30000; // 30s default
    this.timeout = options.timeout ?? 0; // 0 = no timeout
    this.maxRetries = options.maxRetries ?? 0;
    this.retryDelay = options.retryDelay ?? 500;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    if (this.timeout <= 0) {
      return fetch(url);
    }
    const timeoutMs = this.timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new APIError(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    return Promise.race([fetch(url), timeoutPromise]);
  }

  private async fetchJSONWithRetry<T>(endpoint: string, attempt: number = 0): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    let response: Response;
    try {
      response = await this.fetchWithTimeout(url);
    } catch (error) {
      if (error instanceof APIError) throw error;
      // Retry on network errors
      if (attempt < this.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.fetchJSONWithRetry<T>(endpoint, attempt + 1);
      }
      throw new APIError(`Failed to connect to metrics API: ${error}`);
    }

    if (!response.ok) {
      // Retry on 5xx errors only
      if (response.status >= 500 && attempt < this.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.fetchJSONWithRetry<T>(endpoint, attempt + 1);
      }

      // Try to read error message from body
      let bodyMessage: string | null = null;
      if (typeof response.json === 'function') {
        try {
          const body = await response.json();
          if (body && typeof body.error === 'string') {
            bodyMessage = body.error;
          }
        } catch {
          // ignore
        }
      }

      const message = bodyMessage
        ? `API request failed: ${bodyMessage}`
        : `API request failed: ${response.statusText} (${response.status})`;
      throw new APIError(message, response.status);
    }

    const data = await response.json();

    if (!data) {
      throw new APIError('API returned empty response');
    }

    return data;
  }

  private async fetchJSON<T>(endpoint: string): Promise<T> {
    return this.fetchJSONWithRetry<T>(endpoint);
  }

  private async fetchCached<T>(endpoint: string, force: boolean = false): Promise<T> {
    const key = endpoint;

    if (!force) {
      const cached = this.cache.get(key);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T;
      }
    }

    // Deduplicate in-flight requests
    if (!force && this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = this.fetchJSON<T>(endpoint).then((data) => {
      this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTTL });
      this.inFlight.delete(key);
      return data;
    }).catch((err) => {
      this.inFlight.delete(key);
      throw err;
    });

    if (!force) {
      this.inFlight.set(key, promise);
    }

    return promise;
  }

  clearCache(): void {
    this.cache.clear();
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

  async fetchNetworkData(options?: { force?: boolean }) {
    const data = await this.fetchCached<{ nodes: unknown[]; edges: unknown[] }>('/api/metrics/network', options?.force);
    if (!data || !Array.isArray((data as any).edges)) {
      throw new APIError('Invalid network data: missing edges array');
    }
    return data;
  }

  async fetchTimelineData(options?: { start?: number; end?: number; force?: boolean }) {
    if (options?.start !== undefined && options?.end !== undefined) {
      if (options.start > options.end) {
        throw new APIError('Invalid time range: start time must be before end time');
      }
    }

    let endpoint = '/api/metrics/timeline';
    if (options?.start !== undefined || options?.end !== undefined) {
      const params = new URLSearchParams();
      if (options?.start !== undefined) params.append('start', options.start.toString());
      if (options?.end !== undefined) params.append('end', options.end.toString());
      const query = params.toString();
      if (query) endpoint += `?${query}`;
    }

    const data = await this.fetchCached<{ behaviors: unknown[] }>(endpoint, options?.force);
    if (!data || !Array.isArray((data as any).behaviors)) {
      throw new APIError('Invalid timeline data: missing behaviors array');
    }
    return data;
  }

  async fetchSpatialData(options?: { force?: boolean }) {
    const data = await this.fetchCached<{ density: unknown[] }>('/api/metrics/spatial', options?.force);
    if (!data || !Array.isArray((data as any).density)) {
      throw new APIError('Invalid spatial data: missing density array');
    }
    return data;
  }

  async fetchInequalityData(options?: { force?: boolean }) {
    const data = await this.fetchCached<{ lorenzCurve: unknown[] }>('/api/metrics/inequality', options?.force);
    if (!data || !Array.isArray((data as any).lorenzCurve)) {
      throw new APIError('Invalid inequality data: missing lorenzCurve array');
    }
    return data;
  }

  async fetchCulturalData(options?: { force?: boolean }) {
    const data = await this.fetchCached<{ sankeyData: unknown }>('/api/metrics/cultural', options?.force);
    if (!data || !(data as any).sankeyData) {
      throw new APIError('Invalid cultural data: missing sankeyData');
    }
    return data;
  }

  async fetchTimeSeriesData(metrics: string[], options?: { force?: boolean }) {
    if (!metrics || metrics.length === 0) {
      throw new APIError('fetchTimeSeriesData requires at least one metric');
    }
    const encodedMetrics = metrics.map(m => encodeURIComponent(m)).join(',');
    return this.fetchCached(`/api/metrics/timeseries?metrics=${encodedMetrics}`, options?.force);
  }

  async fetchAgentDetails(agentId: string) {
    if (!agentId) {
      throw new APIError('fetchAgentDetails requires a non-empty agent ID');
    }
    return this.fetchJSON(`/api/metrics/agent/${agentId}`);
  }
}

// Default instance for backward compatibility
export const apiClient = new MetricsAPIClient();
