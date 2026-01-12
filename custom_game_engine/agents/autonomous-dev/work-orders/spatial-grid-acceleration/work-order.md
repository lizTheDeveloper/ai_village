# Work Order: N-Dimensional Spatial Grid Acceleration

**Phase:** Performance (Optimization)
**Created:** 2026-01-11
**Updated:** 2026-01-11
**Status:** READY_FOR_IMPLEMENTATION
**Priority:** HIGH

---

## Problem Statement

The SimulationScheduler currently uses O(n) proximity checks to determine which entities are near agents. This must be generalized to support:

1. **N-Dimensional Spaces** - Universes can have 1-6 spatial dimensions
2. **Real Horizon Math** - Flying entities use actual planetary geometry for visibility range
3. **Underground Isolation** - Entities below surface (z<0) cannot see/interact with surface entities

**Current Limitations:**
- Hard-coded 2D (x, y) distance checks
- No z-coordinate consideration
- No support for higher dimensions
- No horizon calculation
- No layer isolation

---

## Proposed Solution

### N-Dimensional Spatial Hash Grid

A generalized spatial grid that works with any number of dimensions:

```typescript
/**
 * NDimensionalSpatialGrid - O(1) spatial queries for N-dimensional space
 *
 * Supports universes with 1-6 spatial dimensions.
 * Cell key is a hash of floor(coord[i] / cellSize) for each dimension.
 */
class NDimensionalSpatialGrid {
  private dimensions: number;                    // 1-6
  private cellSize: number;                      // Size per dimension
  private grid: Map<string, Set<string>>;        // cell key → entity IDs
  private entityPositions: Map<string, number[]>; // entity ID → coordinates

  constructor(dimensions: number, cellSize: number = 15);

  /** Generate cell key from N-dimensional coordinates */
  private getCellKey(coords: number[]): string {
    // Hash: "floor(x/size),floor(y/size),floor(z/size),..."
    return coords.map(c => Math.floor(c / this.cellSize)).join(',');
  }

  /** Add entity at N-dimensional position */
  add(entityId: string, coords: number[]): void;

  /** Remove entity from grid */
  remove(entityId: string): void;

  /** Update entity position */
  update(entityId: string, coords: number[]): void;

  /**
   * Query entities within radius of point
   * Returns entity IDs in 3^N neighboring cells, filtered by actual distance
   */
  query(center: number[], radius: number): string[];

  /**
   * Query with per-dimension ranges (e.g., different horizontal vs vertical range)
   * ranges[i] = max distance in dimension i
   */
  queryAsymmetric(center: number[], ranges: number[]): string[];

  /** Clear all entries */
  clear(): void;
}
```

### N-Dimensional Distance Calculation

```typescript
/**
 * Calculate squared Euclidean distance in N dimensions
 * Uses squared distance to avoid sqrt in hot path
 */
function distanceSquaredND(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return sum;
}

/**
 * Check if point is within asymmetric bounds (different range per dimension)
 * Useful for different horizontal vs vertical visibility
 */
function isWithinAsymmetricBounds(
  a: number[],
  b: number[],
  ranges: number[]
): boolean {
  for (let i = 0; i < a.length; i++) {
    const diff = Math.abs(a[i] - b[i]);
    if (diff > ranges[i]) return false;
  }
  return true;
}
```

---

## Visibility Rules

### 1. Horizon-Based Visibility for Flying Entities

Flying entities (z > 0) have extended horizontal visibility based on real planetary geometry.

**Math:** Distance to horizon from height h on planet with radius R:
```
horizonDistance = sqrt(2 * R * h + h²)
                ≈ sqrt(2 * R * h)  // for h << R
```

**Implementation:**
```typescript
interface WorldConfig {
  planetRadius: number;      // In tile units (e.g., 10000 for small planet)
  spatialDimensions: number; // 1-6
}

/**
 * Calculate horizon distance for observer at given height
 */
function calculateHorizonDistance(
  observerHeight: number,
  planetRadius: number
): number {
  if (observerHeight <= 0) return 0; // Underground/surface has no horizon bonus

  // Real formula: d = sqrt(2Rh + h²)
  // For performance, use squared where possible
  return Math.sqrt(2 * planetRadius * observerHeight + observerHeight * observerHeight);
}

/**
 * Get effective visibility range for entity
 */
function getEffectiveRange(
  baseRange: number,
  observerZ: number,
  worldConfig: WorldConfig
): number {
  if (observerZ <= 0) {
    return baseRange; // Ground/underground: normal range
  }

  const horizonBonus = calculateHorizonDistance(observerZ, worldConfig.planetRadius);
  return baseRange + horizonBonus;
}
```

**Example Values:**
| Observer Height | Planet Radius | Horizon Distance | Total Range (base 15) |
|-----------------|---------------|------------------|----------------------|
| 0 (ground)      | 10000         | 0                | 15 tiles             |
| 5 (flying)      | 10000         | ~316 tiles       | ~331 tiles           |
| 10 (high)       | 10000         | ~447 tiles       | ~462 tiles           |
| 100 (very high) | 10000         | ~1414 tiles      | ~1429 tiles          |

### 2. Underground Isolation

Entities below surface (z < 0) are isolated from surface entities (z >= 0).

**Rules:**
- Underground entities CANNOT see surface entities
- Surface entities CANNOT see underground entities
- Underground entities CAN see other underground entities (within range)
- This is a hard boundary, not a gradual falloff

**Implementation:**
```typescript
/**
 * Check if two entities can potentially see each other
 * based on surface/underground isolation
 */
function canPotentiallySee(
  observerZ: number,
  targetZ: number
): boolean {
  const observerUnderground = observerZ < 0;
  const targetUnderground = targetZ < 0;

  // Both must be on same side of z=0 boundary
  return observerUnderground === targetUnderground;
}

/**
 * Filter entities by underground isolation BEFORE distance checks
 * This is a fast pre-filter that eliminates many entities
 */
function filterByIsolationLayer(
  entities: Entity[],
  observerZ: number
): Entity[] {
  const observerUnderground = observerZ < 0;

  return entities.filter(entity => {
    const pos = entity.getComponent('position');
    if (!pos || pos.z === undefined) return true; // No z = assume same layer
    return (pos.z < 0) === observerUnderground;
  });
}
```

### 3. Combined Visibility Check

```typescript
/**
 * Full visibility check combining:
 * 1. Underground isolation
 * 2. Horizon-based range for flying entities
 * 3. N-dimensional distance
 */
function isVisible(
  observer: Entity,
  target: Entity,
  baseRange: number,
  worldConfig: WorldConfig
): boolean {
  const observerPos = observer.getComponent('position');
  const targetPos = target.getComponent('position');

  if (!observerPos || !targetPos) return false;

  // 1. Underground isolation check (fast, do first)
  const observerZ = observerPos.z ?? 0;
  const targetZ = targetPos.z ?? 0;

  if (!canPotentiallySee(observerZ, targetZ)) {
    return false;
  }

  // 2. Calculate effective range (horizon bonus for flying)
  const effectiveRange = getEffectiveRange(baseRange, observerZ, worldConfig);

  // 3. Build coordinate arrays based on universe dimensions
  const dims = worldConfig.spatialDimensions;
  const observerCoords = getCoordinates(observerPos, dims);
  const targetCoords = getCoordinates(targetPos, dims);

  // 4. N-dimensional distance check (squared to avoid sqrt)
  const distSq = distanceSquaredND(observerCoords, targetCoords);
  return distSq <= effectiveRange * effectiveRange;
}

/**
 * Extract N coordinates from position component
 * Dimensions: x, y, z, w, v, u (up to 6)
 */
function getCoordinates(pos: PositionComponent, dims: number): number[] {
  const coords: number[] = [pos.x, pos.y];
  if (dims >= 3) coords.push(pos.z ?? 0);
  if (dims >= 4) coords.push(pos.w ?? 0);
  if (dims >= 5) coords.push(pos.v ?? 0);
  if (dims >= 6) coords.push(pos.u ?? 0);
  return coords.slice(0, dims);
}
```

---

## Architecture

### World Configuration

```typescript
interface UniversePhysicsConfig {
  /** Number of spatial dimensions (1-6) */
  spatialDimensions: number;

  /** Planet radius in tile units (for horizon calculation) */
  planetRadius: number;

  /** Whether underground isolation is enabled */
  undergroundIsolation: boolean;

  /** Default visibility range per dimension */
  defaultVisibilityRange: number[];
}

// Example configurations:
const STANDARD_3D_WORLD: UniversePhysicsConfig = {
  spatialDimensions: 3,
  planetRadius: 10000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10] // x, y, z
};

const FLAT_2D_WORLD: UniversePhysicsConfig = {
  spatialDimensions: 2,
  planetRadius: Infinity, // No horizon on flat world
  undergroundIsolation: false,
  defaultVisibilityRange: [15, 15]
};

const HYPERDIMENSIONAL_6D_WORLD: UniversePhysicsConfig = {
  spatialDimensions: 6,
  planetRadius: 50000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10, 10, 10, 10] // x, y, z, w, v, u
};
```

### Position Component Extension

```typescript
interface PositionComponent extends Component {
  type: 'position';
  x: number;      // Dimension 1 (always required)
  y: number;      // Dimension 2 (always required)
  z?: number;     // Dimension 3 (height/depth)
  w?: number;     // Dimension 4
  v?: number;     // Dimension 5
  u?: number;     // Dimension 6

  // Chunk coordinates (2D for now, extend if needed)
  chunkX: number;
  chunkY: number;
}
```

---

## Implementation Steps

### Step 1: Create NDimensionalSpatialGrid Class
**File:** `packages/core/src/utils/NDimensionalSpatialGrid.ts` (NEW)

- [ ] Implement generic N-dimensional spatial hash grid
- [ ] Support 1-6 dimensions via constructor parameter
- [ ] Cell key generation for N dimensions
- [ ] `add()`, `remove()`, `update()` methods
- [ ] `query()` method: check 3^N neighboring cells
- [ ] `queryAsymmetric()` for per-dimension ranges
- [ ] Optimize for common cases (2D, 3D)
- [ ] Comprehensive unit tests

### Step 2: Create Visibility Utilities
**File:** `packages/core/src/utils/VisibilityUtils.ts` (NEW)

- [ ] `distanceSquaredND()` - N-dimensional squared distance
- [ ] `calculateHorizonDistance()` - Real horizon math
- [ ] `getEffectiveRange()` - Base range + horizon bonus
- [ ] `canPotentiallySee()` - Underground isolation check
- [ ] `isVisible()` - Combined visibility check
- [ ] `getCoordinates()` - Extract N coords from position

### Step 3: Add Universe Physics Configuration
**File:** `packages/core/src/config/UniversePhysicsConfig.ts` (NEW)

- [ ] Define `UniversePhysicsConfig` interface
- [ ] Default configurations for common cases
- [ ] Validation for spatial dimensions (1-6)
- [ ] Planet radius validation

### Step 4: Extend PositionComponent
**File:** `packages/core/src/components/PositionComponent.ts`

- [ ] Add optional `w`, `v`, `u` fields for dimensions 4-6
- [ ] Update serialization/deserialization
- [ ] Update component factory
- [ ] Add `getCoordinates(dims: number): number[]` helper

### Step 5: Integrate with SimulationScheduler
**File:** `packages/core/src/ecs/SimulationScheduler.ts`

- [ ] Add `spatialGrid: NDimensionalSpatialGrid` field
- [ ] Add `physicsConfig: UniversePhysicsConfig` field
- [ ] Update `updateAgentPositions()` to rebuild grid
- [ ] Replace `isInSimulationRange()` with new visibility logic
- [ ] Apply underground isolation filter FIRST (fast pre-filter)
- [ ] Apply horizon calculation for flying entities
- [ ] Feature flag: `USE_ND_SPATIAL_GRID = true`

### Step 6: Add Tests
**Files:**
- `packages/core/src/utils/__tests__/NDimensionalSpatialGrid.test.ts`
- `packages/core/src/utils/__tests__/VisibilityUtils.test.ts`
- `packages/core/src/ecs/__tests__/SimulationScheduler.visibility.test.ts`

- [ ] Grid tests: 2D, 3D, 6D scenarios
- [ ] Horizon math tests: verify against known values
- [ ] Underground isolation tests: strict boundary enforcement
- [ ] Integration tests: full visibility pipeline
- [ ] Performance benchmarks: 1k/5k/10k entities in various dimensions

### Step 7: Update Documentation
**Files:**
- `packages/core/src/ecs/SIMULATION_SCHEDULER.md`
- `custom_game_engine/PERFORMANCE.md`

- [ ] Document N-dimensional support
- [ ] Document horizon calculation formula
- [ ] Document underground isolation rules
- [ ] Add configuration examples

---

## Testing Requirements

### Unit Tests

**NDimensionalSpatialGrid:**
- [ ] 2D grid operations (add, remove, query)
- [ ] 3D grid operations
- [ ] 6D grid operations
- [ ] Negative coordinates
- [ ] Cell boundary edge cases
- [ ] Large query radii (multiple cells)
- [ ] Asymmetric queries

**VisibilityUtils:**
- [ ] `distanceSquaredND()` for 2D, 3D, 6D
- [ ] `calculateHorizonDistance()` matches known values:
  - Height 5, radius 10000 → ~316.2
  - Height 100, radius 10000 → ~1414.2
- [ ] Underground isolation: z=-1 cannot see z=0
- [ ] Flying bonus: z=10 gets ~447 tile bonus

### Integration Tests

- [ ] Flying entity sees further than ground entity
- [ ] Underground entity isolated from surface
- [ ] 2D universe works (no z processing)
- [ ] 6D universe works (all dimensions)
- [ ] Backward compatible with existing saves

### Performance Tests

- [ ] Compare N-D grid vs brute force
- [ ] Benchmark 2D vs 3D vs 6D overhead
- [ ] Profile underground filter speedup
- [ ] Memory usage for 6D grid

---

## Performance Metrics

### Horizon Calculation Impact

With flying entities, queries expand significantly:
- Ground entity (z=0): 15 tile range → ~700 entities in range
- Flying entity (z=10): ~460 tile range → potentially thousands

**Optimization:** Spatial grid handles this efficiently because we only check cells that could contain entities, not the entire expanded radius.

### Underground Isolation Impact

Pre-filtering by underground status eliminates ~50% of entities before distance checks (assuming roughly equal surface/underground population).

### Expected Performance

| Scenario | Dimensions | Entities | Agents | Time Target |
|----------|------------|----------|--------|-------------|
| Standard | 3D         | 10,000   | 100    | <1ms        |
| Large    | 3D         | 50,000   | 500    | <5ms        |
| Hyper    | 6D         | 10,000   | 100    | <2ms        |

---

## Edge Cases

### 1. Entities at Layer Boundary
- Entity at z=-0.001 is underground
- Entity at z=0 is surface
- Hard cutoff, no gradual transition

### 2. Very High Flying Entities
- Horizon distance can exceed world size
- Cap at world bounds or wrap around (configurable)

### 3. Dimension Mismatch
- If entity has fewer dimensions than universe config, default missing to 0
- If entity has more dimensions than config, ignore extra dimensions

### 4. Infinite Planet Radius
- For flat worlds, set `planetRadius = Infinity`
- Horizon calculation returns 0 (no bonus)
- Flying entities have same range as ground entities

### 5. Negative Heights
- Heights below z=0 are underground
- No horizon bonus (can't see further underground)
- Range is still base range within underground layer

---

## Success Definition

1. ✅ NDimensionalSpatialGrid supports 1-6 dimensions
2. ✅ Horizon calculation uses real planetary geometry
3. ✅ Underground entities cannot see surface entities
4. ✅ Flying entities get increased visibility range
5. ✅ Performance: <1ms for 10k entities, 100 agents, 3D
6. ✅ All existing tests pass (backward compatible)
7. ✅ New visibility tests comprehensive and passing
8. ✅ Documentation updated with formulas and examples

---

## References

### Horizon Math
- Distance to horizon: `d = sqrt(2Rh + h²)` where R = planet radius, h = observer height
- Derivation: Pythagorean theorem on planet cross-section
- Reference: https://en.wikipedia.org/wiki/Horizon#Distance_to_the_horizon

### Spatial Hashing
- Cell size should be >= largest common query radius
- 3^N cells checked per query (N = dimensions)
- Trade-off: smaller cells = fewer entities/cell but more cells to check

### Related Code
- `SimulationScheduler.ts` - Current 2D implementation
- `PositionComponent.ts` - Position storage
- `SIMULATION_SCHEDULER.md` - Current documentation

---

**End of Work Order**
