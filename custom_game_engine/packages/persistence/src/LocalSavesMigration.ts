/**
 * LocalSavesMigration - Migrate local IndexedDB saves to multiverse server
 *
 * This utility reads all local saves and uploads them to the server,
 * properly grouping snapshots by universe ID.
 */

import type { SaveFile, StorageBackend } from './types.js';
import { multiverseClient } from './MultiverseClient.js';
import { compress } from './compression.js';

export interface MigrationProgress {
  totalSaves: number;
  processed: number;
  uploaded: number;
  skipped: number;
  failed: number;
  universesMapped: Map<string, string>; // localId -> serverId
  errors: Array<{ saveKey: string; error: string }>;
}

export interface MigrationOptions {
  /** Callback for progress updates */
  onProgress?: (progress: MigrationProgress) => void;
  /** Only migrate saves newer than this timestamp */
  sinceTimestamp?: number;
  /** Dry run - don't actually upload */
  dryRun?: boolean;
  /** Batch size for uploads (default: 5) */
  batchSize?: number;
}

/**
 * Migrate all local saves to the multiverse server
 */
export async function migrateLocalSaves(
  storage: StorageBackend | null,
  playerId: string,
  options: MigrationOptions = {}
): Promise<MigrationProgress> {
  const {
    onProgress,
    sinceTimestamp,
    dryRun = false,
    batchSize = 1,  // Upload one at a time to avoid network overload with large saves
  } = options;

  // Validate storage backend
  if (!storage) {
    throw new Error('Storage backend is null. Make sure saveLoadService has a storage backend configured.');
  }

  // Set player ID for server operations
  multiverseClient.setPlayerId(playerId);

  // Check server availability
  const serverAvailable = await multiverseClient.isAvailable();
  if (!serverAvailable) {
    throw new Error('Multiverse server is not available');
  }

  const progress: MigrationProgress = {
    totalSaves: 0,
    processed: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    universesMapped: new Map(),
    errors: [],
  };

  // List all local saves
  const saves = await storage.list();
  progress.totalSaves = saves.length;

  onProgress?.(progress);

  // Filter by timestamp if specified
  const savesToMigrate = sinceTimestamp
    ? saves.filter(s => s.lastSavedAt >= sinceTimestamp)
    : saves;

  // Group saves by universe ID
  const savesByUniverse = new Map<string, Array<{ key: string; save: SaveFile }>>();

  for (const saveMetadata of savesToMigrate) {
    try {
      const saveFile = await storage.load(saveMetadata.key);
      if (!saveFile) {
        progress.skipped++;
        continue;
      }

      // Extract universe ID from save file
      const universeId = saveFile.universes[0]?.identity?.id || 'universe:unknown';

      if (!savesByUniverse.has(universeId)) {
        savesByUniverse.set(universeId, []);
      }
      savesByUniverse.get(universeId)!.push({
        key: saveMetadata.key,
        save: saveFile,
      });
    } catch (error: any) {
      console.warn(`[Migration] Failed to load save ${saveMetadata.key}:`, error.message);
      progress.errors.push({ saveKey: saveMetadata.key, error: error.message });
      progress.failed++;
    }

    progress.processed++;
    onProgress?.(progress);
  }

  // Process each universe
  for (const [universeId, universeSaves] of savesByUniverse) {

    if (dryRun) {
      progress.uploaded += universeSaves.length;
      continue;
    }

    try {
      // Check if universe exists on server
      let serverUniverseId = universeId;
      const existing = await multiverseClient.getUniverse(universeId);

      if (!existing) {
        // Create universe on server with the same ID
        const universeName = universeSaves[0]?.save.universes[0]?.identity?.name || 'Migrated Universe';
        const created = await multiverseClient.createUniverse({
          name: universeName,
          isPublic: true,
          id: universeId, // Use the same ID as local
        });
        serverUniverseId = created.id;
      }

      progress.universesMapped.set(universeId, serverUniverseId);

      // Sort saves by tick to upload in order
      universeSaves.sort((a, b) => {
        const tickA = parseInt(a.save.universes[0]?.time?.universeTick || '0', 10);
        const tickB = parseInt(b.save.universes[0]?.time?.universeTick || '0', 10);
        return tickA - tickB;
      });

      // Upload snapshots in batches
      for (let i = 0; i < universeSaves.length; i += batchSize) {
        const batch = universeSaves.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(batch.map(async ({ key, save }) => {
          const tick = parseInt(save.universes[0]?.time?.universeTick || '0', 10);

          try {
            // Determine save type from filename
            const type = key.includes('autosave') ? 'auto' : 'manual';

            await multiverseClient.uploadSnapshot(serverUniverseId, save, {
              type,
            });

            progress.uploaded++;
            return { success: true, key };
          } catch (error: any) {
            // Skip duplicate ticks (already uploaded)
            if (error.message?.includes('already exists')) {
              progress.skipped++;
              return { success: true, key, duplicate: true };
            } else {
              progress.errors.push({ saveKey: key, error: error.message });
              progress.failed++;
              return { success: false, key, error: error.message };
            }
          }
        }));

        onProgress?.(progress);

        // Small delay between batches to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(`[Migration] Failed to process universe ${universeId}:`, error.message);
      progress.errors.push({ saveKey: `universe:${universeId}`, error: error.message });
      progress.failed++;
    }
  }

  return progress;
}

/**
 * Check migration status - how many local saves are not on server
 */
export async function checkMigrationStatus(
  storage: StorageBackend
): Promise<{
  totalLocal: number;
  uniqueUniverses: number;
  serverUniverses: number;
  needsMigration: boolean;
}> {
  const saves = await storage.list();

  // Count unique universe IDs in local saves
  const universeIds = new Set<string>();
  for (const saveMetadata of saves) {
    try {
      const saveFile = await storage.load(saveMetadata.key);
      if (saveFile) {
        const universeId = saveFile.universes[0]?.identity?.id;
        if (universeId) {
          universeIds.add(universeId);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // Check how many exist on server
  let serverUniverses = 0;
  try {
    const serverList = await multiverseClient.listUniverses();
    serverUniverses = serverList.filter(u => !u.name.startsWith('[DELETED]')).length;
  } catch {
    // Server might be unavailable
  }

  return {
    totalLocal: saves.length,
    uniqueUniverses: universeIds.size,
    serverUniverses,
    needsMigration: universeIds.size > serverUniverses,
  };
}
