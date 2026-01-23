/**
 * CreationStateManager - Tracks universe/planet creation progress for resume-on-refresh
 *
 * Uses a separate IndexedDB database to store lightweight creation state.
 * This allows the game to resume mid-creation if the page is refreshed
 * during the expensive biosphere generation or soul creation phases.
 *
 * The creation state is deleted once the genesis snapshot is taken.
 */

export type CreationPhase =
  | 'universe_configured'   // Universe created on server, config saved
  | 'planet_initialized'    // Planet + biosphere generated/cached
  | 'world_populated'       // Buildings + agents created, game loop running
  | 'souls_created'         // Souls generated for agents
  | 'genesis_complete';     // Full save taken, creation state can be deleted

export interface CreationState {
  version: 1;
  universeId: string;
  universeName: string;
  divinePreset: string;
  planetSeed: string;
  planetType: string;
  magicParadigm: string;
  playerId: string;
  phase: CreationPhase;
  createdAt: number;
  updatedAt: number;
  /** Server-side universe ID (if created on multiverse server) */
  serverUniverseId?: string;
  /** Server-side planet ID (if created on planet server) */
  serverPlanetId?: string;
  /** Full universe config selections for replay */
  universeConfig: Record<string, unknown>;
}

const DB_NAME = 'ai_village_creation';
const DB_VERSION = 1;
const STORE_NAME = 'creation_state';
const STATE_KEY = 'current';

export class CreationStateManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      const timeout = setTimeout(() => {
        reject(new Error('[CreationStateManager] IndexedDB init timeout'));
      }, 3000);

      request.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`[CreationStateManager] Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onblocked = () => {
        clearTimeout(timeout);
        reject(new Error('[CreationStateManager] IndexedDB blocked'));
      };
    });

    return this.initPromise;
  }

  /**
   * Save the full creation state (used at first phase).
   */
  async saveCreationState(state: CreationState): Promise<void> {
    await this.init();

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
      store.put({ key: STATE_KEY, state });
    });
  }

  /**
   * Update only the phase (fast single-field update).
   */
  async updatePhase(phase: CreationPhase, extra?: Partial<CreationState>): Promise<void> {
    await this.init();

    const current = await this.getCreationState();
    if (!current) return;

    current.phase = phase;
    current.updatedAt = Date.now();
    if (extra) {
      Object.assign(current, extra);
    }

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
      store.put({ key: STATE_KEY, state: current });
    });
  }

  /**
   * Get the current creation state (null if none in progress).
   */
  async getCreationState(): Promise<CreationState | null> {
    await this.init();

    const transaction = this.db!.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(STATE_KEY);
      request.onsuccess = () => {
        resolve(request.result?.state ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear creation state (called after genesis snapshot is saved).
   */
  async clearCreationState(): Promise<void> {
    await this.init();

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
      store.delete(STATE_KEY);
    });
  }

  /**
   * Check if there's a creation in progress (quick check without full state).
   */
  async hasCreationInProgress(): Promise<boolean> {
    try {
      const state = await this.getCreationState();
      return state !== null && state.phase !== 'genesis_complete';
    } catch {
      return false;
    }
  }
}

/** Singleton instance */
export const creationStateManager = new CreationStateManager();
