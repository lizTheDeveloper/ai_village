/**
 * InferenceWorker — Dedicated Web Worker for browser LLM inference.
 *
 * Runs in complete isolation from the main thread and SharedWorker.
 * Handles one inference request at a time (sequential — single GPU/CPU).
 *
 * Protocol: receives WorkerRequest, sends WorkerResponse.
 */

import type { WorkerRequest, WorkerResponse, BrowserLLMConfig } from './InferenceWorkerProtocol.js';
import type { InferenceBackend } from './WebLLMBackend.js';

let backend: InferenceBackend | null = null;
let currentRequestId: string | null = null;

function send(msg: WorkerResponse): void {
  self.postMessage(msg);
}

async function handleInit(config: BrowserLLMConfig): Promise<void> {
  try {
    // Select backend based on config
    if (config.backend === 'webllm') {
      const { WebLLMBackend } = await import('./WebLLMBackend.js');
      backend = new WebLLMBackend();
    } else {
      const { WllamaBackend } = await import('./WllamaBackend.js');
      backend = new WllamaBackend();
    }

    await backend.init(config, (progress) => {
      send({ type: 'init-progress', progress });
    });

    send({ type: 'init-complete' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Check for OOM-like errors
    if (/out of memory|oom|allocation failed/i.test(message)) {
      send({ type: 'oom', error: message });
    } else {
      send({ type: 'init-error', error: message });
    }
  }
}

async function handleGenerate(id: string, request: import('../LLMProvider.js').LLMRequest): Promise<void> {
  if (!backend) {
    send({ type: 'generate-error', id, error: 'Backend not initialized' });
    return;
  }

  currentRequestId = id;
  try {
    const response = await backend.generate(request);
    // Only send if this request wasn't aborted
    if (currentRequestId === id) {
      send({ type: 'generate-complete', id, response });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/out of memory|oom|allocation failed/i.test(message)) {
      send({ type: 'oom', error: message });
    } else {
      send({ type: 'generate-error', id, error: message });
    }
  } finally {
    if (currentRequestId === id) {
      currentRequestId = null;
    }
  }
}

async function handleDispose(): Promise<void> {
  if (backend) {
    await backend.dispose();
    backend = null;
  }
  currentRequestId = null;
}

function handleHeartbeat(): void {
  const memoryUsageMB = backend?.getMemoryUsageMB() ?? 0;
  send({ type: 'heartbeat-ack', memoryUsageMB });
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'init':
      handleInit(msg.config);
      break;
    case 'generate':
      handleGenerate(msg.id, msg.request);
      break;
    case 'abort':
      // If the current request matches, clear it so the response is suppressed
      if (currentRequestId === msg.id) {
        currentRequestId = null;
      }
      break;
    case 'dispose':
      handleDispose();
      break;
    case 'heartbeat':
      handleHeartbeat();
      break;
  }
};
