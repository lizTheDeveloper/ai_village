import type { World } from '../ecs/World.js';
import { System } from '../ecs/System.js';
import type { CraftingJob } from './CraftingJob.js';
import { createCraftingJob } from './CraftingJob.js';
import type { Recipe } from './Recipe.js';

/**
 * Ingredient availability status.
 */
export type IngredientStatus = 'AVAILABLE' | 'PARTIAL' | 'MISSING' | 'IN_STORAGE';

/**
 * Ingredient availability information.
 */
export interface IngredientAvailability {
  itemId: string;
  required: number;
  available: number;
  status: IngredientStatus;
}

/**
 * Agent crafting queue state.
 */
interface AgentCraftingQueue {
  agentId: number;
  queue: CraftingJob[];
  paused: boolean;
}

/**
 * System for managing crafting queues and job execution.
 * Follows CLAUDE.md: No silent fallbacks, throws on errors.
 */
export class CraftingSystem implements System {
  public readonly id = 'crafting' as const;
  public readonly priority = 55; // After BuildingSystem (50), before MemorySystem (100)
  public readonly requiredComponents = [] as const; // Process queues manually, not entity-based

  private queues: Map<number, AgentCraftingQueue> = new Map();
  private readonly MAX_QUEUE_SIZE = 10;

  /**
   * Queue a new crafting job for an agent.
   * @throws If quantity is invalid
   * @throws If agent entity not found
   * @throws If queue is full
   */
  queueJob(agentId: number, recipe: Recipe, quantity: number): CraftingJob {
    if (quantity <= 0) {
      throw new Error('Job quantity must be positive');
    }

    // Get or create queue for agent
    let queueState = this.queues.get(agentId);
    if (!queueState) {
      queueState = {
        agentId,
        queue: [],
        paused: false
      };
      this.queues.set(agentId, queueState);
    }

    // Check queue size limit
    if (queueState.queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error('Queue is full (max 10 jobs)');
    }

    // Create job
    const job = createCraftingJob(agentId, recipe.id, quantity, recipe.craftingTime);
    queueState.queue.push(job);

    return job;
  }

  /**
   * Get the crafting queue for an agent.
   */
  getQueue(agentId: number): CraftingJob[] {
    const queueState = this.queues.get(agentId);
    return queueState ? [...queueState.queue] : [];
  }

  /**
   * Get the currently active job for an agent.
   */
  getCurrentJob(agentId: number): CraftingJob | null {
    const queue = this.getQueue(agentId);
    if (queue.length === 0) {
      return null;
    }
    const currentJob = queue[0];
    if (!currentJob) {
      return null;
    }
    return currentJob.status === 'in_progress' || currentJob.status === 'queued' ? currentJob : null;
  }

  /**
   * Reorder a job in the queue.
   * @throws If position is invalid
   */
  reorderQueue(agentId: number, jobId: string, newPosition: number): void {
    const queueState = this.queues.get(agentId);
    if (!queueState) {
      throw new Error('Agent has no crafting queue');
    }

    const jobIndex = queueState.queue.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (newPosition < 0 || newPosition >= queueState.queue.length) {
      throw new Error(`Invalid position: ${newPosition}`);
    }

    const job = queueState.queue[jobIndex];
    if (!job) {
      throw new Error(`Job not found at index: ${jobIndex}`);
    }

    // Don't allow reordering the currently in-progress job
    if (job.status === 'in_progress') {
      throw new Error('Cannot reorder job that is in progress');
    }

    // Remove and insert at new position
    queueState.queue.splice(jobIndex, 1);
    queueState.queue.splice(newPosition, 0, job);
  }

  /**
   * Cancel a queued job.
   * @throws If job not found
   */
  cancelJob(agentId: number, jobId: string): void {
    const queueState = this.queues.get(agentId);
    if (!queueState) {
      throw new Error('Agent has no crafting queue');
    }

    const jobIndex = queueState.queue.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Mark as cancelled and remove
    const job = queueState.queue[jobIndex];
    if (!job) {
      throw new Error(`Job not found at index: ${jobIndex}`);
    }
    job.status = 'cancelled';
    queueState.queue.splice(jobIndex, 1);
  }

  /**
   * Clear all jobs in the queue.
   */
  clearQueue(agentId: number): void {
    const queueState = this.queues.get(agentId);
    if (queueState) {
      queueState.queue = [];
    }
  }

  /**
   * Pause the crafting queue.
   */
  pauseQueue(agentId: number): void {
    const queueState = this.queues.get(agentId);
    if (queueState) {
      queueState.paused = true;
    }
  }

  /**
   * Resume the crafting queue.
   */
  resumeQueue(agentId: number): void {
    const queueState = this.queues.get(agentId);
    if (queueState) {
      queueState.paused = false;
    }
  }

  /**
   * Check if queue is paused.
   */
  isQueuePaused(agentId: number): boolean {
    const queueState = this.queues.get(agentId);
    return queueState ? queueState.paused : false;
  }

  /**
   * Check ingredient availability for a recipe.
   */
  checkIngredientAvailability(_agentId: number, recipe: Recipe): IngredientAvailability[] {
    // This is a stub for the UI - full implementation would check inventory
    // For now, return mock data based on ingredient requirements
    return recipe.ingredients.map(ing => ({
      itemId: ing.itemId,
      required: ing.quantity,
      available: 0, // Would query inventory
      status: 'MISSING' as IngredientStatus
    }));
  }

  /**
   * Calculate maximum craftable quantity based on ingredients.
   */
  calculateMaxCraftable(_agentId: number, _recipe: Recipe): number {
    // Stub implementation - would calculate based on inventory
    return 0;
  }

  /**
   * System update - process all active crafting jobs.
   */
  update(world: World, _entities: ReadonlyArray<import('../ecs/Entity.js').Entity>, deltaTime: number): void {
    // Process each agent's queue
    for (const queueState of this.queues.values()) {
      if (queueState.paused || queueState.queue.length === 0) {
        continue;
      }

      const job = queueState.queue[0];

      // Add null check per CLAUDE.md
      if (!job) {
        throw new Error('Queue has length > 0 but first item is undefined');
      }

      // Start job if queued
      if (job.status === 'queued') {
        this.startJob(world, job);
      }

      // Update progress if in progress
      if (job.status === 'in_progress') {
        this.updateJob(world, job, deltaTime);
      }
    }
  }

  /**
   * Start a crafting job.
   */
  private startJob(world: World, job: CraftingJob): void {
    job.status = 'in_progress';
    job.startedAt = Date.now();

    // Emit event
    world.eventBus.emit({
      type: 'crafting:job_started',
      source: 'crafting-system',
      data: {
        jobId: String(job.id),
        agentId: String(job.agentId),
        recipeId: job.recipeId
      }
    });

    // Consume ingredients (stub - would actually modify inventory)
    // For now, we'll assume ingredients are consumed
  }

  /**
   * Update job progress.
   */
  private updateJob(world: World, job: CraftingJob, deltaTime: number): void {
    job.elapsedTime += deltaTime;
    job.progress = Math.min(1.0, job.elapsedTime / job.totalTime);

    // Check if completed
    if (job.progress >= 1.0) {
      this.completeJob(world, job);
    }
  }

  /**
   * Complete a crafting job.
   */
  private completeJob(world: World, job: CraftingJob): void {
    job.status = 'completed';
    job.completedAt = Date.now();
    job.completedCount = job.quantity;

    // Remove from queue
    const queueState = this.queues.get(job.agentId);
    if (queueState) {
      const index = queueState.queue.findIndex(j => j.id === job.id);
      if (index !== -1) {
        queueState.queue.splice(index, 1);
      }
    }

    // Emit completion event
    world.eventBus.emit({
      type: 'crafting:completed',
      source: 'crafting-system',
      data: {
        jobId: String(job.id),
        agentId: String(job.agentId),
        recipeId: job.recipeId,
        produced: [{ itemId: job.recipeId, amount: job.quantity }]
      }
    });

    // Add items to inventory (stub)
    // Grant XP (stub)
  }
}
