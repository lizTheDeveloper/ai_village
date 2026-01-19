/**
 * SaveLoadService - Main API for saving and loading game state
 *
 * Supports both local storage (IndexedDB) and server sync for multiverse persistence.
 * When server sync is enabled, saves are uploaded to the multiverse server for
 * cross-player universe access, time travel, and forking.
 */

import type { World } from '@ai-village/core';
import type {
  SaveFile,
  SaveMetadata,
  StorageBackend,
  MultiverseSnapshot,
} from './types.js';
import { worldSerializer } from './WorldSerializer.js';
import { computeChecksumSync, getGameVersion } from './utils.js';
import { validateWorldState, validateSaveFile } from './InvariantChecker.js';
import { multiverseCoordinator, godCraftedQueue } from '@ai-village/core';
import {
  multiverseClient,
  type CanonEvent,
  type CanonEventType,
} from './MultiverseClient.js';

// Re-export canon event types for convenience
export type { CanonEvent, CanonEventType };

export interface SaveOptions {
  /** Save name */
  name: string;

  /** Optional description */
  description?: string;

  /** Optional screenshot (base64 PNG) */
  screenshot?: string;

  /** Storage key (auto-generated if not provided) */
  key?: string;

  /** Whether to sync to multiverse server (default: true if server sync enabled) */
  syncToServer?: boolean;

  /** Type of save for server categorization */
  type?: 'auto' | 'manual' | 'canonical';

  /** Canon event that triggered this save (for canonical saves) */
  canonEvent?: CanonEvent;

  /**
   * Snapshot decay policy - how long to keep this snapshot
   * Decay is measured in universe-ticks (tau = causality delta)
   *
   * Defaults:
   * - canonical: neverDecay = true
   * - auto/manual: decayAfterTicks = 1728000 (24 hours at 20 TPS)
   */
  decayPolicy?: {
    decayAfterTicks?: number;
    neverDecay?: boolean;
    preservationReason?: string;
  };
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

  // Server sync configuration
  private serverSyncEnabled: boolean = false;
  private serverAvailable: boolean = false;
  private lastServerCheck: number = 0;
  private serverCheckInterval: number = 30000; // Check every 30 seconds

  constructor() {}

  /**
   * Enable server sync for multiverse persistence.
   * When enabled, saves are uploaded to the multiverse server.
   */
  async enableServerSync(playerId: string): Promise<boolean> {
    multiverseClient.setPlayerId(playerId);

    // Check server availability
    this.serverAvailable = await multiverseClient.isAvailable();
    this.lastServerCheck = Date.now();

    if (this.serverAvailable) {
      this.serverSyncEnabled = true;

      // Register player with server
      try {
        await multiverseClient.registerPlayer();
      } catch (error) {
        console.warn('[SaveLoad] Failed to register player, sync will still work:', error);
      }

      return true;
    } else {
      console.warn('[SaveLoad] Multiverse server not available, sync disabled');
      this.serverSyncEnabled = false;
      return false;
    }
  }

  /**
   * Disable server sync.
   */
  disableServerSync(): void {
    this.serverSyncEnabled = false;
  }

  /**
   * Check if server sync is enabled and available.
   */
  isServerSyncEnabled(): boolean {
    return this.serverSyncEnabled;
  }

  /**
   * Get the current player ID for server sync.
   */
  getPlayerId(): string | null {
    return multiverseClient.getPlayerId();
  }

  /**
   * Check if server is available (with caching).
   */
  private async checkServerAvailable(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastServerCheck < this.serverCheckInterval) {
      return this.serverAvailable;
    }

    this.serverAvailable = await multiverseClient.isAvailable();
    this.lastServerCheck = now;
    return this.serverAvailable;
  }

  /**
   * Set the storage backend to use.
   */
  setStorage(backend: StorageBackend): void {
    this.storageBackend = backend;
  }

  /**
   * Save the current game state.
   */
  async save(world: World, options: SaveOptions): Promise<void> {
    if (!this.storageBackend) {
      throw new Error('No storage backend configured. Call setStorage() first.');
    }


    // Validate world state before serialization
    validateWorldState(world);

    // Calculate play time
    const currentSessionTime = (Date.now() - this.playStartTime) / 1000;
    const totalPlayTime = this.totalPlayTime + currentSessionTime;

    // Generate key if not provided
    const key = options.key ?? this.generateSaveKey(options.name);

    // Find which universe this world belongs to
    let universeId: string | undefined;
    let universeName: string | undefined;

    for (const [id, instance] of multiverseCoordinator.getAllUniverses()) {
      if (instance.world === world) {
        universeId = id;
        universeName = instance.config.name;
        break;
      }
    }

    if (!universeId || !universeName) {
      throw new Error(
        'Cannot save: world is not registered with any universe. ' +
        'Call multiverseCoordinator.registerUniverse() first.'
      );
    }

    // Serialize world
    const universeSnapshot = await worldSerializer.serializeWorld(
      world,
      universeId,
      universeName
    );

    // Get multiverse state
    const absoluteTick = multiverseCoordinator.getAbsoluteTick();

    // Create multiverse snapshot
    const multiverseSnapshot: MultiverseSnapshot = {
      $schema: 'https://aivillage.dev/schemas/multiverse/v1',
      $version: 1,
      time: {
        absoluteTick: absoluteTick.toString(),
        originTimestamp: Date.now(),
        currentTimestamp: Date.now(),
        realTimeElapsed: totalPlayTime,
      },
      config: {},
    };

    // Determine decay policy
    // Default: 24 hours of universe-time (1728000 ticks at 20 TPS)
    const DEFAULT_DECAY_TICKS = 1728000;
    let decayPolicy = options.decayPolicy;

    if (!decayPolicy) {
      if (options.type === 'canonical' || options.canonEvent) {
        // Canonical snapshots never decay
        decayPolicy = { neverDecay: true, preservationReason: 'canonical event' };
      } else {
        // Auto/manual: decay after 24 hours
        decayPolicy = { decayAfterTicks: DEFAULT_DECAY_TICKS };
      }
    }

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
        decayPolicy,
      },

      multiverse: multiverseSnapshot,

      universes: [universeSnapshot],

      passages: Array.from(multiverseCoordinator.getAllPassages().values()).map(passage => ({
        $schema: 'https://aivillage.dev/schemas/passage/v1' as const,
        $version: 1,
        id: passage.id,
        sourceUniverseId: passage.sourceUniverseId,
        targetUniverseId: passage.targetUniverseId,
        type: passage.type,
        active: passage.active,
      })),

      // Player state is handled via PlayerControlComponent on entities
      // This field is reserved for future global player metadata (achievements, stats, etc.)
      player: undefined,

      // God-crafted queue (microgenerator content)
      godCraftedQueue: godCraftedQueue.serialize(),

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

    // Validate save file before writing to storage
    await validateSaveFile(saveFile);

    // Save to storage (local)
    await this.storageBackend.save(key, saveFile);

    // Sync to multiverse server if enabled
    const shouldSync = this.serverSyncEnabled &&
      options.syncToServer !== false &&
      await this.checkServerAvailable();

    if (shouldSync) {
      try {
        // Ensure universe exists on server (create if not)
        // Use the universe ID from the save file for consistency
        let serverUniverseId = universeId;
        const existingUniverse = await multiverseClient.getUniverse(universeId);

        if (!existingUniverse) {
          // Create universe on server - the server will use the ID we provide
          // We need to pass the ID to keep client and server in sync
          const created = await multiverseClient.createUniverse({
            name: universeName,
            isPublic: true, // Default to public for multiverse browsing
            id: universeId, // Pass the client's universe ID to keep them in sync
          });
          serverUniverseId = created.id;
        }

        // Upload snapshot to server
        const snapshotEntry = await multiverseClient.uploadSnapshot(
          serverUniverseId,
          saveFile,
          {
            type: options.type ?? (options.canonEvent ? 'canonical' : 'manual'),
            canonEvent: options.canonEvent,
          }
        );
      } catch (error) {
        // Log but don't fail - local save succeeded
        console.error('[SaveLoad] Failed to sync to server:', error);
      }
    }
  }

  /**
   * Load a saved game.
   */
  async load(key: string, world: World): Promise<LoadResult> {
    if (!this.storageBackend) {
      throw new Error('No storage backend configured. Call setStorage() first.');
    }


    try {
      // Load save file
      const saveFile = await this.storageBackend.load(key);

      if (!saveFile) {
        return {
          success: false,
          error: `Save file not found: ${key}`,
        };
      }

      // Validate save file structure and invariants
      await validateSaveFile(saveFile);

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
      // Type assertion: WorldImpl has _entities as an internal property
      interface WorldImplInternal {
        _entities: Map<string, unknown>;
      }

      const worldImpl = world as unknown as WorldImplInternal;
      worldImpl._entities.clear();

      // Restore multiverse state
      multiverseCoordinator.loadFromSnapshot(saveFile.multiverse.time);

      // Clear existing passages before restoring
      // Access private passages map via type assertion to clear it
      interface MultiverseCoordinatorInternal {
        passages: Map<string, unknown>;
      }
      const coordinatorInternal = multiverseCoordinator as unknown as MultiverseCoordinatorInternal;
      coordinatorInternal.passages.clear();

      // Restore god-crafted queue
      if (saveFile.godCraftedQueue) {
        // Type assertion: We trust the serialized queue data structure
        godCraftedQueue.deserialize(saveFile.godCraftedQueue);
      }

      // Deserialize universe(s) first, before creating passages
      for (const universeSnapshot of saveFile.universes) {
        await worldSerializer.deserializeWorld(universeSnapshot, world);
      }

      // Restore passages after universes are loaded
      if (saveFile.passages && saveFile.passages.length > 0) {
        for (const passageSnapshot of saveFile.passages) {
          // Verify both universes exist before creating passage
          const sourceUniverse = multiverseCoordinator.getUniverse(passageSnapshot.sourceUniverseId);
          const targetUniverse = multiverseCoordinator.getUniverse(passageSnapshot.targetUniverseId);

          if (sourceUniverse && targetUniverse) {
            // Create passage connection in multiverse coordinator
            multiverseCoordinator.createPassage(
              passageSnapshot.id,
              passageSnapshot.sourceUniverseId,
              passageSnapshot.targetUniverseId,
              passageSnapshot.type
            );

            // If passage was inactive in the save, deactivate it
            if (!passageSnapshot.active) {
              const passage = multiverseCoordinator.getPassage(passageSnapshot.id);
              if (passage) {
                passage.active = false;
              }
            }
          } else {
            // Log warning if universes don't exist
            console.warn(
              `[SaveLoad] Skipping passage ${passageSnapshot.id}: ` +
              `${!sourceUniverse ? `source universe ${passageSnapshot.sourceUniverseId}` : ''} ` +
              `${!targetUniverse ? `target universe ${passageSnapshot.targetUniverseId}` : ''} not found`
            );
          }
        }
      }

      // Restore play time
      this.totalPlayTime = saveFile.header.playTime;
      this.playStartTime = Date.now();


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

  // ============================================================
  // MULTIVERSE SERVER OPERATIONS
  // ============================================================

  /**
   * Load a snapshot from the multiverse server (time travel to another universe).
   * This creates a fork rather than overwriting the current universe.
   */
  async loadFromServer(
    universeId: string,
    tick: number,
    world: World,
    forkName?: string
  ): Promise<LoadResult> {
    if (!this.serverSyncEnabled) {
      return {
        success: false,
        error: 'Server sync not enabled. Call enableServerSync() first.',
      };
    }

    try {
      // Download snapshot from server
      const saveFile = await multiverseClient.downloadSnapshot(universeId, tick);

      if (!saveFile) {
        return {
          success: false,
          error: `Snapshot not found: ${universeId} at tick ${tick}`,
        };
      }

      // If fork name provided, create a fork on the server
      if (forkName) {
        const forkedUniverse = await multiverseClient.forkUniverse(
          universeId,
          tick,
          forkName
        );

        // Update the save file's universe ID to the new fork
        if (saveFile.universes[0]) {
          saveFile.universes[0].identity.id = forkedUniverse.id;
          saveFile.universes[0].identity.name = forkName;
          saveFile.universes[0].identity.parentId = universeId;
          saveFile.universes[0].identity.forkedAtTick = tick.toString();
        }
      }

      // Load the snapshot into the world
      // Type assertion: WorldImpl has _entities as an internal property
      interface WorldImplInternal {
        _entities: Map<string, unknown>;
      }

      const worldImpl = world as unknown as WorldImplInternal;
      worldImpl._entities.clear();

      multiverseCoordinator.loadFromSnapshot(saveFile.multiverse.time);

      // Clear existing passages before restoring
      // Access private passages map via type assertion to clear it
      interface MultiverseCoordinatorInternal {
        passages: Map<string, unknown>;
      }
      const coordinatorInternal = multiverseCoordinator as unknown as MultiverseCoordinatorInternal;
      coordinatorInternal.passages.clear();

      if (saveFile.godCraftedQueue) {
        // Type assertion: We trust the serialized queue data structure
        godCraftedQueue.deserialize(saveFile.godCraftedQueue);
      }

      // Deserialize universe(s) first, before creating passages
      for (const universeSnapshot of saveFile.universes) {
        await worldSerializer.deserializeWorld(universeSnapshot, world);
      }

      // Restore passages after universes are loaded
      if (saveFile.passages && saveFile.passages.length > 0) {
        for (const passageSnapshot of saveFile.passages) {
          // Verify both universes exist before creating passage
          const sourceUniverse = multiverseCoordinator.getUniverse(passageSnapshot.sourceUniverseId);
          const targetUniverse = multiverseCoordinator.getUniverse(passageSnapshot.targetUniverseId);

          if (sourceUniverse && targetUniverse) {
            // Create passage connection in multiverse coordinator
            multiverseCoordinator.createPassage(
              passageSnapshot.id,
              passageSnapshot.sourceUniverseId,
              passageSnapshot.targetUniverseId,
              passageSnapshot.type
            );

            // If passage was inactive in the save, deactivate it
            if (!passageSnapshot.active) {
              const passage = multiverseCoordinator.getPassage(passageSnapshot.id);
              if (passage) {
                passage.active = false;
              }
            }
          } else {
            // Log warning if universes don't exist
            console.warn(
              `[SaveLoad] Skipping passage ${passageSnapshot.id}: ` +
              `${!sourceUniverse ? `source universe ${passageSnapshot.sourceUniverseId}` : ''} ` +
              `${!targetUniverse ? `target universe ${passageSnapshot.targetUniverseId}` : ''} not found`
            );
          }
        }
      }

      this.totalPlayTime = saveFile.header.playTime;
      this.playStartTime = Date.now();

      return {
        success: true,
        save: saveFile,
      };
    } catch (error) {
      console.error('[SaveLoad] Failed to load from server:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Load the latest snapshot of a universe from the server.
   */
  async loadLatestFromServer(
    universeId: string,
    world: World,
    forkName?: string
  ): Promise<LoadResult> {
    if (!this.serverSyncEnabled) {
      return {
        success: false,
        error: 'Server sync not enabled. Call enableServerSync() first.',
      };
    }

    try {
      const result = await multiverseClient.downloadLatestSnapshot(universeId);

      if (!result) {
        return {
          success: false,
          error: `No snapshots found for universe: ${universeId}`,
        };
      }

      return this.loadFromServer(universeId, result.entry.tick, world, forkName);
    } catch (error) {
      console.error('[SaveLoad] Failed to load latest from server:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * List all universes on the multiverse server.
   */
  async listRemoteUniverses(options?: {
    publicOnly?: boolean;
    ownerId?: string;
  }) {
    if (!this.serverSyncEnabled) {
      throw new Error('Server sync not enabled. Call enableServerSync() first.');
    }

    return multiverseClient.listUniverses(options);
  }

  /**
   * Get timeline for a remote universe (list of snapshots with canonical events).
   */
  async getRemoteTimeline(universeId: string, canonicalOnly?: boolean) {
    if (!this.serverSyncEnabled) {
      throw new Error('Server sync not enabled. Call enableServerSync() first.');
    }

    return multiverseClient.getTimeline(universeId, canonicalOnly);
  }

  /**
   * Get the multiverse client for advanced operations.
   */
  getMultiverseClient() {
    return multiverseClient;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

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
