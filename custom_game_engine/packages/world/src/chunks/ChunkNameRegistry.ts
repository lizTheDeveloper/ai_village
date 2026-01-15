/**
 * ChunkNameRegistry - Tracks human-readable names for chunks
 *
 * Allows agents to name frequently-visited chunks (e.g., "village center", "berry grove")
 * and navigate to them by name instead of coordinates.
 *
 * Examples:
 * - Agent visits chunk (10, 5) ten times → Talker names it "herb garden"
 * - Agent can then use go_to action: { type: "go_to", location: "herb garden" }
 */

export interface ChunkName {
  /** Human-readable name for this chunk */
  name: string;
  /** Who named this chunk (agent ID) */
  namedBy: string;
  /** When it was named (game tick) */
  namedAt: number;
  /** Description/context (optional) */
  description?: string;
}

/**
 * Registry for mapping chunk coordinates to human-readable names.
 * Stored at the world level so all agents can navigate to named places.
 */
export class ChunkNameRegistry {
  private names = new Map<string, ChunkName>();

  /**
   * Get the name of a chunk.
   * @param chunkX Chunk X coordinate
   * @param chunkY Chunk Y coordinate
   * @returns ChunkName if chunk is named, undefined otherwise
   */
  getName(chunkX: number, chunkY: number): ChunkName | undefined {
    const key = this.getKey(chunkX, chunkY);
    return this.names.get(key);
  }

  /**
   * Name a chunk.
   * @param chunkX Chunk X coordinate
   * @param chunkY Chunk Y coordinate
   * @param name Human-readable name
   * @param namedBy Agent ID who named it
   * @param namedAt Game tick when named
   * @param description Optional context/description
   */
  setName(
    chunkX: number,
    chunkY: number,
    name: string,
    namedBy: string,
    namedAt: number,
    description?: string
  ): void {
    const key = this.getKey(chunkX, chunkY);
    this.names.set(key, {
      name,
      namedBy,
      namedAt,
      description,
    });
  }

  /**
   * Find chunk coordinates by name.
   * @param name Name to search for (case-insensitive)
   * @returns { chunkX, chunkY } if found, undefined otherwise
   */
  findByName(name: string): { chunkX: number; chunkY: number } | undefined {
    const searchName = name.toLowerCase().trim();

    for (const [key, chunkName] of this.names.entries()) {
      if (chunkName.name.toLowerCase().trim() === searchName) {
        const [chunkX, chunkY] = this.parseKey(key);
        return { chunkX, chunkY };
      }
    }

    return undefined;
  }

  /**
   * Get all named chunks.
   * @returns Array of { chunkX, chunkY, name }
   */
  getAllNames(): Array<{ chunkX: number; chunkY: number; name: ChunkName }> {
    const result: Array<{ chunkX: number; chunkY: number; name: ChunkName }> = [];

    for (const [key, chunkName] of this.names.entries()) {
      const [chunkX, chunkY] = this.parseKey(key);
      result.push({ chunkX, chunkY, name: chunkName });
    }

    return result;
  }

  /**
   * Remove a chunk name.
   * @param chunkX Chunk X coordinate
   * @param chunkY Chunk Y coordinate
   * @returns true if name was removed, false if chunk wasn't named
   */
  removeName(chunkX: number, chunkY: number): boolean {
    const key = this.getKey(chunkX, chunkY);
    return this.names.delete(key);
  }

  /**
   * Check if a chunk is named.
   */
  isNamed(chunkX: number, chunkY: number): boolean {
    const key = this.getKey(chunkX, chunkY);
    return this.names.has(key);
  }

  /**
   * Serialize for save/load.
   */
  serialize(): Record<string, ChunkName> {
    return Object.fromEntries(this.names.entries());
  }

  /**
   * Deserialize from save.
   */
  deserialize(data: Record<string, ChunkName>): void {
    this.names.clear();
    for (const [key, chunkName] of Object.entries(data)) {
      this.names.set(key, chunkName);
    }
  }

  /**
   * Generate map key from chunk coordinates.
   */
  private getKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  /**
   * Parse chunk coordinates from map key.
   */
  private parseKey(key: string): [number, number] {
    const parts = key.split(',').map(Number);
    const x = parts[0];
    const y = parts[1];
    if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid chunk key: ${key}`);
    }
    return [x, y];
  }
}
