# Water Physics & Fluid Dynamics Specification

> **Status:** Draft
> **Created:** 2026-01-12
> **Inspired By:** Dwarf Fortress fluid mechanics, RimWorld water systems
> **Performance Target:** 20 TPS with 10,000+ water tiles, 100+ agents

---

## Executive Summary

This spec defines a **Dwarf Fortress-style fluid dynamics system** for water in Multiverse: The End of Eternity. The system handles:

- **Static Water Bodies**: Lakes, rivers, oceans with proper depth
- **Dynamic Flow**: Water flows downhill through pressure-based simulation
- **Digging Interactions**: Water flows into newly dug holes/channels
- **Agent Interaction**: Drowning, swimming, shallow wading
- **Performance**: Batched updates via StateMutatorSystem, scheduled flow updates

**Key Design Principles:**
1. **Conservation of Matter**: Water never appears/disappears (except evaporation/rain)
2. **Pressure-Based Flow**: Water spreads based on depth and elevation differences
3. **Depth Levels**: 0-7 depth scale (Dwarf Fortress convention)
4. **Performance First**: Batch updates, spatial hashing, dirty flagging
5. **Emergent Gameplay**: Players can channel water, create moats, drain lakes

---

## Current State Analysis

### What Exists (as of 2026-01-12)

✅ **Terrain Generation** (`TerrainGenerator.ts`):
- Water tiles generated where elevation < -0.3
- Static water terrain type ('water')
- No depth information
- No flow mechanics

✅ **Tile Interface** (`Tile.ts`):
- `FluidLayer` interface already defined:
  ```typescript
  interface FluidLayer {
    type: FluidType;           // 'water' | 'magma' | 'blood' | 'oil' | 'acid'
    depth: number;             // 0-7 (Dwarf Fortress scale)
    pressure: number;          // 0-7 (affects flow)
    temperature: number;       // Affects freezing/boiling
    flowDirection?: { x: number; y: number };
    flowVelocity?: number;
    stagnant: boolean;
    lastUpdate: number;
  }
  ```
- Tiles have optional `fluid?: FluidLayer` field

✅ **Movement System** (`MovementSystem.ts:337-339`):
- Water tiles BLOCK movement (return `true` from `hasHardCollision`)
- No swimming mechanics
- No depth-based wading

✅ **Performance Infrastructure**:
- `StateMutatorSystem`: Batched delta updates (updates once per game minute)
- System priority ordering (fixed 20 TPS)
- Simulation scheduler for entity culling

### What's Missing

❌ **Fluid Dynamics**: No flow simulation
❌ **Depth System**: Water is binary (exists or doesn't), no depth levels
❌ **Digging Interaction**: Digging near water doesn't trigger flow
❌ **Swimming/Drowning**: Agents can't enter water at all
❌ **Water Placement**: Not enough water generated in terrain

---

## Design Overview

### Architecture Diagram

```
TerrainGenerator                    FluidDynamicsSystem
      ↓                                    ↓
  Generates water tiles           Simulates water flow
  with initial depth              (pressure-based)
      ↓                                    ↓
  Tile.fluid = {                   Updates Tile.fluid.depth
    type: 'water',                 Updates Tile.fluid.pressure
    depth: 4,                      Sets flowDirection
    pressure: 4,                        ↓
    stagnant: false                 Dirty flags tiles
  }                                      ↓
      ↓                            StateMutatorSystem
MovementSystem                     (batched depth updates)
      ↓                                    ↓
Checks fluid depth              AgentSwimmingSystem
  depth <= 2: wade through           ↓
  depth 3-4: slow swim        Check agent position
  depth 5-7: swim or drown     Apply swimming speed
      ↓                        Apply drowning damage
  Applies movement penalty          ↓
                               NeedsSystem (oxygen)
```

### System Priorities

```
Priority 3:   TimeSystem
Priority 5:   StateMutatorSystem (batched depth updates)
Priority 8:   FluidDynamicsSystem (water flow simulation)
Priority 15:  TerrainModificationSystem (digging triggers flow)
Priority 18:  AgentSwimmingSystem (swimming/drowning)
Priority 20:  MovementSystem (applies movement penalties)
```

---

## Phase 1: Depth System & Static Water

**Goal:** Upgrade existing water tiles to have depth information.

### 1.1 Terrain Generation Changes

**File:** `packages/world/src/terrain/TerrainGenerator.ts`

**Current Code (lines 707-712):**
```typescript
if (elevation < this.WATER_LEVEL) {
  return {
    terrain: 'water',
    biome: elevation < -0.5 ? 'ocean' : 'river',
  };
}
```

**New Code:**
```typescript
if (elevation < this.WATER_LEVEL) {
  // Calculate water depth based on how far below water level
  // Range: elevation -1.0 to -0.3 maps to depth 7 to 1
  const depthFactor = (this.WATER_LEVEL - elevation) / (1.0 + this.WATER_LEVEL);
  const waterDepth = Math.max(1, Math.min(7, Math.floor(depthFactor * 7) + 1));

  return {
    terrain: 'water',
    biome: elevation < -0.5 ? 'ocean' : 'river',
    fluid: {
      type: 'water',
      depth: waterDepth,
      pressure: waterDepth, // Initial pressure = depth
      temperature: 20, // 20°C default
      stagnant: true, // No flow initially
      lastUpdate: 0,
    }
  };
}
```

**Result:**
- Deep ocean: depth 7 (deepest)
- Shallow ocean: depth 4-6
- Rivers: depth 2-3
- Puddles/streams: depth 1

### 1.2 More Water Generation

**Current Issue:** Not enough water bodies generated.

**Solution:** Adjust noise thresholds and add river carving.

**Changes to `TerrainGenerator.ts`:**

1. **Lower water threshold** (more water):
   ```typescript
   // OLD: private readonly WATER_LEVEL = -0.3;
   // NEW:
   private readonly WATER_LEVEL = -0.25; // 17% more water tiles
   ```

2. **Add river carving** (new method):
   ```typescript
   private carveRivers(elevation: number, worldX: number, worldY: number): number {
     // Use moisture noise to create river channels
     const riverNoise = this.moistureNoise.octaveNoise(
       worldX * 0.0002,  // Large scale for long rivers
       worldY * 0.0002,
       3,
       0.6
     );

     // River exists where moisture noise is very close to 0 (narrow channels)
     const isRiver = Math.abs(riverNoise) < 0.05;

     if (isRiver) {
       // Carve river channel - lower elevation
       return Math.min(elevation, -0.35); // Ensures water (below -0.25 threshold)
     }

     return elevation;
   }
   ```

3. **Apply river carving in `generateTile`** (after line 448):
   ```typescript
   // Apply river carving before determining terrain
   elevation = this.carveRivers(elevation, worldX, worldY);
   ```

**Result:** More lakes, ponds, and long winding rivers across the map.

### 1.3 Movement System Changes

**File:** `packages/core/src/systems/MovementSystem.ts`

**Current Code (lines 334-340):**
```typescript
// Check for water terrain (blocks land-based movement)
if (typeof worldWithTerrain.getTerrainAt === 'function') {
  const terrain = worldWithTerrain.getTerrainAt(Math.floor(x), Math.floor(y));
  if (terrain === 'water' || terrain === 'deep_water') {
    return true; // Blocks completely
  }
}
```

**New Code:**
```typescript
// Check for water terrain - depth-based blocking
if (typeof worldWithTerrain.getTileAt === 'function') {
  const tile = worldWithTerrain.getTileAt(Math.floor(x), Math.floor(y));

  if (tile?.fluid && tile.fluid.type === 'water') {
    const depth = tile.fluid.depth;

    // Shallow water (depth 1-2): Wadeable, no blocking
    if (depth <= 2) {
      return false; // Allow movement (AgentSwimmingSystem will slow it)
    }

    // Medium water (depth 3-4): Swimmable, blocks non-swimmers
    if (depth <= 4) {
      // Check if agent can swim (future: swimming skill component)
      // For now, block movement (swimming system will handle)
      return true;
    }

    // Deep water (depth 5-7): Dangerous, blocks all
    return true;
  }
}
```

**Result:** Agents can wade through shallow water, blocked by deeper water.

### 1.4 Acceptance Criteria

- [ ] Water tiles have `fluid.depth` values 1-7
- [ ] Deep ocean tiles have depth 7
- [ ] Rivers have depth 2-3
- [ ] At least 15% of map is water (up from current ~8%)
- [ ] Rivers carve through terrain creating channels
- [ ] Agents can walk through depth 1-2 water
- [ ] Agents blocked by depth 3+ water
- [ ] `npm test` passes
- [ ] No performance regression (still 20 TPS)

---

## Phase 2: Basic Fluid Flow

**Goal:** Water flows downhill through pressure-based simulation.

### 2.1 FluidDynamicsSystem

**File:** `packages/core/src/systems/FluidDynamicsSystem.ts` (new)

```typescript
import type { System, World } from '@ai-village/core';
import type { Tile } from '@ai-village/world';

/**
 * FluidDynamicsSystem - Dwarf Fortress-style pressure-based water flow
 *
 * Algorithm:
 * 1. Find all "dirty" fluid tiles (changed this tick)
 * 2. Calculate pressure based on depth + elevation
 * 3. Flow to neighbors with lower pressure
 * 4. Update depths using delta system (batched)
 *
 * Performance:
 * - Updates once per 5 ticks (4 times per second) for responsive flow
 * - Only processes dirty tiles (those that changed recently)
 * - Uses StateMutatorSystem for batched depth updates
 * - Spatial hash for fast neighbor lookups
 */
export class FluidDynamicsSystem implements System {
  public readonly id = 'fluid_dynamics';
  public readonly priority = 8; // After StateMutator, before TerrainMod
  public readonly requiredComponents = [];

  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 5; // Every 5 ticks = 250ms (4 Hz)

  // Dirty flags: tiles that need flow simulation
  private dirtyTiles = new Set<string>(); // Set of "x,y" keys

  // Spatial hash for fast neighbor lookups
  private fluidTilesByChunk = new Map<string, Set<string>>(); // chunkKey -> Set of tileKeys

  update(world: World): void {
    const currentTick = world.tick;

    // Throttle to UPDATE_INTERVAL
    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Get tile accessor
    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number) => Tile | undefined;
      setTileAt?: (x: number, y: number, tile: Tile) => void;
    };

    if (!worldWithTiles.getTileAt || !worldWithTiles.setTileAt) {
      console.warn('[FluidDynamics] No tile accessor available');
      return;
    }

    // Process dirty tiles
    const processedThisTick = new Set<string>();

    for (const tileKey of this.dirtyTiles) {
      const [x, y] = tileKey.split(',').map(Number);
      const tile = worldWithTiles.getTileAt(x, y);

      if (!tile?.fluid || tile.fluid.depth === 0) {
        // No fluid or empty - remove from dirty set
        this.dirtyTiles.delete(tileKey);
        continue;
      }

      this.simulateFlowForTile(x, y, tile, worldWithTiles);
      processedThisTick.add(tileKey);
    }

    // Mark processed tiles as no longer dirty (unless updated again)
    for (const key of processedThisTick) {
      this.dirtyTiles.delete(key);
    }
  }

  /**
   * Simulate flow from a single tile to its neighbors
   */
  private simulateFlowForTile(
    x: number,
    y: number,
    tile: Tile,
    worldWithTiles: { getTileAt: (x: number, y: number) => Tile | undefined; setTileAt: (x: number, y: number, tile: Tile) => void }
  ): void {
    if (!tile.fluid) return;

    const sourceDepth = tile.fluid.depth;
    const sourceElevation = tile.elevation;
    const sourcePressure = sourceDepth + sourceElevation;

    // Find neighbors (4-directional: N, S, E, W)
    const neighbors = [
      { x: x + 1, y: y, dir: 'E' },
      { x: x - 1, y: y, dir: 'W' },
      { x: x, y: y + 1, dir: 'S' },
      { x: x, y: y - 1, dir: 'N' },
    ];

    // Calculate pressure differences
    const flowTargets: Array<{ x: number; y: number; pressureDiff: number }> = [];

    for (const neighbor of neighbors) {
      const targetTile = worldWithTiles.getTileAt(neighbor.x, neighbor.y);
      if (!targetTile) continue; // Out of bounds

      // Can't flow into walls
      if (targetTile.wall || targetTile.window) continue;

      const targetFluid = targetTile.fluid;
      const targetDepth = targetFluid?.depth ?? 0;
      const targetElevation = targetTile.elevation;
      const targetPressure = targetDepth + targetElevation;

      const pressureDiff = sourcePressure - targetPressure;

      // Only flow downward (positive pressure difference)
      if (pressureDiff > 0.5) { // Threshold to prevent tiny flows
        flowTargets.push({ x: neighbor.x, y: neighbor.y, pressureDiff });
      }
    }

    if (flowTargets.length === 0) {
      // No flow - mark as stagnant
      tile.fluid.stagnant = true;
      tile.fluid.flowDirection = undefined;
      tile.fluid.flowVelocity = 0;
      return;
    }

    // Distribute flow proportionally to pressure differences
    const totalPressureDiff = flowTargets.reduce((sum, t) => sum + t.pressureDiff, 0);

    // Calculate flow amount (depth to transfer)
    // Max flow per tick: 1 depth unit (prevents oscillation)
    const maxFlow = Math.min(1, sourceDepth);

    for (const target of flowTargets) {
      const flowFraction = target.pressureDiff / totalPressureDiff;
      const flowAmount = maxFlow * flowFraction;

      // Apply flow (update depths)
      this.transferFluid(x, y, target.x, target.y, flowAmount, worldWithTiles);

      // Mark both tiles as dirty for next update
      this.dirtyTiles.add(`${x},${y}`);
      this.dirtyTiles.add(`${target.x},${target.y}`);
    }

    // Update flow direction (for rendering)
    const avgFlowX = flowTargets.reduce((sum, t) => sum + (t.x - x), 0) / flowTargets.length;
    const avgFlowY = flowTargets.reduce((sum, t) => sum + (t.y - y), 0) / flowTargets.length;
    const length = Math.sqrt(avgFlowX * avgFlowX + avgFlowY * avgFlowY);

    tile.fluid.flowDirection = length > 0 ? { x: avgFlowX / length, y: avgFlowY / length } : undefined;
    tile.fluid.flowVelocity = maxFlow / flowTargets.length;
    tile.fluid.stagnant = false;
  }

  /**
   * Transfer fluid from source to target tile
   */
  private transferFluid(
    srcX: number,
    srcY: number,
    dstX: number,
    dstY: number,
    amount: number,
    worldWithTiles: { getTileAt: (x: number, y: number) => Tile | undefined; setTileAt: (x: number, y: number, tile: Tile) => void }
  ): void {
    const sourceTile = worldWithTiles.getTileAt(srcX, srcY);
    const targetTile = worldWithTiles.getTileAt(dstX, dstY);

    if (!sourceTile?.fluid || !targetTile) return;

    // Remove from source
    const newSourceDepth = Math.max(0, sourceTile.fluid.depth - amount);
    sourceTile.fluid.depth = newSourceDepth;
    sourceTile.fluid.pressure = newSourceDepth;

    // Add to target (create fluid if needed)
    if (!targetTile.fluid) {
      targetTile.fluid = {
        type: 'water',
        depth: 0,
        pressure: 0,
        temperature: sourceTile.fluid.temperature,
        stagnant: false,
        lastUpdate: 0,
      };
    }

    const newTargetDepth = Math.min(7, targetTile.fluid.depth + amount);
    targetTile.fluid.depth = newTargetDepth;
    targetTile.fluid.pressure = newTargetDepth;
    targetTile.fluid.lastUpdate = Date.now();

    // Update tiles
    worldWithTiles.setTileAt(srcX, srcY, sourceTile);
    worldWithTiles.setTileAt(dstX, dstY, targetTile);
  }

  /**
   * Mark a tile as dirty (needs flow simulation)
   * Call this when terrain is modified (digging, building)
   */
  markDirty(x: number, y: number): void {
    this.dirtyTiles.add(`${x},${y}`);

    // Also mark neighbors as dirty
    const neighbors = [
      { x: x + 1, y: y },
      { x: x - 1, y: y },
      { x: x, y: y + 1 },
      { x: x, y: y - 1 },
    ];

    for (const n of neighbors) {
      this.dirtyTiles.add(`${n.x},${n.y}`);
    }
  }

  /**
   * Initialize dirty flags for all existing water tiles on game load
   */
  initializeWaterTiles(world: World): void {
    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number) => Tile | undefined;
      getChunkManager?: () => { getLoadedChunks: () => Array<{ x: number; y: number; tiles: Tile[] }> };
    };

    const chunkManager = worldWithTiles.getChunkManager?.();
    if (!chunkManager) return;

    const chunks = chunkManager.getLoadedChunks();

    for (const chunk of chunks) {
      for (let localY = 0; localY < 16; localY++) {
        for (let localX = 0; localX < 16; localX++) {
          const worldX = chunk.x * 16 + localX;
          const worldY = chunk.y * 16 + localY;
          const tile = chunk.tiles[localY * 16 + localX];

          if (tile?.fluid && tile.fluid.depth > 0) {
            this.dirtyTiles.add(`${worldX},${worldY}`);
          }
        }
      }
    }
  }
}
```

### 2.2 Integration with Digging

**File:** `packages/core/src/systems/TerrainModificationSystem.ts` (new or existing)

When a player digs a tile next to water:

```typescript
// After digging completes
const fluidSystem = world.getSystem('fluid_dynamics') as FluidDynamicsSystem;
fluidSystem.markDirty(digX, digY); // Trigger flow simulation
```

### 2.3 Acceptance Criteria

- [ ] Water flows downhill from higher to lower elevation
- [ ] Water spreads evenly across flat surfaces
- [ ] Digging a hole next to a lake causes water to flow in
- [ ] Water stops flowing when equilibrium reached (all tiles at same pressure)
- [ ] Flow updates 4 times per second (responsive but performant)
- [ ] Dirty flagging prevents updating static water bodies
- [ ] 10,000+ water tiles maintain 20 TPS

---

## Phase 3: Agent Swimming & Drowning

**Goal:** Agents can wade through shallow water, swim in deep water, and drown if submerged too long.

### 3.1 AgentSwimmingSystem

**File:** `packages/core/src/systems/AgentSwimmingSystem.ts` (new)

```typescript
import type { System, World, Entity } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

/**
 * AgentSwimmingSystem - Handles swimming, wading, and drowning
 *
 * Depth-based mechanics:
 * - Depth 1-2: Wade (50% speed penalty, no oxygen loss)
 * - Depth 3-4: Swim (70% speed penalty, slow oxygen loss)
 * - Depth 5-7: Deep water (90% speed penalty, fast oxygen loss)
 *
 * Drowning:
 * - Oxygen decreases while submerged (depth >= 3)
 * - 0 oxygen: Agent starts taking damage
 * - Death after 2 game minutes submerged with 0 oxygen
 */
export class AgentSwimmingSystem implements System {
  public readonly id = 'agent_swimming';
  public readonly priority = 18; // Before MovementSystem (20)
  public readonly requiredComponents = [CT.Position, CT.Movement, CT.Needs];

  update(world: World, entities: ReadonlyArray<Entity>): void {
    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number) => Tile | undefined;
    };

    if (!worldWithTiles.getTileAt) return;

    for (const entity of entities) {
      const position = entity.getComponent(CT.Position);
      const movement = entity.getComponent(CT.Movement);
      const needs = entity.getComponent(CT.Needs);

      if (!position || !movement || !needs) continue;

      // Get tile at agent position
      const tile = worldWithTiles.getTileAt(Math.floor(position.x), Math.floor(position.y));

      if (!tile?.fluid || tile.fluid.type !== 'water') {
        // Not in water - restore normal speed, restore oxygen
        entity.updateComponent(CT.Movement, (current) => ({
          ...current,
          speedMultiplier: 1.0,
        }));

        // Restore oxygen when not in water
        if (needs.oxygen < 100) {
          entity.updateComponent(CT.Needs, (current) => ({
            ...current,
            oxygen: Math.min(100, current.oxygen + 5), // Fast recovery
          }));
        }

        continue;
      }

      const depth = tile.fluid.depth;

      // Apply movement penalties
      if (depth <= 2) {
        // Shallow wading
        entity.updateComponent(CT.Movement, (current) => ({
          ...current,
          speedMultiplier: 0.5, // 50% speed
        }));
      } else if (depth <= 4) {
        // Swimming
        entity.updateComponent(CT.Movement, (current) => ({
          ...current,
          speedMultiplier: 0.3, // 70% penalty
        }));

        // Slow oxygen loss
        entity.updateComponent(CT.Needs, (current) => ({
          ...current,
          oxygen: Math.max(0, current.oxygen - 0.2), // Slow drain
        }));
      } else {
        // Deep water
        entity.updateComponent(CT.Movement, (current) => ({
          ...current,
          speedMultiplier: 0.1, // 90% penalty
        }));

        // Fast oxygen loss
        entity.updateComponent(CT.Needs, (current) => ({
          ...current,
          oxygen: Math.max(0, current.oxygen - 0.5), // Fast drain
        }));
      }

      // Drowning damage
      if (needs.oxygen <= 0) {
        const health = entity.getComponent(CT.Health);
        if (health) {
          entity.updateComponent(CT.Health, (current) => ({
            ...current,
            hp: current.hp - 1, // 1 HP per tick = death in 2 minutes
          }));
        }
      }
    }
  }
}
```

### 3.2 Oxygen Component

**File:** `packages/core/src/components/NeedsComponent.ts`

Add `oxygen` field to NeedsComponent:

```typescript
export interface NeedsComponent {
  // ... existing fields
  oxygen: number; // 0-100 (100 = full breath, 0 = drowning)
}
```

### 3.3 Acceptance Criteria

- [ ] Agents move at 50% speed in depth 1-2 water
- [ ] Agents move at 30% speed in depth 3-4 water (swimming)
- [ ] Agents move at 10% speed in depth 5-7 water (deep)
- [ ] Oxygen decreases while in depth 3+ water
- [ ] Agents take 1 HP/tick damage when oxygen reaches 0
- [ ] Agents die after ~2 game minutes fully submerged
- [ ] Oxygen recovers quickly when out of water

---

## Phase 4: Advanced Features (Future)

### 4.1 Evaporation & Rain Cycle

**Goal:** Water evaporates from lakes, forms clouds, rains elsewhere.

**Components:**
- `EvaporationSystem`: Removes water depth from surface tiles based on temperature/humidity
- `CloudFormationSystem`: Creates cloud entities that drift
- `RainfallSystem`: Clouds release water as rain, adding depth to tiles

**Performance:** Evaporation uses StateMutatorSystem deltas (very slow rate: -0.001 depth/hour)

### 4.2 Freezing & Ice

**Goal:** Water freezes below 0°C, creating ice tiles.

**Changes:**
- `FluidDynamicsSystem`: Check temperature, convert depth 7 water to ice blocks
- Ice tiles block movement (solid terrain)
- Ice melts back to water above 0°C

### 4.3 Water Wells & Pumps

**Goal:** Players can build wells to extract water, pumps to move it.

**Components:**
- Well building: Draws water from aquifer (infinite source tile)
- Pump building: Transfers water uphill (uses power)
- Pipes: Transport water horizontally

### 4.4 Flooding Events

**Goal:** Heavy rain causes rivers to overflow.

**System:**
- `FloodSystem`: Monitors river depth, triggers overflow events
- Water spreads beyond riverbanks during floods
- Recedes after rain stops

### 4.5 Magma & Other Fluids

**Goal:** Extend fluid system to magma, blood, oil, acid.

**Changes:**
- `FluidDynamicsSystem` generalized to handle all `FluidType`
- Magma: flows slower, higher temperature, sets things on fire
- Blood: from combat, attracts predators
- Oil: flammable, spreads on water surface

---

## Performance Analysis

### Baseline Performance

**Current:**
- 100 agents, 4,000 tiles loaded, 20 TPS stable

**Target with Water:**
- 100 agents, 10,000 water tiles, 20 TPS stable

### Optimization Strategies

#### 1. Dirty Flagging
**Problem:** Updating every water tile every tick = 10,000 × 20 = 200,000 updates/sec

**Solution:** Only update tiles that changed (dirty flags)
- Static lakes: 0 updates/sec (marked clean after equilibrium)
- Flowing rivers: ~500 tiles dirty (edges of flow)
- Result: 500 × 4 (update rate) = 2,000 updates/sec (100× improvement)

#### 2. Throttled Updates
**Problem:** Water flow doesn't need 20 TPS (too fast, oscillates)

**Solution:** Update flow every 5 ticks (4 Hz)
- Humans perceive motion at ~10 Hz
- 4 Hz is responsive enough for water flow
- 5× reduction in compute

#### 3. Spatial Hashing
**Problem:** Finding neighbors for each tile = O(n²) for n tiles

**Solution:** Chunk-based spatial hash
- Group tiles by 16×16 chunks
- Only check neighbors within same chunk
- Result: O(1) neighbor lookup

#### 4. StateMutatorSystem Integration
**Problem:** Updating tile depth = touching ECS components (slow)

**Solution:** Batch updates via StateMutatorSystem
- Register depth deltas instead of immediate updates
- StateMutatorSystem applies in batch once per game minute
- 60× reduction in component updates

#### 5. Simulation Scheduler Integration
**Problem:** Water in unloaded chunks still simulated

**Solution:** Only simulate water in loaded chunks
- ChunkManager provides loaded chunk list
- FluidDynamicsSystem only processes loaded chunks
- Result: ~90% of water ignored (off-screen)

### Performance Budget

| System | Update Freq | Tiles Processed | Cost per Tile | Total Cost |
|--------|-------------|-----------------|---------------|------------|
| FluidDynamicsSystem | 4 Hz | 500 (dirty) | 0.05ms | 2.5ms |
| StateMutatorSystem | 1/min | 500 (dirty) | 0.01ms | 0.5ms |
| AgentSwimmingSystem | 20 Hz | 100 (agents) | 0.1ms | 10ms |
| **Total** | | | | **13ms/tick** |

**Budget:** 50ms/tick (20 TPS), **13ms used (26%)** ✅

---

## Testing Strategy

### Unit Tests

```typescript
// packages/core/src/systems/__tests__/FluidDynamics.test.ts

describe('FluidDynamicsSystem', () => {
  it('should flow from high to low elevation', () => {
    // Setup: tile A (elevation 5, depth 3), tile B (elevation 2, depth 0)
    // Expected: water flows from A to B
  });

  it('should equalize depth on flat surfaces', () => {
    // Setup: 4 flat tiles, one with depth 4, others depth 0
    // Expected: after 10 ticks, all tiles have depth 1
  });

  it('should stop flowing at equilibrium', () => {
    // Setup: lake with all tiles at same pressure
    // Expected: no flow, all tiles marked stagnant
  });

  it('should handle digging creating flow', () => {
    // Setup: dig tile next to depth 4 water
    // Expected: water flows into dug tile
  });

  it('should respect walls blocking flow', () => {
    // Setup: wall between two water tiles
    // Expected: no flow through wall
  });
});
```

### Integration Tests

```typescript
// packages/core/src/__tests__/WaterPhysicsIntegration.test.ts

describe('Water Physics Integration', () => {
  it('should maintain 20 TPS with 10,000 water tiles', () => {
    // Setup: generate 10,000 water tiles
    // Run: 100 ticks
    // Assert: average tick time < 50ms
  });

  it('should cause agent to drown in deep water', () => {
    // Setup: agent in depth 7 water
    // Run: 2 game minutes (2,400 ticks)
    // Assert: agent HP = 0 (dead from drowning)
  });

  it('should allow wading through shallow water', () => {
    // Setup: agent in depth 2 water, target across water
    // Run: pathfinding + movement
    // Assert: agent reaches target, moved through water
  });
});
```

---

## Migration Path

### Step 1: Add depth to existing water (non-breaking)
1. Update `TerrainGenerator.ts` to add `fluid` field
2. Existing saves without fluid: backward compatible (depth defaults to 0)
3. Run game, verify water tiles have depth

### Step 2: Implement flow system (opt-in)
1. Add `FluidDynamicsSystem` (disabled by default)
2. Add config flag: `ENABLE_WATER_FLOW` (default: false)
3. Test thoroughly in dev builds
4. Enable by default once stable

### Step 3: Update movement (requires testing)
1. Change `MovementSystem` water blocking logic
2. Add `AgentSwimmingSystem`
3. Test with existing agents (ensure no crashes)

### Step 4: Enable in production
1. Announce in changelog
2. Monitor performance metrics
3. Rollback flag if issues found

---

## Open Questions

1. **Infinite water sources?**
   - Should ocean tiles be infinite (always depth 7)?
   - Or finite (can be drained)?
   - **Recommendation:** Infinite for now (DF-style), finite later

2. **Water and plants?**
   - Should deep water destroy plants?
   - Should irrigation work via water channels?
   - **Recommendation:** Phase 5 feature

3. **Swimming skill?**
   - Should agents have a swimming skill that improves speed/oxygen?
   - **Recommendation:** Yes, add to skill tree

4. **Water temperature?**
   - Hot springs, cold mountain streams?
   - **Recommendation:** Use existing temperature system, affects freezing

5. **Water and buildings?**
   - Should water damage wooden buildings?
   - Flood basements?
   - **Recommendation:** Phase 6 feature

---

## Success Metrics

### Performance
- ✅ 20 TPS with 10,000+ water tiles
- ✅ < 5% CPU increase from water physics
- ✅ Memory usage < +50MB for fluid state

### Gameplay
- ✅ Players can channel water to create moats
- ✅ Digging a canal connects two lakes
- ✅ Agents drown if submerged 2+ minutes
- ✅ Rivers flow downhill visibly

### Emergent Behavior
- ✅ Players create irrigation systems
- ✅ Flooding becomes a hazard (overflow)
- ✅ Water becomes a resource (wells, pumps)
- ✅ Drowning creates interesting decisions (rescue vs abandon)

---

## References

### Dwarf Fortress Water Mechanics
- 0-7 depth scale
- Pressure-based flow (depth + elevation)
- Teleporting water bug (we avoid via batching)
- Infinite ocean tiles

### RimWorld Water
- Static water bodies (no flow)
- Bridges for crossing
- Swimming speed penalties
- Deep water = impassable

### Implementation Patterns
- **StateMutatorSystem**: Batched delta updates (hunger, damage over time)
- **SimulationScheduler**: Entity culling for performance
- **Dirty flagging**: Only update changed data (used in renderer, chunks)

---

## Appendix A: Code Locations

| Component | File Path | Lines |
|-----------|-----------|-------|
| Tile.FluidLayer | `packages/world/src/chunks/Tile.ts` | 190-207 |
| Water generation | `packages/world/src/terrain/TerrainGenerator.ts` | 707-712 |
| Water blocking | `packages/core/src/systems/MovementSystem.ts` | 334-340 |
| StateMutatorSystem | `packages/core/src/systems/StateMutatorSystem.ts` | Full file |
| Scheduler guide | `custom_game_engine/SCHEDULER_GUIDE.md` | Full file |

---

## Appendix B: FluidType Enum

```typescript
// packages/world/src/chunks/Tile.ts (already exists)
export type FluidType = 'water' | 'magma' | 'blood' | 'oil' | 'acid';
```

**Future fluid types:**
- `magma`: From volcanoes, damages entities, sets things on fire
- `blood`: From combat, attracts predators, decays over time
- `oil`: Flammable, floats on water, used for fuel
- `acid`: Damages terrain and entities, from chemical reactions

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-12 | 0.1 | Initial draft - depth system, flow mechanics, swimming |

---

**Next Steps:**
1. Review spec with team
2. Prototype Phase 1 (depth system)
3. Performance test with 10k tiles
4. Iterate based on feedback
