import type { World } from '../ecs/World.js';
import type { SaveFile, SaveHeader } from './SaveFile.js';

/**
 * Interface for save/load operations.
 */
export interface ISerializer {
  /** Save game to storage */
  save(world: World, name: string): Promise<void>;

  /** Load game from storage */
  load(name: string): Promise<SaveFile>;

  /** List available saves */
  listSaves(): Promise<ReadonlyArray<SaveHeader>>;

  /** Delete a save */
  deleteSave(name: string): Promise<void>;

  /** Export to JSON string */
  toJSON(world: World): string;

  /** Create snapshot for undo/autosave */
  snapshot(world: World): SaveFile;
}

/**
 * Serializer implementation using IndexedDB.
 */
export class IndexedDBSerializer implements ISerializer {
  private readonly dbName = 'ai-village';
  private readonly storeName = 'saves';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'name' });
        }
      };
    });
  }

  async save(world: World, name: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const snapshot = this.snapshot(world);
    const saveData = {
      name,
      header: snapshot.header,
      data: snapshot,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(saveData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async load(name: string): Promise<SaveFile> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(name);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`Save "${name}" not found`));
        } else {
          resolve(request.result.data);
        }
      };
    });
  }

  async listSaves(): Promise<ReadonlyArray<SaveHeader>> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const names = request.result as string[];
        const headers: SaveHeader[] = [];

        let pending = names.length;
        if (pending === 0) {
          resolve(headers);
          return;
        }

        for (const name of names) {
          const getRequest = store.get(name);
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              headers.push(getRequest.result.header);
            }
            pending--;
            if (pending === 0) {
              resolve(headers);
            }
          };
          getRequest.onerror = () => {
            pending--;
            if (pending === 0) {
              resolve(headers);
            }
          };
        }
      };
    });
  }

  async deleteSave(name: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(name);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  toJSON(world: World): string {
    const snapshot = this.snapshot(world);
    return JSON.stringify(snapshot, null, 2);
  }

  snapshot(world: World): SaveFile {
    // Basic snapshot - will be enhanced as we build out world state
    return {
      header: {
        saveVersion: 1,
        gameVersion: '0.1.0',
        componentVersions: {},
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        playTime: 0,
        tick: world.tick,
        features: world.features,
        worldName: 'Default World',
        worldSeed: 'default',
        agentCount: 0,
      },
      world: {
        tick: world.tick,
        gameTime: world.gameTime,
        chunks: [],
        entities: Array.from(world.entities.values()).map((entity) => ({
          id: entity.id,
          archetype: 'unknown',
          createdAt: entity.createdAt,
          components: Array.from(entity.components.values()).map((comp) => ({
            type: comp.type,
            version: comp.version,
            data: { ...comp } as Readonly<Record<string, unknown>>,
          })),
        })),
        globals: {},
      },
    };
  }
}
