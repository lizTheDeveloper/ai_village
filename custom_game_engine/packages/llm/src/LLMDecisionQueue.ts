import type { LLMProvider, LLMRequest } from './LLMProvider.js';
import type { AgentBehavior } from '@ai-village/core';
import { ResponseParser } from './ResponseParser.js';

interface DecisionRequest {
  agentId: string;
  prompt: string;
  resolve: (behavior: AgentBehavior) => void;
  reject: (error: Error) => void;
}

/**
 * Manages async LLM decision requests with rate limiting.
 */
export class LLMDecisionQueue {
  private provider: LLMProvider;
  private parser: ResponseParser;
  private queue: DecisionRequest[] = [];
  private processing = false;
  private maxConcurrent: number;
  private activeRequests = 0;
  private decisions: Map<string, AgentBehavior> = new Map();

  constructor(provider: LLMProvider, maxConcurrent: number = 2) {
    this.provider = provider;
    this.parser = new ResponseParser();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Request a decision for an agent (non-blocking).
   */
  requestDecision(agentId: string, prompt: string): Promise<AgentBehavior> {
    return new Promise((resolve, reject) => {
      this.queue.push({ agentId, prompt, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Get a decision if ready (synchronous check).
   */
  getDecision(agentId: string): AgentBehavior | null {
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
        maxTokens: 50,
        stopSequences: ['\n', 'Action:', 'Choose:'],
      };

      const response = await this.provider.generate(llmRequest);
      const behavior = this.parser.parseBehavior(response.text);

      // Store decision for synchronous retrieval
      this.decisions.set(request.agentId, behavior);
      request.resolve(behavior);
    } catch (error) {
      console.error(`LLM decision error for agent ${request.agentId}:`, error);
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
