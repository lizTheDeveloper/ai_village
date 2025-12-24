import type { World, CraftingJob } from '@ai-village/core';
import { CraftingSystem } from '@ai-village/core';

/**
 * Crafting queue section for displaying and managing the crafting queue.
 */
export class CraftingQueueSection {
  private world: World;
  public readonly bounds: { x: number; y: number; width: number; height: number };
  public agentId: number | null = null;
  private queue: CraftingJob[] = [];
  private craftingSystem: CraftingSystem | null = null;

  constructor(world: World, x: number, y: number, width: number, height: number) {
    if (!world) {
      throw new Error('World is required');
    }
    if (width <= 0) {
      throw new Error('Width must be positive');
    }
    if (height <= 0) {
      throw new Error('Height must be positive');
    }

    this.world = world;
    this.bounds = { x, y, width, height };

    // Listen for crafting events
    this.world.eventBus.subscribe('crafting:job_queued', () => this.refresh());
    this.world.eventBus.subscribe('crafting:job_completed', () => this.refresh());
    this.world.eventBus.subscribe('crafting:job_cancelled', () => this.refresh());
  }

  /**
   * Set the CraftingSystem to query for queue data.
   * This must be called before the section can display jobs.
   */
  setCraftingSystem(craftingSystem: CraftingSystem): void {
    this.craftingSystem = craftingSystem;
    this.refresh();
  }

  setAgentId(agentId: number): void {
    if (agentId <= 0) {
      throw new Error('Invalid agent ID');
    }
    this.agentId = agentId;
    this.refresh();
  }

  refresh(): void {
    if (!this.agentId) {
      this.queue = [];
      return;
    }

    // Get queue from CraftingSystem
    if (!this.craftingSystem) {
      // No crafting system set - valid for tests or before system is registered
      this.queue = [];
      return;
    }

    this.queue = this.craftingSystem.getQueue(this.agentId);
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Draw panel background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    // Draw border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    // Draw header
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CRAFTING QUEUE', this.bounds.x + 10, this.bounds.y + 20);

    if (this.queue.length === 0) {
      // Show empty state
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.fillText('No active jobs', this.bounds.x + 10, this.bounds.y + 50);
      return;
    }

    // Draw current job
    const currentJob = this.queue[0];
    if (currentJob && currentJob.status === 'in_progress') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('▶ CRAFTING NOW', this.bounds.x + 10, this.bounds.y + 40);

      // Job name
      ctx.font = '14px sans-serif';
      ctx.fillText(`${currentJob.recipeId} (${currentJob.completedCount + 1}/${currentJob.quantity})`,
        this.bounds.x + 10, this.bounds.y + 60);

      // Progress bar
      const barWidth = this.bounds.width - 100;
      const barX = this.bounds.x + 10;
      const barY = this.bounds.y + 70;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, 10);

      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(barX, barY, barWidth * currentJob.progress, 10);

      ctx.strokeStyle = '#666';
      ctx.strokeRect(barX, barY, barWidth, 10);

      // Progress percentage and time
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      const percent = Math.round(currentJob.progress * 100);
      const timeLeft = Math.ceil(currentJob.totalTime - currentJob.elapsedTime);
      ctx.fillText(`${percent}%   Time: ${timeLeft}s`, this.bounds.x + this.bounds.width - 10, this.bounds.y + 78);
    }

    // Draw queued jobs
    if (this.queue.length > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('QUEUED:', this.bounds.x + 10, this.bounds.y + 100);

      this.queue.slice(1).forEach((job, index) => {
        const y = this.bounds.y + 120 + index * 25;

        ctx.font = '14px sans-serif';
        ctx.fillText(`${index + 1}. ${job.recipeId} ×${job.quantity}`,
          this.bounds.x + 10, y);

        ctx.fillStyle = '#888';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`~${Math.ceil(job.totalTime)}s`, this.bounds.x + this.bounds.width - 10, y);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
      });
    }
  }

  handleClick(_x: number, _y: number): boolean {
    // Handle queue reorder/cancel buttons (stub)
    return false;
  }
}
