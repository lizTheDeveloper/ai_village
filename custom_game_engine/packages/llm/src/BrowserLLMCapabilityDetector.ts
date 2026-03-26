/**
 * BrowserLLMCapabilityDetector — Probes device capabilities for in-browser LLM inference.
 *
 * Determines the best backend (WebGPU via WebLLM, or WASM via wllama) and model size
 * based on available hardware. Returns a recommendation or null if local inference isn't viable.
 */

import type { BrowserLLMBackend, BrowserLLMConfig } from './workers/InferenceWorkerProtocol.js';

export interface DeviceCapability {
  webgpu: boolean;
  wasmSimd: boolean;
  wasmThreads: boolean;
  estimatedMemoryGB: number;
  recommendedModel: BrowserLLMConfig | null;
  recommendedBackend: BrowserLLMBackend | null;
  fallbackReason?: string;
}

// WASM SIMD test bytes — a minimal SIMD instruction to validate support
const SIMD_TEST_BYTES = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, // magic
  0x01, 0x00, 0x00, 0x00, // version
  0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, // type section: () -> v128
  0x03, 0x02, 0x01, 0x00, // function section
  0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0c, // code section: v128.const
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x0b,
]);

/** Qwen 2.5 0.5B — WASM fallback for low-memory devices */
export const QWEN_0_5B_CONFIG: BrowserLLMConfig = {
  modelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  modelName: 'Qwen 2.5 0.5B (Browser)',
  backend: 'wllama',
  maxContextLength: 2048,
  memoryRequirementMB: 500,
  downloadSizeMB: 350,
};

/** Qwen 2.5 1.5B — primary mobile target via WebGPU */
export const QWEN_1_5B_CONFIG: BrowserLLMConfig = {
  modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  modelName: 'Qwen 2.5 1.5B (Browser)',
  backend: 'webllm',
  maxContextLength: 4096,
  memoryRequirementMB: 1630,
  downloadSizeMB: 1120,
};

/** Qwen 2.5 3B — flagship devices only (8GB+ RAM) */
export const QWEN_3B_CONFIG: BrowserLLMConfig = {
  modelId: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  modelName: 'Qwen 2.5 3B (Browser)',
  backend: 'webllm',
  maxContextLength: 4096,
  memoryRequirementMB: 2500,
  downloadSizeMB: 2100,
};

/**
 * Estimate device memory from User-Agent heuristics when navigator.deviceMemory is unavailable.
 * Conservative — returns a low estimate to avoid OOM.
 */
function estimateMemoryFromUA(): number {
  const ua = navigator.userAgent;
  // High-end Android flagships tend to have 8-12GB
  if (/SM-S9|SM-S24|Pixel [89]|Tank/i.test(ua)) return 8;
  // Mid-range Android typically 4-6GB
  if (/Android/i.test(ua)) return 4;
  // Desktop typically 8GB+
  if (/Windows|Macintosh|Linux/i.test(ua) && !/Android|Mobile/i.test(ua)) return 8;
  // iOS — can't detect RAM, assume 4GB (conservative)
  if (/iPhone|iPad/i.test(ua)) return 4;
  // Unknown — very conservative
  return 2;
}

/**
 * Detect device capabilities and recommend the best browser LLM configuration.
 *
 * Tier A: WebGPU + 1.5B (or 3B on 8GB+ devices)
 * Tier B: WASM SIMD + 0.5B
 * Tier C: Cloud fallback (no local inference)
 */
export async function detectCapabilities(): Promise<DeviceCapability> {
  // Check WebGPU
  let webgpu = false;
  try {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      const adapter = await (navigator as any).gpu.requestAdapter();
      webgpu = adapter !== null;
    }
  } catch {
    // WebGPU not available
  }

  // Check WASM SIMD
  let wasmSimd = false;
  try {
    wasmSimd = WebAssembly.validate(SIMD_TEST_BYTES);
  } catch {
    // WASM SIMD not available
  }

  // Check SharedArrayBuffer (required for multi-threaded WASM)
  const wasmThreads = typeof SharedArrayBuffer !== 'undefined';

  // Estimate device memory
  const memoryGB = (navigator as any).deviceMemory ?? estimateMemoryFromUA();

  // Tier A: WebGPU available with sufficient memory
  if (webgpu && memoryGB >= 3) {
    return {
      webgpu,
      wasmSimd,
      wasmThreads,
      estimatedMemoryGB: memoryGB,
      recommendedModel: memoryGB >= 8 ? QWEN_3B_CONFIG : QWEN_1_5B_CONFIG,
      recommendedBackend: 'webllm',
    };
  }

  // Tier B: WASM SIMD with multi-threading and sufficient memory
  if (wasmSimd && wasmThreads && memoryGB >= 2) {
    return {
      webgpu,
      wasmSimd,
      wasmThreads,
      estimatedMemoryGB: memoryGB,
      recommendedModel: QWEN_0_5B_CONFIG,
      recommendedBackend: 'wllama',
    };
  }

  // Tier C: Cloud fallback
  return {
    webgpu,
    wasmSimd,
    wasmThreads,
    estimatedMemoryGB: memoryGB,
    recommendedModel: null,
    recommendedBackend: null,
    fallbackReason: !webgpu && !wasmSimd
      ? 'Device does not support WebGPU or WASM SIMD'
      : `Insufficient memory (${memoryGB}GB)`,
  };
}
