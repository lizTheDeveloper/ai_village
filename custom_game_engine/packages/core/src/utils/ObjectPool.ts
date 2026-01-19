export interface PoolStats {
  poolSize: number;
  acquired: number;
  totalCreated: number;
}

export class ObjectPool<T> {
  private readonly factory: () => T;
  private readonly reset: (obj: T) => void;
  private readonly pool: T[] = [];
  private acquiredCount = 0;
  private totalCreated = 0;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10
  ) {
    this.factory = factory;
    this.reset = reset;
    this.prewarm(initialSize);
  }

  acquire(): T {
    this.acquiredCount++;

    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      return obj;
    }

    this.totalCreated++;
    return this.factory();
  }

  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
    this.acquiredCount--;
  }

  releaseAll(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }

  getStats(): PoolStats {
    return {
      poolSize: this.pool.length,
      acquired: this.acquiredCount,
      totalCreated: this.totalCreated,
    };
  }

  clear(): void {
    this.pool.length = 0;
    this.acquiredCount = 0;
  }

  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const obj = this.factory();
      this.totalCreated++;
      this.pool.push(obj);
    }
  }
}
