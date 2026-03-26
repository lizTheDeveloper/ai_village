/**
 * InferenceWorkerProtocol — Shared message types between main thread and inference Worker.
 *
 * The inference Worker runs LLM inference (via WebLLM or wllama) in isolation.
 * Communication is via postMessage/onmessage with typed messages.
 */

import type { LLMRequest, LLMResponse } from '../LLMProvider.js';

// ============================================================================
// Configuration Types
// ============================================================================

export type BrowserLLMBackend = 'webllm' | 'wllama';
export type BrowserLLMStatus = 'uninitialized' | 'downloading' | 'loading' | 'ready' | 'error' | 'disposed';

export interface BrowserLLMConfig {
  /** Model ID for WebLLM registry (e.g., 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC') */
  modelId: string;
  /** Human-readable model name */
  modelName: string;
  /** Which backend to use */
  backend: BrowserLLMBackend;
  /** Maximum tokens the model supports */
  maxContextLength: number;
  /** Approximate VRAM/memory requirement in MB */
  memoryRequirementMB: number;
  /** Approximate download size in MB */
  downloadSizeMB: number;
  /** Reserved for future LoRA adapter support */
  loraAdapterId?: string;
}

// ============================================================================
// Download Progress
// ============================================================================

export interface DownloadProgress {
  phase: 'downloading' | 'loading';
  progress: number;       // 0-1
  downloadedMB: number;
  totalMB: number;
  speedMBps: number;
}

// ============================================================================
// Main Thread → Worker Messages
// ============================================================================

export type WorkerRequest =
  | { type: 'init'; config: BrowserLLMConfig }
  | { type: 'generate'; id: string; request: LLMRequest }
  | { type: 'abort'; id: string }
  | { type: 'dispose' }
  | { type: 'heartbeat' };

// ============================================================================
// Worker → Main Thread Messages
// ============================================================================

export type WorkerResponse =
  | { type: 'init-progress'; progress: DownloadProgress }
  | { type: 'init-complete' }
  | { type: 'init-error'; error: string }
  | { type: 'generate-complete'; id: string; response: LLMResponse }
  | { type: 'generate-error'; id: string; error: string }
  | { type: 'heartbeat-ack'; memoryUsageMB: number }
  | { type: 'oom'; error: string };
