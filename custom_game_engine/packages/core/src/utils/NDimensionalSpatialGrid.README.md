# NDimensionalSpatialGrid

**Efficient spatial hashing for 1-6 dimensional spaces.**

## Overview

`NDimensionalSpatialGrid` provides O(1) spatial queries across multiple dimensions using spatial hashing. It's designed for fast neighbor lookups in games and simulations where entities exist in multi-dimensional spaces.

## Key Features

- **1-6 Dimensions**: Support for any number of dimensions from 1 to 6
- **Fast Queries**: O(1) average case for spatial queries using grid cells
- **Asymmetric Queries**: Different search ranges per dimension
- **Negative Coordinates**: Correctly handles negative values
- **Efficient Updates**: Smart rehashing only when entities change cells
- **Memory Safe**: Automatic fallback for extremely large queries

## Common Use Cases

### 2D Position (Classic Spatial Hashing)
```typescript
const grid = new NDimensionalSpatialGrid(2, 15);
grid.add('entity1', [x, y]);
const nearby = grid.query([x, y], radius);
```

### 4D Environmental (Position + Conditions)
```typescript
// [x, y, temperature, humidity]
const grid = new NDimensionalSpatialGrid(4, 15);
grid.add('plant', [10, 20, 25, 60]);

// Find entities in similar environment
const similar = grid.query([10, 20, 25, 60], 5);
```

### 6D Social (Position + Personality)
```typescript
// [x, y, openness, conscientiousness, extraversion, agreeableness]
const grid = new NDimensionalSpatialGrid(6, 15);
grid.add('agent', [x, y, 80, 70, 60, 75]);

// Find compatible nearby agents
const compatible = grid.query([x, y, 80, 70, 60, 75], 15);
```

## API

### Constructor
```typescript
new NDimensionalSpatialGrid(dimensions: number, cellSize: number = 15)
```

### Core Methods

**add(entityId, coords)** - Add entity to grid
**remove(entityId)** - Remove entity from grid
**update(entityId, newCoords)** - Update entity position
**query(center, radius)** - Find entities within spherical/hyperspherical radius
**queryAsymmetric(center, ranges)** - Find entities with different ranges per dimension
**getPosition(entityId)** - Get stored coordinates
**clear()** - Remove all entities
**getStats()** - Get grid statistics

## Performance

**Add**: O(1) average
**Remove**: O(1) average
**Update**: O(1) average (no rehash if same cell)
**Query**: O(k) where k = entities in neighboring cells
**Space**: O(n) where n = number of entities

### Benchmarks (10,000 entities)
- Add 10,000 entities: ~5ms
- Query (radius 50): ~0.15ms
- Update 3,000 positions: ~1.3ms

## Cell Size Selection

The `cellSize` parameter controls the granularity of spatial hashing:

- **Too small**: More cells, slower queries (more cells to check)
- **Too large**: Fewer cells, slower queries (more entities per cell)
- **Optimal**: Cell size ≈ average query radius

**Default**: 15 (works well for most game scenarios)

## Safety Features

### Large Query Fallback
Asymmetric queries that would generate >10,000 cells automatically fall back to checking all entities. This prevents memory exhaustion while still returning correct results.

```typescript
// This will use fallback (safe, but slower)
grid.queryAsymmetric([0, 0], [1000, 1000]);
```

### Coordinate Normalization
Coordinates are automatically normalized to the grid's dimensions:
- Missing dimensions filled with 0
- Extra dimensions truncated

## Implementation Details

### Grid Structure
```
Map<string, Set<string>>  // Cell key → Entity IDs
Map<string, number[]>     // Entity ID → Coordinates
```

### Cell Key Format
```
"cellX,cellY,cellZ,..."
```
Example: Entity at [23, 47] with cellSize=15 → key "1,3"

### Neighbor Checking
- 1D: 3 cells (left, center, right)
- 2D: 9 cells (3×3 grid)
- 3D: 27 cells (3×3×3 cube)
- 6D: 729 cells (3^6 hypercube)

## Testing

```bash
npm test -- NDimensionalSpatialGrid
```

34 tests covering:
- All dimensions (1D-6D)
- Negative coordinates
- Large queries
- Edge cases
- Performance

## Examples

See `NDimensionalSpatialGrid.example.ts` for detailed usage examples including:
- 2D position grids
- 4D environmental grids
- 6D social networks
- Performance testing
- Dynamic movement

## When to Use

**Use NDimensionalSpatialGrid when:**
- You need fast spatial queries (O(1) vs O(n))
- Entities move frequently (efficient updates)
- You have multiple query dimensions (environment, personality, etc.)
- You have many entities (scales well to 10k+)

**Don't use when:**
- You have <100 entities (simple array iteration is faster)
- Entities never move (static data structures are better)
- You need exact distance sorting (use priority queue instead)

## Related Systems

- `SpatialMemoryComponent` - Uses 2D grid for agent memory
- `SocialSystem` - Could use 4D+ grid for personality-based queries
- `EnvironmentSystem` - Could use 4D grid for temperature/humidity
- `NavigationSystem` - Uses 2D grid for pathfinding

## License

Part of the Multiverse: The End of Eternity game engine.
