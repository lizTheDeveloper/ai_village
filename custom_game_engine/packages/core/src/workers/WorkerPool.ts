/**
 * Generic Worker Pool Manager
 *
 * Manages a pool of Web Workers for parallel task execution.
 * Provides promise-based API with automatic task queuing and worker reuse.
 *
 * Usage:
 * ```typescript
 * const pool = new WorkerPool('worker.js', 4);
 *
 * const result = await pool.execute('task_type', { data: 123 });
 *
 * const stats = pool.getStats();
 * console.log(`${stats.active} active, ${stats.queued} queued`);
 *
 * pool.terminate(); // Clean up when done
 * ```
 */

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export interface WorkerMessage<T = any> {
  id: string;
  type: string;
  data: T;
}

export interface WorkerResponse<R = any> {
  id: string;
  type: 'result' | 'error';
  result?: R;
  error?: string;
}

export interface WorkerPoolStats {
  /** Total number of workers in pool */
  total: number;
  /** Number of workers currently available */
  available: number;
  /** Number of workers currently processing tasks */
  active: number;
  /** Number of tasks waiting in queue */
  queued: number;
  /** Total tasks completed since creation */
  completed: number;
  /** Total tasks failed since creation */
  failed: number;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<Worker, WorkerTask>();

  private taskCounter = 0;
  private completedTasks = 0;
  private failedTasks = 0;

  /**
   * Create a worker pool.
   *
   * @param workerUrl - URL to worker script (use `import.meta.url` for relative paths)
   * @param poolSize - Number of workers to create (default: navigator.hardwareConcurrency or 4)
   * @param timeout - Default timeout for tasks in milliseconds (default: 5000)
   */
  constructor(
    private workerUrl: string | URL,
    private poolSize: number = navigator.hardwareConcurrency || 4,
    private timeout: number = 5000
  ) {
    this.initialize();
  }

  /**
   * Initialize worker pool.
   */
  private initialize(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerUrl, { type: 'module' });

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(worker, event.data);
      };

      worker.onerror = (error) => {
        this.handleWorkerError(worker, error);
      };

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }

    console.info(`[WorkerPool] Initialized ${this.poolSize} workers`);
  }

  /**
   * Execute task on worker thread.
   *
   * @param type - Task type identifier
   * @param data - Task data to send to worker
   * @param customTimeout - Optional custom timeout for this task
   * @returns Promise that resolves with worker result
   */
  execute<T, R>(type: string, data: T, customTimeout?: number): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: this.generateTaskId(),
        type,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      const worker = this.availableWorkers.pop();

      if (worker) {
        this.executeTask(worker, task, customTimeout);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Execute task on worker.
   */
  private executeTask(
    worker: Worker,
    task: WorkerTask,
    customTimeout?: number
  ): void {
    this.activeTasks.set(worker, task);

    const message: WorkerMessage = {
      id: task.id,
      type: task.type,
      data: task.data,
    };

    worker.postMessage(message);

    // Set timeout
    const timeoutMs = customTimeout ?? this.timeout;
    setTimeout(() => {
      if (this.activeTasks.has(worker) && this.activeTasks.get(worker)?.id === task.id) {
        this.activeTasks.delete(worker);
        this.failedTasks++;
        task.reject(new Error(`Task timeout after ${timeoutMs}ms: ${task.type}`));

        // Return worker to pool
        this.returnWorkerToPool(worker);
      }
    }, timeoutMs);
  }

  /**
   * Handle worker response message.
   */
  private handleWorkerMessage(worker: Worker, message: WorkerResponse): void {
    const task = this.activeTasks.get(worker);

    if (!task) {
      console.warn('[WorkerPool] Received message for unknown task:', message.id);
      return;
    }

    if (task.id !== message.id) {
      console.warn('[WorkerPool] Task ID mismatch:', task.id, message.id);
      return;
    }

    this.activeTasks.delete(worker);

    if (message.type === 'error' || message.error) {
      this.failedTasks++;
      task.reject(new Error(message.error || 'Unknown worker error'));
    } else {
      this.completedTasks++;
      task.resolve(message.result);
    }

    this.returnWorkerToPool(worker);
  }

  /**
   * Handle worker error.
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    const task = this.activeTasks.get(worker);

    if (task) {
      this.activeTasks.delete(worker);
      this.failedTasks++;
      task.reject(new Error(`Worker error: ${error.message}`));
    }

    console.error('[WorkerPool] Worker error:', error);

    // Return worker to pool (it may still be usable)
    this.returnWorkerToPool(worker);
  }

  /**
   * Return worker to pool and process next queued task.
   */
  private returnWorkerToPool(worker: Worker): void {
    const nextTask = this.taskQueue.shift();

    if (nextTask) {
      this.executeTask(worker, nextTask);
    } else {
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Generate unique task ID.
   */
  private generateTaskId(): string {
    return `task-${this.taskCounter++}-${Date.now()}`;
  }

  /**
   * Get pool statistics.
   *
   * @returns Current pool status
   */
  getStats(): WorkerPoolStats {
    return {
      total: this.workers.length,
      available: this.availableWorkers.length,
      active: this.activeTasks.size,
      queued: this.taskQueue.length,
      completed: this.completedTasks,
      failed: this.failedTasks,
    };
  }

  /**
   * Terminate all workers and clear queues.
   *
   * Call this when shutting down to clean up resources.
   */
  terminate(): void {
    // Reject all pending tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Worker pool terminated'));
    }

    for (const task of this.activeTasks.values()) {
      task.reject(new Error('Worker pool terminated'));
    }

    // Terminate workers
    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
    this.availableWorkers = [];
    this.activeTasks.clear();
    this.taskQueue = [];

    console.info('[WorkerPool] Terminated');
  }

  /**
   * Check if pool is idle (no active or queued tasks).
   */
  isIdle(): boolean {
    return this.activeTasks.size === 0 && this.taskQueue.length === 0;
  }

  /**
   * Wait for all active and queued tasks to complete.
   *
   * @param timeout - Maximum time to wait in milliseconds (default: 30000)
   * @returns Promise that resolves when pool is idle
   */
  async waitForIdle(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (!this.isIdle()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Worker pool idle timeout');
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
