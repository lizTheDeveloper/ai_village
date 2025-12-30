/**
 * In-memory storage backend (for testing) with compression
 */

import type { StorageBackend, SaveFile, SaveMetadata, StorageInfo } from '../types.js';
import { compress, decompress, formatBytes } from '../compression.js';

export class MemoryStorage implements StorageBackend {
  private saves: Map<string, string> = new Map();  // Stores compressed data
  private metadata: Map<string, SaveMetadata> = new Map();

  async save(key: string, data: SaveFile): Promise<void> {
    // Serialize to JSON
    const jsonString = JSON.stringify(data);
    const originalSize = jsonString.length;

    // Compress the JSON data
    const compressedData = await compress(jsonString);
    const compressedSize = compressedData.length;

    console.log(
      `[MemoryStorage] Compressed ${key}: ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)} (${((1 - compressedSize / originalSize) * 100).toFixed(1)}% reduction)`
    );

    this.saves.set(key, compressedData);

    const meta: SaveMetadata = {
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

    this.metadata.set(key, meta);

    console.log(`[MemoryStorage] Saved: ${key}`);
  }

  async load(key: string): Promise<SaveFile | null> {
    const compressedData = this.saves.get(key);

    if (!compressedData) {
      return null;
    }

    // Decompress the data
    const decompressedString = await decompress(compressedData);
    const saveFile = JSON.parse(decompressedString) as SaveFile;

    console.log(`[MemoryStorage] Loaded and decompressed: ${key}`);
    return saveFile;
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

    // Calculate total size of compressed data
    for (const compressedData of this.saves.values()) {
      totalBytes += compressedData.length;
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
