import { describe, bench } from 'vitest';
import { ObjectPool } from '../ObjectPool.js';

interface TestObject {
  x: number;
  y: number;
  z: number;
}

describe('ObjectPool Performance', () => {
  const pool = new ObjectPool<TestObject>(
    () => ({ x: 0, y: 0, z: 0 }),
    (obj) => { obj.x = 0; obj.y = 0; obj.z = 0; },
    100
  );

  bench('Direct allocation (baseline)', () => {
    for (let i = 0; i < 1000; i++) {
      const obj = { x: i, y: i * 2, z: i * 3 };
      obj.x + obj.y + obj.z;
    }
  });

  bench('Object pool', () => {
    for (let i = 0; i < 1000; i++) {
      const obj = pool.acquire();
      obj.x = i;
      obj.y = i * 2;
      obj.z = i * 3;
      obj.x + obj.y + obj.z;
      pool.release(obj);
    }
  });

  bench('Object pool without release (worst case)', () => {
    for (let i = 0; i < 1000; i++) {
      const obj = pool.acquire();
      obj.x = i;
      obj.y = i * 2;
      obj.z = i * 3;
      obj.x + obj.y + obj.z;
    }
  });
});

interface ComplexObject {
  position: { x: number; y: number; z: number };
  velocity: { vx: number; vy: number; vz: number };
  acceleration: { ax: number; ay: number; az: number };
  name: string;
  id: number;
}

describe('Complex Object Pool Performance', () => {
  const pool = new ObjectPool<ComplexObject>(
    () => ({
      position: { x: 0, y: 0, z: 0 },
      velocity: { vx: 0, vy: 0, vz: 0 },
      acceleration: { ax: 0, ay: 0, az: 0 },
      name: '',
      id: 0,
    }),
    (obj) => {
      obj.position.x = 0;
      obj.position.y = 0;
      obj.position.z = 0;
      obj.velocity.vx = 0;
      obj.velocity.vy = 0;
      obj.velocity.vz = 0;
      obj.acceleration.ax = 0;
      obj.acceleration.ay = 0;
      obj.acceleration.az = 0;
      obj.name = '';
      obj.id = 0;
    },
    50
  );

  bench('Complex direct allocation', () => {
    for (let i = 0; i < 1000; i++) {
      const obj = {
        position: { x: i, y: i * 2, z: i * 3 },
        velocity: { vx: i * 0.1, vy: i * 0.2, vz: i * 0.3 },
        acceleration: { ax: i * 0.01, ay: i * 0.02, az: i * 0.03 },
        name: `entity_${i}`,
        id: i,
      };
      obj.position.x + obj.velocity.vx + obj.acceleration.ax;
    }
  });

  bench('Complex object pool', () => {
    for (let i = 0; i < 1000; i++) {
      const obj = pool.acquire();
      obj.position.x = i;
      obj.position.y = i * 2;
      obj.position.z = i * 3;
      obj.velocity.vx = i * 0.1;
      obj.velocity.vy = i * 0.2;
      obj.velocity.vz = i * 0.3;
      obj.acceleration.ax = i * 0.01;
      obj.acceleration.ay = i * 0.02;
      obj.acceleration.az = i * 0.03;
      obj.name = `entity_${i}`;
      obj.id = i;
      obj.position.x + obj.velocity.vx + obj.acceleration.ax;
      pool.release(obj);
    }
  });
});

describe('Vector2D Pool Performance (Real-world)', () => {
  const pool = new ObjectPool<{ x: number; y: number }>(
    () => ({ x: 0, y: 0 }),
    (v) => { v.x = 0; v.y = 0; },
    50
  );

  bench('Vector direct allocation (10k iterations)', () => {
    for (let i = 0; i < 10000; i++) {
      const v1 = { x: i, y: i * 2 };
      const v2 = { x: i * 3, y: i * 4 };
      const result = { x: v1.x + v2.x, y: v1.y + v2.y };
      result.x * result.y;
    }
  });

  bench('Vector pool (10k iterations)', () => {
    for (let i = 0; i < 10000; i++) {
      const v1 = pool.acquire();
      v1.x = i;
      v1.y = i * 2;

      const v2 = pool.acquire();
      v2.x = i * 3;
      v2.y = i * 4;

      const result = pool.acquire();
      result.x = v1.x + v2.x;
      result.y = v1.y + v2.y;

      result.x * result.y;

      pool.release(v1);
      pool.release(v2);
      pool.release(result);
    }
  });
});

describe('Batch Operations', () => {
  const pool = new ObjectPool<TestObject>(
    () => ({ x: 0, y: 0, z: 0 }),
    (obj) => { obj.x = 0; obj.y = 0; obj.z = 0; },
    100
  );

  bench('Batch acquire/release (100 objects)', () => {
    const objects: TestObject[] = [];

    for (let i = 0; i < 100; i++) {
      objects.push(pool.acquire());
    }

    for (const obj of objects) {
      obj.x = 1;
      obj.y = 2;
      obj.z = 3;
    }

    pool.releaseAll(objects);
    objects.length = 0;
  });

  bench('Individual acquire/release (100 objects)', () => {
    for (let i = 0; i < 100; i++) {
      const obj = pool.acquire();
      obj.x = 1;
      obj.y = 2;
      obj.z = 3;
      pool.release(obj);
    }
  });
});
