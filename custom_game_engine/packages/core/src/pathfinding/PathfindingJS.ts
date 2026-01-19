/**
 * JavaScript A* Pathfinding Implementation (Fallback)
 *
 * Pure JavaScript implementation of A* for browsers that don't support WASM
 * or when WASM initialization fails.
 */

import type { PathPoint, PathfindingOptions } from './PathfindingWASM.js';

/**
 * Priority queue node for A* open set
 */
class PathNode {
  constructor(
    public x: number,
    public y: number,
    public g: number,  // Cost from start
    public h: number,  // Heuristic to goal
    public parentX: number,
    public parentY: number
  ) {}

  get f(): number {
    return this.g + this.h;
  }
}

/**
 * Min-heap priority queue for open set (ordered by f-score)
 */
class PriorityQueue {
  private nodes: PathNode[] = [];

  push(node: PathNode): void {
    this.nodes.push(node);
    this.bubbleUp(this.nodes.length - 1);
  }

  pop(): PathNode | null {
    if (this.nodes.length === 0) return null;

    const result = this.nodes[0];
    if (!result) {
      // Should never happen since we checked length > 0
      throw new Error('Priority queue corrupted: no node at index 0');
    }

    const last = this.nodes.pop();

    if (this.nodes.length > 0 && last) {
      this.nodes[0] = last;
      this.bubbleDown(0);
    }

    return result;
  }

  private bubbleUp(index: number): void {
    const node = this.nodes[index];
    if (!node) {
      throw new Error(`BubbleUp: No node at index ${index}`);
    }

    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = this.nodes[parentIndex];
      if (!parent) {
        throw new Error(`BubbleUp: No parent at index ${parentIndex}`);
      }

      if (node.f >= parent.f) break;

      this.nodes[index] = parent;
      index = parentIndex;
    }

    this.nodes[index] = node;
  }

  private bubbleDown(index: number): void {
    const length = this.nodes.length;
    const node = this.nodes[index];
    if (!node) {
      throw new Error(`BubbleDown: No node at index ${index}`);
    }

    while (true) {
      const leftIndex = (index << 1) + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = index;

      const leftNode = this.nodes[leftIndex];
      const smallestNode = this.nodes[smallestIndex];
      if (leftIndex < length && leftNode && smallestNode && leftNode.f < smallestNode.f) {
        smallestIndex = leftIndex;
      }

      const rightNode = this.nodes[rightIndex];
      const updatedSmallestNode = this.nodes[smallestIndex];
      if (rightIndex < length && rightNode && updatedSmallestNode && rightNode.f < updatedSmallestNode.f) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === index) break;

      const swapNode = this.nodes[smallestIndex];
      if (!swapNode) {
        throw new Error(`BubbleDown: No node at swap index ${smallestIndex}`);
      }
      this.nodes[index] = swapNode;
      index = smallestIndex;
    }

    this.nodes[index] = node;
  }

  get isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  get size(): number {
    return this.nodes.length;
  }
}

/**
 * Manhattan distance heuristic (admissible for 4-directional movement)
 */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Check if position is within map bounds and walkable
 */
function isWalkable(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  obstacles: Uint8Array
): boolean {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
    return false;
  }

  const index = y * mapWidth + x;
  return obstacles[index] === 0; // 0 = walkable, 1 = obstacle
}

/**
 * Encode position as key for maps (assumes map size < 10000x10000)
 */
function positionKey(x: number, y: number): number {
  return y * 10000 + x;
}

/**
 * Reconstruct path from goal to start using parent tracking
 */
function reconstructPath(
  goalX: number,
  goalY: number,
  parentMap: Map<number, number>,
  maxPathLength: number
): PathPoint[] {
  const path: PathPoint[] = [];
  let currentKey = positionKey(goalX, goalY);
  let iterations = 0;
  const maxIterations = maxPathLength * 2; // Safety limit

  // Walk backwards from goal to start
  while (iterations < maxIterations) {
    const x = currentKey % 10000;
    const y = Math.floor(currentKey / 10000);
    path.push({ x, y });

    if (!parentMap.has(currentKey)) {
      break; // Reached start (no parent)
    }

    currentKey = parentMap.get(currentKey)!;
    iterations++;
  }

  // Reverse path to get start → goal order
  return path.reverse();
}

/**
 * JavaScript A* Pathfinding Implementation
 */
export class PathfindingJS {
  /**
   * Find path using A* algorithm
   *
   * @param startX - Start X coordinate
   * @param startY - Start Y coordinate
   * @param goalX - Goal X coordinate
   * @param goalY - Goal Y coordinate
   * @param mapWidth - Map width in tiles
   * @param mapHeight - Map height in tiles
   * @param obstacles - Obstacle map (0 = walkable, 1 = blocked), row-major order
   * @param options - Pathfinding options
   * @returns Array of path points from start to goal, or empty array if no path found
   */
  findPath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number,
    mapWidth: number,
    mapHeight: number,
    obstacles: Uint8Array,
    options: PathfindingOptions = {}
  ): PathPoint[] {
    const maxPathLength = options.maxPathLength ?? 1000;
    const mapSize = mapWidth * mapHeight;

    // Validate inputs
    if (mapSize !== obstacles.length) {
      throw new Error(
        `Obstacle array size mismatch: expected ${mapSize} but got ${obstacles.length}`
      );
    }

    if (startX < 0 || startX >= mapWidth || startY < 0 || startY >= mapHeight) {
      throw new Error(`Start position out of bounds: (${startX}, ${startY})`);
    }

    if (goalX < 0 || goalX >= mapWidth || goalY < 0 || goalY >= mapHeight) {
      throw new Error(`Goal position out of bounds: (${goalX}, ${goalY})`);
    }

    // Early exit: goal not walkable
    if (!isWalkable(goalX, goalY, mapWidth, mapHeight, obstacles)) {
      return [];
    }

    // Early exit: start == goal
    if (startX === goalX && startY === goalY) {
      return [{ x: startX, y: startY }];
    }

    const openSet = new PriorityQueue();
    const closedSet = new Set<number>();
    const parentMap = new Map<number, number>();

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
    const gScores = new Map<number, number>();
    gScores.set(positionKey(startX, startY), 0.0);

    // 4-directional movement (N, E, S, W)
    const directions = [
      [0, 1],   // North
      [1, 0],   // East
      [0, -1],  // South
      [-1, 0],  // West
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
        return reconstructPath(goalX, goalY, parentMap, maxPathLength);
      }

      // Mark as explored
      closedSet.add(currentKey);

      // Explore neighbors
      for (const direction of directions) {
        const dx = direction[0];
        const dy = direction[1];
        if (dx === undefined || dy === undefined) {
          throw new Error('Invalid direction tuple');
        }
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
        const previousG = gScores.get(neighborKey) ?? Number.MAX_VALUE;

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
    return [];
  }
}

/**
 * Singleton instance for global use
 */
export const pathfindingJS = new PathfindingJS();
