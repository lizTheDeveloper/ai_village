/**
 * MultiverseClient - Client-side API wrapper for multiverse server
 *
 * Provides a typed interface for communicating with the multiverse server.
 * Used by SaveLoadService to sync snapshots to the server.
 */

import type { SaveFile, UniverseSnapshot } from './types.js';
import { compress } from './compression.js';

// Re-export server types for client use
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

export interface MultiverseStats {
  universeCount: number;
  passageCount: number;
  playerCount: number;
  totalSnapshots: number;
  canonicalEvents: number;
}

/**
 * MultiverseClient - HTTP client for multiverse API
 */
export class MultiverseClient {
  private baseUrl: string;
  private playerId: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the current player ID for ownership tracking
   */
  setPlayerId(playerId: string): void {
    this.playerId = playerId;
  }

  /**
   * Get the current player ID
   */
  getPlayerId(): string | null {
    return this.playerId;
  }

  // ============================================================
  // UNIVERSE OPERATIONS
  // ============================================================

  /**
   * Create a new universe on the server
   */
  async createUniverse(options: {
    name: string;
    isPublic?: boolean;
    config?: UniverseMetadata['config'];
    id?: string; // Optional: provide ID to keep client/server in sync
  }): Promise<UniverseMetadata> {
    if (!this.playerId) {
      throw new Error('Player ID not set. Call setPlayerId() first.');
    }

    const response = await fetch(`${this.baseUrl}/multiverse/universe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: options.id, // Pass client's ID if provided
        name: options.name,
        ownerId: this.playerId,
        isPublic: options.isPublic ?? false,
        config: options.config,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create universe: ${error.error}`);
    }

    const data = await response.json();
    return data.universe;
  }

  /**
   * Get universe metadata
   */
  async getUniverse(universeId: string): Promise<UniverseMetadata | null> {
    const response = await fetch(`${this.baseUrl}/multiverse/universe/${universeId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get universe: ${error.error}`);
    }

    const data = await response.json();
    return data.universe;
  }

  /**
   * List all universes (optionally filtered)
   */
  async listUniverses(options?: {
    publicOnly?: boolean;
    ownerId?: string;
  }): Promise<UniverseMetadata[]> {
    const params = new URLSearchParams();
    if (options?.publicOnly) params.set('publicOnly', 'true');
    if (options?.ownerId) params.set('ownerId', options.ownerId);

    const url = params.toString()
      ? `${this.baseUrl}/multiverse/universes?${params}`
      : `${this.baseUrl}/multiverse/universes`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list universes: ${error.error}`);
    }

    const data = await response.json();
    return data.universes;
  }

  /**
   * Delete a universe (marks as deleted)
   */
  async deleteUniverse(universeId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/multiverse/universe/${universeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete universe: ${error.error}`);
    }
  }

  // ============================================================
  // SNAPSHOT OPERATIONS
  // ============================================================

  /**
   * Upload a snapshot to the server
   * Uses compression to reduce network transfer size
   */
  async uploadSnapshot(
    universeId: string,
    saveFile: SaveFile,
    options?: {
      type?: 'auto' | 'manual' | 'canonical';
      canonEvent?: CanonEvent;
      compressed?: boolean; // Default true
    }
  ): Promise<SnapshotEntry> {
    // Extract universe snapshot
    const universeSnapshot = saveFile.universes[0];
    if (!universeSnapshot) {
      throw new Error('No universe snapshot in save file');
    }

    const tick = parseInt(universeSnapshot.time.universeTick, 10);
    const day = this.extractDay(universeSnapshot);

    const useCompression = options?.compressed !== false;

    let body: string;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (useCompression) {
      // Compress the snapshot data
      const jsonData = JSON.stringify(saveFile);
      const originalSize = jsonData.length;
      const compressedData = await compress(jsonData);
      const compressedSize = compressedData.length;

      body = JSON.stringify({
        compressedSnapshot: compressedData,
        tick,
        day,
        type: options?.type ?? 'manual',
        canonEvent: options?.canonEvent,
        decayPolicy: saveFile.header.decayPolicy,
      });
      headers['X-Snapshot-Compressed'] = 'gzip-base64';
    } else {
      body = JSON.stringify({
        snapshot: saveFile,
        tick,
        day,
        type: options?.type ?? 'manual',
        canonEvent: options?.canonEvent,
        decayPolicy: saveFile.header.decayPolicy,
      });
    }

    const response = await fetch(`${this.baseUrl}/multiverse/universe/${universeId}/snapshot`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      // Try to get error details, but handle empty/invalid responses
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const text = await response.text();
        if (text) {
          const error = JSON.parse(text);
          errorMessage = error.error || text;
        }
      } catch {
        // Response body wasn't valid JSON, use status text
      }
      throw new Error(`Failed to upload snapshot: ${errorMessage}`);
    }

    const data = await response.json();
    return data.entry;
  }

  /**
   * Download a snapshot from the server
   */
  async downloadSnapshot(universeId: string, tick: number): Promise<SaveFile | null> {
    const response = await fetch(`${this.baseUrl}/universe/${universeId}/snapshot/${tick}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to download snapshot: ${error.error}`);
    }

    const data = await response.json();
    return data.snapshot;
  }

  /**
   * Download the latest snapshot
   */
  async downloadLatestSnapshot(universeId: string): Promise<{
    snapshot: SaveFile;
    entry: SnapshotEntry;
  } | null> {
    const response = await fetch(`${this.baseUrl}/universe/${universeId}/snapshot/latest`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to download latest snapshot: ${error.error}`);
    }

    return await response.json();
  }

  /**
   * List all snapshots for a universe
   */
  async listSnapshots(universeId: string): Promise<SnapshotEntry[]> {
    const response = await fetch(`${this.baseUrl}/universe/${universeId}/snapshots`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list snapshots: ${error.error}`);
    }

    const data = await response.json();
    return data.snapshots;
  }

  /**
   * Get timeline with canonical events
   */
  async getTimeline(universeId: string, canonicalOnly?: boolean): Promise<TimelineIndex | SnapshotEntry[]> {
    const url = canonicalOnly
      ? `${this.baseUrl}/universe/${universeId}/timeline?canonicalOnly=true`
      : `${this.baseUrl}/universe/${universeId}/timeline`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get timeline: ${error.error}`);
    }

    const data = await response.json();
    return canonicalOnly ? data.canonicalEvents : data;
  }

  // ============================================================
  // FORK OPERATIONS
  // ============================================================

  /**
   * Fork a universe at a specific snapshot (time travel / branch creation)
   */
  async forkUniverse(
    sourceUniverseId: string,
    snapshotTick: number,
    name: string
  ): Promise<UniverseMetadata> {
    if (!this.playerId) {
      throw new Error('Player ID not set. Call setPlayerId() first.');
    }

    const response = await fetch(`${this.baseUrl}/universe/${sourceUniverseId}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshotTick,
        name,
        ownerId: this.playerId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fork universe: ${error.error}`);
    }

    const data = await response.json();
    return data.universe;
  }

  /**
   * List all forks of a universe
   */
  async listForks(universeId: string): Promise<UniverseMetadata[]> {
    const response = await fetch(`${this.baseUrl}/universe/${universeId}/forks`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list forks: ${error.error}`);
    }

    const data = await response.json();
    return data.forks;
  }

  // ============================================================
  // PASSAGE OPERATIONS
  // ============================================================

  /**
   * Create a passage between universes
   */
  async createPassage(
    sourceUniverseId: string,
    targetUniverseId: string,
    type: PassageConnection['type']
  ): Promise<PassageConnection> {
    if (!this.playerId) {
      throw new Error('Player ID not set. Call setPlayerId() first.');
    }

    const response = await fetch(`${this.baseUrl}/passage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceUniverseId,
        targetUniverseId,
        type,
        createdBy: this.playerId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create passage: ${error.error}`);
    }

    const data = await response.json();
    return data.passage;
  }

  /**
   * Get passage details
   */
  async getPassage(passageId: string): Promise<PassageConnection | null> {
    const response = await fetch(`${this.baseUrl}/passage/${passageId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get passage: ${error.error}`);
    }

    const data = await response.json();
    return data.passage;
  }

  /**
   * List all passages (optionally filtered by universe)
   */
  async listPassages(universeId?: string): Promise<PassageConnection[]> {
    const url = universeId
      ? `${this.baseUrl}/passages?universeId=${universeId}`
      : `${this.baseUrl}/passages`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list passages: ${error.error}`);
    }

    const data = await response.json();
    return data.passages;
  }

  /**
   * Delete a passage (marks inactive)
   */
  async deletePassage(passageId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/passage/${passageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete passage: ${error.error}`);
    }
  }

  // ============================================================
  // PLAYER OPERATIONS
  // ============================================================

  /**
   * Register or update a player
   */
  async registerPlayer(displayName?: string): Promise<PlayerProfile> {
    if (!this.playerId) {
      throw new Error('Player ID not set. Call setPlayerId() first.');
    }

    const response = await fetch(`${this.baseUrl}/player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: this.playerId,
        displayName: displayName ?? this.playerId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to register player: ${error.error}`);
    }

    const data = await response.json();
    return data.player;
  }

  /**
   * Get player profile
   */
  async getPlayer(playerId: string): Promise<PlayerProfile | null> {
    const response = await fetch(`${this.baseUrl}/player/${playerId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get player: ${error.error}`);
    }

    const data = await response.json();
    return data.player;
  }

  /**
   * Get player's universes
   */
  async getPlayerUniverses(playerId: string, includeMetadata?: boolean): Promise<string[] | UniverseMetadata[]> {
    const url = includeMetadata
      ? `${this.baseUrl}/player/${playerId}/universes?includeMetadata=true`
      : `${this.baseUrl}/player/${playerId}/universes`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get player universes: ${error.error}`);
    }

    const data = await response.json();
    return includeMetadata ? data.universes : data.universeIds;
  }

  // ============================================================
  // STATS
  // ============================================================

  /**
   * Get multiverse statistics
   */
  async getStats(): Promise<MultiverseStats> {
    const response = await fetch(`${this.baseUrl}/multiverse/stats`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get stats: ${error.error}`);
    }

    return await response.json();
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Check if server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/multiverse/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Extract day from universe snapshot
   */
  private extractDay(snapshot: UniverseSnapshot): number {
    // Look for Time entity
    for (const entity of snapshot.entities) {
      for (const component of entity.components) {
        if (component.type === 'time' && 'data' in component) {
          const data = component.data as Record<string, unknown>;
          if (typeof data.day === 'number') {
            return data.day;
          }
        }
      }
    }
    return 0;
  }
}

// Export singleton instance with default config
export const multiverseClient = new MultiverseClient();
