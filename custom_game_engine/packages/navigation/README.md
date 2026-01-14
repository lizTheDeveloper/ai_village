# Navigation Package - Movement and Pathfinding Systems

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the navigation system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Navigation Package** (`@ai-village/navigation`) implements intelligent movement, steering behaviors, and exploration algorithms for entities in the game world. It provides smooth, physics-based navigation with obstacle avoidance, dynamic collision handling, and frontier-based exploration.

**What it does:**
- Physics-based movement with velocity, collision detection, and fatigue penalties
- Steering behaviors (seek, arrive, wander, obstacle avoidance, combined)
- Dynamic collision handling (hard collisions block, soft collisions slow)
- Frontier and spiral exploration algorithms for territory mapping
- Containment bounds to keep entities within designated areas
- Chunk-based spatial optimization for performance

**Key files:**
- `src/systems/MovementSystem.ts` - Physics and collision (priority 20)
- `src/systems/SteeringSystem.ts` - Steering behaviors (priority 15)
- `src/systems/ExplorationSystem.ts` - Exploration algorithms (priority 25)

---

## Package Structure

```
packages/navigation/
├── src/
│   ├── systems/
│   │   ├── MovementSystem.ts         # Physics, velocity, collision detection
│   │   ├── SteeringSystem.ts         # Seek, arrive, wander, obstacle avoidance
│   │   └── ExplorationSystem.ts      # Frontier and spiral exploration
│   └── index.ts                      # Package exports
├── package.json
└── README.md                         # This file

packages/core/src/components/
├── MovementComponent.ts              # Velocity and speed state
├── VelocityComponent.ts              # Current velocity (vx, vy)
├── SteeringComponent.ts              # Steering behavior configuration
└── ExplorationStateComponent.ts      # Explored sectors tracking
```

---

## Core Concepts

### 1. Movement vs Steering

**Two-phase navigation system:**

```typescript
// Phase 1: SteeringSystem (priority 15) calculates forces
// - Reads steering.behavior and steering.target
// - Calculates steering force based on behavior
// - Updates velocity.vx and velocity.vy

// Phase 2: MovementSystem (priority 20) applies velocity
// - Reads velocity.vx and velocity.vy
// - Applies deltaTime and time acceleration
// - Checks collisions and updates position
```

**Component separation:**
- `MovementComponent`: Base speed, current velocity (legacy)
- `VelocityComponent`: Actual velocity vector used by steering
- `SteeringComponent`: Behavior configuration (target, maxSpeed, etc.)

**Integration:**
```typescript
// MovementSystem syncs VelocityComponent → MovementComponent when steering is active
if (steering.behavior !== 'none') {
  movement.velocityX = velocity.vx;
  movement.velocityY = velocity.vy;
}
```

### 2. Steering Behaviors

Six steering behaviors for intelligent navigation:

```typescript
type SteeringBehavior =
  | 'seek'                // Move toward target at max speed
  | 'arrive'              // Slow down when approaching target
  | 'obstacle_avoidance'  // Steer around obstacles
  | 'wander'              // Random but coherent movement
  | 'combined'            // Blend multiple behaviors with weights
  | 'none';               // No steering (manual control)
```

**Behavior details:**

1. **Seek**: Direct movement toward `steering.target`
   - Always moves at `maxSpeed`
   - No slowdown near target
   - Good for: Chasing, long-distance travel

2. **Arrive**: Smart approach with deceleration
   - Slows within `slowingRadius` (default: 5 tiles)
   - Stops at `arrivalTolerance` (default: 1 tile)
   - Uses `deadZone` (default: 0.5) to prevent micro-adjustments
   - Includes stuck detection (triggers jitter after 3 seconds)
   - Good for: Precise positioning, building construction, social interactions

3. **Obstacle Avoidance**: Steer around obstacles
   - Ray-casts ahead by `lookAheadDistance` (default: 2 tiles)
   - Steers perpendicular to heading to go around obstacle
   - Uses chunk-based spatial index for performance
   - Good for: Navigating crowded areas, avoiding buildings

4. **Wander**: Coherent random movement
   - Maintains `wanderAngle` for smooth direction changes
   - Projects circle ahead by `wanderDistance` (default: 3 tiles)
   - Adds jitter of `wanderJitter` (default: 0.1) per frame
   - Good for: Idle behavior, exploration, ambient life

5. **Combined**: Weighted blend of multiple behaviors
   ```typescript
   steering.behaviors = [
     { type: 'seek', target: goal, weight: 1.0 },
     { type: 'obstacle_avoidance', weight: 2.0 },
   ];
   ```
   - Forces are weighted and summed
   - Higher weights = stronger influence
   - Good for: Complex navigation with multiple goals

6. **None**: No steering forces applied
   - Velocity controlled manually or by other systems
   - Good for: Scripted movement, cutscenes, external physics

### 3. Collision Detection

**Two collision types:**

**Hard Collisions** (complete blocking):
- Buildings with `blocksMovement: true`
- Water terrain (`water`, `deep_water`)
- Walls with construction progress ≥ 50%
- Closed/locked doors
- Windows
- Elevation changes > 2 levels

**Soft Collisions** (speed penalty):
- Nearby agents/physics entities
- Radius: 0.8 tiles
- Penalty: Linear interpolation from 1.0 (no overlap) to 0.2 (full overlap)
- Agents can push through each other but move slower

**Collision response:**
```typescript
// Hard collision: Try perpendicular directions (wall sliding)
if (hasHardCollision(newX, newY)) {
  const perpendicular1 = rotate90(velocity);
  const perpendicular2 = rotate270(velocity);

  if (!hasHardCollision(perp1)) {
    position = perp1; // Slide along wall
  } else {
    velocity = 0;     // Completely blocked
  }
}

// Soft collision: Graduated speed penalty
const penalty = getSoftCollisionPenalty(newX, newY); // 0.2-1.0
position += velocity * penalty * deltaTime;
```

### 4. Containment Bounds

**Keep entities within designated areas:**

```typescript
interface ContainmentBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

steering.containmentBounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
steering.containmentMargin = 10; // Apply force when within 10 tiles of edge
```

**How it works:**
- Applies graduated force toward center when near edge
- Force increases as entity approaches boundary
- If entity exits bounds completely, strongly seeks center
- Applied **after** primary steering behavior (all behaviors respect containment)

**Use cases:**
- Keep villagers within city bounds
- Confine animals to pastures
- Restrict NPCs to designated zones
- Arena boundaries for combat

### 5. Exploration Algorithms

**Two exploration modes:**

**Frontier Exploration** (`mode: 'frontier'`):
- Identifies unexplored sectors adjacent to explored territory
- Targets closest frontier sector
- Expands known territory outward from current position
- Good for: Organic exploration, resource discovery

**Spiral Exploration** (`mode: 'spiral'`):
- Spirals outward from `homeBase` in square pattern
- Guarantees complete coverage of area
- Visits sectors in predictable order
- Good for: Systematic surveying, building placement scouting

**Sector-based tracking:**
- World divided into 16×16 tile sectors
- Tracks explored sectors, exploration count, resources found
- Coverage calculation: `exploredSectors / totalSectors`
- Milestone events at 25%, 50%, 75%, 90% coverage

### 6. Pathfinding (Future Work)

**Status:** Planned but not yet implemented (see `TODO.md`)

**Current behavior:**
- Agents use steering behaviors (seek, arrive, obstacle_avoidance)
- Stuck agents (3+ seconds) use random jitter to try different angles
- Works well for open spaces but can struggle with complex obstacles

**Planned A* pathfinding integration:**
```typescript
// Future: When agent stuck, calculate path around obstacles
if (isStuck(entity)) {
  const path = await pathfindingSystem.findPath(position, target);
  steering.waypoints = path;
  steering.behavior = 'follow_path';
}
```

**Use cases for pathfinding:**
- Navigating around buildings and walls
- Finding routes through complex terrain
- Multi-waypoint paths for long-distance travel
- Dynamic path recalculation when obstacles change

**Current workaround:**
- Obstacle avoidance behavior steers around nearby obstacles
- Combined behaviors (seek + obstacle_avoidance) work for most cases
- Stuck detection adds random jitter after 3 seconds
- See troubleshooting section for stuck agent handling

### 7. Performance Optimizations

**Chunk-based spatial index:**
- World divided into 32×32 tile chunks
- Collision checks only query nearby chunks (3×3 grid = 9 chunks max)
- Avoids O(n²) entity-vs-entity checks

**Query caching:**
- Building positions cached for 20 ticks (1 second)
- Time entity ID cached permanently (singleton)
- Cache invalidated on building placement/destruction

**Squared distance comparisons:**
```typescript
// ❌ BAD: sqrt in hot path
if (Math.sqrt(dx*dx + dy*dy) < radius) { }

// ✅ GOOD: Squared comparison (no sqrt)
if (dx*dx + dy*dy < radius*radius) { }
```

**Early exit optimizations:**
- Manhattan distance check before precise distance
- Chunk boundary checks before entity iteration
- Behavior type validation (no redundant checks)

---

## System APIs

### MovementSystem (Priority 20)

Applies velocity to position with collision detection and fatigue penalties.

**Dependencies:** `TimeSystem` (priority 3)

**Update interval:** Every tick

**Key methods:**

```typescript
class MovementSystem {
  // Called once at system initialization
  initialize(world: World, eventBus: EventBus): void;

  // Called every tick with entities that have [movement, position] components
  update(world: World, entities: Entity[], deltaTime: number): void;
}
```

**Internal methods (reference only):**
```typescript
// Collision detection
private hasHardCollision(world: World, entityId: string, x: number, y: number): boolean;
private getSoftCollisionPenalty(world: World, entityId: string, x: number, y: number): number;

// Position updates
private updatePosition(impl: EntityImpl, x: number, y: number): void;
private stopEntity(impl: EntityImpl, velocity?: VelocityComponent): void;

// Cache management
private getBuildingCollisions(world: World): BuildingCollisionData[];
```

**Events emitted:** None (reads from other systems)

**Component syncing:**

```typescript
// Syncs VelocityComponent → MovementComponent when steering is active
if (steering.behavior !== 'none') {
  movement.velocityX = velocity.vx;
  movement.velocityY = velocity.vy;
}
```

**Fatigue penalty calculation:**

```typescript
// Energy-based speed multiplier (from NeedsComponent)
if (needs.energy < 10)  speedMultiplier = 0.4; // -60% speed
if (needs.energy < 30)  speedMultiplier = 0.6; // -40% speed
if (needs.energy < 50)  speedMultiplier = 0.8; // -20% speed
// else: no penalty (100%)

// Applied to position update
deltaX = velocityX * speedMultiplier * deltaTime * timeAcceleration;
```

**Sleeping prevention:**

```typescript
// Agents cannot move while sleeping (CircadianComponent.isSleeping)
if (circadian.isSleeping) {
  movement.velocityX = 0;
  movement.velocityY = 0;
  velocity.vx = 0;
  velocity.vy = 0;
  continue; // Skip movement this tick
}
```

**Creating moving entities:**

```typescript
import { MovementComponent, VelocityComponent } from '@ai-village/core';

const entity = world.createEntity();
entity.addComponent({
  type: 'position',
  x: 50,
  y: 50,
  chunkX: 1,
  chunkY: 1,
});
entity.addComponent({
  type: 'movement',
  velocityX: 0,
  velocityY: 0,
  speed: 5.0, // tiles/second
});
entity.addComponent({
  type: 'velocity',
  vx: 0,
  vy: 0,
});
```

**Reading movement state:**

```typescript
const entities = world.query().with('movement').with('position').executeEntities();

for (const entity of entities) {
  const movement = entity.getComponent<MovementComponent>('movement');
  const position = entity.getComponent<PositionComponent>('position');

  console.log(`Position: (${position.x}, ${position.y})`);
  console.log(`Velocity: (${movement.velocityX}, ${movement.velocityY})`);
  console.log(`Speed: ${movement.speed} tiles/sec`);
}
```

### SteeringSystem (Priority 15)

Calculates steering forces and updates velocity based on behavior configuration.

**Dependencies:** `AgentBrainSystem` (priority 10)

**Update interval:** Every tick

**Key methods:**

```typescript
class SteeringSystem {
  // Called every tick with entities that have [steering, position, velocity] components
  update(world: World, entities: Entity[], deltaTime: number): void;
}
```

**Internal behavior methods:**
```typescript
private _seek(position, velocity, steering): Vector2;
private _arrive(position, velocity, steering, entityId?): Vector2;
private _avoidObstacles(entity, position, velocity, steering, world): Vector2;
private _wander(position, velocity, steering): Vector2;
private _combined(entity, position, velocity, steering, world): Vector2;
private _containment(position, velocity, steering): Vector2;
```

**Events emitted:** None

**Stuck detection:**

```typescript
// Arrive behavior tracks stuck agents
private stuckTracker: Map<string, {
  lastPos: Vector2;
  stuckTime: number;
  target: Vector2;
}>;

// If stuck for 3+ seconds, adds random jitter to try different angles
if (now - tracker.stuckTime > 3000) {
  desired.x += (Math.random() - 0.5) * 2;
  desired.y += (Math.random() - 0.5) * 2;
}
```

**Creating steering entities:**

```typescript
import { SteeringComponent, createSteeringComponent } from '@ai-village/core';

const entity = world.createEntity();

// Add position, velocity, movement components first
// ...

// Add steering component
entity.addComponent(createSteeringComponent('arrive', 5.0, 10.0));

// Or with full configuration
entity.addComponent({
  type: 'steering',
  behavior: 'arrive',
  maxSpeed: 5.0,
  maxForce: 10.0,
  target: { x: 100, y: 100 },
  slowingRadius: 8.0,
  arrivalTolerance: 1.0,
  deadZone: 0.5,
  containmentBounds: {
    minX: 0, maxX: 200,
    minY: 0, maxY: 200,
  },
  containmentMargin: 10,
});
```

**Changing steering behavior at runtime:**

```typescript
import { EntityImpl } from '@ai-village/core';

const impl = entity as EntityImpl;

// Update to seek behavior
impl.updateComponent('steering', (current) => ({
  ...current,
  behavior: 'seek',
  target: { x: 150, y: 150 },
}));

// Update to wander
impl.updateComponent('steering', (current) => ({
  ...current,
  behavior: 'wander',
  target: undefined,
}));

// Combined behaviors
impl.updateComponent('steering', (current) => ({
  ...current,
  behavior: 'combined',
  behaviors: [
    { type: 'seek', target: { x: 100, y: 100 }, weight: 1.0 },
    { type: 'obstacle_avoidance', weight: 2.0 },
    { type: 'wander', weight: 0.5 },
  ],
}));

// Disable steering
impl.updateComponent('steering', (current) => ({
  ...current,
  behavior: 'none',
}));
```

**Reading steering state:**

```typescript
const steering = entity.getComponent<SteeringComponent>('steering');

console.log(`Behavior: ${steering.behavior}`);
console.log(`Target: (${steering.target?.x}, ${steering.target?.y})`);
console.log(`Max Speed: ${steering.maxSpeed}, Max Force: ${steering.maxForce}`);
console.log(`Wander Angle: ${steering.wanderAngle}`);

if (steering.containmentBounds) {
  console.log(`Bounds: ${JSON.stringify(steering.containmentBounds)}`);
}
```

### ExplorationSystem (Priority 25)

Manages frontier and spiral exploration algorithms.

**Dependencies:** None (standalone)

**Update interval:** Every tick (but only processes entities with `exploration_state` component)

**Key methods:**

```typescript
class ExplorationSystem {
  // Calculate coverage percentage (0-1)
  calculateCoverage(entity: Entity): number;

  // Convert between world and sector coordinates
  worldToSector(worldPos: { x: number; y: number }): { x: number; y: number };
  sectorToWorld(sector: { x: number; y: number }): { x: number; y: number };
}
```

**Events emitted:**

```typescript
// Coverage milestones
'exploration:milestone' → {
  agentId: string,
  entityId: string,
  milestoneType: 'coverage_0.25' | 'coverage_0.5' | 'coverage_0.75' | 'coverage_0.9',
  location: { x: number, y: number }
}
```

**Creating exploration entities:**

```typescript
import { createExplorationStateComponent } from '@ai-village/core';

const entity = world.createEntity();

// Add position component first
entity.addComponent({
  type: 'position',
  x: 50,
  y: 50,
  chunkX: 1,
  chunkY: 1,
});

// Add exploration state - frontier mode
entity.addComponent(createExplorationStateComponent({
  mode: 'frontier',
  explorationRadius: 128,
}));

// Or spiral mode (requires homeBase)
entity.addComponent(createExplorationStateComponent({
  mode: 'spiral',
  homeBase: { x: 50, y: 50 },
  explorationRadius: 128,
}));
```

**Reading exploration state:**

```typescript
const exploration = entity.getComponent<ExplorationStateComponent>('exploration_state');

console.log(`Mode: ${exploration.mode}`);
console.log(`Explored sectors: ${exploration.getExploredSectorCount()}`);
console.log(`Coverage: ${(exploration.getExplorationCoverage() * 100).toFixed(1)}%`);

if (exploration.currentTarget) {
  console.log(`Current target: (${exploration.currentTarget.x}, ${exploration.currentTarget.y})`);
}

// Get frontier sectors
const frontier = exploration.getFrontierSectors();
console.log(`Frontier sectors: ${frontier.length}`);

// Check specific sector
const sector = exploration.worldToSector({ x: 100, y: 100 });
const isExplored = exploration.isSectorExplored(sector.x, sector.y);
console.log(`Sector (${sector.x}, ${sector.y}) explored: ${isExplored}`);
```

**Updating exploration at runtime:**

```typescript
import { EntityImpl } from '@ai-village/core';

const impl = entity as EntityImpl;

// Change mode to spiral
impl.updateComponent('exploration_state', (current) => {
  const exploration = current as ExplorationStateComponent;
  exploration.mode = 'spiral';
  exploration.homeBase = { x: 50, y: 50 };
  exploration.initializeSpiral({ x: 50, y: 50 });
  return current;
});

// Disable exploration
impl.updateComponent('exploration_state', (current) => {
  const exploration = current as ExplorationStateComponent;
  exploration.mode = 'none';
  exploration.currentTarget = undefined;
  return current;
});

// Increase exploration radius
impl.updateComponent('exploration_state', (current) => {
  const exploration = current as ExplorationStateComponent;
  exploration.setExplorationRadius(256);
  return current;
});
```

---

## Usage Examples

### Example 1: Basic Agent Movement with Steering

```typescript
import { World } from '@ai-village/core';
import { createSteeringComponent, createVelocityComponent } from '@ai-village/core';

const world = new World();

// Create moving agent
const agent = world.createEntity();

agent.addComponent({
  type: 'position',
  x: 50,
  y: 50,
  chunkX: 1,
  chunkY: 1,
});

agent.addComponent({
  type: 'movement',
  velocityX: 0,
  velocityY: 0,
  speed: 5.0,
});

agent.addComponent(createVelocityComponent());

agent.addComponent(createSteeringComponent('arrive', 5.0, 10.0));

// Set destination
const impl = agent as EntityImpl;
impl.updateComponent('steering', (current) => ({
  ...current,
  target: { x: 150, y: 150 },
}));

// SteeringSystem calculates forces → updates velocity
// MovementSystem applies velocity → updates position
```

### Example 2: Wandering NPC with Containment

```typescript
import { createSteeringComponent } from '@ai-village/core';

const npc = world.createEntity();

// Add position, movement, velocity...

// Wander within city bounds
npc.addComponent({
  type: 'steering',
  behavior: 'wander',
  maxSpeed: 3.0,
  maxForce: 8.0,
  wanderRadius: 3.0,
  wanderDistance: 5.0,
  wanderJitter: 0.15,
  containmentBounds: {
    minX: 0,
    maxX: 200,
    minY: 0,
    maxY: 200,
  },
  containmentMargin: 15, // Start steering back when within 15 tiles of edge
});
```

### Example 3: Combined Steering (Seek + Avoid)

```typescript
import { EntityImpl } from '@ai-village/core';

const agent = world.createEntity();
// Add position, movement, velocity, steering components...

const impl = agent as EntityImpl;

// Navigate toward goal while avoiding obstacles
impl.updateComponent('steering', (current) => ({
  ...current,
  behavior: 'combined',
  behaviors: [
    {
      type: 'seek',
      target: { x: 200, y: 200 },
      weight: 1.0, // Base priority
    },
    {
      type: 'obstacle_avoidance',
      weight: 3.0, // Higher priority - avoid collisions
    },
  ],
}));
```

### Example 4: Frontier Exploration Agent

```typescript
import { createExplorationStateComponent } from '@ai-village/core';

const scout = world.createEntity();

// Add position, movement, velocity, steering components...

// Add exploration state
scout.addComponent(createExplorationStateComponent({
  mode: 'frontier',
  explorationRadius: 128, // Explore within 128 tiles
}));

// ExplorationSystem will:
// 1. Mark current sector as explored
// 2. Find closest frontier sector (unexplored adjacent to explored)
// 3. Update steering.target to frontier sector
// 4. SteeringSystem moves agent toward target
// 5. Repeat when target reached
```

### Example 5: Spiral Survey from Home Base

```typescript
import { createExplorationStateComponent } from '@ai-village/core';

const surveyor = world.createEntity();

// Add position, movement, velocity, steering components...

const homeBase = { x: 100, y: 100 };

// Add spiral exploration
surveyor.addComponent(createExplorationStateComponent({
  mode: 'spiral',
  homeBase: homeBase,
  explorationRadius: 256,
}));

// ExplorationSystem will:
// 1. Calculate next spiral position (moves in squares outward)
// 2. Update steering.target to next position
// 3. When target reached, calculate next position
// 4. Guarantees complete coverage in predictable order

// Listen for milestones
eventBus.subscribe('exploration:milestone', (event) => {
  console.log(`${event.data.milestoneType} reached at (${event.data.location.x}, ${event.data.location.y})`);
});
```

### Example 6: Manual Collision Checking

```typescript
// Check if position is blocked before moving
const targetX = 120;
const targetY = 80;

// Access internal collision check (use carefully)
const movementSystem = world.getSystem('movement') as MovementSystem;

// Check via world methods (if exposed)
const worldExt = world as {
  getTerrainAt?: (x: number, y: number) => string | null;
  getTileAt?: (x: number, y: number) => any;
};

if (worldExt.getTerrainAt) {
  const terrain = worldExt.getTerrainAt(targetX, targetY);
  if (terrain === 'water') {
    console.log('Cannot move to water tile');
  }
}

// Or query buildings manually
const buildings = world.query().with('position').with('building').executeEntities();
for (const building of buildings) {
  const pos = building.getComponent<PositionComponent>('position');
  const buildingComp = building.getComponent<BuildingComponent>('building');

  const dx = pos.x - targetX;
  const dy = pos.y - targetY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (buildingComp.blocksMovement && distance < 0.5) {
    console.log('Target position blocked by building');
  }
}
```

---

## Architecture & Data Flow

### System Execution Order

```
1. TimeSystem (priority 3)
   ↓ Provides speedMultiplier for time acceleration
2. AgentBrainSystem (priority 10)
   ↓ Sets steering.behavior and steering.target based on AI decisions
3. SteeringSystem (priority 15)
   ↓ Calculates steering forces based on behavior
   ↓ Updates velocity.vx and velocity.vy
4. MovementSystem (priority 20)
   ↓ Syncs velocity → movement components
   ↓ Applies velocity to position with collision detection
   ↓ Handles fatigue penalties and sleep prevention
5. ExplorationSystem (priority 25)
   ↓ Marks explored sectors, updates frontier targets
   ↓ Updates steering.target for exploration behaviors
```

### Event Flow

```
AgentBrainSystem
  ↓ Sets steering.behavior = 'arrive', steering.target = {x, y}
SteeringSystem
  → Reads steering configuration
  → Calculates arrive force (deceleration near target)
  → Updates velocity.vx, velocity.vy

SteeringSystem
  ↓ velocity.vx = 3.2, velocity.vy = 1.8
MovementSystem
  → Syncs velocity → movement.velocityX, velocityY
  → Applies deltaTime and time acceleration
  → Checks collisions (hard: buildings, soft: agents)
  → Updates position.x, position.y

ExplorationSystem
  ↓ 'exploration:milestone' event at 50% coverage
Dashboard
  → Logs milestone achievement
```

### Component Relationships

```
Entity (Agent)
├── PositionComponent (required for all navigation)
│   ├── x, y → World coordinates
│   └── chunkX, chunkY → Spatial index
├── MovementComponent (required for physics)
│   ├── velocityX, velocityY → Legacy velocity storage
│   └── speed → Base movement speed
├── VelocityComponent (required for steering)
│   ├── vx, vy → Current velocity (used by SteeringSystem)
│   └── Synced to MovementComponent by MovementSystem
├── SteeringComponent (optional)
│   ├── behavior → 'seek' | 'arrive' | 'wander' | ...
│   ├── target → Destination coordinates
│   ├── maxSpeed, maxForce → Physics limits
│   └── containmentBounds → Area restrictions
├── ExplorationStateComponent (optional)
│   ├── mode → 'frontier' | 'spiral' | 'none'
│   ├── exploredSectors → Set<string> of "x,y" keys
│   ├── currentTarget → Next exploration waypoint
│   └── homeBase → Spiral center point
├── CircadianComponent (optional)
│   └── isSleeping → Prevents movement when true
└── NeedsComponent (optional)
    └── energy → Speed penalty: <10=40%, <30=60%, <50=80%
```

---

## Performance Considerations

**Optimization strategies:**

1. **Chunk-based spatial index**: Only check entities in nearby chunks (9 max) instead of all entities
2. **Squared distance comparisons**: Avoid `Math.sqrt()` by comparing `distance² < radius²`
3. **Query caching**: Building positions cached for 20 ticks, invalidated on changes
4. **Singleton caching**: Time entity ID cached permanently (queried once)
5. **Manhattan distance early exit**: Fast rejection before precise distance calculation
6. **Behavior validation**: Validate steering behavior once at component creation, not every tick
7. **Update throttling**: ExplorationSystem only processes entities with `exploration_state`

**Query caching:**

```typescript
// ❌ BAD: Query buildings every frame
for (const entity of entities) {
  const buildings = world.query().with('building').executeEntities(); // O(n) every entity!
  // Check collisions...
}

// ✅ GOOD: Query once, cache for 20 ticks
private buildingCollisionCache: BuildingCollisionData[] | null = null;
private cacheValidUntilTick = 0;

if (world.tick >= this.cacheValidUntilTick) {
  this.buildingCollisionCache = world.query().with('building').executeEntities();
  this.cacheValidUntilTick = world.tick + 20;
}
// Use cached data
```

**Squared distance optimization:**

```typescript
// ❌ BAD: sqrt in hot path (called thousands of times/frame)
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance < radius) {
  // Apply penalty
}

// ✅ GOOD: Compare squared values (no sqrt needed)
const distanceSquared = dx * dx + dy * dy;
const radiusSquared = radius * radius;
if (distanceSquared < radiusSquared) {
  // Apply penalty
  // Only compute sqrt when needed for interpolation:
  const distance = Math.sqrt(distanceSquared);
  const penalty = distance / radius;
}
```

**Chunk-based collision checks:**

```typescript
// ❌ BAD: Check all entities in world
const allEntities = world.query().with('physics').executeEntities();
for (const other of allEntities) {
  // Check collision...
}

// ✅ GOOD: Only check entities in nearby chunks
const CHUNK_SIZE = 32;
const chunkX = Math.floor(x / CHUNK_SIZE);
const chunkY = Math.floor(y / CHUNK_SIZE);

for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    const nearbyIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);
    for (const id of nearbyIds) {
      // Check collision... (max 9 chunks instead of entire world)
    }
  }
}
```

---

## Troubleshooting

### Agent not moving

**Check:**
1. Has `movement`, `position`, and `velocity` components?
2. Velocity is non-zero? (`velocity.vx !== 0 || velocity.vy !== 0`)
3. Not sleeping? (`circadian.isSleeping === false`)
4. Has energy? (`needs.energy > 0`)
5. Steering target set? (`steering.target !== undefined`)
6. Steering behavior active? (`steering.behavior !== 'none'`)

**Debug:**
```typescript
const movement = entity.getComponent<MovementComponent>('movement');
const velocity = entity.getComponent<VelocityComponent>('velocity');
const steering = entity.getComponent<SteeringComponent>('steering');
const circadian = entity.getComponent<CircadianComponent>('circadian');
const needs = entity.getComponent<NeedsComponent>('needs');

console.log('Movement:', movement?.velocityX, movement?.velocityY);
console.log('Velocity:', velocity?.vx, velocity?.vy);
console.log('Steering:', steering?.behavior, steering?.target);
console.log('Sleeping:', circadian?.isSleeping);
console.log('Energy:', needs?.energy);
```

### Agent stuck at destination

**Cause:** Arrive behavior's dead zone prevents micro-adjustments

**Check:**
1. Distance to target? (Should be < `arrivalTolerance`)
2. Velocity near zero? (Should be < 0.1)
3. Dead zone configured? (Default: 0.5 tiles)

**Fix:** Increase `deadZone` if agent is jittering:
```typescript
impl.updateComponent('steering', (current) => ({
  ...current,
  deadZone: 1.0, // Increased from 0.5
  arrivalTolerance: 1.5,
}));
```

### Agent jittering/oscillating at target

**Cause:** Arrive behavior trying to stop but overshooting

**Fix:** Increase `deadZone` and `arrivalTolerance`:
```typescript
impl.updateComponent('steering', (current) => ({
  ...current,
  deadZone: 1.0,          // Stop applying force when < 1 tile away
  arrivalTolerance: 2.0,   // Consider "arrived" at 2 tiles
  slowingRadius: 10.0,     // Start slowing 10 tiles away
}));
```

### Agent stuck on obstacle (not pathfinding around it)

**Cause:** Stuck detection triggered, needs pathfinding integration

**Temporary workaround:** SteeringSystem adds random jitter after 3 seconds:
```typescript
// In _arrive behavior:
if (now - tracker.stuckTime > 3000) {
  desired.x += (Math.random() - 0.5) * 2;
  desired.y += (Math.random() - 0.5) * 2;
}
```

**Long-term fix:** Integrate A* pathfinding when stuck:
```typescript
// Future integration:
if (isStuck(entity)) {
  const path = await pathfindingSystem.findPath(position, target);
  steering.waypoints = path;
  steering.behavior = 'follow_path';
}
```

### Agent moving too slow

**Check:**
1. Energy level? (`needs.energy`)
   - <10: -60% speed
   - <30: -40% speed
   - <50: -20% speed
2. Soft collision penalty? (Nearby agents slow movement)
3. Base speed configured? (`movement.speed` default: 5.0 tiles/sec)
4. Max speed in steering? (`steering.maxSpeed`)

**Debug:**
```typescript
const needs = entity.getComponent<NeedsComponent>('needs');
const movement = entity.getComponent<MovementComponent>('movement');
const steering = entity.getComponent<SteeringComponent>('steering');

console.log('Energy:', needs?.energy);
console.log('Base speed:', movement?.speed);
console.log('Max speed:', steering?.maxSpeed);

// Check collision penalty manually
const worldExt = world as any;
const penalty = worldExt.getSoftCollisionPenalty?.(entity.id, position.x, position.y) ?? 1.0;
console.log('Collision penalty:', penalty); // 1.0 = no penalty, 0.2 = very crowded
```

### Exploration not finding new sectors

**Check:**
1. Has `exploration_state` component?
2. Mode set? (`exploration.mode === 'frontier' || 'spiral'`)
3. Position updating? (Check MovementSystem is running)
4. Current target set? (`exploration.currentTarget`)
5. Steering targeting exploration waypoint? (`steering.target === exploration.currentTarget`)

**Debug:**
```typescript
const exploration = entity.getComponent<ExplorationStateComponent>('exploration_state');
const steering = entity.getComponent<SteeringComponent>('steering');
const position = entity.getComponent<PositionComponent>('position');

console.log('Mode:', exploration?.mode);
console.log('Explored sectors:', exploration?.getExploredSectorCount());
console.log('Coverage:', exploration?.getExplorationCoverage());
console.log('Current target:', exploration?.currentTarget);
console.log('Steering target:', steering?.target);
console.log('Position:', position?.x, position?.y);

// Check frontier
const frontier = exploration?.getFrontierSectors();
console.log('Frontier sectors:', frontier?.length);
```

### Agent leaving containment bounds

**Check:**
1. Bounds configured? (`steering.containmentBounds`)
2. Margin configured? (`steering.containmentMargin`)
3. Agent actually outside bounds? (Check position vs bounds)

**Debug:**
```typescript
const steering = entity.getComponent<SteeringComponent>('steering');
const position = entity.getComponent<PositionComponent>('position');

if (steering?.containmentBounds) {
  const bounds = steering.containmentBounds;
  const outside =
    position.x < bounds.minX || position.x > bounds.maxX ||
    position.y < bounds.minY || position.y > bounds.maxY;

  console.log('Containment bounds:', bounds);
  console.log('Position:', position.x, position.y);
  console.log('Outside bounds:', outside);

  if (outside) {
    console.log('Distance outside:',
      Math.max(0, bounds.minX - position.x, position.x - bounds.maxX),
      Math.max(0, bounds.minY - position.y, position.y - bounds.maxY)
    );
  }
}
```

**Fix:** MovementSystem clamps position to bounds after movement:
```typescript
// Already implemented in MovementSystem.updatePosition()
if (steering?.containmentBounds) {
  const bounds = steering.containmentBounds;
  clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
  clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
}
```

---

## Integration with Other Systems

### AgentBrainSystem

**Brain sets steering targets based on AI decisions:**

```typescript
// In AgentBrainSystem.update()
const decision = agent.currentDecision;

if (decision.type === 'move_to') {
  impl.updateComponent('steering', (current) => ({
    ...current,
    behavior: 'arrive',
    target: decision.target,
  }));
}

if (decision.type === 'idle') {
  impl.updateComponent('steering', (current) => ({
    ...current,
    behavior: 'wander',
  }));
}
```

### TimeSystem

**Time acceleration affects movement speed:**

```typescript
// TimeSystem sets speedMultiplier
time.speedMultiplier = 2.0; // 2x speed

// MovementSystem reads it
const deltaX = velocityX * speedMultiplier * deltaTime * time.speedMultiplier;
// Result: Agent moves 2x faster when time is accelerated
```

### CircadianSystem

**Sleep prevents movement:**

```typescript
// CircadianSystem sets isSleeping
circadian.isSleeping = true; // Agent went to bed

// MovementSystem checks it
if (circadian.isSleeping) {
  movement.velocityX = 0;
  movement.velocityY = 0;
  continue; // Skip movement
}
```

### NeedsSystem

**Energy affects movement speed:**

```typescript
// NeedsSystem drains energy
needs.energy -= 10; // Working hard

// MovementSystem applies penalty
if (needs.energy < 10)  speedMultiplier = 0.4; // -60%
if (needs.energy < 30)  speedMultiplier = 0.6; // -40%
if (needs.energy < 50)  speedMultiplier = 0.8; // -20%

const deltaX = velocityX * speedMultiplier * deltaTime;
```

### BuildingSystem

**Buildings create hard collisions:**

```typescript
// BuildingSystem creates building
building.addComponent({
  type: 'building',
  blocksMovement: true, // Hard collision
});

// MovementSystem checks collision
if (building.blocksMovement && distance < 0.5) {
  return true; // Blocked
}
```

### ChunkSystem

**Chunks enable spatial queries:**

```typescript
// ChunkSystem maintains spatial index
world.addEntityToChunk(entity, chunkX, chunkY);

// MovementSystem queries nearby chunks
const nearbyIds = world.getEntitiesInChunk(chunkX, chunkY);
// Only check entities in nearby chunks (9 max) instead of all entities
```

---

## Testing

**Status:** Test coverage to be added (see `TODO.md`)

**Planned test coverage:**
- MovementSystem: Collision detection (hard/soft), position updates, fatigue penalties
- SteeringSystem: All behaviors (seek, arrive, wander, obstacle_avoidance, combined), stuck detection
- ExplorationSystem: Frontier/spiral algorithms, sector tracking, milestone events
- Integration tests: Interaction with Time, Circadian, Needs, Building systems

**When tests are added, run with:**
```bash
npm test -- MovementSystem.test.ts
npm test -- SteeringSystem.test.ts
npm test -- ExplorationSystem.test.ts
```

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference (MovementSystem priority 20, SteeringSystem priority 15, ExplorationSystem priority 25)
- **COMPONENTS_REFERENCE.md** - All component types (movement, velocity, steering, exploration_state)
- **METASYSTEMS_GUIDE.md** - No direct metasystem (navigation is a utility system)
- **PERFORMANCE.md** - Performance optimization guide (chunk-based queries, squared distance)
- **CLAUDE.md** - Code quality rules (no fallbacks, fail fast, squared distance)
- **TODO.md** - Implementation status, planned improvements, missing features

---

## Summary for Language Models

**Before working with navigation:**
1. Understand the two-phase system: SteeringSystem calculates forces, MovementSystem applies them
2. Know the six steering behaviors: seek, arrive, wander, obstacle_avoidance, combined, none
3. Understand collision types: hard (blocks), soft (slows)
4. Know component relationships: Position → Movement → Velocity → Steering
5. Understand containment bounds (keeps entities within areas)
6. Know exploration modes: frontier (organic), spiral (systematic)
7. Be aware: A* pathfinding is planned future work (agents currently use steering + stuck detection)

**Common tasks:**
- **Move agent to target:** Set `steering.behavior = 'arrive'` and `steering.target = {x, y}`
- **Wander randomly:** Set `steering.behavior = 'wander'`
- **Avoid obstacles:** Set `steering.behavior = 'obstacle_avoidance'` or use `combined` with `seek`
- **Contain agent:** Set `steering.containmentBounds = {minX, maxX, minY, maxY}`
- **Explore territory:** Add `exploration_state` component with `mode = 'frontier'` or `'spiral'`
- **Stop movement:** Set `steering.behavior = 'none'` and `velocity.vx = velocity.vy = 0`

**Critical rules:**
- Never query buildings in loop (use cached query)
- Always use squared distance comparisons (no `Math.sqrt()` for comparisons)
- Validate steering behavior at component creation (no fallbacks per CLAUDE.md)
- Use chunk-based spatial queries (max 9 chunks, not entire world)
- Update position via `MovementSystem.updatePosition()` (handles containment clamping)
- Never bypass collision detection (always check before manual position updates)

**Event-driven architecture:**
- Listen to `exploration:milestone` events for coverage tracking
- No events emitted by MovementSystem or SteeringSystem (they consume state)
- ExplorationSystem emits milestones at 25%, 50%, 75%, 90% coverage
- Systems run in order: Brain → Steering → Movement → Exploration

**Performance:**
- Use chunk-based queries for nearby entities (9 chunks max)
- Cache building positions (20 tick lifetime)
- Use squared distance comparisons (avoid `Math.sqrt()`)
- Manhattan distance early exit before precise checks
- Update throttling for ExplorationSystem (only entities with component)
