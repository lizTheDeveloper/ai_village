# Core Services

**Singleton services for cross-cutting concerns shared across agent and animal brain systems.**

Created during AI system decomposition (Phase 0) to eliminate code duplication and provide unified APIs for common operations.

## Key Services

### MovementAPI
**File**: `MovementAPI.ts`

Centralized movement control with automatic steering conflict resolution.

```typescript
import { moveToward, stopMovement, enableSteering } from './MovementAPI.js';

moveToward(entity, { x: 10, y: 20 });  // Auto-disables steering
stopMovement(entity);                  // Halts all movement
enableSteering(entity, 'seek', target); // Activate SteeringSystem
```

**Key features**: Prevents velocity/steering oscillation, handles both manual and steering-based movement.

### TargetingAPI
**File**: `TargetingAPI.ts`

Perception-limited targeting with vision and spatial memory integration.

```typescript
import { findNearestVisible, getRememberedLocation, findTarget } from './TargetingAPI.js';

// Find visible entities within vision range
const result = findNearestVisible(world, agent, hasComponent('harvestable'));

// Fallback to spatial memory if not visible
const target = findTarget(world, agent, {
  filter: isResourceType('wood'),
  memoryCategory: 'resource:wood'
});
```

**Provides**: Entity filters (`hasComponent`, `isResourceType`, `isEdiblePlant`, `combineFilters`), plant species registry, memory staleness checks.

### InteractionAPI
**File**: `InteractionAPI.ts`

Entity interactions with inventory and needs integration.

```typescript
import { harvest, eat, deposit, pickup } from './InteractionAPI.js';

const result = harvest(agent, resource, world, { amount: 10 });
if (result.success) {
  // Resource harvested into inventory
}

eat(agent, world);           // Consume food from inventory
deposit(agent, storage, world); // Transfer items to building
```

**Handles**: Resource harvesting, food consumption (inventory/storage/plant), item transfer, gathering stats tracking.

### PlacementScorer
**File**: `PlacementScorer.ts`

Multi-layer building placement scoring combining world, agent, and zone data.

```typescript
import { createPlacementScorer } from './PlacementScorer.js';

const scorer = createPlacementScorer(world);
const best = scorer.findBestPlacement(agent, 'storage-chest', searchRadius);
// Returns: { x, y, score } or null
```

**Layers**: Terrain constraints, resource proximity, path avoidance, agent familiarity, zone affinity, emotional memories.

### FengShuiAnalyzer
**File**: `FengShuiAnalyzer.ts`

Spatial harmony analysis for building layouts (ground level).

```typescript
import { fengShuiAnalyzer } from './FengShuiAnalyzer.js';

const harmony = fengShuiAnalyzer.analyzeBuildingLayout(layout, metadata);
// Returns: chi flow, element balance, proportions, commanding positions
```

**Used by**: Architecture skill tree, BuildingSpatialAnalysisSystem.

### AerialFengShuiAnalyzer
**File**: `AerialFengShuiAnalyzer.ts`

Spatial harmony analysis for aerial views (settlement layout, realm design).

```typescript
import { aerialFengShuiAnalyzer } from './AerialFengShuiAnalyzer.js';

const analysis = aerialFengShuiAnalyzer.analyzeAerialView(gridData, options);
```

**Analyzes**: Settlement clustering, path networks, resource distribution, natural boundaries.

## Access Patterns

**Function-based** (recommended for most uses):
```typescript
import { moveToward, findNearestVisible, harvest } from '@ai-village/core';
```

**Class-based** (when maintaining state across operations):
```typescript
import { MovementAPI, TargetingAPI, PlacementScorer } from '@ai-village/core';
const movement = new MovementAPI();
```

**Singleton instances** (FengShui analyzers):
```typescript
import { fengShuiAnalyzer, aerialFengShuiAnalyzer } from '@ai-village/core';
```

## Design Principles

1. **Perception-limited**: Targeting respects vision range and spatial memory
2. **No silent fallbacks**: Services throw on invalid operations
3. **Component isolation**: Services don't directly mutate components (use `safeUpdateComponent`)
4. **Shared logic**: Eliminates duplication between agent/animal brains
