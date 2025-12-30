/**
 * SaveLoadService - Main API for saving and loading game state
 */

import type { World } from '../ecs/World.js';
import type {
  SaveFile,
  SaveMetadata,
  StorageBackend,
  MultiverseSnapshot,
} from './types.js';
import { worldSerializer } from './WorldSerializer.js';
import { computeChecksumSync, getGameVersion } from './utils.js';

export interface SaveOptions {
  /** Save name */
  name: string;

  /** Optional description */
  description?: string;

  /** Optional screenshot (base64 PNG) */
  screenshot?: string;

  /** Storage key (auto-generated if not provided) */
  key?: string;
}

export interface LoadResult {
  success: boolean;
  save?: SaveFile;
  error?: string;
}

export class SaveLoadService {
  private storageBackend: StorageBackend | null = null;
  private playStartTime: number = Date.now();
  private totalPlayTime: number = 0;  // Accumulated across sessions

  constructor() {}

  /**
   * Set the storage backend to use.
   */
  setStorage(backend: StorageBackend): void {
    this.storageBackend = backend;
    console.log(`[SaveLoad] Storage backend set: ${backend.constructor.name}`);
  }

  /**
   * Save the current game state.
   */
  async save(world: World, options: SaveOptions): Promise<void> {
    if (!this.storageBackend) {
      throw new Error('No storage backend configured. Call setStorage() first.');
    }

    console.log(`[SaveLoad] Saving game: ${options.name}`);

    // Calculate play time
    const currentSessionTime = (Date.now() - this.playStartTime) / 1000;
    const totalPlayTime = this.totalPlayTime + currentSessionTime;

    // Generate key if not provided
    const key = options.key ?? this.generateSaveKey(options.name);

    // Serialize world
    const universeSnapshot = await worldSerializer.serializeWorld(
      world,
      'universe:main',  // TODO: Get from multiverse
      'Main Universe'
    );

    // Create multiverse snapshot
    const multiverseSnapshot: MultiverseSnapshot = {
      $schema: 'https://aivillage.dev/schemas/multiverse/v1',
      $version: 1,
      time: {
        absoluteTick: '0',  // TODO: Get from MultiverseCoordinator
        originTimestamp: Date.now(),
        currentTimestamp: Date.now(),
        realTimeElapsed: totalPlayTime,
      },
      config: {},
    };

    // Create save file
    const now = Date.now();

    const saveFile: SaveFile = {
      $schema: 'https://aivillage.dev/schemas/savefile/v1',
      $version: 1,

      header: {
        createdAt: now,
        lastSavedAt: now,
        playTime: totalPlayTime,
        gameVersion: getGameVersion(),
        formatVersion: 1,
        name: options.name,
        description: options.description,
        screenshot: options.screenshot,
      },

      multiverse: multiverseSnapshot,

      universes: [universeSnapshot],

      passages: [],  // TODO: Implement passages

      player: undefined,  // TODO: Implement player state

      checksums: {
        overall: '',  // Computed below
        universes: {
          [universeSnapshot.identity.id]: computeChecksumSync(universeSnapshot),
        },
        multiverse: computeChecksumSync(multiverseSnapshot),
      },
    };

    // Compute overall checksum (excluding the checksum field itself)
    const { checksums, ...saveFileWithoutChecksum } = saveFile;
    saveFile.checksums.overall = computeChecksumSync(saveFileWithoutChecksum);

    // Save to storage
    await this.storageBackend.save(key, saveFile);

    console.log(`[SaveLoad] Game saved successfully: ${key}`);
  }

  /**
   * Load a saved game.
   */
  async load(key: string, world: World): Promise<LoadResult> {
    if (!this.storageBackend) {
      throw new Error('No storage backend configured. Call setStorage() first.');
    }

    console.log(`[SaveLoad] Loading game: ${key}`);

    try {
      // Load save file
      const saveFile = await this.storageBackend.load(key);

      if (!saveFile) {
        return {
          success: false,
          error: `Save file not found: ${key}`,
        };
      }

      // Verify overall checksum
      const { checksums, ...saveFileWithoutChecksum } = saveFile;
      const expectedChecksum = computeChecksumSync(saveFileWithoutChecksum);

      if (checksums.overall !== expectedChecksum) {
        console.error(
          `[SaveLoad] Overall checksum mismatch! ` +
          `Expected ${expectedChecksum}, got ${checksums.overall}. ` +
          `Save file may be corrupted.`
        );
        // Continue anyway, individual checksums will be verified
      }

      // Clear existing world
      // Note: World interface doesn't have clear(), so we access internal API
      const worldImpl = world as any;  // TODO: Add clear() to World interface
      worldImpl._entities.clear();

      // Deserialize universe(s)
      for (const universeSnapshot of saveFile.universes) {
        await worldSerializer.deserializeWorld(universeSnapshot, world);
      }

      // Restore play time
      this.totalPlayTime = saveFile.header.playTime;
      this.playStartTime = Date.now();

      console.log(`[SaveLoad] Game loaded successfully: ${key}`);

      return {
        success: true,
        save: saveFile,
      };
    } catch (error) {
      console.error(`[SaveLoad] Failed to load game:`, error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * List all saved games.
   */
  async listSaves(): Promise<SaveMetadata[]> {
    if (!this.storageBackend) {
      throw new Error('No storage backend configured. Call setStorage() first.');
    }

    return this.storageBackend.list();
  }

  /**
   * Delete a saved game.
   */
  async deleteSave(key: string): Promise<void> {
    if (!this.storageBackend) {
      throw new Error('No storage backend configured. Call setStorage() first.');
    }

    await this.storageBackend.delete(key);
    console.log(`[SaveLoad] Deleted save: ${key}`);
  }

  /**
   * Get storage info (space used, available, etc.).
   */
  async getStorageInfo() {
    if (!this.storageBackend) {
      throw new Error('No storage backend configured. Call setStorage() first.');
    }

    return this.storageBackend.getStorageInfo();
  }

  /**
   * Auto-save (uses a reserved key).
   */
  async autoSave(world: World): Promise<void> {
    await this.save(world, {
      name: 'Auto Save',
      description: 'Automatic save',
      key: 'autosave',
    });
  }

  /**
   * Quick save (uses numbered quick save slots).
   */
  async quickSave(world: World, slot: number = 1): Promise<void> {
    if (slot < 1 || slot > 10) {
      throw new Error('Quick save slot must be 1-10');
    }

    await this.save(world, {
      name: `Quick Save ${slot}`,
      description: 'Quick save',
      key: `quicksave_${slot}`,
    });
  }

  /**
   * Generate a save key from name.
   */
  private generateSaveKey(name: string): string {
    const timestamp = Date.now();
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    return `save_${sanitized}_${timestamp}`;
  }

  /**
   * Reset play time (for new game).
   */
  resetPlayTime(): void {
    this.playStartTime = Date.now();
    this.totalPlayTime = 0;
  }

  /**
   * Get current play time in seconds.
   */
  getPlayTime(): number {
    const currentSessionTime = (Date.now() - this.playStartTime) / 1000;
    return this.totalPlayTime + currentSessionTime;
  }
}

// Global singleton
export const saveLoadService = new SaveLoadService();
