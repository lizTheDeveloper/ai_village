/**
 * SoulRepositorySystem - Persistent backup of all created souls
 *
 * Automatically saves all souls to a repository independent of universe saves.
 * This ensures souls are never lost, even if their universe isn't saved.
 *
 * Repository Structure:
 * soul-repository/
 *   ├── index.json (master index of all souls)
 *   ├── by-date/
 *   │   └── 2025-01-03/
 *   │       └── {soul-id}.json
 *   ├── by-species/
 *   │   └── human/
 *   │       └── {soul-id}.json
 *   └── by-universe/
 *       └── {universe-id}/
 *           └── {soul-id}.json
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { GameEvent } from '../events/GameEvent.js';
import type { GameEventMap } from '../events/EventMap.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import type { IncarnationComponent } from '../components/IncarnationComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import * as fs from 'fs';
import * as path from 'path';

interface SoulRecord {
  // Identity
  soulId: string;
  agentId: string;
  name: string;

  // Attributes
  species: string;
  archetype: string;
  purpose: string;
  interests: string[];

  // Fate Reasoning (preserved for transparency/debugging)
  thoughts?: string; // Content from <thinking> tags during soul creation

  // Creation Context
  createdAt: string; // ISO timestamp (real-world time)
  soulBirthTick: number; // Game tick when soul was created
  universeId: string;
  universeName?: string;

  // Lineage
  parentIds?: string[];
  parentNames?: string[];

  // Ceremony Details
  ceremonyTranscript?: string;

  // Sprite Info
  spriteFolder?: string;

  // Metadata
  version: number; // Repository format version
}

interface SoulIndex {
  version: number;
  totalSouls: number;
  lastUpdated: string;
  souls: {
    [soulId: string]: {
      name: string;
      species: string;
      archetype: string;
      createdAt: string;
      soulBirthTick: number;
      universeId: string;
      filePath: string;
    };
  };
}

export class SoulRepositorySystem extends BaseSystem {
  readonly id: SystemId = 'soul_repository';
  readonly priority = 950; // Run very late, after sprite generation
  readonly requiredComponents = [] as const; // Event-driven

  private repositoryPath: string;
  private indexPath: string;
  private index: SoulIndex;

  constructor(repositoryPath?: string) {
    super();
    // Default to custom_game_engine/soul-repository
    this.repositoryPath = repositoryPath || path.join(process.cwd(), 'soul-repository');
    this.indexPath = path.join(this.repositoryPath, 'index.json');

    // Initialize repository
    this.ensureDirectoryStructure();
    this.index = this.loadIndex();
  }

  private ensureDirectoryStructure(): void {
    // Create main repository directory
    if (!fs.existsSync(this.repositoryPath)) {
      fs.mkdirSync(this.repositoryPath, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['by-date', 'by-species', 'by-universe'];
    for (const subdir of subdirs) {
      const dirPath = path.join(this.repositoryPath, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  private loadIndex(): SoulIndex {
    if (fs.existsSync(this.indexPath)) {
      try {
        const data = fs.readFileSync(this.indexPath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('[SoulRepository] Failed to load index, creating new:', error);
      }
    }

    // Create new index
    return {
      version: 1,
      totalSouls: 0,
      lastUpdated: new Date().toISOString(),
      souls: {},
    };
  }

  private saveIndex(): void {
    try {
      this.index.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
    } catch (error) {
      console.error('[SoulRepository] Failed to save index:', error);
    }
  }

  protected onInitialize(): void {
    // Subscribe to soul creation events
    this.events.subscribe('soul:ceremony_complete', (event: GameEvent<'soul:ceremony_complete'>) => {
      this.backupSoul(this.world, event.data);
    });
  }

  private async backupSoul(world: any, soulData: GameEventMap['soul:ceremony_complete']): Promise<void> {
    try {
      const { soulId, agentId, name, archetype, purpose, species, interests, thoughts } = soulData;

      // Determine entity ID (soulId is primary, agentId is fallback for backward compatibility)
      const entityId = soulId || agentId;
      if (!entityId) {
        console.warn('[SoulRepository] Soul data missing both soulId and agentId');
        return;
      }

      // Get soul entity (not agent - this is the soul itself)
      const soul = world.getEntity(entityId);
      if (!soul) {
        console.warn(`[SoulRepository] Soul ${entityId} not found for backup`);
        return;
      }

      // Extract additional information
      const soulIdentity = soul.getComponent<SoulIdentityComponent>('soul_identity');

      // Check if this soul is already in the repository (avoid duplicates)
      if (this.soulNameExists(name)) {
        return;
      }

      // Build soul record
      const soulRecord: SoulRecord = {
        // Identity
        soulId: entityId,
        agentId: agentId || entityId, // Might be same as soulId if not incarnated yet
        name,

        // Attributes
        species,
        archetype,
        purpose,
        interests: interests || [],

        // Fate Reasoning (preserved for transparency/debugging)
        thoughts: thoughts || undefined,

        // Creation Context
        createdAt: new Date().toISOString(),
        soulBirthTick: soulIdentity?.soulBirthTick ?? world.tick,
        // Note: universeId/name are set by multiverse package but not in World interface
        universeId: 'universeId' in world ? (world as { universeId: string }).universeId : 'unknown',
        universeName: 'name' in world ? (world as { name: string }).name : undefined,

        // Sprite Info (may not have sprite yet if not incarnated)
        spriteFolder: undefined,

        // Metadata
        version: 1,
      };

      // Add lineage if available
      const incarnation = soul.getComponent<IncarnationComponent>('incarnation');
      // Note: parentIds not in IncarnationComponent interface - checking for compatibility with old save data
      const incarnationData = incarnation as IncarnationComponent & { parentIds?: string[] };
      if (incarnationData?.parentIds && incarnationData.parentIds.length > 0) {
        soulRecord.parentIds = incarnationData.parentIds;
        // Try to get parent names
        const parentNames: string[] = [];
        for (const parentId of incarnationData.parentIds) {
          const parent = world.getEntity(parentId);
          if (parent) {
            const parentIdentity = parent.getComponent<IdentityComponent>('identity');
            if (parentIdentity?.name) {
              parentNames.push(parentIdentity.name);
            }
          }
        }
        if (parentNames.length > 0) {
          soulRecord.parentNames = parentNames;
        }
      }

      // Save to multiple locations for easy retrieval
      await this.saveSoulRecord(soulRecord);

      // Update index
      this.updateIndex(soulRecord);

    } catch (error) {
      console.error('[SoulRepository] Failed to backup soul:', error);
    }
  }

  private async saveSoulRecord(record: SoulRecord): Promise<void> {
    const filename = `${record.soulId}.json`;
    const recordJson = JSON.stringify(record, null, 2);

    // Save by date
    const dateStr = record.createdAt.split('T')[0] || 'unknown'; // YYYY-MM-DD
    const datePath = path.join(this.repositoryPath, 'by-date', dateStr);
    if (!fs.existsSync(datePath)) {
      fs.mkdirSync(datePath, { recursive: true });
    }
    fs.writeFileSync(path.join(datePath, filename), recordJson);

    // Save by species
    const speciesPath = path.join(this.repositoryPath, 'by-species', record.species);
    if (!fs.existsSync(speciesPath)) {
      fs.mkdirSync(speciesPath, { recursive: true });
    }
    fs.writeFileSync(path.join(speciesPath, filename), recordJson);

    // Save by universe
    const universePath = path.join(this.repositoryPath, 'by-universe', record.universeId);
    if (!fs.existsSync(universePath)) {
      fs.mkdirSync(universePath, { recursive: true });
    }
    fs.writeFileSync(path.join(universePath, filename), recordJson);
  }

  private updateIndex(record: SoulRecord): void {
    this.index.souls[record.soulId] = {
      name: record.name,
      species: record.species,
      archetype: record.archetype,
      createdAt: record.createdAt,
      soulBirthTick: record.soulBirthTick,
      universeId: record.universeId,
      filePath: `by-date/${record.createdAt.split('T')[0]}/${record.soulId}.json`,
    };

    this.index.totalSouls = Object.keys(this.index.souls).length;
    this.saveIndex();
  }

  protected onUpdate(_ctx: SystemContext): void {
    // This system is purely event-driven, no per-tick updates needed
  }

  /**
   * Query souls by various criteria
   */
  querySouls(filter: {
    species?: string;
    archetype?: string;
    universeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): SoulRecord[] {
    const results: SoulRecord[] = [];

    for (const soulId in this.index.souls) {
      const indexEntry = this.index.souls[soulId];
      if (!indexEntry) continue;

      // Apply filters
      if (filter.species && indexEntry.species !== filter.species) continue;
      if (filter.archetype && indexEntry.archetype !== filter.archetype) continue;
      if (filter.universeId && indexEntry.universeId !== filter.universeId) continue;
      if (filter.dateFrom && indexEntry.createdAt < filter.dateFrom) continue;
      if (filter.dateTo && indexEntry.createdAt > filter.dateTo) continue;

      // Load full record
      try {
        const filePath = path.join(this.repositoryPath, indexEntry.filePath);
        const data = fs.readFileSync(filePath, 'utf-8');
        results.push(JSON.parse(data));
      } catch (error) {
        console.warn(`[SoulRepository] Failed to load soul ${soulId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get a specific soul by ID
   */
  getSoul(soulId: string): SoulRecord | null {
    const indexEntry = this.index.souls[soulId];
    if (!indexEntry) return null;

    try {
      const filePath = path.join(this.repositoryPath, indexEntry.filePath);
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`[SoulRepository] Failed to load soul ${soulId}:`, error);
      return null;
    }
  }

  /**
   * Get a specific soul by name (for cross-game soul reuse)
   */
  getSoulByName(name: string): SoulRecord | null {
    // Search through index for matching name
    for (const soulId in this.index.souls) {
      const indexEntry = this.index.souls[soulId];
      if (indexEntry && indexEntry.name === name) {
        return this.getSoul(soulId);
      }
    }
    return null;
  }

  /**
   * Check if a soul name already exists in the repository
   */
  soulNameExists(name: string): boolean {
    for (const soulId in this.index.souls) {
      const indexEntry = this.index.souls[soulId];
      if (indexEntry && indexEntry.name === name) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all souls from the repository
   */
  getAllSouls(): SoulRecord[] {
    const souls: SoulRecord[] = [];
    for (const soulId in this.index.souls) {
      const soul = this.getSoul(soulId);
      if (soul) {
        souls.push(soul);
      }
    }
    return souls;
  }

  /**
   * Get a random soul from the repository (for reuse in new games)
   * Excludes corrupted souls from selection
   */
  getRandomSoul(): SoulRecord | null {
    const allSoulIds = Object.keys(this.index.souls);
    if (allSoulIds.length === 0) return null;

    // Filter out corrupted souls
    const validSoulIds = allSoulIds.filter(soulId => {
      const soul = this.getSoul(soulId);
      if (!soul) return false;

      // Exclude souls marked as corrupted
      if (soul.purpose && soul.purpose.includes('[CORRUPTED SOUL]')) {
        return false;
      }

      return true;
    });

    if (validSoulIds.length === 0) {
      console.warn('[SoulRepository] No valid souls available for reincarnation (all corrupted)');
      return null;
    }

    const randomId = validSoulIds[Math.floor(Math.random() * validSoulIds.length)];
    return randomId ? this.getSoul(randomId) : null;
  }

  /**
   * Get statistics about the repository
   */
  getStats(): {
    totalSouls: number;
    bySpecies: Record<string, number>;
    byArchetype: Record<string, number>;
    byUniverse: Record<string, number>;
  } {
    const stats = {
      totalSouls: this.index.totalSouls,
      bySpecies: {} as Record<string, number>,
      byArchetype: {} as Record<string, number>,
      byUniverse: {} as Record<string, number>,
    };

    for (const soulId in this.index.souls) {
      const soul = this.index.souls[soulId];
      if (!soul) continue;

      stats.bySpecies[soul.species] = (stats.bySpecies[soul.species] || 0) + 1;
      stats.byArchetype[soul.archetype] = (stats.byArchetype[soul.archetype] || 0) + 1;
      stats.byUniverse[soul.universeId] = (stats.byUniverse[soul.universeId] || 0) + 1;
    }

    return stats;
  }
}
