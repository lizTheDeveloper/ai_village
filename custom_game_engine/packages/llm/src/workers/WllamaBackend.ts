/**
 * WllamaBackend — Wraps wllama (llama.cpp compiled to WASM) for CPU inference inside a Worker.
 *
 * Fallback backend when WebGPU is unavailable. Slower but works on more devices.
 * Supports WASM SIMD and multi-threading via SharedArrayBuffer.
 */

import type { LLMRequest, LLMResponse } from '../LLMProvider.js';
import type { BrowserLLMConfig, DownloadProgress } from './InferenceWorkerProtocol.js';
import type { InferenceBackend } from './WebLLMBackend.js';

/**
 * wllama backend using llama.cpp WASM build.
 * Expects @nicepkg/wllama to be available in the worker bundle.
 */
export class WllamaBackend implements InferenceBackend {
  private wllama: any = null;

  async init(config: BrowserLLMConfig, onProgress: (p: DownloadProgress) => void): Promise<void> {
    // Dynamic import — wllama may not be installed yet (Phase 3 dep)
    const { Wllama } = await import('@nicepkg/wllama');

    this.wllama = new Wllama({
      'single-thread/wllama.wasm': '/wasm/wllama-single.wasm',
      'multi-thread/wllama.wasm': '/wasm/wllama-multi.wasm',
    });

    let lastProgress = 0;
    await this.wllama.loadModelFromUrl(config.modelId, {
      progressCallback: (loaded: number, total: number) => {
        const progress = total > 0 ? loaded / total : 0;
        if (progress - lastProgress > 0.01) {
          lastProgress = progress;
          onProgress({
            phase: progress < 1 ? 'downloading' : 'loading',
            progress,
            downloadedMB: loaded / (1024 * 1024),
            totalMB: total / (1024 * 1024),
            speedMBps: 0,
          });
        }
      },
    });
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    if (!this.wllama) {
      throw new Error('wllama not initialized');
    }

    const result = await this.wllama.createCompletion(request.prompt, {
      nPredict: request.maxTokens ?? 512,
      temperature: request.temperature ?? 0.7,
      stopStrings: request.stopSequences,
    });

    return {
      text: typeof result === 'string' ? result : result.text ?? '',
      stopReason: 'stop',
      inputTokens: result.promptTokens ?? 0,
      outputTokens: result.completionTokens ?? 0,
      costUSD: 0, // Local inference — free
    };
  }

  async dispose(): Promise<void> {
    if (this.wllama) {
      await this.wllama.exit();
      this.wllama = null;
    }
  }

  getMemoryUsageMB(): number {
    return 0;
  }
}
