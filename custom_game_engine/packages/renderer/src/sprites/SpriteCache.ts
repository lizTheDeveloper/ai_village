/**
 * SpriteCache - Persistent browser storage for sprites using IndexedDB
 *
 * Stores sprite images and metadata in IndexedDB so they survive page reloads.
 * Significantly reduces network requests and improves load times.
 */

const DB_NAME = 'ai-village-sprites';
const DB_VERSION = 1;
const SPRITE_STORE = 'sprites';
const METADATA_STORE = 'metadata';

interface CachedSprite {
  url: string;
  blob: Blob;
  timestamp: number;
  characterId?: string;
}

interface CachedMetadata {
  characterId: string;
  metadata: unknown;
  timestamp: number;
}

export class SpriteCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[SpriteCache] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sprite store (for images)
        if (!db.objectStoreNames.contains(SPRITE_STORE)) {
          const spriteStore = db.createObjectStore(SPRITE_STORE, { keyPath: 'url' });
          spriteStore.createIndex('characterId', 'characterId', { unique: false });
          spriteStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create metadata store (for character metadata.json)
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, {
            keyPath: 'characterId',
          });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    return this.db;
  }

  /**
   * Get a cached sprite image by URL
   */
  async getSprite(url: string): Promise<HTMLImageElement | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SPRITE_STORE], 'readonly');
      const store = transaction.objectStore(SPRITE_STORE);
      const request = store.get(url);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cached: CachedSprite | undefined = request.result;
          if (cached) {
            // Convert blob back to image
            const img = new Image();
            const objectUrl = URL.createObjectURL(cached.blob);

            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              resolve(img);
            };

            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error(`Failed to load cached image: ${url}`));
            };

            img.src = objectUrl;
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[SpriteCache] Failed to get sprite from cache:', error);
      return null;
    }
  }

  /**
   * Cache a sprite image
   */
  async cacheSprite(
    url: string,
    img: HTMLImageElement,
    characterId?: string
  ): Promise<void> {
    try {
      const db = await this.ensureDB();

      // Convert image to blob
      const blob = await this.imageToBlob(img);

      const cached: CachedSprite = {
        url,
        blob,
        timestamp: Date.now(),
        characterId,
      };

      const transaction = db.transaction([SPRITE_STORE], 'readwrite');
      const store = transaction.objectStore(SPRITE_STORE);
      store.put(cached);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('[SpriteCache] Failed to cache sprite:', error);
    }
  }

  /**
   * Get cached metadata for a character
   */
  async getMetadata(characterId: string): Promise<unknown | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(characterId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cached: CachedMetadata | undefined = request.result;
          resolve(cached ? cached.metadata : null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[SpriteCache] Failed to get metadata from cache:', error);
      return null;
    }
  }

  /**
   * Cache metadata for a character
   */
  async cacheMetadata(characterId: string, metadata: unknown): Promise<void> {
    try {
      const db = await this.ensureDB();

      const cached: CachedMetadata = {
        characterId,
        metadata,
        timestamp: Date.now(),
      };

      const transaction = db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      store.put(cached);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('[SpriteCache] Failed to cache metadata:', error);
    }
  }

  /**
   * Convert HTMLImageElement to Blob
   */
  private async imageToBlob(img: HTMLImageElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  }

  /**
   * Clear all cached sprites for a character
   */
  async clearCharacter(characterId: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SPRITE_STORE, METADATA_STORE], 'readwrite');

      // Clear sprites
      const spriteStore = transaction.objectStore(SPRITE_STORE);
      const index = spriteStore.index('characterId');
      const request = index.openCursor(IDBKeyRange.only(characterId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Clear metadata
      const metadataStore = transaction.objectStore(METADATA_STORE);
      metadataStore.delete(characterId);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('[SpriteCache] Failed to clear character cache:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SPRITE_STORE, METADATA_STORE], 'readwrite');

      transaction.objectStore(SPRITE_STORE).clear();
      transaction.objectStore(METADATA_STORE).clear();

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('[SpriteCache] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    spriteCount: number;
    metadataCount: number;
    estimatedSize: number;
  }> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SPRITE_STORE, METADATA_STORE], 'readonly');

      const spritesPromise = new Promise<number>((resolve) => {
        const request = transaction.objectStore(SPRITE_STORE).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      const metadataPromise = new Promise<number>((resolve) => {
        const request = transaction.objectStore(METADATA_STORE).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      const [spriteCount, metadataCount] = await Promise.all([
        spritesPromise,
        metadataPromise,
      ]);

      // Estimate storage usage
      let estimatedSize = 0;
      if ('estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        estimatedSize = estimate.usage || 0;
      }

      return {
        spriteCount,
        metadataCount,
        estimatedSize,
      };
    } catch (error) {
      console.warn('[SpriteCache] Failed to get cache stats:', error);
      return {
        spriteCount: 0,
        metadataCount: 0,
        estimatedSize: 0,
      };
    }
  }

  /**
   * Clear old cached items (older than maxAge milliseconds)
   */
  async clearOld(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SPRITE_STORE, METADATA_STORE], 'readwrite');
      const cutoffTime = Date.now() - maxAge;

      // Clear old sprites
      const spriteStore = transaction.objectStore(SPRITE_STORE);
      const spriteIndex = spriteStore.index('timestamp');
      const spriteRequest = spriteIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));

      spriteRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Clear old metadata
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const metadataIndex = metadataStore.index('timestamp');
      const metadataRequest = metadataIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));

      metadataRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('[SpriteCache] Failed to clear old cache:', error);
    }
  }
}

/** Global cache instance */
let globalCache: SpriteCache | null = null;

/**
 * Get the global sprite cache instance
 */
export function getSpriteCache(): SpriteCache {
  if (!globalCache) {
    globalCache = new SpriteCache();
  }
  return globalCache;
}

/**
 * Reset the global cache instance
 */
export function resetSpriteCache(): void {
  globalCache = null;
}
