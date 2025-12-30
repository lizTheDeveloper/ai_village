/**
 * In-memory storage backend (for testing)
 */

import type { StorageBackend, SaveFile, SaveMetadata, StorageInfo } from '../types.js';

export class MemoryStorage implements StorageBackend {
  private saves: Map<string, SaveFile> = new Map();
  private metadata: Map<string, SaveMetadata> = new Map();

  async save(key: string, data: SaveFile): Promise<void> {
    this.saves.set(key, data);

    const meta: SaveMetadata = {
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

    this.metadata.set(key, meta);

    console.log(`[MemoryStorage] Saved: ${key}`);
  }

  async load(key: string): Promise<SaveFile | null> {
    const save = this.saves.get(key);

    if (save) {
      console.log(`[MemoryStorage] Loaded: ${key}`);
    }

    return save || null;
  }

  async list(): Promise<SaveMetadata[]> {
    const all = Array.from(this.metadata.values());
    return all.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
  }

  async delete(key: string): Promise<void> {
    this.saves.delete(key);
    this.metadata.delete(key);
    console.log(`[MemoryStorage] Deleted: ${key}`);
  }

  async getMetadata(key: string): Promise<SaveMetadata | null> {
    return this.metadata.get(key) || null;
  }

  async getStorageInfo(): Promise<StorageInfo> {
    let totalBytes = 0;

    for (const save of this.saves.values()) {
      totalBytes += JSON.stringify(save).length;
    }

    return {
      backend: 'Memory',
      usedBytes: totalBytes,
      quotaExceeded: false,
    };
  }

  clear(): void {
    this.saves.clear();
    this.metadata.clear();
    console.log('[MemoryStorage] Cleared all saves');
  }
}
