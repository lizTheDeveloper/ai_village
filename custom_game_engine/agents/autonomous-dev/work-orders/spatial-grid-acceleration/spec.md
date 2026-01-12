# Technical Specification: N-Dimensional Spatial Grid

**Version:** 2.0
**Updated:** 2026-01-11
**Status:** READY_FOR_IMPLEMENTATION

---

## Overview

This specification defines an N-dimensional spatial hash grid system that:
1. Supports universes with 1-6 spatial dimensions
2. Uses real planetary geometry for horizon-based visibility
3. Enforces underground/surface isolation
4. Provides O(1) spatial queries for entity proximity

---

## Core Components

### 1. NDimensionalSpatialGrid

```typescript
/**
 * N-Dimensional Spatial Hash Grid
 *
 * Provides O(1) spatial queries for any number of dimensions (1-6).
 * Uses spatial hashing with configurable cell size.
 *
 * Performance characteristics:
 * - Add: O(1)
 * - Remove: O(1)
 * - Update: O(1)
 * - Query: O(3^N * k) where N = dimensions, k = entities per cell
 *
 * For N=3, query checks 27 cells. For N=6, query checks 729 cells.
 * This is still much faster than O(n) brute force for large entity counts.
 */
export class NDimensionalSpatialGrid {
  private readonly dimensions: number;
  private readonly cellSize: number;
  private readonly grid: Map<string, Set<string>>;
  private readonly entityPositions: Map<string, number[]>;

  /**
   * Create a new N-dimensional spatial grid
   * @param dimensions Number of spatial dimensions (1-6)
   * @param cellSize Size of each cell (should be >= typical query radius)
   */
  constructor(dimensions: number, cellSize: number = 15) {
    if (dimensions < 1 || dimensions > 6) {
      throw new Error(`Dimensions must be 1-6, got ${dimensions}`);
    }
    this.dimensions = dimensions;
    this.cellSize = cellSize;
    this.grid = new Map();
    this.entityPositions = new Map();
  }

  /**
   * Generate cell key from N-dimensional coordinates
   * Handles negative coordinates correctly via Math.floor
   */
  private getCellKey(coords: number[]): string {
    const indices: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      indices.push(Math.floor((coords[i] ?? 0) / this.cellSize));
    }
    return indices.join(',');
  }

  /**
   * Get all neighboring cell keys (3^N cells)
   * For 3D: checks 27 cells around center
   * For 6D: checks 729 cells around center
   */
  private getNeighborKeys(centerCoords: number[]): string[] {
    const centerIndices: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      centerIndices.push(Math.floor((centerCoords[i] ?? 0) / this.cellSize));
    }

    const keys: string[] = [];
    const offsets = [-1, 0, 1];

    // Generate all combinations of offsets for N dimensions
    const generateCombinations = (depth: number, current: number[]): void => {
      if (depth === this.dimensions) {
        const key = current.map((idx, i) => centerIndices[i] + idx).join(',');
        keys.push(key);
        return;
      }
      for (const offset of offsets) {
        generateCombinations(depth + 1, [...current, offset]);
      }
    };

    generateCombinations(0, []);
    return keys;
  }

  /**
   * Add entity to grid at given coordinates
   */
  add(entityId: string, coords: number[]): void {
    const normalizedCoords = this.normalizeCoords(coords);
    const key = this.getCellKey(normalizedCoords);

    this.entityPositions.set(entityId, normalizedCoords);

    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(entityId);
  }

  /**
   * Remove entity from grid
   */
  remove(entityId: string): void {
    const coords = this.entityPositions.get(entityId);
    if (!coords) return;

    const key = this.getCellKey(coords);
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }

    this.entityPositions.delete(entityId);
  }

  /**
   * Update entity position (efficient remove + add)
   */
  update(entityId: string, newCoords: number[]): void {
    const normalizedCoords = this.normalizeCoords(newCoords);
    const oldCoords = this.entityPositions.get(entityId);

    if (oldCoords) {
      const oldKey = this.getCellKey(oldCoords);
      const newKey = this.getCellKey(normalizedCoords);

      if (oldKey !== newKey) {
        const oldCell = this.grid.get(oldKey);
        if (oldCell) {
          oldCell.delete(entityId);
          if (oldCell.size === 0) {
            this.grid.delete(oldKey);
          }
        }

        if (!this.grid.has(newKey)) {
          this.grid.set(newKey, new Set());
        }
        this.grid.get(newKey)!.add(entityId);
      }

      this.entityPositions.set(entityId, normalizedCoords);
    } else {
      this.add(entityId, normalizedCoords);
    }
  }

  /**
   * Query all entities within radius of center point
   * Returns entity IDs in neighboring cells (caller must do final distance check)
   */
  query(center: number[], radius: number): string[] {
    const normalizedCenter = this.normalizeCoords(center);
    const cellsToCheck = Math.ceil(radius / this.cellSize);

    if (cellsToCheck <= 1) {
      const keys = this.getNeighborKeys(normalizedCenter);
      const results: string[] = [];
      for (const key of keys) {
        const cell = this.grid.get(key);
        if (cell) {
          results.push(...cell);
        }
      }
      return results;
    } else {
      return this.queryExtended(normalizedCenter, cellsToCheck);
    }
  }

  /**
   * Query with per-dimension ranges (asymmetric query)
   */
  queryAsymmetric(center: number[], ranges: number[]): string[] {
    const normalizedCenter = this.normalizeCoords(center);
    const normalizedRanges = this.normalizeCoords(ranges);
    const maxCells = Math.max(...normalizedRanges.map(r => Math.ceil(r / this.cellSize)));

    const candidates = maxCells <= 1
      ? this.query(normalizedCenter, this.cellSize)
      : this.queryExtended(normalizedCenter, maxCells);

    return candidates.filter(entityId => {
      const pos = this.entityPositions.get(entityId);
      if (!pos) return false;

      for (let i = 0; i < this.dimensions; i++) {
        const diff = Math.abs((pos[i] ?? 0) - (normalizedCenter[i] ?? 0));
        if (diff > (normalizedRanges[i] ?? 0)) {
          return false;
        }
      }
      return true;
    });
  }

  private queryExtended(center: number[], cellRadius: number): string[] {
    const centerIndices: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      centerIndices.push(Math.floor((center[i] ?? 0) / this.cellSize));
    }

    const results: string[] = [];
    const range = Array.from({ length: cellRadius * 2 + 1 }, (_, i) => i - cellRadius);

    const generateCombinations = (depth: number, current: number[]): void => {
      if (depth === this.dimensions) {
        const key = current.map((offset, i) => centerIndices[i] + offset).join(',');
        const cell = this.grid.get(key);
        if (cell) {
          results.push(...cell);
        }
        return;
      }
      for (const offset of range) {
        generateCombinations(depth + 1, [...current, offset]);
      }
    };

    generateCombinations(0, []);
    return results;
  }

  getPosition(entityId: string): number[] | undefined {
    return this.entityPositions.get(entityId);
  }

  clear(): void {
    this.grid.clear();
    this.entityPositions.clear();
  }

  getStats(): {
    entityCount: number;
    cellCount: number;
    dimensions: number;
    cellSize: number;
    avgEntitiesPerCell: number;
  } {
    let totalEntities = 0;
    for (const cell of this.grid.values()) {
      totalEntities += cell.size;
    }

    return {
      entityCount: this.entityPositions.size,
      cellCount: this.grid.size,
      dimensions: this.dimensions,
      cellSize: this.cellSize,
      avgEntitiesPerCell: this.grid.size > 0 ? totalEntities / this.grid.size : 0,
    };
  }

  private normalizeCoords(coords: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      result.push(coords[i] ?? 0);
    }
    return result;
  }
}
```

---

### 2. Visibility Utilities

```typescript
// File: packages/core/src/utils/VisibilityUtils.ts

/**
 * Calculate squared Euclidean distance in N dimensions
 */
export function distanceSquaredND(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return sum;
}

/**
 * Calculate distance to horizon from given height on a sphere
 *
 * Formula: d = sqrt(2Rh + h^2)
 * Where R = planet radius, h = observer height
 *
 * Derivation: From observer at height h above surface,
 * draw line tangent to sphere. Using Pythagorean theorem:
 * (R+h)^2 = R^2 + d^2  =>  d = sqrt(2Rh + h^2)
 */
export function calculateHorizonDistance(
  observerHeight: number,
  planetRadius: number
): number {
  if (observerHeight <= 0) return 0;
  if (!Number.isFinite(planetRadius)) return 0;

  return Math.sqrt(2 * planetRadius * observerHeight + observerHeight * observerHeight);
}

/**
 * Get effective visibility range including horizon bonus
 */
export function getEffectiveRange(
  baseRange: number,
  observerZ: number,
  planetRadius: number
): number {
  if (observerZ <= 0) {
    return baseRange;
  }
  const horizonBonus = calculateHorizonDistance(observerZ, planetRadius);
  return baseRange + horizonBonus;
}

/**
 * Check underground/surface isolation
 * Rule: z < 0 cannot see z >= 0 (hard boundary)
 */
export function canPotentiallySee(
  observerZ: number,
  targetZ: number
): boolean {
  const observerUnderground = observerZ < 0;
  const targetUnderground = targetZ < 0;
  return observerUnderground === targetUnderground;
}

/**
 * Extract N-dimensional coordinates from position component
 */
export function getCoordinates(pos: PositionComponent, dimensions: number): number[] {
  const coords: number[] = [pos.x, pos.y];
  if (dimensions >= 3) coords.push(pos.z ?? 0);
  if (dimensions >= 4) coords.push(pos.w ?? 0);
  if (dimensions >= 5) coords.push(pos.v ?? 0);
  if (dimensions >= 6) coords.push(pos.u ?? 0);
  return coords.slice(0, dimensions);
}

/**
 * Full visibility check: isolation + horizon + N-D distance
 */
export function isVisible(
  observerPos: PositionComponent,
  targetPos: PositionComponent,
  baseRange: number,
  config: UniversePhysicsConfig
): boolean {
  const observerZ = observerPos.z ?? 0;
  const targetZ = targetPos.z ?? 0;

  // 1. Underground isolation (fast pre-check)
  if (config.undergroundIsolation && !canPotentiallySee(observerZ, targetZ)) {
    return false;
  }

  // 2. Effective range with horizon bonus
  const effectiveRange = getEffectiveRange(baseRange, observerZ, config.planetRadius);

  // 3. N-dimensional distance (squared)
  const dims = config.spatialDimensions;
  const observerCoords = getCoordinates(observerPos, dims);
  const targetCoords = getCoordinates(targetPos, dims);
  const distSq = distanceSquaredND(observerCoords, targetCoords);

  return distSq <= effectiveRange * effectiveRange;
}
```

---

### 3. Universe Physics Configuration

```typescript
export interface UniversePhysicsConfig {
  /** Number of spatial dimensions (1-6) */
  spatialDimensions: number;

  /** Planet radius in tile units (for horizon calculation) */
  planetRadius: number;

  /** Whether underground isolation is enabled */
  undergroundIsolation: boolean;

  /** Default visibility range per dimension */
  defaultVisibilityRange: number[];
}

// Preset configurations:

const STANDARD_3D_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 3,
  planetRadius: 10000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10],
};

const FLAT_2D_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 2,
  planetRadius: Infinity,
  undergroundIsolation: false,
  defaultVisibilityRange: [15, 15],
};

const HYPERDIMENSIONAL_6D_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 6,
  planetRadius: 50000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10, 10, 10, 10],
};
```

---

### 4. Extended Position Component

```typescript
export interface PositionComponent extends Component {
  type: 'position';
  x: number;      // Dimension 1 (required)
  y: number;      // Dimension 2 (required)
  z?: number;     // Dimension 3 (height/depth)
  w?: number;     // Dimension 4
  v?: number;     // Dimension 5
  u?: number;     // Dimension 6
  chunkX: number;
  chunkY: number;
}

const DefaultZLevel = {
  DeepUnderground: -15,
  Cave: -5,
  Basement: -1,
  Ground: 0,
  Canopy: 3,
  LowFlying: 5,
  HighFlying: 10,
  Atmosphere: 50,
};
```

---

## Horizon Math Reference

### Formula

```
d = sqrt(2Rh + h^2)
```

Where:
- `d` = distance to horizon
- `R` = planet radius
- `h` = observer height above surface

### Example Values

| Height (h) | Planet Radius (R) | Horizon Distance (d) |
|------------|-------------------|---------------------|
| 0          | 10000             | 0                   |
| 1          | 10000             | 141.4               |
| 5          | 10000             | 316.2               |
| 10         | 10000             | 447.2               |
| 50         | 10000             | 1000.0              |
| 100        | 10000             | 1414.2              |

---

## Performance Analysis

### Cell Count by Dimension

| Dimensions | Cells Checked (3^N) |
|------------|---------------------|
| 1D         | 3                   |
| 2D         | 9                   |
| 3D         | 27                  |
| 4D         | 81                  |
| 5D         | 243                 |
| 6D         | 729                 |

### Expected Query Times

| Dimensions | Cells | Entities/Cell | Time Est. |
|------------|-------|---------------|-----------|
| 2D         | 9     | 10            | ~0.01ms   |
| 3D         | 27    | 10            | ~0.03ms   |
| 6D         | 729   | 10            | ~0.7ms    |

---

## Key Test Cases

### Horizon Tests
```typescript
expect(calculateHorizonDistance(0, 10000)).toBe(0);
expect(calculateHorizonDistance(-5, 10000)).toBe(0);
expect(calculateHorizonDistance(5, 10000)).toBeCloseTo(316.2, 1);
expect(calculateHorizonDistance(10, Infinity)).toBe(0);
```

### Underground Isolation Tests
```typescript
expect(canPotentiallySee(0, 0)).toBe(true);   // surface-surface
expect(canPotentiallySee(-1, -5)).toBe(true); // underground-underground
expect(canPotentiallySee(0, -1)).toBe(false); // surface-underground
expect(canPotentiallySee(-1, 0)).toBe(false); // underground-surface
```

### N-Dimensional Grid Tests
```typescript
// 2D grid
const grid2d = new NDimensionalSpatialGrid(2, 10);
grid2d.add('a', [5, 5]);
expect(grid2d.query([0, 0], 15)).toContain('a');

// 6D grid
const grid6d = new NDimensionalSpatialGrid(6, 10);
grid6d.add('a', [5, 5, 5, 5, 5, 5]);
expect(grid6d.query([0, 0, 0, 0, 0, 0], 15)).toContain('a');
```

---

**End of Specification**
