/**
 * Universe Client - Window-side interface to SharedWorker
 *
 * Thin client that connects to the SharedWorker.
 * Windows are pure views - no computation, just rendering.
 */

import type {
  UniverseState,
  GameAction,
  StateCallback,
  WorkerToWindowMessage,
  WindowToWorkerMessage,
  Viewport,
} from './types.js';
import type { DeltaUpdate } from './path-prediction-types.js';

/**
 * Callback for delta updates
 */
export type DeltaCallback = (delta: DeltaUpdate) => void;

/**
 * Client for connecting to the Universe SharedWorker
 */
export class UniverseClient {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private listeners: Set<StateCallback> = new Set();
  private deltaListeners: Set<DeltaCallback> = new Set();
  private state: UniverseState | null = null;
  private connectionId: string | null = null;
  private connected = false;

  /**
   * Connect to the SharedWorker
   */
  connect(): void {
    if (this.connected) {
      console.warn('[UniverseClient] Already connected');
      return;
    }

    try {
      // Create SharedWorker connection
      this.worker = new SharedWorker(
        new URL('./shared-universe-worker.ts', import.meta.url),
        { type: 'module', name: 'universe-worker' }
      );

      this.port = this.worker.port;

      // Handle messages from worker
      this.port.onmessage = (e: MessageEvent<WorkerToWindowMessage>) => {
        this.handleMessage(e.data);
      };

      // Handle errors
      this.worker.onerror = (error) => {
        console.error('[UniverseClient] Worker error:', error);
      };

      this.port.start();
      this.connected = true;

      console.log('[UniverseClient] Connected to SharedWorker');
    } catch (error) {
      console.error('[UniverseClient] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the SharedWorker
   */
  disconnect(): void {
    if (this.port) {
      this.port.close();
      this.port = null;
    }

    this.worker = null;
    this.connected = false;
    this.connectionId = null;
    this.state = null;

    console.log('[UniverseClient] Disconnected');
  }

  /**
   * Send an action to the universe
   */
  dispatch(action: Omit<GameAction, 'id' | 'timestamp'>): void {
    if (!this.port) {
      console.warn('[UniverseClient] Not connected, cannot dispatch action');
      return;
    }

    const fullAction: GameAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const message: WindowToWorkerMessage = {
      type: 'action',
      action: fullAction,
    };

    this.port.postMessage(message);
  }

  /**
   * Subscribe to state updates
   */
  subscribe(callback: StateCallback): () => void {
    this.listeners.add(callback);

    // Immediately call with current state if available
    if (this.state) {
      callback(this.state);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Subscribe to delta updates (for path prediction)
   */
  subscribeDelta(callback: DeltaCallback): () => void {
    this.deltaListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.deltaListeners.delete(callback);
    };
  }

  /**
   * Get current state synchronously
   */
  getState(): UniverseState | null {
    return this.state;
  }

  /**
   * Get current tick
   */
  getTick(): number {
    return this.state?.tick ?? 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.connectionId !== null;
  }

  /**
   * Request a snapshot (for sharing/export)
   */
  requestSnapshot(): Promise<Uint8Array> {
    if (!this.port) {
      return Promise.reject(new Error('Not connected'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Snapshot request timeout'));
      }, 30000); // 30 second timeout

      const handler = (e: MessageEvent<WorkerToWindowMessage>) => {
        if (e.data.type === 'snapshot') {
          clearTimeout(timeout);
          this.port?.removeEventListener('message', handler);
          resolve(e.data.data);
        }
      };

      this.port?.addEventListener('message', handler);

      const message: WindowToWorkerMessage = {
        type: 'request-snapshot',
      };

      this.port.postMessage(message);
    });
  }

  /**
   * Pause simulation
   */
  pause(): void {
    if (!this.port) return;

    const message: WindowToWorkerMessage = {
      type: 'pause',
    };

    this.port.postMessage(message);
  }

  /**
   * Resume simulation
   */
  resume(): void {
    if (!this.port) return;

    const message: WindowToWorkerMessage = {
      type: 'resume',
    };

    this.port.postMessage(message);
  }

  /**
   * Set viewport for spatial culling
   *
   * Only entities within the viewport (plus margin) will be synchronized.
   * This significantly reduces network transfer for large worlds.
   *
   * @param viewport Viewport bounds (center x, y, width, height)
   */
  setViewport(viewport: Viewport): void {
    if (!this.port) return;

    const message: WindowToWorkerMessage = {
      type: 'set-viewport',
      viewport,
    };

    this.port.postMessage(message);
  }

  /**
   * Set simulation speed
   */
  setSpeed(speed: number): void {
    if (!this.port) return;

    const message: WindowToWorkerMessage = {
      type: 'set-speed',
      speed: Math.max(0.1, Math.min(10, speed)), // Clamp to 0.1x - 10x
    };

    this.port.postMessage(message);
  }

  /**
   * Subscribe to specific domains (optimization)
   */
  subscribeToDomains(domains: Array<'village' | 'city' | 'deity' | 'cosmic'>): void {
    if (!this.port) return;

    const message: WindowToWorkerMessage = {
      type: 'subscribe',
      domains,
    };

    this.port.postMessage(message);
  }

  /**
   * Handle message from worker
   */
  private handleMessage(message: WorkerToWindowMessage): void {
    switch (message.type) {
      case 'init':
        this.connectionId = message.connectionId;
        this.state = message.state;
        this.notifyListeners();
        console.log(`[UniverseClient] Initialized with connection ID: ${this.connectionId}`);
        break;

      case 'tick':
        this.state = message.state;
        this.notifyListeners();
        break;

      case 'delta':
        // Notify delta listeners (GameBridge will handle incremental updates)
        this.notifyDeltaListeners(message.delta);
        break;

      case 'error':
        console.error('[UniverseClient] Worker error:', message.error, message.details);
        break;

      case 'snapshot':
        // Handled by requestSnapshot promise
        break;
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    if (!this.state) return;

    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[UniverseClient] Listener error:', error);
      }
    }
  }

  /**
   * Notify all delta listeners
   */
  private notifyDeltaListeners(delta: DeltaUpdate): void {
    for (const listener of this.deltaListeners) {
      try {
        listener(delta);
      } catch (error) {
        console.error('[UniverseClient] Delta listener error:', error);
      }
    }
  }
}

/**
 * Singleton client instance
 *
 * Usage:
 * ```typescript
 * import { universeClient } from '@ai-village/shared-worker/client';
 *
 * // Connect to the universe
 * universeClient.connect();
 *
 * // Subscribe to state updates
 * universeClient.subscribe((state) => {
 *   console.log('Tick:', state.tick);
 *   // Re-render UI
 * });
 *
 * // Dispatch actions
 * universeClient.dispatch({
 *   type: 'SPAWN_AGENT',
 *   domain: 'village',
 *   payload: { x: 100, y: 100 }
 * });
 * ```
 */
export const universeClient = new UniverseClient();
