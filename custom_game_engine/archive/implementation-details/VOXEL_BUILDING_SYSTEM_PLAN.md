# Tile-Based Voxel Building System - Implementation Plan

**Created:** 2025-12-30
**Status:** Planning Phase
**Author:** Claude Code (Plan Mode)

## Executive Summary

This plan redesigns the building system from monolithic entity-based buildings to **tile-based voxel construction** like RimWorld and Dwarf Fortress. Buildings will be composed of individual wall, floor, and door tiles, with room detection, per-room temperature simulation, and 1:1 physical resource mapping.

**NEW: Material transport and collaborative building** - Agents must physically fetch materials from storage and bring them to construction sites. Building becomes a social activity that creates relationships between agents working together.

### Goals
1. **Tile-based buildings**: Walls, floors, doors are individual tiles on the world grid
2. **Room detection**: Enclosed spaces detected via flood-fill algorithm
3. **Per-room temperature**: Each room simulates temperature based on wall materials
4. **Voxel resources**: 1:1 physical mapping (4-block tree = 4 wood items)
5. **Real navigation**: Agents navigate through doors and hallways
6. **Material properties**: Wall materials affect insulation, strength, aesthetics
7. **Material transport**: Agents fetch materials from storage and physically bring to construction site (THIS IS THE ACT OF BUILDING)
8. **XP on placement**: Agents earn experience when delivering materials and placing tiles
9. **Emergent collaborative building**: Multiple agents working independently = natural parallelization (2 agents = 2x throughput), improving relationships

### Non-Goals
- **NOT replacing crafting benches**: Workbenches, forges, etc. remain as special builder buildings (monolithic entities)
- **NOT 3D voxels**: This is a 2D tile system with voxel-style resource physics
- **NOT immediate migration**: Old buildings will coexist during transition

---

## Current Architecture Analysis

### 1. Tile System (`Tile.ts`)
**Location**: `packages/world/src/chunks/Tile.ts`

**Current Structure**:
```typescript
export interface Tile {
  terrain: TerrainType;
  floor?: string;  // ✓ Already supports custom floors!
  elevation: number;
  moisture: number;
  fertility: number;
  biome?: BiomeType;

  // Farming properties
  tilled: boolean;
  plantability: number;
  nutrients: { nitrogen, phosphorus, potassium };

  // Forward-compatibility
  fluid?: FluidLayer;
  mineable?: boolean;
  embeddedResource?: string;
}
```

**Strengths**:
- Already tile-based (32x32 chunks)
- Has `floor?: string` field ready to extend
- Forward-compatible with future systems
- Well-integrated with chunk management

**Limitations**:
- No wall/door/window support yet
- No material properties per-tile

---

### 2. Current Building System (`BuildingComponent.ts`, `BuildingSystem.ts`)

**Current Approach**: Buildings are monolithic entities
```typescript
interface BuildingComponent {
  buildingType: string;
  tier: number;
  progress: number;
  isComplete: boolean;
  blocksMovement: boolean;

  // Temperature (abstract, not per-wall)
  interior: boolean;
  interiorRadius: number;  // ← Problem: abstract radius!
  insulation: number;      // ← Problem: per-building, not per-wall!
  baseTemperature: number;
}
```

**Problems**:
1. `interiorRadius` is abstract - not real room geometry
2. `insulation` is per-building - should be per-wall-material
3. Buildings are point entities, not tile-based structures
4. Can't have hallways, multi-room buildings, or varying wall materials

---

### 3. Temperature System (`TemperatureSystem.ts:157-190`)

**Current Formula**:
```typescript
if (distance <= buildingComp.interiorRadius) {
  effectiveTemp = ambientTemp * (1 - insulation) + baseTemp;
}
```

**Problems**:
- Uses abstract `interiorRadius` instead of real room detection
- Single `insulation` value for entire building
- No consideration for wall materials
- Can't simulate multi-room buildings

**Desired**: Per-room temperature based on wall materials

---

### 4. Movement/Pathfinding (`MovementSystem.ts:262-327`)

**Current Collision Detection**:
```typescript
// Buildings block if distance < 0.5
const distance = Math.sqrt(
  Math.pow(building.x - x, 2) + Math.pow(building.y - y, 2)
);
if (distance < 0.5) {
  return true; // Hard collision
}
```

**Problems**:
- Buildings are point entities, not walls
- No concept of doors or navigable hallways
- Can't have 1-tile-wide corridors

**Desired**: Wall tiles block movement, doors are navigable

---

### 5. Resource System (`TreeEntity.ts:34`)

**Current Approach**: Arbitrary resource amounts
```typescript
createResourceComponent('wood', 100, 0.5); // 100 wood, 0.5/sec regen
```

**Problems**:
- Resource amount (100) is arbitrary, not physical
- A 4-unit-tall tree should give 4 wood blocks, not 100

**Desired**: `height * BLOCKS_PER_LEVEL` resources

---

## Design Decisions

### Decision 1: Extend Tile Interface (Option A) vs. Separate Structure Grid (Option B)

**Option A: Extend Tile Interface** ✅ RECOMMENDED
```typescript
export interface Tile {
  // Existing fields...
  terrain: TerrainType;
  floor?: string;

  // NEW: Building structure fields
  wall?: WallTile;
  door?: DoorTile;
  window?: WindowTile;
}
```

**Pros**:
- Minimal disruption to existing systems
- Backward compatible (optional fields)
- Easy to query: `getTileAt(x, y).wall?.materialId`
- How RimWorld/Dwarf Fortress actually do it
- Rendering is straightforward

**Cons**:
- Multiple optional fields on Tile
- Need to handle combinations (floor + wall, floor + door, etc.)

**Option B: Separate Structure Grid** ❌ REJECTED
```typescript
interface StructureGrid {
  tiles: Map<string, StructureTile>;
}
```

**Pros**:
- Cleaner separation of terrain vs. structures

**Cons**:
- Two grids to maintain
- More complex lookups (check both grids)
- Harder to ensure consistency
- NOT how RimWorld/Dwarf Fortress do it

**Verdict**: **Option A** - Extend Tile interface with optional wall/door/window fields

---

### Decision 2: Room Detection Algorithm

**Flood-fill algorithm** to detect enclosed spaces:

1. Find all floor tiles without a room assignment
2. Start flood-fill from each unassigned floor tile
3. Spread to adjacent floor tiles (not blocked by walls)
4. Stop when hitting a wall or door
5. Mark all reached tiles as part of this room
6. Calculate room properties from wall materials

**Alternative Considered**: Entity-based rooms
- Rejected: Too complex, doesn't match tile-based architecture

---

### Decision 3: Voxel Resource System

**1:1 Physical Mapping**: Trees/rocks have height, provide `height * BLOCKS_PER_LEVEL` items

```typescript
interface VoxelResourceComponent {
  resourceId: string;  // 'wood', 'stone', etc.
  blocksPerLevel: number;  // 4 blocks per height level
  currentHeight: number;  // Decreases as harvested
  maxHeight: number;  // Original height
}

// Example: 4-unit-tall tree
const tree = {
  voxelResource: {
    resourceId: 'wood',
    blocksPerLevel: 4,
    currentHeight: 4,
    maxHeight: 4
  }
};

// When harvested: removes 1 level, gives 4 wood items
```

---

### Decision 4: Blueprint System - String Layouts vs. Coordinate Arrays

**String-based layouts** ✅ RECOMMENDED (easier for designers)
```typescript
const smallHouse: TileBasedBlueprint = {
  id: 'small_house',
  layoutString: [
    "###D###",
    "#.....#",
    "#.....#",
    "#######"
  ],
  materialDefaults: {
    '#': 'wood_wall',
    '.': 'wood_floor',
    'D': 'wood_door'
  }
};
```

**Alternative**: Coordinate arrays (more verbose, harder to visualize)

---

## Detailed Design

### 1. Tile Structure Extension

**File**: `packages/world/src/chunks/Tile.ts`

```typescript
/**
 * Wall tile on a world tile.
 * Walls block movement and provide insulation.
 */
export interface WallTile {
  /** Material item ID (references MaterialTrait) */
  materialId: string;

  /** Current structural health (0-100) */
  health: number;

  /** Wall orientation for rendering */
  orientation: 'north' | 'south' | 'east' | 'west' | 'corner';

  /** Construction progress (0-100, 100 = complete) */
  progress: number;

  /** Builder entity ID (optional) */
  builderId?: string;

  /** When this wall was constructed (game tick) */
  constructedAt: number;
}

/**
 * Door tile on a world tile.
 * Doors are navigable and can be opened/closed.
 */
export interface DoorTile {
  /** Material item ID */
  materialId: string;

  /** Current health */
  health: number;

  /** Open/closed state */
  isOpen: boolean;

  /** Orientation */
  orientation: 'horizontal' | 'vertical';

  /** Construction progress */
  progress: number;

  /** Builder entity ID */
  builderId?: string;

  /** Constructed at */
  constructedAt: number;
}

/**
 * Window tile (future extensibility).
 */
export interface WindowTile {
  materialId: string;
  health: number;
  orientation: 'horizontal' | 'vertical';
  progress: number;
  builderId?: string;
  constructedAt: number;
}

/**
 * Extend Tile interface with building structures.
 */
export interface Tile {
  // ... existing fields ...

  /** Wall on this tile (if any) */
  wall?: WallTile;

  /** Door on this tile (if any) */
  door?: DoorTile;

  /** Window on this tile (if any) */
  window?: WindowTile;
}
```

**Key Design Points**:
- Optional fields - backward compatible
- `materialId` references `MaterialTrait` items (already created!)
- `progress` field supports incremental construction
- `health` field supports damage/decay
- `orientation` supports rendering

---

### 2. Room Detection System

**File**: `packages/core/src/rooms/RoomDetectionSystem.ts` (NEW)

```typescript
/**
 * Detected room in the world.
 * Rooms are enclosed spaces defined by walls/doors.
 */
export interface Room {
  /** Unique room ID */
  id: string;

  /** All floor tiles in this room */
  floorTiles: Position[];

  /** All walls enclosing this room */
  wallTiles: Position[];

  /** All doors connected to this room */
  doorTiles: Position[];

  /** Room dimensions */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };

  /** Floor area (number of floor tiles) */
  area: number;

  /** Volume for temperature simulation */
  volume: number;

  /** Is this room fully enclosed? */
  isEnclosed: boolean;

  /** Average insulation from wall materials */
  averageInsulation: number;

  /** Average temperature resistance from wall materials */
  averageTemperatureResistance: number;

  /** Current temperature (simulated per-room) */
  currentTemperature: number;

  /** Last recalculated tick */
  lastRecalculated: number;
}

/**
 * Room Detection System using flood-fill algorithm.
 * Runs every N ticks to detect room changes.
 */
export class RoomDetectionSystem implements System {
  public readonly id: SystemId = 'room_detection';
  public readonly priority: number = 2; // Early in frame
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private rooms: Map<string, Room> = new Map();
  private tileToRoom: Map<string, string> = new Map(); // "x,y" -> roomId
  private recalculateInterval = 60; // Recalculate every 3 seconds @ 20 TPS

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Only recalculate every N ticks
    if (world.tick % this.recalculateInterval !== 0) {
      return;
    }

    this.detectRooms(world);
  }

  /**
   * Detect all rooms in the world using flood-fill.
   */
  private detectRooms(world: World): void {
    this.rooms.clear();
    this.tileToRoom.clear();

    // Get all chunks
    const chunks = this.getAllChunks(world);
    const visited = new Set<string>();

    // Flood-fill from each unvisited floor tile
    for (const chunk of chunks) {
      for (let localY = 0; localY < CHUNK_SIZE; localY++) {
        for (let localX = 0; localX < CHUNK_SIZE; localX++) {
          const worldX = chunk.x * CHUNK_SIZE + localX;
          const worldY = chunk.y * CHUNK_SIZE + localY;
          const key = `${worldX},${worldY}`;

          if (visited.has(key)) continue;

          const tile = world.getTileAt(worldX, worldY);
          if (!tile || !this.isFloorTile(tile)) continue;

          // Start flood-fill from this floor tile
          const room = this.floodFillRoom(world, worldX, worldY, visited);
          if (room && room.area > 0) {
            this.rooms.set(room.id, room);

            // Map tiles to room
            for (const pos of room.floorTiles) {
              this.tileToRoom.set(`${pos.x},${pos.y}`, room.id);
            }
          }
        }
      }
    }
  }

  /**
   * Flood-fill from a starting floor tile to find all connected floor tiles.
   */
  private floodFillRoom(
    world: World,
    startX: number,
    startY: number,
    visited: Set<string>
  ): Room | null {
    const floorTiles: Position[] = [];
    const wallTiles: Position[] = [];
    const doorTiles: Position[] = [];
    const queue: Position[] = [{ x: startX, y: startY }];

    visited.add(`${startX},${startY}`);

    // Bounds tracking
    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    while (queue.length > 0) {
      const pos = queue.shift()!;
      floorTiles.push(pos);

      // Update bounds
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);

      // Check 4-directional neighbors
      const neighbors = [
        { x: pos.x + 1, y: pos.y },
        { x: pos.x - 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x, y: pos.y - 1 }
      ];

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (visited.has(key)) continue;

        const tile = world.getTileAt(neighbor.x, neighbor.y);
        if (!tile) continue;

        // Check for walls (stop spreading)
        if (tile.wall) {
          wallTiles.push(neighbor);
          visited.add(key);
          continue;
        }

        // Check for doors (note but continue spreading)
        if (tile.door) {
          doorTiles.push(neighbor);
          visited.add(key);
          // Don't continue spreading through doors
          continue;
        }

        // Continue spreading through floor tiles
        if (this.isFloorTile(tile)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    // Calculate room properties
    const area = floorTiles.length;
    const volume = area; // 1 unit height per tile
    const isEnclosed = this.checkFullyEnclosed(world, floorTiles, wallTiles, doorTiles);

    // Calculate average insulation from wall materials
    const { averageInsulation, averageTemperatureResistance } =
      this.calculateWallProperties(world, wallTiles);

    const room: Room = {
      id: `room_${world.tick}_${startX}_${startY}`,
      floorTiles,
      wallTiles,
      doorTiles,
      bounds: { minX, maxX, minY, maxY },
      area,
      volume,
      isEnclosed,
      averageInsulation,
      averageTemperatureResistance,
      currentTemperature: 20, // Default 20°C
      lastRecalculated: world.tick
    };

    return room;
  }

  /**
   * Check if a tile is a floor tile (has floor, no wall).
   */
  private isFloorTile(tile: Tile): boolean {
    return tile.floor !== undefined && !tile.wall && !tile.door;
  }

  /**
   * Check if a room is fully enclosed by walls/doors.
   */
  private checkFullyEnclosed(
    world: World,
    floorTiles: Position[],
    wallTiles: Position[],
    doorTiles: Position[]
  ): boolean {
    // A room is enclosed if all floor tiles are surrounded by walls/doors
    // This is a simplified check - could be more sophisticated

    for (const floor of floorTiles) {
      const neighbors = [
        { x: floor.x + 1, y: floor.y },
        { x: floor.x - 1, y: floor.y },
        { x: floor.x, y: floor.y + 1 },
        { x: floor.x, y: floor.y - 1 }
      ];

      for (const neighbor of neighbors) {
        const tile = world.getTileAt(neighbor.x, neighbor.y);
        if (!tile) return false; // Edge of world

        // Neighbor must be wall, door, or another floor in this room
        const hasWall = tile.wall !== undefined;
        const hasDoor = tile.door !== undefined;
        const isFloor = this.isFloorTile(tile);

        if (!hasWall && !hasDoor && !isFloor) {
          return false; // Open to exterior
        }
      }
    }

    return true;
  }

  /**
   * Calculate average insulation from wall materials.
   */
  private calculateWallProperties(
    world: World,
    wallTiles: Position[]
  ): { averageInsulation: number; averageTemperatureResistance: number } {
    if (wallTiles.length === 0) {
      return { averageInsulation: 0, averageTemperatureResistance: 0 };
    }

    let totalInsulation = 0;
    let totalTempResistance = 0;
    let count = 0;

    for (const pos of wallTiles) {
      const tile = world.getTileAt(pos.x, pos.y);
      if (!tile?.wall) continue;

      // Get material properties from MaterialTrait
      const material = this.getMaterialTrait(tile.wall.materialId);
      if (!material) continue;

      // Convert temperatureResistance (-100 to +100) to insulation (0 to 1)
      // Higher resistance = better insulation
      const insulation = (material.temperatureResistance + 100) / 200;
      totalInsulation += insulation;
      totalTempResistance += material.temperatureResistance;
      count++;
    }

    return {
      averageInsulation: count > 0 ? totalInsulation / count : 0,
      averageTemperatureResistance: count > 0 ? totalTempResistance / count : 0
    };
  }

  /**
   * Get material trait for a material ID.
   */
  private getMaterialTrait(materialId: string): MaterialTrait | null {
    // TODO: Integrate with ItemRegistry to get MaterialTrait
    // For now, return null (will be implemented)
    return null;
  }

  /**
   * Get all chunks (helper method).
   */
  private getAllChunks(world: World): IChunk[] {
    // TODO: Access ChunkManager to get all chunks
    return [];
  }

  /**
   * Get room at world position.
   */
  public getRoomAt(x: number, y: number): Room | undefined {
    const roomId = this.tileToRoom.get(`${x},${y}`);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Get all rooms.
   */
  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}
```

**Key Design Points**:
- Flood-fill algorithm to find connected floor tiles
- Stops at walls/doors
- Calculates insulation from wall materials
- Runs every N ticks (not every frame) for performance
- Provides `getRoomAt(x, y)` API for other systems

---

### 3. Voxel Resource System

**File**: `packages/core/src/components/VoxelResourceComponent.ts` (NEW)

```typescript
/**
 * Voxel Resource Component for physical 1:1 resource mapping.
 * Replaces ResourceComponent for natural resources (trees, rocks).
 */
export interface VoxelResourceComponent extends Component {
  type: 'voxel_resource';
  version: 1;

  /** Resource type (wood, stone, etc.) */
  resourceId: string;

  /** Number of resource blocks per height level */
  blocksPerLevel: number;

  /** Current height (decreases as harvested) */
  currentHeight: number;

  /** Maximum/original height */
  maxHeight: number;

  /** Regeneration rate (levels per second) */
  regenerationRate: number;

  /** Last harvest tick */
  lastHarvestTick: number;
}

/**
 * Create a voxel resource component.
 */
export function createVoxelResourceComponent(
  resourceId: string,
  height: number,
  blocksPerLevel: number = 4,
  regenerationRate: number = 0
): VoxelResourceComponent {
  return {
    type: 'voxel_resource',
    version: 1,
    resourceId,
    blocksPerLevel,
    currentHeight: height,
    maxHeight: height,
    regenerationRate,
    lastHarvestTick: 0
  };
}
```

**Updated TreeEntity.ts**:
```typescript
export function createTree(world: WorldMutator, x: number, y: number, z: number = 4): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position with height
  entity.addComponent(createPositionComponent(x, y, z));

  // Physics (trees are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable - height affects sprite
  entity.addComponent(createRenderableComponent(`tree_${z}`, 'object'));

  // Tags
  entity.addComponent(createTagsComponent('tree', 'obstacle', 'harvestable'));

  // VOXEL Resource - 1:1 physical mapping
  // z=4 tree provides 4 levels * 4 blocks/level = 16 wood blocks
  entity.addComponent(createVoxelResourceComponent('wood', z, 4, 0.1));

  // ... rest of components ...

  return entity.id;
}
```

**Harvesting Logic** (GatherBehavior update):
```typescript
// When harvesting a voxel resource:
const voxelResource = entity.getComponent<VoxelResourceComponent>('voxel_resource');
if (voxelResource && voxelResource.currentHeight > 0) {
  // Harvest 1 level, get blocksPerLevel items
  const itemsGained = voxelResource.blocksPerLevel;

  // Update resource
  entity.updateComponent<VoxelResourceComponent>('voxel_resource', (comp) => ({
    ...comp,
    currentHeight: comp.currentHeight - 1,
    lastHarvestTick: world.tick
  }));

  // Give items to agent
  addItemToInventory(agent, voxelResource.resourceId, itemsGained);

  // If height reaches 0, mark as depleted or remove entity
  if (voxelResource.currentHeight === 0) {
    // Option 1: Remove entity
    world.deleteEntity(entity.id);

    // Option 2: Mark as stump (can regrow)
    entity.addComponent(createTagsComponent('stump', 'depleted'));
  }
}
```

**Key Design Points**:
- 1:1 physical mapping: `height * blocksPerLevel` = total blocks
- Harvesting removes 1 level at a time
- Visual representation changes with height (via RenderableComponent)
- Supports regeneration

#### Tree Felling Mechanics

**Problem**: When you harvest the bottom of a tree, the top should fall down (like real tree felling).

**Solution**: Track tree segments and detect when bottom is removed

```typescript
/**
 * Tree Felling System - handles physics of trees falling when base is removed.
 */
export class TreeFellingSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Check all trees for instability
    for (const entity of entities) {
      const tags = entity.getComponent<TagsComponent>('tags');
      if (!tags || !tags.tags.includes('tree')) continue;

      const voxelResource = entity.getComponent<VoxelResourceComponent>('voxel_resource');
      const position = entity.getComponent<PositionComponent>('position');

      if (!voxelResource || !position) continue;

      // Check if tree has been cut at ground level
      const groundLevel = 0; // Z=0 is ground
      const currentHeight = voxelResource.currentHeight;
      const wasHeight = voxelResource.maxHeight;

      // If tree was harvested and now has height < 1 (cut at base)
      if (currentHeight < 1 && wasHeight > 1) {
        // Tree falls! Drop all remaining wood
        const remainingWood = Math.floor(currentHeight * voxelResource.blocksPerLevel);

        if (remainingWood > 0) {
          // Drop wood items at tree position
          this.dropItems(world, position, voxelResource.resourceId, remainingWood);
        }

        // Remove tree entity (it fell)
        world.deleteEntity(entity.id);

        // Emit tree fell event
        world.eventBus.emit({
          type: 'tree:felled',
          source: entity.id,
          data: { position, woodDropped: remainingWood }
        });

        // Optional: Create falling animation entity
        this.createFallingTreeAnimation(world, position, wasHeight);
      }
    }
  }

  /**
   * Drop items at a position.
   */
  private dropItems(world: World, position: Position, itemId: string, amount: number): void {
    // Create item entity on ground
    const itemEntity = world.createEntity();

    itemEntity.addComponent(createPositionComponent(position.x, position.y, 0)); // Ground level
    itemEntity.addComponent(createRenderableComponent(itemId, 'item'));
    itemEntity.addComponent(createResourceComponent(itemId, amount, 0)); // No regen on dropped items
    itemEntity.addComponent(createTagsComponent('item', 'pickup'));

    // Emit item dropped event
    world.eventBus.emit({
      type: 'item:dropped',
      source: 'tree_felling',
      data: { itemId, amount, position }
    });
  }

  /**
   * Create visual falling tree animation.
   */
  private createFallingTreeAnimation(world: World, position: Position, height: number): void {
    // Create temporary animation entity
    const animEntity = world.createEntity();

    animEntity.addComponent(createPositionComponent(position.x, position.y, height));
    animEntity.addComponent(createRenderableComponent('tree_falling', 'animation'));

    // Add animation component with lifetime
    animEntity.addComponent({
      type: 'animation',
      version: 1,
      animationType: 'falling_tree',
      duration: 1.0, // 1 second fall animation
      startTick: world.tick
    });

    // Animation system will remove this entity after duration
  }
}
```

**Updated Harvesting Logic**:
```typescript
// When harvesting a tree (GatherBehavior):
const voxelResource = entity.getComponent<VoxelResourceComponent>('voxel_resource');
const position = entity.getComponent<PositionComponent>('position');

if (voxelResource && position) {
  // Determine which level agent is harvesting (based on agent Z position)
  const agentZ = agentPosition.z || 0;
  const harvestLevel = Math.floor(agentZ); // Which level are they cutting?

  // If cutting at ground level (Z=0), tree will fall
  if (harvestLevel === 0) {
    // Cut the base - entire tree falls
    const totalWood = voxelResource.currentHeight * voxelResource.blocksPerLevel;

    // Give agent one level's worth
    addItemToInventory(agent, voxelResource.resourceId, voxelResource.blocksPerLevel);

    // Set height to 0 to trigger felling system
    entity.updateComponent<VoxelResourceComponent>('voxel_resource', (comp) => ({
      ...comp,
      currentHeight: 0,
      lastHarvestTick: world.tick
    }));

    // TreeFellingSystem will handle the rest (dropping items, animation)
  } else {
    // Cutting upper levels - remove that level only
    const newHeight = voxelResource.currentHeight - 1;

    entity.updateComponent<VoxelResourceComponent>('voxel_resource', (comp) => ({
      ...comp,
      currentHeight: newHeight,
      lastHarvestTick: world.tick
    }));

    addItemToInventory(agent, voxelResource.resourceId, voxelResource.blocksPerLevel);

    // If height reaches 0 after cutting upper levels, tree is depleted (not felled)
    if (newHeight === 0) {
      world.deleteEntity(entity.id);
    }
  }
}
```

**Key Design Points for Tree Felling**:
- **Bottom-up harvesting**: Cutting at ground level (Z=0) causes entire tree to fall
- **Top-down harvesting**: Cutting from top doesn't cause felling (just removes that level)
- **Realistic physics**: Tree falls when structural support removed
- **Item drops**: Remaining wood blocks drop at tree base
- **Visual feedback**: Falling tree animation entity
- **Emergent gameplay**: Agents must plan harvesting strategy

**Example Scenarios**:
1. **Safe felling**: Agent cuts tree at base (Z=0), tree falls, agent collects ~16 wood blocks
2. **Partial harvest**: Agent climbs tree, cuts top 2 levels, tree remains standing at Z=2
3. **Dangerous felling**: Agent cuts base while standing too close, tree falls on agent (potential damage)

---

### 4. Blueprint System Update

**File**: `packages/core/src/buildings/TileBasedBlueprintRegistry.ts` (NEW)

```typescript
/**
 * Tile-based building blueprint with layout definition.
 */
export interface TileBasedBlueprint extends BuildingBlueprint {
  /** String-based layout for easy visualization */
  layoutString: string[];

  /** Material defaults for layout symbols */
  materialDefaults: Record<string, string>;

  /** Allow custom materials per symbol? */
  allowCustomMaterials: boolean;
}

/**
 * Example blueprints
 */
export const TILE_BASED_BLUEPRINTS: TileBasedBlueprint[] = [
  // Small 3x3 house
  {
    id: 'small_house',
    name: 'Small House',
    description: 'A cozy 3x3 dwelling with a door',
    category: 'residential',
    width: 3,
    height: 3,
    layoutString: [
      "###",
      "#.D",
      "###"
    ],
    materialDefaults: {
      '#': 'wood_wall',
      '.': 'wood_floor',
      'D': 'wood_door'
    },
    allowCustomMaterials: true,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 16 } // 7 walls + 1 door + 8 floors
    ],
    techRequired: [],
    terrainRequired: [],
    terrainForbidden: ['water'],
    unlocked: true,
    buildTime: 300,
    tier: 1,
    functionality: [
      { type: 'sleeping', restBonus: 1.2 }
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false
  },

  // 5x4 house with hallway
  {
    id: 'hallway_house',
    name: 'House with Hallway',
    description: 'A 5x4 house with interior hallway',
    category: 'residential',
    width: 5,
    height: 4,
    layoutString: [
      "#####",
      "#...D",
      "#...#",
      "#####"
    ],
    materialDefaults: {
      '#': 'wood_wall',
      '.': 'wood_floor',
      'D': 'wood_door'
    },
    allowCustomMaterials: true,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 32 }
    ],
    techRequired: [],
    terrainRequired: [],
    terrainForbidden: ['water'],
    unlocked: true,
    buildTime: 600,
    tier: 2,
    functionality: [
      { type: 'sleeping', restBonus: 1.5 }
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false
  }
];

/**
 * Calculate actual resource cost from layout.
 */
export function calculateResourceCost(blueprint: TileBasedBlueprint): Record<string, number> {
  const costs: Record<string, number> = {};

  for (const row of blueprint.layoutString) {
    for (const symbol of row) {
      if (symbol === ' ') continue; // Empty space

      const materialId = blueprint.materialDefaults[symbol];
      if (!materialId) continue;

      // Get material item
      const material = getItem(materialId);
      if (!material) continue;

      // Count this material
      costs[materialId] = (costs[materialId] || 0) + 1;
    }
  }

  return costs;
}

/**
 * Parse layout string to tile positions.
 */
export function parseLayout(
  blueprint: TileBasedBlueprint,
  originX: number,
  originY: number,
  rotation: number = 0
): Array<{ x: number; y: number; type: 'wall' | 'floor' | 'door'; materialId: string }> {
  const tiles: Array<{ x: number; y: number; type: 'wall' | 'floor' | 'door'; materialId: string }> = [];

  const layout = rotation === 0 ? blueprint.layoutString :
                 rotation === 90 ? rotateLayout90(blueprint.layoutString) :
                 rotation === 180 ? rotateLayout180(blueprint.layoutString) :
                 rotateLayout270(blueprint.layoutString);

  for (let y = 0; y < layout.length; y++) {
    for (let x = 0; x < layout[y].length; x++) {
      const symbol = layout[y][x];
      if (symbol === ' ') continue;

      const materialId = blueprint.materialDefaults[symbol];
      if (!materialId) continue;

      // Determine type from symbol
      let type: 'wall' | 'floor' | 'door';
      if (symbol === '#' || symbol.includes('wall')) {
        type = 'wall';
      } else if (symbol === 'D' || symbol.includes('door')) {
        type = 'door';
      } else {
        type = 'floor';
      }

      tiles.push({
        x: originX + x,
        y: originY + y,
        type,
        materialId
      });
    }
  }

  return tiles;
}
```

**Key Design Points**:
- String-based layouts are easy to visualize and edit
- Material defaults can be overridden
- `parseLayout()` converts to tile positions with rotation support
- Resource costs calculated from actual tile count

---

### 5. Construction System

**File**: `packages/core/src/systems/TileConstructionSystem.ts` (NEW)

```typescript
/**
 * Construction task for tile-based buildings.
 */
export interface ConstructionTask {
  id: string;
  blueprintId: string;
  originPosition: Position;
  rotation: number;

  /** All tiles to place */
  tilesToPlace: Array<{
    x: number;
    y: number;
    type: 'wall' | 'floor' | 'door';
    materialId: string;
    progress: number;  // 0-100
    isPlaced: boolean;
    materialsDelivered: number;  // NEW: How many materials brought to this tile
    materialsRequired: number;   // NEW: How many needed (usually 1 per tile)
  }>;

  /** Current tile being worked on */
  currentTileIndex: number;

  /** Overall construction state */
  state: 'planned' | 'in_progress' | 'completed' | 'cancelled';

  /** When construction started */
  startedAt: number;

  /** NEW: Agents currently working on this task */
  activeBuilders: Set<string>;  // Agent entity IDs

  /** NEW: Material storage location (where to fetch materials from) */
  materialStorageLocation?: Position;
}

/**
 * Tile Construction System.
 * Handles block-by-block construction of tile-based buildings.
 */
export class TileConstructionSystem implements System {
  public readonly id: SystemId = 'tile_construction';
  public readonly priority: number = 18;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private activeTasks: Map<string, ConstructionTask> = new Map();

  /**
   * Create a new construction task from a blueprint.
   */
  public createConstructionTask(
    world: World,
    blueprintId: string,
    originX: number,
    originY: number,
    rotation: number = 0,
    builderId?: string
  ): ConstructionTask {
    const blueprint = getTileBasedBlueprint(blueprintId);
    if (!blueprint) {
      throw new Error(`Unknown blueprint: ${blueprintId}`);
    }

    // Parse layout to tiles
    const tiles = parseLayout(blueprint, originX, originY, rotation);

    const task: ConstructionTask = {
      id: `construction_${world.tick}_${originX}_${originY}`,
      blueprintId,
      originPosition: { x: originX, y: originY },
      rotation,
      builderId,
      tilesToPlace: tiles.map(t => ({
        ...t,
        progress: 0,
        isPlaced: false
      })),
      currentTileIndex: 0,
      state: 'planned',
      startedAt: world.tick
    };

    this.activeTasks.set(task.id, task);

    // Emit event
    world.eventBus.emit({
      type: 'construction:task_created',
      source: 'tile_construction_system',
      data: { taskId: task.id, blueprintId, position: { x: originX, y: originY } }
    });

    return task;
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Tile construction is driven by BuildBehavior
    // This system just tracks progress and places tiles when complete

    for (const [taskId, task] of this.activeTasks) {
      if (task.state !== 'in_progress') continue;

      // Check if current tile is complete
      const currentTile = task.tilesToPlace[task.currentTileIndex];
      if (currentTile && currentTile.progress >= 100 && !currentTile.isPlaced) {
        // Place the tile
        this.placeTile(world, currentTile);
        currentTile.isPlaced = true;

        // Move to next tile
        task.currentTileIndex++;

        // Check if all tiles placed
        if (task.currentTileIndex >= task.tilesToPlace.length) {
          task.state = 'completed';

          // Emit completion event
          world.eventBus.emit({
            type: 'construction:task_completed',
            source: 'tile_construction_system',
            data: { taskId, blueprintId: task.blueprintId }
          });

          // Remove from active tasks
          this.activeTasks.delete(taskId);
        }
      }
    }
  }

  /**
   * Place a tile on the world grid.
   */
  private placeTile(
    world: World,
    tile: { x: number; y: number; type: 'wall' | 'floor' | 'door'; materialId: string }
  ): void {
    const worldTile = world.getTileAt(tile.x, tile.y);
    if (!worldTile) {
      throw new Error(`Tile not found at ${tile.x}, ${tile.y}`);
    }

    if (tile.type === 'wall') {
      worldTile.wall = {
        materialId: tile.materialId,
        health: 100,
        orientation: this.determineWallOrientation(world, tile.x, tile.y),
        progress: 100,
        builderId: undefined,
        constructedAt: world.tick
      };
    } else if (tile.type === 'door') {
      worldTile.door = {
        materialId: tile.materialId,
        health: 100,
        isOpen: false,
        orientation: 'horizontal', // TODO: Determine from layout
        progress: 100,
        builderId: undefined,
        constructedAt: world.tick
      };
    } else if (tile.type === 'floor') {
      worldTile.floor = tile.materialId;
    }

    // Mark tile as modified
    world.markTileModified(tile.x, tile.y);

    // Emit event
    world.eventBus.emit({
      type: 'tile:placed',
      source: 'tile_construction_system',
      data: { x: tile.x, y: tile.y, type: tile.type, materialId: tile.materialId }
    });
  }

  /**
   * Determine wall orientation from neighbors.
   */
  private determineWallOrientation(world: World, x: number, y: number): 'north' | 'south' | 'east' | 'west' | 'corner' {
    // Check neighbors for walls
    const north = world.getTileAt(x, y - 1)?.wall;
    const south = world.getTileAt(x, y + 1)?.wall;
    const east = world.getTileAt(x + 1, y)?.wall;
    const west = world.getTileAt(x - 1, y)?.wall;

    const neighborCount = [north, south, east, west].filter(Boolean).length;

    if (neighborCount >= 2) return 'corner';
    if (north || south) return 'north';
    if (east || west) return 'east';

    return 'north'; // Default
  }

  /**
   * Get construction task by ID.
   */
  public getTask(taskId: string): ConstructionTask | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * Get all active tasks.
   */
  public getAllTasks(): ConstructionTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Advance construction progress on a tile (called by BuildBehavior).
   */
  public advanceProgress(
    taskId: string,
    tileIndex: number,
    progressDelta: number
  ): boolean {
    const task = this.activeTasks.get(taskId);
    if (!task || tileIndex >= task.tilesToPlace.length) {
      return false;
    }

    const tile = task.tilesToPlace[tileIndex];
    tile.progress = Math.min(100, tile.progress + progressDelta);

    return true;
  }
}
```

---

### Material Transport and Collaborative Building

**NEW: Material Transport Behavior** - Agents must physically fetch materials before building

```typescript
/**
 * Material Transport Behavior - Fetch materials from storage and bring to construction site.
 * This is the PRIMARY building activity - physically transporting materials IS building.
 */
class MaterialTransportBehavior extends Behavior {
  private state: 'finding_material' | 'moving_to_storage' | 'picking_up' | 'transporting' | 'delivering' = 'finding_material';
  private targetMaterialId?: string;
  private storageLocation?: Position;

  execute(world: World, entity: Entity, deltaTime: number): BehaviorStatus {
    const task = this.getCurrentConstructionTask(world, entity);
    if (!task) {
      return BehaviorStatus.FAILED;
    }

    const currentTile = task.tilesToPlace[task.currentTileIndex];
    if (!currentTile || currentTile.isPlaced) {
      return BehaviorStatus.SUCCESS; // Tile complete
    }

    // Check if this tile needs materials
    if (currentTile.materialsDelivered >= currentTile.materialsRequired) {
      // Materials already delivered - transition to BuildBehavior
      return BehaviorStatus.SUCCESS;
    }

    // STATE MACHINE: Find → Move → Pickup → Transport → Deliver

    switch (this.state) {
      case 'finding_material':
        // Find storage location with required material
        this.storageLocation = this.findMaterialStorage(world, currentTile.materialId);
        if (!this.storageLocation) {
          return BehaviorStatus.FAILED; // No materials available
        }
        this.targetMaterialId = currentTile.materialId;
        this.state = 'moving_to_storage';
        return BehaviorStatus.RUNNING;

      case 'moving_to_storage':
        // Navigate to storage location
        const distToStorage = this.getDistanceTo(entity, this.storageLocation!);
        if (distToStorage > 1.5) {
          this.moveTowards(world, entity, this.storageLocation!);
          return BehaviorStatus.RUNNING;
        }
        this.state = 'picking_up';
        return BehaviorStatus.RUNNING;

      case 'picking_up':
        // Pick up material from storage
        const success = this.pickupMaterial(world, entity, this.targetMaterialId!, 1);
        if (!success) {
          return BehaviorStatus.FAILED; // Material gone
        }
        this.state = 'transporting';
        return BehaviorStatus.RUNNING;

      case 'transporting':
        // Navigate to construction site
        const distToSite = this.getDistanceTo(entity, currentTile);
        if (distToSite > 1.5) {
          this.moveTowards(world, entity, currentTile);
          return BehaviorStatus.RUNNING;
        }
        this.state = 'delivering';
        return BehaviorStatus.RUNNING;

      case 'delivering':
        // Deliver material to construction site
        const delivered = this.deliverMaterial(world, entity, task, currentTile);
        if (delivered) {
          // **KEY: Grant XP on material delivery/placement**
          this.grantXP(world, entity, 'building', 5); // 5 XP per material delivered

          // Emit event for social tracking
          world.eventBus.emit({
            type: 'construction:material_delivered',
            source: entity.id,
            data: {
              taskId: task.id,
              materialId: this.targetMaterialId,
              tilePosition: { x: currentTile.x, y: currentTile.y }
            }
          });

          // Reset state for next material
          this.state = 'finding_material';
          return BehaviorStatus.SUCCESS;
        }
        return BehaviorStatus.FAILED;
    }

    return BehaviorStatus.RUNNING;
  }

  /**
   * Find storage location containing the required material.
   */
  private findMaterialStorage(world: World, materialId: string): Position | undefined {
    // Search for storage entities or stockpiles with this material
    const storages = world.query().with('storage').with('position').executeEntities();

    for (const storage of storages) {
      const inventory = storage.getComponent<InventoryComponent>('inventory');
      if (!inventory) continue;

      // Check if storage has this material
      const hasItem = inventory.items.some(item => item.id === materialId && item.count > 0);
      if (hasItem) {
        const pos = storage.getComponent<PositionComponent>('position');
        return pos ? { x: pos.x, y: pos.y } : undefined;
      }
    }

    // Also check for items on the ground
    const groundItems = world.query().with('position').with('tags').executeEntities();
    for (const item of groundItems) {
      const tags = item.getComponent<TagsComponent>('tags');
      if (!tags || !tags.tags.includes('item')) continue;

      const resource = item.getComponent<ResourceComponent>('resource');
      if (resource && resource.resourceId === materialId && resource.amount > 0) {
        const pos = item.getComponent<PositionComponent>('position');
        return pos ? { x: pos.x, y: pos.y } : undefined;
      }
    }

    return undefined;
  }

  /**
   * Pick up material from storage and add to agent's inventory.
   */
  private pickupMaterial(world: World, entity: Entity, materialId: string, amount: number): boolean {
    const inventory = entity.getComponent<InventoryComponent>('inventory');
    if (!inventory) return false;

    // Remove from storage and add to agent's inventory
    // (Implementation depends on storage/inventory system)
    const item = { id: materialId, count: amount };
    inventory.items.push(item);

    return true;
  }

  /**
   * Deliver material from agent's inventory to construction site.
   * THIS IS THE ACT OF BUILDING.
   */
  private deliverMaterial(
    world: World,
    entity: Entity,
    task: ConstructionTask,
    tile: ConstructionTile
  ): boolean {
    const inventory = entity.getComponent<InventoryComponent>('inventory');
    if (!inventory) return false;

    // Find material in inventory
    const itemIndex = inventory.items.findIndex(item =>
      item.id === tile.materialId && item.count > 0
    );

    if (itemIndex === -1) return false;

    // Remove from inventory
    inventory.items[itemIndex].count -= 1;
    if (inventory.items[itemIndex].count === 0) {
      inventory.items.splice(itemIndex, 1);
    }

    // Add to tile's delivered materials
    tile.materialsDelivered += 1;

    return true;
  }

  /**
   * Grant XP to agent for building activity.
   */
  private grantXP(world: World, entity: Entity, skill: string, amount: number): void {
    const progression = entity.getComponent('progression');
    if (!progression) return;

    // Add XP to skill
    progression.skills[skill] = (progression.skills[skill] || 0) + amount;

    // Emit XP gain event
    world.eventBus.emit({
      type: 'progression:xp_gained',
      source: entity.id,
      data: { skill, amount }
    });
  }
}
```

**Updated BuildBehavior** - Now only works AFTER materials delivered:
```typescript
/**
 * Build Behavior - Place materials into the structure.
 * Only executes AFTER materials have been delivered to the tile.
 */
class BuildBehavior extends Behavior {
  execute(world: World, entity: Entity, deltaTime: number): BehaviorStatus {
    const task = this.getCurrentConstructionTask(world, entity);
    if (!task) {
      return BehaviorStatus.FAILED;
    }

    // Register this agent as active builder
    if (!task.activeBuilders.has(entity.id)) {
      task.activeBuilders.add(entity.id);
    }

    const currentTile = task.tilesToPlace[task.currentTileIndex];
    if (!currentTile || currentTile.isPlaced) {
      // Move to next tile or complete
      task.activeBuilders.delete(entity.id);
      return BehaviorStatus.SUCCESS;
    }

    // CHECK: Materials must be delivered before building
    if (currentTile.materialsDelivered < currentTile.materialsRequired) {
      // Transition back to MaterialTransportBehavior
      return BehaviorStatus.BLOCKED; // Special status: waiting for materials
    }

    // Navigate to tile
    const distance = this.getDistanceToTile(entity, currentTile.x, currentTile.y);
    if (distance > 2) {
      // Move closer
      this.moveTowardsTile(world, entity, currentTile.x, currentTile.y);
      return BehaviorStatus.RUNNING;
    }

    // Work on tile (advance progress)
    // NO artificial speed bonuses - each agent works at base rate
    const progressPerSecond = 5; // 20 seconds per tile at base speed
    const progressDelta = progressPerSecond * deltaTime;

    const constructionSystem = world.getSystem<TileConstructionSystem>('tile_construction');
    constructionSystem.advanceProgress(task.id, task.currentTileIndex, progressDelta);

    // NOTE: "Collaboration speedup" is EMERGENT from parallelization:
    // - 1 agent: Fetches material → delivers → places (takes full time per tile)
    // - 2 agents: BOTH independently fetch → deliver → place on different tiles
    //   Result: 2x throughput naturally, no artificial bonus needed
    // - 3 agents: Each working independently = 3x throughput
    // The speedup comes from multiple agents doing real parallel work,
    // not from a collaboration multiplier.

    // Check if tile just completed
    if (currentTile.progress >= 100 && !currentTile.isPlaced) {
      // **KEY: Grant XP on tile placement**
      this.grantXP(world, entity, 'building', 10); // 10 XP for placing a tile

      // **KEY: Social relationship building**
      this.buildRelationships(world, entity, task);

      // Emit placement event
      world.eventBus.emit({
        type: 'construction:tile_placed',
        source: entity.id,
        data: {
          taskId: task.id,
          tilePosition: { x: currentTile.x, y: currentTile.y },
          collaborators: Array.from(task.activeBuilders)
        }
      });
    }

    return BehaviorStatus.RUNNING;
  }

  /**
   * Build relationships with other agents working on same task.
   * **KEY: Building together creates social bonds**
   */
  private buildRelationships(world: World, entity: Entity, task: ConstructionTask): void {
    const agentId = entity.id;
    const relationships = entity.getComponent('relationships');
    if (!relationships) return;

    // Improve relationship with all other active builders
    for (const otherBuilderId of task.activeBuilders) {
      if (otherBuilderId === agentId) continue;

      // Increase positive relationship
      const currentRel = relationships.relations[otherBuilderId] || 0;
      relationships.relations[otherBuilderId] = Math.min(100, currentRel + 2);

      // Emit relationship event
      world.eventBus.emit({
        type: 'social:relationship_improved',
        source: agentId,
        data: {
          targetAgent: otherBuilderId,
          reason: 'collaborative_building',
          amount: 2
        }
      });
    }
  }
}
```

**Key Design Points**:
- **Material transport is building**: Agents must fetch materials from storage and physically bring them to the construction site
- **XP on placement**: Agents earn 5 XP per material delivered + 10 XP per tile placed
- **Emergent collaborative building**: Multiple agents working independently = natural parallelization
  - 2 agents = 2x throughput (each doing full fetch-deliver-place cycle)
  - 3 agents = 3x throughput (no artificial speed bonuses, just real parallel work)
- **Social relationship building**: Working together on construction improves relationships between agents (+2 per tile)
- **Two-phase construction**: MaterialTransportBehavior → BuildBehavior (can't build without materials)
- Construction is block-by-block, not instant
- Progress tracked per-tile with material delivery tracking
- Tiles placed when progress reaches 100%
- Integrates with existing behavior system

---

### 6. Temperature Integration

**Updated TemperatureSystem.ts**:
```typescript
/**
 * Calculate building insulation and base temperature effect.
 * Now uses room detection instead of abstract interiorRadius.
 */
private calculateBuildingEffect(
  world: World,
  position: PositionComponent
): { insulation: number; baseTemp: number } | null {
  // Get room at agent's position
  const roomDetection = world.getSystem<RoomDetectionSystem>('room_detection');
  const room = roomDetection.getRoomAt(Math.floor(position.x), Math.floor(position.y));

  if (!room || !room.isEnclosed) {
    return null; // Not in an enclosed room
  }

  // Use room's calculated insulation from wall materials
  return {
    insulation: room.averageInsulation,
    baseTemp: room.currentTemperature
  };
}
```

**Room Temperature Simulation** (added to RoomDetectionSystem):
```typescript
/**
 * Update room temperatures based on wall insulation.
 * Called every frame in RoomDetectionSystem.update()
 */
private updateRoomTemperatures(world: World, deltaTime: number): void {
  const worldTemp = this.calculateWorldTemperature(world);

  for (const room of this.rooms.values()) {
    if (!room.isEnclosed) {
      // Non-enclosed rooms match world temperature
      room.currentTemperature = worldTemp;
      continue;
    }

    // Enclosed rooms gradually approach equilibrium
    // Higher insulation = slower temperature change
    const thermalMass = room.volume * 0.5; // Thermal mass proportional to volume
    const heatTransferRate = (1 - room.averageInsulation) * 0.1; // Less insulation = faster transfer

    const tempDiff = worldTemp - room.currentTemperature;
    const tempChange = (tempDiff * heatTransferRate * deltaTime) / thermalMass;

    room.currentTemperature += tempChange;
  }
}
```

**Key Design Points**:
- Agents get temperature from room they're in
- Room temperature is calculated from wall materials
- Better insulation = slower temperature change
- Non-enclosed rooms match world temperature

---

### 7. Pathfinding Integration

**Updated MovementSystem.ts**:
```typescript
/**
 * Check for hard collisions (walls, water, elevation).
 * Now uses tile-based wall detection.
 */
private hasHardCollision(
  world: World,
  entityId: string,
  x: number,
  y: number
): boolean {
  const worldX = Math.floor(x);
  const worldY = Math.floor(y);
  const tile = world.getTileAt(worldX, worldY);

  if (!tile) return true; // Out of bounds

  // Check for wall (blocks movement)
  if (tile.wall) {
    return true;
  }

  // Check for closed door (blocks movement)
  if (tile.door && !tile.door.isOpen) {
    return true;
  }

  // Check for water
  if (tile.terrain === 'water') {
    return true;
  }

  // Check for steep elevation
  const currentTile = this.getCurrentTile(world, entityId);
  if (currentTile && Math.abs(tile.elevation - currentTile.elevation) > 2) {
    return true;
  }

  return false;
}
```

**Door Interaction** (new behavior):
```typescript
/**
 * Open/close doors when agent approaches.
 */
class DoorInteractionSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const pos = entity.getComponent<PositionComponent>('position');
      if (!pos) continue;

      // Check if agent is next to a door
      const neighbors = [
        { x: Math.floor(pos.x) + 1, y: Math.floor(pos.y) },
        { x: Math.floor(pos.x) - 1, y: Math.floor(pos.y) },
        { x: Math.floor(pos.x), y: Math.floor(pos.y) + 1 },
        { x: Math.floor(pos.x), y: Math.floor(pos.y) - 1 }
      ];

      for (const neighbor of neighbors) {
        const tile = world.getTileAt(neighbor.x, neighbor.y);
        if (tile?.door && !tile.door.isOpen) {
          // Open the door
          tile.door.isOpen = true;
          world.markTileModified(neighbor.x, neighbor.y);

          // Emit event
          world.eventBus.emit({
            type: 'door:opened',
            source: entity.id,
            data: { x: neighbor.x, y: neighbor.y }
          });
        }
      }
    }
  }
}
```

**Key Design Points**:
- Walls block movement completely
- Closed doors block movement, open doors allow passage
- Doors auto-open when agent approaches
- Pathfinding considers door states

---

### 8. Material Magic Integration

**Material Creation Spells** (already created in `MaterialCreationSpells.ts`):

The existing spell system needs to be updated to place tiles instead of monolithic buildings:

```typescript
/**
 * Updated effect handler for "Create Material Structure" spell.
 * Now places wall/floor tiles instead of a building entity.
 */
class CreateMaterialStructureEffect implements SpellEffect {
  apply(world: World, caster: Entity, target: Position, params: { materialId: string }): void {
    const { materialId } = params;

    // Get material rarity
    const rarity = MATERIAL_RARITY_TABLE[materialId];
    const actualCost = calculateMaterialCreationCost(45, rarity, 'structure');

    // Deduct mana from caster
    this.deductMana(caster, actualCost);

    // Create a small structure (3x3 room)
    const blueprint = {
      layoutString: [
        "###",
        "#.#",
        "###"
      ],
      materialDefaults: {
        '#': materialId,
        '.': `${materialId}_floor`
      }
    };

    // Place tiles
    const tiles = parseLayout(blueprint, target.x, target.y, 0);
    for (const tile of tiles) {
      this.placeTile(world, tile);
    }

    // Emit event
    world.eventBus.emit({
      type: 'spell:create_structure_complete',
      source: caster.id,
      data: { materialId, position: target }
    });
  }
}
```

**Key Design Points**:
- Spells create tile layouts, not building entities
- Material ID determines which material is used
- Higher-tier spells create larger structures (districts, cities)

---

## Implementation Phases

### Phase 1: Core Tile Infrastructure (Week 1)
**Goal**: Extend Tile interface and update world access

1. Update `Tile.ts` with wall/door/window interfaces
2. Add `getTileAt()` / `setTileAt()` methods to World
3. Add `markTileModified()` for chunk updates
4. Update ChunkManager to handle tile modifications
5. **Deliverable**: Can place/query wall/door tiles

**Testing**: Unit tests for tile placement and querying

---

### Phase 2: Voxel Resource System (Week 1)
**Goal**: Implement 1:1 physical resource mapping

1. Create `VoxelResourceComponent.ts`
2. Update `TreeEntity.ts` to use voxel resources
3. Update `GatherBehavior.ts` to harvest voxel resources
4. Update rock/ore entities similarly
5. **Deliverable**: Trees provide height-based wood blocks

**Testing**: Integration test - harvest 4-level tree, get 16 wood

---

### Phase 3: Blueprint System (Week 2)
**Goal**: Define tile-based building blueprints

1. Create `TileBasedBlueprintRegistry.ts`
2. Create `parseLayout()` function
3. Create example blueprints (small house, hallway house)
4. Add blueprint validation
5. **Deliverable**: Can parse blueprints to tile positions

**Testing**: Unit tests for layout parsing and rotation

---

### Phase 4: Construction System with Material Transport (Week 2)
**Goal**: Implement block-by-block construction with material fetching

1. Create `TileConstructionSystem.ts`
2. Create `ConstructionTask` data structure with material tracking
3. Create `MaterialTransportBehavior.ts` for fetching materials
4. Update `BuildBehavior.ts` to work on tasks after materials delivered
5. Implement tile placement logic with XP rewards
6. Add collaborative building mechanics (multiple agents on same task)
7. **Deliverable**: Agents fetch materials, build tiles, earn XP, collaborate

**Testing**: Integration test - two agents collaborate to build 3x3 house

---

### Phase 5: Room Detection (Week 3)
**Goal**: Detect enclosed rooms via flood-fill

1. Create `RoomDetectionSystem.ts`
2. Implement flood-fill algorithm
3. Implement wall property calculation
4. Add room querying API
5. **Deliverable**: System detects rooms and calculates properties

**Testing**: Unit test - detect room in 3x3 house

---

### Phase 6: Temperature Integration (Week 3)
**Goal**: Per-room temperature simulation

1. Update `TemperatureSystem.ts` to use room detection
2. Add room temperature simulation to RoomDetectionSystem
3. Remove old `interiorRadius` logic
4. **Deliverable**: Agents get temperature from room

**Testing**: Integration test - agent in insulated room is warmer

---

### Phase 7: Pathfinding Integration (Week 4)
**Goal**: Navigate through doors and walls

1. Update `MovementSystem.ts` to check tile walls/doors
2. Create `DoorInteractionSystem.ts`
3. Update AI pathfinding to avoid walls
4. **Deliverable**: Agents navigate through doors

**Testing**: Integration test - agent walks through doorway

---

### Phase 8: Material Magic Integration (Week 4)
**Goal**: Spells create tile-based structures

1. Update spell effect handlers to place tiles
2. Test material creation spells
3. **Deliverable**: Cast spell to create shadow structure

**Testing**: Integration test - cast spell, check tiles placed

---

### Phase 9: Renderer Updates (Week 5)
**Goal**: Visualize walls, doors, rooms

1. Update renderer to draw wall tiles
2. Add door sprites (open/closed)
3. Add room overlay (debug mode)
4. Add construction progress visualization
5. **Deliverable**: Buildings render as tile-based structures

**Testing**: Visual inspection

---

### Phase 10: Migration & Polish (Week 6)
**Goal**: Migrate old buildings, polish UX

1. Create migration tool to convert old buildings
2. Update UI to show tile-based construction
3. Add tooltips for wall materials
4. Performance profiling and optimization
5. **Deliverable**: Stable release-ready system

**Testing**: Full integration tests, performance benchmarks

---

## Migration Strategy

### Backward Compatibility
- Old monolithic buildings coexist with tile-based buildings
- `BuildingComponent` remains for crafting benches, forges, etc.
- Tile-based system is opt-in via new blueprints

### Migration Path
1. **Phase 1-8**: New buildings use tile system
2. **Phase 9**: Renderer supports both old and new
3. **Phase 10**: Optional migration tool for old saves

### Preserving Existing Features
- Crafting benches remain monolithic entities
- Existing BuildingComponent used for non-structural buildings
- Temperature system checks for both room and legacy buildings

---

## Testing Strategy

### Unit Tests
- Tile placement/querying
- Layout parsing and rotation
- Room detection flood-fill
- Voxel resource calculations

### Integration Tests
- End-to-end construction (blueprint → task → tiles placed)
- Temperature in rooms vs. outdoors
- Pathfinding through doors
- Harvesting voxel resources

### Performance Tests
- Room detection with 100+ rooms
- Construction of large blueprints (50x50 building)
- Temperature simulation with 50+ rooms

---

## Performance Considerations

### Room Detection
- Only recalculate every N ticks (not every frame)
- Cache room assignments per-tile
- Invalidate cache when walls/doors change

### Tile Queries
- Chunk-based lookups (O(1) via chunk coordinates)
- Avoid full-world scans

### Temperature Simulation
- Only simulate enclosed rooms
- Skip non-enclosed rooms (use world temp)

### Construction
- Construction tasks in separate system (not per-entity)
- Batch tile placements when possible

---

## Future Extensibility

### Multi-Floor Buildings
- Add Z-axis to tile coordinates
- Stairs/ladders as special tiles

### Building Damage/Decay
- Wall health decreases over time
- Material decay rates from MaterialTrait

### Advanced Materials
- Living materials that grow/change
- Transient materials that phase out
- Hostile materials that damage nearby entities

### Dynamic Structures
- Buildings that expand/contract
- Modular construction (add rooms later)
- Movable walls (sliding doors, elevators)

---

## Open Questions

1. **How to handle partial construction?**
   - Option A: Partially-built walls block movement
   - Option B: Walls don't block until 100% complete
   - **Decision needed**: User preference

2. **Should doors auto-close?**
   - Option A: Doors stay open until manually closed
   - Option B: Doors auto-close after N seconds
   - **Decision needed**: User preference

3. **How to visualize under-construction tiles?**
   - Option A: Ghosted sprites
   - Option B: Construction scaffolding sprite
   - Option C: Progress bar overlay
   - **Decision needed**: Renderer implementation

4. **How to handle material removal (demolition)?**
   - Option A: Recover full materials
   - Option B: Recover partial materials
   - Option C: Materials destroyed
   - **Decision needed**: Game balance

---

## Summary of New Files and Modifications

### New Files to Create
1. **`packages/world/src/chunks/Tile.ts`** - Add WallTile, DoorTile, WindowTile interfaces
2. **`packages/core/src/components/VoxelResourceComponent.ts`** - NEW component for 1:1 resource mapping
3. **`packages/core/src/systems/RoomDetectionSystem.ts`** - NEW flood-fill room detection
4. **`packages/core/src/systems/TileConstructionSystem.ts`** - NEW tile-by-tile construction
5. **`packages/core/src/systems/TreeFellingSystem.ts`** - NEW tree physics (fall when base cut)
6. **`packages/core/src/behaviors/MaterialTransportBehavior.ts`** - NEW behavior for fetching/transporting materials
7. **`packages/core/src/buildings/TileBasedBlueprintRegistry.ts`** - NEW blueprint system with string layouts

### Existing Files to Modify
1. **`TreeEntity.ts`** - Replace ResourceComponent with VoxelResourceComponent
2. **`GatherBehavior.ts`** - Update to harvest voxel resources + tree felling logic
3. **`BuildBehavior.ts`** - Update to work with ConstructionTask and check materials delivered
4. **`TemperatureSystem.ts`** - Replace abstract interiorRadius with room detection
5. **`MovementSystem.ts`** - Check tile walls/doors instead of building entities
6. **`MaterialCreationSpells.ts`** - Update spell effects to place tiles instead of building entities
7. **`World.ts`** - Add getTileAt/setTileAt/markTileModified methods
8. **`ChunkManager.ts`** - Handle tile modifications and invalidation
9. **Progression system** (if exists) - Add XP reward hooks for building actions
10. **Relationship system** (if exists) - Add relationship improvement for collaborative building

### New Components/Interfaces
- `WallTile` - Wall data on tile
- `DoorTile` - Door data on tile
- `WindowTile` - Window data on tile (future)
- `VoxelResourceComponent` - Height-based resources
- `ConstructionTask` - Tile-based construction with material tracking
- `Room` - Detected room with temperature/insulation
- `MaterialTransportBehavior` - Material fetching behavior

### New Events
- `construction:task_created`
- `construction:material_delivered` - NEW: When agent delivers material to site
- `construction:tile_placed` - NEW: When tile is placed (with collaborators list)
- `construction:task_completed`
- `tree:felled`
- `door:opened`
- `tile:placed`
- `progression:xp_gained` - NEW: When agent earns XP
- `social:relationship_improved` - NEW: When building together improves relationships

---

## Conclusion

This plan provides a comprehensive roadmap for implementing a tile-based voxel building system like RimWorld and Dwarf Fortress, **with material transport and collaborative building mechanics**. The phased approach allows for incremental development, testing, and user feedback. The system is designed to integrate seamlessly with existing MaterialTrait definitions, spell systems, and temperature mechanics while preserving backward compatibility with existing buildings.

**Key Innovation**: Building is now a social activity where agents physically transport materials and collaborate, earning XP and building relationships in the process.

**Next Steps**:
1. User approval of this plan
2. Begin Phase 1: Core Tile Infrastructure
3. Begin Phase 2: Voxel Resource System
4. Iterate and refine based on implementation findings
