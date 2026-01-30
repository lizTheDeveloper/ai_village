/**
 * SpatialGrid - High-performance spatial hashing for proximity queries
 *
 * Tier 1 optimization for O(1) spatial lookups instead of O(n) entity iteration.
 * Used by systems that need to find nearby entities (AgentBrainSystem, PredatorAttackSystem, etc.)
 *
 * Performance characteristics:
 * - Insert/Remove/Update: O(1) amortized
 * - Radius query: O(cells_in_radius × entities_per_cell)
 * - Bounds query: O(cells_in_bounds × entities_per_cell)
 *
 * Implementation notes:
 * - Grid cells are fixed size (default 10 units)
 * - Uses Map<number, Set<string>> for cell storage (cell key → entity IDs)
 * - Uses Map<string, {x, y, cellKey}> for entity position tracking
 * - Zero allocations in hot paths (reuses arrays, numeric hash instead of string concat)
 * - Returns entity IDs only (caller fetches components as needed)
 */

export class SpatialGrid {
  private readonly cellSize: number;

  // Grid storage: cell key → entity IDs in that cell
  private readonly cells: Map<number, Set<string>> = new Map();

  // Entity tracking: entity ID → {x, y, cellKey}
  private readonly entities: Map<string, { x: number; y: number; cellKey: number }> = new Map();

  // Working arrays for queries (reused to avoid allocations)
  private readonly workingResults: string[] = [];

  constructor(cellSize: number = 10) {
    if (cellSize <= 0) {
      throw new Error('Cell size must be positive');
    }
    this.cellSize = cellSize;
  }

  /**
   * Insert an entity at the given position.
   * O(1) operation.
   */
  insert(entityId: string, x: number, y: number): void {
    // Remove if already exists (to handle re-insertion)
    if (this.entities.has(entityId)) {
      this.remove(entityId);
    }

    const cellKey = this.getCellKey(x, y);

    // Add to cell
    let cell = this.cells.get(cellKey);
    if (!cell) {
      cell = new Set();
      this.cells.set(cellKey, cell);
    }
    cell.add(entityId);

    // Track entity position
    this.entities.set(entityId, { x, y, cellKey });
  }

  /**
   * Remove an entity from the grid.
   * O(1) operation.
   */
  remove(entityId: string): void {
    const entityData = this.entities.get(entityId);
    if (!entityData) {
      return; // Entity not in grid
    }

    // Remove from cell
    const cell = this.cells.get(entityData.cellKey);
    if (cell) {
      cell.delete(entityId);
      // Clean up empty cells to avoid memory leaks
      if (cell.size === 0) {
        this.cells.delete(entityData.cellKey);
      }
    }

    // Remove entity tracking
    this.entities.delete(entityId);
  }

  /**
   * Update an entity's position.
   * More efficient than remove + insert when entity stays in same cell.
   * O(1) operation.
   */
  update(entityId: string, oldX: number, oldY: number, newX: number, newY: number): void {
    const oldCellKey = this.getCellKey(oldX, oldY);
    const newCellKey = this.getCellKey(newX, newY);

    // If cell didn't change, just update position
    if (oldCellKey === newCellKey) {
      const entityData = this.entities.get(entityId);
      if (entityData) {
        entityData.x = newX;
        entityData.y = newY;
      }
      return;
    }

    // Cell changed - remove from old cell and add to new cell
    const oldCell = this.cells.get(oldCellKey);
    if (oldCell) {
      oldCell.delete(entityId);
      if (oldCell.size === 0) {
        this.cells.delete(oldCellKey);
      }
    }

    let newCell = this.cells.get(newCellKey);
    if (!newCell) {
      newCell = new Set();
      this.cells.set(newCellKey, newCell);
    }
    newCell.add(entityId);

    // Update entity tracking
    const entityData = this.entities.get(entityId);
    if (entityData) {
      entityData.x = newX;
      entityData.y = newY;
      entityData.cellKey = newCellKey;
    }
  }

  /**
   * Query entities within radius of a point.
   * Returns entity IDs - caller must fetch Position components for exact distance check.
   *
   * Performance: O(cells_in_square × entities_per_cell)
   * For radius=15, cellSize=10: checks ~3×3=9 cells instead of 4000+ entities
   */
  getEntitiesNear(x: number, y: number, radius: number): string[] {
    // Clear working array (reuse to avoid allocations)
    this.workingResults.length = 0;

    // Calculate cell range to check
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCx = Math.floor(x / this.cellSize);
    const centerCy = Math.floor(y / this.cellSize);

    // Check all cells in square centered on query point
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const cx = centerCx + dx;
        const cy = centerCy + dy;
        const cellKey = (cx << 16) | (cy & 0xFFFF);

        const cell = this.cells.get(cellKey);
        if (!cell) continue;

        // Add all entities in this cell to results
        for (const entityId of cell) {
          this.workingResults.push(entityId);
        }
      }
    }

    // Return shallow copy to prevent caller from modifying working array
    return this.workingResults.slice();
  }

  /**
   * Query entities in rectangular bounds.
   * Returns entity IDs - caller must fetch Position components for exact bounds check.
   *
   * Performance: O(cells_in_bounds × entities_per_cell)
   */
  getEntitiesInBounds(minX: number, minY: number, maxX: number, maxY: number): string[] {
    // Clear working array (reuse to avoid allocations)
    this.workingResults.length = 0;

    // Calculate cell bounds
    const minCx = Math.floor(minX / this.cellSize);
    const minCy = Math.floor(minY / this.cellSize);
    const maxCx = Math.floor(maxX / this.cellSize);
    const maxCy = Math.floor(maxY / this.cellSize);

    // Check all cells in bounds
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cellKey = (cx << 16) | (cy & 0xFFFF);
        const cell = this.cells.get(cellKey);
        if (!cell) continue;

        // Add all entities in this cell to results
        for (const entityId of cell) {
          this.workingResults.push(entityId);
        }
      }
    }

    // Return shallow copy to prevent caller from modifying working array
    return this.workingResults.slice();
  }

  /**
   * Clear all entities from the grid.
   */
  clear(): void {
    this.cells.clear();
    this.entities.clear();
  }

  /**
   * Get total number of entities tracked.
   */
  size(): number {
    return this.entities.size;
  }

  /**
   * Get cell key for world coordinates.
   * Uses numeric hash: (cx << 16) | (cy & 0xFFFF)
   * Supports cell coordinates in range [-32768, 32767] (32K tiles in each direction).
   */
  private getCellKey(x: number, y: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return (cx << 16) | (cy & 0xFFFF);
  }
}
