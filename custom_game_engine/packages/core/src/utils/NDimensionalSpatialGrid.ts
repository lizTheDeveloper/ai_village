/**
 * N-Dimensional Spatial Hash Grid
 *
 * Provides O(1) spatial queries for any number of dimensions (1-6).
 * Uses spatial hashing to efficiently find entities within a given distance
 * across multiple dimensions (position, temperature, humidity, etc.).
 *
 * @example
 * // 2D spatial grid for position
 * const grid2D = new NDimensionalSpatialGrid(2, 15);
 * grid2D.add('entity1', [10, 20]);
 * grid2D.query([10, 20], 30); // Find entities within distance 30
 *
 * @example
 * // 4D grid for position + environmental conditions
 * const grid4D = new NDimensionalSpatialGrid(4, 15);
 * grid4D.add('entity1', [x, y, temperature, humidity]);
 * grid4D.queryAsymmetric([x, y, temp, humid], [50, 50, 10, 20]);
 */
export class NDimensionalSpatialGrid {
  private readonly dimensions: number;
  private readonly cellSize: number;
  private readonly grid: Map<string, Set<string>>;
  private readonly entityPositions: Map<string, number[]>;

  /**
   * Create a new N-dimensional spatial grid.
   *
   * @param dimensions - Number of spatial dimensions (1-6)
   * @param cellSize - Size of each grid cell (default 15)
   * @throws Error if dimensions is not in range 1-6
   */
  constructor(dimensions: number, cellSize: number = 15) {
    if (dimensions < 1 || dimensions > 6) {
      throw new Error(`Dimensions must be 1-6, got ${dimensions}`);
    }
    if (cellSize <= 0) {
      throw new Error(`Cell size must be positive, got ${cellSize}`);
    }
    this.dimensions = dimensions;
    this.cellSize = cellSize;
    this.grid = new Map();
    this.entityPositions = new Map();
  }

  /**
   * Generate cell key from coordinates.
   * Uses Math.floor to handle negative coordinates correctly.
   *
   * @param coords - N-dimensional coordinates
   * @returns Cell key string (e.g., "1,2,3")
   */
  private getCellKey(coords: number[]): string {
    const indices: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      indices.push(Math.floor((coords[i] ?? 0) / this.cellSize));
    }
    return indices.join(',');
  }

  /**
   * Normalize coordinates array to exactly N dimensions.
   * Missing dimensions are filled with 0.
   *
   * @param coords - Input coordinates (may be shorter or longer than N)
   * @returns Normalized N-dimensional coordinate array
   */
  private normalizeCoords(coords: number[]): number[] {
    const normalized: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      normalized.push(coords[i] ?? 0);
    }
    return normalized;
  }

  /**
   * Get all neighboring cell keys within 1 cell of center.
   * Generates 3^N combinations of [-1, 0, 1] offsets.
   *
   * @param centerCoords - Center coordinates
   * @returns Array of cell keys for all 3^N neighboring cells
   */
  private getNeighborKeys(centerCoords: number[]): string[] {
    const centerIndices: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      centerIndices.push(Math.floor((centerCoords[i] ?? 0) / this.cellSize));
    }

    const keys: string[] = [];
    const offsets = [-1, 0, 1];

    // Generate all combinations of offsets for N dimensions
    const generateCombinations = (dim: number, current: number[]): void => {
      if (dim === this.dimensions) {
        keys.push(current.join(','));
        return;
      }

      for (const offset of offsets) {
        current[dim] = centerIndices[dim]! + offset;
        generateCombinations(dim + 1, current);
      }
    };

    generateCombinations(0, new Array(this.dimensions));
    return keys;
  }

  /**
   * Get cell keys for extended radius queries.
   * When query radius exceeds cell size, we need to check multiple cell rings.
   *
   * @param center - Center coordinates
   * @param cellRadius - Number of cells to check in each direction
   * @returns Array of cell keys to check
   */
  private getExtendedNeighborKeys(center: number[], cellRadius: number): string[] {
    const centerIndices: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      centerIndices.push(Math.floor((center[i] ?? 0) / this.cellSize));
    }

    const keys: string[] = [];
    const offsets: number[] = [];
    for (let i = -cellRadius; i <= cellRadius; i++) {
      offsets.push(i);
    }

    // Generate all combinations for extended radius
    const generateCombinations = (dim: number, current: number[]): void => {
      if (dim === this.dimensions) {
        keys.push(current.join(','));
        return;
      }

      for (const offset of offsets) {
        current[dim] = centerIndices[dim]! + offset;
        generateCombinations(dim + 1, current);
      }
    };

    generateCombinations(0, new Array(this.dimensions));
    return keys;
  }

  /**
   * Add an entity to the grid.
   *
   * @param entityId - Unique entity identifier
   * @param coords - N-dimensional coordinates
   * @throws Error if entity already exists
   */
  add(entityId: string, coords: number[]): void {
    if (this.entityPositions.has(entityId)) {
      throw new Error(`Entity ${entityId} already exists in grid`);
    }

    const normalized = this.normalizeCoords(coords);
    const cellKey = this.getCellKey(normalized);

    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, new Set());
    }

    this.grid.get(cellKey)!.add(entityId);
    this.entityPositions.set(entityId, normalized);
  }

  /**
   * Remove an entity from the grid.
   *
   * @param entityId - Entity to remove
   * @returns true if entity was removed, false if not found
   */
  remove(entityId: string): boolean {
    const coords = this.entityPositions.get(entityId);
    if (!coords) {
      return false;
    }

    const cellKey = this.getCellKey(coords);
    const cell = this.grid.get(cellKey);

    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.grid.delete(cellKey);
      }
    }

    this.entityPositions.delete(entityId);
    return true;
  }

  /**
   * Update an entity's position.
   * More efficient than remove + add when position changes.
   *
   * @param entityId - Entity to update
   * @param newCoords - New coordinates
   * @returns true if updated, false if entity not found
   */
  update(entityId: string, newCoords: number[]): boolean {
    const oldCoords = this.entityPositions.get(entityId);
    if (!oldCoords) {
      return false;
    }

    const normalized = this.normalizeCoords(newCoords);
    const oldKey = this.getCellKey(oldCoords);
    const newKey = this.getCellKey(normalized);

    // Only update grid if cell changed
    if (oldKey !== newKey) {
      // Remove from old cell
      const oldCell = this.grid.get(oldKey);
      if (oldCell) {
        oldCell.delete(entityId);
        if (oldCell.size === 0) {
          this.grid.delete(oldKey);
        }
      }

      // Add to new cell
      if (!this.grid.has(newKey)) {
        this.grid.set(newKey, new Set());
      }
      this.grid.get(newKey)!.add(entityId);
    }

    this.entityPositions.set(entityId, normalized);
    return true;
  }

  /**
   * Query entities within a spherical/hyperspherical radius.
   * Uses Euclidean distance across all dimensions.
   *
   * @param center - Center point coordinates
   * @param radius - Search radius
   * @returns Array of entity IDs within radius
   */
  query(center: number[], radius: number): string[] {
    const normalized = this.normalizeCoords(center);
    const radiusSquared = radius * radius;
    const cellRadius = Math.ceil(radius / this.cellSize);

    // Get all cells that could contain entities within radius
    const cellKeys = cellRadius <= 1
      ? this.getNeighborKeys(normalized)
      : this.getExtendedNeighborKeys(normalized, cellRadius);

    const results: string[] = [];

    for (const key of cellKeys) {
      const cell = this.grid.get(key);
      if (!cell) continue;

      for (const entityId of cell) {
        const entityCoords = this.entityPositions.get(entityId)!;

        // Calculate squared Euclidean distance
        let distSquared = 0;
        for (let i = 0; i < this.dimensions; i++) {
          const diff = normalized[i]! - entityCoords[i]!;
          distSquared += diff * diff;
        }

        if (distSquared <= radiusSquared) {
          results.push(entityId);
        }
      }
    }

    return results;
  }

  /**
   * Query entities within asymmetric ranges per dimension.
   * Useful for rectangular/box-shaped queries or different
   * sensitivities per dimension (e.g., position vs temperature).
   *
   * @param center - Center point coordinates
   * @param ranges - Range per dimension (half-width of box)
   * @returns Array of entity IDs within ranges
   *
   * @example
   * // Find entities within ±50 x/y but ±10 temperature
   * grid.queryAsymmetric([x, y, temp], [50, 50, 10]);
   */
  queryAsymmetric(center: number[], ranges: number[]): string[] {
    const normalized = this.normalizeCoords(center);
    const normalizedRanges = this.normalizeCoords(ranges);

    // Calculate cell radii per dimension
    const cellRadii = normalizedRanges.map(range => Math.ceil(range / this.cellSize));

    // Safety check: limit total cell count to prevent memory exhaustion
    // For large ranges, fall back to checking all entities
    const estimatedCells = cellRadii.reduce((acc, r) => acc * (2 * r + 1), 1);
    const MAX_CELLS = 10000; // Reasonable limit

    if (estimatedCells > MAX_CELLS) {
      // Fallback: check all entities (rare for reasonable queries)
      const results: string[] = [];
      for (const [entityId, entityCoords] of this.entityPositions) {
        let withinRange = true;
        for (let i = 0; i < this.dimensions; i++) {
          const diff = Math.abs(normalized[i]! - entityCoords[i]!);
          if (diff > normalizedRanges[i]!) {
            withinRange = false;
            break;
          }
        }
        if (withinRange) {
          results.push(entityId);
        }
      }
      return results;
    }

    // Generate cell keys for asymmetric box query
    const cellKeys = this.getAsymmetricCellKeys(normalized, cellRadii);

    const results: string[] = [];

    for (const key of cellKeys) {
      const cell = this.grid.get(key);
      if (!cell) continue;

      for (const entityId of cell) {
        const entityCoords = this.entityPositions.get(entityId)!;

        // Check if entity is within range in all dimensions
        let withinRange = true;
        for (let i = 0; i < this.dimensions; i++) {
          const diff = Math.abs(normalized[i]! - entityCoords[i]!);
          if (diff > normalizedRanges[i]!) {
            withinRange = false;
            break;
          }
        }

        if (withinRange) {
          results.push(entityId);
        }
      }
    }

    return results;
  }

  /**
   * Get cell keys for asymmetric box query.
   * Generates keys for a box with different radii per dimension.
   *
   * @param center - Center coordinates
   * @param cellRadii - Cell radius per dimension
   * @returns Array of cell keys
   */
  private getAsymmetricCellKeys(center: number[], cellRadii: number[]): string[] {
    const centerIndices: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      centerIndices.push(Math.floor((center[i] ?? 0) / this.cellSize));
    }

    const keys: string[] = [];

    // Generate offset ranges per dimension
    const offsetRanges = cellRadii.map(radius => {
      const offsets: number[] = [];
      for (let i = -radius; i <= radius; i++) {
        offsets.push(i);
      }
      return offsets;
    });

    // Generate all combinations
    const generateCombinations = (dim: number, current: number[]): void => {
      if (dim === this.dimensions) {
        keys.push(current.join(','));
        return;
      }

      for (const offset of offsetRanges[dim]!) {
        current[dim] = centerIndices[dim]! + offset;
        generateCombinations(dim + 1, current);
      }
    };

    generateCombinations(0, new Array(this.dimensions));
    return keys;
  }

  /**
   * Get the stored position of an entity.
   *
   * @param entityId - Entity to query
   * @returns Coordinates or undefined if not found
   */
  getPosition(entityId: string): number[] | undefined {
    return this.entityPositions.get(entityId);
  }

  /**
   * Clear all entities from the grid.
   */
  clear(): void {
    this.grid.clear();
    this.entityPositions.clear();
  }

  /**
   * Get grid statistics for debugging and monitoring.
   *
   * @returns Statistics object
   */
  getStats(): {
    entityCount: number;
    cellCount: number;
    dimensions: number;
    cellSize: number;
    avgEntitiesPerCell: number;
  } {
    const entityCount = this.entityPositions.size;
    const cellCount = this.grid.size;

    return {
      entityCount,
      cellCount,
      dimensions: this.dimensions,
      cellSize: this.cellSize,
      avgEntitiesPerCell: cellCount > 0 ? entityCount / cellCount : 0
    };
  }
}
