/**
 * BrowserLLMProvider — LLMProvider implementation for in-browser inference.
 *
 * Runs LLM inference inside a dedicated Web Worker via WebLLM (WebGPU) or wllama (WASM).
 * Implements the standard LLMProvider interface — plugs into LLMScheduler/LLMDecisionQueue
 * with zero changes to existing infrastructure.
 *
 * Concurrency: one inference at a time (hardware reality). Additional requests are queued FIFO.
 * Active creature cap: max 3 concurrent creatures use browser LLM; others fall back to cloud.
 */

import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from './LLMProvider.js';
import type {
  BrowserLLMConfig,
  BrowserLLMStatus,
  DownloadProgress,
  WorkerRequest,
  WorkerResponse,
} from './workers/InferenceWorkerProtocol.js';

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

interface PendingRequest {
  id: string;
  resolve: (response: LLMResponse) => void;
  reject: (error: Error) => void;
}

export class BrowserLLMProvider implements LLMProvider {
  private config: BrowserLLMConfig;
  private worker: Worker | null = null;
  private status: BrowserLLMStatus = 'uninitialized';
  private onProgress: DownloadProgressCallback | null = null;
  private initResolve: (() => void) | null = null;
  private initReject: ((err: Error) => void) | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestQueue: Array<{ request: LLMRequest; pending: PendingRequest }> = [];
  private isProcessing = false;
  private requestCounter = 0;

  // Creature gating: max 3 concurrent creatures use browser LLM
  private maxConcurrentCreatures = 3;
  private activeCreatureIds: Set<string> = new Set();

  constructor(config: BrowserLLMConfig) {
    this.config = config;
  }

  // =========================================================================
  // LLMProvider interface
  // =========================================================================

  async generate(request: LLMRequest): Promise<LLMResponse> {
    if (this.status !== 'ready') {
      throw new Error(`BrowserLLMProvider not ready (status: ${this.status})`);
    }

    return new Promise<LLMResponse>((resolve, reject) => {
      const id = `blm-${++this.requestCounter}`;
      const pending: PendingRequest = { id, resolve, reject };

      this.requestQueue.push({ request, pending });
      this.processQueue();
    });
  }

  getModelName(): string {
    return this.config.modelName;
  }

  async isAvailable(): Promise<boolean> {
    if (this.status !== 'ready') return false;
    if (!this.worker) return false;

    // Heartbeat check — verify worker is alive
    try {
      return await this.heartbeat(2000);
    } catch {
      return false;
    }
  }

  getPricing(): ProviderPricing {
    return {
      providerId: 'browser-llm',
      providerName: `Browser LLM (${this.config.modelName})`,
      inputCostPer1M: 0,
      outputCostPer1M: 0,
    };
  }

  getProviderId(): string {
    return 'browser-llm';
  }

  // =========================================================================
  // Browser-specific lifecycle
  // =========================================================================

  async initialize(onProgress?: DownloadProgressCallback): Promise<void> {
    if (this.status === 'ready') return;
    if (this.status === 'downloading' || this.status === 'loading') {
      throw new Error('Already initializing');
    }

    this.onProgress = onProgress ?? null;
    this.status = 'downloading';

    return new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;

      // Spawn dedicated inference worker
      this.worker = new Worker(
        new URL('./workers/InferenceWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (event) => {
        this.status = 'error';
        const err = new Error(`InferenceWorker error: ${event.message}`);
        if (this.initReject) {
          this.initReject(err);
          this.initResolve = null;
          this.initReject = null;
        }
        this.rejectAllPending(err);
      };

      // Send init message
      this.sendToWorker({ type: 'init', config: this.config });
    });
  }

  async dispose(): Promise<void> {
    if (this.worker) {
      this.sendToWorker({ type: 'dispose' });
      // Give the worker a moment to clean up, then terminate
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      this.worker.terminate();
      this.worker = null;
    }
    this.status = 'disposed';
    this.activeCreatureIds.clear();
    this.rejectAllPending(new Error('Provider disposed'));
  }

  getStatus(): BrowserLLMStatus {
    return this.status;
  }

  getConfig(): BrowserLLMConfig {
    return { ...this.config };
  }

  // =========================================================================
  // Creature gating
  // =========================================================================

  canAcceptCreature(agentId: string): boolean {
    return this.activeCreatureIds.has(agentId) ||
           this.activeCreatureIds.size < this.maxConcurrentCreatures;
  }

  registerCreature(agentId: string): boolean {
    if (!this.canAcceptCreature(agentId)) return false;
    this.activeCreatureIds.add(agentId);
    return true;
  }

  releaseCreature(agentId: string): void {
    this.activeCreatureIds.delete(agentId);
  }

  getActiveCreatureCount(): number {
    return this.activeCreatureIds.size;
  }

  // =========================================================================
  // Static capability check
  // =========================================================================

  static async canRunModel(config: BrowserLLMConfig): Promise<{
    supported: boolean;
    backend: import('./workers/InferenceWorkerProtocol.js').BrowserLLMBackend | null;
    reason?: string;
  }> {
    // Check WebGPU
    let hasWebGPU = false;
    try {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        hasWebGPU = adapter !== null;
      }
    } catch {
      // Not available
    }

    // Estimate memory
    const memoryGB = (navigator as any).deviceMemory ?? 4;
    const requiredGB = config.memoryRequirementMB / 1024;

    if (config.backend === 'webllm' && !hasWebGPU) {
      return { supported: false, backend: null, reason: 'WebGPU not available' };
    }

    if (memoryGB < requiredGB * 1.3) {
      return { supported: false, backend: null, reason: `Insufficient memory: ${memoryGB}GB < ${(requiredGB * 1.3).toFixed(1)}GB required` };
    }

    return { supported: true, backend: config.backend };
  }

  // =========================================================================
  // Internal
  // =========================================================================

  private sendToWorker(msg: WorkerRequest): void {
    this.worker?.postMessage(msg);
  }

  private handleWorkerMessage(msg: WorkerResponse): void {
    switch (msg.type) {
      case 'init-progress':
        this.status = msg.progress.phase === 'downloading' ? 'downloading' : 'loading';
        this.onProgress?.(msg.progress);
        break;

      case 'init-complete':
        this.status = 'ready';
        if (this.initResolve) {
          this.initResolve();
          this.initResolve = null;
          this.initReject = null;
        }
        break;

      case 'init-error':
        this.status = 'error';
        if (this.initReject) {
          this.initReject(new Error(msg.error));
          this.initResolve = null;
          this.initReject = null;
        }
        break;

      case 'generate-complete': {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          this.pendingRequests.delete(msg.id);
          pending.resolve(msg.response);
        }
        this.isProcessing = false;
        this.processQueue();
        break;
      }

      case 'generate-error': {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          this.pendingRequests.delete(msg.id);
          pending.reject(new Error(msg.error));
        }
        this.isProcessing = false;
        this.processQueue();
        break;
      }

      case 'heartbeat-ack':
        // Handled by heartbeat() promise
        break;

      case 'oom':
        this.status = 'error';
        this.rejectAllPending(new Error(`Out of memory: ${msg.error}`));
        break;
    }
  }

  private processQueue(): void {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    const next = this.requestQueue.shift()!;
    this.isProcessing = true;
    this.pendingRequests.set(next.pending.id, next.pending);

    this.sendToWorker({
      type: 'generate',
      id: next.pending.id,
      request: next.request,
    });
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(error);
    }
    this.pendingRequests.clear();

    for (const queued of this.requestQueue) {
      queued.pending.reject(error);
    }
    this.requestQueue = [];
    this.isProcessing = false;
  }

  private heartbeat(timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), timeoutMs);

      const handler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'heartbeat-ack') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', handler);
          resolve(true);
        }
      };

      this.worker?.addEventListener('message', handler);
      this.sendToWorker({ type: 'heartbeat' });
    });
  }
}
