/**
 * @ai-village/shared-worker
 *
 * SharedWorker-based universe architecture for multi-window support.
 *
 * Based on: openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md
 *
 * ## Architecture
 *
 * - **SharedWorker**: Runs simulation independently, owns IndexedDB
 * - **UniverseClient**: Thin client for windows to connect and subscribe
 * - **PersistenceService**: IndexedDB persistence with Dexie
 *
 * ## Usage
 *
 * In your window/tab:
 * ```typescript
 * import { universeClient } from '@ai-village/shared-worker/client';
 *
 * universeClient.connect();
 *
 * universeClient.subscribe((state) => {
 *   // Update UI when state changes
 *   render(state);
 * });
 *
 * universeClient.dispatch({
 *   type: 'SPAWN_AGENT',
 *   domain: 'village',
 *   payload: { x: 100, y: 100 }
 * });
 * ```
 */

export { UniverseClient, universeClient } from './universe-client.js';
export { PersistenceService, UniverseDB } from './persistence.js';
export { GameBridge, gameBridge } from './game-bridge.js';
export type {
  UniverseState,
  SerializedWorld,
  GameAction,
  StateCallback,
  WorkerConfig,
  ConnectionInfo,
  WorkerToWindowMessage,
  WindowToWorkerMessage,
  UniverseDatabase,
} from './types.js';
