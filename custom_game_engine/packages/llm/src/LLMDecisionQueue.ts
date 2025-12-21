import type { LLMProvider, LLMRequest } from './LLMProvider.js';

interface DecisionRequest {
  agentId: string;
  prompt: string;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
}

/**
 * Manages async LLM decision requests with rate limiting.
 * Returns raw LLM responses for parsing by AISystem.
 */
export class LLMDecisionQueue {
  private provider: LLMProvider;
  private queue: DecisionRequest[] = [];
  private processing = false;
  private maxConcurrent: number;
  private activeRequests = 0;
  private decisions: Map<string, string> = new Map();

  constructor(provider: LLMProvider, maxConcurrent: number = 2) {
    this.provider = provider;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Request a decision for an agent (non-blocking).
   * Returns raw LLM response text for parsing by AISystem.
   */
  requestDecision(agentId: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ agentId, prompt, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Get a decision if ready (synchronous check).
   * Returns raw LLM response text.
   */
  getDecision(agentId: string): string | null {
    const decision = this.decisions.get(agentId);
    if (decision) {
      this.decisions.delete(agentId);
      return decision;
    }
    return null;
  }

  /**
   * Process queued requests.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      this.activeRequests++;
      this.processRequest(request).finally(() => {
        this.activeRequests--;
        this.processQueue(); // Continue processing
      });
    }

    this.processing = false;
  }

  /**
   * Process a single request.
   */
  private async processRequest(request: DecisionRequest): Promise<void> {
    try {
      const llmRequest: LLMRequest = {
        prompt: request.prompt,
        temperature: 0.7,
        maxTokens: 100, // Increased for structured responses
        // Let OllamaProvider handle stop sequences
      };

      const response = await this.provider.generate(llmRequest);

      // Store raw response for synchronous retrieval
      this.decisions.set(request.agentId, response.text);
      request.resolve(response.text);
    } catch (error) {
      console.error(`[LLMDecisionQueue] Decision error for agent ${request.agentId}:`, error);
      request.reject(error as Error);
    }
  }

  /**
   * Get queue size.
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get active request count.
   */
  getActiveCount(): number {
    return this.activeRequests;
  }
}
