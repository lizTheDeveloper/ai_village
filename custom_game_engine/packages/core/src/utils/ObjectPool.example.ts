import { ObjectPool } from './ObjectPool.js';
import {
  vector2DPool,
  boundingBoxPool,
  calculateDistance,
  createVector,
} from './CommonPools.js';

function exampleBasicUsage() {
  const pool = new ObjectPool<{ x: number; y: number }>(
    () => ({ x: 0, y: 0 }),
    (obj) => {
      obj.x = 0;
      obj.y = 0;
    },
    10
  );

  const obj = pool.acquire();
  obj.x = 42;
  obj.y = 99;

  pool.release(obj);

  console.log('Pool stats:', pool.getStats());
}

function exampleVectorPoolUsage() {
  const v1 = vector2DPool.acquire();
  const v2 = vector2DPool.acquire();

  v1.x = 10;
  v1.y = 20;
  v2.x = 30;
  v2.y = 40;

  const result = vector2DPool.acquire();
  result.x = v1.x + v2.x;
  result.y = v1.y + v2.y;

  vector2DPool.release(v1);
  vector2DPool.release(v2);
  vector2DPool.release(result);
}

function exampleMovementSystemPattern() {
  const deltaX = 5;
  const deltaY = 3;

  const perp1 = vector2DPool.acquire();
  const perp2 = vector2DPool.acquire();

  perp1.x = -deltaY;
  perp1.y = deltaX;
  perp2.x = deltaY;
  perp2.y = -deltaX;

  const alt1X = 100 + perp1.x;
  const alt1Y = 100 + perp1.y;
  const alt2X = 100 + perp2.x;
  const alt2Y = 100 + perp2.y;

  console.log('Alternative position 1:', alt1X, alt1Y);
  console.log('Alternative position 2:', alt2X, alt2Y);

  vector2DPool.release(perp1);
  vector2DPool.release(perp2);
}

function exampleDistanceCalculation() {
  const result = calculateDistance(0, 0, 3, 4);

  console.log('Distance:', result.distance);
  console.log('Distance squared:', result.distanceSquared);
  console.log('Delta X:', result.dx);
  console.log('Delta Y:', result.dy);

  result;
}

function exampleProperCleanup() {
  const v = vector2DPool.acquire();
  try {
    v.x = 100;
    v.y = 200;

    if (v.x > 50) {
      return v.x + v.y;
    }

    return 0;
  } finally {
    vector2DPool.release(v);
  }
}

function exampleBatchOperations() {
  const vectors = [];

  for (let i = 0; i < 10; i++) {
    const v = vector2DPool.acquire();
    v.x = i;
    v.y = i * 2;
    vectors.push(v);
  }

  for (const v of vectors) {
    console.log('Vector:', v.x, v.y);
  }

  vector2DPool.releaseAll(vectors);
}

function exampleCollisionDetection() {
  const box1 = boundingBoxPool.acquire();
  const box2 = boundingBoxPool.acquire();

  box1.minX = 0;
  box1.minY = 0;
  box1.maxX = 10;
  box1.maxY = 10;

  box2.minX = 5;
  box2.minY = 5;
  box2.maxX = 15;
  box2.maxY = 15;

  const overlaps =
    box1.maxX > box2.minX &&
    box1.minX < box2.maxX &&
    box1.maxY > box2.minY &&
    box1.minY < box2.maxY;

  console.log('Boxes overlap:', overlaps);

  boundingBoxPool.release(box1);
  boundingBoxPool.release(box2);
}

export const examples = {
  exampleBasicUsage,
  exampleVectorPoolUsage,
  exampleMovementSystemPattern,
  exampleDistanceCalculation,
  exampleProperCleanup,
  exampleBatchOperations,
  exampleCollisionDetection,
};
