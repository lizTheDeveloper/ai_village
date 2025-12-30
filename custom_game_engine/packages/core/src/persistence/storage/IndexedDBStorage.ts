/**
 * IndexedDB storage backend for browser
 */

import type { StorageBackend, SaveFile, SaveMetadata, StorageInfo } from '../types.js';

export class IndexedDBStorage implements StorageBackend {
  private dbName = 'ai_village';
  private storeName = 'saves';
  private metadataStore = 'save_metadata';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(dbName?: string) {
    if (dbName) {
      this.dbName = dbName;
    }
  }

  /**
   * Initialize IndexedDB.
   */
  private async init(): Promise<void> {
    if (this.db) return;

    // Ensure we only initialize once
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log(`[IndexedDBStorage] Database opened: ${this.dbName}`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create saves store
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
          console.log(`[IndexedDBStorage] Created object store: ${this.storeName}`);
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(this.metadataStore)) {
          const metaStore = db.createObjectStore(this.metadataStore, {
            keyPath: 'key',
          });
          metaStore.createIndex('lastSavedAt', 'lastSavedAt', { unique: false });
          console.log(`[IndexedDBStorage] Created object store: ${this.metadataStore}`);
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save a file.
   */
  async save(key: string, data: SaveFile): Promise<void> {
    await this.init();

    const transaction = this.db!.transaction(
      [this.storeName, this.metadataStore],
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        console.log(`[IndexedDBStorage] Saved: ${key}`);
        resolve();
      };

      try {
        // Save full file
        const saveStore = transaction.objectStore(this.storeName);
        saveStore.put({ key, data });

        // Save metadata
        const metadata: SaveMetadata = {
          key,
          name: data.header.name,
          createdAt: data.header.createdAt,
          lastSavedAt: data.header.lastSavedAt,
          playTime: data.header.playTime,
          gameVersion: data.header.gameVersion,
          formatVersion: data.header.formatVersion,
          fileSize: JSON.stringify(data).length,
          screenshot: data.header.screenshot,
        };

        const metaStore = transaction.objectStore(this.metadataStore);
        metaStore.put(metadata);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Load a file.
   */
  async load(key: string): Promise<SaveFile | null> {
    await this.init();

    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;

        if (!result) {
          resolve(null);
          return;
        }

        console.log(`[IndexedDBStorage] Loaded: ${key}`);
        resolve(result.data);
      };

      request.onerror = () => {
        reject(new Error(`Failed to load: ${request.error?.message}`));
      };
    });
  }

  /**
   * List all saves.
   */
  async list(): Promise<SaveMetadata[]> {
    await this.init();

    const transaction = this.db!.transaction([this.metadataStore], 'readonly');
    const store = transaction.objectStore(this.metadataStore);
    const index = store.index('lastSavedAt');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Newest first
      const metadata: SaveMetadata[] = [];

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor) {
          metadata.push(cursor.value);
          cursor.continue();
        } else {
          resolve(metadata);
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to list saves: ${request.error?.message}`));
      };
    });
  }

  /**
   * Delete a save.
   */
  async delete(key: string): Promise<void> {
    await this.init();

    const transaction = this.db!.transaction(
      [this.storeName, this.metadataStore],
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        console.log(`[IndexedDBStorage] Deleted: ${key}`);
        resolve();
      };

      try {
        const saveStore = transaction.objectStore(this.storeName);
        saveStore.delete(key);

        const metaStore = transaction.objectStore(this.metadataStore);
        metaStore.delete(key);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get save metadata without loading full file.
   */
  async getMetadata(key: string): Promise<SaveMetadata | null> {
    await this.init();

    const transaction = this.db!.transaction([this.metadataStore], 'readonly');
    const store = transaction.objectStore(this.metadataStore);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get metadata: ${request.error?.message}`));
      };
    });
  }

  /**
   * Get storage info.
   */
  async getStorageInfo(): Promise<StorageInfo> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        backend: 'IndexedDB',
        usedBytes: 0,
        quotaExceeded: false,
      };
    }

    try {
      const estimate = await navigator.storage.estimate();

      return {
        backend: 'IndexedDB',
        usedBytes: estimate.usage ?? 0,
        availableBytes: estimate.quota
          ? estimate.quota - (estimate.usage ?? 0)
          : undefined,
        totalBytes: estimate.quota,
        quotaExceeded:
          estimate.usage && estimate.quota
            ? estimate.usage > estimate.quota
            : false,
      };
    } catch (error) {
      console.error('[IndexedDBStorage] Failed to get storage estimate:', error);
      return {
        backend: 'IndexedDB',
        usedBytes: 0,
        quotaExceeded: false,
      };
    }
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('[IndexedDBStorage] Database closed');
    }
  }
}
