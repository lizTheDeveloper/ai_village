/**
 * PlanetClient - Client-side API wrapper for planet sharing server
 *
 * Provides a typed interface for communicating with the planet storage server.
 * Used by game clients to share terrain, biosphere, and named locations across
 * multiple save games and multiplayer sessions.
 *
 * Key features:
 * - Planet CRUD operations
 * - Chunk fetching/saving (terrain)
 * - Biosphere caching (skip 57s LLM regeneration)
 * - Named location registry (shared lore)
 * - WebSocket subscription for real-time chunk updates (multiplayer)
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type PlanetType = 'magical' | 'terrestrial' | 'crystal' | 'desert' | 'volcanic' | 'oceanic';

export interface PlanetMetadata {
  id: string;
  name: string;
  type: PlanetType;
  seed: string;
  createdAt: number;
  lastAccessedAt: number;
  /** Number of unique saves that have used this planet */
  saveCount: number;
  /** Total chunks generated */
  chunkCount: number;
  /** Whether biosphere has been generated */
  hasBiosphere: boolean;
  /** Planet configuration parameters */
  config: PlanetConfig;
}

export interface PlanetConfig {
  seed: string;
  type: string;
  /** Terrain generation parameters */
  terrain?: {
    baseElevation?: number;
    mountainFrequency?: number;
    waterLevel?: number;
    forestDensity?: number;
  };
  /** Climate parameters */
  climate?: {
    temperatureBase?: number;
    rainfallBase?: number;
    seasonStrength?: number;
  };
}

export interface BiosphereData {
  $schema?: string;
  $version?: number;
  /** Species definitions */
  species: Array<{
    id: string;
    name: string;
    type: 'plant' | 'animal' | 'fungus';
    traits: Record<string, unknown>;
    habitat: string[];
    diet?: string[];
  }>;
  /** Food web relationships */
  foodWeb: Array<{
    predator: string;
    prey: string;
    strength: number;
  }>;
  /** Ecological niches */
  niches?: Array<{
    id: string;
    name: string;
    conditions: Record<string, unknown>;
    species: string[];
  }>;
  /** Generation metadata */
  generatedAt: number;
  generationDurationMs?: number;
}

export interface NamedLocation {
  chunkX: number;
  chunkY: number;
  tileX?: number;
  tileY?: number;
  name: string;
  namedBy: string; // Player ID
  namedAt: number;
  description?: string;
  category?: 'landmark' | 'settlement' | 'resource' | 'danger' | 'mystery';
}

export interface SerializedChunk {
  x: number;
  y: number;
  /** RLE or delta compressed tile data */
  tiles: unknown;
  /** Compression method used */
  compression: 'rle' | 'delta' | 'full';
  /** Entity IDs in this chunk (for reference only) */
  entityIds?: string[];
  /** Last modification timestamp */
  modifiedAt: number;
  /** Who last modified this chunk */
  modifiedBy?: string;
  /** Checksum for integrity */
  checksum: string;
}

export interface ChunkListEntry {
  x: number;
  y: number;
  modifiedAt: number;
  fileSize: number;
}

export interface PlanetStats {
  planetCount: number;
  totalChunks: number;
  totalBiospheres: number;
  totalNamedLocations: number;
}

// ============================================================
// PLANET CLIENT CLASS
// ============================================================

/**
 * PlanetClient - HTTP client for planet sharing API
 */
export class PlanetClient {
  private baseUrl: string;
  private playerId: string | null = null;
  private wsConnection: WebSocket | null = null;
  private chunkUpdateCallbacks: Map<string, Set<(chunk: SerializedChunk) => void>> = new Map();

  constructor(baseUrl: string = 'http://localhost:8766') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the current player ID for tracking modifications
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
  // PLANET OPERATIONS
  // ============================================================

  /**
   * Create a new planet
   */
  async createPlanet(options: {
    name: string;
    type: PlanetType;
    seed: string;
    config?: Partial<PlanetConfig>;
    id?: string;
  }): Promise<PlanetMetadata> {
    const response = await fetch(`${this.baseUrl}/api/planet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: options.id,
        name: options.name,
        type: options.type,
        seed: options.seed,
        config: options.config || { seed: options.seed, type: options.type },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to create planet: ${error.error}`);
    }

    const data = await response.json();
    return data.planet;
  }

  /**
   * Get planet metadata
   */
  async getPlanet(planetId: string): Promise<PlanetMetadata | null> {
    const response = await fetch(`${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to get planet: ${error.error}`);
    }

    const data = await response.json();
    return data.planet;
  }

  /**
   * List all planets
   */
  async listPlanets(): Promise<PlanetMetadata[]> {
    const response = await fetch(`${this.baseUrl}/api/planets`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to list planets: ${error.error}`);
    }

    const data = await response.json();
    return data.planets ?? [];
  }

  /**
   * Delete a planet (marks as deleted)
   */
  async deletePlanet(planetId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to delete planet: ${error.error}`);
    }
  }

  /**
   * Record that this save is accessing the planet (increments saveCount)
   */
  async recordAccess(planetId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/access`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to record access: ${error.error}`);
    }
  }

  /**
   * Get planet statistics
   */
  async getStats(): Promise<PlanetStats> {
    const response = await fetch(`${this.baseUrl}/api/planets/stats`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to get stats: ${error.error}`);
    }

    const data = await response.json();
    return data.stats;
  }

  // ============================================================
  // BIOSPHERE OPERATIONS
  // ============================================================

  /**
   * Get biosphere data (if exists)
   */
  async getBiosphere(planetId: string): Promise<BiosphereData | null> {
    const response = await fetch(`${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/biosphere`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to get biosphere: ${error.error}`);
    }

    const data = await response.json();
    return data.biosphere;
  }

  /**
   * Save biosphere data (usually done once after generation)
   */
  async saveBiosphere(planetId: string, biosphere: BiosphereData): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/biosphere`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(biosphere),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to save biosphere: ${error.error}`);
    }
  }

  // ============================================================
  // CHUNK OPERATIONS
  // ============================================================

  /**
   * Get a specific chunk
   */
  async getChunk(planetId: string, x: number, y: number): Promise<SerializedChunk | null> {
    const response = await fetch(
      `${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/chunk/${x},${y}`
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to get chunk: ${error.error}`);
    }

    const data = await response.json();
    return data.chunk;
  }

  /**
   * Save/update a chunk
   */
  async saveChunk(planetId: string, chunk: SerializedChunk): Promise<void> {
    // Add player ID if available
    if (this.playerId && !chunk.modifiedBy) {
      chunk.modifiedBy = this.playerId;
    }

    const response = await fetch(
      `${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/chunk/${chunk.x},${chunk.y}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to save chunk: ${error.error}`);
    }

    // Notify local subscribers about the update
    this.notifyChunkUpdate(planetId, chunk);
  }

  /**
   * Batch get multiple chunks
   */
  async batchGetChunks(
    planetId: string,
    coords: Array<{ x: number; y: number }>
  ): Promise<Map<string, SerializedChunk>> {
    const response = await fetch(
      `${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/chunks/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coords }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to batch get chunks: ${error.error}`);
    }

    const data = await response.json();

    // Convert object back to Map
    const result = new Map<string, SerializedChunk>();
    for (const [key, chunk] of Object.entries(data.chunks)) {
      result.set(key, chunk as SerializedChunk);
    }

    return result;
  }

  /**
   * List all generated chunks for a planet
   */
  async listChunks(planetId: string): Promise<ChunkListEntry[]> {
    const response = await fetch(
      `${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/chunks`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to list chunks: ${error.error}`);
    }

    const data = await response.json();
    return data.chunks;
  }

  // ============================================================
  // NAMED LOCATION OPERATIONS
  // ============================================================

  /**
   * Get all named locations for a planet
   */
  async getNamedLocations(planetId: string): Promise<NamedLocation[]> {
    const response = await fetch(
      `${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/locations`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to get named locations: ${error.error}`);
    }

    const data = await response.json();
    return data.locations;
  }

  /**
   * Add a named location
   */
  async addNamedLocation(planetId: string, location: Omit<NamedLocation, 'namedAt'>): Promise<void> {
    if (!this.playerId) {
      throw new Error('Player ID not set. Call setPlayerId() first.');
    }

    const fullLocation: NamedLocation = {
      ...location,
      namedBy: location.namedBy || this.playerId,
      namedAt: Date.now(),
    };

    const response = await fetch(
      `${this.baseUrl}/api/planet/${encodeURIComponent(planetId)}/location`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullLocation),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to add named location: ${error.error}`);
    }
  }

  // ============================================================
  // REAL-TIME SYNC (WebSocket)
  // ============================================================

  /**
   * Subscribe to real-time chunk updates for a planet.
   * Returns an unsubscribe function.
   */
  subscribeToChunkUpdates(
    planetId: string,
    onChunkUpdate: (chunk: SerializedChunk) => void
  ): () => void {
    // Get or create callback set for this planet
    let callbacks = this.chunkUpdateCallbacks.get(planetId);
    if (!callbacks) {
      callbacks = new Set();
      this.chunkUpdateCallbacks.set(planetId, callbacks);
    }

    callbacks.add(onChunkUpdate);

    // Establish WebSocket connection and subscribe to planet
    this.connectWebSocket();
    this.subscribeToPlanetViaWs(planetId);

    // Return unsubscribe function
    return () => {
      callbacks?.delete(onChunkUpdate);
      if (callbacks?.size === 0) {
        this.chunkUpdateCallbacks.delete(planetId);
        this.unsubscribeFromPlanetViaWs(planetId);
      }
    };
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    // Already connected
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      return;
    }

    // Connecting in progress
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Convert http to ws protocol
    const wsUrl = this.baseUrl.replace(/^http/, 'ws');

    try {
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('[PlanetClient] WebSocket connected');
        // Re-subscribe to all planets we have callbacks for
        for (const planetId of this.chunkUpdateCallbacks.keys()) {
          this.subscribeToPlanetViaWs(planetId);
        }
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'planet_chunk_updated') {
            // Received chunk update from another client
            this.notifyChunkUpdate(message.planetId, message.chunk);
          } else if (message.type === 'planet_subscribed') {
            console.log(`[PlanetClient] Subscribed to planet ${message.planetId}`);
          } else if (message.type === 'planet_unsubscribed') {
            console.log(`[PlanetClient] Unsubscribed from planet ${message.planetId}`);
          }
        } catch (error) {
          console.error('[PlanetClient] Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('[PlanetClient] WebSocket disconnected');
        this.wsConnection = null;

        // Attempt to reconnect after 5 seconds if we still have subscribers
        if (this.chunkUpdateCallbacks.size > 0) {
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.warn('[PlanetClient] WebSocket error:', error);
      };
    } catch (error) {
      console.warn('[PlanetClient] Failed to connect WebSocket:', error);
    }
  }

  /**
   * Subscribe to a planet's updates via WebSocket
   */
  private subscribeToPlanetViaWs(planetId: string): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'planet_subscribe',
        planetId,
      }));
    }
  }

  /**
   * Unsubscribe from a planet's updates via WebSocket
   */
  private unsubscribeFromPlanetViaWs(planetId: string): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'planet_unsubscribe',
        planetId,
      }));
    }
  }

  /**
   * Send a chunk update to other subscribers via WebSocket
   */
  sendChunkUpdateViaWs(planetId: string, chunk: SerializedChunk): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'planet_chunk_update',
        planetId,
        chunk,
      }));
    }
  }

  /**
   * Notify local subscribers about a chunk update
   */
  private notifyChunkUpdate(planetId: string, chunk: SerializedChunk): void {
    const callbacks = this.chunkUpdateCallbacks.get(planetId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(chunk);
        } catch (error) {
          console.error('[PlanetClient] Error in chunk update callback:', error);
        }
      }
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Check if server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/api/planets/stats`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate planet ID from seed and type
   */
  static generatePlanetId(seed: string, type: PlanetType): string {
    // Simple hash of seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hashHex = Math.abs(hash).toString(16).slice(0, 8);

    return `planet:${type}:${hashHex}`;
  }

  /**
   * Disconnect WebSocket and cleanup
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.chunkUpdateCallbacks.clear();
  }
}

// Export singleton instance with default config
export const planetClient = new PlanetClient();
