/**
 * IndexedDB storage backend for browser with compression support
 */

import type { StorageBackend, SaveFile, SaveMetadata, StorageInfo } from '../types.js';
import { compress, decompress } from '../compression.js';

export class IndexedDBStorage implements StorageBackend {
  private dbName = 'ai_village';
  private storeName = 'saves';
  private metadataStore = 'save_metadata';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private initAttempts = 0;
  private readonly MAX_INIT_ATTEMPTS = 2;

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

    this.initAttempts++;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      // Add timeout to prevent hanging indefinitely
      const timeout = setTimeout(async () => {
        console.error(`[IndexedDB] Init timeout - database may be blocked`);

        // If this is our first attempt, try deleting the database and retrying
        if (this.initAttempts < this.MAX_INIT_ATTEMPTS) {
          console.warn(`[IndexedDB] Deleting database and retrying...`);
          this.initPromise = null; // Reset so we can retry

          try {
            // Delete the database (with timeout)
            await Promise.race([
              new Promise<void>((resolveDelete, rejectDelete) => {
                const deleteRequest = indexedDB.deleteDatabase(this.dbName);
                deleteRequest.onsuccess = () => {
                  resolveDelete();
                };
                deleteRequest.onerror = () => {
                  console.error(`[IndexedDB] Failed to delete database:`, deleteRequest.error);
                  rejectDelete(deleteRequest.error);
                };
                deleteRequest.onblocked = () => {
                  console.error(`[IndexedDB] Delete blocked - close all other tabs`);
                  rejectDelete(new Error('Delete blocked - another tab has the database open'));
                };
              }),
              new Promise<void>((_, rejectTimeout) =>
                setTimeout(() => {
                  console.error(`[IndexedDB] Delete timeout - another tab likely has the database open`);
                  rejectTimeout(new Error('Delete timeout - close all browser tabs with this game'));
                }, 2000)
              )
            ]);

            // Retry init
            await this.init();
            resolve();
          } catch (error) {
            reject(new Error(`Failed to recover from timeout: ${error}`));
          }
        } else {
          reject(new Error(`IndexedDB init timeout after ${this.initAttempts} attempts - close other tabs or check browser settings`));
        }
      }, 3000);

      request.onerror = () => {
        clearTimeout(timeout);
        console.error(`[IndexedDB] Open failed:`, request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create saves store
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(this.metadataStore)) {
          const metaStore = db.createObjectStore(this.metadataStore, {
            keyPath: 'key',
          });
          metaStore.createIndex('lastSavedAt', 'lastSavedAt', { unique: false });
        }
      };

      // Handle blocked state (another tab has the DB open with older version)
      request.onblocked = () => {
        clearTimeout(timeout);
        console.error(`[IndexedDB] Database blocked - close other tabs`);
        reject(new Error(`IndexedDB blocked - close other tabs or clear the database`));
      };
    });

    return this.initPromise;
  }

  /**
   * Save a file with compression.
   */
  async save(key: string, data: SaveFile): Promise<void> {
    await this.init();

    // Serialize to JSON
    const jsonString = JSON.stringify(data);

    // Compress the JSON data
    const compressedData = await compress(jsonString);
    const compressedSize = compressedData.length;

    const transaction = this.db!.transaction(
      [this.storeName, this.metadataStore],
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      try {
        // Save compressed file
        const saveStore = transaction.objectStore(this.storeName);
        saveStore.put({ key, data: compressedData, compressed: true });

        // Save metadata
        const metadata: SaveMetadata = {
          key,
          name: data.header.name,
          createdAt: data.header.createdAt,
          lastSavedAt: data.header.lastSavedAt,
          playTime: data.header.playTime,
          gameVersion: data.header.gameVersion,
          formatVersion: data.header.formatVersion,
          fileSize: compressedSize,  // Use compressed size
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
   * Load a file with decompression.
   */
  async load(key: string): Promise<SaveFile | null> {
    await this.init();

    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = async () => {
        const result = request.result;

        if (!result) {
          resolve(null);
          return;
        }

        try {
          // Check if data is compressed
          const isCompressed = result.compressed === true;

          if (isCompressed) {
            // Decompress the data
            const decompressedString = await decompress(result.data);
            const saveFile = JSON.parse(decompressedString) as SaveFile;
            resolve(saveFile);
          } else {
            // Legacy uncompressed data
            resolve(result.data);
          }
        } catch (error) {
          reject(new Error(`Failed to decompress save file: ${error instanceof Error ? error.message : String(error)}`));
        }
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
    }
  }
}
