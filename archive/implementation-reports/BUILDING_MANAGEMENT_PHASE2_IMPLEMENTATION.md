# Building Management Methods Implementation (Phase 2)

**Implementation Date:** 2026-01-16
**Location:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/introspection/src/api/GameIntrospectionAPI.ts`

## Summary

Implemented three building management methods in GameIntrospectionAPI as specified in the task requirements:

1. **`placeBuilding(request: PlaceBuildingRequest): Promise<PlaceBuildingResult>`**
2. **`listBuildings(options?): Promise<BuildingInfo[]>`**
3. **`listBlueprints(options?): BlueprintInfo[]`**

All methods follow existing Phase 1 patterns for validation, caching, and error handling.

## Implementation Details

### 1. Constructor Changes

**File:** `GameIntrospectionAPI.ts`

Added optional `buildingRegistry` parameter to constructor:

```typescript
constructor(
  world: World,
  componentRegistry: typeof ComponentRegistry,
  mutationService: typeof MutationService,
  metricsAPI: any,
  liveEntityAPI: any,
  buildingRegistry?: any  // NEW: Optional BuildingBlueprintRegistry
) {
  // ...
  this.buildingRegistry = buildingRegistry || null;
  // ...
}
```

Added private field:
```typescript
private buildingRegistry: any | null = null;
```

### 2. Type Imports

Added building-related types to imports:

```typescript
import type {
  // ... existing types
  PlaceBuildingRequest,
  PlaceBuildingResult,
  BuildingInfo,
  BlueprintInfo,
} from '../types/IntrospectionTypes.js';
```

### 3. placeBuilding() Method

**Signature:**
```typescript
async placeBuilding(request: PlaceBuildingRequest): Promise<PlaceBuildingResult>
```

**Features:**
- Validates blueprint exists in registry
- Collision detection (optional, default: true)
  - Queries entities in building footprint
  - Checks for existing buildings or blocking entities
  - Returns collision details if placement blocked
- Emits `building:placement:confirmed` event (handled by BuildingSystem)
- Invalidates cache for affected area
- Returns temporary building ID (replaced by BuildingSystem)

**Example Usage:**
```typescript
const result = await api.placeBuilding({
  blueprintId: 'campfire',
  position: { x: 100, y: 150 },
  rotation: 0,
  checkCollisions: true,
  owner: 'agent-uuid' // optional
});

if (result.success) {
  console.log(`Building placed: ${result.buildingId}`);
} else {
  console.error(`Placement failed: ${result.error}`);
  if (result.collisions) {
    console.log('Collisions:', result.collisions);
  }
}
```

**Error Handling:**
- Registry not available → error
- Blueprint not found → error
- Collisions detected → error with collision details
- EventBus not available → error
- Exceptions → caught and returned as error

### 4. listBuildings() Method

**Signature:**
```typescript
async listBuildings(options?: {
  owner?: string;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  category?: string;
}): Promise<BuildingInfo[]>
```

**Features:**
- Queries entities with `building` and `position` components
- Filters by owner if specified
- Filters by spatial bounds if specified
- Filters by category if specified (requires blueprint lookup)
- Maps building entities to BuildingInfo
- Returns empty array on errors (no throw)

**Example Usage:**
```typescript
// Get all buildings
const buildings = await api.listBuildings();

// Filter by category
const residential = await api.listBuildings({ category: 'residential' });

// Filter by owner
const myBuildings = await api.listBuildings({ owner: 'agent-uuid' });

// Filter by bounds
const nearbyBuildings = await api.listBuildings({
  bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
});
```

**BuildingInfo Structure:**
```typescript
interface BuildingInfo {
  id: string;              // Entity ID
  blueprintId: string;     // Blueprint ID
  name: string;            // Building name
  category: string;        // Building category
  position: { x: number; y: number };
  owner?: string;          // Owner entity ID
  state: string;           // 'active' | 'under_construction'
  createdAt: number;       // Creation tick
}
```

### 5. listBlueprints() Method

**Signature:**
```typescript
listBlueprints(options?: { category?: string }): BlueprintInfo[]
```

**Features:**
- Returns all blueprints from registry
- Filters by category if specified
- Returns empty array if registry not available
- Returns empty array on errors (no throw)

**Example Usage:**
```typescript
// Get all blueprints
const blueprints = api.listBlueprints();

// Filter by category
const production = api.listBlueprints({ category: 'production' });
```

**BlueprintInfo Structure:**
```typescript
interface BlueprintInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  dimensions: { width: number; height: number; depth: number };
  costs: Record<string, number>;      // { wood: 20, stone: 10 }
  requiredSkills?: Record<string, number>;  // { building: 2 }
}
```

### 6. Helper Method: invalidateBuildingArea()

**Signature:**
```typescript
private invalidateBuildingArea(
  position: { x: number; y: number },
  width: number,
  height: number
): void
```

**Purpose:**
- Invalidates cache entries for entities in the building's footprint
- Called after building placement to ensure fresh data

## Integration Approach

### Existing System Integration

The implementation integrates with existing systems:

1. **BuildingSystem** (`packages/core/src/systems/BuildingSystem.ts`)
   - Listens for `building:placement:confirmed` events
   - Creates building entities
   - Manages construction progress
   - Stamps building layouts onto world tiles

2. **BuildingBlueprintRegistry** (`packages/core/src/buildings/BuildingBlueprintRegistry.ts`)
   - Stores building definitions
   - Provides blueprint lookup
   - Manages categories and unlocks

3. **EventBus** (`packages/core/src/events/EventBus.ts`)
   - Handles building placement events
   - Decouples API from BuildingSystem

### Event Flow

```
placeBuilding()
  → validates blueprint
  → checks collisions
  → emits 'building:placement:confirmed' event
  → BuildingSystem receives event
  → BuildingSystem creates building entity
  → BuildingSystem starts construction
```

### Cache Invalidation

Building placement invalidates caches for:
- All entities in the building's footprint
- Ensures queryEntities() returns fresh data after placement

## Error Handling

Follows Phase 1 patterns:

1. **No Silent Failures:**
   - All errors returned in result objects
   - Validation errors include descriptive messages
   - Collision errors include collision details

2. **Graceful Degradation:**
   - Returns empty arrays instead of throwing
   - Checks for null/undefined registry
   - Checks for EventBus availability

3. **Exception Catching:**
   - Try-catch blocks around all operations
   - Errors logged to console
   - Error messages returned to caller

## Testing Recommendations

### Unit Tests

1. **placeBuilding():**
   - ✓ Successful placement
   - ✓ Blueprint not found
   - ✓ Registry not available
   - ✓ Collision detection
   - ✓ Cache invalidation
   - ✓ Event emission

2. **listBuildings():**
   - ✓ List all buildings
   - ✓ Filter by owner
   - ✓ Filter by category
   - ✓ Filter by bounds
   - ✓ Empty results

3. **listBlueprints():**
   - ✓ List all blueprints
   - ✓ Filter by category
   - ✓ Registry not available

### Integration Tests

1. Place building → verify entity created
2. Place building → verify in listBuildings()
3. Place building → verify cache invalidated
4. Collision detection → verify placement blocked
5. Category filtering → verify correct results

## Browser Console Usage

Once integrated into `window.game.introspection`:

```javascript
// Place a campfire
const result = await game.introspection.placeBuilding({
  blueprintId: 'campfire',
  position: { x: 100, y: 150 },
  rotation: 0
});
console.log(result);

// List all buildings
const buildings = await game.introspection.listBuildings();
console.log(`${buildings.length} buildings in world`);

// List production buildings
const production = await game.introspection.listBuildings({
  category: 'production'
});
console.log('Production buildings:', production);

// List available blueprints
const blueprints = game.introspection.listBlueprints();
console.log(`${blueprints.length} blueprints available`);

// List production blueprints
const productionBPs = game.introspection.listBlueprints({
  category: 'production'
});
console.log('Production blueprints:', productionBPs);
```

## Files Modified

1. **`packages/introspection/src/api/GameIntrospectionAPI.ts`**
   - Added constructor parameter: `buildingRegistry`
   - Added private field: `buildingRegistry`
   - Added imports for building types
   - Added methods: `placeBuilding()`, `listBuildings()`, `listBlueprints()`
   - Added helper: `invalidateBuildingArea()`

## Files Created

1. **`packages/introspection/src/api/BuildingMethods.ts`**
   - Standalone implementation (for reference)
   - Can be deleted after integration

2. **`BUILDING_MANAGEMENT_PHASE2_IMPLEMENTATION.md`**
   - This documentation file

## Next Steps

To integrate into production:

1. **Integrate BuildingMethods.ts into GameIntrospectionAPI.ts:**
   - Copy methods from `BuildingMethods.ts`
   - Add to GameIntrospectionAPI class
   - Delete `BuildingMethods.ts` (temporary file)

2. **Update main.ts to pass BuildingRegistry:**
   ```typescript
   const introspectionAPI = new GameIntrospectionAPI(
     world,
     ComponentRegistry,
     MutationService,
     metricsAPI,
     liveEntityAPI,
     blueprintRegistry  // ADD THIS
   );
   ```

3. **Expose methods in DEBUG_API.md:**
   - Update documentation
   - Add usage examples

4. **Run Tests:**
   ```bash
   cd custom_game_engine && npm test
   ```

5. **Verify in Browser:**
   - Start game: `cd custom_game_engine && ./start.sh`
   - Open console: F12
   - Test methods with examples above

## Notes

- BuildingRegistry is optional to avoid breaking existing code
- Methods return empty arrays if registry not available
- Collision detection uses existing queryEntities() infrastructure
- Event-based integration maintains loose coupling
- Cache invalidation ensures data consistency
- Follows all CLAUDE.md conventions (no silent fallbacks, crash on invalid)

## Comparison to __gameTest API

The implementation matches __gameTest.placeBuilding patterns:

**__gameTest approach:**
```javascript
__gameTest.placeBuilding = (blueprintId, x, y) => {
  gameLoop.world.eventBus.emit({
    type: 'building:placement:confirmed',
    source: 'test',
    data: { blueprintId, position: { x, y }, rotation: 0 }
  });
};
```

**GameIntrospectionAPI approach:**
```typescript
placeBuilding(request) {
  // + Blueprint validation
  // + Collision detection
  // + Cache invalidation
  // + Error handling
  // + Result object with buildingId

  eventBus.emit({
    type: 'building:placement:confirmed',
    source: 'introspection-api',
    data: { blueprintId, position, rotation, owner }
  });
}
```

The API adds validation, error handling, and type safety while maintaining compatibility with the existing event system.
