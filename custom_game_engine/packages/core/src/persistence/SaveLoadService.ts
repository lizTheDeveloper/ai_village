/**
 * SaveLoadService - Main API for saving and loading game state
 *
 * Supports both local storage (IndexedDB) and server sync for multiverse persistence.
 * When server sync is enabled, saves are uploaded to the multiverse server for
 * cross-player universe access, time travel, and forking.
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
import { validateWorldState, validateSaveFile } from './InvariantChecker.js';
import { multiverseCoordinator } from '../multiverse/MultiverseCoordinator.js';

// Canon event types for multiverse server sync
export type CanonEventType =
  | 'death'
  | 'birth'
  | 'marriage'
  | 'first_achievement'
  | 'record_high'
  | 'catastrophe'
  | 'deity_emergence'
  | 'major_discovery'
  | 'war_event'
  | 'cultural_milestone'
  | 'day_milestone';

export interface CanonEvent {
  type: CanonEventType;
  title: string;
  description: string;
  day: number;
  importance: number;
  entities?: string[];
}

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
}

export interface LoadResult {
  success: boolean;
  save?: SaveFile;
  error?: string;
}

// Inline MultiverseClient for server sync
// (Avoids circular dependency with separate persistence package)
class MultiverseClient {
  private baseUrl: string;
  private playerId: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }

  setPlayerId(playerId: string): void {
    this.playerId = playerId;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/multiverse/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async registerPlayer(displayName?: string): Promise<void> {
    if (!this.playerId) throw new Error('Player ID not set');
    await fetch(`${this.baseUrl}/player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.playerId, displayName: displayName ?? this.playerId }),
    });
  }

  async getUniverse(universeId: string): Promise<unknown | null> {
    const response = await fetch(`${this.baseUrl}/universe/${universeId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to get universe');
    const data = await response.json();
    return data.universe;
  }

  async createUniverse(options: { name: string; isPublic?: boolean; id?: string }): Promise<{ id: string; name: string }> {
    if (!this.playerId) throw new Error('Player ID not set');
    const response = await fetch(`${this.baseUrl}/universe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: options.id, // Pass client's ID to keep them in sync
        name: options.name,
        ownerId: this.playerId,
        isPublic: options.isPublic ?? false,
      }),
    });
    if (!response.ok) throw new Error('Failed to create universe');
    const data = await response.json();
    return data.universe;
  }

  async uploadSnapshot(
    universeId: string,
    saveFile: SaveFile,
    options?: { type?: 'auto' | 'manual' | 'canonical'; canonEvent?: CanonEvent }
  ): Promise<{ tick: number; type: string }> {
    const universeSnapshot = saveFile.universes[0];
    if (!universeSnapshot) throw new Error('No universe snapshot');

    const tick = parseInt(universeSnapshot.time.universeTick, 10);
    const day = universeSnapshot.time.day;

    const response = await fetch(`${this.baseUrl}/universe/${universeId}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshot: saveFile,
        tick,
        day,
        type: options?.type ?? 'manual',
        canonEvent: options?.canonEvent,
      }),
    });

    if (!response.ok) throw new Error('Failed to upload snapshot');
    const data = await response.json();
    return data.entry;
  }
}

const multiverseClient = new MultiverseClient();

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
   */
  async enableServerSync(playerId: string): Promise<boolean> {
    multiverseClient.setPlayerId(playerId);
    this.serverAvailable = await multiverseClient.isAvailable();
    this.lastServerCheck = Date.now();

    if (this.serverAvailable) {
      this.serverSyncEnabled = true;
      try {
        await multiverseClient.registerPlayer();
        console.log(`[SaveLoad] Server sync enabled for player: ${playerId}`);
      } catch (error) {
        console.warn('[SaveLoad] Failed to register player:', error);
      }
      return true;
    } else {
      console.warn('[SaveLoad] Multiverse server not available');
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
   * Check if server sync is enabled.
   */
  isServerSyncEnabled(): boolean {
    return this.serverSyncEnabled;
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
   * Get the current storage backend.
   */
  getStorageBackend(): StorageBackend | null {
    return this.storageBackend;
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
    let universeId = 'universe:main';  // Default fallback
    let universeName = 'Main Universe';

    for (const [id, instance] of multiverseCoordinator.getAllUniverses()) {
      if (instance.world === world) {
        universeId = id;
        universeName = instance.config.name;
        break;
      }
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
        let serverUniverseId = universeId;
        const existingUniverse = await multiverseClient.getUniverse(universeId);
        if (!existingUniverse) {
          // Pass client's ID to keep them in sync
          const created = await multiverseClient.createUniverse({
            name: universeName,
            isPublic: true,
            id: universeId,
          });
          serverUniverseId = created.id;
          console.log(`[SaveLoad] Created universe on server: ${serverUniverseId}`);
        }

        // Upload snapshot to server using the server's universe ID
        const snapshotEntry = await multiverseClient.uploadSnapshot(
          serverUniverseId,
          saveFile,
          {
            type: options.type ?? (options.canonEvent ? 'canonical' : 'manual'),
            canonEvent: options.canonEvent,
          }
        );

        console.log(
          `[SaveLoad] Synced to server: tick ${snapshotEntry.tick}, ` +
          `type ${snapshotEntry.type}${options.canonEvent ? `, event: ${options.canonEvent.title}` : ''}`
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
      world.clear();

      // Restore multiverse state
      multiverseCoordinator.loadFromSnapshot(saveFile.multiverse.time);

      // Deserialize universe(s) BEFORE restoring passages
      // (passages need universes to exist first)
      for (const universeSnapshot of saveFile.universes) {
        await worldSerializer.deserializeWorld(universeSnapshot, world);
      }

      // Restore passage connections between universes
      for (const passageSnapshot of saveFile.passages) {
        // Recreate passage connection in multiverse coordinator
        multiverseCoordinator.createPassage(
          passageSnapshot.id,
          passageSnapshot.sourceUniverseId,
          passageSnapshot.targetUniverseId,
          passageSnapshot.type
        );

        // Find the source universe world
        const sourceUniverse = multiverseCoordinator.getUniverse(passageSnapshot.sourceUniverseId);
        if (!sourceUniverse) {
          console.warn(
            `[SaveLoad] Source universe ${passageSnapshot.sourceUniverseId} not found for passage ${passageSnapshot.id}, skipping entity creation`
          );
          continue;
        }

        // Create passage entity in source universe
        const passageEntity = sourceUniverse.world.createEntity();

        // Cast to EntityImpl to access addComponent (internal mutable interface)
        const { EntityImpl } = await import('../ecs/Entity.js');
        const passageEntityImpl = passageEntity as typeof EntityImpl.prototype;

        // Add PassageComponent with restored data
        const { createPassageComponent } = await import('../components/PassageComponent.js');
        const passageComponent = createPassageComponent(
          passageSnapshot.id,
          passageSnapshot.sourceUniverseId,
          passageSnapshot.targetUniverseId,
          passageSnapshot.type
        );

        // Set active state from snapshot
        passageComponent.active = passageSnapshot.active;
        passageComponent.state = passageSnapshot.active ? 'active' : 'dormant';

        passageEntityImpl.addComponent(passageComponent);

        // Add PassageExtendedComponent with default values
        // (Extended data not currently saved, will use defaults based on type)
        const { createPassageExtended } = await import('../components/PassageExtendedComponent.js');
        const passageExtended = createPassageExtended(
          passageSnapshot.id,
          passageSnapshot.type,
          undefined, // No discoverer on load
          Number(sourceUniverse.universeTick)
        );

        passageEntityImpl.addComponent(passageExtended);
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
