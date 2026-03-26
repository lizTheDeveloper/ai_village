/**
 * WebLLMBackend — Wraps @mlc-ai/web-llm for WebGPU-accelerated inference inside a Worker.
 *
 * This runs INSIDE the InferenceWorker. It manages the WebLLM engine lifecycle:
 * init (download + compile) → generate → dispose.
 */

import type { LLMRequest, LLMResponse } from '../LLMProvider.js';
import type { BrowserLLMConfig, DownloadProgress } from './InferenceWorkerProtocol.js';

export interface InferenceBackend {
  init(config: BrowserLLMConfig, onProgress: (p: DownloadProgress) => void): Promise<void>;
  generate(request: LLMRequest): Promise<LLMResponse>;
  dispose(): Promise<void>;
  getMemoryUsageMB(): number;
}

/**
 * WebLLM backend using MLC's WebGPU-compiled models.
 * Expects @mlc-ai/web-llm to be available in the worker bundle.
 */
export class WebLLMBackend implements InferenceBackend {
  private engine: any = null;
  private modelId: string = '';

  async init(config: BrowserLLMConfig, onProgress: (p: DownloadProgress) => void): Promise<void> {
    // Dynamic import — @mlc-ai/web-llm may not be installed yet (Phase 3 dep)
    const webllm = await import('@mlc-ai/web-llm');

    this.modelId = config.modelId;

    const initProgressCallback = (report: any) => {
      onProgress({
        phase: report.progress < 1 ? 'downloading' : 'loading',
        progress: report.progress ?? 0,
        downloadedMB: (report.loaded ?? 0) / (1024 * 1024),
        totalMB: config.downloadSizeMB,
        speedMBps: 0, // WebLLM doesn't expose speed
      });
    };

    this.engine = await webllm.CreateMLCEngine(config.modelId, {
      initProgressCallback,
      appConfig: {
        ...webllm.prebuiltAppConfig,
        useIndexedDBCache: true,
      },
    });
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const response = await this.engine.chat.completions.create({
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 512,
      stop: request.stopSequences,
    });

    const choice = response.choices[0];
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

    return {
      text: choice?.message?.content ?? '',
      stopReason: choice?.finish_reason ?? 'stop',
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      costUSD: 0, // Local inference — free
    };
  }

  async dispose(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
  }

  getMemoryUsageMB(): number {
    // WebLLM doesn't expose precise memory usage; return estimate from config
    return 0;
  }
}
