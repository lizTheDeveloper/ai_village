# Tile-Based Voxel Building System
## RimWorld/Dwarf Fortress-style Construction with Emergent Collaboration

> *Dedicated to:*
> - **Tynan Sylvester** and *RimWorld* - For tile-based construction and emergent gameplay
> - **Tarn Adams** and *Dwarf Fortress* - For room detection and material physics
> - **The spirit of emergent complexity** - Where simple rules create complex behaviors

---

## Overview

Transform the building system from monolithic entities to **tile-based voxel construction**. Buildings become individual wall, floor, and door tiles with real physics, room detection, and emergent collaborative building.

### Core Philosophy

**Buildings are not objects—they are spaces.** A house is not a single entity; it's walls that enclose, a floor that supports, doors that permit passage. When agents build together, they don't "collaborate" through artificial bonuses—they simply work on different tiles, and the throughput naturally scales.

### Key Innovations

1. **Tile-Based Architecture** - Walls, floors, doors extend existing `Tile` interface
2. **Room Detection** - Flood-fill algorithm detects enclosed spaces automatically
3. **Voxel Resources** - Trees/rocks have height (Z-axis), harvest removes levels
4. **Tree Felling Physics** - Cut the base → entire tree falls → drops all wood
5. **Material Transport** - Agents physically fetch materials and bring to construction site
6. **Emergent Collaboration** - Multiple agents working independently = natural parallelization
7. **Social Bonds** - Building together improves relationships organically

---

## Part 1: Core Tile Infrastructure

### Tile Interface Extension

Extend the existing `Tile` interface with optional construction fields:

```typescript
// packages/world/src/chunks/Tile.ts

interface Tile {
  floor?: string;           // Already exists!
  wall?: WallTile;          // NEW
  door?: DoorTile;          // NEW
  window?: WindowTile;      // NEW (future)
}

interface WallTile {
  material: WallMaterial;
  condition: number;        // 0-100 durability
  insulation: number;       // Temperature isolation factor
  constructionProgress?: number;  // 0-100 if being built
}

type WallMaterial = 'wood' | 'stone' | 'mud_brick' | 'ice' | 'metal';

interface DoorTile {
  material: DoorMaterial;
  state: 'open' | 'closed' | 'locked';
  lastOpened?: number;      // Tick for auto-close
  constructionProgress?: number;
}

type DoorMaterial = 'wood' | 'stone' | 'metal' | 'cloth';

interface WindowTile {
  material: 'glass' | 'hide' | 'cloth';
  condition: number;
  lightsThrough: boolean;
}
```

**Why extend Tile?** Because buildings ARE the world, not separate from it. Navigation, temperature, and rendering all need to know about walls/doors at the tile level.

---

## Part 2: Voxel Resource System

### Height-Based Resources

Resources (trees, rocks) have a Z-axis height. Harvesting removes one level at a time.

```typescript
// packages/core/src/components/VoxelResourceComponent.ts

export interface VoxelResourceComponent extends Component {
  type: 'voxel_resource';

  resourceType: 'tree' | 'rock' | 'ore_vein';
  material: string;           // 'oak_wood', 'granite', 'iron_ore'

  // Z-axis structure
  height: number;             // Current height (e.g., 5 levels)
  maxHeight: number;          // Original height
  blocksPerLevel: number;     // Resources dropped per level (e.g., 16 wood per level)

  // State
  stability: number;          // 0-100, decreases as base is cut
  isFalling: boolean;
  fallDirection?: { x: number; y: number };
}
```

### Tree Felling Physics

When you cut the base of a tree (Z=0), the entire tree becomes unstable and falls:

```typescript
// packages/core/src/systems/TreeFellingSystem.ts

export class TreeFellingSystem implements System {
  readonly id = 'tree_felling';
  readonly priority = 45;
  readonly requiredComponents = ['voxel_resource', 'position'];

  update(world: World, entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const voxel = entity.getComponent<VoxelResourceComponent>('voxel_resource');
      const pos = entity.getComponent<PositionComponent>('position');

      // Check if base was cut (height reduced from bottom)
      if (voxel.height > 0 && voxel.stability < 30 && !voxel.isFalling) {
        this.startFalling(entity, voxel, pos, world);
      }

      // Process falling trees
      if (voxel.isFalling) {
        this.processFall(entity, voxel, pos, world);
      }
    }
  }

  private startFalling(
    entity: Entity,
    voxel: VoxelResourceComponent,
    pos: PositionComponent,
    world: World
  ): void {
    // Tree falls in random direction (away from cutter if possible)
    const fallAngle = Math.random() * Math.PI * 2;
    voxel.isFalling = true;
    voxel.fallDirection = {
      x: Math.cos(fallAngle),
      y: Math.sin(fallAngle)
    };

    world.eventBus.emit({
      type: 'voxel_resource:tree_falling',
      source: entity.id,
      data: { position: pos, height: voxel.height }
    });
  }

  private processFall(
    entity: Entity,
    voxel: VoxelResourceComponent,
    pos: PositionComponent,
    world: World
  ): void {
    // Drop ALL remaining wood at fall location
    const totalWood = voxel.height * voxel.blocksPerLevel;
    const fallPos = {
      x: pos.x + (voxel.fallDirection!.x * voxel.height),
      y: pos.y + (voxel.fallDirection!.y * voxel.height)
    };

    this.dropResources(world, fallPos, voxel.material, totalWood);

    // Remove tree entity
    world.removeEntity(entity.id);

    world.eventBus.emit({
      type: 'voxel_resource:tree_fell',
      source: entity.id,
      data: { fallPosition: fallPos, resourcesDropped: totalWood }
    });
  }

  private dropResources(
    world: World,
    pos: { x: number; y: number },
    material: string,
    amount: number
  ): void {
    // Create resource item entity at fall location
    // Agents can then gather from here
    // Implementation omitted for brevity
  }
}
```

**Key Mechanic:** Cut from the top → tree stays standing, levels removed one by one. Cut from the base → entire tree falls, drops everything at once. This encourages strategic harvesting.

---

## Part 3: Blueprint System

### String-Based Layouts

Building blueprints use ASCII art for intuitive design:

```typescript
// packages/core/src/buildings/TileBasedBlueprintRegistry.ts

export interface TileBasedBlueprint {
  id: string;
  name: string;

  // ASCII layout: # = wall, . = floor, D = door, W = window
  layoutString: string[];

  // Material costs (total for entire building)
  resourceCost: ResourceCost[];

  // Per-tile costs (for construction system)
  wallMaterial: WallMaterial;
  floorMaterial?: string;
  doorMaterial?: DoorMaterial;

  // Metadata
  category: 'shelter' | 'storage' | 'crafting' | 'social';
  provides: BuildingFunction[];
}

// Example: Simple Hut
const simpleHut: TileBasedBlueprint = {
  id: 'simple_hut',
  name: 'Simple Hut',
  layoutString: [
    "#####",
    "#...#",
    "#...D",  // Door on right wall
    "#...#",
    "#####"
  ],
  resourceCost: [
    { resourceId: 'wood', amountRequired: 40 },
    { resourceId: 'plant_fiber', amountRequired: 20 }
  ],
  wallMaterial: 'wood',
  floorMaterial: 'dirt',
  doorMaterial: 'wood',
  category: 'shelter',
  provides: ['shelter', 'insulation']
};

// Example: Storage Barn with Interior Wall
const storageBarn: TileBasedBlueprint = {
  id: 'storage_barn',
  name: 'Storage Barn',
  layoutString: [
    "#######",
    "#.....#",
    "#.#...#",  // Interior wall divides space
    "#.D...D",  // Two doors
    "#.#...#",
    "#.....#",
    "#######"
  ],
  resourceCost: [
    { resourceId: 'wood', amountRequired: 80 },
    { resourceId: 'stone', amountRequired: 20 }
  ],
  wallMaterial: 'wood',
  floorMaterial: 'wood',
  doorMaterial: 'wood',
  category: 'storage',
  provides: ['storage', 'organization']
};
```

**Why string layouts?** They're human-readable, easy to design, and map directly to tile coordinates. A designer can sketch a building in text and see exactly how it will look.

---

## Part 4: Construction System with Material Transport

### Two-Phase Construction

Building is not instant—it requires **fetching materials** then **placing tiles**.

```typescript
// packages/core/src/systems/TileConstructionSystem.ts

export interface ConstructionTask {
  id: string;
  blueprintId: string;
  origin: { x: number; y: number };  // Bottom-left corner

  // Tile construction queue
  tiles: TileTask[];

  // Global material pool (agents deliver here first)
  materialPool: Map<string, number>;  // resourceId -> quantity

  // State
  status: 'gathering' | 'building' | 'complete';
  workersInvolved: string[];  // Agent IDs for XP/relationships
}

export interface TileTask {
  tileType: 'wall' | 'floor' | 'door';
  position: { x: number; y: number };
  material: string;

  // Material costs for THIS tile
  materialsRequired: ResourceCost[];
  materialsAllocated: Map<string, number>;

  // Progress
  constructionProgress: number;  // 0-100
  currentBuilder?: string;  // Agent ID
}

export class TileConstructionSystem implements System {
  readonly id = 'tile_construction';
  readonly priority = 40;

  private tasks: Map<string, ConstructionTask> = new Map();

  // Called when agent wants to start a building
  createConstructionTask(
    blueprintId: string,
    origin: { x: number; y: number },
    world: World
  ): ConstructionTask {
    const blueprint = world.blueprintRegistry.get(blueprintId);

    // Parse layout string into tile tasks
    const tiles: TileTask[] = [];
    for (let y = 0; y < blueprint.layoutString.length; y++) {
      const row = blueprint.layoutString[y];
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        if (char === '#') {
          tiles.push({
            tileType: 'wall',
            position: { x: origin.x + x, y: origin.y + y },
            material: blueprint.wallMaterial,
            materialsRequired: [
              { resourceId: 'wood', amountRequired: 2 }  // Per wall tile
            ],
            materialsAllocated: new Map(),
            constructionProgress: 0
          });
        } else if (char === 'D') {
          tiles.push({
            tileType: 'door',
            position: { x: origin.x + x, y: origin.y + y },
            material: blueprint.doorMaterial,
            materialsRequired: [
              { resourceId: 'wood', amountRequired: 4 }  // Doors cost more
            ],
            materialsAllocated: new Map(),
            constructionProgress: 0
          });
        }
        // Floor tiles handled separately (or included in wall cost)
      }
    }

    const task: ConstructionTask = {
      id: `task_${Date.now()}`,
      blueprintId,
      origin,
      tiles,
      materialPool: new Map(),
      status: 'gathering',
      workersInvolved: []
    };

    this.tasks.set(task.id, task);
    return task;
  }

  update(world: World, entities: Entity[], deltaTime: number): void {
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'complete') continue;

      // Check if we have enough materials in pool
      if (task.status === 'gathering') {
        if (this.hasSufficientMaterials(task)) {
          task.status = 'building';
          world.eventBus.emit({
            type: 'construction:ready_to_build',
            data: { taskId, blueprintId: task.blueprintId }
          });
        }
      }

      // Check if all tiles complete
      if (task.status === 'building') {
        const allComplete = task.tiles.every(t => t.constructionProgress >= 100);
        if (allComplete) {
          this.completeConstruction(task, world);
        }
      }
    }
  }

  // Agent behavior: Deliver materials to construction site
  deliverMaterial(
    taskId: string,
    agentId: string,
    resourceId: string,
    amount: number,
    world: World
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Construction task ${taskId} not found`);

    // Add to material pool
    const current = task.materialPool.get(resourceId) || 0;
    task.materialPool.set(resourceId, current + amount);

    // Track worker involvement
    if (!task.workersInvolved.includes(agentId)) {
      task.workersInvolved.push(agentId);
    }

    // Award XP for material delivery
    world.eventBus.emit({
      type: 'skills:xp_gained',
      source: agentId,
      data: {
        skill: 'building',
        amount: 5 * amount,  // 5 XP per material delivered
        reason: 'material_delivery'
      }
    });

    world.eventBus.emit({
      type: 'construction:material_delivered',
      source: agentId,
      data: { taskId, resourceId, amount }
    });
  }

  // Agent behavior: Work on a tile
  workOnTile(
    taskId: string,
    tileIndex: number,
    agentId: string,
    workAmount: number,  // Based on deltaTime and skill
    world: World
  ): void {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'building') return;

    const tile = task.tiles[tileIndex];
    if (!tile || tile.constructionProgress >= 100) return;

    // Allocate materials from pool if needed
    if (!this.allocateMaterialsForTile(task, tile)) {
      // Not enough materials in pool yet
      return;
    }

    // Advance construction
    tile.currentBuilder = agentId;
    tile.constructionProgress = Math.min(100, tile.constructionProgress + workAmount);

    // Track involvement
    if (!task.workersInvolved.includes(agentId)) {
      task.workersInvolved.push(agentId);
    }

    // Tile complete?
    if (tile.constructionProgress >= 100) {
      this.placeTile(tile, world);

      // Award XP for tile completion
      world.eventBus.emit({
        type: 'skills:xp_gained',
        source: agentId,
        data: {
          skill: 'building',
          amount: 10,  // 10 XP per tile placed
          reason: 'tile_placed'
        }
      });

      // Improve relationships with other workers
      this.improveSocialBonds(agentId, task.workersInvolved, world);
    }
  }

  private improveSocialBonds(
    agentId: string,
    allWorkers: string[],
    world: World
  ): void {
    // Building together improves relationships
    for (const otherId of allWorkers) {
      if (otherId === agentId) continue;

      world.eventBus.emit({
        type: 'social:relationship_improved',
        source: agentId,
        data: {
          targetId: otherId,
          amount: 2,  // +2 relationship per tile built together
          reason: 'collaborative_building'
        }
      });
    }
  }

  private placeTile(tile: TileTask, world: World): void {
    const chunk = world.getChunkAt(tile.position.x, tile.position.y);
    const localX = tile.position.x % chunk.width;
    const localY = tile.position.y % chunk.height;
    const tileData = chunk.getTile(localX, localY);

    if (tile.tileType === 'wall') {
      tileData.wall = {
        material: tile.material as WallMaterial,
        condition: 100,
        insulation: this.getInsulationValue(tile.material)
      };
    } else if (tile.tileType === 'door') {
      tileData.door = {
        material: tile.material as DoorMaterial,
        state: 'closed',
        constructionProgress: undefined  // No longer under construction
      };
    }

    world.eventBus.emit({
      type: 'construction:tile_placed',
      data: { position: tile.position, tileType: tile.tileType }
    });
  }

  private completeConstruction(task: ConstructionTask, world: World): void {
    task.status = 'complete';

    world.eventBus.emit({
      type: 'construction:building_complete',
      data: {
        taskId: task.id,
        blueprintId: task.blueprintId,
        workers: task.workersInvolved
      }
    });

    // Award bonus XP to all workers
    for (const workerId of task.workersInvolved) {
      world.eventBus.emit({
        type: 'skills:xp_gained',
        source: workerId,
        data: {
          skill: 'building',
          amount: 50,  // Bonus for completing entire building
          reason: 'building_complete'
        }
      });
    }
  }

  private hasSufficientMaterials(task: ConstructionTask): boolean {
    // Calculate total materials needed across all tiles
    const needed = new Map<string, number>();
    for (const tile of task.tiles) {
      for (const cost of tile.materialsRequired) {
        const current = needed.get(cost.resourceId) || 0;
        needed.set(cost.resourceId, current + cost.amountRequired);
      }
    }

    // Check if pool has enough
    for (const [resourceId, amount] of needed) {
      const available = task.materialPool.get(resourceId) || 0;
      if (available < amount) return false;
    }

    return true;
  }

  private allocateMaterialsForTile(task: ConstructionTask, tile: TileTask): boolean {
    // Check if this tile already has materials allocated
    if (tile.materialsAllocated.size > 0) return true;

    // Try to allocate from pool
    for (const cost of tile.materialsRequired) {
      const available = task.materialPool.get(cost.resourceId) || 0;
      if (available < cost.amountRequired) return false;
    }

    // Deduct from pool, allocate to tile
    for (const cost of tile.materialsRequired) {
      const current = task.materialPool.get(cost.resourceId)!;
      task.materialPool.set(cost.resourceId, current - cost.amountRequired);
      tile.materialsAllocated.set(cost.resourceId, cost.amountRequired);
    }

    return true;
  }

  private getInsulationValue(material: string): number {
    const values: Record<string, number> = {
      wood: 5,
      stone: 8,
      mud_brick: 6,
      ice: 3,
      metal: 2
    };
    return values[material] || 5;
  }
}
```

### Emergent Collaboration

**There is no "collaboration bonus."** When multiple agents work on a building:
- Agent A delivers wood to material pool → 5 XP per delivery
- Agent B delivers stone to material pool → 5 XP per delivery
- Agent A works on wall tile 1 → Advances progress based on skill/time
- Agent B works on wall tile 2 → Advances progress based on skill/time
- Both complete tiles → +2 relationship with each other

**Result:** 2 agents = 2x throughput. 3 agents = 3x throughput. No artificial mechanics, just natural parallelization.

---

## Part 5: Room Detection

### Flood-Fill Algorithm

Once walls are placed, detect rooms automatically:

```typescript
// packages/core/src/systems/RoomDetectionSystem.ts

export interface Room {
  id: string;
  tiles: { x: number; y: number }[];
  walls: { x: number; y: number }[];
  doors: { x: number; y: number }[];

  // Calculated properties
  area: number;
  insulation: number;       // Average of wall materials
  temperature: number;      // Local temperature (affected by insulation)

  // Functionality
  category?: 'bedroom' | 'storage' | 'workshop' | 'common';
}

export class RoomDetectionSystem implements System {
  readonly id = 'room_detection';
  readonly priority = 35;

  private rooms: Map<string, Room> = new Map();

  update(world: World, entities: Entity[], deltaTime: number): void {
    // Re-detect rooms when construction events occur
    // For now, run on interval
  }

  detectRooms(world: World): Room[] {
    const rooms: Room[] = [];
    const visited = new Set<string>();

    // Scan all chunks for enclosed spaces
    for (const chunk of world.chunks) {
      for (let y = 0; y < chunk.height; y++) {
        for (let x = 0; x < chunk.width; x++) {
          const worldX = chunk.x * chunk.width + x;
          const worldY = chunk.y * chunk.height + y;
          const key = `${worldX},${worldY}`;

          if (visited.has(key)) continue;

          const tile = chunk.getTile(x, y);
          if (tile.wall) continue;  // Start flood-fill from empty tiles

          const room = this.floodFillRoom(world, worldX, worldY, visited);
          if (room && this.isEnclosed(room, world)) {
            rooms.push(room);
          }
        }
      }
    }

    return rooms;
  }

  private floodFillRoom(
    world: World,
    startX: number,
    startY: number,
    visited: Set<string>
  ): Room | null {
    const tiles: { x: number; y: number }[] = [];
    const walls: { x: number; y: number }[] = [];
    const doors: { x: number; y: number }[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const tile = this.getTileAt(world, x, y);
      if (!tile) continue;

      if (tile.wall) {
        walls.push({ x, y });
        continue;
      }

      if (tile.door) {
        doors.push({ x, y });
        // Doors don't block room detection, but we note them
      }

      tiles.push({ x, y });

      // Add neighbors to queue
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }

    if (tiles.length === 0) return null;

    return {
      id: `room_${Date.now()}_${Math.random()}`,
      tiles,
      walls,
      doors,
      area: tiles.length,
      insulation: this.calculateInsulation(walls, world),
      temperature: 20,  // Will be calculated by TemperatureSystem
      category: this.categorizeRoom(tiles, walls, doors)
    };
  }

  private isEnclosed(room: Room, world: World): boolean {
    // A room is enclosed if flood-fill hit walls on all sides
    // Simple check: room must have at least 4 walls
    return room.walls.length >= 4;
  }

  private calculateInsulation(
    walls: { x: number; y: number }[],
    world: World
  ): number {
    if (walls.length === 0) return 0;

    let totalInsulation = 0;
    for (const { x, y } of walls) {
      const tile = this.getTileAt(world, x, y);
      if (tile?.wall) {
        totalInsulation += tile.wall.insulation;
      }
    }

    return totalInsulation / walls.length;
  }

  private categorizeRoom(
    tiles: { x: number; y: number }[],
    walls: { x: number; y: number }[],
    doors: { x: number; y: number }[]
  ): 'bedroom' | 'storage' | 'workshop' | 'common' {
    // Simple heuristic: small rooms with one door = bedroom
    if (tiles.length < 20 && doors.length === 1) return 'bedroom';
    if (tiles.length > 50) return 'common';
    return 'workshop';  // Default
  }

  private getTileAt(world: World, x: number, y: number): Tile | null {
    const chunk = world.getChunkAt(x, y);
    if (!chunk) return null;
    const localX = x % chunk.width;
    const localY = y % chunk.height;
    return chunk.getTile(localX, localY);
  }
}
```

---

## Part 6: Temperature Integration

### Per-Room Temperature

Rooms with better insulation retain heat/cold:

```typescript
// Update to packages/core/src/systems/TemperatureSystem.ts

// In update loop:
for (const room of world.roomDetectionSystem.rooms) {
  // Room temperature is influenced by:
  // 1. Ambient outdoor temperature
  // 2. Insulation (slows heat transfer)
  // 3. Heat sources (campfires, agents)

  const outdoorTemp = world.environment.temperature;
  const heatTransferRate = 1.0 / (1.0 + room.insulation * 0.1);

  // Slowly equalize with outdoor temp
  room.temperature += (outdoorTemp - room.temperature) * heatTransferRate * deltaTime;

  // Heat sources in room
  for (const { x, y } of room.tiles) {
    const entities = world.getEntitiesAt(x, y);
    for (const entity of entities) {
      if (entity.hasComponent('heat_source')) {
        const heat = entity.getComponent<HeatSourceComponent>('heat_source');
        room.temperature += heat.heatOutput * deltaTime;
      }
    }
  }
}
```

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **Chunk/Tile System** - Foundation for tile-based world structure
- **Pathfinding** - Navigation around walls and through doors
- **Temperature System** - Per-tile temperature for room insulation mechanics
- **Material/Item System** - Wood, stone, and other building materials

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **Magic System** - Instant tile placement via material creation spells
- **Social System** - Building together improves agent relationships organically

### Enables (Dependent Systems)
These systems build on top of this spec:
- **Automation & Logistics** - Automated construction with robots and conveyor belts
- **Room-Based Mechanics** - Temperature, sleep quality, and status effects based on rooms
- **Realistic Shelter** - True physical protection from weather and threats

---

## Implementation Checklist

### Phase 1: Core Tile Infrastructure
- [ ] Extend `Tile` interface with `wall`, `door`, `window` fields
- [ ] Create `WallTile`, `DoorTile`, `WindowTile` interfaces
- [ ] Update `ChunkData` to support new tile properties
- [ ] Write tests for tile data structures

**Dependencies:** None
**Integration Points:** `packages/world/src/chunks/Tile.ts`

### Phase 2: Voxel Resource System
- [ ] Create `VoxelResourceComponent` with height/stability fields
- [ ] Create `TreeFellingSystem` for falling physics
- [ ] Update `GatherBehavior` to handle voxel harvesting
- [ ] Add stability calculation (base cut = tree falls)
- [ ] Implement resource dropping on fall
- [ ] Write tests for tree felling physics

**Dependencies:** Phase 1 (tile system)
**Integration Points:** `GatherBehavior`, existing tree entities

### Phase 3: Blueprint System
- [ ] Create `TileBasedBlueprint` interface
- [ ] Create `TileBasedBlueprintRegistry` singleton
- [ ] Add default blueprints (hut, barn, workshop)
- [ ] Implement layout string parser
- [ ] Write tests for blueprint parsing

**Dependencies:** Phase 1
**Integration Points:** `BuildingBlueprintRegistry`

### Phase 4: Construction System with Material Transport
- [ ] Create `ConstructionTask` and `TileTask` interfaces
- [ ] Create `TileConstructionSystem` ECS system
- [ ] Implement `createConstructionTask()` from blueprint
- [ ] Implement `deliverMaterial()` for agent material delivery
- [ ] Implement `workOnTile()` for construction progress
- [ ] Add material pool management
- [ ] Add XP rewards (5 XP per material, 10 XP per tile)
- [ ] Add relationship bonding (+2 per tile)
- [ ] Create `MaterialTransportBehavior` for agents
- [ ] Update `BuildBehavior` to use new construction system
- [ ] Emit construction events
- [ ] Write tests for construction workflow

**Dependencies:** Phase 3 (blueprints)
**Integration Points:** `AISystem`, progression system, relationship system

### Phase 5: Room Detection
- [ ] Create `Room` interface
- [ ] Create `RoomDetectionSystem` ECS system
- [ ] Implement flood-fill algorithm
- [ ] Implement enclosure validation
- [ ] Calculate room properties (area, insulation)
- [ ] Add room categorization logic
- [ ] Write tests for room detection

**Dependencies:** Phase 4 (tiles must be placed first)
**Integration Points:** `TemperatureSystem`

### Phase 6: Temperature Integration
- [ ] Update `TemperatureSystem` to use room data
- [ ] Implement per-room temperature calculation
- [ ] Add insulation effects on heat transfer
- [ ] Add heat source detection in rooms
- [ ] Write tests for room temperature

**Dependencies:** Phase 5 (room detection)
**Integration Points:** `TemperatureSystem`, heat source entities

### Phase 7: Pathfinding Integration
- [ ] Update `MovementSystem` to check tile walls
- [ ] Implement door traversal (open → pass → close)
- [ ] Add auto-close timer for doors
- [ ] Update pathfinding to treat walls as obstacles
- [ ] Write tests for navigation through buildings

**Dependencies:** Phase 1, Phase 4
**Integration Points:** `MovementSystem`, pathfinding

### Phase 8: Material Magic
- [ ] Update `MaterialCreationSpells` to place tiles
- [ ] Add `CreateWallSpell`, `CreateDoorSpell`
- [ ] Implement instant tile placement (no construction time)
- [ ] Write tests for magic construction

**Dependencies:** Phase 1
**Integration Points:** `MagicSystem`, spell registry

### Phase 9: Renderer Updates
- [ ] Add wall rendering (vertical sprites)
- [ ] Add door rendering (open/closed states)
- [ ] Add construction progress overlay
- [ ] Add room highlight visualization
- [ ] Update building placement UI
- [ ] Write visual tests

**Dependencies:** All previous phases
**Integration Points:** `packages/renderer`

### Phase 10: Migration & Polish
- [ ] Create migration script for old buildings
- [ ] Add backward compatibility layer
- [ ] Update building registry defaults
- [ ] Add demolition system (optional)
- [ ] Performance optimization (chunk caching)
- [ ] Write integration tests
- [ ] Update documentation

**Dependencies:** All previous phases
**Integration Points:** Save/load system, existing buildings

---

## Research Questions

1. **Partially-built walls block movement?**
   - **Proposal:** Yes, walls are impassable from 50% construction onward. This prevents agents from walking through half-built structures.

2. **Doors auto-close after N seconds?**
   - **Proposal:** Yes, 5 seconds (300 ticks at 60 TPS). Prevents heat loss from open doors.

3. **Visualization for under-construction tiles?**
   - **Proposal:** Semi-transparent sprite with progress bar overlay. Different sprite states at 0%, 25%, 50%, 75%, 100%.

4. **Demolition material recovery?**
   - **Proposal:** Partial recovery (50% of materials). Full recovery would make building/demolition spam too powerful.

5. **How do agents decide which tile to work on?**
   - **Proposal:** Nearest incomplete tile with allocated materials. If no materials allocated, switch to material delivery behavior.

6. **Multiple agents working same tile?**
   - **Proposal:** No. Only one `currentBuilder` per tile. Prevents coordination complexity.

7. **Room detection performance?**
   - **Proposal:** Only run when `construction:tile_placed` event fires, and only in modified chunk. Cache results.

8. **Windows vs walls for temperature?**
   - **Proposal:** Windows have lower insulation but allow light. Future: solar heating through windows.

---

## Files to Create

- `packages/world/src/chunks/Tile.ts` - Updated with wall/door/window fields
- `packages/core/src/components/VoxelResourceComponent.ts` - NEW
- `packages/core/src/systems/RoomDetectionSystem.ts` - NEW
- `packages/core/src/systems/TileConstructionSystem.ts` - NEW
- `packages/core/src/systems/TreeFellingSystem.ts` - NEW
- `packages/core/src/behaviors/MaterialTransportBehavior.ts` - NEW
- `packages/core/src/buildings/TileBasedBlueprintRegistry.ts` - NEW

## Files to Modify

- `packages/core/src/entities/TreeEntity.ts` - Use VoxelResourceComponent
- `packages/core/src/behaviors/GatherBehavior.ts` - Voxel harvesting + felling
- `packages/core/src/behaviors/BuildBehavior.ts` - Use TileConstructionSystem
- `packages/core/src/systems/TemperatureSystem.ts` - Per-room temperature
- `packages/core/src/systems/MovementSystem.ts` - Check tile walls/doors
- `packages/core/src/magic/MaterialCreationSpells.ts` - Place tiles, not entities
- `packages/core/src/systems/ProgressionSystem.ts` - Add XP hooks (if exists)
- `packages/core/src/systems/RelationshipSystem.ts` - Add bonding hooks (if exists)

---

## Backward Compatibility

**Existing crafting benches remain monolithic entities.** Not everything needs to be tile-based. A workbench is a single object, not a collection of tiles.

**Old buildings coexist with new tile-based buildings.** Migration is optional. Old building entities can be converted to tile layouts via a one-time script.

**Temperature system supports both approaches.** If an entity has a `BuildingComponent` with `insulation` field, use that. Otherwise, check if entity is inside a detected room.

---

## Success Criteria

✅ Agents can place wall tiles individually
✅ Trees fall when base is cut, dropping all wood
✅ Rooms are detected via flood-fill
✅ Room temperature differs from outdoor temperature based on insulation
✅ Multiple agents working on same building = 2x-3x throughput
✅ Agents earn XP for material delivery and tile placement
✅ Agents improve relationships when building together
✅ Buildings use string-based layouts (ASCII art)
✅ Construction requires fetching materials first
✅ All tests pass

---

## Inspiration

This system draws from:
- **RimWorld** - Tile-based construction, room stats, temperature per room
- **Dwarf Fortress** - Material hauling, emergent collaboration, room quality
- **Oxygen Not Included** - Gas simulation, insulation mechanics
- **The spirit of emergence** - No artificial collaboration bonuses, just agents working independently creating complex outcomes
