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

export {
  UniverseClient,
  universeClient,
  type DeltaCallback,
  type LoadingProgressCallback,
  type WorkerReadyCallback,
  type LoadCompleteCallback,
} from './universe-client.js';
export { PersistenceService, UniverseDB } from './persistence.js';
export { GameBridge, gameBridge, type ViewOnlyGameLoop } from './game-bridge.js';
export { setupGameSystems, type GameSetupConfig, type GameSetupResult } from './game-setup.js';
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
  Viewport,
  SaveMetadata,
  LoadingProgress,
} from './types.js';
export type {
  PathPrediction,
  LinearPath,
  WanderPath,
  SteeringPath,
  StationaryPath,
  PathPredictionComponent,
  PathInterpolatorComponent,
  DeltaUpdate,
} from './path-prediction-types.js';
export { calculateDeviation, predictPosition } from './path-prediction-types.js';
export { PathPredictionSystem } from './PathPredictionSystem.js';
export { PathInterpolationSystem } from './PathInterpolationSystem.js';
export { DeltaSyncSystem } from './DeltaSyncSystem.js';
