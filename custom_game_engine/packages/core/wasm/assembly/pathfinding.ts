/**
 * A* Pathfinding Algorithm in AssemblyScript (compiles to WebAssembly)
 *
 * This implements a performant A* pathfinding algorithm for grid-based navigation.
 * Expected speedup: 1.5-2x over JavaScript for medium to complex paths (50-200 cells).
 */

// Priority queue node for A* open set
class PathNode {
  constructor(
    public x: i32,
    public y: i32,
    public g: f32,  // Cost from start
    public h: f32,  // Heuristic to goal
    public parentX: i32,
    public parentY: i32
  ) {}

  get f(): f32 {
    return this.g + this.h;
  }
}

// Min-heap priority queue for open set (ordered by f-score)
class PriorityQueue {
  private nodes: PathNode[] = [];

  push(node: PathNode): void {
    this.nodes.push(node);
    this.bubbleUp(this.nodes.length - 1);
  }

  pop(): PathNode | null {
    if (this.nodes.length === 0) return null;

    const result = this.nodes[0];
    const last = this.nodes.pop();

    if (this.nodes.length > 0 && last) {
      this.nodes[0] = last;
      this.bubbleDown(0);
    }

    return result;
  }

  private bubbleUp(index: i32): void {
    const node = this.nodes[index];

    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = this.nodes[parentIndex];

      if (node.f >= parent.f) break;

      this.nodes[index] = parent;
      index = parentIndex;
    }

    this.nodes[index] = node;
  }

  private bubbleDown(index: i32): void {
    const length = this.nodes.length;
    const node = this.nodes[index];

    while (true) {
      const leftIndex = (index << 1) + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = index;

      if (leftIndex < length && this.nodes[leftIndex].f < this.nodes[smallestIndex].f) {
        smallestIndex = leftIndex;
      }

      if (rightIndex < length && this.nodes[rightIndex].f < this.nodes[smallestIndex].f) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === index) break;

      this.nodes[index] = this.nodes[smallestIndex];
      index = smallestIndex;
    }

    this.nodes[index] = node;
  }

  get isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  get size(): i32 {
    return this.nodes.length;
  }
}

// Manhattan distance heuristic (admissible for 4-directional movement)
function heuristic(x1: i32, y1: i32, x2: i32, y2: i32): f32 {
  return f32(abs(x1 - x2) + abs(y1 - y2));
}

// Check if position is within map bounds and walkable
function isWalkable(x: i32, y: i32, mapWidth: i32, mapHeight: i32, obstacles: Uint8Array): boolean {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
    return false;
  }

  const index = y * mapWidth + x;
  return unchecked(obstacles[index]) === 0; // 0 = walkable, 1 = obstacle
}

// Encode position as key for closed set (assumes map size < 10000x10000)
function positionKey(x: i32, y: i32): i32 {
  return y * 10000 + x;
}

// Reconstruct path from goal to start using parent tracking
function reconstructPath(
  goalX: i32,
  goalY: i32,
  parentMap: Map<i32, i32>, // Key = position, Value = parent position
  outputX: Int32Array,
  outputY: Int32Array,
  maxPathLength: i32
): i32 {
  const path: i32[] = [];
  let currentKey = positionKey(goalX, goalY);

  // Walk backwards from goal to start
  let iterations = 0;
  const maxIterations = maxPathLength * 2; // Safety limit

  while (iterations < maxIterations) {
    path.push(currentKey);

    if (!parentMap.has(currentKey)) {
      break; // Reached start (no parent)
    }

    currentKey = parentMap.get(currentKey);
    iterations++;
  }

  // Reverse path to get start → goal order
  const length = min(path.length, maxPathLength);

  for (let i = 0; i < length; i++) {
    const key = path[length - 1 - i];
    const x = key % 10000;
    const y = key / 10000;

    unchecked(outputX[i] = x);
    unchecked(outputY[i] = y);
  }

  return length;
}

/**
 * A* Pathfinding Algorithm
 *
 * @param startX - Start X coordinate
 * @param startY - Start Y coordinate
 * @param goalX - Goal X coordinate
 * @param goalY - Goal Y coordinate
 * @param mapWidth - Map width in tiles
 * @param mapHeight - Map height in tiles
 * @param obstacles - Obstacle map (0 = walkable, 1 = blocked), row-major order
 * @param outputX - Output array for path X coordinates
 * @param outputY - Output array for path Y coordinates
 * @param maxPathLength - Maximum path length (safety limit)
 * @returns Path length (0 if no path found)
 */
export function findPath(
  startX: i32,
  startY: i32,
  goalX: i32,
  goalY: i32,
  mapWidth: i32,
  mapHeight: i32,
  obstaclesPtr: usize,     // Pointer to obstacles array in WASM memory
  outputXPtr: usize,       // Pointer to output X array in WASM memory
  outputYPtr: usize,       // Pointer to output Y array in WASM memory
  maxPathLength: i32
): i32 {
  // Create typed array views from pointers
  const obstacles = Uint8Array.wrap(changetype<ArrayBuffer>(obstaclesPtr), 0, mapWidth * mapHeight);
  const outputX = Int32Array.wrap(changetype<ArrayBuffer>(outputXPtr), 0, maxPathLength);
  const outputY = Int32Array.wrap(changetype<ArrayBuffer>(outputYPtr), 0, maxPathLength);

  // Early exit: goal not walkable
  if (!isWalkable(goalX, goalY, mapWidth, mapHeight, obstacles)) {
    return 0;
  }

  // Early exit: start == goal
  if (startX === goalX && startY === goalY) {
    unchecked(outputX[0] = startX);
    unchecked(outputY[0] = startY);
    return 1;
  }

  const openSet = new PriorityQueue();
  const closedSet = new Set<i32>();
  const parentMap = new Map<i32, i32>();

  // Add start node
  const startNode = new PathNode(
    startX,
    startY,
    0.0,
    heuristic(startX, startY, goalX, goalY),
    -1,
    -1
  );
  openSet.push(startNode);

  // Track g-scores to update nodes if we find better paths
  const gScores = new Map<i32, f32>();
  gScores.set(positionKey(startX, startY), 0.0);

  // 4-directional movement (N, E, S, W)
  const directions: i32[] = [
    0, 1,   // North
    1, 0,   // East
    0, -1,  // South
    -1, 0   // West
  ];

  let iterations = 0;
  const maxIterations = mapWidth * mapHeight; // Safety limit

  while (!openSet.isEmpty && iterations < maxIterations) {
    iterations++;

    const current = openSet.pop();
    if (!current) break;

    const currentKey = positionKey(current.x, current.y);

    // Goal reached
    if (current.x === goalX && current.y === goalY) {
      return reconstructPath(goalX, goalY, parentMap, outputX, outputY, maxPathLength);
    }

    // Mark as explored
    closedSet.add(currentKey);

    // Explore neighbors
    for (let i = 0; i < 4; i++) {
      const dx = unchecked(directions[i * 2]);
      const dy = unchecked(directions[i * 2 + 1]);
      const neighborX = current.x + dx;
      const neighborY = current.y + dy;

      // Check if walkable
      if (!isWalkable(neighborX, neighborY, mapWidth, mapHeight, obstacles)) {
        continue;
      }

      const neighborKey = positionKey(neighborX, neighborY);

      // Skip if already explored
      if (closedSet.has(neighborKey)) {
        continue;
      }

      // Calculate tentative g-score (movement cost = 1)
      const tentativeG = current.g + 1.0;

      // Check if this path is better than previous
      const previousG = gScores.has(neighborKey) ? gScores.get(neighborKey) : f32.MAX_VALUE;

      if (tentativeG < previousG) {
        // Update g-score and parent
        gScores.set(neighborKey, tentativeG);
        parentMap.set(neighborKey, currentKey);

        // Add to open set
        const neighbor = new PathNode(
          neighborX,
          neighborY,
          tentativeG,
          heuristic(neighborX, neighborY, goalX, goalY),
          current.x,
          current.y
        );
        openSet.push(neighbor);
      }
    }
  }

  // No path found
  return 0;
}

/**
 * Allocate memory for obstacles array
 * Returns pointer to allocated memory
 */
export function allocateObstacles(size: i32): usize {
  const buffer = new Uint8Array(size);
  return changetype<usize>(buffer.buffer);
}

/**
 * Allocate memory for output arrays
 * Returns pointer to allocated memory
 */
export function allocateOutput(size: i32): usize {
  const buffer = new Int32Array(size);
  return changetype<usize>(buffer.buffer);
}

/**
 * Get memory size in bytes
 */
export function getMemorySize(): i32 {
  return memory.size() * 65536; // Pages to bytes
}
