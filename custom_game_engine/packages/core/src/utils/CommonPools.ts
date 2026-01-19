import { ObjectPool } from './ObjectPool.js';

export interface Vector2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface DistanceResult {
  distance: number;
  distanceSquared: number;
  dx: number;
  dy: number;
}

export interface EntityList {
  entities: string[];
  count: number;
}

export const vector2DPool = new ObjectPool<Vector2D>(
  () => ({ x: 0, y: 0 }),
  (v) => { v.x = 0; v.y = 0; },
  50
);

export const boundingBoxPool = new ObjectPool<BoundingBox>(
  () => ({ minX: 0, minY: 0, maxX: 0, maxY: 0 }),
  (b) => { b.minX = 0; b.minY = 0; b.maxX = 0; b.maxY = 0; },
  50
);

export const distanceResultPool = new ObjectPool<DistanceResult>(
  () => ({ distance: 0, distanceSquared: 0, dx: 0, dy: 0 }),
  (d) => { d.distance = 0; d.distanceSquared = 0; d.dx = 0; d.dy = 0; },
  100
);

export const entityListPool = new ObjectPool<EntityList>(
  () => ({ entities: [], count: 0 }),
  (e) => { e.entities.length = 0; e.count = 0; },
  20
);

export function calculateDistance(
  x1: number, y1: number,
  x2: number, y2: number
): DistanceResult {
  const result = distanceResultPool.acquire();
  result.dx = x2 - x1;
  result.dy = y2 - y1;
  result.distanceSquared = result.dx * result.dx + result.dy * result.dy;
  result.distance = Math.sqrt(result.distanceSquared);
  return result;
}

export function createVector(x: number, y: number): Vector2D {
  const v = vector2DPool.acquire();
  v.x = x;
  v.y = y;
  return v;
}

export function createBoundingBox(
  minX: number, minY: number,
  maxX: number, maxY: number
): BoundingBox {
  const b = boundingBoxPool.acquire();
  b.minX = minX;
  b.minY = minY;
  b.maxX = maxX;
  b.maxY = maxY;
  return b;
}
