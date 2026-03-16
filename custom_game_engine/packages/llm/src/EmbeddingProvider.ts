/**
 * EmbeddingProvider - Interface and implementations for text embedding services.
 * Used by SemanticResponseCache to find semantically similar prompts.
 */

export interface EmbeddingProvider {
  embed(text: string): Promise<Float32Array>;
  isAvailable(): boolean;
}

export interface OpenAICompatEmbeddingConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

/**
 * OpenAI-compatible embedding provider.
 * Works with Groq (nomic-embed-text-v1.5), Ollama (/v1/embeddings), etc.
 */
export class OpenAICompatEmbeddingProvider implements EmbeddingProvider {
  private config: OpenAICompatEmbeddingConfig;
  private available = true;

  constructor(config: OpenAICompatEmbeddingConfig) {
    this.config = config;
  }

  async embed(text: string): Promise<Float32Array> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/embeddings`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input: text, model: this.config.model }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      this.available = false;
      throw new Error(`Embedding service error: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    this.available = true;
    const first = data.data[0];
    if (!first) throw new Error('Embedding service returned empty data array');
    return new Float32Array(first.embedding);
  }

  isAvailable(): boolean {
    return this.available;
  }
}

/**
 * Ollama native embedding provider.
 * Uses POST /api/embeddings endpoint.
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private available = true;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'nomic-embed-text') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async embed(text: string): Promise<Float32Array> {
    const url = `${this.baseUrl}/api/embeddings`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      this.available = false;
      throw new Error(`Ollama embedding error: ${response.status}`);
    }

    const data = await response.json() as { embedding: number[] };
    this.available = true;
    return new Float32Array(data.embedding);
  }

  isAvailable(): boolean {
    return this.available;
  }
}
