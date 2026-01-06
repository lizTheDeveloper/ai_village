# Agent Navigation & Exploration System Specification

## Executive Summary

This specification defines a three-tier navigation system that enables agents to:
1. **Remember** resource locations they've encountered
2. **Navigate** purposefully to known locations using pathfinding
3. **Explore** systematically to discover new resources

The system builds on existing components (EpisodicMemoryComponent, VisionComponent) and adds new behaviors and algorithms to enable intelligent resource gathering and territorial expansion.

---

## Problem Statement

**Current State:**
- Agents use `wander` behavior (random walk) with no directional control
- Agents can see resources within 10 tiles but forget them immediately
- Episodic memory stores resource locations but isn't used for decision-making
- No ability to "go find wood" or "search for iron"

**Desired State:**
- Agents remember where they saw resources (stone, wood, food, water)
- Agents can navigate to remembered locations using smart pathfinding
- Agents can explore unknown territory systematically
- Exploration radius expands as settlement grows
- LLM agents can request "go find stone" and execute it

---

## System Architecture

### Three-Tier Behavioral System

```
┌─────────────────────────────────────────────────────────┐
│ 1. SPATIAL MEMORY                                       │
│    Query: "Where did I see stone?"                      │
│    → Returns list of remembered locations with          │
│      confidence scores                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. PATHFINDING / NAVIGATION                             │
│    Input: Target position (x, y)                        │
│    Output: Velocity vector to reach target              │
│    → Steering behaviors with obstacle avoidance         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. EXPLORATION                                          │
│    Goal: Discover new resources                         │
│    Strategy: Frontier-based exploration with            │
│              expanding radius                           │
└─────────────────────────────────────────────────────────┘
```

---

## Component 1: Spatial Memory System

### Overview
Leverages the existing `EpisodicMemoryComponent` to query and rank resource locations.

### Existing Foundation
```typescript
// Already implemented in EpisodicMemoryComponent
interface Memory {
  type: 'resource_location' | 'agent_seen' | ...;
  x: number;
  y: number;
  entityId: string;
  confidence: number;  // Decays over time
  metadata?: {
    resourceType?: ResourceType;  // 'wood' | 'stone' | 'food' | 'water'
  };
}
```

### New Capability: Memory Query Service

Add to `AgentComponent` behavior state:
```typescript
interface ResourceQueryResult {
  x: number;
  y: number;
  resourceType: ResourceType;
  confidence: number;      // 0-1, higher = more recent/trustworthy
  distance: number;        // From current position
  lastSeenTick: number;    // When memory was created
}
```

#### Query Algorithm
```typescript
function queryResourceMemory(
  agent: EntityImpl,
  resourceType: ResourceType,
  maxResults: number = 5
): ResourceQueryResult[] {
  const episodicMemory = agent.getComponent<EpisodicMemoryComponent>('episodicMemory');
  const position = agent.getComponent<PositionComponent>('position');

  // Filter memories by type
  const resourceMemories = episodicMemory.memories.filter(m =>
    m.type === 'resource_location' &&
    m.metadata?.resourceType === resourceType &&
    m.confidence > 0.3  // Ignore very stale memories
  );

  // Calculate distance and score
  const results = resourceMemories.map(m => {
    const dx = m.x - position.x;
    const dy = m.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Score combines confidence and proximity
    // Closer resources with higher confidence rank higher
    const proximityFactor = 1.0 / (1.0 + distance / 20);  // Normalize to 0-1
    const score = m.confidence * 0.6 + proximityFactor * 0.4;

    return {
      x: m.x,
      y: m.y,
      resourceType,
      confidence: m.confidence,
      distance,
      lastSeenTick: m.timestamp,
      score
    };
  });

  // Sort by score (best first) and return top N
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
```

### Memory Staleness Handling

**Problem:** Resources might have been depleted since memory was formed.

**Solution:** Confidence decay + verification on arrival

1. **Confidence Decay:** Already implemented in EpisodicMemoryComponent
   - `resource_location` memories decay over 80 ticks
   - Older memories have lower confidence

2. **Verification on Arrival:**
   - When agent reaches remembered location, re-check with vision
   - If resource still exists → reinforce memory (boost confidence)
   - If resource gone → mark memory as invalid (confidence = 0)

```typescript
// In navigate behavior when target reached
if (distanceToTarget < 1.0) {
  const vision = agent.getComponent<VisionComponent>('vision');
  const resourceStillThere = vision.seenResources.includes(targetResourceId);

  if (resourceStillThere) {
    // Reinforce memory - resource confirmed
    episodicMemory.addMemory({
      type: 'resource_location',
      x: targetPos.x,
      y: targetPos.y,
      confidence: 1.0,  // Fresh sighting
      metadata: { resourceType }
    });
  } else {
    // Resource depleted - invalidate memory
    episodicMemory.invalidateMemory(memoryId);

    // Switch to exploration to find more
    agent.updateComponent<AgentComponent>('agent', current => ({
      ...current,
      behavior: 'explore',
      behaviorState: { searchFor: resourceType }
    }));
  }
}
```

---

## Component 2: Pathfinding & Navigation

### Design Decision: Flow Fields + Steering Behaviors

**Chosen Approach:** **Hybrid System**
1. **Flow Fields** for group coordination and exploration
2. **Steering Behaviors** for individual navigation and obstacle avoidance

**Rationale:**
- **Flow Fields excel at:**
  - Group coordination (compute once, use for all agents)
  - Smooth, natural-looking group movement
  - Creating "spreading out" behavior automatically
  - Exploring as a coordinated swarm
  - Efficient CPU usage for many agents

- **Steering Behaviors excel at:**
  - Individual precision navigation
  - Dynamic obstacle avoidance
  - Last-mile arrival behavior
  - Combining multiple influences

**Trade-offs:**
- Flow fields require grid overlay (memory cost)
- Need to regenerate fields when world changes
- Steering alone can get stuck in local minima
- Acceptable for organic, emergent behavior

### Core Steering Behaviors

#### 1. **Seek** - Move toward target
```typescript
function seek(position: Position, target: Position, maxSpeed: number): Vector2D {
  const desired = {
    x: target.x - position.x,
    y: target.y - position.y
  };

  const distance = Math.sqrt(desired.x ** 2 + desired.y ** 2);
  if (distance === 0) return { x: 0, y: 0 };

  // Normalize and scale to max speed
  return {
    x: (desired.x / distance) * maxSpeed,
    y: (desired.y / distance) * maxSpeed
  };
}
```

#### 2. **Arrive** - Slow down when approaching target
```typescript
function arrive(
  position: Position,
  target: Position,
  maxSpeed: number,
  slowingRadius: number = 5.0
): Vector2D {
  const desired = {
    x: target.x - position.x,
    y: target.y - position.y
  };

  const distance = Math.sqrt(desired.x ** 2 + desired.y ** 2);
  if (distance === 0) return { x: 0, y: 0 };

  // Calculate speed based on distance
  let speed = maxSpeed;
  if (distance < slowingRadius) {
    // Linear deceleration within slowing radius
    speed = maxSpeed * (distance / slowingRadius);
  }

  // Normalize and scale
  return {
    x: (desired.x / distance) * speed,
    y: (desired.y / distance) * speed
  };
}
```

#### 3. **Obstacle Avoidance** - Detect and avoid solid entities
```typescript
function avoidObstacles(
  entity: EntityImpl,
  world: World,
  velocity: Vector2D,
  lookAheadDistance: number = 3.0
): Vector2D {
  const position = entity.getComponent<PositionComponent>('position')!;

  // Project position forward along current velocity
  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
  if (speed === 0) return { x: 0, y: 0 };

  const lookAhead = {
    x: position.x + (velocity.x / speed) * lookAheadDistance,
    y: position.y + (velocity.y / speed) * lookAheadDistance
  };

  // Find nearest obstacle in look-ahead cone
  const obstacles = world
    .query()
    .with('physics')
    .with('position')
    .executeEntities()
    .filter(e => {
      const physics = (e as EntityImpl).getComponent<PhysicsComponent>('physics');
      return physics?.solid;  // Only avoid solid obstacles
    });

  let nearestObstacle = null;
  let minDistance = Infinity;

  for (const obstacle of obstacles) {
    const obstaclePos = (obstacle as EntityImpl).getComponent<PositionComponent>('position')!;
    const dx = lookAhead.x - obstaclePos.x;
    const dy = lookAhead.y - obstaclePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance && distance < 2.0) {  // Within threat range
      minDistance = distance;
      nearestObstacle = obstaclePos;
    }
  }

  if (!nearestObstacle) return { x: 0, y: 0 };

  // Steer away from obstacle (perpendicular to approach)
  const avoidanceForce = {
    x: position.x - nearestObstacle.x,
    y: position.y - nearestObstacle.y
  };

  const forceMagnitude = Math.sqrt(avoidanceForce.x ** 2 + avoidanceForce.y ** 2);
  if (forceMagnitude === 0) return { x: 0, y: 0 };

  // Normalize and scale based on proximity (closer = stronger)
  const avoidanceStrength = (2.0 - minDistance) / 2.0;  // 0-1
  return {
    x: (avoidanceForce.x / forceMagnitude) * speed * avoidanceStrength,
    y: (avoidanceForce.y / forceMagnitude) * speed * avoidanceStrength
  };
}
```

#### 4. **Wander** - Random exploration (enhanced)
```typescript
// Enhanced wander with persistence (doesn't change direction every tick)
interface WanderState {
  wanderAngle: number;        // Current direction
  wanderChangeRate: number;   // How quickly to change (radians/tick)
  wanderRadius: number;       // Circle radius for target projection
  wanderDistance: number;     // Distance to project circle
  lastUpdateTick: number;
}

function wander(
  state: WanderState,
  currentTick: number,
  position: Position,
  maxSpeed: number
): { velocity: Vector2D; newState: WanderState } {
  // Update angle slightly (creates smooth wandering)
  const angleChange = (Math.random() - 0.5) * state.wanderChangeRate;
  const newAngle = state.wanderAngle + angleChange;

  // Project circle in front of agent
  const circleCenter = {
    x: position.x + Math.cos(newAngle) * state.wanderDistance,
    y: position.y + Math.sin(newAngle) * state.wanderDistance
  };

  // Pick random point on circle
  const randomAngle = Math.random() * Math.PI * 2;
  const target = {
    x: circleCenter.x + Math.cos(randomAngle) * state.wanderRadius,
    y: circleCenter.y + Math.sin(randomAngle) * state.wanderRadius
  };

  // Seek toward that point
  const velocity = seek(position, target, maxSpeed);

  return {
    velocity,
    newState: {
      ...state,
      wanderAngle: newAngle,
      lastUpdateTick: currentTick
    }
  };
}
```

### New Behavior: `navigate`

**Purpose:** Move toward a specific target position using steering behaviors.

```typescript
private navigateBehavior(entity: EntityImpl, world: World): void {
  const position = entity.getComponent<PositionComponent>('position')!;
  const movement = entity.getComponent<MovementComponent>('movement')!;
  const agent = entity.getComponent<AgentComponent>('agent')!;

  // Behavior state should contain target
  const targetX = agent.behaviorState?.targetX as number | undefined;
  const targetY = agent.behaviorState?.targetY as number | undefined;

  if (targetX === undefined || targetY === undefined) {
    // No target, switch to wander
    entity.updateComponent<AgentComponent>('agent', current => ({
      ...current,
      behavior: 'wander',
      behaviorState: {}
    }));
    return;
  }

  const target = { x: targetX, y: targetY };

  // Check if arrived (within 1 tile)
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 1.0) {
    // Arrived! Execute arrival callback if present
    const onArrival = agent.behaviorState?.onArrival as string | undefined;

    if (onArrival === 'gather') {
      // Switch to gather behavior
      entity.updateComponent<AgentComponent>('agent', current => ({
        ...current,
        behavior: 'gather',
        behaviorState: { targetX, targetY }
      }));
    } else {
      // Default: stop and idle
      entity.updateComponent<AgentComponent>('agent', current => ({
        ...current,
        behavior: 'idle',
        behaviorState: {}
      }));
      entity.updateComponent<MovementComponent>('movement', current => ({
        ...current,
        velocityX: 0,
        velocityY: 0
      }));
    }
    return;
  }

  // Calculate steering forces
  const arriveForce = arrive(position, target, movement.speed, 5.0);
  const avoidForce = avoidObstacles(entity, world, arriveForce, 3.0);

  // Combine forces (weighted)
  const combinedVelocity = {
    x: arriveForce.x * 0.8 + avoidForce.x * 0.2,
    y: arriveForce.y * 0.8 + avoidForce.y * 0.2
  };

  // Update movement
  entity.updateComponent<MovementComponent>('movement', current => ({
    ...current,
    velocityX: combinedVelocity.x,
    velocityY: combinedVelocity.y
  }));
}
```

### Pathfinding Fallback: Simple A* (Optional Enhancement)

If an agent gets stuck (position hasn't changed for 5+ seconds), fall back to grid-based A*:

```typescript
// Detect stuck state
if (agent.behaviorState?.stuckCounter > 100) {  // 5 seconds at 20 TPS
  // Use A* to find path around obstacle
  const path = findPath(position, target, world);

  if (path && path.length > 1) {
    // Navigate to first waypoint
    const waypoint = path[1];
    agent.behaviorState.targetX = waypoint.x;
    agent.behaviorState.targetY = waypoint.y;
    agent.behaviorState.stuckCounter = 0;
  } else {
    // No path found, give up and explore elsewhere
    entity.updateComponent<AgentComponent>('agent', current => ({
      ...current,
      behavior: 'explore',
      behaviorState: {}
    }));
  }
}
```

---

## Component 2.5: Flow Field Pathfinding & Social Gradients

### What are Flow Fields?

Flow fields are a **grid-based navigation technique** where each grid cell contains a vector pointing toward a goal. Agents simply sample the field at their position and follow the flow.

**Traditional pathfinding:**
- A* per agent: O(n × log n) × num_agents
- Each agent recalculates path individually
- 10 agents → 10× computation cost

**Flow field pathfinding:**
- Compute field once: O(n)
- All agents sample field: O(1) per agent
- 10 agents → same cost as 1 agent!

### Why Flow Fields Are Perfect Here

**Use Case 1: Group Exploration**
- 5 agents all exploring → generate ONE exploration flow field
- All agents follow the same field but spread naturally
- Creates emergent "swarm spreading" behavior

**Use Case 2: Return Home**
- One "home field" points back to settlement
- All agents can use it simultaneously
- Updates only when settlement moves/grows

**Use Case 3: Resource Attraction**
- Generate field pointing toward known resource clusters
- Strength decreases with distance
- Multiple agents converge efficiently

### Flow Field Types

#### 1. Exploration Field (Frontier Attraction)

Pulls agents toward unexplored areas.

```typescript
interface ExplorationField {
  type: 'exploration';
  grid: FlowGrid;              // Vector field
  costGrid: number[][];        // Distance from frontier
  lastUpdated: number;         // Game tick
  exploredSectors: Set<string>; // Marked as visited
}

function generateExplorationField(
  settlement: SettlementState,
  exploredSectors: Set<string>,
  gridSize: number = 4  // 4 tiles per grid cell
): ExplorationField {
  const radius = calculateExplorationRadius(settlement);
  const gridWidth = Math.ceil((radius * 2) / gridSize);
  const gridHeight = gridWidth;

  // Create cost grid (distance to nearest unexplored sector)
  const costGrid: number[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(Infinity));

  // Initialize frontier cells (unexplored sectors) with cost 0
  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const worldX = settlement.centerX + (gx - gridWidth / 2) * gridSize;
      const worldY = settlement.centerY + (gy - gridHeight / 2) * gridSize;
      const sectorKey = getSectorKey(worldX, worldY);

      if (!exploredSectors.has(sectorKey)) {
        costGrid[gy][gx] = 0;  // Frontier cells are goals
      }
    }
  }

  // Dijkstra flood-fill to compute distance from frontier
  const queue: Array<{ x: number; y: number; cost: number }> = [];

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      if (costGrid[gy][gx] === 0) {
        queue.push({ x: gx, y: gy, cost: 0 });
      }
    }
  }

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.x >= 0 &&
        neighbor.x < gridWidth &&
        neighbor.y >= 0 &&
        neighbor.y < gridHeight
      ) {
        const newCost = current.cost + 1;
        if (newCost < costGrid[neighbor.y][neighbor.x]) {
          costGrid[neighbor.y][neighbor.x] = newCost;
          queue.push({ x: neighbor.x, y: neighbor.y, cost: newCost });
        }
      }
    }
  }

  // Convert cost grid to flow field (gradient descent)
  const flowGrid = costGridToFlowField(costGrid, gridSize);

  return {
    type: 'exploration',
    grid: flowGrid,
    costGrid,
    lastUpdated: world.tick,
    exploredSectors,
  };
}

function costGridToFlowField(
  costGrid: number[][],
  cellSize: number
): FlowGrid {
  const height = costGrid.length;
  const width = costGrid[0].length;
  const flowGrid: Vector2D[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill({ x: 0, y: 0 }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (costGrid[y][x] === Infinity) {
        flowGrid[y][x] = { x: 0, y: 0 };  // No flow in unreachable cells
        continue;
      }

      // Find neighbor with lowest cost (steepest descent)
      let bestX = x;
      let bestY = y;
      let lowestCost = costGrid[y][x];

      const neighbors = [
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 },
        { x: x + 1, y: y + 1 },  // Diagonals
        { x: x - 1, y: y - 1 },
        { x: x + 1, y: y - 1 },
        { x: x - 1, y: y + 1 },
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          if (costGrid[n.y][n.x] < lowestCost) {
            lowestCost = costGrid[n.y][n.x];
            bestX = n.x;
            bestY = n.y;
          }
        }
      }

      // Create normalized vector toward best neighbor
      const dx = bestX - x;
      const dy = bestY - y;
      const magnitude = Math.sqrt(dx * dx + dy * dy);

      if (magnitude > 0) {
        flowGrid[y][x] = {
          x: dx / magnitude,
          y: dy / magnitude,
        };
      } else {
        flowGrid[y][x] = { x: 0, y: 0 };  // At goal, no flow
      }
    }
  }

  return flowGrid;
}
```

#### 2. Home Field (Return Navigation)

Pulls agents back to settlement center.

```typescript
function generateHomeField(
  settlement: SettlementState,
  radius: number,
  gridSize: number = 4
): FlowField {
  const gridWidth = Math.ceil((radius * 2) / gridSize);
  const gridHeight = gridWidth;

  const costGrid: number[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(Infinity));

  // Settlement center is goal (cost 0)
  const centerGx = Math.floor(gridWidth / 2);
  const centerGy = Math.floor(gridHeight / 2);
  costGrid[centerGy][centerGx] = 0;

  // Dijkstra from center outward
  const queue = [{ x: centerGx, y: centerGy, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    const neighbors = [
      { x: current.x + 1, y: current.y, cost: current.cost + 1 },
      { x: current.x - 1, y: current.y, cost: current.cost + 1 },
      { x: current.x, y: current.y + 1, cost: current.cost + 1 },
      { x: current.x, y: current.y - 1, cost: current.cost + 1 },
    ];

    for (const n of neighbors) {
      if (
        n.x >= 0 &&
        n.x < gridWidth &&
        n.y >= 0 &&
        n.y < gridHeight &&
        n.cost < costGrid[n.y][n.x]
      ) {
        costGrid[n.y][n.x] = n.cost;
        queue.push(n);
      }
    }
  }

  return {
    type: 'home',
    grid: costGridToFlowField(costGrid, gridSize),
    costGrid,
    lastUpdated: world.tick,
  };
}
```

#### 3. Dispersion Field (Anti-Crowding)

Pushes agents away from crowded areas.

```typescript
function generateDispersionField(
  agents: ReadonlyArray<Entity>,
  settlement: SettlementState,
  radius: number,
  gridSize: number = 4
): FlowField {
  const gridWidth = Math.ceil((radius * 2) / gridSize);
  const gridHeight = gridWidth;

  // Create density grid
  const densityGrid: number[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(0));

  // Count agents per grid cell
  for (const agent of agents) {
    const pos = (agent as EntityImpl).getComponent<PositionComponent>('position');
    if (!pos) continue;

    const relativeX = pos.x - settlement.centerX;
    const relativeY = pos.y - settlement.centerY;
    const gx = Math.floor(relativeX / gridSize) + gridWidth / 2;
    const gy = Math.floor(relativeY / gridSize) + gridHeight / 2;

    if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
      densityGrid[gy][gx] += 1;
    }
  }

  // Apply Gaussian blur to smooth density
  const smoothedDensity = gaussianBlur(densityGrid, 1.5);

  // Convert density to repulsion vectors (gradient points away from high density)
  const flowGrid: Vector2D[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill({ x: 0, y: 0 }));

  for (let y = 1; y < gridHeight - 1; y++) {
    for (let x = 1; x < gridWidth - 1; x++) {
      // Compute gradient (Sobel operator)
      const gx =
        smoothedDensity[y - 1][x + 1] +
        2 * smoothedDensity[y][x + 1] +
        smoothedDensity[y + 1][x + 1] -
        (smoothedDensity[y - 1][x - 1] +
          2 * smoothedDensity[y][x - 1] +
          smoothedDensity[y + 1][x - 1]);

      const gy =
        smoothedDensity[y + 1][x - 1] +
        2 * smoothedDensity[y + 1][x] +
        smoothedDensity[y + 1][x + 1] -
        (smoothedDensity[y - 1][x - 1] +
          2 * smoothedDensity[y - 1][x] +
          smoothedDensity[y - 1][x + 1]);

      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude > 0) {
        // Negate gradient to point away from high density
        flowGrid[y][x] = {
          x: -gx / magnitude,
          y: -gy / magnitude,
        };
      } else {
        flowGrid[y][x] = { x: 0, y: 0 };
      }
    }
  }

  return {
    type: 'dispersion',
    grid: flowGrid,
    densityGrid: smoothedDensity,
    lastUpdated: world.tick,
  };
}
```

#### 4. Resource Attraction Field

Pulls agents toward known resource clusters.

```typescript
function generateResourceField(
  resourceType: ResourceType,
  episodicMemories: EpisodicMemoryComponent[],  // All agents' memories
  settlement: SettlementState,
  radius: number,
  gridSize: number = 4
): FlowField {
  const gridWidth = Math.ceil((radius * 2) / gridSize);
  const gridHeight = gridWidth;

  // Create attraction grid (higher = more resources)
  const attractionGrid: number[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(0));

  // Aggregate all agents' resource memories
  for (const memory of episodicMemories) {
    const resourceMemories = memory.memories.filter(
      (m) =>
        m.type === 'resource_location' &&
        m.metadata?.resourceType === resourceType &&
        m.confidence > 0.3
    );

    for (const mem of resourceMemories) {
      const relativeX = mem.x - settlement.centerX;
      const relativeY = mem.y - settlement.centerY;
      const gx = Math.floor(relativeX / gridSize) + gridWidth / 2;
      const gy = Math.floor(relativeY / gridSize) + gridHeight / 2;

      if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
        // Add weighted by confidence
        attractionGrid[gy][gx] += mem.confidence;
      }
    }
  }

  // Blur to create smooth attraction zones
  const smoothedAttraction = gaussianBlur(attractionGrid, 2.0);

  // Convert to cost grid (lower cost = higher attraction)
  const costGrid: number[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(Infinity));

  let maxAttraction = 0;
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      maxAttraction = Math.max(maxAttraction, smoothedAttraction[y][x]);
    }
  }

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      // Invert: high attraction → low cost
      costGrid[y][x] = maxAttraction - smoothedAttraction[y][x];
    }
  }

  return {
    type: 'resource',
    resourceType,
    grid: costGridToFlowField(costGrid, gridSize),
    attractionGrid: smoothedAttraction,
    lastUpdated: world.tick,
  };
}
```

### Social Gradient Communication 🔥

**Revolutionary Concept:** Agents communicate gradient information through conversation!

Instead of a centralized flow field, agents share discoveries with nearby agents, creating a **distributed, emergent navigation system**.

#### Communication Patterns

**1. Resource Discovery Broadcast**
```typescript
// Agent finds stone and broadcasts
agent.speak(`Found stone at bearing ${bearing}° about ${distance} tiles!`);

// Nearby agents hear this (hearing range = 50 tiles)
// They update their own gradient understanding
```

**2. Depletion Warning**
```typescript
agent.speak(`The stone deposit northeast is depleted.`);
// Other agents avoid that area
```

**3. Collaborative Mapping**
```typescript
agent.speak(`Explored southwest for 40 tiles, nothing found.`);
// Other agents deprioritize that direction
```

#### Social Gradient Component

Add a new component to track socially-learned gradients:

```typescript
interface SocialGradientComponent extends Component {
  type: 'social_gradient';

  // Learned from conversation
  resourceGradients: Map<ResourceType, SocialGradient[]>;

  // Deprioritized areas (warned by others)
  avoidanceZones: Array<{
    centerX: number;
    centerY: number;
    radius: number;
    reason: string;      // "depleted", "dangerous", etc.
    learnedFrom: string; // Agent ID who warned
    confidence: number;  // Decays over time
  }>;

  // Promising directions (suggested by others)
  explorationHints: Array<{
    bearing: number;     // Radians from current position
    distance: number;
    resourceType?: ResourceType;
    confidence: number;
    source: string;      // Who suggested it
  }>;
}

interface SocialGradient {
  direction: Vector2D;   // Normalized vector
  strength: number;      // 0-1, how strong the pull
  distance: number;      // How far away (rough estimate)
  confidence: number;    // How much to trust this info
  learnedTick: number;   // When heard about it
  source: string;        // Agent ID who shared
}
```

#### Parsing Gradient Information from Speech

```typescript
function parseGradientFromSpeech(
  speech: string,
  speakerPos: Position,
  listenerPos: Position
): SocialGradient | null {
  const lower = speech.toLowerCase();

  // Pattern: "found <resource> at bearing <angle> about <distance> tiles"
  const bearingMatch = lower.match(
    /found\s+(wood|stone|food|water)\s+at\s+bearing\s+(\d+)°?\s+about\s+(\d+)\s+tiles?/
  );

  if (bearingMatch) {
    const resourceType = bearingMatch[1] as ResourceType;
    const bearingDegrees = parseFloat(bearingMatch[2]);
    const distance = parseFloat(bearingMatch[3]);

    // Convert speaker's bearing to world direction
    const bearingRadians = (bearingDegrees * Math.PI) / 180;
    const worldDirection = {
      x: Math.cos(bearingRadians),
      y: Math.sin(bearingRadians),
    };

    return {
      direction: worldDirection,
      strength: 0.8,  // High confidence from direct report
      distance,
      confidence: 0.9,
      learnedTick: world.tick,
      source: speakerId,
    };
  }

  // Pattern: "the <resource> <direction> is depleted"
  const depletionMatch = lower.match(
    /(wood|stone|food|water)\s+(north|south|east|west|northeast|northwest|southeast|southwest)\s+is\s+depleted/
  );

  if (depletionMatch) {
    const direction = cardinalToVector(depletionMatch[2]);
    return {
      direction,
      strength: -0.5,  // NEGATIVE strength = avoid
      distance: 20,    // Rough estimate
      confidence: 0.7,
      learnedTick: world.tick,
      source: speakerId,
    };
  }

  // Pattern: "explored <direction> for <distance>, nothing found"
  const exploredMatch = lower.match(
    /explored\s+(north|south|east|west|northeast|northwest|southeast|southwest)\s+for\s+(\d+)/
  );

  if (exploredMatch) {
    const direction = cardinalToVector(exploredMatch[1]);
    const distance = parseFloat(exploredMatch[2]);

    return {
      direction,
      strength: -0.3,  // Slight avoidance (explored, nothing there)
      distance,
      confidence: 0.6,
      learnedTick: world.tick,
      source: speakerId,
    };
  }

  return null;
}

function cardinalToVector(direction: string): Vector2D {
  const map: Record<string, Vector2D> = {
    north: { x: 0, y: -1 },
    south: { x: 0, y: 1 },
    east: { x: 1, y: 0 },
    west: { x: -1, y: 0 },
    northeast: { x: 0.707, y: -0.707 },
    northwest: { x: -0.707, y: -0.707 },
    southeast: { x: 0.707, y: 0.707 },
    southwest: { x: -0.707, y: 0.707 },
  };
  return map[direction] || { x: 0, y: 0 };
}
```

#### Integrating Social Gradients into Movement

```typescript
function calculateSocialGradientVelocity(
  entity: EntityImpl,
  searchFor: ResourceType,
  maxSpeed: number
): Vector2D {
  const socialGradient = entity.getComponent<SocialGradientComponent>('social_gradient');
  const position = entity.getComponent<PositionComponent>('position')!;

  if (!socialGradient) {
    return { x: 0, y: 0 };
  }

  // Get all relevant gradients for this resource
  const gradients = socialGradient.resourceGradients.get(searchFor) || [];

  // Filter out stale gradients (older than 200 ticks = 10 seconds)
  const freshGradients = gradients.filter(
    (g) => world.tick - g.learnedTick < 200
  );

  if (freshGradients.length === 0) {
    return { x: 0, y: 0 };
  }

  // Blend all gradients weighted by confidence and recency
  let totalX = 0;
  let totalY = 0;
  let totalWeight = 0;

  for (const gradient of freshGradients) {
    const age = world.tick - gradient.learnedTick;
    const recencyFactor = Math.max(0, 1 - age / 200);  // Decays to 0 over 200 ticks

    const weight = gradient.confidence * recencyFactor * gradient.strength;

    totalX += gradient.direction.x * weight;
    totalY += gradient.direction.y * weight;
    totalWeight += Math.abs(weight);
  }

  if (totalWeight === 0) {
    return { x: 0, y: 0 };
  }

  // Normalize and scale to max speed
  const magnitude = Math.sqrt(totalX * totalX + totalY * totalY);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (totalX / magnitude) * maxSpeed,
    y: (totalY / magnitude) * maxSpeed,
  };
}
```

#### LLM Agents Sharing Discoveries

Enhance LLM prompts to encourage gradient sharing:

```typescript
// In PromptBuilder
function buildExplorationPrompt(entity: EntityImpl): string {
  const vision = entity.getComponent<VisionComponent>('vision')!;

  let prompt = `You are exploring the wilderness.

Recent Discoveries:
`;

  if (vision.seenResources.length > 0) {
    prompt += `- You just spotted ${vision.seenResources.length} resources nearby!\n`;
    prompt += `\nYou should TELL other agents about this! Use phrases like:\n`;
    prompt += `  "Found wood at bearing 45° about 30 tiles!"\n`;
    prompt += `  "There's stone northeast of here!"\n`;
  } else {
    prompt += `- Nothing found in this area.\n`;
    prompt += `\nConsider warning others: "Explored west for 20 tiles, nothing found."\n`;
  }

  return prompt;
}
```

### Field Blending: Combining Multiple Influences

Agents can be influenced by multiple fields simultaneously. The final velocity is a weighted blend:

```typescript
function blendFlowFields(
  position: Position,
  fields: Array<{ field: FlowField; weight: number }>,
  maxSpeed: number
): Vector2D {
  let totalX = 0;
  let totalY = 0;
  let totalWeight = 0;

  for (const { field, weight } of fields) {
    const sample = sampleFlowField(field, position);

    totalX += sample.x * weight;
    totalY += sample.y * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return { x: 0, y: 0 };
  }

  const avgX = totalX / totalWeight;
  const avgY = totalY / totalWeight;

  // Normalize and scale to max speed
  const magnitude = Math.sqrt(avgX * avgX + avgY * avgY);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (avgX / magnitude) * maxSpeed,
    y: (avgY / magnitude) * maxSpeed,
  };
}

function sampleFlowField(field: FlowField, position: Position): Vector2D {
  // Convert world position to grid coordinates
  const gx = Math.floor(position.x / field.cellSize);
  const gy = Math.floor(position.y / field.cellSize);

  if (
    gx < 0 ||
    gx >= field.grid[0].length ||
    gy < 0 ||
    gy >= field.grid.length
  ) {
    return { x: 0, y: 0 };  // Out of bounds
  }

  return field.grid[gy][gx];
}
```

#### Example: Group Exploration Behavior

```typescript
private groupExploreBehavior(entity: EntityImpl, world: World): void {
  const position = entity.getComponent<PositionComponent>('position')!;
  const movement = entity.getComponent<MovementComponent>('movement')!;
  const agent = entity.getComponent<AgentComponent>('agent')!;

  // Blend three fields:
  // 1. Exploration field (toward frontier)
  // 2. Dispersion field (avoid crowding)
  // 3. Social gradient (listen to others)

  const explorationField = world.getResource<FlowField>('exploration_field');
  const dispersionField = world.getResource<FlowField>('dispersion_field');

  const fields = [
    { field: explorationField, weight: 0.6 },  // Primary: explore
    { field: dispersionField, weight: 0.3 },   // Secondary: spread out
  ];

  // Sample flow fields
  const fieldVelocity = blendFlowFields(position, fields, movement.speed);

  // Add social gradient influence
  const socialVelocity = calculateSocialGradientVelocity(
    entity,
    agent.behaviorState?.searchFor,
    movement.speed
  );

  // Blend field + social (70% field, 30% social)
  const combinedVelocity = {
    x: fieldVelocity.x * 0.7 + socialVelocity.x * 0.3,
    y: fieldVelocity.y * 0.7 + socialVelocity.y * 0.3,
  };

  // Add steering obstacle avoidance
  const avoidForce = avoidObstacles(entity, world, combinedVelocity, 3.0);

  const finalVelocity = {
    x: combinedVelocity.x * 0.9 + avoidForce.x * 0.1,
    y: combinedVelocity.y * 0.9 + avoidForce.y * 0.1,
  };

  entity.updateComponent<MovementComponent>('movement', (current) => ({
    ...current,
    velocityX: finalVelocity.x,
    velocityY: finalVelocity.y,
  }));

  // Check if we found the target
  const vision = entity.getComponent<VisionComponent>('vision')!;
  if (vision.seenResources.length > 0) {
    // Success! Broadcast discovery
    const resource = world.getEntity(vision.seenResources[0]) as EntityImpl;
    const resourcePos = resource.getComponent<PositionComponent>('position')!;
    const resourceComp = resource.getComponent<ResourceComponent>('resource')!;

    // Calculate bearing from current position
    const dx = resourcePos.x - position.x;
    const dy = resourcePos.y - position.y;
    const bearing = Math.atan2(dy, dx);
    const bearingDegrees = Math.round((bearing * 180) / Math.PI);
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy));

    // Speak to nearby agents
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      recentSpeech: `Found ${resourceComp.resourceType} at bearing ${bearingDegrees}° about ${distance} tiles!`,
    }));

    // Switch to gather
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'navigate',
      behaviorState: {
        targetX: resourcePos.x,
        targetY: resourcePos.y,
        onArrival: 'gather',
      },
    }));
  }
}
```

### Performance & Update Strategy

**Field Regeneration Schedule:**
- **Exploration field**: Regenerate when new sector explored (event-driven)
- **Home field**: Regenerate when settlement moves/expands (rare)
- **Dispersion field**: Regenerate every 20 ticks (1 second)
- **Resource field**: Regenerate when new resources discovered (event-driven)

**Social gradients**: Update every tick (lightweight, per-agent)

**Grid resolution trade-off:**
- 4 tiles/cell: Smooth, high memory (recommended for <50 agents)
- 8 tiles/cell: Coarser, low memory (recommended for 50-200 agents)
- 16 tiles/cell: Very coarse, minimal memory (200+ agents)

---

## Component 3: Exploration System

### Goal
Enable agents to systematically search for resources they haven't seen yet.

### Strategy: Frontier-Based Exploration with Expanding Radius

**Concept:**
- Agent has a "home base" (settlement center or spawn point)
- Exploration radius expands based on settlement development
- Agent ventures toward unexplored frontier
- Returns home when reaching maximum radius or finding target

### Settlement Size → Exploration Radius Mapping

```typescript
interface SettlementState {
  centerX: number;
  centerY: number;
  populationCount: number;
  buildingCount: number;
  tier: 'early' | 'established' | 'advanced';  // Based on buildings/resources
}

function calculateExplorationRadius(settlement: SettlementState): number {
  // Base radius
  let radius = 20;  // Always explore at least 20 tiles

  // Increase with population
  radius += settlement.populationCount * 2;  // +2 tiles per agent

  // Increase with development tier
  switch (settlement.tier) {
    case 'early':
      radius += 10;
      break;
    case 'established':
      radius += 30;
      break;
    case 'advanced':
      radius += 60;
      break;
  }

  // Cap at reasonable maximum
  return Math.min(radius, 150);
}

// Settlement tier determined by:
// Early: < 3 buildings, < 100 total resources
// Established: 3-10 buildings, 100-500 resources
// Advanced: > 10 buildings, > 500 resources
```

### Exploration Behavior State

```typescript
interface ExploreState {
  homeX: number;               // Return point
  homeY: number;
  searchFor: ResourceType;     // What resource to look for
  explorationRadius: number;   // Max distance from home
  currentTargetX: number;      // Current exploration waypoint
  currentTargetY: number;
  explorationMode: 'spiral' | 'frontier' | 'random';
  spiralAngle?: number;        // For spiral mode
  spiralDistance?: number;     // Current ring distance
  sectorsVisited?: Set<string>; // For frontier mode
}
```

### Exploration Algorithms

#### Algorithm 1: Spiral Search (Simple, Predictable)

```typescript
function calculateSpiralTarget(
  homeX: number,
  homeY: number,
  angle: number,
  distance: number
): Position {
  return {
    x: homeX + Math.cos(angle) * distance,
    y: homeY + Math.sin(angle) * distance
  };
}

function spiralExplore(state: ExploreState, currentPos: Position): Position {
  const homeDistance = Math.sqrt(
    (currentPos.x - state.homeX) ** 2 +
    (currentPos.y - state.homeY) ** 2
  );

  // If at max radius, return home
  if (homeDistance >= state.explorationRadius) {
    return { x: state.homeX, y: state.homeY };
  }

  // Calculate next spiral point
  const angleIncrement = Math.PI / 8;  // 22.5 degrees per step
  const newAngle = (state.spiralAngle || 0) + angleIncrement;

  // Increase distance every full rotation
  let newDistance = state.spiralDistance || 5;
  if (newAngle >= Math.PI * 2) {
    newDistance += 5;  // Move 5 tiles outward
  }

  const target = calculateSpiralTarget(
    state.homeX,
    state.homeY,
    newAngle % (Math.PI * 2),
    Math.min(newDistance, state.explorationRadius)
  );

  // Update state
  state.spiralAngle = newAngle % (Math.PI * 2);
  state.spiralDistance = newDistance;

  return target;
}
```

#### Algorithm 2: Frontier-Based (Intelligent, Avoids Revisiting)

Divide world into sectors and prioritize unexplored ones.

```typescript
const SECTOR_SIZE = 16;  // 16x16 tile sectors

function getSectorKey(x: number, y: number): string {
  const sectorX = Math.floor(x / SECTOR_SIZE);
  const sectorY = Math.floor(y / SECTOR_SIZE);
  return `${sectorX},${sectorY}`;
}

function frontierExplore(
  state: ExploreState,
  currentPos: Position,
  episodicMemory: EpisodicMemoryComponent
): Position {
  const homeDistance = Math.sqrt(
    (currentPos.x - state.homeX) ** 2 +
    (currentPos.y - state.homeY) ** 2
  );

  // If at max radius, return home
  if (homeDistance >= state.explorationRadius) {
    return { x: state.homeX, y: state.homeY };
  }

  // Mark current sector as visited
  const currentSector = getSectorKey(currentPos.x, currentPos.y);
  if (!state.sectorsVisited) {
    state.sectorsVisited = new Set<string>();
  }
  state.sectorsVisited.add(currentSector);

  // Find all sectors within exploration radius
  const radiusInSectors = Math.ceil(state.explorationRadius / SECTOR_SIZE);
  const homeSectorX = Math.floor(state.homeX / SECTOR_SIZE);
  const homeSectorY = Math.floor(state.homeY / SECTOR_SIZE);

  const candidateSectors: Array<{ x: number; y: number; distance: number }> = [];

  for (let dx = -radiusInSectors; dx <= radiusInSectors; dx++) {
    for (let dy = -radiusInSectors; dy <= radiusInSectors; dy++) {
      const sectorX = homeSectorX + dx;
      const sectorY = homeSectorY + dy;
      const sectorKey = `${sectorX},${sectorY}`;

      // Skip visited sectors
      if (state.sectorsVisited.has(sectorKey)) continue;

      // Calculate sector center in world coordinates
      const centerX = sectorX * SECTOR_SIZE + SECTOR_SIZE / 2;
      const centerY = sectorY * SECTOR_SIZE + SECTOR_SIZE / 2;

      const distanceFromHome = Math.sqrt(
        (centerX - state.homeX) ** 2 +
        (centerY - state.homeY) ** 2
      );

      // Only consider sectors within radius
      if (distanceFromHome <= state.explorationRadius) {
        candidateSectors.push({
          x: centerX,
          y: centerY,
          distance: distanceFromHome
        });
      }
    }
  }

  if (candidateSectors.length === 0) {
    // All sectors explored, return home
    return { x: state.homeX, y: state.homeY };
  }

  // Prioritize sectors:
  // 1. Closer to current position (efficiency)
  // 2. On the frontier (expanding outward)
  candidateSectors.sort((a, b) => {
    const distToA = Math.sqrt((a.x - currentPos.x) ** 2 + (a.y - currentPos.y) ** 2);
    const distToB = Math.sqrt((b.x - currentPos.x) ** 2 + (b.y - currentPos.y) ** 2);

    // Prefer frontier (sectors further from home)
    const frontierScore = b.distance - a.distance;
    const proximityScore = distToA - distToB;

    return frontierScore * 0.6 + proximityScore * 0.4;
  });

  const targetSector = candidateSectors[0];

  // Add some randomness to exact target within sector
  const randomOffsetX = (Math.random() - 0.5) * SECTOR_SIZE;
  const randomOffsetY = (Math.random() - 0.5) * SECTOR_SIZE;

  return {
    x: targetSector.x + randomOffsetX,
    y: targetSector.y + randomOffsetY
  };
}
```

#### Algorithm 3: Lévy Flight (Biologically-Inspired Random Walk)

Alternates between short local searches and long jumps.

```typescript
function levyFlight(
  state: ExploreState,
  currentPos: Position,
  alpha: number = 1.5  // Lévy exponent (1.5 = optimal for unknown environments)
): Position {
  // Decide: short hop or long jump?
  const isLongJump = Math.random() < 0.2;  // 20% chance of long jump

  let stepSize: number;
  if (isLongJump) {
    // Power-law distribution for step size
    stepSize = Math.pow(Math.random(), -1 / alpha) * state.explorationRadius * 0.3;
  } else {
    // Short local search
    stepSize = Math.random() * 5;
  }

  // Random direction
  const angle = Math.random() * Math.PI * 2;

  const target = {
    x: currentPos.x + Math.cos(angle) * stepSize,
    y: currentPos.y + Math.sin(angle) * stepSize
  };

  // Ensure within exploration radius
  const distanceFromHome = Math.sqrt(
    (target.x - state.homeX) ** 2 +
    (target.y - state.homeY) ** 2
  );

  if (distanceFromHome > state.explorationRadius) {
    // Reflect back toward home
    return { x: state.homeX, y: state.homeY };
  }

  return target;
}
```

### New Behavior: `explore`

```typescript
private exploreBehavior(entity: EntityImpl, world: World): void {
  const position = entity.getComponent<PositionComponent>('position')!;
  const movement = entity.getComponent<MovementComponent>('movement')!;
  const agent = entity.getComponent<AgentComponent>('agent')!;
  const vision = entity.getComponent<VisionComponent>('vision')!;
  const episodicMemory = entity.getComponent<EpisodicMemoryComponent>('episodicMemory')!;

  // Initialize exploration state if needed
  if (!agent.behaviorState?.homeX) {
    agent.behaviorState = {
      homeX: position.x,
      homeY: position.y,
      explorationRadius: 30,  // TODO: Calculate from settlement
      explorationMode: 'frontier',
      sectorsVisited: new Set<string>()
    };
  }

  const state = agent.behaviorState as ExploreState;

  // Check if we found the target resource
  if (state.searchFor && vision.seenResources.length > 0) {
    for (const resourceId of vision.seenResources) {
      const resourceEntity = world.getEntity(resourceId) as EntityImpl;
      const resourceComp = resourceEntity?.getComponent<ResourceComponent>('resource');

      if (resourceComp?.resourceType === state.searchFor) {
        // Success! Found the resource
        const resourcePos = resourceEntity.getComponent<PositionComponent>('position')!;

        // Switch to navigate → gather
        entity.updateComponent<AgentComponent>('agent', current => ({
          ...current,
          behavior: 'navigate',
          behaviorState: {
            targetX: resourcePos.x,
            targetY: resourcePos.y,
            onArrival: 'gather'
          }
        }));
        return;
      }
    }
  }

  // Calculate next exploration target
  let target: Position;

  switch (state.explorationMode) {
    case 'spiral':
      target = spiralExplore(state, position);
      break;
    case 'frontier':
      target = frontierExplore(state, position, episodicMemory);
      break;
    case 'random':
      target = levyFlight(state, position);
      break;
    default:
      target = frontierExplore(state, position, episodicMemory);
  }

  // Check if we should return home
  const distanceFromHome = Math.sqrt(
    (position.x - state.homeX) ** 2 +
    (position.y - state.homeY) ** 2
  );

  if (distanceFromHome >= state.explorationRadius) {
    // Return home
    target = { x: state.homeX, y: state.homeY };
  }

  // Use navigation steering to reach target
  const arriveForce = arrive(position, target, movement.speed, 5.0);
  const avoidForce = avoidObstacles(entity, world, arriveForce, 3.0);

  const combinedVelocity = {
    x: arriveForce.x * 0.8 + avoidForce.x * 0.2,
    y: arriveForce.y * 0.8 + avoidForce.y * 0.2
  };

  entity.updateComponent<MovementComponent>('movement', current => ({
    ...current,
    velocityX: combinedVelocity.x,
    velocityY: combinedVelocity.y
  }));
}
```

---

## Component 4: LLM Integration

### Enhanced Prompt Context

When LLM agents make decisions, provide spatial memory context:

```typescript
// In PromptBuilder
function buildAgentPrompt(entity: EntityImpl, world: World): string {
  const episodicMemory = entity.getComponent<EpisodicMemoryComponent>('episodicMemory')!;

  // Query known resource locations
  const knownResources = {
    wood: queryResourceMemory(entity, 'wood', 3),
    stone: queryResourceMemory(entity, 'stone', 3),
    food: queryResourceMemory(entity, 'food', 3)
  };

  let prompt = `You are an agent in a settlement simulation.

Current Status:
- Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})
- Energy: ${needs.energy}%
- Inventory: ${inventoryDescription}

Known Resource Locations:
`;

  for (const [resourceType, locations] of Object.entries(knownResources)) {
    if (locations.length > 0) {
      prompt += `- ${resourceType}:\n`;
      for (const loc of locations) {
        prompt += `  • ${loc.distance.toFixed(1)} tiles away (confidence: ${(loc.confidence * 100).toFixed(0)}%)\n`;
      }
    } else {
      prompt += `- ${resourceType}: None known (need to explore)\n`;
    }
  }

  prompt += `
Available Actions:
- navigate <x> <y>: Move to specific coordinates
- explore <resource_type>: Search for a resource you haven't found yet
- gather: Harvest nearby resource
- wander: Random movement
- idle: Rest in place

What do you want to do?`;

  return prompt;
}
```

### LLM Action Parsing

Extend action parser to handle new actions:

```typescript
// In AgentAction.ts
export type AgentAction =
  | { type: 'navigate'; x: number; y: number; onArrival?: string }
  | { type: 'explore'; searchFor?: ResourceType }
  | { type: 'wander' }
  | { type: 'gather' }
  // ... existing actions

export function parseAction(response: string): AgentAction | null {
  const lower = response.toLowerCase().trim();

  // Navigate pattern: "navigate 45.2 67.8" or "go to 45.2, 67.8"
  const navigateMatch = lower.match(/(?:navigate|go to)\s+(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (navigateMatch) {
    return {
      type: 'navigate',
      x: parseFloat(navigateMatch[1]),
      y: parseFloat(navigateMatch[2])
    };
  }

  // Explore pattern: "explore wood" or "search for stone"
  const exploreMatch = lower.match(/(?:explore|search for)\s+(wood|stone|food|water)/);
  if (exploreMatch) {
    return {
      type: 'explore',
      searchFor: exploreMatch[1] as ResourceType
    };
  }

  // Explore without target: "explore" or "look around"
  if (lower.includes('explore') || lower.includes('look around')) {
    return { type: 'explore' };
  }

  // ... existing patterns
}
```

---

## Implementation Phases

### Phase 1: Foundation (Steering Behaviors + Navigate)
**Files to modify:**
- `packages/core/src/systems/AISystem.ts`
  - Add `navigateBehavior()` method
  - Add steering helper functions (seek, arrive, avoidObstacles)
  - Register 'navigate' behavior

**Testing:**
- Create test agent with `navigate` behavior, target (50, 50)
- Verify agent reaches target and stops
- Verify agent avoids obstacles (place trees in path)

**Estimated complexity:** Medium (200-300 lines)

---

### Phase 2: Memory Queries
**Files to modify:**
- `packages/core/src/systems/AISystem.ts`
  - Add `queryResourceMemory()` helper
  - Add memory validation on arrival

**Files to create:**
- `packages/core/src/utils/SpatialMemory.ts` (optional, for cleaner separation)

**Testing:**
- Agent sees wood, memory created
- Query returns wood location
- Agent navigates to remembered location
- Verify confidence decay over time

**Estimated complexity:** Small (100-150 lines)

---

### Phase 3: Basic Exploration (Spiral)
**Files to modify:**
- `packages/core/src/systems/AISystem.ts`
  - Add `exploreBehavior()` method
  - Implement spiral algorithm
  - Register 'explore' behavior

**Files to create:**
- `packages/core/src/behaviors/ExplorationAlgorithms.ts` (optional)

**Testing:**
- Agent with `explore` behavior spirals outward from spawn
- Agent returns home at max radius
- Agent switches to gather when resource found

**Estimated complexity:** Medium (150-200 lines)

---

### Phase 4: Flow Field System
**Files to create:**
- `packages/core/src/navigation/FlowField.ts`
  - `generateExplorationField()` - Frontier-based flow field
  - `generateHomeField()` - Return-to-settlement field
  - `generateDispersionField()` - Anti-crowding field
  - `generateResourceField()` - Attraction to known resources
  - `costGridToFlowField()` - Convert cost maps to vector fields
  - `blendFlowFields()` - Weighted blending of multiple fields
  - `sampleFlowField()` - Sample field at position

**Files to modify:**
- `packages/core/src/systems/AISystem.ts`
  - Add `FlowFieldManager` to cache and regenerate fields
  - Add `groupExploreBehavior()` using flow field blending

**World Resources to add:**
- `exploration_field: FlowField` - Regenerated when sectors explored
- `home_field: FlowField` - Regenerated when settlement changes
- `dispersion_field: FlowField` - Regenerated every 20 ticks

**Testing:**
- Generate exploration field, verify vectors point toward frontier
- 5 agents exploring simultaneously should spread naturally
- Dispersion field should push agents apart in crowded areas
- Fields should regenerate on appropriate events

**Estimated complexity:** Large (400-500 lines)

---

### Phase 5: Social Gradient Communication
**Files to create:**
- `packages/core/src/components/SocialGradientComponent.ts`
  - Component definition for tracking learned gradients
  - `resourceGradients: Map<ResourceType, SocialGradient[]>`
  - `avoidanceZones: Array<AvoidanceZone>`
  - `explorationHints: Array<ExplorationHint>`

- `packages/core/src/navigation/SocialGradient.ts`
  - `parseGradientFromSpeech()` - Extract gradient info from speech
  - `calculateSocialGradientVelocity()` - Blend social gradients to velocity
  - `cardinalToVector()` - Convert "north", "southwest" to vectors

**Files to modify:**
- `packages/core/src/systems/AISystem.ts`
  - In `processHearing()`, parse speech for gradient information
  - Update agents' SocialGradientComponent when hearing discoveries
  - Integrate social gradients into movement decisions

- `packages/llm/src/PromptBuilder.ts`
  - Encourage agents to broadcast discoveries
  - Suggest structured phrases: "Found wood at bearing 45° about 30 tiles"

- `packages/world/src/entities/AgentEntity.ts`
  - Add SocialGradientComponent to agent creation

**Testing:**
- Agent A finds stone, broadcasts "Found stone northeast!"
- Agent B (within hearing range) updates gradient toward northeast
- Agent B navigates based on social gradient
- Verify gradient decay over time (stale info loses influence)
- LLM agents should naturally use broadcast phrases

**Estimated complexity:** Medium (300-350 lines)

---

### Phase 6: Advanced Exploration (Frontier)
**Files to modify:**
- `packages/core/src/behaviors/ExplorationAlgorithms.ts`
  - Add sector tracking
  - Implement frontier algorithm

**Testing:**
- Agent explores without revisiting sectors
- Verify coverage efficiency (measure tiles explored vs distance traveled)
- Multiple agents explore different sectors

**Estimated complexity:** Medium (200-250 lines)

---

### Phase 7: Settlement-Based Radius
**Files to create:**
- `packages/core/src/systems/SettlementSystem.ts`
  - Track settlement stats (population, buildings, resources)
  - Calculate exploration radius
  - Emit events when radius changes

**Files to modify:**
- `packages/core/src/systems/AISystem.ts`
  - Read exploration radius from settlement state

**Testing:**
- Radius increases as buildings are constructed
- Agents respect new radius bounds

**Estimated complexity:** Medium (150-200 lines)

---

### Phase 8: LLM Integration
**Files to modify:**
- `packages/llm/src/PromptBuilder.ts`
  - Add resource memory to context
  - Add distance information

- `packages/core/src/actions/AgentAction.ts`
  - Add action parsing for navigate/explore

**Testing:**
- LLM agent sees "wood 20 tiles away" in prompt
- LLM responds "navigate to wood"
- Agent executes navigation correctly

**Estimated complexity:** Small (100 lines)

---

### Phase 9: Optimization & Polish
**Enhancements:**
- A* fallback for stuck agents
- Group coordination (don't all explore same sector)
- Return-home urgency based on energy/inventory
- Visual debugging (draw exploration targets, paths)

**Testing:**
- Performance profiling (10+ agents exploring simultaneously)
- Edge cases (agent stuck in corner, out of bounds, etc.)

**Estimated complexity:** Medium (varies based on features)

---

## Performance Considerations

### Computational Cost

| Component | Cost per Agent per Tick | Optimization |
|-----------|------------------------|--------------|
| Memory Query | O(M log M) where M = memory count | Cache query results, only recompute every 20 ticks |
| Steering (Seek/Arrive) | O(1) | None needed |
| Obstacle Avoidance | O(N) where N = nearby entities | Use spatial hash / chunk system |
| **Flow Field Generation** | **O(W × H) one-time** | Event-driven regeneration, cached |
| **Flow Field Sampling** | **O(1) per agent** | Direct grid lookup |
| **Social Gradient Update** | O(G) where G = gradient count | Remove stale gradients, cap at 20 |
| Frontier Exploration | O(S) where S = sector count | Only recalculate when sector changes |
| Spiral Exploration | O(1) | None needed |

### Recommended Optimizations

1. **Staggered Updates:**
   - Already implemented for thinking (thinkOffset)
   - Apply same pattern to pathfinding recalculations

2. **Spatial Hashing:**
   - Chunk system already provides this
   - Use chunk queries for obstacle avoidance (only check nearby chunks)

3. **Lazy Memory Queries:**
   - Don't query every tick
   - Cache results for 1-2 seconds
   - Invalidate on significant events (resource depleted, new discovery)

4. **Level of Detail (LOD):**
   - Agents far from camera use simpler behaviors
   - Reduce steering calculation frequency for distant agents

---

## Success Metrics

### Functional Requirements
- ✅ Agents remember resource locations for at least 80 ticks (4 seconds)
- ✅ Agents can navigate to remembered locations with <10% failure rate
- ✅ Agents successfully find new resources within 2x the time of random walk
- ✅ Exploration radius correctly scales with settlement size

### Performance Requirements
- ✅ System supports 20+ exploring agents at 20 TPS with no frame drops
- ✅ Memory queries complete in <5ms per agent
- ✅ Obstacle avoidance doesn't cause jittering or stuck states >5% of time

### User Experience
- ✅ LLM agents can respond to "go find wood" command
- ✅ Visual feedback shows exploration targets (debug mode)
- ✅ Agents appear purposeful, not random

---

## Integration with Epistemic Learning System

**Cross-Reference:** See [Epistemic Learning & Belief Formation Specification](./EPISTEMIC_LEARNING_SPEC.md) for full details.

### The Problem: Trust-Weighted Gradient Communication

Social gradient communication (Section on gradient sharing) relies on agents broadcasting resource locations:

```typescript
agent.speak("Found wood at bearing 45° about 30 tiles!");
```

**But what if the information is wrong?**

- Agent hallucinated the location (LLM generated plausible but false claim)
- Agent misremembered (low confidence memory)
- Resource was depleted since agent saw it (stale information)
- Agent deliberately misinformed (rare but possible)

Without verification, false information pollutes the social gradient system and causes:
- Wasted agent time (navigating to non-existent resources)
- Trust erosion (agents stop believing each other)
- System breakdown (everyone ignores social gradients)

### Solution: Verification & Trust Weighting

#### Step 1: Verify Claims Upon Arrival

```typescript
function verifyResourceClaim(
  agent: Agent,
  gradient: SocialGradient,
  arrivedLocation: Position
): ResourceVerification {
  const visible = world.getVisibleResources(arrivedLocation, agent.visionRadius);
  const expectedResource = gradient.resourceType;
  const found = visible.some(r => r.type === expectedResource);

  return {
    informant: gradient.source,
    expectedResource: expectedResource,
    expectedLocation: arrivedLocation,
    actuallyFound: found,
    actualResource: visible[0]?.type,
    verifiedAt: world.tick,
    timeSinceReport: world.tick - gradient.learnedTick
  };
}

// When agent arrives at gradient-suggested location
const verification = verifyResourceClaim(agent, gradient, agent.position);

if (verification.actuallyFound) {
  // SUCCESS: Information was accurate
  agent.trustNetwork.updateTrust(verification.informant, verified: true);

  agent.episodicMemory.record({
    summary: `Found ${expectedResource} where ${informant.name} said!`,
    emotionalImpact: +0.6,
    tags: ['trust_verified', 'accurate_information']
  });

  // Public positive feedback
  agent.speak(`Thanks ${informant.name}! Found ${expectedResource} right where you said!`);

} else {
  // FAILURE: Information was wrong
  const failure = categorizeFailure(verification, gradient);

  agent.trustNetwork.updateTrust(
    verification.informant,
    verified: false,
    severity: failure.severity
  );

  agent.episodicMemory.record({
    summary: `${informant.name} said ${expectedResource} at bearing X, found nothing. ${informant.name} is unreliable.`,
    emotionalImpact: -0.8,
    tags: ['trust_violation', 'false_information']
  });

  // Public negative feedback (social punishment)
  agent.speak(`${informant.name}, you said ${expectedResource} was here. I found nothing. Don't expect my help anymore.`);
}
```

#### Step 2: Weight Gradients by Trust

Instead of treating all social gradients equally, weight them by the informant's trust score:

```typescript
function blendSocialGradients(
  agent: Agent,
  gradients: SocialGradient[]
): Vector2D {
  let totalX = 0;
  let totalY = 0;
  let totalWeight = 0;

  for (const g of gradients) {
    // Get trust score for this informant
    const trustScore = agent.trustNetwork.getTrust(g.source) ?? 0.5;

    // Calculate age decay
    const age = world.tick - g.learnedTick;
    const recencyFactor = Math.max(0, 1 - age / 200);

    // TRUST WEIGHTING: High-trust sources have more influence
    const weight = g.confidence * recencyFactor * trustScore * g.strength;

    totalX += g.direction.x * weight;
    totalY += g.direction.y * weight;
    totalWeight += Math.abs(weight);
  }

  // Normalize
  if (totalWeight === 0) return { x: 0, y: 0 };
  const magnitude = Math.sqrt(totalX ** 2 + totalY ** 2);
  return { x: totalX / magnitude, y: totalY / magnitude };
}
```

**Result:**
- High-trust agents (0.8+) → their gradients dominate influence
- Low-trust agents (0.3-) → their gradients nearly ignored
- New agents (0.5) → neutral influence until proven reliable

#### Step 3: Categorize Failures Contextually

Not all false information is equally bad:

```typescript
enum FailureReason {
  STALE = 'stale',              // Resource was there but got harvested
  MISIDENTIFIED = 'misidentified',  // Wrong resource type ("wood" vs "food")
  FALSE_REPORT = 'false_report',    // Nothing there at all
  UNRELIABLE_PATTERN = 'unreliable' // Repeated false claims
}

function categorizeFailure(
  verification: ResourceVerification,
  gradient: SocialGradient
): { reason: FailureReason, severity: number } {

  const timeSince = verification.verifiedAt - gradient.learnedTick;

  // Forgivable: Resource was depleted (stale information)
  if (timeSince > 500 ticks) {  // 25 seconds
    return { reason: FailureReason.STALE, severity: 0.1 };
  }

  // Medium fault: Wrong resource type (honest mistake)
  if (verification.actualResource && verification.actualResource !== verification.expectedResource) {
    return { reason: FailureReason.MISIDENTIFIED, severity: 0.3 };
  }

  // Serious fault: Nothing there at all (hallucination or lie)
  if (!verification.actualResource) {
    // Check for pattern of false claims
    const recentFailures = agent.trustNetwork.getRecentFailures(gradient.source, 1000);

    if (recentFailures.length > 3) {
      return { reason: FailureReason.UNRELIABLE_PATTERN, severity: 0.8 };
    }

    return { reason: FailureReason.FALSE_REPORT, severity: 0.5 };
  }
}

// Apply contextual trust penalty
agent.trustNetwork.adjustTrust(informant, -failure.severity);
```

### Emergent Consequences

#### 1. Scout Reputation Economy

Agents who consistently provide accurate resource locations become **trusted scouts**:

```typescript
// Alice has provided 10 accurate resource locations
alice.trustScore (from Bob) = 0.92

// Bob receives conflicting gradients:
// Alice: "Wood at bearing 45°" (trust 0.92)
// Charlie: "Wood at bearing 90°" (trust 0.45)

// Weighted blend heavily favors Alice's gradient
// Bob navigates toward 45° (trusts Alice more)
```

**Emergent role:** High-trust scouts become de facto exploration leaders.

#### 2. Liar Detection & Exclusion

Agents who repeatedly provide false information face compounding consequences:

```typescript
// Dave has hallucinated 5 times about resource locations
dave.averageTrustScore = 0.15  // Very low

// Consequences:
// 1. Social gradients from Dave are ignored (trust weight ≈ 0)
// 2. Other agents refuse to share information with Dave
// 3. Dave struggles to find resources (excluded from group knowledge)
// 4. Dave's LLM context shows:
//    "⚠️ Your reputation is very poor. Agents are refusing to cooperate with you."
```

**Learning pressure:** Dave's LLM sees consequences and adjusts behavior (qualifies claims, admits ignorance).

#### 3. Information Networks Form

High-trust agents preferentially share information with each other, creating **trust clusters**:

```typescript
// High-trust cluster: Alice, Bob, Charlie (all trust > 0.7)
// They share detailed information:
alice.speak("Bob, I found a huge stone deposit at (142, 87). Bring storage!");

// Low-trust agents excluded from detailed information:
alice.speak("There's stone somewhere northeast.") // Vague, to low-trust Dave
```

**Emergent structure:** Information networks mirror trust networks.

#### 4. Epistemic Humility Develops

After experiencing trust loss from hallucinated claims, agents learn to qualify uncertain information:

```typescript
// Early game (newborn agent, no trust loss experience):
agent.speak("There are definitely berries to the north!");  // Hallucinated

// After 3 trust violations:
agent.speak("I think there might be berries north, but I'm not certain.");  // Hedged

// After developing good reputation:
agent.speak("I don't know where berries are. Has anyone seen them?");  // Honest ignorance
```

**Why this emerges:** LLM context includes:
- Recent trust losses
- Current low trust score (0.3)
- Memory: "Bob refused to help me after berry incident"
- Belief formed: "Making false claims damages relationships"

#### 5. Counter-Broadcasting Corrects Misinformation

When agents verify claims, they broadcast results publicly:

```typescript
// Alice claims: "Berries to the north"
alice.speak("Found berries at bearing 0° about 40 tiles!");

// Bob investigates
bob.navigateToBearing(0°, 40);

// Verification
if (bob.canSee('berries')) {
  bob.speak("Confirmed! Berries exactly where Alice said!");
  // Alice's trust increases with all listeners

} else {
  bob.speak("Went north like Alice said - no berries, only desert.");
  // Alice's trust decreases with all listeners
  // Correction prevents cascade of wasted effort
}
```

**Result:** Information ecosystem has built-in error correction through public verification.

### Beliefs About Resource Distribution

Agents form **world beliefs** (distinct from episodic memories) based on repeated observations:

```typescript
// After finding stone near mountains 5 times:
agent.beliefs.add({
  category: 'world_mechanics',
  subject: 'stone_distribution',
  statement: 'Stone deposits are more abundant near mountains',
  confidence: 0.8,
  evidence: [memory1, memory2, memory3, memory4, memory5]
});

// This belief guides future exploration:
if (agent.needsResource('stone') && !agent.hasRecentMemory('stone')) {
  // Instead of random exploration, bias toward mountains
  const mountainDirection = agent.findNearestTerrain('mountain');
  agent.explore({ bias: mountainDirection, strength: 0.6 });
}
```

**Emergent intelligence:** Agents develop heuristics about the world without explicit programming.

### Integration Summary

**Navigation System** provides:
- Social gradient communication (resource location broadcasts)
- Trust-weighted gradient blending
- Verification upon arrival

**Epistemic Learning System** provides:
- Trust scores (earned through verification)
- Belief formation (character judgments + world theories)
- Contextual failure categorization
- Social consequences (cooperation refusal)

**Together they create:**
- Self-correcting information ecosystem
- Scout reputation economy
- Emergent epistemic norms
- Learning pressure toward truthfulness
- Efficient collective resource discovery

**Key Insight:** Navigation isn't just about pathfinding - it's about **trusted information sharing** in a social network where reputation matters for survival.

---

## Future Enhancements

### Collaborative Mapping
- Agents share discovered locations via social memory
- Group coordination: "You explore north, I'll go south"
- Trust-weighted map fusion (prioritize high-trust agents' discoveries)

### Pheromone Trails
- Agents leave temporary markers for others
- "Hot spots" attract more explorers (positive feedback)
- Pheromone strength decays over time

### Predictive Memory
- "Stone is usually near mountains" (belief-guided exploration)
- Prioritize exploration of high-probability areas based on learned patterns
- Generalization from specific memories to world theories

### Dynamic Rebalancing
- If all agents exploring, some switch to gathering
- Load balancing based on settlement needs
- Trust-based task assignment (send reliable scouts for critical resources)

### Return Pathing
- Remember outbound path for efficient return
- Breadcrumb trail for complex navigation
- Share efficient routes with high-trust agents

---

## Appendix: Algorithm Comparison

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| **Spiral** | Predictable, complete coverage | Inefficient for distant targets | Small areas, systematic search |
| **Frontier** | Efficient, avoids revisiting | Complex state, memory overhead | Large areas, intelligent agents |
| **Lévy Flight** | Biologically realistic, good for unknown environments | Unpredictable, may miss areas | Foraging, open worlds |
| **Random Walk** | Simple, no state | Very inefficient | Fallback only |

**Recommendation:** Use **Frontier** as default for LLM agents, **Spiral** for scripted agents.

---

## Glossary

- **Steering Behavior:** Algorithm that produces velocity vectors for movement (e.g., seek, flee, arrive)
- **Frontier:** Edge between explored and unexplored territory
- **Sector:** Fixed-size region of world used for exploration tracking (16x16 tiles)
- **Confidence:** 0-1 value indicating how recent/reliable a memory is
- **Home Base:** Settlement center that agents return to
- **Exploration Radius:** Maximum distance from home agents will explore
- **Lévy Flight:** Random walk with heavy-tailed step distribution (mix of short and long jumps)

---

## References

1. Reynolds, C. (1999). "Steering Behaviors for Autonomous Characters"
2. Yamauchi, B. (1997). "A Frontier-Based Approach for Autonomous Exploration"
3. Viswanathan, G. M. et al. (1999). "Optimizing the success of random searches" (Lévy flights)
4. Russell & Norvig (2020). "Artificial Intelligence: A Modern Approach" (Chapter on Pathfinding)

---

**Document Version:** 1.1
**Last Updated:** 2025-12-24
**Author:** Multiverse: The End of Eternity Development Team

**Related Specifications:**
- [Epistemic Learning & Belief Formation](./EPISTEMIC_LEARNING_SPEC.md) - Trust-weighted gradient communication, verification mechanics
- [Hive Mind & Collective Intelligence](./HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md) - Swarm coordination, emergent behaviors
