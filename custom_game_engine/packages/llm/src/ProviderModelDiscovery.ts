/**
 * Provider Model Discovery
 *
 * Automatically discover available models from LLM providers by querying their APIs.
 * This eliminates hardcoded model names and adapts to new models automatically.
 */

export interface DiscoveredModel {
  id: string;
  provider: string;
  tier: 1 | 2 | 3 | 4 | 5;  // Automatically classified tier
  created?: number;
  ownedBy?: string;
  contextWindow?: number;
  capabilities?: string[];
  parameterSize?: string;  // e.g., "7B", "32B", "70B"
}

export interface DiscoveryProviderConfig {
  name: string;
  type: 'openai-compat' | 'ollama' | 'anthropic';
  baseUrl: string;
  apiKey?: string;
  modelsEndpoint?: string;  // Override default models endpoint
}

export class ProviderModelDiscovery {
  private modelCache: Map<string, DiscoveredModel[]> = new Map();
  private lastDiscovery: Map<string, number> = new Map();
  private cacheTTL: number = 60 * 60 * 1000;  // 1 hour

  /**
   * Discover models from a provider
   */
  async discoverModels(config: DiscoveryProviderConfig): Promise<DiscoveredModel[]> {
    // Check cache first
    const cached = this.getCachedModels(config.name);
    if (cached) {
      return cached;
    }

    // Query provider
    const models = await this.queryProvider(config);

    // Cache results
    this.modelCache.set(config.name, models);
    this.lastDiscovery.set(config.name, Date.now());

    return models;
  }

  /**
   * Discover models from multiple providers in parallel
   */
  async discoverAllProviders(configs: ProviderConfig[]): Promise<Map<string, DiscoveredModel[]>> {
    const results = await Promise.allSettled(
      configs.map(config => this.discoverModels(config))
    );

    const discovered = new Map<string, DiscoveredModel[]>();
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const result = results[i];

      if (result.status === 'fulfilled') {
        discovered.set(config.name, result.value);
      } else {
        console.error(`[ModelDiscovery] Failed to discover models from ${config.name}:`, result.reason);
        discovered.set(config.name, []);
      }
    }

    return discovered;
  }

  /**
   * Get cached models if still valid
   */
  private getCachedModels(providerName: string): DiscoveredModel[] | null {
    const cached = this.modelCache.get(providerName);
    const lastDiscovery = this.lastDiscovery.get(providerName);

    if (cached && lastDiscovery && (Date.now() - lastDiscovery) < this.cacheTTL) {
      return cached;
    }

    return null;
  }

  /**
   * Query a provider for available models
   */
  private async queryProvider(config: ProviderConfig): Promise<DiscoveredModel[]> {
    if (config.type === 'ollama') {
      return this.queryOllama(config);
    } else if (config.type === 'openai-compat') {
      return this.queryOpenAICompat(config);
    } else if (config.type === 'anthropic') {
      return this.queryAnthropic(config);
    }

    return [];
  }

  /**
   * Query Ollama /api/tags endpoint
   */
  private async queryOllama(config: ProviderConfig): Promise<DiscoveredModel[]> {
    const endpoint = config.modelsEndpoint || `${config.baseUrl}/api/tags`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models: DiscoveredModel[] = [];

      for (const model of data.models || []) {
        const modelId = model.name || model.model;
        const paramSize = this.extractParameterSize(modelId, model.details);
        const tier = this.classifyModelTier(modelId, paramSize);

        models.push({
          id: modelId,
          provider: config.name,
          tier,
          created: model.modified_at ? new Date(model.modified_at).getTime() : undefined,
          contextWindow: paramSize ? this.estimateContextWindow(paramSize) : undefined,
          parameterSize: paramSize,
        });
      }

      return models;
    } catch (error) {
      console.error(`[ModelDiscovery] Failed to query Ollama at ${endpoint}:`, error);
      return [];
    }
  }

  /**
   * Query OpenAI-compatible /v1/models endpoint (Groq, Cerebras, OpenAI)
   */
  private async queryOpenAICompat(config: ProviderConfig): Promise<DiscoveredModel[]> {
    const endpoint = config.modelsEndpoint || `${config.baseUrl}/v1/models`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(endpoint, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models: DiscoveredModel[] = [];

      for (const model of data.data || []) {
        const paramSize = this.extractParameterSize(model.id, model);
        const tier = this.classifyModelTier(model.id, paramSize);

        models.push({
          id: model.id,
          provider: config.name,
          tier,
          created: model.created,
          ownedBy: model.owned_by,
          contextWindow: model.context_window,
          parameterSize: paramSize,
        });
      }

      return models;
    } catch (error) {
      console.error(`[ModelDiscovery] Failed to query OpenAI-compat provider at ${endpoint}:`, error);
      return [];
    }
  }

  /**
   * Query Anthropic models (currently hardcoded as they don't expose a public models endpoint)
   */
  private async queryAnthropic(config: ProviderConfig): Promise<DiscoveredModel[]> {
    // Anthropic doesn't have a public models endpoint, return known models
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        provider: config.name,
        tier: 4,  // Comparable to 70B
        contextWindow: 200000,
        capabilities: ['vision', 'function-calling'],
      },
      {
        id: 'claude-3-5-haiku-20241022',
        provider: config.name,
        tier: 3,  // Comparable to 32B
        contextWindow: 200000,
        capabilities: ['vision', 'function-calling'],
      },
      {
        id: 'claude-3-opus-20240229',
        provider: config.name,
        tier: 5,  // Frontier model
        contextWindow: 200000,
        capabilities: ['vision'],
      },
    ];
  }

  /**
   * Classify model into tier based on name and size
   *
   * Tier 1: 1-3B models (trivial tasks)
   * Tier 2: 7-14B models (simple tasks)
   * Tier 3: 30-40B models (moderate tasks)
   * Tier 4: 60-80B models (complex tasks)
   * Tier 5: Frontier models (Claude, GPT-4, critical tasks)
   */
  private classifyModelTier(modelId: string, parameterSize?: string): 1 | 2 | 3 | 4 | 5 {
    const id = modelId.toLowerCase();
    const size = parameterSize?.toLowerCase() || id;

    // Tier 5: Frontier models (GPT-4, Claude Opus)
    if (id.includes('gpt-4') || id.includes('opus') || id.includes('o1-')) {
      return 5;
    }

    // Tier 4: High-capability models (70B, Claude Sonnet)
    if (id.includes('sonnet')) {
      return 4;
    }

    // Tier 3: Moderate models (32B, Claude Haiku)
    if (id.includes('haiku')) {
      return 3;
    }

    // Extract parameter size
    let params = 0;
    const match = size.match(/(\d+(?:\.\d+)?)\s*b/i);
    if (match) {
      params = parseFloat(match[1]);
    }

    // Tier 1: 1-3B
    if (params > 0 && params <= 3) {
      return 1;
    }

    // Tier 2: 7-14B
    if (params >= 7 && params <= 14) {
      return 2;
    }

    // Tier 3: 30-40B
    if (params >= 30 && params <= 40) {
      return 3;
    }

    // Tier 4: 60-80B
    if (params >= 60 && params <= 80) {
      return 4;
    }

    // Fallback: try to classify by name patterns
    if (id.includes('tiny') || id.includes('1.') || id.includes('2.') || id.includes('3b')) {
      return 1;
    }
    if (id.includes('7b') || id.includes('8b') || id.includes('11b') || id.includes('13b')) {
      return 2;
    }
    if (id.includes('32b') || id.includes('34b')) {
      return 3;
    }
    if (id.includes('70b') || id.includes('72b')) {
      return 4;
    }

    // Default: tier 3 (moderate)
    return 3;
  }

  /**
   * Extract parameter size from model name or metadata
   */
  private extractParameterSize(modelId: string, metadata?: any): string | undefined {
    const id = modelId.toLowerCase();

    // Try to extract from name
    const match = id.match(/(\d+(?:\.\d+)?)\s*b/i);
    if (match) {
      return `${match[1]}B`;
    }

    // Try to extract from metadata
    if (metadata?.parameter_size) {
      return metadata.parameter_size;
    }

    return undefined;
  }

  /**
   * Estimate context window from parameter size
   */
  private estimateContextWindow(parameterSize: string): number {
    // Rough estimates based on model size
    const size = parameterSize.toLowerCase();
    if (size.includes('1b') || size.includes('1.5b')) return 4096;
    if (size.includes('3b') || size.includes('7b')) return 8192;
    if (size.includes('13b') || size.includes('14b')) return 8192;
    if (size.includes('32b') || size.includes('34b')) return 32768;
    if (size.includes('70b')) return 8192;
    return 4096;  // Default
  }

  /**
   * Find a model across all providers
   */
  findModel(modelId: string): DiscoveredModel | null {
    for (const models of this.modelCache.values()) {
      const found = models.find(m => m.id === modelId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Get all models for a specific provider
   */
  getProviderModels(providerName: string): DiscoveredModel[] {
    return this.modelCache.get(providerName) || [];
  }

  /**
   * Get all discovered models
   */
  getAllModels(): DiscoveredModel[] {
    const all: DiscoveredModel[] = [];
    for (const models of this.modelCache.values()) {
      all.push(...models);
    }
    return all;
  }

  /**
   * Get all models for a specific tier
   */
  getModelsByTier(tier: 1 | 2 | 3 | 4 | 5): DiscoveredModel[] {
    const all = this.getAllModels();
    return all.filter(m => m.tier === tier);
  }

  /**
   * Get models organized by tier
   */
  getModelsByTiers(): Record<number, DiscoveredModel[]> {
    const byTier: Record<number, DiscoveredModel[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    for (const model of this.getAllModels()) {
      byTier[model.tier].push(model);
    }

    return byTier;
  }

  /**
   * Clear cache for a specific provider
   */
  clearCache(providerName?: string): void {
    if (providerName) {
      this.modelCache.delete(providerName);
      this.lastDiscovery.delete(providerName);
    } else {
      this.modelCache.clear();
      this.lastDiscovery.clear();
    }
  }
}

/**
 * Example usage:
 *
 * const discovery = new ProviderModelDiscovery();
 *
 * const providers: ProviderConfig[] = [
 *   { name: 'groq', type: 'openai-compat', baseUrl: 'https://api.groq.com/openai', apiKey: process.env.GROQ_API_KEY },
 *   { name: 'cerebras', type: 'openai-compat', baseUrl: 'https://api.cerebras.ai', apiKey: process.env.CEREBRAS_API_KEY },
 *   { name: 'ollama', type: 'ollama', baseUrl: 'http://localhost:11434' },
 * ];
 *
 * const models = await discovery.discoverAllProviders(providers);
 *
 * // Get all Groq models
 * const groqModels = models.get('groq');
 * console.log('Groq models:', groqModels.map(m => m.id));
 *
 * // Find a specific model
 * const qwen = discovery.findModel('qwen/qwen3-32b');
 * console.log('Qwen provider:', qwen?.provider);
 */
