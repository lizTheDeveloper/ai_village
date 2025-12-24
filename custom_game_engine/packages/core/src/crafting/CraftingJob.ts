/**
 * Status of a crafting job.
 */
export type CraftingJobStatus = 'queued' | 'in_progress' | 'completed' | 'cancelled' | 'waiting_ingredients';

/**
 * A crafting job in the queue.
 */
export interface CraftingJob {
  /** Unique job ID */
  id: string;
  /** Agent performing the crafting */
  agentId: number;
  /** Recipe being crafted */
  recipeId: string;
  /** Quantity to craft */
  quantity: number;
  /** Current status */
  status: CraftingJobStatus;
  /** Progress (0.0 to 1.0) */
  progress: number;
  /** Elapsed time in seconds */
  elapsedTime: number;
  /** Total time required in seconds */
  totalTime: number;
  /** Items completed so far */
  completedCount: number;
  /** Timestamp when job was created */
  createdAt: number;
  /** Timestamp when job started */
  startedAt: number | null;
  /** Timestamp when job completed */
  completedAt: number | null;
}

/**
 * Create a new crafting job.
 */
export function createCraftingJob(
  agentId: number,
  recipeId: string,
  quantity: number,
  totalTime: number
): CraftingJob {
  if (quantity <= 0) {
    throw new Error('Job quantity must be positive');
  }
  if (totalTime <= 0) {
    throw new Error('Job totalTime must be positive');
  }

  return {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    recipeId,
    quantity,
    status: 'queued',
    progress: 0,
    elapsedTime: 0,
    totalTime: totalTime * quantity, // Total time for all items
    completedCount: 0,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null
  };
}
