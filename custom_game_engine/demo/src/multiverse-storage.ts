/**
 * MultiverseStorage - Server-side file-based storage for universes
 *
 * Stores universe snapshots, metadata, and timeline information.
 * Enables cross-player universe access for the multiverse system.
 *
 * Directory structure:
 * /data/
 *   universes/
 *     {universeId}/
 *       metadata.json       - Universe metadata
 *       timeline.json       - Snapshot index and timeline
 *       snapshots/
 *         {tick}.json.gz    - Compressed snapshot at tick
 *         canonical/
 *           {eventKey}.json.gz - Canonical event snapshots
 *   passages/
 *     index.json            - All passages
 *     {passageId}.json      - Individual passage data
 *   players/
 *     index.json            - Player registry
 *     {playerId}/
 *       profile.json        - Player profile
 *       universes.json      - Player's universe list
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory - relative to demo folder
const DATA_DIR = path.join(__dirname, '../multiverse-data');

// Type definitions

export interface UniverseMetadata {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  lastSnapshotAt: number;
  snapshotCount: number;
  canonicalEventCount: number;
  isPublic: boolean;
  forkOf?: {
    universeId: string;
    snapshotTick: number;
  };
  // Universe configuration
  config?: {
    timeScale?: number;
    magicLevel?: string;
    techLevel?: string;
  };
}

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

export interface SnapshotDecayPolicy {
  /** Decay after this many universe-ticks (tau = causality delta) */
  decayAfterTicks?: number;
  /** Never decay (canonical events) */
  neverDecay?: boolean;
  /** Reason for preservation */
  preservationReason?: string;
}

export interface SnapshotEntry {
  tick: number;
  timestamp: number;
  day: number;
  type: 'auto' | 'manual' | 'canonical';
  canonEvent?: CanonEvent;
  fileSize: number;
  checksum: string;
  filename: string;
  /** Client-specified decay policy (defaults to 24 hours of universe-time) */
  decayPolicy?: SnapshotDecayPolicy;
}

export interface TimelineIndex {
  universeId: string;
  snapshots: SnapshotEntry[];
  lastUpdated: number;
}

export interface PassageConnection {
  id: string;
  sourceUniverseId: string;
  targetUniverseId: string;
  type: 'thread' | 'bridge' | 'gate' | 'confluence';
  active: boolean;
  createdAt: number;
  createdBy: string;
  // Stability degrades over time without maintenance
  stability: number;
  lastMaintenance: number;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  createdAt: number;
  lastSeen: number;
  universeCount: number;
}

export interface PlayerUniverseList {
  playerId: string;
  universes: string[];
  lastUpdated: number;
}

/**
 * MultiverseStorage - File-based storage for the multiverse server
 */
export class MultiverseStorage {
  private initialized = false;

  /**
   * Initialize storage directories
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(path.join(DATA_DIR, 'universes'), { recursive: true });
    await fs.mkdir(path.join(DATA_DIR, 'passages'), { recursive: true });
    await fs.mkdir(path.join(DATA_DIR, 'players'), { recursive: true });

    // Create index files if they don't exist
    const passagesIndex = path.join(DATA_DIR, 'passages', 'index.json');
    const playersIndex = path.join(DATA_DIR, 'players', 'index.json');

    try {
      await fs.access(passagesIndex);
    } catch {
      await fs.writeFile(passagesIndex, JSON.stringify({ passages: [] }, null, 2));
    }

    try {
      await fs.access(playersIndex);
    } catch {
      await fs.writeFile(playersIndex, JSON.stringify({ players: [] }, null, 2));
    }

    this.initialized = true;
    console.log('[MultiverseStorage] Initialized at', DATA_DIR);
  }

  // ============================================================
  // UNIVERSE MANAGEMENT
  // ============================================================

  /**
   * Create a new universe
   */
  async createUniverse(metadata: UniverseMetadata): Promise<void> {
    await this.init();

    const universeDir = path.join(DATA_DIR, 'universes', metadata.id);
    const snapshotsDir = path.join(universeDir, 'snapshots');
    const canonicalDir = path.join(snapshotsDir, 'canonical');

    await fs.mkdir(canonicalDir, { recursive: true });

    // Write metadata
    await fs.writeFile(
      path.join(universeDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Initialize timeline
    const timeline: TimelineIndex = {
      universeId: metadata.id,
      snapshots: [],
      lastUpdated: Date.now(),
    };
    await fs.writeFile(
      path.join(universeDir, 'timeline.json'),
      JSON.stringify(timeline, null, 2)
    );

    // Register with player
    await this.addUniverseToPlayer(metadata.ownerId, metadata.id);

    console.log(`[MultiverseStorage] Created universe ${metadata.id} for player ${metadata.ownerId}`);
  }

  /**
   * Get universe metadata
   */
  async getUniverseMetadata(universeId: string): Promise<UniverseMetadata | null> {
    await this.init();

    const metadataPath = path.join(DATA_DIR, 'universes', universeId, 'metadata.json');

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Update universe metadata
   */
  async updateUniverseMetadata(universeId: string, updates: Partial<UniverseMetadata>): Promise<void> {
    await this.init();

    const existing = await this.getUniverseMetadata(universeId);
    if (!existing) {
      throw new Error(`Universe ${universeId} not found`);
    }

    const updated = { ...existing, ...updates };
    const metadataPath = path.join(DATA_DIR, 'universes', universeId, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2));
  }

  /**
   * List all universes (optionally filtered by public status)
   */
  async listUniverses(options?: { publicOnly?: boolean; ownerId?: string }): Promise<UniverseMetadata[]> {
    await this.init();

    const universesDir = path.join(DATA_DIR, 'universes');

    try {
      const dirs = await fs.readdir(universesDir, { withFileTypes: true });
      const universes: UniverseMetadata[] = [];

      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;

        const metadata = await this.getUniverseMetadata(dir.name);
        if (!metadata) continue;

        if (options?.publicOnly && !metadata.isPublic) continue;
        if (options?.ownerId && metadata.ownerId !== options.ownerId) continue;

        universes.push(metadata);
      }

      // Sort by last snapshot time (newest first)
      return universes.sort((a, b) => b.lastSnapshotAt - a.lastSnapshotAt);
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Delete a universe (marks as deleted, doesn't actually remove - conservation of game matter)
   */
  async deleteUniverse(universeId: string): Promise<void> {
    await this.init();

    await this.updateUniverseMetadata(universeId, {
      isPublic: false,
      name: `[DELETED] ${(await this.getUniverseMetadata(universeId))?.name}`,
    });

    console.log(`[MultiverseStorage] Marked universe ${universeId} as deleted (preserved per conservation rules)`);
  }

  // ============================================================
  // SNAPSHOT MANAGEMENT
  // ============================================================

  /**
   * Save a snapshot
   */
  async saveSnapshot(
    universeId: string,
    snapshot: any,
    options: {
      tick: number;
      day: number;
      type: 'auto' | 'manual' | 'canonical';
      canonEvent?: CanonEvent;
      decayPolicy?: SnapshotDecayPolicy;
    }
  ): Promise<SnapshotEntry> {
    await this.init();

    const snapshotsDir = path.join(DATA_DIR, 'universes', universeId, 'snapshots');
    const canonicalDir = path.join(snapshotsDir, 'canonical');

    // Determine filename
    let filename: string;
    if (options.type === 'canonical' && options.canonEvent) {
      const eventKey = `${options.canonEvent.type}_${options.day}_${Date.now()}`;
      filename = path.join('canonical', `${eventKey}.json.gz`);
    } else {
      filename = `${options.tick}.json.gz`;
    }

    const fullPath = path.join(snapshotsDir, filename);

    // Compress and write snapshot
    const jsonData = JSON.stringify(snapshot);
    const checksum = this.computeChecksum(jsonData);

    await this.compressAndWrite(jsonData, fullPath);

    const stats = await fs.stat(fullPath);

    // Apply default decay policy if not provided
    // Default: 24 hours of universe-time (1728000 ticks at 20 TPS)
    const DEFAULT_DECAY_TICKS = 1728000;
    let decayPolicy = options.decayPolicy;

    if (!decayPolicy) {
      if (options.type === 'canonical') {
        // Canonical snapshots never decay
        decayPolicy = { neverDecay: true, preservationReason: 'canonical event' };
      } else {
        // Auto/manual: decay after 24 hours
        decayPolicy = { decayAfterTicks: DEFAULT_DECAY_TICKS };
      }
    }

    // Create snapshot entry
    const entry: SnapshotEntry = {
      tick: options.tick,
      timestamp: Date.now(),
      day: options.day,
      type: options.type,
      canonEvent: options.canonEvent,
      fileSize: stats.size,
      checksum,
      filename,
      decayPolicy,
    };

    // Update timeline
    await this.addToTimeline(universeId, entry);

    // Update metadata
    const metadata = await this.getUniverseMetadata(universeId);
    if (metadata) {
      await this.updateUniverseMetadata(universeId, {
        lastSnapshotAt: Date.now(),
        snapshotCount: metadata.snapshotCount + 1,
        canonicalEventCount: options.type === 'canonical'
          ? metadata.canonicalEventCount + 1
          : metadata.canonicalEventCount,
      });
    }

    console.log(`[MultiverseStorage] Saved ${options.type} snapshot for ${universeId} at tick ${options.tick}`);

    return entry;
  }

  /**
   * Load a snapshot by tick
   */
  async loadSnapshot(universeId: string, tick: number): Promise<any | null> {
    await this.init();

    const timeline = await this.getTimeline(universeId);
    if (!timeline) return null;

    const entry = timeline.snapshots.find(s => s.tick === tick);
    if (!entry) return null;

    const fullPath = path.join(DATA_DIR, 'universes', universeId, 'snapshots', entry.filename);

    try {
      const content = await this.decompressAndRead(fullPath);
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Load the latest snapshot
   */
  async loadLatestSnapshot(universeId: string): Promise<{ snapshot: any; entry: SnapshotEntry } | null> {
    await this.init();

    const timeline = await this.getTimeline(universeId);
    if (!timeline || timeline.snapshots.length === 0) return null;

    // Sort by tick descending
    const sorted = [...timeline.snapshots].sort((a, b) => b.tick - a.tick);
    const latest = sorted[0];

    const snapshot = await this.loadSnapshot(universeId, latest.tick);
    if (!snapshot) return null;

    return { snapshot, entry: latest };
  }

  /**
   * Get timeline (snapshot index)
   */
  async getTimeline(universeId: string): Promise<TimelineIndex | null> {
    await this.init();

    const timelinePath = path.join(DATA_DIR, 'universes', universeId, 'timeline.json');

    try {
      const content = await fs.readFile(timelinePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Get canonical events only
   */
  async getCanonicalEvents(universeId: string): Promise<SnapshotEntry[]> {
    const timeline = await this.getTimeline(universeId);
    if (!timeline) return [];

    return timeline.snapshots.filter(s => s.type === 'canonical');
  }

  /**
   * Add entry to timeline
   */
  private async addToTimeline(universeId: string, entry: SnapshotEntry): Promise<void> {
    const timeline = await this.getTimeline(universeId);
    if (!timeline) {
      throw new Error(`Timeline for ${universeId} not found`);
    }

    timeline.snapshots.push(entry);
    timeline.lastUpdated = Date.now();

    const timelinePath = path.join(DATA_DIR, 'universes', universeId, 'timeline.json');
    await fs.writeFile(timelinePath, JSON.stringify(timeline, null, 2));
  }

  /**
   * Evaluate which snapshots should be decayed
   * Uses tau (causality delta) = currentTick - snapshotTick
   *
   * @param universeId Universe to evaluate
   * @param currentTick Current universe tick (for tau calculation)
   * @returns Array of snapshots that should be removed
   */
  async evaluateSnapshotDecay(
    universeId: string,
    currentTick: number
  ): Promise<SnapshotEntry[]> {
    await this.init();

    const timeline = await this.getTimeline(universeId);
    if (!timeline) return [];

    const toDecay: SnapshotEntry[] = [];

    for (const snapshot of timeline.snapshots) {
      const policy = snapshot.decayPolicy;

      // Never decay if explicitly marked
      if (policy?.neverDecay) {
        continue;
      }

      // Calculate tau (causality delta)
      const tau = currentTick - snapshot.tick;

      // Check if decay threshold exceeded
      const decayThreshold = policy?.decayAfterTicks ?? 1728000; // Default: 24 hours
      if (tau >= decayThreshold) {
        toDecay.push(snapshot);
      }
    }

    return toDecay;
  }

  /**
   * Remove decayed snapshots
   *
   * @param universeId Universe to clean up
   * @param currentTick Current universe tick
   * @returns Stats about cleanup operation
   */
  async cleanupDecayedSnapshots(
    universeId: string,
    currentTick: number
  ): Promise<{
    totalSnapshots: number;
    decayed: number;
    preserved: number;
    bytesFreed: number;
  }> {
    await this.init();

    const timeline = await this.getTimeline(universeId);
    if (!timeline) {
      return { totalSnapshots: 0, decayed: 0, preserved: 0, bytesFreed: 0 };
    }

    const totalSnapshots = timeline.snapshots.length;
    const toDecay = await this.evaluateSnapshotDecay(universeId, currentTick);

    let bytesFreed = 0;
    const decayedEntries: SnapshotEntry[] = [];

    // Delete snapshot files
    for (const snapshot of toDecay) {
      const snapshotPath = path.join(
        DATA_DIR,
        'universes',
        universeId,
        'snapshots',
        snapshot.filename
      );

      try {
        // Track file size before deletion
        const stats = await fs.stat(snapshotPath);
        bytesFreed += stats.size;

        // Delete file
        await fs.unlink(snapshotPath);

        decayedEntries.push(snapshot);
        console.log(`[MultiverseStorage] Decayed snapshot: ${snapshot.filename} (tau: ${currentTick - snapshot.tick} ticks)`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error(`[MultiverseStorage] Failed to delete snapshot ${snapshot.filename}:`, error);
        }
      }
    }

    // Update timeline (remove decayed entries)
    const decayedFilenames = new Set(decayedEntries.map(s => s.filename));
    timeline.snapshots = timeline.snapshots.filter(s => !decayedFilenames.has(s.filename));
    timeline.lastUpdated = Date.now();

    const timelinePath = path.join(DATA_DIR, 'universes', universeId, 'timeline.json');
    await fs.writeFile(timelinePath, JSON.stringify(timeline, null, 2));

    // Update metadata
    const metadata = await this.getUniverseMetadata(universeId);
    if (metadata) {
      await this.updateUniverseMetadata(universeId, {
        snapshotCount: timeline.snapshots.length,
        canonicalEventCount: timeline.snapshots.filter(s => s.type === 'canonical').length,
      });
    }

    const preserved = timeline.snapshots.length;

    console.log(
      `[MultiverseStorage] Cleanup complete for ${universeId}: ` +
      `${decayedEntries.length} decayed, ${preserved} preserved, ` +
      `${(bytesFreed / 1024 / 1024).toFixed(2)} MB freed`
    );

    return {
      totalSnapshots,
      decayed: decayedEntries.length,
      preserved,
      bytesFreed,
    };
  }

  // ============================================================
  // UNIVERSE FORKING
  // ============================================================

  /**
   * Fork a universe from a specific snapshot
   */
  async forkUniverse(
    sourceUniverseId: string,
    snapshotTick: number,
    newUniverseId: string,
    ownerId: string,
    name: string
  ): Promise<UniverseMetadata> {
    await this.init();

    // Load the source snapshot
    const sourceSnapshot = await this.loadSnapshot(sourceUniverseId, snapshotTick);
    if (!sourceSnapshot) {
      throw new Error(`Snapshot at tick ${snapshotTick} not found in universe ${sourceUniverseId}`);
    }

    const sourceMetadata = await this.getUniverseMetadata(sourceUniverseId);
    if (!sourceMetadata) {
      throw new Error(`Universe ${sourceUniverseId} not found`);
    }

    // Create new universe metadata
    const newMetadata: UniverseMetadata = {
      id: newUniverseId,
      name,
      ownerId,
      createdAt: Date.now(),
      lastSnapshotAt: Date.now(),
      snapshotCount: 1,
      canonicalEventCount: 0,
      isPublic: false,
      forkOf: {
        universeId: sourceUniverseId,
        snapshotTick,
      },
      config: sourceMetadata.config,
    };

    // Create the forked universe
    await this.createUniverse(newMetadata);

    // Copy the snapshot as the initial snapshot
    const timeline = await this.getTimeline(sourceUniverseId);
    const sourceEntry = timeline?.snapshots.find(s => s.tick === snapshotTick);

    await this.saveSnapshot(newUniverseId, sourceSnapshot, {
      tick: snapshotTick,
      day: sourceEntry?.day ?? 0,
      type: 'manual',
    });

    console.log(`[MultiverseStorage] Forked universe ${sourceUniverseId}@${snapshotTick} -> ${newUniverseId}`);

    return newMetadata;
  }

  /**
   * List forks of a universe
   */
  async listForks(universeId: string): Promise<UniverseMetadata[]> {
    const allUniverses = await this.listUniverses();
    return allUniverses.filter(u => u.forkOf?.universeId === universeId);
  }

  // ============================================================
  // PASSAGE MANAGEMENT
  // ============================================================

  /**
   * Create a passage between universes
   */
  async createPassage(passage: PassageConnection): Promise<void> {
    await this.init();

    const passagePath = path.join(DATA_DIR, 'passages', `${passage.id}.json`);
    await fs.writeFile(passagePath, JSON.stringify(passage, null, 2));

    // Update index
    const indexPath = path.join(DATA_DIR, 'passages', 'index.json');
    const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    index.passages.push(passage.id);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    console.log(`[MultiverseStorage] Created passage ${passage.id}: ${passage.sourceUniverseId} -> ${passage.targetUniverseId}`);
  }

  /**
   * Get a passage
   */
  async getPassage(passageId: string): Promise<PassageConnection | null> {
    await this.init();

    const passagePath = path.join(DATA_DIR, 'passages', `${passageId}.json`);

    try {
      const content = await fs.readFile(passagePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * List all passages
   */
  async listPassages(options?: { universeId?: string }): Promise<PassageConnection[]> {
    await this.init();

    const indexPath = path.join(DATA_DIR, 'passages', 'index.json');

    try {
      const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
      const passages: PassageConnection[] = [];

      for (const id of index.passages) {
        const passage = await this.getPassage(id);
        if (!passage) continue;

        if (options?.universeId) {
          if (passage.sourceUniverseId !== options.universeId &&
              passage.targetUniverseId !== options.universeId) {
            continue;
          }
        }

        passages.push(passage);
      }

      return passages;
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Delete a passage (marks inactive - conservation of game matter)
   */
  async deletePassage(passageId: string): Promise<void> {
    const passage = await this.getPassage(passageId);
    if (!passage) return;

    passage.active = false;
    const passagePath = path.join(DATA_DIR, 'passages', `${passageId}.json`);
    await fs.writeFile(passagePath, JSON.stringify(passage, null, 2));

    console.log(`[MultiverseStorage] Marked passage ${passageId} as inactive (preserved)`);
  }

  // ============================================================
  // PLAYER MANAGEMENT
  // ============================================================

  /**
   * Register or update a player
   */
  async registerPlayer(profile: PlayerProfile): Promise<void> {
    await this.init();

    const playerDir = path.join(DATA_DIR, 'players', profile.id);
    await fs.mkdir(playerDir, { recursive: true });

    // Write profile
    await fs.writeFile(
      path.join(playerDir, 'profile.json'),
      JSON.stringify(profile, null, 2)
    );

    // Initialize universes list if needed
    const universesPath = path.join(playerDir, 'universes.json');
    try {
      await fs.access(universesPath);
    } catch {
      const universeList: PlayerUniverseList = {
        playerId: profile.id,
        universes: [],
        lastUpdated: Date.now(),
      };
      await fs.writeFile(universesPath, JSON.stringify(universeList, null, 2));
    }

    // Update index
    const indexPath = path.join(DATA_DIR, 'players', 'index.json');
    const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    if (!index.players.includes(profile.id)) {
      index.players.push(profile.id);
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    }

    console.log(`[MultiverseStorage] Registered player ${profile.id}`);
  }

  /**
   * Get player profile
   */
  async getPlayer(playerId: string): Promise<PlayerProfile | null> {
    await this.init();

    const profilePath = path.join(DATA_DIR, 'players', playerId, 'profile.json');

    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Get player's universes
   */
  async getPlayerUniverses(playerId: string): Promise<string[]> {
    await this.init();

    const universesPath = path.join(DATA_DIR, 'players', playerId, 'universes.json');

    try {
      const content = await fs.readFile(universesPath, 'utf-8');
      const list: PlayerUniverseList = JSON.parse(content);
      return list.universes;
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Add universe to player's list
   */
  async addUniverseToPlayer(playerId: string, universeId: string): Promise<void> {
    await this.init();

    // Ensure player exists
    let player = await this.getPlayer(playerId);
    if (!player) {
      player = {
        id: playerId,
        displayName: playerId,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        universeCount: 0,
      };
      await this.registerPlayer(player);
    }

    const universesPath = path.join(DATA_DIR, 'players', playerId, 'universes.json');
    let list: PlayerUniverseList;

    try {
      const content = await fs.readFile(universesPath, 'utf-8');
      list = JSON.parse(content);
    } catch {
      list = {
        playerId,
        universes: [],
        lastUpdated: Date.now(),
      };
    }

    if (!list.universes.includes(universeId)) {
      list.universes.push(universeId);
      list.lastUpdated = Date.now();
      await fs.writeFile(universesPath, JSON.stringify(list, null, 2));

      // Update player universe count
      player.universeCount = list.universes.length;
      await fs.writeFile(
        path.join(DATA_DIR, 'players', playerId, 'profile.json'),
        JSON.stringify(player, null, 2)
      );
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Compute checksum of data
   */
  private computeChecksum(data: string): string {
    // Simple hash for now - could use crypto.createHash('sha256') for production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Compress and write data to file
   */
  private async compressAndWrite(data: string, filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const readable = Readable.from([data]);
    const gzip = createGzip();
    const writable = createWriteStream(filePath);

    await pipeline(readable, gzip, writable);
  }

  /**
   * Read and decompress data from file
   */
  private async decompressAndRead(filePath: string): Promise<string> {
    const chunks: Buffer[] = [];

    const readable = createReadStream(filePath);
    const gunzip = createGunzip();

    gunzip.on('data', (chunk) => chunks.push(chunk));

    await pipeline(readable, gunzip);

    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    universeCount: number;
    passageCount: number;
    playerCount: number;
    totalSnapshots: number;
    canonicalEvents: number;
  }> {
    await this.init();

    const universes = await this.listUniverses();
    const passages = await this.listPassages();

    const indexPath = path.join(DATA_DIR, 'players', 'index.json');
    let playerCount = 0;
    try {
      const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
      playerCount = index.players.length;
    } catch {
      // Ignore
    }

    let totalSnapshots = 0;
    let canonicalEvents = 0;

    for (const universe of universes) {
      totalSnapshots += universe.snapshotCount;
      canonicalEvents += universe.canonicalEventCount;
    }

    return {
      universeCount: universes.length,
      passageCount: passages.length,
      playerCount,
      totalSnapshots,
      canonicalEvents,
    };
  }
}

// Export singleton instance
export const multiverseStorage = new MultiverseStorage();
