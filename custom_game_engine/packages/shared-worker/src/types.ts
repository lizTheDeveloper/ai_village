/**
 * SharedWorker Universe Architecture - Type Definitions
 *
 * Based on: openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md
 *
 * The SharedWorker owns the simulation and IndexedDB.
 * Windows are thin views that connect via MessagePort.
 */

import type { World } from '@ai-village/core';

/**
 * Universe state snapshot sent to windows
 */
export interface UniverseState {
  /** Current simulation tick */
  tick: number;

  /** Timestamp of last save to IndexedDB */
  lastSaved: number;

  /** Serialized world state */
  world: SerializedWorld;

  /** Game metadata */
  metadata: {
    version: string;
    playerId?: string;
    universeId: string;
  };
}

/**
 * Serialized world state for transfer
 */
export interface SerializedWorld {
  /** Serialized entities (ID -> components map) */
  entities: Record<string, Record<string, any>>;

  /** Tile data */
  tiles: Array<{
    x: number;
    y: number;
    type: string;
    data?: any;
  }>;

  /** Global state/singletons */
  globals: {
    time?: any;
    weather?: any;
    deity?: any;
    [key: string]: any;
  };
}

/**
 * Game action dispatched from window to worker
 */
export interface GameAction {
  /** Unique action ID */
  id: string;

  /** Action type (domain-specific) */
  type: string;

  /** Action domain (village, city, deity, cosmic) */
  domain: 'village' | 'city' | 'deity' | 'cosmic';

  /** Action payload */
  payload: any;

  /** Timestamp when action was dispatched */
  timestamp: number;
}

/**
 * Save file metadata for listing
 */
export interface SaveMetadata {
  key: string;
  name: string;
  description?: string;
  timestamp: number;
  tick: number;
  universeId: string;
  playTime?: number;
}

/**
 * Loading progress update
 */
export interface LoadingProgress {
  phase: 'connecting' | 'reading' | 'deserializing' | 'initializing' | 'ready';
  progress: number; // 0-100
  message: string;
  entityCount?: number;
  loadedEntities?: number;
}

/**
 * Messages sent from worker to window
 */
export type WorkerToWindowMessage =
  | {
      type: 'init';
      connectionId: string;
      state: UniverseState;
      tick: number;
    }
  | {
      type: 'tick';
      tick: number;
      state: UniverseState;
      timestamp: number;
    }
  | {
      type: 'delta';
      delta: import('./path-prediction-types.js').DeltaUpdate;
    }
  | {
      type: 'snapshot';
      data: Uint8Array;
    }
  | {
      type: 'error';
      error: string;
      details?: any;
    }
  | {
      type: 'saves-list';
      saves: SaveMetadata[];
    }
  | {
      type: 'loading-progress';
      progress: LoadingProgress;
    }
  | {
      type: 'load-complete';
      success: boolean;
      error?: string;
      universeId?: string;
      tick?: number;
    }
  | {
      type: 'worker-ready';
      hasExistingSave: boolean;
      currentUniverseId?: string;
      currentTick?: number;
    }
  | {
      type: 'chat-message';
      roomId: string;
      messageId: string;
      senderId: string;
      senderName: string;
      content: string;
      timestamp: number;
      tick: number;
    };

/**
 * Messages sent from window to worker
 */
export type WindowToWorkerMessage =
  | {
      type: 'action';
      action: GameAction;
    }
  | {
      type: 'subscribe';
      domains: Array<'village' | 'city' | 'deity' | 'cosmic'>;
    }
  | {
      type: 'request-snapshot';
    }
  | {
      type: 'pause';
    }
  | {
      type: 'resume';
    }
  | {
      type: 'set-speed';
      speed: number; // 0.5x, 1x, 2x, etc.
    }
  | {
      type: 'set-viewport';
      viewport: Viewport;
    }
  | {
      type: 'list-saves';
    }
  | {
      type: 'load-save';
      saveKey: string;
    }
  | {
      type: 'create-new-universe';
      config: {
        name?: string;
        magicParadigm?: string;
        scenario?: string;
      };
    }
  | {
      type: 'get-status';
    }
  | {
      type: 'emit-event';
      event: {
        type: string;
        source: string;
        data: unknown;
      };
    };

/**
 * State change callback for client subscriptions
 */
export type StateCallback = (state: UniverseState) => void;

/**
 * IndexedDB schema for Dexie
 */
export interface UniverseDatabase {
  domains: {
    name: string;
    data: any;
    lastUpdated: number;
  };

  events: {
    id?: number;
    tick: number;
    type: string;
    domain: string;
    data: any;
  };

  snapshots: {
    id: string;
    timestamp: number;
    data: Uint8Array;
  };
}

/**
 * Viewport for spatial culling
 */
export interface Viewport {
  /** Center X coordinate */
  x: number;
  /** Center Y coordinate */
  y: number;
  /** Viewport width */
  width: number;
  /** Viewport height */
  height: number;
  /** Margin beyond viewport (for smooth scrolling) */
  margin?: number;
}

/**
 * Connection info tracked by worker
 */
export interface ConnectionInfo {
  id: string;
  port: MessagePort;
  subscribedDomains: Set<string>;
  connected: boolean;
  lastActivity: number;
  /** Viewport for spatial culling (optional) */
  viewport?: Viewport;
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  /** Target ticks per second (default: 20) */
  targetTPS: number;

  /** Auto-save interval in ticks (default: 100 = 5 seconds) */
  autoSaveInterval: number;

  /** Enable debug logging */
  debug: boolean;

  /** Simulation speed multiplier */
  speedMultiplier: number;

  /** Enable path prediction and delta sync (default: true) */
  enablePathPrediction?: boolean;
}
